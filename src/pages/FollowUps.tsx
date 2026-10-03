import { Link } from 'react-router-dom'
import { addDays, day, todayIso } from '../lib/format.ts'
import { setNextAction, useStudio } from '../lib/store.ts'
import { Button } from '../components/Button.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { StatusPill } from '../components/StatusPill.tsx'
import type { Lead } from '../lib/types.ts'

export function FollowUps() {
  const { leads } = useStudio()
  const active = leads.filter((l) => l.status !== 'completed' && l.status !== 'lost' && l.status !== 'booked')
  const today = todayIso()

  const due = active.filter((l) => l.nextActionOn <= today)
  const inTwo = active.filter(
    (l) => (l.status === 'quoted' || l.status === 'follow_up') && l.nextActionOn > today,
  )
  const silent = active.filter((l) => l.status === 'no_response' && l.nextActionOn > today)

  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Tasks"
        title="Follow-ups"
        hint="Quote sent → follow up in 2 days → no response → follow up in 5."
      />
      <Group title={`Due now · ${due.length}`} items={due} snoozeLabel="Snooze 2d" snoozeDays={2} />
      <Group title="Quoted · follow up in 2 days" items={inTwo} snoozeLabel="No response · 5d" snoozeDays={5} silent />
      <Group title="No response · follow up in 5 days" items={silent} snoozeLabel="Snooze 5d" snoozeDays={5} />
    </div>
  )
}

function Group({
  title,
  items,
  snoozeLabel,
  snoozeDays,
  silent,
}: {
  title: string
  items: Lead[]
  snoozeLabel: string
  snoozeDays: number
  silent?: boolean
}) {
  return (
    <section className="rounded-2xl border border-line bg-ink-2 p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-cream">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-mute">Clear. Nothing in this tray.</p>
      ) : (
        <ul className="mt-5 divide-y divide-line">
          {items.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <Link to={`/studio/leads/${l.id}`} className="hover:text-gold-soft">
                  {l.coupleName}
                </Link>
                <p className="text-sm text-mute">
                  {l.nextAction} · {day(l.nextActionOn)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={l.status} />
                <Button
                  tone="ghost"
                  className="px-3 py-1.5 text-xs"
                  onClick={() =>
                    setNextAction(
                      l.id,
                      silent ? 'No response — follow up in 5 days' : `Follow up in ${snoozeDays} days`,
                      addDays(todayIso(), snoozeDays),
                      silent ? 'no_response' : 'follow_up',
                    )
                  }
                >
                  {snoozeLabel}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
