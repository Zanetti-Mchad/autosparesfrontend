import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';
import { formatPhoneNumber } from '@/lib/otp';
import { verifyOtp } from '@/lib/crypto';
import { cookies } from 'next/headers';

/**
 * API handler for OTP verification
 * Validates the provided OTP against stored values in cookies
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, otp } = body;

    if (!identifier || !otp) {
      return NextResponse.json(
        { error: 'Identifier and OTP are required' },
        { status: 400 }
      );
    }

    // Validate OTP format
    const isValidFormat = /^\d{6}$/.test(otp);
    
    if (!isValidFormat) {
      return NextResponse.json(
        { 
          status: {
            returnCode: "03",
            returnMessage: "Invalid OTP format" 
          }
        },
        { status: 400 }
      );
    }
    
    // Format the phone number consistently
    const formattedPhone = formatPhoneNumber(identifier);
    
    // Get the stored OTP data from cookies
    const otpDataCookie = cookies().get('otpData');
    
    if (!otpDataCookie || !otpDataCookie.value) {
      return NextResponse.json(
        { 
          status: {
            returnCode: "06",
            returnMessage: "No OTP found. Please request a new one."
          }
        },
        { status: 400 }
      );
    }
    
    // Verify the OTP
    const verification = verifyOtp(otpDataCookie.value, otp);
    
    if (!verification.valid) {
      return NextResponse.json(
        { 
          status: {
            returnCode: "06",
            returnMessage: verification.message || "Invalid or expired OTP"
          }
        },
        { status: 400 }
      );
    }
    
    // If we reach here, the OTP is valid
    // Generate a temporary token for the password reset form
    const resetToken = `temp-token-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    // Store the reset token in a cookie
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + 1); // 1 hour expiry
    
    cookies().set('resetToken', resetToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: expirationTime,
      path: '/'
    });
    
    // Store the user ID for the password reset
    if (verification.userId) {
      cookies().set('resetUserId', verification.userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: expirationTime,
        path: '/'
      });
    }
    
    return NextResponse.json({
      status: {
        returnCode: "00",
        returnMessage: "OTP verified successfully"
      },
      data: {
        resetToken,
        userId: verification.userId
      }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    return NextResponse.json(
      { 
        status: {
          returnCode: "99",
          returnMessage: "Server error" 
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 