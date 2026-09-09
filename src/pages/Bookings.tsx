import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { StatusPill } from '../components/StatusPill.tsx'
import { paidOf } from '../lib/booking.ts'
import { day, money } from '../lib/format.ts'
import { useStudio } from '../lib/store.ts'

export function Bookings() {
  const { leads } = useStudio()
  const booked = leads
    .filter((l) => l.status === 'booked' || l.status === 'accepted' || l.status === 'completed')
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate))

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-gold-soft">Confirmed</p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">Bookings</h1>
        <p className="mt-2 text-sm text-mute">One wedding on the desk at a time. Open it. Run it.</p>
      </div>
      <div className="grid gap-4">
        {booked.map((l) => (
          <Link
            key={l.id}
            to={`/studio/leads/${l.id}`}
            className="rounded-3xl border border-line bg-ink-2 p-5 transition hover:border-gold/50 sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-3xl">{l.coupleName}</p>
                <p className="mt-1 flex items-center gap-2 text-sm text-mute">
                  <CalendarDays size={14} /> {day(l.eventDate)} · {l.venue || l.city}
                </p>
              </div>
              <StatusPill status={l.status} />
            </div>
            <p className="mt-4 font-display text-2xl text-gold-soft">{money(l.packageAmount)}</p>
            <p className="mt-1 text-sm text-mute">
              Advance {money(paidOf(l, 'advance'))}
              {paidOf(l, 'advance') >= l.plan.advance && l.plan.advance > 0 ? ' ✓' : ''} · Outstanding{' '}
              {money(Math.max(0, l.packageAmount - l.payments.reduce((s, p) => s + p.amount, 0)))}
            </p>
            <ul className="mt-4 flex flex-wrap gap-2 text-sm">
              {l.events.map((ev) => (
                <li key={ev.id} className={ev.done ? 'text-gold-soft' : 'text-mute'}>
                  {ev.done ? '✓' : '○'} {ev.name}
                </li>
              ))}
            </ul>
          </Link>
        ))}
        {booked.length === 0 ? (
          <p className="text-mute">No bookings yet. Accept a quotation, take the advance, confirm.</p>
        ) : null}
      </div>
    </div>
  )
}
