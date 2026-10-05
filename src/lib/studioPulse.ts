import { outstanding } from './booking.ts'
import { SOURCE_LABEL, paid, todayIso } from './format.ts'
import type { Lead, LeadSource, Quotation } from './types.ts'

export type PulseFeedItem = {
  id: string
  at: string
  title: string
  body: string
  href: string
  kind: 'enquiry' | 'quote' | 'pay' | 'follow' | 'book' | 'clash'
}

export type DateClash = { date: string; leads: Lead[] }

function daysBetween(from: string, to: string) {
  const a = new Date(`${from}T00:00:00`)
  const b = new Date(`${to}T00:00:00`)
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

function occupiedDates(lead: Lead) {
  if (lead.status !== 'booked' && lead.status !== 'accepted') return [] as string[]
  return [lead.eventDate, ...(lead.events || []).map((ev) => ev.date)].filter(Boolean)
}

export function dateClashes(leads: Lead[]): DateClash[] {
  const byDate = new Map<string, Lead[]>()
  for (const lead of leads) {
    for (const date of occupiedDates(lead)) {
      const list = byDate.get(date) || []
      if (!list.some((l) => l.id === lead.id)) list.push(lead)
      byDate.set(date, list)
    }
  }
  return [...byDate.entries()]
    .filter(([, list]) => list.length > 1)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, clashLeads]) => ({ date, leads: clashLeads }))
}

export function staleQuotes(leads: Lead[], today = todayIso(), quietDays = 3) {
  return leads.filter((lead) => {
    if (lead.status !== 'quoted' && lead.status !== 'follow_up' && lead.status !== 'no_response') return false
    const since = lead.nextActionOn || lead.createdOn
    if (!since) return false
    return daysBetween(since, today) >= quietDays
  })
}

export function conversion(leads: Lead[]) {
  const won = leads.filter((l) => l.status === 'booked' || l.status === 'accepted' || l.status === 'completed')
  const lost = leads.filter((l) => l.status === 'lost')
  const decided = won.length + lost.length
  const pipeline = leads.filter((l) => l.status === 'new' || l.status === 'quoted' || l.status === 'follow_up' || l.status === 'no_response' || l.status === 'accepted')
  const booked = leads.filter((l) => l.status === 'booked' || l.status === 'accepted')
  const collected = leads.reduce((s, l) => s + paid(l), 0)
  const due = booked.reduce((s, l) => s + outstanding(l), 0)
  const pipelineValue = pipeline.reduce((s, l) => s + (l.packageAmount || l.budget || 0), 0)
  const bookedValue = won.reduce((s, l) => s + (l.packageAmount || l.budget || 0), 0)
  const rate = decided === 0 ? 0 : Math.round((won.length / decided) * 100)
  return {
    total: leads.length,
    won: won.length,
    lost: lost.length,
    decided,
    rate,
    pipelineValue,
    bookedValue,
    collected,
    outstanding: due,
  }
}

export function sourceMix(leads: Lead[]) {
  const keys = Object.keys(SOURCE_LABEL) as LeadSource[]
  return keys
    .map((source) => {
      const rows = leads.filter((l) => l.source === source)
      const booked = rows.filter((l) => l.status === 'booked' || l.status === 'accepted' || l.status === 'completed')
      return {
        source,
        label: SOURCE_LABEL[source],
        count: rows.length,
        booked: booked.length,
      }
    })
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count)
}

export function morningBrief(leads: Lead[], today = todayIso()) {
  const follow = leads.filter(
    (l) =>
      l.nextActionOn &&
      l.nextActionOn <= today &&
      l.status !== 'completed' &&
      l.status !== 'lost' &&
      l.status !== 'booked',
  ).length
  const unpaid = leads.filter((l) => (l.status === 'booked' || l.status === 'accepted') && outstanding(l) > 0).length
  const next = leads
    .filter((l) => (l.status === 'booked' || l.status === 'accepted') && l.eventDate && l.eventDate >= today)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate))[0]
  return {
    follow,
    clashes: dateClashes(leads).length,
    stale: staleQuotes(leads, today).length,
    unpaid,
    nextWedding: next || null,
  }
}

export function pulseFeed(leads: Lead[], quotations: Quotation[] = []): PulseFeedItem[] {
  const items: PulseFeedItem[] = []
  for (const lead of leads) {
    if (lead.createdOn) {
      items.push({
        id: `enquiry:${lead.id}`,
        at: lead.createdOn,
        title: `Enquiry · ${lead.coupleName}`,
        body: [SOURCE_LABEL[lead.source], lead.city || lead.venue].filter(Boolean).join(' · ') || 'New lead on the desk',
        href: `/studio/leads/${lead.id}`,
        kind: 'enquiry',
      })
    }
    for (const pay of lead.payments || []) {
      items.push({
        id: `pay:${lead.id}:${pay.id}`,
        at: pay.receivedOn,
        title: `Payment · ${lead.coupleName}`,
        body: `${pay.kind.replace('_', ' ')} · note ${pay.note || '—'}`,
        href: `/studio/leads/${lead.id}?open=pay`,
        kind: 'pay',
      })
    }
  }
  for (const quote of quotations) {
    const lead = leads.find((l) => l.id === quote.leadId)
    items.push({
      id: `quote:${quote.id}`,
      at: quote.createdOn,
      title: `Quote · ${lead?.coupleName || 'Couple'}`,
      body: quote.packageName,
      href: lead ? `/studio/leads/${lead.id}?open=quote` : '/studio/quotations',
      kind: 'quote',
    })
  }
  for (const clash of dateClashes(leads)) {
    items.push({
      id: `clash:${clash.date}`,
      at: `${clash.date}T00:00:00.000Z`,
      title: `Date clash · ${clash.date}`,
      body: clash.leads.map((l) => l.coupleName).join(' · '),
      href: '/studio/calendar',
      kind: 'clash',
    })
  }
  return items
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, 40)
}
