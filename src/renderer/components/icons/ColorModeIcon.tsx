import React from 'react'

interface IconProps {
  className?: string
  size?: number
}

export const ColorModeIcon: React.FC<IconProps> = ({ className, size = 14 }) => (
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
    aria-label="Color Mode On"
  >
    <path d="M208,144c0-72-80-128-80-128S48,72,48,144a80,80,0,0,0,160,0Z" />
  </svg>
)
