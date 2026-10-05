import { Link } from 'react-router-dom'
import { ArrowUpRight, Plus } from 'lucide-react'
import { StatusPill } from '../components/StatusPill.tsx'
import { Button } from '../components/Button.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { paidOf } from '../lib/booking.ts'
import { dayPlan } from '../lib/dayPlan.ts'
import { firstName } from '../lib/copilot.ts'
import { day, money, paid, timeOfDayGreeting, todayIso } from '../lib/format.ts'
import { useStudio } from '../lib/store.ts'
import { clsx } from '../lib/clsx.ts'

export function Dashboard() {
  const snap = useStudio()
  const { studio, leads } = snap
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
  const plan = dayPlan(leads)

  return (
    <div className="page-rise space-y-6">
      <PageHeader
        kicker={studio.name}
        title={`Hi ${firstName(snap)}! ${timeOfDayGreeting()}`}
        hint={`${enquiries.length} new · ${booked.length} booked · ${studio.city}`}
        actions={
          priya ? (
            <Link to={`/studio/leads/${priya.id}`}>
              <Button>Open Priya’s booking</Button>
            </Link>
          ) : (
            <Link to="/studio/leads">
              <Button>
                <Plus size={16} /> Leads
              </Button>
            </Link>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['New leads', String(enquiries.length)],
          ['Collected', money(collected)],
          ['Outstanding', money(outstanding)],
        ].map(([k, v]) => (
          <article key={k} className="rounded-2xl border border-line bg-ink-2 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-mute">{k}</p>
            <p className="mt-2 font-display text-2xl tabular-nums text-gold-soft sm:text-3xl">{v}</p>
          </article>
        ))}
      </div>

      <article className="rounded-2xl border border-line bg-ink-2 p-4 sm:p-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-mute">Next actions</p>
        <ul className="mt-3 space-y-2">
          {plan.map((item) => (
            <li key={item.label}>
              <Link
                to={item.href}
                className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-ink px-4 py-3 hover:border-gold/40"
              >
                <span className={clsx(item.tone === 'red' && 'text-orange-200', item.tone === 'amber' && 'text-amber-200', item.tone === 'gold' && 'text-gold-soft', item.tone === 'mute' && 'text-mute')}>
                  {item.label}
                </span>
                <ArrowUpRight size={16} className="text-gold-soft" />
              </Link>
            </li>
          ))}
        </ul>
      </article>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-line bg-ink-2 p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-mute">New leads</p>
          <ul className="mt-3 divide-y divide-line">
            {enquiries.length === 0 ? (
              <li className="py-3 text-sm text-mute">No new leads. Add one from Leads.</li>
            ) : (
              enquiries.map((l) => (
                <li key={l.id}>
                  <Link
                    to={`/studio/leads/${l.id}`}
                    className="flex items-center justify-between gap-4 py-3 hover:text-gold-soft"
                  >
                    <span>
                      <span className="block font-medium">{l.coupleName}</span>
                      <span className="text-xs text-mute">{day(l.eventDate)} · {l.venue || l.city || 'Venue pending'}</span>
                    </span>
                    <span className="text-sm tabular-nums text-gold-soft">{money(l.budget || l.packageAmount)}</span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </article>

        <article className="rounded-2xl border border-line bg-ink-2 p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-mute">Follow-ups due</p>
          <ul className="mt-3 space-y-2">
            {followToday.slice(0, 6).map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-3 text-sm">
                <Link to={`/studio/leads/${l.id}`} className="min-w-0 truncate font-medium hover:text-gold-soft">
                  {l.coupleName}
                </Link>
                <span className="max-w-[58%] text-right text-gold-soft">{l.nextAction}</span>
              </li>
            ))}
            {followToday.length === 0 ? <li className="text-sm text-mute">Nothing waiting today.</li> : null}
          </ul>
        </article>
      </div>

      <article className="rounded-2xl border border-line bg-ink-2 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-mute">Booked</p>
          <Link to="/studio/bookings" className="text-sm text-gold-soft">
            All bookings
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {booked.map((l) => (
            <Link
              key={l.id}
              to={`/studio/leads/${l.id}`}
              className="rounded-xl border border-line bg-ink p-4 transition hover:border-gold/40"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{l.coupleName}</p>
                <StatusPill status={l.status} />
              </div>
              <p className="mt-1 text-sm text-mute">
                {day(l.eventDate)} · {l.venue || l.city}
              </p>
              <p className="mt-2 text-sm tabular-nums text-gold-soft">
                {money(l.packageAmount)} · Advance {money(paidOf(l, 'advance'))}
                {paidOf(l, 'advance') >= l.plan.advance && l.plan.advance > 0 ? ' ✓' : ''}
              </p>
            </Link>
          ))}
          {booked.length === 0 ? <p className="text-sm text-mute">Accept a quote, take the advance, confirm the booking.</p> : null}
        </div>
      </article>
    </div>
  )
}
