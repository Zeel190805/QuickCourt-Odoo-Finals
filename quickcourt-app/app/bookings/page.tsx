"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { MapPin, Clock, Calendar, X } from "lucide-react"
import Link from "next/link"
import { formatBookingDate } from "@/lib/dates"

interface BookingDTO {
  _id: string
  venue: { _id: string; name: string; location: string }
  court: { _id: string; name: string; sport: string }
  date: string
  time: string
  duration: number
  totalAmount: number
  status: "confirmed" | "cancelled"
  createdAt: string
}

export default function MyBookingsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [bookings, setBookings] = useState<BookingDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/auth/login")
      return
    }

    const load = async () => {
      try {
        const res = await fetch("/api/bookings")
        if (!res.ok) {
          setBookings([])
          return
        }
        const data = await res.json()
        setBookings(Array.isArray(data) ? data : [])
      } catch {
        setBookings([])
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [user, router, authLoading])

  const handleCancelBooking = async (bookingId: string) => {
    try {
      // Show confirmation dialog first
      const confirmed = window.confirm(
        "Are you sure you want to cancel this booking? A 10% cancellation fee may apply.",
      )
      if (!confirmed) return

      const response = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          reason: "User requested cancellation",
        }),
      })

      const result = await response.json()

      if (result.success) {
        setBookings((prev) => prev.map((b) => (b._id === bookingId ? { ...b, status: "cancelled" } : b)))

        toast({
          title: "Booking cancelled 📧",
                      description: `Your booking has been cancelled successfully. ${result.emailSent ? "Cancellation email sent!" : ""} Refund: ₹${result.refundAmount}`,
        })
      } else {
        toast({
          title: "Cancellation failed",
          description: result.message || "Failed to cancel booking. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel booking. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const isUpcoming = (date: string, time: string) => {
    const bookingDateTime = new Date(`${date}T${time}`)
    return bookingDateTime > new Date()
  }

  const upcomingBookings = bookings.filter((b) => b.status === 'confirmed' && isUpcoming(b.date, b.time))

  const pastBookings = bookings.filter((b) => b.status === 'cancelled' || (b.status === 'confirmed' && !isUpcoming(b.date, b.time)))

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your bookings...</p>
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
            <Link href="/">
              <h1 className="text-2xl font-bold text-indigo-600 cursor-pointer">QuickCourt</h1>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/venues">
                <Button variant="outline">Browse Venues</Button>
              </Link>
              <Link href="/profile">
                <Button variant="outline">Profile</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">My Bookings</h2>
          <p className="text-gray-600">Manage your court reservations</p>
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="upcoming">Upcoming ({upcomingBookings.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({pastBookings.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {upcomingBookings.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No upcoming bookings</h3>
                  <p className="text-gray-600 mb-6">You don't have any upcoming court reservations.</p>
                  <Link href="/venues">
                    <Button>Browse Venues</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <Card key={booking._id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{booking.venue?.name || "Venue"}</CardTitle>
                          <CardDescription>
                            <div className="flex items-center mt-1">
                              <MapPin className="h-4 w-4 mr-1" />
                              {booking.venue.location}
                            </div>
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <span className="font-semibold mr-2">Court:</span>
                             <span>{booking.court?.name || "Court"}</span>
                            <Badge variant="secondary" className="ml-2">
                              {booking.court?.sport}
                            </Badge>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            <span>{formatBookingDate(booking.date)}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            <span>
                              {booking.time} ({booking.duration} hour{booking.duration > 1 ? "s" : ""})
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-sm text-gray-600">Total Paid</div>
                             <div className="text-2xl font-bold text-indigo-600">₹{booking.totalAmount}</div>
                          </div>
                          <div className="space-x-2">
                            <Button variant="destructive" size="sm" onClick={() => handleCancelBooking(booking._id)}>
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past">
            {pastBookings.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No past bookings</h3>
                  <p className="text-gray-600">Your booking history will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pastBookings.map((booking) => (
                  <Card key={booking._id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{booking.venue?.name || "Venue"}</CardTitle>
                          <CardDescription>
                            <div className="flex items-center mt-1">
                              <MapPin className="h-4 w-4 mr-1" />
                              {booking.venue.location}
                            </div>
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <span className="font-semibold mr-2">Court:</span>
                             <span>{booking.court?.name || "Court"}</span>
                            <Badge variant="secondary" className="ml-2">
                              {booking.court?.sport}
                            </Badge>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            <span>{formatBookingDate(booking.date)}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            <span>
                              {booking.time} ({booking.duration} hour{booking.duration > 1 ? "s" : ""})
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-sm text-gray-600">Total Paid</div>
                             <div className="text-2xl font-bold text-indigo-600">₹{booking.totalAmount}</div>
                          </div>
                          {/* Add review flow later if needed */}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
