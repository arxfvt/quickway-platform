import { useState, useEffect } from 'react'
import {
  Building2, Gavel, Plus, Trash2, Radio,
  Loader2, Mail, Phone, MapPin, X, ChevronRight,
} from 'lucide-react'
import {
  getOrganizations,
  createOrganization,
  updateOrgStatus,
  deleteOrganization,
} from '../../../services/organizations.service'
import { getAuctions } from '../../../services/auctions.service'
import { formatDate } from '../../../utils/date'
import { cn } from '../../../lib/utils'
import type { Organization } from '../../../types/org.types'
import type { Auction } from '../../../types/auction.types'

// ─────────────────────────────────────────────────────────────────────────────

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const STATUS_CHIP = {
  active:    'bg-green-50 text-green-700',
  suspended: 'bg-red-50 text-red-600',
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Organisation Modal
// ─────────────────────────────────────────────────────────────────────────────

interface CreateOrgModalProps {
  onClose: () => void
  onCreate: (org: Organization) => void
}

function CreateOrgModal({ onClose, onCreate }: CreateOrgModalProps) {
  const [form, setForm] = useState({
    name: '', slug: '', description: '', contact_email: '', contact_phone: '', location: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof typeof form, val: string) =>
    setForm((f) => ({ ...f, [key]: val, ...(key === 'name' ? { slug: slugify(val) } : {}) }))

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return }
    if (!form.slug.trim()) { setError('Slug is required.'); return }
    setIsSaving(true); setError(null)
    try {
      const org = await createOrganization({
        name:          form.name.trim(),
        slug:          form.slug.trim(),
        description:   form.description || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        location:      form.location || null,
        settings:      {},
        status:        'active',
      })
      onCreate(org)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create organisation.')
    } finally { setIsSaving(false) }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">New Organisation</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">Name <span className="text-red-400">*</span></label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Kampala Auctioneers Ltd"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors" />
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">Slug <span className="text-red-400">*</span></label>
            <input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="kampala-auctioneers"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">Contact Email</label>
              <input type="email" value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)} placeholder="info@org.com"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">Contact Phone</label>
              <input value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} placeholder="+256 700 000000"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">Location</label>
            <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Kampala, Uganda"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors" />
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} placeholder="Brief description…"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors resize-none" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={isSaving || !form.name.trim()}
            className={cn('flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors',
              isSaving || !form.name.trim() ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-brand hover:bg-brand-dark text-white')}>
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Create Organisation
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminOrganizations() {
  const [orgs, setOrgs]         = useState<Organization[]>([])
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [isLoading, setIsLoading]     = useState(true)
  const [selected, setSelected]       = useState<string | null>(null)
  const [showCreate, setShowCreate]   = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [togglingId, setTogglingId]   = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getOrganizations(), getAuctions()])
      .then(([o, a]) => { setOrgs(o); setAuctions(a) })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const handleCreate = (org: Organization) => {
    setOrgs((prev) => [org, ...prev])
    setShowCreate(false)
  }

  const handleToggleStatus = async (org: Organization) => {
    const next = org.status === 'active' ? 'suspended' : 'active'
    setTogglingId(org.id)
    try {
      await updateOrgStatus(org.id, next)
      setOrgs((prev) => prev.map((o) => o.id === org.id ? { ...o, status: next } : o))
    } catch { /* ignore */ }
    setTogglingId(null)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteOrganization(id)
      setOrgs((prev) => prev.filter((o) => o.id !== id))
      if (selected === id) setSelected(null)
    } catch { /* ignore */ }
    setConfirmDeleteId(null)
  }

  const enriched = orgs.map((org) => {
    const orgAuctions  = auctions.filter((a) => a.org_id === org.id)
    const liveAuctions = orgAuctions.filter((a) => a.status === 'live').length
    const totalLots    = orgAuctions.reduce((s, a) => s + a.lot_count, 0)
    return { org, orgAuctions, liveAuctions, totalLots }
  })

  const selectedData = selected ? enriched.find((e) => e.org.id === selected) : null

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-brand" />
    </div>
  )

  return (
    <div className="p-6 max-w-[1300px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Organisations</h1>
          <p className="text-xs text-slate-500 mt-0.5">{orgs.length} principal{orgs.length !== 1 ? 's' : ''} on the platform.</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-brand hover:bg-brand-dark text-white transition-colors">
          <Plus size={13} />New Organisation
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Table */}
        <div className="lg:col-span-2">
          {orgs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
              <Building2 size={36} strokeWidth={1} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No organisations yet</p>
              <p className="text-xs text-slate-400 mt-1">Create your first one to get started.</p>
              <button onClick={() => setShowCreate(true)}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-brand text-white hover:bg-brand-dark transition-colors">
                New Organisation
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">Organisation</th>
                    <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-3 hidden lg:table-cell">Contact</th>
                    <th className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-3 hidden md:table-cell">Auctions</th>
                    <th className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-3">Status</th>
                    <th className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-3 hidden lg:table-cell">Created</th>
                    <th className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enriched.map(({ org, orgAuctions, liveAuctions }) => (
                    <tr key={org.id}
                      onClick={() => { setSelected(org.id === selected ? null : org.id); setConfirmDeleteId(null) }}
                      className={cn('cursor-pointer transition-colors', org.id === selected ? 'bg-brand-light/60' : 'hover:bg-slate-50/60')}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-brand-light flex items-center justify-center shrink-0">
                            <Building2 size={13} className="text-brand" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate max-w-[180px]">{org.name}</p>
                            {org.location && (
                              <p className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                <MapPin size={8} />{org.location}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3.5 hidden lg:table-cell">
                        <div className="space-y-0.5">
                          {org.contact_email && (
                            <p className="text-[10px] text-slate-500 flex items-center gap-1 truncate max-w-[160px]">
                              <Mail size={8} className="shrink-0" />{org.contact_email}
                            </p>
                          )}
                          {org.contact_phone && (
                            <p className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Phone size={8} className="shrink-0" />{org.contact_phone}
                            </p>
                          )}
                          {!org.contact_email && !org.contact_phone && <p className="text-[10px] text-slate-300">—</p>}
                        </div>
                      </td>

                      <td className="px-3 py-3.5 text-center hidden md:table-cell">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-700">{orgAuctions.length}</span>
                          {liveAuctions > 0 && (
                            <span className="flex items-center gap-0.5 text-[9px] font-semibold bg-amber-light text-amber-dark px-1.5 py-0.5 rounded-full">
                              <Radio size={7} className="animate-pulse" />{liveAuctions}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3.5 text-center">
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize', STATUS_CHIP[org.status ?? 'active'])}>
                          {org.status ?? 'active'}
                        </span>
                      </td>

                      <td className="px-3 py-3.5 text-right hidden lg:table-cell">
                        <span className="text-[10px] text-slate-400">{formatDate(org.created_at)}</span>
                      </td>

                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => handleToggleStatus(org)} disabled={togglingId === org.id}
                            className={cn('px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors',
                              (org.status ?? 'active') === 'active'
                                ? 'bg-red-50 hover:bg-red-100 text-red-600'
                                : 'bg-green-50 hover:bg-green-100 text-green-700')}>
                            {togglingId === org.id
                              ? <Loader2 size={10} className="animate-spin" />
                              : (org.status ?? 'active') === 'active' ? 'Suspend' : 'Activate'}
                          </button>

                          {confirmDeleteId === org.id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-red-600 font-medium">Sure?</span>
                              <button onClick={() => handleDelete(org.id)}
                                className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors">
                                Delete
                              </button>
                              <button onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
                                No
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmDeleteId(org.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div>
          {selectedData ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sticky top-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-slate-800">{selectedData.org.name}</p>
                  {selectedData.org.location && (
                    <p className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                      <MapPin size={9} />{selectedData.org.location}
                    </p>
                  )}
                </div>
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0', STATUS_CHIP[selectedData.org.status ?? 'active'])}>
                  {selectedData.org.status ?? 'active'}
                </span>
              </div>

              <div className="space-y-1.5 mb-4">
                {selectedData.org.contact_email && (
                  <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
                    <Mail size={10} className="text-slate-400 shrink-0" />{selectedData.org.contact_email}
                  </p>
                )}
                {selectedData.org.contact_phone && (
                  <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
                    <Phone size={10} className="text-slate-400 shrink-0" />{selectedData.org.contact_phone}
                  </p>
                )}
                {selectedData.org.description && (
                  <p className="text-[11px] text-slate-500 mt-2">{selectedData.org.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { label: 'Auctions', value: selectedData.orgAuctions.length, icon: <Gavel size={12} className="text-brand" /> },
                  { label: 'Total Lots', value: selectedData.totalLots, icon: <ChevronRight size={12} className="text-slate-400" /> },
                ].map((s) => (
                  <div key={s.label} className="bg-slate-50 rounded-xl px-3 py-2">
                    <div className="mb-0.5">{s.icon}</div>
                    <p className="text-sm font-bold text-slate-800">{s.value}</p>
                    <p className="text-[10px] text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>

              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Auctions</p>
              <div className="space-y-2 max-h-[360px] overflow-y-auto">
                {selectedData.orgAuctions.length === 0 ? (
                  <div className="py-6 text-center">
                    <Gavel size={24} strokeWidth={1} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-xs text-slate-400">No auctions yet</p>
                  </div>
                ) : (
                  selectedData.orgAuctions.map((a) => (
                    <div key={a.id} className="flex items-center gap-2.5 bg-slate-50 rounded-xl px-3 py-2">
                      {a.image_url && <img src={a.image_url} alt={a.title} className="w-8 h-6 rounded-lg object-cover shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-slate-700 truncate">{a.title}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{a.auction_ref}</p>
                      </div>
                      <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0',
                        a.status === 'live' ? 'bg-amber-light text-amber-dark'
                        : a.status === 'scheduled' ? 'bg-brand-light text-brand'
                        : 'bg-slate-100 text-slate-400')}>
                        {a.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center sticky top-6">
              <Building2 size={32} strokeWidth={1} className="mx-auto mb-3 text-slate-300" />
              <p className="text-xs font-medium text-slate-500">Select an organisation</p>
              <p className="text-[10px] text-slate-400 mt-1">to view details and auctions</p>
            </div>
          )}
        </div>
      </div>

      {showCreate && <CreateOrgModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </div>
  )
}
