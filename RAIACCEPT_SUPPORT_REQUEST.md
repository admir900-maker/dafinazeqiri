# RaiAccept API Integration - Support Request

**Merchant:** MONEYZ SH.P.K.  
**Merchant ID:** 8600592  
**Terminal ID:** E0810114  
**Environment:** Sandbox  
**Date:** October 31, 2025

## Issue Summary

We are integrating RaiAccept payment API following the official documentation at https://docs.raiaccept.com/code-integration.html

**Current Status:**
- ✅ Authentication working successfully (Cognito USER_PASSWORD_AUTH)
- ✅ Receiving AccessToken (length: 1079)
- ❌ API calls failing with **403 Forbidden**

## Technical Details

### Authentication (Working ✅)
- **Endpoint:** `https://authenticate.raiaccept.com`
- **Method:** Cognito InitiateAuth with USER_PASSWORD_AUTH
- **Cognito Client ID:** kr2gs4117arvbnaperqff5dml
- **Result:** Successfully receiving AccessToken

### Create Order (Failing ❌)
- **Endpoint:** `https://trapi.raiaccept.com/v1/orders`
- **Method:** POST
- **Headers:**
  - `Content-Type: application/json`
  - `Accept: application/json`
  - `Authorization: Bearer {AccessToken}`
- **Error Response:**
  ```json
  {
    "status": 403,
    "statusText": "Forbidden",
    "body": "{\"message\":\"Forbidden\"}"
  }
  ```

### Sample Payload Being Sent
```json
{
  "amount": 79,
  "currency": "EUR",
  "orderId": "unique-order-id",
  "merchantOrderReference": "unique-order-id",
  "description": "Event tickets",
  "paymentMethodPreference": "CARD",
  "successUrl": "https://dafinazeqiri.tickets/booking-success?bookingId=xxx",
  "failureUrl": "https://dafinazeqiri.tickets/checkout?error=payment_failed",
  "cancelUrl": "https://dafinazeqiri.tickets/checkout?error=payment_cancelled",
  "notificationUrl": "https://dafinazeqiri.tickets/api/webhooks/raiaccept",
  "customer": {
    "email": "customer@example.com",
    "name": "Customer Name"
  },
  "invoice": {
    "amount": 79,
    "currency": "EUR",
    "description": "Event tickets",
    "merchantOrderReference": "unique-order-id",
    "items": [
      {
        "name": "Event ticket",
        "quantity": 1,
        "unitPrice": 79,
        "totalAmount": 79
      }
    ]
  }
}
```

## Questions for RaiAccept Support

1. **API Access:** Is API access enabled for our merchant account (8600592) in the sandbox environment?

2. **Endpoint Verification:** Are we using the correct endpoints?
   - Auth: `https://authenticate.raiaccept.com`
   - Orders: `https://trapi.raiaccept.com/v1/orders`

3. **Token Type:** Should we use the AccessToken or IdToken from Cognito for API calls?

4. **Sandbox vs Production:** Are there different base URLs or configuration for sandbox environment?

5. **Additional Headers:** Are there any additional headers or parameters required beyond what we're sending?

6. **Account Activation:** Does our merchant account need additional activation steps for API access?

7. **Permissions:** Are there specific permissions or scopes that need to be granted to our API credentials?

## Request

Please help us resolve the 403 Forbidden error so we can complete the integration and begin testing payments in the sandbox environment.

## Contact Information

- **Project:** dafinazeqiri.tickets
- **Integration Date:** October 2025
- **Technical Contact:** [Your contact information]

---

**Note:** Authentication is working perfectly, which confirms our credentials are correct. The issue appears to be with API endpoint permissions/access.
