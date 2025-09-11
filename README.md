# Auto Spares Frontend

A modern frontend for the Auto Spares management system built with Next.js.

## Environment Setup

Create a `.env.local` file with the following variables:

```
# API URLs
NEXT_PUBLIC_API_URL=https://autosparesbackend-production.up.railway.app/api/v1
DATABASE_URL=https://autosparesbackend-production.up.railway.app

# Supabase Configuration (if using file uploads)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# SMS Service Configuration (if using SMS)
NEXT_PUBLIC_EGOSMS_USERNAME=your_egosms_username
NEXT_PUBLIC_EGOSMS_PASSWORD=your_egosms_password
NEXT_PUBLIC_EGOSMS_SENDER=AutoSpares
NEXT_PUBLIC_EGOSMS_SANDBOX=true
```

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

## Production

```bash
# Build for production
npm run build

# Start production server
node .next/standalone/server.js
```

## Project Structure

- `/src/app` - Next.js App Router components
- `/src/components` - Reusable UI components
- `/src/lib` - Utility functions and services
- `/pages/api` - API routes (Pages Router)

## Backend Integration

The application is configured to use the backend at:

- API: `https://autosparesbackend-production.up.railway.app/api/v1`
- Database: `https://autosparesbackend-production.up.railway.app`

API requests are automatically proxied through Next.js rewrites for better security and CORS handling.
