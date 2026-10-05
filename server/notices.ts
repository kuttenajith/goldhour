import { outstanding, paidOf } from '../src/lib/booking.ts'
import type { AppNotice, Lead } from '../src/lib/types.ts'
import { todayIso } from './plans.ts'
import type { AuditRow, TenantPublic } from './db.ts'
import { DEMO_EMAIL, isAdminEmail } from './constants.ts'

const SKIP = new Set(['admin.overview', 'logout', 'login.fail', 'login.lockout', 'authz.denied'])

const LABELS: Record<string, string> = {
  register: 'Started a 14-day trial',
  'login.ok': 'Signed in',
  'login.demo': 'Opened the demo desk',
  'studio.update': 'Updated the desk',
  'billing.checkout': 'Opened checkout',
  'billing.request': 'Asked to start a paid plan',
  'billing.activate': 'HQ started a paid plan',
  'billing.paid': 'Paid for GoldHour',
  'password.forgot': 'Asked for a password reset',
  'password.reset': 'Changed password',
  'email.verified': 'Confirmed studio email',
  'demo.reset': 'Reset the demo desk',
}

function daysBetween(from: string, to: string) {
  const a = new Date(`${from}T00:00:00`)
  const b = new Date(`${to}T00:00:00`)
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

function followDue(lead: Lead, today: string) {
  return Boolean(
    lead.nextActionOn &&
      lead.nextActionOn <= today &&
      lead.status !== 'completed' &&
      lead.status !== 'lost' &&
      lead.status !== 'booked',
  )
}

function studioHref(action: string, leadId?: string) {
  if (leadId && (action === 'studio.update' || action.startsWith('lead'))) return `/studio/leads/${leadId}`
  if (action.startsWith('billing')) return '/studio/billing'
  if (action === 'studio.update') return '/studio/leads'
  if (action === 'register' || action === 'login.ok' || action === 'email.verified') return '/studio'
  if (action === 'login.demo' || action === 'demo.reset') return '/studio'
  return '/studio/activity'
}

function hqHref(email?: string) {
  if (!email) return '/admin'
  return `/admin?studio=${encodeURIComponent(email)}`
}

function liveStudio(leads: Lead[], billing: { status: string; trialEndsOn: string }): AppNotice[] {
  const today = todayIso()
  const items: AppNotice[] = []
  if (!leads.length) {
    items.push({
      id: 'empty-leads',
      title: 'No enquiries yet',
      body: 'Save the first couple on the desk.',
      href: '/studio/leads?new=1',
      at: `${today}T00:00:00.000Z`,
      sticky: true,
    })
  }
  for (const lead of leads) {
    if (followDue(lead, today)) {
      items.push({
        id: `follow:${lead.id}:${lead.nextActionOn}`,
        title: `Follow up · ${lead.coupleName}`,
        body: lead.nextAction || 'Due on the desk',
        href: `/studio/leads/${lead.id}`,
        at: `${lead.nextActionOn}T08:00:00.000Z`,
        sticky: true,
      })
    }
    if ((lead.status === 'booked' || lead.status === 'accepted') && outstanding(lead) > 0 && paidOf(lead, 'advance') === 0) {
      items.push({
        id: `pay:${lead.id}:${lead.payments.length}`,
        title: `Advance waiting · ${lead.coupleName}`,
        body: 'Record the advance before the date is blocked.',
        href: `/studio/leads/${lead.id}?open=pay`,
        at: lead.createdOn || today,
        sticky: true,
      })
    }
    if (lead.status === 'quoted') {
      items.push({
        id: `quote:${lead.id}:${lead.status}`,
        title: `Quotation open · ${lead.coupleName}`,
        body: 'Still waiting on a yes.',
        href: `/studio/leads/${lead.id}?open=quote`,
        at: lead.createdOn || today,
        sticky: true,
      })
    }
    if (lead.status === 'new') {
      items.push({
        id: `new:${lead.id}`,
        title: `New enquiry · ${lead.coupleName}`,
        body: [lead.venue || lead.city, lead.phone].filter(Boolean).join(' · ') || 'Open the lead',
        href: `/studio/leads/${lead.id}`,
        at: lead.createdOn || today,
        sticky: true,
      })
    }
    if (lead.status === 'booked' && lead.eventDate && daysBetween(today, lead.eventDate) <= 1 && daysBetween(today, lead.eventDate) >= 0) {
      items.push({
        id: `day:${lead.id}:${lead.eventDate}`,
        title: `Wedding soon · ${lead.coupleName}`,
        body: lead.eventDate === today ? 'Today' : 'Tomorrow',
        href: `/studio/leads/${lead.id}`,
        at: `${lead.eventDate}T00:00:00.000Z`,
        sticky: true,
      })
    }
  }
  if (billing.status === 'trialing' && billing.trialEndsOn) {
    const left = daysBetween(today, billing.trialEndsOn)
    if (left >= 0 && left <= 5) {
      items.push({
        id: `trial:${billing.trialEndsOn}`,
        title: left === 0 ? 'Trial ends today' : `Trial ends in ${left} day${left === 1 ? '' : 's'}`,
        body: 'Subscribe so the desk stays on. Studio ₹999 / month.',
        href: '/studio/billing',
        at: `${billing.trialEndsOn}T00:00:00.000Z`,
        sticky: true,
      })
    }
  }
  return items
}

function fromAudit(
  rows: AuditRow[],
  hrefFor: (row: AuditRow) => string,
  titleFor: (row: AuditRow) => string,
): AppNotice[] {
  return rows
    .filter((row) => !SKIP.has(row.action))
    .map((row) => ({
      id: `audit:${row.id}`,
      title: titleFor(row),
      body: row.detail || LABELS[row.action] || row.action,
      href: hrefFor(row),
      at: row.createdAt,
    }))
}

export function studioNotices(opts: {
  leads: Lead[]
  billing: { status: string; trialEndsOn: string }
  audit: AuditRow[]
}): AppNotice[] {
  const live = liveStudio(opts.leads, opts.billing)
  const audit = fromAudit(
    opts.audit,
    (row) => studioHref(row.action),
    (row) => LABELS[row.action] || row.action,
  )
  return [...live, ...audit].slice(0, 40)
}

export function hqNotices(opts: { tenants: TenantPublic[]; audit: AuditRow[] }): AppNotice[] {
  const today = todayIso()
  const byUser = new Map(opts.tenants.map((t) => [t.user.id, t]))
  const byStudio = new Map(opts.tenants.filter((t) => t.studio).map((t) => [t.studio!.id, t]))
  const live: AppNotice[] = []

  for (const t of opts.tenants) {
    if (t.user.email === DEMO_EMAIL || isAdminEmail(t.user.email)) continue
    const email = t.user.email
    const name = t.studio?.name || email
    if (t.sub?.status === 'trialing' && t.sub.trialEndsOn) {
      const left = daysBetween(today, t.sub.trialEndsOn)
      if (left >= 0 && left <= 5) {
        live.push({
          id: `hq-trial:${email}:${t.sub.trialEndsOn}`,
          title: `${name} · trial ending`,
          body: left === 0 ? 'Ends today' : `${left} day${left === 1 ? '' : 's'} left · ${email}`,
          href: hqHref(email),
          at: `${t.sub.trialEndsOn}T00:00:00.000Z`,
          sticky: true,
        })
      }
    }
    const created = t.user.createdAt.slice(0, 10)
    if (created && daysBetween(created, today) <= 2) {
      live.push({
        id: `hq-new:${email}`,
        title: `${name} joined`,
        body: `${email} started a GoldHour desk`,
        href: hqHref(email),
        at: t.user.createdAt,
        sticky: true,
      })
    }
    for (const lead of t.studio?.leads || []) {
      if (followDue(lead, today)) {
        live.push({
          id: `hq-follow:${email}:${lead.id}:${lead.nextActionOn}`,
          title: `${name} · follow-up due`,
          body: lead.coupleName,
          href: hqHref(email),
          at: `${lead.nextActionOn}T08:00:00.000Z`,
          sticky: true,
        })
      }
    }
  }

  const audit = fromAudit(
    opts.audit,
    (row) => {
      const t = (row.userId && byUser.get(row.userId)) || (row.studioId && byStudio.get(row.studioId)) || null
      return hqHref(t?.user.email)
    },
    (row) => {
      const t = (row.userId && byUser.get(row.userId)) || (row.studioId && byStudio.get(row.studioId)) || null
      const who = t?.studio?.name || t?.user.email || 'Studio'
      return `${who} · ${LABELS[row.action] || row.action}`
    },
  )

  return [...live, ...audit].slice(0, 50)
}
