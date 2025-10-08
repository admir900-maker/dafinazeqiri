# BiletAra - Event Ticketing Platform

BiletAra is a comprehensive event ticketing platform built with Next.js 15, featuring payment processing, admin management, email notifications, and QR code ticket validation.

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

### Technical Features
- **Authentication**: Clerk-based user authentication
- **Database**: MongoDB with Mongoose ODM
- **Payment Processing**: Stripe integration with webhooks
- **File Upload**: Cloudinary integration for images
- **Responsive Design**: Mobile-first responsive UI
- **Real-time Updates**: Live booking status updates

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with Turbopack
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: Clerk
- **Payments**: Stripe
- **Email**: Custom SMTP service
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with Radix UI
- **File Storage**: Cloudinary
- **QR Codes**: qrcode library

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB database
- Stripe account
- Clerk account
- Cloudinary account
- SMTP email service

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/eloci/Biletara.git
cd Biletara
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory:

```env
# Database
MONGODB_URI=your_mongodb_connection_string

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/signin
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/signup

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# SMTP (Optional - can be configured via admin panel)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_SECURE=false
SENDER_EMAIL=your_sender_email
SENDER_NAME=BiletAra
```

### 4. Run the development server
```bash
npm run dev
```

### 5. Build for production
```bash
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🔧 Configuration

### Admin Setup
1. Sign up for an account
2. Promote your user to admin via database or API
3. Access admin panel at `/admin`
4. Configure payment and SMTP settings

### Payment Configuration
- Configure Stripe keys in admin panel
- Set platform fees and currency
- Test payment integration

### Email Configuration  
- Set up SMTP server details
- Test email functionality
- Configure sender information

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

## 🔒 Security Features

- User authentication with Clerk
- Admin role-based access control
- Secure payment processing
- Input validation and sanitization
- Protected API routes

## 📧 Email System

- Database-first SMTP configuration
- Booking confirmation emails
- Admin email testing
- Fallback to environment variables

## 🎫 Ticket System

- QR code generation for each ticket
- Mobile-friendly validation interface
- Real-time validation updates
- Booking status tracking

## 🌍 Multi-language Support

- Currency conversion
- Localized formatting
- Multi-region support

## 📱 Mobile Support

- Responsive design
- Mobile-optimized ticket validation
- Touch-friendly interface

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email support@biletara.com or create an issue on GitHub.
