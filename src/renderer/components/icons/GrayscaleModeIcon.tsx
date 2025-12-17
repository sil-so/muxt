import React from 'react'

interface IconProps {
  className?: string
  size?: number
}

export const GrayscaleModeIcon: React.FC<IconProps> = ({ className, size = 14 }) => (
  <svg
    viewBox="0 0 256 256"
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={16}
    role="img"
    aria-label="Grayscale Mode On"
  >
    <line x1="48" y1="40" x2="208" y2="216" />
    <path d="M205.14,165.28A80.3,80.3,0,0,0,208,144c0-72-80-128-80-128A242.3,242.3,0,0,0,95.54,44.72" />
    <path d="M74.9,69.59C60.11,90.4,48,116,48,144a80,80,0,0,0,141.29,51.42" />
  </svg>
)
