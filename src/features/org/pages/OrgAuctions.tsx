import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Gavel, Radio, Package, Users, Clock, Loader2 } from 'lucide-react'
import { getAuctions } from '../../../services/auctions.service'
import { getAllParticipations } from '../../../services/participation.service'
import { formatDate } from '../../../utils/date'
import { useAuthStore } from '../../../store/authStore'
import { cn } from '../../../lib/utils'
import type { Auction, AuctionStatus } from '../../../types/auction.types'

// ─────────────────────────────────────────────────────────────────────────────

const ORG_ID = 'org-001'

const TABS: { label: string; value: AuctionStatus | 'all' }[] = [
  { label: 'All',       value: 'all' },
  { label: 'Live',      value: 'live' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Draft',     value: 'draft' },
  { label: 'Closed',    value: 'closed' },
]

const STATUS_CHIP: Record<string, string> = {
  live:       'bg-amber-light text-amber-dark',
  scheduled:  'bg-brand-light text-brand',
  draft:      'bg-slate-100 text-slate-500',
  closed:     'bg-slate-100 text-slate-400',
  cancelled:  'bg-red-50 text-red-400',
}

// ─────────────────────────────────────────────────────────────────────────────

export default function OrgAuctions() {
  const user = useAuthStore((s) => s.user)
  const orgId = user?.org_id ?? ORG_ID
  const [tab, setTab] = useState<AuctionStatus | 'all'>('all')
  const [allAuctions, setAllAuctions] = useState<Auction[]>([])
  const [participationMap, setParticipationMap] = useState<Map<string, number>>(new Map())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([getAuctions(), getAllParticipations()])
      .then(([auctions, participations]) => {
        setAllAuctions(auctions)
        const map = new Map<string, number>()
        participations
          .filter((p) => p.payment_status === 'approved')
          .forEach((p) => map.set(p.auction_id, (map.get(p.auction_id) ?? 0) + 1))
        setParticipationMap(map)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const orgAuctions = allAuctions.filter((a) => a.org_id === orgId)
  const filtered = tab === 'all' ? orgAuctions : orgAuctions.filter((a) => a.status === tab)

  const countFor = (s: AuctionStatus | 'all') =>
    s === 'all' ? orgAuctions.length : orgAuctions.filter((a) => a.status === s).length

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-brand" />
    </div>
  )

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Auctions</h1>
          <p className="text-xs text-slate-500 mt-0.5">{orgAuctions.length} auction{orgAuctions.length !== 1 ? 's' : ''} in your catalogue</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors',
              tab === t.value
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {t.label}
            <span className={cn(
              'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
              tab === t.value ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'
            )}>
              {countFor(t.value)}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          <Gavel size={36} strokeWidth={1} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium text-slate-600">No auctions in this category</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">Auction</th>
                <th className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-3">Status</th>
                <th className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-3 hidden md:table-cell">Lots</th>
                <th className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-3 hidden md:table-cell">Bidders</th>
                <th className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3 hidden lg:table-cell">Closes</th>
                <th className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((a) => {
                const participants = participationMap.get(a.id) ?? 0
                return (
                  <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <img src={a.image_url} alt={a.title} className="w-10 h-8 rounded-lg object-cover shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate max-w-[220px]">{a.title}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{a.auction_ref}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', STATUS_CHIP[a.status])}>
                        {a.status === 'live' ? (
                          <span className="flex items-center gap-1">
                            <Radio size={8} className="animate-pulse" />{a.status}
                          </span>
                        ) : a.status}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-center hidden md:table-cell">
                      <span className="flex items-center justify-center gap-1 text-xs text-slate-600">
                        <Package size={11} className="text-slate-400" />
                        {a.lot_count}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-center hidden md:table-cell">
                      <span className="flex items-center justify-center gap-1 text-xs text-slate-600">
                        <Users size={11} className="text-slate-400" />
                        {participants}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right hidden lg:table-cell">
                      <span className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                        <Clock size={9} />{formatDate(a.ends_at)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/auctions/${a.id}`} className="text-[10px] font-medium text-slate-500 hover:text-brand transition-colors">
                          View
                        </Link>
                        <Link to={`/org/bidders?auction=${a.id}`} className="text-[10px] font-medium text-brand hover:underline">
                          Bidders
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
