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
 * Formats a date string for display.
 * @example formatDate("2025-06-01T10:00:00Z") → "1 Jun 2025, 10:00"
 */
export function formatDate(dateString: string, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateString))
}
