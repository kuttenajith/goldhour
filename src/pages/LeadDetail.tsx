import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Check, MessageCircle, Plus } from 'lucide-react'
import { Button } from '../components/Button.tsx'
import { Field, fieldBox } from '../components/Field.tsx'
import { LeadForm } from '../components/LeadForm.tsx'
import { Modal } from '../components/Modal.tsx'
import { Pipeline } from '../components/Pipeline.tsx'
import { StatusPill } from '../components/StatusPill.tsx'
import { paidOf, splitPlan, weddingEvent } from '../lib/booking.ts'
import { addDays, clock, day, money, paid, PAYMENT_LABEL, todayIso } from '../lib/format.ts'
import { id } from '../lib/ids.ts'
import { moneyError, onlyMoney } from '../lib/input.ts'
import { downloadQuotation } from '../lib/pdf.ts'
import {
  addPayment,
  addQuotation,
  patchLead,
  removeLead,
  setNextAction,
  upsertLead,
  useStudio,
} from '../lib/store.ts'
import {
  eventMessage,
  followUpMessage,
  paymentMessage,
  qualifyMessage,
  quotationMessage,
  waLink,
} from '../lib/whatsapp.ts'
import type { Lead, Payment, PaymentKind, TimelineSlot } from '../lib/types.ts'

