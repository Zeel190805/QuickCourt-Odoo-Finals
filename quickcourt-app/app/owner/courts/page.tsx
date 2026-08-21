"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface VenueDTO {
  _id: string
  name: string
  owner: string
}

interface CourtDTO {
  _id: string
  venue: string
  name: string
  sport: string
  basePricePerHour: number
  isActive: boolean
  createdAt?: string
}

function CourtForm({ initial, onSubmit, loading }: { initial: Partial<CourtDTO>; onSubmit: (data: any) => Promise<void> | void; loading: boolean }) {
  const form = useForm({ defaultValues: initial })
  return (
    <Form {...(form as any)}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Court Name</FormLabel>
              <FormControl>
                <Input placeholder="Court 1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sport"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sport</FormLabel>
              <FormControl>
                <Input placeholder="Badminton / Tennis" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="basePricePerHour"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Base Price Per Hour</FormLabel>
              <FormControl>
                <Input type="number" min={0} step={1} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
        </div>
      </form>
    </Form>
  )
}

export default function OwnerCourtsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [venues, setVenues] = useState<VenueDTO[]>([])
  const [selectedVenueId, setSelectedVenueId] = useState<string>("")
  const [courts, setCourts] = useState<CourtDTO[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editCourt, setEditCourt] = useState<CourtDTO | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== "owner") {
      router.push("/auth/login")
      return
    }
    fetch("/api/venues")
      .then((r) => r.json())
      .then((data: VenueDTO[]) => {
        const own = Array.isArray(data) ? data : []
        setVenues(own)
        if (own.length && !selectedVenueId) setSelectedVenueId(own[0]._id)
      })
      .catch(() => setVenues([]))
  }, [user, authLoading, router])

  const loadCourts = async (venueId: string) => {
    if (!venueId) return
    const res = await fetch(`/api/courts?venue=${venueId}`)
    const list = await res.json()
    setCourts(Array.isArray(list) ? list : [])
  }

  useEffect(() => {
    if (selectedVenueId) void loadCourts(selectedVenueId)
  }, [selectedVenueId])

  const currentVenueName = useMemo(() => venues.find((v) => v._id === selectedVenueId)?.name || "", [venues, selectedVenueId])

  const handleCreateOrUpdate = async (data: any) => {
    if (!selectedVenueId) return
    setLoading(true)
    try {
      const price = Number(data.basePricePerHour)
      if (!Number.isFinite(price) || price <= 0) return
      const body = { ...data, venue: selectedVenueId, basePricePerHour: price }
      if (editCourt) {
        await fetch(`/api/courts/${editCourt._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      } else {
        await fetch("/api/courts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      }
      await loadCourts(selectedVenueId)
      setDialogOpen(false)
      setEditCourt(null)
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (court: CourtDTO) => {
    await fetch(`/api/courts/${court._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !court.isActive }) })
    await loadCourts(selectedVenueId)
  }

  const handleDelete = async (court: CourtDTO) => {
    const ok = window.confirm(`Delete ${court.name}?`)
    if (!ok) return
    await fetch(`/api/courts/${court._id}`, { method: "DELETE" })
    await loadCourts(selectedVenueId)
  }

  const ensureCourts = async () => {
    const count = Number(window.prompt("How many courts to ensure? If none exist, this will create them.", "4") || 0)
    if (!count || !selectedVenueId) return
    setLoading(true)
    try {
      const sport = courts[0]?.sport || "General"
      const basePricePerHour = courts[0]?.basePricePerHour || 0
      await fetch("/api/courts/ensure", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ venue: selectedVenueId, count, sport, basePricePerHour }) })
      await loadCourts(selectedVenueId)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Manage Courts</h1>
          <p className="text-sm text-muted-foreground">{currentVenueName ? `Venue: ${currentVenueName}` : "Select a venue"}</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select venue" />
            </SelectTrigger>
            <SelectContent>
              {venues.map((v) => (
                <SelectItem key={v._id} value={v._id}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="secondary" onClick={ensureCourts} disabled={!selectedVenueId || loading}>Ensure Courts</Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditCourt(null); setDialogOpen(true) }}>+ Add Court</Button>
            </DialogTrigger>
            <DialogContent>
              <h2 className="text-lg font-semibold mb-2">{editCourt ? "Edit Court" : "Add Court"}</h2>
              <CourtForm initial={editCourt || { name: "", sport: "", basePricePerHour: 0 }} onSubmit={handleCreateOrUpdate} loading={loading} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-card rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Sport</TableHead>
              <TableHead>Base Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courts.map((c) => (
              <TableRow key={c._id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.sport}</TableCell>
                                    <TableCell>₹{Number(c.basePricePerHour || 0).toFixed(2)}</TableCell>
                <TableCell>
                  {c.isActive ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditCourt(c); setDialogOpen(true) }}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => toggleActive(c)}>{c.isActive ? "Deactivate" : "Activate"}</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(c)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
            {courts.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">No courts found for this venue.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

