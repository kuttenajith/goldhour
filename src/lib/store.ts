import { useSyncExternalStore } from 'react'
import { normalizeLead } from './booking.ts'
import type { Lead, Payment, Quotation, StudioProfile, StudioSnapshot } from './types.ts'

const EMPTY: StudioSnapshot = {
  email: '',
  isDemo: false,
  onboarded: true,
  studio: { name: '', owner: '', city: '', phone: '', tagline: '' },
  leads: [],
  quotations: [],
  billing: {
    plan: 'trial',
    status: 'trialing',
    trialEndsOn: '',
    periodEndsOn: null,
    active: true,
  },
}

type Session =
  | { status: 'unknown' }
  | { status: 'guest' }
  | { status: 'in'; data: StudioSnapshot }

let session: Session = { status: 'unknown' }
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((fn) => fn())
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function hydrate(raw: StudioSnapshot): StudioSnapshot {
  return {
    ...raw,
    leads: raw.leads.map(normalizeLead),
  }
}

function apply(next: Session) {
  session = next
  emit()
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data
}

export async function bootSession() {
  try {
    const data = await api<StudioSnapshot>('/api/studio')
    apply({ status: 'in', data: hydrate(data) })
  } catch {
    apply({ status: 'guest' })
  }
}

function current(): StudioSnapshot {
  return session.status === 'in' ? session.data : EMPTY
}

async function persist(next: StudioSnapshot) {
  apply({ status: 'in', data: next })
  try {
    const data = await api<StudioSnapshot>('/api/studio', {
      method: 'PUT',
      body: JSON.stringify({
        studio: next.studio,
        leads: next.leads,
        quotations: next.quotations,
        onboarded: next.onboarded,
      }),
    })
    apply({ status: 'in', data: hydrate(data) })
  } catch (err) {
    if (err instanceof Error && err.message.includes('Sign in')) {
      apply({ status: 'guest' })
    }
  }
}

export function useSession() {
  return useSyncExternalStore(subscribe, () => session, () => session)
}

export function useStudio() {
  return useSyncExternalStore(subscribe, current, current)
}

export function isAuthed() {
  return session.status === 'in'
}

export function sessionStatus() {
  return session.status
}

export function acceptSession(data: StudioSnapshot) {
  apply({ status: 'in', data: hydrate(data) })
}

export async function logoutStudio() {
  try {
    await api('/api/auth/logout', { method: 'POST', body: '{}' })
  } catch {
    /* still leave */
  }
  apply({ status: 'guest' })
}

export function needsOnboarding() {
  return session.status === 'in' && !session.data.onboarded
}

export function completeOnboarding() {
  const now = current()
  void persist({ ...now, onboarded: true })
}

export function resetDemo() {
  void api<StudioSnapshot>('/api/studio/reset-demo', { method: 'POST', body: '{}' }).then((data) => {
    apply({ status: 'in', data: hydrate(data) })
  })
}

export function updateStudio(patch: Partial<StudioProfile>) {
  const now = current()
  void persist({ ...now, studio: { ...now.studio, ...patch } })
}

export function upsertLead(lead: Lead) {
  const now = current()
  const next = normalizeLead(lead)
  const exists = now.leads.some((l) => l.id === next.id)
  void persist({
    ...now,
    leads: exists ? now.leads.map((l) => (l.id === next.id ? next : l)) : [next, ...now.leads],
  })
}

export function patchLead(leadId: string, patch: Partial<Lead> | ((lead: Lead) => Lead)) {
  const now = current()
  void persist({
    ...now,
    leads: now.leads.map((l) => {
      if (l.id !== leadId) return l
      const next = typeof patch === 'function' ? patch(l) : { ...l, ...patch }
      return normalizeLead(next)
    }),
  })
}

export function removeLead(id: string) {
  const now = current()
  void persist({
    ...now,
    leads: now.leads.filter((l) => l.id !== id),
    quotations: now.quotations.filter((q) => q.leadId !== id),
  })
}

export function addPayment(leadId: string, payment: Payment) {
  patchLead(leadId, (l) => ({ ...l, payments: [...l.payments, payment] }))
}

export function addQuotation(quotation: Quotation) {
  const now = current()
  void persist({ ...now, quotations: [quotation, ...now.quotations] })
}

export function setNextAction(leadId: string, nextAction: string, nextActionOn: string, status?: Lead['status']) {
  patchLead(leadId, (l) => ({
    ...l,
    nextAction,
    nextActionOn,
    status: status ?? l.status,
  }))
}
