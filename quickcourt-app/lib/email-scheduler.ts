import { Booking } from "@/lib/db"
import { emailService } from "@/lib/email"
import { appUrl } from "@/lib/utils"
import { bookingDateTime, formatBookingDate } from "@/lib/dates"

export async function sendDueReminders() {
  const now = Date.now()
  const windowStart = new Date(now + 25 * 60 * 1000)
  const windowEnd = new Date(now + 35 * 60 * 1000)

  const bookings = await Booking.find({ status: "confirmed" }).limit(200)
  let sent = 0

  for (const booking of bookings) {
    const start = bookingDateTime(booking.date, booking.time)
    if (!start) continue
    if (start < windowStart || start > windowEnd) continue
    const email = booking.customerEmail
    if (!email) continue
    const ok = await emailService.sendBookingReminder({
      customerName: booking.customerName || "Customer",
      customerEmail: email,
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
    })
    if (ok) sent += 1
  }

  return sent
}
