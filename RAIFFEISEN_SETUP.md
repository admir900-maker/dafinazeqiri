# RaiAccept (Raiffeisen Bank Kosovo) Payment Integration Setup

## ✅ Documentation Received!

**Official Documentation:** https://docs.raiaccept.com/code-integration.html

## Current Credentials (Provided by Bank)

```
Merchant Name: MONEYZ SH.P.K.
Merchant ID: 8600592
Terminal ID: E0810114
```

## How RaiAccept Works

### Integration Flow:
1. **Authenticate** - Get access token using Amazon Cognito
2. **Create Order Entry** - Store order in RaiAccept database
3. **Create Payment Session** - Get payment form URL
4. **Redirect Customer** - Customer completes payment on RaiAccept form
5. **Webhook Notification** - RaiAccept sends payment result to your server

### Payment Form Options:
- **Iframe** - Embed payment form on your site (recommended)
- **Redirect** - Full page redirect to payment form
- **New Tab** - Open payment form in new tab

## Required Information From Bank

### ✅ What We Have:
- ✅ Merchant ID: 8600592
- ✅ Terminal ID: E0810114
- ✅ Documentation: https://docs.raiaccept.com/

### ⚠️ Still Need to Generate in Merchant Portal:

1. **API Client ID** (from Merchant Portal)
   - Location: Merchant Portal → Settings → API Credentials
   - Click: "Generate API Credentials"

2. **API Client Secret** (from Merchant Portal)
   - Generated together with Client ID
   - **IMPORTANT:** Save this immediately, you can't retrieve it later!

3. **Merchant Portal Access**
   - URL: (Ask bank for portal URL)
   - Username: (Your email or provided username)
   - Password: (Set during registration or ask bank to reset)

## Steps to Get Started

### Step 1: Access Merchant Portal

### Step 1: Access Merchant Portal

