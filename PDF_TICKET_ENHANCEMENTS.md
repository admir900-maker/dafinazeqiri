# PDF Ticket Enhancements

## Overview
Enhanced the professional PDF ticket generation system with additional information fields, improved layout, and embedded logo support.

## New Features

### 1. **Logo Integration**
- Added default logo support with base64 SVG fallback
- Logo displayed in white circle on colored header
- Automatically uses provided logo or falls back to default
- Size: 60x60 points with 5pt padding

### 2. **Additional Ticket Information**

#### Customer Information
- **Customer Name**: Truncated to 20 characters if longer
- **Customer Email**: Added email field, truncated to 25 characters if longer
- **Booking Reference**: Prominently displayed
- **Ticket ID**: Full serial number shown

#### Event Information
- **Event Title**: Bold display in header
- **Date**: Full date with day name (e.g., "Wednesday, September 12, 2025")
- **Time**: 12-hour format with AM/PM
- **Venue**: Event venue/location
- **Location**: City/region information
- **Age Limit**: Displayed if available (e.g., "18+ years")

#### Ticket Details
- **Ticket Type**: Shown in badge on header
- **Price**: With currency symbol
- **Serial Number**: Full ticket ID at bottom of QR section

### 3. **Important Information Section**
Added instructional section with key information:
- ✓ Ticket valid for one person only
- ✓ Arrive 30 minutes before event starts
- ✓ Keep ticket with you at all times
- ✓ No refunds or exchanges unless event cancelled

### 4. **Enhanced QR Code Section**
- Reduced size to 110x110 points for better layout
- Added validation instruction text
- Serial number display below QR code
- Gray background section for visual separation

### 5. **Improved Footer**
- Separator line for clean design
- Enhanced disclaimer text
- Contact information (email and website)
- "Powered by Biletara Ticketing Platform" branding
- Generation timestamp for audit trail

## Layout Improvements

### Header Section
- Increased height to 200 points for better logo placement
- Dynamic color based on ticket type
- White circle background for logo contrast
- Ticket type badge with solid color

### Content Area
- Two-column layout:
  - **Left**: Event details (date, time, venue, location, age limit)
  - **Right**: Ticket & customer information
- Better spacing with 35-point line height
- Consistent label/value pairing

### QR Section
- Compact 150-point height
- Centered QR code with clear instructions
- Serial number for manual verification
- Gray background (#F2F2F2)

### Footer
- 4-line footer with multiple elements
- Horizontal separator line
- Contact information for customer support
- Timestamp for tracking

## Technical Details

### Dimensions
- **Page Size**: A4 (595.28 x 841.89 points)
- **Margins**: 40 points on all sides
- **Header Height**: 200 points
- **QR Section**: 150 points
- **Logo Size**: 60x60 points

### Fonts
- **Helvetica**: Regular text (9-12pt)
- **Helvetica Bold**: Labels and headers (10-14pt)

### Colors
- **Dynamic Header**: Based on ticket type color
- **Labels**: Gray (#666666)
- **Values**: Black (#000000)
- **Footer**: Light gray (#808080)

### Text Truncation
- Customer names > 20 chars: Truncated with "..."
- Customer emails > 25 chars: Truncated with "..."
- Ticket IDs: Shown in full in serial section

## API Usage

The PDF generator maintains backward compatibility:

```typescript
await generateTicketPDFs(
  tickets: TicketData[],
  event: EventData,
  booking: BookingData,
  logoUrl?: string  // Optional, uses default if not provided
)
```

### Input Interfaces

```typescript
interface TicketData {
  ticketId: string;
  ticketName: string;
  price?: number;
  ticketPrice?: number;
  ticketCurrency?: string;
  color?: string;
  qrCode: string;
}

interface EventData {
  title?: string;
  eventTitle?: string;
  date?: Date;
  eventDate?: Date;
  location?: string;
  venue?: string;
  eventVenue?: string;
  eventLocation?: string;
  city?: string;
  country?: string;
  ageLimit?: number;
}

interface BookingData {
  bookingReference: string;
  customerName: string;
  customerEmail: string;
  currency?: string;
}
```

## Benefits

1. **Professional Appearance**: Clean, corporate design suitable for all event types
2. **Information Rich**: All necessary details at a glance
3. **Customer Support**: Contact information readily available
4. **Validation Ready**: Multiple verification methods (QR + serial)
5. **Audit Trail**: Generation timestamp for tracking
6. **Brand Consistency**: Configurable logo and colors

## Future Enhancements

Potential additions for future versions:
- Event organizer contact information
- Terms and conditions section
- Multi-language support
- Barcode backup (in addition to QR)
- Event map/directions
- Special instructions per event
- Accessibility information
- Weather advisory (for outdoor events)

## Testing

To test the enhanced tickets:
1. Visit admin panel: `/admin/test-pdf-ticket`
2. Or create a booking through the checkout flow
3. Download tickets from booking confirmation page
4. Or receive via email attachment

The system automatically generates enhanced tickets for all new bookings.
