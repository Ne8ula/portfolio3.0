# Phase 4 Implementation and Acceptance Report

**Phase:** 4 — shared geometry and projection contract

**Step:** 5 — scorecard baselines, documentation, and delivery

**Engineering date:** 2026-08-07

**Status:** **READY FOR INDEPENDENT QA** — AC-1 through AC-24 now have
repository-backed evidence, the owner approved AC-20, and the required AC-24
debug-overlay and all-four-mode screenshots are attached in §9. All five
required gates are green in the latest independent Step 5 run recorded in §8.

This report covers only `docs/phase-4-design.md` §9 Step 10. No Phase 5
camera/input work, Phase 6 deck-overlap fix, Phase 7 crate re-anchoring,
canonical content change, or live bridge extension is included. The
controller owns the final commit after fresh independent Kimi QA.

## 1. Delivered scope

Phase 4 implements:

- a three-free stage projection contract, shared HUD tokens, safe-frame
  primitive, and deterministic focus-layout solver in the strict `lib/`
  island;
- one production-owned focused-HUD sampler with a monotonic frame id,
  same-frame stage/camera geometry, epsilon-gated publication, context-loss
  parking/reset, and a deck-only 350 ms last-valid grace;
- seven HUD overlays consuming the shared snapshot with no projection rAF in
  `cockpit-hud.tsx`, while keeping their reference-viewport placement and the
  known Phase 6 deck overlap;
- 14 named xmur3+sfc32 streams replacing all 53 cockpit `Math.random()`
  invocations, with null-seed production delegation preserving natural
  variation;
- four clock lanes and deterministic capture-only ambient freeze/mechanical
  completion semantics;
- additive, development-only HUD/capture/asset diagnostics plus the
  `?hudDebug=1` overlay;
- a strictly serial, backend-separated visual scorecard harness and the first
  SwiftShader and owner-hardware 24-cell baselines.

`app/layout-contract.ts` requires no structural amendment: no route,
protected region, alternative, or adaptation changed. No `ContentContract`,
catalog/profile record, or `content/portfolio-approvals.json` record changed.

## 2. D8 and runner-adapted commit record

D8 approved four logical, QA-gated Phase 4 commit groups. The owner-directed
phase runner required the design and manifest to be tracked before
initialization, and a fresh capture later required one narrow allowlist
follow-up before baselines could truthfully identify a clean harness commit.
The live history is:

| Record | Commit | Scope and provenance |
|---|---|---|
| Runner pre-init | `9264bd7` | Tracks the owner-approved design and Phase 4 manifest before automation begins. |
| D8 group 1 / runner Step 1 | `f3dc4c4` | Pure geometry, solver, and seeded-stream API; no runtime wiring. |
| D8 group 2 / runner Step 2 | `50ca962` | Randomness migration, frame lanes, production HUD identifiers, recorder, and pre-rewire parity fixture. |
| D8 group 3 / runner Step 3 | `8987589` | Focused-HUD sampler/rewire, dev instrumentation, browser coverage, and scorecard harness code. |
| Step 4 capture prerequisite | `9fab531` | Adds only three freshly observed exact diagnostic allowlist entries and fail-closed unit coverage before capture. Independently QA-passed; the owner checkpoint explicitly reviewed the entries. |
| D8 group 4 / runner Step 5 | controller pending | Baselines, owner checkpoint, this report, and contract/current-state docs; created only after Kimi PASS. |

`9fab531` is a separate Git commit but remains a narrow amendment to the
logical harness group: only `scripts/perf/visual-scorecard.ts` and
`tests/unit/visual-scorecard.test.ts` changed, no runtime scene/HUD behavior
changed, and both immutable baselines record its clean full hash
`9fab531a5aef694e68d71ec37ca18b419d0c615c`.

## 3. Acceptance evidence

