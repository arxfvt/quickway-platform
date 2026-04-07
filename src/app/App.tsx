import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import DevRoleSwitcher from '../components/dev/DevRoleSwitcher'
import type { User } from '../types/user.types'

// ─────────────────────────────────────────────────────────────────────────────
// Fetch profile row from Supabase and return it as our User type
// ─────────────────────────────────────────────────────────────────────────────

async function fetchProfile(userId: string): Promise<User | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, email, role, kyc_status, org_id, full_name, phone, address, created_at')
    .eq('id', userId)
    .single()
  return data ?? null
}

// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const { setUser, setLoading } = useAuthStore()

  useEffect(() => {
    // 1. Resolve initial session (handles page refresh)
    setLoading(true)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        if (profile) setUser(profile)
      } else if (import.meta.env.DEV) {
        const saved = sessionStorage.getItem('__dev_user')
        if (saved) setUser(JSON.parse(saved))
      }
      setLoading(false)
    }).catch(() => setLoading(false))

    // 2. Subscribe to future auth events (sign in is handled by useAuth.signIn)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [setUser, setLoading])

  return (
    <>
      <RouterProvider router={router} />
      <DevRoleSwitcher />
    </>
  )
}
