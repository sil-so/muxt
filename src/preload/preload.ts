import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

// Scroll sync with trailing debounce + controlled smooth scroll
let isProgrammaticScroll = false
let lastScrollY = 0
let scrollDebounceTimer: ReturnType<typeof setTimeout> | null = null

// Custom smooth scroll state - allows cancellation and retargeting
let smoothScrollAnimationId: number | null = null
let smoothScrollTarget: number | null = null

// Debounce for incoming SCROLL_COMMAND
let scrollCommandDebounceTimer: ReturnType<typeof setTimeout> | null = null

// Scroll sync state - controlled by main process
let scrollSyncEnabled = true

// Custom smooth scroll that can be cancelled/retargeted without bounce
function smoothScrollTo(targetY: number, duration: number = 150) {
  // Cancel any existing animation
  if (smoothScrollAnimationId !== null) {
    cancelAnimationFrame(smoothScrollAnimationId)
  }
  
  const startY = window.scrollY
  const distance = targetY - startY
  
  // If already close, just jump there
  if (Math.abs(distance) < 10) {
    window.scrollTo({ top: targetY, behavior: 'instant' })
    return
  }
  
  smoothScrollTarget = targetY
  const startTime = performance.now()
  
  function animate(currentTime: number) {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    // Ease-out cubic for smooth deceleration
    const easeOut = 1 - Math.pow(1 - progress, 3)
    
    const currentY = startY + (distance * easeOut)
    
    isProgrammaticScroll = true
    lastScrollY = currentY
    window.scrollTo({ top: currentY, behavior: 'instant' })
    
    if (progress < 1) {
      smoothScrollAnimationId = requestAnimationFrame(animate)
    } else {
      smoothScrollAnimationId = null
      smoothScrollTarget = null
      // Keep isProgrammaticScroll true briefly to ignore the final scroll event
      setTimeout(() => {
        isProgrammaticScroll = false
      }, 10)
    }
  }
  
  smoothScrollAnimationId = requestAnimationFrame(animate)
}

// Listen for scroll sync state changes
ipcRenderer.on('SCROLL_SYNC_CHANGED', (_event: IpcRendererEvent, { enabled }: { enabled: boolean }) => {
  scrollSyncEnabled = enabled
})

// Focus mode state
let focusModeEnabled = false
let viewIndex: number | null = null

// Grayscale mode state
let grayscaleModeEnabled = false

// Listen for focus mode state changes
ipcRenderer.on('FOCUS_MODE_CHANGED', (_event: IpcRendererEvent, { enabled }: { enabled: boolean }) => {
  focusModeEnabled = enabled
})

// Listen for grayscale mode state changes and apply/remove CSS filter
ipcRenderer.on('GRAYSCALE_MODE_CHANGED', (_event: IpcRendererEvent, { enabled }: { enabled: boolean }) => {
  grayscaleModeEnabled = enabled
  if (enabled) {
    document.documentElement.style.filter = 'grayscale(100%)'
  } else {
    document.documentElement.style.filter = ''
  }
})

// Listen for view index assignment (sent when view is created)
ipcRenderer.on('SET_VIEW_INDEX', (_event: IpcRendererEvent, { index }: { index: number }) => {
  viewIndex = index
})

// Listen for opacity changes with smooth transition
ipcRenderer.on('SET_VIEW_OPACITY', (_event: IpcRendererEvent, { opacity }: { opacity: number }) => {
  document.documentElement.style.transition = 'opacity 200ms ease-out'
  document.documentElement.style.opacity = String(opacity)
})

// Track mouse enter for focus mode
document.addEventListener('mouseenter', () => {
  if (focusModeEnabled && viewIndex !== null) {
    ipcRenderer.send('FOCUS_VIEW', { viewIndex })
  }
})

window.addEventListener('scroll', () => {
  // Skip if this scroll was triggered programmatically
  if (isProgrammaticScroll) return

  // Skip if scroll sync is disabled
  if (!scrollSyncEnabled) return

  const currentY = window.scrollY
  const delta = Math.abs(currentY - lastScrollY)

  // Ignore very small movements
  if (delta < 5) return

  lastScrollY = currentY

  // Trailing debounce: wait 50ms after last scroll event before syncing
  if (scrollDebounceTimer) clearTimeout(scrollDebounceTimer)
  scrollDebounceTimer = setTimeout(() => {
    ipcRenderer.send('SCROLL_UPDATE', { y: window.scrollY })
  }, 150)
})

