import { type NextRequest, NextResponse } from "next/server"
import { dbConnect, User } from "@/lib/db"
import { getSessionFromRequest, toPublicUser } from "@/lib/auth"
import { jsonError } from "@/lib/api"

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return jsonError("Unauthorized", 401)
    }
    await dbConnect()
    const user = await User.findById(session.id)
    if (!user) {
      return jsonError("Unauthorized", 401)
    }
    if (user.accountStatus !== "active") {
      return jsonError("Account is not active", 403)
    }
    return NextResponse.json({ user: toPublicUser(user) })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
