import type { ExportBundle } from '@/db/models'
import { db } from '@/db/database'

export async function exportJson(): Promise<ExportBundle> {
  const [userProfiles, exercises, sessions, setLogs, bodyWeights] = await Promise.all([
    db.userProfiles.toArray(),
    db.exercises.toArray(),
    db.sessions.toArray(),
    db.setLogs.toArray(),
    db.bodyWeights.toArray(),
  ])
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    userProfiles,
    exercises,
    sessions,
    setLogs,
    bodyWeights,
  }
}

export function downloadJson(data: ExportBundle): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `workout-backup-${data.exportedAt.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function exportCsv(): Promise<void> {
  const [setLogs, exercises, sessions] = await Promise.all([
    db.setLogs.toArray(),
    db.exercises.toArray(),
    db.sessions.toArray(),
  ])
  const exMap = new Map(exercises.map((e) => [e.id, e.name]))
  const sessionDate = new Map(sessions.map((s) => [s.id, s.date]))
  const rows = [
    ['date', 'exercise', 'set', 'weight', 'reps', 'rpe', 'memo'].join(','),
    ...setLogs.map((l) =>
      [
        sessionDate.get(l.sessionId) ?? '',
        exMap.get(l.exerciseId) ?? l.exerciseId,
        l.setNumber,
        l.weight,
        l.reps,
        l.rpe ?? '',
        `"${(l.memo || '').replace(/"/g, '""')}"`,
      ].join(','),
    ),
  ]
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `workout-sets-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map<string, T>()
  for (const x of existing) map.set(x.id, x)
  for (const x of incoming) map.set(x.id, x)
  return [...map.values()]
}

export async function importJsonMerge(data: ExportBundle): Promise<void> {
  if (data.version !== 1) throw new Error('未対応のバージョンです')
  await db.transaction('rw', db.tables, async () => {
    await db.userProfiles.bulkPut(mergeById(await db.userProfiles.toArray(), data.userProfiles))
    await db.exercises.bulkPut(mergeById(await db.exercises.toArray(), data.exercises))
    await db.sessions.bulkPut(mergeById(await db.sessions.toArray(), data.sessions))
    await db.setLogs.bulkPut(mergeById(await db.setLogs.toArray(), data.setLogs))
    await db.bodyWeights.bulkPut(mergeById(await db.bodyWeights.toArray(), data.bodyWeights))
  })
}
