// Renderer sizing policy (Phase 3). CSS geometry stays in unrounded CSS
// pixels; DPR affects only the drawing buffer and is capped by one shared
// policy value.

/** Retained pending the owner-certified Phase 3 DPR performance baseline. */
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
