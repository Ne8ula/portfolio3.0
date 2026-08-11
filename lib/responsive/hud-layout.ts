// Shared pure geometry and spacing policy for subject-attached cockpit HUD.
// The solver is deliberately not wired to live placement until Phases 6/7.

import type { Insets, Rect, Size } from '@/lib/responsive/geometry'
import {
  contains,
  insetRect,
  intersects,
  isFiniteRect,
  placeAbove,
  placeBelow,
  placeBeside,
} from '@/lib/responsive/geometry'

export type { Insets, Rect, Size } from '@/lib/responsive/geometry'
export {
  contains,
  insetRect,
  intersects,
  isFiniteRect,
  placeAbove,
  placeBelow,
  placeBeside,
  rectsAlmostEqual,
} from '@/lib/responsive/geometry'

export const HUD_EDGE_GUTTER = 16
export const HUD_SUBJECT_GAP = 14
export const HUD_COLLISION_GAP = 8
export const HUD_MIN_HIT_SIZE = 44
export const HUD_RECT_EPSILON = 0.25
export const HUD_RECT_GRACE_MS = 350
export const HUD_COMPACT_HYSTERESIS = 8

/** Minimum valid camera-fit safe frame in stage CSS pixels. */
export const MIN_FIT_FRAME_PX = { w: 160, h: 120 } as const satisfies Size

/** Focused-parallax allowance applied symmetrically inside solver NDC bounds. */
export const FIT_NDC_MARGIN = 0.04

export type FocusKind = 'monitor' | 'deck' | 'crate'

/** Camera-fit reservations in stage CSS px, applied after HUD_EDGE_GUTTER. */
export const FOCUS_CAMERA_RESERVATIONS = {
  monitor: { top: 56, right: 44, bottom: 16, left: 16 },
  deck: { top: 56, right: 60, bottom: 72, left: 60 },
  crate: { top: 56, right: 60, bottom: 148, left: 60 },
} as const satisfies Readonly<Record<FocusKind, Insets>>

/** Per-kind binary-search brackets in world units. */
export const FOCUS_CAMERA_DISTANCE_BOUNDS = {
  monitor: { min: 1, max: 40 },
  deck: { min: 2, max: 60 },
  crate: { min: 1.5, max: 60 },
} as const satisfies Readonly<
  Record<FocusKind, { readonly min: number; readonly max: number }>
>

/** Cold-start distance used only until a kind has produced a valid solve. */
export const FOCUS_FALLBACK_DISTANCE = {
  monitor: 1.7,
  deck: 3.8,
  crate: 3,
} as const satisfies Readonly<Record<FocusKind, number>>

export const ZERO_INSETS = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
} as const satisfies Insets

const EDGE_INSETS = {
  top: HUD_EDGE_GUTTER,
  right: HUD_EDGE_GUTTER,
  bottom: HUD_EDGE_GUTTER,
  left: HUD_EDGE_GUTTER,
} as const satisfies Insets

export type FocusHudInput = {
  readonly kind: 'deck' | 'crate'
  readonly stage: Rect
  readonly safeFrame: Rect
  readonly subject: Rect
  readonly chrome: readonly Rect[]
  readonly sizes: {
    readonly hint: Size
    readonly hintCompact: Size
    readonly arrow: Size
    readonly info?: Size
  }
  readonly previousCompact: boolean
}

export type FocusHudPlacedLayout = {
  readonly status: 'placed'
  readonly hint: Rect | null
  readonly previous: Rect
  readonly next: Rect
  readonly info?: Rect
  readonly compact: boolean
}

export type FocusHudUnsatisfiableLayout = {
  readonly status: 'unsatisfiable'
  readonly failed: 'info' | 'arrows'
}

export type FocusHudLayout = FocusHudPlacedLayout | FocusHudUnsatisfiableLayout

/** Edge gutter first, then caller-owned reservations. */
export function computeSafeFrame(
  stage: Rect,
  reservations: Insets = ZERO_INSETS,
): Rect {
  return insetRect(insetRect(stage, EDGE_INSETS), reservations)
}

function positiveRect(rect: Rect): boolean {
  return isFiniteRect(rect) && rect.w > 0 && rect.h > 0
}

function positiveSize(size: Size): boolean {
  return Number.isFinite(size.w) && size.w > 0 && Number.isFinite(size.h) && size.h > 0
}

