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

    const allBookings = await Booking.find({ court: { $in: courtIds }, status: "confirmed" }).populate("court")
    const months = lastNMonths(6)
    const bookingTrends = months.map((m) => {
      const { start, end } = monthRangeLocal(m.year, m.month - 1)
      const monthBookings = allBookings.filter((booking) => booking.date >= start && booking.date <= end)
      return {
        month: m.label,
        bookings: monthBookings.length,
        earnings: monthBookings.reduce((sum, booking) => sum + booking.totalAmount, 0),
      }
    })

    const sportCounts: Record<string, number> = {}
    allBookings.forEach((booking) => {
      const sport = (booking.court as { sport?: string } | null)?.sport
      if (sport) sportCounts[sport] = (sportCounts[sport] || 0) + 1
    })

    const sportColors: Record<string, string> = {
      Badminton: "#8884d8",
      Tennis: "#82ca9d",
      Squash: "#ffc658",
      "Table Tennis": "#ff7300",
      Basketball: "#ff6b6b",
      Volleyball: "#4ecdc4",
      Football: "#45b7d1",
      Cricket: "#96ceb4",
    }

    const sportDistribution = Object.entries(sportCounts).map(([sport, count]) => ({
      name: sport,
      value: count,
      color: sportColors[sport] || "#8884d8",
    }))

    const hourCounts: Record<number, number> = {}
    for (let hour = 6; hour <= 22; hour++) hourCounts[hour] = 0
    allBookings.forEach((booking) => {
      const hour = Number.parseInt(booking.time.split(":")[0], 10)
      if (hour >= 6 && hour <= 22) hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })
    const peakHours = Object.entries(hourCounts).map(([hour, count]) => ({ hour: `${hour}:00`, bookings: count }))

    const recentBookings = await Booking.find({ court: { $in: courtIds }, status: "confirmed" })
      .populate("user", "name")
      .populate("court", "name sport")
      .populate("venue", "name")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()

    const formattedRecentBookings = recentBookings.map((booking) => ({
      id: booking._id,
      customerName: (booking.user as { name?: string } | null)?.name || booking.customerName || "Unknown",
      court: (booking.court as { name?: string } | null)?.name || booking.courtName || "Court",
      sport: (booking.court as { sport?: string } | null)?.sport || booking.sport || "",
      venue: (booking.venue as { name?: string } | null)?.name || booking.venueName || "Venue",
      date: booking.date,
      time: booking.time,
      duration: booking.duration,
      amount: booking.totalAmount,
      status: booking.status,
    }))

    return NextResponse.json({
      bookingTrends,
      sportDistribution,
      peakHours,
      recentBookings: formattedRecentBookings,
    })
  } catch (error) {
    console.error("Error fetching chart data:", error)
    return jsonError("Failed to fetch chart data", 500)
  }
}
