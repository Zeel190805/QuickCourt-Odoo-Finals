import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
}

export function csvCell(value: unknown): string {
  const raw = value == null ? "" : String(value)
  const prefixed = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
  return `"${prefixed.replace(/"/g, '""')}"`
}
