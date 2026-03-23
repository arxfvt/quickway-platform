import { supabase } from '../lib/supabase'
import type { AuctionParticipation, ParticipationStatus } from '../types/participation.types'

// ─────────────────────────────────────────────────────────────────────────────
// Participation Service — Supabase queries
// ─────────────────────────────────────────────────────────────────────────────

/** Get a single participation row for a bidder + auction. */
export async function getParticipation(
  auctionId: string,
  bidderId: string
): Promise<AuctionParticipation | null> {
  const { data } = await supabase
    .from('auction_participations')
    .select('*')
    .eq('auction_id', auctionId)
    .eq('bidder_id', bidderId)
    .maybeSingle()

  return (data as AuctionParticipation | null) ?? null
}

/** Get all participation rows for a bidder (bidder dashboard / history). */
export async function getBidderParticipations(bidderId: string): Promise<AuctionParticipation[]> {
  const { data, error } = await supabase
    .from('auction_participations')
    .select('*')
    .eq('bidder_id', bidderId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as AuctionParticipation[]
}

/** Get all participations — admin use. Optionally filter by auction. */
export async function getAllParticipations(auctionId?: string): Promise<AuctionParticipation[]> {
  let query = supabase
    .from('auction_participations')
    .select('*')
    .order('created_at', { ascending: false })

  if (auctionId) query = query.eq('auction_id', auctionId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as AuctionParticipation[]
}

/**
 * Register for an auction — inserts a row with status 'unpaid'.
 * Idempotent: returns existing row if one exists.
 */
export async function registerForAuction(
  auctionId: string,
  bidderId: string,
  feeAmount: number,
  currency: string
): Promise<AuctionParticipation> {
  const existing = await getParticipation(auctionId, bidderId)
  if (existing) return existing

  const { data, error } = await supabase
    .from('auction_participations')
    .insert({ auction_id: auctionId, bidder_id: bidderId, payment_status: 'unpaid', payment_method: 'bank_transfer', fee_amount: feeAmount, currency })
    .select()
    .single()

  if (error) throw error
  return data as AuctionParticipation
}

/** Submit bank transfer reference — moves status to 'pending_review'. */
export async function submitBankTransferRef(participationId: string, ref: string): Promise<void> {
  const { error } = await supabase
    .from('auction_participations')
    .update({ bank_transfer_ref: ref, payment_status: 'pending_review', submitted_at: new Date().toISOString() })
    .eq('id', participationId)

  if (error) throw error
}

/** Admin: approve or reject a participation payment. */
export async function reviewParticipation(
  id: string,
  action: 'approved' | 'rejected',
  rejectionReason?: string
): Promise<void> {
  const { error } = await supabase
    .from('auction_participations')
    .update({
      payment_status:   action,
      reviewed_at:      new Date().toISOString(),
      rejection_reason: action === 'rejected' ? (rejectionReason ?? null) : null,
    })
    .eq('id', id)

  if (error) throw error
}

/** Get participations filtered by status (admin payment queue). */
export async function getParticipationsByStatus(status: ParticipationStatus): Promise<AuctionParticipation[]> {
  const { data, error } = await supabase
    .from('auction_participations')
    .select('*')
    .eq('payment_status', status)
    .order('submitted_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as AuctionParticipation[]
}
