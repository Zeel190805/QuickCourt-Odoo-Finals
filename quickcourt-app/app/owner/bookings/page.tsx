"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Venue { _id: string; name: string; owner: string }

interface BookingDTO {
  _id: string
  user: string
  venue: Venue | string
  court: { _id: string; name: string; sport: string } | string
  date: string
  time: string
  duration: number
  totalAmount: number
  status: "confirmed" | "cancelled"
  createdAt: string
}

export default function OwnerBookingsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [venues, setVenues] = useState<Venue[]>([])
  const [selectedVenueId, setSelectedVenueId] = useState<string>("all")
  const [bookings, setBookings] = useState<BookingDTO[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== "owner") {
      router.push("/auth/login")
      return
    }
    fetch("/api/venues")
      .then((r) => r.json())
      .then((data: Venue[]) => {
        const own = Array.isArray(data) ? data : []
        setVenues(own)
        if (own.length && selectedVenueId === "all") setSelectedVenueId("all")
      })
      .catch(() => setVenues([]))
  }, [user, authLoading, router])

  const load = async (venueId?: string) => {
    const qp = new URLSearchParams()
    if (venueId && venueId !== "all") qp.set("venue", venueId)
    const res = await fetch(`/api/bookings?${qp.toString()}`)
    const data = await res.json()
    setBookings(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== "owner") return
    void load(selectedVenueId)
  }, [user, authLoading, selectedVenueId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return bookings
    return bookings.filter((b) => {
      const venueName = typeof b.venue === "string" ? "" : (b.venue?.name || "")
      const courtName = typeof b.court === "string" ? "" : (b.court?.name || "")
      return (
        venueName.toLowerCase().includes(q) ||
        courtName.toLowerCase().includes(q) ||
        b.date.includes(q) ||
        b.time.includes(q) ||
        String(b.totalAmount).includes(q)
      )
    })
  }, [bookings, search])

  const cancelBooking = async (bookingId: string) => {
    const ok = window.confirm("Cancel this booking?")
    if (!ok) return
    await fetch("/api/bookings/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId, reason: "Owner cancellation" }) })
    // Refresh
    if (!user) return
    await load(selectedVenueId || undefined)
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold">View Bookings</h1>
          <p className="text-sm text-muted-foreground">Filter by venue and search by court/date/time</p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Search bookings..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
          <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All venues" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All venues</SelectItem>
              {venues.map((v) => (
                <SelectItem key={v._id} value={v._id}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Venue</TableHead>
              <TableHead>Court</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((b) => {
              const venueName = typeof b.venue === "string" ? "" : (b.venue?.name || "")
              const courtName = typeof b.court === "string" ? "" : (b.court?.name || "")
              return (
                <TableRow key={b._id}>
                  <TableCell className="font-medium">{venueName}</TableCell>
                  <TableCell>{courtName}</TableCell>
                  <TableCell>{b.date}</TableCell>
                  <TableCell>{b.time}</TableCell>
                  <TableCell>{b.duration}h</TableCell>
                                      <TableCell>₹{Number(b.totalAmount || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    {b.status === "confirmed" ? <Badge>Confirmed</Badge> : <Badge variant="secondary">Cancelled</Badge>}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {b.status === "confirmed" && (
                      <Button size="sm" variant="destructive" onClick={() => cancelBooking(b._id)}>Cancel</Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">No bookings found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

