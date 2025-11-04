# Email Client Setup Guide

## Overview
The admin email client allows administrators to:
- View incoming emails sent to info@dafinazeqiri.tickets
- Reply to customer emails directly from the admin panel
- Compose new emails
- Search and filter emails

## Configuration

### 1. IMAP Settings (for receiving emails)

Add these environment variables to your `.env.local` file:

```env
# IMAP Settings for receiving emails
IMAP_USER=info@dafinazeqiri.tickets
IMAP_PASSWORD=your-email-password
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
```

### 2. SMTP Settings (for sending emails)

The system uses your existing SMTP settings from the email service:

```env
# SMTP Settings (already configured)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=info@dafinazeqiri.tickets
SMTP_PASSWORD=your-email-password
SMTP_SECURE=false
```

## Gmail Configuration

If using Gmail, you need to:

### Option 1: App Passwords (Recommended)
1. Go to your Google Account settings
2. Enable 2-Step Verification
3. Go to Security > App passwords
4. Generate an app password for "Mail"
5. Use this password in IMAP_PASSWORD and SMTP_PASSWORD

### Option 2: Less Secure Apps (Not Recommended)
1. Go to your Google Account
2. Navigate to Security
3. Enable "Less secure app access"
4. Use your regular password

## Other Email Providers

### Microsoft/Outlook
```env
IMAP_HOST=outlook.office365.com
IMAP_PORT=993
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
```

### Yahoo Mail
```env
IMAP_HOST=imap.mail.yahoo.com
IMAP_PORT=993
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
```

### Custom Domain (cPanel, Plesk, etc.)
```env
IMAP_HOST=mail.yourdomain.com
IMAP_PORT=993
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
```

## Features

### Inbox View
- Lists all received emails
- Shows sender, subject, and preview
- Real-time date formatting (e.g., "5m ago", "2h ago", "3d ago")
- Search functionality across from, subject, and body

### Email Details
- Full email content view
- Supports both plain text and HTML emails
- Shows sender, recipient, date, and time
- Quick reply button

### Compose/Reply
- Compose new emails
- Reply to received emails with proper threading
- Reply headers (In-Reply-To, References) for proper email threading
- Rich text support

### Security Features
- Admin authentication required
- Secure IMAP/SSL connection
- Environment variable protection
- No credentials stored in database

## Usage

1. Navigate to **Admin Panel > Email Client**
2. Click **Refresh** to fetch latest emails
3. Select an email from the list to view
4. Click **Reply** to respond to a customer
5. Click **Compose** to send a new email

## Troubleshooting

### "Email Client Configuration Required" Error
- Check that all IMAP environment variables are set
- Verify credentials are correct
- Ensure email provider allows IMAP access

### Emails Not Appearing
- Click the Refresh button
- Check IMAP credentials
- Verify email account has messages
- Check firewall/network settings for port 993

### Cannot Send Emails
- Verify SMTP credentials are set
- Check SMTP_HOST and SMTP_PORT are correct
- Ensure sending email is verified with provider

### Gmail "Less Secure Apps" Warning
- Use App Passwords instead (see Gmail Configuration above)
- This is more secure and works better with automated systems

## API Endpoints

### GET /api/admin/emails
Fetches emails from IMAP inbox
- Returns: Array of email objects
- Auth: Admin only

### POST /api/admin/emails/send
Sends an email via SMTP
- Body: { to, subject, body, inReplyTo?, references? }
- Returns: Success/error message
- Auth: Admin only

## Future Enhancements

Potential improvements:
- Mark emails as read/unread
- Archive/delete functionality
- Attachments support
- Email templates
- Canned responses
- Multi-folder support
- Email forwarding
- Auto-responders
- Email signatures
- Rich text editor for compose
