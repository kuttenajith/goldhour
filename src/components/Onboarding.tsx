import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from './Button.tsx'
import { completeOnboarding, needsOnboarding, useStudio } from '../lib/store.ts'

const steps = [
  {
    title: 'Save the enquiry',
    copy: 'A WhatsApp “I need wedding photography” becomes a lead: name, phone, date, venue, events, budget, source.',
  },
  {
    title: 'Send a quotation',
    copy: 'Create the PDF, WhatsApp it, then wait. If they go quiet — follow up in 2 days, then 5.',
  },
  {
    title: 'Mark it booked',
    copy: 'Accepted → collect advance → Booked. That opens the wedding desk: payments, events, day-of timeline.',
  },
  {
    title: 'Run one wedding',
    copy: 'Priya & Arjun is already booked in the demo. Open it and walk the whole day before you give GoldHour to a real studio.',
  },
]

export function Onboarding() {
  const [open, setOpen] = useState(needsOnboarding)
  const [step, setStep] = useState(0)
  const { leads } = useStudio()
  const navigate = useNavigate()
  const priya = leads.find((l) => l.coupleName.startsWith('Priya'))

  if (!open) return null

  const last = step === steps.length - 1
  const current = steps[step]

  function finish() {
    completeOnboarding()
    setOpen(false)
    if (priya) navigate(`/studio/leads/${priya.id}`)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-3 sm:items-center">
      <div className="w-full max-w-lg gold-ring rounded-3xl bg-ink-2 p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-gold-soft">
          How one wedding runs · {step + 1} / {steps.length}
        </p>
        <h2 className="mt-3 font-display text-3xl sm:text-4xl">{current.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-mute sm:text-base">{current.copy}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button
            tone="ghost"
            onClick={() => {
              completeOnboarding()
              setOpen(false)
            }}
          >
            Skip
          </Button>
          {last ? (
            <Button onClick={finish}>Open Priya’s wedding</Button>
          ) : (
            <Button onClick={() => setStep((s) => s + 1)}>Next</Button>
          )}
        </div>
      </div>
    </div>
  )
}
