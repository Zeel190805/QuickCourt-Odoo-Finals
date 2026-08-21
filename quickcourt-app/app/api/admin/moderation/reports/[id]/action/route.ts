import { NextRequest, NextResponse } from "next/server"
import { dbConnect, Report, User, Venue } from "@/lib/db"
import { isValidObjectId, jsonError, requireAuth } from "@/lib/api"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request, ["admin"])
    if (!auth.user) return auth.response
    if (!isValidObjectId(params.id)) return jsonError("Invalid report id", 400)
    await dbConnect()
    const body = await request.json()
    const { action, moderatorNotes } = body
    const allowed = ["warn", "suspend", "ban", "remove_content", "dismiss", "none"]
    if (!allowed.includes(action)) return jsonError("Invalid action", 400)

    const report = await Report.findById(params.id)
    if (!report) return jsonError("Report not found", 404)

    const targetId = report.reportedItem?._id
    const targetType = report.reportedItem?.type || report.type
    let status = "resolved"

    if (action === "dismiss") {
      status = "dismissed"
    } else if (targetId && isValidObjectId(String(targetId))) {
      if (targetType === "user" || report.type === "user") {
        if (action === "ban") {
          await User.findByIdAndUpdate(targetId, { accountStatus: "banned" })
        } else if (action === "suspend") {
          await User.findByIdAndUpdate(targetId, { accountStatus: "suspended" })
        }
      }
      if (targetType === "venue" || report.type === "venue") {
        if (action === "suspend" || action === "remove_content") {
          await Venue.findByIdAndUpdate(targetId, { status: "suspended" })
        }
      }
    }

    const updatedReport = await Report.findByIdAndUpdate(
      params.id,
      { action, moderatorNotes: String(moderatorNotes || ""), status },
      { new: true, runValidators: true }
    ).populate("reporter", "name email")

    return NextResponse.json({ report: updatedReport })
  } catch {
    return jsonError("Failed to update report action", 500)
  }
}
