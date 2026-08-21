import { type NextRequest, NextResponse } from "next/server"
import { dbConnect, User } from "@/lib/db"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import crypto from "crypto"
import { jsonError, requireAuth } from "@/lib/api"

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp"])
const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"])
const MAX_SIZE = Number(process.env.MAX_FILE_SIZE || 5 * 1024 * 1024)

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (!auth.user) return auth.response
    await dbConnect()
    const formData = await request.formData()
    const file = formData.get("avatar")

    if (!(file instanceof File)) {
      return jsonError("Avatar file is required", 400)
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return jsonError("Only JPEG, PNG, and WebP images are allowed", 400)
    }

    if (file.size > MAX_SIZE) {
      return jsonError("File size must be less than 5MB", 400)
    }

    const ext = (file.name.split(".").pop() || "").toLowerCase()
    if (!ALLOWED_EXT.has(ext)) {
      return jsonError("Invalid file extension", 400)
    }

    const uploadsDir = join(process.cwd(), "public", "uploads", "avatars")
    await mkdir(uploadsDir, { recursive: true })

    const fileName = `avatar_${auth.user.id}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${ext}`
    const filePath = join(uploadsDir, fileName)
    if (!filePath.startsWith(uploadsDir)) {
      return jsonError("Invalid path", 400)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)
    const publicUrl = `/uploads/avatars/${fileName}`

    const updatedUser = await User.findByIdAndUpdate(auth.user.id, { avatar: publicUrl }, { new: true })
    if (!updatedUser) {
      return jsonError("User not found", 404)
    }

    return NextResponse.json({
      message: "Avatar uploaded successfully",
      avatar: publicUrl,
    })
  } catch {
    return jsonError("Failed to upload avatar", 500)
  }
}
