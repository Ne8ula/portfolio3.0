# Phase 3 Design — Renderer and Viewport Sizing

**Status:** owner-approved — D1–D6 all approved with the recommended
defaults on 2026-07-31, including exact recovery wording (D2). Ready for
Codex implementation per §9.
**Revision 2 (2026-07-31):** owner-directed implementation-blocker
amendments — §3.4 frame-start sizing enforcement + lost-context guard;
§4.3/§4.4 React HUD state seeding and restore ordering; §4.3 explicit
outgoing-context teardown order with deliberate `forceContextLoss()`
release; AC-15/AC-19 aligned to the two-cycle automatic budget with
testable context release; AC-23/§5.3/§9 owner checkpoint for the hardware
and `about:gpucrash` evidence. D1–D6 approvals and all phase boundaries
unchanged.
**Author:** Claude (design lead) · **Date:** 2026-07-31 · **Base:** `main` @ `685eb67`
(Phase 2 complete, independent Kimi QA PASS, five gates green).

Scope is exactly plan §8 Phase 3 (`docs/hud-responsive-layout-plan.md:2012-2040`):

1. one idempotent renderer-sizing contract;
2. `ResizeObserver`, window-resize fallback, and DPR-change handling;
3. the same sizing policy for the main cockpit and warp renderers;
4. `ResponsiveStage` integration without counter-scaling browser zoom;
5. WebGL context loss, restoration, retry, and terminal fallback for both
   renderers (plan §10.1);
6. a measurement protocol that justifies retaining or changing `DPR_CAP = 2`.

Out of scope, by phase discipline: the Phase 4 HUD solver, projection
migration, seeded randomness, and scorecard baselines; Phase 5 camera-fit and
input normalization; the Phase 6 deck-HUD overlap fix; Phase 7 appearance
migration; Phase 8 browser-matrix expansion. three.js stays imperative — no
React Three Fiber, WebGPU, or TSL. The `window.__cockpit*` bridge is
preserved exactly; all new test instrumentation is additive, development-only
`__COCKPIT_TEST_HOOKS__` members.

Repository-state notes verified before design: `main` is one commit ahead of
`origin/main`; the only working-tree change is the owner's timestamp-only
re-stamp of `content/portfolio-approvals.json` (owner-only — untouched,
unstaged, uninterpreted by this design). The latest handoff entries predate
commit `685eb67`; the live tree was treated as authoritative throughout.

---

## 1. Verified current-state audit

Every claim below was verified against the live tree at `685eb67`. Line
numbers will drift during implementation; stable symbol names are given
alongside.

### 1.1 Main renderer — creation, sizing, animation, resize, disposal

`components/cockpit/globe-canvas.tsx`, one `React.useEffect` with `[]` deps
(`globe-canvas.tsx:29-1179`) inside `GlobeCanvas({ yawRef, pitchRef })`.

- **Creation** — `new THREE.WebGLRenderer({ antialias:true, alpha:false })`
  at `globe-canvas.tsx:126`; `setPixelRatio(Math.min(window.devicePixelRatio, 2))`
  at `:127` (no `|| 1` fallback — an undefined `devicePixelRatio` would
  produce `NaN`); `setSize(mount.clientWidth, mount.clientHeight)` at `:128`;
  ACES tone mapping + exposure 1.2 at `:129-130`; canvas appended to the
  mount at `:131`; `window.__cockpitRenderer` published at `:132`. The camera
  is created at `:122` with `mount.clientWidth/mount.clientHeight` — a
  zero-size mount at creation yields `NaN` aspect with no guard.
  `THREE.ColorManagement.enabled = false` is set globally at `:35` inside the
  effect (re-applied per mount; never reverted — benign under rebuild).
- **Animation** — single rAF loop `animate()` at `:977-1137`, driven by a
  `THREE.Clock` (`:975`); external ticks dispatched through the
  **window-global dispatch table** `window.__cockpitTick` (`:908-915`, read
  back at `:1000`); `renderer.render(scene, camera)` at `:1132`;
  `reportFrame(settled)` at `:1135` feeds the §9.6.1 settle signal.
- **Resize** — `onResize` at `:1140-1144`: reads `mount.clientWidth/Height`,
  sets `camera.aspect`, `updateProjectionMatrix()`, `renderer.setSize(...)`.
  Registered only on `window resize` (`:1145`). It never re-reads DPR, never
  guards zero/non-finite sizes, and no `ResizeObserver` or resolution media
  query exists anywhere in the repository (verified: zero code occurrences of
  `ResizeObserver`, `dppx`, `min-resolution`, or `devicePixelRatio` outside
  the two renderer files).
- **Disposal** — cleanup at `:1147-1178`: cancels the rAF, removes the four
  listeners, calls the six builder disposers (`:1153-1158`),
  `edgeGlow.dispose()` (`:1160`), nulls 15 bridge globals (`:1161-1175`),
  `renderer.dispose()` (`:1176`), removes the canvas (`:1177`). §1.6 lists
  what this cleanup does **not** free.
