import { Link } from 'react-router-dom'
import { MapPin, Package, Users, Ticket } from 'lucide-react'
import { formatCurrency } from '../../utils/currency'
import { cn } from '../../lib/utils'
import StatusBadge from './StatusBadge'
import CountdownTimer from './CountdownTimer'
import type { AuctionStatus } from '../../types/auction.types'

// ─────────────────────────────────────────────────────────────────────────────
// Props — extends the mock data shape minimally
// ─────────────────────────────────────────────────────────────────────────────

interface AuctionCardProps {
  id: string
  title: string
  status: AuctionStatus
  ends_at: string
  starts_at: string
  org_name: string
  org_location: string
  category: string
  image_url: string
  lot_count: number
  current_bid: number
  bid_count: number
  auction_ref: string
  participation_fee: number
  currency: string
  [key: string]: unknown  // allow spreading full Auction object
}

export default function AuctionCard({
  id,
  title,
  status,
  starts_at,
  org_name,
  org_location,
  category,
  image_url,
  lot_count,
  current_bid,
  bid_count,
  auction_ref,
  participation_fee,
  currency,
}: AuctionCardProps) {
  const isLive = status === 'live'
  const isScheduled = status === 'scheduled'
  const isClosed = status === 'closed'

  return (
    <Link
      to={`/auctions/${id}`}
      className={cn(
        'group block bg-white rounded-2xl overflow-hidden border transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5',
        isLive
          ? 'border-amber shadow-sm shadow-amber/10'
          : 'border-slate-100 shadow-sm'
      )}
    >
      {/* ── Image ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <img
          src={image_url}
          alt={title}
          className="w-full h-44 object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {/* Overlays */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <StatusBadge status={status} />
        </div>
        <div className="absolute top-3 right-3">
          <span className="text-[10px] bg-black/50 text-white px-2 py-0.5 rounded-full backdrop-blur-sm font-mono">
            {auction_ref}
          </span>
        </div>
        <div className="absolute bottom-3 left-3">
          <span className="text-[10px] bg-black/40 text-white px-2 py-0.5 rounded-full backdrop-blur-sm font-medium">
            {category}
          </span>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────── */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 mb-1.5">
          {title}
        </h3>

        <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
          <MapPin size={11} className="shrink-0" />
          <span className="truncate">{org_name} · {org_location}</span>
        </div>

        {/* Participation fee badge */}
        <div className={cn(
          'inline-flex items-center gap-1 px-2 py-1 rounded-lg mb-3 text-[10px] font-medium',
          isClosed
            ? 'bg-slate-50 text-slate-400'
            : 'bg-brand-light text-brand'
        )}>
          <Ticket size={10} />
          {isClosed ? 'Entry was' : 'Entry fee:'}{' '}
          <span className="font-semibold">{formatCurrency(participation_fee, currency, 'en-UG')}</span>
        </div>

        {/* ── Stats row ─────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Package size={11} />
              {lot_count} lot{lot_count !== 1 ? 's' : ''}
            </span>
            {bid_count > 0 && (
              <span className="flex items-center gap-1">
                <Users size={11} />
                {bid_count} bid{bid_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="text-right">
            {isLive && current_bid > 0 ? (
              <div>
                <p className="text-[10px] text-slate-400 leading-none mb-0.5">Current bid</p>
                <p className="text-sm font-bold text-slate-900 font-tabular">
                  {formatCurrency(current_bid, currency, 'en-UG')}
                </p>
              </div>
            ) : isLive ? (
              <div>
                <p className="text-[10px] text-slate-400 leading-none mb-0.5">Current bid</p>
                <p className="text-sm font-semibold text-slate-400">No bids yet</p>
              </div>
            ) : isScheduled ? (
              <div className="text-right">
                <p className="text-[10px] text-slate-400 leading-none mb-0.5">Opens in</p>
                <CountdownTimer endsAt={starts_at} size="compact" />
              </div>
            ) : (
              <div>
                <p className="text-[10px] text-slate-400 leading-none mb-0.5">Sold for</p>
                <p className="text-sm font-bold text-slate-500 font-tabular">
                  {current_bid > 0 ? formatCurrency(current_bid, currency, 'en-UG') : '—'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── CTA ─────────────────────────────────────────────── */}
        <button
          className={cn(
            'w-full mt-3 py-2 rounded-xl text-xs font-semibold transition-colors',
            isLive
              ? 'bg-brand text-white hover:bg-brand-dark'
              : isScheduled
              ? 'bg-brand-light text-brand hover:bg-blue-100 border border-brand/30'
              : 'bg-slate-100 text-slate-400 cursor-default'
          )}
        >
          {isLive ? 'Bid Now' : isScheduled ? 'View Details' : 'View Results'}
        </button>
      </div>
    </Link>
  )
}
