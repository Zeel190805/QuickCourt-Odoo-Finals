import { NextRequest, NextResponse } from "next/server"
import { dbConnect, Alert } from "@/lib/db"
import { isValidObjectId, jsonError, requireAuth } from "@/lib/api"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request, ["admin"])
    if (!auth.user) return auth.response
    if (!isValidObjectId(params.id)) return jsonError("Invalid alert id", 400)
    await dbConnect()
    const alert = await Alert.findByIdAndDelete(params.id)
    if (!alert) return jsonError("Alert not found", 404)
    return NextResponse.json({ message: "Alert deleted successfully" })
  } catch {
    return jsonError("Failed to delete alert", 500)
  }
}
