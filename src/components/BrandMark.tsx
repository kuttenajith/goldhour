import { clsx } from '../lib/clsx.ts'
import { asset } from '../lib/paths.ts'

export function BrandMark({
  className,
  sweep = false,
  markOnly = false,
}: {
  className?: string
  sweep?: boolean
  markOnly?: boolean
}) {
  return (
    <span className={clsx('inline-flex items-center gap-2', className)}>
      <span className={clsx('relative h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-gold/40', sweep && 'brand-sweep')}>
        <img src={asset('brand/mark.png')} alt="" className="h-full w-full object-cover" />
      </span>
      {markOnly ? <span className="sr-only">GoldHour</span> : (
        <span className="font-display text-2xl leading-none tracking-tight text-cream">GoldHour</span>
      )}
    </span>
  )
}
