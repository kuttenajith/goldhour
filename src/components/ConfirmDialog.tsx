import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from './Button.tsx'

export type ConfirmOptions = {
  title: string
  body: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function useConfirm() {
  const fn = useContext(ConfirmContext)
  if (!fn) throw new Error('ConfirmProvider missing')
  return fn
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<ConfirmOptions | null>(null)
  const wait = useRef<{ resolve: (ok: boolean) => void } | null>(null)

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOpen(opts)
    return new Promise((resolve) => {
      wait.current = { resolve }
    })
  }, [])

  function finish(ok: boolean) {
    wait.current?.resolve(ok)
    wait.current = null
    setOpen(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {open ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/75 p-3 sm:items-center sm:p-4" role="alertdialog" aria-modal="true" aria-labelledby="goldhour-confirm-title">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Dismiss" onClick={() => finish(false)} />
          <div className="relative w-full max-w-md gold-ring rounded-3xl bg-ink-2 p-6 shadow-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-soft">GoldHour</p>
            <h2 id="goldhour-confirm-title" className="mt-3 font-display text-3xl text-cream">
              {open.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-mute">{open.body}</p>
            <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button tone="ghost" className="w-full sm:w-auto" onClick={() => finish(false)}>
                {open.cancelLabel || 'Not now'}
              </Button>
              <Button
                className={open.danger ? 'w-full bg-orange-200 text-ink hover:bg-orange-100 sm:w-auto' : 'w-full sm:w-auto'}
                onClick={() => finish(true)}
              >
                {open.confirmLabel || 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  )
}
