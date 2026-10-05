import { useEffect, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router-dom'
import { claimTab, isDeskPath, isTabStale, releaseTab, subscribeTab } from '../lib/tabLock.ts'
import { useSession } from '../lib/store.ts'

/** Only the studio desk and HQ claim a tab. Landing, login and signup stay free. */
export function DeskSession() {
  useEffect(() => {
    claimTab()
    return () => releaseTab()
  }, [])
  return null
}

export function TabGuard() {
  const session = useSession()
  const { pathname } = useLocation()
  const stale = useSyncExternalStore(subscribeTab, isTabStale, () => false)

  if (!isDeskPath(pathname) || session.status !== 'in' || !stale) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/92 p-6 text-cream">
      <div className="max-w-md rounded-3xl border border-line bg-ink-2 p-6 text-center gold-ring">
        <p className="text-xs uppercase tracking-[0.22em] text-gold-soft">Desk locked</p>
        <h2 className="mt-3 font-display text-3xl">This desk is open in another tab.</h2>
        <p className="mt-3 text-sm text-mute">
          The public site can be open anywhere. The desk stays on one screen so two tabs do not overwrite the same wedding.
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
