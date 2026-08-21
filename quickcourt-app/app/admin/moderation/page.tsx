"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Shield, AlertTriangle, Flag, Eye, CheckCircle, XCircle, Ban, MessageSquare, Users, Building, Calendar, Search, Filter, MoreHorizontal, Edit, Trash2, Send } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

interface Report {
  _id: string
  type: 'venue' | 'user' | 'booking' | 'content'
  reporter: {
    _id: string
    name: string
    email: string
  }
  reportedItem: {
    _id: string
    name: string
    type: string
  }
  reason: string
  description: string
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  createdAt: string
  updatedAt: string
  moderatorNotes?: string
  action?: string
}

interface Alert {
  _id: string
  type: 'warning' | 'info' | 'success' | 'error'
  title: string
  message: string
  category: 'system' | 'security' | 'performance' | 'user'
  priority: 'low' | 'medium' | 'high' | 'critical'
  isActive: boolean
  createdAt: string
  expiresAt?: string
}

interface ModerationStats {
  totalReports: number
  pendingReports: number
  resolvedReports: number
  activeAlerts: number
  bannedUsers: number
  suspendedVenues: number
  reportsByType: Array<{ type: string; count: number; percentage: number }>
  reportsByPriority: Array<{ priority: string; count: number; percentage: number }>
}

