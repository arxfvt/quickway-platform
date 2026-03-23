export type KycDocumentStatus = 'pending' | 'approved' | 'rejected'

export type KycDocumentType =
  | 'national_id'
  | 'passport'
  | 'driving_licence'
  | 'utility_bill'

export interface KycDocument {
  id: string
  user_id: string
  document_type: KycDocumentType
  file_name: string
  storage_path: string
  status: KycDocumentStatus
  reviewer_id: string | null
  rejection_reason: string | null
  reviewed_at: string | null
  created_at: string
}
