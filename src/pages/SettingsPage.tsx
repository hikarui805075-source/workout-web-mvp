import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import type { MuscleGroup } from '@/db/models'
import { db, resetAllData } from '@/db/database'
import { downloadJson, exportCsv, exportJson, importJsonMerge } from '@/services/exportImport'

const groups: MuscleGroup[] = ['胸', '背中', '肩', '腕', '脚', '体幹']

export function SettingsPage() {
  const profile = useLiveQuery(() => db.userProfiles.get('profile'), [])
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const [newEx, setNewEx] = useState({ name: '', muscleGroup: '胸' as MuscleGroup, category: 'その他' })

  if (!profile) return <p className="text-slate-400">読み込み中…</p>

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-white">設定</h1>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="mb-2 text-sm font-medium text-slate-300">表示・単位</h2>
        <label className="mb-2 block text-sm text-slate-400">
          表示名（任意）
          <input
            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            defaultValue={profile.name}
            onBlur={(e) => void db.userProfiles.update('profile', { name: e.target.value })}
          />
        </label>
        <label className="mb-2 block text-sm text-slate-400">
          重量単位
          <select
            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            value={profile.unitPref}
            onChange={(e) =>
              void db.userProfiles.update('profile', { unitPref: e.target.value as 'kg' | 'lbs' })
            }
          >
            <option value="kg">kg</option>
            <option value="lbs">lbs（保存はkg換算で内部処理予定・現状は表示のみ）</option>
          </select>
        </label>
        <label className="block text-sm text-slate-400">
          休憩タイマー初期（秒）
          <input
            type="number"
            min={30}
            max={300}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            value={profile.restTimerDefault}
            onChange={(e) =>
              void db.userProfiles.update('profile', { restTimerDefault: Number(e.target.value) })
            }
          />
        </label>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="mb-2 text-sm font-medium text-slate-300">種目マスタ</h2>
        <ul className="max-h-40 space-y-1 overflow-y-auto text-sm text-slate-300">
          {exercises
            .filter((e) => !e.isArchived)
            .map((e) => (
              <li key={e.id} className="flex justify-between border-b border-slate-800 py-1">
                <span>
                  {e.name}{' '}
                  <span className="text-slate-500">({e.muscleGroup})</span>
                </span>
                {!e.isPreset && (
                  <button
                    type="button"
                    className="text-xs text-rose-400"
                    onClick={() => void db.exercises.update(e.id, { isArchived: true })}
                  >
                    非表示
                  </button>
                )}
              </li>
            ))}
        </ul>
        <div className="mt-3 space-y-2">
          <input
            placeholder="新種目名"
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            value={newEx.name}
            onChange={(e) => setNewEx((x) => ({ ...x, name: e.target.value }))}
          />
          <select
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            value={newEx.muscleGroup}
            onChange={(e) => setNewEx((x) => ({ ...x, muscleGroup: e.target.value as MuscleGroup }))}
          >
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="w-full rounded bg-slate-700 py-2 text-sm text-white"
            onClick={() => {
              if (!newEx.name.trim()) return
              void db.exercises.add({
                id: crypto.randomUUID(),
                name: newEx.name.trim(),
                muscleGroup: newEx.muscleGroup,
                category: newEx.category,
                isPreset: false,
                isArchived: false,
              })
              setNewEx({ name: '', muscleGroup: '胸', category: 'その他' })
            }}
          >
            種目を追加
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="mb-2 text-sm font-medium text-slate-300">バックアップ</h2>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="rounded-lg bg-sky-700 py-2 text-sm text-white"
            onClick={async () => downloadJson(await exportJson())}
          >
            JSON エクスポート
          </button>
          <button
            type="button"
            className="rounded-lg bg-slate-700 py-2 text-sm text-white"
            onClick={() => void exportCsv()}
          >
            CSV エクスポート（セットログ）
          </button>
          <label className="rounded-lg border border-slate-600 py-2 text-center text-sm text-slate-200">
            JSON インポート（マージ）
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                const reader = new FileReader()
                reader.onload = () => {
                  try {
                    const data = JSON.parse(String(reader.result))
                    void importJsonMerge(data).then(() => alert('インポート完了')).catch((err) => {
                      alert(`失敗: ${err}`)
                    })
                  } catch {
                    alert('JSON が不正です')
                  }
                }
                reader.readAsText(f)
              }}
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-4">
        <h2 className="mb-2 text-sm font-medium text-rose-300">危険域</h2>
        <button
          type="button"
          className="w-full rounded-lg bg-rose-700 py-2 text-sm font-medium text-white"
          onClick={() => {
            if (confirm('全データを削除します。よろしいですか？')) void resetAllData().then(() => window.location.reload())
          }}
        >
          データ全削除
        </button>
      </section>

      <p className="text-xs leading-relaxed text-slate-500">
        本アプリの情報は参考値であり、医学的助言ではありません。MVP は端末内保存のみでサーバー送信は行いません。
      </p>
    </div>
  )
}
