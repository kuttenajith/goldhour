import { Link } from 'react-router-dom'
import { clsx } from '../lib/clsx.ts'

export function HomeLink({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={clsx(
        'gh-btn inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-gold/35 bg-transparent px-5 text-sm tracking-wide text-gold-soft hover:border-gold hover:bg-gold/10 hover:text-cream',
        className,
      )}
    >
      ← Drift back to the courtyard
    </Link>
  )
}
