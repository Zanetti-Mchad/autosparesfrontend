# EgoSMS Integration

This directory contains the integration with EgoSMS for sending OTP messages for password reset functionality.

## Overview

The EgoSMS integration allows the application to send OTP (One-Time Password) SMS messages to users for password reset verification. The implementation consists of:

1. A service to interact with the EgoSMS API (`sms.ts`)
2. Utilities for generating and formatting OTP codes (`otp.ts`)
3. API routes to handle the password reset flow
4. Delivery report tracking for monitoring SMS status

## Configuration

The EgoSMS credentials are configured in `src/env.ts`. You can update these values directly for development:

```ts
export const env = {
  // EgoSMS Configuration
  EGOSMS_USERNAME: "your_username", // Replace with your actual EgoSMS username
  EGOSMS_PASSWORD: "your_password", // Replace with your actual EgoSMS password
  EGOSMS_SENDER: "YourSender", // Your sender ID (max 11 characters)

  // Environment indicator
  NODE_ENV: process.env.NODE_ENV || "development",
};
```

For production, you should set these values through your hosting platform's environment variables.

## Usage

The integration is used in the password reset flow:

1. User enters their phone number
2. System generates an OTP and sends it via EgoSMS
3. User enters the OTP to verify their identity
4. Upon successful verification, user can reset their password

## API Endpoints

The following API endpoints are available:

- `/api/auth/forgot-password` - Request a password reset OTP
- `/api/auth/verify-otp` - Verify the OTP entered by the user
- `/api/auth/reset-password` - Reset the password with a valid token
- `/api/webhooks/sms-delivery` - Webhook for EgoSMS delivery reports

## SMS Delivery Tracking

The integration includes a delivery tracking system that:

1. Tracks outgoing SMS messages with unique IDs
2. Processes delivery reports from EgoSMS via webhooks
3. Updates message status (PENDING, DELIVERED, FAILED)
4. Logs delivery outcomes for debugging and monitoring

### Setting Up the Webhook in EgoSMS

To set up delivery report tracking:

1. Log into your EgoSMS account
2. Navigate to your profile settings
3. Find the DLR URL field
4. Enter your webhook URL: `https://your-domain.com/api/webhooks/sms-delivery`
5. Save your changes

The webhook will now receive JSON delivery reports in this format:

```json
{
  "MsgFollowUpUniqueCode": "ApiJsonSubmit64b8dd8aab0d05.55176607",
  "number": "+256777071434",
  "Status": "Success"
}
```

## EgoSMS API Documentation

For more information about the EgoSMS API, see the official documentation:

- Live URL: https://www.egosms.co/api/v1/plain/
- Sandbox URL: http://sandbox.egosms.co/api/v1/plain/

## Request Parameters

- `username` (Required): Your EgoSMS API username
- `password` (Required): Your EgoSMS API password
- `number` (Required): The recipient's phone number
- `message` (Required): The SMS content (max 160 characters)
- `sender` (Required): The sender ID (max 11 characters)
- `priority` (Optional): Priority level (0-4, with 0 being highest)
