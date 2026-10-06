import { useState } from 'react'
import type { FormEvent } from 'react'
import { Field, fieldBox } from './Field.tsx'
import { DateField } from './DateField.tsx'
import { Button } from './Button.tsx'
import { defaultEvents, FUNCTION_NAMES, splitPlan } from '../lib/booking.ts'
import { id } from '../lib/ids.ts'
import { todayIso } from '../lib/format.ts'
import {
  dateError,
  dateHorizon,
  dateMinFor,
  moneyError,
  nameError,
  onlyMoney,
  onlyName,
  onlyPhone,
  phoneError,
  requiredText,
} from '../lib/input.ts'
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
  const [errors, setErrors] = useState({ coupleName: '', phone: '', eventDate: '', venue: '', city: '', budget: '', notes: '' })
  const selected = lead.events.map((ev) => ev.name)
  const minDate = dateMinFor(initial?.eventDate)
  const maxDate = dateHorizon(8)
  const budgetText = lead.budget ? String(lead.budget) : ''

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
    const nextErrors = {
      coupleName: nameError(lead.coupleName),
      phone: phoneError(lead.phone),
      eventDate: dateError(lead.eventDate, minDate, maxDate),
      venue: requiredText(lead.venue, 'the venue'),
      city: requiredText(lead.city, 'the city'),
      budget: moneyError(budgetText),
      notes: requiredText(lead.notes, 'a short note'),
    }
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return
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
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Client name" error={errors.coupleName} required>
        <input
          required
          className={fieldBox(errors.coupleName)}
          value={lead.coupleName}
          onChange={(e) => {
            const coupleName = onlyName(e.target.value)
            setLead({ ...lead, coupleName })
            setErrors((prev) => ({ ...prev, coupleName: coupleName ? nameError(coupleName) : '' }))
          }}
          placeholder="Priya & Arjun"
          autoComplete="name"
          maxLength={80}
        />
      </Field>
      <Field label="Phone" error={errors.phone} hint="10-digit Indian mobile" required>
        <input
          required
          className={fieldBox(errors.phone)}
          value={lead.phone}
          inputMode="tel"
          autoComplete="tel"
          onChange={(e) => {
            const phone = onlyPhone(e.target.value)
            setLead({ ...lead, phone })
            setErrors((prev) => ({ ...prev, phone: phone ? phoneError(phone) : '' }))
          }}
          placeholder="98765 01234"
          maxLength={13}
        />
      </Field>
      <Field label="Wedding date" error={errors.eventDate} hint="Use the calendar — today through 8 years" required>
        <DateField
          required
          min={minDate}
          max={maxDate}
          error={errors.eventDate}
          value={lead.eventDate}
          onChange={(eventDate, eventError) => {
            setLead({ ...lead, eventDate })
            setErrors((prev) => ({ ...prev, eventDate: eventError }))
          }}
        />
      </Field>
      <Field label="Venue" error={errors.venue} required>
        <input
          required
          className={fieldBox(errors.venue)}
          value={lead.venue}
          onChange={(e) => {
            const venue = e.target.value.slice(0, 80)
            setLead({ ...lead, venue })
            setErrors((prev) => ({ ...prev, venue: venue ? requiredText(venue, 'the venue') : '' }))
          }}
          placeholder="Temple / palace / lawn"
          maxLength={80}
        />
      </Field>
      <Field label="City" error={errors.city} required>
        <input
          required
          className={fieldBox(errors.city)}
          value={lead.city}
          onChange={(e) => {
            const city = onlyName(e.target.value)
            setLead({ ...lead, city })
            setErrors((prev) => ({ ...prev, city: city ? requiredText(city, 'the city') : '' }))
          }}
          placeholder="Madurai"
          maxLength={60}
        />
      </Field>
      <Field label="Budget" error={errors.budget} hint="Numbers only, rupees" required>
        <input
          required
          className={fieldBox(errors.budget)}
          value={budgetText}
          inputMode="numeric"
          onChange={(e) => {
            const raw = onlyMoney(e.target.value)
            setLead({ ...lead, budget: raw ? Number(raw) : 0 })
            setErrors((prev) => ({ ...prev, budget: raw ? moneyError(raw) : '' }))
          }}
          placeholder="150000"
          maxLength={9}
        />
      </Field>
      <div className="sm:col-span-2">
        <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-mute">
          Events <span className="text-gold-soft">*</span>
        </p>
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
                    ? 'min-h-10 cursor-pointer rounded-full bg-gold px-3 py-1.5 text-sm text-ink'
                    : 'min-h-10 cursor-pointer rounded-full border border-line px-3 py-1.5 text-sm text-mute'
                }
              >
                {name}
              </button>
            )
          })}
        </div>
      </div>
      <Field label="Source" required>
        <select
          required
          className={fieldBox()}
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
      <Field label="Service" required>
        <select
          required
          className={fieldBox()}
          value={lead.service}
          onChange={(e) => setLead({ ...lead, service: e.target.value as ServiceType })}
        >
          <option value="photography">Photography</option>
          <option value="cinematography">Cinematography</option>
          <option value="both">Photo + film</option>
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Notes" error={errors.notes} required>
          <textarea
            required
            className={fieldBox(errors.notes) + ' min-h-20'}
            value={lead.notes}
            onChange={(e) => {
              const notes = e.target.value.slice(0, 500)
              setLead({ ...lead, notes })
              setErrors((prev) => ({ ...prev, notes: notes ? requiredText(notes, 'a short note') : '' }))
            }}
            placeholder="What they asked on WhatsApp"
            maxLength={500}
          />
        </Field>
      </div>
      <div className="flex flex-wrap justify-end gap-3 pt-2 sm:col-span-2">
        <Button tone="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save enquiry</Button>
      </div>
    </form>
  )
}
