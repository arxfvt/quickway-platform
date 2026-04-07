import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Video } from 'lucide-react'
import { cn } from '../../../lib/utils'
import ImageUploadField from './ImageUploadField'

// ─────────────────────────────────────────────────────────────────────────────

export interface LotDraft {
  id: string
  lot_number: number
  title: string
  description: string
  reserve_price: number
  starting_bid: number
  bid_increment: number
  images: string[]
  video_url: string
  specs: { key: string; value: string }[]
}

interface LotFormModalProps {
  initial?: LotDraft | null
  nextLotNumber: number
  auctionId?: string | null
  onSave: (lot: LotDraft) => void
  onClose: () => void
}

const INCREMENT_PRESETS = [10_000, 25_000, 50_000, 100_000, 250_000]
const MAX_IMAGES = 5

function newId() {
  return `lot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ─────────────────────────────────────────────────────────────────────────────

export default function LotFormModal({ initial, nextLotNumber, auctionId, onSave, onClose }: LotFormModalProps) {
  const [form, setForm] = useState<LotDraft>(() =>
    initial ?? {
      id: newId(),
      lot_number: nextLotNumber,
      title: '',
      description: '',
      reserve_price: 0,
      starting_bid: 0,
      bid_increment: 50_000,
      images: [''],
      video_url: '',
      specs: [],
    }
  )
  const [customIncrement, setCustomIncrement] = useState('')
  const [useCustom, setUseCustom] = useState(
    initial ? !INCREMENT_PRESETS.includes(initial.bid_increment) : false
  )

  // Keep customIncrement field in sync when editing a lot with a non-preset increment
  useEffect(() => {
    if (initial && !INCREMENT_PRESETS.includes(initial.bid_increment)) {
      setCustomIncrement(String(initial.bid_increment))
    }
  }, [initial])

  const set = <K extends keyof LotDraft>(key: K, value: LotDraft[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleIncrementPreset = (v: number) => {
    setUseCustom(false)
    set('bid_increment', v)
  }

  const handleCustomIncrement = (raw: string) => {
    setCustomIncrement(raw)
    const n = parseInt(raw.replace(/\D/g, ''), 10)
    if (!isNaN(n) && n > 0) set('bid_increment', n)
  }

  // ── Image slot helpers ────────────────────────────────────────────────────

  // Ensure at least 1 slot is always visible
  const displayedImages = form.images.length === 0 ? [''] : form.images

  const setImage = (i: number, url: string) =>
    setForm((f) => {
      const next = [...f.images]
      next[i] = url
      return { ...f, images: next }
    })

  const removeSlot = (i: number) =>
    setForm((f) => ({
      ...f,
      images: f.images.filter((_, idx) => idx !== i),
    }))

  const addSlot = () => {
    if (form.images.length >= MAX_IMAGES) return
    setForm((f) => ({ ...f, images: [...f.images, ''] }))
  }

  const slotLabel = (i: number) => (i === 0 ? 'Cover Image' : `Photo ${i + 1}`)

  // ── Specs ─────────────────────────────────────────────────────────────────

  const addSpec = () =>
    setForm((f) => ({ ...f, specs: [...f.specs, { key: '', value: '' }] }))

  const updateSpec = (i: number, field: 'key' | 'value', val: string) =>
    setForm((f) => {
      const specs = [...f.specs]
      specs[i] = { ...specs[i], [field]: val }
      return { ...f, specs }
    })

  const removeSpec = (i: number) =>
    setForm((f) => ({ ...f, specs: f.specs.filter((_, idx) => idx !== i) }))

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!form.title.trim()) return
    const lot: LotDraft = {
      ...form,
      images: form.images.filter(Boolean),
      starting_bid: form.starting_bid > 0 ? form.starting_bid : form.reserve_price,
    }
    onSave(lot)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <h3 className="text-sm font-bold text-slate-900">
            {initial ? 'Edit Lot' : 'Add Lot'}
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Lot number + title */}
          <div className="flex gap-3">
            <div className="w-20 shrink-0">
              <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">Lot #</label>
              <input
                type="number"
                value={form.lot_number}
                onChange={(e) => set('lot_number', parseInt(e.target.value) || 1)}
                min={1}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">Title <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. 2019 Toyota Hilux Double Cab"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              placeholder="Brief description of the lot…"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors resize-none"
            />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">Reserve Price</label>
              <input
                type="number"
                value={form.reserve_price || ''}
                onChange={(e) => set('reserve_price', parseInt(e.target.value) || 0)}
                placeholder="0"
                min={0}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">Starting Bid</label>
              <input
                type="number"
                value={form.starting_bid || ''}
                onChange={(e) => set('starting_bid', parseInt(e.target.value) || 0)}
                placeholder="Defaults to reserve"
                min={0}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
              />
            </div>
          </div>

          {/* Bid increment */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-2">Bid Increment</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {INCREMENT_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleIncrementPreset(p)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors',
                    !useCustom && form.bid_increment === p
                      ? 'bg-brand text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {(p / 1000).toFixed(0)}k
                </button>
              ))}
              <button
                type="button"
                onClick={() => setUseCustom(true)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors',
                  useCustom ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                Custom
              </button>
            </div>
            {useCustom && (
              <input
                type="text"
                value={customIncrement}
                onChange={(e) => handleCustomIncrement(e.target.value)}
                placeholder="Enter custom increment…"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
              />
            )}
          </div>

          {/* Photos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">
                Photos <span className="normal-case text-slate-300">({displayedImages.length}/{MAX_IMAGES})</span>
              </label>
              {form.images.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={addSlot}
                  className="flex items-center gap-1 text-[10px] font-semibold text-brand hover:text-brand-dark transition-colors"
                >
                  <Plus size={10} />Add Photo
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {displayedImages.map((url, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wide font-semibold">
                      {slotLabel(i)}
                    </span>
                    {(form.images.length > 1 || i > 0) && (
                      <button
                        type="button"
                        onClick={() => removeSlot(i)}
                        className="text-[9px] text-red-400 hover:text-red-600 transition-colors flex items-center gap-0.5"
                      >
                        <Trash2 size={9} />Remove
                      </button>
                    )}
                  </div>
                  <ImageUploadField
                    value={url}
                    onChange={(u) => setImage(i, u)}
                    uploadPath={
                      auctionId
                        ? `auctions/${auctionId}/lots/${form.id}/photo-${i}`
                        : undefined
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Video URL */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Video size={10} />Video URL <span className="normal-case text-slate-300">(optional)</span>
            </label>
            <input
              type="url"
              value={form.video_url}
              onChange={(e) => set('video_url', e.target.value)}
              placeholder="https://youtube.com/watch?v=… or direct video link"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
            />
          </div>

          {/* Dynamic specs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Specs</label>
              <button
                type="button"
                onClick={addSpec}
                className="flex items-center gap-1 text-[10px] font-semibold text-brand hover:text-brand-dark transition-colors"
              >
                <Plus size={10} />Add spec
              </button>
            </div>
            {form.specs.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic">No specs added.</p>
            ) : (
              <div className="space-y-2">
                {form.specs.map((spec, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={spec.key}
                      onChange={(e) => updateSpec(i, 'key', e.target.value)}
                      placeholder="Key (e.g. Year)"
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
                    />
                    <input
                      type="text"
                      value={spec.value}
                      onChange={(e) => updateSpec(i, 'value', e.target.value)}
                      placeholder="Value (e.g. 2019)"
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => removeSpec(i)}
                      className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors shrink-0"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!form.title.trim()}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold transition-colors',
              form.title.trim()
                ? 'bg-brand hover:bg-brand-dark text-white'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            )}
          >
            Save Lot
          </button>
        </div>
      </div>
    </div>
  )
}
