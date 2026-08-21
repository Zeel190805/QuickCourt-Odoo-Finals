import { NextRequest, NextResponse } from "next/server"
import { dbConnect, Alert } from "@/lib/db"
import { jsonError, requireAuth } from "@/lib/api"

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin"])
    if (!auth.user) return auth.response
    await dbConnect()
    const alerts = await Alert.find({}).sort({ createdAt: -1 }).lean()
    return NextResponse.json({ alerts })
  } catch {
    return jsonError("Failed to fetch alerts", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin"])
    if (!auth.user) return auth.response
    await dbConnect()
    const body = await request.json()
    const { type, title, message, category, priority, expiresAt } = body
    if (!type || !title || !message) {
      return jsonError("Missing required fields", 400)
    }
    if (!["warning", "info", "success", "error"].includes(type)) {
      return jsonError("Invalid alert type", 400)
    }
    const alert = await Alert.create({
      type,
      title: String(title).trim(),
      message: String(message).trim(),
      category: ["system", "security", "performance", "user"].includes(category) ? category : "system",
      priority: ["low", "medium", "high", "critical"].includes(priority) ? priority : "medium",
      isActive: true,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    })
    return NextResponse.json({ alert })
  } catch {
    return jsonError("Failed to create alert", 500)
  }
}
