import { useState, useEffect } from 'react'
import { Building2, Gavel, Users, ChevronRight, Radio, Loader2 } from 'lucide-react'
import { getOrganizations } from '../../../services/organizations.service'
import { getAuctions } from '../../../services/auctions.service'
import type { Organization } from '../../../types/org.types'
import type { Auction } from '../../../types/auction.types'
import { cn } from '../../../lib/utils'

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminOrganizations() {
  const [selected, setSelected] = useState<string | null>(null)
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string; location: string | null }>>([])
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([getOrganizations(), getAuctions()])
      .then(([o, a]: [Organization[], Auction[]]) => { setOrgs(o); setAuctions(a) })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const enriched = orgs.map((org) => {
    const orgAuctions  = auctions.filter((a) => a.org_id === org.id)
    const liveAuctions = orgAuctions.filter((a) => a.status === 'live').length
    const totalLots    = orgAuctions.reduce((s, a) => s + a.lot_count, 0)
    const participants = 0
    return { org, orgAuctions, liveAuctions, totalLots, participants }
  })

  const selectedData = selected ? enriched.find((e) => e.org.id === selected) : null

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-brand" />
    </div>
  )

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Organisations</h1>
          <p className="text-xs text-slate-500 mt-0.5">{orgs.length} principals / catalogue owners on the platform.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Org list */}
        <div className="col-span-2 space-y-3">
          {enriched.map(({ org, orgAuctions, liveAuctions, totalLots, participants }) => (
            <div
              key={org.id}
              onClick={() => setSelected(org.id === selected ? null : org.id)}
              className={cn(
                'bg-white rounded-2xl border shadow-sm p-5 cursor-pointer transition-all',
                org.id === selected
                  ? 'border-brand ring-2 ring-brand/10'
                  : 'border-slate-100 hover:border-slate-200'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center shrink-0">
                    <Building2 size={16} className="text-brand" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{org.name}</p>
                    <p className="text-[10px] text-slate-400">{org.location}</p>
                  </div>
                </div>
                {liveAuctions > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold bg-amber-light text-amber-dark px-2.5 py-1 rounded-full">
                    <Radio size={8} className="animate-pulse" />{liveAuctions} live
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Auctions', value: orgAuctions.length, icon: <Gavel size={12} className="text-brand" /> },
                  { label: 'Total Lots', value: totalLots, icon: <ChevronRight size={12} className="text-slate-400" /> },
                  { label: 'Approved Bidders', value: participants, icon: <Users size={12} className="text-green-600" /> },
                ].map((s) => (
                  <div key={s.label} className="bg-slate-50 rounded-xl px-3 py-2.5">
                    <p className="text-sm font-bold text-slate-800">{s.value}</p>
                    <p className="text-[10px] text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Auction status strip */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {(['live', 'scheduled', 'closed', 'draft'] as const).map((status) => {
                  const count = orgAuctions.filter((a) => a.status === status).length
                  if (count === 0) return null
                  const chip = {
                    live: 'bg-amber-light text-amber-dark',
                    scheduled: 'bg-brand-light text-brand',
                    closed: 'bg-slate-100 text-slate-400',
                    draft: 'bg-slate-100 text-slate-500',
                  }[status]
                  return (
                    <span key={status} className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', chip)}>
                      {count} {status}
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        <div>
          {selectedData ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sticky top-6">
              <h3 className="text-sm font-bold text-slate-800 mb-1">{selectedData.org.name}</h3>
              <p className="text-[10px] text-slate-400 mb-4">{selectedData.org.location}</p>

              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Auctions</p>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {selectedData.orgAuctions.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No auctions yet</p>
                ) : (
                  selectedData.orgAuctions.map((a) => (
                    <div key={a.id} className="flex items-center gap-2.5 bg-slate-50 rounded-xl px-3 py-2">
                      <img src={a.image_url} alt={a.title} className="w-8 h-6 rounded-lg object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-slate-700 truncate">{a.title}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{a.auction_ref}</p>
                      </div>
                      <span className={cn(
                        'text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0',
                        a.status === 'live' ? 'bg-amber-light text-amber-dark'
                          : a.status === 'scheduled' ? 'bg-brand-light text-brand'
                          : 'bg-slate-100 text-slate-400'
                      )}>
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
              <p className="text-[10px] text-slate-400 mt-1">to view its auctions and stats</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
