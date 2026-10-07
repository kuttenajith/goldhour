import type { Lead, Quotation, StudioProfile } from '../src/lib/types.ts'
import { day, money, PAYMENT_LABEL, SERVICE_LABEL, SOURCE_LABEL, STATUS_LABEL } from '../src/lib/format.ts'
import { isAdminEmail } from './constants.ts'
import { mailAdmin, mailUser } from './mail.ts'
import { hqJoinNotice, hqLeadItem, pushHqNotice } from './noticeMail.ts'
import { hqPlanRequestId } from './notices.ts'
import { demoFollowLetter, trialWelcomeLetter } from './letters.ts'

export { isAdminEmail }

function leadFingerprint(lead: Lead) {
  return JSON.stringify({
    coupleName: lead.coupleName,
    phone: lead.phone,
    eventDate: lead.eventDate,
    venue: lead.venue,
    city: lead.city,
    budget: lead.budget,
    packageAmount: lead.packageAmount,
    status: lead.status,
    service: lead.service,
    source: lead.source,
    notes: lead.notes,
    nextAction: lead.nextAction,
    nextActionOn: lead.nextActionOn,
    events: lead.events,
    payments: lead.payments,
    plan: lead.plan,
  })
}

export function formatLead(lead: Lead) {
  const events = (lead.events || [])
    .map((ev) => {
      const slots = (ev.timeline || []).map((s) => `    ${s.time} ${s.title}`).join('\n')
      return `  - ${ev.name}${ev.date ? ` · ${day(ev.date)}` : ''}${ev.done ? ' (done)' : ''}${slots ? `\n${slots}` : ''}`
    })
    .join('\n')
  const pays = (lead.payments || [])
    .map((p) => `  - ${PAYMENT_LABEL[p.kind] || p.kind} ${money(p.amount)} on ${p.receivedOn}${p.note ? ` (${p.note})` : ''}`)
    .join('\n')
  return [
    `Couple: ${lead.coupleName}`,
    `Entered: ${lead.createdOn ? day(lead.createdOn) : '—'}`,
    `Phone: ${lead.phone || '—'}`,
    `Wedding date: ${lead.eventDate ? day(lead.eventDate) : '—'} (${lead.eventDate || '—'})`,
    `Venue: ${lead.venue || '—'}`,
    `City: ${lead.city || '—'}`,
    `Service: ${SERVICE_LABEL[lead.service] || lead.service}`,
    `Source: ${SOURCE_LABEL[lead.source] || lead.source}`,
    `Status: ${STATUS_LABEL[lead.status] || lead.status}`,
    `Budget: ${money(lead.budget || 0)}`,
    `Package: ${money(lead.packageAmount || 0)}`,
    `Payment plan: advance ${money(lead.plan?.advance || 0)} · before wedding ${money(lead.plan?.beforeWedding || 0)} · final ${money(lead.plan?.finalDelivery || 0)}`,
    `Next action: ${lead.nextAction || '—'} (${lead.nextActionOn || '—'})`,
    `Notes: ${lead.notes || '—'}`,
    `Events:\n${events || '  —'}`,
    `Payments received:\n${pays || '  —'}`,
  ].join('\n')
}

function block(studio: StudioProfile, email: string, extra: string[]) {
  return [
    `Studio: ${studio.name}`,
    `Owner: ${studio.owner || '—'}`,
    `City: ${studio.city || '—'}`,
    `Phone: ${studio.phone || '—'}`,
    `Email: ${email}`,
    `When: ${new Date().toISOString()}`,
    '',
    ...extra,
  ].join('\n')
}

export async function notifyHq(subject: string, message: string, replyTo?: string, html?: string) {
  return mailAdmin(subject, message, replyTo, html)
}

export async function notifyStudioSignup(studio: StudioProfile, email: string) {
  if (isAdminEmail(email)) return
  await pushHqNotice(
    hqJoinNotice({
      email,
      name: studio.name,
      phone: studio.phone,
      city: studio.city,
      owner: studio.owner,
    }),
  )
}

export async function notifyTrialWelcome(opts: {
  email: string
  studio: StudioProfile
  trialEndsOn: string
  verifyUrl: string
}) {
  if (isAdminEmail(opts.email)) return
  const letter = trialWelcomeLetter({
    owner: opts.studio.owner || opts.studio.name,
    studio: opts.studio.name,
    city: opts.studio.city,
    trialEndsOn: opts.trialEndsOn,
    verifyUrl: opts.verifyUrl,
  })
  await mailUser(opts.email, letter.subject, letter.text)
}

export async function notifyDemoOpened(opts: { ip: string; visitorEmail?: string }) {
  const visitor = opts.visitorEmail || 'not left'
  await notifyHq(
    `[GOLDHOUR DEMO] Meenakshi Frames opened`,
    [
      'Someone opened the sample demo desk.',
      '',
      `Visitor email: ${visitor}`,
      `IP: ${opts.ip}`,
      `When: ${new Date().toISOString()}`,
    ].join('\n'),
    opts.visitorEmail,
  )
  if (!opts.visitorEmail) return
  const letter = demoFollowLetter()
  await mailUser(opts.visitorEmail, letter.subject, letter.text)
}

