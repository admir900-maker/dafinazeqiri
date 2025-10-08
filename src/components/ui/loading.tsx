'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Loader2, Music, Ticket, Calendar, Users } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  }

  return (
    <Loader2
      className={cn('animate-spin', sizeClasses[size], className)}
    />
  )
}

interface LoadingStateProps {
  type?: 'spinner' | 'skeleton' | 'pulse' | 'dots' | 'music'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  text?: string
  className?: string
  children?: ReactNode
}

export function LoadingState({
  type = 'spinner',
  size = 'md',
  text = 'Loading...',
  className,
  children
}: LoadingStateProps) {
  const renderLoading = () => {
    switch (type) {
      case 'spinner':
        return (
          <div className={cn('flex flex-col items-center justify-center space-y-3', className)}>
            <LoadingSpinner size={size} />
            <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
          </div>
        )

      case 'skeleton':
        return (
          <div className={cn('space-y-3', className)}>
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
          </div>
        )

      case 'pulse':
        return (
          <div className={cn('flex items-center justify-center', className)}>
            <div className="flex space-x-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        )

      case 'dots':
        return (
          <div className={cn('flex items-center justify-center space-x-1', className)}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        )

      case 'music':
        return (
          <div className={cn('flex flex-col items-center justify-center space-y-4', className)}>
            <div className="relative">
              <Music className={cn('text-blue-500 animate-pulse', size === 'sm' ? 'h-8 w-8' : size === 'md' ? 'h-12 w-12' : size === 'lg' ? 'h-16 w-16' : 'h-20 w-20')} />
              <div className="absolute inset-0 rounded-full border-2 border-blue-500 animate-ping opacity-30" />
            </div>
            <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
          </div>
        )

      default:
        return children || <LoadingSpinner size={size} className={className} />
    }
  }

  return renderLoading()
}

interface PageLoadingProps {
  title?: string
  description?: string
  icon?: 'music' | 'ticket' | 'calendar' | 'users'
  className?: string
}

export function PageLoading({
  title = 'Loading...',
  description = 'Please wait while we load your content',
  icon = 'music',
  className
}: PageLoadingProps) {
  const iconComponents = {
    music: Music,
    ticket: Ticket,
    calendar: Calendar,
    users: Users
  }

  const IconComponent = iconComponents[icon]

  return (
    <div className={cn('min-h-[50vh] flex flex-col items-center justify-center space-y-6 p-8', className)}>
      <div className="relative">
        <IconComponent className="h-16 w-16 text-blue-500 animate-pulse" />
        <div className="absolute inset-0 rounded-full border-2 border-blue-500 animate-ping opacity-30" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-600 max-w-md">{description}</p>
      </div>
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
    </div>
  )
}

interface InlineLoadingProps {
  text?: string
  className?: string
}

export function InlineLoading({ text = 'Loading...', className }: InlineLoadingProps) {
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <LoadingSpinner size="sm" />
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  )
}

interface ButtonLoadingProps {
  loading?: boolean
  children: ReactNode
  className?: string
}

export function ButtonLoading({ loading = false, children, className }: ButtonLoadingProps) {
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      {loading && <LoadingSpinner size="sm" />}
      {children}
    </div>
  )
}

interface CardLoadingProps {
  className?: string
}

export function CardLoading({ className }: CardLoadingProps) {
  return (
    <div className={cn('border rounded-lg p-6 space-y-4', className)}>
      <div className="h-4 bg-gray-200 rounded animate-pulse" />
      <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
      <div className="h-32 bg-gray-200 rounded animate-pulse" />
      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
    </div>
  )
}

interface LoadingOverlayProps {
  show: boolean
  text?: string
  className?: string
}

export function LoadingOverlay({ show, text = 'Loading...', className }: LoadingOverlayProps) {
  if (!show) return null

  return (
    <div className={cn(
      'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center',
      className
    )}>
      <div className="bg-white rounded-lg p-6 flex flex-col items-center space-y-4 max-w-sm mx-4">
        <LoadingSpinner size="lg" />
        <p className="text-center text-gray-700">{text}</p>
      </div>
    </div>
  )
}

export default LoadingState