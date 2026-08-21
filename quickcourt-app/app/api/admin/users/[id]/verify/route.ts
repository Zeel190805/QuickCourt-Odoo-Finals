import { NextRequest, NextResponse } from "next/server"
import { dbConnect, User } from "@/lib/db"
import { isValidObjectId, jsonError, requireAuth } from "@/lib/api"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request, ["admin"])
    if (!auth.user) return auth.response
    if (!isValidObjectId(params.id)) return jsonError("Invalid user id", 400)
    await dbConnect()
    const body = await request.json()
    const { isVerified } = body
    if (typeof isVerified !== "boolean") {
      return jsonError("isVerified must be a boolean", 400)
    }
    const updatedUser = await User.findByIdAndUpdate(params.id, { isVerified }, { new: true, runValidators: true }).select("-password")
    if (!updatedUser) return jsonError("User not found", 404)
    return NextResponse.json({ user: updatedUser })
  } catch {
    return jsonError("Failed to update user verification", 500)
  }
}
