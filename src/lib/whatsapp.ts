import { paidOf, splitPlan } from './booking.ts'
import { balance, day, digits, money, paid } from './format.ts'
import type { Lead, StudioProfile } from './types.ts'

export function waLink(phone: string, text: string) {
  return `https://wa.me/${digits(phone)}?text=${encodeURIComponent(text)}`
}

export function qualifyMessage(studio: StudioProfile, lead: Lead) {
  return `Vanakkam ${lead.coupleName || ''},

Thank you for writing to ${studio.name}. To send an accurate quotation, could you share:

1. Wedding date
2. Venue
3. Functions — engagement, mehendi, wedding, reception
4. Rough budget

We will revert the same day.
— ${studio.owner}`
}

export function quotationMessage(studio: StudioProfile, lead: Lead) {
  const plan = lead.plan ?? splitPlan(lead.packageAmount)
  return `Vanakkam ${lead.coupleName},

This is ${studio.owner} from ${studio.name}, ${studio.city}.

Quotation for ${day(lead.eventDate)}${lead.venue ? ` at ${lead.venue}` : ''}:

Package: ${money(lead.packageAmount)}
Advance to confirm: ${money(plan.advance)}
Before wedding: ${money(plan.beforeWedding)}
On delivery: ${money(plan.finalDelivery)}

We would be honoured to photograph your day.
— ${studio.name}`
}

export function paymentMessage(studio: StudioProfile, lead: Lead) {
  return `Vanakkam ${lead.coupleName},

A gentle reminder from ${studio.name}.

Package: ${money(lead.packageAmount)}
Advance: ${money(paidOf(lead, 'advance'))} / ${money(lead.plan.advance)}
Before wedding: ${money(paidOf(lead, 'before_wedding'))} / ${money(lead.plan.beforeWedding)}
Final delivery: ${money(paidOf(lead, 'final_delivery'))} / ${money(lead.plan.finalDelivery)}

Received: ${money(paid(lead))}
Outstanding: ${money(balance(lead))}

Kindly share the pending amount at your convenience.
— ${studio.owner}`
}

export function eventMessage(studio: StudioProfile, lead: Lead) {
  return `Vanakkam ${lead.coupleName},

Your wedding with ${studio.name} is on ${day(lead.eventDate)}${lead.venue ? ` at ${lead.venue}` : ''}.

We will arrive for getting-ready, rituals and portraits. Please keep a family point of contact ready.

Looking forward to a beautiful day.
— ${studio.owner}`
}

export function followUpMessage(studio: StudioProfile, lead: Lead) {
  return `Vanakkam ${lead.coupleName},

Just checking in from ${studio.name} about ${day(lead.eventDate)}. Happy to walk through the quotation whenever you are ready.

— ${studio.owner}`
}
