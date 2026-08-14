// __COCKPIT_TEST_HOOKS__ — the deterministic test bridge (§9.6.1).
//
// ADDITIVE ONLY: this never replaces or alters the preserved
// `window.__cockpit*` live-tuning bridge. Cockpit modules report state into
// a module-scoped registry (registerPhaseController / markSceneConstructed /
// reportFrame / registerCrateActions); the window-facing hook object is the
// test contract.
//
// PRODUCTION EXCLUSION (Phase 0 decision, per §9.6.1 "guarded out of
// production"): every entry point no-ops unless
// `process.env.NODE_ENV !== 'production'`. Next.js inlines NODE_ENV, so
// the guard is statically false in production bundles and the hook object
// is never attached; Phase 8's production-gate asserts
// `window.__COCKPIT_TEST_HOOKS__` is absent from the shipped artifact.
// Consequence: browser tests that need the bridge run against a
// development server, and the Phase 8 production gate runs against the
// production build (where the bridge must NOT exist).
//
// Phase 0 scope: full lifecycle guard for configureVisualCapture (Phase 4
// wires it to the named random streams and frozen clock), working
// skipIntro/enterView/playRecord/getHudSnapshot/isSettled built on the
// existing runtime signals. configureSettleTimeout only adjusts the bounded
// development-harness wait; it never changes production animation timing.
// Phase 4 upgrades getHudSnapshot to the §5.3
// single-frame sampler; until then it reads all rects inside one
// requestAnimationFrame callback.

import type { FrameTimesCaptureState } from './frame-times'
import { invalidateFocusMeasurements } from './focus-fit-store'
import {
  getContainedPanSnapshotForTests,
  type ContainedPanSnapshot,
} from '../responsive/use-contained-pan'
import {
  getHudFrameForDiagnostics,
  getHudFrameMeta as getSamplerFrameMeta,
  getPublishedHudFrame,
  isHudSamplerParked,
  waitForNextHudCompute,
} from './hud-sampler'
import type {
  HudFrameMeta,
  HudFrameSnapshot,
} from './hud-sampler'

export type CockpitViewMode = 'cockpit' | 'monitor' | 'crate' | 'deck'

export type VisualCaptureConfig = {
  readonly seed: string
  readonly timeMs: number
  readonly pauseAmbient: true
}

export type VisualCaptureState = {
  readonly active: boolean
  readonly seed: string | null
  readonly timeMs: number | null
  readonly streams: readonly string[]
}

export type HudSnapshotRect = { x: number; y: number; w: number; h: number }

export type HudSnapshot = {
  stage: HudSnapshotRect
  subject: (HudSnapshotRect & { visible: boolean }) | null
  overlays: Record<string, HudSnapshotRect>
  safeFrame: HudSnapshotRect
  frameId: number
  liveFrame: HudFrameSnapshot
  publishedFrame: HudFrameSnapshot | null
  overlaysCommittedFrameId: number | null
  parked: boolean
}

export type VisualAssetState = {
  readonly pending: number
  readonly failed: number
  readonly total: number
}

export type RendererSizeSnapshot = {
  readonly cssWidth: number
  readonly cssHeight: number
  readonly dpr: number
  readonly bufferWidth: number
  readonly bufferHeight: number
  readonly sizeVersion: number
}

export type RendererLifecycleSnapshot = {
  readonly status: 'initializing' | 'ready' | 'lost' | 'restoring' | 'terminal'
  readonly rebuildCount: number
  readonly main: RendererSizeSnapshot | null
}

export type WarpLifecycleSnapshot = {
  readonly initialCoverColor: string | null
  readonly contextLossTriggered: boolean
  readonly contextLossHandled: boolean
}

