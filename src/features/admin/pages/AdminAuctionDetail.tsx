import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, Save, Package, Plus, Pencil, Trash2,
  Radio, Clock, ImagePlus, Loader2, Video,
} from 'lucide-react'
import {
  getAuction, getLots, createAuction, updateAuction,
  updateAuctionStatus, createLot, updateLot, deleteLot,
} from '../../../services/auctions.service'
import { getOrganizations } from '../../../services/organizations.service'
import { cn } from '../../../lib/utils'
import LotFormModal, { type LotDraft } from '../components/LotFormModal'
import ImageUploadField from '../components/ImageUploadField'
import type { Auction, AuctionStatus, Lot } from '../../../types/auction.types'
import type { Organization } from '../../../types/org.types'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Residential Property', 'Commercial Property', 'Industrial Property',
  'Agricultural Land', 'Mailo Land', 'Leasehold Property', 'Freehold Property',
  'Strata/Apartment', 'Mixed Use', 'Vacant Land/Plot', 'Vehicle & Equipment',
  'Court Order Sale',
]
const CURRENCIES  = ['UGX', 'USD', 'KES']
const STARTING_BID_PRESETS  = [50_000_000, 100_000_000, 150_000_000, 200_000_000, 250_000_000, 300_000_000, 500_000_000, 1_000_000_000]
const BID_INCREMENT_PRESETS = [500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000]

const STATUS_CHIP: Record<AuctionStatus, string> = {
  draft:     'bg-slate-100 text-slate-500',
  scheduled: 'bg-brand-light text-brand',
  live:      'bg-amber-light text-amber-dark',
  closed:    'bg-slate-100 text-slate-400',
  cancelled: 'bg-red-50 text-red-400',
}

