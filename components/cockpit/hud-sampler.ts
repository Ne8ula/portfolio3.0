// @ts-nocheck
// One production-owned focused-HUD sampler (Phase 4 design §3).
//
// The render loop supplies plain camera-projection samples after finalizing
// the frame's camera. This module owns stage conversion, the monotonic frame
// counter, deck-only retained-card grace, epsilon-gated publication, and the
// stable external-store reference consumed by React.

import { useSyncExternalStore } from 'react'

import {
  computeSafeFrame,
  HUD_RECT_EPSILON,
  HUD_RECT_GRACE_MS,
  rectsAlmostEqual,
} from '@/lib/responsive/hud-layout'
import {
  projectPointToStage,
  projectQuadToStage,
  projectRectToStage,
} from '@/lib/responsive/stage-projection'

export type HudMode = 'cockpit' | 'monitor' | 'crate' | 'deck'

export type HudPoint = {
  readonly x: number
  readonly y: number
}

export type HudRect = {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

export type HudProjectionSample = {
  readonly ndcX: number
  readonly ndcY: number
  readonly ndcZ: number
  readonly viewZ: number
}

export type HudProjectedRect = HudRect & {
  readonly visible: boolean
  readonly sourceFrameId: number
}

export type HudProjectedQuad = {
  readonly corners: {
    readonly tl: HudPoint
    readonly tr: HudPoint
    readonly bl: HudPoint
    readonly br: HudPoint
  }
  readonly bounds: HudRect
  readonly visible: boolean
  readonly sourceFrameId: number
}

export type HudDeckInfo = {
  readonly index: number
  readonly count: number
  readonly busy: boolean
}

export type HudCrateSelection = {
  readonly index: number
  readonly count: number
  readonly anchor: HudPoint | null
  readonly title: string
  readonly category: string
  readonly date: string
}

export type HudFrameSnapshot = {
  readonly frameId: number
  readonly stage: HudRect
  readonly canvasOffset: HudPoint
  readonly mode: HudMode
  readonly safeFrame: HudRect
  readonly monitor: HudProjectedQuad | null
  readonly deck: {
    readonly info: HudDeckInfo | null
    readonly card: (HudProjectedRect & { readonly retained: boolean }) | null
  }
  readonly crate: {
    readonly rect: HudProjectedRect | null
    readonly selection: HudCrateSelection | null
  }
  readonly pc: HudProjectedRect | null
  readonly anchors: ReadonlyArray<{ readonly id: string; readonly x: number; readonly y: number }> | null
  readonly hoveredTag: string | null
}

export type HudSamplerComputeInput = {
  readonly frameId: number
  readonly sizeVersion: number
  readonly nowMs: number
  readonly mode: HudMode
  readonly stageRect: HudRect
  readonly stageClientLeft: number
  readonly stageClientTop: number
  readonly canvasRect: HudRect
  readonly cameraNear: number
  readonly monitorSamples: {
    readonly tl: HudProjectionSample
    readonly tr: HudProjectionSample
    readonly bl: HudProjectionSample
    readonly br: HudProjectionSample
  } | null
  readonly deck: {
    readonly info: HudDeckInfo | null
    readonly cardSamples: readonly HudProjectionSample[] | null
  }
  readonly crate: {
    readonly rectSamples: readonly HudProjectionSample[] | null
    readonly selection: {
      readonly index: number
      readonly count: number
      readonly anchorSample: HudProjectionSample | null
      readonly title: string
      readonly category: string
      readonly date: string
    } | null
  }
  readonly pcSamples: readonly HudProjectionSample[] | null
  readonly anchors: ReadonlyArray<{
    readonly id: string
    readonly sample: HudProjectionSample
  }> | null
  readonly hoveredTag: string | null
}

export type HudFrameMeta = {
  readonly frameId: number
  readonly computeCount: number
  readonly publishCount: number
  readonly sizeVersion: number
  readonly graceRemainingMs: number | null
}

type ComputeListener = (snapshot: HudFrameSnapshot) => void

let productionFrameId = 0
let liveFrame: HudFrameSnapshot | null = null
let publishedFrame: HudFrameSnapshot | null = null
let lastComputedBeforePark: HudFrameSnapshot | null = null
let parked = false
let computeCount = 0
let publishCount = 0
let currentSizeVersion = 0
let lastPublishedSizeVersion: number | null = null
let retainedDeckCard: HudFrameSnapshot['deck']['card'] = null
let retainedDeckDeadlineMs: number | null = null

const publicationListeners = new Set<() => void>()
const computeListeners = new Set<ComputeListener>()

function pointAlmostEqual(a: HudPoint, b: HudPoint): boolean {
  return (
    Math.abs(a.x - b.x) <= HUD_RECT_EPSILON &&
    Math.abs(a.y - b.y) <= HUD_RECT_EPSILON
  )
}

function optionalRectAlmostEqual(
  a: HudProjectedRect | null,
  b: HudProjectedRect | null,
): boolean {
  if (a === null || b === null) return a === b
  return a.visible === b.visible && rectsAlmostEqual(a, b, HUD_RECT_EPSILON)
}

function optionalCardAlmostEqual(
  a: HudFrameSnapshot['deck']['card'],
  b: HudFrameSnapshot['deck']['card'],
): boolean {
  if (a === null || b === null) return a === b
  return (
    a.visible === b.visible &&
    a.retained === b.retained &&
    rectsAlmostEqual(a, b, HUD_RECT_EPSILON)
  )
}

function optionalQuadAlmostEqual(
  a: HudProjectedQuad | null,
  b: HudProjectedQuad | null,
): boolean {
  if (a === null || b === null) return a === b
  return (
    a.visible === b.visible &&
    rectsAlmostEqual(a.bounds, b.bounds, HUD_RECT_EPSILON) &&
    pointAlmostEqual(a.corners.tl, b.corners.tl) &&
    pointAlmostEqual(a.corners.tr, b.corners.tr) &&
    pointAlmostEqual(a.corners.bl, b.corners.bl) &&
    pointAlmostEqual(a.corners.br, b.corners.br)
  )
}

function deckInfoEqual(a: HudDeckInfo | null, b: HudDeckInfo | null): boolean {
  if (a === null || b === null) return a === b
  return a.index === b.index && a.count === b.count && a.busy === b.busy
}

function crateSelectionEqual(
  a: HudCrateSelection | null,
  b: HudCrateSelection | null,
): boolean {
  if (a === null || b === null) return a === b
  const anchorsEqual =
    a.anchor === null || b.anchor === null
      ? a.anchor === b.anchor
      : pointAlmostEqual(a.anchor, b.anchor)
  return (
    a.index === b.index &&
    a.count === b.count &&
    a.title === b.title &&
    a.category === b.category &&
    a.date === b.date &&
    anchorsEqual
  )
}

function anchorsEqual(
  a: HudFrameSnapshot['anchors'],
  b: HudFrameSnapshot['anchors'],
): boolean {
  if (a === null || b === null) return a === b
  if (a.length !== b.length) return false
  return a.every((anchor, index) => {
    const other = b[index]
    return (
      other !== undefined &&
      anchor.id === other.id &&
      pointAlmostEqual(anchor, other)
    )
  })
}

/**
 * Enumerated equality gate. Frame/source identifiers, counters, deadlines,
 * and grace remaining time are intentionally absent.
 */
export function hudFramesEquivalent(
  a: HudFrameSnapshot,
  b: HudFrameSnapshot,
): boolean {
  return (
    a.mode === b.mode &&
    a.hoveredTag === b.hoveredTag &&
    rectsAlmostEqual(a.stage, b.stage, HUD_RECT_EPSILON) &&
    pointAlmostEqual(a.canvasOffset, b.canvasOffset) &&
    rectsAlmostEqual(a.safeFrame, b.safeFrame, HUD_RECT_EPSILON) &&
    optionalQuadAlmostEqual(a.monitor, b.monitor) &&
    deckInfoEqual(a.deck.info, b.deck.info) &&
    optionalCardAlmostEqual(a.deck.card, b.deck.card) &&
    optionalRectAlmostEqual(a.crate.rect, b.crate.rect) &&
    crateSelectionEqual(a.crate.selection, b.crate.selection) &&
    optionalRectAlmostEqual(a.pc, b.pc) &&
    anchorsEqual(a.anchors, b.anchors)
  )
}

export function nextHudFrameId(): number {
  productionFrameId += 1
  return productionFrameId
}

export function getCurrentHudFrameId(): number {
  return productionFrameId
}

function projectionContext(input: HudSamplerComputeInput) {
  return {
    canvasRect: input.canvasRect,
    stageRect: input.stageRect,
    stageClientLeft: input.stageClientLeft,
    stageClientTop: input.stageClientTop,
    cameraNear: input.cameraNear,
    sourceFrameId: input.frameId,
  }
}

function clearDeckRetention(): void {
  retainedDeckCard = null
  retainedDeckDeadlineMs = null
}

function resolveDeckCard(
  input: HudSamplerComputeInput,
  projectedCard: HudProjectedRect | null,
): HudFrameSnapshot['deck']['card'] {
  const info = input.deck.info
  if (input.mode !== 'deck' || info === null) {
    clearDeckRetention()
    return null
  }

  if (projectedCard !== null) {
    retainedDeckCard = { ...projectedCard, retained: false }
    retainedDeckDeadlineMs = null
    return retainedDeckCard
  }

  if (!info.busy || retainedDeckCard === null) {
    clearDeckRetention()
    return null
  }

  if (retainedDeckDeadlineMs === null) {
    retainedDeckDeadlineMs = input.nowMs + HUD_RECT_GRACE_MS
  }
  if (input.nowMs >= retainedDeckDeadlineMs) {
    clearDeckRetention()
    return null
  }

  return { ...retainedDeckCard, retained: true }
}

function projectAnchors(
  input: HudSamplerComputeInput,
  context: ReturnType<typeof projectionContext>,
): HudFrameSnapshot['anchors'] {
  if (input.mode !== 'cockpit' || input.anchors === null) return null
  const projected = input.anchors.flatMap(({ id, sample }) => {
    const point = projectPointToStage(sample, context)
    return point === null ? [] : [{ id, ...point }]
  })
  return projected.length > 0 ? projected : null
}

function buildSnapshot(input: HudSamplerComputeInput): HudFrameSnapshot {
  const context = projectionContext(input)
  const stage = {
    x: 0,
    y: 0,
    w: input.stageRect.w,
    h: input.stageRect.h,
  }
  const stageOriginX = input.stageRect.x + input.stageClientLeft
  const stageOriginY = input.stageRect.y + input.stageClientTop

  // The monitor overlay remains visible over the physical screen in every
  // mode, as it was before rewiring; the sampler still projects it once,
  // centrally, from the current frame's camera.
  const monitor =
    input.monitorSamples === null
      ? null
      : projectQuadToStage(input.monitorSamples, context)

  const projectedDeckCard =
    input.mode === 'deck' && input.deck.cardSamples !== null
      ? projectRectToStage(input.deck.cardSamples, context)
      : null

  const crateRect =
    input.mode === 'cockpit' && input.crate.rectSamples !== null
      ? projectRectToStage(input.crate.rectSamples, context)
      : null
  const pc =
    input.mode === 'cockpit' && input.pcSamples !== null
      ? projectRectToStage(input.pcSamples, context)
      : null

  let crateSelection: HudCrateSelection | null = null
  if (input.mode === 'crate' && input.crate.selection !== null) {
    crateSelection = {
      index: input.crate.selection.index,
      count: input.crate.selection.count,
      anchor:
        input.crate.selection.anchorSample === null
          ? null
          : projectPointToStage(input.crate.selection.anchorSample, context),
      title: input.crate.selection.title,
      category: input.crate.selection.category,
      date: input.crate.selection.date,
    }
  }

  return {
    frameId: input.frameId,
    stage,
    canvasOffset: {
      x: input.canvasRect.x - stageOriginX,
      y: input.canvasRect.y - stageOriginY,
    },
    mode: input.mode,
    safeFrame: computeSafeFrame(stage),
    monitor,
    deck: {
      info: input.mode === 'deck' ? input.deck.info : null,
      card: resolveDeckCard(input, projectedDeckCard),
    },
    crate: {
      rect: crateRect,
      selection: crateSelection,
    },
    pc,
    anchors: projectAnchors(input, context),
    hoveredTag: input.mode === 'cockpit' ? input.hoveredTag : null,
  }
}

export function computeHudFrame(input: HudSamplerComputeInput): HudFrameSnapshot {
  parked = false
  currentSizeVersion = input.sizeVersion
  computeCount += 1
  const next = buildSnapshot(input)
  liveFrame = next

  const sizeChanged = lastPublishedSizeVersion !== input.sizeVersion
  if (
    publishedFrame === null ||
    sizeChanged ||
    !hudFramesEquivalent(publishedFrame, next)
  ) {
    publishedFrame = next
    publishCount += 1
    lastPublishedSizeVersion = input.sizeVersion
    for (const listener of publicationListeners) listener()
  }

  for (const listener of computeListeners) listener(next)
  return next
}

export function subscribeHudFrame(listener: () => void): () => void {
  publicationListeners.add(listener)
  return () => publicationListeners.delete(listener)
}

export function subscribeHudCompute(listener: ComputeListener): () => void {
  computeListeners.add(listener)
  return () => computeListeners.delete(listener)
}

export function getPublishedHudFrame(): HudFrameSnapshot | null {
  return publishedFrame
}

export function getLiveHudFrame(): HudFrameSnapshot | null {
  return liveFrame
}

export function getHudFrameForDiagnostics(): HudFrameSnapshot | null {
  return parked ? lastComputedBeforePark : liveFrame
}

export function isHudSamplerParked(): boolean {
  return parked
}

export function parkHudSampler(): void {
  if (parked) return
  parked = true
  lastComputedBeforePark = liveFrame
  clearDeckRetention()
  if (lastComputedBeforePark !== null) {
    for (const listener of computeListeners) listener(lastComputedBeforePark)
  }
}

/**
 * Scene teardown/rebuild reset. The production frame counter deliberately
 * survives; renderer rebuildCount is the epoch discriminator.
 */
export function resetHudSampler(): void {
  liveFrame = null
  publishedFrame = null
  lastComputedBeforePark = null
  parked = false
  computeCount = 0
  publishCount = 0
  currentSizeVersion = 0
  lastPublishedSizeVersion = null
  clearDeckRetention()
  for (const listener of publicationListeners) listener()
}

export function getHudFrameMeta(nowMs = performance.now()): HudFrameMeta {
  const graceRemainingMs =
    retainedDeckDeadlineMs === null
      ? null
      : Math.max(0, retainedDeckDeadlineMs - nowMs)
  return {
    frameId: (parked ? lastComputedBeforePark : liveFrame)?.frameId ?? productionFrameId,
    computeCount,
    publishCount,
    sizeVersion: currentSizeVersion,
    graceRemainingMs,
  }
}

export function waitForNextHudCompute(timeoutMs = 250): Promise<HudFrameSnapshot> {
  if (parked && lastComputedBeforePark !== null) {
    return Promise.resolve(lastComputedBeforePark)
  }

  return new Promise((resolve, reject) => {
    let settled = false
    const unsubscribe = subscribeHudCompute((snapshot) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      unsubscribe()
      resolve(snapshot)
    })
    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      unsubscribe()
      const diagnostic = getHudFrameForDiagnostics()
      if (parked && diagnostic !== null) resolve(diagnostic)
      else reject(new Error('__COCKPIT_TEST_HOOKS__: HUD sampler compute timeout'))
    }, timeoutMs)
  })
}

export function useHudFrame(): HudFrameSnapshot | null {
  return useSyncExternalStore(
    subscribeHudFrame,
    getPublishedHudFrame,
    () => null,
  )
}
