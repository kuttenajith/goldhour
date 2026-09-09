import { asset } from '../lib/paths.ts'
import { clsx } from '../lib/clsx.ts'

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-2', className)}>
      <img
        src={asset('brand/mark.png')}
        alt=""
        className="h-8 w-8 rounded-full object-cover ring-1 ring-gold/40"
      />
      <span className="font-display text-2xl leading-none tracking-wide text-cream">GoldHour</span>
    </span>
  )
}
