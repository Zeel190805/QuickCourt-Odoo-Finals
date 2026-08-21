import { SignJWT, jwtVerify, type JWTPayload } from "jose"
import { NextRequest, NextResponse } from "next/server"

export const AUTH_COOKIE = "quickcourt_token"

export type UserRole = "user" | "owner" | "admin"
export type AccountStatus = "active" | "suspended" | "banned"

export interface SessionUser {
  id: string
  email: string
  role: UserRole
  accountStatus: AccountStatus
}

export interface PublicUser {
  id: string
  name: string
  email: string
  role: UserRole
  isVerified: boolean
  accountStatus: AccountStatus
  phone?: string
  location?: string
  avatar?: string
  bio?: string
  preferences?: {
    emailNotifications: boolean
    smsNotifications: boolean
    privacyLevel: "public" | "friends" | "private"
  }
  lastLogin?: string | null
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error("JWT_SECRET is not configured")
  }
  return new TextEncoder().encode(secret)
}

export async function signAuthToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    role: user.role,
    accountStatus: user.accountStatus,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret())
}

export async function verifyAuthToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payloadToSession(payload)
  } catch {
    return null
  }
}

function payloadToSession(payload: JWTPayload): SessionUser | null {
  const id = typeof payload.id === "string" ? payload.id : ""
  const email = typeof payload.email === "string" ? payload.email : ""
  const role = payload.role
  const accountStatus = (payload.accountStatus as AccountStatus) || "active"
  if (!id || !email) return null
  if (role !== "user" && role !== "owner" && role !== "admin") return null
  if (accountStatus !== "active" && accountStatus !== "suspended" && accountStatus !== "banned") return null
  return { id, email, role, accountStatus }
}

export function readTokenFromRequest(req: NextRequest): string | null {
  const cookie = req.cookies.get(AUTH_COOKIE)?.value
  if (cookie) return cookie
  const header = req.headers.get("authorization")
  if (header?.startsWith("Bearer ")) return header.slice(7)
  return null
}

export async function getSessionFromRequest(req: NextRequest): Promise<SessionUser | null> {
  const token = readTokenFromRequest(req)
  if (!token) return null
  return verifyAuthToken(token)
}

export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
}

export function toPublicUser(doc: {
  _id: unknown
  name: string
  email: string
  role: UserRole
  isVerified?: boolean
  accountStatus?: AccountStatus
  phone?: string
  location?: string
  avatar?: string
  bio?: string
  preferences?: PublicUser["preferences"]
  lastLogin?: Date | null
}): PublicUser {
  return {
    id: String(doc._id),
    name: doc.name,
    email: doc.email,
    role: doc.role,
    isVerified: Boolean(doc.isVerified),
    accountStatus: doc.accountStatus || "active",
    phone: doc.phone || "",
    location: doc.location || "",
    avatar: doc.avatar || "",
    bio: doc.bio || "",
    preferences: doc.preferences || {
      emailNotifications: true,
      smsNotifications: false,
      privacyLevel: "public",
    },
    lastLogin: doc.lastLogin ? doc.lastLogin.toISOString() : null,
  }
}
