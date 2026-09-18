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

export type SlotPeriod = "day" | "night"

export const SLOT_DURATION_HOURS = 3
export const SLOT_START_HOURS = [0, 3, 6, 9, 12, 15, 18, 21] as const

export const DAY_START_HOUR = 6
export const DAY_END_HOUR = 18

export function periodForHour(hour: number): SlotPeriod {
  return hour >= DAY_START_HOUR && hour < DAY_END_HOUR ? "day" : "night"
}

export function periodForTime(time: string): SlotPeriod {
  const hour = Number(time.split(":")[0])
  return periodForHour(hour)
}

export function hourToTime(hour: number): string {
  return `${String(((hour % 24) + 24) % 24).padStart(2, "0")}:00`
}

export function periodLabel(period: SlotPeriod): string {
  return period === "day" ? "Day (6 AM – 6 PM)" : "Night (6 PM – 6 AM)"
}

export function isValidSlotTime(time: string): boolean {
  if (!isValidTime(time)) return false
  const [h, m] = time.split(":").map(Number)
  return m === 0 && (SLOT_START_HOURS as readonly number[]).includes(h)
}

export function slotBlockPrice(startHour: number, dayPrice: number, nightPrice: number): number {
  let total = 0
  for (let i = 0; i < SLOT_DURATION_HOURS; i++) {
    const period = periodForHour((startHour + i) % 24)
    total += period === "day" ? dayPrice : nightPrice
  }
  return total
}

export function formatSlotRange(startTime: string): string {
  const startHour = Number(startTime.split(":")[0])
  const endHour = (startHour + SLOT_DURATION_HOURS) % 24
  return `${hourToTime(startHour)} – ${hourToTime(endHour)}`
}

export function generateDaySlots(
  dayPrice: number,
  nightPrice: number
): Array<{ time: string; hour: number; period: SlotPeriod; price: number; durationHours: number }> {
  return SLOT_START_HOURS.map((hour) => {
    const period = periodForHour(hour)
    return {
      time: hourToTime(hour),
      hour,
      period,
      price: slotBlockPrice(hour, dayPrice, nightPrice),
      durationHours: SLOT_DURATION_HOURS,
    }
  })
}

export function consecutiveSlotTimes(startTime: string, slotCount: number): string[] {
  const startHour = Number(startTime.split(":")[0])
  const times: string[] = []
  for (let i = 0; i < slotCount; i++) {
    const hour = startHour + i * SLOT_DURATION_HOURS
    if (hour > 21) break
    times.push(hourToTime(hour))
  }
  return times
}

/** @deprecated use consecutiveSlotTimes for 3-hour blocks */
export function consecutiveHourTimes(startTime: string, durationHours: number): string[] {
  const slotCount = Math.ceil(durationHours / SLOT_DURATION_HOURS)
  return consecutiveSlotTimes(startTime, slotCount)
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
