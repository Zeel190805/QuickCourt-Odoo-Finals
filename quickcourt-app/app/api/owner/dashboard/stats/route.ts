import { NextRequest, NextResponse } from "next/server"
import { dbConnect, Booking, Court, Venue } from "@/lib/db"
import { jsonError, requireAuth } from "@/lib/api"
import { lastNMonths, monthRangeLocal } from "@/lib/dates"

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["owner", "admin"])
    if (!auth.user) return auth.response
    await dbConnect()
    const ownerId = auth.user.role === "admin" ? new URL(request.url).searchParams.get("ownerId") || auth.user.id : auth.user.id

    const venues = await Venue.find({ owner: ownerId })
    const venueIds = venues.map((venue) => venue._id)
    const courts = await Court.find({ venue: { $in: venueIds } })
    const courtIds = courts.map((court) => court._id)

    const now = new Date()
    const { start: currentMonthStart, end: currentMonthEnd } = monthRangeLocal(now.getFullYear(), now.getMonth())
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const { start: lastMonthStart, end: lastMonthEnd } = monthRangeLocal(last.getFullYear(), last.getMonth())

    const [totalBookings, activeCourts, monthlyBookings, lastMonthBookings, uniqueCustomers] = await Promise.all([
      Booking.countDocuments({ court: { $in: courtIds }, status: "confirmed" }),
      Court.countDocuments({ venue: { $in: venueIds }, isActive: true }),
      Booking.find({ court: { $in: courtIds }, date: { $gte: currentMonthStart, $lte: currentMonthEnd }, status: "confirmed" }),
      Booking.find({ court: { $in: courtIds }, date: { $gte: lastMonthStart, $lte: lastMonthEnd }, status: "confirmed" }),
      Booking.distinct("user", { court: { $in: courtIds }, status: "confirmed" }),
    ])

    const monthlyEarnings = monthlyBookings.reduce((sum, booking) => sum + booking.totalAmount, 0)
    const lastMonthEarnings = lastMonthBookings.reduce((sum, booking) => sum + booking.totalAmount, 0)
    const earningsGrowth = lastMonthEarnings > 0 ? ((monthlyEarnings - lastMonthEarnings) / lastMonthEarnings) * 100 : 0
    const thisMonthCount = monthlyBookings.length
    const lastMonthCount = lastMonthBookings.length
    const bookingGrowth = lastMonthCount > 0 ? ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100 : 0

    const firstBookings = await Booking.aggregate([
      { $match: { court: { $in: courtIds }, status: "confirmed" } },
      { $group: { _id: "$user", firstDate: { $min: "$date" } } },
      { $match: { firstDate: { $gte: currentMonthStart, $lte: currentMonthEnd } } },
    ])

    return NextResponse.json({
      totalBookings,
      activeCourts,
      monthlyEarnings,
      totalCustomers: uniqueCustomers.length,
      earningsGrowth: `${earningsGrowth.toFixed(1)}%`,
      bookingGrowth: `${bookingGrowth.toFixed(1)}%`,
      newCustomersThisMonth: firstBookings.length,
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return jsonError("Failed to fetch dashboard stats", 500)
  }
}
