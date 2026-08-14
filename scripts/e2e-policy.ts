export type E2eTimingPolicy = {
  readonly expect: number
  readonly transition: number
  readonly settle: number
  readonly frameObservation: number
  readonly test: number
}

export const LOCAL_E2E_TIMING: E2eTimingPolicy = {
  expect: 15_000,
  transition: 30_000,
  settle: 15_000,
  frameObservation: 120_000,
  test: 90_000,
}

export const CI_E2E_TIMING: E2eTimingPolicy = {
  expect: 60_000,
  transition: 120_000,
  settle: 120_000,
  frameObservation: 420_000,
  test: 600_000,
}

function ciTimingScale(value = process.env.CI_E2E_TIMING_SCALE): number {
  const parsed = Number(value ?? 1)
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 2 ? parsed : 1
}

export function resolveE2eTiming(
  ci = process.env.CI,
  scale = process.env.CI_E2E_TIMING_SCALE,
): E2eTimingPolicy {
  if (!ci) return LOCAL_E2E_TIMING
  const multiplier = ciTimingScale(scale)
  if (multiplier === 1) return CI_E2E_TIMING
  return {
    expect: Math.round(CI_E2E_TIMING.expect * multiplier),
    transition: Math.round(CI_E2E_TIMING.transition * multiplier),
    // configureSettleTimeout() intentionally enforces a 120s ceiling. This
    // inner runtime deadline must remain within that contract; only outer
    // Playwright observation and test budgets scale on slow CI hosts.
    settle: CI_E2E_TIMING.settle,
    frameObservation: Math.round(CI_E2E_TIMING.frameObservation * multiplier),
    test: Math.round(CI_E2E_TIMING.test * multiplier),
  }
}

export function ciTimeout(
  localMs: number,
  ciMs: number,
  ci = process.env.CI,
  scale = process.env.CI_E2E_TIMING_SCALE,
): number {
  return ci ? Math.round(ciMs * ciTimingScale(scale)) : localMs
}

export type E2eRect = {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

export type CenteredTextOverlayDeltas = {
  readonly centerX: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export const CENTERED_TEXT_OVERLAY_WIDTH_TOLERANCES = {
  'object-tag': 8,
  'vinyl-info-card': 10.78125,
  'browse-hint': 13.59375,
} as const

export function centeredTextOverlayWidthTolerance(
  overlayName: string,
): number | null {
  if (overlayName in CENTERED_TEXT_OVERLAY_WIDTH_TOLERANCES) {
    return CENTERED_TEXT_OVERLAY_WIDTH_TOLERANCES[
      overlayName as keyof typeof CENTERED_TEXT_OVERLAY_WIDTH_TOLERANCES
    ]
  }
  return null
}

export function measureCenteredTextOverlayDeltas(
  actual: E2eRect,
  expected: E2eRect,
): CenteredTextOverlayDeltas {
  return {
    centerX: Math.abs(actual.x + actual.w / 2 - (expected.x + expected.w / 2)),
    y: Math.abs(actual.y - expected.y),
    width: Math.abs(actual.w - expected.w),
    height: Math.abs(actual.h - expected.h),
  }
}

export function centeredTextOverlayMatches(
  actual: E2eRect,
  expected: E2eRect,
  positionTolerance: number = 1,
  widthTolerance: number =
    CENTERED_TEXT_OVERLAY_WIDTH_TOLERANCES['object-tag'],
): boolean {
  const deltas = measureCenteredTextOverlayDeltas(actual, expected)
  return (
    deltas.centerX <= positionTolerance &&
    deltas.y <= positionTolerance &&
    deltas.width <= widthTolerance &&
    deltas.height <= positionTolerance
  )
}
