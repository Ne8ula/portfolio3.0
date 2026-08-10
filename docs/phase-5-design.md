# Phase 5 Design — 3D Fit and Input Normalization

**Status:** OWNER APPROVED — D1–D9 approved on 2026-08-10 with the
recommended defaults (including D5 drag-release inertia, D7 pre-init
record commit + single implementation commit, D8 uniform click semantics)
and plan amendments A1–A3 (§12). Ready for Codex phase-runner planning
and implementation per §11.
**Author:** Claude (design lead) · **Date:** 2026-08-09, revised through
2026-08-10 across six review rounds; owner-approved 2026-08-10 ·
**Base:** `main` @ `2a2bae8` (verified live HEAD,
equal to `origin/main`; working tree clean apart from the hook-maintained
`docs/agent-handoff.md`). Phase 4 is owner-accepted and independently
QA-passed (Kimi PASS 2026-08-08 on this exact snapshot: all five gates
green, 29 unit files / 357 tests, 51 e2e passed + 1 sanctioned Phase 6
skip).

Scope is exactly plan §8 Phase 5
(`docs/hud-responsive-layout-plan.md:2088-2102`):

1. Authored framing points for the deck and crate (plan §6.1).
2. A cached, projection-based focus-camera fit solve (plan §6.3).
3. Monitor fit reconciled with the same safe-frame contract (plan §6.2,
   §6.4).
4. Hover free-look/parallax separated from contained-stage panning
   (plan §A.5).
5. Nonlinear, live-viewport-normalized, full-range hover response wired
   through the existing shared input policy (plan §A.5, §9.4).
6. Reference-dimension gain (`sizeRatio`) applied only to accumulated
   drag/trackpad/wheel/keyboard panning (plan §A.5).
7. Wheel delta-mode normalization, spike bounding, smoothing/inertia,
   keyboard and reset paths, reduced-motion behavior (plan §A.5).
8. Zoom/narrow panning scoped to one labelled cockpit container that never
   traps ordinary document scrolling (plan §A.5, §A.6).
9. Automated and manual evidence that every focused subject fits its safe
   frame and every plan §9.4 input check passes (plan §9.4, §9.1 matrix),
   under the explicit §12 amendments.

Out of scope, by phase discipline: Phase 6 deck-HUD re-anchoring and the
known deck hint/card overlap (the `e2e/smoke.spec.ts:951` `test.fixme`
stays present and skipped); Phase 7 crate-HUD re-anchoring; wiring Phase 4's
`resolveFocusHudLayout()` into live deck/crate overlay placement; Phase 8
browser-project and CI-matrix expansion. Invariants that must not change:
the documented `window.__cockpit*` bridge (the 34-name set pinned at
`e2e/phase4-hud.spec.ts:51-85` stays byte-identical), `preserveDrawingBuffer`
stays `false`, no model resizing/deformation/hierarchy changes, no
browser-zoom detection or counter-scaling, no adaptive DPR, no React Three
Fiber / WebGPU / TSL, no project/profile content changes, no
approval-manifest writes, test hooks stay additive/dev-only, and the Phase 3
renderer lifecycle plus Phase 4 deterministic geometry/sampling/capture
contracts are preserved.

This design cannot silently redefine the governing plan. Where Phase 5's
executable evidence necessarily differs from the plan's literal text (the
pan-trace viewports and the manual hardware matrix), the difference is an
**explicit owner-approved amendment**, recorded in §12 and decided in D9 —
never an implied reinterpretation.

Line numbers below are verified against `2a2bae8` and will drift during
implementation; symbol names are given alongside every reference.

---

## 1. Scope and verified current-state audit

Every claim in this section was verified against the live tree at `2a2bae8`.
Items that could not be fully verified are marked **assumption** and must be
re-checked at implementation time.

### 1.1 Focus-camera state machine today

`components/cockpit/globe-canvas.tsx` owns the camera:

- `viewMode` ∈ `'cockpit' | 'monitor' | 'crate' | 'deck'`; `focusKind`
  remembers the last focused pose so the ease-out after exit still targets
  it (`globe-canvas.tsx:951-962`).
- `modeT` eases 0→1 toward the focused pose with
  `modeT += (target - modeT) * min(1, dt * 2.2)`; visual capture snaps it
  (`globe-canvas.tsx:1229-1232`).
- `focusSwitch` blends directly between two focused poses (crate→deck uses
  duration `0.38`, other focused switches `0.85`) by capturing the current
  pose and slerping toward the new target (`globe-canvas.tsx:964-987`,
  `1368-1382`).
- The focused pose (`monitorPos`/`monitorQuat`) is **recomputed every
  animation frame** from the live subject transforms — there is no cache,
  and each frame re-runs the scalar fit formula and `lookAt`
  (`globe-canvas.tsx:1281-1366`).
- Settle reporting for the §9.6.1 bridge is
  `reportFrame((FOCUSED ? modeT > 0.995 : modeT < 0.005) && !focusSwitch,
  frameId)` (`globe-canvas.tsx:1401-1406`). `isSettled()` additionally
  requires three consecutive settled frames and no deck/crate transients
  (`components/cockpit/test-hooks.ts:449-459`).
- Camera constants: FOV 68°, near 0.1, far 2000, cockpit seat at the origin
  (`globe-canvas.tsx:150-151`). Aspect comes only from
  `createRendererSizeSync()` CSS measurements
  (`components/cockpit/renderer-size-sync.ts:56-59`).

### 1.2 `getFocusTarget()` shapes today

Three different shapes, three different conventions:

| Subject | Provider | Shape returned | Convention |
|---|---|---|---|
| Deck | `turntable.ts:1055-1075` `group.getFocusTarget()` | `{ center, outward, fitHeight: 2.5 * worldScale }` | module-level singleton `deckFocusTarget` whose `Vector3`s are mutated in place (aliasing hazard) |
| Crate | `vinyl-crate.ts:822-830` `group.getFocusTarget()` | `{ center, outward, fitDepth: (CRATE_D + 1.0) * ws, fitWidth: (CRATE_W + 0.8) * ws }` | fresh object per call; `fitWidth` is computed but **never consumed** |
| Monitor | `glass-mac.ts:406-416` `xray.userData.screenCorners` + `screenGroup` | four **local-space** corner `Vector3`s of the screen plane | consumers transform through `screenGroup.matrixWorld`; `getScreenCornersWorld()` (`glass-mac.ts:531-548`) writes into a preallocated shared array |

Verified magic values inside the providers: the deck focus center height
`1.08` (`turntable.ts:1067`) is hand-tuned, not derived from the card
constants; `fitHeight = 2.5` bakes an implicit ≈1.3× padding above the real
subject height (platter top `0.25` → card top ≈`2.14` group-local); the
crate paddings (`+1.0` depth, `+0.8` width) are additive world units; the
crate focus center `y = 0.55` sits far below the pulled-sleeve top (≈`1.54`)
and the raised-disc top. The crate anchor formula
`SLEEVE_H * 0.62 + DISC_RISE * 0.4` is duplicated at `vinyl-crate.ts:869`
and `:907`.

### 1.3 Scalar fit hints and duplicated constants (to be retired)

The per-frame camera code applies three near-identical fill factors and
three unrelated padding conventions:

| Site | Formula | Defect |
|---|---|---|
| Deck fit `globe-canvas.tsx:1287-1292` | `dist = max(2, (fitHeight / 0.85) / (2 tan(fovY/2)))`, `focusDirection = outward + (0, 0.42, 0)` normalized | vertical-only; ignores `camera.aspect`; magic floor `2` |
| Crate fit `globe-canvas.tsx:1304-1311` | `dist = max(1.5, (fitDepth / 0.8) / (2 tan(fovY/2)))`, `outward + (0, 1.8, 0)` | vertical-only; ignores aspect; ignores the exported `fitWidth`; magic floor `1.5` |
| Monitor fit `globe-canvas.tsx:1341-1348` | `fitFill = 0.8`; `dollyDist = max(distV, distH)` from screen width/height | the only aspect-aware path; fits against the whole viewport, not a safe frame |
| Parallax offsets `globe-canvas.tsx:1295-1296`, `1350-1351` | deck `x += yaw*0.12, y += pitch*0.08`; monitor `x += yaw*0.15, y += pitch*0.1`; crate none (deliberate, `globe-canvas.tsx:1313-1315`) | authored composition constants; keep, but account for them in the fit margin (§4.6) |

None of these fits reserves space for HUD chrome; all fit against the full
viewport. This is the direct cause of the plan §2.1/§2.4 findings and of the
Phase 6 overlap symptom (the fix for the overlap itself remains Phase 6).

### 1.4 Free-look input today

Producer: `components/cockpit/cockpit-hud.tsx:149-168`.

- Listens to `mousemove` on **`window`** while normalizing against the
  stage rect (`stageRef.getBoundingClientRect()`), so a pointer outside the
  stage yields `|nx| > 1` and the yaw/pitch targets **exceed** the
  `±22°/±15°` envelope — a verified defect Phase 5's clamped
  `hoverAngle()` fixes.
- The response is linear (`yawRef.current = -nx * yawScale`); no
  `responseExponent` shaping.
- The envelope constants are hard-coded duplicates
  (`Math.PI * 22/180`, `Math.PI * 15/180`) of `MAX_YAW_RAD`/`MAX_PITCH_RAD`
  in `lib/responsive/input-policy.ts:30-31`.
- In focused modes the same handler feeds parallax with input scales
  `0.25`/`0.15` (`cockpit-hud.tsx:161-162`).
- Smoothing lives in the render loop:
  `smoothK = 1 - exp(-dt * 2.2)` toward the targets, snapped during visual
  capture (`globe-canvas.tsx:1260-1273`); the smoothed values are published
  as the existing pinned bridge globals `__cockpitSmoothedYaw` /
  `__cockpitSmoothedPitch` (`globe-canvas.tsx:1270-1271`).
- **Reduced motion does not gate free-look or parallax today** — verified:
  `resolved.reducedMotion` is consumed only by boot/warp phase selection
  (`cockpit-app.tsx:100`, `:138`) and never reaches `cockpit-hud.tsx` or
  the smoothing loop. Plan §A.5 requires reduced motion to disable hover
  parallax; Phase 5 closes this gap.
- `lib/responsive/input-policy.ts` has **zero production consumers**
  (verified by grep for every export outside the module and its unit test).
  Phase 5 wires it; it does not need retuning.

### 1.5 Pointer-activation audit (immediate `pointerdown`)

Every interactive cockpit artifact acts **immediately on `pointerdown`**
(four of the five handler sites in the capture phase; the PC handler in
the bubble phase), before any future pointer movement is knowable:

| Artifact | Handler | Registration |
|---|---|---|
| PC → monitor mode | `onPointerDown` → `setViewMode('monitor')` | `globe-canvas.tsx:933-943` (bubble phase, renderer canvas) |
| Crate sleeves (select/play/recall); **empty-space press** returns a pulled record or exits to cockpit (`vinyl-crate.ts:809-814`) | `onPointerDown` | `vinyl-crate.ts:820` (`capture: true`) |
| Deck: card `VIEW MORE` button raycast; **click-away exit** — any non-card press leaves deck view (`turntable.ts:1107-1119`) | `onDeckDown` | `turntable.ts:1123` (`capture: true`) |
| Coffee dripper/mug | `onPointerDown` | `coffee.ts:495` (`capture: true`) |
| Tablet + shaker decorations | `onPointerDown` | `decorations.ts:722` (`capture: true`) |

Two structural facts about these five listeners matter beyond the timing:
the crate handler also owns the **cockpit→crate entry** (crate pick in
cockpit mode, `vinyl-crate.ts:788-792`), and the sites depend on
**capture-registration ordering plus `stopImmediatePropagation()`** to
arbitrate among themselves — the crate suppresses the deck's same-canvas
listener so a mode-flipping click is not re-read as a deck click-away
(`vinyl-crate.ts:804-808`). Any Phase 5 redesign must replace that
implicit cross-handler protocol explicitly, not per-site.

This matters for Phase 5: a §7.B pan drag that *begins* over any of these
artifacts — or over empty deck/crate background, where the same handlers'
else-branches immediately exit the focused view (the "click-away" paths
cited above) — would fire the action on the way down. Immediate
`pointerdown` action and drag-to-pan cannot coexist without a shared
arbitration rule — designed in §7.C, decided in D8.

### 1.6 Contained-stage behavior today

- `components/responsive/responsive-stage.tsx` derives `fit`/`contained`
  from `selectResponsiveTier(window.innerWidth/innerHeight)`; contained
  mode pins the surface to the profile minimum `1024×600`
  (`SUPPORT_PROFILES['desktop-laptop-v1'].normalMin`,
  `lib/responsive/layout-contract.ts:50-57`) inside a native
  `overflow: auto` region with `role="region"`, `aria-label`, and
  `tabIndex={0}` (`responsive-stage.tsx:64-88`).
- Panning is purely **native scrolling** — no `sizeRatio` gain, no wheel
  normalization, no pointer drag, no WASD, no reset-to-center, no inertia,
  no instructions. Scroll chains natively to the document at the edges.
- The cockpit mounts inside this region at
  `cockpit-app.tsx:320-341` (`regionId="cockpit-stage-region"`, label
  "Cockpit stage"). The inner cockpit stage element keeps its own
  programmatic-scroll pin (`onScroll` zeroing,
  `cockpit-hud.tsx:186`) — that pin is a separate mechanism and must be
  preserved (CLAUDE.md gotcha).
- **No `wheel` listener exists anywhere in the cockpit** (verified by grep
  over `components/` and `app/`): crate browsing is pointer/click plus
  `__cockpitVinylSelect(±1)`; the deck and crate register only
  `pointermove`/`pointerdown`/`pointerleave` on the renderer canvas
  (`vinyl-crate.ts:818-820`, `turntable.ts:1122-1123`). The stale
  "hover/scroll listeners" comment at `globe-canvas.tsx:990-991` describes
  a removed behavior. Wheel routing is therefore unowned today — Phase 5
  introduces the first wheel consumer and the routing law of §8.
- `e2e/phase3-renderer.spec.ts:317-409` (AC-13 of Phase 3) pins that a
  contained region scrolled to `scrollLeft=112 / scrollTop=76` does **not
  drift** across focus entry and a renderer rebuild — the ResponsiveStage
  container lives outside the remounted scene, so its scroll offset
  survives recovery. The Phase 5 pan controller must preserve exactly this
  (§7.B initialization law, §9).
- Tier boundaries: `1024×600`/`1440×900` are **normal** tier (fit mode —
  no pan controller exists there); the declared contained viewport cases
  are `800×450`, `683×325`, `512×300`, `320×568`
  (`REQUIRED_VIEWPORT_CASES`, `lib/responsive/layout-contract.ts:104-122`).
  This is why browser pan traces cannot run at `1440×900`/`1024×600`
  (§10 AC-12, amendment A1).

### 1.7 Resize, DPR, and lifecycle behavior

- `createRendererSizeSync()` converges initial sync, `ResizeObserver`,
  `window.resize`, a re-armed DPR media query, and frame-start sync on one
  idempotence gate; camera aspect updates only on CSS-size change, DPR only
  changes `setPixelRatio`, and each applied target bumps `sizeVersion`
  (`renderer-size-sync.ts:39-68`). **A DPR-only change also increments
  `sizeVersion`** — the Phase 5 fit cache therefore must key on CSS
  width/height (and aspect), never on `sizeVersion` alone (§5).
- Context loss parks the HUD sampler and cancels the loop
  (`globe-canvas.tsx:168-178`); recovery remounts the scene by key with the
  durable snapshot `{ viewMode, recordIndex }` (`cockpit-app.tsx:150-206`).
  Camera interpolation and pointer/hover state are documented transient
  state, reset to the selected view's settled pose
  (`docs/responsive-system.md` §3.1 restoration table).
- DPR-only invariance is already pinned by tests:
  `e2e/smoke.spec.ts:417` (buffer ×2, CSS geometry and `cameraAspect`
  unchanged, HUD rects within 0.25 px) and `e2e/phase4-hud.spec.ts:492`
  (deck card rect stable, epsilon gate idles for 60 frames). Phase 5 adds
  the equivalent guarantee for the fit solve (§10 AC-5).