ipcRenderer.on('SCROLL_COMMAND', (_event: IpcRendererEvent, { y }: { y: number }) => {
  // Ignore if already close and not animating
  if (Math.abs(window.scrollY - y) < 10 && smoothScrollTarget === null) return

  // Reset debounce
  if (scrollCommandDebounceTimer) {
    clearTimeout(scrollCommandDebounceTimer)
  }

  // Trailing debounce before starting smooth scroll
  scrollCommandDebounceTimer = setTimeout(() => {
    smoothScrollTo(y, 350)
    scrollCommandDebounceTimer = null
  }, 150)
})

// Update info type for auto-updater
interface UpdateInfo {
  version: string
  releaseNotes?: string
  releaseDate?: string
}

interface DownloadProgress {
  percent: number
  bytesPerSecond: number
  total: number
  transferred: number
}

contextBridge.exposeInMainWorld('electron', {
  reloadAll: () => ipcRenderer.send('RELOAD_ALL'),
  updateLayout: (splits: number[]) => ipcRenderer.send('UPDATE_LAYOUT', { splits }),
  resetLayout: () => ipcRenderer.send('RESET_LAYOUT'),
  reorderPlatforms: (order: number[]) => ipcRenderer.send('REORDER_PLATFORMS', { order }),
  toggleVisibility: (index: number) => ipcRenderer.send('TOGGLE_VISIBILITY', { index }),
  getPlatforms: () => ipcRenderer.invoke('GET_PLATFORMS'),

  onSecurityUpdate: (callback: (version: string) => void) => {
    ipcRenderer.on('SECURITY_UPDATE_AVAILABLE', (_event, version) => callback(version))
  },
  onPlatformOrderChanged: (callback: (order: number[]) => void) => {
    ipcRenderer.on('PLATFORM_ORDER_CHANGED', (_event, order) => callback(order))
  },
  onVisibilityChanged: (callback: (visibility: boolean[]) => void) => {
    ipcRenderer.on('VISIBILITY_CHANGED', (_event, visibility) => callback(visibility))
  },

  // Scroll sync methods
  toggleScrollSync: () => ipcRenderer.send('TOGGLE_SCROLL_SYNC'),
  getScrollSyncState: () => ipcRenderer.invoke('GET_SCROLL_SYNC_STATE'),
  onScrollSyncChanged: (callback: (enabled: boolean) => void) => {
    ipcRenderer.on('SCROLL_SYNC_CHANGED', (_event, { enabled }) => callback(enabled))
  },

  // Focus mode methods
  toggleFocusMode: () => ipcRenderer.send('TOGGLE_FOCUS_MODE'),
  getFocusModeState: () => ipcRenderer.invoke('GET_FOCUS_MODE_STATE'),
  onFocusModeChanged: (callback: (enabled: boolean) => void) => {
    ipcRenderer.on('FOCUS_MODE_CHANGED', (_event, { enabled }) => callback(enabled))
  },

  // Grayscale mode methods
  toggleGrayscaleMode: () => ipcRenderer.send('TOGGLE_GRAYSCALE_MODE'),
  getGrayscaleModeState: () => ipcRenderer.invoke('GET_GRAYSCALE_MODE_STATE'),
  onGrayscaleModeChanged: (callback: (enabled: boolean) => void) => {
    ipcRenderer.on('GRAYSCALE_MODE_CHANGED', (_event, { enabled }) => callback(enabled))
  },

  // Auto-updater methods
  checkForUpdates: () => ipcRenderer.send('CHECK_FOR_UPDATES'),
  downloadUpdate: () => ipcRenderer.send('DOWNLOAD_UPDATE'),
  installUpdate: () => ipcRenderer.send('INSTALL_UPDATE'),

  // Auto-updater event listeners
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => {
    ipcRenderer.on('UPDATE_AVAILABLE', (_event, info) => callback(info))
  },
  onUpdateNotAvailable: (callback: () => void) => {
    ipcRenderer.on('UPDATE_NOT_AVAILABLE', () => callback())
  },
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => {
    ipcRenderer.on('DOWNLOAD_PROGRESS', (_event, progress) => callback(progress))
  },
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => {
    ipcRenderer.on('UPDATE_DOWNLOADED', (_event, info) => callback(info))
  },
  onUpdateError: (callback: (error: string) => void) => {
    ipcRenderer.on('UPDATE_ERROR', (_event, error) => callback(error))
  }
})
