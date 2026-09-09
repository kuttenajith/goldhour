import type { Lead, LeadSource, LeadStatus, ServiceType } from './types.ts'

export const rupee = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export const dayFmt = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function money(n: number) {
  return rupee.format(n)
}

export function day(iso: string) {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return dayFmt.format(d)
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function paid(lead: Lead) {
  return lead.payments.reduce((sum, p) => sum + p.amount, 0)
}

export function balance(lead: Lead) {
  return Math.max(0, lead.packageAmount - paid(lead))
}

export const STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'New lead',
  quoted: 'Quotation sent',
  follow_up: 'Follow up',
  advance_pending: 'Advance pending',
  booked: 'Booked',
  completed: 'Completed',
  lost: 'Lost',
}

export const SOURCE_LABEL: Record<LeadSource, string> = {
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  referral: 'Referral',
  google: 'Google',
  exhibition: 'Exhibition',
  planner: 'Wedding planner',
}

export const SERVICE_LABEL: Record<ServiceType, string> = {
  photography: 'Photography',
  cinematography: 'Cinematography',
  both: 'Photo + film',
}

export function digits(phone: string) {
  const d = phone.replace(/\D/g, '')
  if (d.length === 10) return `91${d}`
  return d
}
