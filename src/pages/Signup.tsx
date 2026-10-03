import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark.tsx'
import { Button } from '../components/Button.tsx'
import { Field, fieldBox } from '../components/Field.tsx'
import { acceptSession, api, homeAfterAuth } from '../lib/store.ts'
import {
  emailError,
  nameError,
  onlyName,
  onlyPhone,
  passwordError,
  phoneError,
} from '../lib/input.ts'
import type { StudioSnapshot } from '../lib/types.ts'

export function Signup() {
  const navigate = useNavigate()
  const [studioName, setStudioName] = useState('')
  const [owner, setOwner] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({ studioName: '', owner: '', phone: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function validate() {
    const next = {
      studioName: nameError(studioName) ? 'Enter the studio name' : '',
      owner: owner ? nameError(owner) : '',
      phone: phone ? phoneError(phone) : '',
      email: emailError(email),
      password: passwordError(password),
    }
    setErrors(next)
    return !Object.values(next).some(Boolean)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!validate()) return
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
    <div className="min-h-dvh overflow-x-clip bg-ink px-4 py-12 text-cream sm:px-6">
      <div className="mx-auto max-w-lg">
        <BrandMark />
        <h1 className="mt-10 font-display text-4xl sm:text-5xl">Start your studio desk</h1>
        <p className="mt-3 text-mute">
          14 days free. Then ₹799 / month. Your leads stay on the server, not in this browser.
        </p>
        <form onSubmit={submit} className="mt-10 space-y-5" noValidate>
          <Field label="Studio name" error={errors.studioName}>
            <input
              className={fieldBox(errors.studioName)}
              value={studioName}
              onChange={(e) => {
                const v = e.target.value.slice(0, 60)
                setStudioName(v)
                setErrors((p) => ({ ...p, studioName: v.trim().length < 2 && v ? 'Enter the studio name' : '' }))
              }}
              required
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Owner" error={errors.owner}>
              <input
                className={fieldBox(errors.owner)}
                value={owner}
                onChange={(e) => {
                  const v = onlyName(e.target.value)
                  setOwner(v)
                  setErrors((p) => ({ ...p, owner: v ? nameError(v) : '' }))
                }}
              />
            </Field>
            <Field label="City">
              <input
                className={fieldBox()}
                value={city}
                onChange={(e) => setCity(onlyName(e.target.value))}
                placeholder="Madurai"
              />
            </Field>
          </div>
          <Field label="WhatsApp / phone" error={errors.phone} hint="Numbers only">
            <input
              className={fieldBox(errors.phone)}
              value={phone}
              inputMode="tel"
              onChange={(e) => {
                const v = onlyPhone(e.target.value)
                setPhone(v)
                setErrors((p) => ({ ...p, phone: v ? phoneError(v) : '' }))
              }}
            />
          </Field>
          <Field label="Email" error={errors.email}>
            <input
              className={fieldBox(errors.email)}
              type="email"
              value={email}
              onChange={(e) => {
                const v = e.target.value.trim()
                setEmail(v)
                setErrors((p) => ({ ...p, email: v.includes('@') ? emailError(v) : '' }))
              }}
              required
            />
          </Field>
          <Field label="Password (8+ characters)" error={errors.password}>
            <input
              className={fieldBox(errors.password)}
              type="password"
              value={password}
              onChange={(e) => {
                const v = e.target.value
                setPassword(v)
                setErrors((p) => ({ ...p, password: v ? passwordError(v) : '' }))
              }}
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
