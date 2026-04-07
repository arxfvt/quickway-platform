import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Search, SlidersHorizontal, Radio, Loader2, Gavel, LogIn, ArrowLeft } from 'lucide-react'
import AuctionCard from '../../../components/auction/AuctionCard'
import CategoryFilter from '../../../components/auction/CategoryFilter'
import { type AuctionCategory } from '../../../lib/mockData'
import { getAuctions } from '../../../services/auctions.service'
import { getOrganizations } from '../../../services/organizations.service'
import type { Auction } from '../../../types/auction.types'
import { cn } from '../../../lib/utils'
import { useAuthStore } from '../../../store/authStore'

// ─────────────────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 6

export default function AuctionListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const orgParam = searchParams.get('org') ?? 'all'
  const { user } = useAuthStore()

  const [auctions, setAuctions] = useState<Auction[]>([])
  const [orgs, setOrgs] = useState<{ id: string; name: string; location: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<AuctionCategory>('All')
  const [page, setPage] = useState(1)

  useEffect(() => {
    Promise.all([getAuctions(), getOrganizations()])
      .then(([a, o]) => { setAuctions(a); setOrgs(o) })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  // ── Filtering ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return auctions.filter((a) => {
      const matchesOrg = orgParam === 'all' || a.org_id === orgParam
      const matchesCat = category === 'All' || a.category === category
      const q = search.toLowerCase()
      const matchesSearch =
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.org_name.toLowerCase().includes(q) ||
        a.org_location.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      return matchesOrg && matchesCat && matchesSearch
    })
  }, [auctions, search, category, orgParam])

  const liveAuctions = filtered.filter((a) => a.status === 'live')
  const otherAuctions = filtered.filter((a) => a.status !== 'live')

  const totalPages = Math.ceil(otherAuctions.length / ITEMS_PER_PAGE)
  const paginated = otherAuctions.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const handleCategoryChange = (cat: AuctionCategory) => { setCategory(cat); setPage(1) }
  const handleSearch = (value: string) => { setSearch(value); setPage(1) }

  const handleOrgFilter = (orgId: string) => {
    setPage(1)
    const next = new URLSearchParams(searchParams)
    if (orgId === 'all') next.delete('org')
    else next.set('org', orgId)
    setSearchParams(next)
  }

  const selectedOrg = orgs.find((o) => o.id === orgParam)

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-brand" />
    </div>
  )

  return (
    <div className="p-6 max-w-[1400px] mx-auto">

      {/* ── Guest banner ─────────────────────────────────────── */}
      {!user && (
        <div className="mb-5 bg-brand rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Gavel size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">Quickway Auctioneers & Court Bailiffs</p>
              <p className="text-xs text-white/70 mt-0.5">Browse our property and asset catalogue. Sign in to register and submit offers.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/login"
              className="flex items-center gap-1.5 bg-white text-brand text-xs font-semibold px-3.5 py-2 rounded-lg hover:bg-white/90 transition-colors"
            >
              <LogIn size={13} />
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-xs font-semibold px-3.5 py-2 rounded-lg border border-white/40 text-white hover:bg-white/10 transition-colors"
            >
              Register
            </Link>
          </div>
        </div>
      )}

      {/* ── Back to home (guest only) ────────────────────────── */}
      {!user && (
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand mb-4 transition-colors group"
        >
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Home
        </Link>
      )}

      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {selectedOrg ? `${selectedOrg.name} — Catalogue` : 'All Auctions'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {filtered.length} auction{filtered.length !== 1 ? 's' : ''} available
            {selectedOrg ? ` · ${selectedOrg.location}` : ''}
          </p>
        </div>
        <button className="flex items-center gap-1.5 text-xs font-medium text-slate-600 border border-slate-200 bg-white px-3 py-2 rounded-lg hover:border-brand hover:text-brand transition-colors">
          <SlidersHorizontal size={13} />
          Filters
        </button>
      </div>

      {/* ── Principal / org tabs ─────────────────────────────── */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => handleOrgFilter('all')}
          className={cn(
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
            orgParam === 'all'
              ? 'bg-brand text-white border-brand'
              : 'bg-white text-slate-600 border-slate-200 hover:border-brand hover:text-brand'
          )}
        >
          All Catalogues
        </button>
        {orgs.map((org) => {
          const liveCount = auctions.filter((a) => a.org_id === org.id && a.status === 'live').length
          return (
            <button
              key={org.id}
              onClick={() => handleOrgFilter(org.id)}
              className={cn(
                'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                orgParam === org.id
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-brand hover:text-brand'
              )}
            >
              {org.name}
              {liveCount > 0 && (
                <span className={cn(
                  'text-[9px] px-1.5 py-0.5 rounded-full font-semibold',
                  orgParam === org.id
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-light text-amber-dark'
                )}>
                  {liveCount} live
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Participation fee notice when org selected ────────── */}
      {selectedOrg && (
        <div className="mb-4 bg-brand-light border border-brand/20 rounded-xl px-4 py-3 text-xs text-brand leading-relaxed">
          <span className="font-semibold">About this catalogue:</span>{' '}
          Each auction below has its own participation fee. Complete KYC verification and pay the entry fee to unlock bidding.
          <span className="font-medium"> Entry fees are shown on each auction card.</span>
        </div>
      )}

      {/* ── Search ──────────────────────────────────────────── */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by title, auctioneer, location…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
        />
      </div>

      {/* ── Category filter ──────────────────────────────────── */}
      <div className="mb-6">
        <CategoryFilter active={category} onChange={handleCategoryChange} />
      </div>

      {/* ── Live auctions strip ──────────────────────────────── */}
      {liveAuctions.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 bg-amber-light text-amber-dark px-2.5 py-1 rounded-full">
              <Radio size={12} className="animate-pulse" />
              <span className="text-xs font-semibold">Live Now</span>
            </div>
            <span className="text-xs text-slate-400">
              {liveAuctions.length} auction{liveAuctions.length !== 1 ? 's' : ''} in progress
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {liveAuctions.map((auction) => (
              <AuctionCard key={auction.id} {...auction} />
            ))}
          </div>
          {otherAuctions.length > 0 && <div className="mt-6 border-t border-slate-200" />}
        </section>
      )}

      {/* ── Other auctions grid ──────────────────────────────── */}
      {paginated.length > 0 ? (
        <section>
          {liveAuctions.length > 0 && otherAuctions.length > 0 && (
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
              Upcoming & Past
            </h2>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginated.map((auction) => (
              <AuctionCard key={auction.id} {...auction} />
            ))}
          </div>
        </section>
      ) : (
        liveAuctions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Search size={40} strokeWidth={1} className="mb-3 opacity-50" />
            <p className="text-sm font-medium">No auctions found</p>
            <p className="text-xs mt-1">Try adjusting your search or filter</p>
          </div>
        )
      )}

      {/* ── Pagination ───────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              page === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            ← Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={cn(
                'w-8 h-8 rounded-lg text-xs font-semibold transition-colors',
                p === page ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              page === totalPages ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
