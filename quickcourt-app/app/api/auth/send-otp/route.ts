import { type NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/db"
import { issueOtp } from "@/lib/otp"

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const result = await issueOtp(String(email).toLowerCase().trim())
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      message: "OTP sent successfully",
      email: String(email).toLowerCase().trim(),
    })
  } catch (error) {
    console.error("Error sending OTP:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
