import { sendQuickSMS } from './smsUtils';

// OTP configuration
const OTP_CONFIG = {
  length: 6, // Length of the OTP code
  expiryMinutes: 10, // OTP validity period in minutes
  maxAttempts: 3, // Maximum verification attempts
};

// Store OTPs in memory (in production, use a database)
interface OtpRecord {
  code: string;
  expiresAt: Date;
  attempts: number;
  verified: boolean;
}

const otpStore: Record<string, OtpRecord> = {};

/**
 * Generate a random numeric OTP of specified length
 * @returns Random OTP code
 */
function generateOTP(length = OTP_CONFIG.length): string {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  
  return otp;
}

/**
 * Send a password reset OTP via SMS
 * @param phoneNumber Recipient's phone number
 * @param username User's name or identifier (optional)
 * @returns Promise resolving to the generated OTP code
 */
export async function sendPasswordResetOTP(
  phoneNumber: string,
  username?: string
): Promise<string> {
  // Generate a new OTP
  const otp = generateOTP();
  
  // Calculate expiry time
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_CONFIG.expiryMinutes);
  
  // Store OTP
  otpStore[phoneNumber] = {
    code: otp,
    expiresAt,
    attempts: 0,
    verified: false
  };
  
  // Create the message
  const greeting = username ? `Hello ${username}` : 'Hello';
  const message = `${greeting}, your password reset code is: ${otp}. Valid for ${OTP_CONFIG.expiryMinutes} minutes. Do not share this code with anyone.`;
  
  // Send the SMS
  await sendQuickSMS(phoneNumber, message);
  
  return otp;
}

/**
 * Verify an OTP code
 * @param phoneNumber The phone number the OTP was sent to
 * @param otpCode The OTP code to verify
 * @returns Boolean indicating verification success
 */
export function verifyOTP(phoneNumber: string, otpCode: string): boolean {
  const record = otpStore[phoneNumber];
  
  // Check if OTP exists
  if (!record) {
    return false;
  }
  
  // Check if already verified
  if (record.verified) {
    return false;
  }
  
  // Check if expired
  if (new Date() > record.expiresAt) {
    return false;
  }
  
  // Check if max attempts reached
  if (record.attempts >= OTP_CONFIG.maxAttempts) {
    return false;
  }
  
  // Increment attempts
  record.attempts += 1;
  
  // Verify the code
  if (record.code === otpCode) {
    record.verified = true;
    return true;
  }
  
  return false;
}

/**
 * Check if a phone number has a valid OTP record
 * @param phoneNumber The phone number to check
 * @returns Boolean indicating if the phone has a valid OTP
 */
export function hasValidOTP(phoneNumber: string): boolean {
  const record = otpStore[phoneNumber];
  
  if (!record) {
    return false;
  }
  
  return new Date() <= record.expiresAt && record.attempts < OTP_CONFIG.maxAttempts;
}

/**
 * Clear an OTP record after successful verification or when no longer needed
 * @param phoneNumber The phone number to clear the OTP for
 */
export function clearOTP(phoneNumber: string): void {
  delete otpStore[phoneNumber];
} 