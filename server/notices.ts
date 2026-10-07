import { outstanding, paidOf } from '../src/lib/booking.ts'
import type { AppNotice, Lead } from '../src/lib/types.ts'
import { dateClashes, morningBrief, staleQuotes } from '../src/lib/studioPulse.ts'
import { pendingPlanRequest, planTitle } from './planRequests.ts'
import type { AuditRow, TenantPublic } from './db.ts'
import { DEMO_EMAIL, isAdminEmail } from './constants.ts'
import { toDay, toIso } from './iso.ts'
import { billingStatus, todayIso } from './plans.ts'

const SKIP = new Set(['admin.overview', 'admin.sms-key', 'admin.export', 'logout', 'login.fail', 'login.lockout', 'authz.denied'])

const LABELS: Record<string, string> = {
  register: 'Started a 14-day trial',
  'login.ok': 'Signed in',
  'login.demo': 'Opened the demo desk',
  'studio.update': 'Updated the desk',
  'lead.create': 'New enquiry',
  'lead.update': 'Updated an enquiry',
  'lead.remove': 'Removed an enquiry',
  'billing.checkout': 'Opened checkout',
  'billing.request': 'Asked to start a paid plan',
  'billing.activate': 'HQ started a paid plan',
  'billing.paid': 'Paid for GoldHour',
  'desk.remove': 'HQ removed a studio desk',
  'desk.restore': 'HQ restored a studio desk',
  'login.removed': 'Tried to sign in after HQ removed the desk',
  'password.forgot': 'Asked for a password reset',
  'password.reset': 'Changed password',
  'email.verified': 'Confirmed studio email',
  'demo.reset': 'Reset the demo desk',
}

function asIso(value: unknown) {
  return toIso(value)
}

function asDay(value: unknown) {
  return toDay(value)
}

