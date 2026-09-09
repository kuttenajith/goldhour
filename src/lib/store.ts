import { useSyncExternalStore } from 'react'
import { seedState } from './seed.ts'
import type { Lead, Payment, Quotation, StudioProfile, StudioState } from './types.ts'

const KEY = 'goldhour.studio.v1'
const SESSION = 'goldhour.session'

let memory = read()
const listeners = new Set<() => void>()

function read(): StudioState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return seedState()
    return JSON.parse(raw) as StudioState
  } catch {
    return seedState()
  }
}

function write(next: StudioState) {
  memory = next
  localStorage.setItem(KEY, JSON.stringify(next))
  listeners.forEach((fn) => fn())
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function snapshot() {
  return memory
}

export function useStudio() {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

export function isAuthed() {
  return sessionStorage.getItem(SESSION) === '1'
}

export function loginStudio() {
  sessionStorage.setItem(SESSION, '1')
}

export function logoutStudio() {
  sessionStorage.removeItem(SESSION)
}

export function resetDemo() {
  const seeded = seedState()
  write(seeded)
}

export function updateStudio(patch: Partial<StudioProfile>) {
  write({ ...memory, studio: { ...memory.studio, ...patch } })
}

export function upsertLead(lead: Lead) {
  const exists = memory.leads.some((l) => l.id === lead.id)
  write({
    ...memory,
    leads: exists
      ? memory.leads.map((l) => (l.id === lead.id ? lead : l))
      : [lead, ...memory.leads],
  })
}

export function removeLead(id: string) {
  write({
    ...memory,
    leads: memory.leads.filter((l) => l.id !== id),
    quotations: memory.quotations.filter((q) => q.leadId !== id),
  })
}

export function addPayment(leadId: string, payment: Payment) {
  write({
    ...memory,
    leads: memory.leads.map((l) =>
      l.id === leadId ? { ...l, payments: [...l.payments, payment] } : l,
    ),
  })
}

export function addQuotation(quotation: Quotation) {
  write({
    ...memory,
    quotations: [quotation, ...memory.quotations],
  })
}

export function setNextAction(leadId: string, nextAction: string, nextActionOn: string) {
  write({
    ...memory,
    leads: memory.leads.map((l) =>
      l.id === leadId ? { ...l, nextAction, nextActionOn } : l,
    ),
  })
}
