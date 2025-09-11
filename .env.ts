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
    ? (process.env.NEXT_PUBLIC_BACKEND_API_URL || 'https://autosparesbackend-production.up.railway.app')
    : (process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:4120'),

  // Environment indicator
  NODE_ENV: process.env.NODE_ENV || 'development'
}; 

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=mahadnyanzi@gmail.com
EMAIL_PASS=guux jaum ddvq kdlv
EMAIL_FROM_NAME="Shop DASH"
EMAIL_FROM=mahadnyanzi@gmail.com

NEXT_PUBLIC_EGOSMS_USERNAME=admin2023
NEXT_PUBLIC_EGOSMS_PASSWORD=PZ5samJUd24ab@e
NEXT_PUBLIC_EGOSMS_SENDER=AutoSpares


