import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Gavel, ShieldCheck, Ticket, Radio, ChevronRight, MapPin, Package, MessageCircle } from 'lucide-react'
import { getAuctions } from '../../../services/auctions.service'
import { getOrganizations } from '../../../services/organizations.service'
import { supabase } from '../../../lib/supabase'
import { formatCurrency } from '../../../utils/currency'
import StatusBadge from '../../../components/auction/StatusBadge'
import CountdownTimer from '../../../components/auction/CountdownTimer'
import { cn } from '../../../lib/utils'
import SiteFooter from '../../../components/layout/SiteFooter'
import { usePageMeta } from '../../../hooks/usePageMeta'
import { whatsappLink, waMessages } from '../../../config/site'
import { trackLead } from '../../../lib/tracking'
import { sizedImage, IMG } from '../../../lib/imageUrl'
import { withEffectiveStatus, entryLabel } from '../../../utils/auctionStatus'
import type { Auction } from '../../../types/auction.types'

// ─────────────────────────────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: <Gavel size={22} className="text-brand" />,
    title: 'Browse Catalogues',
    body: 'Explore live and upcoming auctions from court orders, banks, private clients, and organisations — all in one place.',
  },
  {
    step: '02',
    icon: <Ticket size={22} className="text-amber" />,
    title: 'Register & Verify',
    body: 'Create a free account and verify your ID (KYC). If an auction has a participation fee, it is shown on the listing before you pay.',
  },
  {
    step: '03',
    icon: <ShieldCheck size={22} className="text-green-500" />,
    title: 'Submit a Sealed Offer',
    body: 'Offers stay private until the auction closes. Quickway then contacts the winning bidder to complete the sale.',
  },
]

