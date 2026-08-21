"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Clock, Star, Users } from "lucide-react"
import Link from "next/link"

interface VenueApi {
  _id: string
  name: string
  description?: string
  location: string
  sports?: string[]
  priceRange: { min: number; max: number }
  rating?: number
  reviewCount?: number
  image?: string
  images?: string[]
  amenities?: string[]
  status: "approved" | "pending"
}

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [popularVenues, setPopularVenues] = useState<VenueApi[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (user) {
      // Redirect based on user role
      switch (user.role) {
        case "admin":
          router.push("/admin/dashboard")
          break
        case "owner":
          router.push("/owner/dashboard")
          break
        default:
          // Stay on home page for regular users
          break
      }
    }
  }, [user, router, authLoading])

  // Fetch approved venues for popular venues section
  useEffect(() => {
    setLoading(true)
    fetch("/api/venues")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: VenueApi[]) => {
        if (!Array.isArray(data)) return
        const approved = data.filter((v) => v.status === "approved").slice(0, 3)
        setPopularVenues(approved)
      })
      .catch(() => setPopularVenues([]))
      .finally(() => setLoading(false))
  }, [])

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-indigo-600">QuickCourt</h1>
              </div>
              <div className="flex space-x-4">
                <Link href="/auth/login">
                  <Button variant="outline">Login</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button>Sign Up</Button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Book Sports Facilities & Join Matches</h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Discover and book local sports facilities, connect with other players, and enjoy your favorite sports with
              QuickCourt.
            </p>
            <div className="flex justify-center space-x-4">
              <Link href="/auth/signup">
                <Button size="lg" className="px-8">
                  Get Started
                </Button>
              </Link>
              <Link href="/venues">
                <Button variant="outline" size="lg" className="px-8 bg-transparent">
                  Browse Venues
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-3xl font-bold text-center mb-12">Why Choose QuickCourt?</h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-8 w-8 text-indigo-600" />
                </div>
                <h4 className="text-xl font-semibold mb-2">Find Nearby Venues</h4>
                <p className="text-gray-600">
                  Discover sports facilities in your area with detailed information and reviews.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-indigo-600" />
                </div>
                <h4 className="text-xl font-semibold mb-2">Easy Booking</h4>
                <p className="text-gray-600">Book courts and time slots instantly with real-time availability.</p>
              </div>
              <div className="text-center">
                <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-indigo-600" />
                </div>
                <h4 className="text-xl font-semibold mb-2">Join Community</h4>
                <p className="text-gray-600">Connect with other players and join matches in your area.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-indigo-600">QuickCourt</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user.name}!</span>
              <Link href="/profile">
                <Button variant="outline">Profile</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-8 text-white mb-8">
          <h2 className="text-3xl font-bold mb-2">Ready to Play?</h2>
          <p className="text-lg mb-4">Find and book your favorite sports facilities</p>
          <Link href="/venues">
            <Button variant="secondary" size="lg">
              Browse Venues
            </Button>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Link href="/venues">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <MapPin className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                <h3 className="font-semibold">Find Venues</h3>
              </CardContent>
            </Card>
          </Link>
          <Link href="/bookings">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <Clock className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                <h3 className="font-semibold">My Bookings</h3>
              </CardContent>
            </Card>
          </Link>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
              <h3 className="font-semibold">Join Matches</h3>
            </CardContent>
          </Card>
          <Link href="/profile">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <Star className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                <h3 className="font-semibold">Profile</h3>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Popular Venues */}
        <section>
          <h3 className="text-2xl font-bold mb-6">Popular Venues</h3>
          {loading ? (
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-video bg-gray-200 rounded-t-lg"></div>
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : popularVenues.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {popularVenues.map((venue) => (
                <Card key={venue._id} className="hover:shadow-lg transition-shadow">
                  <div className="aspect-video relative overflow-hidden rounded-t-lg">
                    <img
                      src={(venue.images && venue.images[0]) || venue.image || "/placeholder.svg"}
                      alt={venue.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-start">
                      <span>{venue.name}</span>
                      <div className="flex items-center text-sm text-yellow-600">
                        <Star className="h-4 w-4 fill-current mr-1" />
                        {venue.rating ?? 4.5}
                      </div>
                    </CardTitle>
                    <CardDescription>
                      <div className="flex items-center text-gray-600 mb-2">
                        <MapPin className="h-4 w-4 mr-1" />
                        {venue.location}
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {(venue.sports || []).map((sport) => (
                          <span key={sport} className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded">
                            {sport}
                          </span>
                        ))}
                      </div>
                      <div className="text-lg font-semibold text-indigo-600">
                        From ₹{venue.priceRange?.min ?? 0}/hour
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/venues/${venue._id}`}>
                      <Button className="w-full">View Details</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No venues available yet.</p>
              <Link href="/venues">
                <Button>Browse All Venues</Button>
              </Link>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="col-span-2">
              <h3 className="text-2xl font-bold text-indigo-400 mb-4">QuickCourt</h3>
              <p className="text-gray-300 mb-4 max-w-md">
                Your premier platform for booking sports facilities and connecting with fellow sports enthusiasts. 
                Find, book, and play at the best venues in your area.
              </p>
              <div className="flex space-x-4">
                <div className="bg-indigo-600 p-2 rounded-full">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="bg-indigo-600 p-2 rounded-full">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="bg-indigo-600 p-2 rounded-full">
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/venues" className="text-gray-300 hover:text-indigo-400 transition-colors">
                    Browse Venues
                  </Link>
                </li>
                <li>
                  <Link href="/bookings" className="text-gray-300 hover:text-indigo-400 transition-colors">
                    My Bookings
                  </Link>
                </li>
                <li>
                  <Link href="/profile" className="text-gray-300 hover:text-indigo-400 transition-colors">
                    Profile
                  </Link>
                </li>
                <li>
                  <Link href="/auth/login" className="text-gray-300 hover:text-indigo-400 transition-colors">
                    Login
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-300 hover:text-indigo-400 transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-300 hover:text-indigo-400 transition-colors">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-300 hover:text-indigo-400 transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-300 hover:text-indigo-400 transition-colors">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 QuickCourt. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-indigo-400 transition-colors text-sm">
                Privacy
              </a>
              <a href="#" className="text-gray-400 hover:text-indigo-400 transition-colors text-sm">
                Terms
              </a>
              <a href="#" className="text-gray-400 hover:text-indigo-400 transition-colors text-sm">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
