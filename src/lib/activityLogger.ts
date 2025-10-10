// Utility library for user activity logging

export interface ActivityLogData {
  action: string;
  description: string;
  eventId?: string;
  eventTitle?: string;
  ticketType?: string;
  quantity?: number;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  status?: 'success' | 'failed' | 'pending' | 'cancelled';
  location?: string;
  referrer?: string;
  duration?: number;
  metadata?: { [key: string]: any };
  errorMessage?: string;
  userEmail?: string;
  userName?: string;
  sessionId?: string;
}

class ActivityLogger {
  private static instance: ActivityLogger;
  private sessionId: string;
  private isEnabled: boolean = true;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  static getInstance(): ActivityLogger {
    if (!ActivityLogger.instance) {
      ActivityLogger.instance = new ActivityLogger();
    }
    return ActivityLogger.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async log(data: ActivityLogData): Promise<boolean> {
    if (!this.isEnabled) {
      return false;
    }

    try {
      const activityData = {
        ...data,
        sessionId: this.sessionId,
        location: window.location.pathname,
        referrer: document.referrer
      };

      const response = await fetch('/api/user/activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityData)
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.warn('Failed to log activity:', error);
      return false;
    }
  }

  // Convenience methods for common activities
  async logPageView(path: string, metadata?: any): Promise<boolean> {
    return this.log({
      action: 'page_view',
      description: `User viewed page: ${path}`,
      metadata: { path, ...metadata }
    });
  }

  async logEventView(eventId: string, eventTitle: string, metadata?: any): Promise<boolean> {
    return this.log({
      action: 'event_view',
      description: `User viewed event: ${eventTitle}`,
      eventId,
      eventTitle,
      metadata
    });
  }

  async logTicketSelection(eventId: string, eventTitle: string, ticketType: string, quantity: number, amount: number): Promise<boolean> {
    return this.log({
      action: 'ticket_selection',
      description: `User selected ${quantity} ${ticketType} ticket(s) for ${eventTitle}`,
      eventId,
      eventTitle,
      ticketType,
      quantity,
      amount,
      status: 'success'
    });
  }

  async logAddToCart(eventId: string, eventTitle: string, ticketType: string, quantity: number, amount: number): Promise<boolean> {
    return this.log({
      action: 'add_to_cart',
      description: `User added ${quantity} ${ticketType} ticket(s) to cart for ${eventTitle}`,
      eventId,
      eventTitle,
      ticketType,
      quantity,
      amount,
      status: 'success'
    });
  }

  async logRemoveFromCart(eventId: string, eventTitle: string, ticketType: string, quantity: number): Promise<boolean> {
    return this.log({
      action: 'remove_from_cart',
      description: `User removed ${quantity} ${ticketType} ticket(s) from cart for ${eventTitle}`,
      eventId,
      eventTitle,
      ticketType,
      quantity,
      status: 'success'
    });
  }

  async logCheckoutStarted(totalAmount: number, currency: string = 'EUR', metadata?: any): Promise<boolean> {
    return this.log({
      action: 'checkout_started',
      description: `User started checkout process`,
      amount: totalAmount,
      currency,
      status: 'pending',
      metadata
    });
  }

  async logPaymentMethodSelected(paymentMethod: string, amount: number): Promise<boolean> {
    return this.log({
      action: 'payment_method_selected',
      description: `User selected payment method: ${paymentMethod}`,
      paymentMethod,
      amount,
      status: 'pending'
    });
  }

  async logPaymentAttempted(paymentMethod: string, amount: number, currency: string = 'EUR'): Promise<boolean> {
    return this.log({
      action: 'payment_attempted',
      description: `User attempted payment via ${paymentMethod}`,
      paymentMethod,
      amount,
      currency,
      status: 'pending'
    });
  }

  async logPaymentSuccessful(paymentMethod: string, amount: number, currency: string = 'EUR', transactionId?: string): Promise<boolean> {
    return this.log({
      action: 'payment_successful',
      description: `Payment successful via ${paymentMethod}`,
      paymentMethod,
      amount,
      currency,
      status: 'success',
      metadata: { transactionId }
    });
  }

  async logPaymentFailed(paymentMethod: string, amount: number, errorMessage: string, currency: string = 'EUR'): Promise<boolean> {
    return this.log({
      action: 'payment_failed',
      description: `Payment failed via ${paymentMethod}`,
      paymentMethod,
      amount,
      currency,
      status: 'failed',
      errorMessage
    });
  }

  async logBookingCreated(bookingId: string, eventId: string, eventTitle: string, amount: number): Promise<boolean> {
    return this.log({
      action: 'booking_created',
      description: `Booking created for ${eventTitle}`,
      eventId,
      eventTitle,
      amount,
      status: 'success',
      metadata: { bookingId }
    });
  }

  async logBookingCancelled(bookingId: string, eventId: string, eventTitle: string, reason?: string): Promise<boolean> {
    return this.log({
      action: 'booking_cancelled',
      description: `Booking cancelled for ${eventTitle}`,
      eventId,
      eventTitle,
      status: 'cancelled',
      metadata: { bookingId, reason }
    });
  }

  async logSearch(query: string, resultsCount: number): Promise<boolean> {
    return this.log({
      action: 'search',
      description: `User searched for: ${query}`,
      status: 'success',
      metadata: { query, resultsCount }
    });
  }

  async logFilterApplied(filterType: string, filterValue: string): Promise<boolean> {
    return this.log({
      action: 'filter_applied',
      description: `User applied filter: ${filterType} = ${filterValue}`,
      status: 'success',
      metadata: { filterType, filterValue }
    });
  }

  async logError(errorType: string, errorMessage: string, metadata?: any): Promise<boolean> {
    return this.log({
      action: 'error_occurred',
      description: `Error occurred: ${errorType}`,
      status: 'failed',
      errorMessage,
      metadata
    });
  }

  // Timer utilities for tracking duration
  private timers: Map<string, number> = new Map();

  startTimer(key: string): void {
    this.timers.set(key, Date.now());
  }

  async endTimer(key: string, action: string, description: string, additionalData?: Partial<ActivityLogData>): Promise<boolean> {
    const startTime = this.timers.get(key);
    if (!startTime) {
      console.warn(`Timer not found for key: ${key}`);
      return false;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(key);

    return this.log({
      action,
      description,
      duration,
      status: 'success',
      ...additionalData
    });
  }

  // Configuration
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  // Generate a new session ID (useful for new user sessions)
  renewSession(): void {
    this.sessionId = this.generateSessionId();
  }
}

// Export singleton instance
export const activityLogger = ActivityLogger.getInstance();

// React hook for easy activity logging
export function useActivityLogger() {
  return activityLogger;
}