import { useState } from 'react'
import { User, Phone, MapPin, Mail, KeyRound, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuthStore } from '../../../store/authStore'
import { updateProfile } from '../../../services/users.service'
import { supabase } from '../../../lib/supabase'
import { cn } from '../../../lib/utils'

// ─────────────────────────────────────────────────────────────────────────────

function InputField({
  label, value, onChange, type = 'text', placeholder, readOnly = false, icon,
}: {
  label: string
  value: string
  onChange?: (v: string) => void
  type?: string
  placeholder?: string
  readOnly?: boolean
  icon?: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1.5">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className={cn(
            'w-full py-2.5 rounded-xl text-sm border transition-colors',
            icon ? 'pl-9 pr-3.5' : 'px-3.5',
            readOnly
              ? 'bg-slate-50 text-slate-500 border-slate-100 cursor-default'
              : 'bg-white text-slate-800 border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand'
          )}
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function BidderProfile() {
  const { user, setUser } = useAuthStore()

  // Profile form state
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [phone, setPhone]       = useState(user?.phone ?? '')
  const [address, setAddress]   = useState(user?.address ?? '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileStatus, setProfileStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  // Password form state
  const [currentPw, setCurrentPw]   = useState('')
  const [newPw, setNewPw]           = useState('')
  const [confirmPw, setConfirmPw]   = useState('')
  const [pwSaving, setPwSaving]     = useState(false)
  const [pwStatus, setPwStatus]     = useState<'idle' | 'saved' | 'error'>('idle')
  const [pwError, setPwError]       = useState('')

  const handleProfileSave = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    if (!user) return
    setProfileSaving(true)
    try {
      await updateProfile(user.id, { full_name: fullName, phone, address })
      setUser({ ...user, full_name: fullName, phone, address })
      setProfileStatus('saved')
      setTimeout(() => setProfileStatus('idle'), 3000)
    } catch {
      setProfileStatus('error')
      setTimeout(() => setProfileStatus('idle'), 3000)
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordSave = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setPwError('')
    if (newPw.length < 8) { setPwError('Password must be at least 8 characters.'); return }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return }
    setPwSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw })
      if (error) throw error
      setPwStatus('saved')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      setTimeout(() => setPwStatus('idle'), 3000)
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Failed to update password.')
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-[900px] mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">My Profile</h1>
        <p className="text-xs text-slate-500 mt-0.5">Manage your personal details and account security.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── Personal Details ──────────────────────────────── */}
        <form onSubmit={handleProfileSave} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <User size={15} className="text-brand" />
            <h2 className="text-sm font-semibold text-slate-800">Personal Details</h2>
          </div>

          <InputField
            label="Email Address"
            value={user?.email ?? ''}
            icon={<Mail size={13} />}
            readOnly
          />
          <InputField
            label="Full Name"
            value={fullName}
            onChange={setFullName}
            icon={<User size={13} />}
            placeholder="David Mukasa"
          />
          <InputField
            label="Phone Number"
            value={phone}
            onChange={setPhone}
            type="tel"
            icon={<Phone size={13} />}
            placeholder="+256 7XX XXX XXX"
          />
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              <MapPin size={11} className="inline mr-1" />
              Address
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              placeholder="Plot 24, Bukoto Street, Kampala"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors resize-none"
            />
          </div>

          {profileStatus === 'saved' && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-xl px-3 py-2">
              <CheckCircle2 size={13} />
              Profile saved successfully
            </div>
          )}
          {profileStatus === 'error' && (
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle size={13} />
              Failed to save profile. Please try again.
            </div>
          )}

          <button
            type="submit"
            disabled={profileSaving}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors',
              profileSaving ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-brand hover:bg-brand-dark text-white'
            )}
          >
            {profileSaving && <Loader2 size={14} className="animate-spin" />}
            {profileSaving ? 'Saving…' : 'Save Profile'}
          </button>
        </form>

        {/* ── Password Change ───────────────────────────────── */}
        <form onSubmit={handlePasswordSave} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound size={15} className="text-brand" />
            <h2 className="text-sm font-semibold text-slate-800">Change Password</h2>
          </div>

          <InputField
            label="Current Password"
            value={currentPw}
            onChange={setCurrentPw}
            type="password"
            placeholder="Enter current password"
          />
          <InputField
            label="New Password"
            value={newPw}
            onChange={setNewPw}
            type="password"
            placeholder="Minimum 8 characters"
          />
          <InputField
            label="Confirm New Password"
            value={confirmPw}
            onChange={setConfirmPw}
            type="password"
            placeholder="Repeat new password"
          />

          {pwError && (
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle size={13} />
              {pwError}
            </div>
          )}
          {pwStatus === 'saved' && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-xl px-3 py-2">
              <CheckCircle2 size={13} />
              Password changed successfully
            </div>
          )}

          <button
            type="submit"
            disabled={pwSaving || !currentPw || !newPw || !confirmPw}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors',
              pwSaving || !currentPw || !newPw || !confirmPw
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-brand hover:bg-brand-dark text-white'
            )}
          >
            {pwSaving && <Loader2 size={14} className="animate-spin" />}
            {pwSaving ? 'Saving…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