export function LeadDetail() {
  const { id: leadId } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const state = useStudio()
  const lead = state.leads.find((l) => l.id === leadId)
  const [editing, setEditing] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)

  useEffect(() => {
    const open = params.get('open')
    if (open === 'pay') setPayOpen(true)
    if (open === 'quote') setQuoteOpen(true)
    if (open === 'edit') setEditing(true)
  }, [leadId, params])

  function clearOpen() {
    if (!params.get('open')) return
    const next = new URLSearchParams(params)
    next.delete('open')
    setParams(next, { replace: true })
  }

  if (!lead) {
    return (
      <div>
        <p className="text-mute">This lead is no longer on the desk.</p>
        <Link to="/studio/leads" className="mt-4 inline-block text-gold-soft">
          Back to leads
        </Link>
      </div>
    )
  }

  const collected = paid(lead)
  const due = Math.max(0, lead.packageAmount - collected)
  const wedding = weddingEvent(lead)
  const canQuote = lead.status === 'new' || lead.status === 'quoted' || lead.status === 'follow_up' || lead.status === 'no_response'
  const canAccept = lead.status === 'quoted' || lead.status === 'follow_up' || lead.status === 'no_response'
  const canBook = lead.status === 'accepted'

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/studio/leads" className="text-[11px] uppercase tracking-[0.18em] text-gold-soft">
            ← Leads
          </Link>
          <h1 className="mt-2 font-display text-2xl leading-tight sm:text-3xl">{lead.coupleName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-mute">
            <StatusPill status={lead.status} />
            <span>
              {lead.venue || lead.city} · {lead.phone}
            </span>
          </div>
        </div>
        <Button tone="ghost" onClick={() => setEditing(true)}>
          Edit
        </Button>
      </div>

      <Pipeline status={lead.status} />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Fact label="Wedding" value={day(lead.eventDate)} />
        <Fact label="Package" value={money(lead.packageAmount || lead.budget)} />
        <Fact label="Advance" value={`${money(paidOf(lead, 'advance'))}${paidOf(lead, 'advance') >= lead.plan.advance && lead.plan.advance > 0 ? ' ✓' : ''}`} />
        <Fact label="Outstanding" value={money(due)} />
      </div>

      <div className="flex flex-wrap gap-2">
        {canQuote ? <Button onClick={() => setQuoteOpen(true)}>Create quotation</Button> : null}
        {canAccept ? (
          <Button
            tone="ghost"
            onClick={() =>
              patchLead(lead.id, {
                status: 'accepted',
                nextAction: 'Collect advance and confirm booking',
                nextActionOn: todayIso(),
              })
            }
          >
            Mark accepted
          </Button>
        ) : null}
        {canBook ? (
          <Button
            onClick={() =>
              patchLead(lead.id, {
                status: 'booked',
                nextAction: 'Plan the wedding day',
                nextActionOn: todayIso(),
              })
            }
          >
            Confirm booking
          </Button>
        ) : null}
        <Button tone="ghost" onClick={() => setPayOpen(true)}>
          Record payment
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-line bg-ink-2 p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-mute">Events</p>
          <ul className="mt-4 space-y-3">
            {lead.events.map((ev) => (
              <li key={ev.id}>
                <button
                  type="button"
                  onClick={() =>
                    patchLead(lead.id, {
                      events: lead.events.map((item) =>
                        item.id === ev.id ? { ...item, done: !item.done } : item,
                      ),
                    })
                  }
                  className="flex w-full items-center justify-between rounded-2xl border border-line px-4 py-3 text-left"
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={
                        ev.done
                          ? 'flex h-6 w-6 items-center justify-center rounded-full bg-gold text-ink'
                          : 'flex h-6 w-6 items-center justify-center rounded-full border border-gold/40 text-gold'
                      }
                    >
                      {ev.done ? <Check size={14} /> : null}
                    </span>
                    {ev.name}
                  </span>
                  <span className="text-sm text-mute">{day(ev.date)}</span>
                </button>
              </li>
            ))}
          </ul>

          <p className="mt-8 text-xs uppercase tracking-[0.22em] text-mute">Next action</p>
          <p className="mt-3 font-display text-2xl text-gold-soft sm:text-3xl">{lead.nextAction}</p>
          <p className="mt-1 text-sm text-mute">{day(lead.nextActionOn)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              tone="ghost"
              onClick={() =>
                setNextAction(lead.id, 'Follow up in 2 days', addDays(todayIso(), 2), 'follow_up')
              }
            >
              Follow up in 2 days
            </Button>
            <Button
              tone="ghost"
              onClick={() =>
                setNextAction(lead.id, 'No response — follow up in 5 days', addDays(todayIso(), 5), 'no_response')
              }
            >
              No response · 5 days
            </Button>
          </div>
        </article>

        <div className="space-y-6">
          <article className="rounded-3xl border border-line bg-ink-2 p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-mute">WhatsApp</p>
            <div className="mt-4 grid gap-2">
              {lead.status === 'new' ? (
                <WaButton href={waLink(lead.phone, qualifyMessage(state.studio, lead))}>
                  Ask date, venue & functions
                </WaButton>
              ) : null}
              <WaButton href={waLink(lead.phone, quotationMessage(state.studio, lead))}>
                Send quotation
              </WaButton>
              <WaButton href={waLink(lead.phone, followUpMessage(state.studio, lead))}>
                Send follow-up
              </WaButton>
              <WaButton href={waLink(lead.phone, paymentMessage(state.studio, lead))}>
                Send payment reminder
              </WaButton>
              <WaButton href={waLink(lead.phone, eventMessage(state.studio, lead))}>
                Send event reminder
              </WaButton>
            </div>
          </article>
          <article className="rounded-3xl border border-line bg-ink-2 p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-mute">Notes</p>
            <p className="mt-3 text-sm leading-relaxed text-cream/80">{lead.notes || '—'}</p>
          </article>
        </div>
      </div>

      <PaymentBoard lead={lead} />

      {wedding ? (
        <TimelineBoard
          date={wedding.date || lead.eventDate}
          slots={wedding.timeline}
          onChange={(timeline) =>
            patchLead(lead.id, {
              events: lead.events.map((ev) => (ev.id === wedding.id ? { ...ev, timeline } : ev)),
            })
          }
        />
      ) : null}

      <button
        className="text-sm text-mute hover:text-orange-200"
        onClick={() => {
          removeLead(lead.id)
          navigate('/studio/leads')
        }}
      >
        Remove this lead
      </button>

      {editing ? (
        <Modal
          title="Edit enquiry"
          onClose={() => {
            setEditing(false)
            clearOpen()
          }}
        >
          <LeadForm
            initial={lead}
            onSave={(next) => {
              upsertLead(next)
              setEditing(false)
              clearOpen()
            }}
            onCancel={() => {
              setEditing(false)
              clearOpen()
            }}
          />
        </Modal>
      ) : null}

      {payOpen ? (
        <PaymentModal
          onClose={() => {
            setPayOpen(false)
            clearOpen()
          }}
          onSave={(payment) => {
            addPayment(lead.id, payment)
            setPayOpen(false)
            clearOpen()
          }}
        />
      ) : null}

      {quoteOpen ? (
        <QuoteModal
          lead={lead}
          onClose={() => {
            setQuoteOpen(false)
            clearOpen()
          }}
          onSave={(packageName, amount, notes) => {
            const quote = {
              id: id(),
              leadId: lead.id,
              packageName,
              amount,
              createdOn: todayIso(),
              notes,
            }
            addQuotation(quote)
            upsertLead({
              ...lead,
              packageAmount: amount,
              plan: splitPlan(amount),
              status: 'quoted',
              nextAction: 'Follow up in 2 days',
              nextActionOn: addDays(todayIso(), 2),
            })
            downloadQuotation(state.studio, { ...lead, packageAmount: amount, plan: splitPlan(amount) }, quote)
            setQuoteOpen(false)
            clearOpen()
          }}
        />
      ) : null}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-line bg-ink-2 px-3 py-3 sm:px-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-mute">{label}</p>
      <p className="mt-1 text-sm font-medium tabular-nums text-gold-soft sm:text-base">{value}</p>
    </article>
  )
}