export default function Moderation() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [reports, setReports] = useState<Report[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [stats, setStats] = useState<ModerationStats>({
    totalReports: 0,
    pendingReports: 0,
    resolvedReports: 0,
    activeAlerts: 0,
    bannedUsers: 0,
    suspendedVenues: 0,
    reportsByType: [],
    reportsByPriority: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false)
  const [reportAction, setReportAction] = useState("")
  const [moderatorNotes, setModeratorNotes] = useState("")
  const [newAlert, setNewAlert] = useState({
    type: "warning" as 'warning' | 'info' | 'success' | 'error',
    title: "",
    message: "",
    category: "system" as 'system' | 'security' | 'performance' | 'user',
    priority: "medium" as 'low' | 'medium' | 'high' | 'critical'
  })

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== "admin") {
      router.push("/auth/login")
      return
    }

    fetchData()
  }, [user, router, authLoading])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const [reportsResponse, alertsResponse, statsResponse] = await Promise.all([
        fetch('/api/admin/moderation/reports'),
        fetch('/api/admin/moderation/alerts'),
        fetch('/api/admin/moderation/stats')
      ])

      if (!reportsResponse.ok) {
        throw new Error('Failed to fetch reports')
      }

      if (!alertsResponse.ok) {
        throw new Error('Failed to fetch alerts')
      }

      const reportsData = await reportsResponse.json()
      const alertsData = await alertsResponse.json()
      const statsData = await statsResponse.json()

      setReports(reportsData.reports || [])
      setAlerts(alertsData.alerts || [])
      setStats(statsData)
    } catch (err) {
      console.error('Error fetching moderation data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load moderation data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReportAction = async () => {
    if (!selectedReport) return

    try {
      const response = await fetch(`/api/admin/moderation/reports/${selectedReport._id}/action`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: reportAction,
          moderatorNotes,
          status: 'resolved'
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update report')
      }

      toast({
        title: "Success",
        description: "Report action applied successfully",
      })

      setIsReportDialogOpen(false)
      fetchData()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to apply action",
        variant: "destructive",
      })
    }
  }

  const handleUpdateReportStatus = async (reportId: string, status: string) => {
    try {
      const response = await fetch(`/api/admin/moderation/reports/${reportId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        throw new Error('Failed to update report status')
      }

      toast({
        title: "Success",
        description: "Report status updated successfully",
      })

      fetchData()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update status",
        variant: "destructive",
      })
    }
  }

  const handleCreateAlert = async () => {
    try {
      const response = await fetch('/api/admin/moderation/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAlert),
      })

      if (!response.ok) {
        throw new Error('Failed to create alert')
      }

      toast({
        title: "Success",
        description: "Alert created successfully",
      })

      setIsAlertDialogOpen(false)
      setNewAlert({
        type: "warning",
        title: "",
        message: "",
        category: "system",
        priority: "medium"
      })
      fetchData()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create alert",
        variant: "destructive",
      })
    }
  }

  const handleToggleAlert = async (alertId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/moderation/alerts/${alertId}/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      })

      if (!response.ok) {
        throw new Error('Failed to toggle alert')
      }

      toast({
        title: "Success",
        description: `Alert ${isActive ? 'activated' : 'deactivated'} successfully`,
      })

      fetchData()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to toggle alert",
        variant: "destructive",
      })
    }
  }

  const handleDeleteAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/admin/moderation/alerts/${alertId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete alert')
      }

      toast({
        title: "Success",
        description: "Alert deleted successfully",
      })

      fetchData()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete alert",
        variant: "destructive",
      })
    }
  }

  const openReportDialog = (report: Report) => {
    setSelectedReport(report)
    setReportAction("")
    setModeratorNotes("")
    setIsReportDialogOpen(true)
  }

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.reportedItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.reporter.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || report.status === statusFilter
    const matchesPriority = priorityFilter === "all" || report.priority === priorityFilter
    
    return matchesSearch && matchesStatus && matchesPriority
  })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'investigating': return 'bg-blue-100 text-blue-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      case 'dismissed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading moderation panel...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <h2 className="text-xl font-semibold mb-2">Error Loading Moderation</h2>
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
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Content Moderation</h2>
          <p className="text-gray-600">Manage reports, alerts, and platform safety</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
              <Flag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReports}</div>
              <p className="text-xs text-muted-foreground">{stats.pendingReports} pending review</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeAlerts}</div>
              <p className="text-xs text-muted-foreground">System notifications</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Banned Users</CardTitle>
              <Ban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.bannedUsers}</div>
              <p className="text-xs text-muted-foreground">Suspended accounts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suspended Venues</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.suspendedVenues}</div>
              <p className="text-xs text-muted-foreground">Under review</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="reports" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search reports..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="dismissed">Dismissed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Filter by priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Reports Table */}
            <Card>
              <CardHeader>
                <CardTitle>Reports ({filteredReports.length})</CardTitle>
                <CardDescription>User reports and content violations</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report</TableHead>
                      <TableHead>Reporter</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => (
                      <TableRow key={report._id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{report.reason}</div>
                            <div className="text-sm text-gray-500">{report.reportedItem.name}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{report.reporter.name}</div>
                            <div className="text-sm text-gray-500">{report.reporter.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{report.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(report.priority)}>
                            {report.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(report.status)}>
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-500">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openReportDialog(report)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Select
                              value={report.status}
                              onValueChange={(value) => handleUpdateReportStatus(report._id, value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="investigating">Investigating</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="dismissed">Dismissed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            {/* Alerts Header */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">System Alerts</h3>
                <p className="text-gray-600">Manage platform notifications and warnings</p>
              </div>
              <Button onClick={() => setIsAlertDialogOpen(true)}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Create Alert
              </Button>
            </div>

            {/* Alerts Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {alerts.map((alert) => (
                <Card key={alert._id} className={alert.isActive ? 'border-l-4 border-l-blue-500' : 'opacity-60'}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-sm">{alert.title}</CardTitle>
                        <CardDescription className="text-xs">{alert.category}</CardDescription>
                      </div>
                      <Badge className={getPriorityColor(alert.priority)}>
                        {alert.priority}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">{alert.message}</p>
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleAlert(alert._id, !alert.isActive)}
                        >
                          {alert.isActive ? <XCircle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Alert</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this alert? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteAlert(alert._id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Report Action Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
            <DialogDescription>
              Review and take action on this report
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Report Type</label>
                  <p className="text-sm text-gray-600">{selectedReport.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Badge className={getPriorityColor(selectedReport.priority)}>
                    {selectedReport.priority}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Reporter</label>
                  <p className="text-sm text-gray-600">{selectedReport.reporter.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Reported Item</label>
                  <p className="text-sm text-gray-600">{selectedReport.reportedItem.name}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Reason</label>
                <p className="text-sm text-gray-600">{selectedReport.reason}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <p className="text-sm text-gray-600">{selectedReport.description}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Action</label>
                <Select value={reportAction} onValueChange={setReportAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warn">Warn User</SelectItem>
                    <SelectItem value="suspend">Suspend Account</SelectItem>
                    <SelectItem value="ban">Ban User</SelectItem>
                    <SelectItem value="remove_content">Remove Content</SelectItem>
                    <SelectItem value="dismiss">Dismiss Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Moderator Notes</label>
                <Textarea
                  value={moderatorNotes}
                  onChange={(e) => setModeratorNotes(e.target.value)}
                  placeholder="Add notes about the action taken..."
                />
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReportAction} disabled={!reportAction}>
              Apply Action
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Alert Dialog */}
      <Dialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create System Alert</DialogTitle>
            <DialogDescription>
              Create a new system-wide alert or notification
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Alert Type</label>
              <Select value={newAlert.type} onValueChange={(value: 'warning' | 'info' | 'success' | 'error') => setNewAlert({ ...newAlert, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={newAlert.title}
                onChange={(e) => setNewAlert({ ...newAlert, title: e.target.value })}
                placeholder="Alert title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={newAlert.message}
                onChange={(e) => setNewAlert({ ...newAlert, message: e.target.value })}
                placeholder="Alert message"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={newAlert.category} onValueChange={(value: 'system' | 'security' | 'performance' | 'user') => setNewAlert({ ...newAlert, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select value={newAlert.priority} onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => setNewAlert({ ...newAlert, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsAlertDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAlert} disabled={!newAlert.title || !newAlert.message}>
              Create Alert
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
