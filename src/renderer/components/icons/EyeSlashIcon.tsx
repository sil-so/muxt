import React from 'react'

interface IconProps {
  className?: string
  size?: number
}

export const EyeSlashIcon: React.FC<IconProps> = ({ className, size = 14 }) => (
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
    aria-label="Hidden"
  >
    <line x1="48" y1="40" x2="208" y2="216" />
    <path d="M74,68.6C33.23,89.24,16,128,16,128s32,72,112,72a118.05,118.05,0,0,0,54-12.6" />
    <path d="M214.41,163.59C232.12,145.73,240,128,240,128S208,56,128,56c-3.76,0-7.42.16-11,.46" />
  </svg>
)
