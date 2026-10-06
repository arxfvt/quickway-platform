// ─────────────────────────────────────────────────────────────────────────────
// Shared by the Netlify edge functions (listing-meta, sitemap).
// Public (anon) credentials — the same ones already shipped in the website's
// JavaScript and netlify.toml. Row-level security decides what they can read.
// ─────────────────────────────────────────────────────────────────────────────

export const SUPABASE_URL = 'https://aptkkshrurkpdjxpqeja.supabase.co'
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwdGtrc2hydXJrcGRqeHBxZWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTY2NzAsImV4cCI6MjA5MDAzMjY3MH0.JNNwXRgy1QuVq-uz6ELjT46T77zbmKAP-Eg_CwA9NyQ'
export const SITE_URL = 'https://quickwayauctioneersandcourtbailiffs.com'

/** GET a Supabase REST path (e.g. "auctions?select=id"). Returns null on any failure. */
export async function supabaseGet<T>(path: string, timeoutMs = 1500): Promise<T | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

/** Escape text for an HTML attribute or element body. */
export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** JSON for a <script type="application/ld+json"> block — "<" escaped so listing text can't close the tag. */
export function jsonLd(data: unknown): string {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`
}
