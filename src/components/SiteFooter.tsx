import { BrandMark } from './BrandMark.tsx'
import { SiteVisits } from './SiteVisits.tsx'

export function SiteFooter() {
  return (
    <footer className="border-t border-line px-4 py-10 text-sm text-mute sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
        <BrandMark />
        <p className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span>GoldHour — a studio desk for India’s wedding vendors.</span>
          <SiteVisits />
        </p>
      </div>
    </footer>
  )
}
