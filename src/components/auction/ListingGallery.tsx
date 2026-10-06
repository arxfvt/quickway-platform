import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Expand, X, ImageOff } from 'lucide-react'
import { cn } from '../../lib/utils'
import { sizedImage, IMG } from '../../lib/imageUrl'

// ─────────────────────────────────────────────────────────────────────────────
// Listing photo gallery.
// Shows each photo whole (never cropped) over a soft blurred copy of itself,
// with arrows, a counter, swipe on phones, and a full-screen viewer.
// ─────────────────────────────────────────────────────────────────────────────

/** Horizontal swipe handlers: calls onPrev / onNext for a clear left-right swipe. */
function useSwipe(onPrev: () => void, onNext: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null)
  return {
    onTouchStart: (e: React.TouchEvent) => {
      start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (!start.current) return
      const dx = e.changedTouches[0].clientX - start.current.x
      const dy = e.changedTouches[0].clientY - start.current.y
      start.current = null
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) (dx > 0 ? onPrev : onNext)()
    },
  }
}

function ArrowButton({ dir, onClick, large = false }: { dir: 'prev' | 'next'; onClick: () => void; large?: boolean }) {
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick() }}
      aria-label={dir === 'prev' ? 'Previous photo' : 'Next photo'}
      className={cn(
        'absolute top-1/2 -translate-y-1/2 z-10 flex items-center justify-center rounded-full',
        'bg-white/90 text-slate-800 shadow-md hover:bg-white transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
        large ? 'w-12 h-12' : 'w-10 h-10',
        dir === 'prev' ? (large ? 'left-3 sm:left-6' : 'left-3') : (large ? 'right-3 sm:right-6' : 'right-3')
      )}
    >
      <Icon size={large ? 26 : 22} />
    </button>
  )
}

export default function ListingGallery({ images, title }: { images: string[]; title: string }) {
  const [index, setIndex] = useState(0)
  const [viewerOpen, setViewerOpen] = useState(false)
  const thumbsRef = useRef<HTMLDivElement>(null)
  const count = images.length
  const current = images[Math.min(index, count - 1)]

  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count])
  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count])
  const swipe = useSwipe(prev, next)

  // Keep the selected thumbnail in view
  useEffect(() => {
    const el = thumbsRef.current?.children[index] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [index])

  // Preload the neighbouring photos so arrows feel instant
  useEffect(() => {
    if (count < 2) return
    for (const i of [(index + 1) % count, (index - 1 + count) % count]) {
      const img = new Image()
      img.src = sizedImage(images[i], IMG.main)
    }
  }, [index, count, images])

  if (count === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-4 aspect-[4/3] sm:aspect-[16/10] flex flex-col items-center justify-center text-slate-300">
        <ImageOff size={32} strokeWidth={1.5} />
        <p className="text-xs mt-2 text-slate-400">Photos coming soon</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm mb-4">
      {/* Main photo — whole image, framed by a blurred copy of itself */}
      <div
        className="relative aspect-[4/3] sm:aspect-[16/10] max-h-[72vh] w-full overflow-hidden bg-slate-900 cursor-zoom-in select-none"
        onClick={() => setViewerOpen(true)}
        {...swipe}
      >
        <img
          src={sizedImage(current, IMG.thumb)}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60"
        />
        <img
          key={current}
          src={sizedImage(current, IMG.main)}
          alt={`${title} — photo ${index + 1} of ${count}`}
          fetchPriority={index === 0 ? 'high' : 'auto'}
          decoding="async"
          className="relative w-full h-full object-contain"
        />

        {count > 1 && <ArrowButton dir="prev" onClick={prev} />}
        {count > 1 && <ArrowButton dir="next" onClick={next} />}

        <div className="absolute bottom-3 left-3 bg-black/60 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full tabular-nums">
          {index + 1} / {count}
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setViewerOpen(true) }}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 hover:bg-black/75 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full transition-colors"
        >
          <Expand size={13} />
          View full screen
        </button>
      </div>

      {/* Thumbnails */}
      {count > 1 && (
        <div ref={thumbsRef} className="flex gap-2 p-3 overflow-x-auto snap-x">
          {images.map((img, i) => (
            <button
              key={img + i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
              className={cn(
                'w-20 h-14 sm:w-24 sm:h-16 rounded-lg overflow-hidden border-2 transition-all shrink-0 snap-start',
                i === index ? 'border-brand opacity-100' : 'border-transparent opacity-70 hover:opacity-100'
              )}
            >
              <img src={sizedImage(img, IMG.thumb)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover bg-slate-100" />
            </button>
          ))}
        </div>
      )}

      {viewerOpen && (
        <FullScreenViewer
          images={images}
          title={title}
          index={index}
          onIndex={setIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Full-screen viewer
// ─────────────────────────────────────────────────────────────────────────────

function FullScreenViewer({ images, title, index, onIndex, onClose }: {
  images: string[]
  title: string
  index: number
  onIndex: (i: number) => void
  onClose: () => void
}) {
  const count = images.length
  const closeRef = useRef<HTMLButtonElement>(null)
  const prev = useCallback(() => onIndex((index - 1 + count) % count), [index, count, onIndex])
  const next = useCallback(() => onIndex((index + 1) % count), [index, count, onIndex])
  const swipe = useSwipe(prev, next)

  // Keyboard: Esc closes, arrows move. Lock page scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose, prev, next])

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} photos`}
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-semibold tabular-nums">{index + 1} / {count}</p>
        <p className="hidden sm:block text-sm text-white/70 truncate mx-4">{title}</p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close photos"
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
        >
          <X size={24} />
        </button>
      </div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center px-2 sm:px-20" {...swipe}>
        <img
          key={images[index]}
          src={sizedImage(images[index], 1600, 80)}
          alt={`${title} — photo ${index + 1} of ${count}`}
          onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-full object-contain select-none"
        />
        {count > 1 && <ArrowButton dir="prev" onClick={prev} large />}
        {count > 1 && <ArrowButton dir="next" onClick={next} large />}
      </div>

      {count > 1 && (
        <div className="flex gap-2 justify-center px-4 py-3 overflow-x-auto" onClick={(e) => e.stopPropagation()}>
          {images.map((img, i) => (
            <button
              key={img + i}
              type="button"
              onClick={() => onIndex(i)}
              aria-label={`Show photo ${i + 1}`}
              className={cn(
                'w-16 h-11 rounded-md overflow-hidden border-2 shrink-0 transition-opacity',
                i === index ? 'border-white opacity-100' : 'border-transparent opacity-50 hover:opacity-90'
              )}
            >
              <img src={sizedImage(img, IMG.thumb)} alt="" loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  )
}
