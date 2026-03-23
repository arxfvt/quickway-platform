import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Plus, Trash2, ChevronRight, Loader2 } from 'lucide-react'
import { AUCTION_CATEGORIES } from '../../../lib/mockData'
import { createAuction } from '../../../services/auctions.service'
import { useAuthStore } from '../../../store/authStore'
import { cn } from '../../../lib/utils'

// ─────────────────────────────────────────────────────────────────────────────

const STEPS = ['Details', 'Lots', 'Fee & Schedule', 'Review']

interface LotDraft {
  id: string
  title: string
  description: string
  reserve_price: string
  bid_increment: string
  image_url: string
}

interface AuctionDraft {
  title: string
  description: string
  category: string
  location: string
  image_url: string
  lots: LotDraft[]
  participation_fee: string
  currency: string
  bank_details: string
  starts_at: string
  ends_at: string
}

const INCREMENT_PRESETS = ['10,000', '25,000', '50,000', '100,000', '250,000']

function makeLot(): LotDraft {
  return { id: String(Date.now()), title: '', description: '', reserve_price: '', bid_increment: '50,000', image_url: '' }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function OrgCreateAuction() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [draft, setDraft] = useState<AuctionDraft>({
    title: '', description: '', category: 'Vehicles', location: '', image_url: '',
    lots: [makeLot()],
    participation_fee: '', currency: 'UGX',
    bank_details: 'Equity Bank Uganda · Account: 1006400123456 · Branch: Kampala Main · Ref: Use your registered email',
    starts_at: '', ends_at: '',
  })

  const set = (key: keyof AuctionDraft, val: string) =>
    setDraft((d) => ({ ...d, [key]: val }))

  // ── Step 1 validation ─────────────────────────────────────────────────
  const step1Valid = draft.title.trim().length > 0 && draft.location.trim().length > 0

  // ── Step 2 validation ─────────────────────────────────────────────────
  const step2Valid = draft.lots.every((l) => l.title.trim().length > 0)

  // ── Step 3 validation ─────────────────────────────────────────────────
  const step3Valid =
    draft.participation_fee.length > 0 &&
    draft.starts_at.length > 0 &&
    draft.ends_at.length > 0 &&
    draft.starts_at < draft.ends_at

  const canNext = step === 0 ? step1Valid : step === 1 ? step2Valid : step === 2 ? step3Valid : true

  const submitAuction = async (status: 'scheduled' | 'draft') => {
    if (!user?.org_id) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const auctionRef = `QW-${Date.now().toString(36).toUpperCase()}`
      await createAuction({
        org_id:           user.org_id,
        title:            draft.title,
        description:      draft.description,
        category:         draft.category,
        location:         draft.location,
        image_url:        draft.image_url,
        status,
        starts_at:        draft.starts_at,
        ends_at:          draft.ends_at,
        participation_fee: Number(draft.participation_fee.replace(/[^0-9]/g, '')) || 0,
        currency:         draft.currency,
        bank_details:     draft.bank_details,
        auction_ref:      auctionRef,
        lot_count:        draft.lots.length,
      })
      navigate('/org/auctions')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save auction. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePublish    = () => submitAuction('scheduled')
  const handleSaveDraft  = () => submitAuction('draft')

  // ─────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-[800px] mx-auto">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Create Auction</h1>
      <p className="text-xs text-slate-500 mb-6">Complete all steps to publish your auction catalogue.</p>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => i < step && setStep(i)}
              className={cn(
                'flex items-center gap-1.5 text-xs font-semibold transition-colors',
                i === step ? 'text-brand' : i < step ? 'text-green-600 cursor-pointer hover:underline' : 'text-slate-400 cursor-default'
              )}
            >
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors',
                i === step ? 'bg-brand text-white' : i < step ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
              )}>
                {i < step ? <Check size={12} /> : i + 1}
              </div>
              <span className="hidden sm:inline">{s}</span>
            </button>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-slate-200 w-8" />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Details ──────────────────────────────────── */}
      {step === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Auction Details</h2>
          <Field label="Auction Title *" value={draft.title} onChange={(v) => set('title', v)} placeholder="e.g. Court-Ordered Vehicle Fleet Disposal" maxLen={100} />
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Description</label>
            <textarea rows={4} value={draft.description} onChange={(e) => set('description', e.target.value)}
              placeholder="Describe the auction, what's being sold, and any important terms…"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Category</label>
              <select value={draft.category} onChange={(e) => set('category', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors">
                {AUCTION_CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <Field label="Location *" value={draft.location} onChange={(v) => set('location', v)} placeholder="e.g. Kampala, Uganda" />
          </div>
          <Field label="Cover Image URL" value={draft.image_url} onChange={(v) => set('image_url', v)} placeholder="https://…" />
          {draft.image_url && (
            <img src={draft.image_url} alt="Preview" className="w-full h-40 object-cover rounded-xl" onError={(e) => (e.currentTarget.style.display = 'none')} />
          )}
        </div>
      )}

      {/* ── Step 2: Lots ─────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          {draft.lots.map((lot, idx) => (
            <div key={lot.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  Lot {idx + 1}
                </span>
                {draft.lots.length > 1 && (
                  <button
                    onClick={() => setDraft((d) => ({ ...d, lots: d.lots.filter((l) => l.id !== lot.id) }))}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <Field label="Title *" value={lot.title} onChange={(v) => setDraft((d) => ({ ...d, lots: d.lots.map((l) => l.id === lot.id ? { ...l, title: v } : l) }))} placeholder="e.g. 2019 Toyota Land Cruiser" />
                <Field label="Image URL" value={lot.image_url} onChange={(v) => setDraft((d) => ({ ...d, lots: d.lots.map((l) => l.id === lot.id ? { ...l, image_url: v } : l) }))} placeholder="https://…" />
                <Field label="Reserve Price (UGX)" value={lot.reserve_price} onChange={(v) => setDraft((d) => ({ ...d, lots: d.lots.map((l) => l.id === lot.id ? { ...l, reserve_price: v } : l) }))} placeholder="e.g. 25000000" type="number" />
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Bid Increment (UGX)</label>
                  <select value={lot.bid_increment}
                    onChange={(e) => setDraft((d) => ({ ...d, lots: d.lots.map((l) => l.id === lot.id ? { ...l, bid_increment: e.target.value } : l) }))}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors">
                    {INCREMENT_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Description</label>
                <textarea rows={2} value={lot.description}
                  onChange={(e) => setDraft((d) => ({ ...d, lots: d.lots.map((l) => l.id === lot.id ? { ...l, description: e.target.value } : l) }))}
                  placeholder="Condition, mileage, specs…"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors resize-none" />
              </div>
            </div>
          ))}
          <button
            onClick={() => setDraft((d) => ({ ...d, lots: [...d.lots, makeLot()] }))}
            className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-xs font-semibold text-slate-500 hover:border-brand hover:text-brand transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={13} />
            Add Another Lot
          </button>
        </div>
      )}

      {/* ── Step 3: Fee & Schedule ────────────────────────────── */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-2">Participation Fee & Schedule</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Participation Fee *" value={draft.participation_fee} onChange={(v) => set('participation_fee', v)} placeholder="e.g. 100000" type="number" />
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Currency</label>
              <select value={draft.currency} onChange={(e) => set('currency', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors">
                {['UGX', 'USD'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Field label="Start Date & Time *" value={draft.starts_at} onChange={(v) => set('starts_at', v)} type="datetime-local" />
            <Field label="End Date & Time *" value={draft.ends_at} onChange={(v) => set('ends_at', v)} type="datetime-local" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Bank Transfer Instructions</label>
            <textarea rows={3} value={draft.bank_details} onChange={(e) => set('bank_details', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors resize-none" />
            <p className="text-[10px] text-slate-400 mt-1">These instructions are shown to bidders when they pay the entry fee.</p>
          </div>
          {draft.starts_at && draft.ends_at && draft.starts_at >= draft.ends_at && (
            <p className="text-xs text-red-500">End date must be after the start date.</p>
          )}
        </div>
      )}

      {/* ── Step 4: Review ────────────────────────────────────── */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-2">Review & Publish</h2>
          <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-xs">
            <ReviewRow label="Title"      value={draft.title} />
            <ReviewRow label="Category"   value={draft.category} />
            <ReviewRow label="Location"   value={draft.location} />
            <ReviewRow label="Lots"       value={`${draft.lots.length} lot${draft.lots.length !== 1 ? 's' : ''}`} />
            <ReviewRow label="Entry Fee"  value={`${Number(draft.participation_fee).toLocaleString('en-UG')} ${draft.currency}`} />
            <ReviewRow label="Opens"      value={draft.starts_at ? new Date(draft.starts_at).toLocaleString('en-UG') : '—'} />
            <ReviewRow label="Closes"     value={draft.ends_at ? new Date(draft.ends_at).toLocaleString('en-UG') : '—'} />
          </div>
          <p className="text-xs text-slate-500 bg-brand-light border border-brand/20 rounded-xl px-4 py-3 leading-relaxed">
            Publishing will make this auction visible in the public catalogue. Bidders can register and pay the entry fee to participate. You can save as draft to continue editing.
          </p>
          {submitError && (
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <span>{submitError}</span>
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              onClick={handlePublish}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-brand hover:bg-brand-dark text-white transition-colors"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? 'Publishing…' : 'Publish Auction'}
            </button>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      {step < 3 && (
        <div className="flex justify-between mt-6">
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className={cn(
              'px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors',
              step === 0 ? 'text-slate-300 cursor-not-allowed' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            ← Back
          </button>
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext}
            className={cn(
              'flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors',
              !canNext ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-brand hover:bg-brand-dark text-white'
            )}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, type = 'text', maxLen }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; maxLen?: number
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLen}
        className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
      />
      {maxLen && <p className="text-[10px] text-slate-400 text-right mt-0.5">{value.length}/{maxLen}</p>}
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800 text-right max-w-[60%] truncate">{value || '—'}</span>
    </div>
  )
}
