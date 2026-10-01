import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark.tsx'
import { Button } from '../components/Button.tsx'
import { Field, fieldClass } from '../components/Field.tsx'
import { acceptSession, api, homeAfterAuth } from '../lib/store.ts'
import type { StudioSnapshot } from '../lib/types.ts'

export function Signup() {
  const navigate = useNavigate()
  const [studioName, setStudioName] = useState('')
  const [owner, setOwner] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const data = await api<StudioSnapshot>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, studioName, owner, city, phone }),
      })
      acceptSession(data)
      navigate(homeAfterAuth(data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create studio')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink px-4 py-12 text-cream sm:px-6">
      <div className="mx-auto max-w-lg">
        <BrandMark />
        <h1 className="mt-10 font-display text-5xl">Start your studio desk</h1>
        <p className="mt-3 text-mute">
          14 days free. Then ₹799 / month. Your leads stay on the server, not in this browser.
        </p>
        <form onSubmit={submit} className="mt-10 space-y-5">
          <Field label="Studio name">
            <input className={fieldClass} value={studioName} onChange={(e) => setStudioName(e.target.value)} required />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Owner">
              <input className={fieldClass} value={owner} onChange={(e) => setOwner(e.target.value)} />
            </Field>
            <Field label="City">
              <input className={fieldClass} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Madurai" />
            </Field>
          </div>
          <Field label="WhatsApp / phone">
            <input className={fieldClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Email">
            <input className={fieldClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password (8+ characters)">
            <input
              className={fieldClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </Field>
          {error ? <p className="text-sm text-orange-200">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Creating…' : 'Create studio · 14-day trial'}
          </Button>
        </form>
        <p className="mt-6 text-sm text-mute">
          Already have a desk?{' '}
          <Link to="/login" className="text-gold-soft">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
