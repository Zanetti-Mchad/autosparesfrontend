import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, message } = await request.json();

    if (!phoneNumber || !message) {
      return NextResponse.json(
        { status: 'error', message: 'Phone number and message are required' },
        { status: 400 }
      );
    }

    // Format phone number to EgoSMS format (256XXXXXXXXX)
    let formattedNumber = phoneNumber.replace(/\D/g, ''); // Remove any non-digit characters
    
    // Remove any existing 256 prefix to prevent double prefixing
    if (formattedNumber.startsWith('256')) {
      formattedNumber = formattedNumber.substring(3);
    }
    
    // Now add the prefix based on the remaining number
    if (formattedNumber.startsWith('0')) {
      // Convert 07XXXXXXXX to 2567XXXXXXXX
      formattedNumber = '256' + formattedNumber.substring(1);
    } else if (formattedNumber.startsWith('7') && formattedNumber.length === 9) {
      // Convert 7XXXXXXXX to 2567XXXXXXXX
      formattedNumber = '256' + formattedNumber;
    } else if (formattedNumber.length === 10) {
      // Add country code if has 10 digits
      formattedNumber = '256' + formattedNumber;
    }
    
    // Get credentials from environment variables (matching frontend names)
    const EGOSMS_USERNAME = process.env.NEXT_PUBLIC_EGOSMS_USERNAME || '';
    const EGOSMS_PASSWORD = process.env.NEXT_PUBLIC_EGOSMS_PASSWORD || '';
    const EGOSMS_SENDER = process.env.NEXT_PUBLIC_EGOSMS_SENDER || 'AutoSpares';
    const USE_SANDBOX = process.env.NEXT_PUBLIC_EGOSMS_SANDBOX === 'true';

    if (!EGOSMS_USERNAME || !EGOSMS_PASSWORD) {
      console.error('EgoSMS credentials are not properly configured in environment variables.');
      console.log('Current env:', {
        username: EGOSMS_USERNAME ? '***' : 'MISSING',
        password: EGOSMS_PASSWORD ? '***' : 'MISSING',
        sender: EGOSMS_SENDER,
        useSandbox: USE_SANDBOX
      });
      
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'SMS service configuration error. Required environment variables are missing.' 
        },
        { status: 500 }
      );
    }
    
    // Use sandbox URL if in development
    const baseUrl = USE_SANDBOX 
      ? 'http://sandbox.egosms.co/api/v1/plain/'
      : 'https://www.egosms.co/api/v1/plain/';
      
    // Build URL with parameters
    const url = new URL(baseUrl);
    
    // Add parameters with proper encoding
    const params = new URLSearchParams({
      username: EGOSMS_USERNAME,
      password: EGOSMS_PASSWORD,
      number: formattedNumber,
      message: message,
      sender: EGOSMS_SENDER,
      priority: '0'
    });

    // Log the request parameters (excluding password)
    console.log('SMS Request Parameters:', {
      username: EGOSMS_USERNAME,
      number: formattedNumber,
      message: message.substring(0, 50) + (message.length > 50 ? '...' : ''), // Truncate long messages
      sender: EGOSMS_SENDER,
      priority: '0',
      url: url.toString()
    });

    // Make the request to EgoSMS
    const requestUrl = `${url.toString()}?${params.toString()}`;
    console.log('Sending request to:', requestUrl.replace(/password=[^&]*/, 'password=***'));
    
    let response: Response;
    let text: string;
    
    try {
      response = await fetch(requestUrl);
      text = await response.text();
      console.log('EgoSMS Response Status:', response.status);
      console.log('EgoSMS Response Headers:', Object.fromEntries(response.headers.entries()));
      console.log('EgoSMS Response Body:', text);
    } catch (error) {
      console.error('Failed to send SMS request:', error);
      return NextResponse.json({
        status: 'error',
        message: 'Failed to connect to SMS service',
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
    
    // The response will be 'OK' for success or an error message
    if (text && text.trim().toUpperCase() === 'OK') {
      return NextResponse.json({
        status: 'success',
        message: 'Message sent successfully'
      });
    } else {
      return NextResponse.json({
        status: 'error',
        message: `EgoSMS Error: ${text}`
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in SMS API:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to process SMS request',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 