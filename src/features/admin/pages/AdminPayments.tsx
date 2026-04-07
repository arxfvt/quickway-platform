import { useState, useEffect } from 'react'
import {
  Ticket, CheckCircle2, XCircle, Clock, ChevronRight,
  Loader2, AlertTriangle, FileText, DollarSign,
} from 'lucide-react'
import { getAllParticipations, getParticipationsByStatus, reviewParticipation } from '../../../services/participation.service'
import { supabase } from '../../../lib/supabase'
import { formatCurrency } from '../../../utils/currency'
import { formatDate } from '../../../utils/date'
import { cn } from '../../../lib/utils'
import type { AuctionParticipation, ParticipationStatus } from '../../../types/participation.types'

// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminPayments() {
  const [payments, setPayments] = useState<AuctionParticipation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<ParticipationStatus | 'all'>('pending_review')
  const [rejectionNote, setRejectionNote] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [flash, setFlash] = useState<{ id: string; action: 'approved' | 'rejected' } | null>(null)
  const [userMap, setUserMap]       = useState<Record<string, { full_name: string | null; email: string; kyc_status: string | null }>>({})
  const [auctionMap, setAuctionMap] = useState<Record<string, { title: string; auction_ref: string }>>({})

  // Load from Supabase; fall back to mock data on error
  useEffect(() => {
    const fetch = filter === 'all'
      ? getAllParticipations()
      : getParticipationsByStatus(filter as ParticipationStatus)
    fetch.then((data) => {
      setPayments(data)
      if (!selectedId || !data.find((p) => p.id === selectedId)) {
        setSelectedId(data.find((p) => p.payment_status === 'pending_review')?.id ?? data[0]?.id ?? null)
      }
      // Fetch profiles and auctions for all unique IDs in this batch
      const userIds    = [...new Set(data.map((p) => p.bidder_id))]
      const auctionIds = [...new Set(data.map((p) => p.auction_id))]
      if (userIds.length > 0) {
        supabase.from('profiles').select('id, full_name, email, kyc_status').in('id', userIds)
          .then(({ data: profiles }) => {
            if (!profiles) return
            const map: Record<string, { full_name: string | null; email: string; kyc_status: string | null }> = {}
            profiles.forEach((p) => { map[p.id] = { full_name: p.full_name, email: p.email, kyc_status: p.kyc_status } })
            setUserMap(map)
          }).catch(() => {})
      }
      if (auctionIds.length > 0) {
        supabase.from('auctions').select('id, title, auction_ref').in('id', auctionIds)
          .then(({ data: auctions }) => {
            if (!auctions) return
            const map: Record<string, { title: string; auction_ref: string }> = {}
            auctions.forEach((a) => { map[a.id] = { title: a.title, auction_ref: a.auction_ref } })
            setAuctionMap(map)
          }).catch(() => {})
      }
    }).catch(() => {})
  }, [filter])

  const filtered = payments.filter((p) => filter === 'all' || p.payment_status === filter)
  const selected        = payments.find((p) => p.id === selectedId) ?? null
  const selectedUser    = selected ? (userMap[selected.bidder_id] ?? null) : null
  const selectedAuction = selected ? (auctionMap[selected.auction_id] ?? null) : null

  const pendingCount   = payments.filter((p) => p.payment_status === 'pending_review').length
  const approvedCount  = payments.filter((p) => p.payment_status === 'approved').length
  const totalRevenue   = payments.filter((p) => p.payment_status === 'approved').reduce((s, p) => s + p.fee_amount, 0)

  const handleReview = async (action: 'approved' | 'rejected') => {
    if (!selected) return
    setIsProcessing(true)
    const reason = action === 'rejected' ? (rejectionNote || 'Payment reference could not be verified.') : undefined
    try {
      await reviewParticipation(selected.id, action, reason)

      // Send email notification on approval (fire-and-forget)
      if (action === 'approved' && selectedUser) {
        supabase.functions.invoke('notify-payment-approved', {
          body: {
            email: selectedUser.email,
            fullName: selectedUser.full_name,
            auctionTitle: selectedAuction?.title,
            auctionRef: selectedAuction?.auction_ref,
          },
        }).catch(() => {})
      }
    } catch { /* optimistic update below regardless */ }

    setPayments((prev) =>
      prev.map((p) =>
        p.id === selected.id
          ? {
              ...p,
              payment_status: action,
              reviewed_at: new Date().toISOString(),
              rejection_reason: action === 'rejected' ? (reason ?? null) : null,
            }
          : p
      )
    )
    setFlash({ id: selected.id, action })
    setRejectionNote('')
    setIsProcessing(false)
    setTimeout(() => setFlash(null), 3000)

    const nextPending = payments.find((p) => p.payment_status === 'pending_review' && p.id !== selected.id)
    if (nextPending) setSelectedId(nextPending.id)
  }

  return (
    <div className="p-6 max-w-[1300px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Participation Payments</h1>
          <p className="text-xs text-slate-500 mt-0.5">Review and approve entry fee bank transfers submitted by bidders.</p>
        </div>
        {pendingCount > 0 && (
          <span className="text-[11px] font-semibold bg-amber-light text-amber-dark px-3 py-1.5 rounded-full animate-pulse">
            {pendingCount} awaiting approval
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Pending Review', value: pendingCount,   icon: <Clock size={15} className="text-amber" />,         bg: 'bg-amber-light' },
          { label: 'Approved',       value: approvedCount,  icon: <CheckCircle2 size={15} className="text-green-600" />, bg: 'bg-green-50' },
          { label: 'Fee Revenue',    value: formatCurrency(totalRevenue, 'UGX', 'en-UG'), icon: <DollarSign size={15} className="text-brand" />, bg: 'bg-brand-light' },
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 h-auto lg:h-[calc(100vh-310px)] min-h-[480px]">

        {/* ── LEFT: Payment list ─────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Filter tabs */}
          <div className="flex border-b border-slate-100">
            {(['pending_review', 'approved', 'rejected', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'flex-1 py-2.5 text-[10px] font-semibold uppercase tracking-wide transition-colors',
                  filter === f ? 'text-brand border-b-2 border-brand' : 'text-slate-400 hover:text-slate-600'
                )}
              >
                {f === 'pending_review' ? 'Pending' : f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Ticket size={28} strokeWidth={1} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs">No payments in this category</p>
              </div>
            ) : (
              filtered.map((payment) => {
                const pUser    = userMap[payment.bidder_id] ?? null
                const pAuction = auctionMap[payment.auction_id] ?? null
                const isSelected = payment.id === selectedId
                return (
                  <button
                    key={payment.id}
                    onClick={() => setSelectedId(payment.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                      isSelected ? 'bg-brand-light' : 'hover:bg-slate-50'
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                      payment.payment_status === 'pending_review' ? 'bg-amber-light'
                        : payment.payment_status === 'approved' ? 'bg-green-50'
                        : 'bg-red-50'
                    )}>
                      {payment.payment_status === 'pending_review'
                        ? <Clock size={13} className="text-amber-dark" />
                        : payment.payment_status === 'approved'
                        ? <CheckCircle2 size={13} className="text-green-600" />
                        : <XCircle size={13} className="text-red-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {pUser?.full_name ?? pUser?.email ?? payment.bidder_id}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{pAuction?.title ?? payment.auction_id}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-semibold text-slate-600">
                        {formatCurrency(payment.fee_amount, payment.currency, 'en-UG')}
                      </p>
                    </div>
                    <ChevronRight size={12} className={isSelected ? 'text-brand' : 'text-slate-300'} />
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ── RIGHT: Detail & actions ─────────────────────── */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {selected ? (
            <>
              {/* Payment detail card */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedUser?.full_name ?? selectedUser?.email ?? selected.bidder_id}
                    </p>
                    <p className="text-xs text-slate-400">{selectedUser?.email}</p>
                  </div>
                  <span className={cn('text-[10px] font-semibold px-2.5 py-1 rounded-full', STATUS_CHIP[selected.payment_status])}>
                    {STATUS_LABEL[selected.payment_status]}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Auction</p>
                    <p className="font-medium text-slate-700 text-xs truncate">{selectedAuction?.title}</p>
                    <p className="text-[10px] font-mono text-slate-400">{selectedAuction?.auction_ref}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Entry Fee</p>
                    <p className="font-bold text-slate-800 text-sm">
                      {formatCurrency(selected.fee_amount, selected.currency, 'en-UG')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Bank Transfer Ref</p>
                    {selected.bank_transfer_ref ? (
                      <p className="font-mono font-semibold text-slate-700">{selected.bank_transfer_ref}</p>
                    ) : (
                      <p className="text-slate-300 text-xs">Not submitted</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Submitted</p>
                    <p className="font-medium text-slate-700">
                      {selected.submitted_at ? formatDate(selected.submitted_at) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Bidder KYC</p>
                    <p className={cn('font-semibold text-xs', selectedUser?.kyc_status === 'approved' ? 'text-green-600' : 'text-amber-dark')}>
                      {selectedUser?.kyc_status === 'approved' ? 'Verified' : selectedUser?.kyc_status ?? '—'}
                    </p>
                  </div>
                  {selected.reviewed_at && (
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Reviewed</p>
                      <p className="font-medium text-slate-700">{formatDate(selected.reviewed_at)}</p>
                    </div>
                  )}
                </div>

                {selected.rejection_reason && (
                  <div className="mt-4 bg-red-50 rounded-xl px-3 py-2.5 flex items-start gap-2">
                    <AlertTriangle size={12} className="text-red-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-red-700">{selected.rejection_reason}</p>
                  </div>
                )}
              </div>

              {/* Proof preview placeholder */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex-1 flex flex-col">
                <p className="text-xs font-semibold text-slate-600 mb-3 flex items-center gap-1.5">
                  <FileText size={13} className="text-slate-400" />
                  Payment Proof
                </p>
                <div className="flex-1 bg-slate-50 rounded-xl flex items-center justify-center min-h-[120px] border border-slate-100">
                  {selected.bank_transfer_proof_url ? (
                    <img src={selected.bank_transfer_proof_url} alt="Payment proof" className="max-h-[200px] rounded-lg object-contain" />
                  ) : (
                    <div className="text-center text-slate-300">
                      <FileText size={32} strokeWidth={1} className="mx-auto mb-1.5" />
                      <p className="text-xs">No proof image uploaded</p>
                      <p className="text-[10px] mt-0.5">Verify via bank reference number</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions (only for pending_review) */}
              {selected.payment_status === 'pending_review' && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
                  <p className="text-xs font-semibold text-slate-700">Approval Decision</p>
                  <textarea
                    placeholder="Rejection reason (required only if rejecting)…"
                    value={rejectionNote}
                    onChange={(e) => setRejectionNote(e.target.value)}
                    rows={2}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors resize-none"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleReview('approved')}
                      disabled={isProcessing}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-colors',
                        isProcessing ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'
                      )}
                    >
                      {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      Approve Payment
                    </button>
                    <button
                      onClick={() => handleReview('rejected')}
                      disabled={isProcessing}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-colors',
                        isProcessing ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-red-50 hover:bg-red-100 text-red-600'
                      )}
                    >
                      {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {flash && flash.id === selected.id && (
                <div className={cn(
                  'flex items-center gap-2 text-xs px-4 py-3 rounded-2xl',
                  flash.action === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                )}>
                  {flash.action === 'approved'
                    ? <><CheckCircle2 size={13} />Payment approved — bidder can now place bids.</>
                    : <><XCircle size={13} />Payment rejected — bidder has been notified.</>
                  }
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 flex items-center justify-center">
              <div className="text-center text-slate-300">
                <Ticket size={40} strokeWidth={1} className="mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-500">Select a payment to review</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
