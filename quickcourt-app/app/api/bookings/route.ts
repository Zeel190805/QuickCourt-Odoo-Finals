import { NextRequest, NextResponse } from "next/server"
import { dbConnect, Booking, Venue } from "@/lib/db"
import { isValidObjectId, jsonError, requireAuth } from "@/lib/api"

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (!auth.user) return auth.response

    await dbConnect()
    const { searchParams } = new URL(req.url)
    const user = searchParams.get("user")
    const venue = searchParams.get("venue")

    const query: Record<string, unknown> = {}

    if (auth.user.role === "user") {
      query.user = auth.user.id
    } else if (auth.user.role === "owner") {
      const venues = await Venue.find({ owner: auth.user.id }).select("_id")
      const venueIds = venues.map((v) => v._id)
      query.venue = { $in: venueIds }
      if (venue && isValidObjectId(venue)) {
        if (!venueIds.some((id) => String(id) === venue)) {
          return jsonError("Forbidden", 403)
        }
        query.venue = venue
      }
    } else if (auth.user.role === "admin") {
      if (user && isValidObjectId(user)) query.user = user
      if (venue && isValidObjectId(venue)) query.venue = venue
    }

    const bookings = await Booking.find(query)
      .populate("venue", "name location owner")
      .populate("court", "name sport")
      .sort({ createdAt: -1 })

    return NextResponse.json(bookings)
  } catch {
    return NextResponse.json({ error: "Failed to load bookings" }, { status: 500 })
  }
}
