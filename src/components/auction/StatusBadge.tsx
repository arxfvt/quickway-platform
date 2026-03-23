import { cn } from '../../lib/utils'
import type { AuctionStatus } from '../../types/auction.types'

interface StatusBadgeProps {
  status: AuctionStatus
  className?: string
}

const CONFIG: Record<AuctionStatus, { label: string; classes: string }> = {
  live:      { label: 'Live',      classes: 'bg-amber-light text-amber-dark border border-amber' },
  scheduled: { label: 'Upcoming',  classes: 'bg-brand-light text-brand border border-brand' },
  closed:    { label: 'Closed',    classes: 'bg-slate-100 text-slate-500 border border-slate-200' },
  cancelled: { label: 'Cancelled', classes: 'bg-red-50 text-red-500 border border-red-200' },
  draft:     { label: 'Draft',     classes: 'bg-slate-100 text-slate-400 border border-slate-200' },
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const cfg = CONFIG[status] ?? CONFIG.draft
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full',
        cfg.classes,
        className
      )}
    >
      {status === 'live' && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse shrink-0" />
      )}
      {cfg.label}
    </span>
  )
}
