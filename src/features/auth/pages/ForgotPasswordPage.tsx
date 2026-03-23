import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { cn } from '../../../lib/utils'

export default function ForgotPasswordPage() {
  const { resetPassword, isLoading } = useAuth()

  const [email, setEmail]     = useState('')
  const [error, setError]     = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError('')
    const err = await resetPassword(email)
    if (err) {
      setError(err)
    } else {
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center text-center gap-3 py-4">
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 size={24} className="text-green-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Check your inbox</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              We've sent a password reset link to{' '}
              <span className="font-medium text-slate-700">{email}</span>.
              <br />
              The link expires in 1 hour.
            </p>
          </div>
        </div>
        <Link
          to="/login"
          className="block w-full text-center py-2.5 rounded-xl text-sm font-semibold bg-brand hover:bg-brand-dark text-white transition-colors"
        >
          Back to Sign In
        </Link>
        <p className="text-center text-[11px] text-slate-400">
          Didn't receive it?{' '}
          <button
            onClick={() => setSubmitted(false)}
            className="text-brand hover:underline font-medium"
          >
            Try again
          </button>
        </p>
      </div>
    )
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

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading || !email}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors mt-1',
          isLoading || !email
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-brand hover:bg-brand-dark text-white'
        )}
      >
        {isLoading && <Loader2 size={15} className="animate-spin" />}
        {isLoading ? 'Sending…' : 'Send Reset Link'}
      </button>

      {/* Back to login */}
      <p className="text-center text-xs text-slate-500">
        Remembered it?{' '}
        <Link to="/login" className="text-brand font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
