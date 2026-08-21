import { NextRequest, NextResponse } from "next/server"
import { dbConnect, User, Venue, Booking } from "@/lib/db"
import { jsonError, requireAuth } from "@/lib/api"
import { monthRangeLocal } from "@/lib/dates"

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin"])
    if (!auth.user) return auth.response
    await dbConnect()

    const now = new Date()
    const { start: startDateStr, end: endDateStr } = monthRangeLocal(now.getFullYear(), now.getMonth())
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const { start: lastMonthStartStr, end: lastMonthEndStr } = monthRangeLocal(last.getFullYear(), last.getMonth())
    const isEarlyMonth = now.getDate() < 7

    const [
      currentMonthBookings,
      lastMonthBookings,
      totalUsers,
      currentMonthRevenue,
      lastMonthRevenue,
      pendingVenues,
    ] = await Promise.all([
      Booking.countDocuments({ date: { $gte: startDateStr, $lte: endDateStr }, status: "confirmed" }),
      Booking.countDocuments({ date: { $gte: lastMonthStartStr, $lte: lastMonthEndStr }, status: "confirmed" }),
      User.countDocuments({ role: "user" }),
      Booking.aggregate([
        { $match: { date: { $gte: startDateStr, $lte: endDateStr }, status: "confirmed" } },
        { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } },
      ]),
      Booking.aggregate([
        { $match: { date: { $gte: lastMonthStartStr, $lte: lastMonthEndStr }, status: "confirmed" } },
        { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } },
      ]),
      Venue.countDocuments({ status: "pending" }),
    ])

    const currentRevenue = currentMonthRevenue[0]?.totalRevenue || 0
    const lastRevenue = lastMonthRevenue[0]?.totalRevenue || 0
    const bookingChange = lastMonthBookings > 0 ? ((currentMonthBookings - lastMonthBookings) / lastMonthBookings) * 100 : 0
    const revenueChange = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0

    const alerts: Array<{ type: string; title: string; message: string; icon: string }> = []

    if (Math.abs(bookingChange) > 20 && !isEarlyMonth) {
      alerts.push({
        type: bookingChange > 0 ? "warning" : "info",
        title: "Booking volume change",
        message: `Booking volume is ${Math.abs(bookingChange).toFixed(0)}% ${bookingChange > 0 ? "higher" : "lower"} than last month`,
        icon: "AlertCircle",
      })
    }

    if (totalUsers >= 250) {
      alerts.push({
        type: "info",
        title: "User milestone",
        message: `Platform has reached ${totalUsers}+ registered users`,
        icon: "Users",
      })
    }

    if (Math.abs(revenueChange) > 10 && !isEarlyMonth) {
      alerts.push({
        type: revenueChange > 0 ? "success" : "warning",
        title: "Revenue change",
        message: `Monthly revenue ${revenueChange > 0 ? "increased" : "decreased"} by ${Math.abs(revenueChange).toFixed(0)}% this month`,
        icon: "TrendingUp",
      })
    }

    if (pendingVenues > 0) {
      alerts.push({
        type: "warning",
        title: "Pending approvals",
        message: `${pendingVenues} venue${pendingVenues > 1 ? "s" : ""} awaiting approval`,
        icon: "AlertCircle",
      })
    }

    if (!isEarlyMonth && currentMonthBookings < 10 && lastMonthBookings > 20) {
      alerts.push({
        type: "warning",
        title: "Low activity",
        message: "Booking activity is significantly lower than last month",
        icon: "AlertCircle",
      })
    }

    if (alerts.length === 0) {
      alerts.push({
        type: "success",
        title: "System status",
        message: "All systems operating normally",
        icon: "CheckCircle",
      })
    }

    return NextResponse.json({ alerts })
  } catch (error) {
    console.error("Error fetching system alerts:", error)
    return jsonError("Failed to fetch system alerts", 500)
  }
}