| AC | Evidence | Status |
|---|---|---|
| AC-1 | `tests/unit/stage-projection.test.ts`: offset/padding origin, actual near-plane boundary, far/non-finite/zero/degenerate rejection, raw off-stage rects, rectangle inclusivity | pass |
| AC-2 | `tests/unit/hud-layout.test.ts`: single token home, 0.25 px epsilon boundary, logic-free cockpit re-export identity | pass |
| AC-3 | `tests/unit/hud-layout.test.ts`: every placement tier, precedence, pair balance, 44 px floor, compact hysteresis, unsatisfiable result, obstacle-order determinism | pass |
| AC-4 | Pre-rewire fixture + `e2e/phase4-hud.spec.ts` reference parity for both cockpit hovers, monitor, selected crate, and landed deck | pass — §5 |
| AC-5 | Phase 4 browser test changes DPR 1→2, asserts geometry within 0.25 CSS px and doubled buffers | pass — latest independent Step 4 QA |
| AC-6 | Phase 4 browser test pins frame/source provenance, legacy top-level shapes, monotonic/parked frames, commit handshake, and monitor corners at 1440×900 + 1280×800 | pass — latest independent Step 4 QA |
| AC-7 | `rg -n 'requestAnimationFrame' components/cockpit/cockpit-hud.tsx` returns no match; browser test asserts the same | pass |
| AC-8 | Browser coverage observes ≥60 frozen computes with zero publications, live deck bob publication with differing y, and prompt semantic publication | pass — latest independent Step 4 QA |
| AC-9 | Unit + browser coverage pins 350 ms honest retained provenance, expiry/hiding, disabled busy arrows, no stage-edge fallback, return, and mode-exit clear | pass — latest independent Step 4 QA |
| AC-10 | Browser near-plane invalidation yields `liveFrame.monitor === null`, legacy `{visible:false}`, hidden dialog, and no non-finite HUD style | pass — latest independent Step 4 QA |
| AC-11 | `tests/unit/seeded-streams.test.ts`: known vectors, continuity/independence, U+0000 rejection, null-seed delegate, no global replacement | pass |
| AC-12 | Migration table §4; `Math.random` grep has only the null-seed delegation; configured scene reports all 13 mounted scene streams | pass |
| AC-13 | Two canonical fresh-page loads produce identical same-backend forced buffers; the 72-repeat scorecards also establish same-backend bands | pass — latest independent Step 4 QA |
| AC-14 | Two unconfigured fresh loads report capture inactive and differing 700-point starfield signatures | pass — latest independent Step 4 QA |
| AC-15 | Late configuration rejects after construction and after context-loss rebuild with the reload-first message | pass — latest independent Step 4 QA |
| AC-16 | Frozen selected-crate and deck buffers are byte-identical after ≥550 ms; pinned platter/card transforms remain identical; unconfigured motion remains live | pass — latest independent Step 4 QA |
| AC-17 | Existing unseeded §9.6.2 blank-canvas precondition remains independent in `e2e/smoke.spec.ts` | pass — latest independent Step 4 QA |
| AC-18 | Query-gated inert overlay browser test + production-guard unit test; Step 3 independent QA recorded production-bundle markers absent | pass |
| AC-19 | SwiftShader JSON/Markdown: clean `9fab531`, exact unmasked identity, 24 unique cells × 3 serial repeats, canonical config, valid bands, zero unexpected diagnostics | pass — §6 |
| AC-20 | Owner hardware JSON/Markdown and signed checkpoint: hardware Metal identity, clean `9fab531`, full serial matrix, no SwiftShader comparison, `APPROVED` by Alex | pass — owner-certified, not agent-certified; §6 |
| AC-21 | `e2e/smoke.spec.ts` Phase 6 `test.fixme` remains; fixture records `phase6DeckOverlap: true`; latest suite reports the sanctioned skip | pass |
| AC-22 | Full authoritative 34-name bridge comparison + untouched-boundary review | pass — §7 |
| AC-23 | Browser loss/restore test parks a frozen diagnostic frame, rebuilds with a higher monotonic id and fresh non-retained geometry, and preserves Phase 3 recovery | pass — latest independent Step 4 QA |
| AC-24 | Connected Chrome visual review at the 1440×900 reference viewport: debug overlay in both themes plus cockpit, monitor, crate, and deck screenshots attached in §9 | pass |

