// Input and pan-speed policy (§A.5). ONE module owns every tuning value so
// future scenes inherit the policy; nothing here may be selected through
// user-agent sniffing.
//
// Two behaviors, two DIFFERENT mechanisms — do not merge them:
//
//   1. Hover free-look: normalized against the LIVE viewport, reshaped by
//      `responseExponent`. Full ±22°/±15° range is reachable at the stage
//      edge on EVERY supported viewport (1**e === 1); smaller viewports
//      only damp response near center. Applying a reference-dimension
//      divisor to hover is the regression §9.4 guards against.
//
//   2. Contained-stage panning: accumulated drag/trackpad/wheel/keyboard
//      input has no reach ceiling, so it is scaled by `sizeRatio` — a
//      smaller viewport legitimately requires MORE movement for the same
//      logical pan.

import type { ViewportSize } from '@/lib/responsive/layout-contract'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

// ── Shared reference ──────────────────────────────────────────────────────

export const INPUT_REFERENCE: ViewportSize = { w: 1440, h: 900 }

// ── Hover free-look ───────────────────────────────────────────────────────

export const MAX_YAW_RAD = (22 * Math.PI) / 180
export const MAX_PITCH_RAD = (15 * Math.PI) / 180

/** Exponent bounds: 1.0 at the reference size (linear response) rising
 *  toward 1.7 at the smallest supported ratio. Starting curve per §A.5 —
 *  tuned only from the §9.4 traces, and NEVER used to reduce reachable
 *  range. */
export const RESPONSE_EXPONENT_MIN = 1.0
export const RESPONSE_EXPONENT_MAX = 1.7

/**
 * Response exponent for a live viewport. Linear in the limiting
 * viewport-to-reference ratio: 1.0 at (or above) the reference,
 * RESPONSE_EXPONENT_MAX at the SIZE_RATIO_FLOOR.
 * `1024×600` → ≈1.42; `512×300` → 1.7.
 */
export function responseExponentFor(viewport: ViewportSize): number {
  const ratio = clamp(
    Math.min(viewport.w / INPUT_REFERENCE.w, viewport.h / INPUT_REFERENCE.h),
    SIZE_RATIO_FLOOR,
    1,
  )
  const t = (1 - ratio) / (1 - SIZE_RATIO_FLOOR)
  return RESPONSE_EXPONENT_MIN + (RESPONSE_EXPONENT_MAX - RESPONSE_EXPONENT_MIN) * t
}

/**
 * Shape a normalized pointer offset (−1…1) through the response exponent.
 * Sign-preserving; |±1| stays ±1 so the full envelope survives.
 */
export function shapeHoverResponse(normalized: number, exponent: number): number {
  const n = clamp(normalized, -1, 1)
  return Math.sign(n) * Math.pow(Math.abs(n), exponent)
}

/**
 * Hover angle for one axis: pointer position → bounded camera angle.
 * `pointer` and `center` in stage CSS pixels; `halfSize` is half the live
 * stage dimension for that axis. Returns `-shaped * maxAngle` (matching
 * the current free-look sign convention).
 */
export function hoverAngle(
  pointer: number,
  center: number,
  halfSize: number,
  maxAngle: number,
  exponent: number,
): number {
  if (!(halfSize > 0)) return 0
  const normalized = clamp((pointer - center) / halfSize, -1, 1)
  return -shapeHoverResponse(normalized, exponent) * maxAngle
}

// ── Contained-stage panning ───────────────────────────────────────────────

export const SIZE_RATIO_FLOOR = 0.45

/**
 * Accumulated-pan gain (§A.5): applied ONLY to drag/trackpad/wheel/keyboard
 * panning, never to hover. `1024×600` → ≈0.67 (≈1.5× movement for equal
 * pan); `512×300` → 0.45 floor (≈2.2×).
 */
export function sizeRatioFor(viewport: ViewportSize): number {
  return clamp(
    Math.min(viewport.w / INPUT_REFERENCE.w, viewport.h / INPUT_REFERENCE.h),
    SIZE_RATIO_FLOOR,
    1,
  )
}

// ── Wheel normalization ───────────────────────────────────────────────────

/** WheelEvent.deltaMode values (DOM constants, restated for tests). */
export const DELTA_PIXEL = 0
export const DELTA_LINE = 1
export const DELTA_PAGE = 2

/** Spike clamp: one wheel event may contribute at most this many logical
 *  pixels, so detented-mouse flicks and inertial spikes stay bounded while
 *  fine trackpad deltas pass through untouched. */
export const MAX_WHEEL_STEP_PX = 240

export type WheelContext = {
  /** Computed line height in CSS pixels (for DOM_DELTA_LINE). */
  readonly lineHeightPx: number
  /** Contained-viewport dimension along the scroll axis (DOM_DELTA_PAGE). */
  readonly pageSizePx: number
}

/**
 * Normalize a wheel delta to logical CSS pixels across delta modes
 * (§A.5): pixels stay pixels, lines convert through the computed line
 * height, pages through the contained viewport dimension. Unknown modes
 * are treated as pixels. The result is spike-clamped symmetrically.
 */
export function normalizeWheelDelta(
  delta: number,
  deltaMode: number,
  context: WheelContext,
): number {
  if (!Number.isFinite(delta)) return 0
  let px = delta
  if (deltaMode === DELTA_LINE) px = delta * context.lineHeightPx
  else if (deltaMode === DELTA_PAGE) px = delta * context.pageSizePx
  return clamp(px, -MAX_WHEEL_STEP_PX, MAX_WHEEL_STEP_PX)
}
