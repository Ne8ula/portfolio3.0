// Unit tests for lib/responsive/input-policy.ts (Phase 0, plan §A.5 / §9.4).
// Hover free-look and contained-stage panning are DIFFERENT mechanisms:
// hover keeps full ±range at every viewport (only the curve changes), while
// accumulated panning is scaled by sizeRatio. The full-range guard below is
// the primary regression guard against a reference-dimension divisor on
// hover.
import { describe, expect, it } from 'vitest'

import type { ViewportSize } from '@/lib/responsive/layout-contract'
import {
  DELTA_LINE,
  DELTA_PAGE,
  DELTA_PIXEL,
  INPUT_REFERENCE,
  MAX_PITCH_RAD,
  MAX_WHEEL_STEP_PX,
  MAX_YAW_RAD,
  RESPONSE_EXPONENT_MAX,
  RESPONSE_EXPONENT_MIN,
  SIZE_RATIO_FLOOR,
  hoverAngle,
  normalizeWheelDelta,
  responseExponentFor,
  shapeHoverResponse,
  sizeRatioFor,
} from '@/lib/responsive/input-policy'

describe('policy constants', () => {
  it('pin the §A.5 tuning values', () => {
    expect(INPUT_REFERENCE).toEqual({ w: 1440, h: 900 })
    expect(SIZE_RATIO_FLOOR).toBe(0.45)
    expect(RESPONSE_EXPONENT_MIN).toBe(1.0)
    expect(RESPONSE_EXPONENT_MAX).toBe(1.7)
    expect(MAX_YAW_RAD).toBeCloseTo((22 * Math.PI) / 180, 12)
    expect(MAX_PITCH_RAD).toBeCloseTo((15 * Math.PI) / 180, 12)
    expect(DELTA_PIXEL).toBe(0)
    expect(DELTA_LINE).toBe(1)
    expect(DELTA_PAGE).toBe(2)
    expect(MAX_WHEEL_STEP_PX).toBe(240)
  })
})

describe('sizeRatioFor (accumulated-pan gain only — never hover)', () => {
  it('is exactly 1 at the reference viewport', () => {
    expect(sizeRatioFor({ w: 1440, h: 900 })).toBe(1)
  })

  it('is ≈0.6667 at 1024×600 (≈1.5× movement for the same pan)', () => {
    expect(sizeRatioFor({ w: 1024, h: 600 })).toBeCloseTo(0.6667, 3)
    expect(sizeRatioFor({ w: 1024, h: 600 })).toBeCloseTo(2 / 3, 6)
  })

  it('floors at 0.45 for 512×300 (≈2.2× movement)', () => {
    expect(sizeRatioFor({ w: 512, h: 300 })).toBe(0.45)
    // Even tinier viewports stay at the floor.
    expect(sizeRatioFor({ w: 100, h: 100 })).toBe(0.45)
  })

  it('never exceeds 1 on huge viewports', () => {
    for (const v of [
      { w: 3840, h: 2160 },
      { w: 5120, h: 2880 },
      { w: 10000, h: 10000 },
    ] as const) {
      expect(sizeRatioFor(v)).toBe(1)
      expect(sizeRatioFor(v)).toBeLessThanOrEqual(1)
    }
  })

  it('is limited by the SMALLER dimension ratio', () => {
    // Width at reference, height halved → height limits the ratio.
    expect(sizeRatioFor({ w: 1440, h: 450 })).toBe(0.5)
  })
})

describe('responseExponentFor', () => {
  it('is 1.0 (linear) at the reference viewport', () => {
    expect(responseExponentFor({ w: 1440, h: 900 })).toBe(1.0)
  })

  it('is 1.7 at the smallest supported ratio (512×300)', () => {
    expect(responseExponentFor({ w: 512, h: 300 })).toBe(1.7)
  })

  it('is strictly between 1 and 1.7 at 1024×600', () => {
    const e = responseExponentFor({ w: 1024, h: 600 })
    expect(e).toBeGreaterThan(1)
    expect(e).toBeLessThan(1.7)
  })

  it('is monotonic: smaller viewports give larger exponents', () => {
    const sizes: readonly ViewportSize[] = [
      { w: 1440, h: 900 },
      { w: 1280, h: 800 },
      { w: 1024, h: 600 },
      { w: 800, h: 450 },
      { w: 512, h: 300 },
    ]
    let previous = -Infinity
    for (const v of sizes) {
      const e = responseExponentFor(v)
      expect(e).toBeGreaterThanOrEqual(previous)
      previous = e
    }
    // And strictly increasing across the interior of the range.
    expect(responseExponentFor({ w: 1024, h: 600 })).toBeGreaterThan(
      responseExponentFor({ w: 1280, h: 800 }),
    )
  })
})

