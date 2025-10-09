'use client'

import { createContext, useContext, ReactNode, useEffect, useState } from 'react'
import { loadStripe, Stripe } from '@stripe/stripe-js'

interface StripeContextType {
  stripePromise: Promise<Stripe | null> | null
  isLoading: boolean
}

const StripeContext = createContext<StripeContextType | undefined>(undefined)

let stripePromise: Promise<Stripe | null> | null = null

// Function to get Stripe public key from API
async function getStripePublicKey(): Promise<string> {
  try {
    const response = await fetch('/api/stripe/public-key')
    if (!response.ok) {
      throw new Error('Failed to fetch Stripe public key')
    }
    const data = await response.json()
    return data.publicKey
  } catch (error) {
    console.error('Error fetching Stripe public key:', error)
    // Fallback to environment variable
    return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
  }
}

const getStripe = async () => {
  if (!stripePromise) {
    const publishableKey = await getStripePublicKey()
    if (!publishableKey) {
      throw new Error('Stripe publishable key not configured')
    }
    stripePromise = loadStripe(publishableKey)
  }
  return stripePromise
}

export function StripeProvider({ children }: { children: ReactNode }) {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initializeStripe = async () => {
      try {
        const promise = getStripe()
        setStripePromise(promise)
      } catch (error) {
        console.error('Failed to initialize Stripe:', error)
        setStripePromise(null)
      } finally {
        setIsLoading(false)
      }
    }

    initializeStripe()
  }, [])

  return (
    <StripeContext.Provider value={{ stripePromise, isLoading }}>
      {children}
    </StripeContext.Provider>
  )
}

export function useStripe() {
  const context = useContext(StripeContext)
  if (context === undefined) {
    throw new Error('useStripe must be used within a StripeProvider')
  }
  return context
}