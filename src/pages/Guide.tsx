import { Link } from 'react-router-dom'
import { ArrowRight, Download, Printer } from 'lucide-react'
import { BrandMark } from '../components/BrandMark.tsx'
import { Button } from '../components/Button.tsx'
import { asset } from '../lib/paths.ts'

const steps = [
  {
    n: '01',
    title: 'Open GoldHour',
    body: 'On your phone or laptop go to goldhour-chi.vercel.app. Use Chrome. Keep only one GoldHour tab open — the desk locks the others so two people do not overwrite the same booking.',
  },
  {
    n: '02',
    title: 'Try the demo, or create your studio',
    body: 'Demo: Log in → PIN 2026. That is Meenakshi Frames with sample couples. Your studio: Get started. Fastest path is Continue with Google (then studio name, your name, city). Or enter studio name, mobile OTP, email and password (8+ characters). You get 14 days free.',
  },
  {
    n: '03',
    title: 'Save the enquiry the same hour it arrives',
    body: 'Desk → Leads → new. Couple name, phone, wedding date, venue, city, budget, source (WhatsApp, Instagram, referral…). Status starts as New. This takes the couple off chat and onto the desk.',
  },
  {
    n: '04',
    title: 'Send a quotation',
    body: 'Open the lead → quotation. Package amount splits into Advance, Before wedding, On delivery. Download the PDF letterhead. Tap WhatsApp — GoldHour writes the message; you send it from your own phone. Mark the lead Quoted.',
  },
  {
    n: '05',
    title: 'Follow up without hunting in chat',
    body: 'Set Next action and a date (2 days, then 5 if silent). Follow-ups shows who is due. The bell reminds you. WhatsApp drafts are ready for “just checking in”.',
  },
  {
    n: '06',
    title: 'Collect the advance, then Book',
    body: 'When UPI lands, record it on the lead as Advance. Status → Accepted, then Booked. Outstanding stays visible until Before wedding and Final delivery are in. Do not leave advances as screenshots in WhatsApp.',
  },
  {
    n: '07',
    title: 'Wedding week',
    body: 'Open the booked lead. Tick events (engagement, mehendi, wedding, reception). Fill the day timeline so a second shooter can follow it. Bookings lists every date you have already taken.',
  },
]

export function Guide() {
  return (
    <div className="min-h-screen bg-ink text-cream">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-ink/90 px-4 py-3 backdrop-blur sm:px-6 print:hidden">
        <Link to="/">
          <BrandMark />
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <a href={asset('GoldHour-Studio-Guide.pdf')} download>
            <Button tone="ghost" className="px-3 text-xs sm:text-sm">
              <Download size={14} /> PDF
            </Button>
          </a>
          <Button tone="ghost" className="px-3 text-xs sm:text-sm" onClick={() => window.print()}>
            <Printer size={14} /> Print
          </Button>
          <Link to="/signup">
            <Button className="px-3 text-xs sm:px-5 sm:text-sm">
              Start trial <ArrowRight size={14} />
            </Button>
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 print:max-w-none print:px-0 print:py-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-soft">Studio tutorial</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl">GoldHour in one wedding</h1>
        <p className="mt-4 max-w-xl text-mute">
          For wedding photographers. Not for brides. Save the enquiry, send the quote, collect the advance — then shoot.
        </p>
        <p className="mt-2 text-sm text-gold-soft">goldhour-chi.vercel.app · 14-day trial · then ₹999 / ₹1,500 a month</p>

        <ol className="mt-12 space-y-8">
          {steps.map((step) => (
            <li key={step.n} className="grid gap-2 border-t border-line pt-6 sm:grid-cols-[4.5rem_1fr] sm:gap-6">
              <p className="font-display text-2xl text-gold-soft">{step.n}</p>
              <div>
                <h2 className="font-display text-2xl">{step.title}</h2>
                <p className="mt-2 text-mute">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <section className="mt-12 rounded-3xl border border-line bg-ink-2 p-6 sm:p-8">
          <h2 className="font-display text-2xl">Plans</h2>
          <ul className="mt-4 space-y-3 text-sm text-mute">
            <li>
              <span className="text-cream">Trial · 14 days · ₹0.</span> Full desk so you can run a real booking.
            </li>
            <li>
              <span className="text-cream">Studio · ₹999 / month.</span> Unlimited leads, PDF quotes, follow-ups, couple payments, event checklist.
            </li>
            <li>
              <span className="text-cream">Studio Pro · ₹1,500 / month.</span> Calendar (date clashes), pipeline, Pulse, WhatsApp desk drafts, Padmavathi chatbot, morning briefing.
            </li>
          </ul>
          <p className="mt-4 text-sm text-mute">
            Pay from Plan in the desk (UPI / GPay). The desk opens as soon as Razorpay completes — no waiting for HQ. If a month ends, leads stay saved; renew from the same screen.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-sm text-mute">
          <h2 className="font-display text-2xl text-cream">If something is stuck</h2>
          <p>Forgot password: goldhour-chi.vercel.app/forgot</p>
          <p>HQ: ajithkutten1998@gmail.com — send your studio name and the mobile you used to sign up.</p>
          <p>Do not share your password. GoldHour never asks for OTP on a call from HQ.</p>
        </section>
      </article>
    </div>
  )
}
