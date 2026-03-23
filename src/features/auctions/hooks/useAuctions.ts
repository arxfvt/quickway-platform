// TODO: Implement TanStack Query hooks for fetching auctions list and single auction
export function useAuctions() {
  return { auctions: [], isLoading: false }
}

export function useAuction(_id: string) {
  return { auction: null, isLoading: false }
}
