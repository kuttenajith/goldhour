import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Download, LogOut, Shield } from 'lucide-react'
import { BrandMark } from '../components/BrandMark.tsx'
import { NoticeBell } from '../components/NoticeBell.tsx'
import { DeskSession } from '../components/TabGuard.tsx'
import { SiteVisits } from '../components/SiteVisits.tsx'
import { StatusPill } from '../components/StatusPill.tsx'
import { fieldClass } from '../components/Field.tsx'
import { day, money, paid, when, PAYMENT_LABEL, SERVICE_LABEL, SOURCE_LABEL } from '../lib/format.ts'
import { firstName } from '../lib/copilot.ts'
import { desksCsv, downloadText, leadsCsv, paymentsCsv, type HqExport } from '../lib/hqExport.ts'
import { api, logoutStudio, useStudio } from '../lib/store.ts'
import { UserHello } from '../components/UserHello.tsx'
import type { AdminOverview, AdminTenant, AppNotice, Lead } from '../lib/types.ts'
import { clsx } from '../lib/clsx.ts'

type Filter = 'live' | 'paying' | 'trial' | 'request' | 'removed' | 'records' | 'all'

function planName(id?: string | null) {
  if (id === 'studio_pro') return 'Studio Pro'
  if (id === 'studio') return 'Studio'
  if (id === 'trial') return 'Trial'
  return id || '—'
}

function kind(t: AdminTenant): Filter | 'hq' | 'demo' {
  if (t.deletedAt) return 'removed'
  if (t.isAdmin) return 'hq'
  if (t.isDemo) return 'demo'
  if (t.billing.status === 'active') return 'paying'
  if (t.billing.status === 'trialing') return 'trial'
  return 'all'
}

function paidLive(t: AdminTenant) {
  return t.billing.lastPayment?.status === 'paid'
}

