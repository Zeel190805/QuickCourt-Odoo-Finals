import { NextRequest, NextResponse } from "next/server"
import { dbConnect, Booking, Court } from "@/lib/db"
import { deleteCourtCascade, isValidObjectId, jsonError, requireAuth, requireVenueAccess } from "@/lib/api"
import { localDateString } from "@/lib/dates"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!isValidObjectId(params.id)) return jsonError("Invalid court id", 400)
    await dbConnect()
    const court = await Court.findById(params.id)
    if (!court) return jsonError("Court not found", 404)
    return NextResponse.json(court)
  } catch {
    return jsonError("Failed to load court", 500)
  }
}

async function updateCourt(req: NextRequest, id: string) {
  const auth = await requireAuth(req, ["owner", "admin"])
  if (!auth.user) return auth.response
  if (!isValidObjectId(id)) return jsonError("Invalid court id", 400)
  await dbConnect()
  const court = await Court.findById(id)
  if (!court) return jsonError("Court not found", 404)
  const access = await requireVenueAccess(String(court.venue), auth.user)
  if (!access.ok) return access.response
  const data = await req.json()
  const updates: Record<string, unknown> = {}
  if (typeof data.name === "string") updates.name = data.name.trim()
  if (typeof data.sport === "string") updates.sport = data.sport.trim()
  if (data.basePricePerHour !== undefined) {
    const price = Number(data.basePricePerHour)
    if (Number.isNaN(price) || price <= 0) return jsonError("Invalid price", 400)
    updates.basePricePerHour = price
  }
  if (data.dayPrice !== undefined) {
    const price = Number(data.dayPrice)
    if (Number.isNaN(price) || price <= 0) return jsonError("Invalid day price", 400)
    updates.dayPrice = price
  }
  if (data.nightPrice !== undefined) {
    const price = Number(data.nightPrice)
    if (Number.isNaN(price) || price <= 0) return jsonError("Invalid night price", 400)
    updates.nightPrice = price
  }
  if (typeof data.isActive === "boolean") updates.isActive = data.isActive
  const updated = await Court.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true })
  return NextResponse.json(updated)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    return await updateCourt(req, params.id)
  } catch {
    return jsonError("Failed to update court", 400)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    return await updateCourt(req, params.id)
  } catch {
    return jsonError("Failed to update court", 400)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(req, ["owner", "admin"])
    if (!auth.user) return auth.response
    if (!isValidObjectId(params.id)) return jsonError("Invalid court id", 400)
    await dbConnect()
    const court = await Court.findById(params.id)
    if (!court) return jsonError("Court not found", 404)
    const access = await requireVenueAccess(String(court.venue), auth.user)
    if (!access.ok) return access.response
    const upcoming = await Booking.countDocuments({
      court: params.id,
      status: "confirmed",
      date: { $gte: localDateString() },
    })
    if (upcoming > 0) {
      return jsonError("Cannot delete a court with upcoming confirmed bookings", 409)
    }
    await deleteCourtCascade(params.id, String(court.venue))
    return NextResponse.json({ success: true })
  } catch {
    return jsonError("Failed to delete court", 400)
  }
}
