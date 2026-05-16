import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import { db } from '@/db/database'
import { sessionVolumeFromSets } from '@/services/calc'
import { MonthCalendar } from '@/components/MonthCalendar'
import type { Exercise, Session, SetLog } from '@/db/models'

const EMPTY_SE: Session[] = []
const EMPTY_SL: SetLog[] = []
const EMPTY_EX: Exercise[] = []

export function HomePage() {
  const sessions = useLiveQuery(() => db.sessions.orderBy('startedAt').reverse().toArray(), []) ?? EMPTY_SE
  const setLogs = useLiveQuery(() => db.setLogs.toArray(), []) ?? EMPTY_SL
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? EMPTY_EX

  const completed = sessions.filter((s) => s.completedAt)
  const last = completed[0]

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
        <p className="text-sm text-slate-400">月間のトレーニング記録</p>
      </header>

      <MonthCalendar sessions={sessions} />

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-2 text-sm font-medium text-slate-300">直近セッション</h2>
        <p className="text-slate-200">{lastLine}</p>
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
