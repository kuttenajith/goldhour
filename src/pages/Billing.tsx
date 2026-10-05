import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark.tsx'
import { Button } from '../components/Button.tsx'
import { NoticeBell } from '../components/NoticeBell.tsx'
import { api, acceptSession, useStudio } from '../lib/store.ts'
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
    note: 'One photographer or a small team. Unlimited bookings.',
  },
  {
    id: 'studio_pro',
    name: 'Studio Pro',
    price: '₹1,500',
    note: 'When you need the higher desk. Same workflow, billed as Pro.',
  },
]

export function Billing() {
  const snap = useStudio()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  async function pay(plan: string) {
    setError('')
    setBusy(plan)
    try {
      const order = await api<{
        keyId: string
        orderId: string
        amount: number
        name: string
        description: string
        email: string
        phone: string
      }>('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      })
      if (!window.Razorpay) {
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
          <NoticeBell />
        </div>
        <p className="mt-10 text-sm uppercase tracking-[0.12em] text-gold-soft">Billing</p>
        <h1 className="mt-2 font-display text-5xl">Keep the desk after the trial</h1>
        <p className="mt-4 max-w-xl text-mute">
          {snap.billing.active
            ? snap.billing.status === 'active'
              ? `Studio plan is active until ${snap.billing.periodEndsOn}.`
              : `Trial is on until ${snap.billing.trialEndsOn}. Pay any time to keep going.`
            : `Trial ended on ${snap.billing.trialEndsOn}. Pay to open the desk again.`}
        </p>
        {error ? <p className="mt-4 text-sm text-orange-200">{error}</p> : null}
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {plans.map((p) => (
            <article key={p.id} className="rounded-3xl border border-line bg-ink-2 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-mute">{p.name}</p>
              <p className="mt-3 font-display text-5xl tabular-nums">
                {p.price}
                <span className="text-lg text-mute"> / month</span>
              </p>
              <p className="mt-3 text-sm text-mute">{p.note}</p>
              <Button className="mt-6 w-full" disabled={busy !== null || snap.isDemo} onClick={() => void pay(p.id)}>
                {busy === p.id ? 'Opening Razorpay…' : `Pay ${p.price}`}
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
