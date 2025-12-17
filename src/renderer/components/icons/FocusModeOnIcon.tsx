import React from 'react'

interface IconProps {
  className?: string
  size?: number
}

export const FocusModeOnIcon: React.FC<IconProps> = ({ className, size = 14 }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    role="img"
    aria-label="Focus Mode On"
  >
    {/* Target with concentric circles */}
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
)
