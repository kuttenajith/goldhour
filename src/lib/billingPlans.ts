export const BILLING_PLANS = {
  studio: {
    id: 'studio' as const,
    name: 'Studio',
    amountPaise: 99900,
    days: 30,
    label: '₹999',
  },
  studio_pro: {
    id: 'studio_pro' as const,
    name: 'Studio Pro',
    amountPaise: 149900,
    days: 30,
    label: '₹1,499',
  },
}

export type PaidPlanId = keyof typeof BILLING_PLANS
