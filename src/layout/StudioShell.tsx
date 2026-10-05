import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Columns3,
  CreditCard,
  FileText,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Shield,
  Users,
  X,
} from 'lucide-react'
import { BrandMark } from '../components/BrandMark.tsx'
import { ThemeToggle } from '../components/ThemeToggle.tsx'
import { Onboarding } from '../components/Onboarding.tsx'
import { NoticeBell } from '../components/NoticeBell.tsx'
import { DeskSession } from '../components/TabGuard.tsx'
import { UserHello } from '../components/UserHello.tsx'
import { firstName } from '../lib/copilot.ts'
import { todayIso } from '../lib/format.ts'
import { readNavCollapsed, writeNavCollapsed } from '../lib/navCollapse.ts'
import { planLabel } from '../lib/planAccess.ts'
import { logoutStudio, useStudio } from '../lib/store.ts'
import { clsx } from '../lib/clsx.ts'

const links: { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean; pro?: boolean }[] = [
  { to: '/studio', label: 'Desk', icon: LayoutDashboard, end: true },
  { to: '/studio/leads', label: 'Leads', icon: Users },
  { to: '/studio/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/studio/calendar', label: 'Calendar', icon: CalendarDays, pro: true },
  { to: '/studio/pipeline', label: 'Pipeline', icon: Columns3, pro: true },
  { to: '/studio/follow-ups', label: 'Follow-ups', icon: Bell },
  { to: '/studio/quotations', label: 'Quotes', icon: FileText },
  { to: '/studio/payments', label: 'Payments', icon: IndianRupee },
  { to: '/studio/activity', label: 'Pulse', icon: ScrollText, pro: true },
  { to: '/studio/billing', label: 'Plan', icon: CreditCard },
]

function DeskNav({
  due,
  collapsed,
  onNavigate,
}: {
  due: number
  collapsed?: boolean
  onNavigate?: () => void
}) {
  return (
    <nav className="mt-5 space-y-0.5">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          title={link.label}
          onClick={onNavigate}
          className={({ isActive }) =>
            clsx(
              'flex min-h-9 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 text-sm transition',
              collapsed && 'justify-center px-0',
              isActive ? 'bg-gold/12 text-gold-soft' : 'text-cream/70 hover:bg-white/5 hover:text-cream',
            )
          }
        >
          <link.icon size={15} />
          {collapsed ? <span className="sr-only">{link.label}</span> : <span className="flex-1 truncate">{link.label}</span>}
          {!collapsed && link.pro ? (
            <span className="rounded-full border border-gold/35 px-1.5 text-[9px] uppercase tracking-wider text-gold-soft">Pro</span>
          ) : null}
          {!collapsed && link.to === '/studio/follow-ups' && due > 0 ? (
            <span className="rounded-full bg-gold px-1.5 text-[10px] font-semibold text-ink">{due}</span>
          ) : null}
        </NavLink>
      ))}
    </nav>
  )
}

