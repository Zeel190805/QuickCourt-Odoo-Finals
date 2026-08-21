import { NextRequest, NextResponse } from "next/server"
import { dbConnect, Alert } from "@/lib/db"
import { isValidObjectId, jsonError, requireAuth } from "@/lib/api"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request, ["admin"])
    if (!auth.user) return auth.response
    if (!isValidObjectId(params.id)) return jsonError("Invalid alert id", 400)
    await dbConnect()
    const { isActive } = await request.json()
    if (typeof isActive !== "boolean") return jsonError("isActive must be a boolean", 400)
    const updatedAlert = await Alert.findByIdAndUpdate(params.id, { isActive }, { new: true, runValidators: true })
    if (!updatedAlert) return jsonError("Alert not found", 404)
    return NextResponse.json({ alert: updatedAlert })
  } catch {
    return jsonError("Failed to toggle alert", 500)
  }
}
