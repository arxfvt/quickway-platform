import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { cn } from '../../../lib/utils'
import type { UserRole } from '../../../types/user.types'

// ─────────────────────────────────────────────────────────────────────────────

const ROLES: { value: UserRole; label: string; description: string }[] = [
  {
    value: 'bidder',
    label: 'Bidder',
    description: 'Browse and bid on auctions. KYC verification required.',
  },
  {
    value: 'org_admin',
    label: 'Organisation',
    description: "List assets for auction and manage your organisation's lots.",
  },
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const { signUp, isLoading } = useAuth()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [role, setRole]         = useState<UserRole>('bidder')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')

  const passwordsMatch = password && confirm && password === confirm
  const passwordStrong = password.length >= 8

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError('')

    if (!passwordStrong) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    const err = await signUp(email, password, role)
    if (err) {
      setError(err)
    } else {
      // Supabase sends a confirmation email; redirect to login with notice
      navigate('/login', { state: { registered: true } })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 px-3.5 py-3 rounded-xl text-xs">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Role selector */}
      <div>
        <p className="text-xs font-medium text-slate-700 mb-2">I want to…</p>
        <div className="grid grid-cols-2 gap-2">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              className={cn(
                'text-left p-3 rounded-xl border-2 transition-colors',
                role === r.value
                  ? 'border-brand bg-brand-light'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              )}
            >
              <p className={cn('text-xs font-semibold', role === r.value ? 'text-brand' : 'text-slate-800')}>
                {r.label}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{r.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1.5">Email address</label>
        <div className="relative">
          <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors placeholder-slate-400 text-slate-800"
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1.5">Password</label>
        <div className="relative">
          <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type={showPw ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors placeholder-slate-400 text-slate-800"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {password && (
          <p className={cn('text-[11px] mt-1 flex items-center gap-1', passwordStrong ? 'text-green-600' : 'text-amber-dark')}>
            {passwordStrong
              ? <><CheckCircle2 size={11} /> Strong password</>
              : <><AlertCircle size={11} /> At least 8 characters required</>}
          </p>
        )}
      </div>

      {/* Confirm password */}
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1.5">Confirm password</label>
        <div className="relative">
          <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type={showPw ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat your password"
            className={cn(
              'w-full pl-9 pr-3.5 py-2.5 rounded-xl text-sm border bg-white',
              'focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors',
              'placeholder-slate-400 text-slate-800',
              confirm && !passwordsMatch ? 'border-red-300' : 'border-slate-200'
            )}
          />
        </div>
        {confirm && !passwordsMatch && (
          <p className="text-[11px] text-red-500 mt-1">Passwords do not match</p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading || !email || !password || !confirm}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors mt-1',
          isLoading || !email || !password || !confirm
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-brand hover:bg-brand-dark text-white'
        )}
      >
        {isLoading ? <Loader2 size={15} className="animate-spin" /> : <User size={15} />}
        {isLoading ? 'Creating account…' : 'Create Account'}
      </button>

      {/* Login link */}
      <p className="text-center text-xs text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="text-brand font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
