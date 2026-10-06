/**
 * Returns seconds remaining until a target date.
 * Returns 0 if the target is in the past.
 */
export function secondsUntil(targetDate: string): number {
  return Math.max(0, Math.floor((new Date(targetDate).getTime() - Date.now()) / 1000))
}

/**
 * Formats a countdown in seconds as "HH:MM:SS".
 */
export function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

/**
 * Returns true when bid details should be hidden (auction is live or scheduled).
 * Bids are only revealed once the auction closes.
 */
export function isSealed(status: string): boolean {
  return status === 'live' || status === 'scheduled'
}

/**
 * Database timestamp → value for an <input type="datetime-local"> in the
 * admin's own timezone. (Slicing the ISO string would show UTC — 3 hours off
 * in Kampala.)
 */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * <input type="datetime-local"> value (admin's local time) → ISO timestamp
 * for the database. Returns undefined for an empty or invalid value.
 */
export function fromLocalInput(local: string | null | undefined): string | undefined {
  if (!local) return undefined
  const d = new Date(local)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

/**
 * Formats a date string for display.
 * @example formatDate("2025-06-01T10:00:00Z") → "1 Jun 2025, 10:00"
 */
export function formatDate(dateString: string | null | undefined, locale = 'en-GB'): string {
  if (!dateString) return '—'
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateString))
}
