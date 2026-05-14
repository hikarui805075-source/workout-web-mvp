import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { db } from '@/db/database'
import type { Exercise, Session, SetLog } from '@/db/models'
import { estimate1RM } from '@/services/calc'
import { useRestTimer } from '@/stores/restTimer'

const EMPTY_SE: Session[] = []
const EMPTY_SL: SetLog[] = []
const EMPTY_EX: Exercise[] = []

async function getActiveSession(): Promise<Session | undefined> {
  return db.sessions.filter((s) => !s.completedAt).first()
}

async function createSession(): Promise<Session> {
  const now = new Date()
  const date = now.toISOString().slice(0, 10)
  const s: Session = {
    id: crypto.randomUUID(),
    date,
    startedAt: now.toISOString(),
    completedAt: null,
    notes: '',
    durationSec: null,
  }
  await db.sessions.add(s)
  return s
}

async function copyLastCompletedSession(): Promise<Session | undefined> {
  const done = await db.sessions.filter((s) => !!s.completedAt).toArray()
  done.sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
  const prev = done[0]
  if (!prev) return undefined
  const oldLogs = await db.setLogs.where('sessionId').equals(prev.id).toArray()
  if (!oldLogs.length) return undefined
  const cur = await getActiveSession()
  if (cur) {
    await db.setLogs.where('sessionId').equals(cur.id).delete()
    await db.sessions.delete(cur.id)
  }
  const ns = await createSession()
  for (const l of oldLogs) {
    await db.setLogs.add({
      id: crypto.randomUUID(),
      sessionId: ns.id,
      exerciseId: l.exerciseId,
      setNumber: l.setNumber,
      weight: l.weight,
      reps: l.reps,
      rpe: l.rpe,
      memo: l.memo,
      isWarmup: l.isWarmup,
      createdAt: new Date().toISOString(),
    })
  }
  return ns
}

async function max1RMForExercise(exerciseId: string, excludeLogId?: string): Promise<number> {
  const logs = await db.setLogs.where('exerciseId').equals(exerciseId).toArray()
  let m = 0
  for (const l of logs) {
    if (l.id === excludeLogId) continue
    m = Math.max(m, estimate1RM(l.weight, l.reps))
  }
  return m
}