export type DeckTetherSnapshot = {
  readonly visible: boolean
  readonly forcedColors: boolean
  readonly reducedMotion: boolean
  readonly reducedTransparency: boolean
  readonly highContrast: boolean
  readonly hairlineScaleY: number
  readonly hairlineOpacity: number
  readonly footOpacity: number
  readonly ringOpacity: number
  readonly hairlineColor: string
  readonly footColor: string
  readonly ringColor: string
  readonly drawCalls: number
  readonly triangles: number
  readonly lineSegments: number
  readonly shaderMaterials: number
  readonly textures: number
  readonly normalBlending: boolean
  readonly receiverIntegrated: boolean
  readonly attachmentGap: number
  readonly deckProgramsReady: boolean
}

export type VinylSleeveSnapshot = {
  readonly phase: 'idle' | 'preview' | 'departing' | 'returning' | 'inserting'
  readonly activeIndex: number
  readonly openMouth: boolean
  readonly mouthGap: number
  readonly sleeveTopY: number
  readonly discRadius: number
  readonly previewRise: number
  readonly clearRise: number
  readonly clearanceMargin: number
  readonly activeRise: number
  readonly discBottomClearance: number
  readonly returnInsertionObserved: boolean
  readonly returnStartedAtClearWaypoint: boolean
}

export type VinylFlightSnapshot = {
  readonly phase: 'idle' | 'extracting' | 'airborne-in' | 'airborne-out'
  readonly index: number
  readonly openSleeve: boolean
  readonly clearanceMargin: number
  readonly extractionProgress: number
  readonly lateralMotionAllowed: boolean
  readonly extractionObserved: boolean
  readonly clearanceBoundaryPassed: boolean
}

export type VinylMotionSnapshot = {
  readonly sleeve: VinylSleeveSnapshot
  readonly flight: VinylFlightSnapshot
}

export type FocusFitSnapshot = {
  readonly kind: 'monitor' | 'deck' | 'crate'
  readonly status: 'fit' | 'degraded'
  readonly reason: string | null
  readonly distance: number
  readonly solveCount: number
  readonly lastSolveCause: string
  readonly safeFrame: HudSnapshotRect
  readonly points: readonly { readonly x: number; readonly y: number }[]
}

export type FreeLookSnapshot = {
  readonly yawTarget: number
  readonly pitchTarget: number
  readonly exponent: number
  readonly boxW: number
  readonly boxH: number
}

export type PanSnapshot = ContainedPanSnapshot

export type PointerActivationOwner =
  | 'crate'
  | 'deck'
  | 'coffee'
  | 'decorations'
  | 'pc'

export type PointerActivationCandidate = {
  readonly owner: PointerActivationOwner
  readonly key: string
}

export type PointerActivationSnapshot = {
  readonly pendingCount: number
  readonly pendingActivation: PointerActivationCandidate | null
  readonly activationCount: number
  readonly lastActivation: (PointerActivationCandidate & {
    readonly count: number
  }) | null
}

export type CockpitTestHooks = {
  configureVisualCapture(config: VisualCaptureConfig): void
  configureSettleTimeout(timeoutMs: number): void
  getVisualCaptureState(): VisualCaptureState
  completeAuthoredTweakGuard(): void
  armFocusMeasurementReplacement(): void
  skipIntro(): void
  armWarpContextLoss(): void
  getWarpLifecycle(): WarpLifecycleSnapshot
  enterView(mode: CockpitViewMode): Promise<void>
  playRecord(index: number): Promise<void>
  /** Phase 0 addition beyond the §9.6.1 minimum: deterministic crate
   *  SELECTION (the legacy pull-out state — no deck flight), needed by the
   *  Phase −1 entrance assertion because all three fixed overlays mount
   *  only while a record is selected. Synchronous; crate view only. */
  selectRecord(index: number): void
  getHudSnapshot(): Promise<HudSnapshot>
  getHudFrameMeta(): HudFrameMeta
  getVisualAssetState(): VisualAssetState
  isSettled(): boolean
  getRendererState(): RendererLifecycleSnapshot
  getDeckTether(): DeckTetherSnapshot
  getVinylMotion(): VinylMotionSnapshot
  getFocusFit(): FocusFitSnapshot | null
  getFreeLookState(): FreeLookSnapshot
  getPanState(): PanSnapshot | null
  getPointerActivationState(): PointerActivationSnapshot
  getPointerActivationCandidate(point: {
    readonly x: number
    readonly y: number
  }): PointerActivationCandidate | null
  getPointerActivationPoint(key: string): { readonly x: number; readonly y: number } | null
}

