"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Building, Calendar, DollarSign, TrendingUp, UserCheck, AlertCircle } from "lucide-react"
import Link from "next/link"
import { AnimatedLineChart, AnimatedAreaChart, AnimatedBarChart, AnimatedDonut } from "@/components/dashboard-charts"
import { Stagger, StaggerItem } from "@/components/motion"
import { AppContainer } from "@/components/app-container"
import { Logo } from "@/components/logo"

interface AdminStats {
  totalUsers: number
  totalOwners: number
  totalBookings: number
  totalCourts: number
  pendingApprovals: number
  monthlyRevenue: number
  userGrowth: Array<{ month: string; users: number; owners: number }>
  bookingActivity: Array<{ month: string; bookings: number }>
  sportPopularity: Array<{ name: string; value: number; color: string }>
  revenueData: Array<{ month: string; revenue: number }>
  recentVenues: Array<{
    id: string
    name: string
    location: string
    courtCount: number
    status: string
    ownerName: string
    createdAt: string
  }>
}

interface SystemAlert {
  type: 'warning' | 'info' | 'success'
  title: string
  message: string
  icon: string
}

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalOwners: 0,
    totalBookings: 0,
    totalCourts: 0,
    pendingApprovals: 0,
    monthlyRevenue: 0,
    userGrowth: [],
    bookingActivity: [],
    sportPopularity: [],
    revenueData: [],
    recentVenues: []
  })
  const [alerts, setAlerts] = useState<SystemAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== "admin") {
      router.push("/auth/login")
      return
    }

    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Fetch stats and alerts in parallel
        const [statsResponse, alertsResponse] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/admin/alerts')
        ])

        if (!statsResponse.ok) {
          throw new Error('Failed to fetch statistics')
        }

        if (!alertsResponse.ok) {
          throw new Error('Failed to fetch alerts')
        }

        const statsData = await statsResponse.json()
        const alertsData = await alertsResponse.json()

        setStats(statsData)
        setAlerts(alertsData.alerts || [])
      } catch (err) {
        console.error('Error fetching admin data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user, router, authLoading])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <AlertCircle className="h-16 w-16 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error Loading Dashboard</h2>
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
      <header className="bg-white shadow-sm border-b">
        <AppContainer>
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <Link href="/"><Logo size="sm" /></Link>
              <Badge variant="destructive">Admin</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.name}!</span>
              <Link href="/profile">
                <Button variant="outline">Profile</Button>
              </Link>
            </div>
          </div>
        </AppContainer>
      </header>

      <main className="py-6">
        <AppContainer>
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h2>
          <p className="text-gray-600">Monitor platform performance and manage operations</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Link href="/admin/facilities">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <Building className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                <h3 className="font-semibold">Facility Approvals</h3>
                {stats.pendingApprovals > 0 && (
                  <Badge variant="destructive" className="mt-1">
                    {stats.pendingApprovals} pending
                  </Badge>
                )}
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/users">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                <h3 className="font-semibold">User Management</h3>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/reports">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                <h3 className="font-semibold">Reports</h3>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/moderation">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <AlertCircle className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                <h3 className="font-semibold">Moderation</h3>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* KPI Cards */}
        <Stagger className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
          <StaggerItem>
            <Card className="border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
                <CardTitle className="text-xs font-medium truncate">Total Users</CardTitle>
                <Users className="h-4 w-4 text-indigo-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-bold">{stats.totalUsers}</div>
                <p className="text-[11px] text-muted-foreground truncate">Registered players</p>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
                <CardTitle className="text-xs font-medium truncate">Facility Owners</CardTitle>
                <UserCheck className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-bold">{stats.totalOwners}</div>
                <p className="text-[11px] text-muted-foreground truncate">Registered owners</p>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="border-l-4 border-l-sky-500 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
                <CardTitle className="text-xs font-medium truncate">Total Bookings</CardTitle>
                <Calendar className="h-4 w-4 text-sky-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-bold">{stats.totalBookings}</div>
                <p className="text-[11px] text-muted-foreground truncate">Confirmed bookings</p>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="border-l-4 border-l-violet-500 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
                <CardTitle className="text-xs font-medium truncate">Active Courts</CardTitle>
                <Building className="h-4 w-4 text-violet-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-bold">{stats.totalCourts}</div>
                <p className="text-[11px] text-muted-foreground truncate">Across all facilities</p>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
                <CardTitle className="text-xs font-medium truncate">Pending Approvals</CardTitle>
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-bold">{stats.pendingApprovals}</div>
                <p className="text-[11px] text-muted-foreground truncate">Facilities awaiting review</p>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="border-l-4 border-l-pink-500 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
                <CardTitle className="text-xs font-medium truncate">Monthly Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-pink-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-bold">₹{stats.monthlyRevenue.toLocaleString()}</div>
                <p className="text-[11px] text-muted-foreground truncate">Confirmed this month</p>
              </CardContent>
            </Card>
          </StaggerItem>
        </Stagger>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* User Growth */}
          <Card>
            <CardHeader>
              <CardTitle>User Growth</CardTitle>
              <CardDescription>Platform user and owner registration trends</CardDescription>
            </CardHeader>
            <CardContent>
              <AnimatedLineChart
                data={stats.userGrowth}
                xKey="month"
                series={[
                  { key: "users", label: "Users", color: "#6366f1" },
                  { key: "owners", label: "Owners", color: "#22c55e" },
                ]}
              />
            </CardContent>
          </Card>

          {/* Booking Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Activity</CardTitle>
              <CardDescription>Monthly booking volume across all facilities</CardDescription>
            </CardHeader>
            <CardContent>
              <AnimatedAreaChart
                data={stats.bookingActivity}
                xKey="month"
                series={[{ key: "bookings", label: "Bookings", color: "#6366f1" }]}
              />
            </CardContent>
          </Card>

          {/* Sport Popularity */}
          <Card>
            <CardHeader>
              <CardTitle>Sport Popularity</CardTitle>
              <CardDescription>Distribution of bookings by sport type</CardDescription>
            </CardHeader>
            <CardContent>
              <AnimatedDonut data={stats.sportPopularity} />
            </CardContent>
          </Card>

          {/* Revenue Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>Platform revenue growth over time</CardDescription>
            </CardHeader>
            <CardContent>
              <AnimatedBarChart
                data={stats.revenueData}
                xKey="month"
                bars={[{ key: "revenue", label: "Revenue", color: "#22c55e" }]}
                tooltipFormatter={(value) => [`₹${Number(value ?? 0).toLocaleString()}`, "Revenue"]}
              />
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Facility Approvals */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Facility Approvals</CardTitle>
              <CardDescription>Latest facility approval requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentVenues.length > 0 ? (
                  stats.recentVenues.map((venue) => (
                    <div key={venue.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">{venue.name}</h4>
                        <p className="text-sm text-gray-600">{venue.location} • {venue.courtCount} courts</p>
                        <p className="text-xs text-gray-500">Owner: {venue.ownerName}</p>
                      </div>
                      <Badge variant={venue.status === 'pending' ? 'outline' : 'default'}>
                        {venue.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No pending venue approvals
                  </div>
                )}
              </div>
              <div className="mt-4 text-center">
                <Link href="/admin/facilities">
                  <Button variant="outline">View All Requests</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* System Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>Important notifications and alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.length > 0 ? (
                  alerts.map((alert, index) => {
                    const getAlertStyles = () => {
                      switch (alert.type) {
                        case 'warning':
                          return 'bg-yellow-50 border-yellow-200 text-yellow-800';
                        case 'info':
                          return 'bg-blue-50 border-blue-200 text-blue-800';
                        case 'success':
                          return 'bg-green-50 border-green-200 text-green-800';
                        default:
                          return 'bg-gray-50 border-gray-200 text-gray-800';
                      }
                    };

                    const getIconColor = () => {
                      switch (alert.type) {
                        case 'warning':
                          return 'text-yellow-600';
                        case 'info':
                          return 'text-blue-600';
                        case 'success':
                          return 'text-green-600';
                        default:
                          return 'text-gray-600';
                      }
                    };

                    const getIcon = () => {
                      switch (alert.icon) {
                        case 'AlertCircle':
                          return <AlertCircle className={`h-5 w-5 ${getIconColor()} mt-0.5`} />;
                        case 'Users':
                          return <Users className={`h-5 w-5 ${getIconColor()} mt-0.5`} />;
                        case 'TrendingUp':
                          return <TrendingUp className={`h-5 w-5 ${getIconColor()} mt-0.5`} />;
                        default:
                          return <AlertCircle className={`h-5 w-5 ${getIconColor()} mt-0.5`} />;
                      }
                    };

                    return (
                      <div key={index} className={`flex items-start space-x-3 p-3 border rounded-lg ${getAlertStyles()}`}>
                        {getIcon()}
                        <div>
                          <h4 className="font-semibold">{alert.title}</h4>
                          <p className="text-sm opacity-80">{alert.message}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No system alerts at this time
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        </AppContainer>
      </main>
    </div>
  )
}
