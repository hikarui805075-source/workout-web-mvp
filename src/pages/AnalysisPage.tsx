import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { format, parseISO, startOfWeek } from 'date-fns'
import { ja } from 'date-fns/locale'
import { db } from '@/db/database'
import type { Exercise, Session, SetLog } from '@/db/models'
import { estimate1RM } from '@/services/calc'

type Period = '1m' | '3m' | '6m' | '1y' | 'all'

const periodDays: Record<Period, number | null> = {
  '1m': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365,
  all: null,
}

const EMPTY_EX: Exercise[] = []
const EMPTY_SE: Session[] = []
const EMPTY_SL: SetLog[] = []

export function AnalysisPage() {
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? EMPTY_EX
  const sessions = useLiveQuery(() => db.sessions.filter((s) => !!s.completedAt).toArray(), []) ?? EMPTY_SE
  const setLogs = useLiveQuery(() => db.setLogs.toArray(), []) ?? EMPTY_SL

  const withData = useMemo(() => {
    const ids = new Set(setLogs.map((l) => l.exerciseId))
    return exercises.filter((e) => ids.has(e.id))
  }, [exercises, setLogs])

  const [exId, setExId] = useState<string>('')
  const [period, setPeriod] = useState<Period>('3m')

  const selectedId = exId || withData[0]?.id || ''

  const exercise = exercises.find((e) => e.id === selectedId)

  const anchorMs = useMemo(() => {
    let m = 0
    for (const s of sessions) {
      if (s.completedAt) m = Math.max(m, parseISO(s.completedAt).getTime())
    }
    return m
  }, [sessions])

  const chartPoints = useMemo(() => {
    if (!selectedId) return []
    const days = periodDays[period]
    const cutoff = days && anchorMs ? anchorMs - days * 86400000 : 0
    const sessionMap = new Map(sessions.map((s) => [s.id, s]))
    const bySession = new Map<string, { max1rm: number; date: string }>()
    for (const l of setLogs) {
      if (l.exerciseId !== selectedId) continue
      const s = sessionMap.get(l.sessionId)
      if (!s?.completedAt) continue
      const t = parseISO(s.completedAt).getTime()
      if (t < cutoff) continue
      const e1 = estimate1RM(l.weight, l.reps)
      const cur = bySession.get(l.sessionId)
      if (!cur || e1 > cur.max1rm) {
        bySession.set(l.sessionId, { max1rm: e1, date: s.date })
      }
    }
    return [...bySession.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((p) => ({
        label: format(parseISO(p.date), 'M/d', { locale: ja }),
        max1rm: Math.round(p.max1rm * 10) / 10,
      }))
  }, [selectedId, period, sessions, setLogs, anchorMs])

  const weeklyVolume = useMemo(() => {
    const days = periodDays[period] ?? 90
    const cutoff = anchorMs ? anchorMs - days * 86400000 : 0
    const map = new Map<string, number>()
    for (const s of sessions) {
      if (!s.completedAt) continue
      const t = parseISO(s.completedAt).getTime()
      if (t < cutoff) continue
      const wk = format(startOfWeek(parseISO(s.date), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const logs = setLogs.filter((l) => l.sessionId === s.id)
      const vol = logs.reduce((a, l) => a + l.weight * l.reps, 0)
      map.set(wk, (map.get(wk) ?? 0) + vol)
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({ week: k, volume: Math.round(v) }))
  }, [period, sessions, setLogs, anchorMs])

  if (!withData.length) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-white">分析</h1>
        <p className="mt-4 text-slate-400">データが溜まるとグラフが表示されます</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-white">分析</h1>

      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          value={selectedId}
          onChange={(e) => setExId(e.target.value)}
        >
          {withData.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
        >
          <option value="1m">1ヶ月</option>
          <option value="3m">3ヶ月</option>
          <option value="6m">6ヶ月</option>
          <option value="1y">1年</option>
          <option value="all">全期間</option>
        </select>
      </div>

      {exercise && <p className="text-sm text-slate-400">{exercise.muscleGroup}</p>}

      <section>
        <h2 className="mb-2 text-sm font-medium text-slate-300">1RM 推移（Epley）</h2>
        <div className="h-56 w-full rounded-xl border border-slate-800 bg-slate-900/50 p-2">
          {chartPoints.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">この期間にデータがありません</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartPoints}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                <Line type="monotone" dataKey="max1rm" stroke="#38bdf8" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-slate-300">週次ボリューム（全種目）</h2>
        <div className="h-56 w-full rounded-xl border border-slate-800 bg-slate-900/50 p-2">
          {weeklyVolume.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">データがありません</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyVolume}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                <Bar dataKey="volume" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  )
}