export function StudioShell() {
  const snap = useStudio()
  const { studio, billing, isAdmin, leads } = snap
  const navigate = useNavigate()
  const today = todayIso()
  const due = leads.filter(
    (l) => l.nextActionOn <= today && l.status !== 'completed' && l.status !== 'lost' && l.status !== 'booked',
  ).length
  const [collapsed, setCollapsed] = useState(readNavCollapsed)
  const [menuOpen, setMenuOpen] = useState(false)
  const name = firstName(snap)

  function setRail(next: boolean) {
    setCollapsed(next)
    writeNavCollapsed(next)
  }

  useEffect(() => {
    if (!menuOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  function signOut() {
    logoutStudio()
    navigate('/')
  }

  return (
    <div className="relative h-dvh max-h-dvh overflow-hidden bg-ink text-cream">
      <DeskSession />
      <Onboarding />
      <div
        className={clsx(
          'flex h-full max-h-full overflow-hidden lg:grid [@media(orientation:landscape)_and_(max-height:720px)]:!flex',
          collapsed ? 'lg:grid-cols-[4.5rem_minmax(0,1fr)]' : 'lg:grid-cols-[212px_minmax(0,1fr)]',
        )}
      >
        <aside className="group/rail relative hidden min-h-0 border-r border-line bg-ink-2 lg:flex lg:h-dvh lg:flex-col [@media(orientation:landscape)_and_(max-height:720px)]:!hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-2 py-4">
            <div className={clsx('flex items-start gap-1', collapsed ? 'justify-center' : 'px-1')}>
              <div className={clsx('min-w-0', collapsed && 'flex justify-center')}>
                <BrandMark markOnly={collapsed} />
                {collapsed ? null : (
                  <p className="mt-2 truncate text-[11px] uppercase tracking-[0.18em] text-mute">{studio.name}</p>
                )}
              </div>
              {collapsed ? null : (
                <button
                  type="button"
                  className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-mute hover:bg-white/5 hover:text-cream"
                  aria-label="Close menu"
                  onClick={() => setRail(true)}
                >
                  <ChevronLeft size={16} />
                </button>
              )}
            </div>
            {collapsed ? (
              <button
                type="button"
                className="absolute top-4 -right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-ink-2 text-gold-soft shadow-md opacity-70 hover:border-gold/50 hover:opacity-100 group-hover/rail:opacity-100"
                aria-label="Open menu"
                onClick={() => setRail(false)}
              >
                <ChevronRight size={14} />
              </button>
            ) : null}
            {isAdmin ? (
              <Link
                to="/admin"
                title="HQ · all studios"
                className={clsx(
                  'mt-4 inline-flex min-h-9 items-center rounded-xl bg-gold/12 text-xs font-medium text-gold-soft',
                  collapsed ? 'mx-auto justify-center px-2' : 'mx-1 px-3',
                )}
              >
                {collapsed ? <Shield size={14} /> : 'HQ · all studios'}
              </Link>
            ) : null}
            <DeskNav due={due} collapsed={collapsed} />
            <div className={clsx('mt-auto flex pt-4', collapsed ? 'flex-col items-center gap-2' : 'items-center justify-between gap-2 px-1')}>
              <ThemeToggle compact={collapsed} />
              <button
                className="inline-flex h-10 items-center gap-2 rounded-full px-1 text-sm text-mute hover:text-cream"
                onClick={signOut}
                title="Sign out"
              >
                <LogOut size={16} />
                {collapsed ? <span className="sr-only">Sign out</span> : <span>Sign out</span>}
              </button>
            </div>
          </div>
        </aside>

        {menuOpen ? (
          <div className="fixed inset-0 z-[75] flex">
            <button type="button" className="absolute inset-0 cursor-pointer bg-ink/70" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
            <div className="relative flex h-dvh max-h-dvh w-[min(100vw-3rem,300px)] flex-col overflow-hidden border-r border-line bg-ink-2">
              <div className="flex shrink-0 items-start justify-between gap-2 px-3 pt-4">
                <div className="min-w-0 px-1">
                  <BrandMark />
                  <p className="mt-2 truncate text-[11px] uppercase tracking-[0.18em] text-mute">{studio.name}</p>
                </div>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line text-mute hover:text-cream"
                  aria-label="Close menu"
                  onClick={() => setMenuOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 touch-pan-y">
                {isAdmin ? (
                  <Link
                    to="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="mt-4 mx-1 inline-flex min-h-9 cursor-pointer items-center rounded-xl bg-gold/12 px-3 text-xs font-medium text-gold-soft"
                  >
                    HQ · all studios
                  </Link>
                ) : null}
                <DeskNav due={due} onNavigate={() => setMenuOpen(false)} />
              </div>
              <div className="flex shrink-0 items-center justify-between gap-2 border-t border-line px-4 py-3">
                <ThemeToggle />
                <button className="inline-flex min-h-9 cursor-pointer items-center gap-2 text-sm text-mute hover:text-cream" onClick={signOut}>
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-ink-2 px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-3 lg:hidden [@media(orientation:landscape)_and_(max-height:720px)]:!flex">
              <BrandMark markOnly />
              {isAdmin ? (
                <Link to="/admin" className="shrink-0 text-xs uppercase tracking-[0.18em] text-gold-soft">
                  HQ
                </Link>
              ) : null}
              <span className="truncate text-xs uppercase tracking-[0.18em] text-gold-soft">{studio.name}</span>
            </div>
            <p className="hidden truncate text-sm text-mute lg:block [@media(orientation:landscape)_and_(max-height:720px)]:!hidden">{studio.name}</p>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-line text-gold-soft hover:border-gold/50 hover:text-cream lg:hidden [@media(orientation:landscape)_and_(max-height:720px)]:!inline-flex"
                aria-label="Open menu"
                onClick={() => setMenuOpen(true)}
              >
                <Menu size={16} />
              </button>
              <NoticeBell />
              <UserHello name={name} />
              <span className="hidden rounded-full border border-gold/35 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-gold-soft sm:inline">
                {planLabel(snap)}
              </span>
            </div>
          </header>
          <main className="page-rise min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 pb-20 sm:px-7 sm:py-6 sm:pb-20">
            {billing.status === 'trialing' ? (
              <Link
                to="/studio/billing"
                className="mb-5 block rounded-xl border border-gold/35 bg-gold/8 px-4 py-2.5 text-sm text-gold-soft"
              >
                Trial until {billing.trialEndsOn}. Subscribe whenever you like — you do not have to wait for the trial to end.
              </Link>
            ) : null}
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
