import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark.tsx'
import { Button } from '../components/Button.tsx'
import { Field, fieldClass } from '../components/Field.tsx'
import { api } from '../lib/store.ts'

export function Forgot() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api('/api/auth/forgot', { method: 'POST', body: JSON.stringify({ email }) })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-rise min-h-screen bg-ink px-6 py-16 text-cream">
      <div className="mx-auto max-w-sm">
        <BrandMark sweep />
        <h1 className="mt-10 font-display text-4xl">Reset password</h1>
        <p className="mt-3 text-mute">We’ll send a link if this email has a GoldHour studio.</p>
        {done ? (
          <p className="mt-8 text-gold-soft">If that studio exists, the reset mail is on its way. Check spam.</p>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-5">
            <Field label="Email">
              <input className={fieldClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            {error ? <p className="text-sm text-orange-200">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        )}
        <p className="mt-8 text-sm text-mute">
          <Link to="/login" className="text-gold-soft">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export function Reset() {
  const [params] = useSearchParams()
  const token = useMemo(() => params.get('token') || '', [params])
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api('/api/auth/reset', { method: 'POST', body: JSON.stringify({ token, password }) })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-rise min-h-screen bg-ink px-6 py-16 text-cream">
      <div className="mx-auto max-w-sm">
        <BrandMark sweep />
        <h1 className="mt-10 font-display text-4xl">New password</h1>
        {done ? (
          <p className="mt-8 text-gold-soft">
            Password saved.{' '}
            <Link to="/login" className="underline">
              Sign in
            </Link>
          </p>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-5">
            <Field label="New password (8+ characters)">
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
            <Button type="submit" className="w-full" disabled={busy || !token}>
              {busy ? 'Saving…' : 'Save password'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
