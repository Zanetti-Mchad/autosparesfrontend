/**
 * SMS Message Model
 * This file defines the structure for SMS messages and their delivery status
 */

/**
 * Represents the delivery status of an SMS message
 */
export enum SmsDeliveryStatus {
  PENDING = 'PENDING',     // Message has been submitted but no delivery report yet
  DELIVERED = 'DELIVERED', // Message successfully delivered to recipient
  FAILED = 'FAILED',       // Message delivery failed
  UNKNOWN = 'UNKNOWN'      // Status could not be determined
}

/**
 * Represents an SMS message in the system
 */
export interface SmsMessage {
  id: string;               // Unique identifier for the message in our system
  messageId: string;        // The MsgFollowUpUniqueCode from EgoSMS
  phoneNumber: string;      // Recipient phone number
  message: string;          // Content of the message
  status: SmsDeliveryStatus;// Current delivery status
  reference?: string;       // Optional client reference (e.g., 'OTP_1234')
  createdAt: Date;          // When the message was created
  updatedAt: Date;          // When the message was last updated
  deliveredAt?: Date;       // When the message was delivered (if applicable)
}

/**
 * Represents a delivery report from EgoSMS
 */
export interface SmsDeliveryReport {
  MsgFollowUpUniqueCode: string; // The message ID from EgoSMS
  number: string;                // The recipient phone number
  Status: string;                // The delivery status (e.g., "Success", "Failed")
  receivedAt: Date;              // When the report was received
}

/**
 * Maps EgoSMS status strings to our internal status enum
 */
export function mapEgoSmsStatus(status: string): SmsDeliveryStatus {
  switch (status.toLowerCase()) {
    case 'success':
      return SmsDeliveryStatus.DELIVERED;
    case 'failed':
    case 'failure':
      return SmsDeliveryStatus.FAILED;
    default:
      return SmsDeliveryStatus.UNKNOWN;
  }
}

/**
 * Stores an SMS message (In a real app, this would interface with a database)
 * 
 * This is a simple in-memory implementation for demonstration
 */
class SmsStore {
  private messages: Map<string, SmsMessage> = new Map();
  
  /**
   * Create a new SMS message record
   */
  createMessage(message: Omit<SmsMessage, 'id' | 'createdAt' | 'updatedAt'>): SmsMessage {
    const id = `sms_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();
    
    const smsMessage: SmsMessage = {
      id,
      ...message,
      createdAt: now,
      updatedAt: now
    };
    
    this.messages.set(id, smsMessage);
    return smsMessage;
  }
  
  /**
   * Get a message by its ID
   */
  getMessageById(id: string): SmsMessage | undefined {
    return this.messages.get(id);
  }
  
  /**
   * Get a message by its EgoSMS message ID
   */
  getMessageByEgoSmsId(messageId: string): SmsMessage | undefined {
    const messagesArray = Array.from(this.messages.values());
    
    for (const message of messagesArray) {
      if (message.messageId === messageId) {
        return message;
      }
    }
    return undefined;
  }
  
  /**
   * Update the delivery status of a message
   */
  updateDeliveryStatus(messageId: string, status: SmsDeliveryStatus): SmsMessage | undefined {
    const message = this.getMessageByEgoSmsId(messageId);
    
    if (message) {
      const updatedMessage: SmsMessage = {
        ...message,
        status,
        updatedAt: new Date(),
        deliveredAt: status === SmsDeliveryStatus.DELIVERED ? new Date() : message.deliveredAt
      };
      
      this.messages.set(message.id, updatedMessage);
      return updatedMessage;
    }
    
    return undefined;
  }
  
  /**
   * Process a delivery report
   */
  processDeliveryReport(report: SmsDeliveryReport): SmsMessage | undefined {
    const status = mapEgoSmsStatus(report.Status);
    return this.updateDeliveryStatus(report.MsgFollowUpUniqueCode, status);
  }
}

// Create a singleton instance
export const smsStore = new SmsStore(); 