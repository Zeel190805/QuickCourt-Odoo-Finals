import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto"
import { jsonError, requireAuth } from "@/lib/api"

export const runtime = "nodejs"

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"])
const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"])
const MAX_SIZE = Number(process.env.MAX_FILE_SIZE || 5 * 1024 * 1024)
const MAX_FILES = 5

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["owner", "admin"])
    if (!auth.user) return auth.response

    const formData = await req.formData()
    const files = formData.getAll("files").filter((f): f is File => f instanceof File)

    if (files.length === 0) {
      return jsonError("No files uploaded", 400)
    }
    if (files.length > MAX_FILES) {
      return jsonError("Too many files", 400)
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads")
    await fs.mkdir(uploadDir, { recursive: true })

    const urls: string[] = []

    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return jsonError("Only JPEG, PNG, and WebP images are allowed", 400)
      }
      if (file.size > MAX_SIZE) {
        return jsonError("Each file must be less than 5MB", 400)
      }
      const ext = path.extname(file.name).toLowerCase()
      if (!ALLOWED_EXT.has(ext)) {
        return jsonError("Invalid file extension", 400)
      }
      const buffer = Buffer.from(await file.arrayBuffer())
      const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`
      const filePath = path.join(uploadDir, name)
      if (!filePath.startsWith(uploadDir)) {
        return jsonError("Invalid path", 400)
      }
      await fs.writeFile(filePath, buffer)
      urls.push(`/uploads/${name}`)
    }

    return NextResponse.json({ urls }, { status: 201 })
  } catch {
    return jsonError("Upload failed", 500)
  }
}
