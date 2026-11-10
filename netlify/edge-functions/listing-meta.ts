// Netlify entry point — the logic lives in server/listingMeta.ts (shared with Cloudflare).
import type { Config, Context } from 'https://edge.netlify.com'
import { renderListingPage } from '../../server/listingMeta.ts'

export default async (request: Request, context: Context) => renderListingPage(request, await context.next())

export const config: Config = {
  path: '/auctions/*',
}
