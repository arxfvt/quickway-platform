import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import {
  LayoutDashboard, Gavel, Users, UserCircle, ShieldCheck,
  Ticket, Building2, ChevronLeft, ChevronRight, Radio, LogIn,
  Package, History, LogOut,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useUiStore } from '../../store/uiStore'
import { useAuthStore } from '../../store/authStore'
import { useAuth } from '../../features/auth/hooks/useAuth'
import quickwayLogo from '../../assets/quickway-logo.png'

// ─────────────────────────────────────────────────────────────────────────────

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: number
  state?: object
}

interface NavSection {
  heading: string
  items: NavItem[]
}

// Role-aware nav configs
function getNavSections(role: string | undefined, pendingKyc: number, pendingPayments: number, location: ReturnType<typeof useLocation>): NavSection[] {
  if (role === 'admin') {
    return [
      {
        heading: 'Platform',
        items: [
          { label: 'Dashboard',      href: '/admin',                icon: LayoutDashboard },
          { label: 'KYC Queue',      href: '/admin/kyc',            icon: ShieldCheck,   badge: pendingKyc > 0 ? pendingKyc : undefined },
          { label: 'Payments',       href: '/admin/payments',       icon: Ticket,        badge: pendingPayments > 0 ? pendingPayments : undefined },
          { label: 'Auctions',       href: '/admin/auctions',       icon: Gavel },
        ],
      },
      {
        heading: 'Management',
        items: [
          { label: 'Users',          href: '/admin/users',          icon: Users },
          { label: 'Organisations',  href: '/admin/organizations',  icon: Building2 },
        ],
      },
      {
        heading: 'Catalogue',
        items: [
          { label: 'Browse Auctions', href: '/auctions',            icon: Gavel },
        ],
      },
    ]
  }

  if (role === 'org_admin') {
    return [
      {
        heading: 'Organisation',
        items: [
          { label: 'Dashboard',      href: '/org',                  icon: LayoutDashboard },
          { label: 'My Auctions',    href: '/org/auctions',         icon: Gavel },
          { label: 'Participants',   href: '/org/bidders',          icon: Users },
        ],
      },
      {
        heading: 'Catalogue',
        items: [
          { label: 'Browse Auctions', href: '/auctions',            icon: Package },
        ],
      },
    ]
  }

  if (role === 'bidder') {
    return [
      {
        heading: 'My Area',
        items: [
          { label: 'Dashboard',      href: '/bidder',               icon: LayoutDashboard },
          { label: 'Browse Auctions', href: '/auctions',            icon: Gavel },
          { label: 'Bid History',    href: '/bidder/history',       icon: History },
        ],
      },
      {
        heading: 'Account',
        items: [
          { label: 'My Profile',     href: '/bidder/profile',       icon: UserCircle },
          { label: 'KYC Verification', href: '/bidder/kyc',         icon: ShieldCheck },
        ],
      },
    ]
  }

  // Guest
  return [
    {
      heading: 'Catalogue',
      items: [
        { label: 'Home',            href: '/',         icon: LayoutDashboard },
        { label: 'Browse Auctions', href: '/auctions', icon: Gavel },
        { label: 'Sign In',         href: '/login',    icon: LogIn, state: { from: location } },
      ],
    },
  ]
}

// ─────────────────────────────────────────────────────────────────────────────

