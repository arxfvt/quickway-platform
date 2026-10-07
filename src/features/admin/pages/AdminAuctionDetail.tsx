import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useParams, useNavigate, useBlocker } from 'react-router-dom'
import {
  ChevronLeft, Save, Package, Plus, Pencil, Trash2,
  Radio, Clock, ImagePlus, Loader2, Video, Star, Upload,
} from 'lucide-react'
import {
  getAuction, getLots, createAuction, updateAuction,
  updateAuctionStatus, createLot, updateLot, deleteLot, uploadAuctionImage,
} from '../../../services/auctions.service'
import { compressImage } from '../../../lib/imageUtils'
import { getOrganizations } from '../../../services/organizations.service'
import { cn } from '../../../lib/utils'
import { toLocalInput, fromLocalInput } from '../../../utils/date'
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
  // Closed auctions (closed by an admin or automatically at the end time) can
  // be reopened with a new end time.
  closed:    [{ label: 'Reopen with new end time', next: 'live', style: 'bg-amber hover:bg-amber-dark text-white' }],
  cancelled: [],
}

/** Supabase errors are plain objects, not Error instances — pull out something readable. */
function errorText(e: unknown, fallback: string): string {
  const err = e as Record<string, unknown> | null
  // The request never reached the server (connection dropped, offline, or blocked by an extension)
  if (String(err?.message ?? '').includes('Failed to fetch')) {
    return 'Could not reach the server. Check your internet connection and click Save again — your changes are still on this page.'
  }
  const detail = [err?.message, err?.details, err?.hint, err?.code].filter(Boolean).join(' | ')
  return detail || fallback
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
    starts_at:         toLocalInput(a.starts_at),
    ends_at:           toLocalInput(a.ends_at),
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

/** "Fri, 1 Jan 2027, 2:00 am" — spelled out under the date fields so a wrong time is easy to spot */
function readableDate(local: string): string {
  const iso = fromLocalInput(local)
  return iso
    ? new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso))
    : ''
}

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
  const [uploadsInFlight, setUploadsInFlight] = useState(0)
  const [bulkProgress, setBulkProgress] = useState<string | null>(null)
  const bulkInputRef = useRef<HTMLInputElement>(null)

  // Unsaved changes: compare the form with how it was last loaded or saved
  const [baseline, setBaseline] = useState<string | null>(null)
  const isDirty = baseline !== null && JSON.stringify(form) !== baseline
  const isDirtyRef = useRef(false)
  isDirtyRef.current = isDirty
  const allowNavRef = useRef(false)

  // Warn before leaving the page (in-app links, refresh or closing the tab) with unsaved changes
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    isDirtyRef.current && !allowNavRef.current && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('You have unsaved changes. Leave this page without saving?')) blocker.proceed()
    else blocker.reset()
  }, [blocker])
  useEffect(() => {
    if (!isDirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [isDirty])

  // Ctrl+S / Cmd+S saves
  const saveRef = useRef<() => void>(() => {})
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveRef.current() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
      if (!auction) {
        setSaveError('Could not load this auction. Refresh the page or go back to the list.')
        return
      }
      const base = auctionToForm(auction)
      setForm(lotsData.length === 1
        ? { ...base, starting_bid: lotsData[0].reserve_price, bid_increment: lotsData[0].bid_increment }
        : base
      )
      setLots(lotsData)
      setOrgs(orgsData)
      const qw = orgsData.find((org) => org.name.toLowerCase().includes('quickway'))
      if (qw) setQuickwayOrgId(qw.id)
    } catch (e) {
      setSaveError(errorText(e, 'Could not load this auction.'))
    }
  }, [id, isNew])

  useEffect(() => {
    setIsLoading(true)
    setBaseline(null)
    loadData().finally(() => setIsLoading(false))
  }, [loadData])

  // Once loading finishes, the loaded form counts as saved
  useEffect(() => {
    if (!isLoading && baseline === null) setBaseline(JSON.stringify(form))
  }, [isLoading, baseline, form])

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

  const makeCover = (i: number) =>
    setForm((f) => {
      const next = [...f.images]
      const [img] = next.splice(i, 1)
      return { ...f, images: [img, ...next] }
    })

  const trackUpload = (busy: boolean) => setUploadsInFlight((n) => n + (busy ? 1 : -1))

  /** Upload several photos at once into the free slots */
  const handleBulkPhotos = async (files: FileList | null) => {
    const picked = Array.from(files ?? []).filter((file) => file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name))
    if (picked.length === 0) return
    const room = MAX_AUCTION_IMAGES - form.images.filter(Boolean).length
    if (room <= 0) { setSaveError(`This listing already has ${MAX_AUCTION_IMAGES} photos. Remove one to add another.`); return }
    const batch = picked.slice(0, room)
    setSaveError(picked.length > room ? `Only ${room} more photo${room === 1 ? '' : 's'} fit, so the first ${room} were added.` : null)

    let failed = 0
    trackUpload(true)
    try {
      for (let k = 0; k < batch.length; k++) {
        setBulkProgress(`Uploading ${k + 1} of ${batch.length}…`)
        try {
          const compressed = await compressImage(batch[k])
          const url = await uploadAuctionImage(compressed, `auctions/${auctionId ?? tempUploadId.current}/photo-${Date.now()}-${k}.jpg`)
          setForm((f) => {
            const kept = f.images.filter(Boolean)
            return kept.length >= MAX_AUCTION_IMAGES ? f : { ...f, images: [...kept, url] }
          })
        } catch { failed++ }
      }
    } finally {
      setBulkProgress(null)
      trackUpload(false)
    }
    if (failed) setSaveError(`${failed} photo${failed === 1 ? '' : 's'} failed to upload. Check your internet connection and try again.`)
  }

  /** Push the end time out by a number of days (from the next full hour if it has already passed) */
  const extendEnds = (days: number) => {
    const current = fromLocalInput(form.ends_at)
    const stillAhead = !!current && new Date(current).getTime() > Date.now()
    const base = stillAhead ? new Date(current!) : new Date()
    if (!stillAhead) { base.setMinutes(0, 0, 0); base.setHours(base.getHours() + 1) }
    base.setDate(base.getDate() + days)
    field('ends_at', toLocalInput(base.toISOString()))
  }

  // ── Save auction ──────────────────────────────────────────────────────────

  /** Checks the form and returns an error message, or null when it can be saved. */
  const validate = (): string | null => {
    if (!form.title.trim()) return 'Title is required.'
    const starts = fromLocalInput(form.starts_at)
    const ends   = fromLocalInput(form.ends_at)
    if (form.starts_at && !starts) return 'Starts At is not a valid date.'
    if (form.ends_at && !ends) return 'Ends At is not a valid date.'
    if (starts && ends && new Date(ends) <= new Date(starts)) return 'Ends At must be after Starts At.'
    return null
  }

  /** Auction fields as stored in the database. Dates are converted from the admin's local time. */
  const buildPayload = () => {
    const cleanImages = form.images.filter(Boolean)
    return {
      title:             form.title.trim(),
      description:       form.description,
      category:          form.category,
      location:          form.location,
      org_id:            form.org_id || quickwayOrgId || null,
      starts_at:         fromLocalInput(form.starts_at),
      ends_at:           fromLocalInput(form.ends_at),
      bank_details:      form.bank_details,
      participation_fee: form.participation_fee,
      currency:          form.currency,
      image_url:         cleanImages[0] ?? form.image_url,
      images:            cleanImages,
      video_url:         form.video_url || null,
      auction_ref:       form.auction_ref,
      lot_count:         lots.length,
    }
  }

  const flashSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleSave = async () => {
    if (isSaving) return
    if (uploadsInFlight > 0) { setSaveError('A photo is still uploading. Wait for it to finish, then click Save.'); return }
    const savedSnapshot = JSON.stringify(form)
    const invalid = validate()
    if (invalid) { setSaveError(invalid); return }
    setIsSaving(true); setSaveError(null)
    try {
      const payload = buildPayload()
      const cleanImages = payload.images

      if (isNew) {
        const created = await createAuction({ ...payload, status: form.status } as Parameters<typeof createAuction>[0])
        if (form.starting_bid > 0) {
          await createLot({
            auction_id:    created.id,
            lot_number:    1,
            title:         payload.title,
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
        setBaseline(savedSnapshot)
        allowNavRef.current = true
        navigate(`/admin/auctions/${created.id}`, { replace: true })
      } else {
        // Status is not part of Save — it only changes through the Lifecycle
        // buttons, so a page left open can't undo an automatic close.
        await updateAuction(auctionId!, payload)
        if (form.starting_bid > 0 && lots.length <= 1) {
          const autoLotPayload = {
            auction_id:    auctionId!,
            lot_number:    1,
            title:         payload.title,
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
            // The single lot is the property itself — keep its title, text
            // and photos in step with the listing (specs are left as they are)
            const lotSync = {
              title:         autoLotPayload.title,
              description:   autoLotPayload.description,
              image_url:     autoLotPayload.image_url,
              images:        autoLotPayload.images,
              reserve_price: form.starting_bid,
              bid_increment: form.bid_increment,
            }
            await updateLot(lots[0].id, lotSync)
            setLots((prev) => prev.map((l) => ({ ...l, ...lotSync })))
          }
        }
        setBaseline(savedSnapshot)
        flashSaved()
      }
    } catch (e: unknown) {
      console.error('Auction save error:', e)
      setSaveError(errorText(e, 'Save failed.'))
    } finally { setIsSaving(false) }
  }

  saveRef.current = handleSave

  // ── Status transition ─────────────────────────────────────────────────────

  const handleStatusTransition = async (next: AuctionStatus) => {
    if (!auctionId) return
    setSaveError(null)

    if (next === 'closed' && !window.confirm('Close this auction now? Buyers will no longer be able to submit offers.')) return

    // Going live (or reopening) needs an end time in the future, otherwise the
    // auction would close again straight away. Save the form with it so a new
    // end time typed in is applied in the same click.
    if (next === 'live') {
      if (uploadsInFlight > 0) { setSaveError('A photo is still uploading. Wait for it to finish, then try again.'); return }
      const invalid = validate()
      if (invalid) { setSaveError(invalid); return }
      const ends = fromLocalInput(form.ends_at)
      if (!ends || new Date(ends).getTime() <= Date.now()) {
        setSaveError('Set "Ends At" to a future date and time first, then try again.')
        return
      }
    }

    setIsSaving(true)
    try {
      if (next === 'live') {
        await updateAuction(auctionId, { ...buildPayload(), status: 'live' })
      } else {
        await updateAuctionStatus(auctionId, next)
      }
      setForm((f) => ({ ...f, status: next }))
      // Going live saves the whole form; other changes only update the status
      setBaseline((b) => next === 'live'
        ? JSON.stringify({ ...form, status: next })
        : b ? JSON.stringify({ ...JSON.parse(b), status: next }) : b)
      flashSaved()
    } catch (e) {
      setSaveError(errorText(e, 'Could not change the auction status.'))
    } finally { setIsSaving(false) }
  }

  // ── Lot CRUD ──────────────────────────────────────────────────────────────

  const handleSaveLot = async (draft: LotDraft) => {
    const currentAuctionId = auctionId
    if (!currentAuctionId) return
    setSaveError(null)

    try {
      const payload = lotDraftToPayload(draft, currentAuctionId)
      if (draft.id.startsWith('lot-')) {
        // New lot
        const newLot = await createLot(payload)
        setLots((prev) => [...prev, newLot])
        await updateAuction(currentAuctionId, { lot_count: lots.length + 1 })
      } else {
        // Existing lot
        await updateLot(draft.id, payload)
        setLots((prev) => prev.map((l) => l.id === draft.id ? { ...l, ...payload } : l))
      }
      setLotModal({ open: false, editing: null })
    } catch (e) {
      // Keep the modal open so the admin doesn't lose what they typed
      // (alert, because the modal covers the page's error line)
      window.alert(errorText(e, 'Could not save the lot.'))
    }
  }

  const handleDeleteLot = async (lot: Lot) => {
    if (!auctionId) return
    const warning = lot.bid_count > 0
      ? `Delete lot ${lot.lot_number} "${lot.title}"? It has ${lot.bid_count} offer(s), which will be lost.`
      : `Delete lot ${lot.lot_number} "${lot.title}"?`
    if (!window.confirm(warning)) return
    setSaveError(null)
    try {
      await deleteLot(lot.id)
      const newLots = lots.filter((l) => l.id !== lot.id)
      setLots(newLots)
      await updateAuction(auctionId, { lot_count: newLots.length })
    } catch (e) {
      setSaveError(errorText(e, 'Could not delete the lot.'))
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-brand" />
    </div>
  )

  const transitions = STATUS_TRANSITIONS[form.status] ?? []
  // Based on the saved-or-typed end time, so the warning disappears once a future time is entered
  const endsIso = fromLocalInput(form.ends_at)
  const endTimePassed = !!endsIso && new Date(endsIso).getTime() <= Date.now()

  return (
    <div className="p-6 max-w-[1300px] mx-auto [&_input]:scroll-mt-24 [&_textarea]:scroll-mt-24 [&_select]:scroll-mt-24 [&_button]:scroll-mt-24">

      {/* Header — stays on screen while scrolling so Save is always reachable */}
      <div className="sticky top-0 z-20 -mx-6 px-6 py-3 mb-5 bg-background/95 backdrop-blur border-b border-slate-100 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link to="/admin/auctions" className="mt-0.5 shrink-0 text-slate-400 hover:text-brand transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <div className="min-w-0">
            <input
              value={form.title}
              onChange={(e) => field('title', e.target.value)}
              placeholder="New Auction"
              className="text-xl font-bold text-slate-900 bg-transparent border-0 outline-none hover:bg-slate-50 focus:bg-slate-50 rounded-lg px-1 -ml-1 w-full max-w-3xl transition-colors placeholder:text-slate-300"
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
          {isDirty && !isSaving && !saved && (
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-semibold text-amber-dark">
              <span className="w-1.5 h-1.5 rounded-full bg-amber" />Unsaved changes
            </span>
          )}
          <button onClick={handleSave} disabled={isSaving} title="Save (Ctrl+S)"
            className={cn('flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors',
              saved ? 'bg-green-50 text-green-700'
              : isSaving ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-brand hover:bg-brand-dark text-white')}>
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {saved ? 'Saved!' : isNew ? 'Create Auction' : 'Save'}
          </button>
        </div>
      </div>

      {saveError && (
        <div role="alert" className="bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl px-4 py-2.5 mb-5">
          {saveError}
        </div>
      )}

      {/* Status strip */}
      {!isNew && transitions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 mb-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-700">Lifecycle</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Current: <span className="font-semibold capitalize text-slate-600">{form.status}</span></p>
            {form.status === 'closed' && (
              <p className="text-[10px] text-slate-500 mt-1">
                To extend this auction, set a new <strong>Ends At</strong> below, then click <strong>Reopen with new end time</strong>.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {transitions.map((t) => (
              <button key={t.next} onClick={() => handleStatusTransition(t.next)} disabled={isSaving}
                className={cn('px-4 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50', t.style)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {!isNew && (form.status === 'live' || form.status === 'scheduled') && endTimePassed && (
        <div className="bg-amber-light/60 rounded-2xl border border-amber/30 px-5 py-3.5 mb-5">
          <p className="text-xs text-amber-dark flex items-start gap-1.5">
            <Clock size={12} className="shrink-0 mt-0.5" />
            <span>
              The end time has passed, so buyers see this auction as closed. To extend it, set a new
              <strong> Ends At</strong> and click <strong>Save</strong>.
            </span>
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
                <textarea value={form.description} onChange={(e) => field('description', e.target.value)} rows={10}
                  placeholder="Describe this auction…"
                  className="w-full px-3 py-2 text-xs leading-relaxed rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors resize-y" />
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
                  {form.starts_at && <p className="text-[10px] text-slate-500 mt-1">{readableDate(form.starts_at)}</p>}
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">Ends At</label>
                  <input type="datetime-local" value={form.ends_at} onChange={(e) => field('ends_at', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors" />
                  {form.ends_at && <p className="text-[10px] text-slate-500 mt-1">{readableDate(form.ends_at)}</p>}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-slate-400">Extend:</span>
                    {[{ label: '+1 day', days: 1 }, { label: '+1 week', days: 7 }, { label: '+30 days', days: 30 }].map((x) => (
                      <button key={x.days} type="button" onClick={() => extendEnds(x.days)}
                        className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-brand-light hover:text-brand text-slate-600 transition-colors">
                        {x.label}
                      </button>
                    ))}
                  </div>
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
                              <button onClick={() => handleDeleteLot(lot)}
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
                <div className="flex items-center gap-3">
                  {form.images.filter(Boolean).length < MAX_AUCTION_IMAGES && (
                    <button
                      type="button"
                      onClick={() => bulkInputRef.current?.click()}
                      disabled={!!bulkProgress}
                      className="flex items-center gap-1 text-[10px] font-semibold text-brand hover:text-brand-dark transition-colors disabled:opacity-50"
                    >
                      <Upload size={10} />Upload several
                    </button>
                  )}
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
                <input
                  ref={bulkInputRef}
                  type="file"
                  accept="image/*,.heic,.heif"
                  multiple
                  className="hidden"
                  onChange={(e) => { handleBulkPhotos(e.target.files); e.target.value = '' }}
                />
              </div>
              {bulkProgress && (
                <p className="flex items-center gap-1.5 text-[11px] text-brand font-medium mb-2">
                  <Loader2 size={11} className="animate-spin" />{bulkProgress}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {displayedAuctionImages.map((url, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-slate-400 uppercase tracking-wide font-semibold">
                        {auctionSlotLabel(i)}
                      </span>
                      <div className="flex items-center gap-2">
                        {i > 0 && url && (
                          <button
                            type="button"
                            onClick={() => makeCover(i)}
                            className="text-[9px] text-slate-500 hover:text-brand transition-colors flex items-center gap-0.5"
                          >
                            <Star size={9} />Make cover
                          </button>
                        )}
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
                    </div>
                    <ImageUploadField
                      value={url}
                      onChange={(u) => setAuctionImage(i, u)}
                      uploadPath={`auctions/${auctionId ?? tempUploadId.current}/photo-${i}`}
                      onBusyChange={trackUpload}
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
