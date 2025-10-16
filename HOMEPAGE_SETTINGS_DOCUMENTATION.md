# Homepage Display Settings Documentation

## Overview
The homepage display settings feature allows administrators to control the visibility of various sections on the main page, including the hero section with slides.

## Location
**Admin Panel** → **Settings** → **Homepage Tab**

## Features

### 1. Show Hero Section
- **Description**: Controls the visibility of the entire hero section with slides on the homepage
- **Default**: Enabled (true)
- **Effect**: When disabled, the hero section (including title, subtitle, search bar, and background) will be completely hidden from the homepage

### 2. Show Featured Events
- **Description**: Controls the visibility of the featured events section
- **Default**: Enabled (true)
- **Effect**: When disabled, featured events won't appear on the homepage

### 3. Show Categories
- **Description**: Controls the visibility of event categories
- **Default**: Enabled (true)
- **Effect**: When disabled, category section won't appear on the homepage

### 4. Show Statistics
- **Description**: Controls the visibility of statistics (Events, Attendees, Rating, This Month) in the hero section
- **Default**: Enabled (true)
- **Effect**: When disabled, the statistics counters won't appear in the hero section (only affects stats, not the entire hero)

### 5. Auto-Rotate Hero Slides
- **Description**: Automatically rotate through hero slides (currently not implemented in frontend)
- **Default**: Disabled (false)
- **Additional Setting**: Rotation interval in seconds (3-30 seconds)

### 6. Theme & Colors
- **Theme**: Light, Dark, or Auto (follows system preference)
- **Primary Color**: Main brand color (default: #2563eb - blue)
- **Accent Color**: Secondary brand color (default: #8b5cf6 - purple)

## Technical Implementation

### Backend
1. **Settings Model** (`/src/models/Settings.ts`)
   - Added `homepage` section with display controls
   - Includes validation and default values

2. **API Endpoints**
   - `/api/admin/settings` - Admin endpoint for managing all settings
   - `/api/homepage-settings` - Public endpoint for fetching homepage display settings

### Frontend
1. **Admin Settings Page** (`/src/app/admin/settings/page.tsx`)
   - New "Homepage" tab with toggle switches
   - Color pickers for theme customization
   - Save functionality for all homepage settings

2. **Hero Section Component** (`/src/components/sections/hero-section.tsx`)
   - Fetches homepage settings on load
   - Conditionally renders based on `showHeroSection` setting
   - Conditionally shows/hides stats based on `showStats` setting

## Usage Instructions

### How to Hide the Hero Section

1. **Navigate to Settings**
   - Go to Admin Panel
   - Click on "Settings" in the navigation
   - Click on the "Homepage" tab

2. **Toggle Hero Section**
   - Find "Show Hero Section" toggle
   - Switch it to OFF (disabled)
   - Click "Save Homepage Settings"

3. **Verify Changes**
   - Visit the homepage
   - The hero section should no longer be visible
   - Featured events and other sections remain visible

### How to Hide Only Statistics

1. **Navigate to Settings**
   - Go to Admin Panel → Settings → Homepage tab

2. **Toggle Statistics**
   - Find "Show Statistics" toggle
   - Switch it to OFF
   - Click "Save Homepage Settings"

3. **Verify Changes**
   - Visit the homepage
   - Hero section remains visible but statistics are hidden

## Database Structure

```typescript
homepage: {
  showHeroSection: Boolean,        // Default: true
  showFeaturedEvents: Boolean,     // Default: true
  showCategories: Boolean,         // Default: true
  showStats: Boolean,              // Default: true
  heroAutoRotate: Boolean,         // Default: false
  heroRotationInterval: Number,    // Default: 5 seconds
  theme: String,                   // 'light' | 'dark' | 'auto'
  primaryColor: String,            // Default: '#2563eb'
  accentColor: String              // Default: '#8b5cf6'
}
```

## API Response Example

```json
{
  "success": true,
  "data": {
    "showHeroSection": true,
    "showFeaturedEvents": true,
    "showCategories": true,
    "showStats": true,
    "heroAutoRotate": false,
    "heroRotationInterval": 5,
    "theme": "auto",
    "primaryColor": "#2563eb",
    "accentColor": "#8b5cf6"
  }
}
```

## Benefits

1. **Flexibility**: Admins can customize the homepage layout without code changes
2. **A/B Testing**: Easy to test different homepage configurations
3. **Seasonal Changes**: Quick adjustments for special events or campaigns
4. **Performance**: Hide unused sections to improve page load times
5. **User Experience**: Tailor the homepage to your specific needs

## Future Enhancements

- Implement hero slide auto-rotation functionality
- Add more customization options (fonts, spacing, layouts)
- Section reordering via drag-and-drop
- Preview mode before saving changes
- Schedule settings changes for future dates
- Multiple homepage layouts/templates

## Troubleshooting

### Hero Section Still Visible After Disabling
1. Clear browser cache (Ctrl + Shift + R)
2. Verify settings were saved (check database)
3. Restart development server

### Changes Not Reflecting
1. Check if settings API is responding: `/api/homepage-settings`
2. Verify MongoDB connection
3. Check browser console for errors

## Related Files

- `/src/models/Settings.ts` - Settings schema
- `/src/app/admin/settings/page.tsx` - Admin interface
- `/src/app/api/homepage-settings/route.ts` - Public API
- `/src/components/sections/hero-section.tsx` - Hero component
- `/src/app/page.tsx` - Main homepage

---

**Last Updated**: December 2024
**Version**: 1.0.0
