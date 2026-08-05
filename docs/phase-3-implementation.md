# Phase 3 Implementation and Acceptance Report

**Phase:** 3 — renderer and viewport sizing
**Step:** 4 — contracts, documentation, and full acceptance evidence
**Engineering date:** 2026-08-04
**Status:** **READY FOR FRESH INDEPENDENT QA** — the owner approved the AC-6
real-browser zoom matrix and AC-24 visual matrix on 2026-08-04. The separate
runner-support follow-up `523032b` supplies the missing `.mjs` declaration,
and the strict contract typecheck is green. The latest browser-capable
independent run passed 43 tests with one expected Phase 6 skip; the controller
must obtain a fresh Kimi verdict before creating the Step 4 delivery commit.

This report covers only `docs/phase-3-design.md` §9 items 8–9. It does not
authorize or include the separate Phase 2 documentation-housekeeping list.
The controller owns the final commit after independent Kimi QA.

## 1. Delivered scope

Phase 3 delivers:

- one strict render policy with `DPR_CAP = 2`, invalid-size rejection,
  unrounded CSS geometry, and drawing-buffer-only flooring;
- one idempotent size controller used independently by the main and warp
  renderers, driven by mount measurement, `ResizeObserver`, window fallback,
  re-armed DPR media query, and frame-start synchronization;
- `ResponsiveStage` fit/contained integration without detecting or
  counter-scaling browser zoom;
- bounded WebGL context recovery by full keyed remount, including ordered
  outgoing-context release, durable-state seeding, transient-state reset,
  accessible recovery/terminal surfaces, and canonical route escape;
- additive development-only renderer diagnostics with no change to the
  documented `window.__cockpit*` bridge;
- software and owner-hardware DPR capture records plus an owner-certified
  real GPU-process recovery checkpoint.

The cockpit `LayoutContract` in `app/layout-contract.ts` requires no
structural amendment. The recovery panel and terminal notice are stage and
document chrome, not new protected regions; the existing interactive
`cockpit-stage` alternative already points to `/projects`, and `contain` is
already allowed. No `ContentContract`, canonical project/profile record, or
owner approval record changes in this step.

## 2. Owner checkpoint and DPR decision (AC-23)

Codex did not perform or certify either owner-only action. The owner-authored
record
[`OWNER-CHECKPOINT-2026-08-02.md`](baselines/phase-3-dpr/OWNER-CHECKPOINT-2026-08-02.md)
is preserved unchanged and records:

- status `COMPLETE - OWNER CERTIFIED AND APPROVED`;
- the named r2 production capture on an Apple M4 Pro hardware renderer
  (`ANGLE Metal Renderer: Apple M4 Pro`), 24/24 cells complete;
- a one-time branded-Chrome `about:gpucrash` run where recovery status became
  visible, rendering returned without reload, the cockpit returned at rest,
  canonical route links remained available, and no terminal notice appeared;
- an owner signature/approval reference and the decision to retain
  `DPR_CAP = 2` dated 2026-08-02.

The record's result label is quoted exactly as authored: `PASS`. Its required
observation fields are affirmative. This report records that owner-authored
evidence without rewriting or independently certifying it.

The decision uses only the checkpoint-named r2 hardware capture:

| View | DPR 1 median / p95 | DPR 2 median / p95 | DPR 2 threshold result |
|---|---:|---:|---|
| Crate, `1512×982` | 8.3 / 8.7 ms | 15.8 / 17.3 ms | pass |
| Deck, `1512×982` | 8.3 / 16.6 ms | 16.6 / 17.4 ms | pass |

Both DPR 2 views meet the approved median ≤16.7 ms and p95 ≤33.3 ms
threshold, so `lib/responsive/render-policy.ts` records the owner decision
and date. The SwiftShader capture is harness evidence only and is
decision-ineligible. The earlier `owner-hardware-2026-08-02` r1 capture is
retained for audit history but is not decision evidence: the owner checkpoint
explicitly selects `owner-hardware-2026-08-02-r2`.

Structural review of all three raw captures verified 24 unique
viewport×view×DPR cells each, matching observed/requested DPR, matching
renderer pixel ratio, `floor(css × dpr)` canvas/context buffers, ≥15-second
samples, and aligned non-empty raw sample arrays.

## 3. Acceptance evidence

| Acceptance criterion | Evidence | Status |
|---|---|---|
| AC-1 | `tests/unit/render-policy.test.ts` | pass — fresh unit gate |
| AC-2–AC-4 | `e2e/smoke.spec.ts`: stage/camera/buffer parity, resize, DPR-only change | pass — latest browser-capable independent QA suite |
| AC-5 | `e2e/phase3-renderer.spec.ts`: fit ↔ contained stage | pass — latest browser-capable independent QA suite |
| AC-6 | Real browser zoom at 120%, 150%, and 200%; content magnification, no counter-scale, capped DPR, intact HUD alignment | pass — owner approved 2026-08-04 |
| AC-7–AC-9 | `e2e/smoke.spec.ts`: invalid-size recovery, idempotence, warp parity | pass — latest browser-capable independent QA suite |
| AC-10 | `tests/unit/render-policy.test.ts`: observer/listener/query cleanup | pass — fresh unit gate |
| AC-11–AC-19 | `e2e/phase3-renderer.spec.ts`: loss, rebuild, durable/transient state, terminal, accessibility, warp, two-cycle soak | pass — latest browser-capable independent QA suite |
| AC-20 | Unit guard + production-exclusion evidence from Step 7; scoped diff has no new `window.__cockpit*` assignment | unit guard pass; production evidence retained |
| AC-21 | Phase 6 deck-overlap `test.fixme` remains present and expected skipped | pass — present and reported as the one expected skip by independent QA |
| AC-22 | §4 untouched-boundary review | pass |
| AC-23 | Owner-certified r2 hardware capture and `about:gpucrash` record; software capture kept separate | pass (owner-certified, not agent-certified) |
| AC-24 | Recovery panel and terminal notice in both themes, forced colors, and 200% zoom | pass — owner approved 2026-08-04 |

