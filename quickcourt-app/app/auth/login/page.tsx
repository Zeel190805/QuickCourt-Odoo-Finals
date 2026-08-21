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
import { Loader2, Mail, Shield, CheckCircle } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingOTP, setIsSendingOTP] = useState(false)
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [showPasswordField, setShowPasswordField] = useState(false)
  
  const { login } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // Send OTP
  const handleSendOTP = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address first",
        variant: "destructive",
      })
      return
    }

    setIsSendingOTP(true)
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setOtpSent(true)
        toast({
          title: "OTP Sent!",
          description: "Check your email for the 6-digit verification code",
        })
      } else {
        toast({
          title: "Failed to send OTP",
          description: data.error || "Something went wrong. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send OTP. Please check your internet connection.",
        variant: "destructive",
      })
    } finally {
      setIsSendingOTP(false)
    }
  }

  // Verify OTP
  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter a valid 6-digit OTP",
        variant: "destructive",
      })
      return
    }

    setIsVerifyingOTP(true)
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      })

      const data = await response.json()

      if (response.ok) {
        setOtpVerified(true)
        setShowPasswordField(true)
        toast({
          title: "OTP Verified!",
          description: "Your email has been verified. Please enter your password to continue.",
        })
      } else {
        toast({
          title: "OTP Verification Failed",
          description: data.error || "Invalid OTP. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify OTP. Please check your internet connection.",
        variant: "destructive",
      })
    } finally {
      setIsVerifyingOTP(false)
    }
  }

  // Handle final login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpVerified) {
      toast({
        title: "Error",
        description: "Please verify your OTP first",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const result = await login(email, password)
      if (result.ok) {
        toast({
          title: "Login successful",
          description: "Welcome back to QuickCourt!",
        })
        router.push("/")
      } else {
        toast({
          title: "Login failed",
          description: result.error || "Invalid email or password",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Reset form
  const handleReset = () => {
    setOtpSent(false)
    setOtpVerified(false)
    setShowPasswordField(false)
    setOtp("")
    setPassword("")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-indigo-600">QuickCourt</CardTitle>
          <CardDescription>
            {!otpSent ? "Enter your email to get started" : 
             !otpVerified ? "Enter the OTP sent to your email" : 
             "Enter your password to complete login"}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input - Always visible */}
            <div>
              <Label htmlFor="email">Email Address</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                  disabled={otpSent}
                  className="flex-1"
                />
                {!otpSent && (
                  <Button
                    type="button"
                    onClick={handleSendOTP}
                    disabled={isSendingOTP || !email}
                    variant="outline"
                    className="px-3"
                  >
                    {isSendingOTP ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* OTP Input - Visible after OTP is sent */}
            {otpSent && !otpVerified && (
              <div>
                <Label htmlFor="otp">Verification Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    className="text-center text-lg font-mono tracking-widest"
                  />
                  <Button
                    type="button"
                    onClick={handleVerifyOTP}
                    disabled={isVerifyingOTP || otp.length !== 6}
                    className="px-3"
                  >
                    {isVerifyingOTP ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Shield className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter the 6-digit code sent to {email}
                </p>
              </div>
            )}

            {/* Password Input - Visible after OTP verification */}
            {showPasswordField && (
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              {showPasswordField ? (
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Sign In
                    </>
                  )}
                </Button>
              ) : otpVerified ? (
                <Button type="button" className="w-full" onClick={() => setShowPasswordField(true)}>
                  Continue to Login
                </Button>
              ) : null}

              {/* Reset/Back Button */}
              {otpSent && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleReset}
                >
                  Start Over
                </Button>
              )}
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link href="/auth/signup" className="text-indigo-600 hover:underline">
                Sign up
              </Link>
            </p>
          </div>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">Demo Credentials:</h4>
            <div className="text-xs space-y-1">
              <p>
                <strong>User:</strong> zeelbarvaliya19@gmail.com / zeel123
              </p>
              <p>
                <strong>Owner:</strong> owner@demo.com / owner123
              </p>
              <p>
                <strong>Admin:</strong> admin@demo.com / admin123
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
