import { app, BrowserWindow, BrowserView, ipcMain, IpcMainEvent, session, nativeTheme, screen, shell } from 'electron'
import { join } from 'node:path'
import { ElectronBlocker } from '@ghostery/adblocker-electron'
import fetch from 'cross-fetch'
import { checkForElectronUpdates, isVersionOutdated } from './updateChecker'
import { loadSettings, saveSettings } from './settings'
import { initAutoUpdater, checkForUpdates, downloadUpdate, quitAndInstall } from './autoUpdater'

process.env.DIST = join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : join(process.env.DIST, '../public')

let win: BrowserWindow | null
const views: BrowserView[] = []

const PLATFORMS = [
  { name: 'X', url: 'https://x.com' },
  { name: 'LinkedIn', url: 'https://www.linkedin.com/feed/' },
  { name: 'Bluesky', url: 'https://bsky.app' },
  { name: 'Threads', url: 'https://www.threads.net' },
  { name: 'Reddit', url: 'https://www.reddit.com' },
]

// Current order of platforms (indices into PLATFORMS array)
let platformOrder: number[] = [0, 1, 2, 3, 4]
// Visibility state for each platform
let platformVisibility: boolean[] = [true, true, true, true, true]
let currentSplits: number[] = [20, 40, 60, 80] // Default for 5 views
// Track which views are currently on a post (not on feed) - these should not participate in scroll sync
const viewsOnPost = new Set<number>()
// Scroll sync, focus mode, and grayscale mode state
let scrollSyncEnabled: boolean = true
let focusModeEnabled: boolean = false
let grayscaleModeEnabled: boolean = false
// Track which view has mouse focus for focus mode
let focusedViewIndex: number | null = null

// Calculate equal splits for N visible feeds
function calculateEqualSplits(visibleCount: number): number[] {
  if (visibleCount <= 1) return []
  const splits: number[] = []
  for (let i = 1; i < visibleCount; i++) {
    splits.push((i / visibleCount) * 100)
  }
  return splits
}

// Get visible platform indices in display order
function getVisiblePlatformIndices(): number[] {
  return platformOrder.filter(idx => platformVisibility[idx])
}

// Recalculate splits based on visible count
function recalculateSplits() {
  const visibleCount = platformVisibility.filter(v => v).length
  currentSplits = calculateEqualSplits(visibleCount)
}

// Check if URL represents a feed/home page or login page (not a specific post)
function isOnFeedPage(url: string, platformName: string): boolean {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname.toLowerCase()
    
    // Common auth/login paths that should never trigger dimming
    const authPaths = ['/login', '/signin', '/signup', '/register', '/auth', '/oauth', '/sso', '/checkpoint', '/uas']
    if (authPaths.some(authPath => path.startsWith(authPath))) {
      return true
    }
    
    switch (platformName) {
      case 'X':
        // X login flow uses /i/flow/login
        if (path.startsWith('/i/flow/')) return true
        return path === '/' || path === '/home' || path === '/explore' || path === '/notifications' || path === '/messages'
      case 'LinkedIn':
        // LinkedIn uses /checkpoint/, /uas/, /authwall for auth
        if (path.startsWith('/checkpoint') || path.startsWith('/authwall')) return true
        return path === '/feed/' || path === '/feed' || path === '/'
      case 'Bluesky':
        return path === '/' || path === '/home' || path === '/notifications' || path === '/search' || !path.includes('/post/')
      case 'Threads':
        return path === '/' || path === '/home' || (!path.includes('/post/') && !path.match(/^\/t\/\d+/))
      case 'Reddit':
        // Reddit feed: /, /r/all, /r/popular, /r/subreddit (but not /r/subreddit/comments/...)
        // Reddit also uses /account/ for login
        if (path.startsWith('/account/')) return true
        return path === '/' || path === '/r/all' || path === '/r/popular' || 
               (path.startsWith('/r/') && !path.includes('/comments/'))
      default:
        return true
    }
  } catch {
    return true
  }
}

// Update scroll sync state for a view based on whether it's on a feed or post
function updateScrollSyncState(viewIndex: number, isOnFeed: boolean) {
  if (isOnFeed) {
    viewsOnPost.delete(viewIndex)
  } else {
    viewsOnPost.add(viewIndex)
  }
}

