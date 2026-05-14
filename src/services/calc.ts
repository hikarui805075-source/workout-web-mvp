/** Epley 1RM 推定 */
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0) return 0
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

export function setVolume(weight: number, reps: number): number {
  return weight * reps
}

export function sessionVolumeFromSets(
  sets: { weight: number; reps: number }[],
): number {
  return sets.reduce((a, s) => a + setVolume(s.weight, s.reps), 0)
}

export function lbsToKg(lbs: number): number {
  return lbs * 0.45359237
}

export function kgToLbs(kg: number): number {
  return kg / 0.45359237
}
