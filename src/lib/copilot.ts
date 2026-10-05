import type { AdminOverview, Lead, StudioSnapshot } from './types.ts'
import { outstanding } from './booking.ts'
import { day, money, paid, todayIso } from './format.ts'
import { conversion, dateClashes, morningBrief, sourceMix } from './studioPulse.ts'

export type CopilotLink = { href: string; label: string }

export type CopilotReply = {
  text: string
  links?: CopilotLink[]
}

function q(s: string) {
  return s.toLowerCase().replace(/[’']/g, '').trim()
}

export function firstName(snap: StudioSnapshot) {
  const owner = snap.studio.owner?.trim()
  if (owner) return owner.split(/\s+/)[0]
  const mail = snap.email.split('@')[0]
  return mail || 'there'
}

export function greeting(snap: StudioSnapshot) {
  return `Hi ${firstName(snap)}, how can I help you?`
}

function upcoming(leads: Lead[]) {
  const today = todayIso()
  return leads
    .filter((l) => (l.status === 'booked' || l.status === 'accepted') && l.eventDate && l.eventDate >= today)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
}

function answerHq(ask: string, hq: AdminOverview): CopilotReply {
  const text = q(ask)
  const live = hq.tenants.filter((t) => !t.isAdmin && !t.isDemo)
  const paying = live.filter((t) => t.billing.status === 'active')
  const trial = live.filter((t) => t.billing.status === 'trialing')
  const events = live.reduce((s, t) => s + t.leads.length, 0)

  if (/pay|subscri|active/.test(text)) {
    if (!paying.length) return { text: 'No paying studios yet.', links: [{ href: '/admin', label: 'Open HQ' }] }
    return {
      text: `${paying.length} paying studio${paying.length === 1 ? '' : 's'}:\n` + paying.slice(0, 8).map((t) => `• ${t.studio.name} — ${t.email}`).join('\n'),
      links: [{ href: '/admin', label: 'Open HQ' }],
    }
  }
  if (/trial/.test(text)) {
    if (!trial.length) return { text: 'Nobody is on trial right now.', links: [{ href: '/admin', label: 'Open HQ' }] }
    return {
      text: `${trial.length} on trial:\n` + trial.slice(0, 8).map((t) => `• ${t.studio.name} — until ${t.billing.trialEndsOn || '—'}`).join('\n'),
      links: [{ href: '/admin', label: 'Open HQ' }],
    }
  }
  if (/how many|studio|desk|tenant/.test(text)) {
    return {
      text: `${live.length} live studio${live.length === 1 ? '' : 's'}. ${paying.length} paying, ${trial.length} on trial, ${events} events on file.`,
      links: [{ href: '/admin', label: 'Open HQ' }],
    }
  }
  if (/event|wedding|lead|enquir/.test(text)) {
    return {
      text: `${events} events across every live desk.`,
      links: [{ href: '/admin', label: 'Open HQ' }],
    }
  }
  const named = live.find((t) => text.includes(t.studio.name.toLowerCase()) || text.includes(t.studio.owner.split(/\s+/)[0]?.toLowerCase() || '___'))
  if (named) {
    return {
      text: `${named.studio.name} (${named.email}) — ${named.billing.status}, ${named.leads.length} events, owner ${named.studio.owner || '—'}.`,
      links: [{ href: '/admin', label: 'Open HQ' }],
    }
  }
  return {
    text: `HQ has ${live.length} studios, ${paying.length} paying, ${trial.length} on trial. Ask me who is paying, who is on trial, or how many events are on file.`,
    links: [{ href: '/admin', label: 'Open HQ' }, { href: '/studio', label: 'My desk' }],
  }
}

export function answerCopilot(ask: string, snap: StudioSnapshot, hq?: AdminOverview | null): CopilotReply {
  const text = q(ask)
  if (snap.isAdmin && hq && /studio|hq|pay|trial|tenant|operator|how many/.test(text)) {
    return answerHq(ask, hq)
  }
  if (snap.isAdmin && /hq|admin|operator/.test(text)) {
    if (!hq) return { text: 'Give me a moment — I am opening every desk.' }
    return answerHq(ask, hq)
  }

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
  if (/win rate|conversion|pipeline|how (is|are) (we|the desk) doing|pulse/.test(text)) {
    const stats = conversion(leads)
    return {
      text: `Win rate ${stats.decided ? `${stats.rate}%` : 'needs a booked or lost couple first'}. Pipeline ${money(stats.pipelineValue)}. Booked ${money(stats.bookedValue)}. Collected ${money(stats.collected)}. Open Pulse for the full board.`,
      links: [{ href: '/studio/activity', label: 'Open Pulse' }, { href: '/studio/pipeline', label: 'Open pipeline' }],
    }
  }
  if (/source|instagram|referral|where.*lead|where.*coupl/.test(text)) {
    const mix = sourceMix(leads)
    if (!mix.length) return { text: 'No sources on file yet. Save the next enquiry with Instagram, WhatsApp or referral.' }
    return {
      text: mix.map((row) => `• ${row.label} — ${row.count} enquir${row.count === 1 ? 'y' : 'ies'}, ${row.booked} booked`).join('\n'),
      links: [{ href: '/studio/activity', label: 'Open Pulse' }],
    }
  }
  if (/clash|double.?book|same day|conflict/.test(text)) {
    const clashes = dateClashes(leads)
    if (!clashes.length) return { text: 'No two booked weddings share a date.', links: [{ href: '/studio/calendar', label: 'Open calendar' }] }
    return {
      text: clashes.map((c) => `• ${day(c.date)} — ${c.leads.map((l) => l.coupleName).join(', ')}`).join('\n'),
      links: [{ href: '/studio/calendar', label: 'Open calendar' }],
    }
  }
  if (/briefing|this morning|today.?desk/.test(text)) {
    const brief = morningBrief(leads)
    return {
      text: `${brief.follow} follow-ups, ${brief.clashes} date clashes, ${brief.stale} quiet quotes, ${brief.unpaid} unpaid bookings.${brief.nextWedding ? ` Next wedding: ${brief.nextWedding.coupleName} on ${day(brief.nextWedding.eventDate)}.` : ''}`,
      links: [{ href: '/studio/activity', label: 'Open Pulse' }],
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
  if (snap.isAdmin && hq) return answerHq(ask, hq)

  return {
    text: `Ask me who needs follow-up, unpaid bookings, quotations waiting, win rate, date clashes, or which wedding is next${snap.isAdmin ? ' — or how HQ studios are doing' : ''}. I will not delete or refund from chat.`,
    links: snap.isAdmin
      ? [{ href: '/admin', label: 'HQ' }, { href: '/studio/follow-ups', label: 'Follow-ups' }]
      : [
          { href: '/studio/activity', label: 'Pulse' },
          { href: '/studio/follow-ups', label: 'Follow-ups' },
          { href: '/studio/calendar', label: 'Calendar' },
        ],
  }
}
