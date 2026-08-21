import { type NextRequest, NextResponse } from "next/server"
import { emailService, type BookingEmailData } from "@/lib/email"
import { dbConnect, Booking, TimeSlot, User, Venue, Court } from "@/lib/db"
import { isValidObjectId, jsonError, requireAuth } from "@/lib/api"
import { appUrl } from "@/lib/utils"
import { bookingDateTime, consecutiveHourTimes, formatBookingDate, isValidTime, parseLocalDate } from "@/lib/dates"

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
    const duration = Number(bookingData.duration || 1)

    if (!isValidObjectId(venueId) || !isValidObjectId(courtId)) {
      return jsonError("Invalid venue or court id", 400)
    }
    if (!parseLocalDate(date) || !isValidTime(time)) {
      return jsonError("Invalid date or time", 400)
    }
    if (!Number.isInteger(duration) || duration < 1 || duration > 8) {
      return jsonError("Duration must be between 1 and 8 hours", 400)
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

    const times = consecutiveHourTimes(time, duration)
    if (times.length !== duration) {
      return jsonError("Duration extends past midnight and is not supported", 400)
    }

    const claimed: Array<{ _id: unknown; price: number; time: string }> = []
    try {
      for (const slotTime of times) {
        const slot = await TimeSlot.findOneAndUpdate(
          { court: courtId, date, time: slotTime, isAvailable: true },
          { isAvailable: false },
          { new: true }
        )
        if (!slot) {
          throw new Error("UNAVAILABLE")
        }
        claimed.push({ _id: slot._id, price: slot.price, time: slotTime })
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
