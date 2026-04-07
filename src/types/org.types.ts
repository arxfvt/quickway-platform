export interface Organization {
  id: string
  name: string
  slug: string
  description: string | null
  contact_email: string | null
  contact_phone: string | null
  location: string | null
  settings: OrgSettings
  status: 'active' | 'suspended'
  created_at: string
}

export interface OrgSettings {
  logo_url?: string
  primary_color?: string
}
