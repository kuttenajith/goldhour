import { useState } from 'react'
import type { FormEvent } from 'react'
import { Field, fieldClass } from './Field.tsx'
import { Button } from './Button.tsx'
import { defaultEvents, FUNCTION_NAMES, splitPlan } from '../lib/booking.ts'
import { id } from '../lib/ids.ts'
import { todayIso } from '../lib/format.ts'
import type { Lead, LeadSource, ServiceType } from '../lib/types.ts'

function empty(): Lead {
  return {
    id: id(),
    coupleName: '',
    phone: '',
    eventDate: '',
    venue: '',
    budget: 0,
    service: 'photography',
    source: 'whatsapp',
    status: 'new',
    packageAmount: 0,
    plan: splitPlan(0),
    city: '',
    notes: '',
    events: defaultEvents('', ['Wedding']),
    payments: [],
    nextAction: 'Ask for date, venue and functions',
    nextActionOn: todayIso(),
    createdOn: todayIso(),
  }
}

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
  const selected = lead.events.map((ev) => ev.name)

  function toggleFunction(name: string) {
    const next = selected.includes(name)
      ? selected.filter((n) => n !== name || n === 'Wedding')
      : [...selected, name]
    setLead({
      ...lead,
      events: defaultEvents(lead.eventDate, next.length ? next : ['Wedding']).map((ev) => {
        const prev = lead.events.find((p) => p.name === ev.name)
        return prev ? { ...ev, date: prev.date || ev.date, done: prev.done, timeline: prev.timeline } : ev
      }),
    })
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const events = lead.events.map((ev) => ({
      ...ev,
      date: ev.date || (ev.name === 'Wedding' ? lead.eventDate : ev.date),
    }))
    const packageAmount = lead.packageAmount || lead.budget
    onSave({
      ...lead,
      events,
      packageAmount,
      plan: lead.plan.advance || lead.plan.beforeWedding ? lead.plan : splitPlan(packageAmount),
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Client name">
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
      <Field label="Wedding date">
        <input
          required
          type="date"
          className={fieldClass}
          value={lead.eventDate}
          onChange={(e) => setLead({ ...lead, eventDate: e.target.value })}
        />
      </Field>
      <Field label="Venue">
        <input
          className={fieldClass}
          value={lead.venue}
          onChange={(e) => setLead({ ...lead, venue: e.target.value })}
          placeholder="Temple / palace / lawn"
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
      <div className="sm:col-span-2">
        <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-mute">Events</p>
        <div className="flex flex-wrap gap-2">
          {FUNCTION_NAMES.map((name) => {
            const on = selected.includes(name)
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggleFunction(name)}
                className={
                  on
                    ? 'rounded-full bg-gold px-3 py-1.5 text-sm text-ink'
                    : 'rounded-full border border-line px-3 py-1.5 text-sm text-mute'
                }
              >
                {name}
              </button>
            )
          })}
        </div>
      </div>
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
      <div className="sm:col-span-2">
        <Field label="Notes">
          <textarea
            className={fieldClass + ' min-h-20'}
            value={lead.notes}
            onChange={(e) => setLead({ ...lead, notes: e.target.value })}
            placeholder="What they asked on WhatsApp"
          />
        </Field>
      </div>
      <div className="flex justify-end gap-3 pt-2 sm:col-span-2">
        <Button tone="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save enquiry</Button>
      </div>
    </form>
  )
}
