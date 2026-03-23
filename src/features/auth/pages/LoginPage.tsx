import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Mail, Lock, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '../../../store/authStore'
import { cn } from '../../../lib/utils'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, isLoading } = useAuth()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError('')
    const err = await signIn(email, password)
    if (err) {
      setError(err)
    } else {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname
      const user = useAuthStore.getState().user
      if (from && from !== '/') {
        navigate(from, { replace: true })
      } else if (user?.role === 'admin') {
        navigate('/admin', { replace: true })
      } else if (user?.role === 'org_admin') {
        navigate('/org', { replace: true })
      } else {
        navigate('/bidder', { replace: true })
      }
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

      {/* Email */}
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1.5">
          Email address
        </label>
        <div className="relative">
          <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={cn(
              'w-full pl-9 pr-3.5 py-2.5 rounded-xl text-sm border bg-white',
              'focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors',
              'placeholder-slate-400 text-slate-800',
              error ? 'border-red-300' : 'border-slate-200'
            )}
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-slate-700">Password</label>
          <Link to="/forgot-password" className="text-[11px] text-brand hover:underline">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type={showPw ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={cn(
              'w-full pl-9 pr-10 py-2.5 rounded-xl text-sm border bg-white',
              'focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors',
              'placeholder-slate-400 text-slate-800',
              error ? 'border-red-300' : 'border-slate-200'
            )}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading || !email || !password}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors mt-2',
          isLoading || !email || !password
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-brand hover:bg-brand-dark text-white'
        )}
      >
        {isLoading ? <Loader2 size={15} className="animate-spin" /> : null}
        {isLoading ? 'Signing in…' : 'Sign In'}
      </button>

      {/* Divider */}
      <div className="relative flex items-center gap-3 py-1">
        <div className="flex-1 border-t border-slate-200" />
        <span className="text-[11px] text-slate-400">or</span>
        <div className="flex-1 border-t border-slate-200" />
      </div>

      {/* Register link */}
      <p className="text-center text-xs text-slate-500">
        Don't have an account?{' '}
        <Link to="/register" className="text-brand font-medium hover:underline">
          Create one
        </Link>
      </p>
    </form>
  )
}
