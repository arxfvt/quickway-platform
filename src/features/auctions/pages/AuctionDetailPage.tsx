import { useState, useEffect } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Package, Users, CheckCircle2, AlertCircle,
  ChevronRight, Clock, Building2, Gavel, Ticket, RotateCcw,
} from 'lucide-react'
import { getAuction, getLots } from '../../../services/auctions.service'
import { getBidsForLot, placeBid } from '../../../services/bids.service'
import type { Auction, Lot } from '../../../types/auction.types'
import type { Bid } from '../../../types/bid.types'
import { formatCurrency } from '../../../utils/currency'
import { formatDate } from '../../../utils/date'
import { useAuthStore } from '../../../store/authStore'
import { cn } from '../../../lib/utils'
import StatusBadge from '../../../components/auction/StatusBadge'
import CountdownTimer from '../../../components/auction/CountdownTimer'
import PaymentModal from '../components/PaymentModal'
import { useParticipation } from '../../participation/hooks/useParticipation'

// ─────────────────────────────────────────────────────────────────────────────
// Spec table row
// ─────────────────────────────────────────────────────────────────────────────

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-medium text-slate-800 text-right max-w-[60%]">{value}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Bid input — 8-gate flow
// ─────────────────────────────────────────────────────────────────────────────

function BidInput({
  currentBid,
  increment,
  auctionStatus,
  currency,
  auctionId,
  lotId,
  feeAmount,
  bankDetails,
  auctionTitle,
  onBidPlaced,
}: {
  currentBid: number
  increment: number
  auctionStatus: string
  currency: string
  auctionId: string
  lotId: string | undefined
  feeAmount: number
  bankDetails: string
  auctionTitle: string
  onBidPlaced?: () => void
}) {
  const { user } = useAuthStore()
  const location = useLocation()
  const { participation, register, submitRef, isLoading } = useParticipation({
    auctionId,
    feeAmount,
    currency,
  })

  const minBid = currentBid + increment
  const [bid, setBid] = useState('')
  const [bidStatus, setBidStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [showModal, setShowModal] = useState(false)

  const isLive = auctionStatus === 'live'

  const handleBidSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user || !lotId) return
    const amount = Number(bid.replace(/[^0-9]/g, ''))
    if (amount < minBid) {
      setErrorMsg(`Minimum bid is ${formatCurrency(minBid, currency, 'en-UG')}`)
      setBidStatus('error')
      return
    }
    try {
      await placeBid(lotId, user.id, amount)
      setBidStatus('success')
      setErrorMsg('')
      setBid('')
      onBidPlaced?.()
      setTimeout(() => setBidStatus('idle'), 3000)
    } catch {
      setErrorMsg('Failed to place bid. Please try again.')
      setBidStatus('error')
    }
  }

  // ── Gate 1: Not live ──────────────────────────────────────────────────
  if (!isLive) {
    return (
      <div className="bg-slate-50 rounded-xl p-4 text-center">
        <p className="text-xs text-slate-400 font-medium">Bidding is not currently active</p>
      </div>
    )
  }

  // ── Gate 2: Not signed in ─────────────────────────────────────────────
  if (!user) {
    return (
      <div className="bg-brand-light rounded-xl p-4">
        <p className="text-xs text-brand font-semibold mb-2 flex items-center gap-1.5">
          <Gavel size={13} />
          Sign in to place a bid
        </p>
        <p className="text-[11px] text-brand/70 mb-3">
          Create a free account or sign in to participate in this auction.
        </p>
        <div className="flex gap-2">
          <Link
            to="/login"
            state={{ from: location }}
            className="flex-1 text-center bg-brand text-white text-xs font-semibold py-2 rounded-lg hover:bg-brand-dark transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            state={{ from: location }}
            className="flex-1 text-center bg-white text-brand text-xs font-semibold py-2 rounded-lg border border-brand/30 hover:bg-brand-light transition-colors"
          >
            Register
          </Link>
        </div>
      </div>
    )
  }

  // ── Gate 3: KYC not approved ──────────────────────────────────────────
  if (user.kyc_status !== 'approved') {
    return (
      <div className="bg-amber-light border border-amber/30 rounded-xl p-4">
        <p className="text-xs text-amber-dark font-semibold mb-1 flex items-center gap-1.5">
          <AlertCircle size={13} />
          KYC Verification Required
        </p>
        <p className="text-[11px] text-amber-dark/80 mb-3">
          You must complete identity verification before registering for any auction.
        </p>
        <Link
          to="/bidder/kyc"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
        >
          Verify now <ChevronRight size={12} />
        </Link>
      </div>
    )
  }

  // ── Gate 4: Not registered (participation is null) ────────────────────
  if (!participation) {
    return (
      <>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
            <Ticket size={13} className="text-brand" />
            Entry Fee Required
          </p>
          <p className="text-[11px] text-slate-500 mb-1">
            Pay the participation fee to unlock bidding on this auction.
          </p>
          <p className="text-lg font-bold text-brand mb-3">
            {formatCurrency(feeAmount, currency, 'en-UG')}
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="w-full bg-brand hover:bg-brand-dark text-white text-xs font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <Ticket size={12} />
            Register & Pay Entry Fee
          </button>
        </div>
        {showModal && (
          <PaymentModal
            auctionTitle={auctionTitle}
            feeAmount={feeAmount}
            currency={currency}
            bankDetails={bankDetails}
            participation={participation}
            onClose={() => setShowModal(false)}
            onRegister={register}
            onSubmitRef={submitRef}
            isLoading={isLoading}
          />
        )}
      </>
    )
  }

  // ── Gate 5: Registered but unpaid ────────────────────────────────────
  if (participation.payment_status === 'unpaid') {
    return (
      <>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
            <Ticket size={13} className="text-brand" />
            Submit Payment Reference
          </p>
          <p className="text-[11px] text-slate-500 mb-3">
            You're registered. Now transfer {formatCurrency(feeAmount, currency, 'en-UG')} and submit your bank reference to be approved.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="w-full bg-brand hover:bg-brand-dark text-white text-xs font-semibold py-2 rounded-lg transition-colors"
          >
            Submit Transfer Reference
          </button>
        </div>
        {showModal && (
          <PaymentModal
            auctionTitle={auctionTitle}
            feeAmount={feeAmount}
            currency={currency}
            bankDetails={bankDetails}
            participation={participation}
            onClose={() => setShowModal(false)}
            onRegister={register}
            onSubmitRef={submitRef}
            isLoading={isLoading}
          />
        )}
      </>
    )
  }

  // ── Gate 6: Pending review ────────────────────────────────────────────
  if (participation.payment_status === 'pending_review') {
    return (
      <div className="bg-amber-light border border-amber/30 rounded-xl p-4">
        <p className="text-xs font-semibold text-amber-dark mb-1 flex items-center gap-1.5">
          <Clock size={13} />
          Payment Under Review
        </p>
        <p className="text-[11px] text-amber-dark/80">
          Your transfer reference <span className="font-mono font-medium">{participation.bank_transfer_ref}</span> is being verified. You'll be notified once approved (within 24 hours).
        </p>
      </div>
    )
  }

  // ── Gate 7: Rejected — resubmit ───────────────────────────────────────
  if (participation.payment_status === 'rejected') {
    return (
      <>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1.5">
            <AlertCircle size={13} />
            Payment Rejected
          </p>
          {participation.rejection_reason && (
            <p className="text-[11px] text-red-600/80 mb-2">{participation.rejection_reason}</p>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
          >
            <RotateCcw size={11} />
            Resubmit payment
          </button>
        </div>
        {showModal && (
          <PaymentModal
            auctionTitle={auctionTitle}
            feeAmount={feeAmount}
            currency={currency}
            bankDetails={bankDetails}
            participation={participation}
            onClose={() => setShowModal(false)}
            onRegister={register}
            onSubmitRef={submitRef}
            isLoading={isLoading}
          />
        )}
      </>
    )
  }

  // ── Gate 8: Approved — show bid form ─────────────────────────────────
  return (
    <form onSubmit={handleBidSubmit} className="space-y-2.5">
      <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-2 rounded-lg text-[11px] font-medium mb-1">
        <CheckCircle2 size={12} />
        Participation approved — you may bid
      </div>
      <div>
        <p className="text-[10px] text-slate-500 mb-1.5 font-medium">
          Minimum bid:{' '}
          <span className="text-slate-700">{formatCurrency(minBid, currency, 'en-UG')}</span>
        </p>
        <input
          type="number"
          value={bid}
          onChange={(e) => { setBid(e.target.value); setBidStatus('idle') }}
          placeholder={`e.g. ${minBid.toLocaleString('en-UG')}`}
          min={minBid}
          step={increment}
          className={cn(
            'w-full px-3.5 py-2.5 rounded-xl text-sm border font-mono',
            'focus:outline-none focus:ring-2 transition-colors',
            bidStatus === 'error'
              ? 'border-red-300 focus:ring-red-100'
              : 'border-slate-200 focus:ring-brand/20 focus:border-brand'
          )}
        />
        {bidStatus === 'error' && (
          <p className="text-[11px] text-red-500 mt-1">{errorMsg}</p>
        )}
        {bidStatus === 'success' && (
          <p className="text-[11px] text-green-600 mt-1 flex items-center gap-1">
            <CheckCircle2 size={11} /> Bid placed successfully
          </p>
        )}
      </div>
      <button
        type="submit"
        className="w-full bg-brand hover:bg-brand-dark text-white font-semibold text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <Gavel size={15} />
        Place Bid
      </button>
    </form>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [activeImage, setActiveImage] = useState(0)

  const [auction, setAuction] = useState<Auction | null>(null)
  const [lots, setLots] = useState<Lot[]>([])
  const [bids, setBids] = useState<Bid[]>([])

  useEffect(() => {
    if (!id) return
    Promise.all([getAuction(id), getLots(id)]).then(([a, ls]) => {
      if (a) setAuction(a)
      setLots(ls)
      // Fetch bids for the first lot
      if (ls[0]) getBidsForLot(ls[0].id).then((bs) => setBids(bs.slice(0, 5))).catch(() => {})
    }).catch(() => {})
  }, [id])

  const refreshBids = () => {
    if (lots[0]) getBidsForLot(lots[0].id).then((bs) => setBids(bs.slice(0, 5))).catch(() => {})
  }

  if (!auction) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-20 text-slate-400">
        <p className="text-sm font-medium">Auction not found</p>
        <Link to="/auctions" className="mt-2 text-xs text-brand hover:underline">← Back to Auctions</Link>
      </div>
    )
  }

  const isLive = auction.status === 'live'
  const mainLot = lots[0]

  const gallery = [
    auction.image_url,
    ...lots.map((l) => l.image_url).filter(Boolean),
  ].slice(0, 5)

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* ── Back link ─────────────────────────────────────── */}
      <Link
        to="/auctions"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand mb-5 transition-colors group"
      >
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Auctions
      </Link>

      {/* ── Tabs ─────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-6 border-b border-slate-200">
        {['All Lots', 'Active', 'Closed'].map((tab, i) => (
          <button
            key={tab}
            className={cn(
              'px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px',
              i === 0
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Two-column layout ─────────────────────────────── */}
      <div className="flex gap-6 items-start">

        {/* ── Left: gallery + info ─────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Gallery */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm mb-4">
            <img
              src={gallery[activeImage]}
              alt={auction.title}
              className="w-full h-64 object-cover"
            />
            {gallery.length > 1 && (
              <div className="flex gap-2 p-3">
                {gallery.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={cn(
                      'w-16 h-12 rounded-lg overflow-hidden border-2 transition-colors shrink-0',
                      i === activeImage ? 'border-brand' : 'border-transparent hover:border-slate-300'
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title & org */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={auction.status} />
                  <span className="text-[10px] text-slate-400 font-mono">{auction.auction_ref}</span>
                </div>
                <h1 className="text-lg font-bold text-slate-900 leading-snug">{auction.title}</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-4">
              <span className="flex items-center gap-1"><Building2 size={11} />{auction.org_name}</span>
              <span className="flex items-center gap-1"><MapPin size={11} />{auction.org_location}</span>
              <span className="flex items-center gap-1.5 bg-brand-light text-brand px-2 py-0.5 rounded-full font-medium">
                <Ticket size={10} />
                Entry: {formatCurrency(auction.participation_fee, auction.currency, 'en-UG')}
              </span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{auction.description}</p>
          </div>

          {/* Lots list */}
          {lots.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
              <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Package size={14} className="text-brand" />
                Lots in this Auction
                <span className="ml-auto text-[10px] text-slate-400 font-normal">
                  {lots.length} lot{lots.length !== 1 ? 's' : ''}
                </span>
                {lots.length > 1 && (
                  <Link
                    to={`/auctions/${auction.id}/catalogue`}
                    className="text-xs font-semibold text-brand hover:underline flex items-center gap-1"
                  >
                    View Full Catalogue <ChevronRight size={12} />
                  </Link>
                )}
              </h2>
              <div className="space-y-3">
                {lots.map((lot) => (
                  <div
                    key={lot.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-brand/30 transition-colors cursor-pointer"
                  >
                    <img src={lot.image_url} alt={lot.title} className="w-14 h-10 object-cover rounded-lg shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        Lot {lot.lot_number} — {lot.title}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{lot.bid_count} bids</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-slate-400">Current</p>
                      <p className="text-xs font-bold text-slate-800 font-tabular">
                        {formatCurrency(lot.current_bid, auction.currency, 'en-UG')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent bids */}
          {bids.length > 0 && isLive && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Clock size={14} className="text-brand" />
                Recent Bids
              </h2>
              <div className="space-y-2">
                {bids.map((bid, i) => (
                  <div
                    key={bid.id}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg',
                      i === 0 ? 'bg-amber-light border border-amber/20' : 'bg-slate-50'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {i === 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />}
                      <span className="text-[10px] text-slate-500 font-mono">
                        {bid.bidder_id.replace('user-', 'Bidder #')}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className={cn('text-xs font-bold font-tabular', i === 0 ? 'text-amber-dark' : 'text-slate-700')}>
                        {formatCurrency(bid.amount, auction.currency, 'en-UG')}
                      </p>
                      <p className="text-[9px] text-slate-400">{formatDate(bid.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: sticky bid card ─────────────────────── */}
        <div className="w-80 shrink-0 sticky top-6 space-y-4">
          {/* Stats card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-slate-50 rounded-xl p-3">
                <CountdownTimer endsAt={auction.ends_at} size="large" />
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">Closes</p>
                <p className="text-xs font-semibold text-slate-800 leading-snug">
                  {formatDate(auction.ends_at)}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">Active Bids</p>
                <p className="text-lg font-bold text-slate-900 font-tabular flex items-center gap-1">
                  <Users size={14} className="text-brand" />
                  {auction.bid_count}
                </p>
              </div>
              <div className={cn('rounded-xl p-3', isLive ? 'bg-brand-light' : 'bg-slate-50')}>
                <p className="text-xs text-slate-500 mb-1">
                  {auction.status === 'closed' ? 'Final Bid' : 'Current Bid'}
                </p>
                <p className={cn('text-sm font-bold font-tabular', isLive ? 'text-brand' : 'text-slate-700')}>
                  {auction.current_bid > 0
                    ? formatCurrency(auction.current_bid, auction.currency, 'en-UG')
                    : 'No bids yet'}
                </p>
              </div>
            </div>

            {/* Bid form / participation gate */}
            <BidInput
              currentBid={mainLot?.current_bid ?? auction.current_bid}
              increment={mainLot?.bid_increment ?? 50_000}
              auctionStatus={auction.status}
              currency={auction.currency}
              auctionId={auction.id}
              lotId={mainLot?.id}
              feeAmount={auction.participation_fee}
              bankDetails={auction.bank_details}
              auctionTitle={auction.title}
              onBidPlaced={refreshBids}
            />
          </div>

          {/* Auction details table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Auction Details
            </h3>
            {mainLot ? (
              Object.entries(mainLot.specs).map(([k, v]) => (
                <SpecRow key={k} label={k} value={v} />
              ))
            ) : (
              <>
                <SpecRow label="Category" value={auction.category} />
                <SpecRow label="Auctioneer" value={auction.org_name} />
                <SpecRow label="Location" value={auction.org_location} />
                <SpecRow label="Lots" value={`${auction.lot_count} item${auction.lot_count !== 1 ? 's' : ''}`} />
                <SpecRow label="Entry Fee" value={formatCurrency(auction.participation_fee, auction.currency, 'en-UG')} />
                <SpecRow label="Opens" value={formatDate(auction.starts_at)} />
                <SpecRow label="Closes" value={formatDate(auction.ends_at)} />
              </>
            )}
          </div>

          {/* Help note */}
          <div className="text-center">
            <p className="text-[11px] text-slate-400">
              Questions?{' '}
              <Link to="/contact" className="text-brand hover:underline">Contact Quickway</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
