/** Neon Date objects and locale String(date) must never reach Postgres or day math. */
export function toIso(value: unknown, fallback = ''): string {
  if (value == null || value === '') return fallback
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? fallback : value.toISOString()
  }
  const raw = String(value)
  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
  return fallback
}

export function toDay(value: unknown): string {
  return toIso(value).slice(0, 10)
}
