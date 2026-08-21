import { NextRequest, NextResponse } from "next/server"
import { dbConnect, Report } from "@/lib/db"
import { jsonError, requireAuth } from "@/lib/api"

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin"])
    if (!auth.user) return auth.response
    await dbConnect()
    const reports = await Report.find({}).populate("reporter", "name email").sort({ createdAt: -1 }).lean()
    return NextResponse.json({ reports })
  } catch {
    return jsonError("Failed to fetch reports", 500)
  }
}