export function RecordPage() {
  const [searchParams] = useSearchParams()
  const profile = useLiveQuery(() => db.userProfiles.get('profile'), [])
  const exercises = useLiveQuery(() => db.exercises.filter((e) => !e.isArchived).toArray(), []) ?? EMPTY_EX
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? EMPTY_SE
  const setLogs = useLiveQuery(() => db.setLogs.toArray(), []) ?? EMPTY_SL
  const remainingSec = useRestTimer((s) => s.remainingSec)

  useEffect(() => {
    if (searchParams.get('start') === '1') {
      void (async () => {
        if (!(await getActiveSession())) await createSession()
      })()
    }
  }, [searchParams])

  const active = useMemo(
    () => sessions.find((s) => !s.completedAt),
    [sessions],
  )

  const logsForActive = useMemo(
    () => (active ? setLogs.filter((l) => l.sessionId === active.id) : []),
    [active, setLogs],
  )

  const exerciseIdsInSession = useMemo(() => {
    const ids = [...new Set(logsForActive.map((l) => l.exerciseId))]
    return ids
  }, [logsForActive])

  const [pickerOpen, setPickerOpen] = useState(false)

  const startFresh = useCallback(async () => {
    const cur = await getActiveSession()
    if (cur && logsForActive.length === 0) await db.sessions.delete(cur.id)
    else if (cur && logsForActive.length > 0) {
      if (!confirm('未完了のセッションがあります。破棄して新規開始しますか？')) return
      await db.setLogs.where('sessionId').equals(cur.id).delete()
      await db.sessions.delete(cur.id)
    }
    await createSession()
  }, [logsForActive.length])

  const startCopy = useCallback(async () => {
    await copyLastCompletedSession()
  }, [])

  const addExercise = async (ex: Exercise) => {
    if (!active) return
    const existing = logsForActive.filter((l) => l.exerciseId === ex.id)
    const n = existing.length ? Math.max(...existing.map((x) => x.setNumber)) + 1 : 1
    const other = await db.setLogs.where('exerciseId').equals(ex.id).toArray()
    const past = other
      .filter((l) => l.sessionId !== active.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const ref = past[0]
    await db.setLogs.add({
      id: crypto.randomUUID(),
      sessionId: active.id,
      exerciseId: ex.id,
      setNumber: n,
      weight: ref?.weight ?? 20,
      reps: ref?.reps ?? 8,
      rpe: null,
      memo: '',
      isWarmup: false,
      createdAt: new Date().toISOString(),
    })
    setPickerOpen(false)
    const def = profile?.restTimerDefault ?? 90
    useRestTimer.getState().start(def)
  }

  const complete = async () => {
    if (!active) return
    const started = new Date(active.startedAt).getTime()
    const dur = Math.max(0, Math.round((Date.now() - started) / 1000))
    await db.sessions.update(active.id, {
      completedAt: new Date().toISOString(),
      durationSec: dur,
    })
    useRestTimer.getState().stop()
    alert('セッションを保存しました')
    window.location.reload()
  }

  if (!active) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-white">記録</h1>
        <p className="text-sm text-slate-400">セッションを開始してください</p>
        <button
          type="button"
          onClick={() => void startFresh()}
          className="w-full rounded-lg bg-sky-600 py-3 font-medium text-white"
        >
          新規セッション
        </button>
        <button
          type="button"
          onClick={() => void startCopy()}
          className="w-full rounded-lg border border-slate-600 py-3 font-medium text-slate-100"
        >
          前回をコピー
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">記録中</h1>
        {remainingSec != null && (
          <span className="rounded-full bg-amber-500/20 px-3 py-1 text-sm text-amber-300">
            休憩 {remainingSec}s
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex-1 rounded-lg bg-slate-800 py-2 text-sm text-white"
        >
          種目を追加
        </button>
        <button
          type="button"
          onClick={() => void complete()}
          className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white"
        >
          完了
        </button>
      </div>

      {exerciseIdsInSession.length === 0 && (
        <p className="text-sm text-slate-500">種目を追加してセットを入力してください</p>
      )}

      {exerciseIdsInSession.map((eid) => {
        const ex = exercises.find((e) => e.id === eid)
        if (!ex) return null
        const sets = logsForActive.filter((l) => l.exerciseId === eid).sort((a, b) => a.setNumber - b.setNumber)
        return (
          <ExerciseBlock
            key={eid}
            exercise={ex}
            sessionId={active.id}
            sets={sets}
            allSessions={sessions}
            allLogs={setLogs}
          />
        )
      })}

      {pickerOpen && (
        <ExercisePicker exercises={exercises} onPick={(e) => void addExercise(e)} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  )
}

function ExercisePicker({
  exercises,
  onPick,
  onClose,
}: {
  exercises: Exercise[]
  onPick: (e: Exercise) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const filtered = exercises.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 p-4" role="dialog">
      <div className="max-h-[70vh] w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-xl">
        <div className="mb-2 flex justify-between">
          <span className="font-medium text-white">種目選択</span>
          <button type="button" className="text-slate-400" onClick={onClose}>
            閉じる
          </button>
        </div>
        <input
          className="mb-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          placeholder="検索"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <ul className="max-h-52 overflow-y-auto text-sm">
          {filtered.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className="w-full py-2 text-left text-slate-200 hover:bg-slate-800"
                onClick={() => onPick(e)}
              >
                {e.name}{' '}
                <span className="text-slate-500">({e.muscleGroup})</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function ExerciseBlock({
  exercise,
  sessionId,
  sets,
  allSessions,
  allLogs,
}: {
  exercise: Exercise
  sessionId: string
  sets: SetLog[]
  allSessions: Session[]
  allLogs: SetLog[]
}) {
  const prevMap = useMemo(() => {
    const completed = allSessions
      .filter((s) => s.completedAt && s.id !== sessionId)
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
    const out = new Map<number, SetLog>()
    for (const s of completed) {
      const ls = allLogs
        .filter((l) => l.sessionId === s.id && l.exerciseId === exercise.id)
        .sort((a, b) => a.setNumber - b.setNumber)
      ls.forEach((l) => out.set(l.setNumber, l))
      if (out.size) break
    }
    return out
  }, [allSessions, allLogs, exercise.id, sessionId])

  const addSet = async () => {
    const n = sets.length ? Math.max(...sets.map((s) => s.setNumber)) + 1 : 1
    const last = sets.at(-1)
    await db.setLogs.add({
      id: crypto.randomUUID(),
      sessionId,
      exerciseId: exercise.id,
      setNumber: n,
      weight: last?.weight ?? 20,
      reps: last?.reps ?? 8,
      rpe: null,
      memo: '',
      isWarmup: false,
      createdAt: new Date().toISOString(),
    })
    const p = await db.userProfiles.get('profile')
    useRestTimer.getState().start(p?.restTimerDefault ?? 90)
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-medium text-white">{exercise.name}</h2>
        <span className="text-xs text-slate-500">{exercise.muscleGroup}</span>
      </div>
      <div className="space-y-2">
        {sets.map((set) => (
          <SetRow key={set.id} set={set} prev={prevMap.get(set.setNumber)} exerciseId={exercise.id} />
        ))}
      </div>
      <button
        type="button"
        onClick={() => void addSet()}
        className="mt-2 w-full rounded border border-dashed border-slate-600 py-1 text-sm text-slate-400"
      >
        + セット追加
      </button>
    </section>
  )
}

function SetRow({ set, prev, exerciseId }: { set: SetLog; prev?: SetLog; exerciseId: string }) {
  const [pr, setPr] = useState(false)

  const save = async (patch: Partial<SetLog>) => {
    const merged = { ...set, ...patch }
    const maxOld = await max1RMForExercise(exerciseId, set.id)
    const newEst = estimate1RM(merged.weight, merged.reps)
    setPr(newEst > maxOld + 0.01)
    await db.setLogs.update(set.id, patch)
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-950/80 p-2">
      <span className="text-xs text-slate-500">#{set.setNumber}</span>
      {prev && (
        <span className="text-xs text-slate-600">
          前回 {prev.weight}×{prev.reps}
        </span>
      )}
      <label className="text-xs text-slate-400">
        kg
        <input
          type="number"
          step="0.1"
          className="ml-1 w-20 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-white"
          defaultValue={set.weight}
          onBlur={(e) => void save({ weight: Number(e.target.value) })}
        />
      </label>
      <label className="text-xs text-slate-400">
        回
        <input
          type="number"
          className="ml-1 w-16 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-white"
          defaultValue={set.reps}
          onBlur={(e) => void save({ reps: Number(e.target.value) })}
        />
      </label>
      {pr && <span className="text-xs font-semibold text-amber-400">PR更新</span>}
    </div>
  )
}
