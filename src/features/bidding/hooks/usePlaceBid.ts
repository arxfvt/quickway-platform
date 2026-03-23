// TODO: Submit a bid via Supabase Edge Function with optimistic UI update.
export function usePlaceBid() {
  return {
    placeBid: (_lotId: string, _amount: number) => Promise.resolve(),
    isPending: false,
  }
}
