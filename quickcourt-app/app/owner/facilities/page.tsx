"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";

function VenueForm({ initial, onSubmit, loading }: any) {
  const form = useForm({ defaultValues: initial });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField name="name" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl><Input {...field} required /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField name="description" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl><Textarea {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField name="location" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Location</FormLabel>
            <FormControl><Input {...field} required /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField name="sportsText" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Sports (comma-separated)</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Badminton, Tennis, Squash" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField name="numCourts" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Number of Courts</FormLabel>
            <FormControl>
              <Input type="number" min={1} {...field} required />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField name="priceRange.min" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Min Price</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} required onChange={(e) => field.onChange(e.target.value)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField name="priceRange.max" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Max Price</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} required onChange={(e) => field.onChange(e.target.value)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <p className="text-xs text-muted-foreground">New venues are created as Pending. They become visible to users after admin approval.</p>
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
      </form>
    </Form>
  );
}

export default function FacilitiesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editVenue, setEditVenue] = useState<any>(null);
  const [imagesDialog, setImagesDialog] = useState<{ open: boolean; venue: any | null }>({ open: false, venue: null });
  const [uploading, setUploading] = useState(false);

  // Fetch venues for this owner
  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "owner") {
      router.push("/auth/login");
      return;
    }
    setLoading(true);
    fetch("/api/venues")
      .then((res) => res.json())
      .then((data) => {
        setVenues(Array.isArray(data) ? data : []);
      })
      .catch(() => setVenues([]))
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  const parseSports = (sportsText: string | undefined) => {
    return String(sportsText || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  // Create or update venue
  const handleSubmit = async (data: any) => {
    if (!user) return;
    setLoading(true);
    const method = editVenue ? "PUT" : "POST";
    const url = editVenue ? `/api/venues/${editVenue._id}` : "/api/venues";

    // Coerce nested priceRange values to numbers and build sports array
    const normalized: any = {
      ...data,
      priceRange: {
        min: Number(data?.priceRange?.min ?? 0),
        max: Number(data?.priceRange?.max ?? 0),
      },
      sports: parseSports(data?.sportsText),
      numCourts: Number(data?.numCourts ?? 1),
    };
    delete normalized.sportsText;

    const ownerId = (user as any).id || (user as any)._id;
    const body = editVenue ? normalized : { ...normalized, owner: ownerId, status: "pending", images: [] };

    let venueId = editVenue ? editVenue._id : null;
    let createdVenue = null;
    if (method === "POST") {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      createdVenue = await res.json();
      venueId = createdVenue._id;
    } else {
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    // If new venue and numCourts specified, create courts
    if (method === "POST" && venueId && normalized.numCourts > 0) {
      const sport = normalized.sports[0] || "General";
      // Use ensure endpoint for atomic creation and venue.courtCount update
      await fetch('/api/courts/ensure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue: venueId,
          count: normalized.numCourts,
          sport,
          basePricePerHour: normalized.priceRange.min || 0,
        }),
      })
    }

    setDialogOpen(false);
    setEditVenue(null);
    // Refresh venues
    fetch("/api/venues")
      .then(res => res.json())
      .then(data => setVenues(data.filter((v: any) => String(v.owner) === String(ownerId))))
      .finally(() => setLoading(false));
  };

  // Delete venue
  const handleDelete = async (id: string) => {
    setLoading(true);
    await fetch(`/api/venues/${id}`, { method: "DELETE" }).catch(() => {});
    setVenues(venues.filter((v: any) => v._id !== id));
    setLoading(false);
  };

  const uploadImages = async (venue: any, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const form = new FormData();
    // Limit to 3 files
    Array.from(files)
      .slice(0, 3)
      .forEach((file) => form.append("files", file));

    const uploadRes = await fetch("/api/uploads", { method: "POST", body: form });
    const { urls } = await uploadRes.json();

    const nextImages = Array.from(new Set([...(venue.images || []), ...urls])).slice(0, 3);

    await fetch(`/api/venues/${venue._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: nextImages }),
    });

    // Refresh local state
    setVenues((prev) => prev.map((v) => (v._id === venue._id ? { ...v, images: nextImages } : v)));
    setUploading(false);
  };

  const removeImage = async (venue: any, imageUrl: string) => {
    const nextImages = (venue.images || []).filter((u: string) => u !== imageUrl);
    await fetch(`/api/venues/${venue._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: nextImages }),
    });
    setVenues((prev) => prev.map((v) => (v._id === venue._id ? { ...v, images: nextImages } : v)));
  };

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Facilities</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditVenue(null); setDialogOpen(true); }}>+ Add Venue</Button>
          </DialogTrigger>
          <DialogContent>
            <h2 className="text-xl font-semibold mb-4">{editVenue ? "Edit Venue" : "Add Venue"}</h2>
            <VenueForm
              initial={editVenue ? { ...editVenue, sportsText: (editVenue?.sports || []).join(", ") } : { name: "", description: "", location: "", sportsText: "", numCourts: 1, priceRange: { min: 0, max: 0 } }}
              onSubmit={handleSubmit}
              loading={loading}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Images Dialog */}
      <Dialog open={imagesDialog.open} onOpenChange={(open) => setImagesDialog({ open, venue: open ? imagesDialog.venue : null })}>
        <DialogContent>
          <h2 className="text-lg font-semibold mb-2">Manage Photos</h2>
          {imagesDialog.venue && (
            <div className="space-y-4">
              <div className="flex gap-2">
                {(imagesDialog.venue.images || []).map((u: string) => (
                  <div key={u} className="relative">
                    <img src={u} className="w-24 h-24 object-cover rounded" />
                    <Button size="sm" variant="destructive" className="absolute -top-2 -right-2" onClick={() => removeImage(imagesDialog.venue, u)}>X</Button>
                  </div>
                ))}
              </div>
              <div>
                <input type="file" accept="image/*" multiple onChange={(e) => uploadImages(imagesDialog.venue, e.target.files)} />
                <p className="text-xs text-muted-foreground mt-1">Upload up to 3 images.</p>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setImagesDialog({ open: false, venue: null })} disabled={uploading}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Table>
        <TableCaption>Your venues</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Photos</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Sports</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Min</TableHead>
            <TableHead>Max</TableHead>
            <TableHead>Courts</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {venues.map((venue: any) => (
            <TableRow key={venue._id}>
              <TableCell>
                <div className="flex gap-1">
                  {(venue.images || []).slice(0, 3).map((u: string) => (
                    <img key={u} src={u} className="w-12 h-12 object-cover rounded" />
                  ))}
                  <Button size="sm" variant="outline" onClick={() => setImagesDialog({ open: true, venue })}>Manage</Button>
                </div>
              </TableCell>
              <TableCell className="font-medium">{venue.name}</TableCell>
              <TableCell>{venue.description}</TableCell>
              <TableCell>{venue.location}</TableCell>
              <TableCell>
                {(venue?.sports || []).length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {(venue.sports as string[]).map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">No sports listed</span>
                )}
              </TableCell>
              <TableCell>
                {venue.status === "approved" ? (
                  <Badge variant="default">Approved</Badge>
                ) : (
                  <Badge variant="outline">Pending</Badge>
                )}
              </TableCell>
              <TableCell>{venue?.priceRange?.min}</TableCell>
              <TableCell>{venue?.priceRange?.max}</TableCell>
              <TableCell>
                <span className="text-sm">Courts: {venue?.courtCount ?? 0}</span>
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => { setEditVenue(venue); setDialogOpen(true); }}>Edit</Button>
                <Button size="sm" variant="destructive" className="ml-2" onClick={() => handleDelete(venue._id)}>Delete</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
