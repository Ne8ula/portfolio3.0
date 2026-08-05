// Renderer sizing policy (Phase 3). CSS geometry stays in unrounded CSS
// pixels; DPR affects only the drawing buffer and is capped by one shared
// policy value.

/**
 * Owner-certified Phase 3 decision (2026-08-02): retain DPR_CAP = 2.
 *
 * The decision-eligible 1512×982 hardware production capture recorded:
 *
 * | view  | DPR 1 median / p95 | DPR 2 median / p95 |
 * |-------|--------------------|--------------------|
 * | crate | 8.3 / 8.7 ms       | 15.8 / 17.3 ms     |
 * | deck  | 8.3 / 16.6 ms      | 16.6 / 17.4 ms     |
 *
 * Both DPR 2 views meet the approved ≤16.7 ms median / ≤33.3 ms p95
 * threshold. Evidence:
 * docs/baselines/phase-3-dpr/owner-hardware-2026-08-02-r2.json and
 * docs/baselines/phase-3-dpr/OWNER-CHECKPOINT-2026-08-02.md.
 * SwiftShader measurements are decision-ineligible. Amend this value only
 * through the owner-approved measurement protocol in
 * docs/phase-3-design.md §5.
 */
export const DPR_CAP = 2

export type RenderSizeInput = {
  readonly cssWidth: number
  readonly cssHeight: number
  readonly devicePixelRatio: number
}

export type RenderSizeTarget = {
  readonly cssWidth: number
  readonly cssHeight: number
  readonly dpr: number
  readonly bufferWidth: number
  readonly bufferHeight: number
}

function validPositiveOr(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback
}

/**
 * Convert a measured mount box and device scale into the one render target
 * shared by every WebGL renderer.
 */
export function computeRenderSizeTarget(
  input: RenderSizeInput,
  cap: number = DPR_CAP,
): RenderSizeTarget | null {
  if (
    !Number.isFinite(input.cssWidth) ||
    input.cssWidth <= 0 ||
    !Number.isFinite(input.cssHeight) ||
    input.cssHeight <= 0
  ) {
    return null
  }

  const guardedCap = validPositiveOr(cap, DPR_CAP)
  const guardedDpr = validPositiveOr(input.devicePixelRatio, 1)
  const dpr = Math.min(guardedDpr, guardedCap)

  return {
    cssWidth: input.cssWidth,
    cssHeight: input.cssHeight,
    dpr,
    bufferWidth: Math.max(1, Math.floor(input.cssWidth * dpr)),
    bufferHeight: Math.max(1, Math.floor(input.cssHeight * dpr)),
  }
}

/** Exact equality is the per-renderer controller's idempotence gate. */
export function renderSizeTargetsEqual(
  a: RenderSizeTarget | null,
  b: RenderSizeTarget | null,
): boolean {
  if (a === b) return true
  if (a === null || b === null) return false

  return (
    a.cssWidth === b.cssWidth &&
    a.cssHeight === b.cssHeight &&
    a.dpr === b.dpr &&
    a.bufferWidth === b.bufferWidth &&
    a.bufferHeight === b.bufferHeight
  )
}
