import { NextRequest, NextResponse } from 'next/server';
import { smsStore, SmsDeliveryReport } from '@/lib/models/SmsMessage';

/**
 * Webhook handler for EgoSMS delivery reports
 * 
 * This endpoint receives delivery status reports from EgoSMS in the format:
 * {"MsgFollowUpUniqueCode": "ApiJsonSubmit64b8dd8aab0d05.55176607", "number": "+256777071434", "Status": "Success"}
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the incoming JSON data
    const data = await request.json();
    
    // Log the delivery report
    console.log('SMS Delivery Report:', data);
    
    // Extract the data from the report
    const { MsgFollowUpUniqueCode, number, Status } = data;
    
    // Validate the required fields
    if (!MsgFollowUpUniqueCode || !number || !Status) {
      return NextResponse.json(
        { error: 'Missing required fields in delivery report' },
        { status: 400 }
      );
    }
    
    // Create a delivery report object
    const deliveryReport: SmsDeliveryReport = {
      MsgFollowUpUniqueCode,
      number,
      Status,
      receivedAt: new Date()
    };
    
    // Process the delivery report
    const updatedMessage = smsStore.processDeliveryReport(deliveryReport);
    
    if (updatedMessage) {
      console.log(`Updated message status to ${updatedMessage.status}:`, updatedMessage);
    } else {
      console.log(`No matching message found for ID: ${MsgFollowUpUniqueCode}`);
    }
    
    // In a real application, you might also:
    // 1. Trigger notifications based on status changes
    // 2. Update related business processes (like marking OTP as delivered)
    // 3. Log statistics for monitoring and reporting
    
    // Always acknowledge receipt to prevent retries
    return NextResponse.json({ message: "ok, msg delivered" }, { status: 200 });
    
  } catch (error) {
    console.error('Error processing SMS delivery report:', error);
    
    // Still return a 200 status to acknowledge receipt
    // This prevents EgoSMS from repeatedly trying to send the same report
    return NextResponse.json(
      { 
        message: "Received, but processing failed", 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 200 } // Use 200 even for errors to acknowledge receipt
    );
  }
} 