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
// existing runtime signals. Phase 4 upgrades getHudSnapshot to the §5.3
// single-frame sampler; until then it reads all rects inside one
// requestAnimationFrame callback.

export type CockpitViewMode = 'cockpit' | 'monitor' | 'crate' | 'deck'

export type VisualCaptureConfig = {
  readonly seed: string
  readonly timeMs: number
  readonly pauseAmbient: true
}

export type HudSnapshotRect = { x: number; y: number; w: number; h: number }

export type HudSnapshot = {
  stage: HudSnapshotRect
  subject: (HudSnapshotRect & { visible: boolean }) | null
  overlays: Record<string, HudSnapshotRect>
  safeFrame: HudSnapshotRect
  frameId: number
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

export type CockpitTestHooks = {
  configureVisualCapture(config: VisualCaptureConfig): void
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
  isSettled(): boolean
  getRendererState(): RendererLifecycleSnapshot
  getDeckTether(): DeckTetherSnapshot
  getVinylMotion(): VinylMotionSnapshot
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

type CrateActions = {
  playRecord: (index: number) => boolean
  selectRecord: (index: number) => boolean
}

type DeckTetherProbe = () => DeckTetherSnapshot
type VinylSleeveProbe = () => VinylSleeveSnapshot
type VinylFlightProbe = () => VinylFlightSnapshot

type Registry = {
  introSkipped: boolean
  sceneConstructed: boolean
  visualCapture: VisualCaptureConfig | null
  settled: boolean
  deckTransient: boolean
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
}

const registry: Registry = {
  introSkipped: false,
  sceneConstructed: false,
  visualCapture: null,
  settled: false,
  deckTransient: false,
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

/** GlobeCanvas marks the moment scene construction begins — the lifecycle
 *  cutoff for configureVisualCapture (§9.6.1/§9.6.5: a seed injected after
 *  construction cannot reach already-built geometry). */
export function markSceneConstructed(): void {
  if (!testHooksEnabled) return
  registry.sceneConstructed = true
}

/** GlobeCanvas reports per-frame settle state from its render loop:
 *  no camera lerp, no focus switch, no deck flight. */
export function reportFrame(settled: boolean): void {
  if (!testHooksEnabled) return
  registry.settled = settled
  registry.frameId++
}

/** turntable reports its post-landing transients (tonearm swing, beam
 *  rise, card fade) — `busy` clears at disc landing, before these finish,
 *  and §9.6.1's isSettled contract includes "no card fade in progress". */
export function reportDeckTransient(active: boolean): void {
  if (!testHooksEnabled) return
  registry.deckTransient = active
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
const SETTLE_TIMEOUT_MS = 15000

function isSettledNow(): boolean {
  const deck = window.__cockpitDeck
  return registry.settled && !(deck && deck.busy) && !registry.deckTransient
}

function waitForSettled(): Promise<void> {
  return new Promise((resolve, reject) => {
    const startedAt = performance.now()
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
      if (performance.now() - startedAt > SETTLE_TIMEOUT_MS) {
        reject(new Error('__COCKPIT_TEST_HOOKS__: settle timeout'))
        return
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

function relativeTo(stage: DOMRect, rect: DOMRect): HudSnapshotRect {
  return {
    x: rect.left - stage.left,
    y: rect.top - stage.top,
    w: rect.width,
    h: rect.height,
  }
}

// Stage-edge gutter for the provisional safe frame. Phase 4's hud-layout
// tokens (HUD_EDGE_GUTTER) supersede this single use.
const PROVISIONAL_EDGE_GUTTER = 16

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
      // Phase 4 connects this to the named random streams and frozen
      // capture clock (§9.6.5). Phase 0 reserves the lifecycle.
      registry.visualCapture = config
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

    getHudSnapshot(): Promise<HudSnapshot> {
      return new Promise((resolve, reject) => {
        requestAnimationFrame(() => {
          const stageEl = document.querySelector('[data-layout-region="cockpit-stage"]')
          if (!stageEl) {
            reject(new Error('__COCKPIT_TEST_HOOKS__: cockpit stage not mounted'))
            return
          }
          const stageRect = stageEl.getBoundingClientRect()
          const stage: HudSnapshotRect = {
            x: stageRect.left,
            y: stageRect.top,
            w: stageRect.width,
            h: stageRect.height,
          }

          const mode = window.__cockpitViewMode
          let subjectRaw: HudSnapshotRect | null = null
          if (mode === 'crate') subjectRaw = window.__getCockpitCrateRect?.() ?? null
          else if (mode === 'deck') subjectRaw = window.__getCockpitDeckCardRect?.() ?? null
          else if (mode === 'monitor') subjectRaw = window.__getCockpitScreenRect?.() ?? null
          const subject = subjectRaw
            ? {
                ...subjectRaw,
                visible:
                  subjectRaw.x < stage.w &&
                  subjectRaw.y < stage.h &&
                  subjectRaw.x + subjectRaw.w > 0 &&
                  subjectRaw.y + subjectRaw.h > 0,
              }
            : null

          const overlays: Record<string, HudSnapshotRect> = {}
          for (const el of Array.from(document.querySelectorAll('[data-hud]'))) {
            const name = el.getAttribute('data-hud')
            if (!name) continue
            overlays[name] = relativeTo(stageRect, el.getBoundingClientRect())
          }

          resolve({
            stage,
            subject,
            overlays,
            safeFrame: {
              x: PROVISIONAL_EDGE_GUTTER,
              y: PROVISIONAL_EDGE_GUTTER,
              w: Math.max(0, stage.w - 2 * PROVISIONAL_EDGE_GUTTER),
              h: Math.max(0, stage.h - 2 * PROVISIONAL_EDGE_GUTTER),
            },
            frameId: registry.frameId,
          })
        })
      })
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
