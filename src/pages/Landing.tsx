import { Link } from 'react-router-dom'
import { ArrowRight, Bell, CalendarClock, FileText, IndianRupee, MessageCircle, Users } from 'lucide-react'
import { BrandMark } from '../components/BrandMark.tsx'
import { Button } from '../components/Button.tsx'
import { SiteFooter } from '../components/SiteFooter.tsx'
import { asset } from '../lib/paths.ts'

const features = [
  {
    icon: Users,
    title: 'Enquiry',
    copy: 'Name, phone, wedding date, venue, events, budget, source — off WhatsApp, onto a desk.',
  },
  {
    icon: FileText,
    title: 'Quotation → booked',
    copy: 'PDF letterhead, then Accepted, then Booked. One pipeline for a real wedding.',
  },
  {
    icon: Bell,
    title: 'Follow-ups',
    copy: 'Quotation sent. Follow up in 2 days. No response. Follow up in 5.',
  },
  {
    icon: IndianRupee,
    title: 'Payments',
    copy: 'Advance, before the wedding, on delivery. Outstanding is always visible.',
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
    name: 'Pilot',
    price: '₹0',
    note: 'First 5 studios. Real bookings. This season only.',
    items: ['One complete wedding workflow', 'Quotations + WhatsApp', 'Follow-ups', 'Payment stages', 'Day-of timeline'],
  },
  {
    name: 'Studio',
    price: '₹799',
    note: 'When someone asks to keep using it.',
    items: ['Unlimited bookings', 'Quotations', 'Payments', 'Follow-ups', 'WhatsApp templates'],
    featured: true,
  },
  {
    name: 'Studio Pro',
    price: '₹1,499',
    note: 'Only after a studio needs a second login.',
    items: ['Multiple seats', 'Team desk', 'Reports later', 'Not built yet — on purpose'],
  },
]

