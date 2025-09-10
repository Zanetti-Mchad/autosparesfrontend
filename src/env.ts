/**
 * Environment variables for EgoSMS integration
 * 
 * Note: In production, these should be set through your hosting platform
 * (Vercel, Netlify, etc.) and not hardcoded.
 */

export const env = {
  // EgoSMS Configuration
  EGOSMS_USERNAME: process.env.EGOSMS_USERNAME,
  EGOSMS_PASSWORD: process.env.EGOSMS_PASSWORD,
  EGOSMS_SENDER: process.env.EGOSMS_SENDER,
  
  // Application URLs
  PRODUCTION_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  NEXT_PUBLIC_BACKEND_API_URL: process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:4120',
  
  // Backend API - Use Railway in production, localhost in development
  BACKEND_API_URL: process.env.NODE_ENV === 'production' 
    ? (process.env.NEXT_PUBLIC_BACKEND_API_URL || 'https://backendrdjs-production.up.railway.app')
    : (process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:4120'),

  // Environment indicator
  NODE_ENV: process.env.NODE_ENV || 'development'
}; 