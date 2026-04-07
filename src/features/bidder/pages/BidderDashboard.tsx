import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Ticket, Gavel, Trophy, Radio, Clock, ChevronRight,
  AlertCircle, ShieldCheck, Star, Lock,
} from 'lucide-react'
import { getBidderParticipations } from '../../../services/participation.service'
import { getBidderBids } from '../../../services/bids.service'
import { getAuctions } from '../../../services/auctions.service'
import { supabase } from '../../../lib/supabase'
import type { AuctionParticipation } from '../../../types/participation.types'
import type { Bid } from '../../../types/bid.types'
import type { Auction, Lot } from '../../../types/auction.types'
import { formatCurrency } from '../../../utils/currency'
import { formatDate } from '../../../utils/date'
import { useAuthStore } from '../../../store/authStore'
import { cn } from '../../../lib/utils'

// ─────────────────────────────────────────────────────────────────────────────

const PAYMENT_CHIP: Record<string, { label: string; style: string }> = {
  approved:       { label: 'Approved',       style: 'bg-green-50 text-green-700' },
  pending_review: { label: 'Under Review',   style: 'bg-amber-light text-amber-dark' },
  unpaid:         { label: 'Pay Fee',        style: 'bg-slate-100 text-slate-500' },
  rejected:       { label: 'Rejected',       style: 'bg-red-50 text-red-700' },
}

