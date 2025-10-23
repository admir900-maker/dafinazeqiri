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

      {/* Floating music notes overlay */}
      <div className="absolute inset-0 -z-5 pointer-events-none overflow-hidden">
        {/* Predefined positions/durations to avoid SSR randomness */}
        {[
          { left: '5%', size: '18px', dur: '14s', delay: '0s', char: '♪' },
          { left: '12%', size: '22px', dur: '16s', delay: '2s', char: '♬' },
          { left: '20%', size: '14px', dur: '12s', delay: '1s', char: '♫' },
          { left: '28%', size: '20px', dur: '18s', delay: '3s', char: '♪' },
          { left: '36%', size: '16px', dur: '15s', delay: '5s', char: '♩' },
          { left: '44%', size: '24px', dur: '19s', delay: '2.5s', char: '♬' },
          { left: '52%', size: '18px', dur: '13s', delay: '4s', char: '♫' },
          { left: '60%', size: '20px', dur: '17s', delay: '1.5s', char: '♪' },
          { left: '68%', size: '14px', dur: '12s', delay: '3.5s', char: '♩' },
          { left: '76%', size: '22px', dur: '16s', delay: '0.5s', char: '♬' },
          { left: '84%', size: '16px', dur: '15s', delay: '2.2s', char: '♫' },
          { left: '92%', size: '20px', dur: '18s', delay: '4.2s', char: '♪' },
        ].map((n, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="music-note select-none"
            style={{
              left: n.left as string,
              fontSize: n.size,
              animationDuration: n.dur,
              animationDelay: n.delay,
            }}
          >
            {n.char}
          </span>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}