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
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000))
  const query = supabase
    .from('profiles')
    .select('id, email, role, kyc_status, org_id, full_name, phone, address, created_at')
    .eq('id', userId)
    .single()
    .then(({ data }) => data ?? null)
  return Promise.race([query, timeout])
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
        setUser(profile)
      } else if (import.meta.env.DEV) {
        const saved = sessionStorage.getItem('__dev_user')
        if (saved) setUser(JSON.parse(saved))
      }
      setLoading(false)
    }).catch(() => setLoading(false))

    // 2. Subscribe to future auth events (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
        } else if (event === 'SIGNED_IN' && session?.user) {
          const profile = await fetchProfile(session.user.id)
          setUser(profile)
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
