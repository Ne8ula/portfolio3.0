# Phase 4 Design — Shared Geometry and Projection Contract

**Status:** OWNER APPROVED — D1–D8 all approved with the recommended
defaults on 2026-08-05, explicitly including the four-commit Phase 4
exception to AGENTS.md's one-commit-per-phase default (D8) and the
baseline authority rules (D7). Ready for Codex implementation per §9 with
the §10 commit boundaries.
**Author:** Claude (design lead) · **Date:** 2026-08-05 · **Base:** `main` @
`2048eff` (Phase 3 delivered: renderer sizing, DPR policy with owner-retained
`DPR_CAP = 2`, context recovery, accessibility recovery presentation, and
recorded acceptance evidence at `d9756de`/`2048eff`; working tree clean).

Scope is exactly plan §8 Phase 4
(`docs/hud-responsive-layout-plan.md:2047-2062`):

1. the pure `hud-layout` geometry API and shared spacing tokens (§3 layout
   law);
2. one stage-relative CSS-pixel coordinate contract for every projection
   output (plan §5.1–5.2);
3. conversion of the monitor, deck, and crate projection outputs to that
   contract, with validity rules and a frame identifier;
4. one focused-HUD sampler replacing every per-overlay `requestAnimationFrame`
   poll, with bounded last-valid behavior (plan §5.3);
5. the development-only `?hudDebug=1` overlay;
6. named seeded random streams for all 53 current `Math.random()` invocations
   (plan §9.6.5), wired through `configureVisualCapture()` with a frozen
   ambient clock;
7. deterministic scorecard capture and the first backend-specific §9.6.3
   baselines (color entropy, edge density, luminance contrast, dominant-color
   share), SwiftShader and hardware kept separate.

Out of scope, by phase discipline: Phase 5 camera fitting (`getFocusTarget`
framing points, distance solve, input normalization); the Phase 6 deck-HUD
overlap fix and deck re-anchoring; Phase 7 crate re-anchoring; Phase 8 matrix
expansion. The `resolveFocusHudLayout` solver is **defined and unit-tested in
Phase 4 but not applied to live placement** — Phases 6/7 consume it. Existing
placement remains visually unchanged at the reference viewport, including the
known deck overlap. three.js stays imperative; the `window.__cockpit*` bridge
is preserved exactly; all new test instrumentation is additive,
development-only `__COCKPIT_TEST_HOOKS__` members; `preserveDrawingBuffer`
stays `false` on the production main renderer; global `Math.random` is never
patched; browser zoom is never counter-scaled.

Owner-approved design directions recorded 2026-08-05 (pre-design Q&A):

- **Hardware scorecard baselines are owner-run and owner-certified**, same
  protocol shape as the Phase 3 DPR checkpoint; agents produce the tooling
  and the SwiftShader/CI baseline.
- **Module split:** all pure math (projection validity, conversion, solver,
  tokens, PRNG) lives in the strict `lib/` island with full unit coverage;
  `components/cockpit/hud-layout.ts` (the plan-named file) is a thin pure
  re-export for the `@ts-nocheck` cockpit tier.

---

## 1. Scope and verified current-state audit

Every claim verified against the live tree at `2048eff`. Line numbers will
drift during implementation; symbol names are given alongside. Phase 3 is
delivered at `d9756de`/`2048eff` (the committed implementation report reads
`READY FOR FRESH INDEPENDENT QA`); this design treats it as complete.

### 1.1 Projection getters today — five shapes, five validity policies

All getters compute **canvas-relative** CSS coordinates from
`renderer.domElement.getBoundingClientRect()` and assume the canvas origin is
the stage origin (true today because the mount fills the stage; never
guaranteed by contract):

| Getter | Source | Output shape | Validity policy today |
|---|---|---|---|
| `__getCockpitScreenRect` | `globe-canvas.tsx:710-747` (`xray.getScreenRect`) | quad `{corners:{TL,TR,BL,BR}, visible}` or `{visible:false}` or `null` | all 4 corners view-z `< -0.1`, back-face dot `≥ 0.02`, all 8 numbers finite |
| `__getCockpitPCRect` | `globe-canvas.tsx:750-780` | rect or `null` | `Box3.setFromObject` **per call**, 8 corners, **any** corner view-z `< -0.05` suffices; no finite check |
| `__getCockpitCrateRect` | `vinyl-crate.ts:814-836` | rect or `null` | same any-in-front Box3 pattern |
| `__getCockpitVinylHover` | `vinyl-crate.ts:841-862` | point + semantic `{index,count,x,y,title,category,date}` or `null` | rejects only post-projection `p.z > 1` |
| `__getCockpitDeckCardRect` | `turntable.ts:999-1013` | rect or `null` | authored 4 card corners; rejects `p.z > 1` per corner; no view-z near check |
| `__getCockpitDeckInfo` | `turntable.ts:994-996` | semantic `{index,count,busy}` or `null` | mode + `playing ≥ 0` |
| `__getCockpitAnchors` | `globe-canvas.tsx:1030-1046` | array of `{id,x,y}` points | per-point view-z `< -0.1` |

Behind-camera behavior is inconsistent (any-corner vs all-corner vs
post-projection-z), no output is finite-checked except the screen quad, no
output carries a frame identifier, and nothing distinguishes "valid but
off-stage" from "missing" except by accident. Nothing is clamped (good — the
no-clamp rule already holds).

### 1.2 Seven independent per-overlay rAF loops

`components/cockpit/cockpit-hud.tsx` runs one `requestAnimationFrame` poll
loop **per overlay**, each calling `setState` unconditionally every frame
with a fresh object identity (a per-frame React render per overlay):

| Component | Loop | Reads |
|---|---|---|
| `ObjectTags` | `:636-646` | `__getCockpitAnchors`, `__cockpitHoveredTag` |
| `PCHoverHighlight` | `:691-700` | `__getCockpitPCRect` (Box3 every frame even when not hovering) |
| `CrateHoverHighlight` | `:742-751` | `__getCockpitCrateRect` (same) |
| `VinylInfoCard` | `:792-801` | `__getCockpitVinylHover` |
| `DeckProjectLink` | `:876-887` | `__getCockpitDeckInfo` + `__getCockpitDeckCardRect` |
| `BrowseArrows` | `:914-926` | both deck getters (via props) |
| `ScreenDialog` | `:1006-1016` | `__getCockpitScreenRect` |

Two ad-hoc last-valid policies exist, both violating the plan's bounds:

- `BrowseArrows` retains the last card rect **indefinitely**
  (`setRect(prev => next || prev)`, `:921`) — unbounded grace, and the stale
  rect state survives a mode exit (a re-entry can render one stale frame).
  Its fallback anchor also reads `window.innerWidth` (`:932`) — a document
  measure, not a stage measure.
- `ScreenDialog` flags the last rect `hidden` (`:1011`) rather than clearing
  it.

### 1.3 Frame identity and snapshot atomicity today

`registry.frameId` increments once per `animate()` frame via
`reportFrame(settled)` (`test-hooks.ts:233-237`; called at the loop tail).
Getter outputs are not stamped. `getHudSnapshot()` (`test-hooks.ts:490-543`)
reads all rects inside one rAF callback — single-task, but its callback's
position in the rAF order relative to `animate()` is registration-order luck,
and overlay DOM rects are read from whatever React last committed. The
provisional safe frame is a bare 16px inset (`PROVISIONAL_EDGE_GUTTER`,
`:387`).

### 1.4 Randomness census — 53 invocations, 42 source lines, 7 modules

Verified live (matches plan §9.6.5 exactly):

| Module | Lines (invocations) | What it randomizes | When |
|---|---|---|---|
| `boot-screen.tsx` | `:32`, `:198` (2), `:517` — 3 lines / 4 calls | glitch glyph pick, glitch jitter transform | **runtime, per render frame** (DOM boot phase) |
| `coffee.ts` | `:52-57`, `:96` — 6 / 6 | steam-glyph sheet, mug glaze noise | build (texture paint) |
| `glass-mac.ts` | `:39-40`, `:73-75`, `:474-475` — 7 / 10 | screen scanline noise, case speckle, mousepad speckle | build |
| `globe-canvas.tsx` | `:190-191`, `:828-829` — 4 / 4 | starfield (700 pts), globe city points (120 pts) | build (geometry scatter) |
| `incense.ts` | `:35-40`, `:57-61` — 9 / 11 | smoke-glyph sheet, stick speckle | build |
| `tea-set.ts` | `:32`, `:55-65` — 9 / 11 | glaze tone, etch/lace strokes | build |
| `vinyl-crate.ts` | `:65-66`, `:175-176` — 4 / 7 | cover paper grain, top-edge wear | build |

Everything except `boot-screen.tsx` is **construction-time** randomness
(textures and scattered geometry). Smoke/steam sprite phases are authored
constants (`[0, 0.37, 0.71]`, `coffee.ts:414-419`, `incense.ts:160-164`) —
not random. `decorations.ts`, `turntable.ts`, `materials.ts`, `decals.ts`,
`highlights.ts`, `project-textures.ts`, and `vinyl-motion.ts` contain no
`Math.random`.

### 1.5 Clocks and ambient motion inventory

One `THREE.Clock` (`globe-canvas.tsx:1048`) drives `dt`/`t`; consumers:

- **camera/mode interpolation** — `modeT` ease `:1058`, smoothed yaw/pitch
  `:1088-1090` (interaction mechanics, not ambient);
- **mechanical sequences** — deck flight/queue/eject easings in
  `turntable.ts` (land at exact authored rest values), crate sleeve cascade,
  coffee pour state machine (interaction mechanics);
- **ambient motion** — platter spin accumulation (`spin.rotation.y += dt*1.6`,
  `turntable.ts:1096`), holo-card bob (`Math.sin(elapsed*1.4)`,
  `turntable.ts:1180`) and shimmer (`sin(elapsed*42)`, `:1186`), steam/smoke
  sprite drift (`coffee.ts:569-571`, `incense.ts:174-176`), ember flicker
  (`incense.ts:182`), edge-glow pulse (`highlights.ts:84`), the small
  tBox/tRing rotations (`globe-canvas.tsx:1065-1067`), and the pulled
  record's **continuous disc spin while selected**
  (`v.disc.rotateY(dt * 1.4 · …)`, `vinyl-crate.ts:928` — indefinite,
  interaction-`dt`-driven today, ambient by classification);
- **click-triggered bounded transients** — the shaker wiggle/slosh
  (`tickShake`, `decorations.ts:725-740`) and the tablet stylus draw
  (`drawT`), both pointer-initiated, self-terminating envelopes
  (interaction mechanics, not ambient — capture never triggers them).

**Single tick functions mix lanes internally**: `turntable`'s per-frame
tick uses `dt` for both the ambient platter spin and the mechanical
cover/flight easings (`turntable.ts:1094+`); `coffee.tick` drives both its
interaction state machine and ambient smoke from the same `dt`
(`coffee.ts:490+`). The frozen-clock wiring (§4.4) therefore cannot work
by swapping the arguments of a whole tick call — it must hand every tick
function both lanes.

**No time-driven shader uniform exists in the main cockpit scene** (verified:
the only `uTime`-style uniforms are the warp's three shader materials,
`warp-transition.tsx:308-382`; the warp is disposable, never mounted on the
`skipIntro()` capture path, and out of capture scope). The turntable tether
probe's `ShaderMaterial` instanceof check (`turntable.ts:829`) is a counter,
not a shader.

### 1.6 Capture lifecycle groundwork already in place

`configureVisualCapture()` (`test-hooks.ts:391-414`) validates
`{seed, timeMs, pauseAmbient: true}` and **already throws after
`skipIntro()` or scene construction**; `registry.sceneConstructed` latches at
first build and never resets (`:226-229`), so capture configuration is
possible only on a fresh page load — intended, kept. The config is stored but
**consumed by nothing** — Phase 4 wires it. The §9.6.2 blank-canvas
precondition is live in e2e (≥ 8 distinct colors, dominant share < 0.98,
non-background fraction > 0.02) and independent of seeding.

### 1.7 Phase 3 facts this design builds on

- Frame-start `sizeSync.sync()` runs first in `animate()`
  (`globe-canvas.tsx:1052`); camera aspect updates strictly before render and
  before any HUD read — no torn stage-size/aspect frame can exist.
- The canvas CSS-fills its mount; unrounded CSS geometry is authoritative;
  `getRendererState()` exposes `sizeVersion`.
