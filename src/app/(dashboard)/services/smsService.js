const axios = require('axios');

/**
 * EgoSMS Service for sending SMS messages
 * Documentation: https://www.egosms.co/api/v1/json/
 */
class EgoSmsService {
  constructor(config = {}) {
    this.username = config.username || process.env.EGOSMS_USERNAME;
    this.password = config.password || process.env.EGOSMS_PASSWORD;
    this.baseUrl = config.isProduction 
      ? 'https://www.egosms.co/api/v1/json/' 
      : 'http://sandbox.egosms.co/api/v1/json/';
    this.defaultSenderId = config.defaultSenderId || 'SmartSch';
  }

  /**
   * Send a single SMS message
   * @param {string} phoneNumber - Recipient phone number (format: 256XXXXXXXXX)
   * @param {string} message - Message content (max 160 characters)
   * @param {string} senderId - Sender ID (max 11 characters)
   * @param {string} priority - Priority level (0-4, 0 being highest)
   * @returns {Promise} - API response
   */
  async sendSms(phoneNumber, message, senderId = null, priority = '1') {
    try {
      // Validate phone number format
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      if (!formattedNumber) {
        throw new Error('Invalid phone number format. Must be in format: 256XXXXXXXXX');
      }

      // Validate message length
      if (message.length > 160) {
        console.warn('SMS message exceeds 160 characters and may be split into multiple messages');
      }

      // Prepare request payload
      const payload = {
        method: 'SendSms',
        userdata: {
          username: this.username,
          password: this.password
        },
        msgdata: [
          {
            number: formattedNumber,
            message: message,
            senderid: senderId || this.defaultSenderId,
            priority: priority
          }
        ]
      };

      // Send request to EgoSMS API
      console.log(`Sending SMS to ${formattedNumber} via EgoSMS...`);
      const response = await axios.post(this.baseUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('EgoSMS API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error sending SMS:', error.message);
      if (error.response) {
        console.error('EgoSMS API error response:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Send bulk SMS messages to multiple recipients
   * @param {Array} messages - Array of message objects {phoneNumber, message, senderId, priority}
   * @returns {Promise} - API response
   */
  async sendBulkSms(messages) {
    try {
      if (!Array.isArray(messages) || messages.length === 0) {
        throw new Error('Messages must be a non-empty array');
      }

      // Prepare message data
      const msgdata = messages.map(msg => {
        const formattedNumber = this.formatPhoneNumber(msg.phoneNumber);
        if (!formattedNumber) {
          console.warn(`Skipping invalid phone number: ${msg.phoneNumber}`);
          return null;
        }

        return {
          number: formattedNumber,
          message: msg.message,
          senderid: msg.senderId || this.defaultSenderId,
          priority: msg.priority || '1'
        };
      }).filter(Boolean); // Remove null entries (invalid phone numbers)

      if (msgdata.length === 0) {
        throw new Error('No valid messages to send');
      }

      // Prepare request payload
      const payload = {
        method: 'SendSms',
        userdata: {
          username: this.username,
          password: this.password
        },
        msgdata: msgdata
      };

      // Send request to EgoSMS API
      console.log(`Sending bulk SMS to ${msgdata.length} recipients via EgoSMS...`);
      const response = await axios.post(this.baseUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('EgoSMS API bulk response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error sending bulk SMS:', error.message);
      if (error.response) {
        console.error('EgoSMS API error response:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Format phone number to required format (256XXXXXXXXX)
   * @param {string} phoneNumber - Phone number to format
   * @returns {string|null} - Formatted phone number or null if invalid
   */
  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;

    // Remove any non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');

    // Handle different formats
    if (cleaned.startsWith('0')) {
      // Convert 07XXXXXXXX to 2567XXXXXXXX
      cleaned = '256' + cleaned.substring(1);
    } else if (cleaned.startsWith('7') && cleaned.length === 9) {
      // Convert 7XXXXXXXX to 2567XXXXXXXX
      cleaned = '256' + cleaned;
    } else if (!cleaned.startsWith('256') && cleaned.length === 10) {
      // Add country code if missing and has 10 digits
      cleaned = '256' + cleaned;
    }

    // Validate the final format (256 + 9 digits)
    if (/^256\d{9}$/.test(cleaned)) {
      return cleaned;
    }

    return null;
  }
}

module.exports = EgoSmsService; 