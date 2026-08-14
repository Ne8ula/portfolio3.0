# Automated cross-agent handoff

This is the single rolling communication record for Claude, Codex, and Kimi.
Lifecycle hooks maintain it; do not create a new handoff file after each turn.
Read the newest entry together with the live Git status and diff. Repository
files and test output are authoritative when this summary becomes stale.

Default route:
`Claude design → Codex plan/code → Kimi QA → Codex fixes ↔ Kimi retest`

Hook setup:

- Claude and Codex use the version-controlled project hooks.
- After installing Kimi Code CLI, run
  `npm run agent:handoff:install-kimi` once for its user-level Stop hook.
- Kimi's Stop payload contains a session id rather than its final text; the
  hook exports that local session and records its newest `Handoff:` report.
- Run `npm run agent:handoff` to inspect this record.

## Recent handoffs

<!-- agent-handoff:entry:start -->
### 2026-08-14T22:03:58.381Z · claude

- Branch / HEAD: `main` / `03fca60`
- Worktree snapshot: `57de6282cd0b`
- Session / turn: `d59b67f4-8ee6-415d-97c8-73ee270e4e1e` / `not exposed`
- Model: `not exposed`

#### Final report

> All fourteen items are resolved. Final report.
>
> ---
>
> **Files changed this turn (documentation only):** [docs/phase-6-design.md](docs/phase-6-design.md), [docs/hud-responsive-layout-plan.md](docs/hud-responsive-layout-plan.md), [docs/responsive-system.md](docs/responsive-system.md), [CLAUDE.md](CLAUDE.md) (two stale live status cross-references, net −145 chars). All other worktree modifications (roadmap session, prop removal, hook-managed handoff) preserved untouched.
>
> **Enforceability issues fixed:**
>
> 1. **Forced-status observability** — verified against the live code that `getFocusFit()` reads the renderer's imperative fit-cache (`registerFocusFitProbe`, [globe-canvas.tsx](components/cockpit/globe-canvas.tsx#L1561)) while DeckHud consumes the React `focus-fit-store`. The hook is now deck-only **`forceDeckFitStatus(degraded, reason?)`**, observed exclusively through the probe's new `fitDegraded: boolean` / `fitReason` fields (sourced from the same store DeckHud uses) and the effective DOM. P6-AC-07 now *asserts* `getFocusFit().status` stays `'fit'` under forcing — pinning the preserved Phase 5 semantics. Decision D19 records the store/fit-cache reconciliation and the rejected alternatives (fit-cache mutation; three-kind hook; probe `safeFrame` duplication).
> 2. **Probe schema** — `chrome: readonly Rect[] | null` (null in `unmeasured`, exactly `[returnControlRect]` in every measured state; nothing fabricated); the state table is now a field-by-field matrix over all twelve output fields × the four statuses, with `fitDegraded` documented as an orthogonal flag that never creates a fifth status, and unmounted `null` kept separate.
> 3. **P6-AC-12** — solver-hidden now applies only to the non-degraded path after all full and compact tiers fail; degraded suppression is a separate probe-distinguished rule. The font-luck browser recipe is replaced by derived override fixtures whose inequalities (below-forcing, compact-top-forcing, hysteresis-retention) are computed from the probe's own measured sizes and **asserted as preconditions** before the tier assertion; exhaustive tier coverage (including new compact-bottom and hysteresis-legality cases) moves to the unit suite.
> 4. **P6-AC-24 safe-frame source** — now read from the existing `getHudSnapshot().safeFrame` under the same-frame handshake; the undefined probe field is gone; the §6.10 proof is untouched.
> 5. **P6-AC-26 (new)** — executable hook-contract coverage: malformed-input throws with no partial mutation, the documented unmounted-setter "DeckHud not ready" throw (nothing queued), unmounted getter `null`, override cleared by exit/re-entry and context rebuild, forced-status non-leakage, warn-once-per-episode with post-recovery episodes, the `previousCompact` reset proven via the hysteresis-retention fixture on fresh entry, and mandatory `try/finally`. **Count is now 26**, continuous, bidirectionally mapped, updated in §14/§15/§20 and the handoff.
> 6. **P6-AC-22** — contained-mode verification now executes at **800×450, 683×325, and 512×300**, asserting the pinned surface, stage-coordinate invariants, pan-tracking, pan-range reachability via explicit stage→viewport conversion, and the reachable DOM alternative; the "covered by construction" claim is removed.
> 7. Hidden-shell focusability gained an explicit assertion (AC-08 + row).
>
> **P6-AC-24 / P6-AC-25 remain distinct:** AC-24 = forced store status + safe-frame override → probe `unsatisfiable`, observed via the probe only; AC-25 = real `s: 50` → `getFocusFit()` degraded, null card, probe `no-subject` with the full null-field shape. No passage claims `s: 50` supplies a finite solver subject.
>
> **Phase 8 roadmap repairs:** the closed file set now names exact paths for every live legacy-font reference (repo-wide search verified 12 files; added `incense.ts`, `boot-screen.tsx`, `warp-transition.tsx`, replacing the "boot/warp styling" shorthand) with a satisfiability note for D-TYPE; **D-FX** has an enforceable disposition (implemented-and-verified, or owner-approved omission recorded and acknowledged, never blocking the exit); **performance waivers** are a new owner-blocking obligation 12 with the nine required evidence fields, referenced by obligation 8 and the exit — no informal "accepted tradeoff" path remains.
>
> **Phase-status facts reconciled against Git:** Phase 2 delivered (`685eb67`), Phase 4 delivered (`96fc9c5`), Phase 5 delivered and merged (`03fca60`/`15c53ad`, committed owner checkpoint, two Kimi PASS verdicts, 16-job CI) — corrected in the plan header, the responsive-system §12 table, and CLAUDE.md; the Phase 6 design's §1 worktree note is now labeled as the historical initial snapshot.
>
> **Verification performed:** live reads of the six implementation surfaces; git log/ls-files for phase-delivery evidence; repo-wide sweeps for the old hook name, `covered by construction`, `owner-accepted tradeoff`, legacy font families, Phase 8/9 numbering, count strings, and subjective language — all clean; AC continuity 01–26 confirmed.
>
> **Unresolved owner approvals:** the §18 blocking checkboxes (now including the three-hook set with the deck-only toggle and the precedence narrowing) — implementation cannot begin until the owner checks them; plus Phase 8's future approvals (art direction, D-FX disposition, baselines, any performance waiver). **No production code, tests, canonical content, approval records, or immutable Phase 4/5 evidence changed.**
>
> Handoff: Phase 6 design hardened to implementation-ready pending §18 owner approval — corrected forced-status observability (deck-only `forceDeckFitStatus`, probe `fitDegraded`/`fitReason`, Phase 5 `getFocusFit()` semantics pinned by assertion), truthful probe schema with nullable chrome and an exhaustive field matrix, deterministic tier fixtures replacing font-luck, the `getHudSnapshot().safeFrame` source for AC-24, new AC-26 hook-contract suite (26 criteria), three-viewport contained coverage, and Phase 8 roadmap repairs (exact-path closed set, D-FX disposition, owner-authored performance waiver) plus Git-verified phase statuses across the plan, responsive-system, and CLAUDE.md. Files changed: the four named docs only; concurrent work preserved. Next role: **Codex design review, then owner approval of §18's blocking items**, then Codex implementation and Kimi QA.