declare global {
  interface Window {
    __COCKPIT_TEST_HOOKS__?: CockpitTestHooks
    __cockpitTheme?: string
    __cockpitViewMode?: string
    __setCockpitViewMode?: ((mode: string) => void) | null
    __cockpitDeck?: { busy: boolean; index: number } | null
    __getCockpitCrateRect?: (() => HudSnapshotRect | null) | null
    __getCockpitDeckCardRect?: (() => HudSnapshotRect | null) | null
    __getCockpitScreenRect?: (() => HudSnapshotRect | null) | null
  }
}

export const testHooksEnabled = process.env.NODE_ENV !== 'production'

const DEFAULT_SETTLE_TIMEOUT_MS = 15_000
const MAX_SETTLE_TIMEOUT_MS = 120_000

type CrateActions = {
  playRecord: (index: number) => boolean
  selectRecord: (index: number) => boolean
}

type DeckTetherProbe = () => DeckTetherSnapshot
type VinylSleeveProbe = () => VinylSleeveSnapshot
type VinylFlightProbe = () => VinylFlightSnapshot
type FocusFitProbe = () => FocusFitSnapshot | null
type FreeLookProbe = () => FreeLookSnapshot
type AuthoredTweakGuardAction = () => void
type PointerActivationProbe = {
  readonly snapshot: () => PointerActivationSnapshot
  readonly candidateAt: (point: {
    readonly clientX: number
    readonly clientY: number
  }) => PointerActivationCandidate | null
  readonly pointFor: (key: string) => { readonly x: number; readonly y: number } | null
}

type Registry = {
  introSkipped: boolean
  sceneConstructed: boolean
  visualCapture: VisualCaptureConfig | null
  visualCaptureStreams: Set<string>
  visualAssets: VisualAssetState
  settleTimeoutMs: number
  settled: boolean
  deckTransient: boolean
  crateTransient: boolean
  frameId: number
  skipIntroImpl: (() => void) | null
  crateActions: CrateActions | null
  rendererLifecycle: {
    status: RendererLifecycleSnapshot['status']
    rebuildCount: number
  }
  mainRenderer: RendererSizeSnapshot | null
  warpContextLossArmed: boolean
  warpLifecycle: WarpLifecycleSnapshot
  deckTetherProbe: DeckTetherProbe | null
  vinylSleeveProbe: VinylSleeveProbe | null
  vinylFlightProbe: VinylFlightProbe | null
  focusFitProbe: FocusFitProbe | null
  freeLookProbe: FreeLookProbe | null
  authoredTweakGuardAction: AuthoredTweakGuardAction | null
  pointerActivationProbe: PointerActivationProbe | null
}

const registry: Registry = {
  introSkipped: false,
  sceneConstructed: false,
  visualCapture: null,
  visualCaptureStreams: new Set<string>(),
  visualAssets: {
    pending: 0,
    failed: 0,
    total: 0,
  },
  settleTimeoutMs: DEFAULT_SETTLE_TIMEOUT_MS,
  settled: false,
  deckTransient: false,
  crateTransient: false,
  frameId: 0,
  skipIntroImpl: null,
  crateActions: null,
  rendererLifecycle: {
    status: 'initializing',
    rebuildCount: 0,
  },
  mainRenderer: null,
  warpContextLossArmed: false,
  warpLifecycle: {
    initialCoverColor: null,
    contextLossTriggered: false,
    contextLossHandled: false,
  },
  deckTetherProbe: null,
  vinylSleeveProbe: null,
  vinylFlightProbe: null,
  focusFitProbe: null,
  freeLookProbe: null,
  authoredTweakGuardAction: null,
  pointerActivationProbe: null,
}

