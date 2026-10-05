import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader.tsx'
import { UpgradeGate } from '../components/UpgradeGate.tsx'
import { day, money } from '../lib/format.ts'
import { hasProDesk } from '../lib/planAccess.ts'
import { useStudio } from '../lib/store.ts'
import { clsx } from '../lib/clsx.ts'

function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(1 - ((first.getDay() + 6) % 7))
  const days: Date[] = []
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d)
  }
  return days
}

function iso(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dayN = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dayN}`
}

export function Calendar() {
  const snap = useStudio()
  const { leads } = snap
  if (!hasProDesk(snap)) {
    return (
      <UpgradeGate
        title="Calendar is on Studio Pro"
        copy="Studio keeps the booking desk. Pro adds the month view so every mehendi, wedding and reception sits on one calendar."
      />
    )
  }
  const [cursor, setCursor] = useState(() => {
    const n = new Date()
    return { y: n.getFullYear(), m: n.getMonth() }
  })
  const days = useMemo(() => monthMatrix(cursor.y, cursor.m), [cursor])
  const byDate = useMemo(() => {
    const map = new Map<string, typeof leads>()
    for (const lead of leads) {
      const dates = [lead.eventDate, ...lead.events.map((ev) => ev.date)].filter(Boolean)
      for (const date of dates) {
        const list = map.get(date) || []
        if (!list.some((l) => l.id === lead.id)) list.push(lead)
        map.set(date, list)
      }
    }
    return map
  }, [leads])
  const label = new Date(cursor.y, cursor.m, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  return (
    <div className="page-rise space-y-6">
      <PageHeader
        kicker="Calendar"
        title={label}
        actions={
          <div className="flex gap-2">
            <button type="button" className="rounded-full border border-line px-3 py-1.5 text-sm text-mute" onClick={() => setCursor((c) => ({ y: c.m === 0 ? c.y - 1 : c.y, m: c.m === 0 ? 11 : c.m - 1 }))}>
              Prev
            </button>
            <button type="button" className="rounded-full border border-line px-3 py-1.5 text-sm text-mute" onClick={() => setCursor((c) => ({ y: c.m === 11 ? c.y + 1 : c.y, m: c.m === 11 ? 0 : c.m + 1 }))}>
              Next
            </button>
          </div>
        }
      />
      <div className="min-w-0 overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wider text-mute">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const key = iso(d)
              const events = byDate.get(key) || []
              const inMonth = d.getMonth() === cursor.m
              return (
                <div key={key} className={clsx('min-h-14 overflow-hidden rounded-xl border border-line p-1.5 text-left sm:min-h-[88px] sm:rounded-2xl sm:p-2', !inMonth && 'opacity-40')}>
                  <p className="text-xs tabular-nums text-mute">{d.getDate()}</p>
                  <ul className="mt-1 space-y-1">
                    {events.slice(0, 2).map((l) => (
                      <li key={l.id}>
                        <Link to={`/studio/leads/${l.id}`} className="block truncate text-[11px] text-gold-soft">
                          {l.coupleName.split('&')[0].trim()}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <ul className="space-y-2 text-sm text-mute">
        {leads
          .filter((l) => l.status === 'booked' || l.status === 'accepted')
          .slice(0, 8)
          .map((l) => (
            <li key={l.id}>
              <Link to={`/studio/leads/${l.id}`} className="hover:text-gold-soft">
                {day(l.eventDate)} · {l.coupleName} · {money(l.packageAmount)}
              </Link>
            </li>
          ))}
      </ul>
    </div>
  )
}
