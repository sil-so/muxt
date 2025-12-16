import { autoUpdater, UpdateInfo } from 'electron-updater'
import { BrowserWindow } from 'electron'

let mainWindow: BrowserWindow | null = null

export interface UpdateProgress {
  percent: number
  bytesPerSecond: number
  total: number
  transferred: number
}

/**
 * Initialize the auto-updater with event handlers
 */
export function initAutoUpdater(win: BrowserWindow): void {
  mainWindow = win
  
  // Configure auto-updater
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  
  // Event: Update available
  autoUpdater.on('update-available', (info: UpdateInfo) => {
    mainWindow?.webContents.send('UPDATE_AVAILABLE', {
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseDate: info.releaseDate,
    })
  })
  
  // Event: Update not available
  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('UPDATE_NOT_AVAILABLE')
  })
  
  // Event: Download progress
  autoUpdater.on('download-progress', (progress: UpdateProgress) => {
    mainWindow?.webContents.send('DOWNLOAD_PROGRESS', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      total: progress.total,
      transferred: progress.transferred,
    })
  })
  
  // Event: Update downloaded
  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    mainWindow?.webContents.send('UPDATE_DOWNLOADED', {
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseDate: info.releaseDate,
    })
  })
  
  // Event: Error - silently log, don't notify user
  // (Private repos can't use auto-update without GH_TOKEN)
  autoUpdater.on('error', (error: Error) => {
    console.error('Auto-updater error:', error.message)
  })
}

/**
 * Check for available updates
 */
export function checkForUpdates(): void {
  autoUpdater.checkForUpdates().catch((error) => {
    // Silently log - don't notify user (private repos can't auto-update without auth)
    console.error('Failed to check for updates:', error.message)
  })
}

/**
 * Download the available update
 */
export function downloadUpdate(): void {
  autoUpdater.downloadUpdate().catch((error) => {
    console.error('Failed to download update:', error)
    mainWindow?.webContents.send('UPDATE_ERROR', error.message)
  })
}

/**
 * Quit and install the downloaded update
 */
export function quitAndInstall(): void {
  autoUpdater.quitAndInstall()
}
