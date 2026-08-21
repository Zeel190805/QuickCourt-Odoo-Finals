import { type NextRequest, NextResponse } from "next/server"
import { dbConnect, OTP, User } from "@/lib/db"
import { sendWelcomeEmail } from "@/lib/email"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const { email, otp } = await request.json()

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 })
    }

    const emailNorm = String(email).toLowerCase().trim()

    const otpRecord = await OTP.findOne({
      email: emailNorm,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 })

    if (!otpRecord) {
      return NextResponse.json({ error: "Invalid or expired OTP. Please request a new one." }, { status: 400 })
    }

    if (otpRecord.attempts >= 3) {
      otpRecord.isUsed = true
      await otpRecord.save()
      return NextResponse.json({ error: "Too many failed attempts. Please request a new OTP." }, { status: 400 })
    }

    const isOTPValid = await bcrypt.compare(String(otp), otpRecord.otp)

    if (!isOTPValid) {
      otpRecord.attempts += 1
      await otpRecord.save()
      const remainingAttempts = 3 - otpRecord.attempts
      return NextResponse.json({ error: `Invalid OTP. ${remainingAttempts} attempts remaining.` }, { status: 400 })
    }

    otpRecord.isUsed = true
    await otpRecord.save()
    await OTP.updateMany({ email: emailNorm, isUsed: false }, { $set: { isUsed: true } })

    const user = await User.findOne({ email: emailNorm })
    if (user) {
      user.isVerified = true
      await user.save()
      try {
        await sendWelcomeEmail(emailNorm, user.name)
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError)
      }
    }

    return NextResponse.json({
      message: "OTP verified successfully",
      email: emailNorm,
      isVerified: true,
    })
  } catch (error) {
    console.error("Error verifying OTP:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
