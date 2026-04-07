import { supabase } from '../lib/supabase'
import type { Organization } from '../types/org.types'

// ─────────────────────────────────────────────────────────────────────────────
// Organizations Service — Supabase queries
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch all organizations ordered by name. */
export async function getOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return (data ?? []) as Organization[]
}

/** Fetch a single organization by id. */
export async function getOrganization(id: string): Promise<Organization | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data as Organization
}

/** Create a new organization. Returns the created row. */
export async function createOrganization(
  payload: Omit<Organization, 'id' | 'created_at'>
): Promise<Organization> {
  const { data, error } = await supabase
    .from('organizations')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error
  return data as Organization
}

/** Update an existing organization. */
export async function updateOrganization(
  id: string,
  payload: Partial<Omit<Organization, 'id' | 'created_at'>>
): Promise<void> {
  const { error } = await supabase
    .from('organizations')
    .update(payload)
    .eq('id', id)

  if (error) throw error
}

/** Admin: toggle organisation status (active ↔ suspended). */
export async function updateOrgStatus(id: string, status: 'active' | 'suspended'): Promise<void> {
  const { error } = await supabase.from('organizations').update({ status }).eq('id', id)
  if (error) throw error
}

/** Admin: permanently delete an organisation. */
export async function deleteOrganization(id: string): Promise<void> {
  const { error } = await supabase.from('organizations').delete().eq('id', id)
  if (error) throw error
}