#### Git status at handoff

```text
 M CLAUDE.md
 M DESIGN.md
 M components/cockpit/decorations.ts
 M docs/design-visual-migration-handoff.md
 M docs/hud-responsive-layout-plan.md
 M docs/phase-0-handoff.md
 M docs/phase-2-design.md
 M docs/phase-3-design.md
 M docs/phase-4-design.md
 M docs/phase-5-design.md
 M docs/phase-5-implementation.md
 M docs/responsive-system.md
?? docs/phase-6-design.md
```
<!-- agent-handoff:entry:end -->

<!-- agent-handoff:entry:start -->
### 2026-08-14T21:37:34.116Z · claude

- Branch / HEAD: `main` / `03fca60`
- Worktree snapshot: `bde5728371fc`
- Session / turn: `d59b67f4-8ee6-415d-97c8-73ee270e4e1e` / `not exposed`
- Model: `not exposed`

#### Final report

> All checks pass. Final report.
>
> ---
>
> **Files changed by this turn:** [docs/phase-6-design.md](docs/phase-6-design.md) only. The other worktree modifications belong to the parallel roadmap-revision session (plan, DESIGN.md §14, CLAUDE.md, responsive-system.md, phase-doc renumbering notes, design-visual-migration-handoff.md), the owner-driven handheld-prop removal ([decorations.ts](components/cockpit/decorations.ts) + one DESIGN.md table row), and the hook-managed [docs/agent-handoff.md](docs/agent-handoff.md) — all preserved untouched per AGENTS.md.
>
> **Final sequence (verified live in [plan §8](docs/hud-responsive-layout-plan.md)):** Phase 6 — re-anchor deck HUD · Phase 7 — re-anchor crate HUD · Phase 8 — appearance and art-direction migration (new, revision 8/§0.7) · Phase 9 — enforcement, browser matrix, CI, and release verification (renumbered from Phase 8).
>
> **Objective B status:** already applied by the concurrent session before this turn began; I verified rather than redid it. The plan carries §0.7, the full Phase 8 section (bounded file scope, D-MAT/D-LIGHT/D-ENV/D-TYPE/D-FX/D-BASE deliverables, palette/shader/performance constraints, 9 automated + 2 owner-blocking obligations, exit), and Phase 9 renumbering; responsive-system §12 gained rows 8/9; DESIGN.md §14 names the sequence and Phase 8 ownership; CLAUDE.md's roadmap explains the renumbering. Sweep result: every remaining old-numbered "Phase 8" hit is either new-numbering usage, inside a document carrying a renumbering note, or a code comment (`ci.yml`, `test-hooks.ts`, `playwright.config.ts`, two specs) that plan §0.7 assigns to the next code-touching engineering turn — not mine to edit.
>
> **Phase 6 enforceability issues found in the re-audit and resolved:**
> 1. The safe-frame override's unsatisfiability was asserted, not demonstrated → new **§6.10 proof** from the solver's own `contains`/`intersects` inequalities (containment of any positive-area candidate in S implies intersection with subject = S for every gap ≥ 0, so `candidateIsLegal` is false for all three tiers → `{status:'unsatisfiable', failed:'arrows'}` deterministically).
> 2. Hook contracts lacked invalid-input, lifecycle-survival, and clearing rules → per-hook contracts added: `forceFocusFitStatus` (throws on invalid input; store-resident, overwritten by genuine solves, discarded on rebuild; explicit clearing required), `setDeckHudSubjectOverride` (finite normalized rect or null, else throws; DeckHud-solver-subject-only; auto-clears on unmount; wins over the published card until cleared), `getDeckHudLayout` (read-only, effective-placement semantics, never reports pre-loss values) — each with its requiring ACs.
> 3. Probe states lacked a complete observable shape → the exhaustive **state × field-shape table** (four mounted states + unmounted null; "no fifth mounted state").
> 4. Test isolation was implicit → mandatory `try/finally` restoration even on assertion failure, plus the rule that any fourth hook is a blocking owner decision.
> 5. AC quality → §14 verification conventions (setup/observable/failure/cleanup per criterion, blank-canvas precondition, bidirectional §14↔§15 mapping, no subjective language outside named owner checkpoints); P6-AC-25 and its row tightened to assert the full no-subject null-field shape; §5 now states hysteresis can never admit illegal geometry; §20 clarified that PASS means "spec internally enforceable," not proven production behavior.
>
> **P6-AC-24 and P6-AC-25 remain distinct and executable:** AC-24 is the override-driven three-step precedence proof (degraded + safe-frame override → `unsatisfiable`, clear override → `placed` with hint degraded-hidden, clear status → full recovery), grounded by the §6.10 proof; AC-25 independently pins the empirically verified `s: 50` outcome (degraded `unfittable-at-max`, published card null, probe `no-subject` with non-null sizes and the null-field shape, all identifiers absent, full recovery at `s: 1.75`). No passage claims `s: 50` supplies a finite oversized subject.
>
> **Phase 8 bounded scope/exit and baseline governance (verified in the plan):** closed production-file candidate set with design-doc enumeration before implementation; six named deliverables; palette/shader/performance/recovery constraints; exit requires all automated obligations green, owner art-direction approval, and independent QA. Governance: Phase 4 evidence immutable (no `docs/baselines/` path is modified — confirmed via git status); Phase 4 comparisons suspended explicitly during Phase 8; replacement deterministic set under `docs/baselines/phase-8-scorecard/` with the §9.6.5 protocol; owner approves it in a dated checkpoint (artifact defined, left pending — never agent-authored); Phase 9 consumes only that approved set and never fails intentional approved change against Phase 4 imagery.
>
> **Unresolved owner decisions:** the seven §18 blocking checkboxes (solver-anchored behavior, compact microcopy, Phase 4 test amendments, the three dev-only hooks, §6.9 token consumption with the ≈28→44 px / ≈42→44 px corrections, and the degraded+unsatisfiable precedence narrowing) — §18 now states explicitly that Codex implementation cannot begin until all are checked; plus the future Phase 8 approvals listed in the plan. Every P6 criterion has an executable verification path, so the design is implementation-ready **pending only those approvals**.
>
> **Confirmed unchanged:** production code, tests, canonical content, `content/portfolio-approvals.json`, and all immutable Phase 4/5 baseline evidence.
>
> Handoff: Phase 6 design re-audit + roadmap integration complete — `docs/phase-6-design.md` gains the §6.10 unsatisfiability proof, hardened per-hook contracts with the exhaustive probe state-shape table, mandatory test-isolation and per-criterion verification conventions, the §20 PASS clarification, and Phase 8-deferral/Phase 9 alignment; the concurrent session's roadmap restructure (plan §0.7 + Phase 8/9, DESIGN.md, CLAUDE.md, responsive-system.md, historical renumbering notes) verified rather than duplicated. Files changed this turn: `docs/phase-6-design.md` only; all concurrent work and the hook-managed handoff preserved. Unresolved: the §18 blocking owner approvals; code-comment renumbering belongs to the next engineering turn. Next role: owner approval of the revised roadmap and §18's blocking items, then Codex plan/implementation, then Kimi QA.

