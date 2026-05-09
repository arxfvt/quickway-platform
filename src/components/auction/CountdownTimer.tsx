import { useState, useEffect } from 'react'
import { Timer } from 'lucide-react'
import { secondsUntil } from '../../utils/date'
import { cn } from '../../lib/utils'

interface CountdownTimerProps {
  endsAt: string
  /** 'compact' for cards, 'large' for detail page */
  size?: 'compact' | 'large'
  className?: string
}

function formatParts(seconds: number): { value: string; label: string }[] {
  if (seconds <= 0) return [{ value: '0', label: 'secs' }]
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (d > 0) return [{ value: `${d}`, label: 'd' }, { value: `${h}`, label: 'h' }, { value: `${m}`, label: 'm' }]
  if (h > 0) return [{ value: `${h}`, label: 'h' }, { value: `${m}`, label: 'm' }]
  return [{ value: `${m}`, label: 'm' }, { value: `${String(s).padStart(2, '0')}`, label: 's' }]
}

export default function CountdownTimer({ endsAt, size = 'compact', className }: CountdownTimerProps) {
  const [secs, setSecs] = useState(() => secondsUntil(endsAt))

  useEffect(() => {
    const id = setInterval(() => setSecs(secondsUntil(endsAt)), 1000)
    return () => clearInterval(id)
  }, [endsAt])

  const ended = secs <= 0
  const urgent = !ended && secs < 3600   // < 1 hour
  const parts = formatParts(secs)

  if (size === 'large') {
    return (
      <div className={cn('flex flex-col items-start', className)}>
        <p className="text-xs text-slate-500 mb-1">Time Left</p>
        {ended ? (
          <span className="text-sm font-semibold text-slate-400">Ended</span>
        ) : (
          <div className="flex items-baseline gap-1">
            {parts.map((p, i) => (
              <span key={i} className={cn('font-bold font-tabular', urgent ? 'text-amber' : 'text-slate-800', size === 'large' ? 'text-2xl' : 'text-base')}>
                {p.value}
                <span className="text-xs font-normal text-slate-400 ml-0.5">{p.label}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium font-tabular',
        ended ? 'text-slate-400' : urgent ? 'text-amber-dark' : 'text-slate-600',
        className
      )}
    >
      <Timer size={12} className="shrink-0" />
      {ended
        ? 'Ended'
        : parts.map((p, i) => (
            <span key={i}>
              {p.value}<span className="text-slate-400">{p.label}</span>
              {i < parts.length - 1 && ' '}
            </span>
          ))
      }
    </span>
  )
}
