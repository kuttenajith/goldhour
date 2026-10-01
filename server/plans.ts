export const TRIAL_DAYS = 14

export const PLANS = {
  studio: {
    id: 'studio' as const,
    name: 'Studio',
    amountPaise: 79900,
    days: 30,
    label: '₹799',
  },
  studio_pro: {
    id: 'studio_pro' as const,
    name: 'Studio Pro',
    amountPaise: 149900,
    days: 30,
    label: '₹1,499',
  },
}

export type PaidPlanId = keyof typeof PLANS

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
