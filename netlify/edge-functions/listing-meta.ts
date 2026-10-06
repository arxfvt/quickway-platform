// ─────────────────────────────────────────────────────────────────────────────
// Netlify Edge Function — server-side title, description and preview image for
// listing pages (/auctions/:id).
//
// The site is a single-page app, so without this every page is served as the
// same bare "Quickway" HTML. WhatsApp, Facebook and Google read the HTML before
// any JavaScript runs — this function puts the property's name, description and
// photo into that HTML so shared links show a proper preview.
// If anything goes wrong it simply returns the normal page.
// ─────────────────────────────────────────────────────────────────────────────

import type { Config, Context } from 'https://edge.netlify.com'

// Public (anon) credentials — the same ones already shipped in the website's JavaScript.
const SUPABASE_URL = 'https://aptkkshrurkpdjxpqeja.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwdGtrc2hydXJrcGRqeHBxZWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTY2NzAsImV4cCI6MjA5MDAzMjY3MH0.JNNwXRgy1QuVq-uz6ELjT46T77zbmKAP-Eg_CwA9NyQ'
const SITE_URL = 'https://quickwayauctioneersandcourtbailiffs.com'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Collapse whitespace and cut to ~160 characters at a word boundary. */
function clip(text: string, max = 160): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  return cut.slice(0, cut.lastIndexOf(' ') > 80 ? cut.lastIndexOf(' ') : cut.length).replace(/[\s,.;:—-]+$/, '') + '…'
}

function sized(url: string, width: number): string {
  if (!url.includes('/storage/v1/object/public/')) return url
  const r = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
  return `${r}${r.includes('?') ? '&' : '?'}width=${width}&quality=70&resize=contain`
}

export default async (request: Request, context: Context) => {
  const response = await context.next()

  try {
    if (!(response.headers.get('content-type') ?? '').includes('text/html')) return response

    const id = new URL(request.url).pathname.split('/')[2] ?? ''
    if (!UUID.test(id)) return response

    const api =
      `${SUPABASE_URL}/rest/v1/auctions?id=eq.${id}` +
      `&select=title,description,location,image_url,images,auction_ref`
    const res = await fetch(api, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      signal: AbortSignal.timeout(1500),
    })
    if (!res.ok) return response
    const rows = (await res.json()) as Array<{
      title: string
      description: string | null
      location: string | null
      image_url: string | null
      images: string[] | null
      auction_ref: string | null
    }>
    const a = rows[0]
    if (!a?.title) return response

    const title = `${a.title} | Quickway Auctioneers`
    const desc = clip(`${a.location ? a.location + ' — ' : ''}${a.description ?? ''}`)
    const photo = a.images?.[0] || a.image_url || ''
    const pageUrl = `${SITE_URL}/auctions/${id}`

    const tags = [
      `<title>${esc(title)}</title>`,
      `<meta name="description" content="${esc(desc)}" />`,
      `<link rel="canonical" href="${pageUrl}" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:site_name" content="Quickway Auctioneers &amp; Court Bailiffs" />`,
      `<meta property="og:title" content="${esc(title)}" />`,
      `<meta property="og:description" content="${esc(desc)}" />`,
      `<meta property="og:url" content="${pageUrl}" />`,
      photo ? `<meta property="og:image" content="${esc(sized(photo, 1000))}" />` : '',
      `<meta name="twitter:card" content="summary_large_image" />`,
    ].filter(Boolean).join('\n    ')

    let html = await response.text()
    // Drop the site-wide defaults, then insert this listing's tags
    html = html
      .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
      .replace(/<meta\s+(name="description"|property="og:[^"]+"|name="twitter:card")[^>]*>\s*/gi, '')
      .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '')
      .replace('</head>', `    ${tags}\n  </head>`)

    const headers = new Headers(response.headers)
    headers.delete('content-length')
    return new Response(html, { status: response.status, headers })
  } catch {
    return response
  }
}

export const config: Config = {
  path: '/auctions/*',
}
