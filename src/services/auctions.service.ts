import { supabase } from '../lib/supabase'
import type { Auction, AuctionStatus, Lot } from '../types/auction.types'

// ─────────────────────────────────────────────────────────────────────────────
// Auctions Service — Supabase queries
// ─────────────────────────────────────────────────────────────────────────────

export interface AuctionFilters {
  status?: AuctionStatus
  org_id?: string
  category?: string
}

/**
 * Fetch all auctions. Org name/location are joined and flattened to match the
 * flat Auction type (org_name, org_location).
 */
export async function getAuctions(filters?: AuctionFilters): Promise<Auction[]> {
  let query = supabase
    .from('auctions')
    .select('*, organizations ( name, location )')
    .order('created_at', { ascending: false })

  if (filters?.status)   query = query.eq('status',   filters.status)
  if (filters?.org_id)   query = query.eq('org_id',   filters.org_id)
  if (filters?.category) query = query.eq('category', filters.category)

  const { data, error } = await query
  if (error) throw error

  return (data ?? []).map((row: Record<string, unknown>) => {
    const org = row.organizations as { name: string; location: string } | null
    return { ...row, org_name: org?.name ?? '', org_location: org?.location ?? '', organizations: undefined } as Auction
  })
}

/** Fetch a single auction by id with org details. */
export async function getAuction(id: string): Promise<Auction | null> {
  const { data, error } = await supabase
    .from('auctions')
    .select('*, organizations ( name, location )')
    .eq('id', id)
    .single()

  if (error) return null
  const org = (data as Record<string, unknown>).organizations as { name: string; location: string } | null
  return { ...(data as Record<string, unknown>), org_name: org?.name ?? '', org_location: org?.location ?? '', organizations: undefined } as Auction
}

/** Fetch all lots for an auction ordered by lot_number. */
export async function getLots(auctionId: string): Promise<Lot[]> {
  const { data, error } = await supabase
    .from('lots')
    .select('*')
    .eq('auction_id', auctionId)
    .order('lot_number', { ascending: true })

  if (error) throw error
  return (data ?? []) as Lot[]
}

/** Create a new auction (org admin). Returns the created row. */
export async function createAuction(
  payload: Omit<Auction, 'id' | 'created_at' | 'org_name' | 'org_location' | 'current_bid' | 'bid_count'>
): Promise<Auction> {
  const { data, error } = await supabase
    .from('auctions')
    .insert(payload)
    .select('*, organizations ( name, location )')
    .single()

  if (error) throw error
  const org = (data as Record<string, unknown>).organizations as { name: string; location: string } | null
  return { ...(data as Record<string, unknown>), org_name: org?.name ?? '', org_location: org?.location ?? '', organizations: undefined } as Auction
}

/** Admin: update auction status. */
export async function updateAuctionStatus(id: string, status: AuctionStatus): Promise<void> {
  const { error } = await supabase.from('auctions').update({ status }).eq('id', id)
  if (error) throw error
}

/** Admin: create a lot for an auction. Returns the created row. */
export async function createLot(
  payload: Omit<Lot, 'id' | 'current_bid' | 'bid_count' | 'winner_id' | 'status'>
): Promise<Lot> {
  const { data, error } = await supabase
    .from('lots')
    .insert({ ...payload, current_bid: 0, bid_count: 0, winner_id: null, status: 'open' })
    .select('*')
    .single()

  if (error) throw error
  return data as Lot
}
