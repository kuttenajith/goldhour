import { Link } from 'react-router-dom'
import { clsx } from '../lib/clsx.ts'

export function HomeLink({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={clsx(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-gold/35 bg-transparent px-5 text-sm tracking-wide text-gold-soft transition hover:border-gold hover:text-cream',
        className,
      )}
    >
      ← Drift back to the courtyard
    </Link>
  )
}
