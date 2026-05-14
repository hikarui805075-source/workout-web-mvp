import { NavLink, Outlet } from 'react-router-dom'
import { clsx } from 'clsx'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  clsx(
    'flex flex-1 flex-col items-center py-2 text-xs',
    isActive ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200',
  )

export function AppLayout() {
  return (
    <div className="flex h-full flex-col pb-16">
      <main className="flex-1 overflow-y-auto px-4 py-3">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 flex border-t border-slate-800 bg-slate-950/95 backdrop-blur">
        <NavLink to="/" end className={linkClass}>
          ホーム
        </NavLink>
        <NavLink to="/record" className={linkClass}>
          記録
        </NavLink>
        <NavLink to="/analysis" className={linkClass}>
          分析
        </NavLink>
        <NavLink to="/settings" className={linkClass}>
          設定
        </NavLink>
      </nav>
    </div>
  )
}
