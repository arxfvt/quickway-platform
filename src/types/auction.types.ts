export type AuctionStatus = 'draft' | 'scheduled' | 'live' | 'closed' | 'cancelled'

export interface Auction {
  id: string
  org_id: string
  org_name: string
  org_location: string
  title: string
  description: string
  status: AuctionStatus
  starts_at: string
  ends_at: string
  participation_fee: number      // major currency units (e.g. 100000 UGX)
  currency: string               // 'UGX' | 'USD'
  category: string
  location: string
  image_url: string
  auction_ref: string
  lot_count: number
  current_bid: number            // highest bid across all lots (for display)
  bid_count: number              // total bids across all lots (for display)
  bank_details: string           // payment instructions shown to bidders
  created_at: string
}

export interface Lot {
  id: string
  auction_id: string
  lot_number: number
  title: string
  description: string
  image_url: string
  reserve_price: number
  current_bid: number
  bid_increment: number
  winner_id: string | null
  status: 'open' | 'sold' | 'unsold'
  specs: Record<string, string>
  bid_count: number
}
