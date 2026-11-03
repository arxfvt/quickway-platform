// ─────────────────────────────────────────────────────────────────────────────
// Cloudflare Pages Function — /sitemap.xml, built by the same code as on Netlify.
// ─────────────────────────────────────────────────────────────────────────────

import sitemap from '../netlify/edge-functions/sitemap.ts'

export const onRequest = () => sitemap()
