import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from './Button.tsx'
import { Field, fieldBox } from './Field.tsx'
import { useConfirm } from './ConfirmDialog.tsx'
import { VENDOR_ROLES } from '../lib/booking.ts'
import { day, money } from '../lib/format.ts'
import { id } from '../lib/ids.ts'
import { onlyMoney, onlyName, onlyPhone } from '../lib/input.ts'
import { patchLead } from '../lib/store.ts'
import type { ContractStatus, DeliveryStatus, Lead } from '../lib/types.ts'

export function StudioJobFile({ lead }: { lead: Lead }) {
  const confirm = useConfirm()
  const [role, setRole] = useState('Planner')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  return (
    <article className="gh-card rounded-3xl border border-line bg-ink-2 p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <p className="text-xs uppercase tracking-[0.22em] text-mute">Job file · Studio</p>
      </div>
      <p className="mt-2 text-sm text-mute">Vendors, travel, gallery and album — the same job sheet HoneyBook and 17hats keep on a booking.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3 text-sm">
          <input
            type="checkbox"
            checked={lead.outstation}
            onChange={() =>
              void confirm({
                title: lead.outstation ? 'Clear outstation?' : 'Mark this as outstation?',
                body: 'Travel jobs need extra kit time and a travel fee on the quote.',
                confirmLabel: lead.outstation ? 'Clear' : 'Mark outstation',
                cancelLabel: 'Leave it',
              }).then((ok) => {
                if (ok) patchLead(lead.id, { outstation: !lead.outstation })
              })
            }
          />
          Outstation / travel job
        </label>
        <Field label="Travel fee">
          <input
            className={fieldBox()}
            inputMode="numeric"
            value={lead.travelFee ? String(lead.travelFee) : ''}
            placeholder="0"
            onBlur={(e) => {
              const next = Number(onlyMoney(e.target.value) || 0)
              if (next === lead.travelFee) return
              patchLead(lead.id, { travelFee: next })
            }}
            onChange={(e) => patchLead(lead.id, { travelFee: Number(onlyMoney(e.target.value) || 0) })}
          />
        </Field>
        <Field label="Gallery due">
          <input
            type="date"
            className={fieldBox() + ' date-input'}
            value={lead.galleryDueOn}
            onChange={(e) => patchLead(lead.id, { galleryDueOn: e.target.value })}
          />
        </Field>
        <Field label="Album due">
          <input
            type="date"
            className={fieldBox() + ' date-input'}
            value={lead.albumDueOn}
            onChange={(e) => patchLead(lead.id, { albumDueOn: e.target.value })}
          />
        </Field>
      </div>
      {lead.travelFee > 0 ? <p className="mt-2 text-xs text-gold-soft">Travel {money(lead.travelFee)} sits on this job.</p> : null}

      <p className="mt-6 text-xs uppercase tracking-[0.22em] text-mute">Delivery</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(
          [
            ['pending', 'Not sent'],
            ['gallery_sent', 'Gallery sent'],
            ['album_delivered', 'Album delivered'],
          ] as [DeliveryStatus, string][]
        ).map(([status, label]) => (
          <Button
            key={status}
            tone={lead.deliveryStatus === status ? 'gold' : 'ghost'}
            className="min-h-9 px-3 text-xs"
            onClick={() =>
              void confirm({
                title: `Mark delivery “${label}”?`,
                body: `Update ${lead.coupleName} so the studio knows where the files are.`,
                confirmLabel: 'Update delivery',
                cancelLabel: 'Not now',
              }).then((ok) => {
                if (ok) patchLead(lead.id, { deliveryStatus: status })
              })
            }
          >
            {label}
          </Button>
        ))}
      </div>

      <p className="mt-6 text-xs uppercase tracking-[0.22em] text-mute">Vendors on this wedding</p>
      <ul className="mt-3 space-y-2">
        {lead.vendors.map((vendor) => (
          <li key={vendor.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line px-4 py-3 text-sm">
            <span>
              <span className="text-gold-soft">{vendor.role}</span> · {vendor.name || '—'} · {vendor.phone || 'no phone'}
            </span>
            <button
              type="button"
              className="text-xs text-mute hover:text-orange-200"
              onClick={() =>
                void confirm({
                  title: `Remove ${vendor.name || vendor.role}?`,
                  body: 'They leave this wedding’s vendor list.',
                  confirmLabel: 'Remove vendor',
                  cancelLabel: 'Keep them',
                  danger: true,
                }).then((ok) => {
                  if (ok) patchLead(lead.id, { vendors: lead.vendors.filter((v) => v.id !== vendor.id) })
                })
              }
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 grid gap-2 sm:grid-cols-[8rem_1fr_8rem_auto]">
        <select className={fieldBox()} value={role} onChange={(e) => setRole(e.target.value)}>
          {VENDOR_ROLES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <input className={fieldBox()} value={name} placeholder="Name" maxLength={80} onChange={(e) => setName(onlyName(e.target.value))} />
        <input className={fieldBox()} value={phone} placeholder="Phone" inputMode="tel" maxLength={13} onChange={(e) => setPhone(onlyPhone(e.target.value))} />
        <Button
          tone="ghost"
          className="min-h-11"
          onClick={() =>
            void confirm({
              title: `Add ${role}?`,
              body: name ? `${name} will sit on ${lead.coupleName}’s wedding.` : `Add a ${role.toLowerCase()} with no name yet.`,
              confirmLabel: 'Add vendor',
              cancelLabel: 'Not now',
            }).then((ok) => {
              if (!ok) return
              patchLead(lead.id, { vendors: [...lead.vendors, { id: id(), role, name: name.trim(), phone: phone.trim() }] })
              setName('')
              setPhone('')
            })
          }
        >
          Add
        </Button>
      </div>
    </article>
  )
}

export function ProCrmFile({ lead }: { lead: Lead }) {
  const confirm = useConfirm()
  return (
    <article className="gh-card rounded-3xl border border-gold/35 bg-ink-2 p-5 sm:p-6">
      <p className="text-xs uppercase tracking-[0.22em] text-gold-soft">Studio Pro CRM</p>
      <p className="mt-2 text-sm text-mute">Date holds, contracts, crew, shot list and aftercare — the layer Táve and Studio Ninja put on a booked job.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Field label="Hold this date until" hint="Pencil booking. Shows on the calendar.">
          <input
            type="date"
            className={fieldBox() + ' date-input'}
            value={lead.holdUntil}
            onChange={(e) => patchLead(lead.id, { holdUntil: e.target.value })}
          />
        </Field>
        <Field label="Aftercare / album follow-up">
          <input
            type="date"
            className={fieldBox() + ' date-input'}
            value={lead.aftercareOn}
            onChange={(e) => patchLead(lead.id, { aftercareOn: e.target.value })}
          />
        </Field>
      </div>
      {lead.holdUntil ? <p className="mt-2 text-xs text-gold-soft">Date held until {day(lead.holdUntil)}.</p> : null}

      <p className="mt-6 text-xs uppercase tracking-[0.22em] text-mute">Agreement</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(
          [
            ['none', 'No contract'],
            ['sent', 'Sent'],
            ['signed', 'Signed'],
          ] as [ContractStatus, string][]
        ).map(([status, label]) => (
          <Button
            key={status}
            tone={lead.contractStatus === status ? 'gold' : 'ghost'}
            className="min-h-9 px-3 text-xs"
            onClick={() =>
              void confirm({
                title: `Mark agreement “${label}”?`,
                body: 'Not e-sign — a desk status so HQ and the second shooter know the paper is done.',
                confirmLabel: 'Update agreement',
                cancelLabel: 'Not now',
              }).then((ok) => {
                if (ok) patchLead(lead.id, { contractStatus: status })
              })
            }
          >
            {label}
          </Button>
        ))}
      </div>

      <Field label="Crew / second shooter" hint="Who is on the job, kit, call time.">
        <textarea
          className={fieldBox() + ' mt-2 min-h-24'}
          value={lead.crewNotes}
          maxLength={1000}
          onChange={(e) => patchLead(lead.id, { crewNotes: e.target.value.slice(0, 1000) })}
          placeholder="Second shooter, two bodies, call 05:30 at the hotel."
        />
      </Field>

      <p className="mt-6 text-xs uppercase tracking-[0.22em] text-mute">Shot list / deliverables</p>
      <ul className="mt-3 space-y-2">
        {lead.deliverables.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-2xl border border-line px-4 py-3 text-left text-sm hover:border-gold/40"
              onClick={() =>
                void confirm({
                  title: item.done ? `Unmark ${item.label}?` : `Mark ${item.label} done?`,
                  body: 'This is the delivery checklist for this couple.',
                  confirmLabel: item.done ? 'Unmark' : 'Mark done',
                  cancelLabel: 'Leave it',
                }).then((ok) => {
                  if (!ok) return
                  patchLead(lead.id, {
                    deliverables: lead.deliverables.map((row) => (row.id === item.id ? { ...row, done: !row.done } : row)),
                  })
                })
              }
            >
              <span>{item.label}</span>
              <span className="text-gold-soft">{item.done ? 'Done' : 'Open'}</span>
            </button>
          </li>
        ))}
      </ul>
    </article>
  )
}

export function ProCrmGate() {
  return (
    <article className="gh-card rounded-3xl border border-gold/35 bg-ink-2 p-5 sm:p-6">
      <p className="text-xs uppercase tracking-[0.22em] text-gold-soft">Studio Pro</p>
      <p className="mt-2 font-display text-2xl">Holds, contracts, crew, shot list</p>
      <p className="mt-2 text-sm text-mute">
        Pencil a date, track the agreement, brief the second shooter, and tick teaser / album / gallery. Studio still runs enquiry, quote and money.
      </p>
      <Link to="/studio/billing" className="mt-3 inline-block text-sm text-gold-soft">
        Move to Pro · ₹1,499
      </Link>
    </article>
  )
}