export default function BidderDashboard() {
  const user = useAuthStore((s) => s.user)
  const BIDDER_ID = user?.id ?? 'user-019'

  const [participations, setParticipations] = useState<AuctionParticipation[]>([])
  const [myBids, setMyBids] = useState<Bid[]>([])
  const [allAuctions, setAllAuctions] = useState<Auction[]>([])
  const [lots, setLots] = useState<Lot[]>([])

  useEffect(() => {
    if (!user?.id) return
    Promise.all([
      getBidderParticipations(user.id),
      getBidderBids(user.id),
      getAuctions(),
    ]).then(([parts, bids, auctions]) => {
      setParticipations(parts)
      setMyBids(bids)
      setAllAuctions(auctions)
      const lotIds = [...new Set(bids.map((b) => b.lot_id))]
      if (lotIds.length > 0) {
        supabase.from('lots').select('id, title, auction_id, current_bid, status, winner_id')
          .in('id', lotIds)
          .then(({ data }) => { if (data) setLots(data as Lot[]) })
          .catch(() => {})
      }
    }).catch(() => {})
  }, [user?.id])

  const wonLots    = lots.filter((l) => l.winner_id === user?.id)
  const activeBids = myBids.filter((b) => lots.find((l) => l.id === b.lot_id)?.status === 'open')
  const kycApproved = user?.kyc_status === 'approved'
  const displayName    = user?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'Bidder'
  const memberSince    = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-UG', { month: 'long', year: 'numeric' })
    : null

  return (
    <div className="p-6 max-w-[1200px] mx-auto">

      {/* ── Welcome hero (exclusive feel) ──────────────────── */}
      <div className="relative bg-brand rounded-2xl overflow-hidden mb-6 p-6">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-amber rounded-full opacity-10 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/10 text-white/80 text-[10px] font-semibold px-2.5 py-1 rounded-full mb-3 border border-white/20">
              <Lock size={9} />
              Private Member Area
            </div>
            <h1 className="text-xl font-bold text-white mb-1">Welcome back, {displayName}</h1>
            <p className="text-white/60 text-xs">
              {memberSince ? `Member since ${memberSince} · ` : ''}
              Your bids and auctions are private and secure.
            </p>
          </div>
          <div className="shrink-0">
            {kycApproved ? (
              <div className="flex items-center gap-1.5 bg-white/10 text-green-300 text-[11px] font-semibold px-3 py-1.5 rounded-xl border border-white/20">
                <ShieldCheck size={13} />
                KYC Verified
              </div>
            ) : (
              <Link to="/bidder/kyc" className="flex items-center gap-1.5 bg-amber/90 hover:bg-amber text-white text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-colors">
                <AlertCircle size={12} />
                Verify Identity
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Registered Auctions', value: participations.length, icon: <Ticket size={16} className="text-brand" />,       bg: 'bg-brand-light' },
          { label: 'Active Bids',         value: activeBids.length,     icon: <Gavel size={16} className="text-amber" />,        bg: 'bg-amber-light' },
          { label: 'Lots Won',             value: wonLots.length,        icon: <Trophy size={16} className="text-green-500" />,   bg: 'bg-green-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', s.bg)}>
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── My Auctions (2 cols) ─────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Star size={13} className="text-amber" />
                <h2 className="text-sm font-semibold text-slate-800">My Auctions</h2>
              </div>
              <Link to="/auctions" className="flex items-center gap-1 text-xs text-brand hover:underline">
                Browse more <ChevronRight size={12} />
              </Link>
            </div>

            {participations.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <Ticket size={36} strokeWidth={1} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium text-slate-600">No auctions registered yet</p>
                <p className="text-xs mt-1 mb-4 max-w-xs mx-auto leading-relaxed text-slate-400">
                  Browse the catalogue, select an auction and pay the entry fee to unlock your private bidding access.
                </p>
                <Link to="/auctions" className="inline-flex items-center gap-1.5 bg-brand text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-brand-dark transition-colors">
                  <Gavel size={13} />
                  Browse Catalogues
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {participations.map((p) => {
                  const auction = allAuctions.find((a) => a.id === p.auction_id)
                  if (!auction) return null
                  const chip = PAYMENT_CHIP[p.payment_status]
                  const isLive = auction.status === 'live'

                  return (
                    <div key={p.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                      <img src={auction.image_url} alt={auction.title} className="w-12 h-9 rounded-lg object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{auction.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{auction.org_name}</p>
                      </div>
                      <div className="shrink-0 hidden sm:block text-right">
                        {isLive ? (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-dark">
                            <Radio size={9} className="animate-pulse" />Live
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock size={9} />{formatDate(auction.ends_at)}
                          </span>
                        )}
                      </div>
                      <span className={cn('shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full', chip.style)}>
                        {chip.label}
                      </span>
                      {p.payment_status === 'approved' && isLive ? (
                        <Link to={`/auctions/${auction.id}`} className="shrink-0 text-[10px] font-semibold bg-brand text-white px-3 py-1.5 rounded-lg hover:bg-brand-dark transition-colors flex items-center gap-1">
                          <Gavel size={10} />Bid
                        </Link>
                      ) : p.payment_status === 'unpaid' || p.payment_status === 'rejected' ? (
                        <Link to={`/auctions/${auction.id}`} className="shrink-0 text-[10px] font-semibold border border-brand text-brand px-3 py-1.5 rounded-lg hover:bg-brand-light transition-colors">
                          Pay Fee
                        </Link>
                      ) : (
                        <Link to={`/auctions/${auction.id}`} className="shrink-0 text-[10px] text-slate-400 hover:text-brand transition-colors">
                          View
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent bids */}
          {myBids.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Gavel size={13} className="text-brand" />
                  <h2 className="text-sm font-semibold text-slate-800">Recent Bid Activity</h2>
                </div>
                <Link to="/bidder/history" className="flex items-center gap-1 text-xs text-brand hover:underline">
                  Full history <ChevronRight size={12} />
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {myBids.slice(0, 4).map((bid) => {
                  const lot     = lots.find((l) => l.id === bid.lot_id)
                  const auction = allAuctions.find((a) => a.id === lot?.auction_id)
                  const isTop   = lot?.current_bid === bid.amount
                  return (
                    <div key={bid.id} className="flex items-center justify-between px-5 py-3.5">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">{lot?.title ?? 'Unknown Lot'}</p>
                        <p className="text-[10px] text-slate-400">{auction?.title}</p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-xs font-bold font-tabular text-slate-800">
                          {formatCurrency(bid.amount, auction?.currency ?? 'UGX', 'en-UG')}
                        </p>
                        <span className={cn('text-[10px] font-semibold', isTop ? 'text-green-600' : 'text-slate-400')}>
                          {isTop ? '↑ Winning' : 'Outbid'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Right sidebar ─────────────────────────────────── */}
        <div className="space-y-4">
          {/* Account status */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Account Status</h3>
            <div className="space-y-3">
              {[
                {
                  label: 'Identity (KYC)',
                  value: kycApproved
                    ? <span className="flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full"><ShieldCheck size={9} />Verified</span>
                    : <Link to="/bidder/kyc" className="text-[10px] font-semibold text-amber-dark bg-amber-light px-2 py-0.5 rounded-full">Pending</Link>,
                },
                { label: 'Registered Auctions', value: <span className="text-[10px] font-semibold text-slate-700">{participations.length}</span> },
                { label: 'Total Bids',          value: <span className="text-[10px] font-semibold text-slate-700">{myBids.length}</span> },
                { label: 'Lots Won',             value: <span className="text-[10px] font-semibold text-slate-700">{wonLots.length}</span> },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">{row.label}</span>
                  {row.value}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <Link to="/bidder/profile" className="flex items-center justify-between text-xs text-brand hover:underline">
                Edit Profile <ChevronRight size={12} />
              </Link>
            </div>
          </div>

          {/* Won lots */}
          {wonLots.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Trophy size={13} className="text-amber" />
                <h3 className="text-sm font-semibold text-slate-800">Won Lots</h3>
              </div>
              <div className="space-y-3">
                {wonLots.map((lot) => {
                  const auction = allAuctions.find((a) => a.id === lot.auction_id)
                  return (
                    <div key={lot.id} className="bg-green-50 rounded-xl p-3">
                      <p className="text-[11px] font-semibold text-slate-800 line-clamp-1">{lot.title}</p>
                      <p className="text-[10px] text-slate-400">{auction?.auction_ref}</p>
                      <p className="text-xs font-bold text-green-700 mt-1 font-tabular">
                        {formatCurrency(lot.current_bid, auction?.currency ?? 'UGX', 'en-UG')}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Quick Links</h3>
            {[
              { to: '/auctions',       label: 'Browse Catalogues', icon: <Gavel size={12} /> },
              { to: '/bidder/kyc',     label: 'KYC Documents',    icon: <ShieldCheck size={12} /> },
              { to: '/bidder/history', label: 'Bid History',      icon: <Clock size={12} /> },
              { to: '/bidder/profile', label: 'My Profile',       icon: <Star size={12} /> },
            ].map((link) => (
              <Link key={link.to} to={link.to} className="flex items-center gap-2.5 py-2 text-xs text-slate-600 hover:text-brand transition-colors group">
                <span className="text-slate-400 group-hover:text-brand transition-colors">{link.icon}</span>
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
