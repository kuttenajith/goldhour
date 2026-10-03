import { useSyncExternalStore } from 'react'

export type ThemeName = 'midnight' | 'daylight'

const KEY = 'goldhour-theme'

function read(): ThemeName {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored === 'daylight' || stored === 'midnight') return stored
  } catch {
    /* ignore */
  }
  return 'midnight'
}

let theme: ThemeName = 'midnight'
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((fn) => fn())
}

function apply(next: ThemeName) {
  theme = next
  try {
    localStorage.setItem(KEY, next)
  } catch {
    /* ignore */
  }
  document.documentElement.dataset.theme = next
  emit()
}

export function bootTheme() {
  apply(read())
}

export function toggleTheme() {
  apply(theme === 'midnight' ? 'daylight' : 'midnight')
}

export function useTheme() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => theme,
    () => theme,
  )
}
