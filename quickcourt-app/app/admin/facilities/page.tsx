"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { AppContainer } from "@/components/app-container";

export default function AdminFacilitiesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== "admin") {
      router.push("/auth/login");
      return;
    }
    setLoading(true);
    fetch("/api/venues")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setVenues(Array.isArray(data) ? data : []))
      .catch(() => setVenues([]))
      .finally(() => setLoading(false));
  }, [user, router, authLoading]);

  const approveVenue = async (id: string) => {
    setLoading(true);
    const res = await fetch(`/api/venues/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    if (res.ok) {
      setVenues((prev) => prev.map((v) => (v._id === id ? { ...v, status: "approved" } : v)));
    }
    setLoading(false);
  };

  const deleteVenue = async (id: string) => {
    setLoading(true);
    const res = await fetch(`/api/venues/${id}`, { method: "DELETE" });
    if (res.ok) {
      setVenues((prev) => prev.filter((v) => v._id !== id));
    }
    setLoading(false);
  };

  return (
    <AppContainer className="py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Facility Approvals</h1>
        <Badge variant="outline">Admin</Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Min</TableHead>
            <TableHead>Max</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {venues.map((v) => (
            <TableRow key={v._id}>
              <TableCell className="font-medium">{v.name}</TableCell>
              <TableCell>{typeof v.owner === "object" && v.owner?.name ? v.owner.name : "Unknown"}</TableCell>
              <TableCell>{v.location}</TableCell>
              <TableCell>
                {v.status === "approved" ? (
                  <Badge variant="default">Approved</Badge>
                ) : (
                  <Badge variant="destructive">Pending</Badge>
                )}
              </TableCell>
              <TableCell>{v?.priceRange?.min}</TableCell>
              <TableCell>{v?.priceRange?.max}</TableCell>
              <TableCell className="whitespace-nowrap">
                <div className="inline-flex items-center gap-2">
                  {v.status !== "approved" && (
                    <Button size="sm" onClick={() => approveVenue(v._id)} disabled={loading}>
                      Approve
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => deleteVenue(v._id)} disabled={loading}>
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </AppContainer>
  );
}
