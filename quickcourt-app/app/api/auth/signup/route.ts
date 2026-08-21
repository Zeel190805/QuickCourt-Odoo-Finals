import { type NextRequest, NextResponse } from "next/server"
import { dbConnect, User } from "@/lib/db"
import bcrypt from "bcryptjs"
import { issueOtp } from "@/lib/otp"

const ALLOWED_ROLES = new Set(["user", "owner"])

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const userData = await request.json()
    const { name, email, password, role } = userData

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    const emailNorm = String(email).toLowerCase().trim()
    const safeRole = ALLOWED_ROLES.has(role) ? role : "user"

    const existing = await User.findOne({ email: emailNorm })
    if (existing) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    await User.create({
      name: String(name).trim(),
      email: emailNorm,
      password: hashedPassword,
      role: safeRole,
      isVerified: false,
      accountStatus: "active",
    })

    const otpResult = await issueOtp(emailNorm)
    if (!otpResult.ok) {
      return NextResponse.json(
        { message: "Account created but OTP email failed. Please request a new OTP.", email: emailNorm },
        { status: 201 }
      )
    }

    return NextResponse.json({
      message: "User created successfully. Please verify your email.",
      email: emailNorm,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
