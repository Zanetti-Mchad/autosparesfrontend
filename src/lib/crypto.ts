/**
 * Crypto utilities for secure data storage
 */

/**
 * Simple encryption for storing OTP data
 * Note: This is a basic implementation. For production,
 * consider using a more robust encryption library.
 * 
 * @param data The data to encrypt
 * @returns Encrypted string
 */
export function encryptData(data: string): string {
  // In a real application, use a proper encryption algorithm
  // This is a simple Base64 encoding for demonstration
  return Buffer.from(data).toString('base64');
}

/**
 * Decrypt previously encrypted data
 * 
 * @param encryptedData The encrypted data to decrypt
 * @returns Decrypted string
 */
export function decryptData(encryptedData: string): string {
  // Decrypt the data (simple Base64 decoding for demonstration)
  return Buffer.from(encryptedData, 'base64').toString('utf-8');
}

/**
 * Verify if the OTP is valid and not expired
 * 
 * @param storedOtpData The stored OTP data
 * @param inputOtp The OTP entered by the user
 * @returns Validation result
 */
export function verifyOtp(storedOtpData: string, inputOtp: string): { 
  valid: boolean; 
  message?: string; 
  userId?: string;
  phoneNumber?: string;
} {
  try {
    // Decrypt the data
    const decryptedData = decryptData(storedOtpData);
    const otpData = JSON.parse(decryptedData);
    
    // Check if OTP is expired
    if (Date.now() > otpData.expiresAt) {
      return {
        valid: false,
        message: 'OTP has expired'
      };
    }
    
    // Check if OTP matches
    if (otpData.otp !== inputOtp) {
      return {
        valid: false,
        message: 'Invalid OTP'
      };
    }
    
    // OTP is valid
    return {
      valid: true,
      userId: otpData.userId,
      phoneNumber: otpData.phoneNumber
    };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return {
      valid: false,
      message: 'Error verifying OTP'
    };
  }
} 