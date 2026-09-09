export type LeadStatus =
  | 'new'
  | 'quoted'
  | 'follow_up'
  | 'no_response'
  | 'accepted'
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

export type PaymentKind = 'advance' | 'before_wedding' | 'final_delivery' | 'extra'

export interface TimelineSlot {
  id: string
  time: string
  title: string
}

export interface WeddingEvent {
  id: string
  name: string
  date: string
  done: boolean
  timeline: TimelineSlot[]
}

export interface PaymentPlan {
  advance: number
  beforeWedding: number
  finalDelivery: number
}

export interface Payment {
  id: string
  amount: number
  kind: PaymentKind
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
  venue: string
  budget: number
  service: ServiceType
  source: LeadSource
  status: LeadStatus
  packageAmount: number
  plan: PaymentPlan
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