## 4. Random-stream migration table (final line numbers)

The 14-name registry still accounts for 53 migrated invocations. Line numbers
below are from the Step 5 worktree; grouped ranges may contain more than one
`next()` call on a line.

| Stream name | Final migrated call sites | Notes |
|---|---|---|
| `starfield` | `components/cockpit/globe-canvas.tsx:216-217` | 700-point scatter |
| `globe-cities` | `components/cockpit/globe-canvas.tsx:855-856` | 120-point scatter |
| `glass-mac/screen-noise` | `components/cockpit/glass-mac.ts:47-48` | screen texture scanlines |
| `glass-mac/surface-speckle` | `components/cockpit/glass-mac.ts:81-83` | case/screen surface speckle |
| `glass-mac/pad-speckle` | `components/cockpit/glass-mac.ts:482-483` | mousepad/mouse texture |
| `vinyl-crate/cover-grain` | `components/cockpit/vinyl-crate.ts:69-70` | sleeve paper grain |
| `vinyl-crate/edge-wear` | `components/cockpit/vinyl-crate.ts:182-183` | top-edge wear |
| `tea-set/glaze` | `components/cockpit/tea-set.ts:33` | glaze/speckle tone |
| `tea-set/etch` | `components/cockpit/tea-set.ts:56-66` | wood/etch strokes and pores |
| `coffee/steam-glyphs` | `components/cockpit/coffee.ts:54-59` | steam glyph sheet |
| `coffee/noise` | `components/cockpit/coffee.ts:98` | ceramic/paper noise |
| `incense/smoke-glyphs` | `components/cockpit/incense.ts:37-42` | smoke glyph sheet |
| `incense/stick-speckle` | `components/cockpit/incense.ts:59-63` | stick texture |
| `boot/glitch` | `components/cockpit/boot-screen.tsx:34,200,519` | runtime DOM glitch; intentionally unseeded in normal boot |

Verification:

```text
$ rg -n 'Math\.random\(' app components lib
lib/random/seeded-streams.ts:72:      return Math.random()
```

The delegation line is the only call-site match; there is no global
monkey-patch. A configured mounted scene reports the 13 scene streams in
`e2e/fixtures/phase4-hud-parity.json`; `boot/glitch` is the fourteenth
registry member and does not run when capture skips boot.

## 5. AC-4 fixture provenance and parity

[`phase4-hud-parity.json`](../e2e/fixtures/phase4-hud-parity.json) records
five pre-rewire states at 1440×900 / DPR 1 using seed
`ax-cockpit-phase4-v1`, `timeMs = 12000`, and paused ambient motion:

| Fixture | Pre-rewire source | Post-rewire proof |
|---|---|---|
| `cockpit-pc-hover` | legacy PC rect + anchors + atomic overlay snapshot | live `pc`/anchors and `object-tag`/PC brackets within 1 CSS px |
| `cockpit-crate-hover` | legacy crate rect + atomic overlay snapshot | live crate rect and `object-tag`/crate brackets within 1 CSS px |
| `monitor` | legacy screen quad + dialog snapshot | live oriented quad, legacy shape, and committed DOM corners within 1 CSS px |
| `crate-record-selected` | legacy crate selection/anchor + four browse overlays | live selection/anchor and browse overlays within 1 CSS px |
| `deck-record-landed` | legacy deck card + browse/link overlays | live deck card and overlays within 1 CSS px; known hint overlap preserved |

