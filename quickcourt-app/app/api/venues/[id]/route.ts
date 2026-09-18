import { dbConnect, Booking, Court, Venue } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { deleteVenueCascade, isValidObjectId, jsonError, requireAuth, requireVenueAccess } from "@/lib/api"
import { getSessionFromRequest } from "@/lib/auth"
import { localDateString } from "@/lib/dates"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!isValidObjectId(params.id)) return jsonError("Invalid venue id", 400)
    await dbConnect()
    const venue = await Venue.findById(params.id)
    if (!venue) return jsonError("Venue not found", 404)
    const user = await getSessionFromRequest(request)
    const isOwner = user && String(venue.owner) === user.id
    const isAdmin = user?.role === "admin"
    if (venue.status !== "approved" && !isOwner && !isAdmin) {
      return jsonError("Venue not found", 404)
    }
    return NextResponse.json(venue)
  } catch {
    return jsonError("Failed to load venue", 500)
  }
}

async function updateVenue(request: NextRequest, id: string) {
  const auth = await requireAuth(request, ["owner", "admin"])
  if (!auth.user) return auth.response
  if (!isValidObjectId(id)) return jsonError("Invalid venue id", 400)
  await dbConnect()
  const access = await requireVenueAccess(id, auth.user)
  if (!access.ok) return access.response
  const data = await request.json()
  const updates: Record<string, unknown> = {}
  if (typeof data.name === "string") updates.name = data.name.trim()
  if (typeof data.description === "string") updates.description = data.description
  if (typeof data.location === "string") updates.location = data.location.trim()
  if (Array.isArray(data.sports)) updates.sports = data.sports.map(String)
  if (Array.isArray(data.amenities)) updates.amenities = data.amenities.map(String)
  if (Array.isArray(data.images)) updates.images = data.images.map(String).slice(0, 8)
  if (data.priceRange) {
    const min = Number(data.priceRange.min)
    const max = Number(data.priceRange.max)
    if (Number.isNaN(min) || Number.isNaN(max) || min < 0 || max < min) {
      return jsonError("Invalid price range", 400)
    }
    updates.priceRange = { min, max }
  }
  if (auth.user.role === "admin") {
    if (["approved", "pending", "rejected", "suspended"].includes(data.status)) {
      updates.status = data.status
    }
  }
  const venue = await Venue.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true })
  if (!venue) return jsonError("Venue not found", 404)

  const day = Number(data.dayPrice ?? data.priceRange?.min ?? venue.priceRange?.min)
  const night = Number(data.nightPrice ?? data.priceRange?.max ?? venue.priceRange?.max)
  if (day > 0 && night > 0) {
    await Court.updateMany(
      { venue: id },
      { $set: { dayPrice: day, nightPrice: night, basePricePerHour: Math.min(day, night) } }
    )
  }

  return NextResponse.json(venue)
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    return await updateVenue(request, params.id)
  } catch {
    return jsonError("Failed to update venue", 500)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    return await updateVenue(request, params.id)
  } catch {
    return jsonError("Failed to update venue", 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request, ["owner", "admin"])
    if (!auth.user) return auth.response
    if (!isValidObjectId(params.id)) return jsonError("Invalid venue id", 400)
    await dbConnect()
    const access = await requireVenueAccess(params.id, auth.user)
    if (!access.ok) return access.response
    const upcoming = await Booking.countDocuments({
      venue: params.id,
      status: "confirmed",
      date: { $gte: localDateString() },
    })
    if (upcoming > 0) {
      return jsonError("Cannot delete a venue with upcoming confirmed bookings", 409)
    }
    await deleteVenueCascade(params.id)
    return NextResponse.json({ message: "Venue deleted" })
  } catch {
    return jsonError("Failed to delete venue", 500)
  }
}
