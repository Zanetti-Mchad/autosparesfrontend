import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';
import { cookies } from 'next/headers';

/**
 * API handler for resetting a password
 * Validates the reset token and sets the new password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    // Password validation
    if (newPassword.length < 4) {
      return NextResponse.json(
        { 
          status: {
            returnCode: "04",
            returnMessage: "Password must be at least 4 characters long" 
          }
        },
        { status: 400 }
      );
    }

    // Verify the token from cookies
    const storedToken = cookies().get('resetToken');
    const userId = cookies().get('resetUserId');
    
    if (!storedToken || storedToken.value !== token) {
      return NextResponse.json(
        { 
          status: {
            returnCode: "08",
            returnMessage: "Invalid or expired reset token" 
          }
        },
        { status: 400 }
      );
    }
    
    // At this point, the token is valid. Reset the password.
    try {
      // Only make the actual backend password reset call if we have a userId
      if (userId && userId.value) {
        const resetResponse = await resetPasswordWithBackend(userId.value, newPassword);
        
        if (!resetResponse.success) {
          return NextResponse.json(
            { 
              status: {
                returnCode: "08",
                returnMessage: resetResponse.message || "Failed to reset password" 
              }
            },
            { status: 400 }
          );
        }
      }
      
      // Clear the reset cookies
      cookies().delete('resetToken');
      cookies().delete('resetUserId');
      cookies().delete('otpData');
      
      // Password reset was successful
      return NextResponse.json({
        status: {
          returnCode: "00",
          returnMessage: "Password has been reset successfully"
        }
      });
    } catch (resetError) {
      console.error('Error resetting password:', resetError);
      return NextResponse.json(
        { 
          status: {
            returnCode: "09",
            returnMessage: "Error resetting password"
          },
          error: resetError instanceof Error ? resetError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Password reset error:', error);
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

/**
 * Reset the password with your backend
 */
async function resetPasswordWithBackend(userId: string, newPassword: string): Promise<{success: boolean, message?: string}> {
  try {
    // Call your backend API to reset the password
    const response = await fetch(`${env.BACKEND_API_URL}/api/v1/auth/update-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        newPassword
      }),
    });

    const data = await response.json();
    console.log('Password reset response from backend:', data);
    
    if (!response.ok || data.status?.returnCode !== "00") {
      return {
        success: false,
        message: data.message || data.status?.returnMessage || 'Failed to reset password'
      };
    }
    
    return {
      success: true,
      message: 'Password reset successful'
    };
  } catch (error) {
    console.error('Error resetting password with backend:', error);
    throw error;
  }
} 