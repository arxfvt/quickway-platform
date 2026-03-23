import { useState, useMemo, useEffect } from 'react'
import { Gavel, Trophy, TrendingDown, Calendar } from 'lucide-react'
import { getBidderBids } from '../../../services/bids.service'
import { supabase } from '../../../lib/supabase'
import type { Bid } from '../../../types/bid.types'
import type { Lot, Auction } from '../../../types/auction.types'
import { formatCurrency } from '../../../utils/currency'
import { formatDate } from '../../../utils/date'
import { useAuthStore } from '../../../store/authStore'
import { cn } from '../../../lib/utils'

// ─────────────────────────────────────────────────────────────────────────────

export default function BidderHistory() {
  const user = useAuthStore((s) => s.user)
  const BIDDER_ID = user?.id ?? 'user-019'

  const [auctionFilter, setAuctionFilter] = useState('all')
  const [myBids, setMyBids] = useState<Bid[]>([])
  const [lots, setLots] = useState<Lot[]>([])
  const [auctions, setAuctions] = useState<Auction[]>([])

  useEffect(() => {
    if (!user?.id) return
    getBidderBids(user.id).then((bids) => {
      setMyBids(bids)
      const lotIds = [...new Set(bids.map((b) => b.lot_id))]
      if (lotIds.length === 0) return
      supabase.from('lots').select('id, title, lot_number, auction_id, current_bid, status, winner_id')
        .in('id', lotIds)
        .then(({ data }) => {
          if (!data) return
          setLots(data as Lot[])
          const auctionIds = [...new Set(data.map((l: Lot) => l.auction_id))]
          if (auctionIds.length === 0) return
          supabase.from('auctions').select('id, title, auction_ref, image_url, currency, ends_at')
            .in('id', auctionIds)
            .then(({ data: aData }) => { if (aData) setAuctions(aData as Auction[]) })
            .catch(() => {})
        }).catch(() => {})
    }).catch(() => {})
  }, [user?.id])

  // Build enriched bid rows
  const enriched = useMemo(() => {
    return myBids.map((bid) => {
      const lot     = lots.find((l) => l.id === bid.lot_id)
      const auction = auctions.find((a) => a.id === lot?.auction_id)
      const isTopBid = lot?.current_bid === bid.amount
      const isWon    = lot?.winner_id === BIDDER_ID
      return { bid, lot, auction, isTopBid, isWon }
    }).filter((r) => r.lot && r.auction)
  }, [myBids, lots, auctions, BIDDER_ID])

  // Auction options for filter
  const auctionOptions = useMemo(() => {
    const ids = [...new Set(enriched.map((r) => r.auction!.id))]
    return ids.map((id) => auctions.find((a) => a.id === id)!).filter(Boolean)
  }, [enriched, auctions])

  const filtered = auctionFilter === 'all'
    ? enriched
    : enriched.filter((r) => r.auction?.id === auctionFilter)

  // Group by auction
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    for (const row of filtered) {
      const aid = row.auction!.id
      if (!map.has(aid)) map.set(aid, [])
      map.get(aid)!.push(row)
    }
    return map
  }, [filtered])

  const totalBids = enriched.length
  const totalWon  = enriched.filter((r) => r.isWon).length
  const totalWinning = enriched.filter((r) => r.isTopBid && !r.isWon && r.lot?.status === 'open').length

  return (
    <div className="p-6 max-w-[1000px] mx-auto">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bid History</h1>
          <p className="text-xs text-slate-500 mt-0.5">A private record of all your bids across auctions.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Bids',   value: totalBids,    icon: <Gavel size={15} className="text-brand" />,      bg: 'bg-brand-light' },
          { label: 'Winning Now',  value: totalWinning, icon: <TrendingDown size={15} className="text-amber" />, bg: 'bg-amber-light' },
          { label: 'Lots Won',     value: totalWon,     icon: <Trophy size={15} className="text-green-500" />,  bg: 'bg-green-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', s.bg)}>{s.icon}</div>
            <div>
              <p className="text-xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-3 mb-5">
        <label className="text-xs font-medium text-slate-600">Filter by Auction:</label>
        <select
          value={auctionFilter}
          onChange={(e) => setAuctionFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
        >
          <option value="all">All Auctions</option>
          {auctionOptions.map((a) => (
            <option key={a.id} value={a.id}>{a.title}</option>
          ))}
        </select>
      </div>

      {/* Grouped table */}
      {grouped.size === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          <Gavel size={36} strokeWidth={1} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium text-slate-600">No bids placed yet</p>
          <p className="text-xs mt-1">Register for an auction and start bidding.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Array.from(grouped.entries()).map(([auctionId, rows]) => {
            const auction = auctions.find((a) => a.id === auctionId)!
            return (
              <div key={auctionId} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Auction header */}
                <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50 border-b border-slate-100">
                  <img src={auction.image_url} alt={auction.title} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{auction.title}</p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Calendar size={9} />{auction.auction_ref}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0">{rows.length} bid{rows.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Bid rows */}
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-2.5">Lot</th>
                      <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-2.5 hidden md:table-cell">Time</th>
                      <th className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-2.5">Your Bid</th>
                      <th className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-2.5">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map(({ bid, lot, isTopBid, isWon }) => (
                      <tr key={bid.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3">
                          <p className="text-xs font-medium text-slate-800">
                            {lot ? `Lot ${lot.lot_number} — ${lot.title}` : 'Unknown Lot'}
                          </p>
                        </td>
                        <td className="px-3 py-3 hidden md:table-cell">
                          <p className="text-[10px] text-slate-400">{formatDate(bid.created_at)}</p>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <p className="text-xs font-bold font-tabular text-slate-800">
                            {formatCurrency(bid.amount, auction.currency, 'en-UG')}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {isWon ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                              <Trophy size={9} />Won
                            </span>
                          ) : isTopBid && lot?.status === 'open' ? (
                            <span className="text-[10px] font-semibold text-green-600">↑ Winning</span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400">Outbid</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
