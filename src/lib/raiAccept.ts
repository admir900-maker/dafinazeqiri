// RaiAccept (Raiffeisen Bank Kosovo) API Integration
// Documentation: https://docs.raiaccept.com/code-integration.html
// Merchant: MONEYZ SH.P.K.
// Merchant ID: 8600592
// Terminal ID: E0810114

import { logError } from './errorLogger';

interface RaiAcceptConfig {
  clientId: string; // API Client ID from Merchant Portal
  clientSecret: string; // API Client Secret from Merchant Portal
  environment: 'production' | 'sandbox';
}

interface CreateOrderRequest {
  amount: number; // in cents (e.g., 1000 = 10.00 EUR)
  currency: string; // e.g., "EUR"
  orderId: string; // Your unique order ID
  description: string;
  customerEmail: string;
  customerName?: string;
  successUrl: string;
  failureUrl: string;
  cancelUrl: string;
  notificationUrl: string; // Webhook URL
  language?: 'en' | 'sq' | 'sr'; // Payment form language
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface OrderResponse {
  orderIdentification: string; // RaiAccept's unique order ID
  merchantAccountId: string;
  statementDescriptorShortVersion: string;
  // ... includes all original parameters
}

interface PaymentSessionResponse {
  paymentSessionUrl: string; // URL to redirect customer to
}

export class RaiAcceptAPI {
  private config: RaiAcceptConfig;
  private authUrl: string;
  private apiBaseUrl: string;
  private paymentFormUrl: string;

  constructor(config: RaiAcceptConfig) {
    this.config = config;

    if (config.environment === 'production') {
      // Production URLs
      this.authUrl = 'https://api.raiaccept.com/oauth/token';
      this.apiBaseUrl = 'https://api.raiaccept.com';
      this.paymentFormUrl = 'https://payment.raiaccept.com/checkout';
    } else {
      // Sandbox/Test URLs
      this.authUrl = 'https://api-sandbox.raiaccept.com/oauth/token';
      this.apiBaseUrl = 'https://api-sandbox.raiaccept.com';
      this.paymentFormUrl = 'https://payment-sandbox.raiaccept.com/checkout';
    }
  }

  /**
   * Step 1: Authenticate and get access token
   * Uses OAuth 2.0 Client Credentials flow
   */
  private async authenticate(): Promise<string> {
    try {
      console.log('🔐 Authenticating with RaiAccept OAuth 2.0...');
      console.log('Auth URL:', this.authUrl);
      console.log('Client ID:', this.config.clientId);
      
      // Try OAuth 2.0 Client Credentials flow
      const response = await fetch(this.authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }).toString(),
      });

