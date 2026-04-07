import { supabase } from '../lib/supabase'
import type { Bid } from '../types/bid.types'

// ─────────────────────────────────────────────────────────────────────────────
// Bids Service — Supabase queries
// ─────────────────────────────────────────────────────────────────────────────

/** Place a bid on a lot. Also updates lots.current_bid if bid is higher. */
export async function placeBid(lotId: string, bidderId: string, amount: number): Promise<Bid> {
  // Insert bid row
  const { data, error } = await supabase
    .from('bids')
    .insert({ lot_id: lotId, bidder_id: bidderId, amount })
    .select()
    .single()

  if (error) throw error

  // Update lot current_bid only if this bid is higher
  // (In production, use a Supabase Edge Function or DB trigger for atomicity)
  await supabase
    .from('lots')
    .update({ current_bid: amount })
    .eq('id', lotId)
    .lt('current_bid', amount)

  // Count total bids and always update bid_count
  const { count } = await supabase
    .from('bids')
    .select('*', { count: 'exact', head: true })
    .eq('lot_id', lotId)

  await supabase
    .from('lots')
    .update({ bid_count: count ?? 1 })
    .eq('id', lotId)

  return data as Bid
}

/** Get all bids for a lot, sorted newest first. */
export async function getBidsForLot(lotId: string): Promise<Bid[]> {
  const { data, error } = await supabase
    .from('bids')
    .select('*')
    .eq('lot_id', lotId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Bid[]
}

/** Get all bids placed by a bidder, sorted newest first. */
export async function getBidderBids(bidderId: string): Promise<Bid[]> {
  const { data, error } = await supabase
    .from('bids')
    .select('*')
    .eq('bidder_id', bidderId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Bid[]
}

/** Get top bid amount for a lot. Returns 0 if no bids. */
export async function getTopBid(lotId: string): Promise<number> {
  const { data } = await supabase
    .from('bids')
    .select('amount')
    .eq('lot_id', lotId)
    .order('amount', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data as { amount: number } | null)?.amount ?? 0
}
