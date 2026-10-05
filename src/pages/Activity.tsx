import { Link } from 'react-router-dom'
import { UpgradeGate } from '../components/UpgradeGate.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { day, money } from '../lib/format.ts'
import { hasProDesk } from '../lib/planAccess.ts'
import { conversion, dateClashes, morningBrief, pulseFeed, sourceMix, staleQuotes } from '../lib/studioPulse.ts'
import { useStudio } from '../lib/store.ts'
import { clsx } from '../lib/clsx.ts'

export function Activity() {
  const snap = useStudio()
  if (!hasProDesk(snap)) {
    return (
      <UpgradeGate
        title="Pulse is on Studio Pro"
        copy="Studio runs bookings. Pro shows the same picture Táve and HoneyBook keep on the home screen: win rate, where couples come from, quiet quotes, and two weddings on one Saturday."
      />
    )
  }

  const { leads, quotations } = snap
  const stats = conversion(leads)
  const sources = sourceMix(leads)
  const clashes = dateClashes(leads)
  const quiet = staleQuotes(leads)
  const brief = morningBrief(leads)
  const feed = pulseFeed(leads, quotations)

  return (
    <div className="page-rise space-y-6">
      <PageHeader
        kicker="Pulse"
        title="How the desk is actually doing"
        hint="Win rate, source mix, date clashes and every enquiry, quote and payment — not a log of who signed in."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Win rate', stats.decided ? `${stats.rate}%` : '—', `${stats.won} booked · ${stats.lost} lost`],
          ['Pipeline', money(stats.pipelineValue), `${leads.length} enquiries on file`],
          ['Booked value', money(stats.bookedValue), `${money(stats.collected)} collected`],
          ['Still due', money(stats.outstanding), `${brief.unpaid} booked couple${brief.unpaid === 1 ? '' : 's'} unpaid`],
        ].map(([k, v, sub]) => (
          <article key={k} className="rounded-2xl border border-line bg-ink-2 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-mute">{k}</p>
            <p className="mt-2 font-display text-2xl tabular-nums text-gold-soft sm:text-3xl">{v}</p>
            <p className="mt-1 text-xs text-mute">{sub}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-line bg-ink-2 p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-mute">This morning</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/studio/follow-ups" className="hover:text-gold-soft">
                {brief.follow} follow-up{brief.follow === 1 ? '' : 's'} waiting
              </Link>
            </li>
            <li>
              <Link to="/studio/calendar" className="hover:text-gold-soft">
                {brief.clashes} date clash{brief.clashes === 1 ? '' : 'es'}
              </Link>
            </li>
            <li>{brief.stale} quiet quotation{brief.stale === 1 ? '' : 's'} (3+ days)</li>
            <li>
              {brief.nextWedding
                ? `Next wedding · ${brief.nextWedding.coupleName} · ${day(brief.nextWedding.eventDate)}`
                : 'No booked wedding on the calendar yet'}
            </li>
          </ul>
        </article>

        <article className="rounded-2xl border border-line bg-ink-2 p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-mute">Where couples come from</p>
          {sources.length === 0 ? <p className="mt-3 text-sm text-mute">Save a lead with a source to see this.</p> : null}
          <ul className="mt-3 space-y-2">
            {sources.map((row) => (
              <li key={row.source} className="flex items-center justify-between gap-3 text-sm">
                <span>{row.label}</span>
                <span className="tabular-nums text-gold-soft">
                  {row.count} · {row.booked} booked
                </span>
              </li>
            ))}
          </ul>
        </article>
      </div>

      {clashes.length > 0 ? (
        <article className="rounded-2xl border border-gold/50 bg-gold/10 p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-gold-soft">Date clashes</p>
          <p className="mt-2 text-sm text-mute">Two booked desks on the same day — the thing Táve flags before you confirm a second mandap.</p>
          <ul className="mt-3 space-y-2 text-sm">
            {clashes.map((clash) => (
              <li key={clash.date}>
                <Link to="/studio/calendar" className="hover:text-gold-soft">
                  {day(clash.date)} · {clash.leads.map((l) => l.coupleName).join(' · ')}
                </Link>
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      {quiet.length > 0 ? (
        <article className="rounded-2xl border border-line bg-ink-2 p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-mute">Quiet quotes</p>
          <ul className="mt-3 space-y-2">
            {quiet.slice(0, 8).map((lead) => (
              <li key={lead.id} className="flex items-center justify-between gap-3 text-sm">
                <Link to={`/studio/leads/${lead.id}`} className="hover:text-gold-soft">
                  {lead.coupleName}
                </Link>
                <span className="text-mute">{money(lead.packageAmount || lead.budget)}</span>
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      <article className="rounded-2xl border border-line bg-ink-2">
        <div className="border-b border-line px-4 py-4 sm:px-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-mute">Desk feed</p>
          <p className="mt-1 text-sm text-mute">Enquiries, quotes, payments and clashes — the live book of the studio.</p>
        </div>
        <ul className="divide-y divide-line">
          {feed.length === 0 ? <li className="p-5 text-sm text-mute">Nothing on the feed yet. Save an enquiry.</li> : null}
          {feed.map((item) => (
            <li key={item.id}>
              <Link
                to={item.href}
                className={clsx(
                  'flex flex-wrap items-baseline justify-between gap-3 px-4 py-4 sm:px-5 hover:bg-white/[0.02]',
                  item.kind === 'clash' && 'text-orange-200',
                )}
              >
                <span>
                  <span className="block">{item.title}</span>
                  <span className="text-sm text-mute">{item.body}</span>
                </span>
                <span className="text-xs tabular-nums text-mute">{day(item.at.slice(0, 10))}</span>
              </Link>
            </li>
          ))}
        </ul>
      </article>
    </div>
  )
}
