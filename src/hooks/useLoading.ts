'use client'

import { useState, useCallback } from 'react'
import { logError } from '@/lib/errorLogger'

interface UseLoadingState {
  loading: boolean
  error: Error | null
  setLoading: (loading: boolean) => void
  setError: (error: Error | null) => void
  execute: <T>(asyncFn: () => Promise<T>) => Promise<T | null>
  reset: () => void
}

export function useLoading(initialLoading = false): UseLoadingState {
  const [loading, setLoading] = useState(initialLoading)
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(async <T,>(asyncFn: () => Promise<T>): Promise<T | null> => {
    try {
      setLoading(true)
      setError(null)
      const result = await asyncFn()
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred')
      setError(error)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
  }, [])

  return {
    loading,
    error,
    setLoading,
    setError,
    execute,
    reset
  }
}

interface UseAsyncState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  execute: (asyncFn: () => Promise<T>) => Promise<void>
  reset: () => void
}

export function useAsync<T>(initialData: T | null = null): UseAsyncState<T> {
  const [data, setData] = useState<T | null>(initialData)
  const { loading, error, execute: executeLoading, reset: resetLoading } = useLoading()

  const execute = useCallback(async (asyncFn: () => Promise<T>) => {
    const result = await executeLoading(asyncFn)
    if (result !== null) {
      setData(result)
    }
  }, [executeLoading])

  const reset = useCallback(() => {
    setData(initialData)
    resetLoading()
  }, [initialData, resetLoading])

  return {
    data,
    loading,
    error,
    execute,
    reset
  }
}

// Hook for handling multiple loading states
interface UseMultipleLoadingState {
  loadingStates: Record<string, boolean>
  isAnyLoading: boolean
  setLoading: (key: string, loading: boolean) => void
  execute: <T>(key: string, asyncFn: () => Promise<T>) => Promise<T | null>
}

export function useMultipleLoading(): UseMultipleLoadingState {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }))
  }, [])

  const execute = useCallback(async <T,>(key: string, asyncFn: () => Promise<T>): Promise<T | null> => {
    try {
      setLoading(key, true)
      const result = await asyncFn()
      return result
    } catch (error) {
      logError(`Error in ${key}`, error)
      return null
    } finally {
      setLoading(key, false)
    }
  }, [setLoading])

  const isAnyLoading = Object.values(loadingStates).some(Boolean)

  return {
    loadingStates,
    isAnyLoading,
    setLoading,
    execute
  }
}

export default useLoading