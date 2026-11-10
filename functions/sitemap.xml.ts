// Cloudflare Pages Function for /sitemap.xml — the logic lives in server/sitemap.ts.
import { buildSitemap } from '../server/sitemap.ts'

export const onRequest = () => buildSitemap()
