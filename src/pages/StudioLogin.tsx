import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark.tsx'
import { Button } from '../components/Button.tsx'
import { Field, fieldClass } from '../components/Field.tsx'
import { loginStudio } from '../lib/store.ts'
import { DEMO_PIN } from '../lib/seed.ts'
import { asset } from '../lib/paths.ts'

export function StudioLogin() {
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (pin.trim() !== DEMO_PIN) {
      setError('Use the demo PIN 2026 to open Meenakshi Frames.')
      return
    }
    loginStudio()
    navigate('/studio')
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
          Open the desk. Leave the chat thread behind.
        </p>
      </div>
      <div className="flex flex-col justify-center bg-ink px-6 py-16 sm:px-16">
        <BrandMark />
        <h1 className="mt-10 font-display text-5xl">Studio sign in</h1>
        <p className="mt-3 max-w-md text-mute">
          No account. Demo studio <span className="text-gold-soft">Meenakshi Frames, Madurai</span>.
          PIN <span className="text-gold-soft">2026</span>. Open Priya’s booked wedding and walk the
          whole day.
        </p>
        <form onSubmit={submit} className="mt-10 max-w-sm space-y-5">
          <Field label="Season PIN">
            <input
              className={fieldClass}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="2026"
              inputMode="numeric"
              autoFocus
            />
          </Field>
          {error ? <p className="text-sm text-orange-200">{error}</p> : null}
          <Button type="submit" className="w-full">
            Enter the studio desk
          </Button>
        </form>
      </div>
    </div>
  )
}