// ── Reporting API for cockpit modules (no-ops in production) ─────────────

/** CockpitApp registers how to jump the phase machine straight to cockpit. */
export function registerPhaseController(skip: () => void): void {
  if (!testHooksEnabled) return
  registry.skipIntroImpl = skip
}

export function unregisterPhaseController(): void {
  if (!testHooksEnabled) return
  registry.skipIntroImpl = null
}

export function registerAuthoredTweakGuardAction(
  action: AuthoredTweakGuardAction,
): void {
  if (!testHooksEnabled) return
  registry.authoredTweakGuardAction = action
}

export function unregisterAuthoredTweakGuardAction(): void {
  if (!testHooksEnabled) return
  registry.authoredTweakGuardAction = null
}

/** GlobeCanvas marks the moment scene construction begins — the lifecycle
 *  cutoff for configureVisualCapture (§9.6.1/§9.6.5: a seed injected after
 *  construction cannot reach already-built geometry). */
export function markSceneConstructed(): void {
  if (!testHooksEnabled) return
  registry.sceneConstructed = true
}

/** Read-only construction seam for the named random source. Production
 *  statically receives null and therefore uses the native random delegate. */
export function getVisualCaptureSeed(): string | null {
  if (!testHooksEnabled) return null
  return registry.visualCapture?.seed ?? null
}

/** Internal clock seam. The returned shape is deliberately smaller than
 *  the window-facing capture state and contains no stream diagnostics. */
export function getVisualCaptureFrameState(): FrameTimesCaptureState {
  if (!testHooksEnabled || registry.visualCapture === null) return null
  return {
    timeMs: registry.visualCapture.timeMs,
    pauseAmbient: true,
  }
}

/** Record which named streams the configured scene actually constructs. */
export function reportVisualCaptureStream(name: string): void {
  if (!testHooksEnabled || registry.visualCapture === null) return
  registry.visualCaptureStreams.add(name)
}

/** GlobeCanvas reports per-frame settle state from its render loop:
 *  no camera lerp, no focus switch, no deck flight. */
export function reportFrame(settled: boolean, frameId: number): void {
  if (!testHooksEnabled) return
  registry.settled = settled
  registry.frameId = frameId
}

/**
 * Register one asynchronous writer whose completion can change the rendered
 * frame. The returned reporter is idempotent; production gets a static no-op.
 */
export function beginVisualAsset(): (failed?: boolean) => void {
  if (!testHooksEnabled) return () => {}
  registry.visualAssets = {
    ...registry.visualAssets,
    pending: registry.visualAssets.pending + 1,
    total: registry.visualAssets.total + 1,
  }
  let completed = false
  return (failed = false) => {
    if (completed) return
    completed = true
    registry.visualAssets = {
      pending: Math.max(0, registry.visualAssets.pending - 1),
      failed: registry.visualAssets.failed + Number(failed),
      total: registry.visualAssets.total,
    }
  }
}

/** turntable reports its post-landing transients (tonearm swing, beam
 *  rise, card fade) — `busy` clears at disc landing, before these finish,
 *  and §9.6.1's isSettled contract includes "no card fade in progress". */
export function reportDeckTransient(active: boolean): void {
  if (!testHooksEnabled) return
  registry.deckTransient = active
}

/** vinyl-crate reports capture-only asymptotic motion so a settled capture
 *  is observed only after its exact-target completion snaps have applied. */
export function reportCrateTransient(active: boolean): void {
  if (!testHooksEnabled) return
  registry.crateTransient = active
}

