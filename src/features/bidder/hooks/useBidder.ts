// TODO: Implement TanStack Query hooks for bidder profile and bid history
export function useBidderProfile() {
  return { profile: null, isLoading: false }
}

export function useBidHistory() {
  return { bids: [], isLoading: false }
}
