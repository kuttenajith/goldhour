import { id } from './ids.ts'
import type { Lead, LeadStatus, PaymentKind, PaymentPlan, TimelineSlot, WeddingEvent } from './types.ts'

export const FUNCTION_NAMES = ['Engagement', 'Mehendi', 'Wedding', 'Reception'] as const

export const PIPELINE: LeadStatus[] = ['new', 'quoted', 'accepted', 'booked']

export function splitPlan(total: number): PaymentPlan {
  const safe = Math.max(0, total)
  const advance = Math.round(safe * 0.25)
  const rest = safe - advance
  const beforeWedding = Math.round(rest / 2)
  return {
    advance,
    beforeWedding,
    finalDelivery: safe - advance - beforeWedding,
  }
}

export function defaultWeddingTimeline(): TimelineSlot[] {
  return [
    { id: id(), time: '06:00', title: 'Bride getting ready' },
    { id: id(), time: '08:00', title: 'Groom prep' },
    { id: id(), time: '10:00', title: 'Ceremony' },
    { id: id(), time: '13:00', title: 'Lunch' },
    { id: id(), time: '16:00', title: 'Reception' },
    { id: id(), time: '19:00', title: 'Couple portraits' },
  ]
}

export function defaultEvents(weddingDate: string, selected: string[] = ['Wedding']): WeddingEvent[] {
  return FUNCTION_NAMES.map((name) => ({
    id: id(),
    name,
    date: name === 'Wedding' ? weddingDate : '',
    done: false,
    timeline: name === 'Wedding' && selected.includes(name) ? defaultWeddingTimeline() : [],
  })).filter((ev) => selected.includes(ev.name) || ev.name === 'Wedding')
}

export function paidOf(lead: Lead, kind: PaymentKind) {
  return lead.payments.filter((p) => p.kind === kind).reduce((sum, p) => sum + p.amount, 0)
}

export function stageDue(lead: Lead, kind: Exclude<PaymentKind, 'extra'>) {
  if (kind === 'advance') return lead.plan.advance
  if (kind === 'before_wedding') return lead.plan.beforeWedding
  return lead.plan.finalDelivery
}

export function outstanding(lead: Lead) {
  return Math.max(0, lead.packageAmount - lead.payments.reduce((sum, p) => sum + p.amount, 0))
}

export function weddingEvent(lead: Lead) {
  return lead.events.find((ev) => ev.name === 'Wedding') ?? lead.events[0]
}

const LEGACY_STATUS: Record<string, LeadStatus> = {
  advance_pending: 'accepted',
}

const LEGACY_KIND: Record<string, PaymentKind> = {
  balance: 'final_delivery',
}

export function normalizeLead(raw: Lead): Lead {
  const status = LEGACY_STATUS[raw.status] ?? raw.status
  const packageAmount = raw.packageAmount || raw.budget || 0
  const events = (raw.events ?? []).map((ev) => ({
    ...ev,
    timeline: ev.timeline ?? (ev.name === 'Wedding' ? defaultWeddingTimeline() : []),
  }))
  return {
    ...raw,
    venue: raw.venue ?? '',
    status,
    packageAmount,
    plan: raw.plan ?? splitPlan(packageAmount),
    events: events.length ? events : defaultEvents(raw.eventDate),
    payments: (raw.payments ?? []).map((p) => ({
      ...p,
      kind: LEGACY_KIND[p.kind] ?? p.kind,
    })),
  }
}
