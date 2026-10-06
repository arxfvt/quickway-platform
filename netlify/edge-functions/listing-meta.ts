// ─────────────────────────────────────────────────────────────────────────────
// Netlify Edge Function — server-side title, description, preview image and
// structured data for listing pages (/auctions/:id).
//
// The site is a single-page app, so without this every page is served as the
// same bare HTML. WhatsApp, Facebook and Google read the HTML before any
// JavaScript runs — this function puts the property's name, description,
// photo and price into that HTML so shared links and search results show the
// listing properly. If anything goes wrong it simply returns the normal page.
// ─────────────────────────────────────────────────────────────────────────────

import type { Config, Context } from 'https://edge.netlify.com'
import { SITE_URL, supabaseGet, esc, jsonLd } from '../shared/supabase.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Listings in these states are visible to buyers and may be indexed
const PUBLIC_STATUSES = new Set(['live', 'scheduled', 'closed'])

interface AuctionRow {
  title: string
  description: string | null
  location: string | null
  category: string | null
  image_url: string | null
  images: string[] | null
  auction_ref: string | null
  status: string
  currency: string | null
  starts_at: string | null
  ends_at: string | null
  created_at: string | null
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

function money(amount: number, currency: string): string {
  return `${currency} ${Math.round(amount).toLocaleString('en-US')}`
}

export default async (request: Request, context: Context) => {
  const response = await context.next()

  try {
    if (!(response.headers.get('content-type') ?? '').includes('text/html')) return response

    const id = new URL(request.url).pathname.split('/')[2] ?? ''
    if (!UUID.test(id)) return response

    const [rows, lots] = await Promise.all([
      supabaseGet<AuctionRow[]>(
        `auctions?id=eq.${id}&select=title,description,location,category,image_url,images,auction_ref,status,currency,starts_at,ends_at,created_at`
      ),
      supabaseGet<{ reserve_price: number | null }[]>(
        `lots?auction_id=eq.${id}&select=reserve_price&order=lot_number.asc&limit=1`
      ),
    ])
    const a = rows?.[0]
    if (!a?.title) return response

    const isPublic = PUBLIC_STATUSES.has(a.status)
    // The site shows a listing as closed once its end time passes, even before
    // the database status changes — match that here.
    const ended = a.status === 'closed' || (!!a.ends_at && new Date(a.ends_at).getTime() <= Date.now())
    const currency = a.currency || 'UGX'
    const price = lots?.[0]?.reserve_price ?? 0

    const title = `${a.title} | Quickway Auctioneers`
    const facts = [
      a.location,
      ended ? 'Auction closed — ask us about similar properties' : price > 0 ? `Starting from ${money(price, currency)}` : null,
    ].filter(Boolean).join(' · ')
    const desc = clip(`${facts ? facts + '. ' : ''}${a.description ?? ''}`)
    const photo = a.images?.find(Boolean) || a.image_url || ''
    const photoUrl = photo ? sized(photo, 1000) : ''
    const pageUrl = `${SITE_URL}/auctions/${id}`

    // Structured data describes only what the page itself shows
    const listing: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'RealEstateListing',
      name: a.title,
      description: clip(a.description ?? '', 500),
      url: pageUrl,
      ...(photoUrl ? { image: photoUrl } : {}),
      ...(a.created_at ? { datePosted: a.created_at } : {}),
      ...(a.category ? { category: a.category } : {}),
      ...(a.location ? { contentLocation: { '@type': 'Place', name: a.location, address: { '@type': 'PostalAddress', addressCountry: 'UG' } } } : {}),
      provider: { '@type': 'LocalBusiness', name: 'Quickway Auctioneers & Court Bailiffs', url: SITE_URL, telephone: '+256750925959' },
      ...(!ended && price > 0
        ? {
            offers: {
              '@type': 'Offer',
              price,
              priceCurrency: currency,
              availability: 'https://schema.org/InStock',
              ...(a.ends_at ? { validThrough: a.ends_at } : {}),
              url: pageUrl,
            },
          }
        : {}),
    }
    const breadcrumbs = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Properties & Assets', item: `${SITE_URL}/auctions` },
        { '@type': 'ListItem', position: 3, name: a.title, item: pageUrl },
      ],
    }

    const tags = [
      `<title>${esc(title)}</title>`,
      `<meta name="description" content="${esc(desc)}" />`,
      `<link rel="canonical" href="${pageUrl}" />`,
      // Drafts and cancelled listings must not appear in search results
      isPublic ? '' : `<meta name="robots" content="noindex, nofollow" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:site_name" content="Quickway Auctioneers &amp; Court Bailiffs" />`,
      `<meta property="og:title" content="${esc(title)}" />`,
      `<meta property="og:description" content="${esc(desc)}" />`,
      `<meta property="og:url" content="${pageUrl}" />`,
      photoUrl ? `<meta property="og:image" content="${esc(photoUrl)}" />` : '',
      `<meta name="twitter:card" content="summary_large_image" />`,
      isPublic ? jsonLd(listing) : '',
      jsonLd(breadcrumbs),
    ].filter(Boolean).join('\n    ')

    // The listing's own content in the page body, so search engines that read
    // the HTML before running JavaScript see a real page instead of an empty
    // shell. It is the same content the app shows; React replaces it on load.
    const paragraphs = (a.description ?? '')
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p style="margin:0 0 12px;white-space:pre-line">${esc(p)}</p>`)
      .join('')
    const body = isPublic
      ? `<main style="max-width:820px;margin:0 auto;padding:24px 16px;font-family:system-ui,sans-serif;color:#0f172a;line-height:1.6">` +
        `<p style="margin:0 0 8px"><a href="/auctions">Properties &amp; assets</a></p>` +
        `<h1 style="font-size:24px;margin:0 0 8px">${esc(a.title)}</h1>` +
        (facts ? `<p style="margin:0 0 16px;color:#475569">${esc(facts)}</p>` : '') +
        (photoUrl ? `<img src="${esc(photoUrl)}" alt="${esc(a.title)}" width="1000" style="max-width:100%;height:auto;border-radius:12px;margin:0 0 16px" />` : '') +
        paragraphs +
        `<p style="margin:16px 0 0">WhatsApp or call Quickway Auctioneers on 0750 925 959${a.auction_ref ? ` and quote ref ${esc(a.auction_ref)}` : ''}.</p>` +
        `</main>`
      : ''

    let html = await response.text()
    // Drop the site-wide defaults, then insert this listing's tags
    html = html
      .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
      .replace(/<meta\s+(name="description"|property="og:[^"]+"|name="twitter:card")[^>]*>\s*/gi, '')
      .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '')
      .replace('</head>', `    ${tags}\n  </head>`)
      .replace('<div id="root"></div>', `<div id="root">${body}</div>`)

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