- **Context loss** — no `webglcontextlost`/`webglcontextrestored` listener,
  no `preventDefault`, no restore path, no user-facing message anywhere in
  the repository (grep-verified; matches plan §10.1's "verified gap").

### 1.2 Warp renderer — creation, sizing, animation, resize, disposal

`components/cockpit/warp-transition.tsx`, effect at `:229-343`.

- **Creation** — `new THREE.WebGLRenderer({ antialias:true, alpha:true,
  preserveDrawingBuffer:true })` at `:235` (a second live context that
  coexists with the main renderer for the ~2.5 s warp);
  `setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))` at `:236`
  (note: this file *does* have the `|| 1` fallback the main renderer lacks);
  `renderer.setSize(window.innerWidth, window.innerHeight)` at `:237` —
  sized from the **window**, not its host element; camera aspect from window
  dimensions at `:243`.
- **Animation** — self-terminating `performance.now()`-driven loop
  `tick()` at `:306-328`; stops re-scheduling ~0.2 s past `DURATION_MS`
  (`:326`); the phase transition is carried by an independent `setTimeout`
  (`:225-227`), so warp completion never depends on rendering.
- **Resize** — `onResize` at `:296-300` uses `window.innerWidth/innerHeight`;
  window-resize listener only (`:301`); no DPR re-read, no zero guard.
- **Disposal** — cleanup at `:330-336` disposes the tracked `disposables`
  (terrain/line/portal geometries + materials), `renderer.dispose()`, canvas
  removal. This is the most complete teardown in the codebase, with one gap:
  the `catch` branch at `:337-342` (first-load WebGL failure → opaque cream
  card) returns **no cleanup function**, so a throw landing after the resize
  listener (`:301`) or first `requestAnimationFrame` (`:328`) leaks that
  listener/loop.

### 1.3 Where DPR is read and capped

Exactly two sites, both inline, both capped at literal `2`, mutually
inconsistent about the `|| 1` fallback:

- `globe-canvas.tsx:127` — `Math.min(window.devicePixelRatio, 2)`;
- `warp-transition.tsx:236` — `Math.min(window.devicePixelRatio || 1, 2)`.

There is no named `DPR_CAP` constant anywhere; the plan's `DPR_CAP = 2`
exists only as documentation. DPR is applied once at creation and never
updated (moving the window between displays with different scale factors, or
changing browser zoom, silently renders at the stale ratio — plan §2.3's
audit, still accurate).

### 1.4 Dependence on `window.innerWidth`, mount dimensions, `window.resize`

| Site | Measures | Trigger |
|---|---|---|
| `globe-canvas.tsx:122,128,1141-1143` | mount `clientWidth/Height` | mount + `window resize` (`:1145`) |
| `warp-transition.tsx:237,243,297-299` | `window.innerWidth/innerHeight` | mount + `window resize` (`:301`) |
| `components/responsive/responsive-stage.tsx:51` | `window.innerWidth/innerHeight` (tier selection — deliberate, §A.2 live-viewport rule) | `window resize` (`:57`) |
| `components/responsive/responsive-page.tsx:24` | `window.innerWidth/innerHeight` (tier attribute) | `window resize` (`:46`) |
| `components/cockpit/cockpit-hud.tsx:922` | `window.innerWidth` clamp inside `DeckBrowseArrows` | per-rAF poll — **Phase 6/7 territory; not touched by Phase 3** |
| `components/cockpit/cockpit-hud.tsx:63` | stage `getBoundingClientRect()` for free-look normalization | mousemove |

The HUD overlays (`cockpit-hud.tsx:632,686,737,787,873,912,1002`) each run an
independent rAF poll of the projection getters. Phase 4 consolidates them;
Phase 3 must only guarantee the ordering in §3.4 so those polls never observe
a new stage size with a stale camera aspect.

### 1.5 ResponsiveStage fit/contained behavior — and the cockpit's non-use of it

`components/responsive/responsive-stage.tsx:28-89`: mode is derived from the
**live CSS viewport** via `selectResponsiveTier({ w: innerWidth, h:
innerHeight }, profileId)` on `window resize` (`:48-59`); `fit` renders the
surface at `100%/100%`, `contained` renders it at the support profile's
`normalMin` (1024×600 for `desktop-laptop-v1`,
`lib/responsive/layout-contract.ts:50-54`) inside an `overflow:auto`,
keyboard-focusable labelled region (`:64-88`). Browser zoom is never
counter-scaled (the stage uses natural CSS pixels only).

The cockpit does **not** use it yet. The chain today is: `app/page.tsx:147`
→ `CockpitEntry` → `.cockpit-shell` (`position:fixed; inset:0; z-index:100`,
`app/globals.css:629-634`) → `CockpitApp` root (fixed, inset 0,
`cockpit-app.tsx:151-160`) → a plain absolute wrapper (`cockpit-app.tsx:172`)
→ the stage div `data-layout-region="cockpit-stage"`
(`cockpit-hud.tsx:88-95`) → `<GlobeCanvas/>` (`:96`). The stage div carries
the programmatic-scroll pin (`onScroll` reset, `cockpit-hud.tsx:94`) that
CLAUDE.md flags for rescoping when the contained stage integrates.
`responsive-stage.tsx:17-19` records the plan of record: "Phase 2 integrates
it into the real page shell … after which Phase 3 gives the WebGL renderer
its sizing contract" — Phase 2 delivered the shell but did not wrap the
cockpit in `ResponsiveStage`; that integration is this phase's item 4.

### 1.6 Phase 2 initial WebGL capability probe and canonical-content fallback

`components/cockpit/cockpit-entry.tsx`: one-shot probe in a mount effect
(`:24-32`) — throwaway `canvas.getContext('webgl2') ?? getContext('webgl')`
— driving `'checking' | 'available' | 'unavailable'` (`:15`). Unavailable
renders the in-document `role="status"` notice (`:64-78`) with the exact copy
"The 3D cockpit is unavailable in this browser. Everything is available as
ordinary pages." plus `/projects` and `/about` links; the cockpit is never
imported, and the inert/scroll-lock handoff (`:34-60`) never applies. The
Phase 2 spec **explicitly excludes runtime loss** — `docs/phase-2-design.md:555-556`
("Context loss/restore remains Phase 3 (§10.1). This is initial capability
only") and `:98-99`. The probe is never re-run; a post-mount loss is invisible
to `CockpitEntry` today.

### 1.7 GPU-backed resources that must be recreated after restoration

A full-file audit of the twelve builder modules plus both renderer files
produced one architecturally decisive result:

> **The builder modules hold no module-scope mutable GPU state.** Every
> texture, material, and geometry is allocated in function/closure scope by
> `buildGlassMac` / `buildVinylCrate` / `buildTurntable` / `buildCoffee` /
> `buildDecorations` / `buildTeaSet` / `buildIncense` / `makeEdgeGlow` /
> `makeDecal` / `makeDiscTexture` / `makeHeroGlass` / `makeFrost`, and is
> recreated whole on every build call. The only module-scope declarations are
> constants (`materials.ts:11-20` PALETTE, `vinyl-crate.ts:34-43` colors,
> etc.). A rebuild that re-runs the `GlobeCanvas` effect therefore recreates
> every GPU resource with no stale-cache hazard.

Resource classes that a restoration must recreate (owner → resources):

| Owner | GPU resources (evidence) |
|---|---|
| `globe-canvas.tsx` scene body | starfield, desk/legs/shelf/grid geometry + materials (`:135-273`), x-ray PC materials (`:302-354`), globe group (`:741-802`), fog (`:734`), lights (`:361-368`) |
| **PMREM environment** | `new THREE.PMREMGenerator(renderer)` (`:372`), `scene.environment = pmrem.fromScene(envScene, 0.04).texture` (`:404`). Render-target-backed — **no CPU-side image exists**; it can only be regenerated, never re-uploaded. Every physical/transmission material in all builder modules samples it |
| three.js internal | the renderer-owned **transmission render target** (allocated lazily per camera because `materials.ts:31` sets `transmissionSampler: true`), sized at full drawing-buffer resolution — it scales with DPR, which matters for §5 |
| `glass-mac.ts` | ~15 materials, ~30 geometries, 8+ `CanvasTexture`s incl. two 1024×768 screen textures (`:395-396`) and a 2048×1024 key atlas (`:251-271`) |
| `vinyl-crate.ts` | per-record cover/top-edge/disc/halo `CanvasTexture`s (`:116-118,:175-177,:193`, `project-textures.ts:35`), sleeve geometry/materials (`:401-434`), `VertexNormalsHelper`s at scene root (`:453-458`) |
| `turntable.ts` | platter mat, card (`cardTex` 640×800, `:529-531`), glow, per-index `discTexCache` (`:363-365`), the hand-written **beam `ShaderMaterial`** (`:559-585`) — a distinct compiled program |
| `coffee.ts`, `decorations.ts`, `incense.ts`, `tea-set.ts` | noise/smoke/lace/etch/wood `CanvasTexture`s, ~200 geometries, sprite materials; smoke sprites live at **scene root** (`incense.ts:166`), as does the flying `deckDisc` (`turntable.ts:362`) |
| `decals.ts` | ~70 async SVG-rasterized micrographic textures (fetch → Image → canvas, `:33-61`), re-fetched on rebuild (browser-cached) |
| warp | terrain (≈47 k triangles, `warp-transition.tsx:256-258`), three `ShaderMaterial` programs, line-soup geometries |

`CanvasTexture` sources are CPU-side canvases and would survive a same-context
restore, but the PMREM environment and compiled programs would not; the
rebuild architecture in §4 sidesteps the distinction by recreating everything.

### 1.8 Durable cockpit state versus transient animation/mechanical state

**Durable (must survive restoration):**

| State | Owner today | Survives a `GlobeCanvas` remount? |
|---|---|---|
| Theme | React state + `localStorage['cockpit-theme']` in `cockpit-app.tsx:60-114`; scene reads `window.__cockpitTheme` at build (`globe-canvas.tsx:79`) | **Yes** (bridge value persists across remount) |
| Accessibility preferences | root `AccessibilityProvider` + persisted `cockpit-a11y-v1` + `data-a11y-*` on `<html>` | **Yes** (outside the scene) |
| View mode | closure `viewMode` (`globe-canvas.tsx:869`) mirrored to `window.__cockpitViewMode` (`:875,:888`) | **No** — resets to `'cockpit'`; the mirror is nulled/rewritten |
| Selected/playing record | `selectedIdx` closure in `buildVinylCrate` (`vinyl-crate.ts:468`) — **closure scope only**; readable via `__getCockpitVinylHover()` (`:675-696`, crate view + selection only). Playing index mirrored at `turntable.ts:616` (`playing`), readable via `window.__cockpitDeck.index` (`:693`) | **No** — destroyed on rebuild; only the read-only getters exist |
| Dialed-in transforms | `TWEAK_DEFAULTS` re-asserted by the ~180-frame apply loop (`cockpit-app.tsx:121-149`) — **keyed on `[phase]` only**, so a rebuild without a phase change would never re-apply them | **No** without a new trigger |

**Transient (must reset to at-rest on restoration):** camera interpolation
`modeT`/`focusSwitch`/`smoothYaw`/`smoothPitch` (`globe-canvas.tsx:871-873`),
hover state (`:812`, `vinyl-crate.ts:467-469`), deck flight/queue/eject and
the four easings `coverT/armT/beamT/cardT` (`turntable.ts:616-624`), the
`busy` getter (`:692`) and post-landing `reportDeckTransient` easings
(`:845-849`), sleeve pull-out cascade (`vinyl-crate.ts:743-757`), coffee
state machine `'idle'→'pouring'→'full'→'draining'` with `level`/`anim`/
`dropClock` (`coffee.ts:427-430,:410`), platter spin accumulation
(`turntable.ts:789`), smoke/steam sprite phases. All closure-scoped; all
reset naturally on rebuild. `turntable.ts:329-330` samples reduced-motion
once per build — a rebuild re-samples it (correct).

One genuine cross-mount survivor: the module-scope `registry` in
`test-hooks.ts:88-97` (dev-only). `registry.crateActions` is correctly
cleared by `vinyl-crate.ts:788`; `registry.sceneConstructed` latches `true`
at first build and never resets, which permanently blocks
`configureVisualCapture` after any rebuild — acceptable (it is a
pre-first-build lifecycle gate for Phase 4 capture), documented here so
Phase 4 is not surprised.

### 1.9 Missing cleanup, ownership ambiguity, duplicated renderer policy

Findings (F1–F10), each verified:

- **F1 — PMREM leak.** Neither `pmrem.dispose()` nor
  `scene.environment.dispose()` nor the `envScene` geometry/material
  disposal exists; the generator is unreachable after
  `globe-canvas.tsx:406`.
- **F2 — no scene-graph disposal.** No `scene.traverse(… dispose …)` walk
  exists; outside `highlights.ts:95-98` and the crate's pin helpers
  (`vinyl-crate.ts:779`), **no builder output is ever GPU-disposed**. The six
  builder disposers cover listeners and window bridges only;
  `glass-mac.ts` has **no disposer at all** and `globe-canvas.tsx:1153-1158`
  has no entry for it.
- **F3 — transmission render target orphan.** `renderer.dispose()` (three
  r184) replaces the render-state WeakMap without deleting the transmission
  target's FBO/texture. Reclaimed only when the browser destroys the
  context — acceptable once rebuilds destroy contexts deliberately, but a
  true leak under dev StrictMode remount today.
- **F4 — inconsistent DPR fallback** (§1.3) and **duplicated inline sizing
  policy** across the two renderers (different measurement sources, no
  shared constant, no shared idempotence).
- **F5 — zero-size and non-finite dimensions unguarded** at creation
  (`globe-canvas.tsx:122`) and resize (`:1141`) — `NaN` aspect and 0-size
  buffers are reachable.
- **F6 — warp catch-path cleanup gap** (`warp-transition.tsx:337-342`).
- **F7 — bridge nulling is unconditional and incomplete.** Disposers null
  slots without instance identity (e.g. `turntable.ts:894`), and cleanup
  misses `__cockpitHoverPC`, `__cockpitSmoothedYaw/Pitch`,
  `__cockpitGLBLoaded`, `__getCockpitCubeScreenTarget` (left as a stale
  `() => null`). Harmless today (single instance, whole-scene teardown), but
  the lifecycle design must keep unmount-before-mount ordering so it stays
  harmless.
- **F8 — render-loop dispatch through a window global**
  (`window.__cockpitTick`, `globe-canvas.tsx:908,:1000`) — the loop's
  dispatch table is not a closure; a stale scene's tick could be pumped by a
  new loop if two instances ever overlapped.
- **F9 — un-cancellable async texture writers**: `decals.ts:44-58` image
  loads, `vinyl-crate.ts:125-148` cover repaints, `turntable.ts:376`,
  `glass-mac.ts:510-511` `document.fonts.ready` — all may write
  `needsUpdate` on stale (disposed) textures after teardown. CPU-only writes;
  benign, but they retain closures until settled.
- **F10 — anisotropy is hardcoded** (literal 4/8, e.g. `decals.ts:16`,
  `project-textures.ts:36`) with no
  `renderer.capabilities.getMaxAnisotropy()` query — noted for §5's
  environment record; not a Phase 3 change.

---

## 2. Design intent and user experience

### 2.1 Experience definitions

**Normal startup (unchanged).** Probe passes → boot → warp → cockpit. The
sizing contract is invisible: the canvas always fills the stage, stays sharp
at the capped DPR, and never stretches during a resize.

**Temporary context loss (cockpit mounted).** The scene freezes; within
250 ms a quiet stage-anchored panel appears (§2.2). The user is told, in
plain language, that the 3D scene was interrupted and that restoring is in
progress; a canonical escape ("View projects") is available immediately. No
alarm styling, no spinner, no blocked action.

**Successful restoration.** The cockpit returns as a clean, at-rest scene in
the **view mode recorded at the moment of loss** (owner decision D4;
plan-mandated default). Mid-flight mechanics resolve to their destination:
a record that was flying to the deck is restored landed and at rest; a camera
mid-transition is restored settled at its target pose. Theme, accessibility
state, and the selected/playing record are preserved. The panel announces
"3D scene restored." and dismisses; focus returns to the stage.

**Repeated restoration failure (terminal).** After the retry budget (D1) or
a restore that never arrives, the cockpit unmounts entirely. The document
beneath — the canonical Phase 2 content — becomes fully operable again
(inert released, scroll unlocked), and an in-document `role="status"` notice
explains what happened, distinct from the never-supported case, with
`/projects`, `/about`, and a "Restart the 3D cockpit" action. Nothing blank
is ever left on screen.

**First-load WebGL unavailability (unchanged from Phase 2).** The existing
notice and wording stay verbatim; the cockpit never mounts.

**Loss during boot.** Not reachable: boot is DOM-only (no canvas/WebGL in
`boot-screen.tsx`, grep-verified) and the cockpit renderer mounts at the
warp phase. No handling exists because no context exists.

**Loss during warp.** The warp is a ~2.5 s disposable, `pointer-events:none`,
`aria-hidden` overlay whose completion is already carried by a timeout
independent of rendering. On loss, the warp ends immediately and hands to the
cockpit (D3): no message, no retry — a sub-second visual truncation is the
whole cost. If the same GPU reset also took the cockpit's context, the
cockpit's own lifecycle handles it on arrival.

**Loss in cockpit / monitor / crate / deck / active record transition.** One
rule covers all five: snapshot the semantic state at loss
(`viewMode`, playing/selected record index), restore to the **settled pose of
that state**. Concretely: cockpit → cockpit rest; monitor → monitor framing
with the ScreenDialog re-attached; crate → crate view with the same record
selection; deck (including a disc mid-flight, since `viewMode` and
`__cockpitDeck.index` already reflect the destination) → deck view with that
record landed, tonearm down, card at full fade, no flight in progress.

### 2.2 The recovery surface

Two distinct surfaces, one voice.

**A. Transient recovery panel** (states `lost`/`restoring`; stage chrome,
mounted outside the rebuilt subtree so it survives the remount):

- Anchored to the cockpit stage, centered; cream surface / ink text in light,
  ink surface / cream text in dark via existing tokens; `1px` mauve border;
  hard corners; no drop shadow; no backdrop blur (and none under
  reduced-transparency by construction). Signal jade appears **only** on the
  action link and focus ring. No red/blue/yellow; no icon glyph carrying
  meaning alone — the text is the message.
- Copy (voice per DESIGN.md §12 — plain, specific, factual, no fake
  warnings). Label row (mono, letter-spaced, uppercase, like the existing
  `esc · return` chrome): `3D · INTERRUPTED`. Body (UI face, sentence case):
  - `lost`: "The 3D scene was interrupted. Waiting for the graphics system…"
  - `restoring`: "Restoring the scene…"
  - on success (announced, then panel unmounts): "3D scene restored."
- Action: "View projects" — an ordinary link to `/projects` (the
  cockpit-stage protected region's declared alternative,
  `app/layout-contract.ts:27`), present from the first frame of the panel.
  Recovery must never gate the canonical path.
- Appearance is debounced 250 ms so a sub-frame loss/restore never flashes a
  panel. **No decorative animation in any state** — no spinner, no pulsing
  ellipsis, no entrance transition (this also satisfies reduced motion by
  construction, and forced-colors mode simply repaints the panel in system
  colors — the border keeps its geometry, `forced-color-adjust` stays
  default).
- Announcements: a persistent, visually hidden polite live region owned by
  the lifecycle controller (`data-hud="renderer-status"`) receives the state
  strings above (loss → restoring → restored, or terminal). The panel itself
  is not the live region, so its unmount cannot clip the "restored"
  announcement.
- Focus: when the panel appears, focus moves to the panel container
  (`tabIndex={-1}`) — prior focus was necessarily inside the (now dead)
  cockpit shell, since the document behind is inert. Tab reaches the "View
  projects" link; there is no focus trap (the shell is the tab scope while
  the document is inert). Escape does nothing special. On successful
  restoration, focus moves to the stage container (given `tabIndex={-1}` for
  this purpose).

**B. Terminal notice** (in-document, replaces the cockpit entirely):

- `CockpitApp` unmounts; the Phase 2 inert/scroll-lock effect releases
  automatically (`cockpit-entry.tsx:34-60` cleanup); the server-rendered
  document is again the whole page.
- `CockpitEntry` renders a runtime variant of the Phase 2 notice —
  `role="status"`, in document flow, focus moved to it on mount
  (`tabIndex={-1}`):
  - Copy: "The 3D cockpit stopped after a graphics interruption and could
    not restart. Everything on this site is available as ordinary pages."
  - Links: "View projects" (`/projects`) · "About" (`/about`) — same
    pattern as the Phase 2 notice.
  - Action: a button "Restart the 3D cockpit" that remounts `CockpitApp`
    fresh (full boot sequence; honest, deterministic, and re-runs the
    capability path). Manual restart is always available; only *automatic*
    retries are budgeted.

### 2.3 "This browser cannot provide WebGL" vs "the 3D context was lost"

The two must never share wording, because they demand different user mental
models (capability vs interruption):

| Case | Surface | Wording anchor |
|---|---|---|
| Initial probe fails (Phase 2, unchanged) | in-document notice, cockpit never mounts | "…unavailable **in this browser**…" |
| Runtime loss, restoring | stage panel | "…was **interrupted**… Restoring…" |
| Runtime terminal | in-document notice + restart action | "…**stopped after a graphics interruption** and could not restart…" |

The initial-probe path keeps its Phase 2 copy byte-for-byte; only the two new
runtime states add strings (owner approves exact copy — D2).

---

## 3. Renderer sizing contract

### 3.1 Pure policy — `lib/responsive/render-policy.ts` (new, strict island)

All numeric policy in one server-safe, three-free, unit-tested module beside
`input-policy.ts` (this is also where plan §8 Phase 3 says the DPR baseline
numbers are recorded):

```ts
export const DPR_CAP = 2  // amended only through §5's measurement protocol

export type RenderSizeInput = {
  readonly cssWidth: number     // unrounded, from getBoundingClientRect()
  readonly cssHeight: number
  readonly devicePixelRatio: number
}

export type RenderSizeTarget = {
  readonly cssWidth: number     // unrounded CSS px — layout geometry
  readonly cssHeight: number
  readonly dpr: number          // min(max-guarded dpr, DPR_CAP)
  readonly bufferWidth: number  // floor(cssWidth × dpr)  — the ONLY rounding
  readonly bufferHeight: number // floor(cssHeight × dpr)
}

export function computeRenderSizeTarget(
  input: RenderSizeInput, cap?: number,
): RenderSizeTarget | null
// null when either CSS dimension is ≤ 0 or non-finite. A non-finite or ≤ 0
// devicePixelRatio degrades to 1 (never null — CSS size is the validity
// signal, DPR is a quality signal). Buffer dims are floored to mirror
// three's setSize(w, h, false) internals, min 1.

export function renderSizeTargetsEqual(
  a: RenderSizeTarget | null, b: RenderSizeTarget | null,
): boolean
// exact comparison on all five fields — the idempotence gate.
```

Unit tests pin: zero/negative/NaN/Infinity rejection; `dpr` capping
(0.5 → 0.5, 1 → 1, 2 → 2, 3 → 2, `NaN`/`undefined`/0 → 1); fractional CSS
sizes keep their fraction while buffers floor; equality semantics.

### 3.2 Per-renderer controller — `syncRendererSize()` ownership

A small imperative binder, `components/cockpit/renderer-size-sync.ts`
(new; consistent with the cockpit module tier), used by **both** renderers:

```
createRendererSizeSync({
  mount,        // the element whose box is authoritative for this renderer
  renderer, camera,
  onApplied,    // owner-supplied immediate render (see ordering, §3.4)
}) → { sync(), dispose() }
```

`sync()` is the plan's `syncRendererSize()` and is idempotent:

1. `mount.getBoundingClientRect()` → unrounded `cssWidth/cssHeight`.
2. `computeRenderSizeTarget({ cssWidth, cssHeight, devicePixelRatio })`;
   `null` → return without touching renderer or camera (no `NaN`, no
   `Infinity`, no WebGL call — the previous applied state stands).
3. `renderSizeTargetsEqual(target, applied)` → no-op return. The cache lives
   **per controller instance**; nothing is shared between instances.
4. Apply, in order: `camera.aspect = cssWidth / cssHeight` +
   `camera.updateProjectionMatrix()` **first**, then
   `renderer.setPixelRatio(target.dpr)` (only when changed), then
   `renderer.setSize(cssWidth, cssHeight, /* updateStyle */ false)` (only
   when CSS size or DPR changed — three floors `css × dpr` internally,
   matching the policy's buffer numbers; r184's `setPixelRatio` re-applies
   size with `updateStyle:false` itself, verified).
5. Cache `applied = target`, increment `sizeVersion`; invoke `onApplied()`.

**CSS size and DPR update independently**: a DPR-only change re-applies the
pixel ratio and buffer without touching `camera.aspect` (aspect is a pure
function of CSS size); a CSS-only change updates aspect and buffer without
re-reading DPR assumptions. Because the *drawing buffer* is the only rounded
artifact, the canvas element is styled to fill its mount via CSS
(`position:absolute; inset:0; width:100%; height:100%; display:block`) and
`setSize` is always called with `updateStyle:false` — canvas CSS bounds equal
stage bounds exactly, satisfying §9.2's 1 px bound by construction. (This
supersedes plan §4.1 step 7's literal `setSize(round(w), round(h))` — a
documented amendment, §6.4.)

