"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, DollarSign, Users, Building, Clock, MapPin } from "lucide-react"
import Link from "next/link"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface DashboardStats {
  totalBookings: number
  activeCourts: number
  monthlyEarnings: number
  totalCustomers: number
  earningsGrowth?: string
  bookingGrowth?: string
  newCustomersThisMonth?: number
}

interface Booking {
  id: string
  customerName: string
  court: string
  sport: string
  venue: string
  date: string
  time: string
  duration: number
  amount: number
  status: "confirmed" | "cancelled"
}

export default function OwnerDashboard() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    activeCourts: 0,
    monthlyEarnings: 0,
    totalCustomers: 0,
  })
  const [recentBookings, setRecentBookings] = useState<Booking[]>([])
  const [bookingTrends, setBookingTrends] = useState<any[]>([])
  const [sportDistribution, setSportDistribution] = useState<any[]>([])
  const [peakHours, setPeakHours] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)



  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== "owner") {
      router.push("/auth/login")
      return
    }

    const fetchDashboardData = async () => {
      try {
        // Fetch stats
        const statsResponse = await fetch(`/api/owner/dashboard/stats`)
        const statsData = await statsResponse.json()
        
        if (statsResponse.ok) {
          setStats({
            totalBookings: statsData.totalBookings,
            activeCourts: statsData.activeCourts,
            monthlyEarnings: statsData.monthlyEarnings,
            totalCustomers: statsData.totalCustomers,
            earningsGrowth: statsData.earningsGrowth,
            bookingGrowth: statsData.bookingGrowth,
            newCustomersThisMonth: statsData.newCustomersThisMonth,
          })
        }

        // Fetch chart data and recent bookings
        const chartsResponse = await fetch(`/api/owner/dashboard/charts`)
        const chartsData = await chartsResponse.json()
        
        if (chartsResponse.ok) {
          setRecentBookings(chartsData.recentBookings || [])
          setBookingTrends(chartsData.bookingTrends || [])
          setSportDistribution(chartsData.sportDistribution || [])
          setPeakHours(chartsData.peakHours || [])
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [user, router, authLoading])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
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
              <Link href="/">
                <h1 className="text-2xl font-bold text-indigo-600 cursor-pointer">QuickCourt</h1>
              </Link>
              <Badge variant="secondary">Facility Owner</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.name}!</span>
              <Link href="/profile">
                <Button variant="outline">Profile</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h2>
          <p className="text-gray-600">Manage your sports facility and track performance</p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Link href="/owner/facilities">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <Building className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                <h3 className="font-semibold">Manage Facilities</h3>
              </CardContent>
            </Card>
          </Link>
          <Link href="/owner/courts">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <MapPin className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                <h3 className="font-semibold">Manage Courts</h3>
              </CardContent>
            </Card>
          </Link>
          <Link href="/owner/bookings">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <Calendar className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                <h3 className="font-semibold">View Bookings</h3>
              </CardContent>
            </Card>
          </Link>
          <Link href="/owner/timeslots">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <Clock className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                <h3 className="font-semibold">Time Slots</h3>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBookings}</div>
              <p className="text-xs text-muted-foreground">
                {stats.bookingGrowth ? `${stats.bookingGrowth} from last month` : 'No previous data'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Courts</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeCourts}</div>
              <p className="text-xs text-muted-foreground">All courts operational</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                              <div className="text-2xl font-bold">₹{stats.monthlyEarnings}</div>
              <p className="text-xs text-muted-foreground">
                {stats.earningsGrowth ? `${stats.earningsGrowth} from last month` : 'No previous data'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.newCustomersThisMonth ? `+${stats.newCustomersThisMonth} new this month` : 'No new customers'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Analytics */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Booking Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Trends</CardTitle>
              <CardDescription>Monthly bookings and earnings over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                {bookingTrends.length > 0 ? (
                  <LineChart data={bookingTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="bookings" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="earnings" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No booking data available</p>
                  </div>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Sport Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Sport Distribution</CardTitle>
              <CardDescription>Breakdown of bookings by sport type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                {sportDistribution.length > 0 ? (
                  <PieChart>
                    <Pie
                      data={sportDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {sportDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No sport distribution data available</p>
                  </div>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Peak Hours */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Peak Hours Analysis</CardTitle>
              <CardDescription>Booking frequency throughout the day</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                {peakHours.length > 0 ? (
                  <BarChart data={peakHours}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="bookings" fill="#8884d8" />
                  </BarChart>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No peak hours data available</p>
                  </div>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
            <CardDescription>Latest court reservations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentBookings.length > 0 ? (
                recentBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h4 className="font-semibold">{booking.customerName}</h4>
                        <p className="text-sm text-gray-600">
                          {booking.venue} • {booking.court} • {booking.sport}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-semibold">{new Date(booking.date).toLocaleDateString()}</p>
                        <p className="text-sm text-gray-600">
                          {booking.time} ({booking.duration}h)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-indigo-600">₹{booking.amount}</p>
                        <Badge variant={booking.status === "confirmed" ? "default" : "secondary"} className="text-xs">
                          {booking.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No recent bookings found</p>
                </div>
              )}
            </div>
            <div className="mt-6 text-center">
              <Link href="/owner/bookings">
                <Button variant="outline">View All Bookings</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
