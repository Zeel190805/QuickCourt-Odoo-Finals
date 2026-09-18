"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { AuthShell } from "@/components/auth-shell"
import { Loader2 } from "lucide-react"

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user",
  })
  const [isLoading, setIsLoading] = useState(false)
  const { signup } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" })
      return
    }
    if (formData.password.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters", variant: "destructive" })
      return
    }
    setIsLoading(true)
    try {
      const result = await signup({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      })
      if (result.ok) {
        toast({ title: "Account created", description: "You can now sign in with your password." })
        router.push("/auth/login")
      } else {
        toast({ title: "Signup failed", description: result.error || "Please try again", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell title="Join CourtX" subtitle="Create an account to book courts or list your sports facility on our platform.">
      <Card className="border-0 shadow-xl">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl">Create account</CardTitle>
          <CardDescription>Free to join · Book in minutes</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="Your name" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required placeholder="you@email.com" />
            </div>
            <div>
              <Label htmlFor="role">Account Type</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger><SelectValue placeholder="Select account type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Player — book facilities</SelectItem>
                  <SelectItem value="owner">Owner — list venues</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength={8} placeholder="Min. 8 characters" />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} required minLength={8} placeholder="Repeat password" />
            </div>
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Create Account"}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-indigo-600 hover:underline font-medium">Sign in</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </AuthShell>
  )
}