**Initial-call ordering:** create renderer → register context-loss listeners
(§4) → create controller → `sync()` → first `renderer.render(...)`. The
camera is constructed with a placeholder aspect of `1` and never reads mount
dimensions directly again (removing the F5 `NaN` path at
`globe-canvas.tsx:122`). If the mount measures invalid at mount time (e.g.
mid-layout), the first valid `ResizeObserver` delivery applies the real size
before anything meaningful renders.

**Cleanup ordering:** controller `dispose()` (disconnect observer, remove
listeners, drop cache) runs at step 4 of the outgoing-context teardown
sequence defined in §4.3 — after the context-event listeners are removed,
before GPU disposal, renderer disposal, the deliberate context release, and
canvas removal.

### 3.3 Triggers

Registered by the controller, all funneling into the same `sync()`:

- **`ResizeObserver`** on the mount (border-box) — the primary signal; also
  covers stage-only changes (contained-mode transitions) that never fire
  `window resize`, and delivers the initial size.
- **`window resize`** — compatibility fallback (older engines, chrome
  show/hide edge cases). The idempotence gate makes duplicate delivery free.
- **Re-armed resolution media query** — `matchMedia(`(resolution:
  ${window.devicePixelRatio}dppx)`)`; on `change`: `sync()`, dispose the old
  query listener, re-arm against the new ratio. This is the only reliable
  signal for a window dragged between displays with different scale factors
  while CSS size stays constant, and it also fires on browser-zoom changes.
