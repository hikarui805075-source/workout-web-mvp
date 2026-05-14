import { describe, expect, it } from 'vitest'
import { estimate1RM, sessionVolumeFromSets } from './calc'

describe('calc', () => {
  it('estimate1RM Epley', () => {
    expect(estimate1RM(100, 1)).toBe(100)
    expect(estimate1RM(100, 10)).toBeCloseTo(100 * (1 + 10 / 30), 5)
  })

  it('sessionVolumeFromSets', () => {
    expect(sessionVolumeFromSets([{ weight: 10, reps: 5 }])).toBe(50)
  })
})
