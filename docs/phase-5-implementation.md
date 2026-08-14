# Phase 5 Implementation and Acceptance Report

> **Renumbering note (2026-08-14, plan §0.7 revision 8).** "Phase 8" in
> this report means the enforcement phase now numbered **Phase 9**. No
> claim or evidence in the report is altered by the renumbering.

**Phase:** 5 — 3D fit and input normalization

**Step:** 8 — docs, amendments, and delivery

**Engineering date:** 2026-08-13

**Status:** **READY FOR STEP 8 INDEPENDENT QA** — the Phase 5 implementation,
automated AC-1 through AC-26/AC-29 evidence, amendment A3, current-state
documentation, and all twelve AC-28 captures are present. The trusted host
completed the required fresh five-gate run after the model sandbox denied the
local server bind. Owner review remains pending and Step 9 has not begun.

This report covers `docs/phase-5-design.md` §11.2 Step 8 only. It does not
create or edit the dated owner checkpoint, begin Step 9, re-anchor deck or
crate HUD, wire `resolveFocusHudLayout()` into live placement, change canonical
content, or extend the preserved `window.__cockpit*` bridge. No file was
staged or committed during Step 8.

## 1. Delivered scope

Phase 5 implements:

- stable authored focus envelopes for monitor, deck, and crate, including the
  circumscribed-octagon bounds and unified world-space `getFocusTarget()`
  contract;
- one pure, three-free projection solver with asymmetric safe-frame bounds,
  bounded search, last-valid/fallback degradation, and the monitor analytic
  solution retained as a test oracle;
- a per-scene fit cache with explicit CSS-size, transform, reservation,
  accessibility, and context-lifecycle invalidation, plus motion-safe refit
  blending and one-warning-per-failure-episode behavior;
- policy-wired, live-visible-box hover free-look with nonlinear near-center
  damping, full bounded edge reach, pointer-exit decay, and reduced-motion
  parallax removal;
- a single priority-ordered pointer activation arbiter that gives all cockpit
  artifacts and both deck/crate click-away branches uniform sub-slop
  `pointerup` semantics;
- a contained-only accumulator over native scroll with normalized wheel
  modes, bounded deltas, `sizeRatio` gain, drag capture, drag-release inertia,
  keyboard/Home/reset paths, modifier bypass, scroll chaining, and lifecycle
  cancellation;
- one stable every-mode `ResponsiveStage` wrapper with contained-only
  `DRAG · ARROWS/WASD · HOME CENTERS` and RESET chrome; and
- additive development-only focus, free-look, pan, pointer, and recovery
  observables plus sharded Chromium coverage.

`app/layout-contract.ts` and `lib/responsive/layout-contract.ts` require no
change: no route, protected-region alternative, adaptation, or contract schema
changed. A3 registers the two new `data-hud` values in the neutral technical
contract instead. No `ContentContract`, catalog/profile record, or
`content/portfolio-approvals.json` record changed.

## 2. Approved decisions and implementation record

Owner decisions D1–D9 and amendments A1–A3 were approved on 2026-08-10.
A1/A2 landed with the tracked Phase 5 design/manifest record at `7fc525d`;
Step 8 applies A3. The live engineering history also includes the controller
and cloud stabilization records already present before this step. This report
does not rewrite that history or create the later manifest-owned delivery
commit.

| Decision | Implemented result |
|---|---|
| D1 | Monitor, deck, and crate share the projection solver; the planar monitor formula is unit-test-only. |
| D2 | Deck fit protects plinth, platter, and maximum card envelope; rear dust-cover swing and parked-arm tip remain croppable scenery. |
| D3 | Crate fit protects the shell, pulled sleeve, and preview-rise disc sweep; the transient clear waypoint remains excluded. |
| D4 | Contained mode exposes the exact approved instructions and visible RESET control. |
| D5 | Only drag release receives bounded inertia; wheel trains receive none. |
| D6 | Shared reservation, search-bound, fallback-distance, minimum-frame, and parallax-margin tokens govern the fit. |
| D7 | Step 8 remains uncommitted across the owner gate; the controller-owned implementation commit stays at the Step 9 boundary after fresh QA. |
| D8 | Artifact and click-away actions use uniform sub-slop release semantics in fit and contained tiers. |
| D9 / A3 | `pan-instructions` and `pan-reset` are registered as contained-only HUD identifiers without a `LayoutContract` schema change. |

