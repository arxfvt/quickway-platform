import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Users, Ticket, ShieldCheck, ShieldOff, Clock, ChevronDown, Loader2 } from 'lucide-react'
import { getAuctions } from '../../../services/auctions.service'
import { getAllParticipations } from '../../../services/participation.service'
import { supabase } from '../../../lib/supabase'
import { formatCurrency } from '../../../utils/currency'
import { formatDate } from '../../../utils/date'
import { useAuthStore } from '../../../store/authStore'
import { cn } from '../../../lib/utils'
import type { Auction } from '../../../types/auction.types'
import type { AuctionParticipation, ParticipationStatus } from '../../../types/participation.types'

// ─────────────────────────────────────────────────────────────────────────────

const ORG_ID = 'org-001'

const STATUS_CHIP: Record<ParticipationStatus, string> = {
  approved:       'bg-green-50 text-green-700',
  pending_review: 'bg-amber-light text-amber-dark',
  rejected:       'bg-red-50 text-red-600',
  unpaid:         'bg-slate-100 text-slate-500',
}

const STATUS_LABEL: Record<ParticipationStatus, string> = {
  approved:       'Approved',
  pending_review: 'Pending Review',
  rejected:       'Rejected',
  unpaid:         'Unpaid',
}

const KYC_CHIP: Record<string, string> = {
  approved:      'bg-green-50 text-green-700',
  pending:       'bg-amber-light text-amber-dark',
  rejected:      'bg-red-50 text-red-600',
  not_submitted: 'bg-slate-100 text-slate-400',
}

// ─────────────────────────────────────────────────────────────────────────────

