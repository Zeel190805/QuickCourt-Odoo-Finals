"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"

interface User {
  id: string
  name: string
  email: string
  role: "user" | "owner" | "admin"
  avatar?: string
  phone?: string
  location?: string
  bio?: string
  preferences?: {
    emailNotifications: boolean
    smsNotifications: boolean
    privacyLevel: "public" | "friends" | "private"
  }
  isVerified: boolean
  accountStatus?: "active" | "suspended" | "banned"
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  signup: (userData: { name: string; email: string; password: string; role?: string }) => Promise<{ ok: boolean; error?: string; email?: string }>
  logout: () => Promise<void>
  updateUser: (userData: User) => void
  refreshUser: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { credentials: "include" })
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false))
  }, [refreshUser])

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (response.ok) {
        setUser(data.user)
        return { ok: true }
      }
      return { ok: false, error: data.error || "Login failed" }
    } catch {
      return { ok: false, error: "Login failed" }
    }
  }

  const signup = async (userData: { name: string; email: string; password: string; role?: string }) => {
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      })
      const data = await response.json()
      if (response.ok) {
        return { ok: true, email: data.email || userData.email }
      }
      return { ok: false, error: data.error || "Signup failed" }
    } catch {
      return { ok: false, error: "Signup failed" }
    }
  }

  const updateUser = (userData: User) => {
    setUser(userData)
  }

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        updateUser,
        refreshUser,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