## 3. Acceptance evidence

| AC | Evidence | Status |
|---|---|---|
| AC-1 / AC-4 / AC-8 | `tests/unit/camera-fit.test.ts` and `camera-fit-oracle.test.ts`: deterministic bounded search, optical-center invariant, CSS↔NDC round-trip, analytic monitor oracle, and three.js projection equivalence | pass |
| AC-2 | Authored fixture pins and dense world-space deck/platter/crate sweeps in `camera-fit.test.ts` | pass |
| AC-3 / AC-5 / AC-6 / AC-7 | `e2e/phase5-fit.spec.ts`: full FIT-MATRIX containment, DPR invariance, exact solve-count/tombstone paths, and refit/mode-switch continuity | pass |
| AC-9 / AC-10 / AC-13 | Real-pointer HOVER-TRIO coverage for full bounds, damping, exit decay, and overshoot rejection | pass |
| AC-11 / AC-12 / AC-14 / AC-15 / AC-16 | Pure policy pins plus PAN-SET wheel/drag gain, delta modes, spike/fine movement, bounds, keyboard, native-scroll resync, Home, and RESET | pass |
| AC-17 | Every activation target and both click-away branches covered across fit/contained/wide-fit, with one action per sub-slop press and none per drag | pass |
| AC-18 / AC-19 / AC-21 / AC-29 | Motion precedence, scroll/modifier freedom, complete contained chrome/accessibility behavior, and stable DOM/canvas identity across tier transitions | pass |
| AC-20 | Source review: no UA, platform, or pointer-type tuning branch in the Phase 5 input path | pass |
| AC-22 / AC-23 / AC-24 | Step 7 hygiene: 34-name live bridge unchanged, hooks statically development-only, `preserveDrawingBuffer` unchanged, Phase 6 fixme and placement boundary intact, no content diff | pass |
| AC-25 | Degraded-fit recovery plus contained deck fit/pan recovery after context restoration | pass |
| AC-26 | Both Phase 5 specs registered in the sharded CI matrix; registry sync test green | pass |
| AC-27 | Owner-certified macOS precision-trackpad and owner-host detented-wheel traces using the prepared checkpoint template | **pending owner** |
| AC-28 | Twelve deterministic captures at the paths in §8 are present; approval must be recorded later in the owner-authored dated checkpoint | **pending owner review** |

## 4. Current-state contract amendments

`docs/responsive-system.md` now records the implemented authored-point solver,
cache/invalidation and degradation behavior; the wired hover, pointer, and
contained-pan policies; the Phase 5 development-only observables; and Phase
5's owner-gate status. Amendment A3 adds `pan-instructions` and `pan-reset` to
the `data-hud` registry and states that both are contained-only,
viewport-anchored region chrome.

`CLAUDE.md` now describes the safe-frame-fitted focus modes, policy-wired
free-look, release-based shared activation, and contained crop controls. Its
`window.__cockpit*` section is unchanged.

The `LayoutContract` remains structurally correct: the existing
`cockpit-stage` protected region, `contain` adaptation, keyboard guarantee,
and `contained-complex-region` reflow policy already cover this change.

## 5. Input-policy and lifecycle proof

The shared tuning home remains `lib/responsive/input-policy.ts`:

- hover uses `responseExponentFor()` and `hoverAngle()` against the live
  visible box and never imports or multiplies by `sizeRatioFor()`;
- contained pan is the only production importer of `sizeRatioFor()`;
- pixel/line/page wheel deltas converge through `normalizeWheelDelta()` and
  `MAX_WHEEL_STEP_PX` without device sniffing;
- contained entry and fit→contained re-entry center; same-tier resize clamps
  the existing position; a renderer remount does not move the outer scroll
  container; and
- reduced motion zeros free-look/parallax and removes smoothing/inertia while
  preserving explicit pan.

