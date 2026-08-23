import { type NextRequest, NextResponse } from "next/server"
import { dbConnect, User } from "@/lib/db"
import bcrypt from "bcryptjs"

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
    const created = await User.create({
      name: String(name).trim(),
      email: emailNorm,
      password: hashedPassword,
      role: safeRole,
      isVerified: true,
      accountStatus: "active",
    })

    return NextResponse.json({
      message: "Account created successfully. You can now sign in.",
      email: created.email,
      id: String(created._id),
      role: created.role,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