/** vinyl-crate registers its programmatic record→deck path (the same
 *  sendToDeck flow a crate click uses) and the deterministic selection. */
export function registerCrateActions(actions: CrateActions): void {
  if (!testHooksEnabled) return
  registry.crateActions = actions
}

export function unregisterCrateActions(): void {
  if (!testHooksEnabled) return
  registry.crateActions = null
}

export function registerDeckTetherProbe(probe: DeckTetherProbe): void {
  if (!testHooksEnabled) return
  registry.deckTetherProbe = probe
}

export function unregisterDeckTetherProbe(): void {
  if (!testHooksEnabled) return
  registry.deckTetherProbe = null
}

export function registerVinylSleeveProbe(probe: VinylSleeveProbe): void {
  if (!testHooksEnabled) return
  registry.vinylSleeveProbe = probe
}

export function unregisterVinylSleeveProbe(): void {
  if (!testHooksEnabled) return
  registry.vinylSleeveProbe = null
}

export function registerVinylFlightProbe(probe: VinylFlightProbe): void {
  if (!testHooksEnabled) return
  registry.vinylFlightProbe = probe
}

export function unregisterVinylFlightProbe(): void {
  if (!testHooksEnabled) return
  registry.vinylFlightProbe = null
}

export function registerFocusFitProbe(probe: FocusFitProbe): void {
  if (!testHooksEnabled) return
  registry.focusFitProbe = probe
}

export function unregisterFocusFitProbe(): void {
  if (!testHooksEnabled) return
  registry.focusFitProbe = null
}

export function registerFreeLookProbe(probe: FreeLookProbe): void {
  if (!testHooksEnabled) return
  registry.freeLookProbe = probe
}

export function unregisterFreeLookProbe(): void {
  if (!testHooksEnabled) return
  registry.freeLookProbe = null
}

export function registerPointerActivationProbe(
  probe: PointerActivationProbe,
): void {
  if (!testHooksEnabled) return
  registry.pointerActivationProbe = probe
}

export function unregisterPointerActivationProbe(): void {
  if (!testHooksEnabled) return
  registry.pointerActivationProbe = null
}

export function reportRendererLifecycle(
  status: RendererLifecycleSnapshot['status'],
  rebuildCount: number,
): void {
  if (!testHooksEnabled) return
  registry.rendererLifecycle = { status, rebuildCount }
}

export function reportMainRendererSize(
  target: Omit<RendererSizeSnapshot, 'sizeVersion'>,
  sizeVersion: number,
): void {
  if (!testHooksEnabled) return
  registry.mainRenderer = { ...target, sizeVersion }
}

export function clearMainRendererSize(): void {
  if (!testHooksEnabled) return
  registry.mainRenderer = null
  registry.settled = false
  registry.crateTransient = false
}

export function reportWarpInitialCoverColor(color: string): void {
  if (!testHooksEnabled) return
  registry.warpLifecycle = {
    ...registry.warpLifecycle,
    initialCoverColor: color,
  }
}

export function consumeWarpContextLossRequest(): boolean {
  if (!testHooksEnabled || !registry.warpContextLossArmed) return false
  registry.warpContextLossArmed = false
  return true
}

export function reportWarpContextLossTriggered(): void {
  if (!testHooksEnabled) return
  registry.warpLifecycle = {
    ...registry.warpLifecycle,
    contextLossTriggered: true,
  }
}

export function reportWarpContextLossHandled(): void {
  if (!testHooksEnabled) return
  registry.warpLifecycle = {
    ...registry.warpLifecycle,
    contextLossHandled: true,
  }
}

// ── Hook implementation ──────────────────────────────────────────────────

const VIEW_MODES: readonly CockpitViewMode[] = ['cockpit', 'monitor', 'crate', 'deck']
const SETTLE_CONSECUTIVE_FRAMES = 3

