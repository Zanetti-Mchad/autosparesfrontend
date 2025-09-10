const EgoSmsService = require('../services/smsService');
const dotenv = require('dotenv');

// Load environment variables if not already loaded
dotenv.config();

// Initialize SMS service with config from environment variables
const smsService = new EgoSmsService({
  username: process.env.EGOSMS_USERNAME,
  password: process.env.EGOSMS_PASSWORD,
  isProduction: process.env.NODE_ENV === 'production',
  defaultSenderId: process.env.EGOSMS_SENDER_ID || 'SmartSch'
});

/**
 * Send notification SMS to a single user
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - Message content
 * @returns {Promise} - Result of the SMS sending operation
 */
const sendNotificationSMS = async (phoneNumber, message) => {
  try {
    return await smsService.sendSms(phoneNumber, message);
  } catch (error) {
    console.error('Failed to send notification SMS:', error);
    throw error;
  }
};

/**
 * Send bulk notification SMS to multiple users
 * @param {Array} users - Array of user objects containing phone numbers
 * @param {string} message - Message content to send to all users
 * @param {string} phoneField - Field name in user object that contains the phone number (default: 'phone')
 * @returns {Promise} - Result of the bulk SMS sending operation
 */
const sendBulkNotificationSMS = async (users, message, phoneField = 'phone') => {
  try {
    if (!Array.isArray(users) || users.length === 0) {
      throw new Error('Users must be a non-empty array');
    }

    const messages = users.map(user => ({
      phoneNumber: user[phoneField],
      message: message
    }));

    return await smsService.sendBulkSms(messages);
  } catch (error) {
    console.error('Failed to send bulk notification SMS:', error);
    throw error;
  }
};

/**
 * Send personalized SMS messages to multiple users
 * @param {Array} messages - Array of message objects {phoneNumber, message}
 * @returns {Promise} - Result of the bulk SMS sending operation
 */
const sendPersonalizedSMS = async (messages) => {
  try {
    return await smsService.sendBulkSms(messages);
  } catch (error) {
    console.error('Failed to send personalized SMS:', error);
    throw error;
  }
};

module.exports = {
  sendNotificationSMS,
  sendBulkNotificationSMS,
  sendPersonalizedSMS,
  smsService // Export the service instance directly for advanced usage
}; 