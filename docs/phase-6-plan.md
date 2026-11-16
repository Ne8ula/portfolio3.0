# Phase 6 engineering plan — setup and bounded delivery

Status: setup prepared on 2026-10-09; no Phase 6 implementation, initialized
runner state, product gate results, independent QA, captures, or visual
acceptance is claimed. Authority is `docs/phase-6-design.md`, including all
26 criteria (§14), the complete test mapping (§15), and §18. The owner's
2026-10-09 reply approves all seven design preconditions, D20's two-step
catalog path and roadmap clarification, setup, and local commits. It does
not approve the postimplementation checkpoint or final owner/CI acceptance.

Setup verification **PASSED** after the empty duplicate type-directory
repair and fresh exact gate reruns recorded in §6. Awaiting independent
Kimi setup review, then the orchestrator's setup commit and actual phase
initiation. No missing design decision was found.

> **QA-provider amendment — 2026-10-24 (owner-approved D2/D3,
> `docs/codex-qa-proposal.md` §10).** Every prospective independent QA step
> in §§1 and 5 is now **fresh independent Codex QA**: a new Codex process and
> session (never the engineer's session, never resumed or forked), read-only,
> judging the exact disposable snapshot and fresh trusted-host gate evidence,
> with identity taken from controller launch and CLI telemetry, never model
> self-report (proposal §§2–4, 6). Only the provider changes. Clean
> initialization, the empty index, all five gates, `maxFixAttempts: 3`,
> complete evidence, every owner checkpoint and the approved local-commit
> permissions are unchanged. The Status paragraphs above and §6 are
> historical and preserved verbatim; their Kimi wording authorizes no Kimi
> use. This note neither asserts nor infers that a historical setup review
> or any Kimi PASS occurred. The setup review is not waived: it requires a
> fresh independent Codex reviewer, and these reviewed Phase 6 authority
> amendments fall within the manual bootstrap review scope (proposal §§5,
> 7 step 4). At this date the runner's QA-dispatch migration candidate is
> uncommitted, not activated, governance-blocked and not accepted; Phase 6
> is not initialized. No PASS, checkpoint or acceptance is granted here.

> **Phase 8A note — 2026-10-27 (owner-approved; plan §0.9).** Phase 8A is
> built on a separate isolated base (`docs/phase-8-design.md`) and changes no
> Phase 6 product behavior, criterion or step. Its only test overlap is two
> narrowly described inherited Phase 4 visual assertions in
> `e2e/phase4-hud.spec.ts` (also a Phase 6 commit path), forced by the
> approved starfield removal: the stream-inventory expectation, and the
> unseeded natural-randomness half of AC-13/14 (approved `main` lines
> 869–904) retargeting from the 700-point starfield (`globe-canvas.tsx`
> 237–252) to the 120-point `globe-cities` buffer (889–899). The seeded
> forced-buffer half (860–867) and the immutable fixture stay unchanged. Any
> overlap with Phase 6 paths is reconciled later under separate bounded
> scope, never folded into Phase 6 now; this grants no F2/F3 repair. If 8A is later reconciled into this line
> before Phase 6 captures are taken, those captures may show the reconciled
> 8A scene; the §18 criteria, the 26 acceptance criteria, deck geometry and
> placement rules, all five gates and every owner checkpoint are unchanged.
> Such reconciliation needs its own bounded, owner-requested scope. This note
> weakens no Phase 6 scope and grants no Phase 6 work outside the runner.

## 1. Packages and sequencing

The existing manifest schema and controller state machine remain unchanged;
the 2026-10-24 QA-dispatch migration candidate (above) changes only the
reviewer dispatch and is not yet accepted. `phase-6.json` starts
at `step-1`, with `initiallyAcceptedThrough: null`, no preaccepted QA, and
`maxFixAttempts: 3`. Both packages require exactly these commands:

1. `npm run lint`
2. `npm run typecheck:contracts`
3. `npm run validate:contracts`
4. `npm run test:unit`
5. `npm run test:e2e`

| Runner package | Approved §19 internal sequence | Exit |
| --- | --- | --- |
| Step 1 | Items 1–5 together: solver metadata/unit tests → DeckHud/measurement/accessibility/probe → smoke/new spec/recovery → Phase 4 amendments/CI/sync → documentation and §18 capture preparation | All 26 criteria and five gates complete, fresh independent Codex QA technical PASS, then `awaiting-owner`; `ownerGateAfter: true`, no commit |
| Step 2 | Item 5 delivery verification after §18 owner checkpoint; no new product increment | Verify owner evidence, rerun all five gates, fresh independent Codex QA PASS, controller's single `commitAfterQa`, then `complete-awaiting-owner-ci` |

This groups the internal engineering sequence into one reviewable
implementation commit. No partial package can claim success before the
smoke conversion, Phase 4 boundary discharge, complete coverage, and evidence
preparation agree. Setup is a separate local commit owned by the orchestrator;
Codex never stages or commits. The final delivery message ends exactly with
`Co-Authored-By: Claude Code <noreply@anthropic.com>`.

Before actual initialization, a fresh independent Codex reviewer must review
this setup (not waived; amendment note above) and the orchestrator must commit the reviewed manifest, plan, prompt fix, tests, and
approved design/roadmap changes. The manifest and design source must be
tracked and clean, the index empty, and all eventual commit paths clean.
Preserve the hook-owned handoff and unrelated owner changes. No earlier
manifest/state substitutes for Phase 6. Only the orchestrator later initiates
the reviewed approved runner. This setup runs no phase commands or agents.

## 2. Closed file boundary

Step 1's write boundary and the single final commit boundary are the exact
paths in `step-2.commitAfterQa.paths`; there are no directory prefixes or
wildcards. Inclusion authorizes only the operations below. It does not grant
permission to modify every function in a shared file or to author owner evidence.

| Exact production file | Permitted change |
| --- | --- |
| `lib/responsive/hud-layout.ts` | Add readonly `arrowTier` and `hintTier` output metadata; preserve priorities, constants, signatures, and behavior. Keep strict-island type rules. |
| `components/cockpit/cockpit-hud.tsx` | Replace only DeckBrowseArrows with DeckHud; deck measurement/placement and approved dev probe registration; extract shared return offsets; apply §6.9 tokens to live deck controls/shared return; style-only replica alignment. |
| `components/cockpit/test-hooks.ts` | Exactly the three §12 hooks and their registry/type/validation lifecycle; source-level static `NODE_ENV` guards; no production bridge edits. |

In `FocusFitMeasurement`, the return replica changes for monitor, crate, and
deck because the shared button becomes 44 px tall in standard state. Only
`kind === 'deck'` arrow/hint replicas adopt the deck formulas; crate arrow
and hint formulas stay byte-stable. Lifecycle, generations, font ceiling,
fit cache/store, camera reservations and input remain unchanged. Standard
reservation bases remain unchanged. Deck buttons take 44 px minima and 56 px
under large controls; both hint variants consume text scaling. No globals edit.

| Exact test/configuration file | Permitted change |
| --- | --- |
| `tests/unit/hud-layout.test.ts` | Tier metadata, compact-bottom, hysteresis legality, F3 discriminator; identity re-export assertion unchanged. |
| `e2e/smoke.spec.ts` | Convert the named 1280×720 Phase 6 fixme in place, same title/reproducer, strengthened gap + same-frame assertion. |
| `e2e/phase6-deck.spec.ts` | New complete §15 suite, including all lifecycle/hook and contained cases. |
| `e2e/phase4-hud.spec.ts` | Only AC-4 deck list → `deck-project-link`/`screen-dialog` and AC-21 conversion guard; cite design. |
| `.github/workflows/ci.yml` | `phase6-deck-1/2`, spec `e2e/phase6-deck.spec.ts`, timeout 90, timing_scale 1.5, `--fully-parallel --shard=k/2`; touched production-gate comment renumbered to Phase 9 only. |
| `tests/unit/e2e-runner.test.ts` | `discovered + 5` → `discovered + 6`, two Phase 6 shards assertion. |

| Exact documentation file | Permitted change |
| --- | --- |
| `docs/responsive-system.md` | §3.2/§5 deck-wired versus crate-pending status and §12 Phase 6 status only. |
| `CLAUDE.md` | Current-flow deck bullet and factual current/Next status only. |
| `docs/hud-responsive-layout-plan.md` | Phase 6 status bookkeeping only; keep approval/D20 authority unchanged. No premature delivered/CI-accepted claim. |
| `docs/phase-6-implementation.md` | All AC evidence, actual command results, F3 mutation output, source guard review, fixture integrity, capture index and owner-checkpoint references. |

`DESIGN.md`, `docs/phase-6-design.md`, this plan, the manifest, and all design
requirements/approval records are read-only during delivery. The three
existing documentation files above permit status maintenance, never design
authority amendments. Record the actual delivery SHA at subsequent owner/CI
acceptance; do not invent a self-referential commit SHA before it exists.

Forbidden: canonical catalog/profile, `content/portfolio-approvals.json`,
contract schemas/instances/identifiers, `app/globals.css`, camera fit,
`focus-fit-store`, input/pan code, renderer/sampler changes, dependencies,
production `window.__cockpit*` bridge changes, crate re-anchoring, and older
evidence. `BrowseArrows`, `VinylBrowseArrows`, `VinylInfoCard`,
`DeckProjectLink`, and `ScreenDialog` stay untouched. In particular,
`e2e/fixtures/phase4-hud-parity.json` remains byte-identical, including
`phase6DeckOverlap: true` as its historical defect flag; no fixture refresh.
Phase 5 fit/input tests, smoke Phase −1 crate entrance, foundation/Phase 2/3
suites stay unmodified and green. Phase 7 owns crate HUD, Phase 8 appearance
migration, Phase 9 cross-browser and production-artifact enforcement.

Any discovery that conflicts with these boundaries returns `blocked` to
owner/design before editing, adding a fourth hook, changing microcopy, or
widening the allowlist. A filename match cannot resolve a design conflict.

## 3. Implementation observables and failure proof

DeckHud mounts on deck mode plus non-null info, before the card lands. One
initial synchronous layout-effect read and one ResizeObserver observe the
five persistent natural-size nodes (return, both hints, both arrows).
Solver-sized shells never feed measurement. Only the keyed inner animated
child remounts per placement episode; outer position has no transform.
All inputs must be positive/finite, equality-gated by HUD_RECT_EPSILON.
Hidden shells persist with no data-hud, hidden visibility, aria-hidden,
pointer-events none and disabled buttons. No guessed origin or fallback
constant, new rAF loop, or per-frame React work.

Use only the epsilon-gated published frame and measured sizes. Solve in
memoized render; update previousCompact and increment the per-mount committed
solveCount together in the layout effect. No subject means no solve; retain
fresh measurements. A retained sampler card is valid for its existing
350 ms grace. Degraded with legal geometry hides only the hint; unsatisfiable
wins over degraded and hides all controls. Null projection is no-subject,
not unsatisfiable. Warn once per unsatisfiable episode, development only.

Every geometry assertion first proves a nonblank canvas (§9.6.2), landed
record/busy false and isSettled where applicable, then uses the same-frame
handshake `overlaysCommittedFrameId === publishedFrame.frameId`. Read the
snapshot and effective layout probe together; never mix live projection with
an older DOM commit. DPR is never a placement input. Probe shapes, nullability,
invalid-input errors, no partial mutation, unmounted behavior, and cleanup
must follow the complete §12 table. Restore every mutation in try/finally.

Keep the two safe frames distinct:

- HUD frame: `getHudSnapshot().safeFrame`, edge gutter only, origin (16,16).
  Use for placement, F1/F2/F3 fixtures, and unsatisfiable subject override.
- Camera frame: `getFocusFit().safeFrame`, effective camera reservations.
  Use only for AC-17 reservation evidence, inside the HUD frame. With W/H
  from `getHudSnapshot().liveFrame.stage` and sizes from the deck probe,
  assert top `camera.y - 16 >= returnH + 12`, left
  `camera.x - 16 >= arrowW + 16`, right
  `W - (camera.x + camera.w) - 16 >= arrowW + 16`, bottom
  `H - (camera.y + camera.h) - 16 >= hintH + 24`. Name each failing inequality;
  camera fallback to the HUD frame is a real failure, never exempt it.

Force degraded status through the store-backed probe while proving the
renderer `getFocusFit().status` remains fit. Real s:50 failure must reach
both store and renderer, null the card and produce measured no-subject;
restore s:1.75. The full HUD-safe-frame override produces unsatisfiable;
clear only the override to recover degraded arrows, then clear forced status
for the hint. Source-review all three hooks under the existing static
`testHooksEnabled = process.env.NODE_ENV !== 'production'` registry pattern.
Do not build/run or claim the Phase 9 artifact-absence gate early.

F3 lifecycle proof is mandatory, not a timing approximation:

1. Pin all §15 closed-form fixture formulas and named inequalities from
   current measured sizes; no skips, alternate fixtures, or lucky fonts.
   Unit F3 with previousCompact true must stay compact, false must be above.
2. Prior session ends compact under F2, still overridden at exit. Assert
   unmounted/null; clearing before exit would invalidate the test.
3. Re-enter crate; in one page.evaluate start playRecord(0) un-awaited and
   poll in-page rAF through unmeasured until fresh measured no-subject. In
   the same synchronous task require solveCount === 0, derive F3 from this
   mount's sizes/HUD frame, assert preconditions and arm it. A count > 0
   fails as invalid. No intervening natural solve is permitted.
4. Await landing/settle; require subject ≈ F3, count >= 1, compact false,
   hintTier above. Clear in finally. A natural full solve would erase leaked
   state and make this proof vacuous, so it can never precede F3.
5. During implementation only, temporarily retain previousCompact across
   mounts; run the lifecycle test and record its failure at compact/hintTier,
   not a fixture/timing precondition, in the implementation report. Revert
   the mutation and rerun green before the complete gates and fresh QA.
   Do not leave mutation helpers or add another hook.

## 4. Bidirectional §14 ↔ §15 coverage map

Each row below maps the original §15 verification family to every covered
P6-AC; all 01–26 appear, and every original family is retained. Criteria and
exact fixture preconditions remain in the approved design, not redefined here.

| §15 verification family | P6-AC | Required setup/evidence |
| --- | --- | --- |
| Matrix geometry sweep | 01–07, 13 standard | All 12 normal cases; card/chrome gaps, balanced identical pair, containment, ACCESSIBILITY exclusion, real hit sizes, boundary disabled states, placed |
| Busy-swap/grace | 08 | 1440×900; retained/gap commits; captured persistent button handles cannot focus/activate; measured no-subject field shape; never stage-edge fallback |
| Forced degraded legal geometry | 07 | 1440×900; arrows functional, hint hidden; store degraded versus renderer fit; recovery |
| Exit/re-entry | 09 | 1440×900; no deck HUD or retained card after exit |
| Focused resize | 10 | 1440×900 → 1024×600 → 1280×720; <= two frames after notification |
| Converted smoke reproducer | 11 | Same 1280×720 named test; gap-aware separation and handshake |
| Browser F1 → F2 → F3 tiers | 12 | 1440×900, own measured sizes, named preconditions, below/compact-top/retained compact/full recovery |
| Solver unit tiers/legality/F3 | 04, 12, 26(g) | Above/below/compact-top/compact-bottom/hidden exhaustion; hysteresis legality and true/false discriminator |
| Reduced-motion entry | 15 | 1440×900; no entrance animation, immediate legal placement |
| Theme flip | 16 | 1440×900; identical geometry, controls present in light/dark |
| Accessibility transitions | 17, 02, 06, 13 a11y | 1024×600 and 1440×900 × large text, large controls, combined; 01–06 invariants; replacement generation, camera solve increment/cause measurement, fit, four camera-frame inequalities |
| DPR-only CDP override | 18 | 1440×900, 1→2; rects within epsilon |
| Entrance anchors | 14 | 1440×900; pauseAmbient before scene construction, drive inner animation start/mid/end; outer position/transform constant |
| Context loss/restore | 23 | 1440×900; old handles disconnected, fresh frame/sourceFrameId, non-retained card, placed and 01–06 |
| Degraded + unsatisfiable | 24 | 1440×900; full HUD-safe-frame override, all identifiers absent, staged override/status clearing |
| Real s:50 failure | 25 | 1440×900; renderer degraded/unfittable-at-max, card null, measured no-subject; s:1.75 recovery |
| Contained/pan/reachability/D20 | 22 | All four: 800×450, 683×325, 512×300, 320×568; pinned 1024×600 stage, 01–06, explicit stage→viewport conversion; prev/next/return/project-link reachability; return → cockpit rest → visible Tab-operable header /projects |
| Hook contract suite | 26(a–h) | 1440×900; complete truth tables/state equality, unmounted behavior, rebuild clearing, explicit status cleanup, warning episodes, first-solve F3 plus mutation failure; try/finally |
| Phase 4 AC-4 narrowing | 19 | Deck rows only; retained crate/monitor/PC parity and diff prove crate unchanged except shared return |
| Phase 4 AC-21 rewrite | 21 | Fixme converted, executable smoke and new spec present, historical fixture unchanged |
| Existing bridge check + source guard review | 20 | Pinned 34 names unchanged, static dev guard evidence in report; no production artifact assertion |

Normal matrix: 1024×600, 1024×768, 1280×720, 1280×800, 1366×650,
1366×768, 1440×900, 1512×982, 1920×1080, 2048×1536, 2560×1440,
3440×1440. Contained reachability excludes the informational hint and
in-scene screen-dialog. No persistent catalog link or new identifier is added.

## 5. Postimplementation owner evidence protocol

Reserve `docs/baselines/phase-6-deck/` only; create no report, checkpoint
file, template, or captures during setup. The manifest enumerates every
permitted future evidence file individually:

| Exact basename in that directory | Purpose |
| --- | --- |
| `deck-1440x900-light.png`, `deck-1440x900-dark.png` | Reference placement and standard deck return-height review |
| `deck-1280x720-light.png`, `deck-1280x720-dark.png` | Original MacBook overlap reproducer review |
| `deck-1024x600-light.png`, `deck-1024x600-dark.png` | Supported floor review |
| `deck-1440x900-light-large-controls.png` | Required large-controls capture; controls visibly sized to 56 px minimum |
| `monitor-1440x900-light.png` | Standard monitor shared return at corrected 44 px height |
| `crate-1440x900-light.png`, `crate-1440x900-dark.png` | Evidence for untouched crate subject HUD review, except shared return correction |
| `deck-1440x900-light-bob.webm` | Reference viewport full-motion bob tracking for owner's feel review |
| `capture-index.json` | Provenance, state, geometry, capture hashes, reviewed implementation fingerprint |
| `OWNER-CHECKPOINT-TEMPLATE.md` | Agent-prepared UNFILLED template only, no date/signature/approved checks supplied by agents |
| `OWNER-CHECKPOINT.md` | Owner-authored dated review and decision history; read-only to agents |

This makes §18's recommended six placement captures a required delivery set;
adds only the monitor, large-control, bob, and crate evidence needed for its
three reviews. Do not compare hardware against SwiftShader or modify older
baselines. Record backend identity explicitly; these are Phase 6 placement
and feel evidence, not new hardware performance certification. Still captures
use deterministic capture before construction, asset-ready/settled and
nonblank checks. The bob recording runs with ambient motion enabled at the
reference viewport; a frozen still cannot prove feel.

`capture-index.json` records capture date, base HEAD, sorted SHA-256 file
hashes for all implementation production/test/config paths in §2 (including
new files), and each evidence filename/hash, CSS viewport, theme,
accessibility state, mode/record, browser/OS, rendering backend, DPR,
seed/time/pause configuration or live-motion state. Include standard monitor
and deck measured return heights, large control dimensions, and a crate
comparison note citing the unchanged Phase 4 fixture and the fresh
independent Codex QA diff review.
The owner record binds the SHA-256 of the index, which binds every capture
and implementation file. Report/status prose and the owner record itself
are excluded from the implementation fingerprint to avoid circular hashes;
they must remain truthful and are reviewed by fresh independent Codex QA.

The UNFILLED template may list these required owner fields and empty review
boxes; only the owner creates/fills `OWNER-CHECKPOINT.md`. A fixed filename
with an explicit dated decision supports an exact closed allowlist without
predicting the future review date. Require:

- Owner identity/signature, actual review date (ISO date/time), and provenance
  of the explicit decision; the orchestrator verifies it came from the owner.
- Exact capture-index digest and implementation fingerprint reviewed.
- Explicit decisions for all three §18 reviews: placement captures (including
  large controls and monitor/deck 44 px return), reference bob feel, and
  unchanged crate subject HUD with the approved shared return exception.
- Dated decision history whose latest entry is approved, with all prior
  changes-requested resolved and no placeholders. Setup approval never
  substitutes for any of these decisions.

Step 1's fresh independent Codex QA PASS concerns technical completeness/capture readiness;
the owner record may still be absent. The runner then stops awaiting-owner.
Only after the real owner supplies the dated record and explicit approval may
the orchestrator invoke controller accept and proceed to Step 2. Agents never
sign approvals, accept checkpoints, or treat elapsed time as consent.

The unchanged controller's accept command validates state/QA sequencing, not
owner identity or evidence. These checks are therefore an explicit operator
protocol plus required Codex engineering and fresh independent Codex QA
review, not a new automated validator.
Step 2 must block on absent/stale/ambiguous/rejected evidence even if someone
has already advanced controller state. No delivery claim before that review
and fresh QA. Product/test/capture changes after review invalidate the
fingerprint: block and return to owner/orchestrator for reconciliation,
updated evidence and genuine renewed approval before delivery. Do not patch
past the checkpoint or change controller behavior to bypass it.

The local delivery commit includes the owner-authored record; inclusion is
not permission for Codex to edit it. A valid owner record and local fresh
Codex QA PASS
still are not final CI/release acceptance. Final state remains
complete-awaiting-owner-ci; no push, publication, or release is authorized.

## 6. Setup-only verification

The initial setup prepared only the new manifest, this plan, new
`tests/unit/phase6-manifest.test.ts`, small runner usage/status documentation,
CLAUDE current/Next status, and the explicitly authorized generated-prompt
rule in `scripts/phase-runner/core.ts`. Before Phase 6 the rule preserves the
fixme; Phase 6 requires its approved conversion/Phase 4 amendments/immutable
fixture; later phases preserve completed coverage without reintroducing it.
Codex and Kimi receive the same phase boundary. No state-machine, schema,
gate, CLI, or model changes.

Regression tests call parseManifest/createInitialState/buildCodexPrompt and
buildKimiPrompt in memory, exercise owner-gate transitions with synthetic
results only, pin all five later gates, exact commit paths and attribution,
and reject missing/red gate results. They do not write runner state, launch
agents, or grant real QA/owner acceptance.

Run lint, contract typecheck, contract validation, the full unit suite, and
git diff --check. E2E is unnecessary for this setup-only turn because no
rendered behavior changes; it remains mandatory in both delivery packages.
The final setup Handoff records exact results and requests independent Kimi
setup QA. Setup verification cannot certify the future product or Kimi role.

### Setup verification record — 2026-10-09

#### Historical initial run — before environment repair

| Check | Observed result |
| --- | --- |
| `npm run lint` | PASS, exit 0 |
| `npm run typecheck:contracts` | FAIL, exit 2; eleven TS2688 implicit type-library errors from duplicate directories under `node_modules/@types` |
| `npm run validate:contracts` | PASS, exit 0: 5 layout, 4 content, 5 routes, 6 structurally valid catalog records |
| `npm run test:unit` | PASS, exit 0: 33 files, 403 tests, including 15 new setup regression cases; Vitest reported 1.60 s |
| `git diff --check` | PASS, exit 0 |
| E2E | Not run: setup-only, no rendered changes; both eventual packages still require it |

The eleven missing type-library names are `chai 2`, `deep-eql 2`,
`esrecurse 2`, `estree 2`, `json-schema 2`, `node 2`, `react 2`,
`react-dom 2`, `stats 2.js`, `three 2`, and `webxr 2`. Read-only inspection
confirmed these duplicate directories exist; inspected `node 2` and `chai 2`
are empty and date to September 17. Dependencies were not modified.

Supplemental diagnostic only:
`npm run typecheck:contracts -- --types chai,deep-eql,esrecurse,estree,json-schema,node,react,react-dom,stats.js,three,webxr`
passed (exit 0). It explicitly selects the real installed type libraries;
it did **not** replace or turn green the original failed exact required run.
The unit run also emitted the existing Vite config-loader compatibility
warning about ESM syntax in CommonJS `vitest.config.ts`; no config edit made.

#### Environment repair and fresh setup rerun — 2026-10-09

Before this bounded continuation, the orchestrator reproduced all eleven
TS2688 errors and inspected every named duplicate directory above: each
was empty, nonsymlink, and Git-ignored. It reversibly moved only those eleven
empty directories from `node_modules/@types` into:

```text
/private/tmp/claude-501/-Users-pandora2-Documents-GitHub-portfolio3-0/f06577e2-8ff2-4905-b9fb-667efffc8ad6/scratchpad/empty-types-quarantine
```

No real dependency or version, `package.json`, lockfile, or TypeScript
configuration changed. The orchestrator then actually ran the exact
`npm run typecheck:contracts`, which exited 0. In this continuation, Codex
independently confirmed all eleven quarantined entries remain empty,
nonsymlink directories, their original paths are absent and Git-ignored,
and reran all four exact setup commands without the diagnostic `--types`
override. Temporary files and npm cache were directed into the supplied
scratchpad via `TMPDIR` and `npm_config_cache`.

| Check | Fresh observed result |
| --- | --- |
| `npm run lint` | PASS, exit 0 |
| `npm run typecheck:contracts` | PASS, exit 0; exact required command, no TS2688 errors |
| `npm run validate:contracts` | PASS, exit 0: 5 layout, 4 content, 5 routes, 6 structurally valid catalog records |
| `npm run test:unit` | PASS, exit 0: 33 files, 403 tests; Vitest reported 2.03 s |
| `git diff --check` | PASS, exit 0 |
| E2E | Not applicable to setup-only work; not run, and remains mandatory in both later delivery packages |

The existing Vite config-loader compatibility warning appeared again;
the unit suite passed and no configuration was changed. This continuation
updates only `docs/phase-6-plan.md`, `docs/phase-runner.md`, and `CLAUDE.md`;
existing setup, design, manifest, tests, core, and handoff work is preserved.

Setup verification has passed; the historical typecheck failure is resolved.
Next: independent Kimi setup review, then the orchestrator's local setup
commit and actual Phase 6 initiation. No phase command, agent launch, state
write, staging, commit, capture, or product edit occurred in this continuation.
No product verification, independent QA PASS, or owner visual acceptance
is claimed; postimplementation §18 and final owner/CI acceptance remain open.
