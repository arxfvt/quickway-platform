import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/authStore'
import type { User, UserRole } from '../../../types/user.types'

// ─────────────────────────────────────────────────────────────────────────────
// Helper — fetch profile row and hydrate the auth store
// ─────────────────────────────────────────────────────────────────────────────

async function fetchAndSetProfile(
  userId: string,
  setUser: (u: User | null) => void
): Promise<void> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000))
  const query = supabase
    .from('profiles')
    .select('id, email, role, kyc_status, org_id, full_name, phone, address, created_at')
    .eq('id', userId)
    .single()
    .then(({ data }) => data ?? null)
  const data = await Promise.race([query, timeout])
  setUser(data)
}

// ─────────────────────────────────────────────────────────────────────────────
// useAuth hook
// ─────────────────────────────────────────────────────────────────────────────

export function useAuth() {
  const { setUser, user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

  // ── Sign in ───────────────────────────────────────────────────────────────

  const signIn = async (email: string, password: string): Promise<string | null> => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return error.message
      if (data.user) await fetchAndSetProfile(data.user.id, setUser)
      return null
    } catch {
      return 'An unexpected error occurred. Please try again.'
    } finally {
      setIsLoading(false)
    }
  }

  // ── Sign up ───────────────────────────────────────────────────────────────

  const signUp = async (
    email: string,
    password: string,
    role: UserRole = 'bidder'
  ): Promise<string | null> => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) return error.message
      if (!data.user) return 'Registration failed. Please try again.'

      // Insert profile row (role defaults to 'bidder')
      const { error: profileErr } = await supabase.from('profiles').upsert({
        id:         data.user.id,
        email,
        role,
        kyc_status: 'pending',
      }, { onConflict: 'id' })

      if (profileErr) return profileErr.message

      setUser({
        id:         data.user.id,
        email,
        role,
        kyc_status: 'pending',
        org_id:     null,
        created_at: new Date().toISOString(),
      })

      return null
    } catch {
      return 'An unexpected error occurred. Please try again.'
    } finally {
      setIsLoading(false)
    }
  }

  // ── Sign out ──────────────────────────────────────────────────────────────

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut()
    setUser(null)
  }

  // ── Reset password ────────────────────────────────────────────────────────

  const resetPassword = async (email: string): Promise<string | null> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return error?.message ?? null
  }

  return { signIn, signUp, signOut, resetPassword, isLoading, user }
}
