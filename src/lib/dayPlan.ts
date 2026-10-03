import type { Lead } from './types.ts'
import { outstanding, paidOf } from './booking.ts'
import { todayIso } from './format.ts'

export type DayItem = {
  tone: 'red' | 'amber' | 'gold' | 'mute'
  label: string
  href: string
}

export function dayPlan(leads: Lead[]): DayItem[] {
  const today = todayIso()
  const items: DayItem[] = []
  const overduePay = leads.filter((l) => (l.status === 'booked' || l.status === 'accepted') && outstanding(l) > 0 && paidOf(l, 'advance') === 0)
  const follow = leads.filter(
    (l) => l.nextActionOn && l.nextActionOn <= today && l.status !== 'completed' && l.status !== 'lost' && l.status !== 'booked',
  )
  const quotes = leads.filter((l) => l.status === 'quoted')
  const tomorrow = leads.filter((l) => {
    const d = new Date(`${today}T00:00:00`)
    d.setDate(d.getDate() + 1)
    const next = d.toISOString().slice(0, 10)
    return l.status === 'booked' && (l.eventDate === today || l.eventDate === next)
  })
  if (overduePay.length) {
    items.push({
      tone: 'red',
      label: `${overduePay.length} booking${overduePay.length === 1 ? '' : 's'} still waiting on advance`,
      href: '/studio/payments',
    })
  }
  if (follow.length) {
    items.push({
      tone: 'amber',
      label: `${follow.length} lead${follow.length === 1 ? '' : 's'} need follow-up`,
      href: '/studio/follow-ups',
    })
  }
  if (quotes.length) {
    items.push({
      tone: 'gold',
      label: `${quotes.length} quotation${quotes.length === 1 ? '' : 's'} waiting`,
      href: '/studio/quotations',
    })
  }
  if (tomorrow.length) {
    items.push({
      tone: 'gold',
      label: `${tomorrow.length} wedding${tomorrow.length === 1 ? '' : 's'} today or tomorrow`,
      href: '/studio/calendar',
    })
  }
  if (!items.length) {
    items.push({ tone: 'mute', label: 'Desk is clear. Save a new enquiry.', href: '/studio/leads' })
  }
  return items.slice(0, 5)
}
