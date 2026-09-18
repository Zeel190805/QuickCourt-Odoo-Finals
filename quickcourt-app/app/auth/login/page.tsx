"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { Loader2, CheckCircle, ArrowLeft, ShieldCheck } from "lucide-react"
import { AuthShell } from "@/components/auth-shell"

type Step = "email" | "password" | "otp"

const dashboardFor = (role?: string) =>
  role === "admin" ? "/admin/dashboard" : role === "owner" ? "/owner/dashboard" : "/"

export default function LoginPage() {
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { loginInit, login, verifyOtp } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const resetToEmail = () => {
    setStep("email")
    setPassword("")
    setCode("")
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const result = await loginInit(email)
      if (!result.ok) {
        toast({ title: "Sign in failed", description: result.error || "Try again", variant: "destructive" })
        return
      }
      if (result.method === "otp") {
        setStep("otp")
        toast({ title: "Code sent", description: "We emailed a 6-digit code to your inbox." })
      } else {
        setStep("password")
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const result = await login(email, password)
      if (result.ok) {
        toast({ title: "Login successful", description: "Welcome back to CourtX!" })
        router.replace(dashboardFor(result.role))
      } else if (result.otpRequired) {
        // Account was upgraded to owner/admin: switch to the code flow.
        const init = await loginInit(email)
        if (init.ok && init.method === "otp") {
          setStep("otp")
          toast({ title: "Code sent", description: "This account signs in with an email code." })
        } else {
          toast({ title: "Login failed", description: init.error || result.error, variant: "destructive" })
        }
      } else {
        toast({ title: "Login failed", description: result.error || "Invalid email or password", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const result = await verifyOtp(email, code)
      if (result.ok) {
        toast({ title: "Login successful", description: "Welcome back to CourtX!" })
        router.replace(dashboardFor(result.role))
      } else {
        toast({ title: "Verification failed", description: result.error || "Invalid code", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setIsLoading(true)
    try {
      const result = await loginInit(email)
      if (result.ok && result.method === "otp") {
        toast({ title: "Code resent", description: "Check your inbox for a fresh code." })
      } else {
        toast({ title: "Could not resend", description: result.error || "Try again", variant: "destructive" })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage bookings, venues, and your CourtX account.">
      <Card className="border-0 shadow-xl">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl">Sign in</CardTitle>
          <CardDescription>
            {step === "email" && "Enter your email to continue"}
            {step === "password" && "Enter your password to sign in"}
            {step === "otp" && "Enter the code we sent to your email"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Continue
              </Button>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="text-sm text-gray-600">{email}</div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  placeholder="Enter your password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Sign In
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={resetToEmail} disabled={isLoading}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Use a different email
              </Button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="text-sm text-gray-600">Code sent to {email}</div>
              <div>
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  autoFocus
                  placeholder="6-digit code"
                  className="tracking-widest text-center text-lg"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || code.length !== 6}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Verify & Sign In
              </Button>
              <div className="flex items-center justify-between">
                <Button type="button" variant="ghost" size="sm" onClick={resetToEmail} disabled={isLoading}>
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
                <Button type="button" variant="link" size="sm" onClick={handleResendOtp} disabled={isLoading}>
                  Resend code
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <Link href="/auth/signup" className="text-indigo-600 hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </AuthShell>
  )
}
