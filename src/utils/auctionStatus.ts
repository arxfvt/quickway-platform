import type { Auction, AuctionStatus } from '../types/auction.types'

/**
 * The status a visitor should see. The database status is only changed when an
 * admin closes an auction, so a "live" auction whose closing date has passed
 * would keep showing as LIVE. Treat it as closed once ends_at is in the past,
 * and a scheduled auction as live once its start time has arrived.
 */
export function effectiveStatus(a: Pick<Auction, 'status' | 'starts_at' | 'ends_at'>, now = Date.now()): AuctionStatus {
  const ends = a.ends_at ? new Date(a.ends_at).getTime() : NaN
  const starts = a.starts_at ? new Date(a.starts_at).getTime() : NaN

  if ((a.status === 'live' || a.status === 'scheduled') && !Number.isNaN(ends) && ends <= now) return 'closed'
  if (a.status === 'scheduled' && !Number.isNaN(starts) && starts <= now) return 'live'
  return a.status
}

/** Return a copy of the auction with its status replaced by the effective one. */
export function withEffectiveStatus<T extends Auction>(a: T): T {
  const status = effectiveStatus(a)
  return status === a.status ? a : { ...a, status }
}

/** Short label for the participation fee — "Free to register" when there is no fee. */
export function entryLabel(fee: number, formatted: string): string {
  return fee > 0 ? `Entry fee: ${formatted}` : 'Free to register'
}
