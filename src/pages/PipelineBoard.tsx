import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader.tsx'
import { StatusPill } from '../components/StatusPill.tsx'
import { UpgradeGate } from '../components/UpgradeGate.tsx'
import { PIPELINE } from '../lib/booking.ts'
import { day, money, STATUS_LABEL } from '../lib/format.ts'
import { hasProDesk } from '../lib/planAccess.ts'
import { useStudio } from '../lib/store.ts'
import type { Lead, LeadStatus } from '../lib/types.ts'

const COLUMNS: { id: LeadStatus; match: LeadStatus[] }[] = [
  { id: 'new', match: ['new'] },
  { id: 'quoted', match: ['quoted', 'follow_up', 'no_response'] },
  { id: 'accepted', match: ['accepted'] },
  { id: 'booked', match: ['booked'] },
]

function Column({ title, leads }: { title: string; leads: Lead[] }) {
  return (
    <section className="min-w-[220px] flex-1 rounded-2xl border border-line bg-ink-2 p-3">
      <p className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.16em] text-mute">
        <span>{title}</span>
        <span className="tabular-nums text-gold-soft">{leads.length}</span>
      </p>
      <ul className="mt-3 space-y-2">
        {leads.length === 0 ? <li className="text-xs text-mute">Empty</li> : null}
        {leads.map((lead) => (
          <li key={lead.id}>
            <Link
              to={`/studio/leads/${lead.id}`}
              className="block rounded-xl border border-line bg-ink p-3 hover:border-gold/40"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="font-medium">{lead.coupleName}</span>
                <StatusPill status={lead.status} />
              </span>
              <span className="mt-1 block text-xs text-mute">
                {day(lead.eventDate)} · {lead.city || lead.venue || 'Venue pending'}
              </span>
              <span className="mt-1 block text-xs tabular-nums text-gold-soft">{money(lead.packageAmount || lead.budget)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function PipelineBoard() {
  const snap = useStudio()
  if (!hasProDesk(snap)) {
    return (
      <UpgradeGate
        title="Pipeline is on Studio Pro"
        copy="See every couple as New → Quoted → Accepted → Booked, the same board HoneyBook and 17hats put in front of a busy season."
      />
    )
  }
  const { leads } = snap
  const parked = leads.filter((l) => l.status === 'lost' || l.status === 'completed')

  return (
    <div className="page-rise space-y-6">
      <PageHeader
        kicker="Pipeline"
        title="The season, as a board"
        hint="Drag nothing — tap a card. Studio still has the list. Pro puts the funnel on one screen."
      />
      <div className="-mx-4 overflow-x-auto px-4 sm:-mx-7 sm:px-7">
        <div className="flex min-w-[920px] gap-3">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              title={STATUS_LABEL[col.id]}
              leads={leads.filter((l) => col.match.includes(l.status))}
            />
          ))}
        </div>
      </div>
      {parked.length > 0 ? (
        <article className="rounded-2xl border border-line bg-ink-2 p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-mute">Completed / lost</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {parked.map((lead) => (
              <li key={lead.id}>
                <Link to={`/studio/leads/${lead.id}`} className="flex items-center justify-between gap-3 text-sm hover:text-gold-soft">
                  <span>
                    {lead.coupleName} · {STATUS_LABEL[lead.status]}
                  </span>
                  <span className="text-mute">{day(lead.eventDate)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </article>
      ) : null}
      <p className="text-xs text-mute">{PIPELINE.length} live stages. Lost and completed sit below so they do not clog the season.</p>
    </div>
  )
}
