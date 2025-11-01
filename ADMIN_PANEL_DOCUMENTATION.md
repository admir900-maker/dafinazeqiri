# SUPERNOVA Admin Panel Documentation

## Overview
The SUPERNOVA admin panel has been completely redesigned with a modern, responsive interface and proper navigation structure. All admin routes are now properly organized and connected.

## Admin Routes Structure

### Frontend Pages

#### 1. `/admin` - Main Admin Landing
- **Purpose**: Redirects to dashboard
- **Access**: Admin role required
- **Features**: Simple redirect to dashboard

#### 2. `/admin/dashboard` - Admin Dashboard
- **Purpose**: Overview and quick actions
- **Access**: Admin role required
- **Features**:
  - Real-time statistics (events, bookings, users, categories)
  - Quick action buttons
  - Recent activity feed
  - System status indicators
  - Refresh functionality

#### 3. `/admin/events` - Events Management
- **Purpose**: Create, edit, and manage events
- **Access**: Admin role required
- **Features**:
  - Create new events with full form validation
  - Edit existing events
  - Toggle event active/inactive status
  - Delete events with confirmation
  - Search and filter events
  - Event image upload
  - Category assignment
  - Capacity and pricing management

#### 4. `/admin/categories` - Categories Management
- **Purpose**: Manage event categories
- **Access**: Admin role required
- **Features**:
  - Create new categories
  - Edit category details
  - Toggle category visibility
  - Delete categories (with event count validation)
  - Search and filter categories
  - Bulk operations
  - Event count statistics

#### 5. `/admin/bookings` - Bookings Management
- **Purpose**: Manage bookings and tickets
- **Access**: Admin role required
- **Features**:
  - View pending bookings
  - Confirm bookings
  - Booking search and filters
  - Booking status management
  - Customer information display

#### 6. `/admin/users` - User Management
- **Purpose**: Manage users and roles
- **Access**: Admin role required
- **Features**:
  - View all users
  - Promote users to staff/manager/admin
  - Remove user roles
  - User search functionality
  - Role-based statistics
  - User activity tracking

#### 7. `/admin/analytics` - Analytics & Reports
- **Purpose**: Business insights and reports
- **Access**: Admin role required
- **Features**:
  - Revenue analytics
  - Monthly revenue charts
  - Popular events ranking
  - Category distribution
  - Conversion rates
  - Average order value
  - Return customer metrics
  - Export functionality

#### 8. `/admin/payments` - Payment Management
- **Purpose**: Transaction and payment oversight
- **Access**: Admin role required
- **Features**:
  - Payment transaction history
  - Payment status tracking (pending, completed, failed, refunded)
  - Payment method filtering
  - Revenue statistics
  - Refund management
  - Export payment reports

#### 9. `/admin/settings` - System Settings
- **Purpose**: Configure system and payment settings
- **Access**: Admin role required
- **Features**:
  - **Payment Settings**:
    - Stripe configuration (public key, secret key, webhook secret)
    - Raiffeisen Bank configuration
    - Currency selection
    - Tax rate configuration
    - Payment testing functionality
  - **System Settings**:
    - Site information (name, URL)
    - Email configuration
    - Maintenance mode toggle
    - User registration settings
    - Email verification settings

### Backend API Routes

#### Admin API Endpoints

1. **`/api/admin/users`**
   - **GET**: Fetch all users
   - **Purpose**: User management data

2. **`/api/admin/promote`**
   - **POST**: Promote user role
   - **Purpose**: Change user permissions

3. **`/api/admin/pending-bookings`**
   - **GET**: Fetch pending bookings
   - **Purpose**: Booking management

4. **`/api/admin/confirm-booking`**
   - **POST**: Confirm pending booking
   - **Purpose**: Booking confirmation

5. **`/api/admin/payment-settings`**
   - **GET/POST**: Payment configuration
   - **Purpose**: Payment gateway management

6. **`/api/admin/init-settings`**
   - **POST**: System settings initialization
   - **Purpose**: System configuration

7. **`/api/admin/test-stripe`**
   - **POST**: Test Stripe connection
   - **Purpose**: Payment testing

8. **`/api/admin/test-email`**
   - **POST**: Test email configuration
   - **Purpose**: Email testing

## Navigation Structure

### Sidebar Navigation
The admin panel features a modern sidebar with the following sections:

1. **Dashboard** - Overview and quick actions
2. **Events** - Event management
3. **Categories** - Category management
4. **Bookings** - Booking management
5. **Users** - User and role management
6. **Analytics** - Reports and insights
7. **Payments** - Transaction management
8. **Settings** - System configuration

