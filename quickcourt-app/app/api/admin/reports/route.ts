import { NextRequest, NextResponse } from "next/server"
import { dbConnect, User, Venue, Booking, Court } from "@/lib/db"
import { jsonError, requireAuth } from "@/lib/api"
import { lastNMonths, monthRangeLocal } from "@/lib/dates"

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin"])
    if (!auth.user) return auth.response
    await dbConnect()
    const { searchParams } = new URL(request.url)
    const parsed = Number.parseInt(searchParams.get("timeRange") || "30", 10)
    const days = [7, 30, 90, 365].includes(parsed) ? parsed : 30

    const now = new Date()
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    const previousStartDate = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000)
    const confirmed = { status: "confirmed" as const }

    const [currentRevenue, previousRevenue, currentBookings, previousBookings, currentUsers, previousUsers, allUsers] =
      await Promise.all([
        Booking.aggregate([
          { $match: { ...confirmed, createdAt: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),
        Booking.aggregate([
          { $match: { ...confirmed, createdAt: { $gte: previousStartDate, $lt: startDate } } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),
        Booking.countDocuments({ ...confirmed, createdAt: { $gte: startDate } }),
        Booking.countDocuments({ ...confirmed, createdAt: { $gte: previousStartDate, $lt: startDate } }),
        User.countDocuments({ createdAt: { $gte: startDate } }),
        User.countDocuments({ createdAt: { $gte: previousStartDate, $lt: startDate } }),
        User.countDocuments({}),
      ])

    const totalRevenue = currentRevenue[0]?.total || 0
    const previousTotalRevenue = previousRevenue[0]?.total || 0
    const revenueGrowth = previousTotalRevenue > 0 ? ((totalRevenue - previousTotalRevenue) / previousTotalRevenue) * 100 : 0
    const bookingGrowth = previousBookings > 0 ? ((currentBookings - previousBookings) / previousBookings) * 100 : 0
    const userGrowth = previousUsers > 0 ? ((currentUsers - previousUsers) / previousUsers) * 100 : 0

    const months = lastNMonths(6)
    const monthlyData = []
    for (const m of months) {
      const { start, end } = monthRangeLocal(m.year, m.month - 1)
      const monthStart = new Date(m.year, m.month - 1, 1)
      const monthEnd = new Date(m.year, m.month, 0, 23, 59, 59, 999)
      const [monthRevenue, monthBookings, monthUsers, monthOwners] = await Promise.all([
        Booking.aggregate([
          { $match: { ...confirmed, date: { $gte: start, $lte: end } } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),
        Booking.countDocuments({ ...confirmed, date: { $gte: start, $lte: end } }),
        User.countDocuments({ createdAt: { $gte: monthStart, $lte: monthEnd } }),
        User.countDocuments({ role: "owner", createdAt: { $gte: monthStart, $lte: monthEnd } }),
      ])
      monthlyData.push({
        month: m.label,
        revenue: monthRevenue[0]?.total || 0,
        bookings: monthBookings,
        users: monthUsers,
        owners: monthOwners,
      })
    }

    const sportData = await Court.aggregate([{ $group: { _id: "$sport", count: { $sum: 1 } } }, { $sort: { count: -1 } }])
    const totalCourts = sportData.reduce((sum, sport) => sum + sport.count, 0) || 1
    const sportPopularity = sportData.map((sport, index) => ({
      sport: sport._id,
      count: sport.count,
      percentage: Math.round((sport.count / totalCourts) * 100),
      color: ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#ff0000"][index % 5],
    }))

    const venuePerformance = await Venue.aggregate([
      {
        $lookup: {
          from: "bookings",
          let: { venueId: "$_id" },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ["$venue", "$$venueId"] }, { $eq: ["$status", "confirmed"] }] } } },
          ],
          as: "bookings",
        },
      },
      { $lookup: { from: "users", localField: "owner", foreignField: "_id", as: "owner" } },
      {
        $project: {
          name: 1,
          location: 1,
          totalBookings: { $size: "$bookings" },
          totalRevenue: { $sum: "$bookings.totalAmount" },
          averageRating: { $ifNull: ["$rating", 0] },
          ownerName: { $arrayElemAt: ["$owner.name", 0] },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
    ])

    const recentBookings = await Booking.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("venue", "name")
      .populate("court", "name")
      .populate("user", "name")

    const userRoles = await User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }])
    const totalUsers = userRoles.reduce((sum, role) => sum + role.count, 0) || 1
    const userRoleData = userRoles.map((role, index) => ({
      role: role._id,
      count: role.count,
      percentage: Math.round((role.count / totalUsers) * 100),
      color: ["#8884d8", "#82ca9d", "#ffc658"][index % 3],
    }))

    const venueStatus = await Venue.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
    const totalVenues = venueStatus.reduce((sum, status) => sum + status.count, 0)
    const venueStatusData = venueStatus.map((status, index) => ({
      status: status._id,
      count: status.count,
      percentage: totalVenues ? Math.round((status.count / totalVenues) * 100) : 0,
      color: ["#82ca9d", "#ffc658", "#ff7300", "#ff0000"][index % 4],
    }))

    return NextResponse.json({
      revenue: {
        total: totalRevenue,
        monthly: totalRevenue,
        growth: Math.round(revenueGrowth * 100) / 100,
        trend: monthlyData.map((d) => ({ month: d.month, revenue: d.revenue })),
      },
      bookings: {
        total: currentBookings,
        monthly: currentBookings,
        growth: Math.round(bookingGrowth * 100) / 100,
        trend: monthlyData.map((d) => ({ month: d.month, bookings: d.bookings })),
        bySport: sportPopularity,
        byVenue: venuePerformance.map((v) => ({ venue: v.name, count: v.totalBookings, revenue: v.totalRevenue })),
      },
      users: {
        total: allUsers,
        monthly: currentUsers,
        growth: Math.round(userGrowth * 100) / 100,
        trend: monthlyData.map((d) => ({ month: d.month, users: d.users, owners: d.owners })),
        byRole: userRoleData,
      },
      venues: {
        total: totalVenues,
        active: venueStatus.find((s) => s._id === "approved")?.count || 0,
        pending: venueStatus.find((s) => s._id === "pending")?.count || 0,
        byStatus: venueStatusData,
        topPerformers: venuePerformance,
      },
      topVenues: venuePerformance.map((v) => ({
        id: v._id,
        name: v.name,
        location: v.location,
        totalBookings: v.totalBookings,
        totalRevenue: v.totalRevenue,
        averageRating: v.averageRating,
        ownerName: v.ownerName,
      })),
      recentBookings: recentBookings.map((b) => ({
        id: b._id,
        venueName: (b.venue as { name?: string } | null)?.name,
        courtName: (b.court as { name?: string } | null)?.name,
        userName: (b.user as { name?: string } | null)?.name,
        date: b.date,
        time: b.time,
        amount: b.totalAmount,
        status: b.status,
      })),
    })
  } catch (error) {
    console.error("Error fetching reports:", error)
    return jsonError("Failed to fetch reports", 500)
  }
}
