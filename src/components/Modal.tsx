import type { ReactNode } from 'react'

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-lg gold-ring rounded-3xl bg-ink-2 p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-display text-3xl text-cream">{title}</h2>
          <button onClick={onClose} className="text-mute hover:text-cream">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
