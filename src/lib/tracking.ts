// ─────────────────────────────────────────────────────────────────────────────
// Lead tracking for Google Ads.
//
// Every WhatsApp / call / site-visit click fires a gtag event. To count these
// as Google Ads conversions, create a "Contact" conversion action in Google Ads
// and put its label in Netlify as VITE_GADS_LEAD_LABEL (e.g. "AbC-D_efG-h12_34-567").
// ─────────────────────────────────────────────────────────────────────────────

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

const ADS_ID = 'AW-18050852951'
const LEAD_LABEL = import.meta.env.VITE_GADS_LEAD_LABEL as string | undefined

export type LeadChannel = 'whatsapp' | 'call' | 'site_visit' | 'email'

export function trackLead(channel: LeadChannel, details: { listing?: string; ref?: string; placement?: string } = {}) {
  try {
    const gtag = window.gtag
    if (typeof gtag !== 'function') return
    gtag('event', 'generate_lead', {
      method: channel,
      listing: details.listing,
      listing_ref: details.ref,
      placement: details.placement,
    })
    if (LEAD_LABEL) {
      gtag('event', 'conversion', { send_to: `${ADS_ID}/${LEAD_LABEL}` })
    }
  } catch {
    // tracking must never break the page
  }
}