### 1.8 Test instrumentation and coverage today

- The deterministic bridge is `__COCKPIT_TEST_HOOKS__`
  (`components/cockpit/test-hooks.ts:153-174`), dev-only
  (`testHooksEnabled`, `test-hooks.ts:189`), with `enterView`,
  `playRecord`, `isSettled`, `getHudSnapshot`, `getHudFrameMeta`,
  `getRendererState`, `configureSettleTimeout` as the members Phase 5
  suites will reuse.
- **No e2e test drives real pointer hover, wheel, or camera-fit
  assertions today.** Hover is simulated by writing `__cockpitHoveredTag`
  directly (`e2e/phase4-hud.spec.ts:348-352`); there is no
  `page.mouse.move`/`wheel` call in the suite; `__cockpitSmoothedYaw/Pitch`
  are name-pinned but never read. Camera fit has no coverage beyond aspect
  invariants. Phase 5 owns closing exactly this evidence gap.
- New spec files must be registered in the CI per-file matrix:
  `tests/unit/e2e-runner.test.ts:87` asserts `.github/workflows/ci.yml`
  stays in exact sync with discovered `e2e/*.spec.ts` files.
- Any new `window.__cockpit*` global would break the pinned 34-name
  enumeration check (`e2e/phase4-hud.spec.ts:336-344`). Phase 5 adds
  **no** bridge member; all new instrumentation is additive hook members
  (§9.4).
- `data-hud` identifiers are governed by the registry table in
  `docs/responsive-system.md` §10 (the `data-hud` row) — **not** by any
  `LayoutContract` property (`LayoutContract` has no identifier field;
  `lib/responsive/layout-contract.ts:85-96`). New identifiers are added by
  amending that registry table plus mechanical test pinning (§12 A3).
- Unit tests live inside `tsconfig.contracts.json`
  (`"tests/unit/**/*.ts"`) but the ESLint import restrictions bar `three`
  only under `app/**` and cockpit-runtime imports under `lib/**`
  (`tests/unit/import-boundary.test.ts:23-44`) — a **test-only** file may
  import `three` for the §4.8 oracle. Re-verify the ESLint config at
  implementation time (assumption: no test-scope restriction exists).

### 1.9 Verified defects and gaps Phase 5 corrects

1. Hover envelope overshoot: window-level listener + stage-rect
   normalization without clamping exceeds `±22°/±15°` outside the stage
   (§1.4).
2. Linear hover response; `responseExponentFor()` unwired (§1.4).
3. Reduced motion does not disable free-look/parallax (§1.4).
4. Focus fits ignore aspect (deck, crate), ignore HUD reservations (all
   three), and re-run every frame (§1.1, §1.3).
5. Envelope constants and anchor formulas duplicated outside
   `input-policy.ts` (§1.2, §1.4).
6. Contained-stage panning has no gain, no wheel normalization, no drag,
   no keyboard path, no reset, no instructions (§1.6).
7. Immediate `pointerdown` activation is incompatible with drag-to-pan
   (§1.5) — resolved by the §7.C arbitration rule.
8. Crate `getSubjectBoundsWorld()`/`__getCockpitCrateRect()` traverse the
   whole subgraph with `new THREE.Box3().setFromObject()` per call — and
   the crate's invisible hover halos (`PlaneGeometry` 1.71×1.764 per
   sleeve, `vinyl-crate.ts:533-538`) pollute any `setFromObject` bounds.
   Phase 5's fit must not inherit either behavior (§2.5). (The HUD-hover
   uses of those getters are out of scope; only the fit path is Phase 5's.)

---

## 2. Focus-target and authored-point contract

### 2.1 Production type and ownership

The deck, crate, and monitor providers converge on one shape (plan §6.1):

```ts
type FocusTarget = {
  center: THREE.Vector3          // world space
  outward: THREE.Vector3         // world space, unit length
  verticalBias: number           // authored elevation added to `outward`
  framingPoints: THREE.Vector3[] // world space, conservative envelope
}
```

Ownership and conventions:

- **Providers own authored geometry.** `turntable.ts`, `vinyl-crate.ts`,
  and `glass-mac.ts` each declare a module-scope constant array of
  **local-space** authored points (plain `{x,y,z}` literals derived from
  their own build constants — see §2.2–§2.4) plus the authored
  `verticalBias` for their subject. The composition hints currently living
  in `globe-canvas.tsx` (`0.42` deck, `1.8` crate, `0` monitor) move into
  the providers as `verticalBias`, so camera code no longer carries
  subject-specific numbers.
- **Providers transform local → world.** `getFocusTarget()` transforms the
  authored local points through the group's current world matrix (after
  `updateWorldMatrix(true, false)`) into a **preallocated, provider-owned
  scratch array**, and returns the `FocusTarget` view of it. This matches
  the existing `getCardCornersWorld()` convention
  (`turntable.ts:1033-1053`): the return value is valid only until the next
  call.
- **The consumer copies.** The Phase 5 fit adapter in `globe-canvas.tsx`
  copies the returned vectors into its own cache entry (§5) before any
  further work — it never retains provider scratch (verified aliasing
  hazard, §1.2). The crate's fresh-object inconsistency is resolved by
  moving it to the same scratch convention.
- **Allocation:** zero allocation per call after construction. Scratch
  arrays are sized at build time from the authored point counts.
