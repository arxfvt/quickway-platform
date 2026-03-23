import { supabase } from '../lib/supabase'
import type { KycDocument, KycDocumentType } from '../types/kyc.types'

// ─────────────────────────────────────────────────────────────────────────────
// KYC Service — Supabase queries + Storage uploads
// ─────────────────────────────────────────────────────────────────────────────

/** Get KYC documents for a user. Omit userId to get all (admin). */
export async function getKycDocuments(userId?: string): Promise<KycDocument[]> {
  let query = supabase
    .from('kyc_documents')
    .select('*')
    .order('created_at', { ascending: false })

  if (userId) query = query.eq('user_id', userId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as KycDocument[]
}

/** Get KYC documents by status — for the admin review queue. */
export async function getKycDocumentsByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<KycDocument[]> {
  const { data, error } = await supabase
    .from('kyc_documents')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as KycDocument[]
}

/**
 * Upload a KYC document to Supabase Storage and insert a row in kyc_documents.
 * Storage path: `kyc-documents/{userId}/{timestamp}-{fileName}`
 */
export async function uploadDocument(
  userId: string,
  file: File,
  documentType: KycDocumentType
): Promise<KycDocument> {
  const timestamp = Date.now()
  const storagePath = `${userId}/${timestamp}-${file.name}`

  // 1. Upload file to private storage bucket
  const { error: uploadError } = await supabase.storage
    .from('kyc-documents')
    .upload(storagePath, file, { upsert: false })

  if (uploadError) throw uploadError

  // 2. Insert document row
  const { data, error } = await supabase
    .from('kyc_documents')
    .insert({
      user_id:       userId,
      document_type: documentType,
      file_name:     file.name,
      storage_path:  storagePath,
      status:        'pending',
    })
    .select()
    .single()

  if (error) throw error
  return data as KycDocument
}

/**
 * Get a temporary signed URL for viewing a private KYC document.
 * URL expires in 60 seconds.
 */
export async function getDocumentSignedUrl(storagePath: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from('kyc-documents')
    .createSignedUrl(storagePath, 60)

  return data?.signedUrl ?? null
}

/** Admin: approve or reject a KYC document. */
export async function reviewDocument(
  id: string,
  action: 'approved' | 'rejected',
  rejectionReason?: string
): Promise<void> {
  const { error } = await supabase
    .from('kyc_documents')
    .update({
      status:           action,
      reviewed_at:      new Date().toISOString(),
      rejection_reason: action === 'rejected' ? (rejectionReason ?? null) : null,
    })
    .eq('id', id)

  if (error) throw error
}
