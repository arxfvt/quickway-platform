import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { create } from 'zustand'
import { MessageCircle } from 'lucide-react'
import { whatsappLink, waMessages } from '../../config/site'
import { trackLead } from '../../lib/tracking'

// ─────────────────────────────────────────────────────────────────────────────
// Floating "WhatsApp us" button shown on every public page.
// Listing pages set a property-specific message with useWhatsAppContext().
// ─────────────────────────────────────────────────────────────────────────────

interface WaContext {
  message: string
  listing?: string
  ref?: string
}

const useWaStore = create<{ ctx: WaContext | null; set: (c: WaContext | null) => void }>((set) => ({
  ctx: null,
  set: (ctx) => set({ ctx }),
}))

/** Call from a page to make the floating button mention that page's property. */
export function useWhatsAppContext(ctx: WaContext | null) {
  const setCtx = useWaStore((s) => s.set)
  const key = ctx ? `${ctx.message}|${ctx.ref ?? ''}` : ''
  useEffect(() => {
    setCtx(ctx)
    return () => setCtx(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setCtx])
}

// Hide on portals where staff work (admin / org) — buyers never see those.
const HIDDEN_PREFIXES = ['/admin', '/org', '/login', '/register', '/forgot-password']

export default function WhatsAppFloat() {
  const { pathname } = useLocation()
  const ctx = useWaStore((s) => s.ctx)

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null

  const message = ctx?.message ?? waMessages.general

  return (
    <a
      href={whatsappLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackLead('whatsapp', { listing: ctx?.listing, ref: ctx?.ref, placement: 'floating' })}
      aria-label="Chat with Quickway on WhatsApp"
      className="fixed z-50 right-4 bottom-4 sm:right-6 sm:bottom-6 flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5b] text-white font-semibold text-sm pl-3.5 pr-4 py-3 rounded-full shadow-lg shadow-black/20 transition-colors"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <MessageCircle size={20} strokeWidth={2.25} />
      <span>WhatsApp us</span>
    </a>
  )
}