- The stage element is `[data-layout-region="cockpit-stage"]`
  (`cockpit-hud.tsx:88-95`), wrapping the `GlobeCanvas` mount; contained mode
  sizes it to the `1024×600` `ResponsiveStage` surface.
- Rebuild-by-remount recovery re-registers every getter; anything Phase 4
  adds must re-register identically and reset its store on teardown.

---

## 2. Coordinate and geometry contracts

### 2.1 Canonical space: stage coordinates

One space for every HUD geometry value (promoting `docs/responsive-system.md`
§3 to a full contract):

- **Origin:** the top-left corner of the stage element's **padding box**
  (`[data-layout-region="cockpit-stage"]`): `getBoundingClientRect().left +
  clientLeft`, `.top + clientTop`. Absolutely positioned HUD children
  resolve against the padding box, not the border box; the stage is
  borderless today (the two origins coincide), but the contract carries the
  `clientLeft/clientTop` terms so a future border cannot silently skew every
  overlay. Corollary: the stage element must remain border-free or the
  conversion terms do the work — either way the contract holds.
- **Axes:** `+x` right, `+y` down.
- **Units:** unrounded CSS pixels (floats). Never device pixels, never
  drawing-buffer pixels; DPR must never appear in any HUD position (§3
  invariant: a DPR-only change moves nothing).
- **Rect:** `{ x, y, w, h }` with `w ≥ 0`, `h ≥ 0` — the existing
  `lib/responsive/geometry.ts` type.
- **Inclusivity:** as already pinned by `geometry.ts` — `contains()` is
  edge-inclusive; `intersects()` treats exactly-touching edges as
  non-intersecting (shared edge = legal adjacency). New code adopts these
  semantics unchanged.
- **Finiteness:** every published rect/point/quad number must satisfy
  `Number.isFinite`. A producer that cannot guarantee this returns `null`;
  `isFiniteRect()` is the gate. `NaN`/`Infinity` must never reach a style
  property.

### 2.2 Stage viewport vs document viewport

- Stage rect and canvas rect are sampled **in the same frame** by the sampler
  (§3), both via `getBoundingClientRect()` (viewport-relative).
- Document→stage conversion is subtraction of the same-frame stage
  padding-box origin: `xStage = xViewport - (stageRect.left +
  stage.clientLeft)`. The existing `relativeTo()` in
  `test-hooks.ts:376-383` subtracts only `stageRect.left/top` — correct
  today solely because the stage is borderless; it gains the
  `clientLeft/clientTop` terms in step 8 to match this contract.
- NDC→stage is the plan §5.1 formula, made explicit about the canvas/stage
  offset and the padding-box origin:

  ```
  stageOriginX = stageRect.left + stage.clientLeft   // padding-box origin
  stageOriginY = stageRect.top  + stage.clientTop
  x = (canvasRect.left - stageOriginX) + (ndcX * 0.5 + 0.5) * canvasRect.width
  y = (canvasRect.top  - stageOriginY) + (-ndcY * 0.5 + 0.5) * canvasRect.height
  ```

  Today the offset term is `(0,0)` because the mount fills the stage — which
  is exactly why the conversion is numerically identity at the reference
  viewport and visual parity holds. The contract stops relying on it.
- **No `window.innerWidth/innerHeight`, `scrollX/scrollY`, or document
  coordinates anywhere in HUD geometry.** The `BrowseArrows` viewport clamp
  (`cockpit-hud.tsx:932`) converts to the same formula against `stage.w` —
  a pure coordinate-space conversion (identical value in fit mode at the
  reference viewport), not a re-anchor.
- **Contained-stage scroll offsets** need no special term: when the
  `ResponsiveStage` pannable region scrolls, the stage element's
  `getBoundingClientRect()` shifts with it, and same-frame subtraction
  yields correct stage-local values. HUD overlays are absolutely positioned
  children of the stage (their offset parent is the stage box), so
  stage-local values map 1:1 to `left/top` regardless of pan position. A
  scroll between two frames is corrected at the next sampler frame — within
  the plan §9.3 two-frame settle allowance.
- Browser zoom changes CSS viewport and DPR only; nothing detects or
  counter-scales it (§A.2, preserved).

### 2.3 Projection output types

```ts
// lib/responsive/stage-projection.ts (strict island, three-free)
export type ProjectedPoint = { x: number; y: number }          // stage px
export type ProjectedRect = Rect & {
  visible: boolean          // raw rect intersects the stage rect
  sourceFrameId: number     // frame whose camera produced this geometry
}
export type ProjectedQuad = {
  corners: { tl: ProjectedPoint; tr: ProjectedPoint;
             bl: ProjectedPoint; br: ProjectedPoint }
  bounds: Rect              // axis-aligned enclosure of the corners
  visible: boolean
  sourceFrameId: number
}
```

`ProjectedPoint`s (selection anchor, tags) carry no per-point identifier —
their provenance is the enclosing snapshot's `frameId` (§2.5); only
rects/quads carry `sourceFrameId`, because only the retained deck card can
ever legitimately differ from the snapshot frame (§3.4).

The lib module is **three-free**: cockpit code performs
`world.project(camera)` and passes plain `{ndcX, ndcY, ndcZ, viewZ}` samples
plus the two same-frame rects; the lib functions do validity + conversion.
Conceptual conversions:

- **monitor** → `ProjectedQuad` from the four authored screen corners
  (`glass-mac.ts:403-408`); the back-face test stays where it is (it needs
  camera/world data) and reports as invalid (`null`), preserving today's
  behavior.
- **deck** → `ProjectedRect` from the four authored card corners.
- **crate** → `ProjectedRect` from the crate bounds corners, plus the
  selection anchor as a `ProjectedPoint` with its semantic payload.
- **PC hover / anchors** → `ProjectedRect` / `ProjectedPoint[]` under the
  same rules (they ride along so every projection in the system speaks one
  contract).

### 2.4 Validity rules (plan §5.2, made exhaustive)

Validity is judged against the **actual camera clip range** — the caller
passes `camera.near` (today `0.1`, `new THREE.PerspectiveCamera(68, 1, 0.1,
2000)` at `globe-canvas.tsx:128`) into the pure validity function; no
hard-coded epsilon may disagree with the real frustum (geometry WebGL clips
must never be reported valid). A projection is **`null`** — never a garbage
rect — when any of:

1. canvas or stage CSS dimensions are zero/non-finite;
2. **any defining point is not strictly in front of the camera near plane**:
   view-space `z >= -near` is invalid (equality rejected — a point on the
   near plane is clipped). One rule, ending the `-0.1`/`-0.05`/none
   inconsistency; the any-corner acceptance in the PC/crate getters becomes
   all-corner under the contract;
3. any defining point projects beyond the far plane (`ndcZ > 1`);
4. any resulting number is non-finite;
5. resulting `w <= 0` or `h <= 0` — width and height must be **positive**
   (plan §5.2's exact requirement; a degenerate zero-area projection is
   invalid, not an empty-but-valid rect).

A projection **outside the stage but in front of the camera is valid**: the
raw unclamped rect is returned with `visible: false` when it does not
intersect the stage rect (per `intersects()` semantics, gap 0). **The
projected subject rect is never clamped** — clamping destroys the evidence
that camera framing is wrong (plan §3).

**Outdated-frame rule — two identifiers with distinct meanings:**

- `HudFrameSnapshot.frameId` (§3.1) is the frame at which the snapshot was
  **computed**; every value in one snapshot object shares it.
- Each rect/quad's `sourceFrameId` is the frame whose camera matrices
  **produced its geometry**. For every live projection,
  `sourceFrameId === snapshot.frameId`. The single sanctioned exception is
  the retained deck card during a swap (§3.4), which keeps its **original**
  `sourceFrameId` (honest provenance — restamping would falsify it) and is
  flagged `retained: true`.

Consumers may only use values from one snapshot object (§3 guarantees this
structurally). Test assertions treat any comparison mixing snapshot objects
as invalid evidence, and treat `sourceFrameId ≠ frameId` without
`retained: true` as a contract violation.

The preserved `window.__getCockpit*` getters keep their exact current shapes
and semantics — they are the live-tuning bridge and existing e2e surface.
The HUD stops polling them; they are not the contract path.

### 2.5 Frame identifier

- **Owner: production code.** The counter is a module-scope monotonic
  value in `components/cockpit/hud-sampler.ts` (production module),
  incremented by the `GlobeCanvas` render loop — the only rAF loop in the
  cockpit. It cannot live in the dev registry: `reportFrame()` is
  statically a no-op in production (`test-hooks.ts:210` guard), so the
  registry's self-incrementing counter would leave production snapshots
  frozen at `0`. Ownership inverts: **`reportFrame(settled, frameId)`
  gains a second parameter and mirrors the production value into the dev
  registry without incrementing anything** (internal reporting API, not
  the window bridge; its old self-increment is removed — no
  double-increment path exists).
- **Increment:** exactly `+1` once per executed `animate()` frame, after
  `sizeSync.sync()` and final camera matrix updates, immediately before the
  sampler computes (§3.2). A parked loop (context `lost`/`restoring`) does
  not increment — zero advancement while parked.
- **Monotonic across rebuilds — no reset.** The module-scope production
  counter survives scene rebuilds, matching the observable semantics the
  dev registry has always had (`test-hooks.ts:233-237` never reset), so
  the legacy top-level `frameId` keeps its current meaning unchanged.
  `getRendererState().rebuildCount` remains the epoch discriminator for
  tests. One counter, mirrored — no divergence.

### 2.6 Shared tokens and the pure layout API

`lib/responsive/hud-layout.ts` (strict island) is the **single home** of the
plan §3 tokens — never repeated as numeric literals in JSX:

```ts
export const HUD_EDGE_GUTTER = 16        // minimum stage-edge clearance
export const HUD_SUBJECT_GAP = 14        // subject-to-satellite clearance
export const HUD_COLLISION_GAP = 8       // clearance between HUD elements
export const HUD_MIN_HIT_SIZE = 44       // minimum control box (CSS px)
export const HUD_RECT_EPSILON = 0.25     // publication equality tolerance
export const HUD_RECT_GRACE_MS = 350     // deck swap only; never mode exit
export const HUD_COMPACT_HYSTERESIS = 8  // compact-mode exit slack
```

(No near-plane token: the near distance is the camera's own `near`, passed
by the caller — §2.4. `DPR_CAP` stays in `lib/responsive/render-policy.ts`
— render policy, not HUD layout; `hud-layout` re-exports nothing from it.)

