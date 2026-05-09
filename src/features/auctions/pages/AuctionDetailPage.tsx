import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Package, Users, CheckCircle2, AlertCircle,
  ChevronRight, Clock, Building2, Gavel, Ticket, RotateCcw, Send,
  FileText, BadgeCheck,
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
import { useLiveBids } from '../../bidding/hooks/useLiveBids'

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
// Offer input — 8-gate flow (formal offer submission for large transactions)
// ─────────────────────────────────────────────────────────────────────────────

function OfferInput({
  reservePrice,
  auctionStatus,
  currency,
  auctionId,
  lotId,
  feeAmount,
  bankDetails,
  auctionTitle,
  myOffers,
  onOfferPlaced,
}: {
  reservePrice: number
  auctionStatus: string
  currency: string
  auctionId: string
  lotId: string | undefined
  feeAmount: number
  bankDetails: string
  auctionTitle: string
  myOffers: Bid[]
  onOfferPlaced?: () => void
}) {
  const { user } = useAuthStore()
  const location = useLocation()
  const { participation, register, submitRef, isLoading } = useParticipation({
    auctionId,
    feeAmount,
    currency,
  })

  const [offerAmount, setOfferAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [lastSubmittedAmount, setLastSubmittedAmount] = useState(0)
  const [inspectionAck, setInspectionAck] = useState(false)
  const [asIsAck, setAsIsAck] = useState(false)

  const isOpen = auctionStatus === 'live' || auctionStatus === 'scheduled'

  const handleOfferSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user || !lotId) return
    const amount = Number(offerAmount.replace(/[^0-9]/g, ''))
    if (amount <= 0) {
      setErrorMsg('Please enter a valid offer amount.')
      setSubmitState('error')
      return
    }
    if (reservePrice > 0 && amount < reservePrice) {
      setErrorMsg(`Offer must be at least ${formatCurrency(reservePrice, currency, 'en-UG')}`)
      setSubmitState('error')
      return
    }
    setSubmitState('submitting')
    try {
      await placeBid(lotId, user.id, amount)
      setLastSubmittedAmount(amount)
      setSubmitState('success')
      setErrorMsg('')
      setOfferAmount('')
      setNotes('')
      onOfferPlaced?.()
    } catch {
      setErrorMsg('Failed to submit offer. Please try again.')
      setSubmitState('error')
    }
  }

  // ── Gate 1: Auction not accepting offers ──────────────────────────────
  if (!isOpen) {
    return (
      <div className="bg-slate-50 rounded-xl p-4 text-center">
        <Gavel size={20} className="mx-auto mb-2 text-slate-300" strokeWidth={1.5} />
        <p className="text-xs text-slate-400 font-medium">This auction is not currently accepting offers</p>
      </div>
    )
  }

  // ── Gate 2: Not signed in ─────────────────────────────────────────────
  if (!user) {
    return (
      <div className="bg-brand-light rounded-xl p-4">
        <p className="text-xs text-brand font-semibold mb-2 flex items-center gap-1.5">
          <FileText size={13} />
          Sign in to submit an offer
        </p>
        <p className="text-[11px] text-brand/70 mb-3">
          Create a free account or sign in to register for this auction and submit your offer.
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
          Identity Verification Required
        </p>
        <p className="text-[11px] text-amber-dark/80 mb-3">
          You must complete KYC verification before submitting offers on any auction.
        </p>
        <Link
          to="/bidder/kyc"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
        >
          Verify identity now <ChevronRight size={12} />
        </Link>
      </div>
    )
  }

  // ── Fee bypass: no participation fee → go straight to offer form ─────
  const freeEntry = feeAmount === 0

  // ── Gate 4: Not registered ────────────────────────────────────────────
  if (!freeEntry && !participation) {
    return (
      <>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
            <Ticket size={13} className="text-brand" />
            Registration Fee Required
          </p>
          <p className="text-[11px] text-slate-500 mb-1">
            Pay the registration fee to unlock offer submission for this auction.
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

  // ── Gate 5: Registered but unpaid (skip if no fee required) ─────────
  if (!freeEntry && participation && participation.payment_status === 'unpaid') {
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
  if (participation && participation.payment_status === 'pending_review') {
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
  if (participation && participation.payment_status === 'rejected') {
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

  // ── Gate 8: Approved — formal offer submission form ───────────────────
  return (
    <div className="space-y-3">
      {/* Approved banner */}
      <div className="flex items-center gap-2 bg-green-50 border border-green-100 text-green-700 px-3 py-2.5 rounded-xl text-xs font-medium">
        <BadgeCheck size={14} className="shrink-0" />
        <span>Registration approved — you may submit a formal offer</span>
      </div>

      {/* Submitting-as row */}
      <div className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
        <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Submitting as</p>
        <p className="text-xs font-semibold text-slate-800">{user.full_name ?? user.email}</p>
        {user.phone && <p className="text-[11px] text-slate-500">{user.phone}</p>}
        <p className="text-[11px] text-slate-400">{user.email}</p>
      </div>

      {/* Success confirmation (shown after submission) */}
      {submitState === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-green-800 mb-1">Offer Submitted Successfully</p>
              <p className="text-[11px] text-green-700 leading-relaxed">
                Your offer of{' '}
                <span className="font-bold">{formatCurrency(lastSubmittedAmount, currency, 'en-UG')}</span>{' '}
                has been received by Quickway Auctioneers. Our team will contact you at{' '}
                <span className="font-medium">{user.email}</span> within 24 hours to discuss next steps.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Offer form */}
      <form onSubmit={handleOfferSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Your Offer Amount ({currency})
          </label>
          {reservePrice > 0 && (
            <p className="text-[11px] text-slate-400 mb-1.5">
              Starting from{' '}
              <span className="font-semibold text-slate-600">{formatCurrency(reservePrice, currency, 'en-UG')}</span>
            </p>
          )}
          <input
            type="number"
            value={offerAmount}
            onChange={(e) => { setOfferAmount(e.target.value); setSubmitState('idle') }}
            placeholder={reservePrice > 0 ? reservePrice.toString() : 'Enter amount'}
            min={reservePrice > 0 ? reservePrice : 1}
            step={1000}
            required
            className={cn(
              'w-full px-3.5 py-3 rounded-xl text-base border font-mono font-semibold',
              'focus:outline-none focus:ring-2 transition-colors',
              submitState === 'error'
                ? 'border-red-300 focus:ring-red-100'
                : 'border-slate-200 focus:ring-brand/20 focus:border-brand'
            )}
          />
          {submitState === 'error' && (
            <p className="text-[11px] text-red-500 mt-1.5">{errorMsg}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Additional Notes <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Subject to site inspection, proposed completion date, financing terms…"
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors resize-none text-slate-700 placeholder-slate-300"
          />
        </div>

        {/* Acknowledgment checkboxes */}
        <div className="space-y-2 bg-amber-50 border border-amber/30 rounded-xl p-3">
          <p className="text-[10px] font-semibold text-amber-dark uppercase tracking-wide mb-1">Before you submit</p>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={inspectionAck}
              onChange={(e) => setInspectionAck(e.target.checked)}
              className="mt-0.5 accent-brand shrink-0"
            />
            <span className="text-[11px] text-slate-600 leading-relaxed">
              I confirm I have inspected or will inspect the property prior to the auction closing.
            </span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={asIsAck}
              onChange={(e) => setAsIsAck(e.target.checked)}
              className="mt-0.5 accent-brand shrink-0"
            />
            <span className="text-[11px] text-slate-600 leading-relaxed">
              I understand all items are sold as-is. No refunds or exchanges are permitted after a successful offer.
            </span>
          </label>
        </div>

        <p className="text-[10px] text-slate-400 leading-relaxed">
          By submitting, you confirm this is a genuine and formal offer to purchase. Quickway Auctioneers will contact you to proceed.
        </p>

        <button
          type="submit"
          disabled={submitState === 'submitting' || !inspectionAck || !asIsAck}
          className={cn(
            'w-full flex items-center justify-center gap-2',
            'bg-brand hover:bg-brand-dark text-white font-semibold text-sm py-3 rounded-xl transition-colors',
            (submitState === 'submitting' || !inspectionAck || !asIsAck) && 'opacity-60 cursor-not-allowed'
          )}
        >
          <Send size={14} />
          {submitState === 'submitting' ? 'Submitting Offer…' : 'Submit Offer to Quickway'}
        </button>
      </form>

      {/* My submitted offers history */}
      {myOffers.length > 0 && (
        <div className="border-t border-slate-100 pt-3 mt-2">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-2">Your Submitted Offers</p>
          <div className="space-y-2">
            {myOffers.map((offer, i) => (
              <div
                key={offer.id}
                className={cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-xl',
                  i === 0 ? 'bg-brand-light border border-brand/20' : 'bg-slate-50'
                )}
              >
                <div className="flex items-center gap-2">
                  {i === 0 && <span className="w-1.5 h-1.5 rounded-full bg-brand" />}
                  <span className={cn('text-[11px] font-bold font-tabular', i === 0 ? 'text-brand' : 'text-slate-700')}>
                    {formatCurrency(offer.amount, currency, 'en-UG')}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">{formatDate(offer.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Video embed helper
// ─────────────────────────────────────────────────────────────────────────────

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/)
  return m ? m[1] : null
}

function VideoEmbed({ url }: { url: string }) {
  const ytId = getYouTubeId(url)
  if (ytId) {
    return (
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
        <iframe
          className="absolute inset-0 w-full h-full rounded-xl"
          src={`https://www.youtube.com/embed/${ytId}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }
  const vimeoId = getVimeoId(url)
  if (vimeoId) {
    return (
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
        <iframe
          className="absolute inset-0 w-full h-full rounded-xl"
          src={`https://player.vimeo.com/video/${vimeoId}`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }
  return (
    <video
      src={url}
      controls
      className="w-full rounded-xl max-h-72 bg-black"
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

type LotTab = 'all' | 'active' | 'closed'

export default function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [activeImage, setActiveImage] = useState(0)
  const [lotTab, setLotTab] = useState<LotTab>('all')

  const [auction, setAuction] = useState<Auction | null>(null)
  const [lots, setLots] = useState<Lot[]>([])
  const [bids, setBids] = useState<Bid[]>([])

  useEffect(() => {
    if (!id) return
    Promise.all([getAuction(id), getLots(id)]).then(([a, ls]) => {
      if (a) setAuction(a)
      setLots(ls)
      if (ls[0]) getBidsForLot(ls[0].id).then(setBids).catch(() => {})
    }).catch(() => {})
  }, [id])

  const { user } = useAuthStore()

  const refreshBids = useCallback(() => {
    const mainLot = lots[0]
    if (mainLot) getBidsForLot(mainLot.id).then(setBids).catch(() => {})
  }, [lots])

  // Real-time: update lot in state when an offer arrives; refresh offer count
  useLiveBids(auction?.id ?? '', {
    onLotChange: (row) => {
      setLots((prev) =>
        prev.map((l) =>
          l.id === row.id
            ? { ...l, current_bid: row.current_bid, bid_count: row.bid_count }
            : l
        )
      )
    },
    onBidInsert: refreshBids,
  })

  // Lot tab filtering
  const filteredLots = lots.filter((l) => {
    if (lotTab === 'active') return l.status === 'open'
    if (lotTab === 'closed') return l.status === 'sold' || l.status === 'unsold'
    return true
  })

  // My offers — only this user's submissions, newest first
  const myOffers = user ? bids.filter((b) => b.bidder_id === user.id) : []

  if (!auction) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-20 text-slate-400">
        <p className="text-sm font-medium">Auction not found</p>
        <Link to="/auctions" className="mt-2 text-xs text-brand hover:underline">← Back to Auctions</Link>
      </div>
    )
  }

  const isLive  = auction.status === 'live'
  const mainLot = lots[0]

  const gallery = [
    ...(auction.images?.length ? auction.images : (auction.image_url ? [auction.image_url] : [])),
    ...lots.flatMap((l) => l.images?.length ? l.images : (l.image_url ? [l.image_url] : [])),
  ].filter(Boolean).slice(0, 12)

  return (
    <div className="px-3 py-4 sm:p-6 max-w-[1200px] mx-auto">
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
        {([
          { label: 'All Lots', value: 'all' as LotTab,    count: lots.length },
          { label: 'Active',   value: 'active' as LotTab, count: lots.filter((l) => l.status === 'open').length },
          { label: 'Closed',   value: 'closed' as LotTab, count: lots.filter((l) => l.status === 'sold' || l.status === 'unsold').length },
        ]).map((t) => (
          <button
            key={t.value}
            onClick={() => setLotTab(t.value)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px',
              lotTab === t.value
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {t.label}
            <span className={cn(
              'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
              lotTab === t.value ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'
            )}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Two-column layout ─────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-6 md:items-start">

        {/* ── Left: gallery + info ─────────────────────────── */}
        <div className="w-full md:flex-1 min-w-0">
          {/* Gallery */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm mb-4">
            <img
              src={gallery[activeImage]}
              alt={auction.title}
              className="w-full h-48 sm:h-64 object-cover"
            />
            {gallery.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
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

          {/* Video — auction-level first, then first lot with a video */}
          {(() => {
            const videoUrl = auction.video_url || lots.find((l) => l.video_url)?.video_url
            return videoUrl ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-3">Video</p>
                <VideoEmbed url={videoUrl} />
              </div>
            ) : null
          })()}

          {/* Title & org */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={auction.status} />
                  <span className="text-[10px] text-slate-400 font-mono">{auction.auction_ref}</span>
                </div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-snug break-words">{auction.title}</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-4">
              <span className="flex items-center gap-1"><Building2 size={11} />{auction.org_name || 'Quickway Auctioneers & Court Bailiffs'}</span>
              {(auction.org_location || auction.location) && (
                <span className="flex items-center gap-1"><MapPin size={11} />{auction.org_location || auction.location}</span>
              )}
              <span className="flex items-center gap-1.5 bg-brand-light text-brand px-2 py-0.5 rounded-full font-medium">
                <Ticket size={10} />
                Entry: {formatCurrency(auction.participation_fee, auction.currency, 'en-UG')}
              </span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed break-words">{auction.description}</p>
          </div>

          {/* Lots list */}
          {lots.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
              <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Package size={14} className="text-brand" />
                Lots in this Auction
                <span className="ml-auto text-[10px] text-slate-400 font-normal">
                  {filteredLots.length} lot{filteredLots.length !== 1 ? 's' : ''}
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
              {filteredLots.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No lots in this category.</p>
              ) : (
                <div className="space-y-3">
                  {filteredLots.map((lot) => (
                    <div
                      key={lot.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-brand/30 transition-colors cursor-pointer"
                    >
                      <img src={lot.images?.[0] || lot.image_url} alt={lot.title} className="w-14 h-10 object-cover rounded-lg shrink-0 bg-slate-100" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                          Lot {lot.lot_number} — {lot.title}
                        </p>
                        {auction.status === 'closed' && (
                          <p className="text-[10px] text-slate-400 mt-0.5">{lot.bid_count} offer{lot.bid_count !== 1 ? 's' : ''}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {auction.status === 'closed' ? (
                          <>
                            <p className="text-[10px] text-slate-400">Final</p>
                            <p className="text-xs font-bold text-slate-800 font-tabular">
                              {formatCurrency(lot.current_bid, auction.currency, 'en-UG')}
                            </p>
                          </>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic">Sealed</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Offers activity */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-2">
              <FileText size={14} className="text-brand" />
              Offers Activity
            </h2>
            {auction.status === 'closed' && auction.bid_count > 0 ? (
              <p className="text-[11px] text-slate-400 leading-relaxed">
                <span className="font-semibold text-slate-600">{auction.bid_count}</span> offer{auction.bid_count !== 1 ? 's' : ''} were received for this property.
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Offers are sealed and confidential. All bids will be revealed once the auction closes.
              </p>
            )}
          </div>
        </div>

        {/* ── Right: sticky bid card ─────────────────────── */}
        <div className="w-full md:w-80 shrink-0 md:sticky top-6 space-y-4">
          {/* Stats card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 mb-5">
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
                <p className="text-xs text-slate-500 mb-1">Offers Received</p>
                <p className="text-lg font-bold text-slate-900 font-tabular flex items-center gap-1">
                  <Users size={14} className="text-brand" />
                  {auction.status === 'closed' ? (mainLot?.bid_count ?? auction.bid_count) : '—'}
                </p>
              </div>
              <div className={cn('rounded-xl p-3', isLive ? 'bg-brand-light' : 'bg-slate-50')}>
                <p className="text-xs text-slate-500 mb-1">
                  {auction.status === 'closed' ? 'Final Offer' : 'Starting From'}
                </p>
                <p className={cn('text-sm font-bold font-tabular', isLive ? 'text-brand' : 'text-slate-700')}>
                  {auction.status === 'closed' && auction.current_bid > 0
                    ? formatCurrency(auction.current_bid, auction.currency, 'en-UG')
                    : mainLot && mainLot.reserve_price > 0
                    ? formatCurrency(mainLot.reserve_price, auction.currency, 'en-UG')
                    : '—'}
                </p>
              </div>
            </div>

            {/* Offer form / participation gate */}
            <OfferInput
              reservePrice={mainLot?.reserve_price ?? 0}
              auctionStatus={auction.status}
              currency={auction.currency}
              auctionId={auction.id}
              lotId={mainLot?.id}
              feeAmount={auction.participation_fee}
              bankDetails={auction.bank_details}
              auctionTitle={auction.title}
              myOffers={myOffers}
              onOfferPlaced={refreshBids}
            />
          </div>

          {/* Auction details table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Auction Details
            </h3>
            {mainLot && Object.keys(mainLot.specs ?? {}).length > 0 ? (
              Object.entries(mainLot.specs).map(([k, v]) => (
                <SpecRow key={k} label={k} value={v} />
              ))
            ) : (
              <>
                <SpecRow label="Category" value={auction.category} />
                <SpecRow label="Auctioneer" value={auction.org_name || 'Quickway Auctioneers & Court Bailiffs'} />
                <SpecRow label="Location" value={auction.org_location || auction.location || '—'} />
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
              <a href="mailto:info@quickway.ug" className="text-brand hover:underline">Contact Quickway</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