      console.log('Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Auth error response:', errorText);
        throw new Error(`Authentication failed: ${response.statusText} - ${errorText}`);
      }

      const data: any = await response.json();
      console.log('✅ Auth response received:', JSON.stringify(data, null, 2));
      
      // Standard OAuth 2.0 returns access_token
      const token = data.access_token;
      
      if (!token) {
        throw new Error('No access_token in authentication response');
      }
      
      return token;
    } catch (error) {
      logError('RaiAccept authentication failed', error, { source: 'raiaccept' });
      throw error;
    }
  }

  /**
   * Step 2: Create order entry in RaiAccept system
   */
  private async createOrderEntry(
    token: string,
    orderData: CreateOrderRequest
  ): Promise<OrderResponse> {
    try {
      const payload = {
        amount: orderData.amount,
        currency: orderData.currency,
        orderId: orderData.orderId,
        description: orderData.description,
        successUrl: orderData.successUrl,
        failureUrl: orderData.failureUrl,
        cancelUrl: orderData.cancelUrl,
        notificationUrl: orderData.notificationUrl,
        customer: {
          email: orderData.customerEmail,
          name: orderData.customerName,
        },
      };

      const response = await fetch(`${this.apiBaseUrl}/v1/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Create order failed: ${response.statusText} - ${errorText}`);
      }

      const data: OrderResponse = await response.json();
      return data;
    } catch (error) {
      logError('RaiAccept create order failed', error, { source: 'raiaccept' });
      throw error;
    }
  }

  /**
   * Step 3: Create payment session and get payment form URL
   */
  private async createPaymentSession(
    token: string,
    orderData: CreateOrderRequest,
    orderIdentification: string
  ): Promise<string> {
    try {
      const payload = {
        amount: orderData.amount,
        currency: orderData.currency,
        orderId: orderData.orderId,
        orderIdentification: orderIdentification,
        description: orderData.description,
        successUrl: orderData.successUrl,
        failureUrl: orderData.failureUrl,
        cancelUrl: orderData.cancelUrl,
        language: orderData.language || 'en',
      };

      const response = await fetch(`${this.apiBaseUrl}/v1/payment-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Create payment session failed: ${response.statusText} - ${errorText}`);
      }

      const data: PaymentSessionResponse = await response.json();
      return data.paymentSessionUrl;
    } catch (error) {
      logError('RaiAccept create payment session failed', error, { source: 'raiaccept' });
      throw error;
    }
  }

  /**
   * Main method: Create payment and get redirect URL
   * Combines all 3 steps: auth, create order, create session
   */
  async createPayment(orderData: CreateOrderRequest): Promise<{
    success: boolean;
    paymentUrl?: string;
    orderIdentification?: string;
    error?: string;
  }> {
    try {
      console.log('🔐 Step 1: Authenticating with RaiAccept...');
      const token = await this.authenticate();

      console.log('📝 Step 2: Creating order entry...');
      const orderResponse = await this.createOrderEntry(token, orderData);

      console.log('💳 Step 3: Creating payment session...');
      const paymentUrl = await this.createPaymentSession(
        token,
        orderData,
        orderResponse.orderIdentification
      );

      console.log('✅ Payment URL created successfully:', paymentUrl);

      return {
        success: true,
        paymentUrl: paymentUrl,
        orderIdentification: orderResponse.orderIdentification,
      };
    } catch (error: any) {
      console.error('❌ RaiAccept payment creation failed:', error);
      logError('RaiAccept createPayment failed', error, { source: 'raiaccept' });

      return {
        success: false,
        error: error.message || 'Payment creation failed',
      };
    }
  }

  /**
   * Retrieve order details (optional)
   */
  async getOrderDetails(orderIdentification: string): Promise<any> {
    try {
      const token = await this.authenticate();

      const response = await fetch(
        `${this.apiBaseUrl}/v1/orders/${orderIdentification}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Get order details failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logError('RaiAccept get order details failed', error, { source: 'raiaccept' });
      throw error;
    }
  }

  /**
   * Retrieve transaction status (optional)
   */
  async getTransactionStatus(transactionId: string): Promise<any> {
    try {
      const token = await this.authenticate();

      const response = await fetch(
        `${this.apiBaseUrl}/v1/transactions/${transactionId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Get transaction status failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logError('RaiAccept get transaction status failed', error, { source: 'raiaccept' });
      throw error;
    }
  }

  /**
   * Issue a refund
   */
  async issueRefund(
    orderIdentification: string,
    transactionId: string,
    amount: number,
    currency: string
  ): Promise<any> {
    try {
      const token = await this.authenticate();

      const payload = {
        orderIdentification,
        transactionId,
        amount,
        currency,
      };

      const response = await fetch(`${this.apiBaseUrl}/v1/refunds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Refund failed: ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      logError('RaiAccept refund failed', error, { source: 'raiaccept' });
      throw error;
    }
  }

  /**
   * Verify webhook signature (implement based on RaiAccept documentation)
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    // TODO: Implement webhook signature verification based on RaiAccept docs
    // This typically involves HMAC verification with a webhook secret
    return true;
  }
}

// Helper function to create RaiAccept instance from environment variables
export function createRaiAcceptClient(): RaiAcceptAPI | null {
  const clientId = process.env.RAIACCEPT_CLIENT_ID;
  const clientSecret = process.env.RAIACCEPT_CLIENT_SECRET;
  const environment = (process.env.RAIACCEPT_ENVIRONMENT || 'sandbox') as 'production' | 'sandbox';

  if (!clientId || !clientSecret) {
    console.warn('⚠️ RaiAccept credentials not configured');
    return null;
  }

  return new RaiAcceptAPI({
    clientId,
    clientSecret,
    environment,
  });
}

export default RaiAcceptAPI;
