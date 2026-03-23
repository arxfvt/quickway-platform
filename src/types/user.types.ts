export type UserRole = 'admin' | 'org_admin' | 'bidder'

export type KycStatus = 'pending' | 'approved' | 'rejected'

export interface User {
  id: string
  email: string
  role: UserRole
  kyc_status: KycStatus
  org_id: string | null
  full_name: string | null
  phone: string | null
  address: string | null
  created_at: string
}
