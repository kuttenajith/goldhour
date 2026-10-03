import type { Lead, Quotation, StudioProfile } from '../src/lib/types.ts'
import { day, money, PAYMENT_LABEL, SERVICE_LABEL, SOURCE_LABEL, STATUS_LABEL } from '../src/lib/format.ts'
import { ADMIN_EMAIL, DEMO_EMAIL, isAdminEmail } from './constants.ts'

export { ADMIN_EMAIL, isAdminEmail }

const WEB3FORMS_KEY = process.env.WEB3FORMS_ACCESS_KEY || 'e7e8e974-642c-411f-83ae-999cdbcdbb6e'

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

export async function mailAdmin(subject: string, message: string) {
  if (!WEB3FORMS_KEY) return
  try {
    await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject,
        from_name: 'GoldHour admin',
        name: 'GoldHour admin',
        email: ADMIN_EMAIL,
        botcheck: false,
        kind: 'admin',
        message,
      }),
    })
  } catch {
    /* never block the studio desk */
  }
}

export function notifyStudioSignup(studio: StudioProfile, email: string) {
  if (isAdminEmail(email) || email === DEMO_EMAIL) return
  void mailAdmin(
    `[GOLDHOUR STUDIO] ${studio.name} signed up`,
    [
      'A photographer opened a GoldHour studio account.',
      '',
      `Studio: ${studio.name}`,
      `Owner: ${studio.owner || '—'}`,
      `City: ${studio.city || '—'}`,
      `Phone: ${studio.phone || '—'}`,
      `Email: ${email}`,
      `When: ${new Date().toISOString()}`,
    ].join('\n'),
  )
}

export function notifyLeadChanges(opts: {
  email: string
  studio: StudioProfile
  before: Lead[]
  after: Lead[]
  quotationsBefore?: Quotation[]
  quotationsAfter?: Quotation[]
}) {
  if (isAdminEmail(opts.email) || opts.email === DEMO_EMAIL) return
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
  void mailAdmin(`[GOLDHOUR EVENT] ${opts.studio.name} · ${headline}`, blocks.join('\n'))
}

export function notifyPaid(studio: StudioProfile, email: string, plan: string, amountPaise: number) {
  if (isAdminEmail(email) || email === DEMO_EMAIL) return
  void mailAdmin(
    `[GOLDHOUR PAID] ${studio.name} · ${plan}`,
    [
      'A studio paid for GoldHour.',
      '',
      `Studio: ${studio.name}`,
      `Email: ${email}`,
      `Plan: ${plan}`,
      `Amount: ₹${Math.round(amountPaise / 100)}`,
      `When: ${new Date().toISOString()}`,
    ].join('\n'),
  )
}