function LeadBlock({ lead }: { lead: Lead }) {
  const [open, setOpen] = useState(false)
  return (
    <article className="rounded-2xl border border-line bg-ink p-4">
      <button type="button" className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setOpen((v) => !v)}>
        <span>
          <span className="block font-medium">{lead.coupleName}</span>
          <span className="text-xs text-mute">
            Entered {when(lead.createdOn)} · Wedding {day(lead.eventDate)} · {lead.venue || lead.city || 'Venue pending'} · {lead.phone || 'no phone'}
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
          <p>Entered {when(lead.createdOn)}</p>
          <p>
            {SERVICE_LABEL[lead.service] || lead.service} · {SOURCE_LABEL[lead.source] || lead.source}
          </p>
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

function StudioCard({
  tenant,
  startsOpen,
  onRefresh,
}: {
  tenant: AdminTenant
  startsOpen?: boolean
  onRefresh?: () => void
}) {
  const paidOrder = tenant.billing.lastPayment
  const moneyIn = paidOrder?.status === 'paid'
  const [open, setOpen] = useState(Boolean(startsOpen) || Boolean(tenant.billing.requestedPlan) || moneyIn)
  const [planBusy, setPlanBusy] = useState<string | null>(null)
  const [deskBusy, setDeskBusy] = useState(false)
  useEffect(() => {
    if (startsOpen || tenant.billing.requestedPlan || moneyIn) setOpen(true)
  }, [startsOpen, tenant.billing.requestedPlan, moneyIn])
  const booked = tenant.leads.filter((l) => l.status === 'booked' || l.status === 'accepted')
  const collected = tenant.leads.reduce((s, l) => s + paid(l), 0)
  const removed = Boolean(tenant.deletedAt)
  const label = tenant.isAdmin
    ? 'HQ'
    : tenant.isDemo
      ? 'Demo'
      : removed
        ? 'Removed'
        : moneyIn || tenant.billing.status === 'active'
          ? 'Paying'
          : tenant.billing.status === 'trialing'
            ? 'Trial'
            : 'Expired'
  const canSwitch = !tenant.isAdmin && !tenant.isDemo && !removed
  const current = tenant.billing.status === 'active' ? tenant.billing.plan : tenant.billing.status === 'trialing' ? 'trial' : tenant.billing.plan
  const requested = tenant.billing.requestedPlan

  async function activate(plan: 'studio' | 'studio_pro') {
    setPlanBusy(plan)
    try {
      await api('/api/admin/activate-plan', { method: 'POST', body: JSON.stringify({ email: tenant.email, plan }) })
      onRefresh?.()
    } finally {
      setPlanBusy(null)
    }
  }

  async function removeDesk() {
    if (!window.confirm(`Remove ${tenant.studio.name}? The desk stays in the database. They cannot sign in.`)) return
    setDeskBusy(true)
    try {
      await api('/api/admin/remove-desk', { method: 'POST', body: JSON.stringify({ email: tenant.email }) })
      onRefresh?.()
    } finally {
      setDeskBusy(false)
    }
  }

  async function restoreDesk() {
    setDeskBusy(true)
    try {
      await api('/api/admin/restore-desk', { method: 'POST', body: JSON.stringify({ email: tenant.email }) })
      onRefresh?.()
    } finally {
      setDeskBusy(false)
    }
  }
  return (
    <section className="rounded-3xl border border-line bg-ink-2" data-studio={tenant.email}>
      <button type="button" className="flex w-full flex-col gap-3 p-5 text-left sm:flex-row sm:items-center sm:justify-between" onClick={() => setOpen((v) => !v)}>
        <span>
          <span className="block font-display text-2xl">{tenant.studio.name}</span>
          <span className="text-sm text-mute">
            {tenant.studio.owner || '—'} · {tenant.studio.city || '—'} · {tenant.email}
            <span className="mt-1 block text-xs">Joined {when(tenant.createdAt)}</span>
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-3 text-sm">
          {moneyIn ? (
            <span className="rounded-full bg-gold px-3 py-1 text-xs uppercase tracking-wider text-ink">
              Paid {planName(paidOrder?.plan)}
            </span>
          ) : requested ? (
            <span className="rounded-full border border-gold/50 px-3 py-1 text-xs uppercase tracking-wider text-gold-soft">
              Asked {planName(requested)} · unpaid
            </span>
          ) : null}
          <span className="rounded-full border border-gold/35 px-3 py-1 text-xs uppercase tracking-wider text-gold-soft">{label}</span>
          <span className="tabular-nums text-gold-soft">{tenant.leads.length} events</span>
          <span className="tabular-nums">{money(collected)}</span>
        </span>
      </button>
      {open ? (
        <div className="space-y-4 border-t border-line p-5">
          <dl className="grid gap-x-6 gap-y-2 text-sm text-mute sm:grid-cols-2">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.16em]">Phone</dt>
              <dd className="text-cream">{tenant.studio.phone || '—'}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.16em]">Plan</dt>
              <dd className="text-cream">{planName(current)}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.16em]">Joined</dt>
              <dd className="text-cream">{when(tenant.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.16em]">Trial until</dt>
              <dd className="text-cream">{day(tenant.billing.trialEndsOn) || '—'}</dd>
            </div>
            {tenant.billing.periodEndsOn ? (
              <div>
                <dt className="text-[11px] uppercase tracking-[0.16em]">Paid through</dt>
                <dd className="text-cream">{day(tenant.billing.periodEndsOn)}</dd>
              </div>
            ) : null}
          </dl>
          {moneyIn ? (
            <p className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold-soft">
              Payment complete: {planName(paidOrder?.plan)} · {money(Math.round((paidOrder?.amountPaise || 0) / 100))}
              {paidOrder?.paidAt ? ` · ${when(paidOrder.paidAt)}` : ''}. The desk is live
              {tenant.billing.status === 'active' ? ` until ${day(tenant.billing.periodEndsOn || '')}` : ''}. No approval needed.
              {paidOrder?.razorpayPaymentId ? (
                <span className="mt-1 block text-xs text-mute">Razorpay {paidOrder.razorpayPaymentId}</span>
              ) : null}
            </p>
          ) : requested ? (
            <p className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold-soft">
              {tenant.email} asked for {planName(requested)}. Razorpay has not recorded a payment yet. Approve below only if you want to grant the plan without waiting.
            </p>
          ) : null}
          {canSwitch ? (
            <div className="flex flex-wrap gap-2">
              {current !== 'studio' && !(moneyIn && paidOrder?.plan === 'studio') ? (
                <button
                  type="button"
                  className="cursor-pointer rounded-full border border-gold/35 px-3 py-1.5 text-xs text-gold-soft disabled:opacity-50"
                  disabled={planBusy !== null}
                  onClick={() => void activate('studio')}
                >
                  {planBusy === 'studio' ? 'Switching…' : requested === 'studio' ? 'Grant Studio without payment' : 'Switch to Studio'}
                </button>
              ) : null}
              {current !== 'studio_pro' && !(moneyIn && paidOrder?.plan === 'studio_pro') ? (
                <button
                  type="button"
                  className={clsx(
                    'cursor-pointer rounded-full px-3 py-1.5 text-xs disabled:opacity-50',
                    requested === 'studio_pro' && !moneyIn ? 'bg-gold text-ink' : 'border border-gold/35 text-gold-soft',
                  )}
                  disabled={planBusy !== null}
                  onClick={() => void activate('studio_pro')}
                >
                  {planBusy === 'studio_pro' ? 'Switching…' : requested === 'studio_pro' ? 'Grant Pro without payment' : 'Switch to Pro'}
                </button>
              ) : null}
            </div>
          ) : null}
          {canSwitch ? (
            <button
              type="button"
              className="cursor-pointer text-xs text-mute hover:text-orange-200 disabled:opacity-50"
              disabled={deskBusy}
              onClick={() => void removeDesk()}
            >
              {deskBusy ? 'Removing…' : 'Remove this studio desk'}
            </button>
          ) : null}
          {removed && !tenant.isAdmin && !tenant.isDemo ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-orange-200">Removed {when(tenant.deletedAt || '')}. Data is still in the database.</p>
              <button
                type="button"
                className="cursor-pointer rounded-full border border-gold/35 px-3 py-1.5 text-xs text-gold-soft disabled:opacity-50"
                disabled={deskBusy}
                onClick={() => void restoreDesk()}
              >
                {deskBusy ? 'Restoring…' : 'Put desk back'}
              </button>
            </div>
          ) : null}
          <p className="text-xs uppercase tracking-[0.2em] text-mute">
            {booked.length} booked / accepted · {tenant.quotations.length} quotes
          </p>
          {tenant.quotations.length ? (
            <ul className="space-y-1 text-sm text-mute">
              {tenant.quotations.map((q) => (
                <li key={q.id}>
                  Quote {q.packageName} · {money(q.amount)} · {day(q.createdOn)}
                </li>
              ))}
            </ul>
          ) : null}
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
  const [params] = useSearchParams()
  const focus = params.get('studio') || ''
  const [data, setData] = useState<AdminOverview | null>(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('live')
  const [autoOpenedRequests, setAutoOpenedRequests] = useState(false)
  const [pack, setPack] = useState<HqExport | null>(null)
  const [packError, setPackError] = useState('')
  const [packBusy, setPackBusy] = useState(false)

  function loadHq() {
    api<AdminOverview>('/api/admin/overview')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load HQ'))
  }

  async function loadRecords() {
    setPackBusy(true)
    setPackError('')
    try {
      const next = await api<HqExport>('/api/admin/export')
      setPack(next)
    } catch (err) {
      setPackError(err instanceof Error ? err.message : 'Could not load records')
    } finally {
      setPackBusy(false)
    }
  }

  useEffect(() => {
    loadHq()
  }, [])

  useEffect(() => {
    if (filter === 'records') void loadRecords()
  }, [filter])

  useEffect(() => {
    if (focus) setFilter('all')
  }, [focus])

  useEffect(() => {
    if (!data || autoOpenedRequests || focus) return
    const unpaidAsk = data.tenants.some((t) => !t.deletedAt && !t.isAdmin && !t.isDemo && t.billing.requestedPlan && t.billing.lastPayment?.status !== 'paid')
    const justPaid = data.tenants.some((t) => !t.deletedAt && !t.isAdmin && !t.isDemo && t.billing.lastPayment?.status === 'paid')
    if (unpaidAsk) setFilter('request')
    else if (justPaid) setFilter('paying')
    if (unpaidAsk || justPaid) setAutoOpenedRequests(true)
  }, [data, autoOpenedRequests, focus])

  useEffect(() => {
    if (!focus || !data) return
    window.setTimeout(() => {
      document.querySelector(`[data-studio="${CSS.escape(focus)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }, [focus, data])

  const tenants = data?.tenants || []
  const live = tenants.filter((t) => !t.isAdmin && !t.isDemo && !t.deletedAt)
  const removed = tenants.filter((t) => !t.isAdmin && !t.isDemo && t.deletedAt)
  const paying = live.filter((t) => t.billing.status === 'active' || paidLive(t))
  const trial = live.filter((t) => t.billing.status === 'trialing' && !paidLive(t))
  const requests = live.filter((t) => Boolean(t.billing.requestedPlan) && !paidLive(t))
  const paidDesks = live.filter((t) => paidLive(t))
  const events = live.reduce((s, t) => s + t.leads.length, 0)
  const joinNotices: AppNotice[] = live.map((t) => ({
    id: `hq-new:${t.email}`,
    title: `${t.studio.name} joined`,
    body: [t.email, t.studio.phone, t.studio.city, 'started a GoldHour desk'].filter(Boolean).join(' · '),
    href: `/admin?studio=${encodeURIComponent(t.email)}`,
    at: t.createdAt,
    sticky: true,
  }))
  const requestNotices: AppNotice[] = requests.map((t) => ({
    id: `hq-request:${t.email}:${t.billing.requestedPlan}`,
    title: `${t.studio.name} asked for ${planName(t.billing.requestedPlan)}`,
    body: `${t.email} · payment not received yet`,
    href: `/admin?studio=${encodeURIComponent(t.email)}`,
    at: t.billing.requestedAt || new Date().toISOString(),
    sticky: true,
  }))
  const paidNotices: AppNotice[] = paidDesks.map((t) => ({
    id: `hq-paid:${t.email}:${t.billing.lastPayment?.razorpayPaymentId || t.billing.lastPayment?.razorpayOrderId || 'paid'}`,
    title: `${t.studio.name} paid for ${planName(t.billing.lastPayment?.plan)}`,
    body: `${money(Math.round((t.billing.lastPayment?.amountPaise || 0) / 100))} · Razorpay complete · desk is live`,
    href: `/admin?studio=${encodeURIComponent(t.email)}`,
    at: t.billing.lastPayment?.paidAt || t.billing.lastPayment?.at || t.createdAt,
    sticky: true,
  }))
  const leadNotices: AppNotice[] = live.flatMap((t) =>
    t.leads.map((lead) => ({
      id: `hq-lead:${t.email}:${lead.id}`,
      title: `${t.studio.name} · ${lead.status === 'new' ? 'new enquiry' : lead.status.replace(/_/g, ' ')} · ${lead.coupleName}`,
      body: [
        lead.phone || 'no phone',
        lead.eventDate ? `wedding ${lead.eventDate}` : 'date pending',
        lead.venue || lead.city || 'venue pending',
        lead.createdOn ? `entered ${lead.createdOn}` : '',
        lead.notes || '',
      ]
        .filter(Boolean)
        .join(' · '),
      href: `/admin?studio=${encodeURIComponent(t.email)}`,
      at: lead.createdOn || t.createdAt,
      sticky: lead.status === 'new',
    })),
  )

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return tenants.filter((t) => {
      if (filter === 'records') return false
      if (filter === 'live' && (t.isAdmin || t.isDemo || t.deletedAt)) return false
      if (filter === 'paying' && kind(t) !== 'paying') return false
      if (filter === 'trial' && kind(t) !== 'trial') return false
      if (filter === 'request' && (t.deletedAt || !t.billing.requestedPlan || paidLive(t))) return false
      if (filter === 'removed' && !t.deletedAt) return false
      if (!needle) return true
      const blob = [t.email, t.studio.name, t.studio.owner, t.studio.city, ...t.leads.map((l) => l.coupleName)].join(' ').toLowerCase()
      return blob.includes(needle)
    })
  }, [tenants, filter, q])

  return (
    <div className="min-h-screen bg-ink text-cream">
      <DeskSession />
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-4 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <BrandMark />
          <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 px-3 py-1 text-xs uppercase tracking-[0.18em] text-gold-soft">
            <Shield size={12} /> HQ
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <NoticeBell extras={[...paidNotices, ...joinNotices, ...requestNotices, ...leadNotices]} />
          <UserHello name={firstName(me)} />
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-soft">HQ</p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl">Every studio</h1>
          <p className="mt-1 max-w-2xl text-sm text-mute">
            Paying and trial desks, Razorpay payments, the couples they booked, and a full records download.
            {removed.length ? ` ${removed.length} removed desk${removed.length === 1 ? '' : 's'} still sit in the database.` : ''}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(
            [
              ['Studios', String(live.length), 'live' as Filter],
              ['Paying', String(paying.length), 'paying' as Filter],
              ['On trial', String(trial.length), 'trial' as Filter],
              ['Asked · unpaid', String(requests.length), 'request' as Filter],
              ['Paid', String(paidDesks.length), 'paying' as Filter],
              ['Events on file', String(events), 'live' as Filter],
            ] as const
          ).map(([k, v, next]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(next)}
              className={clsx(
                'rounded-2xl border bg-ink-2 p-4 text-left',
                (k === 'Asked · unpaid' && requests.length > 0) || (k === 'Paid' && paidDesks.length > 0)
                  ? 'border-gold/50'
                  : 'border-line',
              )}
            >
              <p className="text-[11px] uppercase tracking-[0.18em] text-mute">{k}</p>
              <p className="mt-2 font-display text-2xl tabular-nums text-gold-soft sm:text-3xl">{v}</p>
            </button>
          ))}
          <article className="rounded-2xl border border-line bg-ink-2 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-mute">Site visits</p>
            <p className="mt-2 font-display text-2xl tabular-nums text-gold-soft sm:text-3xl">
              <SiteVisits variant="stat" />
            </p>
            <p className="mt-1 text-[11px] text-mute">Unique browsers · HQ only</p>
          </article>
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
                ['request', 'Asked · unpaid'],
                ['paying', 'Paid / paying'],
                ['trial', 'Trial'],
                ['removed', 'Removed'],
                ['records', 'Records'],
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

        {filter === 'records' ? (
          <section className="space-y-4 rounded-3xl border border-line bg-ink-2 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-gold-soft">HQ records</p>
                <h2 className="mt-1 font-display text-2xl">Database snapshot</h2>
                <p className="mt-1 text-sm text-mute">
                  Live desks, leads, quotations, Razorpay orders, and activity. Passwords and OTP hashes are not included.
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-gold/35 px-3 py-1.5 text-xs text-gold-soft disabled:opacity-50"
                disabled={packBusy}
                onClick={() => void loadRecords()}
              >
                {packBusy ? 'Loading…' : 'Refresh'}
              </button>
            </div>
            {packError ? <p className="text-sm text-orange-200">{packError}</p> : null}
            {pack ? (
              <>
                <p className="text-xs text-mute">Exported {when(pack.exportedAt)} · {pack.desks.length} desks · {pack.payments.length} Razorpay orders · {pack.activity.length} activity rows</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full bg-gold px-3 py-1.5 text-xs text-ink"
                    onClick={() => downloadText(`goldhour-desks-${pack.exportedAt.slice(0, 10)}.json`, JSON.stringify(pack, null, 2), 'application/json')}
                  >
                    <Download size={12} /> JSON
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-gold/35 px-3 py-1.5 text-xs text-gold-soft"
                    onClick={() => downloadText(`goldhour-desks-${pack.exportedAt.slice(0, 10)}.csv`, desksCsv(pack), 'text/csv')}
                  >
                    Desks CSV
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-gold/35 px-3 py-1.5 text-xs text-gold-soft"
                    onClick={() => downloadText(`goldhour-leads-${pack.exportedAt.slice(0, 10)}.csv`, leadsCsv(pack), 'text/csv')}
                  >
                    Leads CSV
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-gold/35 px-3 py-1.5 text-xs text-gold-soft"
                    onClick={() => downloadText(`goldhour-payments-${pack.exportedAt.slice(0, 10)}.csv`, paymentsCsv(pack), 'text/csv')}
                  >
                    Payments CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[40rem] text-left text-sm">
                    <thead className="text-[11px] uppercase tracking-[0.14em] text-mute">
                      <tr>
                        <th className="py-2 pr-3">Studio</th>
                        <th className="py-2 pr-3">Email</th>
                        <th className="py-2 pr-3">Plan</th>
                        <th className="py-2 pr-3">Status</th>
                        <th className="py-2 pr-3">Leads</th>
                        <th className="py-2">Removed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pack.desks.map((d) => (
                        <tr key={d.email} className="border-t border-line">
                          <td className="py-2 pr-3">{d.studio?.name || '—'}</td>
                          <td className="py-2 pr-3 text-mute">{d.email}</td>
                          <td className="py-2 pr-3">{planName(d.plan)}</td>
                          <td className="py-2 pr-3">{d.status}</td>
                          <td className="py-2 pr-3 tabular-nums">{d.leads.length}</td>
                          <td className="py-2">{d.removedAt ? day(d.removedAt) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-mute">{packBusy ? 'Loading records…' : 'Open Records to load the database snapshot.'}</p>
            )}
          </section>
        ) : null}

        <div className="space-y-4">
          {filter !== 'records' && data && shown.length === 0 ? <p className="text-mute">No studios match that filter.</p> : null}
          {shown.map((tenant) => (
            <StudioCard
              key={tenant.email}
              tenant={tenant}
              startsOpen={focus === tenant.email || Boolean(tenant.billing.requestedPlan) || paidLive(tenant)}
              onRefresh={loadHq}
            />
          ))}
        </div>
      </main>
    </div>
  )
}
