# Phase 6 Design — Deck HUD Re-Anchoring

Author: Claude (design lead, per `AGENTS.md`). Status: **awaiting owner
design approval — the blocking items in §18 gate Codex implementation.**
No production code or tests were changed by this design turn.

---

## 1. Status and approved starting point

- Branch: `main`; merge commit `03fca60746a8aef79c66a820d53168aa564abd8f`
  ("Merge Phase 5: 3D fit and input normalization").
- Phase 5 tested head: `15c53adc8bbdda849c070ba14d7af4de2d8a004c`; PR #1 is
  merged; CI run #29 passed all 16 required jobs.
- Phase 5 carries an independent Kimi QA PASS and explicit owner approval
  (AC-27 hardware certification and AC-28 visual approval recorded in
  `docs/baselines/phase-5-input/OWNER-CHECKPOINT-2026-08-14.md`).
- Retained Phase 5 fallback branch: `codex/diagnose-and-fix-ac-17-e2e-timeout`.
- Working-tree note (historical): at the initial design-turn snapshot the
  tree carried only the hook-managed `docs/agent-handoff.md` modification.
  The current tree additionally carries concurrent, unrelated work —
  the plan revision-8 roadmap documentation, historical renumbering notes,
  and an owner-driven prop removal — all preserved untouched by this
  design's turns; nothing was cleaned, staged, or committed.
- Phases −1 through 5 are delivered per `docs/responsive-system.md` §12.
  Phase 6 is the next scheduled phase in `docs/hud-responsive-layout-plan.md`
  §8 ("the plan").

Phase 6 exit condition (plan §8): **the reported MacBook overlap is fixed and
deck acceptance tests pass.**

## 2. Evidence from the live implementation

Every statement below was verified against the working tree at `03fca60`.

**The defect.** `BrowseArrows` in `components/cockpit/cockpit-hud.tsx`
places the deck browse hint at a stage constant —
`top: 76, left: '50%', transform: translateX(-50%)`
(`cockpit-hud.tsx:1131`) — while the holographic card rect is
projection-driven (`hud-sampler.ts` publishes `deck.card` from the card's
four projected world corners, `turntable.ts` `getCardCornersWorld()`).
The two coordinate sources have no invariant relationship, so the hint and
card collide on shorter viewports. The Phase 0 baseline recorded the overlap
reproducing on **12 of 17** matrix viewports (plan §8 Phase 0).

**The arrows.** Deck arrows are already card-anchored but through ad-hoc
constants with independent clamping
(`cockpit-hud.tsx:1097–1099`: `Math.max(8, rect.x - 60)` /
`Math.min(frame.stage.w - 56, rect.x + rect.w + 14)`), violating the plan
§7.3 rule that the pair resolves as one balanced layout with shared tokens.

**The machinery already exists and is deliberately unwired:**

- `lib/responsive/hud-layout.ts` implements
  `resolveFocusHudLayout()` — the deterministic
  chrome → (info) → balanced-arrow-pair → hint solver with tiers exactly
  matching plan §7.2/§7.3, plus all shared tokens
  (`HUD_EDGE_GUTTER 16`, `HUD_SUBJECT_GAP 14`, `HUD_COLLISION_GAP 8`,
  `HUD_MIN_HIT_SIZE 44`, `HUD_RECT_EPSILON 0.25`, `HUD_RECT_GRACE_MS 350`,
  `HUD_COMPACT_HYSTERESIS 8`). It is unit-tested
  (`tests/unit/hud-layout.test.ts`, 338 lines) and has **no live caller**
  (verified by grep; `components/cockpit/hud-layout.ts` is a pure
  re-export pinned by the unit test at line 97).
- `components/cockpit/hud-sampler.ts` publishes one epsilon-gated,
  mode-aware frame snapshot per semantic/geometric change: `stage`
  (`{0,0,w,h}` in stage CSS px), `safeFrame` (= `computeSafeFrame(stage)`,
  edge gutter only), `deck.info` (`index/count/busy`), and `deck.card`
  (projected card bounds with the deck-only 350 ms retained-card grace,
  `retained: true` while grace is active). React consumes it through
  `useHudFrame()` (`useSyncExternalStore`); the `Cockpit` component already
  subscribes.
- `components/cockpit/focus-fit-store.ts` +
  `FOCUS_CAMERA_RESERVATIONS.deck = {top:56, right:60, bottom:72, left:60}`
  drive the Phase 5 camera fit. `getEffectiveFocusReservations('deck')`
  widens those rails from the hidden max-size measurement
  (`FocusFitMeasurement` in `cockpit-hud.tsx`), so the fitted card always
  leaves room above (≥56 px band incl. return control), below (≥72 px band
  incl. hint), and beside (≥60 px rails incl. arrows), before the ±4 %
  `FIT_NDC_MARGIN` parallax allowance.
- The return control renders at `cockpit-hud.tsx:314`:
  `<div data-hud="return-control" style={{position:'absolute', top:28,
  right:40, zIndex:90, …}}>` containing the `esc · return` button. It is
  stage chrome inside the stage element (it pans with the contained
  surface).

**Test surfaces that constrain this phase (live):**

- `e2e/smoke.spec.ts:951` — the Phase 6 `test.fixme`
  ("deck browse hint does not overlap the holographic project card on short
  viewports (Phase 6)") at 1280×720; the only `test.fixme` in that file.
- `e2e/phase4-hud.spec.ts:966` — AC-21 meta-guard asserting
  `smoke.spec.ts` contains `test.fixme` + `Phase 6` and
  `parity.assertions.phase6DeckOverlap === true`
  (`e2e/fixtures/phase4-hud-parity.json:58`).
- `e2e/phase4-hud.spec.ts:461–472` — AC-4 asserts `deck-record-landed`
  overlay parity at 1440×900 for `browse-hint`, `browse-arrow-prev`,
  `browse-arrow-next`, `deck-project-link`, `screen-dialog` against the
  recorded pre-rewire fixture. Re-anchoring deliberately moves the first
  three at the reference viewport, so this assertion must be narrowed
  (see §13/§17-D7).
- `e2e/phase4-hud.spec.ts:565–779` — AC-8/9 asserts deck swaps never fall
  back to stage edges (`|arrowLeft − 36| > 4`, gap frames unmount or stay
  disabled at the card anchor). The solver design preserves all of these
  properties (§8, §17-D10).
- `e2e/phase5-fit.spec.ts:470–633` — AC-7/25 requires
  `[data-hud="browse-hint"]` **visible** in landed deck at 1440×900 and
  after a 1024×600 refit, and **absent** while the deck fit is degraded.
  Preserved by this design (§11).
- `e2e/smoke.spec.ts:779` — the Phase −1 entrance assertion drives the
  **crate** overlays only (`selectRecord`) and requires the
  `[data-hud] > firstElementChild` wrapper split with `termFadeIn` on the
  inner element. Untouched by Phase 6; the deck gets its own equivalent
  criterion (P6-AC-14).
- `tests/unit/e2e-runner.test.ts` — pins the ci.yml browser matrix in exact
  sync with discovered spec files (`matrixSpecs.length === discovered + 5`);
  adding a sharded Phase 6 spec requires amending the count (§13).
- The ACCESSIBILITY trigger is `position: fixed; left/bottom:
  var(--stage-gutter); z-index: 200` (`app/globals.css:1395`) — viewport
  chrome visible in deck mode (see §17-D6 for why it is not solver chrome).
- Reduced motion disables all animations globally
  (`app/globals.css:281–292`), so `termFadeIn` never runs under reduced
  motion without any per-component code.

## 3. Problem statement and root mechanism

The deck card's on-screen rect is a function of camera pose, stage size,
aspect, the Phase 5 fit solve, parallax, and card bob. The hint's position is
a constant. Their separation therefore has no invariant: at
1280×720-class viewports (the reported MacBook case) the projected card rises
into the hint band and they overlap. The arrows sit beside the card but are
clamped per-arrow with unshared literals, so on narrow stages they can
unbalance or crowd the card. Plan §2.2 assigns the fix: anchor the deck hint
and arrow pair to the projected card rect through the shared collision solver
and feed the measured return-control rect in as chrome.

## 4. Phase 6 scope and explicit non-goals

**In scope (deck-HUD re-anchoring, plus the two shared-chrome corrections
it depends on):**

1. Measure the live deck hint (full + compact forms) and both arrow controls.
2. Measure and publish the occupied return-control rect (solver input +
   dev-only observability).
3. Drive the deck hint and the arrow pair from `resolveFocusHudLayout()`
   anchored to the published deck-card rect.
4. Feed the return-control rect into collision resolution as chrome.
5. Preserve the outer-positioning / inner-entrance-animation wrapper split.
6. §6.9's accessibility-size consumption: deck controls plus the **shared**
   return control — whose 44 px minimum-height correction is visible in
   monitor and crate as well — and the per-kind-scoped style alignment of
   the `FocusFitMeasurement` replicas (deck arrow/hint formulas; return
   formula in every kind; crate arrow/hint replicas unchanged).
7. Replace the Phase 6 `test.fixme` with executable deck acceptance coverage
   and add the deck acceptance spec; amend only the test surfaces that
   Phase 4 explicitly parked on this boundary (AC-4 deck parity rows,
   AC-21 meta-guard).
8. One narrowly scoped, additive solver amendment: placement-tier metadata
   (§6.6, justified in §17-D3).

**Non-goals (hard boundaries):**

- No crate HUD re-anchoring, crate arrows, or `VinylInfoCard` placement
  (Phase 7). `BrowseArrows`, `VinylBrowseArrows`, `VinylInfoCard`, and the
  crate hint `top:76` are **not modified**.
- No Phase 9 cross-browser enforcement (the enforcement phase — renumbered
  from Phase 8 by plan §0.7 revision 8); Chromium remains the CI browser.
- No Phase 8 appearance/art-direction migration work (plan §8 Phase 8):
  no material, lighting, background, or typography changes.
- No camera-fit or Phase 5 input changes: `FOCUS_CAMERA_RESERVATIONS`,
  `getEffectiveFocusReservations`, the fit cache, input policy, and pan
  controller are untouched. `FocusFitMeasurement` changes **only** in its
  replica sizing styles (§6.9 alignment); its lifecycle, generations, and
  store contract are untouched.
- No canonical content changes; no `content/portfolio-approvals.json` writes.
- No stopgap constants, no second solver, no duplicated spacing tokens.
- No React Three Fiber, WebGPU, or TSL.
- No `window.__cockpit*` bridge change (byte-for-byte preserved; the pinned
  34-name check in `phase4-hud.spec.ts` must stay green).
- No production test hooks; instrumentation stays additive and dev-only.
- No pixel-perfect shader baselines; no unrelated visual redesign.
- `DeckProjectLink` is unchanged (already subject-anchored inside the card).
- The known deck-HUD overlap **with the in-scene monitor imagery**
  (ScreenDialog) is not a collision obstacle (§17-D5); nothing else about
  ScreenDialog changes.

## 5. Chosen layout behavior

At deck steady state the three controls anchor to the published card rect:

- **Arrows** resolve as one balanced pair through the solver's tiers:
  1. beside the card's left/right edges, vertically centered
     (`HUD_SUBJECT_GAP` off the card);
  2. a centered horizontal rail in the nearest collision-free band above or
     below the card;
  3. safe-frame edge placement at the y nearest the card's vertical center.
  Measured sizes floor at `HUD_MIN_HIT_SIZE` (44×44); disabled arrows stay
  mounted and visible at reduced opacity exactly as today.
- **Hint** places by priority: centered above the card → centered below →
  compact form on the safe-frame top rail, then bottom rail → hidden.
  Compact→full exit is damped by the solver's **implemented** hysteresis:
  while compact, a full-tier candidate is accepted only when it clears every
  collision obstacle by `HUD_COLLISION_GAP + HUD_COMPACT_HYSTERESIS`
  (obstacle clearance only — safe-frame containment and the subject gap are
  not widened; `hud-layout.ts:442`). Hysteresis only raises the threshold
  for *switching* tiers; every accepted candidate in either direction still
  passes the full legality predicate, so hysteresis can never preserve or
  admit an illegal placement. The hint is the only element allowed to
  disappear, and only after every legal tier fails or while the camera fit
  is degraded (existing behavior).
- **Return control** stays stage-anchored at its current offsets
  (`top:28, right:40`); it never follows the deck and never moves to escape
  a collision. Its measured occupied rect enters the solver as the single
  `chrome` entry, so subject-attached controls route around it.
- **Compact hint content** (new, deck only): the full hint remains
  `◄ ► to browse · esc to return`; the compact form is **`◄ ► browse`** —
  same box styling, type role, and palette as the full hint, one line,
  no wrap. The `esc` affordance is not lost: the `esc · return` control is
  always visible chrome in deck mode. The wording is a **blocking design
  approval** (§18): the compact form's measured width feeds tier selection,
  hysteresis, and snapshot geometry, so re-wording after implementation
  re-runs the deck acceptance suite. It is presentation microcopy, not
  canonical content.
- Everything tracks the epsilon-gated published frame: card bob and focused
  parallax move the card a few CSS px, publication is gated by
  `HUD_RECT_EPSILON`, and hint + arrows follow together — the same tracking
  the arrows already do today, now shared by the hint.

Visual language is unchanged: same fonts, borders, ink/cream/jade tokens,
hard corners, no drop shadows, same z-indices (arrows/hint 17, return 90).
Phase 6 changes **where** the deck controls sit; the only appearance change
is §6.9's deliberate standard-state accessibility correction — the
return-control button rises to the 44 px minimum height (all focused modes)
and the deck arrows to the 44 px minimum width.

## 6. Exact geometry and solver-input contract

### 6.1 Coordinate ownership

Every solver input and output is in **stage coordinates**: CSS pixels,
origin at the cockpit stage's padding-box top-left, +x right, +y down
(`docs/responsive-system.md` §3.2). DPR never appears in any input; a
DPR-only change republishes nothing (sampler epsilon gate) and must leave
every deck HUD rect unchanged (P6-AC-18). In contained mode the "stage" is
the pinned 1024×600 `ResponsiveStage` surface — the stage element itself —
so all inputs and outputs pan with the surface unchanged.

### 6.2 `FocusHudInput` for deck mode

```ts
resolveFocusHudLayout({
  kind: 'deck',
  stage: frame.stage,                    // {0, 0, w, h} from the published frame
  safeFrame: frame.safeFrame,            // computeSafeFrame(stage) — edge gutter only
  subject: rectOf(frame.deck.card),      // {x, y, w, h} of the published card
                                         // (retained rect during swap grace)
  chrome: [returnControlRect],           // exactly one entry — §6.4
  sizes: {
    hint: measured.hintFull,             // live-measured, §7
    hintCompact: measured.hintCompact,
    arrow: normalizedArrowSize,          // §6.5
  },                                     // no `info` for deck — crate-only input
  previousCompact,                       // hysteresis state, §6.7
})
```

The solve runs in React render (memoized) keyed on the published frame
reference and the measurement state; only publication (epsilon-gated),
measurement changes, or deck entry/exit re-run it. No new rAF loop, no
unconditional per-frame setState — the Phase 4 sampler publication contract
is the only trigger.

### 6.3 No double-reservation of the return control

The return control participates in two **different subsystems that never
stack inside one computation**:

- *Camera side (Phase 5, unchanged):* `getEffectiveFocusReservations('deck')`
  keeps `top = max(56, returnHeight + 12)` so the **fitted card** stays clear
  of the top rail. This shapes where the subject can be.
- *Placement side (Phase 6, new):* the live measured return-control rect is
  solver `chrome`, so the **hint and arrows** never intersect it.

The camera reservation constrains the subject; the chrome rect constrains
the satellites. Neither imports the other's numbers; no constant is
duplicated; `FOCUS_CAMERA_RESERVATIONS` is not edited.

### 6.4 Return-control occupied rect (derivation, not position measurement)

The wrapper's stage offsets become one shared local constant used by **both**
the JSX and the rect computation (single source, no drift):

```ts
const RETURN_CONTROL_OFFSET = { top: 28, right: 40 } as const
returnControlRect = {
  x: frame.stage.w - RETURN_CONTROL_OFFSET.right - measured.returnControl.w,
  y: RETURN_CONTROL_OFFSET.top,
  w: measured.returnControl.w,
  h: measured.returnControl.h,
}
```

Only the wrapper's **size** is measured (`ResizeObserver` +
initial layout-effect read of `[data-hud="return-control"]`); the position is
pure arithmetic from the published stage size, so stage resizes need no DOM
re-measurement and no measurement/positioning ordering exists. This is legal
under the layout law: the return control is stage chrome, and CSS-pixel
constants may position chrome. Publication: the rect is part of the solver
input state and is exposed through the dev-only test hook (§12); it is not
added to the production bridge.

