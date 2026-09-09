import { useState } from 'react'
import type { FormEvent } from 'react'
import { Field, fieldClass } from './Field.tsx'
import { Button } from './Button.tsx'
import { id } from '../lib/ids.ts'
import { todayIso } from '../lib/format.ts'
import type { Lead, LeadSource, LeadStatus, ServiceType } from '../lib/types.ts'

const empty = (): Lead => ({
  id: id(),
  coupleName: '',
  phone: '',
  eventDate: '',
  budget: 0,
  service: 'photography',
  source: 'whatsapp',
  status: 'new',
  packageAmount: 0,
  city: '',
  notes: '',
  events: [{ id: id(), name: 'Wedding', date: '', done: false }],
  payments: [],
  nextAction: 'Qualify the enquiry',
  nextActionOn: todayIso(),
  createdOn: todayIso(),
})

export function LeadForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Lead
  onSave: (lead: Lead) => void
  onCancel: () => void
}) {
  const [lead, setLead] = useState<Lead>(initial ?? empty())

  function submit(e: FormEvent) {
    e.preventDefault()
    const events = lead.events.map((ev) => ({
      ...ev,
      date: ev.date || lead.eventDate,
    }))
    onSave({ ...lead, events, packageAmount: lead.packageAmount || lead.budget })
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Couple / client">
        <input
          required
          className={fieldClass}
          value={lead.coupleName}
          onChange={(e) => setLead({ ...lead, coupleName: e.target.value })}
          placeholder="Priya & Arjun"
        />
      </Field>
      <Field label="Phone">
        <input
          required
          className={fieldClass}
          value={lead.phone}
          onChange={(e) => setLead({ ...lead, phone: e.target.value })}
          placeholder="98765 01234"
        />
      </Field>
      <Field label="Event date">
        <input
          required
          type="date"
          className={fieldClass}
          value={lead.eventDate}
          onChange={(e) => setLead({ ...lead, eventDate: e.target.value })}
        />
      </Field>
      <Field label="City">
        <input
          className={fieldClass}
          value={lead.city}
          onChange={(e) => setLead({ ...lead, city: e.target.value })}
          placeholder="Madurai"
        />
      </Field>
      <Field label="Budget">
        <input
          type="number"
          min={0}
          className={fieldClass}
          value={lead.budget || ''}
          onChange={(e) => setLead({ ...lead, budget: Number(e.target.value) })}
        />
      </Field>
      <Field label="Package">
        <input
          type="number"
          min={0}
          className={fieldClass}
          value={lead.packageAmount || ''}
          onChange={(e) => setLead({ ...lead, packageAmount: Number(e.target.value) })}
        />
      </Field>
      <Field label="Service">
        <select
          className={fieldClass}
          value={lead.service}
          onChange={(e) => setLead({ ...lead, service: e.target.value as ServiceType })}
        >
          <option value="photography">Photography</option>
          <option value="cinematography">Cinematography</option>
          <option value="both">Photo + film</option>
        </select>
      </Field>
      <Field label="Source">
        <select
          className={fieldClass}
          value={lead.source}
          onChange={(e) => setLead({ ...lead, source: e.target.value as LeadSource })}
        >
          <option value="whatsapp">WhatsApp</option>
          <option value="instagram">Instagram</option>
          <option value="referral">Referral</option>
          <option value="google">Google</option>
          <option value="exhibition">Exhibition</option>
          <option value="planner">Wedding planner</option>
        </select>
      </Field>
      <Field label="Status">
        <select
          className={fieldClass}
          value={lead.status}
          onChange={(e) => setLead({ ...lead, status: e.target.value as LeadStatus })}
        >
          <option value="new">New lead</option>
          <option value="quoted">Quotation sent</option>
          <option value="follow_up">Follow up</option>
          <option value="advance_pending">Advance pending</option>
          <option value="booked">Booked</option>
          <option value="completed">Completed</option>
          <option value="lost">Lost</option>
        </select>
      </Field>
      <Field label="Next action date">
        <input
          type="date"
          className={fieldClass}
          value={lead.nextActionOn}
          onChange={(e) => setLead({ ...lead, nextActionOn: e.target.value })}
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Notes">
          <textarea
            className={fieldClass + ' min-h-24'}
            value={lead.notes}
            onChange={(e) => setLead({ ...lead, notes: e.target.value })}
            placeholder="Venue, family notes, package requests"
          />
        </Field>
      </div>
      <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
        <Button tone="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save lead</Button>
      </div>
    </form>
  )
}
