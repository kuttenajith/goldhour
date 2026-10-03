import { useSyncExternalStore } from 'react'
import { claimTab, isTabStale, subscribeTab } from '../lib/tabLock.ts'
import { useSession } from '../lib/store.ts'

export function TabGuard() {
  const session = useSession()
  const stale = useSyncExternalStore(subscribeTab, isTabStale, () => false)

  if (session.status !== 'in' || !stale) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/92 p-6 text-cream">
      <div className="max-w-md rounded-3xl border border-line bg-ink-2 p-6 text-center gold-ring">
        <p className="text-xs uppercase tracking-[0.22em] text-gold-soft">Session locked</p>
        <h2 className="mt-3 font-display text-3xl">This desk is open in another tab.</h2>
        <p className="mt-3 text-sm text-mute">
          No actions from this screen. Close it, or take over and the other tab will lock.
        </p>
        <button
          type="button"
          className="mt-6 inline-flex min-h-11 items-center rounded-full bg-gold px-5 text-sm text-ink"
          onClick={() => claimTab()}
        >
          Use this tab
        </button>
      </div>
    </div>
  )
}
