// Cloudflare Pages Function for /auctions/* — the logic lives in server/listingMeta.ts.
// context.next() returns the app's index.html; the listing's details are added to it.
import { renderListingPage } from '../../server/listingMeta.ts'

export const onRequest = async (context: { request: Request; next: () => Promise<Response> }) =>
  renderListingPage(context.request, await context.next())
