import { NextRequest, NextResponse } from "next/server"
import { dbConnect, Court } from "@/lib/db"
import { isValidObjectId, jsonError, requireAuth, requireVenueAccess, syncCourtCount } from "@/lib/api"
import { getSessionFromRequest } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = new URL(req.url)
    const venue = searchParams.get("venue")
    const query: Record<string, unknown> = { isActive: true }
    if (venue) {
      if (!isValidObjectId(venue)) return jsonError("Invalid venue id", 400)
      query.venue = venue
    }
    const user = await getSessionFromRequest(req)
    if (user?.role === "admin") {
      delete query.isActive
    } else if (user?.role === "owner") {
      delete query.isActive
      if (venue) {
        const access = await requireVenueAccess(venue, user)
        if (!access.ok) return access.response
      } else {
        const { Venue } = await import("@/lib/db")
        const venues = await Venue.find({ owner: user.id }).select("_id")
        query.venue = { $in: venues.map((v) => v._id) }
      }
    }
    const courts = await Court.find(query).sort({ createdAt: -1 })
    return NextResponse.json(courts)
  } catch {
    return jsonError("Failed to load courts", 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["owner", "admin"])
    if (!auth.user) return auth.response
    await dbConnect()
    const data = await req.json()
    if (!isValidObjectId(data.venue)) return jsonError("Invalid venue id", 400)
    const access = await requireVenueAccess(data.venue, auth.user)
    if (!access.ok) return access.response
    const name = String(data.name || "").trim()
    const sport = String(data.sport || "").trim()
    const basePricePerHour = Number(data.basePricePerHour)
    if (!name || !sport || Number.isNaN(basePricePerHour) || basePricePerHour <= 0) {
      return jsonError("Invalid court data", 400)
    }
    const created = await Court.create({
      venue: data.venue,
      name,
      sport,
      basePricePerHour,
      isActive: true,
    })
    await syncCourtCount(data.venue)
    return NextResponse.json(created, { status: 201 })
  } catch {
    return jsonError("Failed to create court", 400)
  }
}