describe('shapeHoverResponse', () => {
  it('HOVER FULL-RANGE GUARD: |±1| stays ±1 for every exponent', () => {
    for (const e of [1, 1.42, 1.7]) {
      expect(shapeHoverResponse(1, e)).toBe(1)
      expect(shapeHoverResponse(-1, e)).toBe(-1)
    }
  })

  it('damps near-center response at higher exponents', () => {
    expect(Math.abs(shapeHoverResponse(0.5, 1.7))).toBeLessThan(
      Math.abs(shapeHoverResponse(0.5, 1.0)),
    )
  })

  it('preserves sign for negative inputs', () => {
    expect(shapeHoverResponse(-0.5, 1.7)).toBeLessThan(0)
    expect(shapeHoverResponse(-0.5, 1.7)).toBeCloseTo(-shapeHoverResponse(0.5, 1.7), 12)
  })

  it('clamps out-of-range input', () => {
    expect(shapeHoverResponse(2, 1)).toBe(1)
    expect(shapeHoverResponse(-2, 1)).toBe(-1)
  })

  it('maps 0 to 0', () => {
    expect(shapeHoverResponse(0, 1.7)).toBe(0)
  })
})

describe('hoverAngle', () => {
  // Primary §9.4 regression guard: the full ∓maxAngle envelope must be
  // reachable at the stage edge on EVERY supported viewport — the exponent
  // reshapes the curve, it never shrinks the range. A reference-dimension
  // divisor on hover would break exactly this.
  it('FULL-RANGE GUARD: stage edge reaches ∓maxAngle at every viewport-derived exponent', () => {
    const viewports: readonly ViewportSize[] = [
      { w: 3840, h: 2160 },
      { w: 1440, h: 900 },
      { w: 1024, h: 600 },
      { w: 800, h: 450 },
      { w: 512, h: 300 },
    ]
    for (const v of viewports) {
      const exponent = responseExponentFor(v)
      const halfW = v.w / 2
      const halfH = v.h / 2
      const centerX = halfW
      const centerY = halfH
      // Right/bottom edge → −max; left/top edge → +max (free-look sign).
      expect(hoverAngle(v.w, centerX, halfW, MAX_YAW_RAD, exponent)).toBeCloseTo(-MAX_YAW_RAD, 12)
      expect(hoverAngle(0, centerX, halfW, MAX_YAW_RAD, exponent)).toBeCloseTo(MAX_YAW_RAD, 12)
      expect(hoverAngle(v.h, centerY, halfH, MAX_PITCH_RAD, exponent)).toBeCloseTo(
        -MAX_PITCH_RAD,
        12,
      )
      expect(hoverAngle(0, centerY, halfH, MAX_PITCH_RAD, exponent)).toBeCloseTo(MAX_PITCH_RAD, 12)
    }
  })

  it('is 0 at the stage center', () => {
    expect(hoverAngle(720, 720, 720, MAX_YAW_RAD, 1.42)).toBeCloseTo(0, 12)
  })

  it('clamps pointers beyond the stage edge to the full envelope', () => {
    expect(hoverAngle(5000, 720, 720, MAX_YAW_RAD, 1.42)).toBeCloseTo(-MAX_YAW_RAD, 12)
    expect(hoverAngle(-5000, 720, 720, MAX_YAW_RAD, 1.42)).toBeCloseTo(MAX_YAW_RAD, 12)
  })

  it('returns 0 for a degenerate half-size', () => {
    expect(hoverAngle(100, 100, 0, MAX_YAW_RAD, 1)).toBe(0)
  })
})

describe('normalizeWheelDelta', () => {
  const ctx = { lineHeightPx: 16, pageSizePx: 600 }

  it('pixel mode passes deltas through', () => {
    expect(normalizeWheelDelta(100, DELTA_PIXEL, ctx)).toBe(100)
    expect(normalizeWheelDelta(-53.5, DELTA_PIXEL, ctx)).toBe(-53.5)
  })

  it('line mode multiplies by lineHeightPx', () => {
    expect(normalizeWheelDelta(3, DELTA_LINE, ctx)).toBe(48)
    expect(normalizeWheelDelta(-2, DELTA_LINE, ctx)).toBe(-32)
  })

  it('page mode multiplies by pageSizePx', () => {
    expect(normalizeWheelDelta(0.25, DELTA_PAGE, ctx)).toBe(150)
    expect(normalizeWheelDelta(-0.1, DELTA_PAGE, ctx)).toBeCloseTo(-60, 10)
  })

  it('clamps spikes at ±MAX_WHEEL_STEP_PX', () => {
    // Detented-mouse flick: 100 lines at 16px → 1600 → clamped to 240.
    expect(normalizeWheelDelta(100, DELTA_LINE, ctx)).toBe(240)
    expect(normalizeWheelDelta(-100, DELTA_LINE, ctx)).toBe(-240)
    expect(normalizeWheelDelta(1, DELTA_PAGE, ctx)).toBe(240)
    expect(normalizeWheelDelta(9999, DELTA_PIXEL, ctx)).toBe(240)
  })

  it('returns 0 for NaN and infinities', () => {
    expect(normalizeWheelDelta(NaN, DELTA_PIXEL, ctx)).toBe(0)
    expect(normalizeWheelDelta(Infinity, DELTA_PIXEL, ctx)).toBe(0)
    expect(normalizeWheelDelta(-Infinity, DELTA_LINE, ctx)).toBe(0)
  })

  it('treats unknown delta modes as pixels', () => {
    expect(normalizeWheelDelta(100, 42, ctx)).toBe(100)
    expect(normalizeWheelDelta(-7, 3, ctx)).toBe(-7)
  })
})
