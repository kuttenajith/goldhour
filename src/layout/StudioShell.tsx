import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Bell,
  Camera,
  FileText,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Users,
} from 'lucide-react'
import { BrandMark } from '../components/BrandMark.tsx'
import { logoutStudio, useStudio } from '../lib/store.ts'
import { asset } from '../lib/paths.ts'
import { clsx } from '../lib/clsx.ts'

const links = [
  { to: '/studio', label: 'Desk', icon: LayoutDashboard, end: true },
  { to: '/studio/leads', label: 'Leads', icon: Users },
  { to: '/studio/follow-ups', label: 'Follow-ups', icon: Bell },
  { to: '/studio/quotations', label: 'Quotations', icon: FileText },
  { to: '/studio/payments', label: 'Payments', icon: IndianRupee },
]

export function StudioShell() {
  const { studio } = useStudio()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-ink text-cream lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-line lg:flex lg:flex-col">
        <img
          src={asset('photos/photographer.png')}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/85 to-ink" />
        <div className="relative flex h-full flex-col p-6">
          <BrandMark />
          <p className="mt-3 text-xs uppercase tracking-[0.22em] text-gold-soft">
            {studio.city} studio desk
          </p>
          <nav className="mt-10 space-y-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition',
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
          <div className="mt-auto rounded-3xl border border-line bg-ink/70 p-4 backdrop-blur">
            <div className="flex items-center gap-2 text-gold-soft">
              <Camera size={16} />
              <span className="text-xs uppercase tracking-[0.18em]">Studio</span>
            </div>
            <p className="mt-2 font-display text-2xl">{studio.name}</p>
            <p className="text-sm text-mute">{studio.owner}</p>
            <button
              className="mt-4 inline-flex items-center gap-2 text-sm text-mute hover:text-cream"
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

      <div className="min-h-screen">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-ink/80 px-4 py-3 backdrop-blur lg:hidden">
          <BrandMark />
          <span className="text-xs uppercase tracking-[0.18em] text-gold-soft">{studio.name}</span>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2 lg:hidden">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                clsx(
                  'whitespace-nowrap rounded-full px-3 py-1.5 text-xs uppercase tracking-wider',
                  isActive ? 'bg-gold text-ink' : 'text-mute',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <main className="px-4 py-6 sm:px-8 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
