import { X, Download, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from './ui/button'

interface UpdateNotificationProps {
  updateInfo: UpdateInfo | null
  downloadProgress: DownloadProgress | null
  isDownloaded: boolean
  error: string | null
  onDownload: () => void
  onInstall: () => void
  onDismiss: () => void
}

export function UpdateNotification({
  updateInfo,
  downloadProgress,
  isDownloaded,
  error,
  onDownload,
  onInstall,
  onDismiss,
}: UpdateNotificationProps) {
  if (!updateInfo && !error) return null

  return (
    <div className="fixed top-10 right-4 z-50 max-w-sm bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg p-4">
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 text-zinc-400 hover:text-zinc-200"
      >
        <X size={16} />
      </button>

      {error ? (
        <div className="flex items-start gap-3">
          <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="text-sm font-medium text-zinc-100">Update Error</h3>
            <p className="text-xs text-zinc-400 mt-1">{error}</p>
          </div>
        </div>
      ) : isDownloaded ? (
        <div className="flex items-start gap-3">
          <RefreshCw className="text-green-400 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-zinc-100">Update Ready</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Version {updateInfo?.version} is ready to install.
            </p>
            <Button
              onClick={onInstall}
              size="sm"
              className="mt-3 bg-green-600 hover:bg-green-700 text-white"
            >
              Restart to Update
            </Button>
          </div>
        </div>
      ) : downloadProgress ? (
        <div className="flex items-start gap-3">
          <Download className="text-blue-400 flex-shrink-0 mt-0.5 animate-pulse" size={20} />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-zinc-100">Downloading Update</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Version {updateInfo?.version}
            </p>
            <div className="mt-2 w-full bg-zinc-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress.percent}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {Math.round(downloadProgress.percent)}%
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <Download className="text-blue-400 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-zinc-100">Update Available</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Version {updateInfo?.version} is available.
            </p>
            <Button
              onClick={onDownload}
              size="sm"
              className="mt-3 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Download Update
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
