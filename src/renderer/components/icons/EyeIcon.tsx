import React from 'react'

interface IconProps {
  className?: string
  size?: number
}

export const EyeIcon: React.FC<IconProps> = ({ className, size = 14 }) => (
  <svg
    viewBox="0 0 256 256"
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={24}
    role="img"
    aria-label="Visible"
  >
    <path d="M128,56C48,56,16,128,16,128s32,72,112,72,112-72,112-72S208,56,128,56Z" />
    <circle cx="128" cy="128" r="32" />
  </svg>
)
