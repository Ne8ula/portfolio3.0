export type SleeveClearanceInput = {
  readonly sleeveHeight: number
  readonly discRadius: number
  readonly clearance: number
}

export function computeSleeveMouthGap(
  sleeveThickness: number,
  panelThickness: number,
): number {
  return sleeveThickness - panelThickness * 2
}

export function computeSleeveClearRise({
  sleeveHeight,
  discRadius,
  clearance,
}: SleeveClearanceInput): number {
  return sleeveHeight / 2 + discRadius + clearance
}

export function canBeginLateralVinylFlight(
  extractionElapsed: number,
  extractionDuration: number,
  coverProgress: number,
): boolean {
  return (
    extractionDuration > 0 &&
    extractionElapsed >= extractionDuration &&
    coverProgress >= 0.65
  )
}

export function isAtSleeveClearWaypoint(
  rise: number,
  clearRise: number,
  tolerance = 0.0001,
): boolean {
  return Math.abs(rise - clearRise) < tolerance
}
