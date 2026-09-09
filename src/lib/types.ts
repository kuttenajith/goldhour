export type LeadStatus =
  | 'new'
  | 'quoted'
  | 'follow_up'
  | 'advance_pending'
  | 'booked'
  | 'completed'
  | 'lost'

export type LeadSource =
  | 'instagram'
  | 'whatsapp'
  | 'referral'
  | 'google'
  | 'exhibition'
  | 'planner'

export type ServiceType = 'photography' | 'cinematography' | 'both'

export interface WeddingEvent {
  id: string
  name: string
  date: string
  done: boolean
}

export interface Payment {
  id: string
  amount: number
  kind: 'advance' | 'balance' | 'extra'
  receivedOn: string
  note: string
}

export interface Quotation {
  id: string
  leadId: string
  packageName: string
  amount: number
  createdOn: string
  notes: string
}

export interface Lead {
  id: string
  coupleName: string
  phone: string
  eventDate: string
  budget: number
  service: ServiceType
  source: LeadSource
  status: LeadStatus
  packageAmount: number
  city: string
  notes: string
  events: WeddingEvent[]
  payments: Payment[]
  nextAction: string
  nextActionOn: string
  createdOn: string
}

export interface StudioProfile {
  name: string
  owner: string
  city: string
  phone: string
  tagline: string
}

export interface StudioState {
  studio: StudioProfile
  leads: Lead[]
  quotations: Quotation[]
}
