import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Gavel, Users, Package, Ticket, ChevronRight, Radio, Clock, Loader2 } from 'lucide-react'
import { getAuctions } from '../../../services/auctions.service'
import { getAllParticipations } from '../../../services/participation.service'
import { formatCurrency } from '../../../utils/currency'
import { formatDate } from '../../../utils/date'
import { useAuthStore } from '../../../store/authStore'
import { cn } from '../../../lib/utils'
import type { Auction } from '../../../types/auction.types'
import type { AuctionParticipation } from '../../../types/participation.types'

// ─────────────────────────────────────────────────────────────────────────────
// For dev: use org-001 as the mock org admin's org
const ORG_ID = 'org-001'
const ORG_CURRENCY = 'UGX'

const STATUS_CHIP: Record<string, string> = {
  live:       'bg-amber-light text-amber-dark',
  scheduled:  'bg-brand-light text-brand',
  draft:      'bg-slate-100 text-slate-500',
  closed:     'bg-slate-100 text-slate-400',
  cancelled:  'bg-red-50 text-red-400',
}

// ─────────────────────────────────────────────────────────────────────────────

export default function OrgDashboard() {
  const user = useAuthStore((s) => s.user)
  const orgId = user?.org_id ?? ORG_ID

  const [allAuctions, setAllAuctions] = useState<Auction[]>([])
  const [allParticipations, setAllParticipations] = useState<AuctionParticipation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([getAuctions(), getAllParticipations()])
      .then(([a, p]) => { setAllAuctions(a); setAllParticipations(p) })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const orgAuctions = allAuctions.filter((a) => a.org_id === orgId)
  const totalLots   = orgAuctions.reduce((sum, a) => sum + a.lot_count, 0)

  const orgAuctionIds = new Set(orgAuctions.map((a) => a.id))
  const orgParticipations = allParticipations.filter((p) => orgAuctionIds.has(p.auction_id))
  const approvedCount     = orgParticipations.filter((p) => p.payment_status === 'approved').length
  const pendingCount      = orgParticipations.filter((p) => p.payment_status === 'pending_review').length
  const feeRevenue        = orgParticipations
    .filter((p) => p.payment_status === 'approved')
    .reduce((sum, p) => sum + p.fee_amount, 0)

  const recentAuctions = [...orgAuctions]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const statusCounts = {
    live:      orgAuctions.filter((a) => a.status === 'live').length,
    scheduled: orgAuctions.filter((a) => a.status === 'scheduled').length,
    closed:    orgAuctions.filter((a) => a.status === 'closed').length,
    draft:     orgAuctions.filter((a) => a.status === 'draft').length,
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-brand" />
    </div>
  )

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Organisation Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Overview of your auctions and participants.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Auctions',  value: orgAuctions.length,                    icon: <Gavel size={16} className="text-brand" />,       bg: 'bg-brand-light' },
          { label: 'Total Lots',      value: totalLots,                              icon: <Package size={16} className="text-slate-500" />, bg: 'bg-slate-50' },
          { label: 'Participants',    value: approvedCount,                          icon: <Users size={16} className="text-green-500" />,   bg: 'bg-green-50' },
          { label: 'Fee Revenue',     value: formatCurrency(feeRevenue, ORG_CURRENCY, 'en-UG'), icon: <Ticket size={16} className="text-amber" />,     bg: 'bg-amber-light' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', s.bg)}>{s.icon}</div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-slate-900 truncate">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Status summary strip */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {(Object.entries(statusCounts) as [string, number][]).map(([status, count]) => (
          <span key={status} className={cn('text-[11px] font-semibold px-3 py-1 rounded-full', STATUS_CHIP[status])}>
            {count} {status}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent auctions table — 2/3 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">My Auctions</h2>
              <Link to="/org/auctions" className="flex items-center gap-1 text-xs text-brand hover:underline">
                View all <ChevronRight size={12} />
              </Link>
            </div>
            {recentAuctions.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Gavel size={32} strokeWidth={1} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium text-slate-600">No auctions yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentAuctions.map((a) => {
                  const lots = a.lot_count
                  const participants = orgParticipations.filter((p) => p.auction_id === a.id && p.payment_status === 'approved').length
                  return (
                    <div key={a.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                      <img src={a.image_url} alt={a.title} className="w-10 h-8 rounded-lg object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{a.title}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{a.auction_ref}</p>
                      </div>
                      <span className={cn('shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full', STATUS_CHIP[a.status])}>
                        {a.status}
                      </span>
                      <div className="text-right shrink-0 hidden sm:block">
                        <p className="text-[10px] text-slate-400">{lots} lots · {participants} bidders</p>
                        {a.status === 'live' ? (
                          <span className="text-[10px] text-amber-dark flex items-center gap-1 justify-end">
                            <Radio size={9} className="animate-pulse" />Live
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
                            <Clock size={9} />{formatDate(a.ends_at)}
                          </span>
                        )}
                      </div>
                      <Link to={`/auctions/${a.id}`} className="shrink-0 text-[10px] text-brand hover:underline">View</Link>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Pending payments — 1/3 */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800">Pending Payments</h3>
              {pendingCount > 0 && (
                <span className="text-[10px] font-semibold bg-amber-light text-amber-dark px-2 py-0.5 rounded-full">
                  {pendingCount} waiting
                </span>
              )}
            </div>
            {pendingCount === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">All payments up to date</p>
            ) : (
              <div className="space-y-2">
                {orgParticipations
                  .filter((p) => p.payment_status === 'pending_review')
                  .slice(0, 4)
                  .map((p) => {
                    const auction = allAuctions.find((a) => a.id === p.auction_id)
                    return (
                      <div key={p.id} className="bg-amber-light rounded-xl px-3 py-2.5">
                        <p className="text-[11px] font-semibold text-amber-dark truncate">{auction?.title}</p>
                        <p className="text-[10px] text-amber-dark/70">
                          {formatCurrency(p.fee_amount, p.currency, 'en-UG')} · ref: {p.bank_transfer_ref}
                        </p>
                      </div>
                    )
                  })}
                <p className="text-[10px] text-slate-400 text-center pt-1">
                  Payments are reviewed by the platform admin.
                </p>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Quick Actions</h3>
            {[
              { to: '/org/auctions',        label: 'Manage Auctions', icon: <Gavel size={12} /> },
              { to: '/org/bidders',         label: 'View Participants', icon: <Users size={12} /> },
            ].map((link) => (
              <Link key={link.to} to={link.to} className="flex items-center gap-2.5 py-2 text-xs text-slate-600 hover:text-brand transition-colors group">
                <span className="text-slate-400 group-hover:text-brand">{link.icon}</span>
                {link.label}
                <ChevronRight size={11} className="ml-auto text-slate-300 group-hover:text-brand" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