function daysBetween(from: string, to: string) {
  const a = new Date(`${asDay(from)}T00:00:00`)
  const b = new Date(`${asDay(to)}T00:00:00`)
  const n = Math.round((b.getTime() - a.getTime()) / 86400000)
  return Number.isFinite(n) ? n : 99
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

export function hqPlanRequestId(email: string, plan: string) {
  return `hq-request:${email}:${plan}`
}

function leadSummary(lead: Lead) {
  return [
    lead.phone || 'no phone',
    lead.eventDate ? `wedding ${lead.eventDate}` : 'date pending',
    lead.venue || lead.city || 'venue pending',
    lead.budget ? `budget ₹${lead.budget}` : '',
    lead.notes ? lead.notes.slice(0, 160) : '',
    lead.createdOn ? `entered ${lead.createdOn}` : '',
  ]
    .filter(Boolean)
    .join(' · ')
}

export function hqLeadNoticeId(email: string, leadId: string) {
  return `hq-lead:${email}:${leadId}`
}

function liveStudio(
  leads: Lead[],
  billing: { status: string; trialEndsOn: string; periodEndsOn?: string | null; plan?: string },
  pro: boolean,
): AppNotice[] {
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
        body: leadSummary(lead),
        href: `/studio/leads/${lead.id}`,
        at: lead.createdOn || today,
        sticky: true,
      })
    } else {
      items.push({
        id: `lead:${lead.id}`,
        title: `${lead.coupleName} · ${lead.status.replace(/_/g, ' ')}`,
        body: leadSummary(lead),
        href: `/studio/leads/${lead.id}`,
        at: lead.createdOn || today,
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
  if (pro) {
    const brief = morningBrief(leads, today)
    if (brief.follow || brief.clashes || brief.stale || brief.unpaid) {
      items.push({
        id: `brief:${today}`,
        title: 'Morning briefing',
        body: `${brief.follow} follow-ups · ${brief.clashes} date clashes · ${brief.stale} quiet quotes`,
        href: '/studio/activity',
        at: `${today}T06:00:00.000Z`,
        sticky: true,
      })
    }
    for (const clash of dateClashes(leads)) {
      items.push({
        id: `clash:${clash.date}`,
        title: `Date clash · ${clash.date}`,
        body: clash.leads.map((l) => l.coupleName).join(' · '),
        href: '/studio/calendar',
        at: `${clash.date}T00:00:00.000Z`,
        sticky: true,
      })
    }
    for (const lead of staleQuotes(leads, today)) {
      items.push({
        id: `stale:${lead.id}:${lead.nextActionOn || lead.createdOn}`,
        title: `Quiet quote · ${lead.coupleName}`,
        body: 'No yes for 3+ days. Send the follow-up from WhatsApp desk.',
        href: `/studio/leads/${lead.id}`,
        at: lead.nextActionOn || lead.createdOn || today,
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
  if (billing.status === 'active' && billing.periodEndsOn) {
    const left = daysBetween(today, billing.periodEndsOn)
    if (left >= 0 && left <= 5) {
      const name = planTitle(billing.plan || 'studio')
      items.push({
        id: `period:${billing.periodEndsOn}`,
        title: left === 0 ? `${name} ends today` : `${name} ends in ${left} day${left === 1 ? '' : 's'}`,
        body: 'Renew this plan or move to Pro. Leads and quotes stay saved.',
        href: '/studio/billing',
        at: `${asDay(billing.periodEndsOn)}T00:00:00.000Z`,
        sticky: true,
      })
    }
  }
  if (billing.status === 'expired') {
    const ended = billing.periodEndsOn || billing.trialEndsOn
    items.push({
      id: `ended:${ended || 'now'}`,
      title: billing.periodEndsOn ? 'Your month ended' : 'Trial ended',
      body: 'Leads and quotes are saved. Renew Studio or move to Pro to open the desk.',
      href: '/studio/billing',
      at: `${asDay(ended || today)}T00:00:00.000Z`,
      sticky: true,
    })
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
  billing: { status: string; trialEndsOn: string; periodEndsOn?: string | null; plan?: string }
  audit: AuditRow[]
  pro?: boolean
}): AppNotice[] {
  const live = liveStudio(opts.leads, opts.billing, Boolean(opts.pro))
  const audit = fromAudit(
    opts.audit,
    (row) => studioHref(row.action),
    (row) => LABELS[row.action] || row.action,
  )
  return [...live, ...audit].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 200)
}

export function hqNotices(opts: { tenants: TenantPublic[]; audit: AuditRow[]; inbox?: AppNotice[] }): AppNotice[] {
  const today = todayIso()
  const byUser = new Map(opts.tenants.map((t) => [t.user.id, t]))
  const byStudio = new Map(opts.tenants.filter((t) => t.studio).map((t) => [t.studio!.id, t]))
  const live: AppNotice[] = []

  for (const t of opts.tenants) {
    try {
      if (t.user.email === DEMO_EMAIL || isAdminEmail(t.user.email) || t.user.deletedAt) continue
      const email = t.user.email
      const name = t.studio?.name || email
      const billing = t.sub
        ? billingStatus(t.sub)
        : { plan: 'trial', status: 'trialing' as const, trialEndsOn: '', periodEndsOn: null, active: false }
      const pending = pendingPlanRequest({
        userId: t.user.id,
        studioId: t.studio?.id,
        currentPlan: billing.plan,
        status: billing.status,
        stored: t.sub?.requestedPlan,
        audit: opts.audit,
      })
      if (pending) {
        const renew = pending.plan === billing.plan && (billing.plan === 'studio' || billing.plan === 'studio_pro')
        live.push({
          id: hqPlanRequestId(email, pending.plan),
          title: renew ? `${name} asked to renew ${planTitle(pending.plan)}` : `${name} asked for ${planTitle(pending.plan)}`,
          body: `${email} · open HQ and switch the desk`,
          href: hqHref(email),
          at: pending.at,
          sticky: true,
        })
      }
      if (billing.status === 'trialing' && billing.trialEndsOn) {
        const left = daysBetween(today, billing.trialEndsOn)
        if (left >= 0 && left <= 5) {
          live.push({
            id: `hq-trial:${email}:${billing.trialEndsOn}`,
            title: `${name} · trial ending`,
            body: left === 0 ? 'Ends today' : `${left} day${left === 1 ? '' : 's'} left · ${email}`,
            href: hqHref(email),
            at: `${asDay(billing.trialEndsOn)}T00:00:00.000Z`,
            sticky: true,
          })
        }
      }
      if (billing.status === 'active' && billing.periodEndsOn) {
        const left = daysBetween(today, billing.periodEndsOn)
        if (left >= 0 && left <= 5) {
          live.push({
            id: `hq-period:${email}:${billing.periodEndsOn}`,
            title: `${name} · ${planTitle(billing.plan)} ending`,
            body: left === 0 ? 'Ends today · they can renew from billing' : `${left} day${left === 1 ? '' : 's'} left · ${email}`,
            href: hqHref(email),
            at: `${asDay(billing.periodEndsOn)}T00:00:00.000Z`,
            sticky: true,
          })
        }
      }
      if (billing.status === 'expired') {
        live.push({
          id: `hq-expired:${email}:${billing.periodEndsOn || billing.trialEndsOn || 'ended'}`,
          title: `${name} · ${planTitle(billing.plan || 'studio')} month ended`,
          body: `${email} · desk locked · they can renew or move to Pro`,
          href: hqHref(email),
          at: `${asDay(billing.periodEndsOn || billing.trialEndsOn || today)}T00:00:00.000Z`,
          sticky: true,
        })
      }
      live.push({
        id: `hq-new:${email}`,
        title: `${name} joined`,
        body: [email, t.studio?.phone, t.studio?.city, 'started a GoldHour desk'].filter(Boolean).join(' · '),
        href: hqHref(email),
        at: asIso(t.user.createdAt) || new Date().toISOString(),
        sticky: true,
      })
      const leads = Array.isArray(t.studio?.leads) ? t.studio.leads : []
      const quotes = Array.isArray(t.studio?.quotations) ? t.studio.quotations : []
      for (const lead of leads) {
        live.push({
          id: hqLeadNoticeId(email, lead.id),
          title: `${name} · ${lead.status === 'new' ? 'new enquiry' : lead.status.replace(/_/g, ' ')} · ${lead.coupleName}`,
          body: leadSummary(lead),
          href: hqHref(email),
          at: lead.createdOn || asIso(t.user.createdAt) || today,
          sticky: lead.status === 'new',
        })
        if (followDue(lead, today)) {
          live.push({
            id: `hq-follow:${email}:${lead.id}:${lead.nextActionOn}`,
            title: `${name} · follow-up due`,
            body: `${lead.coupleName} · ${leadSummary(lead)}`,
            href: hqHref(email),
            at: `${lead.nextActionOn}T08:00:00.000Z`,
            sticky: true,
          })
        }
      }
      for (const quote of quotes) {
        live.push({
          id: `hq-quote:${email}:${quote.id}`,
          title: `${name} · quotation · ${quote.packageName}`,
          body: `₹${quote.amount}${quote.notes ? ` · ${quote.notes.slice(0, 120)}` : ''} · ${quote.createdOn || ''}`,
          href: hqHref(email),
          at: quote.createdOn || today,
        })
      }
    } catch (err) {
      console.error('goldhour-hq-notice-tenant', t.user?.email, err)
    }
  }

  let audit: AppNotice[] = []
  try {
    audit = fromAudit(
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
  } catch (err) {
    console.error('goldhour-hq-notice-audit', err)
  }

  const seen = new Set<string>()
  const merged: AppNotice[] = []
  for (const notice of [...(opts.inbox || []), ...live, ...audit]) {
    if (!notice?.id || seen.has(notice.id)) continue
    seen.add(notice.id)
    merged.push({ ...notice, at: asIso(notice.at) || String(notice.at || '') })
  }
  return merged.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 200)
}
