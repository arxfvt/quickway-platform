import { useState, useMemo, useEffect } from 'react'
import { Search, ShieldCheck, ShieldOff, Clock, Users, ChevronDown, Loader2 } from 'lucide-react'
import { getUsers, updateUserRole, updateUserOrgAssignment, updateUserKycStatus } from '../../../services/users.service'
import { getOrganizations } from '../../../services/organizations.service'
import { formatDate } from '../../../utils/date'
import { cn } from '../../../lib/utils'
import type { User, UserRole } from '../../../types/user.types'
import type { Organization } from '../../../types/org.types'
import { useAuthStore } from '../../../store/authStore'

// ─────────────────────────────────────────────────────────────────────────────

const KYC_CHIP: Record<string, string> = {
  approved:      'bg-green-50 text-green-700',
  pending:       'bg-amber-light text-amber-dark',
  rejected:      'bg-red-50 text-red-600',
  not_submitted: 'bg-slate-100 text-slate-400',
}

const KYC_LABEL: Record<string, string> = {
  approved:      'Verified',
  pending:       'Pending',
  rejected:      'Rejected',
  not_submitted: 'Not Submitted',
}

const ROLE_CHIP: Record<string, string> = {
  admin:     'bg-brand-light text-brand',
  org_admin: 'bg-slate-100 text-slate-600',
  bidder:    'bg-slate-50 text-slate-500',
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminUsers() {
  const currentUser = useAuthStore((s) => s.user)
  const [query, setQuery]         = useState('')
  const [kycFilter, setKycFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [users, setUsers]         = useState<User[]>([])
  const [orgs, setOrgs]           = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([getUsers(), getOrganizations()])
      .then(([u, o]) => { setUsers(u); setOrgs(o) })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = query.toLowerCase()
      const matchesQuery =
        !q ||
        (u.full_name ?? '').toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      const matchesKyc  = kycFilter === 'all'  || u.kyc_status === kycFilter
      const matchesRole = roleFilter === 'all' || u.role === roleFilter
      return matchesQuery && matchesKyc && matchesRole
    })
  }, [users, query, kycFilter, roleFilter])

  const bidderCount     = users.filter((u) => u.role === 'bidder').length
  const verifiedCount   = users.filter((u) => u.kyc_status === 'approved').length
  const pendingKycCount = users.filter((u) => u.kyc_status === 'pending').length

  const handleRoleChange = async (userId: string, role: UserRole) => {
    // Optimistic update
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u))
    try {
      await updateUserRole(userId, role)
    } catch {
      // Revert on failure
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u } : u))
    }
  }

  const handleKycChange = async (userId: string, kyc_status: 'approved' | 'not_submitted') => {
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, kyc_status } : u))
    try {
      await updateUserKycStatus(userId, kyc_status)
    } catch { /* revert silently — user will see stale state until refresh */ }
  }

  const handleOrgChange = async (userId: string, orgId: string) => {
    const value = orgId === '' ? null : orgId
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, org_id: value ?? undefined } : u))
    try {
      await updateUserOrgAssignment(userId, value)
    } catch {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u } : u))
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-brand" />
    </div>
  )

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Users</h1>
          <p className="text-xs text-slate-500 mt-0.5">{users.length} registered users on the platform.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Total Bidders',  value: bidderCount,     icon: <Users size={15} className="text-brand" />,         bg: 'bg-brand-light' },
          { label: 'KYC Verified',   value: verifiedCount,   icon: <ShieldCheck size={15} className="text-green-600" />, bg: 'bg-green-50' },
          { label: 'KYC Pending',    value: pendingKycCount, icon: <Clock size={15} className="text-amber" />,          bg: 'bg-amber-light' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', s.bg)}>{s.icon}</div>
            <div>
              <p className="text-lg font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email…"
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
          />
        </div>

        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="bidder">Bidder</option>
            <option value="org_admin">Org Admin</option>
            <option value="admin">Admin</option>
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={kycFilter}
            onChange={(e) => setKycFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors cursor-pointer"
          >
            <option value="all">All KYC</option>
            <option value="approved">Verified</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
            <option value="not_submitted">Not Submitted</option>
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <Users size={32} strokeWidth={1} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">No users match your search</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">User</th>
                <th className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-3">KYC Status</th>
                <th className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3 hidden lg:table-cell">Joined</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((u: User) => {
                const isSelf = u.id === currentUser?.id
                return (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* User cell */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center shrink-0">
                          <span className="text-[11px] font-bold text-brand">
                            {(u.full_name ?? u.email)[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate max-w-[180px]">
                            {u.full_name ?? '—'}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* KYC */}
                    <td className="px-3 py-3.5 text-center">
                      <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full', KYC_CHIP[u.kyc_status])}>
                        {u.kyc_status === 'approved'
                          ? <><ShieldCheck size={8} />{KYC_LABEL[u.kyc_status]}</>
                          : u.kyc_status === 'pending'
                          ? <><Clock size={8} />{KYC_LABEL[u.kyc_status]}</>
                          : <><ShieldOff size={8} />{KYC_LABEL[u.kyc_status]}</>
                        }
                      </span>
                    </td>

                    {/* Joined */}
                    <td className="px-5 py-3.5 text-right hidden lg:table-cell">
                      <span className="text-[10px] text-slate-400">{formatDate(u.created_at)}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Role select */}
                        <div className="relative">
                          <select
                            value={u.role}
                            disabled={isSelf}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                            className={cn(
                              'appearance-none text-[10px] font-semibold px-2.5 py-1 pr-6 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors',
                              isSelf ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                              ROLE_CHIP[u.role]
                            )}
                          >
                            <option value="bidder">bidder</option>
                            <option value="org_admin">org admin</option>
                            <option value="admin">admin</option>
                          </select>
                          {!isSelf && (
                            <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                          )}
                        </div>

                        {/* KYC override */}
                        {u.kyc_status !== 'approved' ? (
                          <button
                            onClick={() => handleKycChange(u.id, 'approved')}
                            className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                          >
                            Approve KYC
                          </button>
                        ) : (
                          <button
                            onClick={() => handleKycChange(u.id, 'not_submitted')}
                            className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors flex items-center gap-1"
                          >
                            <ShieldCheck size={9} />KYC ✓ Reset
                          </button>
                        )}

                        {/* Org assignment — only for org_admin */}
                        {u.role === 'org_admin' && (
                          <div className="relative">
                            <select
                              value={u.org_id ?? ''}
                              onChange={(e) => handleOrgChange(u.id, e.target.value)}
                              className="appearance-none text-[10px] pl-2 pr-6 py-1 rounded-full border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors cursor-pointer"
                            >
                              <option value="">No org</option>
                              {orgs.map((o) => (
                                <option key={o.id} value={o.id}>{o.name}</option>
                              ))}
                            </select>
                            <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