export async function notifyLogin(opts: { email: string; studio: StudioProfile; ip: string; demo?: boolean }) {
  if (isAdminEmail(opts.email)) return
  await notifyHq(
    `[GOLDHOUR LOGIN] ${opts.studio.name}${opts.demo ? ' · demo' : ''}`,
    block(opts.studio, opts.email, [`Signed in${opts.demo ? ' on the demo desk' : ''}.`, `IP: ${opts.ip}`]),
    opts.email,
  )
}

export async function notifyCheckout(studio: StudioProfile, email: string, plan: string) {
  if (isAdminEmail(email)) return
  await notifyHq(
    `[GOLDHOUR CHECKOUT] ${studio.name} · ${plan}`,
    block(studio, email, [`Opened Razorpay for ${plan}.`]),
    email,
  )
}

export async function notifyLeadChanges(opts: {
  email: string
  studio: StudioProfile
  before: Lead[]
  after: Lead[]
  quotationsBefore?: Quotation[]
  quotationsAfter?: Quotation[]
}) {
  if (isAdminEmail(opts.email)) return
  const prev = new Map(opts.before.map((l) => [l.id, l]))
  const next = new Map(opts.after.map((l) => [l.id, l]))
  const added = opts.after.filter((l) => !prev.has(l.id))
  const removed = opts.before.filter((l) => !next.has(l.id))
  const changed = opts.after.filter((l) => {
    const old = prev.get(l.id)
    return old && leadFingerprint(old) !== leadFingerprint(l)
  })
  const quotesChanged =
    JSON.stringify(opts.quotationsBefore || []) !== JSON.stringify(opts.quotationsAfter || [])
  if (!added.length && !removed.length && !changed.length && !quotesChanged) return

  const blocks: string[] = [
    `Studio: ${opts.studio.name}`,
    `Owner: ${opts.studio.owner || '—'}`,
    `City: ${opts.studio.city || '—'}`,
    `Studio phone: ${opts.studio.phone || '—'}`,
    `Studio email: ${opts.email}`,
    `When: ${new Date().toISOString()}`,
    '',
  ]

  for (const lead of added) {
    blocks.push('NEW WEDDING / EVENT', formatLead(lead), '')
  }
  for (const lead of changed) {
    const old = prev.get(lead.id)
    blocks.push(
      `UPDATED · ${old?.status || '—'} → ${lead.status} · ${lead.coupleName}`,
      formatLead(lead),
      '',
    )
  }
  for (const lead of removed) {
    blocks.push('REMOVED', formatLead(lead), '')
  }
  if (quotesChanged) {
    const quotes = opts.quotationsAfter || []
    blocks.push(
      'QUOTATIONS',
      quotes.length
        ? quotes
            .map((q) => `  - ${q.packageName} ${money(q.amount)} on ${q.createdOn}${q.notes ? ` (${q.notes})` : ''}`)
            .join('\n')
        : '  —',
      '',
    )
  }

  for (const lead of [...added, ...changed]) {
    await pushHqNotice(hqLeadItem(opts.email, opts.studio.name, lead))
  }
  if (!added.length && (removed.length || quotesChanged)) {
    await notifyHq(`[GOLDHOUR] ${opts.studio.name} · desk update`, blocks.join('\n'), opts.email)
  }
}

export async function notifyPlanRequest(opts: {
  email: string
  studio: StudioProfile
  plan: string
  current: string
}) {
  if (isAdminEmail(opts.email)) return
  const want = opts.plan === 'studio_pro' ? 'Studio Pro' : 'Studio'
  const href = `/admin?studio=${encodeURIComponent(opts.email)}`
  const renew = opts.current === opts.plan && (opts.current === 'studio' || opts.current === 'studio_pro')
  const title = renew ? `${opts.studio.name} asked to renew ${want}` : `${opts.studio.name} asked for ${want}`
  const body = `${opts.email} · payment not received yet · you can still grant ${want}`
  await pushHqNotice({
    id: hqPlanRequestId(opts.email, opts.plan),
    title,
    body,
    href,
    at: new Date().toISOString(),
    sticky: true,
  })
}

export async function notifyPlanApproved(studio: StudioProfile, email: string, plan: string) {
  if (isAdminEmail(email)) return
  const name = plan === 'studio_pro' ? 'Studio Pro' : 'Studio'
  await notifyHq(
    `[GOLDHOUR APPROVED] ${studio.name} is now on ${name}`,
    block(studio, email, [`HQ switched this desk to ${name}.`]),
    email,
  )
}

export async function notifyPaid(studio: StudioProfile, email: string, plan: string, amountPaise: number, paymentId?: string) {
  if (isAdminEmail(email)) return
  const want = plan === 'studio_pro' ? 'Studio Pro' : 'Studio'
  const rupees = Math.round(amountPaise / 100)
  await pushHqNotice({
    id: `hq-paid:${email}:${paymentId || plan}`,
    title: `${studio.name} paid for ${want}`,
    body: `₹${rupees} · Razorpay complete · desk is live on ${want}. No HQ approval needed.`,
    href: `/admin?studio=${encodeURIComponent(email)}`,
    at: new Date().toISOString(),
    sticky: true,
  })
}

export async function notifySimple(opts: {
  email: string
  studio?: StudioProfile
  subject: string
  detail: string
}) {
  if (isAdminEmail(opts.email)) return
  const studio = opts.studio
  const body = studio
    ? block(studio, opts.email, [opts.detail])
    : [`Email: ${opts.email}`, opts.detail, `When: ${new Date().toISOString()}`].join('\n')
  await notifyHq(opts.subject, body, opts.email)
}