The recorder polled geometry within `HUD_RECT_EPSILON = 0.25` for ten
consecutive frames. The fixture records parent HEAD `f3dc4c4` and landed in
`50ca962` with the attribute-only pre-rewire instrumentation and determinism
work; sampler rewiring did not begin until `8987589`. The latest independent
Step 4 browser QA passed all parity assertions and reported 51 passed, one
sanctioned Phase 6 skip, and zero failures for the complete E2E suite.

## 6. AC-19/AC-20 scorecard evidence

Codex did not run, replace, sign, or certify the hardware capture. This report
only verifies the owner-created artifacts and quotes the owner decision.

| Evidence set | Renderer identity | Matrix/provenance | Decision |
|---|---|---|---|
| `software-swiftshader-2026-08-07.{json,md}` | `Google Inc. (Google)` / ANGLE Vulkan SwiftShader Device LLVM 10.0.0; classification `software` | clean `9fab531`; 24 unique cells, 72 serial repeats; canonical D2 config; zero unexpected diagnostics | AC-19 engineering baseline |
| `owner-hardware-2026-08-07.{json,md}` | `Google Inc. (Apple)` / ANGLE Metal Renderer Apple M4 Pro; classification `hardware` | clean `9fab531`; 24 unique cells, 72 serial repeats; canonical D2 config; zero unexpected diagnostics | AC-20 owner baseline |
| `OWNER-CHECKPOINT-2026-08-07.md` | real Chrome 151.0.7922.108 on macOS/arm64, mains power | all eleven protocol confirmations checked; hardware was not compared with SwiftShader | `APPROVED`, Alex, `2026-08-07T20:02:48Z` |

Both captures use `{ seed: "ax-cockpit-phase4-v1", timeMs: 12000,
pauseAmbient: true, sampleGrid: 256, quantBits: 4, sobelThreshold: 24,
metricsVersion: 1 }`. Every median is inside its recorded §6.3 band and both
history arrays contain only `initial baseline`, so neither capture was
compared against the other. Backend metrics are not merged, averaged, or
substituted.

The exact-match allowlist remains owner-visible. Totals across the 72 repeats
are:

| Entry | SwiftShader | Hardware |
|---|---:|---:|
| `swiftshader-readpixels-stall` | 1 | 0 |
| `three-clock-deprecated` | 144 | 144 |
| `vercel-analytics-dev-orb` | 15 | 56 |
| Unexpected diagnostics | **0** | **0** |

## 7. Untouched-boundary and bridge proof (AC-22)

The review range is the Phase 4 pre-init record `9264bd7` through harness HEAD
`9fab531`, plus this controller-manifest documentation diff.

- `lib/responsive/input-policy.ts`, `playwright.config.ts`, and `content/**`
  have no Phase 4 diff.
- A `git diff -G 'getFocusTarget|preserveDrawingBuffer'` review over the
  relevant cockpit/lib/config paths is empty. Camera fit is unchanged and the
  main renderer still uses `preserveDrawingBuffer: false`; the pre-existing
  disposable warp renderer remains the only `true` site.
- Live HUD arithmetic changed only from divergent canvas/viewport coordinates
  to the approved shared stage-coordinate snapshot. The solver is not wired
  into placement; Phase 6/7 re-anchoring has not begun.
- No Playwright project, browser, or config was added.
- `Math.random` remains only the null-seed delegation; global randomness is
  never patched.
- The Phase 6 deck-overlap `test.fixme` and parity fixture overlap flag remain.

The authoritative bridge proof deliberately includes the setter prefix that
the narrower browser assertion does not enumerate. Static source enumeration
with `(cockpit|getCockpit|setCockpit)` produces **34 names** at both
`9264bd7` and the Step 5 worktree:

