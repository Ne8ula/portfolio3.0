// @ts-nocheck
// Production-owned focus-camera reservation and degraded-status store.
//
// React overlays publish one font-stable maximum-size measurement per armed
// generation. The imperative renderer consumes the effective reservations
// synchronously and listens for the narrowly-scoped invalidation events.

import { useSyncExternalStore } from 'react'

import {
  FOCUS_CAMERA_RESERVATIONS,
  type FocusKind,
} from '@/lib/responsive/hud-layout'

export type FocusOverlayMetrics = {
  readonly returnControl?: { readonly w: number; readonly h: number }
  readonly arrow?: { readonly w: number; readonly h: number }
  readonly hint?: { readonly w: number; readonly h: number }
  readonly info?: { readonly w: number; readonly h: number }
}

export type FocusFitReason =
  | 'invalid-target'
  | 'invalid-stage'
  | 'invalid-input'
  | 'unfittable-at-max'

export type FocusFitStatus = {
  readonly degraded: boolean
  readonly reason: FocusFitReason | null
}

type MeasurementPass = {
  readonly generation: number
  readonly replacement: boolean
}

type KindState = {
  committed: FocusOverlayMetrics | null
  buffer: FocusOverlayMetrics | null
  pending: MeasurementPass | null
  status: FocusFitStatus
}

export type FocusFitStoreSnapshot = {
  readonly version: number
  readonly activeKind: FocusKind | null
  readonly reservationsEpoch: number
  readonly pending: Readonly<Record<FocusKind, MeasurementPass | null>>
  readonly status: Readonly<Record<FocusKind, FocusFitStatus>>
}

export type FocusFitStoreEvent =
  | {
      readonly type: 'measurement-committed'
      readonly kind: FocusKind
      readonly generation: number
      readonly reservationsEpoch: number
    }
  | {
      readonly type: 'accessibility-invalidated'
      readonly activeKind: FocusKind | null
      readonly discardedKinds: readonly FocusKind[]
    }

export type FocusTransitionResult = {
  readonly departedKind: FocusKind | null
  readonly cancelledUncommitted: boolean
  readonly enteredGeneration: number | null
}

const KINDS = ['monitor', 'deck', 'crate'] as const satisfies readonly FocusKind[]

const initialKindState = (): KindState => ({
  committed: null,
  buffer: null,
  pending: null,
  status: { degraded: false, reason: null },
})

let states: Record<FocusKind, KindState> = {
  monitor: initialKindState(),
  deck: initialKindState(),
  crate: initialKindState(),
}
let activeKind: FocusKind | null = null
let reservationsEpoch = 0
let nextGeneration = 1
let version = 0
let snapshot: FocusFitStoreSnapshot

const snapshotListeners = new Set<() => void>()
const eventListeners = new Set<(event: FocusFitStoreEvent) => void>()

function rebuildSnapshot(): void {
  snapshot = {
    version,
    activeKind,
    reservationsEpoch,
    pending: {
      monitor: states.monitor.pending,
      deck: states.deck.pending,
      crate: states.crate.pending,
    },
    status: {
      monitor: states.monitor.status,
      deck: states.deck.status,
      crate: states.crate.status,
    },
  }
}

function publish(): void {
  version += 1
  rebuildSnapshot()
  for (const listener of snapshotListeners) listener()
}

function emit(event: FocusFitStoreEvent): void {
  for (const listener of eventListeners) listener(event)
}

function arm(kind: FocusKind, replacement: boolean): number {
  const generation = nextGeneration
  nextGeneration += 1
  states[kind].pending = { generation, replacement }
  return generation
}

function finiteSize(value: { readonly w: number; readonly h: number } | undefined) {
  return value === undefined || (
    Number.isFinite(value.w) &&
    Number.isFinite(value.h) &&
    value.w >= 0 &&
    value.h >= 0
  )
}

function validMetrics(metrics: FocusOverlayMetrics): boolean {
  return (
    finiteSize(metrics.returnControl) &&
    finiteSize(metrics.arrow) &&
    finiteSize(metrics.hint) &&
    finiteSize(metrics.info)
  )
}

function effectiveMetrics(kind: FocusKind): FocusOverlayMetrics | null {
  return states[kind].committed ?? states[kind].buffer
}

function finiteInset(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.ceil(value)) : 0
}

/**
 * Measured maxima can only make the conservative D6 frame smaller. These
 * formulas describe the chrome's reserved rails; live subject-attached HUD
 * placement remains explicitly deferred to Phases 6/7.
 */
