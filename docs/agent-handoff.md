# Automated cross-agent handoff

This is the single rolling communication record for the Astra orchestrator,
Claude design, Codex engineering, and Kimi QA. Client and model are recorded
separately; a Claude Code session can run Astra through Model Gateway.
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
### 2026-09-18T00:48:11.462Z · Codex

- Branch / HEAD: `main` / `f49804a`
- Worktree snapshot: `ea8b253c2c6e`
- Session / turn: `not exposed` / `not exposed`
- Client: Codex
- Model: `not exposed`

#### Final report

> Handoff: Implemented community Model Gateway setup for Astra orchestration in Claude Code. Installed project plugin 0.51.2 and checksum-verified proxy 0.1.40; ChatGPT authorized in macOS Keychain; renewed Kimi login. Added portfolio-orchestrator (Astra) and portfolio-design (native Opus), project marketplace/plugin declaration, local gateway endpoint and default agent, role guidance, setup/recovery/verification guide, and client/model handoff attribution with bounded transcript metadata parsing.
> Files changed: .claude/settings.json, .claude/settings.local.json, .claude/agents/portfolio-orchestrator.md, .claude/agents/portfolio-design.md, AGENTS.md, CLAUDE.md, docs/astra-orchestration.md, scripts/agent-handoff.mjs, tests/unit/agent-handoff.test.ts, and this rolling handoff. Preserved pre-existing package.json/package-lock.json changes.
> Verification: Gateway doctor healthy; route metadata confirmed gpt-6-astra on Codex backend and claude-opus-5 on Anthropic. Fresh Astra Read/delegation smoke returned ASTRA_ORCHESTRATION_READY. A separate fresh CLI without model/agent overrides returned DEFAULT_ORCHESTRATOR_READY with Astra selected. Codex and Kimi live probes passed. Phase 5 snapshot doctor passed after settings writes stopped. Agent definitions and JSON valid; lint, contract typecheck/validation, 388 unit tests passed. Independent Kimi QA reran tooling gates and reported PASS, no blocking findings; report preserved below. E2E not run because no rendered application changes.
> Unresolved: community integration is unsupported by Anthropic; first interactive launch may require the normal workspace trust dialog. CLAUDE.md has a pre-existing length overrun. Local settings are already tracked, so machine-local endpoint/model defaults appear in the diff; no credentials added. Phase 5 remains complete-awaiting-owner-ci; no Phase 6 manifest or phase execution was introduced. Two automatic-review egress rejections were resolved by the owner's explicit approvals; no approval block remains.
> Next role: owner starts a fresh Claude Code CLI in this repo (claude or claude --agent portfolio-orchestrator); owner/CI retains phase acceptance.

#### Git status at handoff

```text
 M .claude/settings.json
 M .claude/settings.local.json
 M AGENTS.md
 M CLAUDE.md
 M package-lock.json
 M package.json
 M scripts/agent-handoff.mjs
?? .claude/agents/portfolio-design.md
?? .claude/agents/portfolio-orchestrator.md
?? docs/astra-orchestration.md
?? tests/unit/agent-handoff.test.ts
```
<!-- agent-handoff:entry:end -->

<!-- agent-handoff:entry:start -->
### 2026-09-17T21:04:16.788Z · Kimi Code

- Branch / HEAD: `main` / `f49804a`
- Worktree snapshot: `ea8b253c2c6e`
- Session / turn: `not exposed` / `not exposed`
- Client: Kimi Code
- Model: `not exposed`

#### Final report

