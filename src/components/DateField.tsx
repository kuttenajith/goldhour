import { useRef } from 'react'
import { CalendarDays } from 'lucide-react'
import { fieldBox } from './Field.tsx'
import { acceptDateInput, dateError } from '../lib/input.ts'

export function DateField({
  value,
  min,
  max,
  error,
  required,
  onChange,
}: {
  value: string
  min: string
  max: string
  error?: string
  required?: boolean
  onChange: (value: string, error: string) => void
}) {
  const ref = useRef<HTMLInputElement>(null)

  function apply(raw: string) {
    if (!raw) {
      onChange('', required ? 'Pick a date' : '')
      return
    }
    const next = acceptDateInput(raw, min, max)
    if (!next) {
      onChange(value, dateError(raw, min, max))
      return
    }
    onChange(next, '')
  }

  return (
    <div className="relative">
      <input
        ref={ref}
        type="date"
        required={required}
        min={min}
        max={max}
        value={value}
        className={fieldBox(error) + ' date-input pr-12'}
        onChange={(e) => apply(e.target.value)}
        onBlur={(e) => {
          if (e.target.value !== value) apply(e.target.value)
        }}
      />
      <button
        type="button"
        className="absolute right-1.5 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gold-soft hover:bg-white/5 hover:text-cream"
        aria-label="Open calendar"
        onClick={() => {
          const el = ref.current as (HTMLInputElement & { showPicker?: () => void }) | null
          try {
            el?.showPicker?.()
          } catch {
            el?.focus()
          }
        }}
      >
        <CalendarDays size={18} />
      </button>
    </div>
  )
}
