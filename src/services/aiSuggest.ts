import { differenceInHours, parseISO } from 'date-fns'
import type { Exercise, Session, SetLog } from '@/db/models'
import { db } from '@/db/database'

export interface SuggestedExercise {
  exercise: Exercise
  suggestedWeight: number
  suggestedReps: number
  suggestedSets: number
  reason: string
}

function lastSessionDateForMuscle(
  muscle: string,
  sessions: Session[],
  setLogs: SetLog[],
  exercises: Exercise[],
): number | null {
  const exIds = new Set(exercises.filter((e) => e.muscleGroup === muscle).map((e) => e.id))
  let latest: number | null = null
  for (const s of sessions) {
    if (!s.completedAt) continue
    const has = setLogs.some((l) => l.sessionId === s.id && exIds.has(l.exerciseId))
    if (has) {
      const t = parseISO(s.completedAt).getTime()
      if (latest === null || t > latest) latest = t
    }
  }
  return latest
}

function lastSetsForExercise(
  exerciseId: string,
  sessions: Session[],
  setLogs: SetLog[],
): SetLog[] {
  const completed = sessions
    .filter((s) => s.completedAt)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
  for (const s of completed) {
    const sets = setLogs
      .filter((l) => l.sessionId === s.id && l.exerciseId === exerciseId)
      .sort((a, b) => a.setNumber - b.setNumber)
    if (sets.length) return sets
  }
  return []
}

function suggestLoadFromLastSets(sets: SetLog[]): {
  weight: number
  reps: number
  sets: number
} {
  if (!sets.length) return { weight: 20, reps: 8, sets: 3 }
  const last = sets[sets.length - 1]
  const targetReps = 8
  const rate = last.reps / targetReps
  let w = last.weight
  if (rate >= 1) w += 2.5
  else if (rate < 0.6) w = Math.max(0, w - 2.5)
  return { weight: Math.round(w * 10) / 10, reps: targetReps, sets: sets.length }
}

/** ルールベース次回メニュー（要件 §3.7 準拠・簡易版） */
export async function buildNextMenuSuggestions(): Promise<SuggestedExercise[]> {
  const [exercises, sessions, setLogs] = await Promise.all([
    db.exercises.filter((e) => !e.isArchived).toArray(),
    db.sessions.toArray(),
    db.setLogs.toArray(),
  ])

  const completedSessions = sessions.filter((s) => s.completedAt)
  if (completedSessions.length < 5) {
    // 初心者: Push 系を中心にプリセット
    const pushNames = ['ベンチプレス', 'オーバーヘッドプレス', 'ディップス', 'サイドレイズ']
    return pushNames
      .map((n) => exercises.find((e) => e.name === n))
      .filter(Boolean)
      .map((exercise) => ({
        exercise: exercise!,
        suggestedWeight: 20,
        suggestedReps: 10,
        suggestedSets: 3,
        reason: '初心者向け Push プリセット',
      }))
  }

  const muscles = ['胸', '背中', '肩', '腕', '脚', '体幹'] as const
  const now = Date.now()
  const gaps = muscles.map((m) => {
    const last = lastSessionDateForMuscle(m, sessions, setLogs, exercises)
    const hours = last == null ? 999 : (now - last) / (1000 * 60 * 60)
    return { muscle: m, hours }
  })
  gaps.sort((a, b) => b.hours - a.hours)

  const picked: Exercise[] = []
  for (const g of gaps) {
    const candidates = exercises
      .filter((e) => e.muscleGroup === g.muscle && !picked.includes(e))
      .slice(0, 2)
    picked.push(...candidates)
    if (picked.length >= 8) break
  }

  const result: SuggestedExercise[] = []
  for (const exercise of picked.slice(0, 8)) {
    const lastSets = lastSetsForExercise(exercise.id, sessions, setLogs)
    const { weight, reps, sets } = suggestLoadFromLastSets(lastSets)
    const lastMuscle = lastSessionDateForMuscle(
      exercise.muscleGroup,
      sessions,
      setLogs,
      exercises,
    )
    const restOk =
      lastMuscle == null || differenceInHours(new Date(), new Date(lastMuscle)) >= 48
    result.push({
      exercise,
      suggestedWeight: restOk ? weight : Math.min(weight, lastSets.at(-1)?.weight ?? weight),
      suggestedReps: reps,
      suggestedSets: sets,
      reason: restOk ? '部位ローテーション優先' : '48h未満のため重量抑制',
    })
  }
  return result
}


