import { type NextRequest, NextResponse } from "next/server"
import { dbConnect, User } from "@/lib/db"
import { jsonError, requireAuth } from "@/lib/api"
import { toPublicUser } from "@/lib/auth"

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (!auth.user) return auth.response
    await dbConnect()
    const body = await request.json()
    const profileData = body.profileData || body

    const name = typeof profileData.name === "string" ? profileData.name.trim() : ""
    if (!name) {
      return jsonError("Name is required", 400)
    }

    const updates: Record<string, unknown> = { name }
    if (typeof profileData.phone === "string") updates.phone = profileData.phone.trim()
    if (typeof profileData.location === "string") updates.location = profileData.location.trim()
    if (typeof profileData.bio === "string") updates.bio = profileData.bio.trim()
    if (profileData.preferences) {
      if (typeof profileData.preferences.emailNotifications === "boolean") {
        updates["preferences.emailNotifications"] = profileData.preferences.emailNotifications
      }
      if (typeof profileData.preferences.smsNotifications === "boolean") {
        updates["preferences.smsNotifications"] = profileData.preferences.smsNotifications
      }
      if (["public", "friends", "private"].includes(profileData.preferences.privacyLevel)) {
        updates["preferences.privacyLevel"] = profileData.preferences.privacyLevel
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      auth.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    )

    if (!updatedUser) {
      return jsonError("User not found", 404)
    }

    return NextResponse.json({
      message: "Profile updated successfully",
      user: toPublicUser(updatedUser),
    })
  } catch {
    return jsonError("Failed to update profile", 500)
  }
}
