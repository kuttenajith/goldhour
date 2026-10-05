const KEY = 'goldhour-nav-collapsed'

export function readNavCollapsed() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function writeNavCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(KEY, collapsed ? '1' : '0')
  } catch {
    /* ignore */
  }
}