function updateLayout() {
  if (!win || views.length === 0) return

  const bounds = win.getContentBounds()
  const headerHeight = 30
  const height = bounds.height - headerHeight

  // Get only visible platforms in display order
  const visibleIndices = getVisiblePlatformIndices()
  
  // Convert percentages to pixels for visible feeds
  const splitPixels = [0, ...currentSplits.map(s => (s / 100) * bounds.width), bounds.width]

  const gapSize = 4

  // First, hide all views
  views.forEach((view) => {
    view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
  })

  // Position only visible views
  visibleIndices.forEach((platformIdx, displayPosition) => {
    const view = views[platformIdx]
    if (!view) return
    
    const startX = splitPixels[displayPosition]
    const endX = splitPixels[displayPosition + 1]
    
    const leftGap = displayPosition === 0 ? 0 : gapSize
    const rightGap = displayPosition === visibleIndices.length - 1 ? 0 : gapSize
    
    const x = startX + leftGap
    const width = (endX - rightGap) - x

    view.setBounds({
      x: Math.floor(x),
      y: headerHeight,
      width: Math.floor(Math.max(width, 50)),
      height: height,
    })
  })
}

// Reorder platforms
function reorderPlatforms(newOrder: number[]) {
  if (newOrder.length !== PLATFORMS.length) return
  platformOrder = newOrder
  saveSettings({ platformOrder })
  updateLayout()
  win?.webContents.send('PLATFORM_ORDER_CHANGED', platformOrder)
}