### Design Features

#### Visual Design
- **Glassmorphic Design**: Translucent cards with backdrop blur effects
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Dark Theme**: Professional dark theme with white text
- **Consistent Colors**: Blue, green, red, yellow color scheme for status indicators
- **Modern Icons**: Lucide React icons throughout

#### User Experience
- **Breadcrumb Navigation**: Clear page hierarchy
- **Loading States**: Proper loading indicators
- **Error Handling**: User-friendly error messages
- **Success Feedback**: Confirmation messages for actions
- **Search Functionality**: Quick search across all entities
- **Filtering**: Advanced filtering options
- **Pagination**: Efficient data handling for large datasets

#### Interactive Elements
- **Quick Actions**: Fast access to common tasks
- **Bulk Operations**: Multi-select functionality where applicable
- **Real-time Updates**: Live data refresh capabilities
- **Form Validation**: Client-side and server-side validation
- **Image Upload**: Drag-and-drop image uploading
- **Status Toggles**: Easy enable/disable functionality

## Security Features

### Authentication & Authorization
- **Clerk Integration**: Secure user authentication
- **Role-based Access**: Admin role verification
- **Protected Routes**: All admin routes require authentication
- **Session Management**: Automatic session handling

### Data Protection
- **Input Validation**: All forms include validation
- **SQL Injection Protection**: Parameterized queries
- **XSS Prevention**: Input sanitization
- **CSRF Protection**: Built-in Next.js protection

## Technical Implementation

### Frontend Technologies
- **Next.js 15.5.4**: React framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first styling
- **Clerk**: Authentication
- **Lucide React**: Icon library
- **React Hooks**: State management

### Backend Technologies
- **Next.js API Routes**: Server-side logic
- **MongoDB**: Database
- **Mongoose**: ODM
- **Clerk Server**: Authentication
- **Stripe**: Payment processing
- **Raiffeisen Bank**: Alternative payment method

### Key Components
- **AdminNavigation**: Sidebar navigation component
- **AdminHeader**: Top header component
- **AdminLayout**: Layout wrapper with authentication
- **Form Components**: Reusable form elements
- **Card Components**: Consistent card styling
- **Button Components**: Standardized buttons

## Usage Instructions

### Getting Started
1. Ensure you have admin role assigned in Clerk
2. Navigate to `/admin` - you'll be redirected to dashboard
3. Use the sidebar to navigate between different sections
4. Each page has help text and clear action buttons

### Common Tasks

#### Creating an Event
1. Go to **Events** page
2. Click **Create Event** button
3. Fill in all required fields
4. Upload event image
5. Select category
6. Set capacity and pricing
7. Click **Create Event**

#### Managing Users
1. Go to **Users** page
2. Search for specific users if needed
3. Use role promotion buttons to change user permissions
4. View user statistics in the summary cards

#### Configuring Payments
1. Go to **Settings** page
2. Enable desired payment methods (Stripe/Raiffeisen)
3. Enter API keys and configuration
4. Test the connection using test buttons
5. Save settings

#### Viewing Analytics
1. Go to **Analytics** page
2. Review key metrics in summary cards
3. Analyze monthly revenue trends
4. Check popular events and categories
5. Export reports if needed

## Error Handling

### Common Issues and Solutions

1. **Authentication Errors**
   - Ensure proper admin role in Clerk
   - Check session validity
   - Re-login if necessary

2. **Database Connection Issues**
   - Check MongoDB connection string
   - Verify database permissions
   - Check network connectivity

3. **Payment Configuration Issues**
   - Verify API keys are correct
   - Test payment gateway connections
   - Check webhook configurations

4. **File Upload Issues**
   - Ensure proper file permissions
   - Check file size limits
   - Verify cloudinary configuration

## Maintenance

### Regular Tasks
- Monitor system performance via dashboard
- Review pending bookings regularly
- Check payment transaction status
- Update user roles as needed
- Export analytics reports monthly

### Updates
- Keep API keys secure and rotated
- Monitor system settings for any unauthorized changes
- Regular backup of database
- Update payment gateway configurations as needed

## Support

### Troubleshooting
1. Check browser console for JavaScript errors
2. Verify network connectivity
3. Ensure proper authentication
4. Check API endpoint responses
5. Review server logs for detailed error information

### Contact
For technical support or additional features, contact the development team.

---

**Last Updated**: October 2025
**Version**: 2.0.0
**System Status**: ✅ Fully Operational