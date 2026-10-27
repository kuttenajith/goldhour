import { BILLING_PLANS, type PaidPlanId } from '../src/lib/billingPlans.ts'

export const TRIAL_DAYS = 14

export const PLANS = BILLING_PLANS

export type { PaidPlanId }

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function trialEnd() {
  return addDays(todayIso(), TRIAL_DAYS)
}

export function billingStatus(row: {
  plan: string
  status: string
  trialEndsOn: string
  periodEndsOn: string | null
}) {
  const today = todayIso()
  if (row.status === 'active' && row.periodEndsOn && row.periodEndsOn >= today) {
    return { ...row, plan: row.plan, status: 'active' as const, active: true }
  }
  if (row.trialEndsOn >= today) {
    return { ...row, plan: 'trial', status: 'trialing' as const, active: true }
  }
  return { ...row, status: 'expired' as const, active: false }
}
