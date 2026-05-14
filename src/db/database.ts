import Dexie, { type Table } from 'dexie'
import type { BodyWeight, Exercise, Session, SetLog, UserProfile } from './models'

const PRESETS: Omit<Exercise, 'id'>[] = [
  { name: 'ベンチプレス', muscleGroup: '胸', category: 'バーベル', isPreset: true, isArchived: false },
  { name: 'インクラインベンチプレス', muscleGroup: '胸', category: 'バーベル', isPreset: true, isArchived: false },
  { name: 'ダンベルフライ', muscleGroup: '胸', category: 'ダンベル', isPreset: true, isArchived: false },
  { name: 'チェストプレス', muscleGroup: '胸', category: 'マシン', isPreset: true, isArchived: false },
  { name: 'ディップス', muscleGroup: '胸', category: '自重', isPreset: true, isArchived: false },
  { name: 'デッドリフト', muscleGroup: '背中', category: 'バーベル', isPreset: true, isArchived: false },
  { name: 'ラットプルダウン', muscleGroup: '背中', category: 'マシン', isPreset: true, isArchived: false },
  { name: 'ベントオーバーロウ', muscleGroup: '背中', category: 'バーベル', isPreset: true, isArchived: false },
  { name: 'チンニング', muscleGroup: '背中', category: '自重', isPreset: true, isArchived: false },
  { name: 'シーテッドロウ', muscleGroup: '背中', category: 'マシン', isPreset: true, isArchived: false },
  { name: 'オーバーヘッドプレス', muscleGroup: '肩', category: 'バーベル', isPreset: true, isArchived: false },
  { name: 'サイドレイズ', muscleGroup: '肩', category: 'ダンベル', isPreset: true, isArchived: false },
  { name: 'フロントレイズ', muscleGroup: '肩', category: 'ダンベル', isPreset: true, isArchived: false },
  { name: 'リアデルトフライ', muscleGroup: '肩', category: 'ダンベル', isPreset: true, isArchived: false },
  { name: 'アーノルドプレス', muscleGroup: '肩', category: 'ダンベル', isPreset: true, isArchived: false },
  { name: 'バーベルカール', muscleGroup: '腕', category: 'バーベル', isPreset: true, isArchived: false },
  { name: 'ハンマーカール', muscleGroup: '腕', category: 'ダンベル', isPreset: true, isArchived: false },
  { name: 'トライセプスエクステンション', muscleGroup: '腕', category: 'ダンベル', isPreset: true, isArchived: false },
  { name: 'ケーブルプッシュダウン', muscleGroup: '腕', category: 'ケーブル', isPreset: true, isArchived: false },
  { name: 'プリーチャーカール', muscleGroup: '腕', category: 'バーベル', isPreset: true, isArchived: false },
  { name: 'スクワット', muscleGroup: '脚', category: 'バーベル', isPreset: true, isArchived: false },
  { name: 'レッグプレス', muscleGroup: '脚', category: 'マシン', isPreset: true, isArchived: false },
  { name: 'レッグエクステンション', muscleGroup: '脚', category: 'マシン', isPreset: true, isArchived: false },
  { name: 'レッグカール', muscleGroup: '脚', category: 'マシン', isPreset: true, isArchived: false },
  { name: 'ブルガリアンスクワット', muscleGroup: '脚', category: 'ダンベル', isPreset: true, isArchived: false },
  { name: 'プランク', muscleGroup: '体幹', category: '自重', isPreset: true, isArchived: false },
  { name: 'アブローラー', muscleGroup: '体幹', category: '自重', isPreset: true, isArchived: false },
  { name: 'ハンギングレッグレイズ', muscleGroup: '体幹', category: '自重', isPreset: true, isArchived: false },
  { name: 'ケーブルクランチ', muscleGroup: '体幹', category: 'ケーブル', isPreset: true, isArchived: false },
  { name: 'サイドベンド', muscleGroup: '体幹', category: 'ダンベル', isPreset: true, isArchived: false },
]

export class WorkoutDB extends Dexie {
  userProfiles!: Table<UserProfile, string>
  exercises!: Table<Exercise, string>
  sessions!: Table<Session, string>
  setLogs!: Table<SetLog, string>
  bodyWeights!: Table<BodyWeight, string>

  constructor() {
    super('workout_web_mvp')
    this.version(1).stores({
      userProfiles: 'id',
      exercises: 'id, name, muscleGroup, isArchived',
      sessions: 'id, date, startedAt, completedAt',
      setLogs: 'id, sessionId, exerciseId, createdAt',
      bodyWeights: 'id, date',
    })

    this.on('populate', async () => {
      const now = new Date().toISOString()
      await this.userProfiles.add({
        id: 'profile',
        name: '',
        unitPref: 'kg',
        restTimerDefault: 90,
        theme: 'dark',
        createdAt: now,
      })
      for (const p of PRESETS) {
        await this.exercises.add({
          id: crypto.randomUUID(),
          ...p,
        })
      }
    })
  }
}

export const db = new WorkoutDB()

export async function resetAllData(): Promise<void> {
  await db.delete()
  await db.open()
}
