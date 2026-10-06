import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { SITE, OFFICE_ADDRESS } from '../../../config/site'
import { usePageMeta } from '../../../hooks/usePageMeta'

// ─────────────────────────────────────────────────────────────────────────────
// Terms of Service & Privacy Policy
// Plain-language starting text — have Quickway's advocate review before relying on it.
// ─────────────────────────────────────────────────────────────────────────────

const LAST_UPDATED = '6 October 2026'

type Section = { heading: string; body: (string | string[])[] }

function LegalLayout({ title, intro, sections }: { title: string; intro: string; sections: Section[] }) {
  return (
    <div className="px-4 py-6 sm:p-6 max-w-3xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand mb-5 transition-colors">
        <ArrowLeft size={13} /> Back to Home
      </Link>
      <article className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="text-xs text-slate-400 mt-1 mb-5">Last updated: {LAST_UPDATED}</p>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">{intro}</p>
        {sections.map((s) => (
          <section key={s.heading} className="mb-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-2">{s.heading}</h2>
            {s.body.map((b, i) =>
              Array.isArray(b) ? (
                <ul key={i} className="list-disc pl-5 space-y-1 text-sm text-slate-600 leading-relaxed mb-2">
                  {b.map((li) => <li key={li}>{li}</li>)}
                </ul>
              ) : (
                <p key={i} className="text-sm text-slate-600 leading-relaxed mb-2">{b}</p>
              )
            )}
          </section>
        ))}
        <section className="border-t border-slate-100 pt-5 text-sm text-slate-600">
          <p className="font-semibold text-slate-900 mb-1">Contact</p>
          <p>{SITE.name}</p>
          <p>{OFFICE_ADDRESS}</p>
          <p>Phone / WhatsApp: {SITE.phoneDisplay} · Email: {SITE.email}</p>
        </section>
      </article>
    </div>
  )
}

export function TermsPage() {
  usePageMeta({ title: 'Terms of Service', description: 'Terms for using the Quickway Auctioneers website to view listings and submit offers.' })
  return (
    <LegalLayout
      title="Terms of Service"
      intro={`These terms apply when you use ${SITE.url.replace('https://', '')} ("the website") operated by ${SITE.name} ("Quickway", "we", "us"). By creating an account or submitting an offer you agree to them.`}
      sections={[
        {
          heading: '1. What the website does',
          body: [
            'The website lists property, land, vehicles, machinery and other assets offered for sale by Quickway, including court-ordered, bank and private sales. You can view listings without an account and contact us by WhatsApp, phone or email.',
          ],
        },
        {
          heading: '2. Accounts and identity verification',
          body: [
            'To submit an offer you must create an account and complete identity verification (KYC). You must give true and complete information and keep your login details private. We may refuse, suspend or close an account that gives false information or misuses the website.',
          ],
        },
        {
          heading: '3. Listings',
          body: [
            'We describe each asset as accurately as we can from the information available to us, but photos, sizes and descriptions are a guide only. Exact plot or registration details are shared with serious buyers directly, not on the website.',
            'Assets are sold as they are, where they are. You should inspect the asset and carry out your own checks (including a land search where relevant) before making an offer.',
          ],
        },
        {
          heading: '4. Offers',
          body: [
            'Offers are sealed: other bidders cannot see them while the auction is open. An offer submitted through the website is a genuine offer to buy at that price on the terms of the specific sale. Quickway will contact the successful bidder to complete the sale, including deposit, payment and transfer arrangements.',
            'Where an entry or participation fee applies, it is shown on the listing before you pay. Unless the listing says otherwise, participation fees are not refundable.',
          ],
        },
        {
          heading: '5. Changes, withdrawal and closing',
          body: [
            'A sale may be postponed, withdrawn or changed, for example on instruction of a court, bank or owner. Closing dates are shown on each listing.',
          ],
        },
        {
          heading: '6. Liability',
          body: [
            'To the extent the law allows, Quickway is not liable for losses arising from reliance on listing information without your own inspection and checks, or from the website being temporarily unavailable.',
          ],
        },
        {
          heading: '7. Law',
          body: ['These terms are governed by the laws of the Republic of Uganda.'],
        },
      ]}
    />
  )
}

export function PrivacyPage() {
  usePageMeta({ title: 'Privacy Policy', description: 'How Quickway Auctioneers collects, uses and protects your personal data.' })
  return (
    <LegalLayout
      title="Privacy Policy"
      intro={`This policy explains what personal data ${SITE.name} collects through the website, why, and your rights under Uganda's Data Protection and Privacy Act, 2019.`}
      sections={[
        {
          heading: 'What we collect',
          body: [[
            'Account details: email address and password (stored securely by our hosting provider).',
            'Profile details you add: name, phone number and address.',
            'Identity verification (KYC) documents you upload to qualify as a bidder.',
            'Offers you submit and payment references for participation fees.',
            'Messages you send us by WhatsApp, phone or email.',
            'Basic website usage data, including through Google advertising tags, to measure how people find our listings.',
          ]],
        },
        {
          heading: 'Why we use it',
          body: [[
            'To verify bidders and run fair, lawful auctions.',
            'To respond to your enquiries and arrange site visits.',
            'To contact successful bidders and complete sales.',
            'To meet legal obligations, including those of court bailiffs and auctioneers.',
            'To understand and improve our advertising and website.',
          ]],
        },
        {
          heading: 'Who we share it with',
          body: [
            'We do not sell your data. We share it only where needed: with the court, bank or owner instructing a sale, with our hosting and technology providers, and with authorities where the law requires.',
          ],
        },
        {
          heading: 'How long we keep it',
          body: ['We keep personal data only as long as needed for the purposes above and for any period the law requires.'],
        },
        {
          heading: 'Your rights',
          body: [
            'You can ask to see the personal data we hold about you, ask us to correct it, or ask us to delete it where we are not required to keep it. Contact us using the details below.',
          ],
        },
      ]}
    />
  )
}
