import { create } from 'zustand'

type TimerState = {
  remainingSec: number | null
  intervalId: ReturnType<typeof setInterval> | null
  start: (seconds: number) => void
  tick: () => void
  stop: () => void
}

export const useRestTimer = create<TimerState>((set, get) => ({
  remainingSec: null,
  intervalId: null,
  start(seconds) {
    get().stop()
    const intervalId = setInterval(() => {
      get().tick()
    }, 1000)
    set({ remainingSec: seconds, intervalId })
  },
  tick() {
    const r = get().remainingSec
    if (r == null) return
    if (r <= 1) {
      get().stop()
      return
    }
    set({ remainingSec: r - 1 })
  },
  stop() {
    const id = get().intervalId
    if (id) clearInterval(id)
    set({ remainingSec: null, intervalId: null })
  },
}))
