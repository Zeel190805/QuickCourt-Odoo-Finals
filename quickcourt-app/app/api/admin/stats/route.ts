import { NextRequest, NextResponse } from "next/server"
import { dbConnect, User, Venue, Court, Booking } from "@/lib/db"
import { jsonError, requireAuth } from "@/lib/api"
import { lastNMonths, monthRangeLocal } from "@/lib/dates"

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin"])
    if (!auth.user) return auth.response
    await dbConnect()

    const now = new Date()
    const { start: startDateStr, end: endDateStr } = monthRangeLocal(now.getFullYear(), now.getMonth())
    const months = lastNMonths(6)
    const rangeStart = new Date(months[0].year, months[0].month - 1, 1)

    const [
      totalUsers,
      totalOwners,
      totalBookings,
      totalCourts,
      pendingApprovals,
      monthlyRevenue,
      userGrowthData,
      ownerGrowthData,
      bookingActivityData,
      sportPopularityData,
      revenueData,
      recentVenues,
    ] = await Promise.all([
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "owner" }),
      Booking.countDocuments({ status: "confirmed" }),
      Court.countDocuments({ isActive: true }),
      Venue.countDocuments({ status: "pending" }),
      Booking.aggregate([
        { $match: { date: { $gte: startDateStr, $lte: endDateStr }, status: "confirmed" } },
        { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } },
      ]),
      User.aggregate([
        { $match: { role: "user", createdAt: { $gte: rangeStart } } },
        { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, users: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $match: { role: "owner", createdAt: { $gte: rangeStart } } },
        { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, owners: { $sum: 1 } } },
      ]),
      Booking.aggregate([
        { $match: { status: "confirmed", createdAt: { $gte: rangeStart } } },
        { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, bookings: { $sum: 1 } } },
      ]),
      Booking.aggregate([
        { $match: { status: "confirmed" } },
        { $lookup: { from: "courts", localField: "court", foreignField: "_id", as: "courtData" } },
        { $unwind: "$courtData" },
        { $group: { _id: "$courtData.sport", value: { $sum: 1 } } },
        { $sort: { value: -1 } },
      ]),
      Booking.aggregate([
        { $match: { status: "confirmed", createdAt: { $gte: rangeStart } } },
        { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, revenue: { $sum: "$totalAmount" } } },
      ]),
      Venue.find({ status: "pending" }).populate("owner", "name").sort({ createdAt: -1 }).limit(5),
    ])

    const findMonth = (rows: Array<{ _id: { year: number; month: number } }>, year: number, month: number) =>
      rows.find((d) => d._id.year === year && d._id.month === month)

    const userGrowth = months.map((m) => ({
      month: m.label,
      users: (findMonth(userGrowthData, m.year, m.month) as { users?: number } | undefined)?.users || 0,
      owners: (findMonth(ownerGrowthData, m.year, m.month) as { owners?: number } | undefined)?.owners || 0,
    }))

    const bookingActivity = months.map((m) => ({
      month: m.label,
      bookings: (findMonth(bookingActivityData, m.year, m.month) as { bookings?: number } | undefined)?.bookings || 0,
    }))

    const sportColors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00", "#ff0000", "#0000ff"]
    const sportPopularity = sportPopularityData.map((sport: { _id: string; value: number }, index: number) => ({
      name: sport._id,
      value: sport.value,
      color: sportColors[index % sportColors.length],
    }))

    const revenueChartData = months.map((m) => ({
      month: m.label,
      revenue: (findMonth(revenueData, m.year, m.month) as { revenue?: number } | undefined)?.revenue || 0,
    }))

    const processedRecentVenues = recentVenues.map((venue) => ({
      id: venue._id,
      name: venue.name,
      location: venue.location,
      courtCount: venue.courtCount,
      status: venue.status,
      ownerName: (venue.owner as { name?: string } | null)?.name || "Unknown",
      createdAt: venue.createdAt,
    }))

    return NextResponse.json({
      totalUsers,
      totalOwners,
      totalBookings,
      totalCourts,
      pendingApprovals,
      monthlyRevenue: monthlyRevenue[0]?.totalRevenue || 0,
      userGrowth,
      bookingActivity,
      sportPopularity,
      revenueData: revenueChartData,
      recentVenues: processedRecentVenues,
    })
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return jsonError("Failed to fetch admin statistics", 500)
  }
}
