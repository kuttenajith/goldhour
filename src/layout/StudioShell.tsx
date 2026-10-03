import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Bell,
  CalendarDays,
  Camera,
  CreditCard,
  FileText,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Users,
} from 'lucide-react'
import { BrandMark } from '../components/BrandMark.tsx'
import { Copilot } from '../components/Copilot.tsx'
import { ThemeToggle } from '../components/ThemeToggle.tsx'
import { Onboarding } from '../components/Onboarding.tsx'
import { SiteVisits } from '../components/SiteVisits.tsx'
import { logoutStudio, useStudio } from '../lib/store.ts'
import { asset } from '../lib/paths.ts'
import { clsx } from '../lib/clsx.ts'

const links = [
  { to: '/studio', label: 'Desk', icon: LayoutDashboard, end: true },
  { to: '/studio/leads', label: 'Leads', icon: Users },
  { to: '/studio/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/studio/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/studio/follow-ups', label: 'Follow-ups', icon: Bell },
  { to: '/studio/quotations', label: 'Quotations', icon: FileText },
  { to: '/studio/payments', label: 'Payments', icon: IndianRupee },
  { to: '/studio/activity', label: 'Activity', icon: ScrollText },
  { to: '/studio/billing', label: 'Plan', icon: CreditCard },
]

export function StudioShell() {
  const { studio, billing, isAdmin } = useStudio()
  const navigate = useNavigate()

  return (
    <div className="relative h-dvh max-h-dvh overflow-hidden bg-ink text-cream">
      <Onboarding />
      <div className="flex h-full max-h-full overflow-hidden lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="relative hidden min-h-0 overflow-hidden border-r border-line lg:flex lg:h-dvh lg:flex-col">
        <img
          src={asset('photos/photographer.png')}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/85 to-ink" />
        <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden p-5">
          <BrandMark sweep />
          <p className="mt-3 text-xs uppercase tracking-[0.22em] text-gold-soft">
            {studio.city} studio desk
          </p>
          {isAdmin ? (
            <Link
              to="/admin"
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-gold/15 px-3 py-2 text-sm text-gold-soft"
            >
              Open HQ · all studios
            </Link>
          ) : null}
          <nav className="mt-6 space-y-0.5">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  clsx(
                    'flex min-h-10 items-center gap-3 rounded-2xl px-3 py-2 text-sm transition',
                    isActive
                      ? 'bg-gold/15 text-gold-soft'
                      : 'text-cream/75 hover:bg-white/5 hover:text-cream',
                  )
                }
              >
                <link.icon size={16} />
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto rounded-3xl border border-line bg-ink/70 p-3 backdrop-blur">
            <div className="flex items-center gap-2 text-gold-soft">
              <Camera size={16} />
              <span className="text-xs uppercase tracking-[0.18em]">Studio</span>
            </div>
            <p className="mt-2 font-display text-xl leading-tight">{studio.name}</p>
            <p className="text-sm text-mute">{studio.owner}</p>
            <p className="mt-3 text-xs text-gold-soft">
              <SiteVisits />
            </p>
            <div className="mt-3">
              <ThemeToggle />
            </div>
            <button
              className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm text-mute hover:text-cream"
              onClick={() => {
                logoutStudio()
                navigate('/')
              }}
            >
              <LogOut size={14} /> Leave desk
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-ink/90 px-4 py-3 lg:hidden">
          <BrandMark />
          <span className="flex min-w-0 items-center gap-3">
            {isAdmin ? (
              <Link to="/admin" className="shrink-0 text-xs uppercase tracking-[0.18em] text-gold-soft">
                HQ
              </Link>
            ) : null}
            <span className="truncate text-xs uppercase tracking-[0.18em] text-gold-soft">
              {studio.name}
            </span>
          </span>
        </header>
        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-line bg-ink/90 px-3 py-2 lg:hidden">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                clsx(
                  'inline-flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs uppercase tracking-wider',
                  isActive ? 'bg-gold text-ink' : 'text-mute',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <main className="page-rise min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-8 sm:py-7">
          {billing.status === 'trialing' ? (
            <Link
              to="/studio/billing"
              className="mb-6 block rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold-soft"
            >
              Trial until {billing.trialEndsOn}. Subscribe so the desk stays on after that.
            </Link>
          ) : null}
          <Outlet />
        </main>
      </div>
      </div>
      <Copilot />
    </div>
  )
}
