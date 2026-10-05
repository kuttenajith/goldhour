import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark.tsx'
import { Button } from '../components/Button.tsx'
import { NoticeBell } from '../components/NoticeBell.tsx'
import { firstName } from '../lib/copilot.ts'
import { api, acceptSession, useStudio } from '../lib/store.ts'
import { UserHello } from '../components/UserHello.tsx'
import type { StudioSnapshot } from '../lib/types.ts'

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void }
  }
}

const plans = [
  {
    id: 'studio',
    name: 'Studio',
    price: '₹999',
    note: 'The booking desk: leads, quotes, follow-ups and couple payments.',
    items: ['Unlimited leads and bookings', 'Quotations as PDF', 'Couple payments', 'Follow-ups', 'Event checklist'],
  },
  {
    id: 'studio_pro',
    name: 'Studio Pro',
    price: '₹1,500',
    note: 'Studio plus calendar, day-of timeline, WhatsApp desk, Padmavathi and reports.',
    items: ['Everything in Studio', 'Wedding calendar', 'Day-of timeline', 'WhatsApp templates', 'Padmavathi', 'Activity reports'],
  },
]

export function Billing() {
  const snap = useStudio()
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  async function pay(plan: string) {
    setError('')
    setNote('')
    setBusy(plan)
    try {
      const order = await api<{
        keyId?: string
        orderId?: string
        amount?: number
        name?: string
        description?: string
        email?: string
        phone?: string
        requested?: boolean
        message?: string
      }>('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      })
      if (order.requested) {
        setNote(order.message || 'HQ has your request. You can start a paid plan during the trial.')
        return
      }
      if (!window.Razorpay || !order.keyId || !order.orderId || !order.amount) {
        throw new Error('Razorpay checkout did not load. Refresh and try again.')
      }
      const ck = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: 'INR',
        name: order.name,
        description: order.description,
        order_id: order.orderId,
        prefill: { email: order.email, contact: order.phone },
        theme: { color: '#c9a227' },
        handler: async (response: {
          razorpay_order_id: string
          razorpay_payment_id: string
          razorpay_signature: string
        }) => {
          const next = await api<StudioSnapshot>('/api/billing/confirm', {
            method: 'POST',
            body: JSON.stringify(response),
          })
          acceptSession(next)
          window.location.href = '/studio'
        },
      })
      ck.open()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="min-h-screen bg-ink px-4 py-12 text-cream sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <BrandMark />
          <div className="flex items-center gap-3">
            <NoticeBell />
            <UserHello name={firstName(snap)} />
          </div>
        </div>
        <p className="mt-10 text-sm uppercase tracking-[0.12em] text-gold-soft">Billing</p>
        <h1 className="mt-2 font-display text-5xl">Subscribe any time</h1>
        <p className="mt-4 max-w-xl text-mute">
          {snap.billing.active
            ? snap.billing.status === 'active'
              ? `Studio plan is active until ${snap.billing.periodEndsOn}.`
              : `Trial is on until ${snap.billing.trialEndsOn}. Pay now if you want — you do not have to wait for the trial to end.`
            : `Trial ended on ${snap.billing.trialEndsOn}. Pay to open the desk again.`}
        </p>
        {error ? <p className="mt-4 text-sm text-orange-200">{error}</p> : null}
        {note ? <p className="mt-4 text-sm text-gold-soft">{note}</p> : null}
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {plans.map((p) => (
            <article key={p.id} className="rounded-3xl border border-line bg-ink-2 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-mute">{p.name}</p>
              <p className="mt-3 font-display text-5xl tabular-nums">
                {p.price}
                <span className="text-lg text-mute"> / month</span>
              </p>
              <p className="mt-3 text-sm text-mute">{p.note}</p>
              <ul className="mt-4 space-y-1 text-sm text-gold-soft">
                {p.items.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
              <Button className="mt-6 w-full" disabled={busy !== null || snap.isDemo} onClick={() => void pay(p.id)}>
                {busy === p.id ? 'Starting…' : snap.billing.status === 'trialing' ? `Start ${p.name} now` : `Pay ${p.price}`}
              </Button>
            </article>
          ))}
        </div>
        {snap.isDemo ? (
          <p className="mt-6 text-sm text-mute">
            Demo desk stays free.{' '}
            <Link to="/signup" className="text-gold-soft">
              Create your studio
            </Link>{' '}
            to subscribe.
          </p>
        ) : null}
        <p className="mt-8">
          <Link to={snap.billing.active ? '/studio' : '/login'} className="text-gold-soft">
            {snap.billing.active ? 'Back to desk' : 'Back to sign in'}
          </Link>
        </p>
      </div>
    </div>
  )
}
