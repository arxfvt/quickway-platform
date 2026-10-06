import { Link } from 'react-router-dom'
import { MessageCircle, Phone, Mail, MapPin } from 'lucide-react'
import { SITE, OFFICE_ADDRESS, OFFICE_MAP_URL, telLink, whatsappLink, waMessages } from '../../config/site'
import { trackLead } from '../../lib/tracking'
import quickwayLogo from '../../assets/quickway-logo.png'

export default function SiteFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400 pt-10 pb-24 sm:pb-10">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 text-sm">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <img src={quickwayLogo} alt="Quickway" className="h-8 w-8 object-contain bg-white rounded" />
            <div>
              <p className="font-bold text-white leading-tight">Quickway</p>
              <p className="text-[11px] text-slate-400 leading-tight">Auctioneers & Court Bailiffs</p>
            </div>
          </div>
          <p className="text-xs leading-relaxed">
            Land, houses, commercial buildings, vehicles and machinery from court-ordered, bank and private
            sales across Uganda.
          </p>
        </div>

        {/* Contact */}
        <div>
          <p className="text-white font-semibold text-xs uppercase tracking-wide mb-3">Talk to us</p>
          <ul className="space-y-2.5 text-xs">
            <li>
              <a
                href={whatsappLink(waMessages.general)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackLead('whatsapp', { placement: 'footer' })}
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <MessageCircle size={14} className="text-[#25D366]" /> WhatsApp {SITE.phoneDisplay}
              </a>
            </li>
            <li>
              <a
                href={telLink}
                onClick={() => trackLead('call', { placement: 'footer' })}
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <Phone size={14} /> Call {SITE.phoneDisplay}
              </a>
            </li>
            <li>
              <a href={`mailto:${SITE.email}`} className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail size={14} /> {SITE.email}
              </a>
            </li>
            <li>
              <a
                href={OFFICE_MAP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 hover:text-white transition-colors"
              >
                <MapPin size={14} className="shrink-0 mt-0.5" /> {OFFICE_ADDRESS}
              </a>
            </li>
          </ul>
        </div>

        {/* Links */}
        <div>
          <p className="text-white font-semibold text-xs uppercase tracking-wide mb-3">Quick links</p>
          <ul className="space-y-2 text-xs">
            <li><Link to="/auctions" className="hover:text-white transition-colors">All properties & assets</Link></li>
            <li><Link to="/contact" className="hover:text-white transition-colors">Contact & office hours</Link></li>
            <li><Link to="/register" className="hover:text-white transition-colors">Create an account</Link></li>
            <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
            <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
          </ul>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 mt-8 pt-6 border-t border-slate-800 text-[11px] text-slate-500">
        © {new Date().getFullYear()} Quickway Auctioneers Ltd. All rights reserved.
      </div>
    </footer>
  )
}
