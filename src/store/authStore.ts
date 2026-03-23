import { create } from 'zustand'
import type { User } from '../types/user.types'

interface AuthState {
  user: User | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  // isLoading starts false — no async session check yet.
  // Will be set to true during Supabase onAuthStateChange init.
  isLoading: false,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}))