export function getEffectiveFocusReservations(kind: FocusKind) {
  const base = FOCUS_CAMERA_RESERVATIONS[kind]
  const metrics = effectiveMetrics(kind)
  if (metrics === null) return base

  const returnHeight = finiteInset(metrics.returnControl?.h ?? 0)
  const arrowWidth = finiteInset(metrics.arrow?.w ?? 0)
  const hintHeight = finiteInset(metrics.hint?.h ?? 0)
  const infoHeight = finiteInset(metrics.info?.h ?? 0)

  return {
    top: Math.max(base.top, returnHeight + 12),
    right: Math.max(base.right, arrowWidth + 16),
    bottom: Math.max(
      base.bottom,
      hintHeight + 24,
      kind === 'crate' ? infoHeight + 44 : 0,
    ),
    left: Math.max(base.left, arrowWidth + 16),
  }
}

export function setActiveFocusKind(next: FocusKind | null): FocusTransitionResult {
  const departedKind = activeKind !== next ? activeKind : null
  let cancelledUncommitted = false

  if (departedKind !== null) {
    const departed = states[departedKind]
    if (departed.pending !== null) {
      cancelledUncommitted = true
      departed.pending = null
      // A replacement pass owns the old committed metrics through its buffer.
      // Cancelling it discards that uncommitted buffer exactly as §3.2 requires.
      if (departed.buffer !== null) departed.buffer = null
    }
  }

  activeKind = next
  let enteredGeneration: number | null = null
  if (next !== null) {
    const entered = states[next]
    if (entered.committed === null && entered.pending === null) {
      enteredGeneration = arm(next, entered.buffer !== null)
    } else {
      enteredGeneration = entered.pending?.generation ?? null
    }
  }

  publish()
  return { departedKind, cancelledUncommitted, enteredGeneration }
}

export function completeFocusMeasurement(
  kind: FocusKind,
  generation: number,
  metrics: FocusOverlayMetrics,
): boolean {
  const state = states[kind]
  if (
    state.pending === null ||
    state.pending.generation !== generation ||
    activeKind !== kind ||
    !validMetrics(metrics)
  ) {
    return false
  }

  state.committed = metrics
  state.buffer = null
  state.pending = null
  reservationsEpoch += 1
  publish()
  emit({
    type: 'measurement-committed',
    kind,
    generation,
    reservationsEpoch,
  })
  return true
}

/** Large-text/control changes replace the focused metrics atomically. */
export function invalidateFocusMeasurements(): void {
  const discardedKinds: FocusKind[] = []

  for (const kind of KINDS) {
    const state = states[kind]
    if (kind !== activeKind) {
      if (state.committed !== null || state.buffer !== null || state.pending !== null) {
        discardedKinds.push(kind)
      }
      state.committed = null
      state.buffer = null
      state.pending = null
      continue
    }

    if (state.committed !== null) {
      state.buffer = state.committed
      state.committed = null
    }
    // Supersede the pending generation while retaining the existing buffer.
    arm(kind, state.buffer !== null)
  }

  publish()
  emit({
    type: 'accessibility-invalidated',
    activeKind,
    discardedKinds,
  })
}

export function setFocusFitStatus(
  kind: FocusKind,
  degraded: boolean,
  reason: FocusFitReason | null = null,
): void {
  const next = { degraded, reason: degraded ? reason : null }
  const current = states[kind].status
  if (current.degraded === next.degraded && current.reason === next.reason) return
  states[kind].status = next
  publish()
}

export function getFocusFitStoreSnapshot(): FocusFitStoreSnapshot {
  return snapshot
}

export function getFocusReservationsEpoch(): number {
  return reservationsEpoch
}

export function subscribeFocusFitStore(listener: () => void): () => void {
  snapshotListeners.add(listener)
  return () => snapshotListeners.delete(listener)
}

export function subscribeFocusFitEvents(
  listener: (event: FocusFitStoreEvent) => void,
): () => void {
  eventListeners.add(listener)
  return () => eventListeners.delete(listener)
}

export function useFocusFitStore(): FocusFitStoreSnapshot {
  return useSyncExternalStore(
    subscribeFocusFitStore,
    getFocusFitStoreSnapshot,
    getFocusFitStoreSnapshot,
  )
}

export function resetFocusFitStore(): void {
  states = {
    monitor: initialKindState(),
    deck: initialKindState(),
    crate: initialKindState(),
  }
  activeKind = null
  reservationsEpoch = 0
  nextGeneration = 1
  publish()
}

rebuildSnapshot()
