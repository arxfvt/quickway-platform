// TODO: Subscribe to Supabase Realtime channel for a given auction ID.
// Updates biddingStore with incoming bid events.
export function useLiveBids(_auctionId: string) {
  return { bids: [], isConnected: false }
}
