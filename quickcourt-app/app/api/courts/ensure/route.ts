import { NextRequest, NextResponse } from "next/server"
import { dbConnect, Court } from "@/lib/db"
import { isValidObjectId, jsonError, requireAuth, requireVenueAccess, syncCourtCount } from "@/lib/api"

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["owner", "admin"])
    if (!auth.user) return auth.response
    await dbConnect()
    const body = await req.json()
    const venueId: string | undefined = body?.venue
    const count: number = Math.max(1, Math.min(20, Number(body?.count ?? 1)))
    const sport: string = String(body?.sport ?? "General")
    const basePricePerHour: number = Number(body?.basePricePerHour ?? 0)

    if (!venueId || !isValidObjectId(venueId)) {
      return jsonError("venue is required", 400)
    }
    if (Number.isNaN(basePricePerHour) || basePricePerHour <= 0) {
      return jsonError("basePricePerHour must be greater than 0", 400)
    }

    const access = await requireVenueAccess(venueId, auth.user)
    if (!access.ok) return access.response

    const existing = await Court.countDocuments({ venue: venueId })
    if (existing > 0) {
      const courts = await Court.find({ venue: venueId }).sort({ createdAt: 1 })
      await syncCourtCount(venueId)
      return NextResponse.json({ created: 0, courts })
    }

    const toCreate = Array.from({ length: count }).map((_, idx) => ({
      venue: venueId,
      name: `Court ${idx + 1}`,
      sport,
      basePricePerHour,
    }))

    const created = await Court.insertMany(toCreate)
    await syncCourtCount(venueId)
    return NextResponse.json({ created: created.length, courts: created }, { status: 201 })
  } catch {
    return jsonError("Failed to ensure courts", 500)
  }
}
