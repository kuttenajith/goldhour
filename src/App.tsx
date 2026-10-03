import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { StudioShell } from './layout/StudioShell.tsx'
import { RequireAdmin, RequireAuth, RequireStudio } from './layout/RequireStudio.tsx'
import { VisitTracker } from './components/VisitTracker.tsx'
import { Padmavathi } from './components/Padmavathi.tsx'
import { TabGuard } from './components/TabGuard.tsx'
import { Landing } from './pages/Landing.tsx'
import { StudioLogin } from './pages/StudioLogin.tsx'
import { Signup } from './pages/Signup.tsx'
import { Billing } from './pages/Billing.tsx'
import { Admin } from './pages/Admin.tsx'
import { Activity } from './pages/Activity.tsx'
import { Calendar } from './pages/Calendar.tsx'
import { Forgot, Reset } from './pages/Forgot.tsx'
import { Dashboard } from './pages/Dashboard.tsx'
import { Leads } from './pages/Leads.tsx'
import { LeadDetail } from './pages/LeadDetail.tsx'
import { FollowUps } from './pages/FollowUps.tsx'
import { Quotations } from './pages/Quotations.tsx'
import { Payments } from './pages/Payments.tsx'
import { Bookings } from './pages/Bookings.tsx'
import { bootSession } from './lib/store.ts'

bootSession()

function basename() {
  const raw = import.meta.env.BASE_URL
  if (!raw || raw === '/') return undefined
  return raw.replace(/\/$/, '')
}

export function App() {
  return (
    <BrowserRouter basename={basename()}>
      <VisitTracker />
      <TabGuard />
      <Padmavathi />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<StudioLogin />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/reset" element={<Reset />} />
        <Route element={<RequireAuth />}>
          <Route path="/studio/billing" element={<Billing />} />
        </Route>
        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<Admin />} />
        </Route>
        <Route element={<RequireStudio />}>
          <Route path="/studio" element={<StudioShell />}>
            <Route index element={<Dashboard />} />
            <Route path="leads" element={<Leads />} />
            <Route path="leads/:id" element={<LeadDetail />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="follow-ups" element={<FollowUps />} />
            <Route path="quotations" element={<Quotations />} />
            <Route path="payments" element={<Payments />} />
            <Route path="activity" element={<Activity />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