### AC-6 manual matrix

| Zoom | Content magnifies | No counter-scale | Effective DPR ≤ 2 | HUD alignment |
|---:|---|---|---|---|
| 120% | pass — owner verified | pass — owner verified | pass — owner verified | pass — owner verified |
| 150% | pass — owner verified | pass — owner verified | pass — owner verified | pass — owner verified |
| 200% | pass — owner verified | pass — owner verified | pass — owner verified | pass — owner verified |

### AC-24 visual matrix

Review criteria are the approved cream/ink/mauve/jade-only palette,
hard-corner geometry, no drop shadow, no decorative recovery animation,
visible canonical route out, readable focus, and no hidden old scene/HUD
interaction while recovering.

| Surface | Dark | Light | Forced colors | 200% zoom |
|---|---|---|---|---|
| Transient recovery panel | pass — owner approved | pass — owner approved | pass — owner approved | pass — owner approved |
| Terminal runtime notice | pass — owner approved | pass — owner approved | pass — owner approved | pass — owner approved |

Owner approval for both completed manual matrices was recorded in the
repository conversation on 2026-08-04. This report records the owner's
observations; Codex did not perform or self-certify the manual review.
The owner explicitly waived repository screenshot artifacts for AC-24 on
2026-08-04; the completed matrix and recorded owner approval are the accepted
visual-review evidence for this phase.

## 4. Untouched-boundary proof (AC-22)

The Phase 3 implementation commits and this manifest-bounded Step 4 diff were
reviewed against the live repository:

- `components/cockpit/hud-layout.ts` does not exist; Phase 4 geometry work did
  not start.
- Existing `Math.random()` scene calls remain; no seeded-stream migration or
  §9.6.3 visual scorecard baseline was introduced.
- `lib/responsive/input-policy.ts` and `playwright.config.ts` are unchanged
  across the Phase 3 implementation range.
- No camera-fit solver or `getFocusTarget` policy amendment was introduced.
- No deck/crate DOM HUD-anchor rework was included in Phase 3.
- No Playwright project or browser was added.
- The main renderer still uses the default
  `preserveDrawingBuffer: false`; only the pre-existing warp renderer opts
  into `true`.
- The Phase 6 deck-overlap `test.fixme` remains named and skipped.

The shared worktree also contains owner/agent changes outside this Step 4
controller boundary (turntable tether, vinyl motion/extraction, site-header
cleanup, transform dial-ins, their tests/docs, the rolling handoff, and an
owner-only approval timestamp restamp). They are preserved, not staged or
rewritten, and are not evidence that this documentation step crossed a phase
boundary.

## 5. Fallback and recovery reporting

- **D4 fallback not taken:** restoration returns to the last stable view at
  rest; deck restoration keeps the same record landed at rest.
- **R2 fallback not taken:** contained ScreenDialog focus uses
  `focus({ preventScroll: true })`; no scoped scroll save/restore was needed.
- Warp loss follows D3 and completes the disposable transition immediately.
- Repeated main-context failure uses the approved canonical document
  fallback; the owner `about:gpucrash` run recovered automatically and did
  not reach it.
- No adaptive render scaling was added. `DPR_CAP` remains a static,
  owner-approved policy.

## 6. Required gates

| Gate | Result |
|---|---|
| `npm run lint` | pass — exit 0, no findings |
| `npm run typecheck:contracts` | pass — exit 0 after runner declaration follow-up `523032b` |
| `npm run validate:contracts` | pass — 5 layout, 4 content, 5 routes, 6 catalog records |
| `npm run test:unit` | pass — 22 files, 301 tests |
| `npm run test:e2e` | pass — latest browser-capable independent QA run passed 43 tests with one expected Phase 6 skip |

The earlier Codex sandbox could not bind a local acceptance server. The trusted
phase controller and independent QA completed the browser gate outside that
sandbox. Follow-up `523032b` changes declaration metadata only and has no
runtime browser behavior; the controller still requires a fresh Kimi pass on
the current repository snapshot before delivery.

## 7. Delivery boundary

The controller-approved delivery commit may include only:

- `scripts/perf/dpr-baseline.ts`;
- `docs/baselines/phase-3-dpr/`;
- this report;
- `lib/responsive/render-policy.ts`;
- `docs/responsive-system.md`;
- `docs/hud-responsive-layout-plan.md`;
- `CLAUDE.md`, `AGENTS.md`, and `DESIGN.md`.

No file was staged or committed by Codex.
