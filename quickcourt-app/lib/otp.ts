import crypto from "node:crypto"
import bcrypt from "bcryptjs"
import { OTP } from "@/lib/db"

const OTP_TTL_MS = 5 * 60 * 1000
const MAX_ATTEMPTS = 5

export function generateCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0")
}

export async function issueOtp(email: string): Promise<string> {
  const normalized = String(email).toLowerCase().trim()
  const code = generateCode()
  const codeHash = await bcrypt.hash(code, 10)
  const expiresAt = new Date(Date.now() + OTP_TTL_MS)
  await OTP.findOneAndUpdate(
    { email: normalized },
    { email: normalized, codeHash, expiresAt, attempts: 0 },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
  return code
}

export async function verifyOtp(email: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const normalized = String(email).toLowerCase().trim()
  if (!/^\d{6}$/.test(String(code || ""))) {
    return { ok: false, error: "Enter the 6-digit code" }
  }

  const doc = await OTP.findOne({ email: normalized })
  if (!doc) return { ok: false, error: "No code found. Request a new one." }

  if (doc.expiresAt.getTime() < Date.now()) {
    await doc.deleteOne()
    return { ok: false, error: "Code expired. Request a new one." }
  }
  if (doc.attempts >= MAX_ATTEMPTS) {
    await doc.deleteOne()
    return { ok: false, error: "Too many attempts. Request a new one." }
  }

  const match = await bcrypt.compare(String(code), doc.codeHash)
  if (!match) {
    doc.attempts += 1
    await doc.save()
    return { ok: false, error: "Invalid code" }
  }

  await doc.deleteOne()
  return { ok: true }
}
