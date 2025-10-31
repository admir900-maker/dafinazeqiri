# RaiAccept Integration - Missing Information

## Current Status
We have successfully:
- ✅ Configured Client ID and Client Secret from Merchant Portal
- ✅ Fixed ticket name matching (handles "fan-pit" vs "FAN PIT")
- ✅ Implemented OAuth 2.0 Client Credentials authentication flow
- ✅ Set up payment creation logic

## BLOCKED: Missing API URLs

We need the correct API endpoint URLs from Raiffeisen Bank. The URLs we're guessing don't exist:
- ❌ `api-sandbox.raiaccept.com` - DNS ENOTFOUND
- ❌ `sandbox.raiaccept.com` - DNS ENOTFOUND (guessed)

## Required Information from Raiffeisen Bank

Please contact RaiAccept support and ask for the following **Sandbox/Test Environment** URLs:

### 1. Authentication/Token Endpoint
- **What we need**: The OAuth 2.0 token endpoint URL
- **Purpose**: To exchange Client ID and Client Secret for an access token
- **Example format**: `https://???/oauth/token` or `https://???/api/v1/auth/token`
- **HTTP Method**: POST
- **Request format**: 
  ```
  grant_type=client_credentials
  client_id=8c47d10f-6932-434d-a703-f18892c204e3
  client_secret=A.3FVR~1c^NNAX#R2-H.~(=?dx0C8p3>w_
  ```

### 2. API Base URL
- **What we need**: The base URL for all API calls (create order, create payment, etc.)
- **Purpose**: To make payment-related API requests
- **Example format**: `https://???/api` or `https://???/api/v1`

### 3. Payment Form URL
- **What we need**: The URL where customers are redirected to complete payment
- **Purpose**: To display the payment form to customers
- **Example format**: `https://???/checkout` or `https://???/payment`

### 4. API Documentation
- **What we need**: Complete API documentation including:
  - Authentication flow
  - Create Order endpoint
  - Create Payment Session endpoint
  - Webhook payload format
  - Test card numbers for sandbox

## Current Configuration

**File**: `.env.local`
```env
RAIACCEPT_CLIENT_ID=8c47d10f-6932-434d-a703-f18892c204e3
RAIACCEPT_CLIENT_SECRET=A.3FVR~1c^NNAX#R2-H.~(=?dx0C8p3>w_
RAIACCEPT_ENVIRONMENT=sandbox
```

**Merchant Details**:
- Merchant: MONEYZ SH.P.K.
- Merchant ID: 8600592
- Terminal ID: E0810114

## Next Steps

1. **Contact RaiAccept Support** - Get the correct sandbox URLs
2. **Update** `src/lib/raiAccept.ts` with correct URLs
3. **Test** authentication and payment creation
4. **Implement** webhook endpoint for payment notifications
5. **Get** test card numbers for sandbox testing
6. **Complete** end-to-end payment flow testing

## Contact Information

You should have received:
- Support email (likely support@raiaccept.com or similar)
- Phone number for technical support
- Online documentation portal

If you don't have contact info, try:
- Login to RaiAccept Merchant Portal → look for "Support" or "Documentation"
- Email: info@raiffeisen-kosovo.com (main bank contact)
- Phone: +383 38 222 222 (Raiffeisen Bank Kosovo main line)
