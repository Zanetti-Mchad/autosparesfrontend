import { NextRequest, NextResponse } from 'next/server';
import { sendPasswordResetOTP, verifyOTP, clearOTP } from '@/lib/otpService';

// Helper function to validate phone numbers
function isValidPhoneNumber(phone: string): boolean {
  return /^\+?\d{10,15}$/.test(phone);
}

/**
 * Request a password reset OTP
 * POST /api/auth/password-reset/request
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, username } = body;

    // Validate phone number
    if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    // TODO: In a real application, verify that the phone number is associated with a user account
    // const user = await findUserByPhoneNumber(phoneNumber);
    // if (!user) {
    //   return NextResponse.json(
    //     { error: 'No account found with this phone number' },
    //     { status: 404 }
    //   );
    // }

    // Send OTP via SMS
    await sendPasswordResetOTP(phoneNumber, username);

    return NextResponse.json(
      { success: true, message: 'OTP sent successfully' }
    );
  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}

/**
 * Verify an OTP and reset password
 * PUT /api/auth/password-reset/verify
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, otpCode, newPassword } = body;

    // Validate inputs
    if (!phoneNumber || !otpCode || !newPassword) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate phone number
    if (!isValidPhoneNumber(phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Verify OTP
    const isValid = verifyOTP(phoneNumber, otpCode);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    // TODO: In a real application, update the user's password in the database
    // await updateUserPassword(phoneNumber, newPassword);

    // Clear the OTP after successful verification
    clearOTP(phoneNumber);

    return NextResponse.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
} 