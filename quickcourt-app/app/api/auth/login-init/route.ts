import { type NextRequest, NextResponse } from "next/server"
import { dbConnect, User } from "@/lib/db"
import { issueOtp } from "@/lib/otp"
import { sendOtpEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const { email } = await request.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const normalized = email.toLowerCase().trim()
    const user = await User.findOne({ email: normalized })

    // Default to password so we never reveal whether an email exists or its role.
    if (!user || (user.role !== "owner" && user.role !== "admin")) {
      return NextResponse.json({ method: "password" })
    }

    if (user.accountStatus === "banned" || user.accountStatus === "suspended") {
      return NextResponse.json({ error: "Account is not active" }, { status: 403 })
    }

    const code = await issueOtp(normalized)
    const sent = await sendOtpEmail(normalized, code, user.name)
    if (!sent) {
      return NextResponse.json({ error: "Failed to send verification code. Try again later." }, { status: 502 })
    }

    return NextResponse.json({ method: "otp" })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
