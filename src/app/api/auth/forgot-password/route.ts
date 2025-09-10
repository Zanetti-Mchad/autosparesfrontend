import { generateOTP, formatPhoneNumber } from '@/lib/otp';
import { smsService } from '@/lib/sms';
import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';
import { smsStore, SmsDeliveryStatus } from '@/lib/models/SmsMessage';
import { cookies } from 'next/headers';
import { encryptData } from '@/lib/crypto';

/**
 * API handler for password reset requests
 * Validates user identity through integration API and sends OTP via EgoSMS
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier } = body;

    if (!identifier) {
      return NextResponse.json(
        { error: 'Identifier (email or phone) is required' },
        { status: 400 }
      );
    }

    // Determine if the identifier is an email or phone number
    const isEmail = identifier.includes('@');
    
    // First verify if the user exists in the database through integration API
    try {
      const formattedIdentifier = isEmail ? identifier : formatPhoneNumber(identifier);
      
      // Call the integration API to verify the user exists
      const verifyResponse = await fetch(`${env.BACKEND_API_URL}/api/v1/integration/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          [isEmail ? 'email' : 'phoneNumber']: formattedIdentifier
        }),
      });
      
      // Log the complete response for debugging
      const responseText = await verifyResponse.text();
      console.log('Raw API response:', responseText);
      
      // Parse the response as JSON
      let userData;
      try {
        userData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse API response:', parseError);
        return NextResponse.json(
          { 
            status: { 
              returnCode: "05",
              returnMessage: "Error verifying user - Invalid response format" 
            },
            error: "Invalid response from verification API"
          },
          { status: 500 }
        );
      }
      
      console.log('User verification response:', userData);
      
      // Check if user exists based on response structure
      // Adapt this logic to your API's actual response format
      const userExists = verifyResponse.ok && 
                        (userData.status?.returnCode === "00" || userData.status?.returnCode === 0) && 
                        (userData.user || userData.data?.user);
      
      if (!userExists) {
        return NextResponse.json(
          { 
            status: { 
              returnCode: "04",
              returnMessage: "User not found. Please check your information and try again." 
            }
          },
          { status: 404 }
        );
      }
      
      // Extract user ID if available
      const userId = userData.user?.id || userData.data?.user?.id || 'unknown';
      
      // For SMS OTP
      if (!isEmail) {
        // Generate a 6-digit OTP
        const otp = generateOTP(6);
        
        try {
          // The message to be sent
          const otpMessage = `Your OTP code for RichDadJrSchool password reset is: ${otp}. Valid for 2 minutes.`;
          
          // Send the OTP via SMS
          const smsResponse = await smsService.sendOTP(formattedIdentifier, otp);
          
          // Check if SMS was sent successfully
          if (smsResponse.status !== 'success') {
            throw new Error(smsResponse.message || 'Failed to send SMS');
          }
          
          // If we have a message ID, store the message in our SMS store
          if (smsResponse.messageId) {
            const reference = `OTP_${Date.now()}`;
            
            // Store the SMS in our tracking system
            const storedMessage = smsStore.createMessage({
              messageId: smsResponse.messageId,
              phoneNumber: formattedIdentifier,
              message: otpMessage,
              status: SmsDeliveryStatus.PENDING,
              reference
            });
            
            console.log('Stored SMS message:', storedMessage);
          }
          
          // Store OTP in a secure, httpOnly cookie with expiration
          const expirationTime = new Date();
          expirationTime.setMinutes(expirationTime.getMinutes() + 2); // 2 minutes expiry
          
          // Encrypt the OTP data for added security
          const otpData = {
            otp,
            phoneNumber: formattedIdentifier,
            userId,
            createdAt: Date.now(),
            expiresAt: expirationTime.getTime()
          };
          
          // Store encrypted OTP data in a secure cookie
          const encryptedData = encryptData(JSON.stringify(otpData));
          cookies().set('otpData', encryptedData, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            expires: expirationTime,
            path: '/'
          });
          
          return NextResponse.json({
            status: {
              returnCode: "00",
              returnMessage: "OTP sent successfully"
            },
            data: {
              // In production, don't send back the OTP!
              // This is just for demonstration
              otp: env.NODE_ENV === 'development' ? otp : undefined,
              messageId: smsResponse.messageId
            }
          });
        } catch (smsError) {
          console.error('SMS sending failed:', smsError);
          return NextResponse.json(
            { 
              status: { 
                returnCode: "01",
                returnMessage: "Failed to send OTP via SMS" 
              },
              error: smsError instanceof Error ? smsError.message : 'Unknown SMS error'
            },
            { status: 500 }
          );
        }
      } else {
        // Email handling would go here, but we're focusing on SMS for now
        return NextResponse.json(
          { 
            status: {
              returnCode: "02",
              returnMessage: "Email OTP not implemented yet" 
            }
          },
          { status: 501 }
        );
      }
      
    } catch (verifyError) {
      console.error('Error verifying user:', verifyError);
      return NextResponse.json(
        { 
          status: { 
            returnCode: "05",
            returnMessage: "Error verifying user information. Please try again later." 
          },
          error: verifyError instanceof Error ? verifyError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Password reset request error:', error);
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