import { useSyncExternalStore } from 'react'
import { normalizeLead } from './booking.ts'
import { seedState } from './seed.ts'
import type { Lead, Payment, Quotation, StudioProfile, StudioState } from './types.ts'

const KEY = 'goldhour.studio.v2'
const SESSION = 'goldhour.session'
const ONBOARD = 'goldhour.onboarded.v1'

let memory = read()
const listeners = new Set<() => void>()

function hydrate(raw: StudioState): StudioState {
  return {
    ...raw,
    leads: raw.leads.map(normalizeLead),
  }
}

function read(): StudioState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return seedState()
    return hydrate(JSON.parse(raw) as StudioState)
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

export function needsOnboarding() {
  return localStorage.getItem(ONBOARD) !== '1'
}

export function completeOnboarding() {
  localStorage.setItem(ONBOARD, '1')
}

export function resetDemo() {
  localStorage.removeItem(ONBOARD)
  write(seedState())
}

export function updateStudio(patch: Partial<StudioProfile>) {
  write({ ...memory, studio: { ...memory.studio, ...patch } })
}

export function upsertLead(lead: Lead) {
  const next = normalizeLead(lead)
  const exists = memory.leads.some((l) => l.id === next.id)
  write({
    ...memory,
    leads: exists
      ? memory.leads.map((l) => (l.id === next.id ? next : l))
      : [next, ...memory.leads],
  })
}

export function patchLead(leadId: string, patch: Partial<Lead> | ((lead: Lead) => Lead)) {
  write({
    ...memory,
    leads: memory.leads.map((l) => {
      if (l.id !== leadId) return l
      const next = typeof patch === 'function' ? patch(l) : { ...l, ...patch }
      return normalizeLead(next)
    }),
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
  patchLead(leadId, (l) => ({ ...l, payments: [...l.payments, payment] }))
}

export function addQuotation(quotation: Quotation) {
  write({
    ...memory,
    quotations: [quotation, ...memory.quotations],
  })
}

export function setNextAction(leadId: string, nextAction: string, nextActionOn: string, status?: Lead['status']) {
  patchLead(leadId, (l) => ({
    ...l,
    nextAction,
    nextActionOn,
    status: status ?? l.status,
  }))
}