function NavGroup({
  section,
  collapsed,
  currentPath,
}: {
  section: NavSection
  collapsed: boolean
  currentPath: string
}) {
  return (
    <div className="mb-2">
      {!collapsed && (
        <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 select-none">
          {section.heading}
        </p>
      )}
      {collapsed && <div className="my-2 mx-3 border-t border-slate-100" />}
      <nav className="flex flex-col gap-0.5">
        {section.items.map((item) => {
          const isActive =
            item.href === '/bidder' || item.href === '/org' || item.href === '/admin'
              ? currentPath === item.href
              : currentPath.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              to={item.href}
              state={item.state}
              title={collapsed ? item.label : undefined}
              className={cn(
                'relative flex items-center gap-3 rounded-lg transition-colors duration-150',
                collapsed ? 'px-3 py-2.5 justify-center' : 'px-3 py-2',
                isActive
                  ? 'bg-brand text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} className="shrink-0" />
              {!collapsed && (
                <span className={cn('text-sm font-medium flex-1', isActive && 'font-semibold')}>
                  {item.label}
                </span>
              )}
              {item.badge !== undefined && (
                <span className={cn(
                  'shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                  isActive ? 'bg-white text-brand' : 'bg-amber-light text-amber-dark',
                  collapsed && 'absolute -top-1 -right-1'
                )}>
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AppSidebar() {
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUiStore()
  const { user } = useAuthStore()
  const { signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const collapsed = !sidebarOpen

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  // Close sidebar on route change when on mobile
  useEffect(() => {
    if (window.innerWidth < 768) setSidebarOpen(false)
  }, [location.pathname])

  const liveCount       = 0 // fetched per-page where needed
  const pendingKyc      = 0
  const pendingPayments = 0

  const sections = getNavSections(user?.role, pendingKyc, pendingPayments, location)

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 h-full bg-white border-r border-slate-200 flex flex-col z-40',
        // Mobile: slide in/out; always full width (w-56) when open
        'w-56 transition-transform md:transition-[width,transform] duration-200 ease-in-out',
        // Mobile hide/show
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        // Desktop: collapse to icon rail
        collapsed ? 'md:w-16' : 'md:w-56'
      )}
    >
      {/* ── Logo ──────────────────────────────────────────── */}
      <div className={cn(
        'flex items-center border-b border-slate-100 shrink-0',
        collapsed ? 'justify-center px-3 py-4' : 'px-4 py-4 gap-2.5'
      )}>
        <img
          src={quickwayLogo}
          alt="Quickway"
          className={cn('object-contain', collapsed ? 'h-8 w-8' : 'h-9 w-9')}
        />
        {!collapsed && (
          <div className="leading-tight">
            <p className="text-sm font-bold text-brand tracking-wide">QUICKWAY</p>
            <p className="text-[9px] text-slate-400 leading-none">Auctioneers & Court Bailiffs</p>
          </div>
        )}
      </div>

      {/* ── Nav ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-2 py-3 scrollbar-hide">
        {sections.map((section) => (
          <NavGroup
            key={section.heading}
            section={section}
            collapsed={collapsed}
            currentPath={location.pathname}
          />
        ))}
      </div>

      {/* ── Live indicator ────────────────────────────────── */}
      {!collapsed && liveCount > 0 && (
        <div className="mx-3 mb-3 rounded-xl bg-amber-light border border-amber px-3 py-2.5 flex items-center gap-2">
          <Radio size={14} className="text-amber shrink-0 animate-pulse" />
          <div>
            <p className="text-xs font-semibold text-amber-dark">{liveCount} Live Now</p>
            <p className="text-[10px] text-amber-dark opacity-75 leading-tight">Auctions in progress</p>
          </div>
        </div>
      )}
      {collapsed && liveCount > 0 && (
        <div
          className="mx-auto mb-3 w-8 h-8 rounded-full bg-amber-light flex items-center justify-center"
          title={`${liveCount} live auctions`}
        >
          <Radio size={14} className="text-amber animate-pulse" />
        </div>
      )}

      {/* ── User footer ───────────────────────────────────── */}
      {user && !collapsed && (
        <div className="px-3 pb-3 border-t border-slate-100 pt-3 mx-2">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="w-7 h-7 rounded-full bg-brand-light flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-brand">
                {(user.full_name ?? user.email)[0].toUpperCase()}
              </span>
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">
                {user.full_name ?? user.email}
              </p>
              <p className="text-[10px] text-slate-400 capitalize">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      )}
      {user && collapsed && (
        <div className="px-2 pb-3">
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="w-full flex items-center justify-center py-2.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      )}

      {/* ── Collapse toggle ───────────────────────────────── */}
      <button
        onClick={toggleSidebar}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={cn(
          'absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-slate-200',
          'flex items-center justify-center shadow-sm',
          'hover:bg-slate-50 transition-colors z-50'
        )}
      >
        {collapsed
          ? <ChevronRight size={12} className="text-slate-500" />
          : <ChevronLeft  size={12} className="text-slate-500" />
        }
      </button>
    </aside>
  )
}
