// ─────────────────────────────────────────────────────────────────────────────
// Cloudflare Pages Function — runs the listing-meta logic for /auctions/* so
// shared links and search results show the property, same as on Netlify.
// ─────────────────────────────────────────────────────────────────────────────

import listingMeta from '../../netlify/edge-functions/listing-meta.ts'

export const onRequest = (ctx: { request: Request; next: () => Promise<Response> }) =>
  listingMeta(ctx.request, { next: () => ctx.next() } as never)
