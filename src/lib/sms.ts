/**
 * EgoSMS Integration Service
 * This service handles sending SMS messages via our server-side API
 */
import { env } from '@/env';

interface SendSMSParams {
  phoneNumber: string;
  message: string;
  priority?: number;
}

interface SMSResponse {
  status: 'success' | 'error';
  message: string;
  messageId?: string; // Optional ID returned by the SMS provider
}

export class EgoSMSService {
  /**
   * Send SMS message via our server-side API
   * @param params The SMS parameters (phoneNumber, message, priority)
   * @returns Promise with the API response
   */
  async sendSMS(params: SendSMSParams): Promise<SMSResponse> {
    const { phoneNumber, message } = params;
    
    // Format phone number to ensure it starts with 0
    const formattedNumber = phoneNumber.startsWith('0') ? phoneNumber : `0${phoneNumber}`;
    
    try {
      console.log('Sending SMS to:', formattedNumber);
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: formattedNumber,
          message: message
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log('SMS API Response:', data);
      
      return data;
    } catch (error) {
      console.error('Error sending SMS:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error sending SMS'
      };
    }
  }

  /**
   * Send OTP message
   * @param phoneNumber The recipient's phone number
   * @param otp The OTP code to send
   * @returns Promise with the API response
   */
  async sendOTP(phoneNumber: string, otp: string): Promise<SMSResponse> {
    const message = `Your OTP code for RichDadJrSchool password reset is: ${otp}. Valid for 5 minutes.`;
    return this.sendSMS({
      phoneNumber,
      message
    });
  }
}

// Create a singleton instance
export const smsService = new EgoSMSService(); 