import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────

interface LotChangePayload {
  id: string
  current_bid: number
  bid_count: number
}

interface UseLiveBidsOptions {
  /** Called when any lot in the auction is updated (e.g. new bid). */
  onLotChange?: (row: LotChangePayload) => void
  /** Called when a lot update is detected — use to refresh recent bids. */
  onBidInsert?: () => void
}

/**
 * Subscribe to real-time lot changes for a given auction.
 * Listens for UPDATE events on the `lots` table filtered by `auction_id`.
 * Returns `{ isConnected }` — all state lives in the parent component.
 */
export function useLiveBids(
  auctionId: string,
  { onLotChange, onBidInsert }: UseLiveBidsOptions = {}
) {
  const [isConnected, setIsConnected] = useState(false)

  // Stable refs so callbacks don't trigger re-subscription
  const onLotChangeRef = useRef(onLotChange)
  const onBidInsertRef = useRef(onBidInsert)
  useEffect(() => {
    onLotChangeRef.current = onLotChange
    onBidInsertRef.current = onBidInsert
  })

  useEffect(() => {
    if (!auctionId) return

    const channel = supabase
      .channel(`auction:${auctionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lots',
          filter: `auction_id=eq.${auctionId}`,
        },
        (payload) => {
          const row = payload.new as LotChangePayload
          onLotChangeRef.current?.(row)
          onBidInsertRef.current?.()
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [auctionId])

  return { isConnected }
}
