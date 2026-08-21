const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function localDateString(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function localTimeString(date: Date = new Date()): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

export function parseLocalDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [y, m, d] = value.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null
  return date
}

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

export function formatBookingDate(dateStr: string): string {
  const date = parseLocalDate(dateStr)
  if (!date) return dateStr
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function monthRangeLocal(year: number, monthIndex: number): { start: string; end: string } {
  return {
    start: localDateString(new Date(year, monthIndex, 1)),
    end: localDateString(new Date(year, monthIndex + 1, 0)),
  }
}

export function lastNMonths(n: number): Array<{ year: number; month: number; label: string }> {
  const now = new Date()
  const out: Array<{ year: number; month: number; label: string }> = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: MONTH_LABELS[d.getMonth()] })
  }
  return out
}

export function consecutiveHourTimes(startTime: string, durationHours: number): string[] {
  const [h, m] = startTime.split(":").map(Number)
  const times: string[] = []
  for (let i = 0; i < durationHours; i++) {
    const hour = h + i
    if (hour > 23) break
    times.push(`${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")}`)
  }
  return times
}

export function bookingDateTime(dateStr: string, timeStr: string): Date | null {
  if (!isValidTime(timeStr)) return null
  const date = parseLocalDate(dateStr)
  if (!date) return null
  const [h, m] = timeStr.split(":").map(Number)
  date.setHours(h, m, 0, 0)
  return date
}

export function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