- **Fail-safe:** a provider returns `null` when its subject is not in a
  frameable state (mirroring `getCardCornersWorld()`'s `null` contract).
  The fit adapter treats `null`, any non-finite component, or an empty
  `framingPoints` array as **fit failure** and applies the §4.5 plan-§10
  rule — it never feeds bad points to the solver and never throws in the
  render loop.

The obsolete scalar fields (`fitHeight`, `fitDepth`, `fitWidth`) are
removed from the providers in the same change that lands the solver, so no
dead dual contract survives the phase.

### 2.2 Conservative bounding rule for circular features

Cardinal points of a circle form an **inscribed** diamond — a point of the
circle at 45° lies outside the diamond, so a solver testing only cardinal
points can report a fit while the real feature crops. Every circular or
swept-circular feature is therefore bounded by the vertices of a
**circumscribed regular octagon**: for radius `r`, eight points at radius
`r / cos(π/8) ≈ 1.0824·r`, every 45°, oriented so the octagon's edges are
tangent to the circle. The convex hull of these vertices contains the
circle; perspective projection (all points in front of the camera) maps
line segments to line segments, so the projected hull of the vertices
contains the projection of every circle point, and containment of all
eight vertices in the (convex) safe-frame rectangle implies containment of
the whole feature. Because that lemma reduces correctness to **world-space
convex containment**, §10 AC-2 verifies the bound in world space (feature
samples against the authored hull's support region), which is
camera-independent — a projected-2D check at sampled poses would be
strictly weaker for the non-coplanar card envelope and could miss an
inscribed-bound regression.

This applies to: the deck card's yaw-swept disc, the deck platter (its
widest disc is the `0.53`-radius glass platter, which also covers the
`0.518` index ring), and the crate's raised disc (in its own plane).

### 2.3 Deck authored points

All coordinates group-local (before `TWEAK_DEFAULTS` `ttS: 1.75`), from the
verified constants in `turntable.ts`:

| Feature | Authored points | Source constants |
|---|---|---|
| Plinth footprint | 4 top corners `(±0.95, 0.25, ±0.725)` and 2 front bottom corners `(±0.95, 0.0, 0.725)` | `BASE_W/2 = 0.95`, `topY = 0.25`, `BASE_D/2 = 0.725` (`turntable.ts:72-76`) |
| Platter (glass disc + index ring) | 8 circumscribed-octagon points at `y = 0.342`, circle radius `0.53` (the glass platter, the widest platter disc — also covering the `0.518` index ring) → vertex radius `≈0.574`, centered `(−0.28, ·, 0)` | glass platter radius `0.53` (`turntable.ts:95`), `indexRing` outer radius `0.518` (`turntable.ts:714-722`), `PLATTER_X = −0.28`; §2.2 rule |
| Card envelope (billboard-safe) | 16 points: at each of `y = 0.938` (card bottom, min bob) and `y = 2.20` (card top, authored over-bound), the 8 circumscribed-octagon points of the **horizontal swept disc** of circle radius `0.47` → vertex radius `≈0.509`, centered `(−0.28, ·, 0)` | `CARD_W/2 = 0.47`, `CARD_Y = 1.5375`, `CARD_H = 1.175`, settle offset `0.06`, bob `±0.012` (`turntable.ts:454-462`, `1225-1242`); §2.2 rule |

Rationale for the swept disc: the card billboards **yaw-only and
unclamped** (`card.lookAt` with flattened camera y,
`turntable.ts:1235-1241`), so its horizontal footprint is
camera-dependent. Authoring the octagon-bounded swept disc at the card's
extreme heights makes the bound camera-independent, exactly as plan §6.1
requires — fitting never depends on the previous frame's camera. The
card's animated top is `top(ce) = 1.5375 + 0.06·(1−ce) + 0.012 +
(0.9 + 0.1·ce)·0.5875` (`cardScale`/`cardY`, `turntable.ts:1226-1228`) —
the settle offset and full scale never co-occur, so the true maximum is
`top(0) ≈ 2.138` and the steady-state top is `≈ 2.137`. The authored
constant `2.20` is a deliberate ≈0.06 over-bound covering both with
margin; D2 approves that margin, not a necessity claim.

Deliberately **excluded** (recommendation, owner decision D2): the open
dust-cover rear swing (reaches `z ≈ −2.03` group-local,
`turntable.ts:304-315`, tick `:1147`) and the parked tonearm rear tip
(`z ≈ −1.24`, `turntable.ts:153-174`). Both sit behind the hero along the
view axis in deck focus; including them would push the camera noticeably
farther back to protect scenery the composition intends to crop. They
remain visible-but-croppable.

Focus center: `x = −0.28, z = 0` is the **intentionally authored
platter/card focal axis** (the hero column the composition centers on —
not the envelope's bounds midpoint, which would be `x = 0` because the
plinth spans `±0.95`); `y = 1.10` is derived as the vertical midpoint of
the authored envelope (`(0 + 2.20) / 2`). `verticalBias = 0.42` (unchanged
intent).

### 2.4 Crate authored points

Group-local (before `vinylS: 1.9`), from the verified constants in
`vinyl-crate.ts`:

| Feature | Authored points | Source constants |
|---|---|---|
| Shell exterior | 4 top corners `(±0.63, 1.063, ±0.4435)`, 4 bottom front/back corners `(±0.63, 0.0, ±0.4435)` | `OUT_W/2 = 0.63`, rear rim top `≈ 1.063`, plate face `z = 0.4435` (`vinyl-crate.ts:319-320`, `:348-349`, `:387`) |
| Pulled sleeve maximum | 4 points: `(±SLEEVE_W/2 = ±0.475, 1.54, 0.26)` top edge and `(±0.475, 1.00, 0.30)` mouth at max forward tilt | lift `0.34`, held tilt `+0.14`, sleeve top incl. rear lip `0.545` → `≈1.54`; pulled z `0.22 + 0.04 = 0.26` (`vinyl-crate.ts:264-278`, `:505-512`, `:992-995`) |
| Raised disc (animated sweep) | 16 points: circumscribed octagons of the **padded** disc circle (radius `0.4508 + 0.010 = 0.4608` → vertex radius `≈0.499`) in **both tilt-extreme planes** (`rotation.x = −0.10` and `+0.14`), each at full preview rise, centered on the pulled sleeve's disc axis | `DISC_RADIUS = 0.4508`, `DISC_RISE = 0.52`, tilt range `−0.10…+0.14` (`vinyl-crate.ts:264-278`, `:992-995`); §2.2 rule + sweep padding below |

A single planar octagon cannot bound a disc that rotates through other
planes, so the authored set bounds the **animated sweep** explicitly. The
disc tilts with the sleeve through a total of `0.24 rad ≈ 13.8°`
(`rotation.x` from `−0.10` rest to `+0.14` held) and rises by translation.
Rotation about the disc's in-plane axis makes each rim point sweep a
circular arc whose maximum excursion beyond the chord between its
endpoint positions is the sagitta
`R·(1 − cos(Δθ/2)) = 0.4508·(1 − cos 6.9°) ≈ 0.0032`; the authored
padding of `0.010` is a **deliberate ≈3× margin** over that computed
sagitta, so circumscribing the padded circle makes the convex hull of the
**two endpoint-plane octagons** contain every intermediate-tilt disc with
room to spare.
Rise is pure translation, so intermediate rises are convex combinations of
the endpoints: the full-rise octagon pair covers the top, and the rest
pose lies inside the shell/sleeve envelope already authored above. AC-2
verifies the joint `(rise, tilt)` sweep against the convex hull of the
**entire authored crate set** — shell, sleeve, and both disc octagons —
not the disc octagons alone.

Deliberately **excluded** (recommendation, owner decision D3): the
return-flight clear waypoint (`DISC_CLEAR_RISE = 0.9658` → disc top
`≈ 2.41` group-local, `vinyl-crate.ts:274-278`, `:709-710`) — it is a
sub-second transit while a record flies back from the deck, not a held
pose; authoring to it would visibly loosen the browse composition. Also
excluded by construction: the invisible hover halos
(`vinyl-crate.ts:533-538`) — authored points make the halo-pollution issue
of `setFromObject` moot for fitting. The focus center's `x = 0, z = 0` is
the authored bin axis; `y ≈ 0.985` is derived as the envelope's vertical
midpoint (replacing the magic `0.55`); `verticalBias = 1.8` (unchanged
steep top-down intent). The disc-related authored constants must equal
the values `registerVinylSleeveProbe` already exposes (`discRadius`,
`previewRise`, `clearRise` — `vinyl-crate.ts:666-695`); the shell/sleeve
constants (`OUT_W`, `TALL_H`, `LIFT`, `TILT`, `PUSH`, plate z) are pinned
by unit fixture directly against the module's build constants. Either way
there is one source of truth — the module constants — and AC-2 pins the
equalities.

### 2.5 Monitor authored points

The monitor's four screen corners are already the authored contract:
`xray.userData.screenCorners` (local to `userData.screenGroup`,
`glass-mac.ts:406-416`) transformed by `getScreenCornersWorld()`
(`glass-mac.ts:531-548`). Phase 5 wraps exactly these four world points as
`framingPoints`, with `center` = corner average and `outward` = the PC's
world `+Z` (both already computed this way at `globe-canvas.tsx:1325-1338`);
`verticalBias = 0`. `getSubjectBoundsWorld()` is **never** used for monitor
fitting — its box is dominated by the mouse at xray-local `x = 2.12`
(`glass-mac.ts:462-464`). The screen plane is genuinely planar and face-on,
which is why the analytic solution is admissible as an oracle (§6). No
octagon is needed: the screen is a quad, and its four corners are its exact
convex bound.

### 2.6 No per-frame bounds computation

The fit path never calls `Box3.setFromObject()`. Authored local points are
constants; world transformation happens only when the solver actually runs
(§5's invalidation events), not per frame. The existing per-hover-frame
`setFromObject` in the crate/PC HUD-bracket getters is out of Phase 5 scope
but is recorded in §1.9 as a candidate for a later cleanup phase.

---

## 3. Safe-frame contract

### 3.1 Definition

The camera-fitting safe frame is computed in **stage CSS pixels** with the
Phase 4 primitives — `computeSafeFrame(stage, reservations)`
(`lib/responsive/hud-layout.ts:81-86`), which insets the stage by
`HUD_EDGE_GUTTER = 16` first and then by caller reservations. Phase 5 adds
one token table to `lib/responsive/hud-layout.ts` (the single home rule of
plan §6.2 — camera and HUD must share these numbers, never duplicate them):

```ts
export type FocusKind = 'monitor' | 'deck' | 'crate'

/** Camera-fit reservations per focus kind, in stage CSS px, applied on top
 *  of HUD_EDGE_GUTTER by computeSafeFrame(). Starting values are
 *  conservative defaults (D6); the measurement pass (§3.2) may only shrink
 *  the resulting safe frame further, never grow it mid-focus. */
export const FOCUS_CAMERA_RESERVATIONS: Readonly<Record<FocusKind, Insets>>
```

Starting values (owner decision D6; conservative defaults until the
measurement pass, chosen from the verified chrome that exists today):

| Kind | top | right | bottom | left | Reserves room for |
|---|---:|---:|---:|---:|---|
| `monitor` | 56 | 44 | 16 | 16 | return control (top-right, `cockpit-hud.tsx:204-206`); the matrix3d ScreenDialog tracks the screen itself |
| `deck` | 56 | 60 | 72 | 60 | return control; prev/next arrows (≥ `HUD_MIN_HIT_SIZE = 44` + gaps); hint row below |
| `crate` | 56 | 60 | 148 | 60 | return control; browse arrows; VinylInfoCard below the crate |

These reservations are **camera-fit** reservations. Phases 6/7 will pin the
HUD-placement reservations from real measured overlays; they must refine
these same tokens rather than introduce parallel constants (plan §6.2:
"Reservations may differ by focus kind, but they must not be duplicated as
unrelated numbers in the camera and HUD files").

### 3.2 Measurement: data flow, barriers, and invalidation

**Data flow (React → camera).** A new module-scope store,
`components/cockpit/focus-fit-store.ts` (same pattern as `hud-sampler.ts`:
plain module state + subscribe, no window global, no DOM events), carries
two things: (a) the **measured overlay maxima** per focus kind, and (b) the
**fit status** (§4.5). Overlay components report their measured maxima into
the store; `globe-canvas.tsx` reads the store synchronously when solving
and subscribes to its epoch for invalidation. Hint overlays subscribe to
fit status (§4.5). The store is production code (the reservations flow and
hint-hiding are production behavior); its diagnostic surface is exposed
only through dev-only hooks (§9.3).

**What is measured, when.** On a focus entry that arms a pass (lifecycle
pass 1 below — an entry without committed maxima), the relevant overlays
are measured — hidden measurement (render with `visibility: hidden` until
the first `ResizeObserver` report, the plan §7 pattern) — using the
**maximum content** for the mode: for the crate info card, the longest
title/category/date strings across the six catalog records (available
synchronously from the catalog adapters); for hints, the full hint string.

**Font barrier.** A measurement pass records maxima only from font-stable
metrics: if `document.fonts.ready` is already resolved (the common case
after boot), the pass completes at the first `ResizeObserver` report or
the 150 ms deadline, whichever comes first; if fonts are still pending,
the pass **waits for `fonts.ready`** (conservative defaults keep
governing; the overlay stays hidden) bounded by a hard 1000 ms ceiling,
after which it completes with fallback metrics and **no later fonts-driven
refine occurs for this entry** — conservative defaults plus fallback
maxima govern until the next measurement pass. Every pass therefore
completes exactly once, and there is never a fallback-metrics bump
followed by a fonts-ready bump inside one pass.

**Reservation lifecycle.** `reservationsEpoch` bumps exactly once per
**completed measurement pass**. Passes are armed by exactly two events:

1. **Focus entry without committed maxima for the kind** (first entry in
   the scene instance, re-entry after a pending pass was cancelled before
   completing, or entry after an accessibility invalidation discarded the
   maxima). Frame 0 of the transition: conservative D6 defaults apply;
   the entry solve runs (solve #1). The entry pass completes per the font
   barrier: maxima recorded, one epoch bump → one refine solve (solve #2
   — the "at most 2" of AC-6). `ResizeObserver` reports arriving after
   the pass completed are stored for the next pass but never re-solve the
   current focus entry. **Re-entry with committed maxima reuses them:**
   no pass is armed and no defaults period occurs — the effective
   reservations are final from frame 0, and the §5.2 cache rule alone
   decides the solve count (one solve if the cached entry is stale or
   absent, zero if its key still matches).
2. **Accessibility text/control size change** (`data-a11y-text`,
   `data-a11y-controls` — large text and large controls change real
   overlay metrics): unfocused kinds' maxima are discarded outright; the
   focused kind's committed maxima are demoted to the
   **effective-but-invalidated buffer** (an already-existing buffer from
   an earlier uncommitted change is retained unchanged — only committed
   maxima are ever demoted; generation law below) and a
   **new replacement pass is armed for the currently focused kind
   only** — unfocused kinds defer measurement to their next entry
   (pass 1); the replacement pass's completion atomically swaps the
   buffer for the new maxima and bumps the epoch once → one refit
   (§5.2 row).
   A user-initiated state change earning a single eased reframe is the
   correct visible response. This arming is independent of the
   once-per-entry rule for entry passes.

Stage resize while focused arms **no** pass: effective reservations are
recomputed synchronously from the **effective maxima** — the committed
maxima, or the effective-but-invalidated buffer while a replacement pass
is running (generation law below), so a resize concurrent with an
accessibility re-measure never falls back to defaults or reads
just-discarded state — no re-measure, no epoch bump; a resize costs
**exactly one** solve (the size-key invalidation of §5.2). Recorded maxima are true maxima across
the supported width range because the hidden measurement constrains the
overlay to the **narrowest supported stage width** (`1024` — the fit-tier
floor and the pinned contained surface width are both 1024): wrapping at
any wider stage can only be equal or smaller. (Live overlay placement by
`resolveFocusHudLayout()` remains out of scope until Phases 6/7; nothing
here wires it.)

**Cancellation and generation law.** Passes carry a per-kind, monotonically
increasing **generation id**; only the newest generation for a kind may
commit (record maxima + bump the epoch). Arming a new pass (an
accessibility size change) supersedes any pending pass — the superseded
pass's late completion is discarded, never committed. Leaving the focus
kind cancels **any pending measurement pass for that kind — entry or
replacement alike** — outright (no bump after exit) but
preserves **committed** maxima; re-entering arms a fresh generation
**only when no committed maxima exist for the kind** — with committed
maxima, re-entry arms nothing and reuses them (pass 1's reuse rule).
**Cancelling a pass that never committed tombstones that kind's fit
cache entry** rather than deleting it outright: the entry was solved
against defaults whose refine never arrived, so it must not satisfy a
future entry — a tombstoned entry is **non-reusable** (re-entry and the
§5.2 matrix treat it as absent, forcing solve #1). But the live renderer
keeps computing the focused pose from the unchanged `focusKind`
throughout the exit ease (`globe-canvas.tsx:964-987`, `1384-1393`), so
the tombstone remains **readable by that ease-out alone**, with no
solve, until `modeT < 0.005` (the settle threshold), when it is dropped.
The retention condition is scoped to **focused→cockpit ease-outs
only** — the case where the departing kind remains `focusKind` and its
pose keeps being computed. On **entry to a different focus kind** while
the departing kind's state is alive, the `modeT < 0.005` condition may
never arrive (a direct focused→focused switch holds `modeT` ≈ 1; an
interrupted exit re-enters before the decay completes), but none is
needed, in either of the renderer's two branches:

- **Capture branch — the renderer's full guard
  `wasFocused && focusKind !== m && modeT > 0.3`
  (`globe-canvas.tsx:974`):** `focusSwitch` captures the current camera
  pose **before** `focusKind` changes, after which the departing kind's
  cache is never read — its tombstone (and any pending pass/buffer, per
  the cancellation rule) is **discarded immediately at that pose
  capture**. `modeT > 0.3` alone is **not** the predicate.
- **Reassignment branch — every other entry to a different focus
  kind:** the renderer creates no `focusSwitch`. This covers a direct
  focused→focused switch early in entry (`modeT ≤ 0.3`) **and the
  interrupted exit**: leaving focus A puts `viewMode` at `'cockpit'`,
  so entering focus B while the ease-out is still above `0.3` has
  `wasFocused === false` and captures nothing. In both cases
  `focusKind` reassigns and the per-frame focused-target computation
  keys on the **new** kind from that frame on, so the old pose is never
  read again — the departing kind's state is **discarded immediately at
  the `focusKind` reassignment**.

**Same-kind interrupted re-entry** (exit A, then re-enter A while its
tombstone is alive): neither branch fires a distinct cleanup event —
`focusKind !== m` is false — and none is needed: the re-entry arms a
fresh generation and, because the tombstone is non-reusable, performs
solve #1, whose cache write **atomically replaces** the tombstone. The
tombstone is never read as a valid entry and never left dangling; the
cancelled generation never commits.

General garbage-collection law: a tombstone exists only while its kind
is the active easing `focusKind`; it is dropped the moment that stops
being true — at the capture or reassignment cleanup above, by the
same-kind atomic replacement, at `modeT < 0.005` on a completed cockpit
exit, or at scene teardown, whichever comes first. The same deferral generalizes: any rule that
would remove the current `focusKind`'s entry while `modeT ≥ 0.005`
(including the unfocused-kind deletion below when that kind is still
easing out) degrades to a tombstone under the same GC law — preserving
the §9.2 "return to ambient: no solve, ease-out unchanged" contract
while keeping the counts deterministic. An accessibility size change discards the
**unfocused** kinds' recorded maxima and deletes their cache entries
(they take the pass-1 path on their next entry). The focused kind is
**double-buffered**: its old committed maxima are demoted to an
**effective-but-invalidated buffer** that continues to govern effective
reservations — including any concurrent resize recomputation — while
the replacement pass (pass 2) runs, and its cache entry is kept,
still key-valid under the old epoch. The pose therefore holds steady
and no default-reservation solve or stale-metrics ambiguity intervenes;
replacement completion **atomically** swaps the buffer for the new
maxima and bumps the epoch, producing the **single** refit AC-6
requires. If the replacement pass is cancelled before committing (focus
exit), the buffered maxima are discarded and the cache entry follows the
tombstone rule above. **Buffer ownership across successive changes:** an
existing buffer survives every replacement-generation supersession — a
further accessibility change while a replacement is pending supersedes
the pending generation but leaves the buffer untouched (there are no
committed maxima left to demote; the buffer already holds the last
committed values) — and only the **newest** generation's completion
atomically replaces it, so resize reads stay well-defined across rapid
text/control toggles. Focus exit discards the buffer.
Scene teardown/remount resets the
`focus-fit-store` completely — pending generations, recorded maxima, fit
statuses, and degraded episodes (§9.2). AC-6's exact counts hold under
every overlap of these events because at most one generation per kind can
ever commit between two solves.

**Anti-pumping law:** reservations are otherwise fixed for the whole focus
mode — derived from maxima, not from whichever controls happen to be
visible (plan §6.2). Selection changes, card swaps, hint visibility, and
the deck-swap grace never change the safe frame; per-frame HUD sampling
never feeds back into fitting. The only reframe triggers are enumerated in
§5.

### 3.3 CSS → NDC conversion

The solver consumes asymmetric NDC bounds. Conversion uses the same
same-frame rects the Phase 4 sampler already collects
(`publishHudFrame()`, `globe-canvas.tsx:1157-1217`): with
`safe` in stage coordinates, `canvasOffset = canvasRect − stageOrigin`
(as in `HudFrameSnapshot.canvasOffset`), and canvas CSS size `cw × ch`:

```
ndcMinX = ((safe.x            − canvasOffset.x) / cw) * 2 − 1
ndcMaxX = ((safe.x + safe.w   − canvasOffset.x) / cw) * 2 − 1
ndcMaxY = 1 − ((safe.y          − canvasOffset.y) / ch) * 2
ndcMinY = 1 − ((safe.y + safe.h − canvasOffset.y) / ch) * 2
```

This is the exact inverse of the Phase 4 stage-projection formula
(`docs/responsive-system.md` §3.2), so a point that the solver accepts is by
construction a point the sampler will project inside the safe frame. The
conversion helper is pure and lives beside the solver (§4.1); a unit test
pins the round-trip against `projectPointToStage()`.

### 3.4 Invalid or too-small safe frames — and the center invariant

Ordered degradation, evaluated before each solve:

1. If `computeSafeFrame(stage, effectiveReservations)` yields a frame
   smaller than `MIN_FIT_FRAME_PX` (token, starting value `160×120` stage
   CSS px), **or** its NDC bounds fail the §4.3 optical-center invariant
   (`minX ≤ 0 ≤ maxX` and `minY ≤ 0 ≤ maxY`), retry with the mode
   reservations dropped (edge gutter only). The edge-gutter frame always
   contains the canvas center whenever the canvas fills the stage (the
   production layout), so this step restores the invariant.
2. If even the edge-gutter frame is smaller than `MIN_FIT_FRAME_PX` (a
   transient zero/tiny mount box — the Phase 3 zero-size guard already
   freezes sizing in this state, `e2e/smoke.spec.ts:489`), the solve is
   **skipped**: the camera keeps its last valid fit (or the §4.5 fallback
   if none exists) and a refit is queued for the next valid stage size.
3. A degenerate stage (`w or h ≤ 0`, non-finite) never reaches the solver —
   the same validity philosophy as `hasValidContext()` in
   `stage-projection.ts:60-75`.

Contained mode note: in zoom/narrow tier the stage surface is pinned to
`1024×600` (§1.6), so the camera always fits against that surface — the
solve inputs are the surface's CSS size, which is exactly what the renderer
measures (`docs/responsive-system.md` §3.1 "Contained mode measures the
`1024×600` ResponsiveStage surface").

---

## 4. Projection-based fit solver

### 4.1 Module boundary and API

New strict-island module `lib/responsive/camera-fit.ts` — pure, three-free
(like `stage-projection.ts`), fully unit-testable, `tsconfig.contracts.json`
covered. It performs its own basis/projection arithmetic on plain vectors;
it never touches a `THREE.Camera`, so **no live renderer or camera state is
mutated during speculative distance tests** — the "safe restoration
contract" question is answered by construction: there is nothing to
restore. The existing throwaway `focusLookCamera` remains only for the
final pose quaternion, as today (`globe-canvas.tsx:956`, `1297-1300`).

```ts
export type FitVec3 = { readonly x: number; readonly y: number; readonly z: number }

export type FitCameraInput = {
  readonly center: FitVec3            // world
  readonly direction: FitVec3         // unit, camera→center is −direction;
                                      // built by the caller from
                                      // normalize(outward + (0, verticalBias, 0))
  readonly up?: FitVec3               // default (0,1,0)
  readonly points: readonly FitVec3[] // world framing points (≥ 1)
  readonly fovYRad: number
  readonly aspect: number
  readonly near: number
  readonly ndcBounds: {               // asymmetric, from §3.3; MUST contain
    readonly minX: number; readonly maxX: number   // the optical center:
    readonly minY: number; readonly maxY: number   // minX ≤ 0 ≤ maxX,
  }                                                // minY ≤ 0 ≤ maxY (§4.3)
  readonly distance: { readonly min: number; readonly max: number }
  readonly maxIterations?: number     // default 16
  readonly tolerance?: number         // world units, default max(1e-3, 5e-4 · distance.max)
}

export type FitCameraResult =
  | { readonly status: 'fit'; readonly distance: number; readonly iterations: number }
  | {
      readonly status: 'no-fit'
      readonly reason:
        | 'invalid-input'        // non-finite/empty points, bad bounds, min ≥ max,
                                 //   or bounds violating the center invariant
        | 'unfittable-at-max'    // some point still outside bounds at distance.max
    }
```

A `no-fit` result carries **no usable distance** — the adapter applies the
plan-§10 fallback rule (§4.5); the solver never invents a pose.

### 4.2 Candidate test

For candidate distance `d`:

1. Camera position `p = center + direction · d`; camera forward is
   `−direction` (looks at `center`); right/up basis from
   `normalize(cross(up, direction))` with the degenerate near-vertical case
   (crate: `direction` is steep) handled by re-orthogonalizing against
   world `+Z` when `|dot(up, direction)| > 0.999` — matching what
   `Object3D.lookAt` does, so the pure solve agrees with the rendered pose
   (equivalence pinned by the §4.8 oracle).
2. Each framing point transforms into this view basis. A point is
   **rejected** (candidate fails) when `viewZ >= −near` (on/behind the near
   plane) or any coordinate is non-finite — the same rule as
   `isValidProjectionSample()` (`stage-projection.ts:78-92`).
3. Perspective: `ndcX = viewX / (−viewZ · tan(fovY/2) · aspect)`,
   `ndcY = viewY / (−viewZ · tan(fovY/2))`.
4. The candidate **fits** iff every point is valid and inside the
   asymmetric `ndcBounds` (inclusive).

### 4.3 Search, and why it is sound

**Monotonicity invariant.** The camera moves along the fixed ray
`center + direction · d` with a fixed basis, so each framing point's
lateral view coordinates (`viewX`, `viewY`) are constant in `d` while
`−viewZ` increases affinely. Each projected point therefore travels
monotonically along a straight ray **toward NDC `(0, 0)`** as `d` grows.
Consequently:

- If the bounds contain the optical center (`minX ≤ 0 ≤ maxX`,
  `minY ≤ 0 ≤ maxY`), then once a point enters the bounds it never leaves —
  the feasible set is an interval `[d*, ∞)` and binary search is valid.
- If either axis of the bounds excludes 0, points converge to a limit
  outside the bounds, large `d` fails, and the feasible set need not be an
  interval — binary search is **unsound**. The solver therefore **requires**
  the center invariant and returns `no-fit / invalid-input` when it is
  violated; §3.4 step 1 restores the invariant upstream by dropping
  reservations. (A future solver for center-excluding frames would be a
  separate, explicitly-designed feature; no Phase 5 reservation set
  violates the invariant — §10 AC-1 pins both facts.)

**Search procedure:**

1. Validate input (`invalid-input` short-circuit, including the center
   invariant).
2. Test `distance.max`. If it does not fit → `no-fit / unfittable-at-max`.
3. Test `distance.min`. If it fits, return it (already smallest allowed).
4. Otherwise binary-search `(min, max]`, keeping the smallest fitting
   distance; stop at `maxIterations` (default 16) or when the bracket is
   narrower than `tolerance`. 16 iterations resolve the bracket to
   `(max − min) / 2¹⁶` — sub-millimeter at cockpit scale, well past the
   plan §6.3 "ten to sixteen" requirement. The near-plane rejection makes
   small candidates fail, which the bracket handles naturally.

### 4.4 Per-kind search bounds

Authored per focus kind (tokens beside the reservations, D6):

| Kind | `distance.min` | `distance.max` | Basis |
|---|---:|---:|---|
| `monitor` | 1.0 | 40 | today's fits land ≈3–6 world units; min protects the near plane (0.1) with margin |
| `deck` | 2.0 | 60 | preserves today's floor (`max(2, …)`, `globe-canvas.tsx:1288`) |
| `crate` | 1.5 | 60 | preserves today's floor (`max(1.5, …)`, `globe-canvas.tsx:1307`) |

`far = 2000` is never a constraint at these scales.

### 4.5 Failure behavior — the plan §10 rule, adopted exactly

Plan §10 (`docs/hud-responsive-layout-plan.md:2653-2657`) is the governing
contract: *"If the camera solver fails to find a distance, use the last
valid distance, log one development warning, and hide nonessential hints.
Never apply a non-finite camera pose."* Phase 5 implements it verbatim:

1. **Pose:** on any `no-fit` (or provider `null`/invalid target, §2.1), the
   adapter keeps the **last valid solved distance for that focus kind**
   (finite by construction). If no valid solve has ever succeeded for the
   kind in this scene instance, it uses the authored
   `FOCUS_FALLBACK_DISTANCE[kind]` token. Starting values (D6), derived by
   evaluating the §1.3 formulas at the 1440×900 reference with the live
   `TWEAK_DEFAULTS` transforms — Codex re-derives them at implementation
   and records the actuals in the report:

   | Kind | `FOCUS_FALLBACK_DISTANCE` (world units) |
   |---|---:|
   | `monitor` | 1.7 |
   | `deck` | 3.8 |
   | `crate` | 3.0 |

   The existing hard-coded monitor fallback pose
   (`globe-canvas.tsx:1359-1364`, used when `screenCorners` is absent)
   remains the terminal fallback. A non-finite pose is never applied — the
   adapter validates the assembled position before writing it.
2. **One development warning:** the adapter logs exactly one
   `console.warn` per failure **episode**, development-only (`NODE_ENV`
   guard), naming the kind and reason. An episode begins when the kind's
   status transitions into failure from any non-failed state — including
   the initial no-result state, so a cold-start first-solve failure warns
   too. A later successful solve closes the episode; a subsequent failure
   warns once again.
3. **Hide nonessential hints:** while a kind's fit status is degraded, the
   `focus-fit-store` (§3.2) publishes `degraded: true` for it; the hint
   overlays (`browse-hint` in crate mode, the deck hint) subscribe and do
   not render. Arrows, the info card, the return control, and the
   ScreenDialog — essential controls — stay. This store read is production
   behavior mandated by plan §10; it does not re-anchor any overlay and
   does not touch the Phase 6/7 solver wiring boundary.
4. **Observability:** the full status/reason is exposed to tests through
   the dev-only `getFocusFit()` hook (§9.3).

### 4.6 Parallax allowance

Focused-mode parallax offsets the solved camera position by at most
`0.25 · 0.15 ≈ 0.0375` world units (monitor; deck `0.25 · 0.12 = 0.03`;
crate none) — the §1.3 constants. At the minimum plausible fit distances
(§4.4) this shifts projections by well under the 16 px `HUD_EDGE_GUTTER`
already inside the safe frame. Rather than inflating the solver, the design
pins this with a test: §10 AC-3 asserts framing points stay inside the
safe frame **with the pointer parked in a stage corner** (maximum
parallax), at every required viewport. If the margin ever fails, the fix is
a small `FIT_NDC_MARGIN` token, not a solver change.

### 4.7 Pose continuity and the refit transition

The solver replaces only how `dist` is computed. The focused pose is still
assembled per frame from the cached distance (§5): position
`center + direction · distCached` plus parallax, orientation via
`focusLookCamera.lookAt(center)` — `modeT` easing, `focusSwitch` blending,
and the settle report (`globe-canvas.tsx:1384-1406`) are untouched.

The `modeT` interpolation alone does **not** protect a mid-focus refit:
once settled (`modeT ≈ 1`) the loop assigns the camera directly from the
focused target every frame (`globe-canvas.tsx:1384-1393`), so changing the
cached distance while settled would jump the pose in one frame. Phase 5
therefore adds a **refit transition**, reusing the existing `focusSwitch`
blend machinery (`globe-canvas.tsx:1368-1382`):

- **Trigger:** applying a changed fit result (distance, direction, or
  center) for the current focus kind while `modeT > 0.3` — the same
  threshold the focused-pose switch uses. Below it, the in-flight `modeT`
  ease absorbs the new target.
- **Mechanics:** capture the camera's current `{position, quaternion}`
  and start a `focusSwitch`-style blend toward the new focused pose with
  authored duration `REFIT_BLEND_S = 0.6` (named constant beside the
  existing `0.38`/`0.85` switch durations; `0.6` rather than a shorter
  blend so the quadratic ease's peak speed `2·L/T` stays at `10 wu/s`
  for the ≤3 wu refit paths — inside AC-7's 12 wu/s bound with margin,
  which a 0.45 s blend would violate at `≈13 wu/s`). Refit blends
  advance by `min(dt, REFIT_MAX_FRAME_STEP_S = 1/30) / REFIT_BLEND_S`:
  the raw `focusSwitch.t += dt / duration` advance
  (`globe-canvas.tsx:1374`) would let a single stalled frame ≥ 600 ms
  complete the blend — and jump — in one step, so the refit path clamps
  the per-frame time step (per-frame progress ≤ `(1/30)/0.6 ≈ 5.6%`).
  `REFIT_BLEND_S` is therefore the **nominal duration at ≥ 30 fps**:
  below 30 fps the clamp deliberately stretches wall-clock completion
  (≈1.8 s at a sustained 10 fps) — the speed and single-frame
  displacement guarantees are what is frame-rate-independent, not the
  wall-clock duration. Mode-switch blends keep their existing unclamped
  advance; AC-7 pins their timing as unchanged.
- **Interruption/coalescing:** a newer refit or a focused-pose switch
  during the blend re-captures the **current interpolated pose** and
  retargets — exactly how `focusSwitch` replacement behaves today; blends
  never queue, the newest target always wins.
- **Settle semantics:** unchanged by construction — `reportFrame` already
  requires `!focusSwitch` (`globe-canvas.tsx:1401-1406`), so a refit in
  flight reads as unsettled and `isSettled()` waits for it.
- **`captureActive`:** the blend is discarded and the pose snaps, exactly
  as `focusSwitch` is discarded during capture today
  (`globe-canvas.tsx:1370-1373`).
- **Reduced motion:** the blend is skipped and the refit applies in one
  frame — an animation removal, matching the restoration-table principle
  that transitions snap to settled poses; AC-7 measures continuity with
  reduced motion off and exempts this deliberate snap.

### 4.8 Three.js equivalence oracle

A dedicated unit test (`tests/unit/camera-fit-oracle.test.ts`, test-only —
`three` imports are not restricted in `tests/unit`, §1.8) constructs an
actual `THREE.PerspectiveCamera`, applies `position/lookAt/
updateMatrixWorld` for sampled `(center, direction, d)` triples, projects
the framing points with `Vector3.project(camera)`, and asserts the pure
solver's per-point NDC agrees within `1e-6`. This protects the hand-rolled
basis and sign conventions (including the near-vertical re-orthogonalization
branch) against divergence from the rendered pose.

---

## 5. Cache and invalidation law

### 5.1 Cache shape and location

One cache per scene instance (closure state in `globe-canvas.tsx`, so a
rebuild/remount starts empty by construction), keyed per focus kind:

```
fitCache: Map<FocusKind, {
  distance: number            // distance applied to the pose: last valid
                              //   solve, or FOCUS_FALLBACK_DISTANCE when
                              //   no solve has ever succeeded (§4.5)
  direction: {x,y,z}          // copied, not provider scratch
  center: {x,y,z}             // copied
  degraded: boolean           // §4.5 episode state
  reason?: string
  key: {
    cssW, cssH,               // stage CSS size (surface size in contained mode)
    fovY, near,               // camera intrinsics
    reservationsEpoch,        // bumps per §3.2 (measurement refine, a11y size change)
    transformEpoch,           // bumps on any authored-transform mutation
  }
}>
```

The per-frame focused-pose code reads the cache entry; if the entry's key
does not match the current values, the solve runs once and the entry is
updated (on `no-fit`, the key updates and `degraded` is set while
`distance` keeps the applied value per §4.5 — the last valid solve, or
the fallback token before any success). Solves therefore happen on the
frame after an invalidating event, never repeatedly.

### 5.2 Invalidation matrix

| Event | Effect on cache | Verified trigger source |
|---|---|---|
| Focus-kind change (`setViewMode` to a focused mode) | solve for that kind if its entry is stale or absent; other **committed** entries untouched — a departing kind's tombstone and uncommitted pass/buffer are dropped at the switch cleanup — the pose capture only when the full `wasFocused && focusKind !== m && modeT > 0.3` guard holds, the `focusKind` reassignment itself otherwise (§3.2 GC law) | `globe-canvas.tsx:964-987` |
| Stage CSS width/height/aspect change | all entries stale (key mismatch on `cssW/cssH`) → exactly one solve per kind on next use; **no re-measure** (§3.2 resize rule) | `createRendererSizeSync.onApplied` with `cssSizeChanged === true` (`renderer-size-sync.ts:50-59`) |
| **DPR-only change** | **no effect** — key deliberately excludes DPR and `sizeVersion`; `onApplied` with `dprChanged && !cssSizeChanged` does not touch the cache | `renderer-size-sync.ts:54-60`; guarded by §10 AC-5 |
| Camera FOV/near change | key mismatch (static in production; keyed defensively) | `globe-canvas.tsx:150` |
| Authored-bound / transform change (`__cockpitPC.setTransform`, `__cockpitVinyl.setTransform`, `__cockpitTurntable.setTransform`, `__cockpitFPV.setOffset`, `setArmPose`) | `transformEpoch` bump → all entries stale | bridge setters (`globe-canvas.tsx:718-732`, `turntable.ts:48-54`, `vinyl-crate.ts:285-293`); these are dev-tweak paths, cheap to over-invalidate |
| Measurement-pass completion (entry pass — at most one per focus entry; none on a reuse re-entry) | `reservationsEpoch` bump → current kind's entry stale, one refit | §3.2 pass 1 |
| Focus exit with any uncommitted (cancelled) pending pass — entry or replacement | that kind's cache entry **tombstoned** — non-reusable, readable only while its kind is still the easing `focusKind` (focused→cockpit ease-out, dropped at `modeT < 0.005`); on entry to a **different** focus kind it is dropped at the switch cleanup — the `focusSwitch` pose capture only when the full `wasFocused && focusKind !== m && modeT > 0.3` guard holds, the `focusKind` reassignment otherwise (incl. the interrupted-exit path); a **same-kind** re-entry atomically replaces it via its solve #1 (§3.2) → re-entry always performs solve #1 | §3.2 generation law + GC law |
| Accessibility size change — unfocused kinds | maxima discarded + cache entries deleted (degraded to a tombstone while that kind is still the easing `focusKind`) → pass-1 path on next entry | §3.2 generation law |
| Accessibility large-text / large-controls change (`data-a11y-text`, `data-a11y-controls`) — focused kind | new measurement pass armed; the cache entry is **retained** (key-valid under the old epoch) until the pass completes, whose epoch bump → exactly one refit | §3.2 pass 2 + generation law; provider live state (`components/responsive/accessibility-provider.tsx`) |
| Context rebuild / remount | cache is closure state → empty; `degraded` episodes reset | `cockpit-app.tsx:197-206` keyed remount |
| Ambient animation, platter spin, card bob, hover, selection changes, per-frame HUD sampling, font metrics after the entry's measurement completed | **never** — bounds are authored to maxima (§2) and reservations are fixed per §3.2 | §2.3–§2.5, §3.2 |

### 5.3 Feedback-loop prohibition

The refit inputs (stage size, reservations, authored bounds, camera
intrinsics) are all upstream of rendering; nothing derived from a rendered
frame (projected rects, HUD measurements of subject-tracking overlays,
sampler output) may invalidate the cache. The measurement refine (§3.2)
measures **overlay chrome sizes**, which do not depend on camera pose — so
the loop cannot close. §10 AC-6 pins solve-count discipline with a dev-only
counter.

---

## 6. Monitor reconciliation

**Recommendation (owner decision D1): route the monitor through the shared
point solver**, using its four authored screen corners (§2.5) against the
`monitor` safe frame, with the same cache, failure, and fallback semantics
as deck and crate.

Rationale:

- One code path, one invariant, one test surface — the §10 AC-3 assertion
  ("every framing point inside the safe frame") holds for all three kinds
  by the same mechanism.
- The screen is planar and face-on, so the analytic
  `max(distV, distH)` solution (`globe-canvas.tsx:1341-1347`) is exact for
  a **symmetric** frame — but the Phase 5 safe frame is asymmetric
  (top-right return control), which the analytic form does not model
  without re-deriving it into an offset-aware variant. The solver gets the
  asymmetric case right for free.
- Cost is negligible: ≤16 candidate tests × 4 points, only on §5 events.

The analytic solution is retained **as a unit-test oracle**: for a
symmetric frame, the solver's distance must match the closed form within
tolerance (§10 AC-8). This preserves the plan §6.4 insight (the formula
remains suitable for the planar screen) as executable evidence instead of a
parallel production path.

Alternative (if D1 is declined): keep the analytic fit but generalize it to
asymmetric bounds and put it behind the same `FitCameraResult` interface,
cache, and fallback rules. The fit invariant, failure semantics, caching,
and resize response must be identical either way; only the internal math
differs. The ScreenDialog's matrix3d attachment is unaffected in both
options — it tracks the projected screen quad via the Phase 4 sampler, not
the fit.

---

## 7. Input architecture

Two runtime paths, two mechanisms, one policy module. Every tuning value
lives in `lib/responsive/input-policy.ts` (existing) or is added there;
nothing is selected by user-agent, OS, or device sniffing (§10 AC-20).

### 7.A Hover free-look

Producer stays in `components/cockpit/cockpit-hud.tsx`; the handler is
rewritten to consume the shared policy:

- **Coordinate origin:** the live **visible** stage box, center-origin. In
  `fit` mode this is the stage rect (`stageRef.getBoundingClientRect()`);
  in contained mode it is the ResponsiveStage **container's** client rect —
  the region the pointer can physically reach — not the pinned `1024×600`
  surface. This is what makes the plan's numbers work at the small end:
  `responseExponentFor()` computed from the visible box yields `1.7` at
  `512×300` and the stage-edge-reaches-full-envelope guarantee holds
  without needing to pan first. (Camera fitting, by contrast, uses the
  surface size — §3.4 — because the renderer measures the surface.)
- **Mapping:** per axis,
  `hoverAngle(pointer, center, halfSize, maxAngle, exponent)`
  (`input-policy.ts:71-81`) with
  `exponent = responseExponentFor({ w: box.width, h: box.height })`.
  `hoverAngle` clamps the normalized offset to ±1 — this single change
  fixes the §1.4 envelope-overshoot defect while preserving the full
  `±22°/±15°` reach at the stage edge on every supported viewport
  (`1 ** e === 1`).
- **Constants:** `MAX_YAW_RAD` / `MAX_PITCH_RAD` are imported; the
  hard-coded duplicates at `cockpit-hud.tsx:161-162` are deleted.
- **Never `sizeRatioFor()`**, never any reference-dimension divisor, on
  this path — the §9.4 primary regression guard.
- **Focused-mode parallax:** the same normalized, shaped, clamped offset,
  scaled by the existing parallax input constants (`0.25`/`0.15`), which
  move into `input-policy.ts` as named exports
  (`PARALLAX_YAW_SCALE`, `PARALLAX_PITCH_SCALE`) so the last hover tuning
  numbers leave the JSX. The camera-side multipliers
  (`0.12/0.08`, `0.15/0.1`) are authored composition values and stay with
  the camera (§1.3). The exponent shaping applies before scaling — the
  parallax curve inherits the same damping.
- **Listener and exit behavior:** keep a window-level `pointermove` (feel
  parity with today — free-look responds while the cursor crosses chrome),
  with the clamp providing the bound. When the pointer leaves the document
  (`pointerleave`/`mouseleave` on `document.documentElement`, and on
  `blur`), targets decay to `0` through the existing smoothing — the
  camera settles to center rather than sticking at an edge angle. On
  `interactive === false` targets are zeroed (existing behavior,
  `cockpit-hud.tsx:141-146`).
- **Resize:** the visible box is read per event, so resize is inherently
  handled; no cached dimensions.
- **Reduced motion:** `resolved.reducedMotion` from `useAccessibility()`
  forces yaw/pitch targets to `0` and bypasses the eased settle (targets
  apply immediately; the smoothing lerp is skipped so no residual drift
  animation plays). The provider resolves persisted explicit overrides
  plus live `matchMedia` signals (`accessibility-provider.tsx:6-8`), so
  both the OS setting and the ACCESSIBILITY dialog's explicit
  Reduced/Full choice take effect mid-session (§10 AC-18 tests both
  directions and their precedence). Free-look and focused parallax are
  both disabled; clicking, focusing, Escape, and all view-mode transitions
  (camera state changes, not decorative parallax) remain.
- The render-loop smoothing (`globe-canvas.tsx:1266`) and
  `captureActive` snap are unchanged; `__cockpitSmoothedYaw/Pitch`
  publication is unchanged (pinned bridge names).

### 7.B Contained-stage pan

New controller for `ResponsiveStage`'s contained mode
(`components/responsive/` — a hook, e.g. `use-contained-pan.ts`, plus pure
policy additions in `input-policy.ts`). Active **only** when
`data-stage-mode="contained"` (zoom/narrow tier, §1.6); in `fit` mode no
listener is attached. Because the controller exists only in contained
mode, **browser pan evidence runs at contained viewports** (`800×450`,
`683×325`, `512×300`, `320×568`) while the gain curve itself is verified
as pure unit evidence at the plan's reference sizes — see §10 AC-12 and
amendment A1.

- **Transport:** native scrolling remains the ground truth. The controller
  owns a **pan accumulator** per axis, defined as the target
  `scrollLeft`/`scrollTop` of the container, clamped to
  `[0, surface − container]`. Native scrollbar drags and any other native
  scroll remain functional: a `scroll` event not caused by the controller
  re-syncs the accumulator.
- **Position law** (first entry vs. re-sync — these are distinct):
  - **Entering contained mode** (tier transition or first mount in
    contained tier): the accumulator — and the container scroll — start
    **centered** (`(surface − container)/2` per axis), presenting the
    composition's center rather than the top-left corner.
  - **While contained** (resize within the tier): offsets are re-clamped
    to the new range, preserving position; no recentering.
  - **Renderer rebuild/recovery:** the controller lives in
    `ResponsiveStage`, **outside** the keyed scene remount
    (`cockpit-app.tsx:320-341`), so it neither re-initializes nor moves
    the scroll — preserving the Phase 3 AC-13 no-drift pin (§1.6).
  - **Re-entering contained** after a round trip through fit mode:
    centered again (the previous crop is stale composition state, not a
    user preference).
- **Gain:** managed inputs advance the accumulator by
  `delta × sizeRatioFor({ w: innerWidth, h: innerHeight })` — the live CSS
  viewport, the same source `ResponsiveStage` uses for tier selection.
  Applied to accumulated drag, trackpad/wheel, and keyboard pan **only**
  (never hover). At the declared contained cases: `800×450 → 0.5`
  (2× movement); `683×325`, `512×300`, and `320×568 → 0.45` floor
  (≈2.2×), per plan §A.5 and amendment A1.
- **Pointer drag:** primary-button `pointerdown` on the container arms a
  candidate gesture; travel beyond the shared slop
  (`POINTER_ACTIVATION_SLOP_PX = 6`; travel = **maximum Euclidean
  displacement from the down position**, not path length — §7.C) captures
  the pointer
  (`setPointerCapture`) and pans by the inverted pointer delta × gain.
  Sub-slop gestures never pan; their pointerup is delivered normally and
  resolves as a cockpit activation per §7.C. Drag ends on `pointerup`;
  `pointercancel`, window `blur`, container focus loss, stage-mode exit,
  and context-recovery remount all release capture and end the gesture
  cleanly (no stuck capture).
- **Wheel:** a non-passive `wheel` listener on the container only.
  **Modifier law first** (§8): `ctrlKey` wheel events (trackpad
  pinch-zoom and keyboard-assisted browser zoom) are **never consumed and
  never `preventDefault()`ed** — browser zoom is the user's, and the
  system responds only to the resulting viewport change (plan §A.2);
  `metaKey`/`altKey`-modified wheel is likewise passed through untouched.
  `shiftKey` selects the horizontal axis: if `shiftKey` is set and
  `deltaX === 0`, `deltaY` is routed to the horizontal accumulator;
  otherwise the dominant-magnitude axis is used. For consumed events:
  `normalizeWheelDelta(delta, deltaMode, context)`
  (`input-policy.ts:125-135`) with `context.lineHeightPx` = the
  container's computed `line-height` (fallback 16) and
  `context.pageSizePx` = the container's client size along that axis; the
  spike clamp `MAX_WHEEL_STEP_PX = 240` applies inside the policy. The
  normalized delta × gain feeds the accumulator. Consumption rules are
  §8's.
- **Smoothing:** the visual scroll position approaches the accumulator with
  a fixed-time-constant exponential (`PAN_SMOOTHING_TAU_MS = 90`), applied
  in a short rAF loop that runs **only while** position ≠ target (this is
  UI chrome outside the cockpit scene; it does not touch the Phase 4 frame
  lanes or the sampler). Reduced motion sets position = target immediately
  (no loop).
- **Inertia (owner decision D5):** drag release with velocity continues the
  pan with exponential decay (`PAN_INERTIA_HALFLIFE_MS = 120`).
  Deterministic, frame-rate-independent termination: speed falls below
  `PAN_INERTIA_MIN_SPEED_PX_S = 30` CSS px/s, **or** either axis reaches
  its bound (that axis stops; the gesture ends when both stop), **or**
  `PAN_INERTIA_MAX_MS = 600` elapses, **or** any new input, focus loss,
  mode exit, or visibility change cancels it. Wheel input never gets
  inertia (trackpads deliver their own momentum trains; adding more
  double-animates). Reduced motion removes inertia entirely; explicit
  non-animated pan remains.
- **Keyboard:** when the container (the labelled region, already
  `tabIndex={0}`) has focus: `ArrowUp/Down/Left/Right` and `W/A/S/D` pan
  by `PAN_KEY_STEP_PX = 48` × gain per keydown, native key repeat
  accepted; `Home` resets to center (accumulator = midpoint of each axis
  range); `PageUp/PageDown` pan by the container's client height × gain.
  Keys are consumed only when the region is focused and the axis can move
  (§8). Reset-to-center is also exposed as a visible control (§7.D, D4).
- **No sniffing:** behavior never branches on user agent, platform, or
  pointer "type" heuristics; pixel/line/page handling comes only from
  `WheelEvent.deltaMode`; the modifier law reads only the event's own
  modifier flags.

New pure policy exports (unit-tested in the strict island):
`clampPanOffset`, `panStep(delta, sizeRatio)`, `inertiaDecay(speed, dtMs)`
(pure, fed by caller timestamps — no `Date.now()` inside the island),
`POINTER_ACTIVATION_SLOP_PX`, `PAN_KEY_STEP_PX`, `PAN_SMOOTHING_TAU_MS`,
`PAN_INERTIA_HALFLIFE_MS`, `PAN_INERTIA_MAX_MS`,
`PAN_INERTIA_MIN_SPEED_PX_S`.

### 7.C Gesture arbitration — drag versus click activation

§1.5 verified that every interactive artifact — five handler sites
covering seven click targets plus the deck/crate click-away exit
branches — acts on immediate `pointerdown`. That is incompatible with
drag-to-pan: the action fires before the gesture's nature is knowable.
The shared rule (owner decision D8):

**All cockpit pointer-initiated actions become click-semantics: they fire
on `pointerup` of the same `pointerId`, only when total pointer travel
stayed within `POINTER_ACTIVATION_SLOP_PX` (6 px) and the gesture was not
claimed by the pan controller.** This covers artifact activations **and**
the deck/crate click-away/empty-space exit branches (§1.5) — every
`pointerdown`-initiated action in those handlers, with no exception.
Uniform in fit and contained mode — one interaction grammar, no per-tier
divergence.

Mechanics:

- **One canvas-level arbiter, not five wrapped listeners.**
  `components/cockpit/pointer-activation.ts` owns the **single**
  `pointerdown`/`pointermove`/`pointerup`/`pointercancel` listener set on
  the renderer canvas. The five §1.5 sites stop registering their own
  pointer listeners and instead register `{ hitTest, action }` entries
  with an explicit **priority order that pins today's effective
  capture-registration order — crate, deck, coffee, decorations, PC**.
  At `pointerdown` the arbiter runs the registered hit-testers in
  priority order against the current view mode and the down position,
  and resolves **exactly one owner** (possibly a click-away/no-hit
  branch) for that `pointerId` — at most one pending record per pointer
  exists, structurally. This replaces the implicit
  `stopImmediatePropagation()` protocol (§1.5): the crate/deck
  same-click double-read cannot recur because ownership is resolved once,
  and the action runs at `pointerup`, after which no other site is
  consulted.
- **`pointerdown` must reach the pan controller.** The arbiter never
  calls `stopPropagation`/`stopImmediatePropagation` on `pointerdown` —
  the ResponsiveStage container above the canvas needs the event to arm a
  §7.B drag candidate. All activation-related propagation suppression
  (including the PC handler's current `preventDefault`) happens on the
  **resolved `pointerup`** instead.
- **Slop and claim rules:** the arbiter accumulates travel — defined as
  the **maximum Euclidean displacement from the `pointerdown` position**,
  not path length — from `pointermove`, and invalidates the pending
  record once travel exceeds `POINTER_ACTIVATION_SLOP_PX`. Pan capture is
  defense-in-depth on top: when the pan controller claims the gesture, it
  calls `setPointerCapture` on the container, retargeting the
  `pointerup` away from the canvas so the arbiter never sees it. Records
  are keyed by `pointerId`; a `pointerup` with no live record (e.g. a
  press that began on the §7.D bar and released over the canvas) is
  ignored; `pointercancel`, `lostpointercapture`, and window `blur`
  clear pending records.
- Escape/keyboard activation paths are unaffected.

Consequence the owner must accept in D8: artifact actions now fire on
release, not press — the standard click contract, but a perceptible
behavior change in fit mode too. The alternative (arbitrate only in
contained mode) keeps fit-mode press-activation but forks the interaction
grammar per tier and leaves the press-vs-drag race in any future fit-mode
gesture; it is not recommended.

§10 AC-17 proves both directions: a drag beginning over **every**
interactive artifact (PC, crate sleeve, deck card button, coffee dripper,
coffee mug, tablet, shaker) never activates it, and a sub-slop click on
each still does.

### 7.D Contained-mode chrome: instructions and reset

Fully designed here so Codex makes no visible design choices:

- **Structure:** one bar, `data-hud="pan-instructions"`, containing a
  caption span and one button `data-hud="pan-reset"`. An absolutely
  positioned child of the scroll container would live in its scrolled
  content and move with the pan (`.responsive-stage` is itself the
  positioned scroll ancestor — `position: relative` in `app/globals.css`,
  `overflow: auto` in contained mode), so `ResponsiveStage` gains an
  **outer positioned wrapper rendered in every mode**: the wrapper fills
  the available space and always holds the labelled scroll container
  (`role="region"`, `aria-label`, `tabIndex`, `data-stage-mode`: same
  element, same attributes) with the cockpit inside it; in contained mode
  only, the bar mounts as an absolutely positioned **sibling of the
  scroll container** — genuinely viewport-anchored and unaffected by the
  §7.B centered initial scroll. The wrapper must be structurally
  identical across modes so a fit↔contained tier transition changes only
  attributes/styles and the bar's presence — **never the cockpit's React
  ancestry** — because inserting an ancestor on transition would remount
  the WebGL scene (a keyed-remount-equivalent context teardown). The
  `data-stage-mode` / `.responsive-stage-surface` selectors the Phase 3
  suites use stay on the same elements; the permanent wrapper adds one
  neutral node above them (AC-29 verifies structural/selector identity on
  both the real cockpit and `/responsive-preview`, and renderer identity
  on the cockpit route only — the preview hosts a placeholder, not the
  cockpit canvas).
- **Placement:** bottom-left of the visible container box, inset 12 px. This
  avoids the return control (top-right), the theme toggle, and the boot
  chrome. It may overlay whatever crop of the surface is beneath it — in a
  contained crop some occlusion is unavoidable; region chrome takes
  precedence there, matching scrollbar semantics. It is **excluded from
  the camera safe frame** (it is viewport-anchored region chrome; the
  camera fits the surface, §3.4, and a surface-coordinate reservation for
  a viewport-anchored element is not expressible without pumping).
- **Copy (exact, DESIGN.md voice — mono label, uppercase, tracking per
  existing chrome):** caption `DRAG · ARROWS/WASD · HOME CENTERS`; button
  text `RESET`, `aria-label="Reset pan to center"`. The caption is
  `aria-hidden={false}` text and the bar is linked to the region via
  `aria-describedby`.
- **Style:** theme tokens only (`--cream`/`--ink`/`--mauve` families),
  opaque chip background for legibility over arbitrary scene crops,
  `--radius: 0`, no drop shadow, 1 px `--mauve` border (matching
  `return-control`). Caption type: `var(--font-label)` at the existing
  10 px/0.22em chrome scale; it scales with the large-text state. RESET
  hit area ≥ 44×44 (`HUD_MIN_HIT_SIZE`), grown further by the
  large-controls state. Forced-colors: system colors win (no authored
  backgrounds), border preserved. Narrow widths: the bar's max width is
  the container width minus the 12 px insets, and the caption wraps to a
  second line before anything clips — AC-21 asserts containment at
  `320×568` under every accessibility state.
- **Behavior:** RESET applies the §7.B reset (eased unless reduced
  motion). The bar is inert to pan gestures (`pointerdown` on it never
  arms a drag); the caption is `pointer-events: none`; the button follows
  the region in the tab order (the bar sits after the scroll container in
  the wrapper's DOM order).
- **Registry:** both identifiers are added to the `data-hud` registry
  table in `docs/responsive-system.md` §10 (amendment A3) and pinned by a
  unit test alongside the controller's tests. No `LayoutContract` change —
  the contract type has no identifier property (§1.8), and the cockpit
  contract's regions/adaptations already cover contained mode
  (`contained-complex-region`).

---

## 8. Scroll and accessibility interaction law

The cockpit is exactly one bounded, labelled panning region — the existing
`ResponsiveStage` region (`role="region"`, `aria-label="Cockpit stage"`,
`tabIndex={0}`, `cockpit-app.tsx:321`). There is **no blanket
`preventDefault()`**. Exact routing:

| Input | Consumed by the cockpit region when | Otherwise |
|---|---|---|
| `wheel` with `ctrlKey` (pinch/browser zoom) or `metaKey`/`altKey` | **never** — passed through untouched, no `preventDefault()` (plan §A.2: zoom belongs to the user) | browser zoom / native behavior proceeds |
| Unmodified or `shiftKey` `wheel` over the region (contained mode only) | the resolved axis (§7.B shift rule; otherwise dominant axis) can still move the accumulator in that direction (not at that bound) → `preventDefault()` + pan | not consumed → native bubbling; the document scrolls normally (edge chaining, mirroring browser scroll-chaining semantics) |
| `wheel` over the region (fit mode) | never — no listener attached | document scrolls |
| `wheel` outside the region | never | document scrolls (§10 AC-19) |
| Pointer drag | after the 6 px slop, until release/cancel (§7.C) | sub-slop gestures resolve as clicks on cockpit artifacts |
| Arrow/WASD/Home/PageUp/PageDown | region has DOM focus **and** the axis can move (Home: whenever off-center) → `preventDefault()` + pan | not consumed → normal document behavior |
| `Tab` / `Shift+Tab` | never consumed — focus moves in and out of the region normally | — |
| `Escape` | never consumed by the pan controller. The existing window-level handler exits a focused view (`cockpit-hud.tsx:170-176`); with no focused view, Escape does nothing — it never traps | — |

Accessibility guarantees preserved and extended:

- Ordinary content outside the region continues to reflow; the page-level
  `VIEW PROJECTS` route and all Phase 2 canonical links remain reachable
  and operable without entering the region (they are outside it in the
  document flow).
- Keyboard focus on the region stays visible (the region must retain a
  visible focus indicator in both themes and forced-colors; §10 AC-21
  asserts it is not suppressed).
- An operable reset path exists without a pointer: `Home` (announced by
  the caption's `HOME CENTERS`) plus the visible RESET control itself
  (§7.D, D4).
- Reduced motion (§7): no parallax, no inertia, no eased scroll — but
  every explicit pan input still works, non-animated.
- All five explicit accessibility states apply to the new chrome: reduced
  motion (above), high contrast and reduced transparency (token-driven
  restyle), **large text** (caption/button type scales), **large
  controls** (RESET hit area grows); `forced-colors` wins over authored
  styling (§7.D).
- The cockpit stage's inner programmatic-scroll pin
  (`cockpit-hud.tsx:186`) is unchanged; only the outer ResponsiveStage
  container pans.

---

## 9. Lifecycle and durable-state behavior

### 9.1 State classification

| State | Class | Behavior |
|---|---|---|
| Hover yaw/pitch targets and smoothed values | transient | reset to 0 on non-interactive, remount, and reduced-motion enable; decay to 0 on pointer exit |
| Focused-pose fit cache + degraded episodes | derived | rebuilt on the §5.2 events; empty after remount |
| Contained pan offset | durable-by-container | lives in the ResponsiveStage container's scroll state, outside the remounted scene — survives focus changes and renderer rebuild (pinned by `e2e/phase3-renderer.spec.ts:317-409`); centered on contained-mode entry, preserved otherwise (§7.B position law) |
| Inertia / drag gesture / pending click activation | transient | cancelled by any lifecycle event below |

### 9.2 Event matrix

| Event | Hover | Pan | Fit |
|---|---|---|---|
| Enter monitor/deck/crate focus | switches to parallax mapping (same shaped input, parallax scales) | unaffected (container is outside the camera system) | solve on entry if stale (§5.2); pose eases via `modeT`/`focusSwitch` |
| Return to ambient cockpit | full envelope resumes | unaffected | no solve; `focusKind` ease-out unchanged (reads the §3.2 tombstone when the entry was cancelled) |
| Stage resize (same tier) | next event re-reads the visible box | accumulator re-clamped to the new range; in-flight inertia cancelled | affected entries stale → exactly one refit per kind on next use (no re-measure, §3.2); pose glides via the §4.7 refit transition |
| Tier transition fit → contained | mapping now normalizes against the visible container box (§7.A) | controller attaches; position centered (§7.B position law) | fit inputs switch to the pinned surface size (one refit) |
| Tier transition contained → fit | normalizes against the live stage rect | controller detaches; capture released; offsets discarded (the surface fills the container) | one refit for the new stage size |
| Main context loss | targets frozen with the parked loop; zeroed on rebuild | gesture/inertia/pending activation cancelled; container scroll untouched | cache dies with the scene closure; `focus-fit-store` fully reset on remount (pending passes, maxima, episodes — §3.2 generation law) |
| Phase 3 remount recovery | starts at 0; restored view's settled pose per the Phase 3 restoration table | controller (outside the remount) neither re-inits nor moves scroll — Phase 3 AC-13 pin holds | solved fresh for the restored `viewMode` on first frames — deterministic inputs land the restored pose where the pre-loss fit did |
| Accessibility change: reduced motion **on** while focused | targets → 0 immediately, no eased settle; parallax offset leaves the pose over ≤1 frame (offset is part of per-frame pose math) | inertia cancelled; smoothing off; explicit pan still works | no change (fit is motion-independent) |
| Reduced motion **off** | mapping resumes on next pointer event | smoothing/inertia resume | no change |
| Accessibility large-text / large-controls change | no camera effect from hover | chrome restyles (§7.D) | one measurement pass + one refit (§3.2 pass 2, §5.2) |
| Other accessibility states (contrast, transparency, forced-colors) | no camera effect | caption/reset restyle per system precedence | no change |
| Browser visibility hidden (`visibilitychange`/`pagehide`) | no special handling (rAF throttling covers it) | gesture ends, capture released, inertia cancelled, pending activation cleared | no change |

### 9.3 Bridge and instrumentation

- **Zero `window.__cockpit*` changes.** The 34-name pinned enumeration
  stays byte-identical; `__cockpitSmoothedYaw/Pitch` keep their existing
  meaning and become genuinely test-relevant for the first time.
- New **additive, development-only** `__COCKPIT_TEST_HOOKS__` members
  (compiled out of production like the rest of `test-hooks.ts`):
  - `getFocusFit(): { kind, status: 'fit' | 'degraded', reason,
    distance, solveCount, lastSolveCause, safeFrame,
    points: Array<{ x: number, y: number }> } | null` — the cache entry, a
    monotonic solve counter, the active safe frame (stage CSS px), and
    **the framing points projected through the live camera into stage CSS
    px at call time** — so AC-3 asserts containment directly against
    published data instead of re-deriving projections from bridge
    internals.
  - `getPanState(): { mode: 'fit' | 'contained', x, y, maxX, maxY,
    sizeRatio, inertiaActive, reducedMotion } | null` — for the §9.4 pan
    traces.
  - `getFreeLookState(): { yawTarget, pitchTarget, exponent, boxW,
    boxH }` — pairs with the existing smoothed bridge values.
  Real input is driven through Playwright (`page.mouse.move/down/up/wheel`,
  `page.keyboard`) — the hooks observe, they never inject synthetic input
  into production paths.

---

## 10. Acceptance criteria and verification

Evidence classes as in Phases 3/4: **[U]** unit, **[B]** browser automation
(Chromium dev server), **[P/M]** performance/manual, **[V]** visual review,
**[review]** mechanical inspection/grep. All five gates green before the
phase is claimable.

Viewport sets used below:

- **FIT-MATRIX** — every entry of `REQUIRED_VIEWPORT_CASES`
  (`lib/responsive/layout-contract.ts:104-122`): 12 normal cases from
  `1024×600` to `3440×1440`, 4 zoom cases (camera fits the pinned
  `1024×600` surface there), and `large-3840x2160`.
- **HOVER-TRIO** — `1440×900`, `1024×600`, `512×300` (plan §9.4's trio;
  hover exists at every tier).
- **PAN-SET** — all four declared contained cases: `800×450`, `683×325`,
  `512×300`, `320×568` (the pan controller exists only in contained
  mode — §1.6, amendment A1). Gain-proportionality assertions use the
  distinct-ratio pair `800×450` (0.5) vs `512×300` (0.45);
  range/operability assertions run at all four, including the portrait
  `320×568` case with the largest horizontal pan range.

**Fit and framing**

- **AC-1 [U]** `camera-fit.ts` solver: smallest fitting distance found
  within 16 iterations and tolerance on authored fixtures; asymmetric
  bounds honored (a top-heavy reservation shifts the solution measurably);
  points on/behind the near plane reject the candidate; non-finite input,
  empty points, inverted bounds, **and bounds violating the optical-center
  invariant** (`minX ≤ 0 ≤ maxX`, `minY ≤ 0 ≤ maxY`) return
  `no-fit/invalid-input`; `unfittable-at-max` carries no distance; results
  are deterministic and allocation-free under repeated calls. A companion
  test computes the NDC bounds of every D6 reservation set at every
  FIT-MATRIX stage size and proves the center invariant holds for each
  (so the invariant never bites in production configurations).
- **AC-2 [U]** Authored framing points: fixtures pin each subject's point
  set; circular features use §2.2 circumscribed octagons (vertex radius
  `r/cos(π/8)`; the platter octagon is built on the `0.53` glass-disc
  radius, §2.3); the deck card envelope uses the authored over-bound top
  (`2.20` group-local, §2.3). **Property tests — world-space,
  camera-free (§2.2):** for a dense sweep of card billboard yaw (`0…2π`,
  ≥64 samples) including the animated bob/settle/scale extremes, every
  card corner stays inside the authored envelope's convex hull, checked
  as horizontal octagon-support containment about the card axis plus
  height-interval containment (`0.938…2.20`); for the crate disc, a dense
  joint `(rise, tilt)` rim sweep over the full animated range
  (`rise 0…0.52` × `tilt −0.10…+0.14`) stays inside the convex hull of
  the **entire authored crate set** (shell + sleeve + both padded disc
  octagons, §2.4); the platter rim (`r = 0.53`) stays inside its octagon.
  World-space convex containment implies projected
  containment for every camera (§2.2 lemma) — the test never depends on
  chosen poses, and it fails against an inscribed-diamond bound by
  construction. The disc-related crate constants equal the
  `registerVinylSleeveProbe` values and the shell/sleeve constants equal
  the module build constants (§2.4); the monitor set is exactly the four
  `screenCorners`.
- **AC-3 [B]** For each focus kind at **every FIT-MATRIX case**: after
  `enterView(kind)` and `isSettled()`, every entry of
  `getFocusFit().points` lies inside `getFocusFit().safeFrame` with
  ≤ **0.5 CSS px** boundary tolerance — including with the pointer parked
  in a stage corner (maximum parallax, §4.6), for the deck with a record
  landed (card up), and for the crate with a sleeve pulled and disc at
  preview rise. Zoom cases assert against the pinned surface geometry.
- **AC-4 [U]** The §3.3 CSS→NDC conversion round-trips against
  `projectPointToStage()` within 1e-9 on authored cases.
- **AC-5 [B]** DPR-only change (CDP dsf 1→2 at fixed viewport) while
  focused: `getFocusFit().distance` unchanged, `solveCount` does not
  advance, safe frame and HUD geometry unchanged within 0.25 px (extends
  the existing `smoke.spec.ts:417` / `phase4-hud.spec.ts:492` pattern).
- **AC-6 [B]** Solve-count discipline, exact counts: 60 observed frames of
  ambient focused idling (card bob, platter spin, pointer parallax)
  advance `solveCount` by **0**; **first** entry to a focus mode advances
  it by **at most 2** (entry + the single §3.2 measurement refine);
  re-entry with retained maxima advances it by **at most 1**, and by
  **exactly 0** when the cached fit's key still matches (unchanged
  stage, §3.2 reuse rule); one live
  viewport resize while focused advances it by **exactly 1**; one
  large-text toggle while focused advances it by **exactly 1** (after its
  single re-measure); a **quick exit before the entry pass commits**
  advances it by **0** during the ease-out (the §3.2 tombstone supplies
  the pose and the sampled camera path shows no snap), and the
  subsequent re-entry performs solve #1 (the tombstoned entry is treated
  as absent) — covered in three variants: completed exit then re-entry;
  **interrupted exit → a different focus kind while `modeT > 0.3`** (the
  §3.2 reassignment-branch cleanup: the cancelled generation never
  commits, entry to the new kind solves normally, and a later return to
  the first kind performs solve #1); and **same-kind re-entry during the
  ease-out** (the tombstone is atomically replaced by the re-entry's
  solve #1; the cancelled generation never commits). No camera pumping: with the pointer held still,
  settled-frame-to-settled-frame camera position delta ≤ **0.002 world
  units**.
- **AC-7 [B]** Pose continuity (measured with reduced motion off; the
  speed/displacement **bounds** are frame-rate-independent — the
  wall-clock duration deliberately is not, per the §4.7 nominal-duration
  note), in two explicitly separate scopes:
  **(a) Refit blends** (resize and large-text refits triggered while
  settled, via the §4.7 refit transition): per-frame speed `‖Δpos‖ / dt`
  never exceeds **12 world units/s** within the tested envelope of
  `dt ≤ 100 ms` (the 0.6 s blend's analytic peak is `2·L/0.6 = 10 wu/s`
  at the ≤3 wu path bound), and no single refit-blend frame displaces
  more than **0.5 world units** even under arbitrarily long frame
  stalls — guaranteed by the §4.7 `REFIT_MAX_FRAME_STEP_S` clamp
  (per-frame blend progress ≤ 5.6%, bounding single-frame displacement
  to ≲11% of the refit path length, ≈0.33 wu at 3 wu; the test also
  asserts the observed refit path lengths stay ≤ 3 wu). A refit in
  flight reads as unsettled until its blend completes.
  **(b) Mode-switch blends** (cockpit↔focus `modeT` eases and the
  `0.38`/`0.85` s focused-pose switches): explicitly **not** subject to
  the numeric speed bound — the existing crate→deck 0.38 s blend over
  its ≈3 wu path peaks near 16 wu/s today, and Phase 5 leaves it
  untouched. The test instead pins them as **unchanged**: identical
  durations and easing behavior to pre-Phase-5, monotonic smooth
  progress with no single-frame jump beyond the blend's own analytic
  per-frame bound, and `reportFrame` settle semantics unchanged. Under
  reduced motion a refit applies in one frame (the §4.7 deliberate
  snap — asserted as immediate, not speed-bounded).
- **AC-8 [U]** Oracles: (a) for symmetric bounds the solver distance
  matches the analytic `max(distV, distH)` closed form within 0.5%
  (records D1's equivalence); (b) the §4.8 three.js oracle — pure-solver
  NDC agrees with `THREE.PerspectiveCamera` projection within 1e-6 across
  sampled poses including the steep-crate branch.

**Input — mapped to plan §9.4 under amendment A1**

- **AC-9 [B]** Full hover envelope at stage edges: real `page.mouse.move`
  to each edge midpoint/corner of the **visible stage box** (§7.A — the
  stage rect at 1440×900/1024×600, the contained container at 512×300)
  drives `__cockpitSmoothedYaw/Pitch` to `±MAX_YAW_RAD`/`±MAX_PITCH_RAD`
  within 1% after settle, at every HOVER-TRIO viewport. Primary
  regression guard against any reference-dimension divisor on hover.
- **AC-10 [U+B]** Near-center damping: at 25% offset from center, shaped
  response at 1024×600 and 512×300 is strictly below the 1440×900
  response, and the observed angle matches the `shapeHoverResponse`
  closed form at that viewport's `responseExponentFor` value within
  **±5%**; unit properties already pinned in
  `tests/unit/input-policy.test.ts` stay green and unmodified.
- **AC-11 [B+review]** `sizeRatio` applies to accumulated pan only:
  `getPanState().sizeRatio` matches `sizeRatioFor(viewport)`; the hover
  path provably never multiplies by it (grep: `sizeRatioFor` is imported
  only by the pan controller; plus the AC-9 envelope result at 512×300
  which a divisor would break).
- **AC-12 [U+B]** Gain evidence, split per amendment A1:
  **[U]** the gain curve is pinned at the plan's reference sizes —
  `sizeRatioFor(1440×900) = 1`, `(1024×600) ≈ 0.667`,
  `(512×300) = 0.45` — as already covered by
  `tests/unit/input-policy.test.ts:43-74`, which must stay green
  unmodified. **[B]** identical logical wheel/drag traces at the PAN-SET
  viewports produce accumulator displacement proportional to the local
  `sizeRatio`, asserted on the distinct-ratio pair `800×450 → 0.5` vs
  `512×300 → 0.45` within ±10%, and the full pan range `[0, max]` remains
  reachable on both axes in bounded gestures at every PAN-SET viewport,
  including portrait `320×568`.
- **AC-13 [B]** Bounds: no input sequence drives yaw/pitch beyond the
  envelope (including pointer positions outside the stage — the §1.4
  overshoot is dead) or the accumulator beyond its clamp.
- **AC-14 [U+B]** Wheel modes: synthetic `deltaMode` 0/1/2 events with
  equivalent logical magnitude produce accumulator displacement within
  ±15% of each other; unit tests pin the conversion; unknown modes treated
  as pixels.
- **AC-15 [U+B]** Spike clamp: a `deltaY = 5000` pixel event advances at
  most `MAX_WHEEL_STEP_PX × sizeRatio`; a fine 2 px trackpad delta still
  moves the accumulator (no dead zone).
- **AC-16 [B]** All explicit paths operate at PAN-SET viewports: pointer
  drag (beyond slop) pans; arrow keys and WASD pan when the region is
  focused; `Home` and the visible RESET control re-center; `PageUp/Down`
  page; at-bound axes stop cleanly; native scrollbar drag still works and
  re-syncs the accumulator.
- **AC-17 [B]** Gesture arbitration (§7.C): for **each** of the seven
  activation targets (PC, crate sleeve, deck card `VIEW MORE`, coffee
  dripper, coffee mug, tablet, shaker) — a drag that begins on the target
  and exceeds the slop **never** activates it (no view-mode change, no
  deck flight, no coffee/decoration animation triggered), and a sub-slop
  click on the same target **does** activate it, in both fit and
  contained modes where the target is reachable. **Plus the exit
  branches:** a beyond-slop drag beginning on empty deck-view background
  does not exit deck view, and one beginning on empty crate-view
  background neither recalls the pulled record nor exits crate view —
  while a sub-slop click on the same empty background still performs the
  §1.5 click-away action. **No double activation:** for every tested
  press, exactly one action fires — a sub-slop click over the crate in
  crate mode sends the record and does not additionally trigger the
  deck's click-away (the §7.C single-owner resolution replacing today's
  `stopImmediatePropagation` protocol), asserted by counting observed
  actions per press.
- **AC-18 [B]** Reduced motion, all sources and precedence: under
  (a) `emulateMedia({ reducedMotion: 'reduce' })` with no explicit
  setting, (b) the ACCESSIBILITY dialog's explicit Reduced with system
  no-preference, and (c) explicit Full with system reduce — the resolved
  behavior follows the provider's documented precedence (explicit override
  wins over system signal), verified via `data-a11y-motion`; in every
  reduced-resolved state hover and focused parallax produce zero camera
  offset, drag release produces no inertia, and explicit drag/wheel/
  keyboard pan still functions with immediate (non-eased) application;
  toggling any source mid-session takes effect without reload.
- **AC-19 [B]** Scroll freedom and modifier bypass: wheel outside the
  region always scrolls the page; wheel inside the region at a pan bound
  chains to the page; `ctrlKey`, `metaKey`, and `altKey` wheel over the
  region are never `preventDefault()`ed (asserted via `defaultPrevented`
  on dispatched events) and never move the accumulator; `shiftKey` wheel
  with
  `deltaX === 0` pans horizontally; `Tab` enters and leaves the region;
  with the region focused, Escape never traps; the `VIEW PROJECTS` link
  remains reachable and operable at 512×300.
- **AC-20 [review]** No UA selection: grep proves no
  `navigator.userAgent` / `platform` / pointer-type branching anywhere in
  the input paths; every tuning value resides in `input-policy.ts`.
- **AC-21 [B]** Chrome and accessibility states: contained mode shows the
  §7.D bar with the exact copy, `aria-describedby` wiring, and RESET
  ≥ 44×44; the region's focus indicator is visible in dark, light, and
  forced-colors; the bar honors **all five** explicit states — reduced
  motion, high contrast, reduced transparency, **large text** (caption
  scales), **large controls** (RESET hit area grows) — plus
  forced-colors precedence. **Narrow-width containment:** at `320×568`
  under each of the five states (including large text + large controls
  combined), the bar fits the container width — the caption wraps per
  §7.D rather than clipping, no horizontal overflow is introduced, and
  RESET remains fully visible and operable.

**Hygiene and lifecycle**

- **AC-22 [review]** Bridge integrity: the 34-name `window.__cockpit*`
  enumeration is byte-identical before/after the phase;
  `git diff -G 'preserveDrawingBuffer'` over cockpit/lib/config paths is
  empty; no new window global.
- **AC-23 [B+review]** Hooks additive and dev-only: the three new members
  exist under `NODE_ENV !== 'production'` and the production build
  contains none of them (existing production-exclusion grep pattern).
- **AC-24 [review]** Phase boundaries: `e2e/smoke.spec.ts` Phase 6
  `test.fixme` intact (the `phase4-hud.spec.ts:966` meta-guard stays
  green); `resolveFocusHudLayout` still has no live-placement caller;
  no Phase 7 crate re-anchoring; no `content/` or catalog/profile diffs.
- **AC-25 [B]** Context recovery: lose and restore the context while in
  deck focus at 800×450 (contained) — the rebuilt scene solves to the
  same distance (deterministic inputs), the restored pose matches the
  pre-loss settled pose within 1 CSS px of projected geometry, and the
  contained scroll offset survives per the Phase 3 pin. Degraded-fit
  hint-hiding (§4.5): forcing `unfittable-at-max` through the existing
  scale setter (`__cockpitTurntable.setTransform({ s: 50 })` — a
  dev-tweak path, not a new hook; **enlarging** the subject genuinely
  exceeds the angular fit bound at `distance.max`, whereas translating it
  would not, since center and camera move with the subject), the hint
  hides, exactly one dev warning is logged, and restoring the transform
  recovers the fit and the hint. The provider-`null` branch of §2.1 is
  covered at unit level in the adapter tests.
- **AC-26 [U]** Suite registration: new spec files are in the CI matrix
  (`tests/unit/e2e-runner.test.ts` sync test green); five gates green.
- **AC-27 [P/M — owner checkpoint]** Manual hardware input evidence with a
  defined artifact (§10.1): checkpoint file at
  `docs/baselines/phase-5-input/OWNER-CHECKPOINT-<date>.md`, filled by
  the owner from the agent-prepared `OWNER-CHECKPOINT.template.md`
  (§11.2 step 8; agents never create the dated record). The template —
  and therefore the dated record — carries **three sections**: the AC-27
  input traces below, the AC-28 visual-approval section (capture paths +
  mark), and a **decision history** of dated owner entries. The record
  contains, at minimum — device and input hardware identification; OS and browser
  versions; one row per §10.1 Phase 5 trace with an explicit
  `pass`/`fail` mark and free-text feel notes; any tuning change made in
  response (with the §9.4 rule that `responseExponent` tuning never
  reduces reachable range); an explicit statement that agents prepared but
  did not certify; and the owner's typed name and ISO date. **Pass
  criterion:** every listed trace marked `pass` and no unresolved `fail`
  rows. Owner-certified only — Codex/Kimi cannot self-certify (Phase 4
  AC-20 precedent). **Authority/supersession rule:** exactly **one**
  dated checkpoint file exists per phase; repeated reviews append
  **dated entries to its decision-history section** (owner-authored —
  agents never edit it; earlier entries remain as history); the
  **latest** dated entry's marks govern both AC-27 and AC-28. Step 9
  verifies exactly-one-file and that the latest entry is `approved`
  with no later unresolved `changes-requested`.
- **AC-28 [V]** Owner visual review of the three focused framings at
  1440×900 and 1024×600, both themes, against the D2/D3/D6 composition
  decisions. Evidence is fully specified: the 12 captures
  (3 kinds × 2 viewports × 2 themes) live at
  `docs/baselines/phase-5-input/ac28/<kind>-<theme>-<w>x<h>.jpg`, and the
  owner's approval is recorded as the **AC-28 section of the same dated
  owner checkpoint** (`OWNER-CHECKPOINT-<date>.md`, §10.1 artifact),
  which references the reviewed capture paths and carries an explicit
  approved/changes-requested mark. No separate approval artifact exists;
  agents capture the screenshots but never author the approval.
  **Pass criterion:** all 12 captures are reviewed and the checkpoint's
  **latest decision-history entry** (AC-27 authority rule) marks AC-28
  `approved`; a `changes-requested` mark **blocks step 9 and phase
  acceptance** until a revised capture set is produced and re-reviewed —
  the §11.4 rejection path defines how step-8 work resumes while the
  runner stays in `awaiting-owner`.
- **AC-29 [B]** Tier-transition structural stability (§7.D): resizing the
  live viewport across the fit↔contained boundary in both directions
  never restructures the stage. On **both** routes (the real cockpit and
  `/responsive-preview`): the scroll container and
  `.responsive-stage-surface` remain the same DOM elements
  (element-identity marker survives the transition), the Phase 3
  `data-stage-mode` / `.responsive-stage-surface` selectors still
  resolve, and the §7.D bar mounts/unmounts without touching the scroll
  container's subtree. On the **real cockpit route only** — the preview
  hosts a placeholder inside `ResponsiveStage`, not the cockpit canvas
  or its hooks (`app/responsive-preview/preview-client.tsx:47`) —
  additionally: the `<canvas>` element identity is unchanged
  (`WeakRef`/marker comparison), `getRendererState().rebuildCount` does
  not advance, and no context-lifecycle event fires.

### 10.1 Manual matrix — Phase 5 versus Phase 8 (amendment A2)

Plan §9.4's manual-coverage list ("must include" macOS/Windows precision
trackpads, a detented wheel mouse **on Windows or Linux**, a ChromeOS
touchpad, and Safari/Firefox/Chromium wheel behavior) and the plan §8 Phase 5 exit ("§9.4 input tests
pass across the supported matrix") cannot be satisfied inside Phase 5
honestly: the e2e suite is Chromium-only until Phase 8's browser-project
expansion (adding projects now is out of scope by phase discipline), and
the only certifiable hardware is the owner's. Rather than silently
narrowing the matrix, amendment **A2** (§12, decision D9) phases it:

| Check | Phase 5 (required for exit) | Phase 8 (required before plan-final claim) |
|---|---|---|
| Chromium automated §9.4 traces | HOVER-TRIO + PAN-SET (AC-9…AC-19) | re-run in the expanded matrix |
| Fit invariant | full FIT-MATRIX (AC-3) | re-run in the expanded matrix |
| macOS precision trackpad (hover, drag, momentum wheel train, pinch bypass) | **required** — AC-27 owner checkpoint | regression re-check |
| Detented wheel mouse on the owner's host | **required** — AC-27 (owner or owner-delegated tester) | regression re-check |
| Detented wheel mouse **on Windows or Linux** (the plan §9.4 literal; wheel delta semantics differ by platform) | not certifiable in Phase 5 | **required** |
| Windows precision trackpad | not certifiable in Phase 5 | **required** |
| ChromeOS touchpad | not certifiable in Phase 5 | **required** |
| Safari / Firefox wheel behavior | not certifiable in Phase 5 | **required** (with the Phase 8 browser projects) |

Phase 5's exit under A2: FIT-MATRIX fit evidence + HOVER-TRIO/PAN-SET
input evidence + the AC-27 owner checkpoint. The deferred rows are Phase 8
**exit obligations**, recorded in the plan by the A2 amendment text so
they cannot silently evaporate.

---

## 11. Codex implementation handoff

### 11.1 Responsibility split

| Concern | Home | Standard |
|---|---|---|
| Fit solver, CSS→NDC bounds helper, pan/inertia/keyboard policy, tokens | `lib/responsive/camera-fit.ts`, `lib/responsive/input-policy.ts`, `lib/responsive/hud-layout.ts` | strict island (`tsconfig.contracts.json`, no `@ts-nocheck`, `import type`) |
| Authored framing constants + `getFocusTarget()` | `turntable.ts`, `vinyl-crate.ts`, `glass-mac.ts` | imperative cockpit (`@ts-nocheck` tier), constants unit-pinned via fixtures |
| Fit cache + focused-pose assembly | `globe-canvas.tsx` | imperative cockpit |
| Reservation/fit-status store | `components/cockpit/focus-fit-store.ts` | imperative cockpit module (hud-sampler pattern), production behavior |
| Free-look rewiring | `cockpit-hud.tsx` | imperative cockpit, consuming policy imports |
| Pointer arbiter (single canvas listener set, §7.C) | `components/cockpit/pointer-activation.ts` | imperative cockpit; the five §1.5 sites register `{hitTest, action}` entries |
| Contained-pan controller, §7.D chrome | `components/responsive/` | typed client components (no `@ts-nocheck` — `components/responsive/` is typed today) |
| Instrumentation | `test-hooks.ts` | additive, dev-only |

### 11.2 Ordered steps (test-first at each checkpoint)

1. **Pure policy and solver.** Add `lib/responsive/camera-fit.ts`
   (including the §4.3 center invariant) and the §7.B policy exports to
   `input-policy.ts`; add the `FOCUS_CAMERA_RESERVATIONS` / bounds /
   fallback-distance tokens to `lib/responsive/hud-layout.ts`. Write
   `tests/unit/camera-fit.test.ts`, `tests/unit/camera-fit-oracle.test.ts`
   (§4.8), and the `input-policy` extensions first; existing input-policy
   tests must pass unmodified. Verify AC-1, AC-4, AC-8, unit parts of
   AC-12/14/15.
2. **Authored framing points.** Add the authored constants (octagon rule,
   §2.2) and the unified `getFocusTarget()` (with `verticalBias`,
   world-space scratch, `null` contract) to the three providers; keep the
   legacy scalar fields temporarily so the tree stays green. Unit fixtures
   + sweep property tests pin the point sets (AC-2).
3. **Fit integration.** Wire the solver + §5 cache + `focus-fit-store` +
   the §4.5 failure rule (last-valid distance, one dev warning, hint
   hiding) into `globe-canvas.tsx` and the hint overlays; retire the
   scalar formulas and the legacy `fitHeight/fitDepth/fitWidth` fields;
   add `getFocusFit()`. Verify AC-3/5/6/7 and the AC-25 degraded path with
   the new `e2e/phase5-fit.spec.ts`.
4. **Free-look rewire.** Replace the `cockpit-hud.tsx` handler with the
   policy-driven mapping incl. reduced-motion gating and exit decay; add
   `getFreeLookState()`. Verify AC-9/10/13 and the hover half of AC-18
   with `e2e/phase5-input.spec.ts`.
5. **Gesture arbitration.** Land `pointer-activation.ts` and migrate the
   five §1.5 handler sites — every pointerdown-initiated action, including
   the deck/crate click-away exits — to click semantics (D8). Verify
   AC-17.
6. **Contained pan.** Implement `use-contained-pan.ts` + the §7.D chrome
   in `ResponsiveStage` (stable wrapper in every mode, §7.D); add
   `getPanState()`. Verify AC-11/12/14/15/16/18/19/21/29.
7. **Suite registration and hygiene.** Add both spec files to
   `.github/workflows/ci.yml` (AC-26); run the bridge/production-exclusion
   greps (AC-22/23/24); AC-25 recovery test.
8. **Docs, amendments, and delivery.** Apply amendment A3 and the
   current-state updates to `docs/responsive-system.md` (fit solver +
   wired input policy become current-state; `data-hud` registry gains the
   two identifiers — A1/A2 already landed in the §11.4 pre-init record
   commit); update `CLAUDE.md` current-flow notes (no bridge change).
   Write `docs/phase-5-implementation.md` (Phase 4 report format).
   Prepare `docs/baselines/phase-5-input/OWNER-CHECKPOINT.template.md`
   (an unfilled template with the AC-27, AC-28, and decision-history
   sections — agents
   never create the dated record itself, which must be owner-authored so
   it can never be mistaken for owner evidence) and capture the AC-28
   screenshots into `docs/baselines/phase-5-input/ac28/`. Full five
   gates; the step ends at the owner gate (`ownerGateAfter: true`,
   **no commit** — §11.4).
9. **Owner acceptance and delivery.** After the owner authors and signs
   the dated checkpoint (AC-27 traces + AC-28 approval sections),
   **verify only, never edit**: confirm the dated record satisfies the
   AC-27/AC-28 requirements and references the step-8 captures, and that
   the AC-27 authority rule holds — exactly one dated checkpoint file,
   whose latest decision-history entry is `approved` with no later
   unresolved `changes-requested` — Codex and the controller are
   forbidden from modifying owner-authored evidence. Rerun the full five gates fresh and hand to independent
   Kimi QA. The controller's single implementation `commitAfterQa`
   belongs to **this** step, so nothing is committed before owner
   acceptance, and its `paths` **must include the complete
   `docs/baselines/phase-5-input/` tree** (template, dated owner
   checkpoint, and `ac28/` captures) alongside the production paths —
   the runner rejects any changed file outside `commitAfterQa.paths`
   (`scripts/phase-runner/phase-runner.ts:594`).

Each step ends with `npm run lint`, `npm run typecheck:contracts`,
`npm run validate:contracts`, `npm run test:unit`, and the affected e2e
files; the full five-gate run (with complete `test:e2e`) is mandatory at
steps 3, 6, 7, 8, and 9. CI remains the enforcement authority.

### 11.3 Expected files

New (pre-init record commit): `docs/phase-5-design.md` (this document),
`scripts/phase-runner/manifests/phase-5.json`, plus the A1/A2 edits to
`docs/hud-responsive-layout-plan.md`.

New (implementation commit): `lib/responsive/camera-fit.ts`,
`tests/unit/camera-fit.test.ts`, `tests/unit/camera-fit-oracle.test.ts`,
`components/cockpit/focus-fit-store.ts`,
`components/cockpit/pointer-activation.ts`,
`components/responsive/use-contained-pan.ts`,
`e2e/phase5-fit.spec.ts`, `e2e/phase5-input.spec.ts`,
`docs/phase-5-implementation.md`,
`docs/baselines/phase-5-input/OWNER-CHECKPOINT.template.md` (unfilled,
agent-prepared; AC-27, AC-28, and decision-history sections),
`docs/baselines/phase-5-input/ac28/<kind>-<theme>-<w>x<h>.jpg` (the 12
AC-28 captures, agent-captured in step 8).

Owner-authored, never agent-created or agent-edited:
`docs/baselines/phase-5-input/OWNER-CHECKPOINT-<date>.md` (the dated
AC-27 + AC-28 evidence record, filled from the template and signed by the
owner). It is committed inside step 9's boundary — the step 9
`commitAfterQa.paths` cover the complete `docs/baselines/phase-5-input/`
tree (§11.2 step 9) — but only the owner writes it.

Modified: `lib/responsive/input-policy.ts`,
`lib/responsive/hud-layout.ts`, `components/cockpit/globe-canvas.tsx`,
`components/cockpit/cockpit-hud.tsx`, `components/cockpit/turntable.ts`,
`components/cockpit/vinyl-crate.ts`, `components/cockpit/glass-mac.ts`,
`components/cockpit/coffee.ts`, `components/cockpit/decorations.ts`,
`components/cockpit/test-hooks.ts`,
`components/responsive/responsive-stage.tsx`, `.github/workflows/ci.yml`,
`tests/unit/input-policy.test.ts`, `docs/responsive-system.md`,
`docs/hud-responsive-layout-plan.md`, `CLAUDE.md`.

Not touched: `content/**`, `lib/projects/catalog.ts`,
`lib/portfolio/profile.ts`, `app/layout-contract.ts` and
`lib/responsive/layout-contract.ts` (no contract-instance or
`LayoutContract`-schema change — §1.8), `e2e/smoke.spec.ts` (the fixme
stays), `e2e/fixtures/phase4-hud-parity.json`,
`lib/responsive/stage-projection.ts`, `components/cockpit/hud-sampler.ts`
(consumed, not modified), `playwright.config.ts`.

### 11.4 Commit boundary and roles

**Recommendation: one docs-only pre-init record commit, then the
AGENTS.md-default single reviewable implementation commit.** The
phase-runner initializes only "after the selected manifest and its design
source are tracked and clean" (`docs/phase-runner.md`, Commands) — so a
lone end-of-phase commit is operationally impossible: the approved design
and manifest must be in history before `phase:init`. Concretely:

1. **Pre-init record commit (owner/controller, docs only):** the approved
   `docs/phase-5-design.md`, the new
   `scripts/phase-runner/manifests/phase-5.json`, and the **A1/A2
   governing-plan amendment edits** to
   `docs/hud-responsive-layout-plan.md` — landing the amendments here
   keeps the runner's design authorities self-consistent during steps
   1–8 instead of contradicting the design mid-phase. This mirrors the
   Phase 4 record pattern (its design record landed before
   implementation).
2. **One QA-gated implementation commit, owned by step 9 — after the
   owner gate.** The runner commits a passed step **before**
   transitioning to its owner gate (`commitPassedStep()` runs ahead of
   the gate transition, `scripts/phase-runner/phase-runner.ts:1269`), so
   the commit cannot live on step 8 even with `ownerGateAfter: true`.
   Following the Phase 4 pattern: step 8 prepares evidence and ends at
   `ownerGateAfter: true` with **no commit**; step 9 verifies the
   owner-authored AC-27 checkpoint and AC-28 approval, reruns gates and
   independent QA fresh, and carries the single `commitAfterQa` covering
   all production code, tests, the A3 registry amendment, current-state
   docs, and the complete `docs/baselines/phase-5-input/` evidence tree
   (template, dated owner checkpoint, `ac28/` captures — §11.2 step 9).
   Phase 5 has no baseline-provenance ordering
   requirement (the reason D8-of-Phase-4 existed), so the production
   work stays a single commit.

If the owner prefers per-step implementation commits instead, that is
decision D7 — an explicit deviation, never assumed. The docs-only record
commit is not a deviation from the one-production-commit default.

- **Codex** implements per §11.2, never staging or committing; returns
  design ambiguity to Claude/owner rather than resolving it silently.
- **Kimi (independent QA)** verifies on the live diff: all five gates
  fresh; AC-3 (sampled FIT-MATRIX rows), AC-5/6/7/9/12/17/18/19/29 re-run
  independently; AC-22 bridge enumeration byte-diff; AC-23 production
  grep; AC-24 phase-boundary greps (fixme intact, no solver-to-placement
  wiring, no content diffs); repeat-run determinism of the fit solve; the
  §12 amendment texts match what this design records; no repository
  writes by QA.
- **Owner/CI acceptance:** at the step-8 owner gate — the AC-27 hardware
  checkpoint (owner-certified, agents cannot self-certify) and the AC-28
  visual framing review. Then, in order: step 9's fresh gates → Kimi
  PASS → the controller lands the single implementation commit → final
  acceptance is CI green on the sharded matrix plus owner sign-off (CI
  validates the committed snapshot; the runner ends in its literal
  `complete-awaiting-owner-ci` state — CI cannot precede the commit it
  validates).
- **Rejection path (`changes-requested`):** the runner has no
  owner-rejection transition — `phase:accept` only advances an accepted
  `awaiting-owner` gate (`scripts/phase-runner/core.ts:393-399`) and
  `phase:retry` requires `blocked`
  (`scripts/phase-runner/phase-runner.ts:1113-1121`) — so after a
  `changes-requested` mark the phase **remains in `awaiting-owner`**
  while corrections run as an explicit owner-authorized engineering
  turn: the owner records the requested changes (the mark plus notes in
  the dated checkpoint), Codex applies them in the working tree under
  that authorization, re-runs the five gates and the affected specs,
  and re-captures the affected `ac28/` files; the owner then re-reviews
  and appends a new dated `approved` entry to the **same** checkpoint
  file's decision history (AC-27 authority rule — one file, latest entry
  governs; the earlier `changes-requested` entry remains as history,
  explicitly superseded by the newer entry). Only after the
  renewed approval does the controller run `phase:accept` into step 9,
  whose fresh gates, independent QA, and commit boundary cover the
  corrected tree. Adding a first-class rejection/revision command to
  the runner would be tooling work requiring its own owner approval —
  not assumed here.

---

## 12. Required plan and documentation amendments (owner approval = D9)

This design requires three explicit amendments to the governing documents.
They are approved together with this design (D9) and applied as text
edits — A1/A2 in the §11.4 pre-init record commit (so the runner's design
authorities never contradict the design mid-phase), A3 in §11.2 step 8
(it documents chrome that exists only after step 6) — never silently:

- **A1 — plan §9.4 pan-trace viewports.** §9.4's "run the same logical
  input traces at 1440×900, 1024×600, and 512×300" is internally
  contradictory for *accumulated pan*: `1440×900` and `1024×600` are
  normal-tier viewports where contained panning does not exist
  (`lib/responsive/layout-contract.ts:104-122`; plan §A.2 tier table).
  Amendment: hover traces keep the original trio; **pan traces run at the
  declared contained cases `800×450`, `683×325`, `512×300`, `320×568`**,
  and the
  `sizeRatio` **curve values** at the original trio (`1.0 / ≈0.667 /
  0.45`, i.e. the "≈1.5×"/"≈2.2×" sentences) are verified as pure unit
  evidence over `sizeRatioFor()`. The browser expectation becomes:
  accumulated movement at each contained case is inversely proportional
  to its `sizeRatio` (`800×450 → ≈2×` the reference input; `683×325`,
  `512×300`, and `320×568 → ≈2.2×`, the floor).
- **A2 — plan §9.4 manual coverage and §8 Phase 5 exit.** The manual
  "must include" list and the "across the supported matrix" exit are
  re-phased per §10.1: Phase 5 exits on the full Chromium FIT-MATRIX +
  HOVER-TRIO/PAN-SET automated evidence plus owner-certified macOS
  trackpad and owner-host detented-wheel checkpoints; Windows precision
  trackpad, a detented wheel mouse **on Windows or Linux** (the plan's
  literal wording — its platform qualifier is preserved, not dropped),
  ChromeOS touchpad, and Safari/Firefox wheel behavior become **named
  Phase 8 exit obligations** (they gate the plan-final input-normalization
  claim, not Phase 5). The amendment text lists those obligations in plan
  §8 Phase 8 so they cannot be dropped.
- **A3 — responsive-system §10 `data-hud` registry.** The registry table
  row gains `pan-instructions` and `pan-reset` (§7.D), with a note that
  both render only in contained mode. No `LayoutContract` schema change —
  the contract has no identifier property; if the owner ever wants
  identifiers inside `LayoutContract`, that is a separate schema/validator
  migration across every route contract, explicitly out of Phase 5 scope.

---

## 13. Owner decision table

| # | Question | Recommended default | Alternatives / tradeoffs | Affects | Approval before Codex starts? |
|---|---|---|---|---|---|
| **D1** | Monitor fit path | Shared point solver for all three subjects; analytic `max(distV,distH)` kept as a unit-test oracle (§6) | Keep analytic monitor fit behind the same interface: marginally cheaper, but needs an asymmetric-bounds re-derivation and leaves two production code paths | §6, §11.2 step 3, AC-3/AC-8 | Yes |
| **D2** | Deck framing envelope | Exclude the open dust-cover rear swing and parked-arm rear tip from framing points (croppable scenery); include plinth, octagon-bounded platter glass disc (`0.53`), and octagon-bounded yaw-swept card disc at the authored over-bound top (§2.3) | Include them: guarantees the whole deck silhouette but pushes the camera back ≈25–40% and shrinks the hero card | §2.3 constants, AC-2/AC-3, focused composition | Yes (visible composition) |
| **D3** | Crate framing envelope | Author to the preview-rise disc maximum (padded endpoint-plane octagons bounding the animated tilt sweep, §2.4); the sub-second return-flight clear waypoint may transiently exceed the frame | Author to the clear waypoint: nothing ever crops, but the browse composition loosens noticeably for a transient | §2.4 constants, AC-2/AC-3, crate composition | Yes (visible composition) |
| **D4** | Reset affordance in contained mode | The fully-specified §7.D bar: caption `DRAG · ARROWS/WASD · HOME CENTERS` + visible RESET button, bottom-left container chrome | Keyboard-only reset: less chrome, but weaker discoverability and a thinner no-pointer path | §7.D, §8, AC-16/AC-21, registry A3 | Yes (new visible chrome, exact copy) |
| **D5** | Inertia | Drag-release inertia only (halflife 120 ms; terminates below 30 CSS px/s, at bounds, or at 600 ms); none for wheel; removed under reduced motion (§7.B) | No inertia at all: simpler, slightly stiffer drag feel on small viewports | §7.B, AC-18 | No — default acceptable; flag only if owner wants zero inertia |
| **D6** | Camera-fit reservation starting values, distance bounds, and fallback distances (§3.1, §4.4, §4.5 tables) | Adopt the tabled conservative starting tokens; the measurement pass refines them on first entry (reused on re-entry, §3.2); Phases 6/7 refine the same tokens from real overlays | Tighter tokens (more subject, more overlap risk before Phase 6/7) or looser (safer, smaller subject) | §3, §4.4, §4.5, AC-3, focused composition | Yes (visible composition) |
| **D7** | Commit boundary | Docs-only pre-init record commit (design + manifest + A1/A2, required by `phase:init`) followed by the AGENTS.md-default single reviewable controller-owned implementation commit (§11.4) | Phase-4-style per-step implementation commits: finer revert granularity, but no provenance need justifies the deviation here | §11.4, §12, runner manifest | Only if deviating from the default |
| **D8** | Pointer-activation semantics (§7.C) | Uniform click semantics everywhere: cockpit artifacts activate on sub-slop `pointerup` in both fit and contained modes — one interaction grammar; activation now on release, not press | Arbitrate only in contained mode: preserves fit-mode press feel but forks the grammar per tier and leaves the press-vs-drag race for future fit-mode gestures | §7.C, the five §1.5 handler sites (seven targets + the two click-away exits), AC-17 | Yes (interaction behavior change) |
| **D9** | Governing-document amendments A1–A3 (§12) | Approve all three: they make Phase 5's evidence honest instead of silently narrowing the plan | Reject A1/A2 → Phase 5 cannot exit as literally written (pan traces at fit-mode sizes are unimplementable; non-Chromium manual coverage is not certifiable this phase); rejecting A3 leaves the new chrome unregistered | §10, §10.1, §12, plan §8/§9.4, responsive-system §10 | Yes |

---

**Status: OWNER APPROVED (2026-08-10).** D1–D9 stand approved with the
recommended defaults; amendments A1–A3 are approved for application per
§12 (A1/A2 in the pre-init record commit, A3 in step 8). Next: Codex
phase-runner planning (`scripts/phase-runner/manifests/phase-5.json` from
§11.2) and the A1/A2 amendment preparation, the controller's §11.4
pre-init record commit, then implementation per §11 steps 1–9, independent
Kimi QA, and the owner/CI acceptance steps of §11.4.