- **Cleanup** removes all three (observer `disconnect()`, `resize` listener,
  current media-query listener).

### 3.4 Ordering guarantees (plan §4.3)

Invariant: **no rendered frame and no HUD sample may combine a new stage size
with an old camera aspect.** Because `ResizeObserver` delivers *after* a
frame's rAF callbacks, trigger-driven syncing alone cannot enforce this
invariant; enforcement is structural:

- **Frame-start sync — the enforcement mechanism.** The main render loop
  calls `sync()` as the first operation of every `animate()` frame — before
  camera pose work, before `renderer.render`, and therefore before every HUD
  poll in the same rAF batch (rAF callbacks execute in registration order,
  and each loop re-registers at its own tail, preserving `GlobeCanvas`-first
  order). The idempotence gate makes the per-frame call one
  `getBoundingClientRect()` plus a cache compare — the same layout read
  every HUD poll already performs each frame. Any frame that renders has,
  by construction, applied the current stage size with its matching camera
  aspect, so HUD getters — which recompute projection from the live camera
  (`globe-canvas.tsx:658-660`) — can never observe the torn state. Each
  applied change increments a monotonic `sizeVersion` (exposed through
  `getRendererState()`, §4.7): the observable that AC-4/AC-8 assert against
  (the equivalent "size-version gate" made concrete).
- **Triggers are latency optimizations, not the guarantee.** The
  `ResizeObserver` / `window resize` / media-query deliveries still call
  `sync()` eagerly: within `sync()`, camera aspect/projection update
  strictly precede any renderer call, and `onApplied()` performs one
  immediate `renderer.render(scene, camera)` (same precedent as the §9.6.2
  forced re-render; `docs/responsive-system.md` §11 decision 2). RO
  callbacks run before paint, so an observer-driven resize re-renders the
  already-produced frame with correct aspect **before the user sees it** —
  zero stretched frames. If any trigger is ever missed or mis-ordered, the
  next frame-start sync corrects state within one frame.
- **Context-lost guard.** While the §4 lifecycle is in `lost` or
  `restoring`, every sync path early-returns before touching the camera or
  the renderer, and `onApplied()` never issues a render — resize-triggered
  draw calls can never reach a dead context. (The frame-start path is
  naturally inert because the loop is parked; the trigger paths carry the
  explicit guard.) The rebuilt renderer performs its own initial `sync()`
  (§3.2), so no stale measurement is ever replayed onto a new context.
- The warp applies the same structure: `sync()` at the start of its
  `tick()`, plus the same guarded eager triggers; its time-based loop needs
  no other coordination and it samples no HUD projection.

### 3.5 ResponsiveStage integration and contained-stage behavior

`CockpitApp` replaces the bare absolute wrapper (`cockpit-app.tsx:172`) with:

```
<ResponsiveStage label="Cockpit stage" regionId="cockpit-stage-region">
  <Cockpit … />            ← keyed for lifecycle rebuild, §4
  <RendererRecoveryPanel/> ← §2.2 A; sibling, survives rebuilds
</ResponsiveStage>
```

- **Fit mode** — surface is `100%/100%` of the shell; behavior identical to
  today. The renderer's mount is inside the surface, so the observer chain
  is stage-driven rather than window-driven.
- **Contained mode** (zoom/narrow tier) — the surface pins to `1024×600`
  (`SUPPORT_PROFILES['desktop-laptop-v1'].normalMin`); the renderer sizes to
  that surface (one `ResizeObserver` delivery at the transition), and the
  outer region provides native, keyboard-operable panning exactly as
  `ResponsiveStage` already implements. Camera aspect follows the surface,
  not the viewport.
- **Browser zoom is never counter-scaled.** Zoom reaches the renderer only
  as (a) a smaller/larger CSS viewport → possibly a tier change → surface
  size, and (b) a changed `devicePixelRatio` → capped buffer resolution.
  Nothing reads a zoom factor; nothing multiplies UI by its inverse. At
  120 % / 150 % / 200 % zoom the stage magnifies with the page like any CSS
  content; §9.2's "browser zoom is not counter-scaled" and "scale remains
  capped" are verified per §7.
- **Programmatic-scroll pin rescope** (the CLAUDE.md gotcha): the stage div
  keeps its own-element pin (`cockpit-hud.tsx:94`) — in the new hierarchy
  the stage div is exactly surface-sized with `overflow:hidden`, so the pin
  is a pure safety net. The **pannable region must never be pinned** (its
  scrolling is the feature). The residual hazard — monitor-view focus into
  the matrix3d ScreenDialog auto-scrolling the *contained* region — is
  neutralized at the source: dialog-internal focus management uses
  `focus({ preventScroll: true })`, with AC-13 asserting that entering and
  operating monitor view in contained mode leaves the region's scroll
  offsets unchanged. (If implementation finds a browser where
  `preventScroll` is insufficient, the fallback is a scoped scroll
  save/restore on the region during dialog focus transitions — same AC.)
- The warp overlay remains viewport-fixed (application chrome above the
  page): its mount is its own fixed host, measured by the same controller —
  policy shared, state not.

### 3.6 Warp renderer parity

`warp-transition.tsx` adopts the identical contract with its host element as
the mount: same `computeRenderSizeTarget`, same triggers, same zero-size
rejection, same `updateStyle:false` + CSS-filled canvas, same cleanup — via
its own `createRendererSizeSync` instance. This removes the
`window.innerWidth` dependence (§1.2) and the DPR-fallback inconsistency
(§1.3). Its `catch` path is restructured so listener/rAF cleanup is returned
on every path (F6).

Explicitly **not** in this phase: camera-fit changes (deck/crate/monitor
distance solving stays byte-identical; Phase 5), HUD anchor changes
(Phases 6–7), per-overlay rAF consolidation (Phase 4).

---

## 4. Context lifecycle architecture

### 4.1 State machine

Owned by a new controller in `CockpitApp` (pure transition logic in
`lib/responsive/context-lifecycle.ts`, strict island, unit-tested; the React
binding stays in the cockpit tier):

```
initializing ─(first frame rendered)→ ready
ready ─(webglcontextlost)→ lost
lost ─(webglcontextrestored)→ restoring ─(stabilization delay + remount +
        first verified frame)→ ready
lost ─(no restore event within RESTORE_WAIT_MS)→ terminal
restoring ─(rebuild throws / context creation fails / immediate re-loss,
        budget remaining)→ restoring (next attempt)
restoring ─(budget exhausted)→ terminal
terminal ─(user "Restart the 3D cockpit")→ initializing (fresh mount)
```

