import { NextRequest, NextResponse } from "next/server"
import { dbConnect, User, Booking, Venue } from "@/lib/db"
import { deleteVenueCascade, isValidObjectId, jsonError, requireAuth } from "@/lib/api"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request, ["admin"])
    if (!auth.user) return auth.response
    if (!isValidObjectId(params.id)) return jsonError("Invalid user id", 400)
    await dbConnect()
    const body = await request.json()
    const { name, email, role, isVerified, accountStatus } = body

    if (!name || !email || !role) {
      return jsonError("Missing required fields", 400)
    }
    if (!["user", "owner", "admin"].includes(role)) {
      return jsonError("Invalid role", 400)
    }
    if (accountStatus && !["active", "suspended", "banned"].includes(accountStatus)) {
      return jsonError("Invalid account status", 400)
    }

    const target = await User.findById(params.id)
    if (!target) return jsonError("User not found", 404)

    if (target.role === "admin" && role !== "admin") {
      const adminCount = await User.countDocuments({ role: "admin" })
      if (adminCount <= 1) {
        return jsonError("Cannot demote the last admin user", 400)
      }
    }

    const existingUser = await User.findOne({ email: String(email).toLowerCase().trim(), _id: { $ne: params.id } })
    if (existingUser) {
      return jsonError("Email already exists", 400)
    }

    const updatedUser = await User.findByIdAndUpdate(
      params.id,
      {
        name: String(name).trim(),
        email: String(email).toLowerCase().trim(),
        role,
        isVerified: Boolean(isVerified),
        ...(accountStatus ? { accountStatus } : {}),
      },
      { new: true, runValidators: true }
    ).select("-password")

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error("Error updating user:", error)
    return jsonError("Failed to update user", 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request, ["admin"])
    if (!auth.user) return auth.response
    if (!isValidObjectId(params.id)) return jsonError("Invalid user id", 400)
    if (params.id === auth.user.id) {
      return jsonError("You cannot delete your own account", 400)
    }
    await dbConnect()
    const user = await User.findById(params.id)
    if (!user) return jsonError("User not found", 404)

    if (user.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" })
      if (adminCount <= 1) {
        return jsonError("Cannot delete the last admin user", 400)
      }
    }

    await Booking.updateMany({ user: params.id, status: "confirmed" }, { $set: { status: "cancelled" } })
    if (user.role === "owner") {
      const venues = await Venue.find({ owner: params.id })
      for (const venue of venues) {
        await deleteVenueCascade(String(venue._id))
      }
    }
    await User.findByIdAndDelete(params.id)
    return NextResponse.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Error deleting user:", error)
    return jsonError("Failed to delete user", 500)
  }
}
