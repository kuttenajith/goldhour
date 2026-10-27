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

export function needsStudioWelcome(snap: StudioSnapshot) {
  if (snap.isAdmin || snap.isDemo) return false
  const studio = snap.studio
  return studio.name.trim().length < 2 || studio.owner.trim().length < 2 || studio.city.trim().length < 2
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
      return 'Plan ended'
  }
}

export const STUDIO_FEATURES = [
  'Unlimited leads and bookings',
  'Quotations as PDF',
  'Couple payments',
  'Follow-ups',
  'Event checklist on each lead',
  'Vendors on the wedding',
  'Gallery and album delivery dates',
  'Outstation / travel fee',
  'Lost-reason on the pipeline',
]

export const PRO_FEATURES = [
  'Everything in Studio',
  'Wedding calendar with date-clash warnings',
  'Date holds / pencil bookings',
  'Pipeline board (New → Booked)',
  'Pulse: win rate, source mix, quiet quotes',
  'Day-of timeline',
  'Contract sent / signed status',
  'Crew and second-shooter notes',
  'Shot list / deliverables',
  'Aftercare follow-up date',
  'WhatsApp desk templates',
  'Desk chatbot',
  'Pro notifications: clashes, stale quotes, morning briefing',
]
