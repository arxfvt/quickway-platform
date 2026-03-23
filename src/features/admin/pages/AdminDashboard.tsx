import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Gavel, Users, ShieldCheck, Ticket, Radio, Clock,
  ChevronRight, AlertTriangle, Package,
} from 'lucide-react'
import { getAuctions } from '../../../services/auctions.service'
import { getKycDocumentsByStatus } from '../../../services/kyc.service'
import { getParticipationsByStatus } from '../../../services/participation.service'
import { getUsers } from '../../../services/users.service'
import { getOrganizations } from '../../../services/organizations.service'
import type { Auction } from '../../../types/auction.types'
import type { KycDocument } from '../../../types/kyc.types'
import type { AuctionParticipation } from '../../../types/participation.types'
import type { User } from '../../../types/user.types'
import { formatCurrency } from '../../../utils/currency'
import { formatDate } from '../../../utils/date'
import { cn } from '../../../lib/utils'

// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CHIP: Record<string, string> = {
  live:       'bg-amber-light text-amber-dark',
  scheduled:  'bg-brand-light text-brand',
  draft:      'bg-slate-100 text-slate-500',
  closed:     'bg-slate-100 text-slate-400',
  cancelled:  'bg-red-50 text-red-400',
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [auctions, setAuctions]         = useState<Auction[]>([])
  const [kycDocs, setKycDocs]           = useState<KycDocument[]>([])
  const [participations, setParticipations] = useState<AuctionParticipation[]>([])
  const [users, setUsers]               = useState<User[]>([])
  const [orgs, setOrgs]                 = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    Promise.all([
      getAuctions(),
      getKycDocumentsByStatus('pending'),
      getParticipationsByStatus('pending_review'),
      getUsers(),
      getOrganizations(),
    ]).then(([a, k, p, u, o]) => {
      setAuctions(a)
      setKycDocs(k)
      setParticipations(p)
      setUsers(u)
      setOrgs(o)
    }).catch(() => {})
  }, [])

  // Platform metrics
  const totalAuctions   = auctions.length
  const liveAuctions    = auctions.filter((a) => a.status === 'live').length
  const totalBidders    = users.filter((u) => u.role === 'bidder').length
  const totalOrgs       = orgs.length
  const pendingKyc      = kycDocs.filter((d) => d.status === 'pending').length
  const pendingPayments = participations.filter((p) => p.payment_status === 'pending_review').length
  const totalRevenue    = participations
    .filter((p) => p.payment_status === 'approved')
    .reduce((s, p) => s + p.fee_amount, 0)

  const recentAuctions = [...auctions]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const pendingKycDocs = kycDocs.filter((d) => d.status === 'pending').slice(0, 4)
  const pendingPayList = participations.filter((p) => p.payment_status === 'pending_review').slice(0, 4)

  return (
    <div className="p-6 max-w-[1300px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Platform-wide overview for Quickway Auctioneers.</p>
        </div>
      </div>

      {/* Alert banners */}
      {(pendingKyc > 0 || pendingPayments > 0) && (
        <div className="flex flex-wrap gap-3 mb-5">
          {pendingKyc > 0 && (
            <Link
              to="/admin/kyc"
              className="flex items-center gap-2 bg-amber-light text-amber-dark text-xs font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
            >
              <AlertTriangle size={13} />
              {pendingKyc} KYC document{pendingKyc !== 1 ? 's' : ''} awaiting review
              <ChevronRight size={11} />
            </Link>
          )}
          {pendingPayments > 0 && (
            <Link
              to="/admin/payments"
              className="flex items-center gap-2 bg-amber-light text-amber-dark text-xs font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
            >
              <AlertTriangle size={13} />
              {pendingPayments} payment{pendingPayments !== 1 ? 's' : ''} awaiting approval
              <ChevronRight size={11} />
            </Link>
          )}
        </div>
      )}

      {/* Stat cards — 6 metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {[
          { label: 'Total Auctions',   value: totalAuctions,   icon: <Gavel size={16} className="text-brand" />,         bg: 'bg-brand-light' },
          { label: 'Live Now',         value: liveAuctions,    icon: <Radio size={16} className="text-amber" />,         bg: 'bg-amber-light' },
          { label: 'Bidders',          value: totalBidders,    icon: <Users size={16} className="text-green-600" />,      bg: 'bg-green-50' },
          { label: 'Organisations',    value: totalOrgs,       icon: <Package size={16} className="text-slate-500" />,   bg: 'bg-slate-50' },
          { label: 'Pending KYC',      value: pendingKyc,      icon: <ShieldCheck size={16} className="text-amber" />,   bg: 'bg-amber-light' },
          { label: 'Fee Revenue',      value: formatCurrency(totalRevenue, 'UGX', 'en-UG'), icon: <Ticket size={16} className="text-brand" />, bg: 'bg-brand-light' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', s.bg)}>{s.icon}</div>
            <div className="min-w-0">
              <p className="text-base font-bold text-slate-900 truncate">{s.value}</p>
              <p className="text-[10px] text-slate-500 leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">

        {/* Recent auctions — 2/3 */}
        <div className="col-span-2">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">All Auctions</h2>
              <Link to="/admin/auctions" className="flex items-center gap-1 text-xs text-brand hover:underline">
                View all <ChevronRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {recentAuctions.map((a) => {
                const org = orgs.find((o) => o.id === a.org_id)
                const participants = 0
                return (
                  <div key={a.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                    <img src={a.image_url} alt={a.title} className="w-10 h-8 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{a.title}</p>
                      <p className="text-[10px] text-slate-400">{org?.name ?? a.org_id} · {a.lot_count} lots · {participants} bidders</p>
                    </div>
                    <span className={cn('shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full', STATUS_CHIP[a.status])}>
                      {a.status === 'live' ? (
                        <span className="flex items-center gap-1">
                          <Radio size={7} className="animate-pulse" />{a.status}
                        </span>
                      ) : a.status}
                    </span>
                    <div className="text-right shrink-0 hidden sm:block">
                      <p className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                        <Clock size={9} />{formatDate(a.ends_at)}
                      </p>
                    </div>
                    <Link to={`/auctions/${a.id}`} className="text-[10px] text-brand hover:underline shrink-0">View</Link>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right column — 1/3 */}
        <div className="space-y-4">

          {/* Pending KYC */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800">KYC Queue</h3>
              <Link to="/admin/kyc" className="text-xs text-brand hover:underline">Review all</Link>
            </div>
            {pendingKycDocs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">No pending documents</p>
            ) : (
              <div className="space-y-2">
                {pendingKycDocs.map((doc) => {
                  const docUser = users.find((u) => u.id === doc.user_id)
                  return (
                    <div key={doc.id} className="flex items-center gap-2.5 bg-amber-light rounded-xl px-3 py-2">
                      <ShieldCheck size={11} className="text-amber-dark shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-amber-dark truncate">
                          {docUser?.full_name ?? docUser?.email ?? doc.user_id}
                        </p>
                        <p className="text-[10px] text-amber-dark/70">{doc.document_type.replace('_', ' ')}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Pending Payments */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800">Pending Payments</h3>
              <Link to="/admin/payments" className="text-xs text-brand hover:underline">Review all</Link>
            </div>
            {pendingPayList.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">No pending payments</p>
            ) : (
              <div className="space-y-2">
                {pendingPayList.map((p) => {
                  const pUser    = users.find((u) => u.id === p.bidder_id)
                  const pAuction = auctions.find((a) => a.id === p.auction_id)
                  return (
                    <div key={p.id} className="bg-brand-light rounded-xl px-3 py-2">
                      <p className="text-[11px] font-semibold text-brand truncate">
                        {pUser?.full_name ?? pUser?.email ?? p.bidder_id}
                      </p>
                      <p className="text-[10px] text-brand/70 truncate">
                        {formatCurrency(p.fee_amount, p.currency, 'en-UG')} · {pAuction?.title}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Quick nav */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Admin Areas</h3>
            {[
              { to: '/admin/kyc',           label: 'KYC Review',      icon: <ShieldCheck size={12} /> },
              { to: '/admin/payments',      label: 'Payments',        icon: <Ticket size={12} /> },
              { to: '/admin/users',         label: 'Users',           icon: <Users size={12} /> },
              { to: '/admin/organizations', label: 'Organisations',   icon: <Package size={12} /> },
              { to: '/admin/auctions',      label: 'Auctions',        icon: <Gavel size={12} /> },
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
