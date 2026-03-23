import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import quickwayLogo from '../../assets/quickway-logo.png'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Left panel (brand) ─────────────────────────── */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] bg-brand flex-col justify-between p-10 shrink-0">
        <Link to="/" className="flex items-center gap-3">
          <img src={quickwayLogo} alt="Quickway" className="h-10 w-10 object-contain brightness-0 invert" />
          <div>
            <p className="text-white font-bold tracking-wide text-sm">QUICKWAY</p>
            <p className="text-blue-200 text-[10px] leading-tight">Auctioneers & Court Bailiffs</p>
          </div>
        </Link>

        <div>
          <blockquote className="text-white/90 text-xl font-medium leading-relaxed mb-4">
            "Trusted by auctioneers and court officers across Uganda for transparent, efficient asset disposal."
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-white text-xs font-bold">Q</span>
            </div>
            <div>
              <p className="text-white text-xs font-semibold">Quickway Platform</p>
              <p className="text-blue-200 text-[10px]">Since 2024</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {['Secure Bidding', 'KYC Verified', 'Court Approved', 'Real-Time'].map((tag) => (
            <span key={tag} className="px-2.5 py-1 bg-white/10 text-blue-100 text-[10px] font-medium rounded-full border border-white/20">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ── Right panel (form) ─────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">
        {/* Mobile logo */}
        <Link to="/" className="flex items-center gap-2.5 mb-8 lg:hidden">
          <img src={quickwayLogo} alt="Quickway" className="h-8 w-8 object-contain" />
          <div>
            <p className="text-brand font-bold tracking-wide text-xs">QUICKWAY</p>
            <p className="text-slate-400 text-[9px]">Auctioneers & Court Bailiffs</p>
          </div>
        </Link>

        <div className="w-full max-w-[400px]">
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-slate-900 mb-1.5">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>

          {children}
        </div>

        <p className="mt-8 text-[11px] text-slate-400 text-center max-w-xs">
          By using Quickway you agree to our{' '}
          <Link to="/terms" className="text-brand hover:underline">Terms of Service</Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-brand hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  )
}