Contact Raiffeisen Bank and ask for:
- **Merchant Portal URL** (likely https://portal.raiaccept.com or similar)
- **Your login credentials** (username/email and password)

### Step 2: Generate API Credentials

Once you have portal access:
1. Log in to Merchant Portal
2. Go to **Settings** → **API Credentials** (or similar section)
3. Click **"Generate API Credentials"** or **"Create New Credentials"**
4. **Save Both Immediately:**
   - API Client ID (looks like: `abc123def456...`)
   - API Client Secret (looks like: `XyZ789AbC123...`)
   - ⚠️ **The secret can only be viewed once!**

### Step 3: Configure Redirect URLs

In the Merchant Portal, you may need to register your URLs:
- Success URL: `https://dafinazeqiri.tickets/payment/success`
- Failure URL: `https://dafinazeqiri.tickets/payment/failure`
- Cancel URL: `https://dafinazeqiri.tickets/payment/cancel`
- Notification URL (Webhook): `https://dafinazeqiri.tickets/api/webhooks/raiaccept`

## Environment Variables

Add these to your `.env.local` file:

```env
# RaiAccept (Raiffeisen Bank Kosovo) - MONEYZ SH.P.K.
RAIACCEPT_CLIENT_ID=your_client_id_from_portal
RAIACCEPT_CLIENT_SECRET=your_client_secret_from_portal
RAIACCEPT_ENVIRONMENT=sandbox
# Change to 'production' when going live

# Your application URLs
NEXT_PUBLIC_BASE_URL=https://dafinazeqiri.tickets
```

## Integration Code

The integration has been implemented in `/src/lib/raiAccept.ts` with the following features:

### ✅ Implemented:
- Authentication with Amazon Cognito
- Create order entry
- Create payment session
- Get order details
- Get transaction status
- Issue refunds
- Webhook signature verification (placeholder)

### Usage Example:

```typescript
import { RaiAcceptAPI } from '@/lib/raiAccept';

// Create instance
const raiAccept = new RaiAcceptAPI({
  clientId: process.env.RAIACCEPT_CLIENT_ID!,
  clientSecret: process.env.RAIACCEPT_CLIENT_SECRET!,
  environment: 'sandbox' // or 'production'
});

// Create payment
const result = await raiAccept.createPayment({
  amount: 5000, // 50.00 EUR in cents
  currency: 'EUR',
  orderId: 'ORDER-123456',
  description: 'Event Tickets - Dafina Zeqiri Concert',
  customerEmail: 'customer@example.com',
  customerName: 'John Doe',
  successUrl: 'https://dafinazeqiri.tickets/payment/success',
  failureUrl: 'https://dafinazeqiri.tickets/payment/failure',
  cancelUrl: 'https://dafinazeqiri.tickets/payment/cancel',
  notificationUrl: 'https://dafinazeqiri.tickets/api/webhooks/raiaccept',
  language: 'sq' // Albanian language for payment form
});

if (result.success) {
  // Redirect customer to payment form
  window.location.href = result.paymentUrl;
}
```

## Payment Form Integration Options

### Option 1: Iframe (Recommended)

Embed the payment form directly on your site:

```html
<iframe 
  src="{paymentUrl}&mode=frameless"
  width="640"
  height="750"
  frameborder="0">
</iframe>
```

Listen for payment result:
```javascript
window.addEventListener("message", (event) => {
  if (event.data.name === "orderResult") {
    const { status, orderIdentification } = event.data.payload;
    
    if (status === "success") {
      // Payment successful
      window.location.href = "/booking-success?orderId=" + orderIdentification;
    } else if (status === "failure") {
      // Payment failed
      alert("Payment failed. Please try again.");
    }
  }
});
```

### Option 2: Full Page Redirect

Simply redirect the customer:
```javascript
window.location.href = result.paymentUrl;
```

### Option 3: New Tab

Open payment in new tab:
```javascript
window.open(result.paymentUrl, '_blank');
```

## Webhook Integration

Create API route at `/api/webhooks/raiaccept/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { RaiAcceptAPI } from '@/lib/raiAccept';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verify webhook signature
    const signature = request.headers.get('x-signature');
    // TODO: Implement signature verification
    
    // Process payment result
    const { orderIdentification, status, transactionId } = body;
    
    if (status === 'success') {
      // Update booking status to 'paid'
      // Send confirmation email
      // Generate tickets
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
```

## Testing

### Test Card Numbers

Ask the bank for test card numbers, or check the documentation. Typically:
- **Successful payment:** 4111 1111 1111 1111
- **Failed payment:** 4000 0000 0000 0002
- **Expired:** 3-D Secure test cards

### Test Checklist

- [ ] Generated API credentials in Merchant Portal
- [ ] Configured environment variables
- [ ] Created payment successfully
- [ ] Tested successful payment with test card
- [ ] Tested failed payment
- [ ] Verified webhook receives notifications
- [ ] Tested iframe integration
- [ ] Tested redirect integration
- [ ] Reviewed transaction in Merchant Portal
- [ ] Tested refund process
- [ ] Got bank approval for production
- [ ] Switched to production credentials

## Going Live

1. **Complete all testing** in sandbox environment
2. **Request production approval** from Raiffeisen Bank
3. **Generate production API credentials** in Merchant Portal
4. **Update environment variables:**
   ```env
   RAIACCEPT_ENVIRONMENT=production
   RAIACCEPT_CLIENT_ID=your_production_client_id
   RAIACCEPT_CLIENT_SECRET=your_production_client_secret
   ```
5. **Test with small amount** (e.g., 1 EUR)
6. **Monitor transactions** in Merchant Portal

## Support

**RaiAccept Documentation:**
- Main: https://docs.raiaccept.com/
- Code Integration: https://docs.raiaccept.com/code-integration.html
- Merchant Portal: https://docs.raiaccept.com/merchant-portal.html
- FAQ: https://docs.raiaccept.com/troubleshooting.html

**Contact Raiffeisen Bank Kosovo:**
- Business Banking: [Your contact]
- Technical Support: [Support email]
- Merchant Portal: [Portal URL]

## Important Notes

- ✅ Uses Amazon Cognito for authentication
- ✅ 3-step process: Auth → Order → Session
- ✅ Supports iframe, redirect, and new tab integration
- ✅ Webhook notifications for payment results
- ✅ Supports refunds via API
- ✅ Payment form available in multiple languages (en, sq, sr)
- ⚠️ Client Secret can only be viewed once - save it immediately!
- ⚠️ Always test in sandbox before going to production
- ⚠️ Monitor webhook notifications for reliable payment confirmation

---

Last Updated: October 31, 2025
Status: Documentation received, awaiting Merchant Portal access
Next Step: Contact bank for Merchant Portal credentials

