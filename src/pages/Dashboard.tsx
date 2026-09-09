import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { StatusPill } from '../components/StatusPill.tsx'
import { balance, day, money, paid, todayIso } from '../lib/format.ts'
import { useStudio } from '../lib/store.ts'
import { asset } from '../lib/paths.ts'

export function Dashboard() {
  const { studio, leads } = useStudio()
  const today = todayIso()
  const pipeline = leads.reduce((s, l) => s + l.packageAmount, 0)
  const collected = leads.reduce((s, l) => s + paid(l), 0)
  const due = leads.reduce((s, l) => s + balance(l), 0)
  const followToday = leads.filter((l) => l.nextActionOn <= today && l.status !== 'completed' && l.status !== 'lost')
  const upcoming = [...leads].sort((a, b) => a.eventDate.localeCompare(b.eventDate)).slice(0, 4)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-gold-soft">{studio.name}</p>
          <h1 className="mt-2 font-display text-5xl">Good light today.</h1>
          <p className="mt-2 text-mute">
            {leads.length} weddings on the desk · {studio.city}
          </p>
        </div>
        <Link
          to="/studio/leads"
          className="inline-flex items-center gap-2 text-sm text-gold-soft hover:text-cream"
        >
          All leads <ArrowUpRight size={16} />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ['Pipeline', money(pipeline)],
          ['Collected', money(collected)],
          ['Balance due', money(due)],
        ].map(([k, v]) => (
          <article key={k} className="rounded-3xl border border-line bg-ink-2 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-mute">{k}</p>
            <p className="mt-3 font-display text-4xl text-gold-soft">{v}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-line bg-ink-2 p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-mute">New leads</p>
          <ul className="mt-4 divide-y divide-line">
            {leads
              .filter((l) => l.status !== 'lost')
              .slice(0, 5)
              .map((l) => (
                <li key={l.id}>
                  <Link
                    to={`/studio/leads/${l.id}`}
                    className="flex items-center justify-between gap-4 py-4 hover:text-gold-soft"
                  >
                    <span>
                      <span className="block">{l.coupleName.split('&')[0].trim()} Wedding</span>
                      <span className="text-xs text-mute">{day(l.eventDate)}</span>
                    </span>
                    <span className="text-gold-soft">{money(l.packageAmount || l.budget)}</span>
                  </Link>
                </li>
              ))}
          </ul>
        </article>

        <article className="overflow-hidden rounded-3xl border border-line bg-ink-2">
          <img src={asset('photos/bride.png')} alt="" className="h-40 w-full object-cover" />
          <div className="p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-mute">Follow-ups</p>
            <ul className="mt-4 space-y-3">
              {followToday.slice(0, 5).map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link to={`/studio/leads/${l.id}`} className="hover:text-gold-soft">
                    {l.coupleName.split(' ')[0]}
                  </Link>
                  <span className="text-gold-soft">{l.nextAction}</span>
                </li>
              ))}
              {followToday.length === 0 ? (
                <li className="text-mute">Nothing waiting today.</li>
              ) : null}
            </ul>
          </div>
        </article>
      </div>

      <article className="rounded-3xl border border-line bg-ink-2 p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-mute">Upcoming weddings</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {upcoming.map((l) => (
            <Link
              key={l.id}
              to={`/studio/leads/${l.id}`}
              className="rounded-2xl border border-line bg-ink p-4 transition hover:border-gold/50"
            >
              <p className="font-display text-2xl">{l.coupleName}</p>
              <p className="mt-1 text-sm text-mute">
                {day(l.eventDate)} · {l.city}
              </p>
              <div className="mt-3">
                <StatusPill status={l.status} />
              </div>
            </Link>
          ))}
        </div>
      </article>
    </div>
  )
}
