/// <reference types="vite/client" />

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

interface Window {
  electron: {
    reloadAll: () => void
    updateLayout: (splits: number[]) => void
    resetLayout: () => void
    reorderPlatforms: (order: number[]) => void
    toggleVisibility: (index: number) => void
    getPlatforms: () => Promise<{ platforms: string[]; order: number[]; visibility: boolean[] }>
    onSecurityUpdate: (callback: (version: string) => void) => void
    onPlatformOrderChanged: (callback: (order: number[]) => void) => void
    onVisibilityChanged: (callback: (visibility: boolean[]) => void) => void
    
    // Scroll sync methods
    toggleScrollSync: () => void
    getScrollSyncState: () => Promise<{ enabled: boolean }>
    onScrollSyncChanged: (callback: (enabled: boolean) => void) => void
    
    // Focus mode methods
    toggleFocusMode: () => void
    getFocusModeState: () => Promise<{ enabled: boolean }>
    onFocusModeChanged: (callback: (enabled: boolean) => void) => void
    
    // Auto-updater methods
    checkForUpdates: () => void
    downloadUpdate: () => void
    installUpdate: () => void
    
    // Auto-updater event listeners
    onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void
    onUpdateNotAvailable: (callback: () => void) => void
    onDownloadProgress: (callback: (progress: DownloadProgress) => void) => void
    onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => void
    onUpdateError: (callback: (error: string) => void) => void
  }
}