function WaButton({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-gold/40 px-4 py-2.5 text-center text-sm text-gold-soft hover:border-gold hover:text-cream"
    >
      <MessageCircle size={16} /> {children}
    </a>
  )
}

function PaymentBoard({ lead }: { lead: Lead }) {
  const stages: { kind: Exclude<PaymentKind, 'extra'>; label: string; due: number }[] = [
    { kind: 'advance', label: 'Advance', due: lead.plan.advance },
    { kind: 'before_wedding', label: 'Before wedding', due: lead.plan.beforeWedding },
    { kind: 'final_delivery', label: 'Final delivery', due: lead.plan.finalDelivery },
  ]

  return (
    <article className="rounded-3xl border border-line bg-ink-2 p-5 sm:p-6">
      <p className="text-xs uppercase tracking-[0.22em] text-mute">Payments</p>
      <p className="mt-2 font-display text-3xl tabular-nums">{money(lead.packageAmount || lead.budget)} total</p>
      <ul className="mt-5 space-y-3">
        {stages.map((stage) => {
          const got = paidOf(lead, stage.kind)
          const done = stage.due > 0 && got >= stage.due
          return (
            <li key={stage.kind} className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
              <span>
                {stage.label}
                {done ? ' ✓' : ''}
                <span className="ml-2 text-sm tabular-nums text-mute">
                  {money(got)} / {money(stage.due)}
                </span>
              </span>
              <span className="text-lg font-semibold tabular-nums text-gold-soft">{money(stage.due)}</span>
            </li>
          )
        })}
      </ul>
      <p className="mt-5 text-sm text-mute">
        Outstanding: <span className="text-gold-soft">{money(Math.max(0, lead.packageAmount - paid(lead)))}</span>
      </p>
    </article>
  )
}

function TimelineBoard({
  date,
  slots,
  onChange,
}: {
  date: string
  slots: TimelineSlot[]
  onChange: (slots: TimelineSlot[]) => void
}) {
  const ordered = [...slots].sort((a, b) => a.time.localeCompare(b.time))

  return (
    <article className="rounded-3xl border border-line bg-ink-2 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-mute">Wedding day</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl">{day(date)}</h2>
        </div>
        <Button
          tone="ghost"
          onClick={() =>
            onChange([...slots, { id: id(), time: '18:00', title: 'New beat' }])
          }
        >
          <Plus size={16} /> Add beat
        </Button>
      </div>
      <ol className="mt-5 space-y-2">
        {ordered.map((slot) => (
          <li key={slot.id} className="grid grid-cols-1 items-center gap-2 rounded-2xl border border-line px-3 py-2 sm:grid-cols-[9rem_1fr_auto]">
            <input
              type="time"
              className="bg-transparent text-sm text-gold-soft outline-none"
              value={slot.time}
              onChange={(e) =>
                onChange(slots.map((s) => (s.id === slot.id ? { ...s, time: e.target.value } : s)))
              }
            />
            <input
              className="bg-transparent text-sm outline-none"
              value={slot.title}
              onChange={(e) =>
                onChange(slots.map((s) => (s.id === slot.id ? { ...s, title: e.target.value } : s)))
              }
            />
            <button
              className="text-xs text-mute hover:text-cream"
              onClick={() => onChange(slots.filter((s) => s.id !== slot.id))}
            >
              Remove
            </button>
          </li>
        ))}
      </ol>
      {ordered.length === 0 ? (
        <p className="mt-4 text-sm text-mute">No beats yet. Add getting-ready, ceremony, portraits.</p>
      ) : (
        <p className="mt-4 text-xs text-mute">
          {ordered.map((s) => `${clock(s.time)}  ${s.title}`).join(' · ')}
        </p>
      )}
    </article>
  )
}

function PaymentModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (payment: Payment) => void
}) {
  const [amount, setAmount] = useState('')
  const [kind, setKind] = useState<PaymentKind>('advance')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const msg = moneyError(amount)
    setError(msg)
    if (msg) return
    onSave({
      id: id(),
      amount: Number(amount),
      kind,
      receivedOn: todayIso(),
      note,
    })
  }

  return (
    <Modal title="Record payment" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Amount" error={error} hint="Numbers only">
          <input
            required
            inputMode="numeric"
            className={fieldBox(error)}
            value={amount}
            onChange={(e) => {
              const next = onlyMoney(e.target.value)
              setAmount(next)
              setError(next ? moneyError(next) : '')
            }}
          />
        </Field>
        <Field label="Stage">
          <select
            className={fieldBox()}
            value={kind}
            onChange={(e) => setKind(e.target.value as PaymentKind)}
          >
            <option value="advance">{PAYMENT_LABEL.advance}</option>
            <option value="before_wedding">{PAYMENT_LABEL.before_wedding}</option>
            <option value="final_delivery">{PAYMENT_LABEL.final_delivery}</option>
            <option value="extra">{PAYMENT_LABEL.extra}</option>
          </select>
        </Field>
        <Field label="Note">
          <input className={fieldBox()} value={note} onChange={(e) => setNote(e.target.value.slice(0, 80))} placeholder="UPI / cash / transfer" />
        </Field>
        <div className="flex flex-wrap justify-end gap-2">
          <Button tone="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  )
}

function QuoteModal({
  lead,
  onClose,
  onSave,
}: {
  lead: Lead
  onClose: () => void
  onSave: (packageName: string, amount: number, notes: string) => void
}) {
  const defaultName = useMemo(
    () =>
      lead.service === 'both'
        ? 'Signature — photo + film'
        : lead.service === 'cinematography'
          ? 'Cinema — highlight + teaser'
          : 'Classic — wedding photography',
    [lead.service],
  )
  const [packageName, setPackageName] = useState(defaultName)
  const [amount, setAmount] = useState(String(lead.packageAmount || lead.budget || ''))
  const [notes, setNotes] = useState(lead.notes)
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const msg = moneyError(amount)
    setError(msg)
    if (msg || !packageName.trim()) return
    onSave(packageName, Number(amount), notes)
  }

  return (
    <Modal title="Quotation" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Package">
          <input
            required
            className={fieldBox()}
            value={packageName}
            onChange={(e) => setPackageName(e.target.value.slice(0, 80))}
          />
        </Field>
        <Field label="Amount" error={error} hint="Numbers only">
          <input
            required
            inputMode="numeric"
            className={fieldBox(error)}
            value={amount}
            onChange={(e) => {
              const next = onlyMoney(e.target.value)
              setAmount(next)
              setError(next ? moneyError(next) : '')
            }}
          />
        </Field>
        <Field label="Notes on the PDF">
          <textarea
            className={fieldBox() + ' min-h-24'}
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 500))}
          />
        </Field>
        <div className="flex flex-wrap justify-end gap-2">
          <Button tone="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Download PDF</Button>
        </div>
      </form>
    </Modal>
  )
}
