import nodemailer from "nodemailer"
import handlebars from "handlebars"
import { escapeHtml, appUrl } from "@/lib/utils"

export interface BookingEmailData {
  customerName: string
  customerEmail: string
  bookingId: string
  venueName: string
  venueLocation: string
  venueAddress?: string
  venuePhone?: string
  courtName: string
  sport: string
  bookingDate: string
  bookingTime: string
  duration: number
  totalAmount: number
  bookingUrl: string
  venueUrl: string
}

export interface CancellationEmailData {
  customerName: string
  customerEmail: string
  bookingId: string
  venueName: string
  venueLocation: string
  courtName: string
  sport: string
  bookingDate: string
  bookingTime: string
  duration: number
  totalAmount: number
  refundAmount: number
  cancellationId: string
  venuesUrl: string
  bookingsUrl: string
}

export interface ReminderEmailData {
  customerName: string
  customerEmail: string
  bookingId: string
  venueName: string
  venueLocation: string
  courtName: string
  sport: string
  bookingDate: string
  bookingTime: string
  duration: number
  totalAmount: number
  bookingUrl: string
  venueUrl: string
  cancelUrl?: string
}

function getTransporter() {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) {
    throw new Error("Email credentials are not configured")
  }
  return nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user, pass },
  })
}

const otpEmailTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QuickCourt - OTP Verification</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4f46e5; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .otp-box { background: white; border: 2px dashed #4f46e5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
        .otp-code { font-size: 32px; font-weight: bold; color: #4f46e5; letter-spacing: 5px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>QuickCourt</h1>
            <p>OTP Verification</p>
        </div>
        <div class="content">
            <h2>Hello!</h2>
            <p>You have requested to verify your email address for QuickCourt. Please use the following OTP to complete your verification:</p>
            <div class="otp-box">
                <div class="otp-code">{{otp}}</div>
            </div>
            <div class="warning">
                <strong>Important:</strong>
                <ul>
                    <li>This OTP will expire in 5 minutes</li>
                    <li>Do not share this OTP with anyone</li>
                    <li>If you didn't request this, please ignore this email</li>
                </ul>
            </div>
            <p>Best regards,<br>The QuickCourt Team</p>
        </div>
        <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
        </div>
    </div>
</body>
</html>
`

const compiledOtpTemplate = handlebars.compile(otpEmailTemplate)

async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const transporter = getTransporter()
    await transporter.sendMail({
      from: `"QuickCourt" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    })
    return true
  } catch (error) {
    console.error("Email send failed:", error)
    return false
  }
}

export async function sendOTPEmail(email: string, otp: string): Promise<boolean> {
  return sendMail(email, "QuickCourt - OTP Verification Code", compiledOtpTemplate({ otp }))
}

export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  const safeName = escapeHtml(name)
  const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>Welcome to QuickCourt</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4f46e5; color: white; padding: 30px; text-align: center; border-radius: 10px; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 10px; margin-top: 20px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>Welcome to QuickCourt!</h1>
              </div>
              <div class="content">
                  <h2>Hello ${safeName}!</h2>
                  <p>Your email has been successfully verified. Welcome to QuickCourt.</p>
                  <p>You can now browse venues, book courts, and manage your reservations.</p>
                  <p><a href="${appUrl()}">Open QuickCourt</a></p>
                  <p>Best regards,<br>The QuickCourt Team</p>
              </div>
          </div>
      </body>
      </html>
    `
  return sendMail(email, "Welcome to QuickCourt - Email Verified!", html)
}

async function sendBookingConfirmation(data: BookingEmailData): Promise<boolean> {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h1>Booking confirmed</h1>
      <p>Hi ${escapeHtml(data.customerName)},</p>
      <p>Your booking <strong>${escapeHtml(data.bookingId)}</strong> is confirmed.</p>
      <ul>
        <li>Venue: ${escapeHtml(data.venueName)} (${escapeHtml(data.venueLocation)})</li>
        <li>Court: ${escapeHtml(data.courtName)} · ${escapeHtml(data.sport)}</li>
        <li>Date: ${escapeHtml(data.bookingDate)} at ${escapeHtml(data.bookingTime)}</li>
        <li>Duration: ${data.duration} hour(s)</li>
        <li>Amount: ₹${Number(data.totalAmount).toFixed(0)}</li>
      </ul>
      <p><a href="${data.bookingUrl}">View your bookings</a></p>
    </div>
  `
  return sendMail(data.customerEmail, "QuickCourt booking confirmed", html)
}

async function sendBookingCancellation(data: CancellationEmailData): Promise<boolean> {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h1>Booking cancelled</h1>
      <p>Hi ${escapeHtml(data.customerName)},</p>
      <p>Booking <strong>${escapeHtml(data.bookingId)}</strong> has been cancelled.</p>
      <ul>
        <li>Venue: ${escapeHtml(data.venueName)}</li>
        <li>Court: ${escapeHtml(data.courtName)}</li>
        <li>Date: ${escapeHtml(data.bookingDate)} at ${escapeHtml(data.bookingTime)}</li>
        <li>Refund: ₹${Number(data.refundAmount).toFixed(0)}</li>
      </ul>
      <p><a href="${data.bookingsUrl}">View bookings</a></p>
    </div>
  `
  return sendMail(data.customerEmail, "QuickCourt booking cancelled", html)
}

async function sendBookingReminder(data: ReminderEmailData): Promise<boolean> {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h1>Upcoming booking reminder</h1>
      <p>Hi ${escapeHtml(data.customerName)},</p>
      <p>This is a reminder for booking <strong>${escapeHtml(data.bookingId)}</strong>.</p>
      <ul>
        <li>Venue: ${escapeHtml(data.venueName)}</li>
        <li>Court: ${escapeHtml(data.courtName)}</li>
        <li>Date: ${escapeHtml(data.bookingDate)} at ${escapeHtml(data.bookingTime)}</li>
      </ul>
      <p><a href="${data.bookingUrl}">View booking</a></p>
    </div>
  `
  return sendMail(data.customerEmail, "QuickCourt booking reminder", html)
}

export const emailService = {
  sendBookingConfirmation,
  sendBookingCancellation,
  sendBookingReminder,
}

export default emailService
