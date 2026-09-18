import nodemailer from "nodemailer"
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

async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const transporter = getTransporter()
    await transporter.sendMail({
      from: `"CourtX" <${process.env.GMAIL_USER}>`,
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

export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  const safeName = escapeHtml(name)
  const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>Welcome to CourtX</title>
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
                  <h1>Welcome to CourtX!</h1>
              </div>
              <div class="content">
                  <h2>Hello ${safeName}!</h2>
                  <p>Your account is ready. Welcome to CourtX.</p>
                  <p>You can now browse venues, book courts, and manage your reservations.</p>
                  <p><a href="${appUrl()}">Open CourtX</a></p>
                  <p>Best regards,<br>The CourtX Team</p>
              </div>
          </div>
      </body>
      </html>
    `
  return sendMail(email, "Welcome to CourtX", html)
}

export async function sendOtpEmail(email: string, code: string, name?: string): Promise<boolean> {
  const safeName = escapeHtml(name || "there")
  const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>Your CourtX login code</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4f46e5; color: white; padding: 24px; text-align: center; border-radius: 10px; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 10px; margin-top: 20px; text-align: center; }
              .code { font-size: 34px; letter-spacing: 8px; font-weight: bold; color: #4f46e5; margin: 16px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>CourtX Verification</h1>
              </div>
              <div class="content">
                  <p>Hi ${safeName},</p>
                  <p>Use the code below to sign in to your admin/owner account.</p>
                  <div class="code">${escapeHtml(code)}</div>
                  <p>This code expires in 5 minutes. If you didn't request it, you can ignore this email.</p>
              </div>
          </div>
      </body>
      </html>
    `
  return sendMail(email, "Your CourtX login code", html)
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
  return sendMail(data.customerEmail, "CourtX booking confirmed", html)
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
  return sendMail(data.customerEmail, "CourtX booking cancelled", html)
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
  return sendMail(data.customerEmail, "CourtX booking reminder", html)
}

export const emailService = {
  sendBookingConfirmation,
  sendBookingCancellation,
  sendBookingReminder,
}

export default emailService
