import { useEffect, useState } from 'react'
import { api } from '../lib/store.ts'

type Event = { id: string; action: string; detail: string; createdAt: string }

const LABELS: Record<string, string> = {
  'login.ok': 'Signed in',
  'login.fail': 'Failed sign-in',
  'login.lockout': 'Sign-in locked',
  'login.demo': 'Opened demo desk',
  register: 'Studio created',
  logout: 'Signed out',
  'password.forgot': 'Reset requested',
  'password.reset': 'Password changed',
  'email.verified': 'Email confirmed',
  'studio.update': 'Desk updated',
  'billing.checkout': 'Checkout started',
  'billing.paid': 'Subscription paid',
  'billing.bad_signature': 'Payment rejected',
  'demo.reset': 'Demo reset',
  'admin.overview': 'Opened HQ',
  'authz.denied': 'Permission denied',
}

export function Activity() {
  const [events, setEvents] = useState<Event[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api<{ events: Event[] }>('/api/studio/activity')
      .then((data) => setEvents(data.events || []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load activity'))
  }, [])

  return (
    <div className="page-rise space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-gold-soft">Activity</p>
        <h1 className="mt-2 font-display text-4xl">What happened on this desk</h1>
      </div>
      {error ? <p className="text-sm text-orange-200">{error}</p> : null}
      <ul className="divide-y divide-line rounded-3xl border border-line bg-ink-2">
        {events.length === 0 ? <li className="p-5 text-mute">No activity yet. Sign-ins and booking changes will land here.</li> : null}
        {events.map((ev) => (
          <li key={ev.id} className="flex flex-wrap items-baseline justify-between gap-3 p-5">
            <span>
              <span className="block">{LABELS[ev.action] || ev.action}</span>
              {ev.detail ? <span className="text-sm text-mute">{ev.detail}</span> : null}
            </span>
            <span className="text-xs tabular-nums text-mute">{new Date(ev.createdAt).toLocaleString('en-IN')}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
