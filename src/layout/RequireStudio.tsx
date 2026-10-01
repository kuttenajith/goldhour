import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from '../lib/store.ts'

function Loading({ label }: { label: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-ink text-gold-soft">
      {label}
    </div>
  )
}

export function RequireStudio() {
  const session = useSession()
  if (session.status === 'unknown') return <Loading label="Opening the desk…" />
  if (session.status === 'guest') return <Navigate to="/login" replace />
  if (!session.data.billing.active) return <Navigate to="/studio/billing" replace />
  return <Outlet />
}

export function RequireAuth() {
  const session = useSession()
  if (session.status === 'unknown') return <Loading label="Opening GoldHour…" />
  if (session.status === 'guest') return <Navigate to="/login" replace />
  return <Outlet />
}
