// ─────────────────────────────────────────────────────────────────────────────
// Netlify Edge Function — /sitemap.xml, built from the database on request.
//
// Lists the main pages plus every listing buyers can see (live, upcoming and
// closed), so Google finds a new property as soon as it is published. Drafts
// and cancelled auctions are left out. Cached for an hour.
// ─────────────────────────────────────────────────────────────────────────────

import type { Config } from 'https://edge.netlify.com'
import { SITE_URL, supabaseGet, esc } from '../shared/supabase.ts'

const STATIC_PAGES: { path: string; priority: string; changefreq: string }[] = [
  { path: '/',         priority: '1.0', changefreq: 'daily' },
  { path: '/auctions', priority: '0.9', changefreq: 'daily' },
  { path: '/contact',  priority: '0.6', changefreq: 'monthly' },
  { path: '/terms',    priority: '0.2', changefreq: 'yearly' },
  { path: '/privacy',  priority: '0.2', changefreq: 'yearly' },
]

export default async () => {
  const listings = await supabaseGet<{ id: string; status: string; created_at: string | null }[]>(
    'auctions?select=id,status,created_at&status=in.(live,scheduled,closed)&order=created_at.desc',
    3000
  )

  const urls = [
    ...STATIC_PAGES.map((p) =>
      `  <url><loc>${SITE_URL}${p.path}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`
    ),
    ...(listings ?? []).map((l) => {
      const lastmod = l.created_at ? `<lastmod>${esc(l.created_at.slice(0, 10))}</lastmod>` : ''
      const open = l.status !== 'closed'
      return `  <url><loc>${SITE_URL}/auctions/${esc(l.id)}</loc>${lastmod}<changefreq>${open ? 'daily' : 'monthly'}</changefreq><priority>${open ? '0.8' : '0.4'}</priority></url>`
    }),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      // A failed database read still returns the main pages, but isn't cached for long
      'cache-control': listings ? 'public, max-age=3600' : 'public, max-age=300',
    },
  })
}

export const config: Config = {
  path: '/sitemap.xml',
}