```text
__cockpitCamera                 __cockpitCoffee
__cockpitCube                   __cockpitDeck
__cockpitDecor                  __cockpitFPV
__cockpitGLBDebug               __cockpitGLBLoaded
__cockpitHoverPC                __cockpitHoveredTag
__cockpitIncense                __cockpitKeyboard
__cockpitPC                     __cockpitRenderer
__cockpitScene                  __cockpitSmoothedPitch
__cockpitSmoothedYaw            __cockpitTableGroup
__cockpitTeaSet                 __cockpitTheme
__cockpitTick                   __cockpitTurntable
__cockpitViewMode               __cockpitVinyl
__cockpitVinylSelect            __getCockpitAnchors
__getCockpitCrateRect           __getCockpitCubeScreenTarget
__getCockpitDeckCardRect        __getCockpitDeckInfo
__getCockpitPCRect              __getCockpitScreenRect
__getCockpitVinylHover          __setCockpitViewMode
```

The set is byte-for-byte equal before and after Phase 4: no name was added or
removed. CLAUDE.md now documents the one contract-relevant live getter it had
previously omitted, `__getCockpitDeckCardRect`; this is a documentation
correction, not a new runtime global. Test instrumentation remains confined to
the separate development-only `window.__COCKPIT_TEST_HOOKS__` namespace.

## 8. Required gates

| Gate | Result |
|---|---|
| `npm run lint` | pass — ESLint completed cleanly |
| `npm run typecheck:contracts` | pass — `tsc -p tsconfig.contracts.json` completed cleanly |
| `npm run validate:contracts` | pass — 5 layout contracts, 4 content contracts, 5 routes, 6 catalog records |
| `npm run test:unit` | pass — 28 files, 353 tests |
| `npm run test:e2e` | pass — 51 passed, one sanctioned Phase 6 skip, zero failures |

The latest independent Step 5 run passed all five gates: lint clean; contract
typecheck clean; validation reported 5 layout contracts, 4 content contracts,
5 routes, and 6 catalog records; unit reported 28 files / 353 tests; E2E
reported 51 passed, one sanctioned Phase 6 skip, and zero failures.

## 9. AC-24 visual-review evidence

On 2026-08-07, Codex used a connected real Chrome session and the visible UI
at an explicitly verified 1440×900 viewport. The debug overlay was reviewed in
both themes for cream/ink/mauve palette use, jade-only chromatic accent, hard
corners, and no shadows. Cockpit, monitor, crate, and deck were then entered
through their visitor-facing controls and spot-checked at the same reference
viewport. Appearance remained consistent with the Phase 4 parity fixtures;
the known deck overlap remains deliberately unchanged for Phase 6.

Debug-overlay review:

- [Dark theme, debug overlay](baselines/phase-4-scorecard/ac24/hud-debug-dark-1440x900.jpg)
- [Light theme, debug overlay](baselines/phase-4-scorecard/ac24/hud-debug-light-1440x900.jpg)

Reference-viewport mode review:

- [Cockpit](baselines/phase-4-scorecard/ac24/mode-cockpit-dark-1440x900.jpg)
- [Monitor](baselines/phase-4-scorecard/ac24/mode-monitor-dark-1440x900.jpg)
- [Crate](baselines/phase-4-scorecard/ac24/mode-crate-dark-1440x900.jpg)
- [Deck](baselines/phase-4-scorecard/ac24/mode-deck-dark-1440x900.jpg)

All six files are JPEG evidence captured from the connected browser and
verified as 1440×900 before attachment. The delivery copies live inside the
controller-approved Phase 4 scorecard evidence tree.

## 10. Controller delivery boundary

AC-24 is complete and all five gates are green. After fresh Kimi PASS, the
controller may create `Phase 4: record scorecard baselines and delivery` from
only:

- `docs/baselines/phase-4-scorecard/`;
- this report;
- `docs/responsive-system.md`;
- `docs/hud-responsive-layout-plan.md`;
- `CLAUDE.md`;
- `AGENTS.md`.

No file was staged or committed by Codex.
