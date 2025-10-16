# PDF Ticket Generation Feature

## Overview
Automatically generate and attach professional PDF tickets to booking confirmation emails. Each ticket matches the design provided and includes QR codes, event details, and booking information.

## Features Implemented

### 1. PDF Ticket Generator (`src/lib/ticketPdfGenerator.ts`)
- **Professional Design**: Matches the provided ticket design with:
  - Header with "TICKET" branding
  - Event title and information
  - Venue and timing details
  - QR code (large in box, small at bottom)
  - Minimum age restrictions (if applicable)
  - Important instructions
  - Booking reference and customer details
  
- **Two Main Functions**:
  - `generateTicketPDF()`: Creates a single PDF ticket
  - `generateTicketPDFs()`: Generates multiple PDF tickets for a booking

### 2. Email Service Integration (`src/lib/emailService.ts`)
- **Automatic PDF Attachment**: All confirmation emails now include:
  - PDF tickets as file attachments
  - QR codes embedded in email HTML
  - Notice about attached PDF files
  
- **Updated Features**:
  - Generate PDF for each ticket in booking
  - Attach PDFs to email automatically
  - Include age limit information
  - Professional email template with PDF notice

### 3. Test Endpoint (`src/app/api/admin/test-pdf-ticket/route.ts`)
- Test URL: `http://localhost:3000/api/admin/test-pdf-ticket`
- Generates a sample PDF ticket with test data
- Opens directly in browser for preview

## PDF Ticket Design Elements

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ TICKET                                        GOVILD        │
│                                                             │
│ Event Title                                                 │
│ ─────────────────────────────                              │
│                                                             │
│ TICKET INFORMATION:                      ┌──────────────┐  │
│ Ticket Type Name                         │              │  │
│ ─────────────────────────────            │  Entrance    │  │
│                                          │   Ticket     │  │
│ VENUE:              TIMING:              │              │  │
│ Location, City      Date & Time          │  TICKET NAME │  │
│                                          │              │  │
│ ─────────────────────────────            │  Price: XX   │  │
│                                          │              │  │
│ MINIMUM AGE: (if applicable)             │  Order time  │  │
│ Age requirement text                     │  Order #     │  │
│                                          │  Customer    │  │
│ IMPORTANT:                               │              │  │
│ E-ticket instructions                    │  [QR CODE]   │  │
│                                          │              │  │
│ [Small QR]                               │  Ticket ID   │  │
└─────────────────────────────────────────────────────────────┘
```

### Key Fields Included
- ✅ Ticket ID (unique identifier)
- ✅ Ticket type name
- ✅ Event title
- ✅ Venue and location
- ✅ Event date and time
- ✅ Price and currency
- ✅ Booking reference
- ✅ Customer name
- ✅ QR code (embedded twice)
- ✅ Age limit (if applicable)
- ✅ Important instructions

## How It Works

### Email Flow
1. **Booking Confirmed** → Webhook triggers email
2. **PDF Generation** → System generates PDF for each ticket
3. **Email Composition** → Email includes:
   - HTML email template
   - QR codes embedded inline
   - PDF tickets as attachments
4. **Email Sent** → Customer receives email with PDFs

### Example Email Attachments
```
📎 Attachments:
  - ticket_GW0T961106.pdf (Ticket 1)
  - ticket_ABC123XYZ.pdf (Ticket 2)
  - qr_GW0T961106.png (QR Code 1 - inline)
  - qr_ABC123XYZ.png (QR Code 2 - inline)
```

## Testing

### Test the PDF Generation
1. Start your development server: `npm run dev`
2. Open browser to: `http://localhost:3000/api/admin/test-pdf-ticket`
3. PDF ticket should display in browser

### Test with Real Booking
1. Create a test booking through the system
2. Complete payment (use Stripe test mode)
3. Check email for PDF attachments
4. Verify PDF ticket matches design

## Dependencies Added
- ✅ `pdfkit` - PDF generation library
- ✅ `@types/pdfkit` - TypeScript types

## Files Modified/Created

### Created
- `src/lib/ticketPdfGenerator.ts` - PDF generation logic
- `src/app/api/admin/test-pdf-ticket/route.ts` - Test endpoint

### Modified
- `src/lib/emailService.ts` - Added PDF attachment support
- `package.json` - Added pdfkit dependencies

## Configuration

### Event Model Fields Used
- `title` - Event name
- `date` - Event date/time
- `location` - Event location
- `venue` - Venue name
- `city` - City name
- `country` - Country name
- `ageLimit` - Minimum age (optional)

### Ticket Fields Used
- `ticketId` - Unique ticket ID
- `ticketName` - Ticket type name
- `price` - Ticket price
- `qrCode` - QR code data URL

### Booking Fields Used
- `bookingReference` - Order number
- `customerName` - Customer name
- `customerEmail` - Customer email
- `currency` - Currency code

## Customization Options

### Font and Styling
Currently using Helvetica (built-in PDF font). Can be customized in `ticketPdfGenerator.ts`:
```typescript
doc.fontSize(32).font('Helvetica-Bold')
```

### PDF Size
Custom size: 595.28 x 400 points (A4 width, custom height)
```typescript
const doc = new PDFDocument({
  size: [595.28, 400],
  ...
});
```

### Colors and Layout
Modify positioning and styling in the `generateTicketPDF()` function.

## Benefits

✅ **Professional Appearance** - Matches provided design exactly
✅ **Easy to Print** - Customers can print PDF tickets
✅ **Easy to Save** - PDF files can be saved to phones/devices
✅ **QR Code Included** - Both in email and PDF
✅ **All Details Included** - Complete event and booking information
✅ **Automatic** - No manual intervention required
✅ **Multiple Formats** - Both email HTML and PDF attachment

## Future Enhancements

Possible improvements:
- [ ] Add custom fonts/branding
- [ ] Include event poster image
- [ ] Add barcode in addition to QR code
- [ ] Multi-language support
- [ ] Custom PDF templates per event type
- [ ] Wallet pass generation (Apple Wallet, Google Pay)

## Support

If tickets don't generate:
1. Check console logs for errors
2. Verify QR codes are generated properly
3. Test PDF endpoint: `/api/admin/test-pdf-ticket`
4. Check email attachments in sent emails
5. Verify pdfkit is installed: `npm list pdfkit`

## Notes

- PDF generation happens server-side during email composition
- Each ticket gets its own PDF file
- QR codes are embedded as images in the PDF
- Failure to generate PDFs doesn't block email sending (graceful fallback)
- Customer still receives QR codes in email HTML even if PDF fails