function isSettledNow(): boolean {
  const deck = window.__cockpitDeck
  return (
    registry.settled &&
    !(deck && deck.busy) &&
    !registry.deckTransient &&
    !registry.crateTransient
  )
}

function waitForSettled(): Promise<void> {
  return new Promise((resolve, reject) => {
    const startedAt = performance.now()
    const timeoutMs = registry.settleTimeoutMs
    let consecutive = 0
    const tick = () => {
      if (isSettledNow()) {
        consecutive++
        if (consecutive >= SETTLE_CONSECUTIVE_FRAMES) {
          resolve()
          return
        }
      } else {
        consecutive = 0
      }
      if (performance.now() - startedAt > timeoutMs) {
        reject(new Error('__COCKPIT_TEST_HOOKS__: settle timeout'))
        return
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

function relativeTo(
  stage: DOMRect,
  rect: DOMRect,
  clientLeft: number,
  clientTop: number,
): HudSnapshotRect {
  return {
    x: rect.left - (stage.left + clientLeft),
    y: rect.top - (stage.top + clientTop),
    w: rect.width,
    h: rect.height,
  }
}

function buildHooks(): CockpitTestHooks {
  return {
    configureVisualCapture(config: VisualCaptureConfig): void {
      if (registry.introSkipped || registry.sceneConstructed) {
        throw new Error(
          'configureVisualCapture() must be called before skipIntro() or any ' +
            'scene construction (§9.6.1) — reload and configure first',
        )
      }
      if (
        typeof config !== 'object' ||
        config === null ||
        typeof config.seed !== 'string' ||
        config.seed.length === 0 ||
        typeof config.timeMs !== 'number' ||
        !Number.isFinite(config.timeMs) ||
        config.pauseAmbient !== true
      ) {
        throw new Error(
          'configureVisualCapture() requires { seed: string, timeMs: number, pauseAmbient: true }',
        )
      }
      registry.visualCapture = { ...config }
      registry.visualCaptureStreams.clear()
      registry.visualAssets = { pending: 0, failed: 0, total: 0 }
    },

    configureSettleTimeout(timeoutMs: number): void {
      if (
        !Number.isInteger(timeoutMs) ||
        timeoutMs <= 0 ||
        timeoutMs > MAX_SETTLE_TIMEOUT_MS
      ) {
        throw new Error(
          `configureSettleTimeout() requires an integer from 1 to ${MAX_SETTLE_TIMEOUT_MS}`,
        )
      }
      registry.settleTimeoutMs = timeoutMs
    },

    getVisualCaptureState(): VisualCaptureState {
      const config = registry.visualCapture
      return {
        active: config !== null,
        seed: config?.seed ?? null,
        timeMs: config?.timeMs ?? null,
        streams: [...registry.visualCaptureStreams].sort(),
      }
    },

    completeAuthoredTweakGuard(): void {
      if (!registry.authoredTweakGuardAction) {
        throw new Error('__COCKPIT_TEST_HOOKS__: authored tweak guard is not ready')
      }
      registry.authoredTweakGuardAction()
    },

    armFocusMeasurementReplacement(): void {
      invalidateFocusMeasurements()
    },

    skipIntro(): void {
      if (!registry.skipIntroImpl) {
        throw new Error('__COCKPIT_TEST_HOOKS__: app not mounted yet — cannot skipIntro()')
      }
      registry.introSkipped = true
      registry.skipIntroImpl()
    },

    armWarpContextLoss(): void {
      registry.warpContextLossArmed = true
      registry.warpLifecycle = {
        initialCoverColor: null,
        contextLossTriggered: false,
        contextLossHandled: false,
      }
    },

    getWarpLifecycle(): WarpLifecycleSnapshot {
      return { ...registry.warpLifecycle }
    },

    async enterView(mode: CockpitViewMode): Promise<void> {
      if (!VIEW_MODES.includes(mode)) {
        throw new Error(`__COCKPIT_TEST_HOOKS__: unknown view mode "${String(mode)}"`)
      }
      const setMode = window.__setCockpitViewMode
      if (!setMode) {
        throw new Error('__COCKPIT_TEST_HOOKS__: scene not ready — __setCockpitViewMode missing')
      }
      setMode(mode)
      await waitForSettled()
    },

    async playRecord(index: number): Promise<void> {
      if (!Number.isInteger(index) || index < 0) {
        throw new Error('__COCKPIT_TEST_HOOKS__: playRecord() needs a non-negative index')
      }
      if (!registry.crateActions) {
        throw new Error('__COCKPIT_TEST_HOOKS__: crate not ready — cannot playRecord()')
      }
      if (window.__cockpitViewMode !== 'crate') {
        const setMode = window.__setCockpitViewMode
        if (!setMode) {
          throw new Error('__COCKPIT_TEST_HOOKS__: scene not ready — __setCockpitViewMode missing')
        }
        setMode('crate')
        await waitForSettled()
      }
      if (!registry.crateActions.playRecord(index)) {
        throw new Error(`__COCKPIT_TEST_HOOKS__: playRecord(${index}) was rejected (deck busy?)`)
      }
      await waitForSettled()
      const deck = window.__cockpitDeck
      if (deck && deck.index !== index) {
        throw new Error(
          `__COCKPIT_TEST_HOOKS__: deck landed on index ${deck.index}, expected ${index}`,
        )
      }
    },

    selectRecord(index: number): void {
      if (!Number.isInteger(index) || index < 0) {
        throw new Error('__COCKPIT_TEST_HOOKS__: selectRecord() needs a non-negative index')
      }
      if (!registry.crateActions) {
        throw new Error('__COCKPIT_TEST_HOOKS__: crate not ready — cannot selectRecord()')
      }
      if (!registry.crateActions.selectRecord(index)) {
        throw new Error(
          `__COCKPIT_TEST_HOOKS__: selectRecord(${index}) rejected — needs crate view with no deck flight`,
        )
      }
    },

    async getHudSnapshot(): Promise<HudSnapshot> {
      const stageEl = document.querySelector<HTMLElement>(
        '[data-layout-region="cockpit-stage"]',
      )
      if (!stageEl) {
        throw new Error('__COCKPIT_TEST_HOOKS__: cockpit stage not mounted')
      }
      const liveFrame = isHudSamplerParked()
        ? getHudFrameForDiagnostics()
        : await waitForNextHudCompute(250)
      if (liveFrame === null) {
        throw new Error('__COCKPIT_TEST_HOOKS__: HUD sampler has no computed frame')
      }

      if (!stageEl.isConnected) {
        throw new Error('__COCKPIT_TEST_HOOKS__: cockpit stage not mounted')
      }
      const stageRect = stageEl.getBoundingClientRect()
      const stage: HudSnapshotRect = {
        x: stageRect.left,
        y: stageRect.top,
        w: stageRect.width,
        h: stageRect.height,
      }

      // Compatibility adapter: preserve the pre-Phase-4 top-level subject
      // derivation exactly, including monitor's legacy {visible:false}
      // result caused by applying rect visibility math to its quad shape.
      const mode = window.__cockpitViewMode
      let subjectRaw: Record<string, unknown> | null = null
      if (mode === 'crate') subjectRaw = window.__getCockpitCrateRect?.() ?? null
      else if (mode === 'deck') subjectRaw = window.__getCockpitDeckCardRect?.() ?? null
      else if (mode === 'monitor') subjectRaw = window.__getCockpitScreenRect?.() ?? null
      const rawRect = subjectRaw as HudSnapshotRect | null
      const subject = (subjectRaw
        ? {
            ...subjectRaw,
            visible:
              rawRect!.x < stage.w &&
              rawRect!.y < stage.h &&
              rawRect!.x + rawRect!.w > 0 &&
              rawRect!.y + rawRect!.h > 0,
          }
        : null) as (HudSnapshotRect & { visible: boolean }) | null

      const overlays: Record<string, HudSnapshotRect> = {}
      for (const el of Array.from(document.querySelectorAll('[data-hud]'))) {
        const name = el.getAttribute('data-hud')
        if (!name) continue
        overlays[name] = relativeTo(
          stageRect,
          el.getBoundingClientRect(),
          stageEl.clientLeft,
          stageEl.clientTop,
        )
      }

      const committedRaw = stageEl.getAttribute('data-hud-frame')
      const committed = committedRaw === null ? null : Number(committedRaw)
      return {
        stage,
        subject,
        overlays,
        safeFrame: { ...liveFrame.safeFrame },
        frameId: registry.frameId,
        liveFrame,
        publishedFrame: getPublishedHudFrame(),
        overlaysCommittedFrameId:
          committed !== null && Number.isFinite(committed) ? committed : null,
        parked: isHudSamplerParked(),
      }
    },

    getHudFrameMeta(): HudFrameMeta {
      return getSamplerFrameMeta()
    },

    getVisualAssetState(): VisualAssetState {
      return { ...registry.visualAssets }
    },

    isSettled(): boolean {
      return isSettledNow()
    },

    getRendererState(): RendererLifecycleSnapshot {
      return {
        ...registry.rendererLifecycle,
        main: registry.mainRenderer ? { ...registry.mainRenderer } : null,
      }
    },

    getDeckTether(): DeckTetherSnapshot {
      if (!registry.deckTetherProbe) {
        throw new Error('__COCKPIT_TEST_HOOKS__: deck tether is not ready')
      }
      return registry.deckTetherProbe()
    },

    getVinylMotion(): VinylMotionSnapshot {
      if (!registry.vinylSleeveProbe || !registry.vinylFlightProbe) {
        throw new Error('__COCKPIT_TEST_HOOKS__: vinyl motion is not ready')
      }
      return {
        sleeve: registry.vinylSleeveProbe(),
        flight: registry.vinylFlightProbe(),
      }
    },

    getFocusFit(): FocusFitSnapshot | null {
      return registry.focusFitProbe?.() ?? null
    },

    getFreeLookState(): FreeLookSnapshot {
      if (!registry.freeLookProbe) {
        throw new Error('__COCKPIT_TEST_HOOKS__: free-look state is not ready')
      }
      return registry.freeLookProbe()
    },

    getPanState(): PanSnapshot | null {
      return getContainedPanSnapshotForTests()
    },

    getPointerActivationState(): PointerActivationSnapshot {
      if (!registry.pointerActivationProbe) {
        throw new Error('__COCKPIT_TEST_HOOKS__: pointer activation is not ready')
      }
      return registry.pointerActivationProbe.snapshot()
    },

    getPointerActivationCandidate(point): PointerActivationCandidate | null {
      if (!registry.pointerActivationProbe) {
        throw new Error('__COCKPIT_TEST_HOOKS__: pointer activation is not ready')
      }
      return registry.pointerActivationProbe.candidateAt({
        clientX: point.x,
        clientY: point.y,
      })
    },

    getPointerActivationPoint(key): { readonly x: number; readonly y: number } | null {
      if (!registry.pointerActivationProbe) {
        throw new Error('__COCKPIT_TEST_HOOKS__: pointer activation is not ready')
      }
      return registry.pointerActivationProbe.pointFor(key)
    },
  }
}

/** Attach the bridge. Called from CockpitApp on mount; no-op in production
 *  builds and on repeat calls (StrictMode double-mount). */
export function installTestHooks(): void {
  if (!testHooksEnabled) return
  if (typeof window === 'undefined') return
  if (window.__COCKPIT_TEST_HOOKS__) return
  window.__COCKPIT_TEST_HOOKS__ = buildHooks()
}
