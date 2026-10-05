import { useEffect, useState, useSyncExternalStore } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MessageCircle, X } from 'lucide-react'
import { answerCopilot, greeting } from '../lib/copilot.ts'
import { api, useSession } from '../lib/store.ts'
import { isTabStale, subscribeTab } from '../lib/tabLock.ts'
import { hasProDesk } from '../lib/planAccess.ts'
import { clsx } from '../lib/clsx.ts'
import type { AdminOverview } from '../lib/types.ts'

type Line = { role: 'you' | 'desk'; text: string; links?: { href: string; label: string }[] }

const deskChips = ['Who needs follow-up?', 'Unpaid bookings', 'Quotations waiting', 'Next wedding']
const hqChips = ['How many studios?', 'Who is paying?', 'Who is on trial?', 'Who needs follow-up?']

export function Padmavathi() {
  const session = useSession()
  const location = useLocation()
  const stale = useSyncExternalStore(subscribeTab, isTabStale, () => false)
  const authed = session.status === 'in'
  const snap = authed ? session.data : null
  const [open, setOpen] = useState(false)
  const [ask, setAsk] = useState('')
  const [hq, setHq] = useState<AdminOverview | null>(null)
  const [lines, setLines] = useState<Line[]>([])

  useEffect(() => {
    if (!authed || !snap) {
      setLines([])
      setHq(null)
      setOpen(false)
      return
    }
    setLines([{ role: 'desk', text: greeting(snap) }])
    setOpen(false)
  }, [authed, snap?.email, snap?.studio.owner])

  useEffect(() => {
    if (!authed || !snap?.isAdmin) return
    api<AdminOverview>('/api/admin/overview')
      .then(setHq)
      .catch(() => setHq(null))
  }, [authed, snap?.isAdmin])

  useEffect(() => {
    const desk =
      location.pathname.startsWith('/studio') || location.pathname.startsWith('/admin')
    if (!desk) setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const onDesk =
    location.pathname.startsWith('/studio') || location.pathname.startsWith('/admin')

  if (!authed || !snap || stale || !onDesk) return null
  if (!hasProDesk(snap) && !snap.isAdmin) return null

  const desk = snap
  const chips = desk.isAdmin ? hqChips : deskChips
  const onHq = location.pathname.startsWith('/admin')

  function send(text: string) {
    const q = text.trim()
    if (!q) return
    const reply = answerCopilot(q, desk, hq)
    setLines((prev) => [...prev, { role: 'you', text: q }, { role: 'desk', text: reply.text, links: reply.links }])
    setAsk('')
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    send(ask)
  }

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-[56]">
          <button
            type="button"
            className="absolute inset-0 bg-ink/55 backdrop-blur-[2px]"
            aria-label="Close Padmavathi"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Padmavathi"
            className="absolute bottom-[4.75rem] right-3 flex h-[min(420px,68dvh)] w-[min(100vw-1.5rem,360px)] flex-col overflow-hidden rounded-2xl border border-line bg-ink-2 shadow-[0_24px_80px_rgba(0,0,0,0.5)] sm:right-6 z-[56]"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gold-soft">Padmavathi</p>
                <p className="text-[11px] text-mute">{onHq ? 'HQ assistant' : 'Studio desk'}</p>
              </div>
              <button type="button" className="text-mute hover:text-cream" onClick={() => setOpen(false)} aria-label="Close Padmavathi">
                <X size={16} />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
              {lines.map((line, i) => (
                <div key={i} className={clsx('whitespace-pre-wrap', line.role === 'you' ? 'text-cream' : 'text-gold-soft')}>
                  <p>{line.text}</p>
                  {line.links?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {line.links.map((link) => (
                        <Link
                          key={link.href}
                          to={link.href}
                          onClick={() => setOpen(false)}
                          className="rounded-full border border-gold/35 px-3 py-1 text-xs text-gold-soft"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 border-t border-line px-3 py-2">
              {chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="rounded-full border border-line px-2.5 py-1 text-[11px] text-mute hover:text-cream"
                  onClick={() => send(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
            <form onSubmit={submit} className="flex gap-2 border-t border-line p-3">
              <input
                className="min-w-0 flex-1 rounded-xl border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-gold/60"
                value={ask}
                onChange={(e) => setAsk(e.target.value)}
                placeholder="Ask Padmavathi…"
              />
              <button type="submit" className="shrink-0 rounded-full bg-gold px-4 py-2 text-sm text-ink">
                Ask
              </button>
            </form>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'group/fab fixed bottom-4 right-3 z-[55] inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-gold text-sm font-medium text-ink shadow-lg hover:bg-gold-soft sm:bottom-6 sm:right-6',
          open ? 'w-12' : 'w-12 hover:w-auto hover:gap-2 hover:px-4 focus-visible:w-auto focus-visible:gap-2 focus-visible:px-4',
        )}
        aria-label={open ? 'Close Padmavathi' : 'Open Padmavathi'}
      >
        {open ? <X size={18} /> : <MessageCircle size={18} />}
        {open ? null : (
          <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all group-hover/fab:max-w-[8rem] group-hover/fab:opacity-100 group-focus-visible/fab:max-w-[8rem] group-focus-visible/fab:opacity-100">
            Padmavathi
          </span>
        )}
      </button>
    </>
  )
}
