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

export function resolveE2eTiming(ci = process.env.CI): E2eTimingPolicy {
  return ci ? CI_E2E_TIMING : LOCAL_E2E_TIMING
}

export function ciTimeout(
  localMs: number,
  ciMs: number,
  ci = process.env.CI,
): number {
  return ci ? ciMs : localMs
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
