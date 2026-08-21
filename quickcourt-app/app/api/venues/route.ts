import { dbConnect, Venue } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireAuth } from "@/lib/api"
import { getSessionFromRequest } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    const user = await getSessionFromRequest(request)
    if (user?.role === "admin") {
      const venues = await Venue.find().populate("owner", "name email")
      return NextResponse.json(venues)
    }
    if (user?.role === "owner") {
      const venues = await Venue.find({ owner: user.id }).populate("owner", "name email")
      return NextResponse.json(venues)
    }
    const venues = await Venue.find({ status: "approved" })
    return NextResponse.json(venues)
  } catch {
    return jsonError("Failed to load venues", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["owner", "admin"])
    if (!auth.user) return auth.response
    await dbConnect()
    const data = await request.json()
    const name = String(data.name || "").trim()
    const location = String(data.location || "").trim()
    const min = Number(data.priceRange?.min)
    const max = Number(data.priceRange?.max)
    if (!name || !location || Number.isNaN(min) || Number.isNaN(max) || min < 0 || max < min) {
      return jsonError("Invalid venue data", 400)
    }
    const venue = await Venue.create({
      name,
      description: String(data.description || ""),
      location,
      sports: Array.isArray(data.sports) ? data.sports.map(String) : [],
      priceRange: { min, max },
      amenities: Array.isArray(data.amenities) ? data.amenities.map(String) : [],
      images: Array.isArray(data.images) ? data.images.map(String) : [],
      owner: auth.user.id,
      status: "pending",
      courtCount: 0,
    })
    return NextResponse.json(venue, { status: 201 })
  } catch {
    return jsonError("Failed to create venue", 500)
  }
}
