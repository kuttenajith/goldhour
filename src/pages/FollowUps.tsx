import { Link } from 'react-router-dom'
import { addDays, day, todayIso } from '../lib/format.ts'
import { setNextAction, useStudio } from '../lib/store.ts'
import { Button } from '../components/Button.tsx'
import { StatusPill } from '../components/StatusPill.tsx'
import type { Lead } from '../lib/types.ts'

function bucket(leads: Lead[]) {
  const today = todayIso()
  const tomorrow = addDays(today, 1)
  const week = addDays(today, 7)
  return {
    today: leads.filter((l) => l.nextActionOn <= today),
    tomorrow: leads.filter((l) => l.nextActionOn === tomorrow),
    week: leads.filter((l) => l.nextActionOn > tomorrow && l.nextActionOn <= week),
  }
}

export function FollowUps() {
  const { leads } = useStudio()
  const active = leads.filter((l) => l.status !== 'completed' && l.status !== 'lost')
  const groups = bucket(active)

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-gold-soft">Rhythm</p>
        <h1 className="mt-2 font-display text-5xl">Follow-ups</h1>
      </div>
      <Group title="Follow up today" items={groups.today} />
      <Group title="Follow up tomorrow" items={groups.tomorrow} />
      <Group title="Follow up after 7 days" items={groups.week} />
    </div>
  )
}

function Group({ title, items }: { title: string; items: Lead[] }) {
  return (
    <section className="rounded-3xl border border-line bg-ink-2 p-6">
      <h2 className="font-display text-3xl">{title}</h2>
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
                  onClick={() => setNextAction(l.id, 'Follow up after 7 days', addDays(todayIso(), 7))}
                >
                  Snooze 7d
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
