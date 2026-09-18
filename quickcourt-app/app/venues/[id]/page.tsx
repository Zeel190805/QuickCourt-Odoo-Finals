"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Star, Clock, Users, Wifi, Car, Coffee, Dumbbell, ArrowLeft } from "lucide-react"
import { localDateString, formatSlotRange } from "@/lib/dates"
import Link from "next/link"

interface VenueApi {
  _id: string
  name: string
  description?: string
  location: string
  images?: string[]
  amenities?: string[]
  sports?: string[]
  rating?: number
  reviewCount?: number
  priceRange: { min: number; max: number }
  status: "approved" | "pending"
}

export default function VenueDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [venue, setVenue] = useState<VenueApi | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [courts, setCourts] = useState<any[]>([])
  const [selectedCourt, setSelectedCourt] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [slots, setSlots] = useState<any[]>([])

  useEffect(() => {
    const id = String(params?.id || "")
    if (!id) return
    setIsLoading(true)
    fetch(`/api/venues/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setVenue(data))
      .catch(() => setVenue(null))
      .finally(() => setIsLoading(false))
  }, [params?.id])

  useEffect(() => {
    if (!venue?._id) return
    fetch(`/api/courts?venue=${venue._id}`)
      .then((r) => r.json())
      .then((data) => {
        setCourts(Array.isArray(data) ? data : [])
        if (Array.isArray(data) && data.length > 0) setSelectedCourt(String(data[0]._id))
      })
  }, [venue?._id])

  useEffect(() => {
    const load = async () => {
      if (!selectedCourt || !selectedDate || !venue?._id) return setSlots([])
      const date = localDateString(selectedDate)
      const res = await fetch(`/api/timeslots?venue=${venue._id}&court=${selectedCourt}&date=${date}`)
      const data = await res.json()
      setSlots(Array.isArray(data) ? data : [])
    }
    load()
  }, [selectedCourt, selectedDate, venue?._id])

  const amenityIcons: { [key: string]: any } = {
    "Free Parking": Car,
    WiFi: Wifi,
    Cafeteria: Coffee,
    "Equipment Rental": Dumbbell,
    "Changing Rooms": Users,
    "Air Conditioning": Clock,
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading venue details...</p>
        </div>
      </div>
    )
  }

  if (!venue || venue?.status !== "approved") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Venue not available</h2>
          <p className="text-gray-600 mb-4">This venue is pending approval or does not exist.</p>
          <Link href="/venues">
            <Button>Back to Venues</Button>
          </Link>
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
                <h1 className="text-2xl font-bold text-indigo-600 cursor-pointer">CourtX</h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/bookings">
                <Button variant="outline">My Bookings</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Venue Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{venue.name}</h1>
              <div className="flex items-center text-gray-600 mb-2">
                <MapPin className="h-5 w-5 mr-2" />
                {venue.location}
              </div>
              <div className="flex items-center">
                <div className="flex items-center text-yellow-600 mr-4">
                  <Star className="h-5 w-5 fill-current mr-1" />
                  <span className="font-semibold">{venue.rating ?? 4.7}</span>
                  <span className="text-gray-500 ml-1">({venue.reviewCount ?? 0} reviews)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(venue.sports || []).map((sport) => (
                    <Badge key={sport} variant="secondary">
                      {sport}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">Price Range</div>
              <div className="flex items-center text-gray-900">
              ₹{venue.priceRange.min} - ₹{venue.priceRange.max}/hour
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Images and Details */}
          <div className="lg:col-span-2">
            {/* Image */}
            <div className="mb-8">
              <div className="aspect-video rounded-lg overflow-hidden mb-4">
                <img
                  src={(venue.images && venue.images[0]) || "/placeholder.svg"}
                  alt={venue.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="about" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="amenities">Amenities</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="about" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>About {venue.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed">{venue.description}</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="amenities" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Amenities & Facilities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {(venue.amenities || []).map((amenity) => {
                        const IconComponent = amenityIcons[amenity] || Clock
                        return (
                          <div key={amenity} className="flex items-center space-x-3">
                            <IconComponent className="h-5 w-5 text-indigo-600" />
                            <span>{amenity}</span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Reviews</CardTitle>
                    <CardDescription>
                      {venue.reviewCount ?? 0} reviews with an average rating of {venue.rating ?? 4.7}/5
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-600">Reviews coming soon.</div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Booking */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Book this Venue</CardTitle>
                <CardDescription>Select a court, date and time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium mb-1">Court</div>
                    <select
                      value={selectedCourt}
                      onChange={(e) => setSelectedCourt(e.target.value)}
                      className="w-full border rounded px-2 py-2"
                    >
                      {courts.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name} {c.sport ? `(${c.sport})` : ""}
                        </option>
                      ))}
                    </select>
                    {courts.length === 0 && (
                      <div className="text-xs text-muted-foreground mt-1">No courts found for this venue.</div>
                    )}
                  </div>

                  <div>
                    <div className="text-sm font-medium mb-1">Date</div>
                    <input
                      type="date"
                      className="w-full border rounded px-2 py-2"
                      onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : null)}
                    />
                  </div>

                  {selectedDate && slots.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2">Available Time Slots</div>
                      <div className="grid grid-cols-2 gap-2">
                        {slots.filter((s) => s.isAvailable).map((s) => (
                          <Button key={s._id || s.time} variant="outline" onClick={() => router.push(`/booking/${venue!._id}/${selectedCourt}?date=${localDateString(selectedDate!)}&time=${s.time}`)}>
                            <div className="text-left">
                              <div className="font-semibold text-xs">{formatSlotRange(s.time)}</div>
                              <div className="text-xs">₹{s.price}{s.period ? ` · ${s.period}` : ""}</div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDate && slots.length === 0 && (
                    <div className="text-xs text-muted-foreground">No slots for selected date.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