export default function OrgBidders() {
  const user = useAuthStore((s) => s.user)
  const orgId = user?.org_id ?? ORG_ID
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedAuction = searchParams.get('auction') ?? 'all'

  const [statusFilter, setStatusFilter] = useState<ParticipationStatus | 'all'>('all')
  const [allAuctions, setAllAuctions] = useState<Auction[]>([])
  const [allParticipations, setAllParticipations] = useState<AuctionParticipation[]>([])
  const [userMap, setUserMap] = useState<Record<string, { full_name: string | null; email: string; kyc_status: string | null }>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([getAuctions(), getAllParticipations()])
      .then(([a, p]) => {
        setAllAuctions(a)
        setAllParticipations(p)
        const bidderIds = [...new Set(p.map((x) => x.bidder_id))]
        if (bidderIds.length > 0) {
          supabase.from('profiles').select('id, full_name, email, kyc_status').in('id', bidderIds)
            .then(({ data: profiles }) => {
              if (!profiles) return
              const map: Record<string, { full_name: string | null; email: string; kyc_status: string | null }> = {}
              profiles.forEach((pr) => { map[pr.id] = { full_name: pr.full_name, email: pr.email, kyc_status: pr.kyc_status } })
              setUserMap(map)
            }).catch(() => {})
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const orgAuctions = allAuctions.filter((a) => a.org_id === orgId)
  const orgAuctionIds = new Set(orgAuctions.map((a) => a.id))

  const relevantParticipations = useMemo(() => {
    return allParticipations.filter((p) => orgAuctionIds.has(p.auction_id))
  }, [allParticipations, orgAuctions])

  const filtered = useMemo(() => {
    let rows = relevantParticipations
    if (selectedAuction !== 'all') rows = rows.filter((p) => p.auction_id === selectedAuction)
    if (statusFilter !== 'all') rows = rows.filter((p) => p.payment_status === statusFilter)
    return rows
  }, [relevantParticipations, selectedAuction, statusFilter])

  const enriched = useMemo(() => {
    return filtered.map((p) => {
      const bidder  = userMap[p.bidder_id] ? { ...userMap[p.bidder_id], id: p.bidder_id } : null
      const auction = allAuctions.find((a) => a.id === p.auction_id)
      return { p, bidder, auction }
    })
  }, [filtered, userMap, allAuctions])

  // Stats
  const approvedCount  = relevantParticipations.filter((p) => p.payment_status === 'approved').length
  const pendingCount   = relevantParticipations.filter((p) => p.payment_status === 'pending_review').length
  const feeRevenue     = relevantParticipations
    .filter((p) => p.payment_status === 'approved')
    .reduce((sum, p) => sum + p.fee_amount, 0)

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-brand" />
    </div>
  )

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Participants</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registered bidders across your auctions — payment status is reviewed by the platform admin.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Total Registered', value: relevantParticipations.length, icon: <Users size={15} className="text-brand" />, bg: 'bg-brand-light' },
          { label: 'Payments Approved', value: approvedCount, icon: <ShieldCheck size={15} className="text-green-600" />, bg: 'bg-green-50' },
          { label: 'Fee Revenue', value: formatCurrency(feeRevenue, 'UGX', 'en-UG'), icon: <Ticket size={15} className="text-amber" />, bg: 'bg-amber-light' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', s.bg)}>{s.icon}</div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-slate-900 truncate">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Auction filter */}
        <div className="relative">
          <select
            value={selectedAuction}
            onChange={(e) => {
              const params = new URLSearchParams(searchParams)
              if (e.target.value === 'all') params.delete('auction')
              else params.set('auction', e.target.value)
              setSearchParams(params)
            }}
            className="appearance-none pl-3 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors cursor-pointer"
          >
            <option value="all">All Auctions</option>
            {orgAuctions.map((a) => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ParticipationStatus | 'all')}
            className="appearance-none pl-3 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending_review">Pending Review</option>
            <option value="rejected">Rejected</option>
            <option value="unpaid">Unpaid</option>
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {pendingCount > 0 && (
          <span className="text-[11px] font-semibold bg-amber-light text-amber-dark px-3 py-1 rounded-full">
            {pendingCount} payment{pendingCount !== 1 ? 's' : ''} awaiting admin review
          </span>
        )}
      </div>

      {/* Table */}
      {enriched.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <Users size={36} strokeWidth={1} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">No participants found</p>
          <p className="text-xs text-slate-400 mt-1">Try a different auction or status filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">Bidder</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-3 hidden lg:table-cell">Auction</th>
                <th className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-3">KYC</th>
                <th className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-3">Payment</th>
                <th className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-3 hidden md:table-cell">Fee</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-3 hidden xl:table-cell">Bank Ref</th>
                <th className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3 hidden md:table-cell">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enriched.map(({ p, bidder, auction }) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  {/* Bidder */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-brand-light flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-brand">
                          {(bidder?.full_name ?? bidder?.email ?? '?')[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate max-w-[160px]">
                          {bidder?.full_name ?? '—'}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate max-w-[160px]">{bidder?.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Auction */}
                  <td className="px-3 py-3.5 hidden lg:table-cell">
                    <p className="text-xs text-slate-700 truncate max-w-[200px]">{auction?.title}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{auction?.auction_ref}</p>
                  </td>

                  {/* KYC */}
                  <td className="px-3 py-3.5 text-center">
                    <span className={cn(
                      'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full',
                      KYC_CHIP[bidder?.kyc_status ?? 'not_submitted']
                    )}>
                      {bidder?.kyc_status === 'approved'
                        ? <><ShieldCheck size={8} />Verified</>
                        : bidder?.kyc_status === 'pending'
                        ? <><Clock size={8} />Pending</>
                        : <><ShieldOff size={8} />{bidder?.kyc_status === 'rejected' ? 'Rejected' : 'Not Submitted'}</>
                      }
                    </span>
                  </td>

                  {/* Payment status (read-only) */}
                  <td className="px-3 py-3.5 text-center">
                    <span className={cn(
                      'text-[10px] font-semibold px-2.5 py-0.5 rounded-full',
                      STATUS_CHIP[p.payment_status]
                    )}>
                      {STATUS_LABEL[p.payment_status]}
                    </span>
                  </td>

                  {/* Fee */}
                  <td className="px-3 py-3.5 text-right hidden md:table-cell">
                    <span className="text-xs font-semibold text-slate-700">
                      {formatCurrency(p.fee_amount, p.currency, 'en-UG')}
                    </span>
                  </td>

                  {/* Bank ref */}
                  <td className="px-3 py-3.5 hidden xl:table-cell">
                    {p.bank_transfer_ref ? (
                      <span className="text-[10px] font-mono text-slate-500">{p.bank_transfer_ref}</span>
                    ) : (
                      <span className="text-[10px] text-slate-300">—</span>
                    )}
                  </td>

                  {/* Registered */}
                  <td className="px-5 py-3.5 text-right hidden md:table-cell">
                    <span className="text-[10px] text-slate-400">{formatDate(p.created_at)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-[10px] text-slate-400 text-center">
              Payment approvals are managed by the platform administrator.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
