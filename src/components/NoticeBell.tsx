import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { api } from '../lib/store.ts'
import { ago, loadReadIds, saveReadIds } from '../lib/noticeRead.ts'
import type { AppNotice } from '../lib/types.ts'
import { clsx } from '../lib/clsx.ts'

export function NoticeBell({ extras = [] }: { extras?: AppNotice[] }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [fetched, setFetched] = useState<AppNotice[]>([])
  const [read, setRead] = useState<Record<string, true>>(() => loadReadIds())

  useEffect(() => {
    let alive = true
    function pull() {
      api<{ notices: AppNotice[] }>('/api/notices')
        .then((data) => {
          if (alive) setFetched(data.notices || [])
        })
        .catch(() => {
          if (alive) setFetched([])
        })
    }
    pull()
    const tick = window.setInterval(pull, 20000)
    return () => {
      alive = false
      window.clearInterval(tick)
    }
  }, [])

  const items = useMemo(() => {
    const seen = new Set<string>()
    const out: AppNotice[] = []
    for (const notice of [...extras, ...fetched]) {
      if (!notice?.id || seen.has(notice.id)) continue
      seen.add(notice.id)
      out.push(notice)
    }
    return out.sort((a, b) => String(b.at).localeCompare(String(a.at)))
  }, [extras, fetched])

  const unread = useMemo(() => items.filter((n) => !read[n.id]).length, [items, read])
  const shown = unreadOnly ? items.filter((n) => !read[n.id]) : items

  function persist(next: Record<string, true>) {
    setRead(next)
    saveReadIds(next)
  }

  function openItem(notice: AppNotice) {
    persist({ ...read, [notice.id]: true })
    setOpen(false)
    navigate(notice.href)
  }

  function markAll() {
    const next = { ...read }
    for (const n of items) next[n.id] = true
    persist(next)
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="relative inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-line text-gold-soft hover:border-gold/50 hover:text-cream"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={16} />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-gold px-1 text-[10px] font-semibold leading-4 text-ink">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-[45] cursor-default" aria-label="Close notifications" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label="Notifications"
            className="absolute right-0 top-12 z-[46] w-[min(100vw-1.5rem,28rem)] overflow-hidden rounded-2xl border border-line bg-ink-2 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
          >
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-gold-soft">
                Updates · {shown.length}/{items.length}
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className={clsx('text-xs', unreadOnly ? 'text-gold-soft' : 'text-mute hover:text-cream')}
                  onClick={() => setUnreadOnly((v) => !v)}
                >
                  {unreadOnly ? 'Show all' : 'Unread only'}
                </button>
                {unread > 0 ? (
                  <button type="button" className="text-xs text-mute hover:text-cream" onClick={markAll}>
                    Mark all read
                  </button>
                ) : null}
              </div>
            </div>
            <ul className="max-h-[min(75dvh,32rem)] overflow-y-auto">
              {shown.length === 0 ? (
                <li className="px-4 py-6 text-sm text-mute">{unreadOnly ? 'No unread updates.' : 'No updates yet.'}</li>
              ) : null}
              {shown.map((n) => (
                <li key={n.id} className="border-t border-line first:border-t-0">
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-white/[0.03]"
                  >
                    <span
                      className={clsx(
                        'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                        read[n.id] ? 'bg-line' : 'bg-gold',
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{n.title}</span>
                      <span className="mt-1 block whitespace-pre-wrap text-xs leading-relaxed text-mute">{n.body}</span>
                    </span>
                    <span className="shrink-0 text-[11px] tabular-nums text-mute">{ago(n.at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  )
}