// ─────────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [orgs, setOrgs] = useState<{ id: string; name: string; location: string }[]>([])
  const [lotsCount, setLotsCount] = useState<number | null>(null)
  const [auctionsLoaded, setAuctionsLoaded] = useState(false)

  usePageMeta({ path: '/' })

  useEffect(() => {
    getAuctions()
      .then((list) => setAuctions(list.map(withEffectiveStatus)))
      .catch(() => {})
      .finally(() => setAuctionsLoaded(true))
    getOrganizations().then(setOrgs).catch(() => {})
    supabase.from('lots').select('*', { count: 'exact', head: true }).eq('status', 'open')
      .then(({ count }) => setLotsCount(count ?? 0)).catch(() => setLotsCount(0))
  }, [])

  const allLive = auctions.filter((a) => a.status === 'live')
  const liveAuctions = allLive.slice(0, 3)
  const upcomingAuctions = auctions.filter((a) => a.status === 'scheduled').slice(0, 3)

  return (
    <div className="min-h-screen">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative bg-brand overflow-hidden">
        {/* Decorative grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Amber glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber rounded-full opacity-10 blur-3xl pointer-events-none" />

        <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-28">
          <div className="max-w-2xl">
            {auctionsLoaded && allLive.length > 0 && (
              <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 text-xs font-medium px-3 py-1.5 rounded-full mb-6 backdrop-blur-sm">
                <Radio size={11} className="animate-pulse text-amber" />
                {allLive.length} listing{allLive.length !== 1 ? 's' : ''} open for offers right now
              </div>
            )}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-5">
              Property & Asset Auctions<br />
              <span className="text-amber">in Uganda</span>
            </h1>
            <p className="text-white/75 text-base md:text-lg leading-relaxed mb-8 max-w-xl">
              Land, houses, commercial buildings, vehicles and machinery from court-ordered, bank and private sales — verified and sold transparently by Quickway Auctioneers & Court Bailiffs, Kampala.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/auctions"
                className="flex items-center gap-2 bg-amber hover:bg-amber-dark text-white font-semibold px-5 py-3 rounded-xl transition-colors text-sm"
              >
                Browse Catalogues
                <ArrowRight size={16} />
              </Link>
              <a
                href={whatsappLink(waMessages.general)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackLead('whatsapp', { placement: 'hero' })}
                className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5b] text-white font-semibold px-5 py-3 rounded-xl transition-colors text-sm"
              >
                <MessageCircle size={16} />
                WhatsApp Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ───────────────────────────────────────── */}
      {(() => {
        const loading = auctions.length === 0 && orgs.length === 0 && lotsCount === null
        const activeCount = auctions.filter((a) => a.status === 'live' || a.status === 'scheduled').length
        const stats = [
          { value: loading ? '—' : String(activeCount), label: 'Open Auctions', loading },
          { value: loading || lotsCount === null ? '—' : String(lotsCount), label: 'Lots Available', loading: loading || lotsCount === null },
          // Only show partner organisations once there are some — "0" undermines trust
          ...(orgs.length > 0 ? [{ value: String(orgs.length), label: 'Partner Orgs', loading: false }] : []),
          { value: 'UGX', label: 'Currency', loading: false },
        ]
        return (
          <section className="bg-white border-b border-slate-100">
            <div className={cn('max-w-[1200px] mx-auto px-4 sm:px-6 py-5 grid gap-3 sm:gap-6 divide-x-0 sm:divide-x divide-slate-100', stats.length === 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3')}>
              {stats.map((s) => (
                <div key={s.label} className="text-center pl-6 first:pl-0">
                  <p className={cn('text-2xl font-bold', s.loading ? 'text-slate-200 animate-pulse' : 'text-brand')}>
                    {s.value}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </section>
        )
      })()}

      {/* ── Live Auctions ─────────────────────────────────────── */}
      {liveAuctions.length > 0 && (
        <section className="max-w-[1200px] mx-auto px-6 py-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-amber-light text-amber-dark px-2.5 py-1 rounded-full">
                <Radio size={12} className="animate-pulse" />
                <span className="text-xs font-semibold">Live Now</span>
              </div>
              <span className="text-xs text-slate-400">{allLive.length} auction{allLive.length !== 1 ? 's' : ''} in progress</span>
            </div>
            <Link to="/auctions" className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">
              View all <ChevronRight size={13} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {liveAuctions.map((a) => (
              <FeaturedAuctionCard key={a.id} auction={a} />
            ))}
          </div>
        </section>
      )}

      {/* ── Browse by Principal (hidden until there are organisations) ── */}
      {orgs.length > 0 && <section className="bg-slate-50 border-y border-slate-100 py-12">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="mb-7">
            <h2 className="text-xl font-bold text-slate-900">Browse by Catalogue</h2>
            <p className="text-sm text-slate-500 mt-1">
              Each catalogue is a dedicated auction from a principal or organisation. Select one to view all their lots and participation details.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {orgs.map((org) => {
              const orgAuctions = auctions.filter((a) => a.org_id === org.id)
              const liveCount = orgAuctions.filter((a) => a.status === 'live').length
              return (
                <Link
                  key={org.id}
                  to={`/auctions?org=${org.id}`}
                  className="group bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:border-brand hover:shadow-md transition-all"
                >
                  {/* Org initial avatar */}
                  <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center mb-3">
                    <span className="text-brand font-bold text-sm">{org.name.charAt(0)}</span>
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm leading-snug mb-1 group-hover:text-brand transition-colors">
                    {org.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mb-3">
                    <MapPin size={10} />{org.location}
                  </p>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Package size={10} />
                      {orgAuctions.length} auction{orgAuctions.length !== 1 ? 's' : ''}
                    </span>
                    {liveCount > 0 && (
                      <span className="flex items-center gap-1 bg-amber-light text-amber-dark px-1.5 py-0.5 rounded-full font-semibold">
                        <Radio size={9} className="animate-pulse" />
                        {liveCount} live
                      </span>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-brand font-medium">View Catalogue</span>
                    <ChevronRight size={13} className="text-brand" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>}

      {/* ── Upcoming Auctions ─────────────────────────────────── */}
      {upcomingAuctions.length > 0 && (
        <section className="max-w-[1200px] mx-auto px-6 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Upcoming Auctions</h2>
            <Link to="/auctions" className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">
              View all <ChevronRight size={13} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {upcomingAuctions.map((a) => (
              <FeaturedAuctionCard key={a.id} auction={a} />
            ))}
          </div>
        </section>
      )}

      {/* ── How It Works ──────────────────────────────────────── */}
      <section className="bg-white border-t border-slate-100 py-14">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-xl font-bold text-slate-900">How It Works</h2>
            <p className="text-sm text-slate-500 mt-1">Participate in any auction in three simple steps</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="relative text-center p-6 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="absolute -top-3 left-6 text-[10px] font-bold text-slate-300 font-mono">{step.step}</div>
                <div className="w-12 h-12 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center justify-center mx-auto mb-4">
                  {step.icon}
                </div>
                <h3 className="font-semibold text-slate-900 text-sm mb-2">{step.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────── */}
      <section className="bg-brand py-12">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Ready to start bidding?</h2>
          <p className="text-white/70 text-sm mb-6">Create your free account and complete KYC verification to participate in any auction.</p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/register"
              className="bg-amber hover:bg-amber-dark text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              Create Account
            </Link>
            <Link
              to="/auctions"
              className="bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors border border-white/20"
            >
              Browse Auctions
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Featured auction mini-card (used in live & upcoming strips)
// ─────────────────────────────────────────────────────────────────────────────

function FeaturedAuctionCard({ auction: a }: { auction: Auction }) {
  const isLive = a.status === 'live'
  const isScheduled = a.status === 'scheduled'

  return (
    <Link
      to={`/auctions/${a.id}`}
      className={cn(
        'group flex gap-3 bg-white rounded-2xl border p-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200',
        isLive ? 'border-amber shadow-sm shadow-amber/10' : 'border-slate-100 shadow-sm'
      )}
    >
      <img
        src={sizedImage(a.image_url, IMG.thumb)}
        alt={a.title}
        loading="lazy"
        decoding="async"
        className="w-20 h-16 rounded-xl object-cover shrink-0 group-hover:scale-105 transition-transform duration-300 overflow-hidden bg-slate-100"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-1 mb-1">
          <StatusBadge status={a.status} />
          <span className="text-[9px] text-slate-400 font-mono shrink-0">{a.auction_ref}</span>
        </div>
        <p className="text-xs font-semibold text-slate-900 leading-snug line-clamp-2 mb-1">{a.title}</p>
        <p className="text-[10px] text-slate-400 flex items-center gap-0.5 mb-2">
          <MapPin size={9} className="shrink-0" />
          {a.location || a.org_location || 'Uganda'}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] bg-brand-light text-brand px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
            <Ticket size={9} />
            {entryLabel(a.participation_fee, formatCurrency(a.participation_fee, a.currency, 'en-UG'))}
          </span>
          {isLive ? (
            <div className="text-right text-[9px] text-slate-400 italic">Sealed</div>
          ) : isScheduled ? (
            <CountdownTimer endsAt={a.starts_at} size="compact" />
          ) : null}
        </div>
      </div>
    </Link>
  )
}
