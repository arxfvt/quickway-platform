import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { Bell, Menu, ShieldCheck, Ticket, X } from 'lucide-react'
import AppSidebar from './AppSidebar'
import { useUiStore } from '../../store/uiStore'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../lib/supabase'
import { formatDate } from '../../utils/date'
import { cn } from '../../lib/utils'
import quickwayLogo from '../../assets/quickway-logo.png'

// ─────────────────────────────────────────────────────────────────────────────
// Notification types
// ─────────────────────────────────────────────────────────────────────────────

interface NotifItem {
  id: string
  message: string
  timestamp: string | null
  href: string
  type: 'kyc' | 'payment'
}

// ─────────────────────────────────────────────────────────────────────────────
// Breadcrumb helper
// ─────────────────────────────────────────────────────────────────────────────

const ROUTE_LABELS: Record<string, string> = {
  '/':                         'Dashboard',
  '/auctions':                 'Auctions',
  '/calendar':                 'Calendar',
  '/bidder':                   'Active Bids',
  '/bidder/profile':           'My Profile',
  '/bidder/kyc':               'KYC Verification',
  '/bidder/history':           'Bid History',
  '/bidder/saved':             'Saved Auctions',
  '/org':                      'Organisation Portal',
  '/org/auctions':             'Manage Auctions',
  '/org/bidders':              'Bidders',
  '/admin':                    'Admin Dashboard',
  '/admin/users':              'Users',
  '/admin/organizations':      'Organisations',
  '/admin/auctions':           'All Auctions',
  '/admin/auctions/':          'Auction Detail',
  '/admin/catalogues/create':  'Create Catalogue',
  '/admin/kyc':                'KYC Queue',
  '/admin/payments':           'Payments',
}

function TopBar() {
  const { sidebarOpen, toggleSidebar } = useUiStore()
  const { user } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()

  const [notifOpen, setNotifOpen] = useState(false)
  const [notifs, setNotifs] = useState<NotifItem[]>([])
  const bellRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Fetch notifications based on role
  useEffect(() => {
    if (!user) { setNotifs([]); return }

    if (user.role === 'admin') {
      Promise.all([
        supabase.from('kyc_documents').select('id,created_at').eq('status', 'pending')
          .order('created_at', { ascending: false }).limit(10),
        supabase.from('auction_participations').select('id,created_at').eq('payment_status', 'pending_review')
          .order('created_at', { ascending: false }).limit(10),
      ]).then(([kyc, pay]) => {
        const items: NotifItem[] = [
          ...(kyc.data ?? []).map((d) => ({
            id: `kyc-${d.id}`,
            message: 'New KYC document pending review',
            timestamp: d.created_at,
            href: '/admin/kyc',
            type: 'kyc' as const,
          })),
          ...(pay.data ?? []).map((d) => ({
            id: `pay-${d.id}`,
            message: 'Payment proof pending approval',
            timestamp: d.created_at,
            href: '/admin/payments',
            type: 'payment' as const,
          })),
        ].sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''))
        setNotifs(items)
      }).catch(() => {})
    } else if (user.role === 'bidder') {
      Promise.all([
        supabase.from('kyc_documents').select('id,status,reviewed_at').eq('user_id', user.id)
          .in('status', ['approved', 'rejected']).order('reviewed_at', { ascending: false }).limit(5),
        supabase.from('auction_participations').select('id,payment_status,reviewed_at').eq('bidder_id', user.id)
          .in('payment_status', ['approved', 'rejected']).order('reviewed_at', { ascending: false }).limit(5),
      ]).then(([kyc, pay]) => {
        const items: NotifItem[] = [
          ...(kyc.data ?? []).map((d) => ({
            id: `kyc-${d.id}`,
            message: d.status === 'approved' ? 'Your KYC verification was approved' : 'Your KYC verification was rejected',
            timestamp: d.reviewed_at,
            href: '/bidder/kyc',
            type: 'kyc' as const,
          })),
          ...(pay.data ?? []).map((d) => ({
            id: `pay-${d.id}`,
            message: d.payment_status === 'approved' ? 'Your participation payment was approved' : 'Your participation payment was rejected',
            timestamp: d.reviewed_at,
            href: '/bidder',
            type: 'payment' as const,
          })),
        ].sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''))
        setNotifs(items)
      }).catch(() => {})
    } else {
      setNotifs([])
    }
  }, [user?.id, user?.role])

  // Match the longest prefix
  const pageLabel =
    Object.entries(ROUTE_LABELS)
      .filter(([path]) => location.pathname === path || location.pathname.startsWith(path + '/'))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? 'Quickway'

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-5 shrink-0 z-30">
      {/* Left: hamburger + logo + breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </button>
        <img
          src={quickwayLogo}
          alt="Quickway"
          className={cn('h-7 w-7 object-contain', sidebarOpen ? 'block md:hidden' : 'block')}
        />
        <div>
          <p className="text-sm font-semibold text-slate-800">{pageLabel}</p>
          <p className="text-[10px] text-slate-400 hidden sm:block">Quickway Auctioneers & Court Bailiffs</p>
        </div>
      </div>

      {/* Right: bell + avatar */}
      <div className="flex items-center gap-2">

        {/* ── Notification bell ─────────────────────────────── */}
        <div ref={bellRef} className="relative">
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {notifs.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-amber text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                {notifs.length > 9 ? '9+' : notifs.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-lg border border-slate-100 z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-800">Notifications</p>
                <button onClick={() => setNotifOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                  <X size={13} />
                </button>
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifs.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-400">
                    <Bell size={24} strokeWidth={1} className="mx-auto mb-2 opacity-40" />
                    <p className="text-xs">No notifications</p>
                  </div>
                ) : (
                  notifs.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => { navigate(n.href); setNotifOpen(false) }}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className={cn(
                        'w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                        n.type === 'kyc' ? 'bg-amber-light' : 'bg-brand-light'
                      )}>
                        {n.type === 'kyc'
                          ? <ShieldCheck size={13} className="text-amber-dark" />
                          : <Ticket size={13} className="text-brand" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 leading-snug">{n.message}</p>
                        {n.timestamp && (
                          <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(n.timestamp)}</p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Avatar ────────────────────────────────────────── */}
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
// AppShell — layout route: renders Outlet as page content
// ─────────────────────────────────────────────────────────────────────────────

export default function AppShell() {
  const { sidebarOpen, setSidebarOpen } = useUiStore()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile backdrop — tap to close sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AppSidebar />

      {/* On mobile: no margin (sidebar is an overlay). On desktop: shift right. */}
      <div
        className={cn(
          'flex flex-col flex-1 min-w-0 overflow-hidden',
          'transition-[margin] duration-200 ease-in-out',
          sidebarOpen ? 'md:ml-56' : 'md:ml-16'
        )}
      >
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
