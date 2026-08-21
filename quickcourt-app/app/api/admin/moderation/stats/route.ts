import { NextRequest, NextResponse } from "next/server"
import { dbConnect, Report, Alert, User, Venue } from "@/lib/db"
import { jsonError, requireAuth } from "@/lib/api"

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin"])
    if (!auth.user) return auth.response
    await dbConnect()

    const [totalReports, pendingReports, resolvedReports, activeAlerts, bannedUsers, suspendedVenues, reportsByType, reportsByPriority] =
      await Promise.all([
        Report.countDocuments({}),
        Report.countDocuments({ status: "pending" }),
        Report.countDocuments({ status: "resolved" }),
        Alert.countDocuments({ isActive: true }),
        User.countDocuments({ accountStatus: "banned" }),
        Venue.countDocuments({ status: "suspended" }),
        Report.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
        Report.aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      ])

    const totalReportsCount = reportsByType.reduce((sum: number, type: { count: number }) => sum + type.count, 0) || 1

    return NextResponse.json({
      totalReports,
      pendingReports,
      resolvedReports,
      activeAlerts,
      bannedUsers,
      suspendedVenues,
      reportsByType: reportsByType.map((type: { _id: string; count: number }) => ({
        type: type._id,
        count: type.count,
        percentage: Math.round((type.count / totalReportsCount) * 100),
      })),
      reportsByPriority: reportsByPriority.map((priority: { _id: string; count: number }) => ({
        priority: priority._id,
        count: priority.count,
        percentage: Math.round((priority.count / totalReportsCount) * 100),
      })),
    })
  } catch {
    return jsonError("Failed to fetch moderation statistics", 500)
  }
}
