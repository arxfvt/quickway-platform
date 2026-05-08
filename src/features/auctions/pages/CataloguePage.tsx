import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Search, Package, MapPin, Building2, Ticket, ChevronRight } from 'lucide-react'
import { getAuction, getLots } from '../../../services/auctions.service'
import type { Auction, Lot } from '../../../types/auction.types'
import { formatCurrency } from '../../../utils/currency'
import { formatDate } from '../../../utils/date'
import { cn } from '../../../lib/utils'
import StatusBadge from '../../../components/auction/StatusBadge'

// ─────────────────────────────────────────────────────────────────────────────
// Lot card
// ─────────────────────────────────────────────────────────────────────────────

function LotCard({ lot, auction }: { lot: Lot; auction: Auction }) {
  const PROPERTY_CATS = [
    'Residential Property', 'Commercial Property', 'Industrial Property',
    'Agricultural Land', 'Mailo Land', 'Leasehold Property', 'Freehold Property',
    'Strata/Apartment', 'Mixed Use', 'Vacant Land/Plot',
  ]
  const isVehicle  = auction.category === 'Vehicle & Equipment'
  const isProperty = PROPERTY_CATS.includes(auction.category)

  const specSummary: string[] = []
  if (isVehicle) {
    if (lot.specs['Year'])         specSummary.push(lot.specs['Year'])
    if (lot.specs['Mileage'])      specSummary.push(lot.specs['Mileage'])
    if (lot.specs['Transmission']) specSummary.push(lot.specs['Transmission'])
    if (lot.specs['Condition'])    specSummary.push(lot.specs['Condition'])
  } else if (isProperty) {
    if (lot.specs['Property Type']) specSummary.push(lot.specs['Property Type'])
    if (lot.specs['Size'])          specSummary.push(lot.specs['Size'])
    if (lot.specs['Tenure'])        specSummary.push(lot.specs['Tenure'])
  } else {
    Object.values(lot.specs).slice(0, 3).forEach((v) => specSummary.push(v))
  }

  const statusColor = lot.status === 'sold' ? 'bg-green-50 text-green-700' : lot.status === 'unsold' ? 'bg-slate-100 text-slate-400' : 'bg-brand-light text-brand'

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:border-brand/30 transition-colors flex flex-col">
      {/* Image */}
      <div className="relative">
        <img
          src={lot.image_url || 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=640&q=80'}
          alt={lot.title}
          className="w-full h-36 sm:h-44 object-cover"
          onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=640&q=80' }}
        />
        <span className="absolute top-2 left-2 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          Lot {lot.lot_number}
        </span>
        <span className={cn('absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize', statusColor)}>
          {lot.status}
        </span>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-sm font-semibold text-slate-800 mb-2 leading-snug line-clamp-2">{lot.title}</h3>

        {specSummary.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {specSummary.map((s, i) => (
              <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{s}</span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            {auction.status === 'closed' ? (
              <>
                <p className="text-[10px] text-slate-400">{lot.current_bid > 0 ? 'Sold For' : 'Reserve'}</p>
                <p className="text-sm font-bold text-slate-900 font-tabular">
                  {formatCurrency(lot.current_bid > 0 ? lot.current_bid : lot.reserve_price, auction.currency, 'en-UG')}
                </p>
              </>
            ) : (
              <>
                <p className="text-[10px] text-slate-400">Starting From</p>
                <p className="text-sm font-bold text-slate-900 font-tabular">
                  {formatCurrency(lot.reserve_price, auction.currency, 'en-UG')}
                </p>
              </>
            )}
          </div>
          <Link
            to={`/auctions/${auction.id}`}
            className="flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-dark transition-colors"
          >
            {auction.status === 'live' ? 'Bid Now' : 'View'}
            <ChevronRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function CataloguePage() {
  const { id } = useParams<{ id: string }>()

  const [auction, setAuction] = useState<Auction | null>(null)
  const [lots, setLots] = useState<Lot[]>([])

  useEffect(() => {
    if (!id) return
    Promise.all([getAuction(id), getLots(id)]).then(([a, ls]) => {
      if (a) setAuction(a)
      if (ls.length > 0) setLots(ls)
    }).catch(() => {})
  }, [id])

  // ── Filters ───────────────────────────────────────────────────────────
  const [search, setSearch]     = useState('')
  const [filter1, setFilter1]   = useState('')  // Make / Property Type
  const [filter2, setFilter2]   = useState('')  // Year / Tenure
  const [filter3, setFilter3]   = useState('')  // Condition / (unused for property)

  const PROPERTY_CATS_FILTER = [
    'Residential Property', 'Commercial Property', 'Industrial Property',
    'Agricultural Land', 'Mailo Land', 'Leasehold Property', 'Freehold Property',
    'Strata/Apartment', 'Mixed Use', 'Vacant Land/Plot',
  ]
  const isVehicles = auction?.category === 'Vehicle & Equipment'
  const isProperty = auction ? PROPERTY_CATS_FILTER.includes(auction.category) : false

  // Unique filter values derived from lot data
  const uniqueFilter1 = useMemo(() =>
    [...new Set(lots.map((l) => isVehicles ? l.specs['Make'] : l.specs['Property Type']).filter(Boolean))],
    [lots, isVehicles]
  )
  const uniqueFilter2 = useMemo(() =>
    [...new Set(lots.map((l) => isVehicles ? l.specs['Year'] : l.specs['Tenure']).filter(Boolean))],
    [lots, isVehicles]
  )
  const uniqueFilter3 = useMemo(() =>
    isVehicles ? [...new Set(lots.map((l) => l.specs['Condition']).filter(Boolean))] : [],
    [lots, isVehicles]
  )

  const filtered = useMemo(() => {
    return lots.filter((l) => {
      const q = search.toLowerCase()
      const matchSearch = !q || l.title.toLowerCase().includes(q) || Object.values(l.specs).some((v) => v.toLowerCase().includes(q))
      const matchF1 = !filter1 || (isVehicles ? l.specs['Make'] : l.specs['Property Type']) === filter1
      const matchF2 = !filter2 || (isVehicles ? l.specs['Year'] : l.specs['Tenure']) === filter2
      const matchF3 = !filter3 || l.specs['Condition'] === filter3
      return matchSearch && matchF1 && matchF2 && matchF3
    })
  }, [lots, search, filter1, filter2, filter3, isVehicles])

  if (!auction) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-20 text-slate-400">
        <p className="text-sm font-medium">Auction not found</p>
        <Link to="/auctions" className="mt-2 text-xs text-brand hover:underline">← Back to Auctions</Link>
      </div>
    )
  }

  return (
    <div className="px-3 py-4 sm:p-6 max-w-[1200px] mx-auto">
      {/* Back link */}
      <Link
        to={`/auctions/${auction.id}`}
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand mb-5 transition-colors group"
      >
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Auction
      </Link>

      {/* Auction header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={auction.status} />
              <span className="text-[10px] text-slate-400 font-mono">{auction.auction_ref}</span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 mb-2">{auction.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Building2 size={11} />{auction.org_name}</span>
              <span className="flex items-center gap-1"><MapPin size={11} />{auction.location}</span>
              <span className="flex items-center gap-1.5 bg-brand-light text-brand px-2 py-0.5 rounded-full font-medium">
                <Ticket size={10} />
                Entry: {formatCurrency(auction.participation_fee, auction.currency, 'en-UG')}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-slate-400 mb-0.5">Opens / Closes</p>
            <p className="text-xs text-slate-600">{formatDate(auction.starts_at)} → {formatDate(auction.ends_at)}</p>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 mb-5">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-xs">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lots…"
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
          />
        </div>

        {uniqueFilter1.length > 0 && (
          <select
            value={filter1}
            onChange={(e) => setFilter1(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
          >
            <option value="">{isVehicles ? 'All Makes' : 'All Types'}</option>
            {uniqueFilter1.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        )}

        {uniqueFilter2.length > 0 && (
          <select
            value={filter2}
            onChange={(e) => setFilter2(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
          >
            <option value="">{isVehicles ? 'All Years' : 'All Tenures'}</option>
            {uniqueFilter2.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        )}

        {isVehicles && uniqueFilter3.length > 0 && (
          <select
            value={filter3}
            onChange={(e) => setFilter3(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
          >
            <option value="">All Conditions</option>
            {uniqueFilter3.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        )}

        {(filter1 || filter2 || filter3 || search) && (
          <button
            onClick={() => { setFilter1(''); setFilter2(''); setFilter3(''); setSearch('') }}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center gap-2 mb-4">
        <Package size={13} className="text-brand" />
        <p className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of {lots.length} lots
        </p>
      </div>

      {/* Lot grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <Package size={36} strokeWidth={1} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">No lots match your filters</p>
          <button
            onClick={() => { setFilter1(''); setFilter2(''); setFilter3(''); setSearch('') }}
            className="mt-2 text-xs text-brand hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((lot) => (
            <LotCard key={lot.id} lot={lot} auction={auction} />
          ))}
        </div>
      )}

      {/* CTA footer */}
      {auction.status !== 'closed' && (
        <div className="mt-8 bg-brand-light border border-brand/20 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand mb-0.5">Ready to bid?</p>
            <p className="text-xs text-brand/70">Register and pay the entry fee to unlock bidding on all lots in this auction.</p>
          </div>
          <Link
            to={`/auctions/${auction.id}`}
            className="shrink-0 flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-brand text-white hover:bg-brand-dark transition-colors"
          >
            Register to Bid <ChevronRight size={14} />
          </Link>
        </div>
      )}
    </div>
  )
}
