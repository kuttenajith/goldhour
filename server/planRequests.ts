import type { AuditRow } from './db.ts'
import type { PaidPlanId } from './plans.ts'

export function planTitle(id: string) {
  if (id === 'studio_pro') return 'Studio Pro'
  if (id === 'studio') return 'Studio'
  return id
}

function asPaidPlan(raw: string): PaidPlanId | null {
  const token = raw.split(':').pop() || ''
  if (token === 'studio' || token === 'studio_pro') return token
  return null
}

export function pendingPlanRequest(opts: {
  userId: string
  studioId?: string | null
  currentPlan: string
  status: string
  stored?: string | null
  audit: AuditRow[]
}): { plan: PaidPlanId; at: string } | null {
  const stored = asPaidPlan(opts.stored || '')
  if (stored && !(opts.status === 'active' && opts.currentPlan === stored)) {
    return { plan: stored, at: new Date().toISOString() }
  }
  const mine = opts.audit.filter(
    (row) => row.userId === opts.userId || (opts.studioId && row.studioId === opts.studioId),
  )
  const requests = mine.filter((row) => row.action === 'billing.request')
  const grants = mine.filter((row) => row.action === 'billing.activate' || row.action === 'billing.paid')
  const lastRequest = requests.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0]
  if (!lastRequest) return null
  const lastGrant = grants.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0]
  if (lastGrant && String(lastGrant.createdAt) >= String(lastRequest.createdAt)) return null
  const plan = asPaidPlan(lastRequest.detail)
  if (!plan) return null
  if (opts.status === 'active' && opts.currentPlan === plan) return null
  return { plan, at: String(lastRequest.createdAt) }
}
