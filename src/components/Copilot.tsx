import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, X } from 'lucide-react'
import { answerCopilot } from '../lib/copilot.ts'
import { useStudio } from '../lib/store.ts'
import { clsx } from '../lib/clsx.ts'

type Line = { role: 'you' | 'desk'; text: string; links?: { href: string; label: string }[] }

const chips = ['Who needs follow-up?', 'Unpaid bookings', 'Quotations waiting', 'Next wedding']

export function Copilot() {
  const snap = useStudio()
  const [open, setOpen] = useState(false)
  const [ask, setAsk] = useState('')
  const [lines, setLines] = useState<Line[]>([
    {
      role: 'desk',
      text: 'Ask the desk. I only answer from this studio’s leads — I never delete or refund from chat.',
    },
  ])

  function send(text: string) {
    const q = text.trim()
    if (!q) return
    const reply = answerCopilot(q, snap)
    setLines((prev) => [...prev, { role: 'you', text: q }, { role: 'desk', text: reply.text, links: reply.links }])
    setAsk('')
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    send(ask)
  }

  return (
    <div className="pointer-events-none fixed bottom-[4.5rem] right-3 z-40 sm:bottom-6 sm:right-6 lg:bottom-6">
      {open ? (
        <div className="pointer-events-auto mb-3 flex h-[min(420px,70dvh)] w-[min(100vw-1.5rem,360px)] flex-col overflow-hidden rounded-3xl border border-line bg-ink-2 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-gold-soft">GoldHour Copilot</p>
            <button type="button" className="text-mute hover:text-cream" onClick={() => setOpen(false)} aria-label="Close copilot">
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
              placeholder="Ask the desk…"
            />
            <button type="submit" className="shrink-0 rounded-full bg-gold px-4 py-2 text-sm text-ink">
              Ask
            </button>
          </form>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-gold text-ink shadow-lg hover:bg-gold-soft"
        aria-label="Open GoldHour Copilot"
      >
        <MessageCircle size={20} />
      </button>
    </div>
  )
}
