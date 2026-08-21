"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TrendingUp, TrendingDown, DollarSign, Users, Calendar, Building, Download, Filter, BarChart3, PieChart, LineChart, Activity } from "lucide-react"
import Link from "next/link"
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"

interface ReportData {
  revenue: {
    total: number
    monthly: number
    growth: number
    trend: Array<{ month: string; revenue: number }>
  }
  bookings: {
    total: number
    monthly: number
    growth: number
    trend: Array<{ month: string; bookings: number }>
    bySport: Array<{ sport: string; count: number; percentage: number; color: string }>
    byVenue: Array<{ venue: string; count: number; revenue: number }>
  }
  users: {
    total: number
    monthly: number
    growth: number
    trend: Array<{ month: string; users: number; owners: number }>
    byRole: Array<{ role: string; count: number; percentage: number; color: string }>
  }
  venues: {
    total: number
    active: number
    pending: number
    byStatus: Array<{ status: string; count: number; percentage: number; color: string }>
    topPerformers: Array<{ venue: string; bookings: number; revenue: number; rating: number }>
  }
  topVenues: Array<{
    id: string
    name: string
    location: string
    totalBookings: number
    totalRevenue: number
    averageRating: number
    ownerName: string
  }>
  recentBookings: Array<{
    id: string
    venueName: string
    courtName: string
    userName: string
    date: string
    time: string
    amount: number
    status: string
  }>
}

export default function Reports() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [reportData, setReportData] = useState<ReportData>({
    revenue: { total: 0, monthly: 0, growth: 0, trend: [] },
    bookings: { total: 0, monthly: 0, growth: 0, trend: [], bySport: [], byVenue: [] },
    users: { total: 0, monthly: 0, growth: 0, trend: [], byRole: [] },
    venues: { total: 0, active: 0, pending: 0, byStatus: [], topPerformers: [] },
    topVenues: [],
    recentBookings: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState("30")
  const [reportType, setReportType] = useState("overview")

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== "admin") {
      router.push("/auth/login")
      return
    }

    fetchReportData()
  }, [user, router, timeRange, authLoading])

  const fetchReportData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/admin/reports?timeRange=${timeRange}`)
      if (!response.ok) {
        throw new Error('Failed to fetch report data')
      }

      const data = await response.json()
      setReportData(data)
    } catch (err) {
      console.error('Error fetching report data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load reports')
    } finally {
      setIsLoading(false)
    }
  }

  const exportReport = async (type: string) => {
    try {
      const response = await fetch(`/api/admin/reports/export?type=${type}&timeRange=${timeRange}`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to export report')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}-report-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Error exporting report:', err)
    }
  }

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />
    } else if (growth < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />
    }
    return null
  }

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return "text-green-600"
    if (growth < 0) return "text-red-600"
    return "text-gray-600"
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <h2 className="text-xl font-semibold mb-2">Error Loading Reports</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
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
              <Link href="/admin/dashboard">
                <h1 className="text-2xl font-bold text-indigo-600 cursor-pointer">QuickCourt</h1>
              </Link>
              <Badge variant="destructive">Admin</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.name}!</span>
              <Link href="/admin/dashboard">
                <Button variant="outline">Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h2>
              <p className="text-gray-600">Comprehensive platform insights and performance metrics</p>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => exportReport('bookings')}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{reportData.revenue.total.toLocaleString()}</div>
              <div className="flex items-center space-x-1">
                {getGrowthIcon(reportData.revenue.growth)}
                <p className={`text-xs ${getGrowthColor(reportData.revenue.growth)}`}>
                  {reportData.revenue.growth > 0 ? '+' : ''}{reportData.revenue.growth}% from last period
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.bookings.total.toLocaleString()}</div>
              <div className="flex items-center space-x-1">
                {getGrowthIcon(reportData.bookings.growth)}
                <p className={`text-xs ${getGrowthColor(reportData.bookings.growth)}`}>
                  {reportData.bookings.growth > 0 ? '+' : ''}{reportData.bookings.growth}% from last period
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.users.total.toLocaleString()}</div>
              <div className="flex items-center space-x-1">
                {getGrowthIcon(reportData.users.growth)}
                <p className={`text-xs ${getGrowthColor(reportData.users.growth)}`}>
                  {reportData.users.growth > 0 ? '+' : ''}{reportData.users.growth}% from last period
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Venues</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.venues.active}</div>
              <p className="text-xs text-muted-foreground">
                {reportData.venues.pending} pending approval
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={reportType} onValueChange={setReportType} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Platform revenue over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={reportData.revenue.trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`₹${Number(value ?? 0).toLocaleString()}`, "Revenue"]} />
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Booking Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Activity</CardTitle>
                <CardDescription>Monthly booking volume</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={reportData.bookings.trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="bookings" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Venues */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Venues</CardTitle>
                <CardDescription>Venues with highest bookings and revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Venue</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Bookings</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.topVenues.map((venue) => (
                      <TableRow key={venue.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{venue.name}</div>
                            <div className="text-sm text-gray-500">by {venue.ownerName}</div>
                          </div>
                        </TableCell>
                        <TableCell>{venue.location}</TableCell>
                        <TableCell>{venue.totalBookings}</TableCell>
                        <TableCell>₹{venue.totalRevenue.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{venue.averageRating.toFixed(1)} ⭐</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            {/* Revenue Analytics */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Venue</CardTitle>
                  <CardDescription>Top revenue generating venues</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={reportData.bookings.byVenue}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="venue" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`₹${Number(value ?? 0).toLocaleString()}`, "Revenue"]} />
                      <Bar dataKey="revenue" fill="#82ca9d" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monthly Revenue Breakdown</CardTitle>
                  <CardDescription>Revenue trends by month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={reportData.revenue.trend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`₹${Number(value ?? 0).toLocaleString()}`, "Revenue"]} />
                      <Bar dataKey="revenue" fill="#8884d8" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            {/* Booking Analytics */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Bookings by Sport</CardTitle>
                  <CardDescription>Distribution of bookings by sport type</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={reportData.bookings.bySport}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(props) => {
                          const payload = props as { sport?: string; percentage?: number }
                          return `${payload.sport ?? ""} ${payload.percentage ?? 0}%`
                        }}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {reportData.bookings.bySport.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Bookings</CardTitle>
                  <CardDescription>Latest booking activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData.recentBookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-semibold">{booking.venueName}</h4>
                          <p className="text-sm text-gray-600">{booking.courtName} • {booking.userName}</p>
                          <p className="text-xs text-gray-500">{booking.date} at {booking.time}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">₹{booking.amount}</div>
                          <Badge variant={booking.status === 'confirmed' ? 'default' : 'outline'}>
                            {booking.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            {/* User Analytics */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Growth</CardTitle>
                  <CardDescription>User and owner registration trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsLineChart data={reportData.users.trend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="users" stroke="#8884d8" strokeWidth={2} />
                      <Line type="monotone" dataKey="owners" stroke="#82ca9d" strokeWidth={2} />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Users by Role</CardTitle>
                  <CardDescription>Distribution of users by role</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={reportData.users.byRole}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(props) => {
                          const payload = props as { role?: string; percentage?: number }
                          return `${payload.role ?? ""} ${payload.percentage ?? 0}%`
                        }}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {reportData.users.byRole.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
