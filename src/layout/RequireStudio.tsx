import { Navigate, Outlet } from 'react-router-dom'
import { isAuthed } from '../lib/store.ts'

export function RequireStudio() {
  if (!isAuthed()) return <Navigate to="/login" replace />
  return <Outlet />
}
