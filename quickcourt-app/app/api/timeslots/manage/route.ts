import { type NextRequest, NextResponse } from "next/server"
import { dbConnect, Booking, TimeSlot } from "@/lib/db"
import { isValidObjectId, jsonError, requireAuth, requireVenueAccess } from "@/lib/api"
import { isValidSlotTime, parseLocalDate } from "@/lib/dates"

async function parseBody(req: NextRequest) {
  const data = await req.json()
  const { venue, court, date, time } = data
  if (!isValidObjectId(venue) || !isValidObjectId(court)) {
    return { error: jsonError("Invalid venue or court id", 400) }
  }
  if (!parseLocalDate(date) || !isValidSlotTime(time)) {
    return { error: jsonError("Invalid date or slot time", 400) }
  }
  return { data }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["owner", "admin"])
    if (!auth.user) return auth.response
    await dbConnect()
    const parsed = await parseBody(req)
    if ("error" in parsed) return parsed.error
    const { venue, court, date, time, isAvailable, price } = parsed.data
    const access = await requireVenueAccess(venue, auth.user)
    if (!access.ok) return access.response

    const booked = await Booking.findOne({ court, date, time, status: "confirmed" })
    if (booked) return jsonError("This slot is booked and cannot be changed", 409)

    const updates: Record<string, unknown> = { venue, court, date, time }
    if (typeof isAvailable === "boolean") updates.isAvailable = isAvailable
    if (price !== undefined) {
      const p = Number(price)
      if (Number.isNaN(p) || p <= 0) return jsonError("Invalid price", 400)
      updates.price = p
    }

    const updated = await TimeSlot.findOneAndUpdate(
      { court, date, time },
      { $set: updates },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    )
    return NextResponse.json(updated)
  } catch {
    return jsonError("Failed to update slot", 500)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["owner", "admin"])
    if (!auth.user) return auth.response
    await dbConnect()
    const parsed = await parseBody(req)
    if ("error" in parsed) return parsed.error
    const { venue, court, date, time } = parsed.data
    const access = await requireVenueAccess(venue, auth.user)
    if (!access.ok) return access.response

    const booked = await Booking.findOne({ court, date, time, status: "confirmed" })
    if (booked) return jsonError("Cannot remove a booked slot", 409)

    await TimeSlot.findOneAndDelete({ court, date, time })
    return NextResponse.json({ success: true })
  } catch {
    return jsonError("Failed to delete slot", 500)
  }
}
