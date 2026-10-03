import type { Lead, StudioSnapshot } from './types.ts'
import { outstanding } from './booking.ts'
import { day, money, paid, todayIso } from './format.ts'

export type CopilotLink = { href: string; label: string }

export type CopilotReply = {
  text: string
  links?: CopilotLink[]
}

function q(s: string) {
  return s.toLowerCase().replace(/[’']/g, '').trim()
}

function upcoming(leads: Lead[]) {
  const today = todayIso()
  return leads
    .filter((l) => (l.status === 'booked' || l.status === 'accepted') && l.eventDate && l.eventDate >= today)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
}

export function answerCopilot(ask: string, snap: StudioSnapshot): CopilotReply {
  const text = q(ask)
  const { leads, studio } = snap
  const follow = leads.filter(
    (l) =>
      l.nextActionOn &&
      l.nextActionOn <= todayIso() &&
      l.status !== 'completed' &&
      l.status !== 'lost' &&
      l.status !== 'booked',
  )
  const quotes = leads.filter((l) => l.status === 'quoted')
  const unpaid = leads.filter((l) => (l.status === 'booked' || l.status === 'accepted') && outstanding(l) > 0)
  const collected = leads.reduce((s, l) => s + paid(l), 0)
  const pending = unpaid.reduce((s, l) => s + outstanding(l), 0)
  const soon = upcoming(leads)

  if (/follow|overdue|not (called|replied)|quiet/.test(text)) {
    if (!follow.length) return { text: 'No follow-ups waiting. Desk is clear.' }
    return {
      text: `${follow.length} lead${follow.length === 1 ? '' : 's'} need a follow-up:\n` + follow.slice(0, 6).map((l) => `• ${l.coupleName} — ${l.nextAction || 'Follow up'}`).join('\n'),
      links: follow.slice(0, 3).map((l) => ({ href: `/studio/leads/${l.id}`, label: l.coupleName })),
    }
  }
  if (/unpaid|outstanding|pending (payment|money)|due/.test(text)) {
    if (!unpaid.length) return { text: 'Nothing outstanding on booked work.' }
    return {
      text: `₹${Math.round(pending).toLocaleString('en-IN')} still due across ${unpaid.length} booking${unpaid.length === 1 ? '' : 's'}:\n` + unpaid.slice(0, 6).map((l) => `• ${l.coupleName} — ${money(outstanding(l))}`).join('\n'),
      links: [{ href: '/studio/payments', label: 'Open payments' }],
    }
  }
  if (/quot/.test(text)) {
    if (!quotes.length) return { text: 'No quotations sitting unanswered.' }
    return {
      text: `${quotes.length} quotation${quotes.length === 1 ? '' : 's'} waiting:\n` + quotes.slice(0, 6).map((l) => `• ${l.coupleName} — ${money(l.packageAmount || l.budget)}`).join('\n'),
      links: [{ href: '/studio/quotations', label: 'Open quotations' }],
    }
  }
  if (/collect|revenue|this month|earned|made/.test(text)) {
    return { text: `${studio.name} has collected ${money(collected)} on the books. Outstanding is ${money(pending)}.` }
  }
  if (/week|upcoming|tomorrow|today|calendar|wedding/.test(text)) {
    if (!soon.length) return { text: 'No booked weddings on the calendar yet.', links: [{ href: '/studio/calendar', label: 'Open calendar' }] }
    return {
      text: `Next on the calendar:\n` + soon.slice(0, 6).map((l) => `• ${day(l.eventDate)} — ${l.coupleName}`).join('\n'),
      links: [{ href: '/studio/calendar', label: 'Open calendar' }],
    }
  }
  if (/how many lead|enquiry|enquir/.test(text)) {
    return { text: `${leads.length} enquir${leads.length === 1 ? 'y' : 'ies'} on the desk. ${leads.filter((l) => l.status === 'new').length} still new.` }
  }
  const named = leads.find((l) => text.includes(l.coupleName.split(/[& ]/)[0].toLowerCase()))
  if (named && /quote|quotation|create/.test(text)) {
    return {
      text: `I can open ${named.coupleName} so you can send the quotation. I will not create or delete anything from chat.`,
      links: [{ href: `/studio/leads/${named.id}`, label: `Open ${named.coupleName}` }],
    }
  }
  if (named) {
    return {
      text: `${named.coupleName} — ${named.status.replace('_', ' ')}, wedding ${named.eventDate ? day(named.eventDate) : 'date pending'}, ${money(named.packageAmount || named.budget)}.`,
      links: [{ href: `/studio/leads/${named.id}`, label: `Open ${named.coupleName}` }],
    }
  }

  return {
    text: 'Ask things like: who needs follow-up, unpaid bookings, quotations waiting, what is collected, or which wedding is next. I read this studio only — I will not delete or refund from chat.',
    links: [
      { href: '/studio/follow-ups', label: 'Follow-ups' },
      { href: '/studio/payments', label: 'Payments' },
      { href: '/studio/calendar', label: 'Calendar' },
    ],
  }
}