const STATUS_TRANSITIONS: Record<AuctionStatus, { label: string; next: AuctionStatus; style: string }[]> = {
  draft:     [{ label: 'Publish to Scheduled', next: 'scheduled', style: 'bg-brand hover:bg-brand-dark text-white' }],
  scheduled: [
    { label: 'Go Live',       next: 'live',  style: 'bg-amber hover:bg-amber-dark text-white' },
    { label: 'Back to Draft', next: 'draft', style: 'bg-slate-100 hover:bg-slate-200 text-slate-600' },
  ],
  live:      [{ label: 'Close Auction', next: 'closed', style: 'bg-red-50 hover:bg-red-100 text-red-600' }],
  closed:    [],
  cancelled: [],
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type AuctionForm = {
  title: string
  description: string
  category: string
  location: string
  org_id: string
  visibility: 'public' | 'org_only'
  starts_at: string
  ends_at: string
  bank_details: string
  status: AuctionStatus
  participation_fee: number
  currency: string
  image_url: string
  images: string[]
  video_url: string
  auction_ref: string
  starting_bid: number
  bid_increment: number
}

function blankForm(): AuctionForm {
  return {
    title: '', description: '', category: 'Vehicle & Equipment', location: '',
    org_id: '', visibility: 'public',
    starts_at: '', ends_at: '', bank_details: '',
    status: 'draft', participation_fee: 0, currency: 'UGX',
    image_url: '', images: [''], video_url: '',
    auction_ref: `QW-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    starting_bid: 0, bid_increment: 50_000,
  }
}

function auctionToForm(a: Auction): AuctionForm {
  return {
    title:             a.title,
    description:       a.description,
    category:          a.category,
    location:          a.location,
    org_id:            a.org_id ?? '',
    visibility:        'public',
    starts_at:         a.starts_at ? a.starts_at.slice(0, 16) : '',
    ends_at:           a.ends_at   ? a.ends_at.slice(0, 16)   : '',
    bank_details:      a.bank_details ?? '',
    status:            a.status,
    participation_fee: a.participation_fee,
    currency:          a.currency,
    image_url:         a.image_url ?? '',
    images:            a.images?.length ? a.images : (a.image_url ? [a.image_url] : ['']),
    video_url:         a.video_url ?? '',
    auction_ref:       a.auction_ref,
    starting_bid:      0,
    bid_increment:     50_000,
  }
}

function lotToLotDraft(lot: Lot): LotDraft {
  const specs = lot.specs
    ? Object.entries(lot.specs).map(([key, value]) => ({ key, value: String(value) }))
    : []
  return {
    id:            lot.id,
    lot_number:    lot.lot_number,
    title:         lot.title,
    description:   lot.description ?? '',
    reserve_price: lot.reserve_price,
    starting_bid:  lot.current_bid > 0 ? lot.current_bid : lot.reserve_price,
    bid_increment: lot.bid_increment,
    images:        lot.images?.length ? lot.images : (lot.image_url ? [lot.image_url] : ['']),
    video_url:     lot.video_url ?? '',
    specs,
  }
}

function lotDraftToPayload(draft: LotDraft, auctionId: string): Omit<Lot, 'id' | 'current_bid' | 'bid_count' | 'winner_id' | 'status'> {
  const specs: Record<string, string> = {}
  draft.specs.forEach(({ key, value }) => { if (key.trim()) specs[key.trim()] = value })
  const cleanImages = draft.images.filter(Boolean)
  return {
    auction_id:    auctionId,
    lot_number:    draft.lot_number,
    title:         draft.title,
    description:   draft.description,
    image_url:     cleanImages[0] ?? '',
    images:        cleanImages,
    video_url:     draft.video_url || null,
    reserve_price: draft.reserve_price,
    bid_increment: draft.bid_increment,
    specs,
  }
}

function fmt(n: number) { return n.toLocaleString('en-UG') }

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminAuctionDetail() {
  const { id }     = useParams<{ id: string }>()
  const navigate   = useNavigate()
  const isNew      = !id || id === 'new'

  const [form, setForm]     = useState<AuctionForm>(blankForm)
  const [lots, setLots]     = useState<Lot[]>([])
  const [orgs, setOrgs]     = useState<Organization[]>([])
  const [auctionId, setAuctionId] = useState<string | null>(isNew ? null : (id ?? null))
  // Stable temp ID used for storage paths before the auction is saved (so images upload to real URLs)
  const tempUploadId = useRef(`new-${Date.now()}`)
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving]   = useState(false)
  const [saved, setSaved]         = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [lotModal, setLotModal]   = useState<{ open: boolean; editing: LotDraft | null }>({ open: false, editing: null })
  const [quickwayOrgId, setQuickwayOrgId] = useState<string | null>(null)
  const [customStartingBid, setCustomStartingBid]   = useState(false)
  const [customBidIncrement, setCustomBidIncrement] = useState(false)

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (isNew) {
      const o = await getOrganizations()
      setOrgs(o)
      const qw = o.find((org) => org.name.toLowerCase().includes('quickway'))
      if (qw) setQuickwayOrgId(qw.id)
      if (o.length > 0) setForm((f) => ({ ...f, org_id: o[0].id }))
      return
    }
    try {
      const [auction, lotsData, orgsData] = await Promise.all([
        getAuction(id!),
        getLots(id!),
        getOrganizations(),
      ])
      if (auction) {
        const base = auctionToForm(auction)
        setForm(lotsData.length === 1
          ? { ...base, starting_bid: lotsData[0].reserve_price, bid_increment: lotsData[0].bid_increment }
          : base
        )
      }
      setLots(lotsData)
      setOrgs(orgsData)
      const qw = orgsData.find((org) => org.name.toLowerCase().includes('quickway'))
      if (qw) setQuickwayOrgId(qw.id)
    } catch { /* ignore */ }
  }, [id, isNew])

  useEffect(() => {
    setIsLoading(true)
    loadData().finally(() => setIsLoading(false))
  }, [loadData])

  // ── Field helper ──────────────────────────────────────────────────────────

  const field = <K extends keyof AuctionForm>(key: K, value: AuctionForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  // ── Auction image slot helpers ─────────────────────────────────────────────

  const MAX_AUCTION_IMAGES = 6
  const displayedAuctionImages = form.images.length === 0 ? [''] : form.images

  const setAuctionImage = (i: number, url: string) =>
    setForm((f) => {
      const next = [...f.images]
      next[i] = url
      return { ...f, images: next }
    })

  const removeAuctionSlot = (i: number) =>
    setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }))

  const addAuctionSlot = () => {
    if (form.images.length >= MAX_AUCTION_IMAGES) return
    setForm((f) => ({ ...f, images: [...f.images, ''] }))
  }

  const auctionSlotLabel = (i: number) => (i === 0 ? 'Cover Image' : `Photo ${i + 1}`)

  // ── Save auction ──────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.title.trim()) { setSaveError('Title is required.'); return }
    setIsSaving(true); setSaveError(null)
    try {
      const cleanImages = form.images.filter(Boolean)
      const payload = {
        title:             form.title,
        description:       form.description,
        category:          form.category,
        location:          form.location,
        org_id:            form.org_id || quickwayOrgId || null,
        starts_at:         form.starts_at || undefined,
        ends_at:           form.ends_at || undefined,
        bank_details:      form.bank_details,
        status:            form.status,
        participation_fee: form.participation_fee,
        currency:          form.currency,
        image_url:         cleanImages[0] ?? form.image_url,
        images:            cleanImages,
        video_url:         form.video_url || null,
        auction_ref:       form.auction_ref,
        lot_count:         lots.length,
      }

      if (isNew) {
        const created = await createAuction(payload as Parameters<typeof createAuction>[0])
        if (form.starting_bid > 0) {
          await createLot({
            auction_id:    created.id,
            lot_number:    1,
            title:         form.title,
            description:   form.description ?? '',
            image_url:     cleanImages[0] ?? '',
            images:        cleanImages,
            reserve_price: form.starting_bid,
            bid_increment: form.bid_increment || 50_000,
            specs:         {},
          })
          await updateAuction(created.id, { lot_count: 1 })
        }
        setAuctionId(created.id)
        navigate(`/admin/auctions/${created.id}`, { replace: true })
      } else {
        await updateAuction(auctionId!, payload)
        if (form.starting_bid > 0 && lots.length <= 1) {
          const autoLotPayload = {
            auction_id:    auctionId!,
            lot_number:    1,
            title:         form.title,
            description:   form.description ?? '',
            image_url:     cleanImages[0] ?? '',
            images:        cleanImages,
            reserve_price: form.starting_bid,
            bid_increment: form.bid_increment || 50_000,
            specs:         {},
          }
          if (lots.length === 0) {
            const newLot = await createLot(autoLotPayload)
            setLots([newLot])
            await updateAuction(auctionId!, { lot_count: 1 })
          } else {
            await updateLot(lots[0].id, { reserve_price: form.starting_bid, bid_increment: form.bid_increment })
            setLots((prev) => prev.map((l) => ({ ...l, reserve_price: form.starting_bid, bid_increment: form.bid_increment })))
          }
        }
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } catch (e: unknown) {
      console.error('Auction save error:', e)
      const pgErr = e as Record<string, unknown>
      const detail = [pgErr?.message, pgErr?.details, pgErr?.hint, pgErr?.code].filter(Boolean).join(' | ')
      setSaveError(detail || 'Save failed.')
    } finally { setIsSaving(false) }
  }

  // ── Status transition ─────────────────────────────────────────────────────

  const handleStatusTransition = async (next: AuctionStatus) => {
    if (!auctionId) return
    try {
      await updateAuctionStatus(auctionId, next)
      setForm((f) => ({ ...f, status: next }))
    } catch { /* ignore */ }
  }

  // ── Lot CRUD ──────────────────────────────────────────────────────────────

  const handleSaveLot = async (draft: LotDraft) => {
    const currentAuctionId = auctionId
    if (!currentAuctionId) return

    try {
      if (draft.id.startsWith('lot-')) {
        // New lot
        const payload = lotDraftToPayload(draft, currentAuctionId)
        const newLot  = await createLot(payload)
        setLots((prev) => [...prev, newLot])
        await updateAuction(currentAuctionId, { lot_count: lots.length + 1 })
      } else {
        // Existing lot
        const payload = lotDraftToPayload(draft, currentAuctionId)
        await updateLot(draft.id, payload)
        setLots((prev) => prev.map((l) => l.id === draft.id ? { ...l, ...payload } : l))
      }
    } catch { /* ignore */ }
    setLotModal({ open: false, editing: null })
  }

  const handleDeleteLot = async (lotId: string) => {
    if (!auctionId) return
    try {
      await deleteLot(lotId)
      const newLots = lots.filter((l) => l.id !== lotId)
      setLots(newLots)
      await updateAuction(auctionId, { lot_count: newLots.length })
    } catch { /* ignore */ }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-brand" />
    </div>
  )

  const transitions = STATUS_TRANSITIONS[form.status] ?? []

  return (
    <div className="p-6 max-w-[1300px] mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link to="/admin/auctions" className="mt-0.5 shrink-0 text-slate-400 hover:text-brand transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <div className="min-w-0">
            <input
              value={form.title}
              onChange={(e) => field('title', e.target.value)}
              placeholder="New Auction"
              className="text-xl font-bold text-slate-900 bg-transparent border-0 outline-none hover:bg-slate-50 focus:bg-slate-50 rounded-lg px-1 -ml-1 w-full max-w-lg transition-colors placeholder:text-slate-300"
            />
            <p className="text-[10px] text-slate-400 font-mono mt-0.5 ml-1">{form.auction_ref}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className={cn('text-[10px] font-semibold px-2.5 py-1 rounded-full', STATUS_CHIP[form.status])}>
            {form.status === 'live'
              ? <span className="flex items-center gap-1"><Radio size={8} className="animate-pulse" />Live</span>
              : form.status}
          </span>
          {saveError && <p className="text-[10px] text-red-500 max-w-xs truncate">{saveError}</p>}
          <button onClick={handleSave} disabled={isSaving}
            className={cn('flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors',
              saved ? 'bg-green-50 text-green-700'
              : isSaving ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-brand hover:bg-brand-dark text-white')}>
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {saved ? 'Saved!' : isNew ? 'Create Auction' : 'Save'}
          </button>
        </div>
      </div>

      {/* Status strip */}
      {!isNew && transitions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 mb-5 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-700">Lifecycle</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Current: <span className="font-semibold capitalize text-slate-600">{form.status}</span></p>
          </div>
          <div className="flex items-center gap-2">
            {transitions.map((t) => (
              <button key={t.next} onClick={() => handleStatusTransition(t.next)}
                className={cn('px-4 py-2 rounded-xl text-xs font-semibold transition-colors', t.style)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {!isNew && form.status === 'closed' && (
        <div className="bg-slate-50 rounded-2xl border border-slate-100 px-5 py-3.5 mb-5">
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Clock size={12} className="text-slate-400" />Auction is closed — no further lifecycle changes.
          </p>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* LEFT */}
        <div className="lg:col-span-2 space-y-5">

          {/* Auction details */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">Auction Details</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">Category</label>
                  <select value={form.category} onChange={(e) => field('category', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors">
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">Location</label>
                  <input value={form.location} onChange={(e) => field('location', e.target.value)} placeholder="City, Country"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => field('description', e.target.value)} rows={3}
                  placeholder="Describe this auction…"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors resize-none" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">Organisation</label>
                  <select value={form.org_id} onChange={(e) => field('org_id', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors">
                    <option value="">Platform Auction (no org)</option>
                    {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">Visibility</label>
                  <div className="flex gap-2 mt-1">
                    {(['public', 'org_only'] as const).map((v) => (
                      <button key={v} type="button" onClick={() => field('visibility', v)}
                        className={cn('flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-colors',
                          form.visibility === v ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>
                        {v === 'public' ? 'Public' : 'Org Only'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">Starts At</label>
                  <input type="datetime-local" value={form.starts_at} onChange={(e) => field('starts_at', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">Ends At</label>
                  <input type="datetime-local" value={form.ends_at} onChange={(e) => field('ends_at', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">Bank Details</label>
                <textarea value={form.bank_details} onChange={(e) => field('bank_details', e.target.value)} rows={3}
                  placeholder="Bank name, account number, branch…"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors resize-none font-mono" />
              </div>
            </div>
          </div>

          {/* Lots */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-800">Lots</h2>
                <span className="text-[10px] font-bold bg-brand text-white px-2 py-0.5 rounded-full">{lots.length}</span>
              </div>
              <button
                onClick={() => {
                  if (isNew) { setSaveError('Save the auction first before adding lots.'); return }
                  setLotModal({ open: true, editing: null })
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-brand hover:bg-brand-dark text-white transition-colors">
                <Plus size={12} />Add Lot
              </button>
            </div>

            {/* Starting Bid panel — shown for single-item auctions (0 or 1 auto-lot) */}
            {lots.length <= 1 && (
              <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-0.5">Set the starting bid for this property</p>
                  <p className="text-[10px] text-slate-400">Then click <strong>Save</strong> above. For multi-item auctions (cars, furniture) use <strong>Add Lot</strong> instead.</p>
                </div>

                {/* Starting Bid */}
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-2">Starting Bid ({form.currency})</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {STARTING_BID_PRESETS.map((p) => (
                      <button key={p} type="button"
                        onClick={() => { field('starting_bid', p); setCustomStartingBid(false) }}
                        className={cn('px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors',
                          !customStartingBid && form.starting_bid === p
                            ? 'bg-brand text-white'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100')}>
                        {p >= 1_000_000_000 ? `${p / 1_000_000_000}B` : `${p / 1_000_000}M`}
                      </button>
                    ))}
                    <button type="button"
                      onClick={() => setCustomStartingBid(true)}
                      className={cn('px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors',
                        customStartingBid ? 'bg-brand text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100')}>
                      Custom
                    </button>
                  </div>
                  {customStartingBid && (
                    <input type="number" min="0" step="1000000"
                      value={form.starting_bid || ''}
                      onChange={(e) => field('starting_bid', Number(e.target.value))}
                      placeholder="Enter amount e.g. 320000000"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors mb-1"
                    />
                  )}
                  {form.starting_bid > 0 && (
                    <p className="text-[11px] font-semibold text-brand">
                      = {form.currency} {fmt(form.starting_bid)}
                    </p>
                  )}
                </div>

                {/* Bid Increment */}
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-2">Bid Increment ({form.currency})</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {BID_INCREMENT_PRESETS.map((p) => (
                      <button key={p} type="button"
                        onClick={() => { field('bid_increment', p); setCustomBidIncrement(false) }}
                        className={cn('px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors',
                          !customBidIncrement && form.bid_increment === p
                            ? 'bg-brand text-white'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100')}>
                        {p >= 1_000_000 ? `${p / 1_000_000}M` : `${p / 1_000}K`}
                      </button>
                    ))}
                    <button type="button"
                      onClick={() => setCustomBidIncrement(true)}
                      className={cn('px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors',
                        customBidIncrement ? 'bg-brand text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100')}>
                      Custom
                    </button>
                  </div>
                  {customBidIncrement && (
                    <input type="number" min="0" step="100000"
                      value={form.bid_increment || ''}
                      onChange={(e) => field('bid_increment', Number(e.target.value))}
                      placeholder="Enter increment e.g. 2000000"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors mb-1"
                    />
                  )}
                  {form.bid_increment > 0 && (
                    <p className="text-[11px] font-semibold text-brand">
                      = {form.currency} {fmt(form.bid_increment)} per bid step
                    </p>
                  )}
                </div>
              </div>
            )}

            {lots.length === 0 ? (
              <div className="py-6 text-center text-slate-300">
                <Package size={28} strokeWidth={1} className="mx-auto mb-2" />
                <p className="text-xs text-slate-400">{isNew ? 'Save the auction first to create the lot.' : 'Set a Starting Bid above and save, or Add Lot for multi-item.'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide pb-2 pr-3 w-8">#</th>
                      <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide pb-2 pr-3">Title</th>
                      <th className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide pb-2 pr-3 hidden md:table-cell">Reserve</th>
                      <th className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide pb-2 pr-3 hidden lg:table-cell">Increment</th>
                      <th className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {lots
                      .slice()
                      .sort((a, b) => a.lot_number - b.lot_number)
                      .map((lot) => (
                        <tr key={lot.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 pr-3 text-xs font-mono text-slate-400">{lot.lot_number}</td>
                          <td className="py-3 pr-3">
                            <div className="flex items-center gap-2.5">
                              {lot.image_url ? (
                                <img src={lot.image_url} alt="" className="w-8 h-7 rounded-lg object-cover shrink-0" />
                              ) : (
                                <div className="w-8 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                  <ImagePlus size={10} className="text-slate-300" />
                                </div>
                              )}
                              <p className="text-xs font-semibold text-slate-800 truncate max-w-[200px]">{lot.title}</p>
                            </div>
                          </td>
                          <td className="py-3 pr-3 text-right hidden md:table-cell">
                            <span className="text-xs text-slate-600">{fmt(lot.reserve_price)}</span>
                          </td>
                          <td className="py-3 pr-3 text-right hidden lg:table-cell">
                            <span className="text-xs text-slate-500">{fmt(lot.bid_increment)}</span>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setLotModal({ open: true, editing: lotToLotDraft(lot) })}
                                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-brand-light text-slate-400 hover:text-brand transition-colors">
                                <Pencil size={11} />
                              </button>
                              <button onClick={() => handleDeleteLot(lot.id)}
                                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-5">
          {/* Image & Media */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">Image & Media</h2>

            {/* Multi-image grid */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">
                  Photos <span className="normal-case text-slate-300">({displayedAuctionImages.length}/{MAX_AUCTION_IMAGES})</span>
                </p>
                {form.images.length < MAX_AUCTION_IMAGES && (
                  <button
                    type="button"
                    onClick={addAuctionSlot}
                    className="flex items-center gap-1 text-[10px] font-semibold text-brand hover:text-brand-dark transition-colors"
                  >
                    <Plus size={10} />Add Photo
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {displayedAuctionImages.map((url, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-slate-400 uppercase tracking-wide font-semibold">
                        {auctionSlotLabel(i)}
                      </span>
                      {(form.images.length > 1 || i > 0) && (
                        <button
                          type="button"
                          onClick={() => removeAuctionSlot(i)}
                          className="text-[9px] text-red-400 hover:text-red-600 transition-colors flex items-center gap-0.5"
                        >
                          <Trash2 size={9} />Remove
                        </button>
                      )}
                    </div>
                    <ImageUploadField
                      value={url}
                      onChange={(u) => setAuctionImage(i, u)}
                      uploadPath={`auctions/${auctionId ?? tempUploadId.current}/photo-${i}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Video URL */}
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-1.5 flex items-center gap-1">
                <Video size={10} />Video URL <span className="normal-case text-slate-300">(optional)</span>
              </label>
              <input
                type="url"
                value={form.video_url}
                onChange={(e) => field('video_url', e.target.value)}
                placeholder="https://youtube.com/watch?v=… or direct video link"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
              />
            </div>
          </div>

          {/* Fee & Settings */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">Fee & Settings</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">Auction Ref</label>
                <input value={form.auction_ref} readOnly
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-100 bg-slate-50 text-slate-400 font-mono cursor-default" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">Entry Fee</label>
                  <input type="number" value={form.participation_fee || ''} placeholder="0" min={0}
                    onChange={(e) => field('participation_fee', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">Currency</label>
                  <select value={form.currency} onChange={(e) => field('currency', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors">
                    {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lot modal */}
      {lotModal.open && (
        <LotFormModal
          initial={lotModal.editing}
          nextLotNumber={lots.length + 1}
          auctionId={auctionId}
          onSave={handleSaveLot}
          onClose={() => setLotModal({ open: false, editing: null })}
        />
      )}
    </div>
  )
}
