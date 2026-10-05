import { Link } from 'react-router-dom'
import { ArrowRight, Bell, CalendarClock, FileText, IndianRupee, MessageCircle, Users } from 'lucide-react'
import { BrandMark } from '../components/BrandMark.tsx'
import { Button } from '../components/Button.tsx'
import { SiteFooter } from '../components/SiteFooter.tsx'
import { asset } from '../lib/paths.ts'

const suite = [
  {
    icon: Users,
    title: 'Enquiry',
    copy: 'Name, phone, wedding date, venue, events, budget, source — off WhatsApp, onto a desk.',
    photo: 'photos/bride.png',
  },
  {
    icon: FileText,
    title: 'Quotation',
    copy: 'PDF letterhead, then Accepted, then Booked. One pipeline for a real wedding.',
    photo: 'photos/mandap.png',
  },
  {
    icon: Bell,
    title: 'Follow-ups',
    copy: 'Quotation sent. Follow up in 2 days. No response. Follow up in 5.',
    photo: 'photos/mehendi.png',
  },
  {
    icon: IndianRupee,
    title: 'Payments',
    copy: 'Advance, before the wedding, on delivery. Outstanding is always visible.',
    photo: 'photos/reception.png',
  },
  {
    icon: CalendarClock,
    title: 'Wedding-day timeline',
    copy: '06:00 getting ready through portraits. The beat sheet the second shooter can follow.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp',
    copy: 'Ask for date and venue. Send the quote. Remind for payment. Remind for the day.',
  },
]

const prices = [
  {
    name: 'Trial',
    price: '₹0',
    note: '14 days. Your own studio account, on the server.',
    items: ['Leads and bookings', 'Quotations', 'Follow-ups', 'Payments', 'Calendar, timeline, Padmavathi (14 days)'],
    featured: false,
  },
  {
    name: 'Studio',
    price: '₹999',
    note: 'The booking desk after the trial.',
    items: ['Unlimited bookings', 'Quotations', 'Couple payments', 'Follow-ups', 'Event checklist'],
    featured: true,
  },
  {
    name: 'Studio Pro',
    price: '₹1,500',
    note: 'The full desk HQ can switch on for a studio.',
    items: ['Everything in Studio', 'Wedding calendar', 'Day-of timeline', 'WhatsApp desk', 'Padmavathi', 'Activity reports'],
    featured: false,
  },
]

const verticals = [
  ['photos/mehendi.png', 'Mehendi'],
  ['photos/bride.png', 'Wedding'],
  ['photos/reception.png', 'Reception'],
  ['photos/engagement.png', 'Engagement'],
]

