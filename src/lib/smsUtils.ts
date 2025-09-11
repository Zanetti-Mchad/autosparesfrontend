import { sendSMS } from './smsService';
import { env } from '@/env';

// Get configuration from environment variables
const getSMSConfig = () => ({
  username: process.env.NEXT_PUBLIC_EGOSMS_USERNAME || '',
  password: process.env.NEXT_PUBLIC_EGOSMS_PASSWORD || '',
  sender: process.env.NEXT_PUBLIC_EGOSMS_SENDER || 'AutoSpares',
  useSandbox: process.env.NEXT_PUBLIC_EGOSMS_SANDBOX === 'true' || env.NODE_ENV !== 'production'
});

/**
 * Sends an SMS using default configuration values
 * 
 * @param phoneNumber The recipient's phone number
 * @param messageText The message to send
 * @param priority Optional priority level (0-4)
 * @returns Promise resolving to the API response
 */
export async function sendQuickSMS(
  phoneNumber: string, 
  messageText: string, 
  priority?: number
): Promise<string> {
  const config = getSMSConfig();
  
  if (!config.username || !config.password) {
    throw new Error('SMS service is not properly configured');
  }

  // Format phone number to EGO SMS format (256XXXXXXXXX)
  let formattedNumber = phoneNumber.replace(/\D/g, '');
  if (formattedNumber.startsWith('0')) {
    formattedNumber = '256' + formattedNumber.substring(1);
  } else if (!formattedNumber.startsWith('256')) {
    formattedNumber = '256' + formattedNumber;
  }

  return sendSMS({
    phoneNumber: formattedNumber,
    message: messageText,
    useSandbox: config.useSandbox
  });
}

/**
 * Sends multiple SMS messages to different recipients
 * 
 * @param recipients Array of recipient phone numbers
 * @param messageText The message to send to all recipients
 * @param priority Optional priority level (0-4)
 * @returns Promise resolving to an object with results for each recipient
 */
export async function sendBulkSMS(
  recipients: string[],
  messageText: string,
  priority?: number
): Promise<Record<string, string | Error>> {
  const results: Record<string, string | Error> = {};
  
  for (const recipient of recipients) {
    try {
      const result = await sendQuickSMS(recipient, messageText, priority);
      results[recipient] = result;
    } catch (error) {
      results[recipient] = error instanceof Error ? error : new Error(String(error));
    }
  }
  
  return results;
} 