import { useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import type { Session } from '@/db/models'

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'] as const

function hasCompletedSessionOnDate(sessions: Session[], date: Date): boolean {
  const key = format(date, 'yyyy-MM-dd')
  return sessions.some((s) => s.completedAt && s.date.slice(0, 10) === key)
}

export function MonthCalendar({ sessions }: { sessions: Session[] }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [month])

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth((m) => subMonths(m, 1))}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          aria-label="前の月"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-sm font-medium text-slate-300">
          {format(month, 'yyyy年M月', { locale: ja })}
        </h2>
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          aria-label="次の月"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {days.map((day) => {
          const inMonth = isSameMonth(day, month)
          const logged = hasCompletedSessionOnDate(sessions, day)
          const today = isToday(day)
          return (
            <div
              key={day.toISOString()}
              className={clsx(
                'flex flex-col items-center rounded-md py-1',
                !inMonth && 'text-slate-600',
                inMonth && 'text-slate-300',
                today && inMonth && 'ring-1 ring-sky-500/50',
              )}
            >
              <span className={clsx(!inMonth && 'opacity-50')}>{format(day, 'd')}</span>
              <span className="mt-0.5 flex h-2 w-2 items-center justify-center">
                {logged && inMonth ? (
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-transparent" />
                )}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
