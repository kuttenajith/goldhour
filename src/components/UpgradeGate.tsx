import { Link } from 'react-router-dom'
import { Button } from './Button.tsx'
import { PRO_FEATURES } from '../lib/planAccess.ts'

export function UpgradeGate({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="rounded-3xl border border-gold/35 bg-ink-2 p-6 sm:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-soft">Studio Pro</p>
      <h1 className="mt-2 font-display text-3xl sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-xl text-sm text-mute">{copy}</p>
      <ul className="mt-5 space-y-1.5 text-sm text-gold-soft">
        {PRO_FEATURES.map((item) => (
          <li key={item}>· {item}</li>
        ))}
      </ul>
      <Link to="/studio/billing" className="mt-6 inline-block">
        <Button>Upgrade to Studio Pro</Button>
      </Link>
    </div>
  )
}
