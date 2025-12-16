import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

// Simple scroll sync with debounce - no complex navigation detection
let isProgrammaticScroll = false
let lastScrollY = 0

// Debounce scroll sync
let scrollTimeout: ReturnType<typeof setTimeout> | null = null

window.addEventListener('scroll', () => {
  // Skip if this scroll was triggered programmatically
  if (isProgrammaticScroll) {
    isProgrammaticScroll = false
    return
  }

  const currentY = window.scrollY
  const delta = Math.abs(currentY - lastScrollY)

  // Ignore very small movements
  if (delta < 5) return

  lastScrollY = currentY

  // Debounce: wait 50ms before syncing
  if (scrollTimeout) clearTimeout(scrollTimeout)
  scrollTimeout = setTimeout(() => {
    ipcRenderer.send('SCROLL_UPDATE', { y: currentY })
  }, 50)
})

ipcRenderer.on('SCROLL_COMMAND', (_event: IpcRendererEvent, { y }: { y: number }) => {
  // Ignore if current position is already close
  if (Math.abs(window.scrollY - y) < 10) return
  
  isProgrammaticScroll = true
  lastScrollY = y
  
  // Instant scroll (no smooth - was too bouncy)
  window.scrollTo({
    top: y,
    behavior: 'auto'
  })
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