// Toggle visibility of a platform
function toggleVisibility(index: number) {
  if (index < 0 || index >= PLATFORMS.length) return
  
  // Prevent hiding the last visible feed
  const visibleCount = platformVisibility.filter(v => v).length
  if (platformVisibility[index] && visibleCount <= 1) return
  
  platformVisibility[index] = !platformVisibility[index]
  saveSettings({ platformVisibility })
  recalculateSplits()
  updateLayout()
  win?.webContents.send('VISIBILITY_CHANGED', platformVisibility)
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize
  
  win = new BrowserWindow({
    icon: join(process.env.VITE_PUBLIC as string, 'electron-vite.svg'),
    x: 0,
    y: 0,
    width: screenWidth,
    height: screenHeight,
    backgroundColor: '#1e1e1e',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
    },
  })

  // Initialize Views - create one for each platform
  PLATFORMS.forEach((platform, platformIndex) => {
    const viewOptions: Electron.BrowserViewConstructorOptions = {
      webPreferences: {
        preload: join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    }

    // Platform Specific Options
    if (platform.name === 'LinkedIn') {
      (viewOptions.webPreferences as any).userAgent = 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    }

    const view = new BrowserView(viewOptions)
    win?.addBrowserView(view)
    view.webContents.loadURL(platform.url)
    views.push(view)
    
    ;(view as any)._platformIndex = platformIndex
    
    // Send view index and initial grayscale state to preload script once loaded
    view.webContents.on('did-finish-load', () => {
      view.webContents.send('SET_VIEW_INDEX', { index: platformIndex })
      // Apply grayscale filter if enabled
      view.webContents.send('GRAYSCALE_MODE_CHANGED', { enabled: grayscaleModeEnabled })
    })

    const platformOrigin = new URL(platform.url).origin
    view.webContents.setWindowOpenHandler(({ url }) => {
      try {
        const linkOrigin = new URL(url).origin
        if (linkOrigin !== platformOrigin) {
          shell.openExternal(url)
          return { action: 'deny' }
        }
      } catch {
        return { action: 'deny' }
      }
      return { action: 'deny' }
    })
    
    view.webContents.on('will-navigate', (event, url) => {
      try {
        const linkOrigin = new URL(url).origin
        if (linkOrigin !== platformOrigin) {
          event.preventDefault()
          shell.openExternal(url)
        }
      } catch {
        // Invalid URL
      }
    })

    // Inject Custom CSS
    view.webContents.on('did-finish-load', () => {
      // Global CSS: Hide Scrollbars
      view.webContents.insertCSS(`
        ::-webkit-scrollbar { display: none !important; }
      `)

      // Platform Specific Fixes
      if (platform.name === 'X') {
        view.webContents.insertCSS(`
          header[role="banner"] { 
            width: 6px !important; 
            overflow: hidden;
            transition: width 0.3s ease, opacity 0.3s ease;
            opacity: 0.5;
            z-index: 9999;
          }
          header[role="banner"] > div > div > div > div > div > nav > a span { display: none !important; }
          header[role="banner"]:hover { 
            width: 68px !important; 
            opacity: 1;
          } 
        `)
      }

      if (platform.name === 'LinkedIn') {
        view.webContents.executeJavaScript(`
          try {
            const forceDark = () => {
              document.documentElement.classList.add('theme--dark');
              document.documentElement.setAttribute('data-theme', 'dark');
              if (localStorage.getItem('theme') !== 'dark') {
                localStorage.setItem('theme', 'dark');
              }
            };
            forceDark();
            const themeObserver = new MutationObserver(forceDark);
            themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
          } catch (e) { console.error('LinkedIn script injection failed', e); }
        `)
      }

      if (platform.name === 'Reddit') {
        // Force dark mode on Reddit
        view.webContents.executeJavaScript(`
          try {
            // Reddit uses a cookie for theme preference
            document.cookie = 'theme=dark;path=/;max-age=31536000';
            // Also try to set via localStorage if available
            if (window.localStorage) {
              localStorage.setItem('theme', 'dark');
            }
          } catch (e) { console.error('Reddit dark mode injection failed', e); }
        `)
        // Hide Reddit's sidebar for cleaner look
        view.webContents.insertCSS(`
          /* Hide right sidebar on Reddit */
          [data-testid="frontpage-sidebar"] { display: none !important; }
          .sidebar { display: none !important; }
        `)
      }
    })

    // Track navigation to pause/resume scroll sync when entering/leaving posts
    view.webContents.on('did-navigate', (_event, url) => {
      const viewIndex = views.indexOf(view)
      const onFeed = isOnFeedPage(url, platform.name)
      updateScrollSyncState(viewIndex, onFeed)
    })
    
    view.webContents.on('did-navigate-in-page', (_event, url) => {
      const viewIndex = views.indexOf(view)
      const onFeed = isOnFeedPage(url, platform.name)
      updateScrollSyncState(viewIndex, onFeed)
    })
  })
  
  // Send initial state to renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('PLATFORM_ORDER_CHANGED', platformOrder)
    win?.webContents.send('VISIBILITY_CHANGED', platformVisibility)
  })

  updateLayout()

  win.on('resize', () => {
    updateLayout()
  })
  
  // Reset focus mode opacity when window loses focus (mouse likely left)
  win.on('blur', () => {
    if (focusModeEnabled && focusedViewIndex !== null) {
      focusedViewIndex = null
      views.forEach((view) => {
        if (!view.webContents.isDestroyed()) {
          view.webContents.send('SET_VIEW_OPACITY', { opacity: 1 })
        }
      })
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL as string)
  } else {
    win.loadFile(join(process.env.DIST as string, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.whenReady().then(async () => {
  nativeTheme.themeSource = 'dark'
  
  // Load saved settings before creating window
  const savedSettings = loadSettings()
  platformOrder = savedSettings.platformOrder
  platformVisibility = savedSettings.platformVisibility
  scrollSyncEnabled = savedSettings.scrollSyncEnabled
  focusModeEnabled = savedSettings.focusModeEnabled
  grayscaleModeEnabled = savedSettings.grayscaleModeEnabled
  recalculateSplits()
  
  try {
    const blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch)
    if (session.defaultSession) {
      blocker.enableBlockingInSession(session.defaultSession)
      console.log('AdBlocker enabled!')
    }
  } catch (error) {
    console.error('Failed to enable AdBlocker:', error)
  }

  createWindow()

  // Initialize auto-updater (only in production)
  if (app.isPackaged && win) {
    initAutoUpdater(win)
    // Check for updates on startup
    checkForUpdates()
  } else {
    // In development, fall back to the old security update checker
    checkForElectronUpdates().then((latestVersion) => {
      if (latestVersion && isVersionOutdated(process.versions.electron, latestVersion)) {
        console.log(`Security Update Available: ${latestVersion} (Current: ${process.versions.electron})`)
        win?.webContents.send('SECURITY_UPDATE_AVAILABLE', latestVersion)
      }
    })
  }

  ipcMain.on('RELOAD_ALL', () => {
    views.forEach((view) => {
      if (!view.webContents.isDestroyed()) {
        view.webContents.reload()
      }
    })
  })

  // Scroll sync toggle handler
  ipcMain.on('TOGGLE_SCROLL_SYNC', () => {
    scrollSyncEnabled = !scrollSyncEnabled
    saveSettings({ scrollSyncEnabled })
    // Broadcast to renderer
    win?.webContents.send('SCROLL_SYNC_CHANGED', { enabled: scrollSyncEnabled })
    // Broadcast to all views
    views.forEach((view) => {
      if (!view.webContents.isDestroyed()) {
        view.webContents.send('SCROLL_SYNC_CHANGED', { enabled: scrollSyncEnabled })
      }
    })
  })

  // Get initial scroll sync state
  ipcMain.handle('GET_SCROLL_SYNC_STATE', () => {
    return { enabled: scrollSyncEnabled }
  })

  // Focus mode toggle handler
  ipcMain.on('TOGGLE_FOCUS_MODE', () => {
    focusModeEnabled = !focusModeEnabled
    saveSettings({ focusModeEnabled })
    // Broadcast to renderer
    win?.webContents.send('FOCUS_MODE_CHANGED', { enabled: focusModeEnabled })
    // Broadcast to all views
    views.forEach((view) => {
      if (!view.webContents.isDestroyed()) {
        view.webContents.send('FOCUS_MODE_CHANGED', { enabled: focusModeEnabled })
      }
    })
    // Reset opacity when focus mode is disabled
    if (!focusModeEnabled) {
      focusedViewIndex = null
      views.forEach((view) => {
        if (!view.webContents.isDestroyed()) {
          view.webContents.send('SET_VIEW_OPACITY', { opacity: 1 })
        }
      })
    }
  })

  // Get initial focus mode state
  ipcMain.handle('GET_FOCUS_MODE_STATE', () => {
    return { enabled: focusModeEnabled }
  })

  // Grayscale mode toggle handler
  ipcMain.on('TOGGLE_GRAYSCALE_MODE', () => {
    grayscaleModeEnabled = !grayscaleModeEnabled
    saveSettings({ grayscaleModeEnabled })
    // Broadcast to renderer
    win?.webContents.send('GRAYSCALE_MODE_CHANGED', { enabled: grayscaleModeEnabled })
    // Broadcast to all views to apply/remove grayscale filter
    views.forEach((view) => {
      if (!view.webContents.isDestroyed()) {
        view.webContents.send('GRAYSCALE_MODE_CHANGED', { enabled: grayscaleModeEnabled })
      }
    })
  })

  // Get initial grayscale mode state
  ipcMain.handle('GET_GRAYSCALE_MODE_STATE', () => {
    return { enabled: grayscaleModeEnabled }
  })

  // Focus view tracking handler - called when mouse enters a view
  // We only receive mouseenter events now, not mouseleave
  // This prevents blinking when moving between feeds
  ipcMain.on('FOCUS_VIEW', (event: IpcMainEvent, { viewIndex }: { viewIndex: number | null }) => {
    if (!focusModeEnabled) return
    
    // Only update if the focused view actually changed
    if (focusedViewIndex === viewIndex) return
    
    focusedViewIndex = viewIndex
    
    // Apply opacity to all views
    views.forEach((view, index) => {
      if (view.webContents.isDestroyed()) return
      
      // Dim unfocused views to 12% opacity
      const opacity = index === viewIndex ? 1 : 0.12
      view.webContents.send('SET_VIEW_OPACITY', { opacity })
    })
  })

  ipcMain.on('SCROLL_UPDATE', (event: IpcMainEvent, { y }: { y: number }) => {
    // Check if scroll sync is enabled
    if (!scrollSyncEnabled) {
      return
    }
    
    // Find which view sent this scroll update
    const senderIndex = views.findIndex(v => !v.webContents.isDestroyed() && v.webContents.id === event.sender.id)
    
    // If the sender is on a post page, don't broadcast its scroll to others
    // This prevents the "jump to top" issue when clicking into a post
    if (senderIndex !== -1 && viewsOnPost.has(senderIndex)) {
      return
    }
    
    views.forEach((view, index) => {
      if (!view.webContents.isDestroyed() && view.webContents.id !== event.sender.id) {
        // Don't send scroll commands to views that are on a post page
        if (viewsOnPost.has(index)) {
          return
        }
        view.webContents.send('SCROLL_COMMAND', { y })
      }
    })
  })

  ipcMain.on('UPDATE_LAYOUT', (_event, { splits }: { splits: number[] }) => {
    currentSplits = splits
    updateLayout()
  })
  
  ipcMain.on('RESET_LAYOUT', () => {
    recalculateSplits()
    updateLayout()
  })
  
  ipcMain.on('REORDER_PLATFORMS', (_event, { order }: { order: number[] }) => {
    reorderPlatforms(order)
  })
  
  ipcMain.on('TOGGLE_VISIBILITY', (_event, { index }: { index: number }) => {
    toggleVisibility(index)
  })
  
  ipcMain.handle('GET_PLATFORMS', () => {
    return {
      platforms: PLATFORMS.map(p => p.name),
      order: platformOrder,
      visibility: platformVisibility
    }
  })
  
  // Auto-updater IPC handlers
  ipcMain.on('CHECK_FOR_UPDATES', () => {
    checkForUpdates()
  })
  
  ipcMain.on('DOWNLOAD_UPDATE', () => {
    downloadUpdate()
  })
  
  ipcMain.on('INSTALL_UPDATE', () => {
    quitAndInstall()
  })
})
