import { NextRequest, NextResponse } from "next/server"
import { dbConnect, Booking, User, Venue } from "@/lib/db"
import { jsonError, requireAuth } from "@/lib/api"
import { csvCell } from "@/lib/utils"

const ALLOWED_TYPES = new Set(["bookings", "users", "venues"])

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin"])
    if (!auth.user) return auth.response
    await dbConnect()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "bookings"
    if (!ALLOWED_TYPES.has(type)) {
      return jsonError("Invalid export type", 400)
    }
    const parsed = Number.parseInt(searchParams.get("timeRange") || "30", 10)
    const days = Number.isFinite(parsed) && parsed > 0 && parsed <= 365 ? parsed : 30
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const rows: string[] = []

    if (type === "bookings") {
      const bookings = await Booking.find({ createdAt: { $gte: startDate } })
        .populate("user", "name email")
        .populate("venue", "name location")
        .populate("court", "name sport")
        .lean()
        .limit(5000)
      rows.push("Booking ID,User,Venue,Court,Sport,Date,Time,Duration,Amount,Status,Created At")
      for (const booking of bookings) {
        const user = booking.user as { name?: string } | null
        const venue = booking.venue as { name?: string } | null
        const court = booking.court as { name?: string; sport?: string } | null
        rows.push(
          [
            csvCell(booking._id),
            csvCell(user?.name || "N/A"),
            csvCell(venue?.name || "N/A"),
            csvCell(court?.name || "N/A"),
            csvCell(court?.sport || "N/A"),
            csvCell(booking.date),
            csvCell(booking.time),
            csvCell(booking.duration),
            csvCell(booking.totalAmount),
            csvCell(booking.status),
            csvCell(booking.createdAt),
          ].join(",")
        )
      }
    } else if (type === "users") {
      const users = await User.find({ createdAt: { $gte: startDate } }).select("-password").lean().limit(5000)
      rows.push("User ID,Name,Email,Role,Verified,Status,Created At")
      for (const user of users) {
        rows.push(
          [
            csvCell(user._id),
            csvCell(user.name),
            csvCell(user.email),
            csvCell(user.role),
            csvCell(user.isVerified),
            csvCell(user.accountStatus || "active"),
            csvCell(user.createdAt),
          ].join(",")
        )
      }
    } else {
      const venues = await Venue.find({ createdAt: { $gte: startDate } }).populate("owner", "name email").lean().limit(5000)
      rows.push("Venue ID,Name,Location,Sports,Status,Owner,Created At")
      for (const venue of venues) {
        const owner = venue.owner as { name?: string } | null
        rows.push(
          [
            csvCell(venue._id),
            csvCell(venue.name),
            csvCell(venue.location),
            csvCell(venue.sports?.join(";") || "N/A"),
            csvCell(venue.status),
            csvCell(owner?.name || "N/A"),
            csvCell(venue.createdAt),
          ].join(",")
        )
      }
    }

    if (rows.length <= 1) {
      return jsonError("No data to export", 404)
    }

    const filename = `${type}-report-${new Date().toISOString().split("T")[0]}.csv`
    return new NextResponse(rows.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Error exporting report:", error)
    return jsonError("Failed to export report", 500)
  }
}
