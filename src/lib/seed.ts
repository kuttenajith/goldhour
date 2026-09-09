import { defaultEvents, defaultWeddingTimeline, splitPlan } from './booking.ts'
import { id } from './ids.ts'
import { addDays, todayIso } from './format.ts'
import type { Lead, Quotation, StudioState } from './types.ts'

function lead(
  partial: Omit<Lead, 'id' | 'createdOn' | 'plan' | 'venue'> & {
    createdOn?: string
    venue?: string
    plan?: Lead['plan']
  },
): Lead {
  const packageAmount = partial.packageAmount || partial.budget || 0
  return {
    id: id(),
    createdOn: partial.createdOn ?? '2026-08-12',
    ...partial,
    venue: partial.venue ?? '',
    plan: partial.plan ?? splitPlan(packageAmount),
  }
}

export const DEMO_PIN = '2026'

export function seedState(): StudioState {
  const today = todayIso()

  const priya = lead({
    coupleName: 'Priya & Arjun',
    phone: '9876501234',
    eventDate: '2026-12-20',
    venue: 'Heritage palace, Tamukkam, Madurai',
    budget: 150000,
    service: 'both',
    source: 'instagram',
    status: 'booked',
    packageAmount: 120000,
    city: 'Madurai',
    notes: 'Run this wedding end-to-end. Advance is in. Plan the day, collect the rest, shoot.',
    nextAction: 'Lock the 20 Dec timeline with the family',
    nextActionOn: today,
    events: [
      { id: id(), name: 'Engagement', date: '2026-11-08', done: true, timeline: [] },
      { id: id(), name: 'Mehendi', date: '2026-12-19', done: false, timeline: [] },
      {
        id: id(),
        name: 'Wedding',
        date: '2026-12-20',
        done: false,
        timeline: defaultWeddingTimeline(),
      },
      { id: id(), name: 'Reception', date: '2026-12-21', done: false, timeline: [] },
    ],
    payments: [
      {
        id: id(),
        amount: 30000,
        kind: 'advance',
        receivedOn: '2026-08-20',
        note: 'UPI advance',
      },
    ],
  })

  const rahul = lead({
    coupleName: 'Rahul & Meera',
    phone: '9843011122',
    eventDate: '2026-11-14',
    venue: 'Meenakshi temple side, Madurai',
    budget: 90000,
    service: 'photography',
    source: 'whatsapp',
    status: 'quoted',
    packageAmount: 85000,
    city: 'Coimbatore',
    notes: 'Quotation sent. If they go quiet, follow up in 2 days, then 5.',
    nextAction: 'Follow up in 2 days',
    nextActionOn: addDays(today, 2),
    events: defaultEvents('2026-11-14', ['Wedding', 'Reception']),
    payments: [],
  })

  const divya = lead({
    coupleName: 'Divya & Karthik',
    phone: '9003214455',
    eventDate: '2027-01-24',
    venue: 'ITC Grand Chola lawns, Chennai',
    budget: 250000,
    service: 'both',
    source: 'planner',
    status: 'no_response',
    packageAmount: 210000,
    city: 'Chennai',
    notes: 'No reply after the quote. Follow up in 5 days before you lose the date.',
    nextAction: 'Follow up in 5 days — no response',
    nextActionOn: addDays(today, 5),
    events: defaultEvents('2027-01-24', ['Mehendi', 'Wedding', 'Reception']),
    payments: [],
  })

  const ananya = lead({
    coupleName: 'Ananya & Vishal',
    phone: '9444412288',
    eventDate: '2026-10-09',
    venue: 'The Gateway, Madurai',
    budget: 180000,
    service: 'both',
    source: 'referral',
    status: 'accepted',
    packageAmount: 165000,
    city: 'Madurai',
    notes: 'They said yes. Collect advance and mark booked.',
    nextAction: 'Collect advance and confirm booking',
    nextActionOn: today,
    events: defaultEvents('2026-10-09', ['Engagement', 'Wedding']),
    payments: [],
  })

  const nisha = lead({
    coupleName: 'Nisha & Aditya',
    phone: '9790012345',
    eventDate: '2026-12-02',
    venue: '',
    budget: 70000,
    service: 'photography',
    source: 'whatsapp',
    status: 'new',
    packageAmount: 0,
    city: 'Trichy',
    notes: '“Hi, I need wedding photography for December 2.” Ask for venue, functions and budget.',
    nextAction: 'Ask for date, venue and functions',
    nextActionOn: today,
    events: defaultEvents('2026-12-02', ['Wedding']),
    payments: [],
  })

  const quotations: Quotation[] = [
    {
      id: id(),
      leadId: priya.id,
      packageName: 'GoldHour Signature — photo + film',
      amount: 120000,
      createdOn: '2026-08-16',
      notes: 'Two photographers, one cinematographer. Engagement already covered.',
    },
    {
      id: id(),
      leadId: rahul.id,
      packageName: 'Temple Classic — photography',
      amount: 85000,
      createdOn: '2026-08-28',
      notes: 'One photographer, full-day coverage, 400 edited images.',
    },
    {
      id: id(),
      leadId: divya.id,
      packageName: 'Chennai Grand — photo + dual film',
      amount: 210000,
      createdOn: '2026-09-02',
      notes: 'Highlight film + teaser in 10 days.',
    },
  ]

  return {
    studio: {
      name: 'Meenakshi Frames',
      owner: 'Karthik Selvam',
      city: 'Madurai',
      phone: '9876543210',
      tagline: 'Wedding photography & cinema',
    },
    leads: [nisha, rahul, divya, ananya, priya],
    quotations,
  }
}
