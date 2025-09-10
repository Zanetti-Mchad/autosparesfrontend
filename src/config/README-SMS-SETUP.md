# EgoSMS Integration Setup

This document outlines how to set up and use the EgoSMS integration in this application.

## Environment Configuration

To use the EgoSMS service, you need to set up the following environment variables in your `.env.local` file:

```
# EgoSMS Configuration
EGOSMS_USERNAME=your_egosms_username
EGOSMS_PASSWORD=your_egosms_password
EGOSMS_SENDER=your_sender_id
```

Replace `your_egosms_username`, `your_egosms_password`, and `your_sender_id` with your actual EgoSMS account credentials.

## How to Access SMS Messaging

The SMS messaging functionality is available at:

- Admin Dashboard: `/admin/sms`

## Features

The SMS integration provides the following features:

1. **Single SMS Sending**: Send a message to a single recipient
2. **Bulk SMS Sending**: Send the same message to multiple recipients
3. **CSV Import**: Import phone numbers from a CSV or TXT file
4. **Detailed Results**: View detailed sending results and statistics

## Usage in Code

If you need to send SMS programmatically from other parts of the application, you can use the provided utilities:

```typescript
import { sendQuickSMS, sendBulkSMS } from "@/lib/smsUtils";

// Send a single SMS
const result = await sendQuickSMS(
  "+256788200915",
  "Hello, this is a test message"
);

// Send bulk SMS
const results = await sendBulkSMS(
  ["+256788200915", "+256712345678"],
  "Hello, this is a bulk test message"
);
```

## Troubleshooting

Common issues:

1. **"SMS configuration is incomplete"**: Make sure you've set all required environment variables.
2. **"Wrong UserName Or Password"**: Check your EgoSMS credentials.
3. **"Money Not Enough"**: Your EgoSMS account needs more credit.

## EgoSMS Documentation

For more information about the EgoSMS API, refer to the official documentation:

- Live URL: https://www.egosms.co/api/v1/plain/
- Sandbox URL: http://sandbox.egosms.co/api/v1/plain/
