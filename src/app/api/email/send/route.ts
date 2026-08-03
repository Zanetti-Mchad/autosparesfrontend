import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/emailService";

export async function POST(request: NextRequest) {
  try {
    const { to, subject, message, html } = await request.json();

    if (!to || !subject || !message) {
      return NextResponse.json(
        { status: "error", message: "to, subject, and message are required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(to).trim())) {
      return NextResponse.json(
        { status: "error", message: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    const result = await sendEmail({
      to: String(to).trim(),
      subject: String(subject).trim(),
      text: String(message),
      html: html || undefined,
    });

    return NextResponse.json({
      status: "success",
      message: "Email sent successfully",
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Error in email send API:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to send email",
      },
      { status: 500 }
    );
  }
}
