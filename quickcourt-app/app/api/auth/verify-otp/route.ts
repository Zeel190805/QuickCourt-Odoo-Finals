import { type NextRequest, NextResponse } from "next/server"
import { dbConnect, User } from "@/lib/db"
import { verifyOtp } from "@/lib/otp"
import { setAuthCookie, signAuthToken, toPublicUser } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 })
    }

    const normalized = String(email).toLowerCase().trim()
    const user = await User.findOne({ email: normalized })
    if (!user || (user.role !== "owner" && user.role !== "admin")) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }
    if (user.accountStatus === "banned" || user.accountStatus === "suspended") {
      return NextResponse.json({ error: "Account is not active" }, { status: 403 })
    }

    const result = await verifyOtp(normalized, String(code))
    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Invalid code" }, { status: 401 })
    }

    user.lastLogin = new Date()
    await user.save()

    const token = await signAuthToken({
      id: String(user._id),
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus || "active",
    })

    const response = NextResponse.json({ user: toPublicUser(user) })
    setAuthCookie(response, token)
    return response
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
