import React from 'react'
import ReactDOM from 'react-dom/client'
import { RotateCw, GripVertical } from 'lucide-react'
import { ResizeOverlay } from './components/ResizeOverlay'
import { UpdateNotification } from './components/UpdateNotification'
import {
  XIcon,
  LinkedInIcon,
  BlueskyIcon,
  ThreadsIcon,
  RedditIcon,
  EyeIcon,
  EyeSlashIcon,
} from './components/icons'
import { calculateEqualSplits, getVisibleCount, canHide } from './lib/feedState'
import './globals.css'

// Platform icon components mapping
const PLATFORM_ICONS: Record<string, React.FC<{ className?: string; size?: number }>> = {
  'X': XIcon,
  'LinkedIn': LinkedInIcon,
  'Bluesky': BlueskyIcon,
  'Threads': ThreadsIcon,
  'Reddit': RedditIcon,
}

const App = () => {
  const [securityUpdate, setSecurityUpdate] = React.useState<string | null>(null)
  const [platforms, setPlatforms] = React.useState<string[]>([])
  const [order, setOrder] = React.useState<number[]>([])
  const [visibility, setVisibility] = React.useState<boolean[]>([])
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null)
  
  // Auto-updater state
  const [updateInfo, setUpdateInfo] = React.useState<UpdateInfo | null>(null)
  const [downloadProgress, setDownloadProgress] = React.useState<DownloadProgress | null>(null)
  const [isUpdateDownloaded, setIsUpdateDownloaded] = React.useState(false)
  const [updateError, setUpdateError] = React.useState<string | null>(null)

  React.useEffect(() => {
    window.electron.onSecurityUpdate((version) => {
      setSecurityUpdate(version)
    })
    
    // Auto-updater event listeners
    window.electron.onUpdateAvailable((info) => {
      setUpdateInfo(info)
      setUpdateError(null)
    })
    
    window.electron.onDownloadProgress((progress) => {
      setDownloadProgress(progress)
    })
    
    window.electron.onUpdateDownloaded((info) => {
      setUpdateInfo(info)
      setDownloadProgress(null)
      setIsUpdateDownloaded(true)
    })
    
    window.electron.onUpdateError((error) => {
      setUpdateError(error)
      setDownloadProgress(null)
    })
    
    window.electron.onPlatformOrderChanged((newOrder) => {
      setOrder(newOrder)
    })
    
    window.electron.onVisibilityChanged((newVisibility) => {
      setVisibility(newVisibility)
    })
    
    // Get initial platforms
    window.electron.getPlatforms().then(({ platforms: p, order: o, visibility: v }) => {
      setPlatforms(p)
      setOrder(o)
      setVisibility(v)
    })
  }, [])

  const handleReload = () => {
    window.electron.reloadAll()
  }
  
  const handleResize = (splits: number[]) => {
    window.electron.updateLayout(splits)
  }

  const handleResetLayout = () => {
    window.electron.resetLayout()
  }

  const handleToggleVisibility = (platformIndex: number, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent drag from starting
    window.electron.toggleVisibility(platformIndex)
  }

  const handleDragStart = (e: React.DragEvent, displayIndex: number) => {
    setDraggedIndex(displayIndex)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(displayIndex))
  }

  const handleDragOver = (e: React.DragEvent, displayIndex: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedIndex !== null && draggedIndex !== displayIndex) {
      setDragOverIndex(displayIndex)
    }
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    // Create new order by moving the dragged item
    const newOrder = [...order]
    const [removed] = newOrder.splice(draggedIndex, 1)
    newOrder.splice(dropIndex, 0, removed)
    
    setOrder(newOrder)
    window.electron.reorderPlatforms(newOrder)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDownloadUpdate = () => {
    window.electron.downloadUpdate()
  }

  const handleInstallUpdate = () => {
    window.electron.installUpdate()
  }

  const handleDismissUpdate = () => {
    setUpdateInfo(null)
    setUpdateError(null)
    setDownloadProgress(null)
    setIsUpdateDownloaded(false)
  }

  // Get platforms in display order with their original indices
  const orderedPlatformsWithIndices = order.map(idx => ({
    name: platforms[idx],
    originalIndex: idx,
    isVisible: visibility[idx],
  })).filter(p => p.name)

  // Calculate visible count and splits for ResizeOverlay
  const visibleCount = getVisibleCount(visibility)
  const defaultSplits = calculateEqualSplits(visibleCount)

  return (
    <>
      {/* Title bar header - 30px tall, draggable */}
      <div className="fixed top-0 left-0 right-0 h-[30px] bg-[#1e1e1e] flex items-center drag-region z-[200]">
        {/* Left spacer for traffic lights (macOS) */}
        <div className="w-[80px] flex-shrink-0"></div>
        
        {/* Center - Draggable platform icons with visibility toggles */}
        <div className="flex-1 flex justify-center items-center gap-1 no-drag">
          {orderedPlatformsWithIndices.map((platform, displayIndex) => {
            const IconComponent = PLATFORM_ICONS[platform.name]
            const canHideThis = canHide(visibility, platform.originalIndex)
            
            return (
              <div
                key={`${platform.name}-${displayIndex}`}
                draggable
                onDragStart={(e) => handleDragStart(e, displayIndex)}
                onDragOver={(e) => handleDragOver(e, displayIndex)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, displayIndex)}
                onDragEnd={handleDragEnd}
                className={`
                  flex items-center gap-1 px-2 py-0.5 rounded cursor-grab active:cursor-grabbing
                  transition-all duration-150 select-none
                  ${draggedIndex === displayIndex ? 'opacity-50' : ''}
                  ${dragOverIndex === displayIndex ? 'bg-[#333] scale-105' : 'hover:bg-[#2a2a2a]'}
                  ${!platform.isVisible ? 'opacity-60' : ''}
                `}
                title={`Drag to reorder ${platform.name}`}
              >
                <GripVertical className="h-3 w-3 text-[#444]" strokeWidth={1.5} />
                {IconComponent && (
                  <IconComponent 
                    size={14} 
                    className={platform.isVisible ? 'text-[#888]' : 'text-[#444]'} 
                  />
                )}
                <button
                  onClick={(e) => handleToggleVisibility(platform.originalIndex, e)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`
                    p-0.5 rounded transition-colors
                    ${canHideThis || !platform.isVisible 
                      ? 'hover:bg-[#333] cursor-pointer' 
                      : 'cursor-not-allowed opacity-50'}
                  `}
                  title={platform.isVisible ? `Hide ${platform.name}` : `Show ${platform.name}`}
                  disabled={!canHideThis && platform.isVisible}
                >
                  {platform.isVisible ? (
                    <EyeIcon size={12} className="text-[#666]" />
                  ) : (
                    <EyeSlashIcon size={12} className="text-[#444]" />
                  )}
                </button>
              </div>
            )
          })}
        </div>
        
        {/* Right side - Reload Button */}
        <div className="no-drag flex items-center pr-3">
          <button 
            onClick={handleReload} 
            className="text-[#444] hover:text-[#666] transition-colors p-1 rounded focus:outline-none"
            title="Reload Feeds"
          >
            <RotateCw className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </button>
        </div>
      </div>
      
      {/* Security warning banner */}
      {securityUpdate && (
        <div className="fixed top-[30px] left-0 right-0 bg-red-600 text-white px-2 py-0.5 text-[10px] text-center font-medium z-[200]">
          Security Warning: Your Electron engine is outdated (v{securityUpdate}). Please rebuild.
        </div>
      )}
      
      {/* Resize overlay - covers full window below header */}
      <ResizeOverlay 
        initialSplits={defaultSplits}
        visibleCount={visibleCount}
        onResize={handleResize} 
        onReset={handleResetLayout} 
      />
      
      {/* Auto-update notification */}
      <UpdateNotification
        updateInfo={updateInfo}
        downloadProgress={downloadProgress}
        isDownloaded={isUpdateDownloaded}
        error={updateError}
        onDownload={handleDownloadUpdate}
        onInstall={handleInstallUpdate}
        onDismiss={handleDismissUpdate}
      />
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