Alongside, the Phase 2 capability state in `CockpitEntry` gains exactly one
value: `'checking' | 'available' | 'unavailable' | 'lost'` — `'unavailable'`
remains "this browser never provided WebGL" (probe), `'lost'` is the runtime
terminal state (§2.3). The probe itself is unchanged and still runs once.

Recommended constants (owner decision D1): `STABILIZE_MS = 500` (delay after
`webglcontextrestored` before remounting, letting the GPU process settle),
`RESTORE_WAIT_MS = 10_000` (from loss to terminal when no restore event
arrives), `AUTO_RESTORE_BUDGET = 2` automatic restorations, with the budget
resetting after a restored scene holds `ready` for 60 s. Manual restart from
terminal is always available and is not budgeted.

### 4.2 Listener registration and loop suspension

In `GlobeCanvas`, immediately after renderer creation and **before the first
render** (plan §10.1 "register before first render"):

- `canvas.addEventListener('webglcontextlost', onLost)` — handler calls
  `event.preventDefault()` (mandatory for restoration), sets a closure-level
  `contextAlive = false`, and reports `onContextEvent('lost')` upward via a
  new prop.
- `canvas.addEventListener('webglcontextrestored', onRestored)` — reports
  `onContextEvent('restored')`. The old canvas is **not** re-rendered; the
  rebuild path replaces it (§4.3).
- The animate loop suspends on loss: with `contextAlive === false`,
  `animate()` neither calls `renderer.render` nor schedules another frame
  (no draw calls against a dead context; the rAF chain parks). `reportFrame`
  stops advancing, so `isSettled()` honestly reports unsettled during loss.
  The sizing controller obeys the same flag (§3.4's context-lost guard):
  trigger-driven syncs early-return and `onApplied()` never renders while
  the context is lost or restoring.
- Both listeners are removed in the effect cleanup (before
  `renderer.dispose()`).

The warp registers the same pair on its canvas; its `onLost` cancels the warp
loop and completes the transition immediately (§2.1, D3); `onRestored` is a
no-op (the scene is disposable and the phase has already moved on).

### 4.3 Disposal/rebuild ownership — rebuild by remount

**Decision: restoration is a full unmount → remount of the scene subtree,
not an in-place re-upload.** Grounds: §1.7's audit (no module-scope GPU
state — a rebuild is exactly re-running the builders), the PMREM environment
being unrecoverable by re-upload, deterministic transient reset for free, and
reuse of the one teardown path that StrictMode already exercises
(`cockpit-app.tsx:117-120` documents the scene being rebuilt underneath the
apply loop today).

Mechanics, in `CockpitApp`:

1. On `lost`, the controller **captures the durable snapshot first** (before
   any teardown nulls the bridge): `window.__cockpitViewMode`,
   `window.__cockpitDeck?.index` (playing record),
   `window.__getCockpitVinylHover()?.index` (crate selection, when in crate
   view). Theme and accessibility need no capture (owned outside the scene).
2. On `restoring` (after `STABILIZE_MS`), bump `rebuildKey` — `<Cockpit
   key={rebuildKey} restore={snapshot}/>` unmounts the old subtree (running
   the **completed** cleanup below) and mounts a fresh one. React guarantees
   unmount-before-mount for a changed key, which keeps F7's unconditional
   bridge nulling safe (old instance fully clears before the new registers).
3. `GlobeCanvas` threads `restore` into construction of the **three.js
   closure state**: initial `viewMode`/`focusKind` from the snapshot with
   `modeT` seeded to the settled value (1 for focused modes, 0 for cockpit)
   so restoration lands at rest, never mid-interpolation, and
   `window.__cockpitViewMode` registered with the seeded mode (amending the
   hardcoded `'cockpit'` at `globe-canvas.tsx:875`);
   `buildVinylCrate`/`buildTurntable` accept a builder-options restore seed
   (module API, **not** a window bridge change): crate marks
   `selectedIdx`/`deckOut`, turntable constructs landed-at-rest
   (`playing = index`, `landed = true`, `coverT/armT/beamT/cardT = 1`, disc
   on platter, no flight) — these are precisely the documented settle
   targets of its easings (`turntable.ts:616-624`). If implementation
   uncovers coupling that makes landed-at-rest construction unsafe, the
   recorded fallback is restoring to crate view with the selection
   preserved (owner decision D4 covers this).
