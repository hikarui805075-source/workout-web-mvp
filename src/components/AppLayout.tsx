import { NavLink, Outlet } from 'react-router-dom'
import { BarChart3, ClipboardList, Home, Settings } from 'lucide-react'
import { clsx } from 'clsx'
import type { LucideIcon } from 'lucide-react'

const tabs: { to: string; label: string; Icon: LucideIcon; end?: boolean }[] = [
  { to: '/', label: 'ホーム', Icon: Home, end: true },
  { to: '/record', label: '記録', Icon: ClipboardList },
  { to: '/analysis', label: '分析', Icon: BarChart3 },
  { to: '/settings', label: '設定', Icon: Settings },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  clsx(
    'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium',
    isActive ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200',
  )

export function AppLayout() {
  return (
    <div className="flex h-full flex-col pb-16">
      <main className="flex-1 overflow-y-auto px-4 py-3">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 flex border-t border-slate-800 bg-slate-950/95 backdrop-blur safe-area-pb">
        {tabs.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={linkClass}>
            {({ isActive }) => (
              <>
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} aria-hidden />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
