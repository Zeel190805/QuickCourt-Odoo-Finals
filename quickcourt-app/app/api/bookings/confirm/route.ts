import { type NextRequest, NextResponse } from "next/server"
import { emailService, type BookingEmailData } from "@/lib/email"
import { dbConnect, Booking, TimeSlot, User, Venue, Court } from "@/lib/db"
import { isValidObjectId, jsonError, requireAuth } from "@/lib/api"
import { appUrl } from "@/lib/utils"
import { resolveCourtRates } from "@/lib/pricing"
import {
  bookingDateTime,
  consecutiveSlotTimes,
  formatBookingDate,
  isValidSlotTime,
  parseLocalDate,
  SLOT_DURATION_HOURS,
  slotBlockPrice,
} from "@/lib/dates"

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["user", "owner", "admin"])
    if (!auth.user) return auth.response

    await dbConnect()
    const bookingData = await request.json()

    const venueId = bookingData.venueId
    const courtId = bookingData.courtId || bookingData.court
    const date = bookingData.date
    const time = bookingData.time
    let slotCount = Number(bookingData.slotCount)
    if (!Number.isInteger(slotCount) || slotCount < 1) {
      const durationHours = Number(bookingData.duration)
      slotCount =
        Number.isInteger(durationHours) && durationHours >= SLOT_DURATION_HOURS
          ? durationHours / SLOT_DURATION_HOURS
          : 1
    }
    const duration = slotCount * SLOT_DURATION_HOURS

    if (!isValidObjectId(venueId) || !isValidObjectId(courtId)) {
      return jsonError("Invalid venue or court id", 400)
    }
    if (!parseLocalDate(date) || !isValidSlotTime(time)) {
      return jsonError("Invalid date or slot time", 400)
    }
    if (!Number.isInteger(slotCount) || slotCount < 1 || slotCount > 3) {
      return jsonError("You can book 1 to 3 consecutive slots (3 hours each)", 400)
    }

    const start = bookingDateTime(date, time)
    if (!start || start.getTime() <= Date.now()) {
      return jsonError("Cannot book a past time slot", 400)
    }

    const [user, venue, court] = await Promise.all([
      User.findById(auth.user.id),
      Venue.findById(venueId),
      Court.findById(courtId),
    ])

    if (!user) return jsonError("User not found", 404)
    if (!venue) return jsonError("Venue not found", 404)
    if (!court) return jsonError("Court not found", 404)
    if (venue.status !== "approved") return jsonError("Venue is not available for booking", 400)
    if (!court.isActive) return jsonError("Court is not active", 400)
    if (String(court.venue) !== String(venue._id)) return jsonError("Court does not belong to this venue", 400)

    const times = consecutiveSlotTimes(time, slotCount)
    if (times.length !== slotCount) {
      return jsonError("Selected slots extend past available hours", 400)
    }

    const { dayPrice, nightPrice } = resolveCourtRates(court, venue)

    const claimed: Array<{ _id: unknown; price: number; time: string }> = []
    try {
      for (const slotTime of times) {
        const price = slotBlockPrice(Number(slotTime.split(":")[0]), dayPrice, nightPrice)
        // Claim an existing open slot, or create the claim if none exists yet.
        const existing = await TimeSlot.findOneAndUpdate(
          { court: courtId, date, time: slotTime, isAvailable: true },
          { $set: { isAvailable: false, price, venue: venueId } },
          { new: true }
        )
        if (existing) {
          claimed.push({ _id: existing._id, price, time: slotTime })
          continue
        }
        // No open slot: either it's already taken or was never created.
        try {
          const created = await TimeSlot.create({
            court: courtId,
            venue: venueId,
            date,
            time: slotTime,
            price,
            isAvailable: false,
          })
          claimed.push({ _id: created._id, price, time: slotTime })
        } catch (e: unknown) {
          if ((e as { code?: number }).code === 11000) throw new Error("UNAVAILABLE")
          throw e
        }
      }
    } catch (err) {
      await TimeSlot.updateMany({ _id: { $in: claimed.map((c) => c._id) } }, { $set: { isAvailable: true } })
      if (err instanceof Error && err.message === "UNAVAILABLE") {
        return jsonError("Selected time slot is no longer available", 409)
      }
      throw err
    }

    const totalAmount = claimed.reduce((sum, slot) => sum + Number(slot.price), 0)

    let created
    try {
      created = await Booking.create({
        user: auth.user.id,
        venue: venueId,
        court: courtId,
        date,
        time,
        duration,
        totalAmount,
        status: "confirmed",
        customerName: user.name,
        customerEmail: user.email,
        venueName: venue.name,
        venueLocation: venue.location,
        courtName: court.name,
        sport: court.sport,
        paymentStatus: "completed",
        paymentMethod: "online",
      })
    } catch (err: unknown) {
      await TimeSlot.updateMany({ _id: { $in: claimed.map((c) => c._id) } }, { $set: { isAvailable: true } })
      const code = (err as { code?: number }).code
      if (code === 11000) {
        return jsonError("Selected time slot is no longer available", 409)
      }
      throw err
    }

    const emailData: BookingEmailData = {
      customerName: user.name,
      customerEmail: user.email,
      bookingId: String(created._id),
      venueName: venue.name,
      venueLocation: venue.location,
      venueAddress: venue.location,
      courtName: court.name,
      sport: court.sport,
      bookingDate: formatBookingDate(date),
      bookingTime: time,
      duration,
      totalAmount,
      bookingUrl: `${appUrl()}/bookings`,
      venueUrl: `${appUrl()}/venues/${venueId}`,
    }

    let emailSent = false
    try {
      emailSent = await emailService.sendBookingConfirmation(emailData)
    } catch (e) {
      console.warn("Email sending failed", e)
    }

    return NextResponse.json({
      success: true,
      booking: created,
      emailSent,
      message: "Booking confirmed successfully",
      bookingId: String(created._id),
    })
  } catch (error: unknown) {
    console.error("Booking confirmation error:", error)
    return NextResponse.json({ error: "Failed to confirm booking" }, { status: 500 })
  }
}
