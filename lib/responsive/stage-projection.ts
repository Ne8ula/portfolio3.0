// Pure stage-relative projection policy for the focused cockpit HUD.
// three.js owns world/view/NDC transforms; this strict-island module accepts
// plain numeric samples and converts them to unrounded stage-local CSS pixels.

import type { Rect } from '@/lib/responsive/geometry'
import { intersects, isFiniteRect } from '@/lib/responsive/geometry'

export type ProjectedPoint = {
  readonly x: number
  readonly y: number
}

export type ProjectedRect = Rect & {
  readonly visible: boolean
  readonly sourceFrameId: number
}

export type ProjectedQuad = {
  readonly corners: {
    readonly tl: ProjectedPoint
    readonly tr: ProjectedPoint
    readonly bl: ProjectedPoint
    readonly br: ProjectedPoint
  }
  readonly bounds: Rect
  readonly visible: boolean
  readonly sourceFrameId: number
}

/** A point already transformed by the caller's current camera matrices. */
export type ProjectionSample = {
  readonly ndcX: number
  readonly ndcY: number
  readonly ndcZ: number
  readonly viewZ: number
}

export type ProjectionQuadSamples = {
  readonly tl: ProjectionSample
  readonly tr: ProjectionSample
  readonly bl: ProjectionSample
  readonly br: ProjectionSample
}

/**
 * Same-frame viewport measurements and camera policy needed for conversion.
 * `stageRect` and `canvasRect` are getBoundingClientRect-compatible rects;
 * clientLeft/clientTop move the origin from the stage border box to its
 * padding box.
 */
export type StageProjectionContext = {
  readonly canvasRect: Rect
  readonly stageRect: Rect
  readonly stageClientLeft: number
  readonly stageClientTop: number
  readonly cameraNear: number
  readonly sourceFrameId: number
}

function hasValidContext(context: StageProjectionContext): boolean {
  return (
    isFiniteRect(context.canvasRect) &&
    context.canvasRect.w > 0 &&
    context.canvasRect.h > 0 &&
    isFiniteRect(context.stageRect) &&
    context.stageRect.w > 0 &&
    context.stageRect.h > 0 &&
    Number.isFinite(context.stageClientLeft) &&
    Number.isFinite(context.stageClientTop) &&
    Number.isFinite(context.cameraNear) &&
    context.cameraNear > 0 &&
    Number.isFinite(context.sourceFrameId) &&
    context.sourceFrameId >= 0
  )
}

/** Pin the shared near/far/finiteness validity rule for one projected point. */
export function isValidProjectionSample(
  sample: ProjectionSample,
  cameraNear: number,
): boolean {
  return (
    Number.isFinite(cameraNear) &&
    cameraNear > 0 &&
    Number.isFinite(sample.ndcX) &&
    Number.isFinite(sample.ndcY) &&
    Number.isFinite(sample.ndcZ) &&
    Number.isFinite(sample.viewZ) &&
    sample.viewZ < -cameraNear &&
    sample.ndcZ <= 1
  )
}

function convertValidSample(
  sample: ProjectionSample,
  context: StageProjectionContext,
): ProjectedPoint {
  const stageOriginX = context.stageRect.x + context.stageClientLeft
  const stageOriginY = context.stageRect.y + context.stageClientTop

  return {
    x:
      context.canvasRect.x -
      stageOriginX +
      (sample.ndcX * 0.5 + 0.5) * context.canvasRect.w,
    y:
      context.canvasRect.y -
      stageOriginY +
      (-sample.ndcY * 0.5 + 0.5) * context.canvasRect.h,
  }
}

/**
 * Convert one valid NDC sample into the stage padding-box coordinate space.
 * Off-stage points remain raw; only invalid clip/measurement data is null.
 */
export function projectPointToStage(
  sample: ProjectionSample,
  context: StageProjectionContext,
): ProjectedPoint | null {
  if (!hasValidContext(context) || !isValidProjectionSample(sample, context.cameraNear)) {
    return null
  }

  const point = convertValidSample(sample, context)
  return Number.isFinite(point.x) && Number.isFinite(point.y) ? point : null
}

function boundsOf(points: readonly ProjectedPoint[]): Rect | null {
  if (points.length === 0) return null

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }

  const bounds = { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
  return isFiniteRect(bounds) && bounds.w > 0 && bounds.h > 0 ? bounds : null
}

function stageBounds(context: StageProjectionContext): Rect {
  return { x: 0, y: 0, w: context.stageRect.w, h: context.stageRect.h }
}

/** Project an arbitrary defining-point set into one raw, unclamped rect. */
export function projectRectToStage(
  samples: readonly ProjectionSample[],
  context: StageProjectionContext,
): ProjectedRect | null {
  if (!hasValidContext(context) || samples.length === 0) return null

  const points: ProjectedPoint[] = []
  for (const sample of samples) {
    if (!isValidProjectionSample(sample, context.cameraNear)) return null
    points.push(convertValidSample(sample, context))
  }

  const bounds = boundsOf(points)
  if (bounds === null) return null

  return {
    ...bounds,
    visible: intersects(bounds, stageBounds(context)),
    sourceFrameId: context.sourceFrameId,
  }
}

/** Project the monitor's four authored corners and retain their orientation. */
export function projectQuadToStage(
  samples: ProjectionQuadSamples,
  context: StageProjectionContext,
): ProjectedQuad | null {
  if (!hasValidContext(context)) return null

  const entries = [
    ['tl', samples.tl],
    ['tr', samples.tr],
    ['bl', samples.bl],
    ['br', samples.br],
  ] as const
  const corners: Partial<Record<(typeof entries)[number][0], ProjectedPoint>> = {}

  for (const [key, sample] of entries) {
    if (!isValidProjectionSample(sample, context.cameraNear)) return null
    const point = convertValidSample(sample, context)
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null
    corners[key] = point
  }

  const tl = corners.tl
  const tr = corners.tr
  const bl = corners.bl
  const br = corners.br
  if (tl === undefined || tr === undefined || bl === undefined || br === undefined) {
    return null
  }

  const bounds = boundsOf([tl, tr, bl, br])
  if (bounds === null) return null

  return {
    corners: { tl, tr, bl, br },
    bounds,
    visible: intersects(bounds, stageBounds(context)),
    sourceFrameId: context.sourceFrameId,
  }
}
