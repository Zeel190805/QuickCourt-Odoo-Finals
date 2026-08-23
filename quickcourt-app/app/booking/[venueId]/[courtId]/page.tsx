"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, MapPin, CreditCard } from "lucide-react"
import Link from "next/link"
import { localDateString, startOfToday } from "@/lib/dates"

interface TimeSlot {
  _id?: string
  time: string
  isAvailable: boolean
  price: number
  period?: "day" | "night"
  hour?: number
}

interface Venue {
  _id: string
  name: string
  location: string
  description?: string
}

interface Court {
  _id: string
  name: string
  sport: string
  basePricePerHour: number
}

interface BookingData {
  venue: Venue | null
  court: Court | null
  selectedDate: Date | null
  selectedTimeSlot: TimeSlot | null
  duration: number
  totalPrice: number
}

export default function BookingPage() {
  const params = useParams()
  const search = useSearchParams()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { toast } = useToast()

  const [bookingData, setBookingData] = useState<BookingData>({
    venue: null,
    court: null,
    selectedDate: null,
    selectedTimeSlot: null,
    duration: 1,
    totalPrice: 0,
  })

  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [periodFilter, setPeriodFilter] = useState<"all" | "day" | "night">("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isBooking, setIsBooking] = useState(false)

  const visibleSlots = availableSlots.filter((s) => (periodFilter === "all" ? true : s.period === periodFilter))

  const nextHour = (time: string) => `${String(Number(time.split(":")[0]) + 1).padStart(2, "0")}:00`

  const coveredSlots = (() => {
    if (!bookingData.selectedTimeSlot) return [] as TimeSlot[]
    const out: TimeSlot[] = []
    let t = bookingData.selectedTimeSlot.time
    for (let i = 0; i < bookingData.duration; i++) {
      const slot = availableSlots.find((s) => s.time === t)
      if (!slot) break
      out.push(slot)
      t = nextHour(t)
    }
    return out
  })()

  const coverageValid =
    coveredSlots.length === bookingData.duration && coveredSlots.every((s) => s.isAvailable)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/auth/login")
      return
    }

    const loadVenueAndCourtData = async () => {
      try {
        const venueId = String(params?.venueId || "")
        const courtId = String(params?.courtId || "")
        
        console.log("🔍 Loading venue and court data...")
        console.log("🔍 Venue ID:", venueId)
        console.log("🔍 Court ID:", courtId)

        // Fetch venue details
        console.log("📡 Fetching venue details...")
        const venueResponse = await fetch(`/api/venues/${venueId}`)
        console.log("📡 Venue response status:", venueResponse.status)
        
        if (!venueResponse.ok) {
          const errorText = await venueResponse.text()
          console.error("❌ Venue fetch failed:", errorText)
          throw new Error(`Venue not found: ${venueResponse.status} ${errorText}`)
        }
        const venueData = await venueResponse.json()
        console.log("✅ Venue data loaded:", venueData)

        // Fetch court details
        console.log("📡 Fetching court details...")
        const courtResponse = await fetch(`/api/courts/${courtId}`)
        console.log("📡 Court response status:", courtResponse.status)
        
        if (!courtResponse.ok) {
          const errorText = await courtResponse.text()
          console.error("❌ Court fetch failed:", errorText)
          throw new Error(`Court not found: ${courtResponse.status} ${errorText}`)
        }
        const courtData = await courtResponse.json()
        console.log("✅ Court data loaded:", courtData)

        setBookingData((prev) => ({
          ...prev,
          venue: venueData,
          court: courtData,
        }))

        // Preselect date/time from query if provided
        const qDate = search?.get("date")
        const qTime = search?.get("time")
        if (qDate) {
          const [y, m, d] = qDate.split("-").map(Number)
          if (y && m && d) {
            setBookingData((prev) => ({ ...prev, selectedDate: new Date(y, m - 1, d) }))
          }
        }
      } catch (error) {
        console.error('❌ Error loading venue/court data:', error)
        toast({ 
          title: "Error", 
          description: `Failed to load venue or court details: ${error instanceof Error ? error.message : 'Unknown error'}`, 
          variant: "destructive" 
        })
        router.push('/venues')
      } finally {
        setIsLoading(false)
      }
    }

    loadVenueAndCourtData()
  }, [params, user, router, search, toast])

  useEffect(() => {
    const loadSlots = async () => {
      if (!bookingData.selectedDate || !bookingData.venue || !bookingData.court) return setAvailableSlots([])
      
      try {
        const date = localDateString(bookingData.selectedDate)
        const res = await fetch(`/api/timeslots?venue=${bookingData.venue._id}&court=${bookingData.court._id}&date=${date}`)
        if (!res.ok) {
          throw new Error('Failed to load time slots')
        }
        const data = await res.json()
        const slots = (data || []).map((s: any) => ({ 
          _id: s._id,
          time: s.time, 
          price: s.price, 
          isAvailable: s.isAvailable,
          period: s.period,
          hour: s.hour,
        }))
        setAvailableSlots(slots)
        
        const qTime = search?.get("time")
        if (qTime) {
          const match = slots.find((s: TimeSlot) => s.time === qTime && s.isAvailable)
          if (match) setBookingData((prev) => ({ ...prev, selectedTimeSlot: match }))
        }
      } catch (error) {
        console.error('Error loading time slots:', error)
        toast({ 
          title: "Error", 
          description: "Failed to load available time slots.", 
          variant: "destructive" 
        })
      }
    }
    loadSlots()
  }, [bookingData.selectedDate, bookingData.venue, bookingData.court, search, toast])

  useEffect(() => {
    const total = coveredSlots.reduce((sum, s) => sum + Number(s.price || 0), 0)
    setBookingData((prev) => (prev.totalPrice === total ? prev : { ...prev, totalPrice: total }))
    // coveredSlots is derived from selectedTimeSlot, duration and availableSlots
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingData.selectedTimeSlot, bookingData.duration, availableSlots])

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setBookingData((prev) => ({
        ...prev,
        selectedDate: date,
        selectedTimeSlot: null,
      }))
    }
  }

  const handleTimeSlotSelect = (slot: TimeSlot) => {
    if (slot.isAvailable) {
      setBookingData((prev) => ({
        ...prev,
        selectedTimeSlot: slot,
      }))
    }
  }

  const handleDurationChange = (duration: number) => {
    setBookingData((prev) => ({ ...prev, duration }))
  }

  const handleBooking = async () => {
    if (!bookingData.selectedDate || !bookingData.selectedTimeSlot || !bookingData.venue || !bookingData.court) {
      toast({ title: "Incomplete booking", description: "Please select a date and time slot", variant: "destructive" })
      return
    }

    setIsBooking(true)

    try {
      const ownerOrUserId = user?.id
      console.log("🔍 User ID for booking:", ownerOrUserId)
      console.log("🔍 User object:", user)
      
      if (!ownerOrUserId) {
        toast({ 
          title: "Authentication Error", 
          description: "Please log in to make a booking.", 
          variant: "destructive" 
        })
        router.push("/auth/login")
        return
      }
      
      const bookingPayload = {
        userId: ownerOrUserId,
        customerName: user?.name || "Guest User",
        customerEmail: user?.email || "guest@example.com",
        venueId: bookingData.venue._id,
        venueName: bookingData.venue.name,
        venueLocation: bookingData.venue.location,
        courtId: bookingData.court._id,
        courtName: bookingData.court.name,
        sport: bookingData.court.sport,
        date: localDateString(bookingData.selectedDate),
        time: bookingData.selectedTimeSlot.time,
        duration: bookingData.duration,
        totalAmount: bookingData.totalPrice,
      }

      console.log("📦 Sending booking payload:", JSON.stringify(bookingPayload, null, 2))

      const response = await fetch("/api/bookings/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingPayload),
      })

      console.log("📡 Response status:", response.status)
      console.log("📡 Response headers:", Object.fromEntries(response.headers.entries()))

      const result = await response.json()
      console.log("📦 Response data:", JSON.stringify(result, null, 2))

      if (result.success) {
        toast({ 
          title: "🎉 Booking Successful!", 
          description: `Your booking has been confirmed! Booking ID: ${result.bookingId}. Confirmation email sent to ${user?.email}`, 
          variant: "default" 
        })
        
        // Add a small delay before redirecting to show the success message
        setTimeout(() => {
          router.push("/bookings")
        }, 2000)
      } else {
        console.error("❌ Booking failed with error:", result.error || result.message)
        
        // Handle specific error cases
        if (result.error?.includes("no longer available")) {
          toast({ 
            title: "Slot Unavailable", 
            description: "This time slot has been booked by someone else. Please select another time.", 
            variant: "destructive" 
          })
          // Refresh available slots
          const date = localDateString(bookingData.selectedDate)
          const res = await fetch(`/api/timeslots?venue=${bookingData.venue._id}&court=${bookingData.court._id}&date=${date}`)
          if (res.ok) {
            const data = await res.json()
            const slots = (data || []).map((s: any) => ({ 
              _id: s._id,
              time: s.time, 
              price: s.price, 
              isAvailable: s.isAvailable,
              period: s.period,
              hour: s.hour,
            }))
            setAvailableSlots(slots)
            setBookingData((prev) => ({ ...prev, selectedTimeSlot: null }))
          }
        } else {
          toast({ 
            title: "Booking failed", 
            description: result.message || result.error || "Please try again.", 
            variant: "destructive" 
          })
        }
      }
    } catch (error) {
      console.error('❌ Booking error:', error)
      toast({ 
        title: "Booking failed", 
        description: "Network error. Please check your connection and try again.", 
        variant: "destructive" 
      })
    } finally {
      setIsBooking(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading booking details...</p>
        </div>
      </div>
    )
  }

  if (!bookingData.venue || !bookingData.court) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Venue or Court Not Found</h2>
          <p className="text-gray-600 mb-4">The venue or court you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/venues')}>
            Browse Venues
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Link href="/">
                <h1 className="text-2xl font-bold text-indigo-600 cursor-pointer">QuickCourt</h1>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Your Court</h1>
          <p className="text-gray-600">Select your preferred date and time</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Booking Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Venue & Court Info */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{bookingData.venue.name}</h3>
                    <div className="flex items-center text-gray-600">
                      <MapPin className="h-4 w-4 mr-1" />
                      {bookingData.venue.location}
                    </div>
                    {bookingData.venue.description && (
                      <p className="text-gray-600 mt-2">{bookingData.venue.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-semibold">{bookingData.court.name}</h4>
                      <Badge variant="secondary">{bookingData.court.sport}</Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-indigo-600">₹{bookingData.selectedTimeSlot?.price || bookingData.court.basePricePerHour}/hour</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Date Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Date</CardTitle>
                <CardDescription>Choose your preferred date</CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={bookingData.selectedDate || undefined}
                  onSelect={handleDateSelect}
                  disabled={(date) => date < startOfToday()}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            {/* Time Slot Selection */}
            {bookingData.selectedDate && (
              <Card>
                <CardHeader>
                  <CardTitle>Select Time Slot</CardTitle>
                  <CardDescription>
                    Pick any open hour for {bookingData.selectedDate.toDateString()}. Booked hours are shown greyed out.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-4">
                    {(["all", "day", "night"] as const).map((p) => (
                      <Button
                        key={p}
                        size="sm"
                        variant={periodFilter === p ? "default" : "outline"}
                        onClick={() => setPeriodFilter(p)}
                      >
                        {p === "all" ? "All" : p === "day" ? "Day (6 AM–6 PM)" : "Night (6 PM–6 AM)"}
                      </Button>
                    ))}
                  </div>
                  {visibleSlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No slots available for this selection.</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-3">
                      {visibleSlots.map((slot) => (
                        <Button
                          key={slot._id || slot.time}
                          variant={
                            bookingData.selectedTimeSlot?.time === slot.time
                              ? "default"
                              : slot.isAvailable
                                ? "outline"
                                : "secondary"
                          }
                          disabled={!slot.isAvailable}
                          onClick={() => handleTimeSlotSelect(slot)}
                          className="h-14 flex-col"
                        >
                          <div className="text-center">
                            <div className="font-semibold">{slot.time}</div>
                            {slot.isAvailable ? (
                              <>
                                <div className="text-xs">₹{slot.price}</div>
                                <div className="text-[10px] uppercase opacity-70">{slot.period}</div>
                              </>
                            ) : (
                              <div className="text-xs">Booked</div>
                            )}
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Duration Selection */}
            {bookingData.selectedTimeSlot && (
              <Card>
                <CardHeader>
                  <CardTitle>Select Duration</CardTitle>
                  <CardDescription>
                    Book a custom length starting {bookingData.selectedTimeSlot.time}. Options that overlap a booked hour are disabled.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((hours) => {
                      const start = bookingData.selectedTimeSlot!.time
                      let ok = true
                      let sum = 0
                      let t = start
                      for (let i = 0; i < hours; i++) {
                        const s = availableSlots.find((x) => x.time === t)
                        if (!s || !s.isAvailable) { ok = false; break }
                        sum += Number(s.price || 0)
                        t = nextHour(t)
                      }
                      return (
                        <Button
                          key={hours}
                          variant={bookingData.duration === hours ? "default" : "outline"}
                          disabled={!ok}
                          onClick={() => handleDurationChange(hours)}
                          className="h-12"
                        >
                          <div className="text-center">
                            <div className="font-semibold">
                              {hours} hour{hours > 1 ? "s" : ""}
                            </div>
                            <div className="text-xs">{ok ? `₹${sum}` : "N/A"}</div>
                          </div>
                        </Button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Booking Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Venue:</span>
                    <span className="font-semibold">{bookingData.venue.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Court:</span>
                    <span className="font-semibold">{bookingData.court.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sport:</span>
                    <Badge variant="secondary">{bookingData.court.sport}</Badge>
                  </div>
                  {bookingData.selectedDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-semibold">{bookingData.selectedDate.toDateString()}</span>
                    </div>
                  )}
                  {bookingData.selectedTimeSlot && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time:</span>
                      <span className="font-semibold">{bookingData.selectedTimeSlot.time}</span>
                    </div>
                  )}
                  {bookingData.duration > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-semibold">
                        {bookingData.duration} hour{bookingData.duration > 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>

                {bookingData.totalPrice > 0 && (
                  <>
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold">Total:</span>
                        <span className="text-2xl font-bold text-indigo-600">₹{bookingData.totalPrice}</span>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleBooking}
                      disabled={isBooking || !bookingData.selectedDate || !bookingData.selectedTimeSlot || !coverageValid}
                    >
                      {isBooking ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Book & Pay ₹{bookingData.totalPrice}
                        </>
                      )}
                    </Button>

                    <div className="text-xs text-gray-500 text-center">
                      <p>By booking, you agree to our terms and conditions.</p>
                      <p className="mt-1">Payment is processed securely.</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
