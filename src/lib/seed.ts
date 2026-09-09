import { id } from './ids.ts'
import type { Lead, Quotation, StudioState } from './types.ts'

function lead(partial: Omit<Lead, 'id' | 'createdOn'> & { createdOn?: string }): Lead {
  return {
    id: id(),
    createdOn: partial.createdOn ?? '2026-08-12',
    ...partial,
  }
}

export const DEMO_PIN = '2026'

export function seedState(): StudioState {
  const priya = lead({
    coupleName: 'Priya & Arjun',
    phone: '9876501234',
    eventDate: '2026-12-20',
    budget: 150000,
    service: 'both',
    source: 'instagram',
    status: 'follow_up',
    packageAmount: 120000,
    city: 'Madurai',
    notes: 'Traditional Hindu wedding at a heritage venue. Wants candid + editorial portraits.',
    nextAction: 'Follow up today',
    nextActionOn: new Date().toISOString().slice(0, 10),
    events: [
      { id: id(), name: 'Engagement', date: '2026-11-08', done: true },
      { id: id(), name: 'Wedding', date: '2026-12-20', done: false },
      { id: id(), name: 'Reception', date: '2026-12-21', done: false },
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
    budget: 90000,
    service: 'photography',
    source: 'whatsapp',
    status: 'quoted',
    packageAmount: 85000,
    city: 'Coimbatore',
    notes: 'Intimate temple wedding. Asked for a quotation last week.',
    nextAction: 'Quotation sent',
    nextActionOn: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    events: [
      { id: id(), name: 'Wedding', date: '2026-11-14', done: false },
      { id: id(), name: 'Reception', date: '2026-11-15', done: false },
    ],
    payments: [],
  })

  const divya = lead({
    coupleName: 'Divya & Karthik',
    phone: '9003214455',
    eventDate: '2027-01-24',
    budget: 250000,
    service: 'both',
    source: 'planner',
    status: 'advance_pending',
    packageAmount: 210000,
    city: 'Chennai',
    notes: 'Planner-led destination feel in the city. Two cinematographers requested.',
    nextAction: 'Advance pending',
    nextActionOn: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    events: [
      { id: id(), name: 'Mehendi', date: '2027-01-22', done: false },
      { id: id(), name: 'Wedding', date: '2027-01-24', done: false },
      { id: id(), name: 'Reception', date: '2027-01-25', done: false },
    ],
    payments: [],
  })

  const ananya = lead({
    coupleName: 'Ananya & Vishal',
    phone: '9444412288',
    eventDate: '2026-10-09',
    budget: 180000,
    service: 'both',
    source: 'referral',
    status: 'booked',
    packageAmount: 165000,
    city: 'Madurai',
    notes: 'Referred by Priya. Wants a film-grain album.',
    nextAction: 'Send shot list',
    nextActionOn: '2026-10-01',
    events: [
      { id: id(), name: 'Engagement', date: '2026-09-12', done: true },
      { id: id(), name: 'Wedding', date: '2026-10-09', done: false },
    ],
    payments: [
      {
        id: id(),
        amount: 50000,
        kind: 'advance',
        receivedOn: '2026-07-18',
        note: 'Bank transfer',
      },
    ],
  })

  const nisha = lead({
    coupleName: 'Nisha & Aditya',
    phone: '9790012345',
    eventDate: '2026-12-02',
    budget: 70000,
    service: 'photography',
    source: 'google',
    status: 'new',
    packageAmount: 0,
    city: 'Trichy',
    notes: 'First enquiry: “Hi, I need wedding photography for December 2.”',
    nextAction: 'Call and qualify',
    nextActionOn: new Date().toISOString().slice(0, 10),
    events: [{ id: id(), name: 'Wedding', date: '2026-12-02', done: false }],
    payments: [],
  })

  const quotations: Quotation[] = [
    {
      id: id(),
      leadId: priya.id,
      packageName: 'GoldHour Signature — photo + film',
      amount: 120000,
      createdOn: '2026-08-16',
      notes: 'Two photographers, one cinematographer, engagement already covered.',
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
    leads: [priya, rahul, divya, ananya, nisha],
    quotations,
  }
}
