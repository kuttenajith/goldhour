import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, MessageCircle } from 'lucide-react'
import { Button } from '../components/Button.tsx'
import { Field, fieldClass } from '../components/Field.tsx'
import { LeadForm } from '../components/LeadForm.tsx'
import { Modal } from '../components/Modal.tsx'
import { StatusPill } from '../components/StatusPill.tsx'
import { addPayment, addQuotation, removeLead, setNextAction, upsertLead, useStudio } from '../lib/store.ts'
import { addDays, balance, day, money, paid, todayIso } from '../lib/format.ts'
import { id } from '../lib/ids.ts'
import { downloadQuotation } from '../lib/pdf.ts'
import { eventMessage, paymentMessage, quotationMessage, waLink } from '../lib/whatsapp.ts'
import type { Lead, Payment } from '../lib/types.ts'

export function LeadDetail() {
  const { id: leadId } = useParams()
  const navigate = useNavigate()
  const state = useStudio()
  const lead = state.leads.find((l) => l.id === leadId)
  const [editing, setEditing] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)

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
  const due = balance(lead)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/studio/leads" className="text-xs uppercase tracking-[0.22em] text-gold-soft">
            ← Leads
          </Link>
          <h1 className="mt-3 font-display text-5xl">{lead.coupleName}</h1>
          <p className="mt-2 text-mute">
            {lead.city} · {lead.phone}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill status={lead.status} />
          <Button tone="ghost" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Fact label="Wedding" value={day(lead.eventDate)} />
        <Fact label="Package" value={money(lead.packageAmount || lead.budget)} />
        <Fact label="Advance" value={`${money(collected)}${collected > 0 ? ' ✓' : ''}`} />
        <Fact label="Balance" value={money(due)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-line bg-ink-2 p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-mute">Events</p>
          <ul className="mt-4 space-y-3">
            {lead.events.map((ev) => (
              <li key={ev.id} className="flex items-center justify-between rounded-2xl border border-line px-4 py-3">
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
              </li>
            ))}
          </ul>

          <p className="mt-8 text-xs uppercase tracking-[0.22em] text-mute">Next action</p>
          <p className="mt-3 font-display text-3xl text-gold-soft">{lead.nextAction}</p>
          <p className="mt-1 text-sm text-mute">{day(lead.nextActionOn)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              tone="ghost"
              onClick={() => setNextAction(lead.id, 'Follow up today', todayIso())}
            >
              Today
            </Button>
            <Button
              tone="ghost"
              onClick={() => setNextAction(lead.id, 'Follow up tomorrow', addDays(todayIso(), 1))}
            >
              Tomorrow
            </Button>
            <Button
              tone="ghost"
              onClick={() =>
                setNextAction(lead.id, 'Follow up after 7 days', addDays(todayIso(), 7))
              }
            >
              After 7 days
            </Button>
          </div>
        </article>

        <div className="space-y-6">
          <article className="rounded-3xl border border-line bg-ink-2 p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-mute">WhatsApp</p>
            <div className="mt-4 grid gap-2">
              <WaButton href={waLink(lead.phone, quotationMessage(state.studio, lead))}>
                Send quotation
              </WaButton>
              <WaButton href={waLink(lead.phone, paymentMessage(state.studio, lead))}>
                Send payment reminder
              </WaButton>
              <WaButton href={waLink(lead.phone, eventMessage(state.studio, lead))}>
                Send event reminder
              </WaButton>
            </div>
          </article>

          <article className="rounded-3xl border border-line bg-ink-2 p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-mute">Notes</p>
            <p className="mt-3 text-sm leading-relaxed text-cream/80">{lead.notes || '—'}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={() => setQuoteOpen(true)}>Create quotation</Button>
              <Button tone="ghost" onClick={() => setPayOpen(true)}>
                Record payment
              </Button>
            </div>
          </article>
        </div>
      </div>

      <article className="rounded-3xl border border-line bg-ink-2 p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-mute">Payments</p>
        {lead.payments.length === 0 ? (
          <p className="mt-4 text-mute">No money received yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {lead.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3">
                <span>
                  <span className="capitalize">{p.kind}</span>
                  <span className="ml-2 text-xs text-mute">{day(p.receivedOn)}</span>
                </span>
                <span className="text-gold-soft">{money(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
        <button
          className="mt-6 text-sm text-mute hover:text-orange-200"
          onClick={() => {
            removeLead(lead.id)
            navigate('/studio/leads')
          }}
        >
          Remove this lead
        </button>
      </article>

      {editing ? (
        <Modal title="Edit lead" onClose={() => setEditing(false)}>
          <LeadForm
            initial={lead}
            onSave={(next) => {
              upsertLead(next)
              setEditing(false)
            }}
            onCancel={() => setEditing(false)}
          />
        </Modal>
      ) : null}

      {payOpen ? (
        <PaymentModal
          onClose={() => setPayOpen(false)}
          onSave={(payment) => {
            addPayment(lead.id, payment)
            setPayOpen(false)
          }}
        />
      ) : null}

      {quoteOpen ? (
        <QuoteModal
          lead={lead}
          onClose={() => setQuoteOpen(false)}
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
              status: lead.status === 'new' ? 'quoted' : lead.status,
              nextAction: 'Quotation sent',
            })
            downloadQuotation(state.studio, { ...lead, packageAmount: amount }, quote)
            setQuoteOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-3xl border border-line bg-ink-2 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-mute">{label}</p>
      <p className="mt-2 font-display text-3xl text-gold-soft">{value}</p>
    </article>
  )
}

function WaButton({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center justify-center gap-2 rounded-full border border-gold/40 px-4 py-2.5 text-sm text-gold-soft hover:border-gold hover:text-cream"
    >
      <MessageCircle size={16} /> {children}
    </a>
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
  const [kind, setKind] = useState<Payment['kind']>('advance')
  const [note, setNote] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
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
      <form onSubmit={submit} className="space-y-4">
        <Field label="Amount">
          <input
            required
            type="number"
            min={1}
            className={fieldClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Kind">
          <select
            className={fieldClass}
            value={kind}
            onChange={(e) => setKind(e.target.value as Payment['kind'])}
          >
            <option value="advance">Advance</option>
            <option value="balance">Balance</option>
            <option value="extra">Extra</option>
          </select>
        </Field>
        <Field label="Note">
          <input className={fieldClass} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
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

  function submit(e: FormEvent) {
    e.preventDefault()
    onSave(packageName, Number(amount), notes)
  }

  return (
    <Modal title="Quotation" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Package">
          <input
            required
            className={fieldClass}
            value={packageName}
            onChange={(e) => setPackageName(e.target.value)}
          />
        </Field>
        <Field label="Amount">
          <input
            required
            type="number"
            min={1}
            className={fieldClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Notes on the PDF">
          <textarea
            className={fieldClass + ' min-h-24'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button tone="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Download PDF</Button>
        </div>
      </form>
    </Modal>
  )
}
