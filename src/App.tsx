import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { StudioShell } from './layout/StudioShell.tsx'
import { RequireStudio } from './layout/RequireStudio.tsx'
import { VisitTracker } from './components/VisitTracker.tsx'
import { Landing } from './pages/Landing.tsx'
import { StudioLogin } from './pages/StudioLogin.tsx'
import { Dashboard } from './pages/Dashboard.tsx'
import { Leads } from './pages/Leads.tsx'
import { LeadDetail } from './pages/LeadDetail.tsx'
import { FollowUps } from './pages/FollowUps.tsx'
import { Quotations } from './pages/Quotations.tsx'
import { Payments } from './pages/Payments.tsx'
import { Bookings } from './pages/Bookings.tsx'

function basename() {
  const raw = import.meta.env.BASE_URL
  if (!raw || raw === '/') return undefined
  return raw.replace(/\/$/, '')
}

export function App() {
  return (
    <BrowserRouter basename={basename()}>
      <VisitTracker />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<StudioLogin />} />
        <Route element={<RequireStudio />}>
          <Route path="/studio" element={<StudioShell />}>
            <Route index element={<Dashboard />} />
            <Route path="leads" element={<Leads />} />
            <Route path="leads/:id" element={<LeadDetail />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="follow-ups" element={<FollowUps />} />
            <Route path="quotations" element={<Quotations />} />
            <Route path="payments" element={<Payments />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
