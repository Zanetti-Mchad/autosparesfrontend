import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendEmail({ to, subject, text, html }: EmailOptions) {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html: html || text,
    });

    console.log('Message sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
}

export async function sendOtpEmail(email: string, otp: string) {
  const subject = 'Your Password Reset OTP';
  const text = `Your password reset OTP is: ${otp}. This code expires in 10 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset Request</h2>
      <p>Your password reset OTP is: <strong>${otp}</strong></p>
      <p>This code expires in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <hr>
      <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject,
    text,
    html,
  });
}

// Test function (for development only)
export async function testEmail() {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Test email can only be sent in development mode');
    return;
  }

  const testEmail = process.env.EMAIL_USER;
  if (!testEmail) {
    throw new Error('No test email configured');
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log('Sending test OTP email to:', testEmail);
  
  return sendOtpEmail(testEmail, otp);
}
