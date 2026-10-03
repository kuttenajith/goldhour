import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark.tsx'
import { Button } from '../components/Button.tsx'
import { Field, fieldClass } from '../components/Field.tsx'
import { SiteVisits } from '../components/SiteVisits.tsx'
import { acceptSession, api, homeAfterAuth } from '../lib/store.ts'
import type { StudioSnapshot } from '../lib/types.ts'
import { asset } from '../lib/paths.ts'

export function StudioLogin() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const verify = params.get('verify')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const data = await api<StudioSnapshot>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      acceptSession(data)
      navigate(homeAfterAuth(data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in')
    } finally {
      setBusy(false)
    }
  }

  async function openDemo(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const data = await api<StudioSnapshot>('/api/auth/demo', {
        method: 'POST',
        body: JSON.stringify({ pin }),
      })
      acceptSession(data)
      navigate(homeAfterAuth(data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open demo')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <img
          src={asset('photos/mandap.png')}
          alt="Wedding mandap at dusk"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
        <p className="absolute bottom-10 left-10 max-w-sm font-display text-4xl text-cream">
          Your studio. Your bookings. Paid software, not a WhatsApp thread.
        </p>
      </div>
      <div className="flex flex-col justify-center bg-ink px-6 py-16 sm:px-16">
        <BrandMark sweep />
        <h1 className="mt-10 font-display text-5xl">Studio sign in</h1>
        {verify === 'ok' ? <p className="mt-3 text-sm text-gold-soft">Email confirmed. Sign in.</p> : null}
        {verify === 'expired' ? <p className="mt-3 text-sm text-orange-200">That confirmation link expired.</p> : null}
        <p className="mt-3 max-w-md text-mute">
          Sign in to your desk, or open the Madurai demo with PIN{' '}
          <span className="text-gold-soft">2026</span>.
        </p>
        <form onSubmit={submit} className="mt-10 max-w-sm space-y-5">
          <Field label="Email">
            <input
              className={fieldClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              placeholder="studio@email.com"
            />
          </Field>
          <Field label="Password">
            <input
              className={fieldClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </Field>
          {error ? <p className="text-sm text-orange-200">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Opening…' : 'Enter the studio desk'}
          </Button>
        </form>
        <p className="mt-4 max-w-sm text-sm text-mute">
          <Link to="/forgot" className="text-gold-soft">
            Forgot password
          </Link>
          {' · '}
          New studio?{' '}
          <Link to="/signup" className="text-gold-soft">
            Start a 14-day trial
          </Link>
        </p>
        <form onSubmit={openDemo} className="mt-10 max-w-sm space-y-3 border-t border-line pt-8">
          <p className="text-sm text-mute">Just showing a client? Open Meenakshi Frames.</p>
          <Field label="Demo PIN">
            <input
              className={fieldClass}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="2026"
              inputMode="numeric"
            />
          </Field>
          <Button type="submit" tone="ghost" className="w-full" disabled={busy}>
            Open demo desk
          </Button>
        </form>
        <p className="mt-10 text-xs text-mute">
          <SiteVisits />
        </p>
      </div>
    </div>
  )
}
