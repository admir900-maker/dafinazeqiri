'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { ShoppingCart, Trash2, Plus, Minus, CreditCard, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/FavoritesCartContext';
import { SEO } from '@/components/ui/seo';

export default function CartPage() {
  const { user, isLoaded } = useUser();
  const { cartItems, cartCount, removeFromCart, updateQuantity, clearCart, getCartTotal } = useCart();
  const [isLoading, setIsLoading] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(price);
  };

  const handleQuantityChange = (eventId: string, ticketType: string, newQuantity: number) => {
    updateQuantity(eventId, ticketType, newQuantity);
  };

  const handleRemoveItem = (eventId: string, ticketType: string) => {
    removeFromCart(eventId, ticketType);
  };

  const handleProceedToCheckout = () => {
    if (!user) {
      // Redirect to sign in
      window.location.href = '/auth/signin?redirect_url=/cart';
      return;
    }

    // Create checkout session with cart items
    const checkoutData = {
      items: cartItems.map(item => ({
        eventId: item.eventId,
        ticketType: item.ticketType,
        quantity: item.quantity,
        price: item.price
      }))
    };

    // Store checkout data in localStorage and redirect
    localStorage.setItem('checkoutData', JSON.stringify(checkoutData));
    window.location.href = '/checkout';
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Shopping Cart"
        description="Review your selected tickets and proceed to checkout"
      />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <Button variant="outline" asChild>
                <Link href="/events">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Continue Shopping
                </Link>
              </Button>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Shopping Cart
                </h1>
                <p className="text-gray-600 mt-2">
                  {cartCount} {cartCount === 1 ? 'item' : 'items'} in your cart
                </p>
              </div>
            </div>

            {cartItems.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-24 h-24 text-gray-300 mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-gray-700 mb-4">Your cart is empty</h2>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                  Start exploring events and add tickets to your cart to get started.
                </p>
                <Button asChild>
                  <Link href="/events">Browse Events</Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Cart Items */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Cart Items</h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearCart}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Clear Cart
                    </Button>
                  </div>

                  {cartItems.map((item) => (
                    <div
                      key={`${item.eventId}-${item.ticketType}`}
                      className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">
                            {item.eventTitle}
                          </h3>
                          <div className="space-y-1 text-sm text-gray-600 mb-4">
                            <p>{new Date(item.eventDate).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</p>
                            <p>{item.eventVenue}</p>
                          </div>
                          <Badge variant="secondary" className="mb-4">
                            {item.ticketType}
                          </Badge>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center border rounded-lg">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleQuantityChange(item.eventId, item.ticketType, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <span className="px-4 py-2 text-sm font-medium">
                                {item.quantity}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleQuantityChange(item.eventId, item.ticketType, item.quantity + 1)}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="text-lg font-semibold text-gray-800">
                              {formatPrice(item.price)} each
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-xl font-bold text-gray-800 mb-2">
                            {formatPrice(item.price * item.quantity)}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveItem(item.eventId, item.ticketType)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-6">Order Summary</h2>

                    <div className="space-y-4 mb-6">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal ({cartCount} {cartCount === 1 ? 'item' : 'items'})</span>
                        <span>{formatPrice(getCartTotal())}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Service Fee</span>
                        <span>Included</span>
                      </div>
                      <hr />
                      <div className="flex justify-between text-lg font-semibold text-gray-800">
                        <span>Total</span>
                        <span>{formatPrice(getCartTotal())}</span>
                      </div>
                    </div>

                    <Button
                      onClick={handleProceedToCheckout}
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <CreditCard className="w-4 h-4 mr-2" />
                      )}
                      Proceed to Checkout
                    </Button>

                    {!user && (
                      <p className="text-sm text-gray-500 text-center mt-4">
                        You'll need to sign in to complete your purchase
                      </p>
                    )}

                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Secure checkout guaranteed</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>Instant ticket delivery</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}