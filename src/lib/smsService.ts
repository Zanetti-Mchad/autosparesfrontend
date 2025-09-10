/**
 * EgoSMS Service
 * 
 * This service provides a way to send SMS messages via our backend API.
 */

interface SendSMSParams {
  phoneNumber: string;
  message: string;
  useSandbox?: boolean;
}

/**
 * Sends an SMS message via our backend API
 * 
 * @param params The parameters for sending the SMS
 * @returns A Promise that resolves with the API response
 */
export async function sendSMS(params: SendSMSParams): Promise<string> {
  const { 
    phoneNumber, 
    message,
    useSandbox = false 
  } = params;

  // Validate required parameters
  if (!phoneNumber || !message) {
    throw new Error('Phone number and message are required');
  }

  try {
    // Format phone number (remove any non-digit characters)
    const formattedNumber = phoneNumber.replace(/\D/g, '');
    
    // Log the request (without sensitive data)
    console.log('Sending SMS to:', formattedNumber);
    
    // Make the request to our backend API
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL 
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : 'http://localhost:3000';
      
    const apiUrl = `${baseUrl}/api/sms/send`;
    console.log('Sending SMS request to:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: formattedNumber,
        message: message,
        useSandbox: useSandbox
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.status === 'error') {
      throw new Error(result.message || 'Failed to send SMS');
    }
    
    return 'OK';
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
}

/**
 * Example usage:
 * 
 * ```
 * import { sendSMS } from '@/lib/smsService';
 * 
 * async function sendMessage() {
 *   try {
 *     const result = await sendSMS({
 *       username: 'Egosmstest',
 *       password: 'egotest',
 *       sender: 'Egosms',
 *       number: '+256788200915',
 *       message: 'My First Message through Egosms'
 *     });
 *     
 *     console.log('SMS sent successfully:', result);
 *   } catch (error) {
 *     console.error('Failed to send SMS:', error);
 *   }
 * }
 * ```
 */ 