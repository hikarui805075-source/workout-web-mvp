export type UnitPref = 'kg' | 'lbs'
export type ThemePref = 'light' | 'dark' | 'system'

export type MuscleGroup = '胸' | '背中' | '肩' | '腕' | '脚' | '体幹'

export interface UserProfile {
  id: string
  name: string
  unitPref: UnitPref
  restTimerDefault: number
  theme: ThemePref
  createdAt: string
}

export interface Exercise {
  id: string
  name: string
  muscleGroup: MuscleGroup
  category: string
  isPreset: boolean
  isArchived: boolean
}

export interface Session {
  id: string
  date: string
  startedAt: string
  completedAt: string | null
  notes: string
  durationSec: number | null
}

export interface SetLog {
  id: string
  sessionId: string
  exerciseId: string
  setNumber: number
  weight: number
  reps: number
  rpe: number | null
  memo: string
  isWarmup: boolean
  createdAt: string
}

export interface BodyWeight {
  id: string
  date: string
  weightKg: number
  createdAt: string
}

export interface ExportBundle {
  version: 1
  exportedAt: string
  userProfiles: UserProfile[]
  exercises: Exercise[]
  sessions: Session[]
  setLogs: SetLog[]
  bodyWeights: BodyWeight[]
}