#### Git status at handoff

```text
 M CLAUDE.md
 M DESIGN.md
 M components/cockpit/decorations.ts
 M docs/design-visual-migration-handoff.md
 M docs/hud-responsive-layout-plan.md
 M docs/phase-0-handoff.md
 M docs/phase-2-design.md
 M docs/phase-3-design.md
 M docs/phase-4-design.md
 M docs/phase-5-design.md
 M docs/phase-5-implementation.md
 M docs/responsive-system.md
?? docs/phase-6-design.md
```
<!-- agent-handoff:entry:end -->

<!-- agent-handoff:entry:start -->
### 2026-08-14T21:27:30.080Z · claude

- Branch / HEAD: `main` / `03fca60`
- Worktree snapshot: `bde5728371fc`
- Session / turn: `07766692-f623-46cd-98d4-c2fe3eeef76d` / `not exposed`
- Model: `not exposed`

#### Final report

> The roadmap revision is complete. Everything requested is in place, and I verified the final state against the live tree.
>
> ## What was done
>
> **The revised sequence** (in [hud-responsive-layout-plan.md §8](docs/hud-responsive-layout-plan.md#L2147-L2459), the authoritative roadmap):
>
> - **Phase 6** — re-anchor deck HUD *(unchanged, not expanded)*
> - **Phase 7** — re-anchor crate HUD *(unchanged, not expanded)*
> - **Phase 8 — appearance and art-direction migration** *(new, ~230 lines)*
> - **Phase 9 — enforcement, browser matrix, CI, and release verification** *(the former Phase 8, renumbered and retitled)*
>
> A new [plan §0.7 "Revision 8"](docs/hud-responsive-layout-plan.md#L200-L233) records the renumbering, and the stale-status header at the top of the plan was corrected to the current delivery reality (Phases −1–4 delivered, Phase 5 in QA, Phase 6 design in owner review, 7–9 not started).
>
> **The new Phase 8 section** is enforceable, not aspirational. It contains: a bounded production-file scope (closed candidate set + the rule that `docs/phase-8-design.md` must enumerate exact files before implementation, amendments recorded); six named deliverables (D-MAT shell materials/wear with the Modal boundary and AX-01 protection, D-LIGHT single studio rig with theme-separation guarantees, D-ENV studio background with camera-transition behavior, D-TYPE typography migration including the deferred `--doc-*` unification review, D-FX optional restrained finishing, D-BASE replacement baselines); the palette rule ("new colors" = tokenized tonal steps within cream/ink/mauve/fog-mist/jade only); an explicit GLSL policy (permitted narrowly for material/background surface response, fail-safe fallback, no per-frame allocation, no cross-browser pixel-identity — tested by blank-canvas/scorecard/error-capture, never pixel diffs); a performance budget (Phase 3 measurement method, ≤15% median frame-time regression as a testable starting threshold); WebGL-unavailable/context-recovery obligations; eleven verification obligations split into nine automated-blocking and two owner-blocking; non-goals/protected contracts; and a full exit list requiring owner art-direction approval and independent QA before Phase 9.
>
> **Baseline governance decision**: Phase 4 evidence stays immutable and remains the regression reference through Phases 5–7. During Phase 8, scorecard comparison against Phase 4 sets is explicitly suspended (documented, never silent) while blank-canvas, error-capture, and all geometry/accessibility suites stay blocking. At Phase 8 exit, a replacement deterministic set is recorded under `docs/baselines/phase-8-scorecard/` with the same §9.6.5 protocol (seeded, frozen clock, backend-separated, hardware capture owner-only), verified for determinism by independent QA, and owner-approved in a dated checkpoint. Phase 9 consumes only that set — the plan's old "use the Phase 4 baselines" bullet, [§9.6.5](docs/hud-responsive-layout-plan.md#L2900-L2913), and [phase-4-design.md](docs/phase-4-design.md)'s "expands, never re-creates" rule were all reconciled so Phase 9 never points at pre-migration imagery.
>
> **[DESIGN.md §14](DESIGN.md#L564-L590)** now names the Phase 6→9 sequence and assigns Phase 8 explicit ownership of material/texture migration, lighting/grounding, environment/background, typography, restrained finishing, and general aesthetic reconciliation — replacing the old "schedule them deliberately" line.
>
> **Cross-references reconciled**: CLAUDE.md (typography/scene-target ownership + the Next roadmap), responsive-system.md (§12 phase table gains rows 8 and 9; two Phase 9 gate references), phase-6-design.md (six enforcement references renumbered, plus a new explicit "no Phase 8 appearance work" non-goal), design-visual-migration-handoff.md (status note; Stage 5 and Stage 7 sequencing marked superseded; Stage 8 renumbered — its §5 gap analysis remains the art-direction input to the Phase 8 design).
>
> **Stale numbering flagged, not rewritten**: [phase-3-design.md](docs/phase-3-design.md#L3-L12) got a note identifying its "Phase 7 appearance migration" wording as stale numbering that never matched the plan; phase-0-handoff, phase-2/4-design got historical renumbering notes; phase-5-design/implementation (active in QA) got renumbering notes plus targeted §10.1/A2 clarifications that change no approved decision.
>
> ## Handoff
>
> **Files changed (mine, all documentation)**: `docs/hud-responsive-layout-plan.md`, `DESIGN.md` (§14 only), `CLAUDE.md`, `docs/responsive-system.md`, `docs/phase-6-design.md`, `docs/design-visual-migration-handoff.md`, `docs/phase-0-handoff.md`, `docs/phase-2-design.md`, `docs/phase-3-design.md`, `docs/phase-4-design.md`, `docs/phase-5-design.md`, `docs/phase-5-implementation.md`. Hook-managed `docs/agent-handoff.md` preserved untouched.
>
> **Verification performed**: repo-wide sweeps for `Phase 7/8/9`, appearance/visual/lighting/typography-migration, and browser-matrix references before and after editing; every remaining old-numbered hit is inside a document carrying a renumbering note; plan heading order and section cross-references verified; each Phase 8 verification obligation maps to a gate, script, capture artifact, or blocking owner approval; Phase 9's baseline consumption confirmed at all four places it's stated.
>
> **⚠️ Concurrent worktree activity — not mine**: while this turn ran, another writer modified [components/cockpit/decorations.ts](components/cockpit/decorations.ts) (−21 lines, removing the handheld console) and the matching DESIGN.md §6 table row ("Plant, handheld, shaker" → "Plant, shaker"). Per AGENTS.md I did not touch or revert it; the DESIGN.md diff therefore contains both that table edit (theirs) and §14 (mine). QA should attribute accordingly.
>
> **Unresolved owner decisions**: none created by this revision itself; Phase 8's blocking owner approvals (final art direction, wear intensity, grain/vignette retention, typography acceptance, replacement baseline set, any performance tradeoff) come due at Phase 8, and the phase-8 design doc still needs authoring when the phase approaches. Two pre-existing notes: CLAUDE.md now exceeds its self-declared 9,000-character budget (it already did before this turn — a future `/update-claude-md` pass should trim it), and code comments (`playwright.config.ts`, `ci.yml`, `test-hooks.ts`, `e2e/smoke.spec.ts`, `e2e/foundation.spec.ts`) still say "Phase 8" for the enforcement phase — plan §0.7 assigns their renumbering to the next code-touching engineering turn.
>
> **No production code, canonical content, approval records, or completed evidence was changed by this turn.** Next role: owner review of the revised roadmap, then the in-flight Phase 5/6 pipeline continues unchanged.

#### Git status at handoff

```text
 M CLAUDE.md
 M DESIGN.md
 M components/cockpit/decorations.ts
 M docs/design-visual-migration-handoff.md
 M docs/hud-responsive-layout-plan.md
 M docs/phase-0-handoff.md
 M docs/phase-2-design.md
 M docs/phase-3-design.md
 M docs/phase-4-design.md
 M docs/phase-5-design.md
 M docs/phase-5-implementation.md
 M docs/responsive-system.md
?? docs/phase-6-design.md
```
<!-- agent-handoff:entry:end -->

<!-- agent-handoff:entry:start -->
### 2026-08-14T21:14:49.062Z · claude

- Branch / HEAD: `main` / `03fca60`
- Worktree snapshot: `387c888f1bc2`
- Session / turn: `a5976f29-fbe2-43f6-95fc-4b752113be3c` / `not exposed`
- Model: `not exposed`

#### Final report

> The edits are done and four of the five gates pass; the Playwright e2e suite is still running in the background (its output arrives when it finishes, since it's piped through `tail`). I'll report the final result when it completes.
>
> **What was removed:**
> - The Switch-style handheld console block in [decorations.ts](components/cockpit/decorations.ts) (the `item('handheld', …)` build at the front gap between crate and turntable), along with its now-unused shared materials `graphite`, `ink`, and `screenDark`, and the bullet in the file's header comment.
> - The `handheld` mention in DESIGN.md's scale-budget table (now "Plant, shaker").
>
> Nothing else referenced the model — no tests, contracts, or bridge consumers target `handheld`; `__cockpitDecor.list()` derives from the items map, so it drops out automatically.
>
> **Gates so far:** lint ✅, typecheck:contracts ✅, validate:contracts ✅, test:unit ✅ (385/385). Awaiting test:e2e.

#### Git status at handoff

```text
 M DESIGN.md
 M components/cockpit/decorations.ts
?? docs/phase-6-design.md
```
<!-- agent-handoff:entry:end -->

<!-- agent-handoff:entry:start -->
### 2026-08-14T21:08:04.805Z · claude

- Branch / HEAD: `main` / `03fca60`
- Worktree snapshot: `65dd97253f09`
- Session / turn: `d59b67f4-8ee6-415d-97c8-73ee270e4e1e` / `not exposed`
- Model: `not exposed`

#### Final report

> The blocker is resolved — the precedence enforcement is rebuilt around a deterministic trigger, and the empirically verified `s: 50` behavior is pinned as its own case. The tree still holds only the design doc plus the preserved hook-managed handoff.
>
> **What changed in [docs/phase-6-design.md](docs/phase-6-design.md):**
>
> - **New third dev-only hook, `setDeckHudSubjectOverride(rect | null)`** (§12): substitutes a finite stage-pixel rect for the published card as the DeckHud solver subject, touching nothing else (sampler, focus-fit store, camera, published frames). The no-solve-without-subject footnote and the probe's `no-subject` definition were amended so the override counts as a valid subject, keeping the state machine coherent.
> - **P6-AC-24 rewritten** as a three-step deterministic precedence proof: `forceFocusFitStatus('deck', true)` + override set to the safe frame → probe `unsatisfiable`, all three identifiers absent; clearing **only the override** → probe `placed` with arrows identified and the hint still degraded-hidden (re-proving the pure degraded rule mid-sequence); clearing the forced status → full recovery. The §15 row implements exactly that sequence.
> - **New P6-AC-25** pins your verified `s: 50` outcome as the degraded + `no-subject` integration case: `getFocusFit()` degraded with `unfittable-at-max`, published card null, probe `no-subject` with `sizes !== null`, all three identifiers absent, and full recovery at `s: 1.75` — with its own §15 row; phase5-fit AC-7/25 remains unmodified.
> - **§11 and D18 corrected**: both now state the verified mechanism — at `s: 50` the card's projected corners fail §5.2 validity ([stage-projection.ts:159](lib/responsive/stage-projection.ts#L159)), so the sampler publishes a null card and no oversized subject ever reaches the solver; the valid-but-oversized subject exists only via the override. The false "fills the safe frame" claim is gone everywhere.
> - **§18 owner approvals updated**: the hooks checkbox now lists all three, and the precedence checkbox describes the narrowing accurately — enforced via the override (P6-AC-24), with `s: 50` pinned separately as `no-subject` (P6-AC-25). Forecast row, guard-paragraph plural, and the 25-item counts were updated to match.
>
> I re-traced the new sequence for fresh enforceability issues before finishing: a safe-frame-sized subject provably defeats every arrow tier (no candidate can clear a subject that spans the containment region), the forced degraded flag survives the sequence because no genuine solve event occurs, and the middle step doubles as a second pure-degraded verification — no new gaps found.
>
> Handoff: Phase 6 design tenth revision — infeasible `s: 50` precedence test replaced by the dev-only `setDeckHudSubjectOverride()` + `forceFocusFitStatus()` deterministic sequence (P6-AC-24), the empirically verified `s: 50` degraded + `no-subject` outcome pinned as P6-AC-25 with published-card-null and probe-shape assertions, §11/D18 corrected to the corner-validity mechanism, and the hooks/approvals/counts propagated (25 ACs, three dev-only hooks). Files changed: `docs/phase-6-design.md` only; hook-managed `docs/agent-handoff.md` preserved. Unresolved risks: unchanged (§16). Next role: owner approval of §18's blocking items, then Codex plan/implementation, then Kimi QA.

#### Git status at handoff

```text
?? docs/phase-6-design.md
```
<!-- agent-handoff:entry:end -->

<!-- agent-handoff:entry:start -->
### 2026-08-14T20:54:13.240Z · claude

- Branch / HEAD: `main` / `03fca60`
- Worktree snapshot: `65dd97253f09`
- Session / turn: `d59b67f4-8ee6-415d-97c8-73ee270e4e1e` / `not exposed`
- Model: `not exposed`

#### Final report

> Both enforceability gaps are closed in [docs/phase-6-design.md](docs/phase-6-design.md); the tree still holds only the design doc plus the preserved hook-managed handoff.
>
> **The compound precedence path is now tested (new P6-AC-24).** The criterion requires the full end-to-end chain: forcing the compound failure via the tuning bridge (`setTransform({ s: 50 })` — noted explicitly as a deliberate authored-transform action, not a supported-viewport state, so it doesn't conflict with P6-AC-13's "never unsatisfiable across the matrix"), then asserting `getFocusFit().status === 'degraded'`, probe `status: 'unsatisfiable'`, and absence of the hint **and both** arrow identifiers; restoring `s: 1.75` must return `getFocusFit()` to `fit`, the probe to `placed`, and the controls to identified, legal placement. Its §15 test row implements this with the phase5 AC-7/25 technique (`completeAuthoredTweakGuard()` first) and states that phase5-fit AC-7/25 itself remains unmodified since it asserts hint absence/recovery only. The now-unsupported "exercises the precedence path" claims were re-pointed: the degraded-arrow row defers the compound case to the P6-AC-24 row, and D18 explains why phase5's test alone cannot enforce the rule.
>
> **The precedence narrowing is a named blocking owner approval.** §18 gains its own checkbox stating that the degraded + unsatisfiable precedence rule (§7 rule 1, rows 7/10, §11) deliberately narrows Phase 5's "essential arrows survive a degraded fit" expectation — in the compound case all three controls hide rather than render illegally — enforced by P6-AC-24. It no longer rides on the general solver-behavior checkbox.
>
> Bookkeeping: the acceptance suite is a continuous P6-AC-01…24, and the audit row and final handoff counts were updated to match.
>
> Handoff: Phase 6 design ninth revision — new P6-AC-24 plus its §15 test row making the degraded + unsatisfiable precedence enforceable end-to-end on the `s: 50` compound scenario (degraded fit status, unsatisfiable probe, all three identifiers absent, full recovery at `s: 1.75`), stale enforcement claims re-pointed to it, D18 expanded with the enforcement rationale, and the precedence narrowing named as its own §18 blocking owner approval. Files changed: `docs/phase-6-design.md` only; hook-managed `docs/agent-handoff.md` preserved. Unresolved risks: unchanged (§16). Next role: owner approval of §18's blocking items, then Codex plan/implementation, then Kimi QA.

#### Git status at handoff

```text
?? docs/phase-6-design.md
```
<!-- agent-handoff:entry:end -->

<!-- agent-handoff:entry:start -->
### 2026-08-14T19:08:07.769Z · claude

- Branch / HEAD: `main` / `03fca60`
- Worktree snapshot: `65dd97253f09`
- Session / turn: `d59b67f4-8ee6-415d-97c8-73ee270e4e1e` / `not exposed`
- Model: `not exposed`

#### Final report

> The feasibility blocker is resolved in [docs/phase-6-design.md](docs/phase-6-design.md); the tree still holds only the design doc plus the preserved hook-managed handoff.
>
> **Precedence defined explicitly.** §7 rule 1's degraded bullet, state row 7, and §11 now all state the same rule: degraded fit hides only the hint *while the layout remains satisfiable*; when the same failure also distorts the subject past any legal arrow placement, the unsatisfiable rule wins and all three controls hide. §11 names the phase5 `s: 50` scenario as exactly that compound case, and row 7 notes phase5 AC-7/25 stays compatible because it asserts only hint absence/recovery.
>
> **Geometry-neutral test hook.** §12 defines the second dev-only member, `forceFocusFitStatus(kind, degraded, reason?)` — a wrapper over the production store's existing `setFocusFitStatus()` that toggles the degraded flag without touching geometry, camera, fit cache, or any transform. Its semantics are pinned: the forced status persists until the next genuine solve event, tests clear it by calling the hook again, and it explicitly does not replace phase5's `s: 50` integration test. The guard paragraph now covers both members.
>
> **Test rewritten.** P6-AC-07's degraded clause and its §15 row now use the hook against an otherwise legal subject: land record 0, force `unfittable-at-max`, assert hint count 0 + both arrow identifiers present/visible + probe `placed` with non-null arrow rects + next arrow enabled, then clear and assert hint recovery — with an in-row note that phase5-fit AC-7/25's `s: 50` run is retained unmodified as the real camera-failure case, which under this design exercises the unsatisfiable precedence path.
>
> **Forecast and approvals updated.** The `test-hooks.ts` forecast row lists both hooks under the same static guard and source-level review; the §18 blocking owner approval now names both; and new decision D18 records why `s: 50` was rejected for arrow-preservation testing (the scaled card's published corners fill the safe frame under the retained camera distance, so `unsatisfiable` is the *correct* solver answer there).
>
> Handoff: Phase 6 design eighth revision — degraded/unsatisfiable precedence made explicit across §7/§8/§11, the infeasible `s: 50` degraded-arrow test replaced by the geometry-neutral dev-only `forceFocusFitStatus()` hook with a rewritten P6-AC-07 clause and §15 row, phase5's `s: 50` test retained as the compound integration case, and the hook propagated through §12, the forecast, §18's blocking approvals, and decision D18. Files changed: `docs/phase-6-design.md` only; hook-managed `docs/agent-handoff.md` preserved. Unresolved risks: unchanged (§16). Next role: owner approval of §18's blocking items, then Codex plan/implementation, then Kimi QA.

#### Git status at handoff

```text
?? docs/phase-6-design.md
```
<!-- agent-handoff:entry:end -->

<!-- agent-handoff:entry:start -->
### 2026-08-14T19:00:49.268Z · claude

- Branch / HEAD: `main` / `03fca60`
- Worktree snapshot: `65dd97253f09`
- Session / turn: `d59b67f4-8ee6-415d-97c8-73ee270e4e1e` / `not exposed`
- Model: `not exposed`

#### Final report

> Both lifecycle issues and the clarification are resolved in [docs/phase-6-design.md](docs/phase-6-design.md); the tree still holds only the design doc plus the preserved hook-managed handoff.
>
> **§7 rule 1 is now per-control.** Hiding is decided by whether *that control* is placed: all three controls hide only in the states where nothing is placed (pre-measurement, `no-subject`, unsatisfiable), while degraded camera fit hides **only the hint shells** — the arrows stay identified, visible, and solver-placed, following only the normal busy/boundary disabled rules, never a blanket disable. The rule explicitly cites state row 7, §11, and Phase 5's essential-controls requirement, and the defensive `disabled` now applies only to a hidden shell's own button.
>
> **Degraded-arrow preservation is enforced.** P6-AC-07 gains a degraded clause — under a forced degraded deck fit, both arrows remain identified, visible, and solver-placed (probe `status: 'placed'` with non-null arrow rects), the non-boundary arrow stays enabled, and only the hint hides. A dedicated §15 test row implements it with the proven phase5 AC-7/25 technique (`completeAuthoredTweakGuard()`, `setTransform({ s: 50 })` to force `unfittable-at-max`, assert hint count 0 + arrow presence/enablement + probe shape, then restore and assert recovery).
>
> **Global no-solve-without-subject rule.** A footnote after the state table now states that measurement events — fonts, ResizeObserver reports, stage resizes, `data-a11y-*` changes — always update stored measurements and the derived return-control rect, but the solver runs only while the published frame carries a valid card rect (live or retained); otherwise the state remains or returns to `no-subject` holding the fresh measurements, and the first subject-bearing frame solves against them. Rows 8 and 14 now reference the rule explicitly as the with-subject path.
>
> Handoff: Phase 6 design seventh revision — per-control hiding semantics in §7 rule 1 (degraded fit hides only hint shells; arrows keep placement and normal disabled rules), executable degraded-arrow coverage via P6-AC-07's new clause and a dedicated forced-degradation test row, and the global no-solve-without-subject rule governing font/resize/accessibility measurement events. Files changed: `docs/phase-6-design.md` only; hook-managed `docs/agent-handoff.md` preserved. Unresolved risks: unchanged (§16). Next role: owner approval of §18's blocking items, then Codex plan/implementation, then Kimi QA.

#### Git status at handoff

```text
?? docs/phase-6-design.md
```
<!-- agent-handoff:entry:end -->

<!-- agent-handoff:entry:start -->
### 2026-08-14T18:56:37.862Z · claude

- Branch / HEAD: `main` / `03fca60`
- Worktree snapshot: `65dd97253f09`
- Session / turn: `d59b67f4-8ee6-415d-97c8-73ee270e4e1e` / `not exposed`
- Model: `not exposed`

#### Final report

> The `no-subject` state is now fully propagated through [docs/phase-6-design.md](docs/phase-6-design.md); the tree still holds only the design doc plus the preserved hook-managed handoff.
>
> Three coordinated edits:
>
> - **State row 2 is now conditional:** if the published frame carries a card rect (live or retained), the first valid measurement solves and reveals; otherwise the HUD enters `no-subject` — measured, hidden, unidentified — until a card arrives, cross-referencing rows 3/6. This removes the contradiction with the probe contract's "measurement may complete before a card exists."
> - **The probe contract now defines the distinguishing shape:** `'no-subject'` means `sizes !== null` while `subject`, `hint`, `previous`, `next`, both tiers, **and `compact`** are all null (the previously omitted `compact` is included); `'unmeasured'` is explicitly reserved for `sizes === null`. The comment also now cites state rows 2/6.
> - **The state is tested:** P6-AC-08 requires the probe to report `status: 'no-subject'` with `sizes !== null` and the full null-field shape at gap frames past grace, and the mapped busy-swap test row in §15 spells out that assertion (read the probe at a gap frame past grace; assert status, non-null sizes, and null subject/placement rects/tiers/`compact`).
>
> I also re-checked the surrounding contracts for knock-on effects: §7 rule 7 (reveal only after a solve) and the §11 failure bullets remain consistent with the conditional row 2, since a solve still presupposes a card.
>
> Handoff: Phase 6 design sixth revision — the `no-subject` probe state propagated end-to-end: conditional first-measurement behavior in state row 2, a distinguishing-shape definition in the probe contract (`sizes !== null`, all placement fields including `compact` null), and executable coverage via the strengthened P6-AC-08 and its mapped busy-swap test. Files changed: `docs/phase-6-design.md` only; hook-managed `docs/agent-handoff.md` preserved. Unresolved risks: unchanged (§16). Next role: owner approval of §18's blocking items, then Codex plan/implementation, then Kimi QA.

#### Git status at handoff

```text
?? docs/phase-6-design.md
```
<!-- agent-handoff:entry:end -->
