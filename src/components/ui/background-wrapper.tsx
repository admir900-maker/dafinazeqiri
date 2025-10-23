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
      {/* Dafina Zeqiri Glamorous Dark Background */}
      <div
        className="absolute inset-0 -z-10"
        style={{ background: '#0a0a0a' }}
      />

      {/* Subtle glamour glow effects */}
      <div className="absolute inset-0 -z-10 pointer-events-none opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-600 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Sparkle overlay */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(236, 72, 153, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(168, 85, 247, 0.3) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(251, 191, 36, 0.2) 0%, transparent 60%)'
          }}
        ></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}