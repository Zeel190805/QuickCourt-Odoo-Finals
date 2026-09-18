export function resolveCourtRates(
  court: { dayPrice?: number; nightPrice?: number; basePricePerHour?: number } | null | undefined,
  venue?: { priceRange?: { min?: number; max?: number } } | null
): { dayPrice: number; nightPrice: number } {
  const venueDay = Number(venue?.priceRange?.min)
  const venueNight = Number(venue?.priceRange?.max)
  if (venueDay > 0 && venueNight > 0) {
    return { dayPrice: venueDay, nightPrice: venueNight }
  }
  const dayPrice = Number(court?.dayPrice ?? court?.basePricePerHour ?? 0)
  const nightPrice = Number(court?.nightPrice ?? court?.basePricePerHour ?? dayPrice)
  return { dayPrice, nightPrice }
}