export function Landing() {
  return (
    <div className="bg-ink text-cream">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <BrandMark />
          <nav className="hidden items-center gap-8 text-sm text-mute md:flex">
            <a href="#product" className="hover:text-cream">
              Product
            </a>
            <a href="#pricing" className="hover:text-cream">
              Pricing
            </a>
            <a href="#start" className="hover:text-cream">
              For studios
            </a>
            <Link to="/login">
              <Button>Open studio desk</Button>
            </Link>
          </nav>
          <Link to="/login" className="md:hidden">
            <Button>Open desk</Button>
          </Link>
        </div>
      </header>

      <section className="relative min-h-[92vh] overflow-hidden grain">
        <img
          src={asset('photos/hero-couple.png')}
          alt="Indian bride and groom at golden hour"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/75 to-ink/20" />
        <div className="relative mx-auto flex min-h-[92vh] max-w-6xl flex-col justify-end px-4 pb-20 pt-28 sm:px-6">
          <p className="text-xs uppercase tracking-[0.35em] text-gold-soft">
            Built for the people who make money from weddings
          </p>
          <h1 className="mt-5 max-w-3xl font-display text-5xl leading-[0.95] text-cream sm:text-7xl">
            The studio desk for wedding photographers.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-cream/80">
            One wedding on the desk: enquiry → quotation → follow-up → booked → payments → the
            day-of timeline. Built for studios, not for brides.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/login">
              <Button className="px-6 py-3">
                Try the Madurai demo <ArrowRight size={16} />
              </Button>
            </Link>
            <a href="#product">
              <Button tone="ghost" className="px-6 py-3">
                See the desk
              </Button>
            </a>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 px-2 py-2 md:grid-cols-4">
        {[
          ['photos/bride.png', 'Kanjeevaram portrait'],
          ['photos/mehendi.png', 'Mehendi detail'],
          ['photos/mandap.png', 'Mandap dusk'],
          ['photos/reception.png', 'Reception lights'],
        ].map(([src, alt]) => (
          <figure key={src} className="relative overflow-hidden rounded-2xl">
            <img src={asset(src)} alt={alt} className="aspect-[4/5] w-full object-cover md:aspect-[4/3]" />
            <figcaption className="absolute bottom-3 left-3 text-[11px] uppercase tracking-[0.2em] text-cream/80">
              {alt}
            </figcaption>
          </figure>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gold">The leak</p>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl">
              WhatsApp, Excel, a notebook, and a forgotten December date.
            </h2>
            <p className="mt-6 text-lg text-mute">
              India hosts millions of weddings a year. Most studios still run the business in chat.
              GoldHour is the desk that sits beside the camera — for photographers, cinematographers,
              décor, makeup, planners and every vendor who gets paid for the day.
            </p>
          </div>
          <div className="gold-ring rounded-3xl bg-ink-2 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-gold-soft">How it arrives</p>
            <p className="mt-4 font-display text-3xl text-cream">
              “Hi, I need wedding photography for December 20.”
            </p>
            <p className="mt-4 text-mute">
              Instead of pinning it in WhatsApp and forgetting it, it becomes a lead with a date, a
              budget, a quotation, an advance, and a next action.
            </p>
          </div>
        </div>
      </section>

      <section id="product" className="border-y border-line bg-ink-2 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">This season</p>
          <h2 className="mt-4 font-display text-4xl sm:text-5xl">Enough to run one real wedding.</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <article key={f.title} className="rounded-3xl border border-line bg-ink p-6">
                <f.icon className="text-gold" size={22} />
                <h3 className="mt-4 font-display text-3xl">{f.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-mute">{f.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-24">
        <img
          src={asset('photos/engagement.png')}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-ink/80" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-xs uppercase tracking-[0.3em] text-gold-soft">The desk</p>
          <h2 className="mt-4 max-w-2xl font-display text-4xl sm:text-5xl">
            Priya’s wedding, Rahul’s quotation, Divya’s advance — on one board.
          </h2>
          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-line bg-ink/80 p-6 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-mute">New leads</p>
              {[
                ['Priya Wedding', '₹1,20,000'],
                ['Rahul Wedding', '₹85,000'],
                ['Divya Wedding', '₹2,10,000'],
              ].map(([n, p]) => (
                <div key={n} className="mt-4 flex items-center justify-between border-b border-line pb-3">
                  <span>{n}</span>
                  <span className="text-gold-soft">{p}</span>
                </div>
              ))}
            </div>
            <div className="rounded-3xl border border-line bg-ink/80 p-6 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-mute">Follow-ups</p>
              {[
                ['Rahul', 'Follow up in 2 days'],
                ['Divya', 'No response · 5 days'],
                ['Ananya', 'Advance, then book'],
              ].map(([n, p]) => (
                <div key={n} className="mt-4 flex items-center justify-between border-b border-line pb-3">
                  <span>{n}</span>
                  <span className="text-gold-soft">{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <p className="text-xs uppercase tracking-[0.3em] text-gold">Who pays — later</p>
        <h2 className="mt-4 font-display text-4xl sm:text-5xl">The vendor. After five studios have used it.</h2>
        <p className="mt-4 max-w-xl text-mute">
          Prices below are a starting point, not a pitch. First get five photographers running real
          bookings for free. Then ask what they would miss if GoldHour disappeared.
        </p>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {prices.map((p) => (
            <article
              key={p.name}
              className={
                p.featured
                  ? 'rounded-3xl bg-gold p-8 text-ink'
                  : 'rounded-3xl border border-line bg-ink-2 p-8'
              }
            >
              <p className="text-xs uppercase tracking-[0.22em] opacity-70">{p.name}</p>
              <p className="mt-3 font-display text-5xl">
                {p.price}
                <span className="text-lg opacity-70"> / month</span>
              </p>
              <p className="mt-3 text-sm opacity-80">{p.note}</p>
              <ul className="mt-6 space-y-2 text-sm">
                {p.items.map((item) => (
                  <li key={item}>— {item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section id="start" className="border-t border-line bg-ink-2 py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gold">Start locally</p>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl">
              Madurai first. Then the rest of Tamil Nadu.
            </h2>
            <p className="mt-5 text-mute">
              Search Instagram for wedding photographers in Madurai, Chennai, Coimbatore. Offer five
              studios a free season. Watch how they work. GoldHour is the product you put in their
              hands.
            </p>
            <Link to="/login" className="mt-8 inline-block">
              <Button>
                Open the demo studio <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
          <figure className="overflow-hidden rounded-3xl gold-ring">
            <img
              src={asset('photos/photographer.png')}
              alt="Wedding photographer at work"
              className="h-full w-full object-cover"
            />
          </figure>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