The main-context recovery case rebuilds derived fit state, deterministically
returns the deck to the same safe-frame result, and leaves contained pan
offsets owned by the outer `ResponsiveStage`. The Phase 3 bridge and durable
view/record restoration contract remain unchanged.

## 6. Phase-boundary and bridge proof

- The authoritative `window.__cockpit*` 34-name set remains byte-identical;
  Phase 5 observability is confined to `__COCKPIT_TEST_HOOKS__`.
- `preserveDrawingBuffer` remains unchanged and false for the main renderer.
- The Phase 6 deck-overlap `test.fixme` remains present; Step 8 does not
  re-anchor deck HUD or wire `resolveFocusHudLayout()` into placement.
- No Phase 7 crate-HUD re-anchoring or Phase 8 browser-project expansion is
  included.
- `content/**`, `lib/projects/catalog.ts`, `lib/portfolio/profile.ts`, and
  `content/portfolio-approvals.json` are untouched by this step.

## 7. Required gates

| Gate | Step 8 result |
|---|---|
| `npm run lint` | pass — ESLint completed cleanly |
| `npm run typecheck:contracts` | pass — strict contract typecheck completed cleanly |
| `npm run validate:contracts` | pass — 5 layout contracts, 4 content contracts, 5 routes, 6 catalog records |
| `npm run test:unit` | pass — 31 files, 385 tests |
| `npm run test:e2e` | pass — trusted-host canonical run: 82 passed, 1 intentional Phase 6 `test.fixme` skip, 0 failed |

The model sandbox could not bind the local Playwright server, so the trusted
phase controller ran this Step 8 gate outside that sandbox. Its fresh result,
not a prior step's run, is the evidence recorded above.

## 8. AC-28 visual-review evidence

The following twelve deterministic development captures are present at the
two approved normal-tier viewports, with each mode settled and the deck
record landed. They are human-review evidence, not pixel-diff baselines and
not owner approval. The capture state uses seed
`ax-cockpit-phase5-fit-v1`, `timeMs = 12000`, and paused ambient motion. Each
JPEG was verified at its filename-declared full-viewport dimensions before
delivery.

| Kind | 1440×900 dark / light | 1024×600 dark / light |
|---|---|---|
| Monitor | [dark](baselines/phase-5-input/ac28/monitor-dark-1440x900.jpg) · [light](baselines/phase-5-input/ac28/monitor-light-1440x900.jpg) | [dark](baselines/phase-5-input/ac28/monitor-dark-1024x600.jpg) · [light](baselines/phase-5-input/ac28/monitor-light-1024x600.jpg) |
| Deck | [dark](baselines/phase-5-input/ac28/deck-dark-1440x900.jpg) · [light](baselines/phase-5-input/ac28/deck-light-1440x900.jpg) | [dark](baselines/phase-5-input/ac28/deck-dark-1024x600.jpg) · [light](baselines/phase-5-input/ac28/deck-light-1024x600.jpg) |
| Crate | [dark](baselines/phase-5-input/ac28/crate-dark-1440x900.jpg) · [light](baselines/phase-5-input/ac28/crate-light-1440x900.jpg) | [dark](baselines/phase-5-input/ac28/crate-dark-1024x600.jpg) · [light](baselines/phase-5-input/ac28/crate-light-1024x600.jpg) |

The owner reviews them against D2/D3/D6 and records AC-28 `approved` or
`changes-requested` in the same dated checkpoint that carries AC-27. The
checkpoint template is
[`OWNER-CHECKPOINT.template.md`](baselines/phase-5-input/OWNER-CHECKPOINT.template.md).

## 9. Owner gate and controller boundary

Step 8 now proceeds through focused independent Kimi QA and then stops at the
owner gate with no commit. The
owner, not an agent, creates and signs exactly one dated
`docs/baselines/phase-5-input/OWNER-CHECKPOINT-<date>.md`. Its latest decision
history entry governs both AC-27 and AC-28; `changes-requested` blocks Step 9
until the same owner-authored file receives a later superseding approval.

Only after owner approval does Step 9 verify the record without editing it,
rerun all five gates fresh, and hand the complete diff to independent Kimi QA.
After QA PASS, the trusted phase controller owns the manifest-approved
implementation commit, including the complete `phase-5-input/` evidence tree.
