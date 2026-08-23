import { NextRequest, NextResponse } from "next/server"
import { dbConnect, Court, TimeSlot } from "@/lib/db"
import { isValidObjectId, jsonError, requireAuth, requireVenueAccess } from "@/lib/api"
import {
  generateDaySlots,
  isValidTime,
  localDateString,
  localTimeString,
  parseLocalDate,
  type SlotPeriod,
} from "@/lib/dates"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = new URL(req.url)
    const venue = searchParams.get("venue")
    const court = searchParams.get("court")
    const date = searchParams.get("date")
    const period = searchParams.get("period") as SlotPeriod | null

    if (venue && !isValidObjectId(venue)) return jsonError("Invalid venue id", 400)
    if (court && !isValidObjectId(court)) return jsonError("Invalid court id", 400)

    // Court + date => generate the full day/night grid with live availability.
    if (court && date) {
      if (!parseLocalDate(date)) return jsonError("Invalid date", 400)
      const courtDoc = await Court.findById(court)
      if (!courtDoc) return jsonError("Court not found", 404)

      const dayPrice = Number(courtDoc.dayPrice ?? courtDoc.basePricePerHour ?? 0)
      const nightPrice = Number(courtDoc.nightPrice ?? courtDoc.basePricePerHour ?? 0)

      const todayStr = localDateString()
      if (date < todayStr) return NextResponse.json([])
      const nowTime = date === todayStr ? localTimeString() : null

      const taken = await TimeSlot.find({ court, date, isAvailable: false }).select("time")
      const takenTimes = new Set(taken.map((t) => t.time))

      const slots = generateDaySlots(dayPrice, nightPrice)
        .filter((s) => (period ? s.period === period : true))
        .filter((s) => (nowTime ? s.time >= nowTime : true))
        .map((s) => ({
          court,
          venue: venue || String(courtDoc.venue),
          date,
          time: s.time,
          hour: s.hour,
          period: s.period,
          price: s.price,
          isAvailable: !takenTimes.has(s.time),
        }))

      return NextResponse.json(slots)
    }

    // Fallback: raw stored slots (used by owner listings without a specific date/court).
    const query: Record<string, unknown> = {}
    if (venue) query.venue = venue
    if (court) query.court = court
    if (date) {
      if (!parseLocalDate(date)) return jsonError("Invalid date", 400)
      query.date = date
    }

    const slots = await TimeSlot.find(query).sort({ time: 1 })
    return NextResponse.json(slots)
  } catch {
    return jsonError("Failed to load timeslots", 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["owner", "admin"])
    if (!auth.user) return auth.response
    await dbConnect()
    const data = await req.json()
    if (!isValidObjectId(data.venue) || !isValidObjectId(data.court)) {
      return jsonError("Invalid venue or court id", 400)
    }
    const access = await requireVenueAccess(data.venue, auth.user)
    if (!access.ok) return access.response
    if (!parseLocalDate(data.date) || !isValidTime(data.time)) {
      return jsonError("Invalid date or time", 400)
    }
    const price = Number(data.price)
    if (Number.isNaN(price) || price <= 0) {
      return jsonError("Price must be greater than 0", 400)
    }
    const created = await TimeSlot.create({
      venue: data.venue,
      court: data.court,
      date: data.date,
      time: data.time,
      price,
      isAvailable: true,
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: unknown) {
    const code = (e as { code?: number }).code
    const message = code === 11000 ? "Duplicate slot for this court/date/time" : "Failed to create timeslot"
    return jsonError(message, 400)
  }
}
