const KEY = 'goldhour_active_tab'
const CHANNEL = 'goldhour-tab'

export const tabId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tab-${Date.now()}`

let stale = false
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((fn) => fn())
}

export function isTabStale() {
  return stale
}

export function subscribeTab(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function claimTab() {
  stale = false
  try {
    localStorage.setItem(KEY, tabId)
  } catch {
    /* private mode */
  }
  try {
    channel()?.postMessage({ tabId })
  } catch {
    /* ignore */
  }
  emit()
}

export function releaseTab() {
  try {
    if (localStorage.getItem(KEY) === tabId) localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function isDeskPath(path = typeof window === 'undefined' ? '' : window.location.pathname) {
  return path.startsWith('/studio') || path.startsWith('/admin')
}

function lockFrom(otherId: string) {
  if (!otherId || otherId === tabId || stale) return
  if (!isDeskPath()) return
  stale = true
  emit()
}

let bc: BroadcastChannel | null | undefined

function channel() {
  if (bc !== undefined) return bc
  try {
    bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null
  } catch {
    bc = null
  }
  bc?.addEventListener('message', (event) => {
    const id = (event.data as { tabId?: string } | null)?.tabId
    if (id) lockFrom(id)
  })
  return bc
}

if (typeof window !== 'undefined') {
  channel()
  window.addEventListener('storage', (event) => {
    if (event.key === KEY && event.newValue && event.newValue !== tabId) lockFrom(event.newValue)
  })
  window.addEventListener('beforeunload', releaseTab)
}
