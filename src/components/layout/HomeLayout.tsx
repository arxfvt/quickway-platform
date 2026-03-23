import { Link, Outlet, useNavigate } from 'react-router-dom'
import { LogIn, LayoutDashboard } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import quickwayLogo from '../../assets/quickway-logo.png'

export default function HomeLayout() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const dashboardPath =
    user?.role === 'admin'
      ? '/admin'
      : user?.role === 'org_admin'
      ? '/org'
      : '/bidder'

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* ── Top nav ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <img src={quickwayLogo} alt="Quickway" className="h-8 w-8 object-contain" />
            <div>
              <p className="text-brand font-bold tracking-wide text-xs leading-none">QUICKWAY</p>
              <p className="text-slate-400 text-[9px] leading-tight">Auctioneers & Court Bailiffs</p>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
            <Link to="/auctions" className="hover:text-brand transition-colors">Catalogue</Link>
            <Link to="/auctions?status=live" className="hover:text-brand transition-colors">Live Auctions</Link>
            <Link to="/auctions?status=scheduled" className="hover:text-brand transition-colors">Upcoming</Link>
          </nav>

          {/* Auth CTA */}
          <div className="flex items-center gap-2">
            {user ? (
              <button
                onClick={() => navigate(dashboardPath)}
                className="flex items-center gap-1.5 bg-brand text-white text-xs font-semibold px-3.5 py-2 rounded-lg hover:bg-brand-dark transition-colors"
              >
                <LayoutDashboard size={13} />
                Dashboard
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 text-slate-600 text-xs font-medium px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <LogIn size={13} />
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="bg-brand text-white text-xs font-semibold px-3.5 py-2 rounded-lg hover:bg-brand-dark transition-colors"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Page content ─────────────────────────────────────── */}
      <Outlet />
    </div>
  )
}
