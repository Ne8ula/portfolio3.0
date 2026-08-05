import { describe, expect, it } from 'vitest'

import {
  canBeginLateralVinylFlight,
  computeSleeveClearRise,
  computeSleeveMouthGap,
  isAtSleeveClearWaypoint,
} from '@/components/cockpit/vinyl-motion'

describe('vinyl sleeve clearance contract', () => {
  const sleeveHeight = 0.98
  const discRadius = sleeveHeight * 0.46
  const clearance = 0.025
  const clearRise = computeSleeveClearRise({
    sleeveHeight,
    discRadius,
    clearance,
  })

  it('leaves a physical mouth wider than the record', () => {
    const mouthGap = computeSleeveMouthGap(0.045, 0.006)

    expect(mouthGap).toBeCloseTo(0.033, 4)
    expect(mouthGap).toBeGreaterThan(0.02)
  })

  it('keeps the preview partly jacketed and computes the clear waypoint', () => {
    const previewRise = 0.52

    expect(previewRise - discRadius - sleeveHeight / 2).toBeLessThan(0)
    expect(clearRise).toBeCloseTo(0.9658, 4)
    expect(clearRise - discRadius - sleeveHeight / 2).toBeCloseTo(
      clearance,
      4,
    )
  })

  it('locks lateral travel until extraction and cover clearance both pass', () => {
    expect(canBeginLateralVinylFlight(0.41, 0.42, 1)).toBe(false)
    expect(canBeginLateralVinylFlight(0.42, 0.42, 0.64)).toBe(false)
    expect(canBeginLateralVinylFlight(0.42, 0.42, 0.65)).toBe(true)
    expect(canBeginLateralVinylFlight(0.01, 0.01, 0.65)).toBe(true)
  })

  it('requires return insertion to begin at the same clear waypoint', () => {
    expect(isAtSleeveClearWaypoint(clearRise, clearRise)).toBe(true)
    expect(isAtSleeveClearWaypoint(clearRise - 0.001, clearRise)).toBe(false)
  })
})
