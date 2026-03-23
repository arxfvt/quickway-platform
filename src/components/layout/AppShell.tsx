import { type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, Menu } from 'lucide-react'
import AppSidebar from './AppSidebar'
import { useUiStore } from '../../store/uiStore'
import { useAuthStore } from '../../store/authStore'
import { cn } from '../../lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// Breadcrumb helper
// ─────────────────────────────────────────────────────────────────────────────

const ROUTE_LABELS: Record<string, string> = {
  '/':                    'Dashboard',
  '/auctions':            'Auctions',
  '/calendar':            'Calendar',
  '/bidder':              'Active Bids',
  '/bidder/profile':      'My Profile',
  '/bidder/kyc':          'KYC Verification',
  '/bidder/history':      'Bid History',
  '/bidder/saved':        'Saved Auctions',
  '/org':                 'Organisation Portal',
  '/org/auctions':        'Manage Auctions',
  '/org/auctions/create': 'Create Auction',
  '/org/bidders':         'Bidders',
  '/admin':               'Admin Dashboard',
  '/admin/users':         'Users',
  '/admin/organizations': 'Organisations',
  '/admin/auctions':           'All Auctions',
  '/admin/catalogues/create':  'Create Catalogue',
  '/admin/kyc':                'KYC Queue',
}

function TopBar() {
  const { sidebarOpen, toggleSidebar } = useUiStore()
  const { user } = useAuthStore()
  const location = useLocation()

  // Match the longest prefix
  const pageLabel =
    Object.entries(ROUTE_LABELS)
      .filter(([path]) => location.pathname === path || location.pathname.startsWith(path + '/'))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? 'Quickway'

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-5 shrink-0 z-30">
      {/* Left: hamburger + breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </button>
        <div>
          <p className="text-sm font-semibold text-slate-800">{pageLabel}</p>
          <p className="text-[10px] text-slate-400 hidden sm:block">Quickway Auctioneers & Court Bailiffs</p>
        </div>
      </div>

      {/* Right: bell + avatar */}
      <div className="flex items-center gap-2">
        <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
          <Bell size={18} />
          {/* Unread indicator */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber" />
        </button>
        <div className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-lg',
          user ? 'hover:bg-slate-100 cursor-pointer' : ''
        )}>
          <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center">
            <span className="text-xs font-bold text-white">
              {user ? user.email[0].toUpperCase() : 'G'}
            </span>
          </div>
          {user && (
            <span className="text-xs font-medium text-slate-700 hidden sm:block">
              {user.email.split('@')[0]}
            </span>
          )}
        </div>
      </div>
    </header>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AppShell
// ─────────────────────────────────────────────────────────────────────────────

interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />

      {/* Content shifts right to accommodate fixed sidebar */}
      <div
        className={cn(
          'flex flex-col flex-1 min-w-0 overflow-hidden',
          'transition-[margin] duration-200 ease-in-out',
          sidebarOpen ? 'ml-56' : 'ml-16'
        )}
      >
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
