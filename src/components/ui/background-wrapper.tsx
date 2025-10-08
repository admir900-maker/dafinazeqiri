'use client'

import { ReactNode } from 'react'

interface BackgroundWrapperProps {
  children: ReactNode
  className?: string
  fullHeight?: boolean
}

export function BackgroundWrapper({
  children,
  className = '',
  fullHeight = true
}: BackgroundWrapperProps) {
  return (
    <div
      className={`relative overflow-hidden ${fullHeight ? 'min-h-screen' : ''} ${className}`}
    >
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}