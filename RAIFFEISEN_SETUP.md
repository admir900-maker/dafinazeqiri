# Raiffeisen Bank Kosovo Payment Integration Setup

## Current Credentials (Provided by Bank)

```
Merchant Name: MONEYZ SH.P.K.
Merchant ID: 8600592
Terminal ID: E0810114
```

## Required Information Still Needed

### Critical (Required to Go Live):

1. **API Endpoint URL**
   - Test/Sandbox URL: `?`
   - Production URL: `?`
   - Example: `https://pgw.raiffeisenbank.co.rs/payment`

2. **Secret Key / Signature Key**
   - Used for: Transaction signing and verification
   - Format: Usually a long alphanumeric string
   - Status: ⚠️ **REQUIRED - Contact bank**

3. **Hashing Algorithm**
   - Options: HMAC-SHA256, SHA1, MD5, etc.
   - Status: ⚠️ **REQUIRED - Contact bank**

4. **Technical Documentation**
   - API Reference Guide
   - Integration Manual
   - Status: ⚠️ **REQUIRED - Request from bank**

### Optional (But Recommended):

5. **Test Card Numbers**
   - For testing successful payments
   - For testing failed payments
   - For testing 3D Secure flow

6. **Webhook Configuration**
   - Webhook URL format requirements
   - Webhook signature verification method
   - IP whitelist for webhook calls

7. **Transaction Limits**
   - Minimum transaction amount
   - Maximum transaction amount
   - Daily/monthly limits

## Questions to Ask Raiffeisen Bank Kosovo

Send this email to your contact at Raiffeisen Bank:

```
Subject: Payment Gateway Integration - Technical Details Required

Dear Raiffeisen Bank Team,

We are integrating your payment gateway for our event ticketing platform (dafinazeqiri.tickets) 
using the following credentials you provided:

Merchant Name: MONEYZ SH.P.K.
Merchant ID: 8600592
Terminal ID: E0810114

To complete the integration, we need the following technical information:

1. API Endpoint URLs:
   - Test/Sandbox API URL
   - Production API URL

2. Secret Key / Signature Key for transaction signing

3. API Documentation:
   - Complete API reference guide
   - Integration manual (PDF or online)
   - Sample code (if available)

4. Security Information:
   - Hashing algorithm used (HMAC-SHA256, SHA1, etc.)
   - Request/response signature format
   - Webhook verification method

5. Test Environment:
   - Test card numbers for successful payments
   - Test card numbers for failed payments
   - 3D Secure test credentials

6. Technical Support:
   - Technical contact person
   - Support email/phone for integration issues

Our technical details:
- Website: https://dafinazeqiri.tickets
- Callback URL: https://dafinazeqiri.tickets/api/webhooks/raiffeisen
- Return URL: https://dafinazeqiri.tickets/payment/success

Please send the documentation and credentials at your earliest convenience.

Best regards,
[Your Name]
[Your Contact Information]
```

## Environment Variables to Add

Once you receive the information from the bank, add these to your `.env.local`:

```env
# Raiffeisen Bank Kosovo
RAIFFEISEN_MERCHANT_ID=8600592
RAIFFEISEN_TERMINAL_ID=E0810114
RAIFFEISEN_SECRET_KEY=your_secret_key_here
RAIFFEISEN_API_URL=https://api.raiffeisen.example/payment
RAIFFEISEN_TEST_API_URL=https://test-api.raiffeisen.example/payment
RAIFFEISEN_ENVIRONMENT=test
```

## Admin Panel Configuration

After receiving credentials, configure in Admin Panel:
1. Go to `/admin/settings`
2. Click on "Payments" tab
3. Enable Raiffeisen Bank
4. Enter:
   - Merchant ID: `8600592`
   - Terminal ID: `E0810114`
   - Secret Key: (from bank)
   - API URL: (from bank)
   - Environment: `test` (for testing) or `production` (for live)

## Testing Checklist

- [ ] Received all credentials from bank
- [ ] Configured environment variables
- [ ] Tested successful payment
- [ ] Tested failed payment
- [ ] Tested webhook notifications
- [ ] Verified signature validation
- [ ] Tested refund process (if applicable)
- [ ] Reviewed transaction in merchant portal
- [ ] Got approval from bank for production
- [ ] Switched to production credentials
- [ ] Tested live transaction with small amount

## Support Contacts

**Raiffeisen Bank Kosovo:**
- Business Banking: [Add contact when you get it]
- Technical Support: [Add contact when you get it]
- Email: [Add email when you get it]

**Your Team:**
- Technical Lead: [Your contact]
- Project Manager: [PM contact]

## Next Steps

1. ✅ Received Merchant ID and Terminal ID
2. ⏳ Contact bank for remaining credentials (see email template above)
3. ⏳ Receive and review technical documentation
4. ⏳ Configure test environment
5. ⏳ Implement payment flow
6. ⏳ Test integration thoroughly
7. ⏳ Submit for production approval
8. ⏳ Go live

## Notes

- Keep all credentials secure and never commit them to git
- Use test environment until bank approves production
- Always verify webhook signatures before processing
- Log all transactions for reconciliation
- Have backup payment method (Stripe) available

---

Last Updated: October 31, 2025
Status: Awaiting additional credentials from bank
