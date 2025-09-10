import { NextResponse } from 'next/server';
import { sendOtpEmail } from '@/lib/emailService';
import { sendSMS } from '@/lib/smsService';
import { env } from '@/env';

export async function POST(request: Request) {
  try {
    console.log('Received OTP request');
    
    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    const { email, phone, type } = body;

    // Validate request
    if (!type || (type !== 'email' && type !== 'phone')) {
      const error = 'Invalid OTP type. Must be "email" or "phone"';
      console.error('Validation error:', error);
      return NextResponse.json(
        { status: 'error', message: error },
        { status: 400 }
      );
    }

    // Additional validation based on type
    if (type === 'email') {
      if (!email) {
        const error = 'Email is required for email OTP';
        console.error('Validation error:', error);
        return NextResponse.json(
          { status: 'error', message: error },
          { status: 400 }
        );
      }
      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        const error = 'Please enter a valid email address';
        console.error('Validation error:', error);
        return NextResponse.json(
          { status: 'error', message: error },
          { status: 400 }
        );
      }
    } else { // type === 'phone'
      if (!phone) {
        const error = 'Phone number is required for phone OTP';
        console.error('Validation error:', error);
        return NextResponse.json(
          { status: 'error', message: error },
          { status: 400 }
        );
      }
      
      // Phone number validation (expects 12 digits with 256 prefix)
      const phoneRegex = /^256\d{9}$/;
      if (!phoneRegex.test(phone)) {
        const error = 'Please enter a valid phone number starting with 256 (e.g., 2567XXXXXXXX)';
        console.error('Validation error:', error);
        return NextResponse.json(
          { status: 'error', message: error },
          { status: 400 }
        );
      }
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`Generated OTP for ${type}:`, otp);
    
    if (type === 'email') {
      console.log('Sending email to:', email);
      if (!email) {
        throw new Error('Email is required for email OTP');
      }
      await sendOtpEmail(email, otp);
      console.log('Email sent successfully');
    } else {
      console.log('Sending SMS to:', phone);
      if (!phone) {
        throw new Error('Phone number is required for SMS OTP');
      }
      const message = `Your verification code is: ${otp}. This code expires in 10 minutes.`;
      
      // Log the SMS sending attempt
      console.log('SMS sending configuration:', {
        phoneNumber: phone,
        messageLength: message.length,
        useSandbox: env.NODE_ENV !== 'production'
      });

      await sendSMS({
        phoneNumber: phone,
        message: message,
        useSandbox: env.NODE_ENV !== 'production'
      });
      console.log('SMS sent successfully');
    }

    // In a production app, you would store the OTP in a database with an expiration time
    // For now, we'll just return it in the response for testing
    return NextResponse.json({
      status: 'success',
      message: 'OTP sent successfully',
      otp: process.env.NODE_ENV === 'development' ? otp : undefined // Only return OTP in development
    });
  } catch (error) {
    console.error('Error in OTP route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Failed to send OTP',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
