import { type NextRequest, NextResponse } from "next/server"
import { emailService, type CancellationEmailData } from "@/lib/email"
import { dbConnect, Booking, TimeSlot, Venue } from "@/lib/db"
import { isValidObjectId, jsonError, requireAuth } from "@/lib/api"
import { appUrl } from "@/lib/utils"
import { bookingDateTime, consecutiveHourTimes, formatBookingDate } from "@/lib/dates"

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (!auth.user) return auth.response

    await dbConnect()
    const { bookingId } = await request.json()
    if (!isValidObjectId(bookingId)) {
      return jsonError("Invalid booking id", 400)
    }

    const booking = await Booking.findById(bookingId)
    if (!booking) return jsonError("Booking not found", 404)

    const isBooker = String(booking.user) === auth.user.id
    const isAdmin = auth.user.role === "admin"
    let isVenueOwner = false
    if (!isBooker && !isAdmin && auth.user.role === "owner") {
      const venue = await Venue.findById(booking.venue)
      isVenueOwner = Boolean(venue && String(venue.owner) === auth.user.id)
    }
    if (!isBooker && !isAdmin && !isVenueOwner) {
      return jsonError("Forbidden", 403)
    }

    if (booking.status !== "confirmed") {
      return jsonError("Booking is already cancelled", 409)
    }

    const start = bookingDateTime(booking.date, booking.time)
    if (!start || start.getTime() <= Date.now()) {
      return jsonError("Past bookings cannot be cancelled", 400)
    }

    const hoursUntil = (start.getTime() - Date.now()) / (1000 * 60 * 60)
    const refundAmount = hoursUntil >= 2 ? Number(booking.totalAmount || 0) * 0.9 : 0

    booking.status = "cancelled"
    booking.refundAmount = refundAmount
    booking.paymentStatus = refundAmount > 0 ? "refunded" : booking.paymentStatus
    await booking.save()

    const times = consecutiveHourTimes(booking.time, Number(booking.duration || 1))
    await TimeSlot.updateMany(
      { court: booking.court, date: booking.date, time: { $in: times } },
      { $set: { isAvailable: true } }
    )

    const emailData: CancellationEmailData = {
      customerName: booking.customerName || "Customer",
      customerEmail: booking.customerEmail || "",
      bookingId: String(booking._id),
      venueName: booking.venueName || "Venue",
      venueLocation: booking.venueLocation || "",
      courtName: booking.courtName || "Court",
      sport: booking.sport || "",
      bookingDate: formatBookingDate(booking.date),
      bookingTime: booking.time,
      duration: booking.duration,
      totalAmount: booking.totalAmount,
      refundAmount,
      cancellationId: `CN${Date.now()}`,
      venuesUrl: `${appUrl()}/venues`,
      bookingsUrl: `${appUrl()}/bookings`,
    }

    let emailSent = false
    if (emailData.customerEmail) {
      try {
        emailSent = await emailService.sendBookingCancellation(emailData)
      } catch (e) {
        console.warn("Failed to send booking cancellation email", e)
      }
    }

    return NextResponse.json({
      success: true,
      booking,
      refundAmount,
      emailSent,
      message: "Booking cancelled successfully",
    })
  } catch (error) {
    console.error("Booking cancellation error:", error)
    return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 })
  }
}
