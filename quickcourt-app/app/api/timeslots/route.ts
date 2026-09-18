import { NextRequest, NextResponse } from "next/server"
import { dbConnect, Booking, Court, TimeSlot, Venue } from "@/lib/db"
import { resolveCourtRates } from "@/lib/pricing"
import { isValidObjectId, jsonError, requireAuth, requireVenueAccess } from "@/lib/api"
import {
  generateDaySlots,
  isValidSlotTime,
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
      const venueDoc = await Venue.findById(courtDoc.venue)
      const { dayPrice, nightPrice } = resolveCourtRates(courtDoc, venueDoc)

      const todayStr = localDateString()
      if (date < todayStr) return NextResponse.json([])
      const nowTime = date === todayStr ? localTimeString() : null

      const [stored, bookings] = await Promise.all([
        TimeSlot.find({ court, date }),
        Booking.find({ court, date, status: "confirmed" }).select("time"),
      ])
      const byTime = new Map(stored.map((s) => [s.time, s]))
      const bookedTimes = new Set(bookings.map((b) => b.time))

      const slots = generateDaySlots(dayPrice, nightPrice)
        .filter((s) => (period ? s.period === period : true))
        .filter((s) => (nowTime ? s.time >= nowTime : true))
        .map((s) => {
          const rec = byTime.get(s.time)
          const isBooked = bookedTimes.has(s.time)
          return {
            _id: rec?._id ? String(rec._id) : undefined,
            court,
            venue: venue || String(courtDoc.venue),
            date,
            time: s.time,
            hour: s.hour,
            period: s.period,
            price: s.price,
            dayRate: dayPrice,
            nightRate: nightPrice,
            isAvailable: isBooked ? false : rec ? rec.isAvailable : true,
            isBooked,
            hasOverride: Boolean(rec) && !isBooked,
          }
        })

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
    if (!parseLocalDate(data.date) || !isValidSlotTime(data.time)) {
      return jsonError("Invalid date or slot time. Use 3-hour blocks: 00:00, 03:00, 06:00 … 21:00", 400)
    }
    const price = Number(data.price)
    if (Number.isNaN(price) || price <= 0) {
      return jsonError("Price must be greater than 0", 400)
    }
    const existing = await TimeSlot.findOne({ court: data.court, date: data.date, time: data.time })
    if (existing) {
      existing.price = price
      existing.isAvailable = data.isAvailable !== false
      await existing.save()
      return NextResponse.json(existing)
    }
    const created = await TimeSlot.create({
      venue: data.venue,
      court: data.court,
      date: data.date,
      time: data.time,
      price,
      isAvailable: data.isAvailable !== false,
    })
    return NextResponse.json(created, { status: 201 })
  } catch {
    return jsonError("Failed to create timeslot", 400)
  }
}
