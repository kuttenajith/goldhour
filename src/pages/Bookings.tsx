import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { PageHeader } from '../components/PageHeader.tsx'
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
    <div className="space-y-5">
      <PageHeader kicker="Confirmed" title="Bookings" hint={`${booked.length} on the calendar`} />
      <div className="hidden overflow-hidden rounded-2xl border border-line md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-mute">
            <tr>
              <th className="px-4 py-2.5 font-medium">Couple</th>
              <th className="px-4 py-2.5 font-medium">Wedding</th>
              <th className="px-4 py-2.5 font-medium">Package</th>
              <th className="px-4 py-2.5 font-medium">Advance</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {booked.map((l) => (
              <tr key={l.id} className="border-t border-line hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <Link to={`/studio/leads/${l.id}`} className="font-medium hover:text-gold-soft">
                    {l.coupleName}
                  </Link>
                  <span className="mt-0.5 block text-xs text-mute">{l.venue || l.city || '—'}</span>
                </td>
                <td className="px-4 py-3 text-mute">{day(l.eventDate)}</td>
                <td className="px-4 py-3 tabular-nums">{money(l.packageAmount)}</td>
                <td className="px-4 py-3 tabular-nums text-gold-soft">
                  {money(paidOf(l, 'advance'))}
                  {paidOf(l, 'advance') >= l.plan.advance && l.plan.advance > 0 ? ' ✓' : ''}
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={l.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-2 md:hidden">
        {booked.map((l) => (
          <Link key={l.id} to={`/studio/leads/${l.id}`} className="rounded-2xl border border-line bg-ink-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{l.coupleName}</p>
                <p className="mt-1 flex items-center gap-2 text-sm text-mute">
                  <CalendarDays size={14} /> {day(l.eventDate)} · {l.venue || l.city}
                </p>
              </div>
              <StatusPill status={l.status} />
            </div>
            <p className="mt-3 text-sm tabular-nums text-gold-soft">{money(l.packageAmount)}</p>
          </Link>
        ))}
      </div>
      {booked.length === 0 ? (
        <p className="text-sm text-mute">No bookings yet. Accept a quotation, take the advance, confirm.</p>
      ) : null}
    </div>
  )
}
