import type { Lead, Quotation, StudioProfile } from '../src/lib/types.ts'
import { day, money, PAYMENT_LABEL, SERVICE_LABEL, SOURCE_LABEL, STATUS_LABEL } from '../src/lib/format.ts'
import { isAdminEmail } from './constants.ts'
import { mailAdmin, mailUser } from './mail.ts'
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

export async function notifyHq(subject: string, message: string, replyTo?: string) {
  await mailAdmin(subject, message, replyTo)
}

export async function notifyStudioSignup(studio: StudioProfile, email: string) {
  if (isAdminEmail(email)) return
  await notifyHq(
    `[GOLDHOUR STUDIO] ${studio.name} started a 14-day trial`,
    block(studio, email, ['A photographer opened a GoldHour trial desk.']),
    email,
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

  const headline = added[0]?.coupleName || changed[0]?.coupleName || removed[0]?.coupleName || opts.studio.name
  await notifyHq(`[GOLDHOUR EVENT] ${opts.studio.name} · ${headline}`, blocks.join('\n'), opts.email)
}

export async function notifyPaid(studio: StudioProfile, email: string, plan: string, amountPaise: number) {
  if (isAdminEmail(email)) return
  await notifyHq(
    `[GOLDHOUR PAID] ${studio.name} · ${plan}`,
    block(studio, email, [`Plan: ${plan}`, `Amount: ₹${Math.round(amountPaise / 100)}`]),
    email,
  )
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
