import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark.tsx'
import { Button } from '../components/Button.tsx'
import { useConfirm } from '../components/ConfirmDialog.tsx'
import { HomeLink } from '../components/HomeLink.tsx'
import { Field, fieldBox } from '../components/Field.tsx'
import { acceptSession, api, homeAfterAuth, useSession } from '../lib/store.ts'
import { nameError, onlyName, onlyPhone, phoneError, requiredText } from '../lib/input.ts'
import { needsStudioWelcome } from '../lib/planAccess.ts'
import type { StudioSnapshot } from '../lib/types.ts'

export function Welcome() {
  const session = useSession()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const data = session.status === 'in' ? session.data : null
  const [primed, setPrimed] = useState(false)
  const [studioName, setStudioName] = useState('')
  const [owner, setOwner] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  if (data && !primed) {
    setStudioName(data.studio.name)
    setOwner(data.studio.owner)
    setCity(data.studio.city)
    setPhone(data.studio.phone)
    setPrimed(true)
  }
  const [errors, setErrors] = useState({ studioName: '', owner: '', city: '', phone: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (session.status === 'unknown') {
    return (
      <div className="grid min-h-screen place-items-center bg-ink text-gold-soft">Opening GoldHour…</div>
    )
  }
  if (session.status === 'guest') return <Navigate to="/login" replace />
  if (!needsStudioWelcome(session.data)) return <Navigate to={homeAfterAuth(session.data)} replace />

  function validate() {
    const phoneMsg = phone.trim() ? phoneError(phone) : ''
    const next = {
      studioName: nameError(studioName) ? 'Enter the studio name' : '',
      owner: requiredText(owner, 'the owner name'),
      city: requiredText(city, 'the city'),
      phone: phoneMsg,
    }
    setErrors(next)
    return !Object.values(next).some(Boolean)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!validate() || !data) return
    const ok = await confirm({
      title: 'Save this studio name?',
      body: `${studioName.trim()} · ${owner.trim()} · ${city.trim()} will show on quotations and HQ notices.`,
      confirmLabel: 'Save and open desk',
      cancelLabel: 'Keep editing',
    })
    if (!ok) return
    setBusy(true)
    try {
      const next = await api<StudioSnapshot>('/api/studio', {
        method: 'PUT',
        body: JSON.stringify({
          studio: {
            name: studioName.trim(),
            owner: owner.trim(),
            city: city.trim(),
            phone: phone.trim(),
            tagline: data.studio.tagline || 'Wedding photography',
          },
        }),
      })
      acceptSession(next)
      navigate(homeAfterAuth(next), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the studio')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh overflow-x-clip bg-ink px-4 py-12 text-cream sm:px-6">
      <div className="mx-auto max-w-lg">
        <BrandMark />
        <div className="mt-6">
          <HomeLink />
        </div>
        <h1 className="mt-10 font-display text-4xl sm:text-5xl">Name this studio</h1>
        <p className="mt-3 text-mute">
          Signed in as {session.data.email}. Add the desk name, your name, and city so quotations and HQ notices look right. Phone is optional.
        </p>
        <form onSubmit={submit} className="mt-10 space-y-5" noValidate>
          <Field label="Studio name" error={errors.studioName} required>
            <input
              className={fieldBox(errors.studioName)}
              value={studioName}
              maxLength={60}
              onChange={(e) => {
                const v = e.target.value.slice(0, 60)
                setStudioName(v)
                setErrors((p) => ({ ...p, studioName: v.trim().length < 2 && v ? 'Enter the studio name' : '' }))
              }}
              required
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Owner" error={errors.owner} required>
              <input
                required
                className={fieldBox(errors.owner)}
                value={owner}
                maxLength={80}
                onChange={(e) => {
                  const v = onlyName(e.target.value)
                  setOwner(v)
                  setErrors((p) => ({ ...p, owner: v ? requiredText(v, 'the owner name') : '' }))
                }}
              />
            </Field>
            <Field label="City" error={errors.city} required>
              <input
                required
                className={fieldBox(errors.city)}
                value={city}
                maxLength={60}
                onChange={(e) => {
                  const v = onlyName(e.target.value)
                  setCity(v)
                  setErrors((p) => ({ ...p, city: v ? requiredText(v, 'the city') : '' }))
                }}
                placeholder="Madurai"
              />
            </Field>
          </div>
          <Field
            label="WhatsApp / phone"
            error={errors.phone}
            hint="Optional. 10-digit Indian mobile for couple follow-ups. No OTP on Google sign-in."
          >
            <input
              className={fieldBox(errors.phone)}
              value={phone}
              inputMode="tel"
              maxLength={13}
              onChange={(e) => {
                const v = onlyPhone(e.target.value)
                setPhone(v)
                setErrors((p) => ({ ...p, phone: v ? phoneError(v) : '' }))
              }}
            />
          </Field>
          {error ? <p className="text-sm text-orange-200">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Saving…' : 'Open the studio desk'}
          </Button>
        </form>
      </div>
    </div>
  )
}
