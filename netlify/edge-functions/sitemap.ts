// Netlify entry point — the logic lives in server/sitemap.ts (shared with Cloudflare).
import type { Config } from 'https://edge.netlify.com'
import { buildSitemap } from '../../server/sitemap.ts'

export default () => buildSitemap()

export const config: Config = {
  path: '/sitemap.xml',
}
