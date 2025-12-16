import React, { useState, useEffect, useRef, useCallback } from 'react'
import { calculateEqualSplits } from '../lib/feedState'

interface ResizeOverlayProps {
  initialSplits?: number[]
  visibleCount: number
  onResize: (splits: number[]) => void
  onReset: () => void
}

export const ResizeOverlay: React.FC<ResizeOverlayProps> = ({ 
  initialSplits,
  visibleCount,
  onResize,
  onReset
}) => {
  // Calculate default splits based on visible count
  const defaultSplits = calculateEqualSplits(visibleCount)
  const [splits, setSplits] = useState<number[]>(initialSplits || defaultSplits)
  const [isDragging, setIsDragging] = useState<number | null>(null)
  
  const dragStartXRef = useRef<number>(0)
  const hasMovedRef = useRef<boolean>(false)

  // Update splits when visible count changes
  useEffect(() => {
    const newSplits = calculateEqualSplits(visibleCount)
    setSplits(newSplits)
    onResize(newSplits)
  }, [visibleCount])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging === null) return

    const moveDistance = Math.abs(e.clientX - dragStartXRef.current)
    if (moveDistance > 5) {
      hasMovedRef.current = true
    }

    if (!hasMovedRef.current) return

    const windowWidth = window.innerWidth
    const newPercent = (e.clientX / windowWidth) * 100

    setSplits(prev => {
      const newSplits = [...prev]
      
      const MIN_COL_WIDTH = 10
      
      const lowerBound = (isDragging === 0) ? MIN_COL_WIDTH : newSplits[isDragging - 1] + MIN_COL_WIDTH
      const upperBound = (isDragging === newSplits.length - 1) ? 100 - MIN_COL_WIDTH : newSplits[isDragging + 1] - MIN_COL_WIDTH

      const clampedPercent = Math.max(lowerBound, Math.min(upperBound, newPercent))
      
      newSplits[isDragging] = clampedPercent
      return newSplits
    })
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    if (isDragging === null) return
    
    if (!hasMovedRef.current) {
      const newSplits = calculateEqualSplits(visibleCount)
      setSplits(newSplits)
      onReset()
    }
    
    setIsDragging(null)
    hasMovedRef.current = false
  }, [isDragging, visibleCount, onReset])

  useEffect(() => {
    if (isDragging !== null) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'col-resize'
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  useEffect(() => {
    onResize(splits)
  }, [splits, onResize])
  
  const handleMouseDown = (index: number, e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(index)
    dragStartXRef.current = e.clientX
    hasMovedRef.current = false
  }

  // Don't render any handles if only 1 or 0 visible feeds
  if (visibleCount <= 1) {
    return null
  }

  return (
    <div 
      className="fixed top-[30px] bottom-0 left-0 right-0 pointer-events-none"
      style={{ zIndex: 150 }}
    >
      {splits.map((split, index) => (
        <div
          key={index}
          className="absolute top-0 bottom-0 w-[8px] cursor-col-resize pointer-events-auto flex justify-center items-stretch group"
          style={{ 
            left: `${split}%`,
            transform: 'translateX(-50%)',
            backgroundColor: '#1e1e1e',
          }}
          onMouseDown={(e) => handleMouseDown(index, e)}
        >
          <div className="w-[1px] h-full bg-[#1e1e1e] group-hover:bg-[#555] transition-colors" />
        </div>
      ))}
    </div>
  )
}
