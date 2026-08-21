import { NextRequest, NextResponse } from "next/server"
import { dbConnect, User, Booking } from "@/lib/db"
import { jsonError, requireAuth } from "@/lib/api"

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin"])
    if (!auth.user) return auth.response
    await dbConnect()

    const users = await User.find({}).select("-password").sort({ createdAt: -1 }).lean()
    const bookingStats = await Booking.aggregate([
      { $match: { status: "confirmed" } },
      { $group: { _id: "$user", totalBookings: { $sum: 1 }, totalSpent: { $sum: "$totalAmount" } } },
    ])
    const statsMap = new Map(bookingStats.map((s) => [String(s._id), s]))

    const usersWithStats = users.map((user) => {
      const stats = statsMap.get(String(user._id))
      return {
        ...user,
        lastLogin: user.lastLogin || null,
        totalBookings: stats?.totalBookings || 0,
        totalSpent: stats?.totalSpent || 0,
      }
    })

    return NextResponse.json({ users: usersWithStats })
  } catch (error) {
    console.error("Error fetching users:", error)
    return jsonError("Failed to fetch users", 500)
  }
}
