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
      {/* Blue gradient background */}
      <div
        className="absolute inset-0 -z-10"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #60a5fa 100%)' }}
      />

      {/* Music notes background */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none -z-10"
        viewBox="0 0 1920 1080"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <g opacity="0.08">
          <text x="120" y="300" fontSize="180" fontFamily="sans-serif" fill="#fff">&#9835;</text>
          <text x="800" y="180" fontSize="120" fontFamily="sans-serif" fill="#fff">&#119070;</text>
          <text x="1500" y="600" fontSize="160" fontFamily="sans-serif" fill="#fff">&#9833;</text>
          <text x="1700" y="400" fontSize="100" fontFamily="sans-serif" fill="#fff">&#119070;</text>
          <text x="300" y="800" fontSize="140" fontFamily="sans-serif" fill="#fff">&#9834;</text>
          <text x="1200" y="900" fontSize="110" fontFamily="sans-serif" fill="#fff">&#9835;</text>
        </g>
      </svg>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}