import type { Lead, LeadSource, LeadStatus, PaymentKind, Quotation, ServiceType, StudioProfile } from '../src/lib/types.ts'
import { normalizeLead } from '../src/lib/booking.ts'
import { STUDIO_MAX_BYTES } from './constants.ts'

const STATUS: LeadStatus[] = ['new', 'quoted', 'follow_up', 'no_response', 'accepted', 'booked', 'completed', 'lost']
const SOURCE: LeadSource[] = ['instagram', 'whatsapp', 'referral', 'google', 'exhibition', 'planner']
const SERVICE: ServiceType[] = ['photography', 'cinematography', 'both']
const KIND: PaymentKind[] = ['advance', 'before_wedding', 'final_delivery', 'extra']

function text(value: unknown, max: number) {
  return String(value ?? '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function money(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < 0 || n > 99_999_999) return 0
  return Math.round(n)
}

function isoDate(value: unknown) {
  const s = String(value ?? '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''
}

function uuid(value: unknown) {
  const s = String(value ?? '')
  return /^[0-9a-f-]{8,36}$/i.test(s) ? s : ''
}

export function validateStudioProfile(raw: unknown): StudioProfile | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const name = text(row.name, 80)
  if (name.length < 2) return null
  return {
    name,
    owner: text(row.owner, 80),
    city: text(row.city, 60),
    phone: text(row.phone, 20).replace(/[^\d+\s-]/g, ''),
    tagline: text(row.tagline, 120) || 'Wedding photography',
  }
}

export function validateLeads(raw: unknown): Lead[] {
  if (!Array.isArray(raw)) return []
  return raw.slice(0, 400).map((item) => {
    const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
    const status = STATUS.includes(row.status as LeadStatus) ? (row.status as LeadStatus) : 'new'
    const source = SOURCE.includes(row.source as LeadSource) ? (row.source as LeadSource) : 'whatsapp'
    const service = SERVICE.includes(row.service as ServiceType) ? (row.service as ServiceType) : 'photography'
    const planRaw = row.plan && typeof row.plan === 'object' ? (row.plan as Record<string, unknown>) : {}
    const events = Array.isArray(row.events)
      ? row.events.slice(0, 12).map((ev) => {
          const e = (ev && typeof ev === 'object' ? ev : {}) as Record<string, unknown>
          return {
            id: uuid(e.id) || crypto.randomUUID(),
            name: text(e.name, 80) || 'Event',
            date: isoDate(e.date),
            done: Boolean(e.done),
            timeline: Array.isArray(e.timeline)
              ? e.timeline.slice(0, 24).map((slot) => {
                  const s = (slot && typeof slot === 'object' ? slot : {}) as Record<string, unknown>
                  return {
                    id: uuid(s.id) || crypto.randomUUID(),
                    time: text(s.time, 8),
                    title: text(s.title, 80),
                  }
                })
              : [],
          }
        })
      : []
    const payments = Array.isArray(row.payments)
      ? row.payments.slice(0, 40).map((p) => {
          const pay = (p && typeof p === 'object' ? p : {}) as Record<string, unknown>
          return {
            id: uuid(pay.id) || crypto.randomUUID(),
            amount: money(pay.amount),
            kind: KIND.includes(pay.kind as PaymentKind) ? (pay.kind as PaymentKind) : 'advance',
            receivedOn: isoDate(pay.receivedOn),
            note: text(pay.note, 160),
          }
        })
      : []
    return normalizeLead({
      id: uuid(row.id) || crypto.randomUUID(),
      coupleName: text(row.coupleName, 80) || 'Couple',
      phone: text(row.phone, 20).replace(/[^\d+\s-]/g, ''),
      eventDate: isoDate(row.eventDate),
      venue: text(row.venue, 120),
      budget: money(row.budget),
      service,
      source,
      status,
      packageAmount: money(row.packageAmount),
      plan: {
        advance: money(planRaw.advance),
        beforeWedding: money(planRaw.beforeWedding),
        finalDelivery: money(planRaw.finalDelivery),
      },
      city: text(row.city, 60),
      notes: text(row.notes, 2000),
      events,
      payments,
      nextAction: text(row.nextAction, 160),
      nextActionOn: isoDate(row.nextActionOn),
      createdOn: isoDate(row.createdOn) || new Date().toISOString().slice(0, 10),
    })
  })
}

export function validateQuotations(raw: unknown): Quotation[] {
  if (!Array.isArray(raw)) return []
  return raw.slice(0, 400).map((item) => {
    const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
    return {
      id: uuid(row.id) || crypto.randomUUID(),
      leadId: uuid(row.leadId),
      packageName: text(row.packageName, 80) || 'Package',
      amount: money(row.amount),
      createdOn: isoDate(row.createdOn) || new Date().toISOString().slice(0, 10),
      notes: text(row.notes, 1000),
    }
  })
}

export function studioPayloadTooLarge(body: unknown) {
  try {
    return JSON.stringify(body).length > STUDIO_MAX_BYTES
  } catch {
    return true
  }
}

export function emailOk(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 120
}

export function passwordOk(value: string) {
  return value.length >= 8 && value.length <= 128
}