### 6.5 Arrow-size normalization and real hit-box sizing

The two arrow wrappers are measured independently and normalized to **one
conservative pair size**: component-wise `max` of the two measured boxes.
The solver then floors at `HUD_MIN_HIT_SIZE` (44×44).

The solver rect must correspond to a real box, not merely an origin.
Writing only `left/top` would leave the wrapper at its content size —
smaller than a floored or normalized rect — so the collision math and the
rendered pair would diverge. The contract is:

- **Wrappers are explicitly sized and aligned.** Every deck-HUD outer
  wrapper receives `left`, `top`, `width`, **and** `height` from its solver
  rect, with its content centered. Both arrow wrappers therefore render the
  identical normalized pair box.
- **Measurement reads natural content, never the solver-sized wrapper.**
  The measured element is the persistent natural-size measurement container
  (§7's structure), whose size derives from its control content and never
  from placement. This is what keeps §7 rule 8 loop-free.
- **The real interactive box carries its own CSS minimum.** The arrow
  buttons take `min-width/min-height: var(--control-min)` (§6.9), so the
  actual clickable box is ≥ 44×44 in standard state and ≥ 56×56 under
  large controls, independent of the solver floor. Because both naturals
  are ≥ `--control-min`, the normalized pair size, the solver rect, and the
  real hit boxes rise together under large controls; the two buttons may
  differ from the pair box only by sub-glyph-width slack inside identical,
  centered wrappers. `HUD_MIN_HIT_SIZE` (44) is unchanged and remains the
  solver-side lower bound.

Solver sizes derive from the same measured boxes, so any content/box
mismatch is bounded to one commit before the observer re-fires (§7).

### 6.6 Solver amendment: placement-tier metadata (additive)

`FocusHudPlacedLayout` gains two readonly fields:

```ts
arrowTier: 'beside' | 'rail' | 'edge'
hintTier:  'above' | 'below' | 'compact-top' | 'compact-bottom' | 'hidden'
```

Behavior, priorities, constants, and every existing field are unchanged;
the fields record which tier produced the output. Justification: acceptance
criteria must assert "arrows use the solver's legal fallback tiers" — without
metadata, tests would re-derive tier membership from geometry, i.e. a shadow
copy of placement math that drifts (§17-D3). Unit tests extend to pin the
metadata on the existing fixtures; determinism (`reversed.toEqual(forward)`)
is preserved because the metadata is a pure function of the same input.

### 6.7 Hysteresis state

`previousCompact` starts `false` on deck-HUD mount, holds the last solve's
`compact` output across record swaps within one continuous deck session, and
dies with the component on deck exit / remount / context rebuild (fresh
session ⇒ full-hint preference). It is stored in a ref, read during render,
written in a layout effect after commit.

### 6.8 Geometric feasibility at the supported floor (verified)

At 1024×600: `safeFrame = {16,16,992,568}`. The Phase 5 fit constrains the
card inside `computeSafeFrame(stage, effectiveDeckReservations)` minus the
4 % NDC margin, so the card top sits ≥ 72 px from the stage top
(16 + max(56, returnH+12)), leaving ≥ 56 px between the safe-frame top
(y = 16) and the card top (72 − 16) — enough for the ~31 px hint plus the
14 px subject gap (45 px total) at standard text, with the below tier
(≥ 72 px reserved band) and compact rails as fallbacks at large text.
The effective side reservation is `max(60, arrowW + 16)`, applied inside
the separate 16 px edge gutter; it always exceeds the beside-tier need of
`arrowW + 14` by at least 2 px. At the 44 px standard arrow minimum that is
a 60 px reservation — 76 px from the stage edge including the gutter —
against a 58 px need, and the margin persists under large-controls scaling
(56 px arrow ⇒ 72 px reservation vs a 70 px need). The solver therefore has
a legal placement at every supported stage; P6-AC-13 asserts
`status === 'placed'` across its stated matrix.

### 6.9 The live controls must consume the accessibility size tokens

The current deck controls and return control use fixed inline sizes
(`fontSize: 9`/`16`, `padding: '6px 12px'`/`'13px 15px'` —
`cockpit-hud.tsx:314, 1108–1146`) and consume neither `--text-scale` nor
`--control-min` (`app/globals.css:65, 97, 142–148`). Under
`data-a11y-text="large"` / `data-a11y-controls="large"` they would not
resize, no ResizeObserver report would fire, and every large-state guarantee
in this design would be vacuous — while the camera-side replicas already
model 1.25× scaling, silently diverging from the live UI.

Phase 6 therefore **requires** the deck-mode live controls to consume the
existing tokens (no `globals.css` change — the tokens are already defined):

| Element | Required consumption |
|---|---|
| Return-control button + wrapper | `font-size: calc(9px * var(--text-scale))`; padding scaled by `--text-scale`; `min-width/min-height: var(--control-min)` on the button |
| Arrow buttons | glyph `font-size: calc(16px * var(--text-scale))`; padding scaled by `--text-scale`; `min-width/min-height: var(--control-min)` |
| Hint (full + compact forms) | `font-size: calc(9px * var(--text-scale))`; padding scaled by `--text-scale` |

**Standard-state effect — a deliberate accessibility correction, not
pixel-identity.** The `calc(… * var(--text-scale))` font/padding forms are
identity at the default scale, but `min-width/min-height: var(--control-min)`
(44 px default) changes two undersized controls **in standard state**:

- the shared return-control button grows from ≈ 28.4 px to 44 px tall
  (recorded at 114.56×28.39 in `phase4-hud-parity.json`) — visible in
  monitor, crate, and deck;
- the deck arrows grow from ≈ 41.6 px to 44 px wide (recorded at
  41.61×55.19) — deck only; the crate arrows (`BrowseArrows`) are untouched
  and keep their recorded size.

Both corrections bring the controls up to the project's preferred 44 px
target (plan §A.6, `DESIGN.md` §13); the non-interactive hint takes no
minimum and stays pixel-identical at standard scale. This does not break any
retained parity assertion: the return control appears in no AC-4 overlay
list, the deck rows are narrowed by this design, and the crate rows describe
the untouched `BrowseArrows`. Standard-state **camera reservations are
numerically unchanged**: `returnHeight + 12` becomes 44 + 12 = 56 = the base
top reservation, and `arrowW + 16` becomes 44 + 16 = 60 = the base side
reservation.

**Replica alignment (required, narrowly scoped).** The live formulas above
diverge from `FocusFitMeasurement`'s replica styles
(`cockpit-hud.tsx:1240ff`), which scale padding by an ad-hoc
`controlScale`/`textScale` and apply **no control minimum** — under large
controls a live ≥ 56 px arrow or return control would exceed its replica,
invalidating the "measured maxima can only add camera margin" guarantee.
Phase 6 therefore amends `FocusFitMeasurement`'s replica **styles only**,
**scoped by focus kind** so the Phase 7 crate boundary is not disturbed:

- **Return replica — every kind (monitor, crate, deck):** the live return
  control is shared chrome and receives the correction in all focused
  modes, so its replica adopts the live token formulas
  (`calc(… * var(--text-scale))` + `min-width/min-height:
  var(--control-min)`) everywhere. Standard-state reservations are
  unaffected (44 + 12 = 56 = base top in every kind).
- **Arrow and hint replicas — `kind === 'deck'` only:** adopt the live deck
  formulas, including the arrow control minimum, so deck maxima are ≥ the
  live deck sizes in every accessibility state.
- **Arrow and hint replicas — `kind === 'crate'`:** retain their existing
  Phase 5 formulas untouched. The live crate controls (`BrowseArrows`) do
  not consume the tokens until Phase 7, so the existing scaled replicas
  remain ≥ the fixed-size live crate controls; applying the new arrow
  minimum here would enlarge crate camera reservations under large
  controls and change crate composition inside Phase 6's scope — exactly
  the Phase 7 work this design must not pre-empt.

Its measurement lifecycle, generations, font-ceiling logic, and the
`focus-fit-store` contract are untouched, and the standard-state
reservations stay at the base values shown above in every kind.

The crate hint/arrows (`BrowseArrows`) remain untouched — their token
consumption is Phase 7 work alongside their re-anchoring.

### 6.10 Proof: a safe-frame subject override is deterministically unsatisfiable

P6-AC-24 depends on `setDeckHudSubjectOverride(safeFrame)` forcing the
solver's `unsatisfiable` branch. This follows from the solver's own
constraints, not from empirical observation:

1. Every arrow candidate `C` must pass `candidateIsLegal`, which requires
   **both** `contains(safeFrame, C)` **and**
   `!intersects(C, subject, HUD_SUBJECT_GAP)`
   (`lib/responsive/hud-layout.ts:144–157`).
2. With `subject = S` (the safe frame itself), any candidate with positive
   width/height that satisfies `contains(S, C)` necessarily satisfies
   `intersects(C, S, g)` for every `g ≥ 0`, by the `intersects` inequalities
   (`lib/responsive/geometry.ts:51`):
   - `C.x < S.x + S.w + g` — from containment, `C.x + C.w ≤ S.x + S.w`
     and `C.w > 0`, so `C.x < S.x + S.w ≤ S.x + S.w + g`;
   - `S.x < C.x + C.w + g` — from containment, `S.x ≤ C.x`, and `C.w > 0`
     gives `C.x + C.w + g > C.x ≥ S.x`;
   - the two `y` inequalities hold symmetrically.
3. Containment and non-intersection are therefore jointly unsatisfiable for
   every positive-area candidate; `candidateIsLegal` is false for every rect
   the beside, rail, and edge tiers can generate (all three filter through
   `candidateIsLegal`/`arrowPairIsLegal`), so `resolveArrows` returns
   `null` and `resolveFocusHudLayout` returns
   `{ status: 'unsatisfiable', failed: 'arrows' }` — deterministically,
   independent of viewport, measurements, or chrome.

The hint stage is never reached (arrows are mandatory), so no partial
placement can leak. This is the §17-D18 rationale made exact.

## 7. Measurement ownership and lifecycle

One new component, `DeckHud` (rendered where `DeckBrowseArrows` renders
today: `hudFrame?.mode === 'deck'`), owns all deck measurement and placement.

**DOM structure (unambiguous, per control):**

```text
outer shell            persistent · solver left/top/width/height · content
                       centered · carries data-hud ONLY while placed
└─ measurement box     persistent · natural content size (inline-block /
                       max-content, never constrained by the shell) · the
                       ResizeObserver target · NEVER remounts
   └─ animated child   keyed per placement episode · owns termFadeIn ·
                       remounting it swaps nothing the observer watches
      └─ control       the arrow <button> / hint box (visuals, min sizes)
```

`termFadeIn` animates opacity/transform, which never changes layout size, so
the animated child cannot perturb the measurement box. Remounts replace only
the keyed child inside the persistent measurement box within a single React
commit — observer bindings survive and content size is unchanged across the
swap. The return control keeps its existing flat structure (no animation, no
remount); its wrapper is measured directly.

**Measured elements — the five persistent measurement nodes:**

| Input | Observed node | Notes |
|---|---|---|
| `returnControl` | `[data-hud="return-control"]` wrapper | size only; position derived (§6.4); token consumption per §6.9 |
| `hint` (full) | the full-hint measurement box | its shell receives `data-hud="browse-hint"` only while placed and visible |
| `hintCompact` | the compact-hint measurement box | its shell receives `data-hud="browse-hint"` only while placed and visible |
| `arrow` ×2 | each arrow measurement box | normalized per §6.5; shell identified only while placed |

**Rules:**

1. **Shells and measurement boxes persist; identifiers mark placement —
   judged per control.** Both hint forms and both arrows keep their outer
   shell **and** measurement box mounted for the whole life of `DeckHud`,
   so every size is continuously observable. A `data-hud` identifier
   (`browse-hint`, `browse-arrow-prev`, `browse-arrow-next`) is present
   **only on a visible, legally placed control's shell**; at most one
   element carries `browse-hint` at any time. Hiding is decided for each
   control by whether **that control** is placed:
   - *All three controls* are hidden in the states where nothing is placed:
     pre-measurement, `no-subject` (card-null gap), and unsatisfiable.
   - *Degraded camera fit hides only the hint shells, while the layout
     remains satisfiable.* The arrows stay identified, visible, and
     solver-placed, and follow **only** the normal busy/boundary disabled
     rules — never a blanket disable (state row 7, §11, and Phase 5's
     requirement that essential controls survive a degraded fit).
     **Precedence:** if the same failure also distorts the subject so no
     legal arrow placement exists, the unsatisfiable rule above wins and
     all three controls hide.
   A hidden shell is stripped of `data-hud`, parked `visibility: hidden`
   (never `display: none`, which would zero ResizeObserver reports),
   `aria-hidden="true"`, `pointer-events: none`, with its arrow button
   `disabled` defensively while hidden. Because `getHudSnapshot()` collects
   every `[data-hud]` element regardless of visibility
   (`test-hooks.ts:801`), the identifier IS the observable presence
   contract: no identifier ⇒ no overlay record — byte-compatible with
   today's unmount semantics relied on by phase4 AC-8/9 and phase5
   AC-7/25.
2. **Gap recovery replays the entrance.** The shell and measurement box
   persist across hidden↔placed transitions; only the keyed **animated
   child inside the measurement box** remounts when a control goes from
   non-placed to placed, so `termFadeIn` replays exactly as today's
   unmount/remount cadence does while the observed node never changes.
   Revealing never re-runs measurement.
3. **Mount before subject:** `DeckHud` mounts as soon as
   `mode === 'deck' && deck.info !== null`, even while `deck.card` is null
   (flight in), so measurement completes before the card lands.
4. **Initial measurement** is a synchronous `getBoundingClientRect` pass in a
   mount `useLayoutEffect`; one `ResizeObserver` per `DeckHud` instance then
   observes the five persistent measurement nodes — never the solver-sized
   shells and never the remounting animated children — for the session
   (font swaps and `data-a11y-text`/`data-a11y-controls` changes arrive as
   size changes, guaranteed by §6.9 token consumption). Observer and any
   timers disconnect on unmount.
5. **Font readiness needs no special path for live placement**: a late font
   swap resizes the measurement boxes, the observer fires, the solve re-runs.
   (The `document.fonts` ceiling logic belongs to the camera-side
   `FocusFitMeasurement` maxima and is untouched.)
6. **Zero/invalid sizes**: all five inputs must be finite and positive before
   the first reveal; a non-positive read leaves/returns the overlay set to
   the hidden-unmeasured state. Measurement state updates are equality-gated
   with `HUD_RECT_EPSILON` tolerance — no update, no re-render, no loop.
7. **No first-frame flash**: nothing is ever painted at an unpositioned
   origin. Every shell stays `visibility: hidden` and unidentified until the
   first solve with complete measurements has produced its rect; layout
   effects run before paint, so the common path reveals correctly positioned
   controls on their first painted frame.
8. **No feedback loop**: solver output feeds only the wrapper boxes
   (`left/top/width/height`); measurement reads the natural-size inner
   content (§6.5), which never depends on placement. The compact/full choice
   cannot oscillate through measurement because both forms are always
   measured, and placement flip-flop is damped by the solver's
   obstacle-clearance hysteresis.

## 8. State-transition table

| # | State | Trigger | Deck HUD behavior |
|---|---|---|---|
| 1 | Enter deck, pre-measurement | `mode='deck'`, `info≠null`, sizes incomplete | Shells mounted hidden, unidentified (no `data-hud`); no solve; nothing painted at a wrong origin |
| 2 | First valid measurement | layout-effect/RO completes all five sizes | If the published frame carries a card rect (live or retained): first solve, reveal positioned controls (entrance animation on inner wrappers). Otherwise enter `no-subject` — measured, hidden, unidentified — until a card arrives (rows 3/6) |
| 3 | Steady state | epsilon-gated publications (bob, parallax) | Re-solve per publication; hint + arrows track the card together |
| 4 | Record swap, `info.busy=true`, card projected | flight out/in with live card | Arrows disabled (existing `busy` rule), still solver-anchored; hint remains placed |
| 5 | Swap, card lost, grace active | `deck.card.retained === true` (≤ 350 ms, sampler-owned) | Subject = retained rect; arrows stay disabled at the retained anchor; no jump |
| 6 | Card null, grace expired/absent | `deck.card === null` | Hint and arrows de-identify and hide (shells persist for measurement; no `[data-hud]` present — observably identical to today's unmount, the AC-8/9-sanctioned gap state); `DeckProjectLink` already absent |
| 7 | Fit degraded | `focus-fit-store` deck `degraded` | Hint de-identified and hidden (both shells keep measuring); arrows keep solver placement **while the layout remains satisfiable** — an unsatisfiable solve takes precedence (row 10). Preserves phase5 AC-7/25, which asserts only hint absence/recovery |
| 8 | Resize while focused | stage size change → `sizeVersion` publication | Same-commit re-solve (subject to the no-solve-without-subject rule below); return rect re-derived arithmetically; settles ≤ 2 frames (plan §9.3) |
| 9 | Compact↔full hysteresis | space frees/tightens across solves | Full→compact when full tiers fail; compact→full only when the full-tier candidate clears every collision obstacle by ≥ `HUD_COLLISION_GAP + HUD_COMPACT_HYSTERESIS` (obstacle clearance only — §5) |
| 10 | Unsatisfiable solve | `status:'unsatisfiable'` with valid subject | Hint + arrows de-identify and hide; one dev-only `console.warn('[deck-hud] …')` per episode; never reachable at supported viewports (P6-AC-13); Escape + DOM catalog remain |
| 11 | Leave deck | mode exits | `DeckHud` unmounts entirely; hysteresis and measurements die with it; sampler clears retention (existing) |
| 12 | Remount / context recovery | rebuild seeds deck landed at rest | Fresh mount → states 1→2→3; no pre-loss geometry or identifiers reused (sampler reset is existing behavior); verified by the new recovery test (P6-AC-23) |
| 13 | Reduced motion | `data-a11y-motion="reduced"` / system | Identical placement path; entrance animation suppressed by the existing global CSS; controls appear immediately at their solved rects |
| 14 | Large text / large controls | `data-a11y-*` attribute change | The persistent measurement boxes resize with their control content (guaranteed by §6.9 token consumption) → RO → re-solve (subject to the no-solve-without-subject rule below), and the solver-sized shells take the new rects on that solve; camera side independently refits via the existing invalidation (untouched) |

**No-solve-without-subject rule (global):** measurement events — fonts,
ResizeObserver reports, stage resizes, and `data-a11y-*` changes — always
update the stored measurements and the derived return-control rect, but the
solver is invoked only while a valid subject rect exists: the published
card (live or retained), or — in development builds only — the §12
`setDeckHudSubjectOverride()` rect while set. Without one, the state
remains (or returns to) `no-subject` with the fresh measurements held; the
first frame that supplies a subject solves against them. Rows 8 and 14
describe the with-subject path.

## 9. Animation and reduced-motion contract

- **Wrapper split (mandatory, per Phase −1):** the outer element per control
  owns position — plain `left`/`top` from the solver rect, **no transform at
  all** (the solver emits top-left coordinates, so the historical centering
  translates are no longer needed). The inner element owns
  `termFadeIn .18s ease-out`. No keyframe ever carries a positioning
  transform.
- Entrance runs once per placement episode — deck entry and each
  non-placed→placed recovery — implemented by remounting the inner animated
  child while the outer shell persists (§7 rule 2); identical cadence to
  today's unmount/remount behavior.
- Solver-driven position updates are instantaneous style updates, never
  animated; no animation may replace or interpolate the solver-owned
  position.
- Reduced motion: the existing global rules (`globals.css:281–292`) disable
  the entrance animation; placement math is identical and layout appears
  immediately. No new per-component motion code is needed, and none is added.

## 10. Accessibility and theme behavior

- Palette, hard corners, and no-drop-shadow rules are untouched — Phase 6
  moves existing styled elements and adds one compact text variant using the
  same tokens.
- Disabled arrows remain mounted, visible (opacity .25), `disabled` on the
  button, `pointer-events` off — unchanged.
- The real interactive arrow boxes are ≥ 44×44 in standard state and
  ≥ `--control-min` (56×56) under large controls: the buttons carry
  `min-width/min-height: var(--control-min)` (§6.9), the wrappers are
  explicitly sized to the solver rects (§6.5), and the solver floor (44) is
  the lower bound — not the only guarantee.
- Keyboard and pointer behavior unchanged: buttons, `aria-label`s
  (`previous record` / `next record`), global Escape handling, and the
  pointer-activation arbiter are untouched.
- The hint remains `pointer-events: none` informational chrome; it may
  disappear only via the solver's exhausted-tiers rule or the existing
  degraded-fit rule (it is explicitly nonessential — plan §7.2).
- Light/dark themes change tokens only; geometry is theme-invariant
  (P6-AC-16). Forced colors, contrast, and reduced transparency act on the
  unchanged visual styles through the existing global precedence; no new
  surface types are introduced.
- Large text / large controls: live measurement makes the solver consume the
  scaled sizes; the 44 px floor and all gaps hold (P6-AC-17).
- Hidden or unplaced controls are never focusable, actionable, or
  identified: `visibility: hidden` removes them from the accessibility tree
  and tab order, the arrow buttons are additionally `disabled`,
  `pointer-events` is off, and `data-hud` is absent (§7 rule 1).
- Source order and DOM semantics are placement-independent: `DeckHud`
  renders its children in a fixed order (hint, previous, next) regardless
  of solved positions — absolute positioning never reorders the DOM, so
  screen-reader and Tab order stay stable across tiers, resizes, and
  record swaps.
- The viewport-fixed ACCESSIBILITY trigger stays above (z 200) and operable;
  §17-D6 records why it is not solver chrome and P6-AC-05's matrix sweep
  asserts the placed deck controls never intersect it in normal mode.

## 11. Failure and degraded behavior

- **Invalid subject** (card null): bounded sampler grace only, then the gap
  state (row 6). Controls never fall back to viewport constants.
- **Degraded camera fit** (`unfittable-at-max`, `invalid-target`, …): hint
  hidden, arrows remain functional at solver placement while the layout is
  satisfiable; recovery restores the hint — byte-compatible with phase5-fit
  AC-7/25 expectations, which assert only hint absence/recovery. Two
  compound outcomes are possible and each is pinned (empirically verified
  in headless Chromium at 1440×900): at phase5's `s: 50` the card's
  projected corners fail §5.2 validity (`stage-projection.ts:159` requires
  every corner valid), the published card is **null**, and the state is
  degraded + `no-subject` — all three controls hide via the no-subject
  rule. A degraded fit whose subject remains a **valid but oversized** rect
  is the unsatisfiable precedence path — the unsatisfiable rule below wins
  and all three controls hide; it is produced deterministically only by
  the dev-only subject override (P6-AC-24).
- **Unsatisfiable layout**: row 10 — de-identify and hide rather than render
  an illegal or unreachable control; single dev-only warning per episode
  (mirrors the `[focus-fit]` pattern); proven unreachable across the
  supported matrix by P6-AC-13. The DOM catalog and Escape remain the
  guaranteed paths.
- **Measurement never completes** (pathological): controls stay hidden;
  identical guarantees as above. No timeout-based guessing.
- **Context loss/restore**: sampler parks/clears (existing); `DeckHud`
  freezes with the last published frame under the inert recovery panel, then
  remounts cleanly (row 12).

## 12. Stable identifiers and bridge constraints

**`data-hud` identifiers that must remain stable (deck-relevant):**
`browse-hint`, `browse-arrow-prev`, `browse-arrow-next`, `return-control`,
`deck-project-link`, `screen-dialog` — plus the untouched remainder of the
§10 registry in `docs/responsive-system.md`. At most one element carries
`browse-hint` at a time, and only while placed (§7 rule 1). No identifier is
added, renamed, or
removed; the registry table in `docs/responsive-system.md` §10 is unchanged.

**Contracts:** no `LayoutContract` or `ContentContract` schema or instance
change. `cockpit-v1` already declares the cockpit stage's protected region
and `/projects` alternative; re-anchoring overlays inside the stage changes
no declared region, adaptation, or viewport case. `validate:contracts`
output is expected to be byte-identical.

**Bridge:** `window.__cockpit*` is preserved byte-for-byte — the pinned
34-name assertion in `phase4-hud.spec.ts` and the legacy getters
(`__getCockpitDeckInfo`, `__getCockpitDeckCardRect`) stay untouched.

**Test instrumentation (additive, dev-only):** three new members on
`__COCKPIT_TEST_HOOKS__`:

```ts
forceDeckFitStatus(degraded: boolean, reason?: FocusFitReason): void
// Dev-only, DECK-ONLY wrapper over the production focus-fit-store's
// setFocusFitStatus('deck', …). Toggles the store's degraded flag WITHOUT
// touching geometry, the camera, the renderer fit cache, or any
// transform, so degraded-HUD behavior can be verified against an
// otherwise legal subject (P6-AC-07's degraded clause). It does not
// replace phase5-fit AC-7/25's `s: 50` scenario, which remains the real
// camera-failure integration test (degraded + no-subject, P6-AC-25).
```

`forceDeckFitStatus` contract: **input** — `degraded` a boolean, `reason`
(required when `degraded` is true) a valid `FocusFitReason`; anything else
throws a `__COCKPIT_TEST_HOOKS__:`-prefixed error and changes nothing (no
partial mutation). The hook is deliberately **deck-only**: Phase 6 needs no
monitor/crate forcing, and the narrower signature keeps the dev mutation
surface minimal (§17-D19). **Observability — store vs fit cache
(critical):** the hook writes the React `focus-fit-store` — the same store
`DeckHud` consumes via `useFocusFitStore()` — and is observed through
`getDeckHudLayout().fitDegraded`/`fitReason` and the effective DOM.
It is **not** observable through `getFocusFit()`: that Phase 5 probe reads
the renderer's separate imperative fit-cache entry
(`registerFocusFitProbe` in `globe-canvas.tsx`) and its semantics are
preserved byte-for-byte — under a forced store status with healthy
geometry, `getFocusFit().status` remains `'fit'`, and the tests assert
exactly that to prove both the geometry-neutrality and the preserved
Phase 5 contract. Real camera failures (P6-AC-25) reach both surfaces
through the production path. **Lifecycle** — the forced status lives in
the production store: it survives solves that hit the fit cache, is
overwritten by the next genuine solve that reports success/failure, is
discarded by the store reset on scene rebuild, and is not tied to DeckHud
mount state. **Clearing** — tests must clear explicitly
(`forceDeckFitStatus(false)`) in `try/finally` and must not rely on
implicit overwrites. **Required by** P6-AC-07 (degraded clause), P6-AC-24,
and P6-AC-26.

```ts
setDeckHudSubjectOverride(rect: Rect | null): void
// Dev-only DeckHud solver-input override in stage CSS pixels. While set,
// DeckHud substitutes this finite rect for the published card as the
// solver subject (it counts as a valid subject under the
// no-solve-without-subject rule and wins over any published card until
// cleared; the probe's `subject` reports it). It touches nothing else:
// sampler, published frames, focus-fit store, camera, fit cache, and
// canonical geometry are unaffected. Purpose: a deterministic, finite,
// oversized subject (e.g. the full safe frame) is the only way to force
// the solver's `unsatisfiable` branch (§6.10 proof) — a real `s: 50`
// failure nulls the card's projection instead (§11), landing in
// `no-subject`.
```

`setDeckHudSubjectOverride` contract: **input** — `null`, or a normalized
stage-coordinate rect with exactly the `{x, y, w, h}` shape, finite `x`/`y`
and finite `w`/`h > 0`; anything else (non-finite values, zero/negative
area, missing or extra fields) throws a `__COCKPIT_TEST_HOOKS__:`-prefixed
error and changes nothing (no partial mutation). **While DeckHud is
unmounted** (`getDeckHudLayout() === null`), calling the setter with a rect
throws a documented `__COCKPIT_TEST_HOOKS__: DeckHud not ready` error and
queues nothing — an override can never arm a future mount; `null` while
unmounted is a no-op. **Output** — `void`; observe through
`getDeckHudLayout()`. **Scope** — the DeckHud solver `subject` input only.
**Lifecycle** — cleared automatically when `DeckHud` unmounts (deck exit,
remount, context rebuild) so stale override state can never leak into a
later session; while set, published-card changes are ignored (the override
wins) and each publication still re-runs the solve against the override.
**Clearing** — `null` restores the published card as subject immediately.
**Required by** P6-AC-24 and P6-AC-26.

`getDeckHudLayout` contract: **input** — none; read-only; never throws on
state (returns `null` when DeckHud is unmounted). **Output** — the effective
placement record below; `hint`/`hintTier` report the **effective** DOM
outcome (a degraded-suppressed hint reports `hint: null`,
`hintTier: 'hidden'`; the cause is distinguished by
`fitDegraded`/`fitReason`, which mirror the focus-fit store entry DeckHud
itself consumes — solver-hidden shows `fitDegraded: false`,
degraded-suppressed shows `fitDegraded: true`). **Lifecycle** — reflects
the current mount only; after remount or context rebuild it reports the
fresh instance and never a pre-loss value. `safeFrame` is deliberately NOT
duplicated here — tests read it from the existing
`getHudSnapshot().safeFrame` under the same-frame handshake (§17-D19).
**Required by** P6-AC-04, 07, 08, 12, 13, 17, 22, 23, 24, 25, and 26.

```ts
getDeckHudLayout(): {
  status: 'placed' | 'unsatisfiable' | 'unmeasured' | 'no-subject'
    // 'no-subject': DeckHud mounted and fully measured, but no subject
    // rect is available — no published card (before the first landing, or
    // after the retained-card grace expires; §7 rule 3, state rows 2/6)
    // and no dev-only subject override set. No solve runs; controls are
    // de-identified and hidden. Distinguishing shape: sizes !== null,
    // while subject, hint, previous, next, both tiers, and compact are all
    // null. 'unmeasured' is reserved for incomplete measurements
    // (sizes === null).
  fitDegraded: boolean            // the focus-fit store's deck entry —
  fitReason: FocusFitReason | null //  the SAME source DeckHud consumes
  arrowTier: 'beside' | 'rail' | 'edge' | null
  hintTier: 'above' | 'below' | 'compact-top' | 'compact-bottom' | 'hidden' | null
  compact: boolean | null
  subject: Rect | null            // solver input actually used
  chrome: readonly Rect[] | null  // null while unmeasured; exactly
                                  // [returnControlRect] once measured
  sizes: { hint: Size; hintCompact: Size; arrow: Size } | null
  hint: Rect | null; previous: Rect | null; next: Rect | null
} | null   // null whenever DeckHud is unmounted: not in deck mode, or
           // deck info absent (`mode !== 'deck' || info === null`)
```

**Probe state × observable field shape (exhaustive over every output
field):**

| Field | `unmeasured` (row 1) | `no-subject` (rows 2/6) | `placed` (rows 3–5, 7–9, 13, 14) | `unsatisfiable` (row 10) |
|---|---|---|---|---|
| `status` | `'unmeasured'` | `'no-subject'` | `'placed'` | `'unsatisfiable'` |
| `sizes` | `null` | non-null | non-null | non-null |
| `chrome` | `null` (return measurement may not exist yet — never fabricated) | `[returnControlRect]` | `[returnControlRect]` | `[returnControlRect]` |
| `subject` | `null` | `null` | non-null (published card or override) | non-null |
| `hint` | `null` | `null` | rect, or `null` iff solver-hidden or degraded-suppressed | `null` |
| `previous`/`next` | `null` | `null` | non-null | `null` |
| `arrowTier` | `null` | `null` | non-null | `null` |
| `hintTier` | `null` | `null` | non-null (`'hidden'` when hint is null) | `null` |
| `compact` | `null` | `null` | non-null | `null` |
| `fitDegraded`/`fitReason` | store value (orthogonal — valid in every mounted state) | store value | store value; `true` suppresses the hint | store value |
| `[data-hud]` present | none | none | arrows always; hint iff `hint` non-null | none |

DeckHud unmounted (not deck mode, or `info === null`, rows 11/12 boundary):
`getDeckHudLayout() === null`. The four `status` values are exhaustive over
mounted conditions — measurement completeness × subject availability ×
solver outcome; `fitDegraded` is an orthogonal boolean that never creates a
fifth status (it only forces `hint: null`/`hintTier: 'hidden'` inside
`placed`), and degraded-hidden vs solver-hidden is distinguished by
`fitDegraded`, never by guessing.

**Test isolation (mandatory):** any test that mutates hook state
(`forceDeckFitStatus`, `setDeckHudSubjectOverride`), authored transforms,
accessibility attributes, theme, or viewport must restore it in
`try/finally` so hook state is reset **even when an assertion fails**; a
later test must never inherit forced status or an override. No further test
hook may be added beyond these three unless no existing observable surface
can enforce a required behavior — any additional hook is a **blocking owner
decision**.

All three members register through the existing dev-only registry pattern
(cf. `registerFreeLookProbe`), behind the same static `NODE_ENV`
`testHooksEnabled` guard as every existing hook, and are never folded into
the production bridge. Phase 6's verification of production absence is
**source-level only** — the same guard pattern, reviewed in the
implementation report; the artifact-level assertion against a production
build remains the enforcement phase's production gate (plan §8 Phase 9,
renumbered from Phase 8 by plan §0.7; the existing ci.yml comment still
says "Phase 8" and is renumbered in the next code-touching turn). Phase 6
must not claim or attempt the artifact gate early.

## 13. File-by-file implementation forecast for Codex

| File | Change | Reason |
|---|---|---|
| `components/cockpit/cockpit-hud.tsx` | Add `DeckHud` (solver-driven hint pair + arrows, measurement ownership §7, shell/measurement-box/keyed-child structure §7, hysteresis §6.7, `RETURN_CONTROL_OFFSET` shared by JSX + rect derivation §6.4, solver-sized wrappers §6.5, dev-only layout probe registration). Deck controls **and the return control** consume `--text-scale`/`--control-min` per §6.9, including its named standard-state accessibility correction (return button ≈28→44 px tall; deck arrows ≈42→44 px wide); `globals.css` is **not** edited (tokens already exist). `FocusFitMeasurement` receives §6.9's **style-only, per-kind-scoped** replica alignment (return replica in every kind; arrow/hint formulas for `kind === 'deck'` only; crate arrow/hint replicas keep their Phase 5 formulas; lifecycle/generations/store untouched). `DeckBrowseArrows` is replaced by `DeckHud` at the deck render site. `BrowseArrows`, `VinylBrowseArrows`, `VinylInfoCard`, `DeckProjectLink`, `ScreenDialog` untouched | The re-anchoring itself + the a11y-size consumption and replica conservatism it depends on |
| `lib/responsive/hud-layout.ts` | Additive `arrowTier`/`hintTier` on `FocusHudPlacedLayout` (§6.6). No constant, priority, or signature change | Tier observability for acceptance tests |
| `components/cockpit/test-hooks.ts` | Additive dev-only `getDeckHudLayout()` (incl. `fitDegraded`/`fitReason` sourced from the focus-fit store and the nullable `chrome`), deck-only `forceDeckFitStatus()`, and `setDeckHudSubjectOverride()` (§12) — all behind the same static `NODE_ENV` guard, with the documented invalid-input/unmounted throws and no-partial-mutation rule, covered by the source-level guard review and P6-AC-26 | Deterministic e2e assertions incl. geometry-neutral degraded forcing (observed via the probe, never `getFocusFit()`) and the finite oversized-subject precedence trigger |
| `tests/unit/hud-layout.test.ts` | Extend existing cases with tier-metadata expectations; add the compact-bottom fallback case and the hysteresis-legality assertion (§15 unit paragraph); identity re-export check unchanged | Pin the amendment + exhaustive deterministic tier coverage (P6-AC-12) |
| `e2e/smoke.spec.ts` | Convert the line-951 `test.fixme` to an executable test, same title, same 1280×720 reproducer shape, strengthened to gap-aware separation (`HUD_SUBJECT_GAP`) and same-frame snapshot handshake | The named pending work becomes the named passing work — not deleted, not weakened |
| `e2e/phase6-deck.spec.ts` | **New**: matrix geometry sweep + lifecycle/accessibility/theme coverage (§15) | Deck acceptance coverage (phase exit) |
| `e2e/phase4-hud.spec.ts` | AC-4: narrow the `deck-record-landed` parity list to `['deck-project-link','screen-dialog']` with a comment citing this design (hint/arrow placement is deliberately superseded; crate/monitor/PC parity untouched). AC-21: rewrite the meta-guard to assert the deck-overlap `test.fixme` is **gone** from `smoke.spec.ts`, the executable smoke test and `e2e/phase6-deck.spec.ts` exist, and `parity.assertions.phase6DeckOverlap` remains `true` as the recorded historical defect flag | The two assertions that explicitly parked on the Phase 6 boundary |
| `e2e/fixtures/phase4-hud-parity.json` | **Unchanged** — it is a recorded pre-rewire artifact with provenance; its deck hint/arrow rows simply stop being asserted | Fixture integrity |
| `.github/workflows/ci.yml` | Add `phase6-deck-1/2` matrix entries (`spec: e2e/phase6-deck.spec.ts`, `timeout: 90`, `timing_scale: 1.5`, `--fully-parallel --shard=k/2`) | CI registration on SwiftShader budgets, mirroring phase5-fit |
| `tests/unit/e2e-runner.test.ts` | Matrix-count expectation `discovered + 5` → `discovered + 6`; add the phase6-deck shard-count assertion alongside the phase5 ones | Keep the sync test truthful |
| `docs/responsive-system.md` | §3.2/§5 "deliberately unwired until Phases 6/7" → deck wired in Phase 6, crate remains Phase 7; §12 phase-status row 6 | Current-state doc duty |
| `CLAUDE.md` | Current-flow deck bullet: hint/arrows solver-anchored to the card with return-control collision | Handoff accuracy |
| `docs/hud-responsive-layout-plan.md` | §8 Phase 6 status marked with the delivery commit at acceptance | Plan bookkeeping (§11) |
| `docs/phase-6-implementation.md` | Implementation report in the Phase 4/5 format at delivery | Workflow record |

All five gates (`lint`, `typecheck:contracts`, `validate:contracts`,
`test:unit`, `test:e2e`) must be green before Codex reports done; the
strict-island rule applies to the `lib/` edit (no `@ts-nocheck`,
`import type`, `noUncheckedIndexedAccess`-clean).

## 14. Numbered P6 acceptance criteria

Steady state = landed record, `busy === false`, `isSettled()`, same-frame
snapshot handshake (`overlaysCommittedFrameId === publishedFrame.frameId`).
Gaps use the shared tokens; "matrix" = the twelve plan §9.1 normal cases.

**Verification conventions (apply to every criterion):** each criterion's
concrete setup and observable assertions are its mapped §15 row(s); the
criterion **fails** when any listed assertion is false or its precondition
cannot be reached. The plan §9.6.2 blank-canvas check is a precondition for
every geometry assertion (a blank frame invalidates the viewport's
results). Every state-mutating test restores hook state, transforms,
accessibility attributes, theme, and viewport in `try/finally` (§12 test
isolation) — cleanup runs even on assertion failure. The §14↔§15 mapping is
bidirectional and complete: every criterion has at least one verification
row, and every row names the criteria it covers. No criterion uses
subjective language; the only subjective judgements in this phase are the
named owner checkpoint reviews in §18, which require capture evidence.

| ID | Criterion |
|---|---|
| P6-AC-01 | Deck hint (any form), when rendered, never intersects the published card rect; separation ≥ `HUD_SUBJECT_GAP`. Matrix-wide |
| P6-AC-02 | Hint and arrows never intersect the measured return-control rect; separation ≥ `HUD_COLLISION_GAP`. Matrix-wide in standard state; also verified in every accessibility size state at the P6-AC-13 representative viewports |
| P6-AC-03 | Arrows never intersect the card; separation ≥ `HUD_SUBJECT_GAP`. Matrix-wide |
| P6-AC-04 | Arrows resolve as a balanced pair on a legal solver tier: `arrowTier ∈ {beside, rail, edge}` from the layout probe, pair boxes identical, same y, and (beside tier) symmetric about the card |
| P6-AC-05 | Every rendered deck-HUD rect lies inside the edge-gutter safe frame; placed controls also do not intersect the ACCESSIBILITY trigger's viewport rect in normal mode |
| P6-AC-06 | Each arrow's **real interactive box** (the button) is ≥ 44×44 CSS px in standard state and ≥ 56×56 under large controls; both outer wrappers render the identical normalized solver rect (§6.5) |
| P6-AC-07 | Record 0 shows a visible disabled previous arrow; the last record a visible disabled next arrow; both remain solver-placed. Under a forced degraded deck fit **status with unchanged geometry** (dev-only `forceDeckFitStatus(true, …)`): probe `fitDegraded === true`, both arrows remain identified, visible, and solver-placed (probe `status: 'placed'` with non-null arrow rects), the non-boundary arrow stays enabled, only the hint hides (`hintTier: 'hidden'`), **and** `getFocusFit().status` stays `'fit'` — proving the store/fit-cache separation and preserving the Phase 5 probe semantics; clearing the forced status restores the hint |
| P6-AC-08 | During a busy swap: arrows disabled; while the retained card grace (≤ 350 ms) is active they hold the retained anchor; when the card is null past grace, hint+arrows de-identify and hide (no `[data-hud]` present) and the probe reports `status: 'no-subject'` with `sizes !== null` (distinguishing it from `unmeasured`) while subject, placement rects, both tiers, and `compact` are null; the hidden shells are unfocusable (programmatic `focus()` on a hidden arrow button does not take focus) and unactionable; at no committed frame do controls sit at the crate-style stage-edge constants (`|arrowLeft − 36| > 4` heuristic preserved) |
| P6-AC-09 | Mode exit clears everything: no deck-HUD element and no retained card after returning to cockpit |
| P6-AC-10 | Resizing an already-focused deck settles to a legal layout within two animation frames of the resize notification |
| P6-AC-11 | The 1280×720 reproducer (converted smoke `test.fixme`) passes: hint separated from the card |
| P6-AC-12 | Hint tiers obey priority (above → below → compact-top → compact-bottom → hidden); compact→full exit requires the full-tier candidate to clear every collision obstacle by ≥ `HUD_COLLISION_GAP + HUD_COMPACT_HYSTERESIS` — the solver's implemented obstacle-clearance hysteresis; safe-frame and subject clearances are not widened; hysteresis never admits an illegal candidate. In the **non-degraded solver path**, `hintTier: 'hidden'` occurs only after every full and compact tier fails; degraded suppression (`fitDegraded: true` forcing `hint: null` with legal tiers still available) is a separate effective-DOM rule covered by P6-AC-07/24 and is distinguished by the probe's `fitDegraded` field, never conflated with solver-hidden. Evidence: exhaustive unit tiers + deterministic override-fixture probe evidence (§15 tier-fixture note) |
| P6-AC-13 | The solver returns `status:'placed'` at every matrix viewport in standard state, and at 1024×600 and 1440×900 in each accessibility size state — large text, large controls, and combined large text + large controls; the unsatisfiable path never renders |
| P6-AC-14 | Under deterministic capture with paused ambient (`configureVisualCapture({ pauseAmbient: true, … })` before scene construction, so card bob/drift cannot move the solved position), deck outer anchors are motionless during entrance: computed position/transform of each `[data-hud]` outer wrapper is identical while the inner `termFadeIn` clock is driven to start/mid/end |
| P6-AC-15 | Reduced motion: no entrance animation; controls appear immediately at solved positions; layout legality unchanged |
| P6-AC-16 | Light and dark themes yield identical deck-HUD geometry with all controls present |
| P6-AC-17 | Large text, large controls, and the combined state re-measure and re-solve (the live controls consume the tokens per §6.9), and each size transition provably reaches the **camera side** in deck view: the focus-measurement replacement generation commits, `getFocusFit().solveCount` increments with `lastSolveCause === 'measurement'`, `status === 'fit'`, and the effective reservations cover the live measured chrome (`safeFrame.y − 16 ≥ returnH + 12`, `safeFrame.x − 16 ≥ arrowW + 16`, bottom inset − 16 ≥ `hintH + 24`, using the probe's measured sizes). P6-AC-01…06 hold in those states at the P6-AC-13 representative viewports |
| P6-AC-18 | A DPR-only change leaves every deck-HUD rect unchanged (≤ `HUD_RECT_EPSILON`) |
| P6-AC-19 | Phase 7-owned crate subject HUD is untouched, except for the explicitly approved shared return-control correction (§6.9): `BrowseArrows`, `VinylBrowseArrows`, `VinylInfoCard`, crate placement, and the crate arrow/hint replica formulas have no behavior change in the diff, and the retained phase4 AC-4 crate fixture rows (which do not assert the return control) stay green |
| P6-AC-20 | The pinned 34-name `window.__cockpit*` bridge is byte-identical; new instrumentation sits behind the same static `NODE_ENV` guard as the existing hooks (source-level verification in the implementation report); the artifact-level production-absence assertion remains Phase 9's gate (plan §0.7 renumbering) and is not claimed here |
| P6-AC-21 | The old Phase 6 `test.fixme` is converted, not deleted or weakened; phase4 AC-21 is updated to guard the executable coverage; `phase4-hud-parity.json` is unmodified |
| P6-AC-22 | Contained mode at **all three** declared pressure viewports — 800×450, 683×325, 512×300: DeckHud solves against the pinned 1024×600 surface; P6-AC-01…06 hold in stage coordinates; controls pan with the surface; each identified control can be brought fully into the visible contained viewport by panning (the pan range from `getPanState().maxX/maxY` covers each control's stage rect, verified with explicit stage→viewport coordinate conversion — never a raw viewport/stage comparison); and the page-level DOM alternative (`AccessibleExperienceLink` / VIEW PROJECTS) remains reachable |
| P6-AC-23 | After a forced context loss and restore in deck view, the rebuilt HUD reaches probe `status:'placed'` with visible, identified controls satisfying P6-AC-01…06; no pre-loss geometry or identifier survives the rebuild |
| P6-AC-24 | Degraded + unsatisfiable precedence is enforced end-to-end with a deterministic finite oversized subject: with `forceDeckFitStatus(true, 'unfittable-at-max')` **and** `setDeckHudSubjectOverride(safeFrame)` set — the safe-frame rect read from `getHudSnapshot().safeFrame` under the same-frame handshake (dev-only actions, not a supported-viewport state — no conflict with P6-AC-13) — the probe reports `status: 'unsatisfiable'` with `fitDegraded === true` and the hint and **both** arrow identifiers are absent (precedence over the degraded arrows-remain rule); clearing only the override returns the probe to `placed` with arrows identified and the hint still degraded-hidden (`fitDegraded === true`, `hintTier: 'hidden'`); clearing the forced status restores the hint. The forced store status is observed via the probe, never via `getFocusFit()` |
| P6-AC-25 | The real `s: 50` camera failure is pinned as the degraded + `no-subject` integration case, observed through the **real renderer probe**: after `setTransform({ s: 50 })`, `getFocusFit().status === 'degraded'` with reason `unfittable-at-max` (the production path also reaches the store, so probe `fitDegraded === true`), the published deck card is null, the probe reports `status: 'no-subject'` with `sizes !== null` and null `subject`/`hint`/`previous`/`next`/tiers/`compact` (the §12 no-subject shape), and all three identifiers are absent; restoring `s: 1.75` returns `getFocusFit()` to `fit`, the probe to `placed`, and the identified controls to legal placement |
| P6-AC-26 | The dev-only hook contracts are executable law: (a) `forceDeckFitStatus` and `setDeckHudSubjectOverride` throw the documented `__COCKPIT_TEST_HOOKS__:`-prefixed errors on malformed input — non-boolean/invalid reason; non-finite coordinates, zero/negative area, missing or extra rect fields — and change no observable state; (b) calling the override setter with a rect while DeckHud is unmounted throws the documented "DeckHud not ready" error and queues nothing; (c) `getDeckHudLayout()` returns `null` while unmounted; (d) a set override is cleared by deck exit/re-entry and by context rebuild (fresh session shows `subject` from the published card); (e) forced status cleared explicitly never leaks into a later test; (f) the unsatisfiable dev warning fires once per episode, a recovery ends the episode, and a later unsatisfiable episode warns once again — development builds only; (g) hysteresis state does not survive exit/re-entry: after a compact prior session, fresh entry with the §15 hysteresis-retention geometry places the **full** hint (`previousCompact` reset); (h) every mutating test in the suite restores hook state in `try/finally` |

## 15. Test and viewport matrix mapped to acceptance criteria

**`e2e/phase6-deck.spec.ts` (new, 2 CI shards, `CI_E2E_TIMING_SCALE 1.5`):**

| Test | Viewports | Covers |
|---|---|---|
| Matrix geometry sweep (one test per plan §9.1 normal case, phase5-fit AC-3 pattern; land record, settle, one snapshot + probe read, full invariant set) | 1024×600, 1024×768, 1280×720, 1280×800, 1366×650, 1366×768, 1440×900, 1512×982, 1920×1080, 2048×1536, 2560×1440, 3440×1440 | P6-AC-01…07, and the standard-state half of 13 |
| Busy-swap and grace observation (AC-8/9 pattern: MutationObserver on `data-hud-frame`, retained/gap frame classification; at a gap frame past grace, read the probe and assert `status: 'no-subject'`, `sizes !== null`, null subject/placement rects/tiers/`compact`, and that a hidden arrow button rejects programmatic focus) | 1440×900 | P6-AC-08 |
| Degraded-fit arrow preservation with an otherwise legal subject: land record 0, then `forceDeckFitStatus(true, 'unfittable-at-max')` in `try/finally` — geometry, camera, and fit cache untouched; assert probe `fitDegraded === true` while `getFocusFit().status` stays `'fit'` (store/fit-cache separation), `[data-hud="browse-hint"]` count 0 while both arrow identifiers stay present and visible, probe `status: 'placed'` with non-null arrow rects, and the next arrow remains enabled; then `forceDeckFitStatus(false)` and assert hint recovery. (The precedence and `s: 50` compound cases are enforced separately by the P6-AC-24/25 rows below; phase5-fit AC-7/25 remains unmodified) | 1440×900 | P6-AC-07 (degraded clause) |
| Exit clearing + re-entry | 1440×900 | P6-AC-09 |
| Resize-while-focused (1440×900 → 1024×600 → 1280×720, two-frame settle via frame meta) | transitions | P6-AC-10 |
| Hint-tier probe evidence via derived override fixtures (tier-fixture note below): land record 0, settle, read measured sizes from the probe and `safeFrame` from `getHudSnapshot()`; in `try/finally` apply the below-forcing fixture and assert `hintTier: 'below'`, then the compact-top-forcing fixture and assert `hintTier: 'compact-top'` + `compact: true`, then the hysteresis fixture (full-tier slack in `(HUD_COLLISION_GAP, HUD_COLLISION_GAP + HUD_COMPACT_HYSTERESIS)`) and assert compact is retained; clear the override and assert the natural full tier returns. No font/viewport luck: every fixture is computed from the probe's own measured sizes | 1440×900 | P6-AC-12 (browser half) |
| Reduced motion entry | 1440×900 | P6-AC-15 |
| Theme flip in deck | 1440×900 | P6-AC-16 |
| Accessibility size states — large text, large controls, and combined large text + large controls, each driven live. Per transition, assert both sides: HUD re-measure/re-solve with the P6-AC-01…06 invariants, **and** the camera-side chain — measurement replacement committed, `getFocusFit()` solve count +1 with cause `measurement`, `status: 'fit'`, and reservations ≥ the probe's measured return/arrow/hint requirements (P6-AC-17's inequalities) | 1024×600, 1440×900 (per state) | P6-AC-17, 02, 06, and the a11y half of 13 |
| DPR-only override (CDP `deviceScaleFactor` 1→2) | 1440×900 | P6-AC-18 |
| Entrance-anchor stability, deck variant — deterministic capture with `pauseAmbient: true` before scene construction, then paused Web-Animations clock driven start/mid/end (smoke Phase −1 technique on a still scene) | 1440×900 | P6-AC-14 |
| Context loss/restore in deck (`WEBGL_lose_context` force-loss + restore, phase4 AC-15/23 technique). Capture element handles for the identified deck controls **before** the loss; after restore assert those handles are disconnected (`isConnected === false`), the published frame is fresh (frameId beyond the parked frame; `deck.card.sourceFrameId === frameId`, `retained !== true` — the existing AC-15/23 pattern), the probe returns `placed`, and the full geometry invariant set holds on the newly identified controls | 1440×900 | P6-AC-23 |
| Degraded + unsatisfiable precedence with a deterministic finite subject: land record 0, settle, read `safeFrame` from `getHudSnapshot().safeFrame` under the same-frame handshake, then in `try/finally`: `forceDeckFitStatus(true, 'unfittable-at-max')` + `setDeckHudSubjectOverride(thatSafeFrameRect)`; assert probe `status: 'unsatisfiable'`, `fitDegraded === true`, and all three identifiers absent. Then `setDeckHudSubjectOverride(null)` and assert the pure-degraded state returns — probe `placed`, arrows identified/visible, hint still hidden with `fitDegraded === true`. Then `forceDeckFitStatus(false)` and assert full recovery. `getFocusFit()` is not consulted for the forced status; geometry, camera, sampler, and fit cache untouched throughout | 1440×900 | P6-AC-24 |
| Real `s: 50` camera failure as the degraded + no-subject integration case (phase5 AC-7/25 technique: land record 0, `completeAuthoredTweakGuard()`, then `__cockpitTurntable.setTransform({ s: 50 })`): assert `getFocusFit().status === 'degraded'` with reason `unfittable-at-max`, `publishedFrame.deck.card === null`, probe `status: 'no-subject'` with `sizes !== null` and the §12 no-subject null-field shape, and all three identifiers absent; then `setTransform({ s: 1.75 })` and assert `getFocusFit()` returns `fit`, the probe returns `placed`, and hint + both arrows are identified and legally placed again. Phase5-fit AC-7/25 itself remains unmodified (it asserts hint absence/recovery only) | 1440×900 | P6-AC-25 |
| Contained-mode deck at each declared pressure viewport: assert the pinned 1024×600 surface, the P6-AC-01…06 invariants in stage coordinates, pan-tracking, control reachability (pan range from `getPanState()` covers each identified control's stage rect, checked via explicit stage→viewport conversion), and the reachable DOM alternative | 800×450, 683×325, 512×300 (executed at all three — no "covered by construction" claim) | P6-AC-22 |
| Hook-contract suite (development-only): drive every P6-AC-26 clause — malformed-input throws with state unchanged before/after (probe snapshot equality), unmounted setter throw, unmounted getter `null`, override cleared by exit/re-entry and by `WEBGL_lose_context` rebuild, forced-status clearing, warn-once-per-episode via console capture across force → recover → force, and the hysteresis-reset re-entry check using the §15 hysteresis-retention fixture; all mutations in `try/finally` | 1440×900 | P6-AC-26 |

**Tier-fixture derivation (deterministic — no font or viewport luck).**
Browser tier evidence uses `setDeckHudSubjectOverride` rects computed at
runtime from the probe's measured sizes (`H_f` = full-hint height, `H_c` =
compact height, `A` = normalized arrow size), `S` = `getHudSnapshot().safeFrame`,
`G_s` = `HUD_SUBJECT_GAP`, `G_c` = `HUD_COLLISION_GAP`. Each fixture must
satisfy documented inequalities that make the intended candidate legal and
every higher-priority candidate illegal, and the test **asserts the
inequalities on the computed rect before asserting the tier**, so a
violated precondition fails loudly rather than passing by accident:

- *Below-forcing*: `X.y − S.y < H_f + G_s` (the above candidate breaks
  safe-frame containment) and `(S.y+S.h) − (X.y+X.h) ≥ H_f + G_s + G_c`
  (below legal), with `X` horizontally centered and narrow enough that the
  beside arrow tier stays legal.
- *Compact-top-forcing*: `H_c + G_s ≤ X.y − S.y < H_f + G_s` (top rail
  admits the compact form but not full-above) and
  `(S.y+S.h) − (X.y+X.h) < H_f + G_s` (below fails), with the beside
  arrows vertically distant from the top rail by > `G_c`.
- *Hysteresis-retention*: from the compact state, an adjusted `X` whose
  full-tier candidate clears its nearest obstacle by a slack in
  `(G_c, G_c + HUD_COMPACT_HYSTERESIS)` — compact must be retained; the
  same geometry with `previousCompact` reset (fresh entry) must place full
  (also reused by P6-AC-26's hysteresis-reset check).

Exhaustive tier coverage lives in the **unit** suite (below); the browser
fixtures corroborate the same solver through the real measurement/probe
pipeline. Compact-bottom and solver-hidden remain unit-only (pure,
deterministic); no browser test depends on a font metric or unsupported
viewport to force a tier.

**Amended/converted existing tests:**

| Test | Covers |
|---|---|
| `smoke.spec.ts` converted reproducer (1280×720) | P6-AC-11 |
| `phase4-hud.spec.ts` AC-4 narrowed deck parity + untouched crate/monitor/PC parity | P6-AC-19 |
| `phase4-hud.spec.ts` AC-21 rewritten meta-guard | P6-AC-21 |
| `phase4-hud.spec.ts` pinned-bridge assertion (existing, unchanged) + source-level static-guard review recorded in the P6 implementation report (artifact-level absence stays Phase 9) | P6-AC-20 |

**Unit (`tests/unit/hud-layout.test.ts`):** tier metadata on existing
fixtures; the exhaustive tier ladder — above priority, below fallback,
compact-top fallback, **compact-bottom fallback (new case)**, hidden only
after both compact rails fail; the hysteresis boundary (already covered)
plus a **new assertion that every hysteresis-accepted candidate passes the
full legality predicate** (hysteresis never preserves illegal geometry) —
P6-AC-04, 12 (pure half).

Regression safety net (must stay green, unmodified): phase5-fit AC-7/25 hint
visibility/degraded behavior, phase5-fit AC-3 fit matrix, phase5-input
suite, smoke Phase −1 crate entrance assertion, foundation/phase2/phase3
suites.

## 16. Risks and mitigations

| Risk | Mitigation |
|---|---|
| SwiftShader cost of a 12-viewport deck sweep | Two CI shards at the proven phase5-fit budget (90 min, scale 1.5); one snapshot per viewport; no per-frame polling loops |
| Hint visibly tracks card bob (new motion for the hint) | Epsilon-gated publication already bounds update rate; bob amplitude is small; reduced motion stills ambient bob; owner reviews feel at the checkpoint |
| Replica-vs-live divergence (camera maxima vs live sizes) | §6.9 aligns the replica styles to the live token formulas per focus kind — identical `calc()` forms and control minimums for deck + the shared return control — so committed maxima are ≥ live sizes in every accessibility state; the §15 accessibility row asserts the camera-side chain directly (measurement commit, solve cause, `fit` status, and the P6-AC-17 reservation inequalities), so a skipped replica update cannot pass |
| Flaky first-frame reveal timing in tests | Reveal is layout-effect-synchronous; tests gate on the existing settle + handshake, not timeouts |
| AC-4/AC-21 amendments accidentally weaken Phase 4 guarantees | Amendments are narrowing/redirection only, with in-file comments citing this design; fixture file untouched; crate/monitor/PC parity intact; Kimi QA verifies the diff |
| Unsatisfiable path ships unnoticed | P6-AC-13 asserts placed across the matrix; dev warning surfaces any episode in every non-production run |
| e2e-runner sync drift | The sync unit test is amended in the same commit; CI enforces it |
| §6.9 token consumption shifts standard-state rendering more than intended | The `calc()` forms are identity at scale 1; the only standard-state deltas are the two named corrections (return button ≈28→44 px tall, deck arrows ≈42→44 px wide), owner-approved in §18 and reviewed in captures; the retained Phase 4 parity rows and the P6 matrix sweep pin everything else in place |

## 17. Decision log (with rejected alternatives)

- **D1 — Solver runs on the published frame, in render.** Rejected: solving
  on every live compute (per-frame) — violates the Phase 4 publication
  contract and re-introduces per-frame React work.
- **D2 — Live-element measurement for placement sizes.** Rejected: reusing
  `FocusFitMeasurement`'s off-screen replicas — replicas duplicate styles
  and drift; live boxes are ground truth, and position-only writes cannot
  create a measurement loop. The camera-side replica system keeps its
  separate job (font-stable maxima) but its sizing **styles** are aligned to
  the live token formulas (§6.9) so the maxima remain ≥ live in every
  accessibility state; its lifecycle and store contract are untouched.
- **D3 — Additive `arrowTier`/`hintTier` solver metadata.** Rejected:
  classifying tiers geometrically inside tests — that re-implements
  placement math as a shadow solver and drifts. Evidence of need: no live
  field exposes tier choice, and the acceptance criteria require it.
- **D4 — Compact hint content `◄ ► browse`.** Rejected: keeping `esc` in the
  compact form (redundant with the always-visible `esc · return` chrome) and
  wrapping the full hint (plan §7.2 forbids wrap outside an explicit compact
  breakpoint).
- **D5 — ScreenDialog is not a collision obstacle.** It is in-scene monitor
  imagery aligned to the 3D screen, not stage chrome; plan §7.2's obstacle
  list (safe frame, subject, return control, info/arrows) governs. The
  current hint can already float over scene imagery by design.
- **D6 — ACCESSIBILITY trigger is not solver chrome.** It is viewport-fixed
  (z 200): in contained mode it does not live in stage coordinates and any
  stage point can pan beneath it, so a static reservation is incoherent; in
  normal mode the camera reservations make beside-tier arrow placement
  succeed far from the bottom-left corner. Verified instead by P6-AC-05's
  matrix assertion; if Phase 9's broader matrix ever fails it, that is a
  deliberate follow-up, not a silent Phase 6 expansion.
- **D7 — Phase 4 AC-4 deck parity narrowed, fixture untouched.** Rejected:
  re-recording the deck fixture rows against Phase 6 output — the fixture's
  provenance is "legacy getters before rewiring"; overwriting it destroys
  its meaning. The hint/arrow rows simply stop being asserted; the new deck
  spec owns deck placement truth.
- **D8 — AC-21 becomes an executable-coverage guard.** Rejected: deleting
  AC-21 — the phase-discipline record should show the boundary was
  discharged, not erased. `phase6DeckOverlap: true` remains as the recorded
  historical defect flag of that baseline.
- **D9 — Unsatisfiable ⇒ de-identify/hide + one dev warning.** Rejected: rendering
  stale last-valid rects (can violate containment after a shrink; renders
  geometry the solver did not approve) and force-placing at stage edges
  (bypasses the collision contract, recreates the crate-style fallback the
  plan bans).
- **D10 — Gap state keeps today's observable absence.** Matches the live
  AC-8/9-sanctioned contract ("controls never jump to stage edges because of
  a one-frame null rect"); the sampler's 350 ms grace is the only bridge.
- **D11 — Return-control rect derived from stage size + measured size +
  one shared offset constant.** Rejected: measuring its position via
  `getBoundingClientRect` each commit — adds ordering/staleness on resize
  for zero benefit; position is deterministic chrome arithmetic.
- **D12 — Both hint forms always mounted; only the active one carries
  `data-hud`.** Rejected: measuring the inactive form with a detached
  replica (drift, D2) or mounting only the active form (compact size unknown
  when needed; duplicate `data-hud` would corrupt the snapshot registry).
- **D13 — New spec file `e2e/phase6-deck.spec.ts` + converted smoke test.**
  Rejected: growing `smoke.spec.ts` into the full deck matrix (smoke stays
  the cross-phase reproducer suite; per-phase suites keep CI shardable and
  the runner-sync test consistent).
- **D14 — No change to `FOCUS_CAMERA_RESERVATIONS` or any shared token.**
  §6.8 shows the existing values already guarantee legal placements; QA
  changing a token means changing the shared token and re-running the
  matrix (plan §3), not forking values.
- **D15 — Live deck controls and the return control consume the a11y size
  tokens (§6.9).** Rejected: keeping today's fixed inline sizes — the
  ResizeObserver would never fire under `data-a11y-text/controls` changes,
  every large-state guarantee would be unverifiable, and the live UI would
  silently diverge from the camera-side replicas that already model 1.25×
  scaling. The `calc()` forms are identity at standard scale; the two
  deliberate standard-state changes are the §6.9 accessibility correction
  (return button ≈ 28→44 px tall, deck arrows ≈ 42→44 px wide), named as a
  blocking owner approval in §18.
- **D16 — Wrappers are solver-sized; measurement reads natural inner
  content; buttons carry `min(var(--control-min))`.** Rejected: writing
  only `left/top` (the real hit box could be smaller than the floored or
  normalized rect, and the pair could render unequal) and stretching the
  button to fill the wrapper (destroys the natural size the measurement
  needs — a measurement/placement feedback loop by another name).
- **D17 — Identifier-on-placement: shells persist, `data-hud` marks only a
  visible, legally placed control.** Rejected: true unmounting (loses
  measurement continuity and re-measures on every gap) and always-identified
  hidden elements (`getHudSnapshot()` collects every `[data-hud]` regardless
  of visibility, so hidden-but-identified shells would corrupt the overlay
  registry and break AC-8/9's absence semantics).
- **D18 — Degraded/precedence testing uses the two dev-only hooks, not
  `setTransform({ s: 50 })`.** Rejected: reusing the phase5 `s: 50`
  scenario for either behavior. Empirically (headless Chromium, 1440×900):
  at `s: 50` the scaled card's projected corners fail §5.2 validity
  (`stage-projection.ts:159` requires every corner valid), so the sampler
  publishes a **null** card — the state is degraded + `no-subject`, never
  `unsatisfiable`, and no finite oversized subject ever reaches the
  solver. Pure degraded-arrow behavior therefore needs the geometry-neutral
  status toggle over a legal subject (P6-AC-07), and the unsatisfiable
  precedence needs a deterministic finite oversized subject that only
  `setDeckHudSubjectOverride()` can produce (P6-AC-24). The phase5
  `s: 50` test is retained unmodified, and the Phase 6 suite pins its
  actual compound outcome — degraded + `no-subject`, all identifiers
  absent, full recovery on `s: 1.75` — as P6-AC-25, because phase5 AC-7/25
  checks hint absence/recovery only.
- **D19 — Forced fit status is observed through the DeckHud probe, never
  `getFocusFit()`; the hook is deck-only.** The live implementation keeps
  two distinct fit surfaces: `getFocusFit()` reads the renderer's
  imperative fit-cache entry via `registerFocusFitProbe`
  (`globe-canvas.tsx`), while DeckHud consumes the React
  `focus-fit-store` via `useFocusFitStore()`. Forcing the store therefore
  cannot and must not move `getFocusFit()` — the probe's new
  `fitDegraded`/`fitReason` fields mirror the store entry DeckHud actually
  uses, and P6-AC-07 asserts `getFocusFit()` stays `'fit'` under forcing,
  pinning the preserved Phase 5 semantics. Rejected: routing the forced
  status into the fit cache (would mutate Phase 5 renderer state and
  falsify the real camera probe) and a three-kind forcing hook (Phase 6
  needs deck only; monitor/crate forcing is unjustified mutation surface —
  widening it later is a new owner decision). Also rejected: duplicating
  `safeFrame` on the probe — `getHudSnapshot().safeFrame` already provides
  it under the same-frame handshake, and duplicate observables drift.

## 18. Owner-review checklist

**Codex implementation cannot begin until every blocking checkbox below is
checked by the owner** (`AGENTS.md` workflow: Claude design → owner
approval → Codex plan/code). The checkpoint reviews further down are
post-implementation gates, not implementation preconditions.

**Blocking design approvals:**

- [ ] Solver-anchored deck hint/arrow behavior (§5), including the hint now
      tracking the card (with bob) instead of sitting at a fixed band.
- [ ] Compact hint microcopy `◄ ► browse` — decide the wording **now**: its
      measured width feeds tier selection, hysteresis, and snapshot
      geometry, so re-wording after implementation is cheap in code but
      re-runs the measurement-dependent deck acceptance suite.
- [ ] The two Phase 4 test amendments (AC-4 deck-row narrowing, AC-21
      rewrite) as the sanctioned discharge of the Phase 6 boundary.
- [ ] The additive solver tier metadata and the three dev-only hooks:
      the `getDeckHudLayout()` probe, the geometry-neutral
      deck-only `forceDeckFitStatus()` degraded-status toggle, and the
      `setDeckHudSubjectOverride()` solver-subject override (§12).
- [ ] The degraded + unsatisfiable **precedence rule** (§7 rule 1, rows
      7/10, §11): it deliberately narrows Phase 5's "essential arrows
      survive a degraded fit" expectation — when a degraded fit coincides
      with a valid-but-oversized subject that makes the layout
      unsatisfiable, all three controls hide rather than render illegally.
      Enforced deterministically via the subject override (P6-AC-24); the
      real `s: 50` failure instead nulls the card's projection and is
      pinned separately as degraded + `no-subject` (P6-AC-25).
- [ ] Live deck controls and the return control consuming the accessibility
      size tokens (§6.9), **including its deliberate standard-state
      accessibility correction**: the shared return-control button grows
      from ≈ 28 px to 44 px tall in monitor/crate/deck, and the deck arrows
      from ≈ 42 px to 44 px wide, meeting the project's preferred 44 px
      target; plus the matching style-only replica alignment in
      `FocusFitMeasurement`.

**Checkpoint reviews — after implementation, before acceptance:**

- [ ] Deck captures (recommended 1440×900, 1280×720, 1024×600 ×
      light/dark) for placement feel; 1280×720 is the original MacBook
      reproducer. Include one large-controls capture, and review the return
      control at its corrected 44 px height in at least one monitor-mode and
      one deck-mode capture.
- [ ] Hint bob-tracking feel at the reference viewport.
- [ ] Confirm the Phase 7-owned crate subject HUD is unchanged — the sole
      approved crate-visible change is the shared return-control 44 px
      correction; `BrowseArrows`, `VinylBrowseArrows`, `VinylInfoCard`,
      crate placement, and the crate replica formulas carry no behavior
      change (Kimi verifies the diff).

## 19. Codex implementation handoff

Recommended commit shape: one reviewable Phase 6 commit (plan §8), sequenced
internally as — (1) solver metadata + unit tests; (2) `DeckHud` +
measurement + §6.9 token consumption + probe; (3) smoke conversion + new
spec (incl. the recovery test); (4) phase4 AC-4/AC-21 amendments + ci.yml +
e2e-runner sync; (5) docs. `app/globals.css` needs no edit — the a11y
tokens already exist; consumption happens in the component styles.
Verification: all five gates fresh (`lint`, `typecheck:contracts`,
`validate:contracts`, `test:unit`, `test:e2e`), then independent Kimi QA per
`AGENTS.md`, then the owner checkpoint. The production-artifact hook-absence
gate stays in Phase 9 (plan §0.7 renumbering) — do not add it here. Return
design ambiguity here
rather than resolving it silently. Do not touch: crate paths,
`focus-fit-store`, camera fit, input policy, `DeckProjectLink`,
`ScreenDialog`, the production bridge, canonical content, approvals, or
`e2e/fixtures/phase4-hud-parity.json`. `FocusFitMeasurement` may change
**only** per §6.9's style alignment — its lifecycle, generations,
font-ceiling logic, and store contract stay untouched. Preserve the
hook-managed `docs/agent-handoff.md` state; never stage or rewrite another
agent's changes.

## 20. Completeness audit (result)

**What PASS means here:** the design **specification** is internally
consistent and enforceable as written — every requirement has a defined
observable and a mapped verification path. It asserts nothing about
unimplemented production behavior; the behaviors themselves are proven only
when Codex's implementation turns these criteria green under the five
gates and independent QA.

| Check | Result |
|---|---|
| No unresolved TBDs | PASS — every decision is concrete; the one subjective item (compact microcopy) is a named blocking owner approval with a recommended value and a stated effect |
| No conflicting constants | PASS — zero new spacing constants; one existing chrome offset extracted to a single shared local (§6.4) |
| No viewport/stage coordinate ambiguity | PASS — §6.1 pins stage padding-box CSS px for every input/output, incl. contained mode |
| No unmeasured overlay used as if measured | PASS — hidden-until-complete gating (§7 rules 1, 6, 7) |
| No initial-origin flash | PASS — §7 rule 7 |
| No ResizeObserver feedback loop | PASS — §7 rule 8 and §6.5 (measurement reads natural content, never the solver-sized wrapper; both hint forms always measured; obstacle-clearance hysteresis damps flip-flop) |
| No independent arrow clamping | PASS — pair resolved atomically by the solver; normalization §6.5 |
| No animation-owned positioning transform | PASS — §9 (outer owns left/top with no transform; inner owns `termFadeIn`) |
| No return-control collision gap | PASS — measured rect is solver chrome with `HUD_COLLISION_GAP` (P6-AC-02) |
| No loss of disabled-arrow visibility | PASS — §10, P6-AC-07 |
| No weakened Phase 6 test | PASS — converted in place and strengthened; AC-21 redirected, not deleted (P6-AC-21) |
| No accidental crate/Phase 7 work | PASS — §4 non-goals, P6-AC-19 |
| No Phase 5 camera/input regression | PASS — camera/input modules untouched; the sole sanctioned exception is §6.9's style-only replica alignment, which restores (never weakens) reservation conservatism and leaves standard-state reservations at the base values; phase5 suites are named regression gates (§15) |
| No production bridge change | PASS — §12, P6-AC-20 |
| No canonical-content change | PASS — §4; compact hint is nonessential presentation microcopy, not a catalog/profile fact |
| No invented facts | PASS — §2 statements verified against live files/lines |
| No owner-only approval authored by Claude | PASS — nothing written to approvals; owner gates listed in §18 |
| Every acceptance criterion maps to verification | PASS — §15 table covers P6-AC-01…26 |
| Hook contracts have executable coverage | PASS — P6-AC-26 + its §15 hook-contract suite row; observability corrected to the store-backed probe (`fitDegraded`), never `getFocusFit()` (D19) |
| Every proposed file change has a stated reason | PASS — §13 |
| Five repository gates in Codex's verification | PASS — §13/§19 |

---

Handoff: Phase 6 design complete in `docs/phase-6-design.md` — deck hint and
arrows move onto the existing `resolveFocusHudLayout()` solver anchored to
the sampler's published card rect, with the measured return control as
chrome, the shell/measurement-box/keyed-child structure with
identifier-on-placement, required accessibility-token consumption by the
live controls (with its named ≈28→44 px return-control and ≈42→44 px arrow
standard-state corrections) plus the matching style-only replica alignment
in `FocusFitMeasurement`, hidden-until-measured reveal, the wrapper-split
entrance contract, a 26-item acceptance suite (incl. context recovery, the
override-driven degraded/unsatisfiable precedence enforcement, the pinned
`s: 50` degraded + no-subject integration case, and the executable
hook-contract suite), and
a file-by-file forecast including the AC-4/AC-21 test-boundary discharges
and CI registration. The re-audit pass added: the §6.10 solver-constraint
proof of the safe-frame override's determinism, full per-hook contracts and
the exhaustive probe state × field-shape table (§12), the mandatory
`try/finally` test-isolation rule, per-criterion verification conventions
(§14), the §20 PASS-meaning clarification, and the roadmap alignment —
Phase 6 stays deck-only, appearance/art-direction is deferred to plan §8
Phase 8, and every enforcement/production-gate reference points at Phase 9.
No production code or tests changed. Next role: **owner approval of §18's
blocking items**, then Codex plan/implementation, then Kimi QA.
