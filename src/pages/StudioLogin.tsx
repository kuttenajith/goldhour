import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark.tsx'
import { Button } from '../components/Button.tsx'
import { GoogleButton } from '../components/GoogleButton.tsx'
import { HomeLink } from '../components/HomeLink.tsx'
import { Field, fieldBox } from '../components/Field.tsx'
import { acceptSession, api, homeAfterAuth } from '../lib/store.ts'
import { emailError, onlyPhone } from '../lib/input.ts'
import type { StudioSnapshot } from '../lib/types.ts'
import { asset } from '../lib/paths.ts'

export function StudioLogin() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const verify = params.get('verify')
  const google = params.get('google')
  const googleHint =
    google === 'off'
      ? 'Google sign-in is not connected yet. Use email and password, or send HQ the Google Client ID and secret.'
      : google === 'denied'
        ? 'Google sign-in was cancelled. Use Continue with Google again, or sign in with email.'
        : google === 'email'
          ? 'Google did not share a verified email. Allow email, or start a trial with OTP instead.'
          : google === 'removed'
            ? 'This studio desk was removed. Mail GoldHour HQ to put it back.'
            : google === 'busy'
              ? 'Too many sign-in attempts. Wait 15 minutes, then try again.'
              : google
                ? 'GoldHour could not finish Google sign-in. Try Continue with Google again, or use email and password.'
                : ''
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [demoEmail, setDemoEmail] = useState('')
  const [demoEmailHint, setDemoEmailHint] = useState('')
  const [error, setError] = useState('')
  const [emailHint, setEmailHint] = useState('')
  const [passwordHint, setPasswordHint] = useState('')
  const [pinHint, setPinHint] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const mail = emailError(email)
    const pwd = password.trim() ? '' : 'Enter your password'
    setEmailHint(mail)
    setPasswordHint(pwd)
    setError('')
    if (mail || pwd) return
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
    const pinMsg = pin.trim() ? '' : 'Enter the demo PIN'
    setDemoEmailHint(mailHint)
    setPinHint(pinMsg)
    setError('')
    if (mailHint || pinMsg) return
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
        <div className="mt-6">
          <HomeLink />
        </div>
        <h1 className="mt-10 font-display text-4xl sm:text-5xl">Studio sign in</h1>
        {verify === 'ok' ? <p className="mt-3 text-sm text-gold-soft">Email confirmed. Sign in.</p> : null}
        {verify === 'expired' ? (
          <div className="mt-4 rounded-2xl border border-gold/35 bg-ink-2 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-soft">GoldHour</p>
            <p className="mt-2 text-sm text-cream">That confirmation link expired. Request a new one from Forgot password.</p>
          </div>
        ) : null}
        {googleHint ? (
          <div className="mt-4 rounded-2xl border border-gold/35 bg-ink-2 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-soft">GoldHour</p>
            <p className="mt-2 text-sm text-cream">{googleHint}</p>
          </div>
        ) : null}
        <p className="mt-3 max-w-md text-mute">
          Sign in with Google, or email. Open the sample demo with PIN{' '}
          <span className="text-gold-soft">2026</span>.
        </p>
        <div className="mt-10 max-w-sm">
          <GoogleButton label="Continue with Google" />
          <p className="my-5 text-center text-xs uppercase tracking-[0.2em] text-mute">or email</p>
        </div>
        <form onSubmit={submit} className="max-w-sm space-y-5" noValidate>
          <Field label="Email" error={emailHint} required>
            <input
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
          <Field label="Password" error={passwordHint} required>
            <input
              className={fieldBox(passwordHint)}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setPasswordHint('')
              }}
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
        <form onSubmit={openDemo} className="mt-10 max-w-sm space-y-3 border-t border-line pt-8" noValidate>
          <p className="text-sm text-mute">Walk the sample demo desk. Leave your email and we’ll send the 14-day trial offer.</p>
          <Field label="Demo PIN" error={pinHint} required>
            <input
              className={fieldBox(pinHint)}
              value={pin}
              onChange={(e) => {
                setPin(onlyPhone(e.target.value).replace('+', '').slice(0, 4))
                setPinHint('')
              }}
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
