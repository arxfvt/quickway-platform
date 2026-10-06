import { MessageCircle, Phone, CalendarCheck } from 'lucide-react'
import { SITE, telLink, whatsappLink, waMessages } from '../../config/site'
import { trackLead } from '../../lib/tracking'

// ─────────────────────────────────────────────────────────────────────────────
// "Interested?" box on a listing — reach Quickway without creating an account.
// ─────────────────────────────────────────────────────────────────────────────

export default function ListingContactCard({ title, refCode, closed = false }: { title: string; refCode?: string; closed?: boolean }) {
  const track = (channel: 'whatsapp' | 'call' | 'site_visit') =>
    trackLead(channel, { listing: title, ref: refCode, placement: 'listing_card' })

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <p className="text-sm font-semibold text-slate-900">
        {closed ? 'Interested in a property like this?' : 'Interested in this property?'}
      </p>
      <p className="text-[11px] text-slate-500 mt-0.5 mb-4">
        {closed
          ? 'This auction has closed. Message us and we will tell you about similar properties.'
          : 'Ask a question or book a viewing — no account needed.'}
      </p>

      <div className="space-y-2">
        <a
          href={whatsappLink(waMessages.property(title, refCode))}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('whatsapp')}
          className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5b] text-white font-semibold text-sm py-3 rounded-xl transition-colors"
        >
          <MessageCircle size={17} />
          WhatsApp about this property
        </a>

        {!closed && <a
          href={whatsappLink(waMessages.siteVisit(title, refCode))}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('site_visit')}
          className="w-full flex items-center justify-center gap-2 bg-brand-light hover:bg-blue-100 text-brand font-semibold text-sm py-3 rounded-xl border border-brand/20 transition-colors"
        >
          <CalendarCheck size={16} />
          Book a site visit
        </a>}

        <a
          href={telLink}
          onClick={() => track('call')}
          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm py-3 rounded-xl border border-slate-200 transition-colors"
        >
          <Phone size={15} />
          Call {SITE.phoneDisplay}
        </a>
      </div>
    </div>
  )
}
