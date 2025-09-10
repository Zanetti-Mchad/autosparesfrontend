/**
 * OTP Utility Functions
 * Utilities for generating and validating OTP codes
 */

/**
 * Generate a random numeric OTP code of specified length
 * @param length Length of the OTP code (default: 6)
 * @returns A numeric OTP string
 */
export function generateOTP(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  
  return otp;
}

/**
 * Format a phone number to ensure it has the correct format for EgoSMS
 * Ensures number starts with + and country code
 * @param phoneNumber The phone number to format
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove any non-digit characters except +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // If the number doesn't start with +, add it
  if (!cleaned.startsWith('+')) {
    // Assuming Uganda as default country code if not provided
    return cleaned.startsWith('256') ? `+${cleaned}` : `+256${cleaned}`;
  }
  
  return cleaned;
} 