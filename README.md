# SUPERNOVA - Event Ticketing Platform

SUPERNOVA is a production-ready event ticketing platform built with Next.js 15, featuring secure payment processing, admin management, email notifications, and QR code ticket validation.

## 🚀 Features

### Core Functionality
- **Event Management**: Create, edit, and manage events with multiple ticket types
- **Ticket Booking**: Secure payment processing with Stripe integration
- **QR Code Tickets**: Generated QR codes for ticket validation
- **Email Notifications**: SMTP-based email system for booking confirmations
- **Ticket Validation**: QR code scanning for event entry
- **Currency Support**: Multi-currency support (EUR, USD, GBP, CAD, AUD)

### Admin Panel
- **Dashboard**: Comprehensive analytics and statistics
- **Event Management**: Full CRUD operations for events
- **Booking Management**: View and manage all bookings
- **Payment Configuration**: Stripe and platform fee settings
- **SMTP Configuration**: Email server setup and testing
- **User Management**: Admin user controls

### Security & Performance
- **Production Security**: Security headers, CSRF protection, input validation
- **Error Logging**: Centralized error tracking and monitoring
- **Performance Optimization**: Image optimization, bundle optimization, caching
- **Authentication**: Clerk-based user authentication with role management
- **Database**: MongoDB with connection pooling and optimization

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: Clerk
- **Payments**: Stripe with webhook security
- **Email**: Production SMTP service
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with Radix UI
- **File Storage**: Cloudinary
- **Security**: Content Security Policy, security headers

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB database (Production cluster recommended)
- Stripe account with live keys
- Clerk account with production settings
- Cloudinary account with production configuration
- Production SMTP email service
- SSL certificate for your domain

## 🚀 Production Deployment

### 1. Environment Setup
Copy `.env.example` to `.env.local` and configure all production values:

```env
# Database - Use production MongoDB cluster
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/biletara-production

# Clerk Authentication - Use production keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_production_key
CLERK_SECRET_KEY=sk_live_your_production_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Stripe - Use live keys only
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
STRIPE_SECRET_KEY=sk_live_your_live_key
STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret

# Cloudinary - Production configuration
CLOUDINARY_CLOUD_NAME=your_production_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email - Production SMTP service
EMAIL_HOST=smtp.yourdomain.com
EMAIL_PORT=587
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASS=your_secure_password

# Production URLs
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your_secure_32_character_secret
NODE_ENV=production
```

### 2. Build and Deploy
```bash
# Install dependencies
npm ci

# Type check
npm run type-check

# Lint code
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

### 3. Post-Deployment Setup
1. Verify all environment variables are set
2. Test payment integration with small amounts
3. Configure Stripe webhooks for production URL
4. Set up admin users via database or API
5. Test email notifications
6. Monitor error logs and performance

## 🔧 Production Configuration

### Admin Setup
1. Create your account via production Clerk sign-up
2. Promote your user to admin via database update:
   ```javascript
   db.users.updateOne(
     { clerkId: "your_clerk_user_id" },
     { $set: { role: "admin" } }
   )
   ```
3. Access admin panel at `/admin`
4. Configure all production settings

### Security Configuration
- All API routes use authentication
- Admin routes require admin role verification
- Input validation on all forms
- CSRF protection enabled
- Security headers configured
- Error logging without sensitive data exposure

### Performance Optimization
- Image optimization with WebP/AVIF formats
- Bundle optimization and code splitting
- Gzip compression enabled
- CDN integration for static assets
- Database connection pooling

## 📁 Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── admin/          # Admin panel pages
│   ├── api/            # API routes
│   ├── auth/           # Authentication pages
│   ├── events/         # Event pages
│   └── ...
├── components/         # Reusable UI components
├── contexts/          # React contexts
├── lib/               # Utility libraries
├── models/            # Database models
└── types/             # TypeScript types
```

## 🔒 Production Security Features

- **Authentication**: Clerk production authentication with role-based access
- **Payment Security**: PCI-compliant Stripe integration with webhook verification
- **Data Protection**: Input sanitization, SQL injection prevention
- **Security Headers**: XSS protection, CSRF prevention, content security policy
- **Error Handling**: Secure error logging without sensitive data exposure
- **API Security**: Rate limiting, authentication on all routes
- **HTTPS Enforcement**: SSL/TLS certificates required for production

## 📊 Monitoring & Logging

- **Error Logging**: Centralized error tracking system
- **Performance Monitoring**: Real-time application performance tracking
- **Payment Monitoring**: Stripe dashboard integration
- **Database Monitoring**: MongoDB performance metrics
- **Uptime Monitoring**: Service availability tracking

## 🚀 Production Checklist

### Pre-Deploy
- [ ] All environment variables configured
- [ ] Database migrations completed
- [ ] SSL certificates installed
- [ ] Stripe webhooks configured
- [ ] Email service configured and tested
- [ ] Admin users created
- [ ] Security headers verified

### Post-Deploy
- [ ] Payment flow tested with small amounts
- [ ] Email notifications working
- [ ] QR code generation and validation tested
- [ ] Admin panel accessible
- [ ] Error logging functioning
- [ ] Performance monitoring active
- [ ] Backup systems in place

## 🆘 Production Support

For production support and enterprise inquiries:
- **Email**: support@dafinazeqiri.tickets
- **Technical Issues**: Create an issue on GitHub
- **Security Reports**: security@dafinazeqiri.tickets
- **Business Inquiries**: business@dafinazeqiri.tickets

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Note**: This is a production-ready application. Ensure all security measures are in place before deploying to production environments.
