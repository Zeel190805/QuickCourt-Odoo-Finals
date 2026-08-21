import { NextRequest, NextResponse } from "next/server"
import { dbConnect, Report } from "@/lib/db"
import { isValidObjectId, jsonError, requireAuth } from "@/lib/api"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request, ["admin"])
    if (!auth.user) return auth.response
    if (!isValidObjectId(params.id)) return jsonError("Invalid report id", 400)
    await dbConnect()
    const { status } = await request.json()
    if (!["pending", "investigating", "resolved", "dismissed"].includes(status)) {
      return jsonError("Invalid status", 400)
    }
    const updatedReport = await Report.findByIdAndUpdate(params.id, { status }, { new: true, runValidators: true }).populate(
      "reporter",
      "name email"
    )
    if (!updatedReport) return jsonError("Report not found", 404)
    return NextResponse.json({ report: updatedReport })
  } catch {
    return jsonError("Failed to update report status", 500)
  }
}