function nonNegativeSize(size: Size): boolean {
  return (
    Number.isFinite(size.w) &&
    size.w >= 0 &&
    Number.isFinite(size.h) &&
    size.h >= 0
  )
}

function compareRects(a: Rect, b: Rect): number {
  return a.y - b.y || a.x - b.x || a.w - b.w || a.h - b.h
}

function canonicalRects(rects: readonly Rect[]): Rect[] {
  return [...rects].sort(compareRects)
}

function candidateIsLegal(
  candidate: Rect,
  safeFrame: Rect,
  subject: Rect,
  obstacles: readonly Rect[],
  obstacleGap = HUD_COLLISION_GAP,
): boolean {
  return (
    positiveRect(candidate) &&
    contains(safeFrame, candidate) &&
    !intersects(candidate, subject, HUD_SUBJECT_GAP) &&
    obstacles.every((obstacle) => !intersects(candidate, obstacle, obstacleGap))
  )
}

function expanded(rect: Rect, gap: number): Rect {
  return {
    x: rect.x - gap,
    y: rect.y - gap,
    w: rect.w + gap * 2,
    h: rect.h + gap * 2,
  }
}

function uniqueSorted(values: readonly number[]): number[] {
  return [...new Set(values.filter(Number.isFinite))].sort((a, b) => a - b)
}

function candidateYValues(
  safeFrame: Rect,
  height: number,
  blockers: readonly Rect[],
): number[] {
  const values = [safeFrame.y, safeFrame.y + safeFrame.h - height]

  for (const blocker of blockers) {
    values.push(blocker.y - height, blocker.y + blocker.h)
  }

  return uniqueSorted(values).filter(
    (y) => y >= safeFrame.y && y + height <= safeFrame.y + safeFrame.h,
  )
}

type HorizontalSpan = {
  readonly x: number
  readonly w: number
}

function freeHorizontalSpans(
  safeFrame: Rect,
  y: number,
  height: number,
  blockers: readonly Rect[],
): HorizontalSpan[] {
  const safeRight = safeFrame.x + safeFrame.w
  const intervals = blockers
    .filter((blocker) => y < blocker.y + blocker.h && blocker.y < y + height)
    .map((blocker) => ({
      start: Math.max(safeFrame.x, blocker.x),
      end: Math.min(safeRight, blocker.x + blocker.w),
    }))
    .filter((interval) => interval.end > interval.start)
    .sort((a, b) => a.start - b.start || a.end - b.end)

  const spans: HorizontalSpan[] = []
  let cursor = safeFrame.x

  for (const interval of intervals) {
    if (interval.start > cursor) {
      spans.push({ x: cursor, w: interval.start - cursor })
    }
    cursor = Math.max(cursor, interval.end)
  }

  if (cursor < safeRight) {
    spans.push({ x: cursor, w: safeRight - cursor })
  }

  return spans
}

function resolveInfo(
  size: Size,
  safeFrame: Rect,
  subject: Rect,
  chrome: readonly Rect[],
): Rect | null {
  if (!positiveSize(size) || safeFrame.w <= 0) return null

  const fittedSize = { w: Math.min(size.w, safeFrame.w), h: size.h }
  const fixedCandidates = [
    placeBelow(subject, fittedSize, HUD_SUBJECT_GAP),
    placeAbove(subject, fittedSize, HUD_SUBJECT_GAP),
  ]

  for (const candidate of fixedCandidates) {
    if (candidateIsLegal(candidate, safeFrame, subject, chrome)) return candidate
  }

  const blockers = [
    ...chrome.map((rect) => expanded(rect, HUD_COLLISION_GAP)),
    expanded(subject, HUD_SUBJECT_GAP),
  ]
  const stripCandidates: Array<{
    readonly rect: Rect
    readonly stripWidth: number
  }> = []

  for (const y of candidateYValues(safeFrame, fittedSize.h, blockers)) {
    for (const span of freeHorizontalSpans(safeFrame, y, fittedSize.h, blockers)) {
      if (span.w < fittedSize.w) continue
      stripCandidates.push({
        rect: { x: span.x, y, w: fittedSize.w, h: fittedSize.h },
        stripWidth: span.w,
      })
    }
  }

  stripCandidates.sort(
    (a, b) =>
      b.stripWidth - a.stripWidth ||
      a.rect.y - b.rect.y ||
      a.rect.x - b.rect.x,
  )

  for (const candidate of stripCandidates) {
    if (candidateIsLegal(candidate.rect, safeFrame, subject, chrome)) {
      return candidate.rect
    }
  }

  return null
}