> Handoff: Independent Kimi QA of Astra orchestration setup.
>
> ## QA Review — Astra orchestration setup (agent tooling scope)
>
> **Scope reviewed:** `AGENTS.md`, `CLAUDE.md`, `.claude/agents/portfolio-orchestrator.md`, `.claude/agents/portfolio-design.md`, `.claude/settings.json`, `.claude/settings.local.json`, `docs/astra-orchestration.md`, `scripts/agent-handoff.mjs`, `tests/unit/agent-handoff.test.ts`. The `package.json`/`package-lock.json` Next bump was excluded per the brief. `docs/agent-handoff.md` is the hook-maintained rolling record, not a judged artifact.
>
> ### Findings
>
> **Minor (pre-existing, not introduced by this diff)**
> - `CLAUDE.md` header claims "≤9,000 characters" but the file is 10,587 bytes (10,383 before this change — the diff adds ~204). The budget was already exceeded; this change does not fix or worsen it materially. No action required for this scope; flag for a future docs pass.
>
> **Observations (non-blocking)**
> - `.claude/settings.local.json` adds an `"agent": "portfolio-orchestrator"` key. I could not verify in this disposable environment whether Claude Code honors it as a default-agent selector; `docs/astra-orchestration.md:20` documents the explicit `claude --agent portfolio-orchestrator` launch as the primary path, so nothing functionally depends on the key. The env block contains only a loopback base URL, model aliases, and feature flags — no credentials — consistent with the doc's warning at `docs/astra-orchestration.md:75-79`.
>
> No major or blocking findings.
>
> ### Consistency against the brief
>
> - **Role separation holds.** `AGENTS.md:23-42` adds Astra-as-orchestrator without displacing the specialist defaults: Claude designs, Codex implements, Kimi reviews independently, owner/CI accepts. The doc explicitly separates client, model, and role, matching `CLAUDE.md:1-7`.
> - **One writer enforced.** The orchestrator agent definition (`.claude/agents/portfolio-orchestrator.md:5`) grants no Write/Edit and delegates only to `portfolio-design`; the design agent has no Bash and may write only on an assigned writing turn (`portfolio-design.md:18-20`). Engineering/QA stay with the phase runner, not Claude subagents.
> - **Phase boundaries respected.** Orchestrator and doc both prohibit running/init-ing phases to test setup, switching to an earlier manifest, and starting Phase 6 without an approved manifest (`astra-orchestration.md:42-49`). No phase mutation commands were run in this review.
> - **Handoff attribution is sound.** `exposedModel` (`scripts/agent-handoff.mjs:269-307`) prefers an explicit payload model, falls back to a bounded 256KB tail of the local transcript for Claude only, regex-validates model IDs, reads only `type:"assistant"` `message.model` metadata, and never records message text. The three new unit tests cover model-switch attribution, transcript unavailability, and malformed/forged metadata; the payload's `transcript_path` is a standard Claude Code Stop-hook field and the hook at `.claude/settings.json:36-48` invokes `capture --agent claude` correctly.
>
> ### Verification evidence
>
> - `npm run lint` — clean
> - `npm run typecheck:contracts` — clean
> - `npm run validate:contracts` — ✓ 5 layout, 4 content, 5 routes, 6 catalog records
> - `npm run test:unit` — 388/388 passed across 32 files, including the 3 new handoff attribution tests (matches the record's claim in `docs/astra-orchestration.md:150`)
> - `claude plugin validate .claude/agents` — validation passed
> - Both settings files parse as valid JSON
> - Live probe evidence in `docs/astra-orchestration.md:132-153` (gateway doctor, fresh CLI smoke with `ASTRA_ORCHESTRATION_READY`, independent Codex/Kimi markers, Phase 5 doctor) is consistent with the wiring reviewed; I did not re-run gateway or phase commands and do not treat the record as proof of runtime behavior.
>
> Browser E2E not run, per the brief's explicit scoping for this agent-tooling-only change.
>
> **Handoff:** Completed independent QA of the Astra orchestration setup (AGENTS.md/CLAUDE.md diffs, both agent definitions, both settings files, `docs/astra-orchestration.md`, `scripts/agent-handoff.mjs`, `tests/unit/agent-handoff.test.ts`). All four required gates green; plugin validation and JSON validity confirmed; one pre-existing CLAUDE.md length-budget nit, zero blocking findings. Files changed by this QA: none (read-only). Unresolved: nothing blocking; optional future CLAUDE.md budget trim. Next role: owner/CI acceptance — not claimed here.
>
> **Verdict: PASS** (tooling scope only; no owner/CI acceptance asserted)

#### Git status at handoff

```text
 M .claude/settings.json
 M .claude/settings.local.json
 M AGENTS.md
 M CLAUDE.md
 M package-lock.json
 M package.json
 M scripts/agent-handoff.mjs
?? .claude/agents/portfolio-design.md
?? .claude/agents/portfolio-orchestrator.md
?? docs/astra-orchestration.md
?? tests/unit/agent-handoff.test.ts
```
<!-- agent-handoff:entry:end -->

<!-- agent-handoff:entry:start -->
### 2026-09-17T20:48:52.819Z · Claude Code

- Branch / HEAD: `main` / `f49804a`
- Worktree snapshot: `ea8b253c2c6e`
- Session / turn: `35639bca-a04d-4418-8de6-e5fb36290ae1` / `not exposed`
- Client: Claude Code
- Model: `claude-gpt-6-astra`

#### Final report

> ASTRA_ORCHESTRATION_READY
>
> `portfolio-design` returned the palette rule: 60% neutrals, 30% material jade, 10% signal jade; jade is the sole chromatic family.
>
> Single-writer rule: only one agent may write a shared worktree at a time; read-only analysis may overlap, but design writing and Codex implementation must not.

#### Git status at handoff

```text
 M .claude/settings.json
 M .claude/settings.local.json
 M AGENTS.md
 M CLAUDE.md
 M package-lock.json
 M package.json
 M scripts/agent-handoff.mjs
?? .claude/agents/portfolio-design.md
?? .claude/agents/portfolio-orchestrator.md
?? docs/astra-orchestration.md
?? tests/unit/agent-handoff.test.ts
```
<!-- agent-handoff:entry:end -->

<!-- agent-handoff:entry:start -->
### 2026-09-17T20:44:28.637Z · kimi

- Branch / HEAD: `main` / `f49804a`
- Worktree snapshot: `6c59b1b99d23`
- Session / turn: `session_d106764d-f9c9-46ac-99dc-76473375b282` / `not exposed`
- Client: Kimi Code
- Model: `not exposed`

#### Final report

> The client hook did not expose the final assistant report. Inspect the Git status below and the originating session before accepting the handoff.

#### Git status at handoff

```text
 M .claude/settings.json
 M AGENTS.md
 M CLAUDE.md
 M package-lock.json
 M package.json
 M scripts/agent-handoff.mjs
?? .claude/agents/portfolio-design.md
?? .claude/agents/portfolio-orchestrator.md
?? tests/unit/agent-handoff.test.ts
```
<!-- agent-handoff:entry:end -->

<!-- agent-handoff:entry:start -->
### 2026-09-10T21:12:19.560Z · claude

- Branch / HEAD: `main` / `f7ec5b8`
- Worktree snapshot: `a965e5fca03a`
- Session / turn: `fb20bfdd-3c4d-49e2-8b58-048398b63dd8` / `not exposed`
- Model: `not exposed`

#### Final report

> Both findings are addressed in [phase-6-design.md](docs/phase-6-design.md). Only that file changed, plus one memory note. `DESIGN.md` was already modified before this session and is untouched.
>
> **Finding 1, hysteresis reset.** I reproduced your masking sequence against the real solver at 1440×900 with representative deck sizes. Leaked `true` → natural card → `compact: false` → F3 → full. F3 solved first discriminates cleanly: `true` gives compact, `false` gives the full `above` tier. The fix has four parts.
>
> - **F3 lifecycle sequence** in §15 ([phase-6-design.md:1076](docs/phase-6-design.md#L1076)) replaces the natural-first check. The prior session must end compact with the F2 override still active at exit, since clearing it first would re-solve the card to full and reset the state under test. Re-entry starts `playRecord(0)` un-awaited and, in one in-page task, waits for the fresh instance at `no-subject`, requires `solveCount === 0`, computes F3 from that instance's own sizes, and arms the override. The read and the arm share one task so no React commit can interleave, and the override wins over the landing card from that instant.
> - **Per-mount `solveCount`** is added to the `getDeckHudLayout()` probe ([phase-6-design.md:849](docs/phase-6-design.md#L849)). It increments in the same layout effect that writes `previousCompact`, so zero means the hysteresis state is untouched since mount. It is a field on the approved probe, not a fourth hook. A nonzero count at arm time fails the test as invalid rather than passing it.
> - **Mutation check** is required in P6-AC-26(g) and the §13/§19 report row: Codex temporarily retains `previousCompact` across mounts, confirms the test fails at the tier assertion, reverts, and records the output in the implementation report.
> - **Unit discriminator** in `tests/unit/hud-layout.test.ts` pins that F3 yields compact under `true` and full under `false`, so the browser verdict depends only on the reset.
>
> **Finding 2, AC-17 safe-frame source.** §6.1 now has a two-safe-frame table ([phase-6-design.md:249](docs/phase-6-design.md#L249)). The HUD frame from `getHudSnapshot()` stays edge-gutter-only for placement tests and fixtures. P6-AC-17 ([phase-6-design.md:988](docs/phase-6-design.md#L988)) names `cameraSafeFrame = getFocusFit().safeFrame`, takes the stage size from `getHudSnapshot().liveFrame.stage`, and writes all four inequalities, with bottom as `(H − (y + h)) − 16 ≥ hintH + 24` and right symmetric. It adds a containment precondition against the HUD frame to catch a coordinate mix-up, and notes that the renderer's edge-gutter fallback fails the inequalities by design.
>
> Supporting updates: §6.7, §12 state-by-field table, §15 accessibility and hook-contract rows, §16 risks, D19 clarified plus new D21/D22, §18 probe item, §20 audit rows, and the handoff paragraph. The one table column mismatch reported by my checker is the pre-existing `|arrowLeft − 36|` literal in P6-AC-08.
>
> Context-rebuild remount is deliberately not armed separately: the rebuild seeds the deck landed, so there is no deterministic `no-subject` window, and any retention that outlives the component is caught by the exit/re-entry path. If you want that path covered anyway, the sequence would need a probe-side gate on the rebuilt instance's first commit.

#### Git status at handoff

```text
 M DESIGN.md
 M docs/phase-6-design.md
```
<!-- agent-handoff:entry:end -->

<!-- agent-handoff:entry:start -->
### 2026-08-31T19:15:31.109Z · claude

- Branch / HEAD: `main` / `543f6c6`
- Worktree snapshot: `619bf1f67a1d`
- Session / turn: `d59b67f4-8ee6-415d-97c8-73ee270e4e1e` / `not exposed`
- Model: `not exposed`

#### Final report

> All five findings are resolved; the only file I changed is [docs/phase-6-design.md](docs/phase-6-design.md) (the `docs/agent-handoff.md` modification is a new hook-managed entry, preserved untouched).
>
> **High — D20 vs plan §9.3.** I verified the conflict is real and predates Phase 6 (today's live behavior already makes `/projects` unreachable during deck focus). Rather than unilaterally amending a binding roadmap check or silently expanding production scope, **D20 is now an explicit blocking owner decision** in §18 with a recommendation: approve the two-step exit path (`esc · return` → cockpit rest → header `/projects`) as satisfying §9.3's intent for focused modes, **with the plan §9.3 clarification amendment recorded only upon approval**; the alternative (persistent deck-mode link) is documented with its costs — new chrome, new identifier, and a mandatory §13 forecast amendment before implementation. P6-AC-22 and its test row are explicitly written against the recommended path and carry the amendment obligation if the owner chooses otherwise. State row 10's "Escape + DOM catalog remain" was corrected to say the catalog is reachable only after exit via the D20 path.
>
> **Medium — F3 closed form.** The fixture now defines scalars first (`W_x`, `H_x`) and builds `X` from them; three new named-inequality preconditions cover exactly the gaps you listed: `(W_f − W_x)/2 − G_s − A_w ≥ 8` asserted on actual values so the `max(24, …)` floor branch cannot silently void the overlap claim; a compact candidate proven legal under F3 (`X.y − S.y ≥ H_c + G_c` plus the F2 return-control clearance) so retention yields compact, never `hidden`; and the fresh-entry sequence must first assert `status: 'placed'` with `compact === false` on the natural subject before applying F3.
>
> **Medium — contained coverage.** P6-AC-22 and its row now run **all four** plan §9.1 declared zoom/narrow pressure viewports — 800×450, 683×325, 512×300, **320×568** — matching §9.4's four-case pan-trace requirement; no exclusion needed.
>
> **Low — malformed table.** The truth table now terminates cleanly with a blank line before the "deliberately deck-only" paragraph (verified by scan).
>
> **Low — closed reachability set.** P6-AC-22 enumerates it exactly: `browse-arrow-prev`, `browse-arrow-next`, `return-control`, and `deck-project-link` (landed, non-busy), with `browse-hint` (identified but noninteractive) and `screen-dialog` (in-scene imagery, not a deck control) explicitly excluded.
>
> The §20 audit row was aligned: the design now names **two** genuine owner decisions (compact microcopy; the D20 disposition + §9.3 clarification), both with recommended choices and stated effects.
>
> Handoff: Phase 6 design review fixes — D20 converted to a blocking owner decision reconciling the plan §9.3 zoom/narrow reachability requirement (recommended two-step exit path with an approval-gated plan clarification; persistent-link alternative costed), F3 made genuinely closed-form with overlap/compact-legality/fresh-entry preconditions, contained coverage extended to the four declared pressure viewports including 320×568, the truth-table markdown repaired, and P6-AC-22's pan-reachability set closed and enumerated. Files changed: `docs/phase-6-design.md` only; hook-managed `docs/agent-handoff.md` preserved. Unresolved: the §18 blocking owner approvals (now including D20). Next role: owner approval of §18, then Codex plan/implementation, then Kimi QA.

#### Git status at handoff

```text
 M docs/phase-6-design.md
```
<!-- agent-handoff:entry:end -->

<!-- agent-handoff:entry:start -->
### 2026-08-28T14:14:15.843Z · claude

- Branch / HEAD: `main` / `543f6c6`
- Worktree snapshot: `103b09cb4a38`
- Session / turn: `d59b67f4-8ee6-415d-97c8-73ee270e4e1e` / `not exposed`
- Model: `not exposed`

#### Final report

> All six findings are resolved; the only modification on top of the clean `543f6c6` tree is [docs/phase-6-design.md](docs/phase-6-design.md) (+89/−40).
>
> **High — P6-AC-22's DOM alternative is now enforceable.** I chose and documented the exit-path interpretation (new decision **D20**): a persistent deck-mode `/projects` link would be new production chrome and a new identifier in a phase that must not grow rendered scope, and it's redundant with the plan §A.4 parity-sanctioned exit. The criterion and its contained-mode test row now specify the concrete verified path: pan the return control into the visible viewport → activate `esc · return` → await cockpit-rest → assert `[data-hud="site-header"] a[href="/projects"]` is visible, keyboard-reachable (Tab-focusable), and operable. D20 records the live evidence you cited (inert page content in [cockpit-entry.tsx:63](components/cockpit/cockpit-entry.tsx#L63), rest-only header at [cockpit-hud.tsx:323](components/cockpit/cockpit-hud.tsx#L323), preview-only `AccessibleExperienceLink`) and the rejected alternative.
>
> **Medium — tier fixtures are now closed-form.** All qualitative phrases are gone. F1/F2/F3 are exact rects: F1 below-forcing `{x: S.x+(S.w−240)/2, y: S.y+⌊(H_f+G_s)/2⌋, 240×160}`; F2 compact-top-forcing `{S.x, S.y, 120×200}` — redesigned to discriminate **horizontally** (subject-centered full candidates overflow the left edge whenever `W_f > X.w`, so above *and* below fail on x-containment; this also removes the unsound vertical-band assumption, since `H_c` may equal `H_f`), with `X.y = S.y` eliminating the above rail band so arrows deterministically resolve below; F3 hysteresis with the obstacle and axis named (beside arrow pair, vertical), `X.h = A_h + 2(G_c−G_s) + HYS` yielding an exact 12 px clearance = `G_c + HYS/2`, strictly inside the retention band. Every fixture's preconditions are asserted before the tier assertion, and a violated precondition fails the test naming the inequality — never skips or substitutes.
>
> **Medium — warn-once recipe corrected.** The hook-suite row now drives real unsatisfiable episodes with the override (noting `forceDeckFitStatus` alone never produces one): apply safe-frame override → await `unsatisfiable`, count 1 → hold across publications, still 1 → clear, await `placed` (episode ends) → reapply → count 2.
>
> **Low — AC-08 actionability.** The busy-swap row now captures the arrow handles before the swap and asserts, at the gap frame: `disabled`, focus rejection, and that `click()`/synthesized Enter changes neither `__cockpitDeck.index` nor the probe state and dispatches no navigation.
>
> **Low — complete `forceDeckFitStatus` truth table.** A six-row accepted/rejected matrix in §12 with no normalization: `(true, validReason)` and `(false)`/`(false, undefined)` accepted; `(true)` without reason, `(true, invalidReason)`, `(false, anything ≠ undefined)` (including `null` or a valid reason), and non-boolean `degraded` all throw with no state change. P6-AC-26(a) now requires the full matrix — every rejected row throws, every accepted row takes effect.
>
> **Low — §1 note is now fully historical**, recording that the concurrent work was committed and the tree is clean at `543f6c6` on top of the Phase 5 merge, with no claim about live uncommitted state.
>
> Final checks: AC IDs continuous 01–26 with counts consistent everywhere; no stale phrases remain from any of the six findings; no production code, tests, canonical content, or evidence touched.
>
> Handoff: Phase 6 design review fixes complete in `docs/phase-6-design.md` — D20 exit-path DOM-alternative contract for P6-AC-22 (verified against the live inert/header behavior), closed-form F1/F2/F3 tier fixtures with named-inequality failure (F2 rebuilt on horizontal discrimination, removing the `H_c < H_f` assumption), override-driven warn-once episodes, handle-captured AC-08 actionability assertions, the complete `forceDeckFitStatus` input matrix wired into P6-AC-26, and the §1 worktree note made fully historical at `543f6c6`. Files changed: `docs/phase-6-design.md` only. Unresolved: the §18 blocking owner approvals. Next role: owner approval of §18, then Codex plan/implementation, then Kimi QA.

#### Git status at handoff

```text
 M docs/phase-6-design.md
```
<!-- agent-handoff:entry:end -->

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