4. **React HUD state is seeded from the same snapshot — never left to
   events.** `Cockpit` initializes its `viewMode` `useState` from
   `restore?.viewMode ?? 'cockpit'`, so mode-conditional chrome
   (VinylInfoCard, deck arrows, `DeckProjectLink`, the `esc · return`
   control, `ScreenDialog`'s `active` prop) renders the restored mode from
   the remounted subtree's first paint; `CockpitApp` sets its own
   `viewMode` state to the snapshot mode when it initiates the restore (it
   normally already holds it). **No synthetic `cockpit-view-mode` event is
   dispatched during restoration** — all three owners (scene closure,
   `Cockpit` state, `CockpitApp` state) initialize from the one snapshot,
   and the event remains exclusively a `setViewMode()` side effect, so
   builder listeners (`vinyl-crate.ts:549`) never observe a spurious
   transition. Getter availability is guaranteed structurally:
   `GlobeCanvas` precedes every HUD sibling in `Cockpit`'s JSX
   (`cockpit-hud.tsx:96` vs `:98-110`), so its effect — which registers
   `__getCockpitScreenRect`, `__getCockpitDeckInfo`, and the other
   projection getters — runs before any HUD polling effect starts. Deck
   controls and `ScreenDialog` therefore find live getters (with
   `playing ≥ 0` already seeded) on their first poll, with no transient
   cockpit-state mismatch. This JSX-before-HUD ordering is part of the
   contract and must be preserved.
5. The TWEAK apply loop re-arms by adding `rebuildKey` to its effect deps
   (`cockpit-app.tsx:121-149` — today `[phase]` only; §1.8), so the
   dialed-in transforms re-assert over the rebuilt scene.
6. If context creation throws during remount (`WebGLRenderer` constructor)
   or the new context is lost within the stabilization window, the attempt
   counts against `AUTO_RESTORE_BUDGET` and the machine retries or goes
   terminal.
7. `initializing → ready` is confirmed by the first `reportFrame` from the
   new loop (the §9.6.2 blank-canvas check is the test-side verification of
   the same moment).

**Outgoing-context teardown order (fixes F1/F2/F6; makes the net-zero claim
testable).** three r184's `WebGLRenderer.dispose()` frees renderer-internal
objects but does **not** release the WebGL context — the context survives
until the detached canvas is garbage-collected, and browsers cap live
contexts by evicting the oldest, so repeated rebuilds without deliberate
release could evict the *new* context. Teardown is therefore an explicit
ordered sequence, applied by both renderers:

1. Set the disposed/parked flag (no further frames are scheduled) and
   `cancelAnimationFrame`.
2. Remove the `webglcontextlost`/`webglcontextrestored` listeners
   **first**, so step 8's deliberate loss cannot echo a spurious lifecycle
   event into the state machine.
3. Remove input/theme/crate-hover listeners (the existing set,
   `globe-canvas.tsx:1149-1152,:1159`).
4. `sizeSync.dispose()` — ResizeObserver, `resize` fallback, and the
   current resolution media-query listener (§3.2).
5. Run the builder disposers and `edgeGlow.dispose()` (existing calls,
   `:1153-1160`), then the scene-graph disposal sweep — `scene.traverse`
   disposing geometries, materials, and material-owned textures, then
   `scene.clear()` — covering `glass-mac.ts` and every builder output the
   per-module disposers skip (double-dispose of the few shared geometries
   is safe/idempotent in three), plus the PMREM generator,
   `scene.environment` texture, and env-scene resources (the generator
   becomes a retained handle instead of a temporary). GPU deletions run
   here **while the context is still current**, so they take effect
   immediately instead of waiting for context destruction.
6. Null the bridge globals — the existing set (`:1161-1175`) plus the F7
   stragglers.
7. `renderer.dispose()` (renderer-internal caches, program cache, three's
   own context listeners).
8. `renderer.forceContextLoss()` — the **deliberate context release**
   (three r184 implements it via `WEBGL_lose_context`). Called
   unconditionally: on an already-lost context (the restoration path) it is
   benign, and step 2 guarantees nothing is listening.
9. Remove the canvas from the DOM and drop all references.

The warp returns this cleanup on every path including its `catch` branch
(F6). The transmission render target (F3) and anything step 5 misses die
with the deliberately released context — which is exactly what makes the
leak claim testable: after any teardown, the outgoing canvas is detached
and its context reports `isContextLost() === true` (asserted in AC-15 and
AC-19).

### 4.4 Durable restore / transient reset — contract table

| State | Class | Restoration behavior |
|---|---|---|
| Theme | durable | untouched (React + localStorage); rebuilt scene reads `window.__cockpitTheme` at build (`globe-canvas.tsx:79`) |
| Accessibility preferences | durable | untouched (provider + `data-a11y-*`); turntable re-samples reduced-motion at rebuild |
| View mode | durable | snapshot → construction seed; settled pose (`modeT` ∈ {0,1}) |
| React HUD view mode (`Cockpit`/`CockpitApp` state) | durable-derived | seeded from the same snapshot at remount (§4.3 step 4); no event replay |
| Selected/playing record | durable | snapshot → builder restore seed; deck restored landed-at-rest |
| Dialed-in transforms | durable | TWEAK apply loop re-armed on `rebuildKey` |
| Camera interpolation (`modeT`, `focusSwitch`, smoothed yaw/pitch) | transient | reset by rebuild; seeded settled |
| Disc flight / queue / pending eject / tonearm / beam / card fades | transient | reset; landed state constructed directly when restoring deck |
| Hover/pointer state, edge-glow boosts, cursor | transient | reset (at-rest = no hover) |
| Coffee liquid machine (`state`/`anim`/`level`/`dropClock`), steam/smoke, platter spin accumulation | transient | reset to authored idle |
| ScreenDialog matrix attachment | derived | re-derives from re-registered `__getCockpitScreenRect` |

### 4.5 Interaction with CockpitEntry's Phase 2 capability state

Transient loss never touches `CockpitEntry`: capability stays `'available'`,
the shell stays mounted, the document stays inert (the recovery panel is the
interactive surface). Terminal escalates via a new `onFatal` callback
(`CockpitApp → CockpitEntry`): capability becomes `'lost'`, `CockpitApp`
unmounts (→ `onMountChange(false)` releases inert/scroll automatically
through the existing effect), and the runtime notice renders (§2.2 B).
"Restart the 3D cockpit" resets to `'available'` with a fresh mount key. The
initial probe result is never overwritten by runtime events — a browser that
passed the probe but lost the context terminally is reported as an
interruption, not incapability (§2.3).

### 4.6 No double loops, no duplicate listeners, no stale bridges, no leaks

- **Single render loop:** the loop is keyed to its effect instance; loss
  parks it (§4.2); remount serialization (unmount-before-mount) means at
  most one live loop; the rebuilt `window.__cockpitTick` dispatch (F8) is
  re-registered only after the old one is nulled by the old cleanup.
- **Listener hygiene:** every listener added by the sizing controller and
  context handlers is removed in the same owner's cleanup; the media query
  is re-armed with explicit disposal of the prior listener; builder pointer
  listeners bind to the **new** `renderer.domElement` per rebuild (they are
  rebuilt with it — §1.9/F7 stays theoretical).
- **Bridge integrity:** the preserved `window.__cockpit*` names and shapes
  are re-registered by the rebuilt scene exactly as on first mount; no name,
  shape, or event changes. New code adds **no** new `__cockpit*` globals —
  restore seeds travel through React props/builder options, and lifecycle
  state is exposed only through dev-only test hooks.
- **Resource lifecycle:** §4.3's outgoing-context teardown order makes
  every rebuild net-zero on GPU, context, and listener resources; the §7
  criteria include the two-cycle soak assertion (AC-19) with the
  `isContextLost()` release check.

### 4.7 Test instrumentation (additive, development-only)

One new `__COCKPIT_TEST_HOOKS__` member (same `testHooksEnabled` guard,
absent from production bundles):

```ts
getRendererState(): {
  status: 'initializing' | 'ready' | 'lost' | 'restoring' | 'terminal'
  rebuildCount: number
  main: { cssWidth: number; cssHeight: number; dpr: number
          bufferWidth: number; bufferHeight: number
          sizeVersion: number } | null   // sizeVersion: +1 per applied
}                                        // size/DPR change (§3.4)
```

Tests force loss/restore through the standard `WEBGL_lose_context` extension
obtained from the **preserved** `__cockpitRenderer` bridge
(`renderer.getContext().getExtension('WEBGL_lose_context')`), stashing the
extension handle from the test side before triggering `loseContext()` /
`restoreContext()` — no production code paths are added for testing. The
existing `registry.sceneConstructed` latch means `configureVisualCapture`
stays a pre-first-build-only gate after rebuilds (documented in §1.8; no
change).

---

## 5. DPR performance decision protocol

`DPR_CAP` stays `2` unless the protocol below produces contrary evidence; a
change is a **policy amendment** to `lib/responsive/render-policy.ts` with
owner approval, never a local tweak (plan §8 Phase 3).

### 5.1 Measurement matrix

| Axis | Values |
|---|---|
| Viewport (CSS) | `1440×900` (reference normal), `1512×982` (high-DPR laptop representative), `3440×1440` (ultrawide), `3840×2160` (large-smoke) |
| View | cockpit rest; **crate focused**; **deck focused, record 0 landed** (the fill-rate-heavy cases: transmissive shells + PMREM + beam shader composite there, and the `transmissionSampler` render target scales with the drawing buffer — §1.7) |
| DPR (the single changed variable) | `1` vs `2`, via Playwright context `deviceScaleFactor` (config today is `1`, `playwright.config.ts:33-38`) — two otherwise-identical runs per cell |

24 cells per environment. Nothing else varies within a comparison: same
build, same machine, same power state, same theme, same motion preference.

### 5.2 Procedure

1. Build once: `next build && next start` (production bundle — no dev
   overhead, no test hooks; drive the scene through the **preserved** bridge:
   boot-enter click, `__setCockpitViewMode('crate'|'deck')`, and the
   documented `__cockpitDeck.play` — exact call shape mirrored from
   `vinyl-crate.ts:494-500` at implementation). A parallel dev-mode capture
   (hooks available: `skipIntro`, `enterView`, `playRecord`) is permitted for
   orchestration convenience, but **decision numbers come from the
   production build**.
2. Per cell: warm up 5 s, then sample 15 s (~900 frames) of rAF timestamps.
3. Record per cell (script: `scripts/perf/dpr-baseline.ts`, manual-run like
   `scripts/capture-baselines.ts`, not an npm gate):
   - frame time median / p95 / p99 / max, and FPS distribution (never
     average-only);
   - `renderer.info.render.calls` and `.triangles`;
   - `renderer.info.memory.geometries` and `.textures`;
   - `performance.memory.usedJSHeapSize` (Chromium);
   - drawing-buffer `width×height` and the observed `devicePixelRatio`;
   - bundle size (once per build, from `next build` output).
4. Record per environment: browser + version, OS, hardware model + GPU,
   power state (mains vs battery), appearance (dark/light), reduced-motion
   off, build mode, and — mandatory — the `WEBGL_debug_renderer_info`
   `UNMASKED_RENDERER`/`UNMASKED_VENDOR` strings.

### 5.3 Hardware vs SwiftShader separation

The unmasked-renderer string classifies every capture. **SwiftShader (CI,
headless software rendering) numbers can never justify a cap change** and are
never compared against hardware numbers — same discipline as the §9.6.3
per-backend baseline rule. CI may run the script as a smoke (it exercises the
harness), but the decision evidence is a hardware capture on at least one
real high-DPR laptop (the owner's machine qualifies), produced at the
explicit owner checkpoint defined in §9 step 7: Codex implements and runs
the tooling, but cannot self-certify the owner-machine capture (AC-23).

### 5.4 Acceptance thresholds and amendment evidence (owner decision D5)

Keep `DPR_CAP = 2` if, on a hardware-rendered production build at the
high-DPR laptop cell (`1512×982`, DPR 2), **both** crate-focused and
deck-focused views hold: median frame time ≤ 16.7 ms **and** p95 ≤ 33.3 ms.
If either view fails at DPR 2 while passing at DPR 1, that is the evidence
package for an owner-approved amendment (e.g. cap 1.5); the amendment
records the full §5.2 table in the policy module and this file. No
threshold breach on ultrawide/large-smoke alone justifies a change (those
cases are functional smoke, not the sharpness-critical laptop case).

### 5.5 Where the record lives

Raw captures land in `docs/baselines/phase-3-dpr/` (one JSON/MD per
environment, committed); the decision summary table and its date live in the
`DPR_CAP` docblock in `lib/responsive/render-policy.ts` (the plan's "shared
input/render policy module"). Phase 4 scorecard baselines remain untouched
and unrecorded (out of scope).

---

## 6. Contracts and documentation

Proposed amendments — none implemented in this turn:

1. **Cockpit `LayoutContract` (`app/layout-contract.ts`) — no structural
   amendment.** The recovery panel and terminal notice are stage/document
   chrome, not new protected regions; the canonical escape is already the
   declared alternative (`protectedRegions[0].alternative → '/projects'`,
   `app/layout-contract.ts:27`). `allowedAdaptations` already includes
   `'contain'`. Justification recorded here so the no-change is deliberate.
2. **DOM identifier registry** (`docs/responsive-system.md` §10 table): add
   `data-hud` values `renderer-status` (visually hidden live region),
   `renderer-recovery` (transient panel), `renderer-restart` (terminal
   restart button). The terminal notice reuses the Phase 2 notice pattern
   with a distinguishing `data-hud="cockpit-runtime-notice"`.
3. **Test-bridge contract** (`docs/responsive-system.md` §11 + the
   `CockpitTestHooks` type): add `getRendererState()` (§4.7 shape), additive
   only, same production-exclusion decision.
4. **`docs/responsive-system.md`**: add a "Renderer sizing and context
   lifecycle" subsection under §3 (or a new §3.1) carrying: the
   `syncRendererSize` contract summary, `DPR_CAP` home + amendment rule
   (§5.4), the lifecycle state machine, recovery-state wording table (§2.3),
   and the durable/transient restoration table (§4.4). Flip §12's Phase 3
   row to Delivered + commit hash at land time.
5. **`docs/hud-responsive-layout-plan.md`**: mark §2.3's resize audit
   superseded by the implemented contract; amend §4.1 step 7 to the
   buffer-only rounding form (`setSize(cssW, cssH, false)` + CSS-filled
   canvas — §3.2 rationale); mark §8 Phase 3 and §10.1 with the delivery
   commit at land time.
6. **`DESIGN.md`** — one optional durable rule is genuinely missing: how
   failure/status surfaces speak. Proposed single bullet under §11 "Dialogs
   and panels": *"Status and recovery notices use the standard panel
   anatomy: plain factual wording, palette-only treatment with jade reserved
   for the action, no alarm color, no decorative animation, and always a
   visible canonical route out."* **Approved under D2 (2026-07-31)** —
   include it in step 8; nothing else in DESIGN.md needs to change.
7. **`CLAUDE.md`/`AGENTS.md`**: compact current-state note after landing
   (per plan §11) — renderer sizing + lifecycle exist, bridge unchanged.

**No canonical content or `ContentContract` changes.** The two new runtime
notice strings are interface microcopy (like the Phase 2 notice), not
project/profile facts; no catalog, profile, approval, or content-contract
surface is touched. Nothing here requires owner content approval beyond the
copy sign-off in D2.

### Phase 2 documentation housekeeping (recorded, deliberately outside Phase 3 scope)

Kimi's two non-blocking findings, plus one staleness this design verified:

- `docs/hud-responsive-layout-plan.md:863` — the ContentContract excerpt
  still reads `'recruiter-summary'`; the code is `'professional-summary'`
  (`lib/content/content-contract.ts:12`). Note: the excerpt actually sits in
  **§A.7** (heading at plan line 747), not §A.4.2 as the QA finding labeled
  it — correct the literal where it lives.
- `docs/phase-2-design.md:733-735` — AC-14 says "6 layout contracts"; the
  implemented and validated truth is 5 (already documented at
  `docs/phase-2-acceptance-evidence.md:27-30`). Amend to "5" with a
  one-line note that the original text was a drafting slip against the §2
  route inventory.
- `docs/responsive-system.md` §12 Phase 2 row still says "no commit hash
  exists yet" — it now exists (`685eb67`).

**Recommendation:** fix all three as one owner-approved, docs-only Phase 2
housekeeping commit (no code, no contracts), sequenced before or alongside
the Phase 3 implementation PR but never mixed into Phase 3's code commits.
They do not gate, redefine, or expand Phase 3.

---

## 7. Verification and acceptance criteria

Evidence classes: **[U]** unit (`npm run test:unit`), **[B]** browser
automation (Playwright, Chromium dev server, per the Phase 0 harness
decision), **[P/M]** performance or manual evidence, **[V]** visual review.
All five gates must be green before Phase 3 is claimable.

**Sizing policy and §9.2**

- **AC-1 [U]** `computeRenderSizeTarget` rejects zero/negative/non-finite
  CSS dimensions (returns `null`), degrades invalid DPR to 1, caps at
  `DPR_CAP`, floors only buffer dimensions, and `renderSizeTargetsEqual`
  gates unchanged inputs.
- **AC-2 [B]** After cockpit mount at `1440×900`: `camera.aspect` equals
  stage CSS width/height within `0.001`; canvas CSS bounds equal stage
  bounds within `1px`; drawing-buffer dims equal CSS × capped DPR within 1
  (via `getRendererState()` + DOM measurement).
- **AC-3 [B]** Live resize `1024×600 → 1440×900` (extending the existing
  `e2e/smoke.spec.ts:83-99` check): AC-2's three equalities hold at both
  sizes after settle; the §9.6.2 blank-canvas precondition passes at both.
- **AC-4 [B]** DPR-only change (CDP `Emulation.setDeviceMetricsOverride`
  `deviceScaleFactor 1 → 2`): buffer dims double within rounding with
  exactly one `sizeVersion` increment; CSS bounds, `camera.aspect`, and a
  sampled `getHudSnapshot()` overlay/subject geometry are unchanged within
  sub-pixel tolerance (projected DOM alignment does not move on DPR
  change).
- **AC-5 [B]** Contained-stage transition (viewport `1440×900 → 800×450`):
  stage mode flips to `contained`, surface is `1024×600`, renderer resizes
  to the surface (not the viewport), aspect matches the surface, blank-canvas
  check passes; returning to `1440×900` restores fit mode and full-shell
  sizing.
- **AC-6 [P/M]** Real browser zoom 120 % / 150 % / 200 % (manual, per §9.1's
  "not a substitute" rule): content magnifies, nothing counter-scales,
  effective DPR stays ≤ `DPR_CAP`, HUD alignment intact; automated proxy via
  CDP deviceScaleFactor+viewport included in [B] but not substituted.
- **AC-7 [B]** Zero-size observations (style the mount `display:none` /
  `0×0` via test, then restore): no `NaN`/`Infinity` reaches
  `camera.aspect` or projection matrices, no WebGL error is logged, and the
  next valid observation applies cleanly.
- **AC-8 [B]** Idempotence: dispatching 20 synthetic `resize` events with
  unchanged geometry produces no renderer size/DPR churn
  (`getRendererState()` stable with `sizeVersion` unchanged, no additional
  buffer allocations via `renderer.info.memory`).
- **AC-9 [B]** Warp parity: during the warp phase, the warp canvas obeys
  AC-2's equalities against its host (measured via DOM + drawing-buffer
  props), using the same capped DPR; a mid-warp window resize keeps them.
- **AC-10 [U]** Listener/observer cleanup: controller `dispose()` removes
  the `ResizeObserver`, the `resize` listener, and the current media-query
  listener (jsdom-level harness with instrumented targets); StrictMode
  double-mount in dev leaves exactly one live controller per renderer.

**Context lifecycle**

- **AC-11 [B]** Forcing `WEBGL_lose_context.loseContext()` on the main
  renderer: `webglcontextlost` is default-prevented, the render loop stops
  scheduling within one frame (`getRendererState().status === 'lost'`,
  `frameId` stops advancing), and the recovery panel appears with
  `role`/live-region semantics per AC-16.
- **AC-12 [B]** After `restoreContext()`: the machine passes through
  `restoring`, remounts, and reaches `ready`; the §9.6.2 blank-canvas check
  (existing thresholds: ≥ 8 distinct colors, dominant share < 0.98,
  non-dominant fraction > 0.02) **passes on the rebuilt frame**;
  `rebuildCount` incremented exactly once; exactly one canvas exists in the
  stage.
- **AC-13 [B]** Durable restore: with theme=light, record 0 played and deck
  view settled → force loss+restore → `__cockpitViewMode === 'deck'`,
  `__cockpitDeck.index === 0`, `document.documentElement` keeps
  `data-theme="light"` and `data-a11y-*` values, and `isSettled()` becomes
  true without any flight (`__cockpitDeck.busy === false` throughout the
  post-restore settle); TWEAK transforms re-applied (PC world position
  matches the dialed-in pose, via existing bridge reads). Monitor-view
  variant: ScreenDialog re-attaches (`__getCockpitScreenRect().visible`).
  Contained-mode variant of monitor focus leaves region scroll offsets
  unchanged (§3.5).
- **AC-14 [B]** Transient reset: force loss mid-flight (call `playRecord`,
  lose the context while `__cockpitDeck.busy === true`): restoration lands
  in deck view, landed-at-rest, with no residual flight/queue/eject and
  settle reachable within the standard timeout.
- **AC-15 [B]** Repeated-loss terminal: exhaust the auto-restore budget
  (lose → restore → immediately lose, twice), or lose with no restore for
  `RESTORE_WAIT_MS`: `CockpitApp` unmounts; `<header>`/`<main>` are no
  longer inert; `data-document-scroll` is released; the runtime notice
  renders with `role="status"`, receives focus, and its `/projects` and
  `/about` links navigate (tier-2 canonical access); the unmounted
  cockpit's canvas is detached with its context deliberately released
  (`isContextLost() === true`, §4.3 teardown step 8); "Restart the 3D
  cockpit" remounts and reaches a rendering cockpit again.
- **AC-16 [B]** Semantics and input: the live region (`renderer-status`)
  announces loss, restoring, and restored (polite); the panel is reachable
  and operable by keyboard alone; focus lands on the panel at loss and on
  the stage container at restoration; Escape does not trap; with
  `emulateMedia({ reducedMotion: 'reduce' })` no recovery surface animates;
  with `forcedColors: 'active'` the panel and notice render in system colors
  with borders intact (existing e2e forced-colors pattern).
- **AC-17 [B]** Warp loss: forcing loss on the warp canvas mid-warp ends the
  transition immediately (cockpit phase reached ≤ the remaining warp
  duration), no error surfaces, and the cockpit then passes the blank-canvas
  check; the first-load warp `catch` path (WebGL blocked) still completes
  the phase (existing behavior) with cleanup verified (no leaked `resize`
  listener via instrumentation).
- **AC-18 [B]** First-load probe unchanged: with WebGL blocked, the Phase 2
  notice renders byte-identical wording, no inert/lock applies (existing
  `e2e/phase2-boundary.spec.ts` assertions still green, distinct from the
  AC-15 runtime wording).

**Hygiene and phase boundary**

- **AC-19 [B]** Loss/restore soak across the **full automatic budget — two
  cycles** (aligned with D1's `AUTO_RESTORE_BUDGET = 2`; the third loss is
  AC-15's terminal path, and the 60 s budget reset is deliberately not
  exercised in CI): after each cycle, exactly one canvas exists in the
  stage, exactly one render loop advances `frameId`,
  `renderer.info.memory.geometries/textures` hold the single-scene
  baseline, and each outgoing context reports `isContextLost() === true` on
  its detached canvas (§4.3 teardown step 8).
- **AC-20 [U]** `getRendererState` (and every new hook path) is behind
  `testHooksEnabled`; unit test pins the guard; no new `window.__cockpit*`
  global is introduced (assert the documented bridge name set is unchanged).
- **AC-21 [B]** The Phase 6 deck-overlap `test.fixme`
  (`e2e/smoke.spec.ts:335-351`) is still present and still skipped; the run
  reports it as skipped, not passing.
- **AC-22 [review]** Phase-boundary proof, asserted in the PR: no
  `hud-layout.ts`, no `Math.random` → seeded-stream migration, no §9.6.3
  baseline recording, no camera-fit/`getFocusTarget` change, no input-policy
  change, no deck/crate HUD anchor change, no new Playwright projects or
  browsers, no `preserveDrawingBuffer` flip on the main renderer. Diff
  review + the untouched-file list in the implementation report.
- **AC-23 [P/M — owner checkpoint]** The §5 baseline table exists in
  `docs/baselines/phase-3-dpr/` with at least one hardware capture and one
  software capture, each carrying the unmasked renderer string, and the
  `DPR_CAP` decision and date recorded in `render-policy.ts`. Division of
  labor is explicit: **Codex implements the capture tooling and runs and
  records the software capture; the hardware capture and the one-time
  `about:gpucrash` manual recovery run** (extension-based tests do not
  fully reproduce driver loss) **happen on the owner's machine and are
  certified by the owner. Codex must not self-certify either artifact**,
  and the phase cannot be claimed complete without the owner-recorded
  evidence.
- **AC-24 [V]** Visual review: recovery panel and terminal notice in both
  themes + forced colors + 200 % zoom screenshots — palette/hard-corner/no-
  shadow conformance per DESIGN.md §§2, 11, 12.

---

## 8. Risks and owner decisions

**Owner approval recorded 2026-07-31: D1–D6 were each explicitly approved
with the recommended defaults below (D2's approval covers the exact §2.2
strings and the optional DESIGN.md §11 bullet). The list stands as the
binding record for implementation:**

- **D1 — Restoration timing and retry budget.** Default: `STABILIZE_MS =
  500`, `RESTORE_WAIT_MS = 10_000`, `AUTO_RESTORE_BUDGET = 2` (reset after
  60 s of stable `ready`); manual restart unbudgeted. Rationale: covers the
  common sleep/wake and tab-eviction cases without retry storms against a
  dying driver.
- **D2 — Recovery copy and actions.** Default strings in §2.2 (panel:
  "The 3D scene was interrupted…" / "Restoring the scene…" / "3D scene
  restored."; terminal: "The 3D cockpit stopped after a graphics
  interruption and could not restart…" + Restart button; the optional
  DESIGN.md §11 bullet in §6.6). Owner approves or edits exact wording.
- **D3 — Warp-loss behavior.** Default: end the warp immediately and enter
  the cockpit; no message, no retry. Alternative (not recommended): let the
  timeout play out over a frozen frame.
- **D4 — Restored view target.** Default: return to the **last stable view
  mode at rest** (plan §10.1's own language), including deck restored
  landed-at-rest with the same record. Documented fallback if landed-at-rest
  construction proves unsafe during implementation: restore to crate view
  with the selection preserved (never mid-animation either way). Alternative
  (simpler, not recommended): always cockpit rest.
- **D5 — DPR_CAP amendment threshold.** Default per §5.4: hardware
  high-DPR-laptop production build must hold median ≤ 16.7 ms and p95 ≤
  33.3 ms in crate and deck views at DPR 2, else an amendment package goes to
  the owner. No SwiftShader-based amendment ever.
- **D6 — Review boundaries.** Default: land as the nine §9 steps in three
  reviewable commit groups — (1) sizing (steps 1–3), (2) lifecycle +
  recovery + tests (steps 4–6), (3) baselines + docs (steps 7–9) — one PR,
  three commits, rollback-separable per plan §10's boundary list.

Residual risks (no decision needed, tracked):

- **R1** — Landed-at-rest deck construction touches `turntable.ts` internals
  (`playing/landed/coverT/armT/beamT/cardT`); mitigated by the D4 fallback
  and AC-13/14.
- **R2** — `preventScroll` support in the contained-monitor path is assumed
  for evergreen Chromium (test matrix today); the scoped save/restore
  fallback is specified in §3.5 and covered by AC-13's contained variant.
- **R3** — Software-rendered CI timing: loss/restore tests assert state and
  rendered-frame facts, never frame-rate; the 10 s terminal-wait test
  consumes real wall-clock inside the existing CI budget (180 s/test) —
  acceptable, flagged for the implementer to keep serial.
- **R4** — The scene-graph disposal sweep must not dispose live shared
  resources across rebuild boundaries; safe because each rebuild owns a
  fresh scene and sweep runs on the outgoing instance only (§4.3).
- **R5** — Two simultaneous contexts during warp (main + warp) is the
  existing design; loss handling treats them independently. On
  context-starved machines the warp's own failure path (cream card /
  early-complete) bounds the exposure to ~2.5 s.

---

## 9. Codex implementation handoff

Ordered, small, reviewable steps. Verification commands per step; the five
gates run in full at the end (and per commit group per D6). No intentional
failure points are planned; the two named fallbacks (D4, R2) are decided by
evidence during steps 4–5 and recorded in the implementation report.

1. **Pure policy + tests.** Add `lib/responsive/render-policy.ts`
   (`DPR_CAP`, `computeRenderSizeTarget`, `renderSizeTargetsEqual`) and
   `tests/unit/render-policy.test.ts` (AC-1). Strict island rules (no
   `@ts-nocheck`, `import type`). Verify: `npm run typecheck:contracts`,
   `npm run test:unit`. Rollback: delete the two files.
2. **Main renderer sizing.** Add
   `components/cockpit/renderer-size-sync.ts` (`createRendererSizeSync` per
   §3.2–§3.4); wire `globe-canvas.tsx`: placeholder camera aspect, canvas
   CSS fill, replace `onResize` (`:1140-1145`) with the controller
   (RO + resize fallback + re-armed resolution MQ), initial `sync()` before
   first render, frame-start `sync()` in `animate()` (§3.4), cleanup
   ordering. Extend `e2e/smoke.spec.ts` resize test
   toward AC-2/3/7/8; add the CDP DPR-change test (AC-4). Verify: gates;
   AC-2–AC-4, AC-7, AC-8.
3. **Warp sizing parity + catch-path fix.** Same controller in
   `warp-transition.tsx` (host-measured), frame-start `sync()` at the top
   of its `tick()` (§3.4), remove `window.innerWidth` sizing, restructure
   cleanup across the `catch` path (F6). Verify: AC-9, AC-17's cleanup
   assertion.
4. **Lifecycle core + disposal completion.** Add
   `lib/responsive/context-lifecycle.ts` (pure transitions + constants;
   unit tests) and the `CockpitApp` controller (snapshot capture,
   `rebuildKey`, TWEAK re-arm, `restore` prop); `GlobeCanvas` context
   listeners + loop suspension + restore seeding (three.js closure **and**
   React HUD state per §4.3 steps 3–4);
   `buildVinylCrate`/`buildTurntable` restore options (D4 path, fallback
   documented if taken); the §4.3 outgoing-context teardown order
   (PMREM/env dispose, scene sweep, F7 bridge nulls, deliberate
   `forceContextLoss()` release). Verify: `test:unit` for transitions;
   gates stay green (no behavior change until step 5 wires UI).
5. **Recovery surfaces.** `RendererRecoveryPanel` + `renderer-status` live
   region inside the new `ResponsiveStage` wrapper in `CockpitApp` (§3.5);
   `CockpitEntry` `'lost'` state + runtime notice + restart; warp
   loss→complete. `data-hud` identifiers per §6.2. Verify: AC-5 (stage
   integration), AC-11–AC-18 groundwork manually via
   `window.__cockpitRenderer.getContext().getExtension('WEBGL_lose_context')`.
6. **Test hooks + browser suite.** `getRendererState()` (guarded);
   `e2e/phase3-renderer.spec.ts` implementing AC-11–AC-19; keep the Phase 6
   fixme untouched (AC-21). Verify: `npm run test:e2e` full.
7. **Performance baselines.** `scripts/perf/dpr-baseline.ts`; Codex runs
   and records the **software** capture in `docs/baselines/phase-3-dpr/`
   (unmasked-renderer recorded) and the decision note in
   `render-policy.ts` (§5.5). Then an **explicit owner checkpoint**: the
   hardware capture and the `about:gpucrash` manual recovery run happen on
   the owner's machine and are certified by the owner (AC-23). Codex
   implements the tooling and may prepare the runs, but must not
   self-certify either artifact; step 9 cannot close without them. No
   npm-script gate.
8. **Contracts and documentation.** §6 items 2–5 and 7 (responsive-system
   §3/§10/§11/§12, plan §2.3/§4.1/§8/§10.1, CLAUDE.md/AGENTS.md notes);
   the DESIGN.md §11 bullet (approved under D2). The Phase 2 housekeeping
   fixes (§6, housekeeping subsection) stay a separate docs-only commit and
   still await their own owner green-light — they are not covered by D1–D6.
9. **Full verification.** All five gates; AC-6 real-zoom manual pass;
   AC-23/AC-24 evidence attached (AC-23's hardware and `about:gpucrash`
   items owner-certified per step 7 — never Codex-self-certified);
   implementation report lists AC coverage, untouched-boundary proof
   (AC-22), and any fallback taken.

Expected new files: `lib/responsive/render-policy.ts`,
`lib/responsive/context-lifecycle.ts`,
`components/cockpit/renderer-size-sync.ts`, the recovery panel component,
`tests/unit/render-policy.test.ts`, `tests/unit/context-lifecycle.test.ts`,
`e2e/phase3-renderer.spec.ts`, `scripts/perf/dpr-baseline.ts`,
`docs/baselines/phase-3-dpr/*`. Expected modified files:
`components/cockpit/globe-canvas.tsx`, `warp-transition.tsx`,
`cockpit-app.tsx`, `cockpit-entry.tsx`, `vinyl-crate.ts`, `turntable.ts`,
`test-hooks.ts`, `e2e/smoke.spec.ts`, `docs/responsive-system.md`,
`docs/hud-responsive-layout-plan.md`, `CLAUDE.md`/`AGENTS.md` (+ optional
`DESIGN.md` line). Rollback boundaries: steps 1–3 (sizing) revert cleanly
without steps 4–6 (lifecycle); step 7 is additive evidence; step 8 is
docs-only.
