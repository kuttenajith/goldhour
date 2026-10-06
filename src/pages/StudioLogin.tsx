import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark.tsx'
import { Button } from '../components/Button.tsx'
import { Field, fieldBox } from '../components/Field.tsx'
import { acceptSession, api, homeAfterAuth } from '../lib/store.ts'
import { emailError, onlyPhone } from '../lib/input.ts'
import type { StudioSnapshot } from '../lib/types.ts'
import { asset } from '../lib/paths.ts'

export function StudioLogin() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const verify = params.get('verify')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [demoEmail, setDemoEmail] = useState('')
  const [demoEmailHint, setDemoEmailHint] = useState('')
  const [error, setError] = useState('')
  const [emailHint, setEmailHint] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const mail = emailError(email)
    setEmailHint(mail)
    setError('')
    if (mail) return
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
    const mailHint = demoEmail.trim() ? emailError(demoEmail) : ''
    setDemoEmailHint(mailHint)
    setError('')
    if (mailHint) return
    setBusy(true)
    try {
      const data = await api<StudioSnapshot>('/api/auth/demo', {
        method: 'POST',
        body: JSON.stringify({ pin, email: demoEmail.trim() || undefined }),
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
    <div className="grid min-h-dvh overflow-x-clip lg:grid-cols-2">
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
        <h1 className="mt-10 font-display text-4xl sm:text-5xl">Studio sign in</h1>
        {verify === 'ok' ? <p className="mt-3 text-sm text-gold-soft">Email confirmed. Sign in.</p> : null}
        {verify === 'expired' ? <p className="mt-3 text-sm text-orange-200">That confirmation link expired.</p> : null}
        <p className="mt-3 max-w-md text-mute">
          Sign in to your desk, or open the Madurai demo with PIN{' '}
          <span className="text-gold-soft">2026</span>.
        </p>
        <form onSubmit={submit} className="mt-10 max-w-sm space-y-5">
          <Field label="Email" error={emailHint} required>
            <input
              required
              className={fieldBox(emailHint)}
              value={email}
              onChange={(e) => {
                const v = e.target.value.trim()
                setEmail(v)
                setEmailHint(v.includes('@') ? emailError(v) : '')
              }}
              type="email"
              autoComplete="email"
              placeholder="studio@email.com"
              maxLength={120}
            />
          </Field>
          <Field label="Password" required>
            <input
              required
              className={fieldBox()}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              maxLength={128}
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
          <p className="text-sm text-mute">Walk the Madurai demo. Leave your email and we’ll send the 14-day trial offer.</p>
          <Field label="Demo PIN" required>
            <input
              required
              className={fieldBox()}
              value={pin}
              onChange={(e) => setPin(onlyPhone(e.target.value).replace('+', '').slice(0, 4))}
              placeholder="2026"
              inputMode="numeric"
              maxLength={4}
            />
          </Field>
          <Field label="Your email (optional)" error={demoEmailHint} hint="We’ll mail the trial details. PIN still opens the desk.">
            <input
              className={fieldBox(demoEmailHint)}
              type="email"
              value={demoEmail}
              onChange={(e) => {
                const v = e.target.value.trim()
                setDemoEmail(v)
                setDemoEmailHint(v.includes('@') ? emailError(v) : '')
              }}
              placeholder="studio@email.com"
              maxLength={120}
            />
          </Field>
          <Button type="submit" tone="ghost" className="w-full" disabled={busy}>
            Open demo desk
          </Button>
        </form>
      </div>
    </div>
  )
}
