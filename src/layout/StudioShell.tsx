import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Bell,
  CalendarDays,
  CreditCard,
  FileText,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Users,
} from 'lucide-react'
import { BrandMark } from '../components/BrandMark.tsx'
import { ThemeToggle } from '../components/ThemeToggle.tsx'
import { Onboarding } from '../components/Onboarding.tsx'
import { todayIso } from '../lib/format.ts'
import { logoutStudio, useStudio } from '../lib/store.ts'
import { clsx } from '../lib/clsx.ts'

const links = [
  { to: '/studio', label: 'Desk', icon: LayoutDashboard, end: true },
  { to: '/studio/leads', label: 'Leads', icon: Users },
  { to: '/studio/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/studio/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/studio/follow-ups', label: 'Follow-ups', icon: Bell },
  { to: '/studio/quotations', label: 'Quotes', icon: FileText },
  { to: '/studio/payments', label: 'Payments', icon: IndianRupee },
  { to: '/studio/activity', label: 'Activity', icon: ScrollText },
  { to: '/studio/billing', label: 'Plan', icon: CreditCard },
]

export function StudioShell() {
  const { studio, billing, isAdmin, leads } = useStudio()
  const navigate = useNavigate()
  const today = todayIso()
  const due = leads.filter(
    (l) => l.nextActionOn <= today && l.status !== 'completed' && l.status !== 'lost' && l.status !== 'booked',
  ).length

  return (
    <div className="relative h-dvh max-h-dvh overflow-hidden bg-ink text-cream">
      <Onboarding />
      <div className="flex h-full max-h-full overflow-hidden lg:grid lg:grid-cols-[212px_minmax(0,1fr)]">
        <aside className="relative hidden min-h-0 border-r border-line bg-ink-2 lg:flex lg:h-dvh lg:flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-3 py-4">
            <div className="px-2">
              <BrandMark />
              <p className="mt-2 truncate text-[11px] uppercase tracking-[0.18em] text-mute">{studio.name}</p>
            </div>
            {isAdmin ? (
              <Link
                to="/admin"
                className="mt-4 mx-1 inline-flex min-h-9 items-center rounded-xl bg-gold/12 px-3 text-xs font-medium text-gold-soft"
              >
                HQ · all studios
              </Link>
            ) : null}
            <nav className="mt-5 space-y-0.5">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    clsx(
                      'flex min-h-9 items-center gap-2.5 rounded-xl px-2.5 text-sm transition',
                      isActive ? 'bg-gold/12 text-gold-soft' : 'text-cream/70 hover:bg-white/5 hover:text-cream',
                    )
                  }
                >
                  <link.icon size={15} />
                  <span className="flex-1 truncate">{link.label}</span>
                  {link.to === '/studio/follow-ups' && due > 0 ? (
                    <span className="rounded-full bg-gold px-1.5 text-[10px] font-semibold text-ink">{due}</span>
                  ) : null}
                </NavLink>
              ))}
            </nav>
            <div className="mt-auto space-y-3 px-1 pt-4">
              <ThemeToggle />
              <button
                className="inline-flex min-h-9 items-center gap-2 text-sm text-mute hover:text-cream"
                onClick={() => {
                  logoutStudio()
                  navigate('/')
                }}
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-ink-2 px-4 py-2.5 lg:hidden">
            <BrandMark />
            <span className="flex min-w-0 items-center gap-3">
              {isAdmin ? (
                <Link to="/admin" className="shrink-0 text-xs uppercase tracking-[0.18em] text-gold-soft">
                  HQ
                </Link>
              ) : null}
              <span className="truncate text-xs uppercase tracking-[0.18em] text-gold-soft">{studio.name}</span>
            </span>
          </header>
          <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-line bg-ink-2 px-3 py-2 lg:hidden">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  clsx(
                    'inline-flex min-h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs',
                    isActive ? 'bg-gold text-ink' : 'text-mute',
                  )
                }
              >
                {link.label}
                {link.to === '/studio/follow-ups' && due > 0 ? (
                  <span className={clsx('rounded-full px-1.5 text-[10px]', 'bg-ink/20')}>{due}</span>
                ) : null}
              </NavLink>
            ))}
          </nav>
          <main className="page-rise min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-7 sm:py-6">
            {billing.status === 'trialing' ? (
              <Link
                to="/studio/billing"
                className="mb-5 block rounded-xl border border-gold/35 bg-gold/8 px-4 py-2.5 text-sm text-gold-soft"
              >
                Trial until {billing.trialEndsOn}. Subscribe so the desk stays on after that.
              </Link>
            ) : null}
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