export function Landing() {
  return (
    <div className="overflow-x-clip bg-ink text-cream">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <BrandMark />
          <nav className="hidden items-center gap-8 text-sm text-mute lg:flex">
            <a href="#product" className="hover:text-cream">
              Product
            </a>
            <a href="#desk" className="hover:text-cream">
              The desk
            </a>
            <a href="#pricing" className="hover:text-cream">
              Pricing
            </a>
          </nav>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link to="/login" className="text-sm text-mute hover:text-cream">
              Log in
            </Link>
            <Link to="/signup">
              <Button className="px-3 text-xs sm:px-5 sm:text-sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-10 pt-16 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-soft">GoldHour studio desk</p>
          <h1 className="mt-5 font-display text-4xl leading-[1.08] text-cream sm:text-6xl">
            Designed for wedding photographers.
            <span className="block text-gold-soft">Built to run the booking.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-mute sm:text-lg">
            Enquiry, quotation, follow-up, advance and the day-of timeline — one desk beside the camera. Built for studios, not for brides.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/signup">
              <Button className="px-6">
                Start 14-day trial <ArrowRight size={16} />
              </Button>
            </Link>
            <Link to="/login">
              <Button tone="ghost" className="px-6">
                Sign in / demo
              </Button>
            </Link>
          </div>
        </div>
        <figure className="relative mt-12 overflow-hidden rounded-[2rem] border border-line">
          <img
            src={asset('photos/hero-couple.png')}
            alt="Indian bride and groom at golden hour"
            className="aspect-[16/10] w-full object-cover sm:aspect-[21/9]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
          <figcaption className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2 sm:bottom-6 sm:left-6">
            {['Enquiry', 'Quotations', 'Follow-ups', 'Payments'].map((chip) => (
              <span key={chip} className="rounded-full border border-gold/35 bg-ink/70 px-3 py-1 text-xs uppercase tracking-wider text-gold-soft backdrop-blur">
                {chip}
              </span>
            ))}
          </figcaption>
        </figure>
      </section>

      <section id="product" className="border-t border-line py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold">The desk</p>
              <h2 className="mt-4 font-display text-4xl sm:text-5xl">One wedding on the board. Then the next.</h2>
              <p className="mt-5 text-lg text-mute">
                A WhatsApp “I need photography for December 20” becomes a lead with a date, a budget, a quotation, an advance, and a next action.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-cream/85">
                <li>Digital delivery of the quotation as a PDF</li>
                <li>Follow-up rhythm that does not live in chat</li>
                <li>Advance, before wedding, on delivery</li>
              </ul>
              <Link to="/signup" className="mt-8 inline-block">
                <Button>
                  Open a studio <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
            <div className="grid gap-3">
              <article className="rounded-3xl border border-line bg-ink-2 p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-mute">New leads</p>
                {[
                  ['Priya Wedding', '₹1,20,000'],
                  ['Rahul Wedding', '₹85,000'],
                  ['Divya Wedding', '₹2,10,000'],
                ].map(([n, p]) => (
                  <div key={n} className="mt-4 flex items-center justify-between gap-3 border-b border-line pb-3 last:border-0">
                    <span className="min-w-0 truncate">{n}</span>
                    <span className="shrink-0 text-lg font-semibold tabular-nums text-gold-soft">{p}</span>
                  </div>
                ))}
              </article>
              <article className="rounded-3xl border border-line bg-ink-2 p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-mute">Follow-ups</p>
                {[
                  ['Rahul', 'Follow up in 2 days'],
                  ['Divya', 'No response · 5 days'],
                  ['Ananya', 'Advance, then book'],
                ].map(([n, p]) => (
                  <div key={n} className="mt-4 flex items-center justify-between gap-3 border-b border-line pb-3 last:border-0">
                    <span>{n}</span>
                    <span className="text-right text-gold-soft">{p}</span>
                  </div>
                ))}
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-ink-2 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold">All on one desk</p>
          <h2 className="mt-4 max-w-2xl font-display text-4xl sm:text-5xl">Everything you need. In the order a wedding actually runs.</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {suite.map((item) => (
              <article key={item.title} className="overflow-hidden rounded-3xl border border-line bg-ink">
                {item.photo ? (
                  <img src={asset(item.photo)} alt="" className="h-44 w-full object-cover sm:h-52" />
                ) : null}
                <div className="p-6">
                  <item.icon className="text-gold" size={22} />
                  <h3 className="mt-4 font-display text-3xl">{item.title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-mute">{item.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-4 sm:px-6">
          {[
            ['14 days', 'Free trial on your own account'],
            ['₹999', 'Studio, billed monthly'],
            ['₹1,500', 'Studio Pro, when you are ready'],
            ['Madurai', 'Built for Tamil Nadu first'],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="font-display text-3xl text-gold-soft sm:text-4xl">{k}</p>
              <p className="mt-2 text-sm text-mute">{v}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="desk" className="border-t border-line py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold">Made for the season</p>
          <h2 className="mt-4 max-w-2xl font-display text-4xl sm:text-5xl">Mehendi to reception. One couple at a time.</h2>
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
            {verticals.map(([src, label]) => (
              <figure key={label} className="relative overflow-hidden rounded-2xl">
                <img src={asset(src)} alt={label} className="aspect-[3/4] w-full object-cover" />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink to-transparent px-3 pb-4 pt-10 text-sm font-semibold uppercase tracking-[0.08em]">
                  {label}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="border-t border-line bg-ink-2 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold">Pricing</p>
          <h2 className="mt-4 font-display text-4xl sm:text-5xl">Fourteen days free. Then the studio pays.</h2>
          <p className="mt-4 max-w-xl text-mute">
            Create an account, run real bookings, pay ₹999 / month when the trial ends. Razorpay checkout is in the desk.
          </p>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {prices.map((p) => (
              <article
                key={p.name}
                className={p.featured ? 'rounded-3xl bg-gold p-8 text-ink' : 'rounded-3xl border border-line bg-ink p-8'}
              >
                <p className="text-xs uppercase tracking-[0.22em] opacity-70">{p.name}</p>
                <p className="mt-3 font-display text-5xl tabular-nums">
                  {p.price}
                  <span className="text-lg opacity-70"> / month</span>
                </p>
                <p className="mt-3 text-sm opacity-80">{p.note}</p>
                <ul className="mt-6 space-y-2 text-sm">
                  {p.items.map((item) => (
                    <li key={item}>— {item}</li>
                  ))}
                </ul>
                <Link to="/signup" className="mt-6 inline-block">
                  <Button tone={p.featured ? 'cream' : 'gold'}>Get started</Button>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="start" className="px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-line">
          <div className="grid lg:grid-cols-2">
            <div className="flex flex-col justify-center bg-ink-2 p-8 sm:p-12">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold">Start today</p>
              <h2 className="mt-4 font-display text-4xl sm:text-5xl">Madurai first. Then the rest of Tamil Nadu.</h2>
              <p className="mt-5 text-mute">
                Open a desk, save a real enquiry, send a quotation. Upgrade when the trial still earns its morning.
              </p>
              <Link to="/signup" className="mt-8 inline-flex">
                <Button>
                  Create a studio account <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
            <img
              src={asset('photos/photographer.png')}
              alt="Wedding photographer at work"
              className="h-64 w-full object-cover lg:h-full"
            />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
