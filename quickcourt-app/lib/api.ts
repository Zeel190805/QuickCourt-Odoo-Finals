import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, type SessionUser, type UserRole } from "@/lib/auth"
import { Court, Venue } from "@/lib/db"

export function isValidObjectId(id: unknown): id is string {
  return typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id)
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function requireAuth(
  req: NextRequest,
  roles?: UserRole[]
): Promise<{ user: SessionUser } | { user?: undefined; response: NextResponse }> {
  const user = await getSessionFromRequest(req)
  if (!user) {
    return { response: jsonError("Unauthorized", 401) }
  }
  if (user.accountStatus !== "active") {
    return { response: jsonError("Account is not active", 403) }
  }
  if (roles && !roles.includes(user.role)) {
    return { response: jsonError("Forbidden", 403) }
  }
  return { user }
}

export async function requireVenueAccess(
  venueId: string,
  user: SessionUser
): Promise<{ ok: true; venue: InstanceType<typeof Venue> } | { ok: false; response: NextResponse }> {
  if (!isValidObjectId(venueId)) {
    return { ok: false, response: jsonError("Invalid venue id", 400) }
  }
  const venue = await Venue.findById(venueId)
  if (!venue) {
    return { ok: false, response: jsonError("Venue not found", 404) }
  }
  if (user.role === "admin") {
    return { ok: true, venue }
  }
  if (user.role === "owner" && String(venue.owner) === user.id) {
    return { ok: true, venue }
  }
  return { ok: false, response: jsonError("Forbidden", 403) }
}

export async function syncCourtCount(venueId: string) {
  const count = await Court.countDocuments({ venue: venueId })
  await Venue.findByIdAndUpdate(venueId, { $set: { courtCount: count } })
  return count
}

export async function deleteVenueCascade(venueId: string) {
  const { Booking, TimeSlot } = await import("@/lib/db")
  await TimeSlot.deleteMany({ venue: venueId })
  await Booking.deleteMany({ venue: venueId })
  await Court.deleteMany({ venue: venueId })
  await Venue.findByIdAndDelete(venueId)
}

export async function deleteCourtCascade(courtId: string, venueId: string) {
  const { Booking, TimeSlot } = await import("@/lib/db")
  await TimeSlot.deleteMany({ court: courtId })
  await Booking.deleteMany({ court: courtId })
  await Court.findByIdAndDelete(courtId)
  await syncCourtCount(venueId)
}
