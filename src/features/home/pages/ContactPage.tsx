import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin, ArrowLeft, Gavel } from 'lucide-react'

export default function ContactPage() {
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
            href="mailto:info@quickway.ug"
            className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-brand/30 hover:bg-brand-light/30 transition-colors group"
          >
            <div className="w-9 h-9 rounded-xl bg-brand-light flex items-center justify-center shrink-0">
              <Mail size={15} className="text-brand" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800 group-hover:text-brand transition-colors">Email</p>
              <p className="text-sm text-slate-600">info@quickway.ug</p>
            </div>
          </a>

          <a
            href="tel:+256700000000"
            className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-brand/30 hover:bg-brand-light/30 transition-colors group"
          >
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
              <Phone size={15} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800 group-hover:text-brand transition-colors">Phone</p>
              <p className="text-sm text-slate-600">+256 700 000 000</p>
            </div>
          </a>

          <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
              <MapPin size={15} className="text-slate-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">Office</p>
              <p className="text-sm text-slate-600">Plot 23, Kampala Road, Kampala, Uganda</p>
            </div>
          </div>
        </div>

        {/* Office hours */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Office Hours</p>
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Monday – Friday</span>
              <span className="font-medium">8:00 AM – 5:00 PM</span>
            </div>
            <div className="flex justify-between">
              <span>Saturday</span>
              <span className="font-medium">9:00 AM – 1:00 PM</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Sunday</span>
              <span>Closed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
