import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Gavel, Radio, Package, Users, Clock, Search, ChevronDown, Plus, Loader2 } from 'lucide-react'
import { getAuctions } from '../../../services/auctions.service'
import { getOrganizations } from '../../../services/organizations.service'
import { getAllParticipations } from '../../../services/participation.service'
import { formatDate } from '../../../utils/date'
import { formatCurrency } from '../../../utils/currency'
import { cn } from '../../../lib/utils'
import type { Auction, AuctionStatus } from '../../../types/auction.types'

// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CHIP: Record<string, string> = {
  live:       'bg-amber-light text-amber-dark',
  scheduled:  'bg-brand-light text-brand',
  draft:      'bg-slate-100 text-slate-500',
  closed:     'bg-slate-100 text-slate-400',
  cancelled:  'bg-red-50 text-red-400',
}

const TABS: { label: string; value: AuctionStatus | 'all' }[] = [
  { label: 'All',       value: 'all' },
  { label: 'Live',      value: 'live' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Draft',     value: 'draft' },
  { label: 'Closed',    value: 'closed' },
]

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminAuctions() {
  const [tab, setTab]       = useState<AuctionStatus | 'all'>('all')
  const [query, setQuery]   = useState('')
  const [orgFilter, setOrgFilter] = useState('all')
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([])
  const [participationMap, setParticipationMap] = useState<Map<string, number>>(new Map())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([getAuctions(), getOrganizations(), getAllParticipations()])
      .then(([a, o, participations]) => {
        setAuctions(a)
        setOrgs(o)
        const map = new Map<string, number>()
        participations
          .filter((p) => p.payment_status === 'approved')
          .forEach((p) => map.set(p.auction_id, (map.get(p.auction_id) ?? 0) + 1))
        setParticipationMap(map)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return auctions.filter((a) => {
      const matchesTab = tab === 'all' || a.status === tab
      const matchesOrg = orgFilter === 'all' || a.org_id === orgFilter
      const q = query.toLowerCase()
      const matchesQuery = !q || a.title.toLowerCase().includes(q) || a.auction_ref.toLowerCase().includes(q)
      return matchesTab && matchesOrg && matchesQuery
    })
  }, [auctions, tab, query, orgFilter])

  const countFor = (s: AuctionStatus | 'all') =>
    s === 'all' ? auctions.length : auctions.filter((a) => a.status === s).length

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-brand" />
    </div>
  )

  return (
    <div className="p-6 max-w-[1300px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">All Auctions</h1>
          <p className="text-xs text-slate-500 mt-0.5">Global overview of every auction across all organisations.</p>
        </div>
        <Link
          to="/admin/auctions/new"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-brand text-white hover:bg-brand-dark transition-colors"
        >
          <Plus size={13} />
          New Auction
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-slate-200">
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title or ref…"
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
          />
        </div>

        <div className="relative">
          <select
            value={orgFilter}
            onChange={(e) => setOrgFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors cursor-pointer"
          >
            <option value="all">All Organisations</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <Gavel size={36} strokeWidth={1} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">No auctions found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">Auction</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-3 hidden lg:table-cell">Organisation</th>
                <th className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-3">Status</th>
                <th className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-3 hidden md:table-cell">Lots</th>
                <th className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-3 hidden md:table-cell">Bidders</th>
                <th className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-3 hidden md:table-cell">Entry Fee</th>
                <th className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3 hidden lg:table-cell">Closes</th>
                <th className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((a) => {
                const org = orgs.find((o) => o.id === a.org_id)
                const approvedBidders = participationMap.get(a.id) ?? 0
                return (
                  <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <img src={a.image_url} alt={a.title} className="w-10 h-8 rounded-lg object-cover shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate max-w-[200px]">{a.title}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{a.auction_ref}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 hidden lg:table-cell">
                      <p className="text-xs text-slate-600 truncate max-w-[160px]">{org?.name ?? a.org_id}</p>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', STATUS_CHIP[a.status])}>
                        {a.status === 'live' ? (
                          <span className="flex items-center gap-1">
                            <Radio size={7} className="animate-pulse" />{a.status}
                          </span>
                        ) : a.status}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-center hidden md:table-cell">
                      <span className="flex items-center justify-center gap-1 text-xs text-slate-600">
                        <Package size={11} className="text-slate-400" />{a.lot_count}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-center hidden md:table-cell">
                      <span className="flex items-center justify-center gap-1 text-xs text-slate-600">
                        <Users size={11} className="text-slate-400" />{approvedBidders}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right hidden md:table-cell">
                      <span className="text-xs font-semibold text-slate-600">
                        {formatCurrency(a.participation_fee, a.currency, 'en-UG')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right hidden lg:table-cell">
                      <span className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                        <Clock size={9} />{formatDate(a.ends_at)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/admin/auctions/${a.id}`}
                        className="text-[10px] font-medium text-brand hover:underline"
                      >
                        View
                      </Link>
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
