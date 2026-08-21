import { type NextRequest, NextResponse } from "next/server"
import { emailService } from "@/lib/email"
import { dbConnect, Booking } from "@/lib/db"
import { isValidObjectId, jsonError, requireAuth } from "@/lib/api"
import { appUrl } from "@/lib/utils"
import { bookingDateTime, formatBookingDate } from "@/lib/dates"

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin"])
    if (!auth.user) return auth.response

    await dbConnect()
    const { bookingId } = await request.json()
    if (!isValidObjectId(bookingId)) {
      return jsonError("Invalid booking id", 400)
    }

    const booking = await Booking.findById(bookingId).populate("user", "name email")
    if (!booking) return jsonError("Booking not found", 404)
    if (booking.status !== "confirmed") return jsonError("Booking is not active", 400)

    const start = bookingDateTime(booking.date, booking.time)
    if (!start) return jsonError("Invalid booking date", 400)

    const customerEmail = booking.customerEmail || (booking.user as { email?: string } | null)?.email
    if (!customerEmail) return jsonError("No email on file for this booking", 400)

    const emailSent = await emailService.sendBookingReminder({
      customerName: booking.customerName || (booking.user as { name?: string } | null)?.name || "Customer",
      customerEmail,
      bookingId: String(booking._id),
      venueName: booking.venueName || "Venue",
      venueLocation: booking.venueLocation || "",
      courtName: booking.courtName || "Court",
      sport: booking.sport || "",
      bookingDate: formatBookingDate(booking.date),
      bookingTime: booking.time,
      duration: booking.duration,
      totalAmount: booking.totalAmount,
      bookingUrl: `${appUrl()}/bookings`,
      venueUrl: `${appUrl()}/venues/${String(booking.venue)}`,
      cancelUrl: `${appUrl()}/bookings`,
    })

    return NextResponse.json({ success: emailSent, bookingId: String(booking._id) })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to send reminder" }, { status: 500 })
  }
}
