import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_EMAIL = 'Quickway Auctioneers <noreply@quickway.ug>'

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  const { email, fullName } = await req.json()
  if (!email) return new Response('Missing email', { status: 400 })

  const name = fullName ?? email.split('@')[0]

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [email],
      subject: 'Your KYC Verification Has Been Approved',
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:500px;margin:auto;padding:2rem;">
          <h2 style="color:#1d4ed8;">KYC Approved ✓</h2>
          <p>Hi ${name},</p>
          <p>
            Your identity verification (KYC) has been reviewed and <strong>approved</strong>.
            You can now register for auctions and place bids on the Quickway platform.
          </p>
          <a
            href="https://quickway.ug/auctions"
            style="display:inline-block;margin-top:1rem;padding:0.6rem 1.4rem;background:#1d4ed8;color:#fff;border-radius:0.5rem;text-decoration:none;font-weight:600;font-size:0.875rem;"
          >
            Browse Auctions
          </a>
          <p style="margin-top:2rem;font-size:0.8rem;color:#64748b;">
            Quickway Auctioneers & Court Bailiffs<br/>
            Kampala, Uganda · info@quickway.ug
          </p>
        </div>
      `,
    }),
  })

  const data = await res.json()
  return new Response(JSON.stringify(data), {
    status: res.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
  })
})
