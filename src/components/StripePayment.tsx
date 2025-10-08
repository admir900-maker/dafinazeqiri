'use client'

import { useState } from 'react'
import {
  useStripe,
  useElements,
  PaymentElement,
  Elements
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCurrency } from '@/contexts/CurrencyContext'
import { Loader2, CreditCard, CheckCircle } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface PaymentFormProps {
  clientSecret: string
  orderSummary: {
    eventId: string
    eventTitle: string
    ticketBreakdown: Array<{
      name: string
      quantity: number
      price: number
      total: number
    }>
    totalPrice: number
    totalTickets: number
  }
  onSuccess: () => void
  onError: (error: string) => void
}

function PaymentForm({ clientSecret, orderSummary, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const { formatPrice } = useCurrency()
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'succeeded' | 'failed'>('idle')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setPaymentStatus('processing')

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/booking/success`,
        },
        redirect: 'if_required',
      })

      if (error) {
        console.error('Payment failed:', error)
        setPaymentStatus('failed')
        onError(error.message || 'Payment failed')
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setPaymentStatus('succeeded')
        onSuccess()
      }
    } catch (err: any) {
      console.error('Payment error:', err)
      setPaymentStatus('failed')
      onError('An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  if (paymentStatus === 'succeeded') {
    return (
      <Card className="bg-green-600/20 backdrop-blur-lg border border-green-500/30 shadow-xl">
        <CardContent className="p-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-green-300 mb-2">Payment Successful!</h3>
          <p className="text-green-200">Your tickets have been booked successfully.</p>
          <p className="text-green-200 text-sm mt-2">Confirmation details will be sent to your email.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Order Summary */}
      <Card className="bg-white/10 backdrop-blur-lg border border-white/30 shadow-xl">
        <CardHeader>
          <CardTitle className="text-white drop-shadow-md">Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-white font-medium">{orderSummary.eventTitle}</div>
            {orderSummary.ticketBreakdown.map((ticket, index) => (
              <div key={index} className="flex justify-between text-white/80 text-sm">
                <span>{ticket.quantity} x {ticket.name}</span>
                <span>{formatPrice(ticket.total)}</span>
              </div>
            ))}
            <div className="border-t border-white/30 pt-3">
              <div className="flex justify-between text-white font-bold">
                <span>Total ({orderSummary.totalTickets} tickets)</span>
                <span>{formatPrice(orderSummary.totalPrice)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
        <CardHeader>
          <CardTitle className="text-white drop-shadow-md flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-4 bg-white/10 rounded-lg">
              <PaymentElement
                options={{
                  layout: 'tabs',
                  defaultValues: {
                    billingDetails: {
                      email: ''
                    }
                  }
                }}
              />
            </div>

            <Button
              type="submit"
              disabled={!stripe || !elements || isProcessing}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 text-lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  Pay {formatPrice(orderSummary.totalPrice)}
                </>
              )}
            </Button>

            {paymentStatus === 'failed' && (
              <div className="text-red-400 text-sm text-center">
                Payment failed. Please check your details and try again.
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

interface StripePaymentProps extends PaymentFormProps { }

export function StripePayment(props: StripePaymentProps) {
  const options = {
    clientSecret: props.clientSecret,
    appearance: {
      theme: 'night' as const,
      variables: {
        colorPrimary: '#9333ea',
        colorBackground: 'rgba(255, 255, 255, 0.1)',
        colorText: '#ffffff',
        colorDanger: '#df1b41',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    },
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm {...props} />
    </Elements>
  )
}