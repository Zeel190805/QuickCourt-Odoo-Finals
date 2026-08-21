import { NextRequest, NextResponse } from "next/server"
import { dbConnect, TimeSlot } from "@/lib/db"
import { isValidObjectId, jsonError, requireAuth, requireVenueAccess } from "@/lib/api"

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req, ["owner", "admin"])
    if (!auth.user) return auth.response
    if (!isValidObjectId(params.id)) return jsonError("Invalid timeslot id", 400)
    await dbConnect()
    const slot = await TimeSlot.findById(params.id)
    if (!slot) return jsonError("TimeSlot not found", 404)
    const access = await requireVenueAccess(String(slot.venue), auth.user)
    if (!access.ok) return access.response
    const data = await req.json()
    const updates: Record<string, unknown> = {}
    if (data.price !== undefined) {
      const price = Number(data.price)
      if (Number.isNaN(price) || price <= 0) return jsonError("Invalid price", 400)
      updates.price = price
    }
    if (typeof data.isAvailable === "boolean") updates.isAvailable = data.isAvailable
    const updated = await TimeSlot.findByIdAndUpdate(params.id, { $set: updates }, { new: true, runValidators: true })
    return NextResponse.json(updated)
  } catch {
    return jsonError("Failed to update timeslot", 500)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req, ["owner", "admin"])
    if (!auth.user) return auth.response
    if (!isValidObjectId(params.id)) return jsonError("Invalid timeslot id", 400)
    await dbConnect()
    const slot = await TimeSlot.findById(params.id)
    if (!slot) return jsonError("TimeSlot not found", 404)
    const access = await requireVenueAccess(String(slot.venue), auth.user)
    if (!access.ok) return access.response
    await TimeSlot.findByIdAndDelete(params.id)
    return NextResponse.json({ message: "TimeSlot deleted" })
  } catch {
    return jsonError("Failed to delete timeslot", 500)
  }
}