type ArrowPair = {
  readonly previous: Rect
  readonly next: Rect
}

function arrowPairIsLegal(
  pair: ArrowPair,
  safeFrame: Rect,
  subject: Rect,
  obstacles: readonly Rect[],
): boolean {
  return (
    candidateIsLegal(pair.previous, safeFrame, subject, obstacles) &&
    candidateIsLegal(pair.next, safeFrame, subject, obstacles) &&
    !intersects(pair.previous, pair.next, HUD_COLLISION_GAP)
  )
}

function splitRail(rect: Rect, arrowSize: Size): ArrowPair {
  return {
    previous: { x: rect.x, y: rect.y, w: arrowSize.w, h: arrowSize.h },
    next: {
      x: rect.x + arrowSize.w + HUD_COLLISION_GAP,
      y: rect.y,
      w: arrowSize.w,
      h: arrowSize.h,
    },
  }
}

function railDistance(rect: Rect, subject: Rect): number {
  if (rect.y + rect.h <= subject.y) return subject.y - (rect.y + rect.h)
  if (rect.y >= subject.y + subject.h) return rect.y - (subject.y + subject.h)
  return 0
}

function resolveArrowRail(
  arrowSize: Size,
  safeFrame: Rect,
  subject: Rect,
  obstacles: readonly Rect[],
): ArrowPair | null {
  const railSize = {
    w: arrowSize.w * 2 + HUD_COLLISION_GAP,
    h: arrowSize.h,
  }
  const railX = subject.x + subject.w / 2 - railSize.w / 2
  const blockers = [
    ...obstacles.map((rect) => expanded(rect, HUD_COLLISION_GAP)),
    expanded(subject, HUD_SUBJECT_GAP),
  ]
  const candidates = candidateYValues(safeFrame, railSize.h, blockers)
    .map((y) => ({ x: railX, y, ...railSize }))
    .filter(
      (rect) =>
        rect.y + rect.h <= subject.y - HUD_SUBJECT_GAP ||
        rect.y >= subject.y + subject.h + HUD_SUBJECT_GAP,
    )
    .sort(
      (a, b) =>
        railDistance(a, subject) - railDistance(b, subject) ||
        a.y - b.y ||
        a.x - b.x,
    )

  for (const candidate of candidates) {
    const pair = splitRail(candidate, arrowSize)
    if (arrowPairIsLegal(pair, safeFrame, subject, obstacles)) return pair
  }

  return null
}

function resolveStageEdgeArrows(
  arrowSize: Size,
  safeFrame: Rect,
  subject: Rect,
  obstacles: readonly Rect[],
): ArrowPair | null {
  const centeredY = subject.y + subject.h / 2 - arrowSize.h / 2
  const blockers = obstacles.map((rect) => expanded(rect, HUD_COLLISION_GAP))
  const yValues = uniqueSorted([
    centeredY,
    ...candidateYValues(safeFrame, arrowSize.h, blockers),
  ]).sort(
    (a, b) =>
      Math.abs(a - centeredY) - Math.abs(b - centeredY) ||
      a - b,
  )

  for (const y of yValues) {
    const pair = {
      previous: {
        x: safeFrame.x,
        y,
        w: arrowSize.w,
        h: arrowSize.h,
      },
      next: {
        x: safeFrame.x + safeFrame.w - arrowSize.w,
        y,
        w: arrowSize.w,
        h: arrowSize.h,
      },
    }

    if (arrowPairIsLegal(pair, safeFrame, subject, obstacles)) return pair
  }

  return null
}

function resolveArrows(
  measuredSize: Size,
  safeFrame: Rect,
  subject: Rect,
  obstacles: readonly Rect[],
): ArrowPair | null {
  if (!nonNegativeSize(measuredSize)) return null

  const arrowSize = {
    w: Math.max(HUD_MIN_HIT_SIZE, measuredSize.w),
    h: Math.max(HUD_MIN_HIT_SIZE, measuredSize.h),
  }
  const beside = {
    previous: placeBeside(subject, arrowSize, 'left', HUD_SUBJECT_GAP),
    next: placeBeside(subject, arrowSize, 'right', HUD_SUBJECT_GAP),
  }
  if (arrowPairIsLegal(beside, safeFrame, subject, obstacles)) return beside

  const rail = resolveArrowRail(arrowSize, safeFrame, subject, obstacles)
  if (rail !== null) return rail

  return resolveStageEdgeArrows(arrowSize, safeFrame, subject, obstacles)
}

