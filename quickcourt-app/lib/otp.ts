import bcrypt from "bcryptjs"
import { OTP, User } from "@/lib/db"
import { sendOTPEmail } from "@/lib/email"

export async function issueOtp(email: string): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const emailNorm = email.toLowerCase().trim()
  const user = await User.findOne({ email: emailNorm })
  if (!user) {
    return { ok: false, status: 404, error: "No account found for this email" }
  }

  const existingOTP = await OTP.findOne({
    email: emailNorm,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 })

  if (existingOTP) {
    const timeSinceLastOTP = Date.now() - existingOTP.createdAt.getTime()
    if (timeSinceLastOTP < 60000) {
      const remainingTime = Math.ceil((60000 - timeSinceLastOTP) / 1000)
      return { ok: false, status: 429, error: `Please wait ${remainingTime} seconds before requesting another OTP` }
    }
  }

  await OTP.updateMany({ email: emailNorm, isUsed: false }, { $set: { isUsed: true } })

  const otp = String(Math.floor(100000 + Math.random() * 900000))
  const hashedOTP = await bcrypt.hash(otp, 10)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

  await OTP.create({
    email: emailNorm,
    otp: hashedOTP,
    expiresAt,
    isUsed: false,
    attempts: 0,
  })

  const emailSent = await sendOTPEmail(emailNorm, otp)
  if (!emailSent) {
    return { ok: false, status: 500, error: "Failed to send OTP email. Please try again." }
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`OTP for ${emailNorm}: ${otp}`)
  }

  return { ok: true }
}
