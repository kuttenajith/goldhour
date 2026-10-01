import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Shield } from 'lucide-react'
import { BrandMark } from '../components/BrandMark.tsx'
import { StatusPill } from '../components/StatusPill.tsx'
import { fieldClass } from '../components/Field.tsx'
import { day, money, paid, PAYMENT_LABEL } from '../lib/format.ts'
import { api, logoutStudio, useStudio } from '../lib/store.ts'
import type { AdminOverview, AdminTenant, Lead } from '../lib/types.ts'
import { clsx } from '../lib/clsx.ts'

type Filter = 'live' | 'paying' | 'trial' | 'all'

function kind(t: AdminTenant): Filter | 'hq' | 'demo' {
  if (t.isAdmin) return 'hq'
  if (t.isDemo) return 'demo'
  if (t.billing.status === 'active') return 'paying'
  if (t.billing.status === 'trialing') return 'trial'
  return 'all'
}

function LeadBlock({ lead }: { lead: Lead }) {
  const [open, setOpen] = useState(false)
  return (
    <article className="rounded-2xl border border-line bg-ink p-4">
      <button type="button" className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setOpen((v) => !v)}>
        <span>
          <span className="block font-medium">{lead.coupleName}</span>
          <span className="text-xs text-mute">
            {day(lead.eventDate)} · {lead.venue || lead.city || 'Venue pending'} · {lead.phone || 'no phone'}
          </span>
        </span>
        <StatusPill status={lead.status} />
      </button>
      <div className="mt-3 flex flex-wrap gap-3 text-sm text-gold-soft">
        <span>Package {money(lead.packageAmount || lead.budget || 0)}</span>
        <span>Collected {money(paid(lead))}</span>
      </div>
      {open ? (
        <div className="mt-4 space-y-3 border-t border-line pt-4 text-sm text-mute">
          <p>{lead.notes || 'No notes yet.'}</p>
          <p>Next: {lead.nextAction || '—'} {lead.nextActionOn ? `· ${day(lead.nextActionOn)}` : ''}</p>
          <ul className="space-y-1">
            {(lead.events || []).length === 0 ? <li>No events listed.</li> : null}
            {(lead.events || []).map((ev) => (
              <li key={ev.id}>
                {ev.name}
                {ev.date ? ` · ${day(ev.date)}` : ''}
                {ev.done ? ' · done' : ''}
                {(ev.timeline || []).length
                  ? ` — ${(ev.timeline || []).map((s) => `${s.time} ${s.title}`).join(', ')}`
                  : ''}
              </li>
            ))}
          </ul>
          <ul className="space-y-1">
            {(lead.payments || []).length === 0 ? <li>No payments recorded.</li> : null}
            {(lead.payments || []).map((p) => (
              <li key={p.id}>
                {PAYMENT_LABEL[p.kind] || p.kind} {money(p.amount)} on {p.receivedOn}
                {p.note ? ` · ${p.note}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  )
}

function StudioCard({ tenant }: { tenant: AdminTenant }) {
  const [open, setOpen] = useState(false)
  const booked = tenant.leads.filter((l) => l.status === 'booked' || l.status === 'accepted')
  const collected = tenant.leads.reduce((s, l) => s + paid(l), 0)
  const label = tenant.isAdmin ? 'HQ' : tenant.isDemo ? 'Demo' : tenant.billing.status === 'active' ? 'Paying' : tenant.billing.status === 'trialing' ? 'Trial' : 'Expired'
  return (
    <section className="rounded-3xl border border-line bg-ink-2">
      <button type="button" className="flex w-full flex-col gap-3 p-5 text-left sm:flex-row sm:items-center sm:justify-between" onClick={() => setOpen((v) => !v)}>
        <span>
          <span className="block font-display text-2xl">{tenant.studio.name}</span>
          <span className="text-sm text-mute">
            {tenant.studio.owner || '—'} · {tenant.studio.city || '—'} · {tenant.email}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full border border-gold/35 px-3 py-1 text-xs uppercase tracking-wider text-gold-soft">{label}</span>
          <span className="tabular-nums text-gold-soft">{tenant.leads.length} events</span>
          <span className="tabular-nums">{money(collected)}</span>
        </span>
      </button>
      {open ? (
        <div className="space-y-4 border-t border-line p-5">
          <p className="text-sm text-mute">
            Phone {tenant.studio.phone || '—'} · Plan {tenant.billing.plan} · Trial until {tenant.billing.trialEndsOn || '—'}
            {tenant.billing.periodEndsOn ? ` · Paid through ${tenant.billing.periodEndsOn}` : ''}
          </p>
          <p className="text-xs uppercase tracking-[0.2em] text-mute">
            {booked.length} booked / accepted · {tenant.quotations.length} quotes
          </p>
          <div className="grid gap-3">
            {tenant.leads.length === 0 ? <p className="text-mute">No weddings or events on this desk yet.</p> : null}
            {tenant.leads.map((lead) => (
              <LeadBlock key={lead.id} lead={lead} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

export function Admin() {
  const navigate = useNavigate()
  const me = useStudio()
  const [data, setData] = useState<AdminOverview | null>(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('live')

  useEffect(() => {
    api<AdminOverview>('/api/admin/overview')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load HQ'))
  }, [])

  const tenants = data?.tenants || []
  const live = tenants.filter((t) => !t.isAdmin && !t.isDemo)
  const paying = live.filter((t) => t.billing.status === 'active')
  const trial = live.filter((t) => t.billing.status === 'trialing')
  const events = live.reduce((s, t) => s + t.leads.length, 0)

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return tenants.filter((t) => {
      if (filter === 'live' && (t.isAdmin || t.isDemo)) return false
      if (filter === 'paying' && kind(t) !== 'paying') return false
      if (filter === 'trial' && kind(t) !== 'trial') return false
      if (!needle) return true
      const blob = [t.email, t.studio.name, t.studio.owner, t.studio.city, ...t.leads.map((l) => l.coupleName)].join(' ').toLowerCase()
      return blob.includes(needle)
    })
  }, [tenants, filter, q])

  return (
    <div className="min-h-screen bg-ink text-cream">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-4 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <BrandMark />
          <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 px-3 py-1 text-xs uppercase tracking-[0.18em] text-gold-soft">
            <Shield size={12} /> HQ
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-mute">{me.email || 'ajithkutten1998@gmail.com'}</span>
          <Link to="/studio" className="text-gold-soft">
            My desk
          </Link>
          <button
            type="button"
            className="inline-flex items-center gap-2 text-mute hover:text-cream"
            onClick={() => {
              logoutStudio()
              navigate('/')
            }}
          >
            <LogOut size={14} /> Leave
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-8">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-gold-soft">Operator</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">Every studio. Every wedding.</h1>
          <p className="mt-2 max-w-2xl text-mute">
            Paying and trial desks, the couples they booked, and a mail to you whenever a photographer saves a marriage or event.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          {[
            ['Studios', String(live.length)],
            ['Paying', String(paying.length)],
            ['On trial', String(trial.length)],
            ['Events on file', String(events)],
          ].map(([k, v]) => (
            <article key={k} className="rounded-3xl border border-line bg-ink-2 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-mute">{k}</p>
              <p className="mt-3 font-display text-3xl tabular-nums text-gold-soft">{v}</p>
            </article>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            className={clsx(fieldClass, 'sm:max-w-xs')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search studio, city, couple"
          />
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['live', 'Live studios'],
                ['paying', 'Paying'],
                ['trial', 'Trial'],
                ['all', 'All including demo'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={clsx(
                  'rounded-full px-3 py-1.5 text-xs uppercase tracking-wider',
                  filter === id ? 'bg-gold text-ink' : 'border border-line text-mute',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error ? <p className="text-sm text-orange-200">{error}</p> : null}
        {!data && !error ? <p className="text-mute">Loading every desk…</p> : null}

        <div className="space-y-4">
          {data && shown.length === 0 ? <p className="text-mute">No studios match that filter.</p> : null}
          {shown.map((tenant) => (
            <StudioCard key={tenant.email} tenant={tenant} />
          ))}
        </div>
      </main>
    </div>
  )
}
