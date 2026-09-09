import { balance, day, digits, money, paid } from './format.ts'
import type { Lead } from './types.ts'
import type { StudioProfile } from './types.ts'

export function waLink(phone: string, text: string) {
  return `https://wa.me/${digits(phone)}?text=${encodeURIComponent(text)}`
}

export function quotationMessage(studio: StudioProfile, lead: Lead) {
  return `Vanakkam ${lead.coupleName},

This is ${studio.owner} from ${studio.name}, ${studio.city}.

Thank you for considering us for your wedding. Quotation for ${day(lead.eventDate)}:

Package: ${money(lead.packageAmount)}
Advance to confirm: ${money(Math.round(lead.packageAmount * 0.25))}

We would be honoured to photograph your day.
— ${studio.name}`
}

export function paymentMessage(studio: StudioProfile, lead: Lead) {
  return `Vanakkam ${lead.coupleName},

A gentle reminder from ${studio.name}.

Package: ${money(lead.packageAmount)}
Received: ${money(paid(lead))}
Balance: ${money(balance(lead))}

Kindly share the pending amount at your convenience.
— ${studio.owner}`
}

export function eventMessage(studio: StudioProfile, lead: Lead) {
  return `Vanakkam ${lead.coupleName},

Your wedding with ${studio.name} is on ${day(lead.eventDate)}.

We will arrive early to capture getting-ready, rituals and portraits. Please keep a family point of contact ready.

Looking forward to a beautiful day.
— ${studio.owner}`
}
