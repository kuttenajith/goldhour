import type { StudioSnapshot } from './types.ts'

export type DeskTier = 'hq' | 'demo' | 'trial' | 'studio' | 'studio_pro' | 'expired'

export function deskTier(snap: StudioSnapshot): DeskTier {
  if (snap.isAdmin) return 'hq'
  if (snap.isDemo) return 'demo'
  if (snap.billing.status === 'trialing') return 'trial'
  if (snap.billing.status === 'active' && snap.billing.plan === 'studio_pro') return 'studio_pro'
  if (snap.billing.status === 'active') return 'studio'
  return 'expired'
}

export function hasProDesk(snap: StudioSnapshot) {
  const tier = deskTier(snap)
  return tier === 'hq' || tier === 'demo' || tier === 'trial' || tier === 'studio_pro'
}

export function planLabel(snap: StudioSnapshot) {
  switch (deskTier(snap)) {
    case 'hq':
      return 'HQ'
    case 'demo':
      return 'Demo'
    case 'trial':
      return 'Trial'
    case 'studio_pro':
      return 'Studio Pro'
    case 'studio':
      return 'Studio'
    default:
      return 'Trial ended'
  }
}

export const STUDIO_FEATURES = [
  'Unlimited leads and bookings',
  'Quotations as PDF',
  'Couple payments',
  'Follow-ups',
  'Event checklist on each lead',
]

export const PRO_FEATURES = [
  'Everything in Studio',
  'Wedding calendar',
  'Day-of timeline',
  'WhatsApp desk templates',
  'Padmavathi',
  'Activity reports',
]
