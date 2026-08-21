import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"
import { AUTH_COOKIE } from "@/lib/auth"

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "")

const rules: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/owner", roles: ["owner"] },
  { prefix: "/bookings", roles: ["user", "owner", "admin"] },
  { prefix: "/profile", roles: ["user", "owner", "admin"] },
  { prefix: "/booking", roles: ["user", "owner", "admin"] },
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const rule = rules.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`))
  if (!rule) return NextResponse.next()

  const token = req.cookies.get(AUTH_COOKIE)?.value
  if (!token) {
    const url = req.nextUrl.clone()
    url.pathname = "/auth/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  try {
    const { payload } = await jwtVerify(token, secret())
    const role = payload.role as string
    const accountStatus = (payload.accountStatus as string) || "active"
    if (accountStatus !== "active" || !rule.roles.includes(role)) {
      const url = req.nextUrl.clone()
      url.pathname = "/"
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  } catch {
    const url = req.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }
}

export const config = {
  matcher: ["/admin/:path*", "/owner/:path*", "/bookings/:path*", "/profile/:path*", "/booking/:path*"],
}
