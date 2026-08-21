import { NextRequest, NextResponse } from "next/server"
import { dbConnect, User } from "@/lib/db"
import { jsonError, requireAuth } from "@/lib/api"

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin"])
    if (!auth.user) return auth.response
    await dbConnect()

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [totalUsers, totalOwners, totalAdmins, verifiedUsers, unverifiedUsers, newUsersThisMonth, activeUsers] =
      await Promise.all([
        User.countDocuments({ role: "user" }),
        User.countDocuments({ role: "owner" }),
        User.countDocuments({ role: "admin" }),
        User.countDocuments({ role: "user", isVerified: true }),
        User.countDocuments({ role: "user", isVerified: false }),
        User.countDocuments({ role: "user", createdAt: { $gte: startOfMonth } }),
        User.countDocuments({ lastLogin: { $gte: thirtyDaysAgo } }),
      ])

    return NextResponse.json({
      totalUsers,
      totalOwners,
      totalAdmins,
      verifiedUsers,
      unverifiedUsers,
      activeUsers,
      newUsersThisMonth,
    })
  } catch (error) {
    console.error("Error fetching user stats:", error)
    return jsonError("Failed to fetch user statistics", 500)
  }
}
