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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-4">
      <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close" />
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto gold-ring rounded-3xl bg-ink-2 p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl text-cream sm:text-3xl">{title}</h2>
          <button onClick={onClose} className="text-sm text-mute hover:text-cream">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
