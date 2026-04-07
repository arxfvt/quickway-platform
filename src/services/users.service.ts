import { supabase } from '../lib/supabase'
import type { User, UserRole } from '../types/user.types'

// ─────────────────────────────────────────────────────────────────────────────
// Users Service — Supabase queries against the `profiles` table
// ─────────────────────────────────────────────────────────────────────────────

export interface UserFilters {
  role?: UserRole
  kyc_status?: string
}

/** Fetch all user profiles (admin only). */
export async function getUsers(filters?: UserFilters): Promise<User[]> {
  let query = supabase
    .from('profiles')
    .select('id, email, role, kyc_status, org_id, full_name, phone, address, created_at')
    .order('created_at', { ascending: false })

  if (filters?.role)       query = query.eq('role',       filters.role)
  if (filters?.kyc_status) query = query.eq('kyc_status', filters.kyc_status)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as User[]
}

/** Admin: update a user's role. */
export async function updateUserRole(id: string, role: UserRole): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', id)

  if (error) throw error
}

/** Admin: manually set a user's KYC status (bypass document flow). */
export async function updateUserKycStatus(
  id: string,
  kyc_status: 'approved' | 'rejected' | 'not_submitted'
): Promise<void> {
  const { error } = await supabase.from('profiles').update({ kyc_status }).eq('id', id)
  if (error) throw error
}

/** Admin: assign (or remove) an org from a user. */
export async function updateUserOrgAssignment(id: string, orgId: string | null): Promise<void> {
  const { error } = await supabase.from('profiles').update({ org_id: orgId }).eq('id', id)
  if (error) throw error
}

/** Bidder: update own profile fields. */
export async function updateProfile(
  id: string,
  payload: { full_name?: string; phone?: string; address?: string }
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', id)

  if (error) throw error
}
