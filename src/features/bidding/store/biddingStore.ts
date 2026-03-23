import { create } from 'zustand'
import type { Bid } from '../../../types/bid.types'

interface BiddingState {
  // lotId → current highest bid amount
  currentBids: Record<string, number>
  // lotId → recent bid history (last N bids)
  bidHistory: Record<string, Bid[]>
  updateBid: (lotId: string, bid: Bid) => void
}

export const useBiddingStore = create<BiddingState>((set) => ({
  currentBids: {},
  bidHistory: {},
  updateBid: (lotId, bid) =>
    set((s) => ({
      currentBids: { ...s.currentBids, [lotId]: bid.amount },
      bidHistory: {
        ...s.bidHistory,
        [lotId]: [bid, ...(s.bidHistory[lotId] ?? [])].slice(0, 50),
      },
    })),
}))
