import { type NextRequest, NextResponse } from "next/server"
import { dbConnect, User } from "@/lib/db"
import bcrypt from "bcryptjs"
import { setAuthCookie, signAuthToken, toPublicUser } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() })
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    if (user.accountStatus === "banned" || user.accountStatus === "suspended") {
      return NextResponse.json({ error: "Account is not active" }, { status: 403 })
    }

    user.lastLogin = new Date()
    await user.save()

    const token = await signAuthToken({
      id: String(user._id),
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus || "active",
    })

    const response = NextResponse.json({
      user: toPublicUser(user),
    })
    setAuthCookie(response, token)
    return response
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
