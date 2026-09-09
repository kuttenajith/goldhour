import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { StatusPill } from '../components/StatusPill.tsx'
import { Button } from '../components/Button.tsx'
import { paidOf } from '../lib/booking.ts'
import { day, money, paid, todayIso } from '../lib/format.ts'
import { useStudio } from '../lib/store.ts'
import { asset } from '../lib/paths.ts'

export function Dashboard() {
  const { studio, leads } = useStudio()
  const today = todayIso()
  const booked = leads.filter((l) => l.status === 'booked')
  const enquiries = leads.filter((l) => l.status === 'new')
  const followToday = leads.filter(
    (l) => l.nextActionOn <= today && l.status !== 'completed' && l.status !== 'lost' && l.status !== 'booked',
  )
  const collected = leads.reduce((s, l) => s + paid(l), 0)
  const outstanding = leads
    .filter((l) => l.status === 'booked' || l.status === 'accepted')
    .reduce((s, l) => s + Math.max(0, l.packageAmount - paid(l)), 0)
  const priya = leads.find((l) => l.coupleName.startsWith('Priya'))

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-gold-soft">{studio.name}</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">Run one wedding.</h1>
          <p className="mt-2 text-mute">
            {enquiries.length} new · {booked.length} booked · {studio.city}
          </p>
        </div>
        {priya ? (
          <Link to={`/studio/leads/${priya.id}`}>
            <Button>Open Priya’s booking</Button>
          </Link>
        ) : (
          <Link to="/studio/leads" className="inline-flex items-center gap-2 text-sm text-gold-soft">
            All leads <ArrowUpRight size={16} />
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ['New enquiries', String(enquiries.length)],
          ['Collected', money(collected)],
          ['Outstanding on bookings', money(outstanding)],
        ].map(([k, v]) => (
          <article key={k} className="rounded-3xl border border-line bg-ink-2 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-mute">{k}</p>
            <p className="mt-3 font-display text-3xl text-gold-soft sm:text-4xl">{v}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-line bg-ink-2 p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-mute">New enquiries</p>
          <ul className="mt-4 divide-y divide-line">
            {enquiries.length === 0 ? (
              <li className="py-4 text-mute">No fresh WhatsApp leads. Save one from Leads.</li>
            ) : (
              enquiries.map((l) => (
                <li key={l.id}>
                  <Link
                    to={`/studio/leads/${l.id}`}
                    className="flex items-center justify-between gap-4 py-4 hover:text-gold-soft"
                  >
                    <span>
                      <span className="block">{l.coupleName}</span>
                      <span className="text-xs text-mute">{day(l.eventDate)} · {l.venue || l.city || 'Venue pending'}</span>
                    </span>
                    <span className="text-gold-soft">{money(l.budget || l.packageAmount)}</span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </article>

        <article className="overflow-hidden rounded-3xl border border-line bg-ink-2">
          <img src={asset('photos/bride.png')} alt="" className="h-36 w-full object-cover sm:h-40" />
          <div className="p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-mute">Follow-ups</p>
            <ul className="mt-4 space-y-3">
              {followToday.slice(0, 5).map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link to={`/studio/leads/${l.id}`} className="hover:text-gold-soft">
                    {l.coupleName.split(' ')[0]}
                  </Link>
                  <span className="text-right text-gold-soft">{l.nextAction}</span>
                </li>
              ))}
              {followToday.length === 0 ? <li className="text-mute">Nothing waiting today.</li> : null}
            </ul>
          </div>
        </article>
      </div>

      <article className="rounded-3xl border border-line bg-ink-2 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.22em] text-mute">Booked weddings</p>
          <Link to="/studio/bookings" className="text-sm text-gold-soft">
            All bookings
          </Link>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {booked.map((l) => (
            <Link
              key={l.id}
              to={`/studio/leads/${l.id}`}
              className="rounded-2xl border border-line bg-ink p-4 transition hover:border-gold/50"
            >
              <p className="font-display text-2xl">{l.coupleName}</p>
              <p className="mt-1 text-sm text-mute">
                {day(l.eventDate)} · {l.venue || l.city}
              </p>
              <p className="mt-2 text-sm text-gold-soft">
                {money(l.packageAmount)} · Advance {money(paidOf(l, 'advance'))}
                {paidOf(l, 'advance') >= l.plan.advance && l.plan.advance > 0 ? ' ✓' : ''}
              </p>
              <div className="mt-3">
                <StatusPill status={l.status} />
              </div>
            </Link>
          ))}
          {booked.length === 0 ? <p className="text-mute">Accept a quote, take the advance, confirm the booking.</p> : null}
        </div>
      </article>
    </div>
  )
}
