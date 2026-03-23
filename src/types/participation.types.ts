export type ParticipationStatus =
  | 'unpaid'           // registered intent, no payment submitted
  | 'pending_review'   // bank transfer reference submitted, awaiting admin
  | 'approved'         // admin confirmed payment — bidder can bid
  | 'rejected'         // admin rejected, bidder must resubmit

export interface AuctionParticipation {
  id: string
  auction_id: string
  bidder_id: string
  payment_status: ParticipationStatus
  payment_method: 'bank_transfer'
  bank_transfer_ref: string | null
  bank_transfer_proof_url: string | null
  fee_amount: number
  currency: string
  submitted_at: string | null
  reviewed_at: string | null
  reviewer_id: string | null
  rejection_reason: string | null
  created_at: string
}