function firstLegalHint(
  candidates: readonly Rect[],
  safeFrame: Rect,
  subject: Rect,
  obstacles: readonly Rect[],
  obstacleGap: number,
): Rect | null {
  for (const candidate of candidates) {
    if (candidateIsLegal(candidate, safeFrame, subject, obstacles, obstacleGap)) {
      return candidate
    }
  }
  return null
}

function resolveHint(
  input: FocusHudInput,
  obstacles: readonly Rect[],
): { readonly hint: Rect | null; readonly compact: boolean } {
  if (!positiveSize(input.sizes.hint)) {
    return { hint: null, compact: true }
  }

  const fullCandidates = [
    placeAbove(input.subject, input.sizes.hint, HUD_SUBJECT_GAP),
    placeBelow(input.subject, input.sizes.hint, HUD_SUBJECT_GAP),
  ]
  const fullObstacleGap = input.previousCompact
    ? HUD_COLLISION_GAP + HUD_COMPACT_HYSTERESIS
    : HUD_COLLISION_GAP
  const fullHint = firstLegalHint(
    fullCandidates,
    input.safeFrame,
    input.subject,
    obstacles,
    fullObstacleGap,
  )

  if (fullHint !== null) {
    return { hint: fullHint, compact: false }
  }

  if (!positiveSize(input.sizes.hintCompact)) {
    return { hint: null, compact: true }
  }

  const compactX =
    input.safeFrame.x + input.safeFrame.w / 2 - input.sizes.hintCompact.w / 2
  const compactCandidates = [
    {
      x: compactX,
      y: input.safeFrame.y,
      w: input.sizes.hintCompact.w,
      h: input.sizes.hintCompact.h,
    },
    {
      x: compactX,
      y:
        input.safeFrame.y +
        input.safeFrame.h -
        input.sizes.hintCompact.h,
      w: input.sizes.hintCompact.w,
      h: input.sizes.hintCompact.h,
    },
  ]
  const compactHint = firstLegalHint(
    compactCandidates,
    input.safeFrame,
    input.subject,
    obstacles,
    HUD_COLLISION_GAP,
  )

  return { hint: compactHint, compact: true }
}

/**
 * Deterministic chrome → info → balanced arrows → hint collision solver.
 * Hint is the only optional failure; mandatory failures are explicit.
 */
export function resolveFocusHudLayout(input: FocusHudInput): FocusHudLayout {
  const chrome = canonicalRects(input.chrome)
  const baseGeometryIsValid =
    positiveRect(input.stage) &&
    positiveRect(input.safeFrame) &&
    contains(input.stage, input.safeFrame) &&
    positiveRect(input.subject) &&
    chrome.every(positiveRect)

  if (!baseGeometryIsValid) {
    return { status: 'unsatisfiable', failed: input.sizes.info === undefined ? 'arrows' : 'info' }
  }

  let info: Rect | undefined
  if (input.sizes.info !== undefined) {
    info = resolveInfo(input.sizes.info, input.safeFrame, input.subject, chrome) ?? undefined
    if (info === undefined) {
      return { status: 'unsatisfiable', failed: 'info' }
    }
  }

  const arrowObstacles = info === undefined ? chrome : canonicalRects([...chrome, info])
  const arrows = resolveArrows(
    input.sizes.arrow,
    input.safeFrame,
    input.subject,
    arrowObstacles,
  )
  if (arrows === null) {
    return { status: 'unsatisfiable', failed: 'arrows' }
  }

  const hintObstacles = canonicalRects([
    ...arrowObstacles,
    arrows.previous,
    arrows.next,
  ])
  const hint = resolveHint(input, hintObstacles)
  const placed = {
    status: 'placed',
    hint: hint.hint,
    previous: arrows.previous,
    next: arrows.next,
    compact: hint.compact,
  } as const

  return info === undefined ? placed : { ...placed, info }
}
