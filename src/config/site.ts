// ─────────────────────────────────────────────────────────────────────────────
// Site-wide business details — edit here and every page updates.
// ─────────────────────────────────────────────────────────────────────────────

export const SITE = {
  name: 'Quickway Auctioneers & Court Bailiffs',
  shortName: 'Quickway',
  url: 'https://quickwayauctioneersandcourtbailiffs.com',
  tagline: 'Property, land, vehicles & machinery — court and bank auctions in Uganda',
  defaultDescription:
    'Buy land, houses, commercial buildings, vehicles and machinery from court-ordered and bank auctions in Uganda. Verified listings by Quickway Auctioneers & Court Bailiffs, Kampala. WhatsApp 0750 925 959.',

  // Contact — international format without "+" for wa.me, display format for people
  phoneE164: '+256750925959',
  phoneDisplay: '0750 925 959',
  whatsappNumber: '256750925959',
  email: 'info@quickway.ug',

  office: {
    building: 'London Chambers',
    street: 'Johnstone Street',
    room: 'Room 107',
    city: 'Kampala',
    country: 'Uganda',
  },

  hours: [
    { days: 'Monday – Friday', time: '8:00 AM – 5:00 PM' },
    { days: 'Saturday', time: '9:00 AM – 1:00 PM' },
    { days: 'Sunday', time: 'Closed' },
  ],
} as const

export const OFFICE_ADDRESS = `${SITE.office.building}, ${SITE.office.room}, ${SITE.office.street}, ${SITE.office.city}`

export const OFFICE_MAP_URL =
  'https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent(`${SITE.office.building}, ${SITE.office.street}, ${SITE.office.city}, ${SITE.office.country}`)

/** Build a wa.me link with an optional pre-filled message. */
export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${SITE.whatsappNumber}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

export const telLink = `tel:${SITE.phoneE164}`

/** Pre-filled WhatsApp messages */
export const waMessages = {
  general: 'Hello Quickway, I found you on your website and I would like to ask about your auctions.',
  property: (title: string, ref?: string) =>
    `Hello Quickway, I'm interested in "${title}"${ref ? ` (${ref})` : ''}. Please share more details.`,
  siteVisit: (title: string, ref?: string) =>
    `Hello Quickway, I would like to book a site visit for "${title}"${ref ? ` (${ref})` : ''}. When can I view it?`,
}
