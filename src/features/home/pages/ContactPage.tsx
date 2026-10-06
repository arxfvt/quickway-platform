import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin, ArrowLeft, Gavel, MessageCircle } from 'lucide-react'
import { SITE, OFFICE_ADDRESS, OFFICE_MAP_URL, telLink, whatsappLink, waMessages } from '../../../config/site'
import { trackLead } from '../../../lib/tracking'
import { usePageMeta } from '../../../hooks/usePageMeta'

export default function ContactPage() {
  usePageMeta({
    title: 'Contact Us — Kampala Office & WhatsApp',
    description: `WhatsApp or call Quickway Auctioneers on ${SITE.phoneDisplay}. Office: ${OFFICE_ADDRESS}.`,
  })
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link
        to="/auctions"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand mb-6 transition-colors group"
      >
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Auctions
      </Link>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-brand-light flex items-center justify-center shrink-0">
            <Gavel size={20} className="text-brand" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Contact Quickway</h1>
            <p className="text-xs text-slate-500">Auctioneers & Court Bailiffs</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-8 leading-relaxed">
          Have questions about an auction, payment, or your account? Reach us through any of
          the channels below and we'll get back to you as soon as possible.
        </p>

        {/* Contact cards */}
        <div className="space-y-4">
          <a
            href={whatsappLink(waMessages.general)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackLead('whatsapp', { placement: 'contact_page' })}
            className="flex items-center gap-4 p-4 rounded-xl border border-[#25D366]/40 bg-[#25D366]/5 hover:bg-[#25D366]/10 transition-colors group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#25D366] flex items-center justify-center shrink-0">
              <MessageCircle size={16} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">WhatsApp (fastest)</p>
              <p className="text-sm text-slate-600">{SITE.phoneDisplay}</p>
            </div>
          </a>

          <a
            href={telLink}
            onClick={() => trackLead('call', { placement: 'contact_page' })}
            className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-brand/30 hover:bg-brand-light/30 transition-colors group"
          >
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
              <Phone size={15} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800 group-hover:text-brand transition-colors">Phone</p>
              <p className="text-sm text-slate-600">{SITE.phoneDisplay}</p>
            </div>
          </a>

          <a
            href={`mailto:${SITE.email}`}
            className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-brand/30 hover:bg-brand-light/30 transition-colors group"
          >
            <div className="w-9 h-9 rounded-xl bg-brand-light flex items-center justify-center shrink-0">
              <Mail size={15} className="text-brand" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800 group-hover:text-brand transition-colors">Email</p>
              <p className="text-sm text-slate-600">{SITE.email}</p>
            </div>
          </a>

          <a
            href={OFFICE_MAP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-brand/30 hover:bg-brand-light/30 transition-colors group"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
              <MapPin size={15} className="text-slate-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800 group-hover:text-brand transition-colors">Office (open in Google Maps)</p>
              <p className="text-sm text-slate-600">{OFFICE_ADDRESS}</p>
            </div>
          </a>
        </div>

        {/* Office hours */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Office Hours</p>
          <div className="space-y-1.5 text-xs text-slate-600">
            {SITE.hours.map((h) => (
              <div key={h.days} className={h.time === 'Closed' ? 'flex justify-between text-slate-400' : 'flex justify-between'}>
                <span>{h.days}</span>
                <span className={h.time === 'Closed' ? '' : 'font-medium'}>{h.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
