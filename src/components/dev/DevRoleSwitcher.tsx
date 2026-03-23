import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import type { User } from '../../types/user.types'

// ─────────────────────────────────────────────────────────────────────────────
// DEV-ONLY component — stripped from production builds.
// Fix: hooks must be called unconditionally (Rules of Hooks).
// Fix: uses window.location.href instead of useNavigate (no Router context here).
// ─────────────────────────────────────────────────────────────────────────────

const NOW = new Date().toISOString()

const MOCK_USERS: Record<string, { user: User; dest: string; label: string; color: string }> = {
  admin: {
    label: 'Admin',
    color: 'bg-brand text-white',
    dest: '/admin',
    user: {
      id: 'dev-admin',
      email: 'admin@quickway.ug',
      role: 'admin',
      kyc_status: 'approved',
      org_id: null,
      full_name: 'Admin User',
      phone: null,
      address: null,
      created_at: NOW,
    },
  },
  org_admin: {
    label: 'Org Admin',
    color: 'bg-slate-700 text-white',
    dest: '/org',
    user: {
      id: 'dev-org',
      email: 'org@quickway.ug',
      role: 'org_admin',
      kyc_status: 'approved',
      org_id: 'org-001',
      full_name: 'Org Admin',
      phone: null,
      address: null,
      created_at: NOW,
    },
  },
  bidder: {
    label: 'Bidder',
    color: 'bg-green-600 text-white',
    dest: '/bidder',
    user: {
      id: 'user-019',
      email: 'david.mukasa@gmail.com',
      role: 'bidder',
      kyc_status: 'approved',
      org_id: null,
      full_name: 'David Mukasa',
      phone: '+256 772 345 678',
      address: 'Plot 24, Bukoto Street, Kampala',
      created_at: '2025-01-15T09:00:00Z',
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────

export default function DevRoleSwitcher() {
  // Hooks MUST be called before any conditional return
  const [open, setOpen] = useState(false)
  const { setUser, user } = useAuthStore()

  if (!import.meta.env.DEV) return null

  const login = (key: string) => {
    const entry = MOCK_USERS[key]
    sessionStorage.setItem('__dev_user', JSON.stringify(entry.user))
    setUser(entry.user)
    window.location.href = entry.dest
  }

  const logout = () => {
    sessionStorage.removeItem('__dev_user')
    setUser(null)
    window.location.href = '/'
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2">
      {open && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-3 flex flex-col gap-2 min-w-[160px]">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-0.5">
            Dev Role Switcher
          </p>
          {user && (
            <div className="bg-slate-50 rounded-lg px-2.5 py-1.5 mb-1">
              <p className="text-[10px] font-semibold text-slate-600 truncate">{user.full_name ?? user.email}</p>
              <p className="text-[9px] text-slate-400 capitalize">{user.role.replace('_', ' ')}</p>
            </div>
          )}
          {Object.entries(MOCK_USERS).map(([key, entry]) => (
            <button
              key={key}
              onClick={() => login(key)}
              className={`w-full text-left text-xs font-semibold px-3 py-2 rounded-xl transition-opacity hover:opacity-90 ${entry.color}`}
            >
              {entry.label}
            </button>
          ))}
          <button
            onClick={logout}
            className="w-full text-left text-xs font-semibold px-3 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
          >
            Sign Out
          </button>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="bg-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg hover:bg-slate-700 transition-colors tracking-widest"
        title="Dev Role Switcher"
      >
        {open ? '✕ DEV' : '⚡ DEV'}
      </button>
    </div>
  )
}
