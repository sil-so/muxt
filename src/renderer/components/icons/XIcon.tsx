import React from 'react'

interface IconProps {
  className?: string
  size?: number
}

export const XIcon: React.FC<IconProps> = ({ className, size = 14 }) => (
  <svg
    viewBox="0 0 512 512"
    width={size}
    height={size}
    className={className}
    fill="currentColor"
    role="img"
    aria-label="X"
  >
    <g transform="translate(64, 64) scale(0.75, 0.75)">
      <path d="M403.2 48h78.643l-171.52 196.544L512 488h-158.016l-123.744-161.248L99.136 488H10.112l183.456-210.24L0 48h161.024l111.84 148.288L403.2 48zm-27.52 417.792h43.52L138.368 68.672H91.776z" />
    </g>
  </svg>
)
