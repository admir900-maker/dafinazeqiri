'use client'

import { createContext, useContext, ReactNode } from 'react'
import { loadStripe, Stripe } from '@stripe/stripe-js'

interface StripeContextType {
  stripePromise: Promise<Stripe | null>
}

const StripeContext = createContext<StripeContextType | undefined>(undefined)

let stripePromise: Promise<Stripe | null>

const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (!publishableKey) {
      throw new Error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable')
    }
    stripePromise = loadStripe(publishableKey)
  }
  return stripePromise
}

export function StripeProvider({ children }: { children: ReactNode }) {
  return (
    <StripeContext.Provider value={{ stripePromise: getStripe() }}>
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