// Raiffeisen Bank Kosovo API Integration
// This module handles payment processing with Raiffeisen Bank Kosovo
// Merchant: MONEYZ SH.P.K.
// Merchant ID: 8600592
// Terminal ID: E0810114

interface RaiffeisenConfig {
  merchantId: string;
  terminalId: string;
  secretKey: string; // Need to obtain from bank
  apiUrl: string; // Need to obtain from bank
  environment: 'test' | 'production';
  callbackUrl: string;
  returnUrl: string;
}

interface PaymentRequest {
  amount: number;
  currency: string;
  orderId: string;
  description: string;
  customerEmail?: string;
  customerName?: string;
  returnUrl?: string;
  callbackUrl?: string;
}

interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  redirectUrl?: string;
  error?: string;
}

export class RaiffeisenBankAPI {
  private config: RaiffeisenConfig;
  private baseUrl: string;

  constructor(config: RaiffeisenConfig) {
    this.config = config;
    // Use the API URL provided by the bank
    // TODO: Update with actual URL from Raiffeisen Bank Kosovo
    this.baseUrl = config.apiUrl || (
      config.environment === 'production'
        ? 'https://pgw.raiffeisenbank.co.rs/payment' // Placeholder - need actual URL
        : 'https://test.raiffeisenbank.co.rs/payment' // Placeholder - need actual test URL
    );
  }

  /**
   * Create a payment intent with Raiffeisen Bank Kosovo
   */
  async createPaymentIntent(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const payload = {
        merchant_id: this.config.merchantId,
        terminal_id: this.config.terminalId,
        amount: request.amount,
        currency: request.currency,
        order_id: request.orderId,
        description: request.description,
        callback_url: request.callbackUrl || this.config.callbackUrl,
        return_url: request.returnUrl || this.config.returnUrl,
        customer_email: request.customerEmail,
        customer_name: request.customerName,
        timestamp: Date.now(),
      };

      const signature = this.generateSignature(payload);

      const response = await fetch(`${this.baseUrl}/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Merchant-ID': this.config.merchantId,
          'X-Terminal-ID': this.config.terminalId,
          'X-Signature': signature,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          paymentId: data.payment_id,
          redirectUrl: data.redirect_url,
        };
      } else {
        return {
          success: false,
          error: data.error || 'Payment creation failed',
        };
      }
    } catch (error) {
      console.error('Raiffeisen payment creation error:', error);
      return {
        success: false,
        error: 'Network error or service unavailable',
      };
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(paymentId: string): Promise<{
    success: boolean;
    status: 'pending' | 'completed' | 'failed' | 'cancelled';
    amount?: number;
    currency?: string;
    orderId?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'X-Merchant-ID': this.config.merchantId,
          'X-Terminal-ID': this.config.terminalId,
        },
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          status: data.status,
          amount: data.amount,
          currency: data.currency,
          orderId: data.order_id,
        };
      } else {
        return {
          success: false,
          status: 'failed',
        };
      }
    } catch (error) {
      console.error('Raiffeisen payment verification error:', error);
      return {
        success: false,
        status: 'failed',
      };
    }
  }

  /**
   * Verify webhook signature for security
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const expectedSignature = this.generateSignatureFromString(payload);
      return expectedSignature === signature;
    } catch (error) {
      console.error('Webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Generate signature for API requests
   */
  private generateSignature(payload: any): string {
    const crypto = require('crypto');
    const sortedKeys = Object.keys(payload).sort();
    const signatureString = sortedKeys
      .map(key => `${key}=${payload[key]}`)
      .join('&') + `&secret=${this.config.secretKey}`;

    return crypto.createHash('sha256').update(signatureString).digest('hex');
  }

  /**
   * Generate signature from string (for webhook verification)
   */
  private generateSignatureFromString(payload: string): string {
    const crypto = require('crypto');
    const signatureString = payload + this.config.secretKey;
    return crypto.createHash('sha256').update(signatureString).digest('hex');
  }
}

/**
 * Helper function to get Raiffeisen configuration from settings
 */
export async function getRaiffeisenConfig(): Promise<RaiffeisenConfig | null> {
  try {
    const { connectToDatabase } = await import('@/lib/mongodb');
    const PaymentSettings = (await import('@/models/PaymentSettings')).default;

    await connectToDatabase();
    const settings = await PaymentSettings.findOne({});

    if (!settings ||
      !settings.raiffeisenMerchantId ||
      !settings.raiffeisenTerminalId ||
      !settings.raiffeisenSecretKey) {
      return null;
    }

    return {
      merchantId: settings.raiffeisenMerchantId,
      terminalId: settings.raiffeisenTerminalId,
      secretKey: settings.raiffeisenSecretKey,
      apiUrl: settings.raiffeisenApiUrl || '',
      environment: settings.raiffeisenEnvironment || 'test',
      callbackUrl: settings.raiffeisenCallbackUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/api/raiffeisen/webhook`,
      returnUrl: settings.raiffeisenReturnUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success`,
    };
  } catch (error) {
    console.error('Error getting Raiffeisen configuration:', error);
    return null;
  }
}

export default RaiffeisenBankAPI;