The module also holds
`computeSafeFrame(stage, reservations: Insets = ZERO_INSETS)` — the stage
inset by `HUD_EDGE_GUTTER` on all four sides, then by the caller's
`reservations` (an `Insets`, composed via `insetRect`). **In Phase 4 the
safe frame is edge-gutter-only**: every runtime caller (sampler snapshot,
debug overlay, upgraded hook) passes zero reservations, making it exactly
the 16 px inset the provisional hook already reports — deliberately, so no
dev-hook value changes and no reservation number is invented before it can
be measured. Mode-specific reservation values (return control, hint,
arrows, info card — plan §6.2's list) are **measured and pinned by
Phases 6/7**, the phases that measure those overlays; solver unit fixtures
meanwhile exercise `reservations` with synthetic values, so the parameter
is proven without canonizing guesses. The module also holds
`rectsAlmostEqual(a, b, epsilon)` (added to `geometry.ts`), the
`FocusHudLayout` types, and the `resolveFocusHudLayout()` solver (§3.6).
These are starting token values validated during baseline capture; a QA
change edits the shared token and re-runs the viewport matrix — never a
per-component fork.

`components/cockpit/hud-layout.ts` — the plan-mandated path — is a **pure
re-export shim** of the lib API for the `@ts-nocheck` cockpit tier: no DOM,
no three, no logic. Unit tests target the lib modules directly.

---

## 3. Projection and focused-HUD sampler architecture

### 3.1 One sampler, one snapshot

`components/cockpit/hud-sampler.ts` — a module-scope store (no window
global, no DOM events, per plan §5.3 "do not dispatch a bubbling DOM event
every frame"):

```ts
type HudFrameSnapshot = {
  frameId: number
  stage: Rect                          // { 0, 0, w, h } stage-local
  canvasOffset: ProjectedPoint         // canvas origin in stage coords
  mode: 'cockpit' | 'monitor' | 'crate' | 'deck'
  safeFrame: Rect                      // computeSafeFrame — edge-gutter-only
                                       // in Phase 4 (§2.6)
  monitor: ProjectedQuad | null
  deck: {
    info: { index: number; count: number; busy: boolean } | null
    card: (ProjectedRect & { retained: boolean }) | null
  }
  crate: {
    rect: ProjectedRect | null         // cockpit-view hover bounds
    selection: {
      index: number; count: number
      anchor: ProjectedPoint | null
      title: string; category: string; date: string
    } | null
  }
  pc: ProjectedRect | null             // cockpit-view hover bounds
  anchors: ReadonlyArray<{ id: string; x: number; y: number }> | null
  hoveredTag: string | null
}

subscribeHudFrame(listener: () => void): () => void
getPublishedHudFrame(): HudFrameSnapshot | null   // stable ref for React
getLiveHudFrame(): HudFrameSnapshot | null        // fresh every frame (dev/tests)
resetHudSampler(): void                           // scene teardown/rebuild
```

The sampler is **production code** (it drives the real HUD); only the extra
diagnostic hooks around it are dev-only. It is mode-aware ("focused"):
each frame computes only what the current mode's HUD consumes —
`monitor` quad in monitor view; `deck.info/card` in deck view; `crate.*` in
crate view; `anchors` + `pc`/`crate.rect` in cockpit view, the two Box3
bounds computed **only while the corresponding hover is active** (removing
today's always-on per-frame `Box3.setFromObject`, an incidental win with no
visual change — brackets render only while hovering).

Subject data reaches the sampler through **internal module APIs, not the
window bridge**: builders expose world-space providers on their returned
groups (the established `getFocusTarget`/`getScreenRect` pattern) — e.g.
`turntable.getCardCornersWorld(out)`, `crate.getSubjectBoundsWorld(out)`,
`crate.getSelectionAnchorWorld(out)`, `xray.userData.screenCorners` — and
the sampler performs projection **centrally** with the §2.4 rules: one
projection implementation instead of five divergent ones. The
`window.__getCockpit*` getters remain byte-for-byte as today.

### 3.2 Ordering within the frame

```
animate():
  1. sizeSync.sync()            // Phase 3 — stage size + camera aspect final
  2. simulation ticks           // __cockpitTick(dt,t), mechanics, easings
  3. camera pose finalized      // modeT/focus interpolation, matrices updated
  4. frameId++                  // the hud-sampler module-scope production
                                // counter (§2.5) — the ONLY increment
  5. hudSampler.compute(frameId) → live snapshot; publish if changed (§3.3)
  6. renderer.render(scene, camera)
  7. reportFrame(settled, frameId) // mirrors into the dev registry;
                                   // never increments (§2.5)
```

The snapshot is therefore always computed from the exact camera and stage
geometry of the frame being rendered — never a stale aspect (Phase 3's
frame-start sync) and never a pre-tick pose. React listeners fire inside the
rAF callback; React commits before or after paint per its scheduling, and
any commit lag is bounded by the §9.3 two-frame settle allowance, which
tests already honor. Resize deliveries between frames are latency
optimizations only; the frame-start sync remains the guarantee.

### 3.3 Publication policy — epsilon-gated, not every-frame

The live snapshot is recomputed every frame; **listeners are notified only
when it differs from the last published snapshot**:

- any **semantic** change (mode, hovered tag, index/count/busy, any
  null↔non-null or `visible`/`retained` flip) → publish;
- any **spatial** number differing by more than `HUD_RECT_EPSILON`
  (0.25 CSS px, max-abs) → publish;
- a `sizeVersion` change or scene rebuild → publish unconditionally.

**The comparator compares only spatial coordinates and semantic state.**
Explicitly excluded from equality: `frameId`, every `sourceFrameId`,
counters, deadlines, and retained-grace remaining time — these advance
every frame by design, and a naive whole-object numeric comparison would
publish continuously at rest, defeating the gate (and AC-8). The compared
field set is enumerated in code (a pinned comparator over the spatial and
semantic fields), not derived generically from the object.

The honest promise: **zero publications for geometrically static frames**
(vs. seven unconditional `setState` calls per frame today) — cockpit rest
with no hover, or any view under the frozen ambient clock. Normal deck
rest is **not** geometrically static: the holo card deliberately bobs
±0.012 world units (`turntable.ts:1179`), several CSS pixels at deck
framing, so it periodically exceeds the 0.25 px epsilon and publishes —
correctly, because intentional subject motion must reach the HUD; the gate
removes redundant work, never real motion. During camera motion, one
publication per frame drives all overlays as one batched React render. React consumption is a
`useSyncExternalStore` hook (`useHudFrame()`) over
`subscribeHudFrame`/`getPublishedHudFrame` — the published reference is
stable between notifications (no tearing). Overlays keep their exact current
placement math, only re-based on snapshot fields; entrance animations keep
the `tagFadeIn` wrapper split (outer positions, inner animates).

### 3.4 Bounded last-valid projection (deck swap only)

Owned by the sampler, not by components:

- While `mode === 'deck'` **and** `deck.info.busy === true` **and** the card
  projection has gone invalid: the sampler republishes the last valid card
  rect with `retained: true`, under a **350 ms deadline** (`performance.now()`
  wall clock from the frame it went invalid), **cleared and committed by
  the deadline plus at most two frames** — expiry is checked at frame
  granularity and React commits lag a frame; AC-9 asserts exactly this
  bound. The
  retained rect keeps its **original** `sourceFrameId` (§2.4's sanctioned
  exception — provenance stays honest while the snapshot's `frameId`
  advances).
- **Invalidation events** — retained geometry clears to `null` immediately,
  whichever comes first:
  1. any mode change away from `deck` (the "never after mode exit" rule —
     exit clears within the same frame's publication);
  2. grace expiry;
  3. arrival of a fresh valid card rect (replaces retention);
  4. `busy` returning `false` without a valid rect;
  5. context loss / scene rebuild — with a two-stage contract that keeps
     the parked diagnostic read (§5.2) honest without ever exposing
     pre-loss geometry to a live scene: **loss** calls
     `parkHudSampler()` — publication stops, any retained-grace state
     clears, and the last computed snapshot is kept aside as
     `lastComputedBeforePark` solely for parked diagnostic reads;
     **rebuild** (new scene construction) calls `resetHudSampler()` —
     everything including `lastComputedBeforePark` is cleared **before**
     the new scene's first compute, so no post-rebuild snapshot can carry
     pre-loss geometry.
- **After grace expiry, mid-swap:** the live deck mechanics can keep the
  card invisible for longer than any short grace — a swap chains a ~0.6 s
  eject, ~0.42 s sleeve extraction, and ~0.72 s inbound flight
  (`turntable.ts` swap sequencing, ~`:890`) — so expiry **while still
  `busy`** is the normal case, not an edge case. The designed outcome:
  `deck.card` becomes `null`, and the dependent controls (arrows,
  `DeckProjectLink`) **hide entirely** until a fresh valid projection
  arrives. They must **never fall back to stage-edge placement** — the
  legacy "no rect means viewport edges" behavior stays dead. `busy` keeps
  them disabled throughout, so hiding removes no available action.
- No other subject has grace: the monitor quad and crate outputs go `null`
  the frame they become invalid. `BrowseArrows`' unbounded `prev` retention
  and `ScreenDialog`'s `hidden`-flag retention are removed; both consume the
  snapshot.

This satisfies plan §9.3's deck-swap row: arrows stay put through the
one-frame null (retained rect), controls hide rather than jump to stage
edges when the card is legitimately gone longer, and nothing survives a
mode exit.

### 3.5 No per-overlay loops — enforcement

After Phase 4, `cockpit-hud.tsx` contains **zero** `requestAnimationFrame`
calls (asserted; §8 AC-7), and the `GlobeCanvas` render loop is the only
**projection/HUD sampling** loop. Other rAF usage legitimately remains and
is out of scope: the disposable warp loop, the boot-screen DOM
typewriter/glitch loops (boot phase only, not overlay projection), and
`cockpit-app.tsx`'s bounded 180-frame TWEAK apply loop and one-shot focus
callback (transform dial-in, not overlays). New overlays must consume
`useHudFrame()`.

### 3.6 `resolveFocusHudLayout` — solver defined now, applied in Phases 6/7

Pure function in `lib/responsive/hud-layout.ts`:

```ts
type FocusHudInput = {
  kind: 'deck' | 'crate'
  stage: Rect
  safeFrame: Rect
  subject: Rect                       // unclamped projected subject
  chrome: readonly Rect[]             // measured immovable stage chrome
  sizes: {
    hint: Size                        // full one-line form
    hintCompact: Size                 // measured compact/rail form
    arrow: Size
    info?: Size
  }
  previousCompact: boolean
}
type FocusHudLayout =
  | {
      status: 'placed'
      hint: Rect | null               // null = hidden (nonessential)
      previous: Rect; next: Rect
      info?: Rect
      compact: boolean
    }
  | {
      status: 'unsatisfiable'
      failed: 'info' | 'arrows'      // first mandatory element with no
    }                                 // legal placement (hint never fails —
                                      // it hides)
```

**Unsatisfiable semantics:** the hint is the only element allowed to
disappear; if the info card or the arrow pair has no legal placement after
exhausting every priority tier, the solver returns
`{ status: 'unsatisfiable', failed }` rather than emitting a
constraint-violating rect. This is reachable only in degenerate geometry
below the support floor (the safe frame smaller than the mandatory
elements); the consuming policy — keep the previous layout and surface the
condition — belongs to Phases 6/7, but the representation must exist now so
the API never has to lie. Compact mode solves with the **measured**
`hintCompact` size, not a scaled guess.

- **Solve order (collision precedence):** immovable chrome (return control
  etc., inputs) → **info card** (fewest legal placements: below → above →
  widest collision-free safe-frame strip, width clamped to the safe frame,
  never to a viewport constant) → **arrows as one balanced pair** (beside
  subject left/right, vertically centered → horizontal rail above/below in
  the nearest collision-free band → stage-edge placement only if it clears
  the subject; never independently clamped after placement) → **hint**
  (centered above subject → centered below → compact rail form → hidden).
  Each element must clear all previously placed elements by
  `HUD_COLLISION_GAP`, stay inside the safe frame, keep `HUD_SUBJECT_GAP`
  off the subject, and interactive rects keep ≥ `HUD_MIN_HIT_SIZE`.
- **Deterministic tie-breaking:** candidates are evaluated in the fixed
  priority order above; the first fully satisfying candidate wins. Where a
  step has parametric freedom ("widest strip", "nearest band"): maximal
  width/nearest distance first, then minimal `y`, then minimal `x`.
  Obstacle input order must not affect output: the solver canonicalizes the
  obstacle list by sorting on `(y, x, w, h)` before evaluation. Same input ⇒
  same output, bit-for-bit.
- **Compact mode:** entered when the hint's priorities 1–2 fail at full
  size. Exit only when a full-size placement succeeds with
  `HUD_COMPACT_HYSTERESIS` (8 px) slack beyond `HUD_COLLISION_GAP`
  (`previousCompact` carries the state; the function stays pure).
- **Phase 4 wiring:** unit tests + the debug overlay may visualize the
  solved layout; **live placement does not change** — Phase 6 (deck) and
  Phase 7 (crate) adopt the solver and fix the overlap. This is the plan §8
  boundary and repeats AGENTS.md's "do not fix the deck overlap early".

---

## 4. Deterministic random-stream and clock design

### 4.1 Seeded stream API — `lib/random/seeded-streams.ts` (strict island)

```ts
export type RandomStream = { next(): number }      // uniform [0, 1)
export type RandomSource = {
  readonly seeded: boolean
  stream(name: string): RandomStream               // memoized per name
}
export function createRandomSource(seed: string | null): RandomSource
```

- **Algorithm (pinned so baselines survive refactors):** per-stream state =
  `xmur3(seed + "\u0000" + name)` — the separator is the NUL escape sequence
  **written textually in source**, never a raw control byte. A separator
  alone cannot prevent collisions unless the inputs exclude it, so
  `createRandomSource`/`stream()` **throw on any seed or name containing
  U+0000** (validated input, collision-free concatenation by
  construction) — hashed to four 32-bit words feeding **sfc32**. Known-answer test vectors are recorded in the unit tests; any
  algorithm change is a breaking change that invalidates all scorecard
  baselines and must say so.
- **Seed derivation:** per-stream independence comes from the name being
  hashed into the state — a call-count change in one subsystem can never
  shift another subsystem's values (§9.6.5's decorrelation requirement).
  `stream(name)` is memoized: requesting the same name twice continues the
  same sequence.
- **Unseeded mode (`seed = null`)** — the production path: `next()`
  delegates to `Math.random()`. Natural variation is preserved bit-for-bit;
  the global is **never patched** in any mode; determinism exists only when
  a test explicitly configured a seed before scene construction.

### 4.2 Source lifetime and wiring

`GlobeCanvas` creates one `RandomSource` at scene-construction time:
`createRandomSource(getVisualCaptureSeed())`, where `getVisualCaptureSeed()`
is a dev-only read of `registry.visualCapture` in `test-hooks.ts` (returns
`null` in production **statically** — same `NODE_ENV` inlining as the rest
of the bridge, so production builds construct an unseeded source with zero
test-path code). The source is passed to builders through their existing
options objects — a module API change, **not** a bridge change. Boot-screen
imports a module-level unseeded source (boot precedes any capture
configuration and is skipped by `skipIntro()`; migrated for completeness and
future-proofing, per "new randomness accepts a seedable named stream").

### 4.3 Stream names and migration map (every call site)

| Stream name | Call sites migrated | Notes |
|---|---|---|
| `starfield` | `globe-canvas.tsx:190-191` | 700-point scatter |
| `globe-cities` | `globe-canvas.tsx:828-829` | 120-point scatter |
| `glass-mac/screen-noise` | `glass-mac.ts:39-40` | screen texture scanlines |
| `glass-mac/surface-speckle` | `glass-mac.ts:73-75` | case speckle |
| `glass-mac/pad-speckle` | `glass-mac.ts:474-475` | mousepad texture |
| `vinyl-crate/cover-grain` | `vinyl-crate.ts:65-66` | sleeve paper grain |
| `vinyl-crate/edge-wear` | `vinyl-crate.ts:175-176` | top-edge wear |
| `tea-set/glaze` | `tea-set.ts:32` | glaze tone |
| `tea-set/etch` | `tea-set.ts:55-65` | lace/etch strokes |
| `coffee/steam-glyphs` | `coffee.ts:52-57` | steam glyph sheet |
| `coffee/noise` | `coffee.ts:96` | mug glaze noise |
| `incense/smoke-glyphs` | `incense.ts:35-40` | smoke glyph sheet |
| `incense/stick-speckle` | `incense.ts:57-61` | stick texture |
| `boot/glitch` | `boot-screen.tsx:32,198,517` | runtime DOM glitch (unseeded in practice) |

14 named streams, 53 invocations. Texture-paint helpers take a
`RandomStream` parameter; each generator function draws from exactly one
named stream so intra-module call-order stays local. The implementation
report must reproduce this table with post-migration line numbers; the
verification is `grep -rn "Math.random" app/ components/ lib/` returning
**only** the single delegation line inside `seeded-streams.ts`.

### 4.4 Frozen ambient clock — `pauseAmbient` semantics

Capture mode splits time into two lanes (the §1.5 inventory decides which
lane each consumer is on). Because single tick functions mix both lanes
internally (§1.5), lane delivery cannot work by swapping a whole tick
call's arguments. The mechanism is a **four-value internal frame-times
contract** that leaves every existing tick signature and registration
untouched, housed in a dedicated **`components/cockpit/frame-times.ts`**
module (module-scope holder + `setFrameTimes()`/`getFrameTimes()` —
internal API, not a window global). The times are established **from each
invocation's own arguments**: the dispatch function assigned to
`window.__cockpitTick` calls `setFrameTimes(dt, t, captureState)` first
and then dispatches, so a **manual** `window.__cockpitTick(dt, t)` bridge
call reaches every consumer with exactly the supplied arguments (outside
capture, `dtAmbient = dt`, `tAmbient = t`) — never a previous frame's
stale module-scope values; the preserved bridge's observable behavior is
unchanged. `GlobeCanvas` sets the same times at frame start for its
in-loop consumers (edge glow, tBox/tRing). Tick functions keep receiving
`(dt, t)` through their existing chains — those arguments are the
interaction lane — and each ambient-classified line reads
`getFrameTimes().dtAmbient/tAmbient` instead: the turntable's platter
spin reads `dtAmbient` while its flight easings keep `dt`; the crate's
selected-record disc spin (`vinyl-crate.ts:928`) reads `dtAmbient` while
its pull/tilt mechanics keep `dt`; coffee's state machine keeps `dt`
while its smoke reads `tAmbient`; the decorations' shaker/stylus
transients keep `dt` (interaction). **The public
`window.__cockpitTick(dt, t)` bridge keeps its two-argument shape, its
assignment, and its call site.** Outside capture mode all four values
equal today's `dt`/`t`, so non-capture behavior is byte-identical.

- **Ambient lane** — receives `dtAmbient = 0`, `tAmbient = timeMs / 1000`
  every frame while capture is active: platter spin accumulation (static at
  its authored rest angle), the selected-record disc spin in the crate
  (static), holo-card bob and shimmer (fixed at
  `f(timeMs)`), steam/smoke drift and opacity (fixed at `phase(timeMs)`),
  ember flicker, edge-glow pulse, tBox/tRing rotations, coffee pour-stream
  wobble. Production and non-capture dev behavior is byte-identical to
  today (`dtAmbient = dt`, `tAmbient = clock.elapsedTime`).
- **Interaction lane** — camera/mode transitions and mechanical sequences
  (deck flight, sleeve cascade, coffee state machine) must still complete so
  `enterView`/`playRecord` can settle. In capture mode, camera/mode easing
  **snaps** (`modeT = target`, smoothed yaw/pitch = targets) — transitions
  land exactly, removing asymptotic-ease float noise from captures.
  Mechanical sequences run on real `dt`, but their runtime easings do
  **not** converge to exact targets on their own: `coverT`/`armT`/`beamT`/
  `cardT` are asymptotic interpolations (`x += (tgt − x)·min(1, dt·k)`,
  `turntable.ts:1101-1166`), today's settle signal clears once errors fall
  below `0.02` while the values keep creeping
  (`reportDeckTransient`, `turntable.ts:1168+`), and `coverT` is not
  consulted by the settle signal at all — so a "settled" frame can still
  visibly move the cover, tonearm, tether, and card. (Phase 3's
  exact-value easings apply only to *restoration construction*, which
  seeds them at 1 directly — not to runtime convergence.) Capture mode
  therefore adds **completion snapping**: while capture is active, every
  mechanical easing whose completion condition holds is snapped to its
  exact target (0 or 1) at frame end — crate tilt/hover/disc easings
  (`vinyl-crate.ts:920-928`) included — and `isSettled()` reports settled
  **only after all snaps have been applied**, so settled ⇒ byte-stationary
  mechanics. Non-capture behavior is unchanged.
- **Shader uniforms:** none exist in the main scene (§1.5); the acceptance
  audit re-verifies at implementation time, and any future time uniform must
  take `tAmbient`.
- The capture frame is therefore a **fixed point**: with capture active, two
  reads of the drawing buffer any number of frames apart are pixel-identical
  on the same backend (§8 AC-16 asserts literal equality on SwiftShader).

`configureVisualCapture()` keeps its Phase 0 lifecycle guard (late call
throws — including after a rebuild, via the permanent `sceneConstructed`
latch) and now actually takes effect: seed → `createRandomSource`, `timeMs`
→ the ambient lane, `pauseAmbient: true` → lane split active. A capture
config with the scene already built is impossible by construction, not by
convention.

---

## 5. Debug and capture instrumentation

### 5.1 `?hudDebug=1` development overlay

`components/cockpit/hud-debug-overlay.tsx`, mounted by the cockpit HUD only
when **both** hold: `process.env.NODE_ENV !== 'production'` (statically
eliminated from production bundles — the proven test-hooks mechanism) and
`hudDebug=1` present in `location.search` (read once at mount).

Renders, from the same sampler subscription (no own rAF loop):

- the **safe frame** (edge-gutter-only in Phase 4, §2.6) — 1 px dashed
  cream-deep outline;
- the **projected subject** (rect or quad, including off-stage/unclamped
  extents and the `retained` state, dash-marked) — 1 px jade outline;
- **occupied HUD rects** — each `[data-hud]` element's measured stage-local
  rect (read on publication; dev-only cost accepted) — 1 px mauve outline
  with its `data-hud` name in 9 px mono;
- a corner readout: `frameId`, mode, stage `w×h`, `sizeVersion`,
  publication count, retained-grace remaining.

Rules: hard corners, no fills above 4% opacity, no shadows, jade as the only
chromatic accent (palette-conformant even though dev-only). DOM/A11y
behavior: one wrapper with `aria-hidden="true"`, `pointer-events: none`,
zero focusable elements, `data-hud-debug-overlay` — **deliberately not
`data-hud`**, so it never appears in `getHudSnapshot().overlays`, the
occupied-rect list, or any contract scan. It never intercepts input, never
joins the accessibility tree, and adds no announcement. Production
exclusion is triple-guarded: static `NODE_ENV` elimination, a unit test
pinning the guard, and the production-bundle grep (the Phase 3 evidence
pattern) asserting the overlay marker strings are absent from the shipped
artifact.

### 5.2 Test-hook upgrades (additive, dev-only)

- `getHudSnapshot()` is re-implemented on the sampler with **explicit
  resolution semantics for all three loop states** (it must never hang):
  - **running** — resolves after the **next live compute** (the sampler
    recomputes every frame regardless of publication, §3.3), i.e. within
    one frame even at rest with zero publications. It never waits for a
    publication — that would deadlock against the epsilon gate (AC-8).
  - **at rest** — same as running: the next frame's compute resolves it.
  - **parked** (context `lost`/`restoring` only) — resolves **immediately**
    with `lastComputedBeforePark` (the diagnostic copy `parkHudSampler()`
    set aside at loss, §3.4), `parked: true`, and a frozen `frameId`;
    after the rebuild's `resetHudSampler()` that copy is gone and only
    fresh post-rebuild computes are ever served. **Full teardown is not a
    parked state**: teardown resets the sampler, and a call with no
    mounted scene falls back to the hook's existing stage-not-mounted
    rejection — the parked-resolution promise covers loss/restoring only. This preserves the existing Phase 3 behavior that
    `e2e/phase3-renderer.spec.ts` asserts (two calls 250 ms apart during
    loss return the same `frameId`). A 250 ms internal deadline backstops
    the running path: if no compute arrives (e.g. loss races the call), it
    degrades to the parked resolution rather than waiting forever.
- **What is and is not single-frame:** all values inside one
  `HudFrameSnapshot` come from one sampler compute (one `frameId`).
  Overlay DOM rects are **as-committed React output** and belong to an
  older **published** frame — at rest the live `frameId` keeps advancing
  while the committed one stays fixed, so live geometry can never satisfy
  an equality handshake against the DOM. The hook therefore returns
  **both frames** (nested, see the adapter below): `liveFrame` — the
  fresh compute — and `publishedFrame` — the last **published** snapshot
  object, geometry included — plus `overlaysCommittedFrameId`, read from
  the `data-hud-frame="<publishedFrameId>"` attribute the HUD root stamps
  on the stage element in a layout effect after each commit — a
  **dev-only** stamp (`testHooksEnabled`-guarded effect; production DOM
  never carries the attribute). The DOM comparison path is: assert
  `overlaysCommittedFrameId === publishedFrame.frameId`, then compare
  overlay DOM rects against **`publishedFrame`'s geometry** — the very
  values React rendered from. At settled rest this handshake holds by
  construction (no publications in flight); the §9.3 two-frame settle
  allowance covers the transient case.
- **Compatibility adapter — every legacy top-level field is byte-preserved;
  all new data is nested.** The two coordinate conventions genuinely
  differ — today's top-level `stage.x/y` are **viewport** coordinates
  (`test-hooks.ts:499`), the new `HudFrameSnapshot.stage` is stage-local
  `{0, 0, w, h}`; and the legacy monitor subject can be a
  `{ visible: false }` object while the new contract collapses invalid
  projections to `null`. Overloading the same field names would silently
  break `e2e/smoke.spec.ts` and every other existing consumer, so the
  legacy fields are left **completely untouched** and the new contract
  lives under two nested keys:

  | Top-level field | After Phase 4 |
  |---|---|
  | `stage` | unchanged — viewport-coordinate rect, exactly today's values |
  | `subject` | unchanged — legacy per-mode derivation and shapes, including the monitor `{ visible: false }` case and `null` in cockpit mode |
  | `overlays` | unchanged — all `[data-hud]` rects via `relativeTo()` (which gains the §2.2 `clientLeft/clientTop` terms — value-identical today) |
  | `safeFrame` | unchanged — the 16 px edge inset (which Phase 4's edge-gutter-only `computeSafeFrame` reproduces exactly, §2.6) |
  | `frameId` | unchanged — the current frame counter |
  | **`liveFrame`** (new) | the fresh `HudFrameSnapshot` — stage-local contract, `mode`, `monitor` quad, `deck`, `crate`, `pc`, `anchors`, `hoveredTag`, per-rect `sourceFrameId`/`retained` |
  | **`publishedFrame`** (new) | the last published `HudFrameSnapshot` — the DOM-comparison reference |
  | **`overlaysCommittedFrameId`**, **`parked`** (new) | handshake and loop-state flags |

  No legacy field changes shape, coordinate space, or `null`-vs-object
  semantics; no owner approval for a breaking hook change is needed.
- New members (same registry/guard pattern):
  - `getVisualCaptureState(): { active: boolean; seed: string | null;
    timeMs: number | null; streams: readonly string[] }` — which named
    streams were actually created (asserts migration coverage);
  - `getHudFrameMeta(): { frameId: number; computeCount: number;
    publishCount: number; sizeVersion: number;
    graceRemainingMs: number | null }` — the epsilon-gate observable
    (AC-8) plus the values the debug overlay readout displays (§5.1);
  - `getVisualAssetState(): { pending: number; failed: number;
    total: number }` — the **visual-asset readiness barrier** (§5.3).
    Every asynchronous visual-asset writer registers with a dev-only
    counter in the test-hooks registry when it starts and reports
    completion **or failure**: turntable cover decodes that redraw the
    card (`turntable.ts:405`), crate cover repaints on `Image.onload`
    (`vinyl-crate.ts:131`), and every mounted `makeDecal()`
    fetch/rasterize — **eight live instances today** (call sites
    `turntable.ts:282`, `glass-mac.ts:416`, `vinyl-crate.ts:360`; the
    ~70-sheet micrographics library is the asset pool, not the per-scene
    fetch count) — whose `img.onerror` currently reports nothing
    (`decals.ts:29+`); the dev-only counter makes that failure countable
    without changing production behavior.
- No new `window.__cockpit*` global. The bridge name-set assertion uses the
  **authoritative pinned set** established in §7.3 item 5 (the live-code
  enumeration, which includes `__getCockpitDeckCardRect`).

### 5.3 Scorecard capture harness

`scripts/perf/visual-scorecard.ts` (manual-run, patterned on
`scripts/perf/dpr-baseline.ts`; never an npm gate):

1. Runs against a **development server** — deliberate and documented:
   deterministic capture requires `configureVisualCapture`, which is
   dev-only by design (§9.6.5: "determinism is a test-build behavior").
   The scorecard guards scene composition; production-shaped smoke stays
   with the §9.6.2 blank-canvas check and §9.7 human review.
2. Per cell, strictly serial (§6.4): fresh page with the cell's theme
   pre-seeded via `context.addInitScript()` writing
   `localStorage['cockpit-theme']` (the Phase 3 DPR-harness method) →
   **explicitly load the exact font descriptors** the canvas textures draw
   with (`document.fonts.load('<weight> <size> "<family>"')` per
   family/weight actually used by the painters), then await
   `document.fonts.ready` and assert `document.fonts.check()` for each —
   mandatory before any scene construction, because texture painters
   capture glyph metrics at paint time and `glass-mac.ts:509-511`
   re-paints asynchronously after `document.fonts.ready`; a capture racing
   that redraw (or baking fallback-font metrics into early-built textures)
   is nondeterministic →
   `configureVisualCapture({ seed, timeMs, pauseAmbient: true })` →
   `skipIntro()` → **assert the resolved theme** (`window.__cockpitTheme`
   and the document appearance attribute match the cell) →
   `enterView(view)` (+ `playRecord(0)` for deck) → `isSettled()` →
   **visual-asset barrier**: await `getVisualAssetState().pending === 0`
   (bounded timeout); the cell **fails** on timeout or on
   `failed > 0` — an asset that never resolves or errors is a failed
   cell, never a silently different frame →
   **blank-canvas precondition** (unchanged thresholds; a blank frame
   invalidates the cell) → §9.6.2 buffer read (in-frame forced
   `renderer.render` + `toDataURL()` in the same task via the preserved
   bridge; `preserveDrawingBuffer` untouched) → metric computation.
3. Records the renderer identity (unmasked vendor/renderer, mandatory) and
   classifies software vs hardware with the same rejection rules as the DPR
   harness.

Metric definitions — **pinned to exact formulas** (changing any is a
baseline-breaking change; `metricsVersion` increments):

- **Decode:** `toDataURL()` PNG → `ImageData` at full drawing-buffer
  resolution. The alpha channel is **discarded** (the main renderer is
  `alpha: false`; every pixel is treated as opaque). All math operates on
  the stored 8-bit sRGB bytes — no gamma linearization (deliberate: the
  metrics compare like-with-like against baselines produced identically).
- **Sample grid:** `strideX = ceil(W / 256)`, `strideY = ceil(H / 256)`;
  samples at `(i·strideX, j·strideY)` for
  `i = 0 … floor((W−1)/strideX)`, `j = 0 … floor((H−1)/strideY)` — origin
  `(0,0)` top-left, nearest-neighbor (no averaging).
- **Quantization:** `bin = (R >> 4) << 8 | (G >> 4) << 4 | (B >> 4)`
  (4 bits/channel, 4096 bins) over the sample set.
- **Color entropy:** Shannon entropy `−Σ p·log2(p)` (bits) over the bin
  distribution.
- **Dominant-color share:** `max(p)` over the same distribution.
  **Background is defined as the dominant bin** (no per-view mask — the
  §9.6.3 rationale for this metric); `nonBackgroundFraction =
  1 − dominantShare`; `distinctColors` = count of occupied bins.
- **Luminance:** `Y = 0.2126·R + 0.7152·G + 0.0722·B` (float, 0–255)
  per sample. **Luminance contrast** = population standard deviation of
  `Y ÷ 255`.
- **Edge density:** standard 3×3 Sobel kernels (`±1/±2`) applied to the
  `Y` values **on the sample grid** (grid-adjacent samples are kernel
  neighbors); magnitude `= sqrt(Gx² + Gy²) / 4` (the `/4` normalizes the
  kernel gain back to the 0–255 scale); a sample is an edge when magnitude
  `> 24`. **Interior samples only** — the one-sample border is excluded
  from both numerator and denominator (no padding/reflection). A grid with
  no interior samples (either dimension < 3) defines `edgeDensity = 0`.
- **Golden fixtures [U]:** unit tests pin all four metrics against
  synthetic `ImageData` with hand-computed values, each at least **5×5**
  so the interior-only Sobel has real samples — flat color (entropy 0,
  dominant 1, edges 0, contrast 0), an 8×8 checkerboard, an 8×8
  horizontal step edge, a two-color 75/25 split, and a sub-3×3 degenerate
  grid pinning the `edgeDensity = 0` zero-denominator rule — so any drift
  in the arithmetic is caught before it invalidates baselines.

**Error capture (plan §9.6.4 — required, not optional):** for every cell
the harness records console `error`/`warning` entries, uncaught exceptions,
unhandled rejections, and network failures — defined as **request
failures** (network errors and aborts) **plus unexpected `4xx`/`5xx`
responses**; redirects (`3xx`) and `304` cache revalidation are normal
responses, not failures.
Any entry not matching the explicit allowlist **fails the cell**. The
allowlist **starts empty** — the weather/geolocation feature (and its CORS
fallback) was removed from the application by owner decision 2026-07-28,
so no weather entry may be seeded; the known `/_vercel/insights/script.js`
404 is added only if a fresh implementation-time run actually observes it.
Every entry carries a reason comment and review date; entries that stop
matching are removed, not kept. Per-cell diagnostics (matched-allowlist counts, zero unexpected
entries) are recorded in the baseline JSON.

---

## 6. Scorecard baseline protocol

### 6.1 Matrix, sample count, canonical capture config

First baselines (Phase 8 expands, never re-creates):

- **Viewports:** `1440×900` (reference), `1512×982` (owner laptop).
- **Views:** cockpit rest, crate focused, deck focused (record 0 landed).
- **DPR:** 1 and 2. **Theme:** dark and light (theme inversion is exactly
  what luminance contrast guards).
- = **24 cells** per environment; **3 fresh-page repeats** per cell, serial.
- **Canonical capture config (D2):** `seed = "ax-cockpit-phase4-v1"`,
  `timeMs = 12000`, `pauseAmbient: true` — recorded in every baseline file;
  changing either mints a new baseline set.

### 6.2 Baseline file format

`docs/baselines/phase-4-scorecard/<environment-id>.json` + a human `.md`
summary, one pair per environment:

```jsonc
{
  "schemaVersion": 1,
  "environmentId": "software-swiftshader-YYYY-MM-DD",
  "capturedAt": "RFC 3339 UTC",
  "git": { "commit": "…", "dirty": false },
  "renderer": { "unmaskedVendor": "…", "unmaskedRenderer": "…",
                "classification": "software" },          // or "hardware"
  "browser": "…", "os": "…", "buildMode": "development",
  "capture": { "seed": "ax-cockpit-phase4-v1", "timeMs": 12000,
               "pauseAmbient": true,
               "sampleGrid": 256, "quantBits": 4, "sobelThreshold": 24,
               "metricsVersion": 1 },
  "cells": [{
    "viewport": { "id": "reference-normal", "w": 1440, "h": 900 },
    "view": "deck", "dpr": 2, "theme": "dark",
    "repeats": [ { "entropy": 0, "edgeDensity": 0, "luminanceContrast": 0,
                   "dominantShare": 0, "distinctColors": 0,
                   "nonBackgroundFraction": 0 } /* ×3 */ ],
    "median": { /* per metric */ },
    "band":   { "entropy": [0, 0] /* per metric: [lo, hi] */ },
    "diagnostics": { "unexpectedErrors": 0,
                     "allowlistMatches": { "<pattern-id>": 0 } }
  }],
  "history": [{ "date": "…", "commit": "…", "reason": "initial baseline" }]
}
```

`git.dirty` must be `false`: captures run from a **clean checkout of the
commit that contains the harness** (commit 3 in §10) — the sequencing
exists precisely so this is achievable for both the Codex SwiftShader run
and the owner hardware run; a dirty-tree capture is rejected by the harness
(mirroring the DPR harness's dev-server rejection).

### 6.3 Tolerance bands, comparison, and rebaselining

- **Band derivation (D3):** per metric per cell, centered on the repeat
  median with half-width `max(floor, 2 × max|repeat − median|)`; floors:
  entropy `0.35` bits; edge density `max(0.015, 20% of median)`; luminance
  contrast `max(0.01, 15% of median)`; dominant share `0.06`.
- **Backend separation (restating the hard rule):** a capture is compared
  **only** against a baseline with matching renderer **identity**, not
  merely matching classification: hardware requires an exact
  `unmaskedRenderer` string match, and software requires the expected
  **SwiftShader** identity recorded in the baseline (another software
  rasterizer — llvmpipe, WARP — is a different backend, not a SwiftShader
  substitute; the checker rejects it). The checker
  errors on any cross-backend comparison; SwiftShader and hardware baselines
  are never merged, averaged, or substituted. A GPU/driver/OS change on the
  owner machine means a **new** owner-certified hardware baseline, not a
  band widening.
- **Over-band results** must be investigated and either fixed or
  rebaselined with a `history` entry (date, commit, reason) — **never
  silently** (plan §9.6.3). Rebaseline authority (D7): hardware baselines
  are owner-certified only; SwiftShader baselines may be re-recorded by
  engineering with independent QA verification and an owner-visible history
  entry.
- The scorecard answers "did the render collapse"; §9.7 human review still
  answers "does it read well".

### 6.4 Capture provenance and host protection

- **SwiftShader baseline:** recorded by Codex (CI-shaped, bundled Chromium,
  SwiftShader forced) from a clean checkout of the harness commit (§10
  commit 3), committed in the evidence commit (§10 commit 4).
- **Hardware baseline:** an explicit **owner checkpoint** (per the recorded
  pre-design decision): the owner runs the harness on their machine
  (headed, real Chrome channel, mains power) and certifies the artifact in
  `docs/baselines/phase-4-scorecard/OWNER-CHECKPOINT-<date>.md` (template
  provided, mirroring Phase 3's). Agents must not run or certify the
  hardware capture; the phase cannot close without it.
- **Saturation control (the Phase 3 QA lesson — 6-worker software-WebGL
  saturation produced 26 timeout failures):** the harness runs cells
  **strictly serially** — one browser, one context, one page at a time,
  page closed between cells, bounded per-cell timeout, and refuses to start
  if it cannot get a fresh port/server. Heavy capture and the e2e gate must
  never run concurrently on one host; the README states this, and QA runs
  the e2e suite serially/partitioned on software-WebGL hosts as already
  established. E2E determinism tests (AC-14–AC-16) sample **one** viewport
  cell, not the full matrix — the matrix belongs to the manual harness.

---

## 7. Accessibility, production exclusion, and required amendments

### 7.1 Accessibility invariants (unchanged behavior, new mechanisms)

- The sampler changes **how** overlays receive geometry, not what renders:
  reduced-motion, forced-colors, high-contrast, reduced-transparency,
  large-text/controls states and their precedence are untouched and
  re-verified by the existing e2e patterns after rewiring.
- Epsilon gating affects only sub-quarter-pixel geometry churn; every
  semantic change (labels, disabled states, visibility) publishes
  immediately — no assistive-tech-visible state can be swallowed.
- The debug overlay is `aria-hidden`, non-interactive, unfocusable, adds no
  live region, and exists only in development; it is exempt from AA contrast
  targets (diagnostic chrome) but still palette-conformant.
- Boot/warp accessibility behavior (operable ACCESSIBILITY trigger,
  reduced-motion static boot) is untouched — `skipIntro` remains a dev-only
  bypass.

### 7.2 Production-exclusion inventory

| Item | Mechanism |
|---|---|
| `configureVisualCapture` wiring, `getVisualCaptureState`, `getHudFrameMeta`, `getVisualAssetState`, upgraded `getHudSnapshot` | existing `testHooksEnabled` static guard; absent from production bundles |
| `data-hud-frame` commit stamp (§5.2 handshake) | dev-only: the stamping layout effect is `testHooksEnabled`-guarded, so production DOM never carries the attribute; documented as a reserved instrumentation attribute alongside `data-hud-debug-overlay` |
| Seeded capture path | `getVisualCaptureSeed()` returns `null` statically in production → unseeded source → `Math.random()` delegation; production randomness byte-identical to today |
| `hud-debug-overlay` | static `NODE_ENV` guard + unit test + production-bundle grep evidence |
| Sampler | production code (ships); adds no window global, no event, no test dependency |
| Scorecard harness | repository script, never bundled, never an npm gate |

### 7.3 Contract and documentation amendments (none structural)

1. **`app/layout-contract.ts` — no amendment.** No new route, region, or
   protected-region semantics; the sampler and debug overlay are stage
   mechanics/diagnostics. Recorded here so the no-change is deliberate.
2. **`docs/responsive-system.md`:** promote the §2 coordinate contract into
   §3 (stage space, validity, frame id, epsilon/grace tokens as a new §3.2);
   update §11's `CockpitTestHooks` shape (new members, upgraded
   `getHudSnapshot`); §12 Phase 3 row → Delivered + commit hash, Phase 4 row
   at land time; §13's randomness rule marked delivered with the stream-name
   registry; note `data-hud-debug-overlay` and the dev-only
   `data-hud-frame` commit stamp as reserved non-contract instrumentation
   attributes in the §10 table's vicinity; **extend the §10 `data-hud`
   registry** with the four identifiers Phase 4 adds so every rewired
   overlay is observable (§8 AC-4): `object-tag` (one per rendered tag,
   disambiguated by `data-tag-id="pc|crate|turntable|coffee"`),
   `pc-hover-brackets`, `crate-hover-brackets`, `deck-project-link`. These
   are production DOM attributes on existing elements — instrumentation
   identifiers, not new UI. **Placement matters for the bracket SVGs:**
   both span the full stage (`position:absolute; inset:0`,
   `cockpit-hud.tsx:716,767`), so the identifier attaches to a
   content-bounding inner `<g>` wrapping the bracket geometry — never the
   stage-spanning `<svg>` wrapper — or every occupied-rect consumer (debug
   overlay, `overlays` scan, fixtures) would report the entire stage as
   occupied.
3. **`docs/hud-responsive-layout-plan.md`:** mark §2.2's HUD audit and §5's
   projection contract as implemented (supersession notes), §8 Phase 4 row
   with the delivery commit at land time.
4. **`DESIGN.md` — no amendment required.** No new durable visual rule: the
   debug overlay is development chrome under existing palette law; tokens
   are engineering values, not doctrine.
5. **`CLAUDE.md`/`AGENTS.md`:** compact current-state note at land time
   (sampler exists, cockpit `Math.random` gone, capture protocol location).
   **One bridge-documentation correction is required before AC-22 can be
   implemented:** the live code exposes `__getCockpitDeckCardRect`
   (`turntable.ts:999`, typed in `test-hooks.ts`), but CLAUDE.md's
   "preserve exactly" getter list omits it. The **authoritative name set
   is the live-code enumeration**, pinned here literally (34 names,
   grep-verified at `2048eff`; the AC-22 constant is exactly this list —
   any addition or removal fails the assertion):
   - *documented in CLAUDE.md:* `__cockpitScene`, `__cockpitCamera`,
     `__cockpitRenderer`, `__cockpitTableGroup`, `__cockpitPC`,
     `__cockpitKeyboard`, `__cockpitVinyl`, `__cockpitTurntable`,
     `__cockpitFPV`, `__cockpitCoffee`, `__cockpitDecor`, `__cockpitTick`,
     `__setCockpitViewMode`, `__cockpitViewMode`, `__cockpitDeck`,
     `__getCockpitScreenRect`, `__getCockpitPCRect`,
     `__getCockpitCrateRect`, `__getCockpitAnchors`,
     `__cockpitHoveredTag`, `__getCockpitVinylHover`,
     `__getCockpitDeckInfo`, `__cockpitVinylSelect`;
   - *live but previously undocumented — CLAUDE.md's list gains
     `__getCockpitDeckCardRect` (the one contract-relevant omission); the
     rest are pinned as legacy tuning/diagnostic slots, preserved as-is
     and excluded from the documented API:* `__getCockpitDeckCardRect`,
     `__cockpitTheme`, `__cockpitCube`, `__getCockpitCubeScreenTarget`,
     `__cockpitGLBDebug`, `__cockpitGLBLoaded`, `__cockpitHoverPC`,
     `__cockpitIncense`, `__cockpitSmoothedYaw`, `__cockpitSmoothedPitch`,
     `__cockpitTeaSet`.

   No other contract-relevant discrepancy was found in the audit.
6. **No canonical content, `ContentContract`, catalog, profile, or approval
   change.** Nothing here touches `content/portfolio-approvals.json`.

---

## 8. Acceptance criteria

Evidence classes as in Phase 3: **[U]** unit, **[B]** browser automation
(Chromium dev server), **[P/M]** performance/manual, **[V]** visual review.
All five gates green before the phase is claimable.

**Geometry and projection contract**

- **AC-1 [U]** `stage-projection`: NDC→stage conversion exact against hand
  computed fixtures including a nonzero canvas offset and nonzero
  `clientLeft/clientTop`; validity takes the caller's `camera.near` and the
  boundary fixtures pin it — `viewZ = -near` exactly (invalid, equality
  rejected), `viewZ` in the `(-0.1, -0.05)` interval with `near = 0.1`
  (invalid — the interval the old hard-coded epsilon would have wrongly
  accepted), `viewZ` just beyond `-near` (valid); beyond-far
  (`ndcZ > 1`), non-finite, zero-dimension canvas/stage, and degenerate
  `w <= 0 || h <= 0` projections each return `null`; off-stage-in-front
  returns the raw unclamped rect with `visible: false`;
  `contains`/`intersects` inclusivity semantics pinned.
- **AC-2 [U]** Tokens exist once in `lib/responsive/hud-layout.ts`;
  `components/cockpit/hud-layout.ts` is import/re-export only (no logic —
  review + a unit test importing both and asserting identity);
  `rectsAlmostEqual` honors `HUD_RECT_EPSILON` at the boundary (0.25 → equal,
  0.2501 → not).
- **AC-3 [U]** Solver: fixture suite covering every priority tier for hint,
  arrow pair, and info; collision precedence (chrome → info → arrows →
  hint); pair balance (never one arrow clamped alone); `HUD_MIN_HIT_SIZE`
  floor; compact entry and hysteresis exit (fails at slack < 8 px, exits at
  ≥ 8 px) solving with the measured `hintCompact` size; unsatisfiable
  fixtures — a safe frame too small for the info card or arrow pair yields
  `{ status: 'unsatisfiable', failed }`, never a constraint-violating rect;
  determinism — permuting obstacle input order yields identical output.
- **AC-4 [B]** **Reference-viewport parity:** pre-rewire
  `getHudSnapshot()` fixtures recorded at `1440×900` for cockpit (PC and
  crate hover states), monitor, crate (record selected), and deck (record 0
  landed) — recorded **after** the §7.3 instrumentation identifiers land
  (`object-tag`, `pc-hover-brackets`, `crate-hover-brackets`,
  `deck-project-link`), so every one of the seven rewired overlays is
  observable in `overlays`, including the tags/brackets/link that carry no
  `data-hud` today (`cockpit-hud.tsx:649,897`). Because the pre-rewire
  hook has no `pc`/`crate.rect`/`anchors` fields and reports
  `subject: null` in cockpit mode, the **fixture recorder reads the legacy
  window getters directly** (`__getCockpitPCRect`, `__getCockpitCrateRect`,
  `__getCockpitAnchors`) for the cockpit-mode subject geometry — legal
  because at the reference viewport the canvas/stage offset is zero, so
  canvas-relative equals stage-relative; step 6 stays attribute-only.
  Because `selectRecord()` is synchronous and the crate keeps easing
  afterward (tilt/hover/disc interpolations, `vinyl-crate.ts:920-928`)
  while the existing `isSettled()` tracks only camera and deck state
  (`test-hooks.ts:347`), the recorder's crate fixture (and every fixture)
  is captured only after **polling the recorded geometry until it stays
  within `HUD_RECT_EPSILON` (0.25 px) for 10 consecutive frames** — a
  deterministic settle condition that needs no hook changes.
  Post-rewire, the same quantities re-read through `liveFrame.pc`,
  `liveFrame.crate.rect`, and `liveFrame.anchors` (and the unchanged
  legacy getters) match the fixture within **1.0 CSS px** per coordinate;
  the legacy `subject` stays `null` in cockpit mode, as today. The fixtures include the known deck overlap — parity
  means the overlap is still there (Phase 6's fixture will retire it).
- **AC-5 [B]** DPR invariance: CDP `deviceScaleFactor 1 → 2` at `1440×900`
  changes no published snapshot geometry beyond `HUD_RECT_EPSILON` while
  buffer dimensions double (extends Phase 3's AC-4 to the new snapshot).

**Sampler**

- **AC-6 [B]** Snapshot semantics: all values in `liveFrame` share its one
  `frameId`, and every rect/quad's `sourceFrameId` equals it except a
  `retained: true` deck card (which keeps its original — asserted both
  ways); the legacy top-level fields (`stage` in viewport coordinates,
  `subject` including the monitor `{visible:false}` shape, `overlays`,
  `safeFrame`, `frameId`) are value-compatible with the pre-rewire hook;
  the call resolves within one frame at settled rest (no publication
  required); with the loop parked after context loss it resolves
  immediately with `parked: true` and a frozen `frameId` (preserving the
  existing `e2e/phase3-renderer.spec.ts` frozen-frameId assertions);
  `frameId` advances **exactly +1 per executed frame**, advances **zero**
  while parked, and stays **monotonic across a loss/rebuild cycle**
  (asserted around one forced loss/restore); during a
  camera transition two consecutive snapshots carry increasing `frameId`s;
  geometry-vs-DOM comparisons use `publishedFrame`'s geometry and are made
  only when `overlaysCommittedFrameId === publishedFrame.frameId`, and
  under that handshake the ScreenDialog's rendered corners align with
  `publishedFrame`'s monitor corners within 1 px at two viewport sizes
  (the §9.3 monitor check).
- **AC-7 [B/review]** `cockpit-hud.tsx` contains zero
  `requestAnimationFrame` occurrences (mechanical grep recorded in the
  implementation report); the `GlobeCanvas` render loop is the only
  **projection/HUD sampling** loop (the warp, boot-screen, and
  `cockpit-app.tsx` TWEAK/one-shot rAF usage of §3.5 is explicitly not
  projection sampling).
- **AC-8 [B]** Epsilon gate, asserted on geometrically static frames: in
  deck view **with `pauseAmbient: true` capture active** (card bob frozen)
  and pointer parked — over any 60 consecutive frames,
  `getHudFrameMeta().computeCount` advances ≥ 60 while `publishCount`
  advances 0; in normal (unfrozen) deck rest, the card bob **must be
  observably published**: waiting up to one full bob period
  (≈ 4.5 s — ω = 1.4 rad/s, `turntable.ts:1180`; refresh-rate
  independent, unlike a fixed frame count), the test requires **at least
  two publications whose card-rect `y` values differ** (the bob reaching
  the HUD — a ≤-frames bound alone would be vacuously true), while
  semantic fields show zero flips;
  a camera move or record-index change publishes within 1 frame.
- **AC-9 [B]** Deck-swap grace and post-grace hiding: stepping records
  while `busy` — the card rect is retained with `retained: true` for
  350 ms from invalidation **plus at most two frames of sampling/commit
  latency** (the expiry check runs at frame granularity and React commits
  lag a frame; the timestamp assertion allows the deadline + two frame
  intervals, consistent with §9.3's settle allowance); after expiry
  `deck.card` may be `null` while `busy` (the swap mechanics legitimately
  exceed the grace, §3.4), and while it is `null` the arrows and
  `DeckProjectLink` are **not rendered** — at no point during the swap do
  the arrows appear at stage-edge positions; card and controls return
  together with the fresh valid projection; exiting deck mid-swap clears
  `deck.card` to `null` in the next published frame, and re-entering deck
  shows no stale first frame (first published rect within epsilon of a
  fresh projection).
- **AC-10 [B]** Validity in flight: a pose where the monitor back-face or
  behind-near case triggers yields `liveFrame.monitor === null` and a
  hidden dialog with no `NaN` in any inline style (style audit of
  `[data-hud]` nodes); the legacy top-level `subject` keeps its legacy
  invalid shape (the `{ visible: false }` object — §5.2 adapter), which
  is asserted, not "fixed".

**Determinism and randomness**

- **AC-11 [U]** `seeded-streams`: known-answer vectors for
  `xmur3`+`sfc32`; same seed+name ⇒ identical first 1000 values; differing
  names decorrelated (no common prefix in the first 100); `null` seed
  delegates to `Math.random` (spy — test-side only) and two unseeded
  sources differ; `stream(name)` memoization continues one sequence;
  **negative tests**: `createRandomSource` throws on a seed containing
  U+0000, and `stream()` throws on a name containing U+0000 (both cases
  asserted explicitly — the §4.1 collision guard).
- **AC-12 [U/review]** Migration completeness: `grep -rn "Math.random"
  app/ components/ lib/` matches only the delegation line in
  `seeded-streams.ts`; the implementation report reproduces the §4.3 table
  with final line numbers; `getVisualCaptureState().streams` in a seeded
  run lists every §4.3 build-time stream that the mounted scene exercised.
- **AC-13 [B]** Seeded stability: two fresh page loads with the canonical
  capture config, same view — all four metrics within the same-backend
  repeat tolerance (SwiftShader: entropy Δ ≤ 0.05 bits, dominant share
  Δ ≤ 0.01, edge density and contrast relative Δ ≤ 2%).
- **AC-14 [B]** Natural randomness preserved: two fresh **unconfigured**
  loads produce differing starfield buffers (metric or buffer-hash
  inequality on at least one of the four metrics/hashes), and
  `getVisualCaptureState().active === false`.
- **AC-15 [B]** Late configuration throws: `configureVisualCapture()` after
  `skipIntro()` rejects (existing) **and** after a forced context-loss
  rebuild rejects (the latch survives rebuild); the error message names the
  reload requirement.
- **AC-16 [B]** Frozen clock: with capture active and settled, two §9.6.2
  buffer reads ≥ 500 ms apart are **string-identical** (`toDataURL`
  equality on SwiftShader — this alone proves every ambient system,
  platter and card included, is frozen); corroborated by reading the
  platter's world rotation and the card's world position across the two
  reads through the **preserved** `window.__cockpitScene` /
  `__cockpitTurntable` bridge — traversal anchored by **pinned node
  names** the implementation assigns (`spin.name = 'deck-platter-spin'`,
  `card.name = 'deck-holo-card'`; today those nodes are anonymous,
  `turntable.ts:88,:606`, so unnamed traversal would be
  refactor-brittle). Name assignment is inert metadata (no visual or
  behavioral effect) and no new hook is added. Settle in capture mode
  implies the §4.4 completion snap has been applied (`isSettled()` is the
  post-snap signal) — which is what makes buffer identity reachable at
  all. A second frozen cell: **crate view with a record selected**
  (`selectRecord`) — two buffer reads identical, proving the
  selected-record disc spin is on the ambient lane. Without capture, the
  same two buffer reads differ in both views.
- **AC-17 [B]** Blank-canvas independence: the §9.6.2 precondition passes
  unchanged on an unseeded run (thresholds untouched; no dependency on the
  deterministic path).

**Instrumentation, baselines, hygiene**

- **AC-18 [B/U]** Debug overlay: with `?hudDebug=1` on the dev server the
  overlay renders safe frame, subject, and every `[data-hud]` rect;
  wrapper is `aria-hidden`, `pointer-events: none`, contains zero focusable
  elements, and matches no `[data-hud]` selector; without the param it does
  not mount; [U] pins the `NODE_ENV` guard; production-bundle grep evidence
  (Phase 3 pattern) shows the overlay markers absent.
- **AC-19 [P/M + U]** SwiftShader baseline recorded: 24 cells × 3 serial
  repeats, unmasked renderer string present, `git.dirty === false` (clean
  checkout of the harness commit), bands derived per §6.3, per-cell §9.6.4
  error-capture diagnostics with zero unexpected entries, committed under
  `docs/baselines/phase-4-scorecard/` with README and checkpoint template;
  harness refuses cross-classification comparison and dirty-tree captures
  (negative tests) and runs cells strictly serially by construction; [U]
  the four metric implementations match the §5.3 golden-image fixtures
  exactly.
- **AC-20 [P/M — owner checkpoint]** Hardware baseline captured **on the
  owner's machine and owner-certified** in the completed checkpoint doc;
  never compared to SwiftShader; Codex does not run or certify it; the
  phase cannot close without it.
- **AC-21 [B]** The Phase 6 deck-overlap `test.fixme` remains present and
  reported skipped; the overlap itself is still observable in the AC-4 deck
  fixture (not fixed early).
- **AC-22 [review]** Boundary proof in the implementation report: no
  `getFocusTarget`/camera-fit change, no `lib/responsive/input-policy.ts`
  change, no live placement re-anchoring beyond the documented
  coordinate-space conversion, no `preserveDrawingBuffer` flip, no new
  Playwright projects/browsers, no new `window.__cockpit*` name — asserted
  against the **authoritative pinned name set** of §7.3 item 5 (the
  live-code enumeration including `__getCockpitDeckCardRect`, matching the
  corrected CLAUDE.md list) — no `Math.random` monkey-patch, no edits under
  `content/`.
- **AC-23 [B]** Recovery interplay: forcing context loss and restoring in
  deck view — at loss the sampler parks (`parked: true` snapshots serve
  `lastComputedBeforePark`); at rebuild it resets and re-registers, and
  the restored scene's first published snapshot is a fresh compute
  carrying no pre-loss geometry (asserted against the pre-loss values);
  Phase 3's AC-13 assertions still pass on top of the rewired HUD.
- **AC-24 [V]** Visual review: debug overlay in both themes (palette/
  hard-corner conformance) and a spot check that reference-viewport HUD
  appearance is unchanged in all four modes (screenshots attached to the
  implementation report).

---

## 9. Ordered Codex implementation steps

Verification commands per step; the five gates run in full at the end and
per commit group (§10). Steps are small and reviewable; no step reaches
into a later phase's files.

1. **Pure geometry + tokens.** Add `lib/responsive/hud-layout.ts` (tokens,
   `computeSafeFrame`, solver types) and `lib/responsive/stage-projection.ts`
   (validity + NDC→stage); extend `lib/responsive/geometry.ts` with
   `rectsAlmostEqual`; add `components/cockpit/hud-layout.ts` re-export
   shim; unit tests (AC-1, AC-2). Strict-island rules throughout.
2. **Solver.** `resolveFocusHudLayout` in `lib/responsive/hud-layout.ts` +
   fixture unit suite (AC-3). Pure code only — no wiring.
3. **Seeded streams.** `lib/random/seeded-streams.ts` + known-answer unit
   tests (AC-11).
4. **Randomness migration.** Thread `RandomSource` through builder options
   from `globe-canvas.tsx`; migrate all 53 sites per the §4.3 map
   (boot-screen last); `getVisualCaptureSeed()` in `test-hooks.ts`;
   `getVisualCaptureState()` hook. Verify AC-12, AC-14 groundwork; gates
   stay green (production behavior unchanged).
5. **Frozen ambient clock.** Add `components/cockpit/frame-times.ts` and
   the §4.4 dispatch-adapter wiring (times set from each invocation's
   arguments; existing tick signatures and `window.__cockpitTick`
   untouched); per-line lane adoption in `turntable`/`vinyl-crate` (the
   selected-record disc spin)/`coffee`/`incense`/`highlights`/
   `decorations`; capture-mode transition snap **and mechanical
   completion snapping with settled-after-snap** (§4.4); `pauseAmbient`
   consumption; audit confirming no time uniform in the main scene.
   Verify AC-15, AC-16 groundwork including the selected-crate frozen
   case.
6. **Instrumentation identifiers + parity fixtures (pre-rewire).** Add the
   §7.3 `data-hud` identifiers (`object-tag` + `data-tag-id`,
   `pc-hover-brackets`, `crate-hover-brackets`, `deck-project-link`) to the
   **un-rewired** overlays — attribute-only edits, no behavior change —
   then capture and commit the AC-4 fixtures at `1440×900` via the fixture
   recorder, which combines `getHudSnapshot()` (stage/overlays/subject)
   with **direct reads of the legacy window getters**
   (`__getCockpitPCRect`/`__getCockpitCrateRect`/`__getCockpitAnchors`) for
   the cockpit-mode fields the pre-rewire hook lacks (AC-4) — no hook
   changes in this step. Lands in **commit 2** (§10), a full commit before
   the rewire, so fixture provenance is a real history ordering, not an
   intra-commit claim.
7. **Sampler + HUD rewiring.** `components/cockpit/hud-sampler.ts`; frame-id
   ownership and publication in `animate()` (§3.2 ordering); internal
   subject providers on `turntable`/`vinyl-crate`/`glass-mac` outputs;
   rewire the seven overlays to `useHudFrame()`; remove all seven rAF
   loops, the unbounded retention, and the `window.innerWidth` read;
   implement deck-swap grace; `parkHudSampler()` on context loss and
   `resetHudSampler()` at rebuild/teardown (§3.4 item 5); pin the
   `deck-platter-spin`/`deck-holo-card` node names (AC-16). Verify
   AC-4–AC-10, AC-23.
8. **Test hooks + debug overlay.** Upgrade `getHudSnapshot` per §5.2
   (three-state resolution, compatibility adapter, commit handshake); add
   `getHudFrameMeta` and `getVisualAssetState` with the dev-only
   pending/failed counters registered by the async texture writers
   (turntable cover decode, crate cover repaint, decals); add
   `hud-debug-overlay.tsx` (`?hudDebug=1`);
   `e2e/phase4-hud.spec.ts` implementing the [B] criteria; keep the Phase 6
   fixme untouched (AC-21). Verify: full `npm run test:e2e`.
9. **Scorecard harness (code only).** `scripts/perf/visual-scorecard.ts`
   with the §5.3 pinned metrics, golden-image unit fixtures, §9.6.4 error
   capture, serial execution, and dirty-tree rejection;
   `docs/baselines/phase-4-scorecard/` README + checkpoint template. No
   captures yet — the harness must be **committed** (commit 3) before any
   baseline is recorded, so captures can carry `git.dirty: false`.
10. **Baselines + docs + full verification.** From a clean checkout of
    commit 3: Codex records the SwiftShader baseline serially (AC-19);
    then the **explicit owner checkpoint** — the owner runs and certifies
    the hardware baseline (AC-20; Codex must not self-certify). §7.3 doc
    amendments; implementation report with the migration table, boundary
    proof (AC-22), fixture parity evidence, and gate results; all five
    gates green; AC-24 visual review attached.

Expected new files: `docs/phase-4-design.md` (this document — untracked
today; tracked as part of commit 1 once owner-approved),
`lib/responsive/hud-layout.ts`,
`lib/responsive/stage-projection.ts`, `lib/random/seeded-streams.ts`,
`components/cockpit/hud-layout.ts`, `components/cockpit/hud-sampler.ts`,
`components/cockpit/frame-times.ts`,
`components/cockpit/hud-debug-overlay.tsx`,
`tests/unit/hud-layout.test.ts`, `tests/unit/stage-projection.test.ts`,
`tests/unit/seeded-streams.test.ts`, `e2e/phase4-hud.spec.ts`,
`e2e/fixtures/phase4-hud-parity.json`, `scripts/perf/visual-scorecard.ts`,
`docs/baselines/phase-4-scorecard/*`. Expected modified files:
`components/cockpit/globe-canvas.tsx`, `cockpit-hud.tsx`, `turntable.ts`,
`vinyl-crate.ts`, `glass-mac.ts`, `coffee.ts`, `incense.ts`, `tea-set.ts`,
`decorations.ts`, `decals.ts`, `highlights.ts`,
`boot-screen.tsx`, `test-hooks.ts`, `lib/responsive/geometry.ts`,
`docs/responsive-system.md`, `docs/hud-responsive-layout-plan.md`,
`CLAUDE.md`, `AGENTS.md`.

---

## 10. Proposed controller commit boundaries

**Reconciliation with AGENTS.md first.** AGENTS.md's phase-discipline
default is **one reviewable commit per phase**; Phase 3 deviated to three
commit groups only through an explicit owner approval (Phase 3 D6). Phase 4
proposes the same kind of deviation — four commits — and **D8 is the owner
decision that authorizes it** (approved 2026-08-05, §13). A single squashed commit is **not offered as
an alternative**: the harness rejects dirty-tree captures and baselines
must record a clean harness commit (§6.2), which cannot exist in stable
history before capture if the whole phase is one commit — declining D8
therefore means sending the design back for a different provenance scheme,
not squashing. If approved, the deviation is recorded in the
implementation report and the phase-runner manifest, exactly as Phase 3
recorded D6; AGENTS.md itself needs no amendment (the rule already bends to
"an explicit owner request").

Four reviewable commits (D8 default), rollback-separable, ordered so every
provenance claim is a real history ordering:

| Commit | Steps | Provenance it establishes | Revert impact |
|---|---|---|---|
| 1 — design record + pure contract | 1–3 + this document | the owner-approved `docs/phase-4-design.md` (currently untracked) enters history before any **runtime wiring** (commit 1's own contents are pure lib modules + tests with zero runtime reach), so every later commit's clean checkout contains its governing design | deletes new lib modules + tests; zero runtime reach |
| 2 — determinism + identifiers + fixtures | 4–6 | parity fixtures recorded against the pre-rewire HUD, committed **before** any rewiring exists | restores `Math.random` call sites and live clock; HUD behavior untouched (attribute-only edits) |
| 3 — sampler, HUD rewiring, instrumentation, harness code | 7–9 | the harness exists in a clean commit **before** any capture | restores per-overlay polling; contract lib and determinism stand |
| 4 — baselines + checkpoint + docs | 10 | captures carry `git.dirty: false` at commit 3 | evidence/docs only |

Commit 3 is the only behavior-bearing HUD change; its parity target is
commit 2's fixture. The owner checkpoint (AC-20) gates commit 4's
completion, mirroring Phase 3's AC-23 sequencing. One PR, four commits,
independent Kimi QA before the controller lands them (AGENTS.md route).

**Runner adaptation (owner-directed 2026-08-06).** The owner directed that
delivery run through the Phase 3 automated phase-runner
(`docs/phase-runner.md`): manifest-driven Codex → fresh-Kimi-QA →
controller-commit packages, with the controller as the only committer.
`phase:init` requires the manifest and the design source to be **tracked
and clean before initialization**, so `docs/phase-4-design.md` plus
`scripts/phase-runner/manifests/phase-4.json` enter history in a small
**pre-init record commit** (owner/controller-made), and §10 commit 1
carries steps 1–3 only. Every provenance guarantee is preserved or
strengthened — the design is in history even earlier; fixtures still
precede the rewire; the harness is still committed before any capture.
The manifest translates §9 into **five** automation steps mirroring
Phase 3's shape: steps 1–3 with `commitAfterQa` (= §10 commits 1–3), a
capture-and-checkpoint step with `ownerGateAfter: true` and no commit
(SwiftShader baseline recorded from the clean step-3 commit; owner runs
the AC-20 hardware capture; `phase:accept` resumes), and a final
docs-and-delivery step whose `commitAfterQa` is §10 commit 4. D8's
substance — four QA-gated implementation commits and the ordering that
makes the provenance claims real — is unchanged; this note records the
one mechanical difference (the design document lands one commit earlier
than the §10 table's commit-1 line states).

---

## 11. Required gates and QA matrix

All five gates, green, before the phase is claimable — `npm run lint`,
`npm run typecheck:contracts`, `npm run validate:contracts`,
`npm run test:unit`, `npm run test:e2e`. CI is the enforcement authority.

Independent QA (Kimi) matrix beyond the gates:

| Risk | Check |
|---|---|
| Visual parity | AC-4 fixture diff at `1440×900`, all four modes, both hover states; AC-24 screenshots |
| Deck swap | AC-9 grace bounds + mode-exit clearing; arrows never at stage edges mid-swap |
| Monitor alignment | AC-6 corner alignment ≤ 1 px at two viewport sizes |
| Determinism | AC-13/AC-16 repeat runs on the QA host (SwiftShader); AC-14 natural-variation check |
| Production exclusion | production build grep: no test hooks, no debug-overlay markers, no capture strings (Phase 3 evidence pattern) |
| Bridge integrity | `window.__cockpit*` name-set matches the §7.3 pinned authoritative enumeration (incl. `__getCockpitDeckCardRect`); getter shapes byte-compatible; existing tether/vinyl-motion e2e still green |
| Recovery interplay | AC-23 loss/restore in deck view over the rewired HUD |
| A11y states | existing forced-colors/reduced-motion/theme e2e patterns re-run over the rewired overlays |
| Phase boundary | AC-21 fixme skipped; AC-22 untouched-file list |
| Host discipline | e2e run serial/partitioned on software-WebGL hosts (Phase 3 QA lesson); scorecard harness never concurrent with the suite |

---

## 12. Explicitly out of scope

- Phase 5: `FocusTarget` framing points, distance solve, monitor fit
  reconciliation, hover/pan input normalization, `input-policy.ts` changes.
- Phase 6: the deck HUD overlap fix, deck re-anchoring, return-control
  collision wiring, measured-overlay placement — the solver ships unused by
  live placement.
- Phase 7: crate HUD re-anchoring, info-card anchoring via the solver.
- Phase 8: Firefox/WebKit projects, full-matrix scorecard runs, production
  gate, accessibility scans, CI expansion.
- Any visual redesign: crate, deck, monitor, tether, cards, routes,
  typography, decorative objects, lighting/background migration.
- Adaptive render scaling; any `DPR_CAP` change; `preserveDrawingBuffer`
  changes; pixel-diff visual testing; browser-zoom detection or
  counter-scaling.
- Any new `window.__cockpit*` global; any change to canonical content,
  contracts' structure, or `content/portfolio-approvals.json`.
- Production-build determinism (determinism stays a test-build behavior by
  design).

---

## 13. Owner decision table

**Owner approval recorded 2026-08-05: D1–D8 were each explicitly approved
with the recommended defaults below — including the D8 four-commit
deviation from AGENTS.md's one-commit-per-phase default and the D7
baseline authority rules. This list stands as the binding record for
implementation** (the two pre-design directions — owner-run hardware
baselines, strict-lib module split — were already owner-approved on the
same date and are not re-asked).

- **D1 — Baseline matrix scope.** Default (recommended): `1440×900` +
  `1512×982` × cockpit/crate/deck × DPR 1/2 × dark/light = 24 cells, 3
  serial repeats per cell, per environment. OWNER APPROVED.
- **D2 — Canonical capture config.** Default: `seed =
  "ax-cockpit-phase4-v1"`, `timeMs = 12000`, recorded in every baseline
  file. Changing either later mints a new baseline set — the values
  themselves are arbitrary but frozen. OWNER APPROVED.
- **D3 — Tolerance-band floors.** Default per §6.3: entropy 0.35 bits; edge
  density max(0.015, 20% rel); luminance contrast max(0.01, 15% rel);
  dominant share 0.06; half-width additionally covers 2× observed repeat
  deviation. QA may propose tightening after the first captures — as a
  recorded amendment, not a silent edit. OWNER APPROVED.
- **D4 — Grace period and post-grace behavior.** Default: retain for
  `HUD_RECT_GRACE_MS = 350` (the plan §3 starting value), deck swap only,
  with the §3.4 invalidation list; **after expiry the dependent controls
  hide** (no stage-edge fallback) until a fresh projection arrives —
  necessary because the swap mechanics (~0.6 s eject + ~0.42 s extraction
  + ~0.72 s inbound flight) legitimately exceed any short grace. OWNER APPROVED.
- **D5 — Publication policy.** Default (recommended): epsilon-gated
  publication at `HUD_RECT_EPSILON = 0.25` CSS px — **zero publications
  for geometrically static or frozen frames** (§3.3; normal deck rest
  legitimately publishes its card bob). OWNER APPROVED. 
- **D6 — Solver collision precedence.** Default: chrome → info card →
  arrow pair → hint (hint yields/hides first as the only nonessential
  element; info moves least because it has the fewest legal placements),
  with the §3.6 tie-breaking and 8 px compact hysteresis. OWNER APPROVED.
- **D7 — Rebaseline authority.** Default (recommended): hardware baselines
  owner-certified only; SwiftShader baselines re-recordable by engineering
  with independent QA verification and an owner-visible `history` entry;
  every rebaseline carries date/commit/reason. OWNER APPROVED
- **D8 — Commit boundaries (deviation from AGENTS.md's one-commit-per-phase
  default).** Default (recommended): the four §10 commits in one PR —
  approved by the owner as an explicit deviation, exactly as Phase 3's D6
  authorized its three commit groups — because the sequence is what makes
  two provenance claims real: parity fixtures committed (commit 2) before
  the rewire exists (commit 3), and the capture harness committed
  (commit 3) before any baseline is recorded (commit 4, `git.dirty:
  false`); the owner-approved design document itself is tracked in
  commit 1, so it exists in every later clean checkout. No
  squashed-single-commit alternative is offered: a lone commit cannot hold
  a clean harness commit in history before its own captures (§10), so
  declining the deviation returns the provenance design to Claude rather
  than selecting a squash. OWNER APPROVED.

---

**Status: OWNER APPROVED**

Owner decisions: **D1–D8 all approved with the recommended defaults on
2026-08-05** (stamped per entry in §13), including the D8 four-commit
deviation from AGENTS.md's one-commit-per-phase default and the D7
baseline authority rules. Two owner actions remain scheduled inside
implementation, not open decisions: the AC-20 hardware-baseline capture
and certification at step 10, and the controller's landing of the four
§10 commits after independent QA.

Handoff: Phase 4 design in `docs/phase-4-design.md` is complete and
owner-approved (D1–D8, recommended defaults, 2026-08-05) — one
stage-relative CSS-pixel projection contract with explicit validity and
frame-identity rules; a strict-island geometry/token/solver API behind the
plan-named `components/cockpit/hud-layout.ts` shim; one epsilon-gated
focused-HUD sampler replacing all seven per-overlay rAF loops with deck-swap
-only bounded grace; 14 named seeded streams covering all 53 verified
`Math.random` invocations with production randomness preserved;
`configureVisualCapture` wired to pre-scene seeding, the four-lane frozen
ambient clock, and capture-only mechanical completion snapping; the
`?hudDebug=1` dev overlay; and a serial, backend-separated scorecard
protocol whose SwiftShader baseline is agent-recorded and whose hardware
baseline is owner-run and owner-certified (AC-20, step 10). No code was
written, staged, or committed, and no approval or content record was
touched; the design document itself is assigned to §10 commit 1. No
unresolved decisions remain. Next role: **Codex** implements per §9 in the
four §10 commit boundaries, followed by independent Kimi QA.
