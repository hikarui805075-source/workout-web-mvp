import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import { db } from '@/db/database'
import { buildNextMenuSuggestions, currentWeekStart, weekDots } from '@/services/aiSuggest'
import { sessionVolumeFromSets } from '@/services/calc'
import type { SuggestedExercise } from '@/services/aiSuggest'
import type { Exercise, Session, SetLog } from '@/db/models'

const EMPTY_SE: Session[] = []
const EMPTY_SL: SetLog[] = []
const EMPTY_EX: Exercise[] = []

export function HomePage() {
  const sessions = useLiveQuery(() => db.sessions.orderBy('startedAt').reverse().toArray(), []) ?? EMPTY_SE
  const setLogs = useLiveQuery(() => db.setLogs.toArray(), []) ?? EMPTY_SL
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? EMPTY_EX
  const [menu, setMenu] = useState<SuggestedExercise[]>([])

  useEffect(() => {
    void buildNextMenuSuggestions().then(setMenu)
  }, [sessions, setLogs])

  const completed = sessions.filter((s) => s.completedAt)
  const last = completed[0]
  const week = currentWeekStart()
  const dots = weekDots(sessions, week)

  let lastLine = 'まだ記録がありません'
  if (last) {
    const logs = setLogs.filter((l) => l.sessionId === last.id)
    const vol = sessionVolumeFromSets(logs)
    const exMap = new Map(exercises.map((e) => [e.id, e]))
    const muscles = [...new Set(logs.map((l) => exMap.get(l.exerciseId)?.muscleGroup).filter(Boolean))]
    lastLine = `${format(parseISO(last.date), 'M/d (EEE)', { locale: ja })} · ${muscles.join('・') || '—'} · ボリューム ${Math.round(vol)}kg${last.durationSec != null ? ` · ${Math.round(last.durationSec / 60)}分` : ''}`
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-white">ホーム</h1>
        <p className="text-sm text-slate-400">今週の記録と次のおすすめ</p>
      </header>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-2 text-sm font-medium text-slate-300">今週のカレンダー</h2>
        <div className="flex justify-between gap-1 text-center text-xs text-slate-500">
          {['月', '火', '水', '木', '金', '土', '日'].map((d, i) => (
            <div key={d} className="flex-1">
              <div>{d}</div>
              <div className="mt-1 flex justify-center">
                <span
                  className={
                    dots[i] ? 'h-2 w-2 rounded-full bg-sky-400' : 'h-2 w-2 rounded-full bg-slate-700'
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-2 text-sm font-medium text-slate-300">直近セッション</h2>
        <p className="text-slate-200">{lastLine}</p>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-2 text-sm font-medium text-slate-300">次回おすすめメニュー</h2>
        <ul className="space-y-2 text-sm">
          {menu.map((m) => (
            <li key={m.exercise.id} className="flex justify-between gap-2 border-b border-slate-800/80 py-1">
              <span>{m.exercise.name}</span>
              <span className="text-slate-400">
                {m.suggestedWeight}kg × {m.suggestedReps} × {m.suggestedSets}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">{menu[0]?.reason}</p>
      </section>

      <div className="flex flex-col gap-2">
        <Link
          to="/record?start=1"
          className="rounded-lg bg-sky-600 py-3 text-center font-medium text-white hover:bg-sky-500"
        >
          トレーニング開始
        </Link>
      </div>
    </div>
  )
}
