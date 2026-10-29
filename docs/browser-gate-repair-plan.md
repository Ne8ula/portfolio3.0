# Bounded repair plan: failing browser gate (proposal, 2026-10-24)

> **Status: planning only, pending owner decisions.** Nothing here authorizes
> implementation, diagnostics, launches, phase commands, approval-record
> changes or commits; every command is **PROPOSED / NOT AUTHORIZED**. No Kimi.
> The Codex-QA migration stays blocked/unaccepted, Phase 6 uninitialized,
> historical Phase 2–5 manifests unrun. Not a phase controller; no Phase 6
> product work or migration step. No request overrides loaded higher-priority
> rules (`AGENTS.md`, `CLAUDE.md`, phase plans).

## 1. Observed facts

Host bootstrap receipt
`C:\Users\alexx\AppData\Local\Temp\claude\C--Users-alexx-Documents-portfolio3-0\8ef66ae0-9c78-45c1-99df-646bea5dce6d\scratchpad\bootstrap-host-receipt.json`
(scope "manual migration bootstrap; not a phase run or QA verdict"): started
2026-10-24T22:12:21.684Z, HEAD `e03ae2b`, base `59c3dc9`, status `blocked`,
real/disposable source and Git integrity unchanged. Lint, contract typecheck,
contract validation and `test:unit` (437 tests at that snapshot; the later
452-test engineer result is a different, unreviewed run) exited 0.
`CI=true npm run test:e2e` ran 22:14:46.427Z–22:30:17.493Z and **exited 1**;
log
`C:\Users\alexx\AppData\Local\Temp\claude\C--Users-alexx-Documents-portfolio3-0\8ef66ae0-9c78-45c1-99df-646bea5dce6d\scratchpad\bootstrap-gate-4.log`
(SHA-256 `f985a247…cd8e`).

| # | Spec (file n/10) | Outcome | Evidence |
| --- | --- | --- | --- |
| F1 | `phase2-completion.spec.ts:493` palette (3/10) | **Flaky**: first attempt failed, retry passed (log L51–85) | `toHaveAttribute('data-a11y-contrast','high')` at :567 received `standard` for 60 s (121 polls) after direct `setAttribute` writes at :560–566 |
| F2 | `phase4-hud.spec.ts:855` AC-13/14 (5/10) | **Failed** first attempt and retry | `expect(seededBuffers[1]).toBe(seededBuffers[0])` at :865 (log L155–203); data URLs at L159/L160 and L181/L182 |
| F3 | `phase4-hud.spec.ts:964` AC-21 (5/10) | **Failed** first attempt and retry | ``toContain(`test(\n    '${title}'`)`` at :969 (log L1097–1104, L1998–2005) |
| — | Phase 4 other six tests | Passed, incl. `AC-10/16/17` (:779): within-load fixed-capture identity held | Log L2017–2020 |
| — | Specs 6–10 | **Not executed**: `scripts/run-e2e.mjs:101–102` stops at the first non-zero file | Log ends L2021; not green |

Orchestrator-verified: live and snapshot `e2e/smoke.spec.ts` have 974 CRLF
line endings (SHA-256 `0de2b5b3…9028`); the raw :969 check is false and true
after CRLF→LF normalization; the three specs are byte-identical to the failed
snapshot. F2 never reached :867–902, so it is **not** a demonstrated AC-14
failure.

Artifacts: under CI with no explicit spec, `run-e2e.mjs:42–48,89–103` runs
each spec file in its own Playwright process; `playwright.config.ts` sets no
`outputDir`, so every process reuses the default `test-results/` and
Playwright clears it at start. The Phase 2 screenshot named at log L77 was
therefore already deleted when spec 5 ran. The preserved snapshot
`C:\Users\alexx\AppData\Local\Temp\claude\C--Users-alexx-Documents-portfolio3-0\8ef66ae0-9c78-45c1-99df-646bea5dce6d\scratchpad\bootstrap-snapshot\test-results`
holds four directories covering the two failing Phase 4 cases (F2, F3) and
their retries (host-verified inventory): all four have `error-context.md`;
only the two retry directories have a trace zip; AC-13 has two failure PNGs
(one per attempt); AC-21 has no PNG. Phase 2 artifacts are absent; F1
evidence is log text only.

Authority facts:
- `e2e/phase4-hud.spec.ts` is a Phase 6 commit path (`phase-6.json:66`);
  the AC-21 guard is Phase 6 step-1 scope (`phase-6.json:39`;
  `docs/phase-6-plan.md:95` "Only AC-4 … and AC-21 conversion guard";
  P6-AC-21 `docs/phase-6-design.md:1062`, amendment :77/:1457); `:95` permits
  no AC-13 edits. Phase 6 initialization needs every Phase 6 commit path clean
  (`docs/codex-qa-proposal.md` §5). `e2e/phase2-completion.spec.ts` is
  historical Phase 2 coverage.
- Historical discrepancy, unresolved: AC-13 design
  (`docs/phase-4-design.md:1384–1387`) specifies same-backend **metric**
  tolerances across fresh loads (AC-16 :1396–1397: string-identical within one
  load); the implementation record (`docs/phase-4-implementation.md:85`)
  states "identical same-backend forced buffers", passed by independent Step 4
  QA on another host. No amendment mandating cross-load exact equality was
  found. This plan changes no threshold and preserves exact equality.

## 2. Hypotheses (unproven)

- **H-F3**: CRLF checkout vs `\n` in the assertion. Strongly supported;
  still needs red→green mutation proof.
- **H-F2**: unresolved cross-load divergence. None established: host
  backend/rasterization; a readiness condition the waits miss (fonts
  `app/layout.tsx:71–77`, async textures, camera smoothing, DPR/buffer); a
  runtime capture defect (outside test scope).
- **H-F1**: direct writes precede the provider's hydration re-stamp
  (`components/responsive/accessibility-provider.tsx:127–132`). Not proven.

## 3. Scope and boundaries

**Proposed engineering allowlist (Stage B only, each under its OD)**:
`e2e/phase4-hud.spec.ts` lines 964–972 (B1) and, only under B2, the AC-13
loop before :863; `e2e/phase2-completion.spec.ts` lines 560–574 (B3).
Planned updates to docs or the handoff are a separate authority, not part of
this allowlist. Scope intersection: both `phase4-hud` edits touch a Phase 6
commit path, and B2 touches lines Phase 6 forbids; each needs explicit
compatible authority **before** editing.

**Diagnostic root** (all scratch output; used as `$DIAG` in commands):
`C:\Users\alexx\AppData\Local\Temp\claude\C--Users-alexx-Documents-portfolio3-0\8ef66ae0-9c78-45c1-99df-646bea5dce6d\scratchpad\browser-gate-diag`

**Forbidden**: production code (`app/`, `components/`, `lib/`, incl.
`test-hooks.ts`, `globe-canvas.tsx`, `accessibility-provider.tsx`); new hooks
or bridge names; any other spec, helper or `e2e/fixtures/phase4-hud-parity.json`;
`playwright.config.ts`, `scripts/e2e-policy.ts`; `scripts/run-e2e.mjs` and
`tests/unit/e2e-runner.test.ts` (separate Windows repair); migration files,
manifests, `.github/`, baselines, captures, `content/portfolio-approvals.json`,
the handoff, agent configuration.

**Rejected shortcuts**: LF-only checkouts (they violate the migration's
exact raw-source snapshot equality; copying CRLF bytes back leaves AC-21
red), `core.autocrlf`/`safe.directory` changes, line-ending rewrites,
baseline conversions, altered gate environments, custom configs, changed
backends, `npx` downloads, helper frameworks, arbitrary shell runners.

**Never allowed**: threshold/tolerance changes, masking, baseline
regeneration, removing equality, sleeps, timeout increases, added retries,
`skip`/`fixme`, retry-until-green; staging, cleanup, stash, reset,
normalization or commit of existing work.

**Preserve**: 2560×1440 preview, full matrix incl. 3440×1440, 1440×900
reference, reserved captures, all existing logs/traces/images, canonical
capture config/seed/time, the five gate strings.

**Safeguards**: the host runs approved commands with installed Playwright
and existing config; the reviewer only reads. No sandbox/permission bypass,
no fallback agent or tool; denied launch, missing session proof, integrity
drift or blocking review means **stop**. `CI=true` disables server reuse:
the configured port must be free; never test another tree's server.

## 4. Stages

### Stage 0 — evidence preservation (before any browser invocation)

Copy (never move) the gate-4 log, receipt and
`bootstrap-snapshot\test-results` into `$DIAG\archive-bootstrap` and record
SHA-256 of every file in
`C:\Users\alexx\AppData\Local\Temp\claude\C--Users-alexx-Documents-portfolio3-0\8ef66ae0-9c78-45c1-99df-646bea5dce6d\scratchpad\browser-gate-diag\archive-bootstrap\manifest.sha256`.
`bootstrap-snapshot` is never reused or run in.

### Stage A — diagnostics (OD-1; no real-repository writes)

**Offline-first (OD-1, before any browser run)**: decode the four original
logged data URLs (log L159/L160, L181/L182) into new scratch artifacts under
`$DIAG` using already-installed tooling only (no dependency install, no
browser launch); compare dimensions, differing-pixel counts/bounding boxes
and max channel delta; existing AC-13 metrics are informational only.
Originals are retained unmodified. If no installed offline decoder is
available, report that and proceed only via already-authorized diagnostics;
never install a tool. This neither relaxes exact equality nor infers root
cause, and preapproves no new decoder framework or script.

**Snapshot procedure (shared by every disposable tree in Stages A, B and C,
per `docs/codex-qa-proposal.md` §7)**: the host records exact live HEAD and base;
copies tracked, untracked and relevant ignored source bytes and checks them
plus a binary diff against the live tree; gives the snapshot independently
cloned Git metadata (never copying active Git locks); runs a fixed, isolated
`npm ci` with its own cache (no copied, shared or junctioned `node_modules`)
and records a dependency fingerprint immediately after install; and
enumerates expected gate artifacts. `bootstrap-snapshot` is never reused.
Manual host work here is only the approved maintenance diagnostics and
verification, never a phase-controller invocation.

Host creates `$DIAG\copy-a1` by the snapshot procedure (no Git operation in
the real repository). Default runs use unchanged tests only:

```powershell
$DIAG = 'C:\Users\alexx\AppData\Local\Temp\claude\C--Users-alexx-Documents-portfolio3-0\8ef66ae0-9c78-45c1-99df-646bea5dce6d\scratchpad\browser-gate-diag'
Set-Location "$DIAG\copy-a1"; $env:CI = 'true'
npm run test:e2e -- e2e/phase4-hud.spec.ts --grep "AC-21:" --retries=0 --repeat-each=3 --output "$DIAG\a-ac21"
npm run test:e2e -- e2e/phase4-hud.spec.ts --grep "AC-13/14" --retries=0 --repeat-each=5 --output "$DIAG\a-ac13"
npm run test:e2e -- e2e/phase4-hud.spec.ts --grep "AC-10/16/17" --retries=0 --repeat-each=5 --output "$DIAG\a-control"
npm run test:e2e -- e2e/phase2-completion.spec.ts --grep "document palette meets text" --retries=0 --repeat-each=10 --output "$DIAG\a-palette"
```

An explicit spec argument makes `run-e2e.mjs` run one pass-through Playwright
process. Each command's console output is teed to a distinct sibling log
under `$DIAG\logs`, **never** inside a Playwright-cleared `--output` or report
directory; exit codes recorded. The same rule applies to mutation, targeted
and five-gate logs. Every earlier run's artifacts are retained; no output
directory is reused across separate commands.

**Instrumented diagnostics (OD-1s, approved before use)**, only if default
runs cannot classify. Exactly two scratch specs in the disposable copy's
existing `testDir` (config byte-identical), writing only via
`testInfo.outputPath`:
- `C:\Users\alexx\AppData\Local\Temp\claude\C--Users-alexx-Documents-portfolio3-0\8ef66ae0-9c78-45c1-99df-646bea5dce6d\scratchpad\browser-gate-diag\copy-a1\e2e\zz-diag-ac13.spec.ts`:
  the :860–864 sequence over 5 fresh-load pairs plus a within-load pair
  ≥500 ms apart; read-only records via existing hooks/bridge
  (`getRendererState`, `getVisualCaptureState`, `getVisualAssetState`,
  `isSettled`, `getHudFrameMeta`, `getFreeLookState`, `__cockpitViewMode`,
  camera matrices, WebGL vendor/renderer, user agent, `document.fonts`); in-page
  buffer decode with size, differing pixels, bounding boxes, max channel delta
  (AC-13 metrics informational only); and, only for a candidate predicate,
  the controlled with/without-wait comparison, capture/backend inputs fixed.
- `C:\Users\alexx\AppData\Local\Temp\claude\C--Users-alexx-Documents-portfolio3-0\8ef66ae0-9c78-45c1-99df-646bea5dce6d\scratchpad\browser-gate-diag\copy-a1\e2e\zz-diag-palette.spec.ts`:
  the unchanged palette sequence plus an `addInitScript` MutationObserver
  timestamping every `<html>` `data-a11y-*` mutation.

Commands, from `$DIAG\copy-a1` with `CI=true`:
`npm run test:e2e -- e2e/zz-diag-ac13.spec.ts --retries=0 --output "$DIAG\a-ac13-instr"`
and `npm run test:e2e -- e2e/zz-diag-palette.spec.ts --retries=0 --repeat-each=10 --output "$DIAG\a-palette-instr"`.

**Classification; Stage A ends with a report and stops.**

| Class | Evidence | Next |
| --- | --- | --- |
| F2-unresolved | Recorded state equal, buffers differ, within-load control equal | Stop. Backend is one hypothesis only; no test edit |
| F2-readiness | All of: (i) a cross-load difference in a field causally relevant to rendering (not naturally varying IDs/timestamps); (ii) an existing observable stable predicate; (iii) a controlled scratch-only comparison, capture/backend inputs fixed, where waiting on it yields equal buffers and not waiting does not | B2 may be proposed (OD-4) |
| F2-runtime | Within-load control differs, capture state inconsistent or a stream missing | Stop; separate compatible authority; no production edits here |
| F2-intermittent / not reproduced | Mixed or all-equal pairs, cause unidentified | Stop, report |
| F1-race | Provider stamp overwrites the test's `high` write | B3 (OD-3) |
| F1-other / not reproduced in 10 | — | Stop; no blind fix |
| F3-confirmed | Raw AC-21 fails 3/3 on CRLF copy | B1 (OD-2) |

### Stage B — conditional test-only repair (one Codex writer)

- **B1 (OD-2)**: in :964–972, normalize once (`.replace(/\r\n/g, '\n')`)
  after the read at :965; keep :968, :970, :971. Inline synthetic checks: the
  CRLF and LF forms of the current header pass; `test.fixme(`, `test.skip(`
  and a missing title fail. No helper module. P6-AC-21 semantics unchanged.
- **B2 (OD-4, only F2-readiness)**: add a wait on the diagnosed existing
  predicate before :863. `toBe` at :865 and :867–902 unchanged.
- **B3 (OD-3, only F1-race)**: in :560–574 replace direct writes with
  `localStorage['cockpit-a11y-v1'] = JSON.stringify({contrast:'high',transparency:'reduced'})`
  (format `lib/responsive/accessibility.ts:63,132–153`), `page.reload()`, then
  assert resolved `data-a11y-contrast=high` and `data-a11y-transparency=reduced`.
  :496–558 (ratios 4.5/4.5/4.5/3) and :577 stay byte-identical.

**Mutation proofs**, each in its own throwaway copy of the repaired tree
(`$DIAG\mut-b1`, `$DIAG\mut-b2`, `$DIAG\mut-b3`), never the real tree, the
archive or the candidate. Each mut-b* copy is created by the shared snapshot
procedure (independent cloned Git metadata, isolated `npm ci`; no copied,
shared or junctioned `node_modules`) before its one approved mutation is
applied: B1 without normalization fails on CRLF; B3 seeded
`contrast:'standard'` fails the attribute assertion; B2 with a distinct
`timeMs` confined to that test's temporary fixture fails :865. Each copy then
restores the repaired file (hash equal to the real tree's) and reruns green;
both logs retained. B1 shape (B2/B3 use their Stage C grep lines):
`npm run test:e2e -- e2e/phase4-hud.spec.ts --grep "AC-21:" --retries=0 --output "$DIAG\mut-b1-red"`,
then the same with `--output "$DIAG\mut-b1-restored"`. No writer self-certification.

### Stage C — scoped host verification, then fresh review (OD-5)

1. Host creates `$DIAG\candidate` as a fresh, exact snapshot of the current
   repaired dirty tree by the Stage A snapshot procedure (not a cleaned or
   stashed worktree) and records real/candidate source and Git object-store
   fingerprints.
2. **Targeted first-attempt proof first** (separate output folders):
   ```powershell
   Set-Location "$DIAG\candidate"; $env:CI = 'true'
   npm run test:e2e -- e2e/phase4-hud.spec.ts --grep "AC-21:" --retries=0 --repeat-each=3 --output "$DIAG\c-ac21"
   npm run test:e2e -- e2e/phase4-hud.spec.ts --grep "AC-13/14" --retries=0 --repeat-each=3 --output "$DIAG\c-ac13"
   npm run test:e2e -- e2e/phase2-completion.spec.ts --grep "document palette meets text" --retries=0 --repeat-each=10 --output "$DIAG\c-palette"
   ```
   Required: AC-21 3/3 and palette 10/10; AC-13 3/3 only if B2 landed (the
   line is otherwise not run and not required). The full
   `CI=true npm run test:e2e` command in step 3, with all ten specs, stays
   mandatory regardless. Any failure stops; no rerun.
3. **Final five gates**, unchanged strings, per the receipt procedure, each
   teed to a log: `npm run lint`, `npm run typecheck:contracts`,
   `npm run validate:contracts`, `npm run test:unit`, `CI=true npm run test:e2e`
   (unchanged config, all 10 specs). All must exit 0 with 10/10 files
   executed. A retry flake is reported and is not clean acceptance.
4. **Freeze**: hash all logs, `--output` folders and the candidate's
   end-state `test-results/` and `playwright-report/` into
   `C:\Users\alexx\AppData\Local\Temp\claude\C--Users-alexx-Documents-portfolio3-0\8ef66ae0-9c78-45c1-99df-646bea5dce6d\scratchpad\browser-gate-diag\freeze.sha256`.
   Full-run per-spec internals have no retention mechanism (cleared per
   process, §1; no runner edit here); missing artifacts are listed. From
   freeze on, frozen source, Git metadata including objects, installed
   dependencies and gate/diagnostic evidence must not change.
5. **Fresh review**: new `codex exec` session, read-only sandbox, never
   resumed/forked, not the engineer, not a Claude subagent; identity from
   CLI/session evidence. Reads brief, diff and frozen trusted-host evidence
   (no historical manifests); writes nothing in either repo tree. For the
   reviewer's duration only three controller-owned output files may be
   written, outside both repo trees: `$DIAG\review-events.jsonl`,
   `$DIAG\review-stderr.log`, `$DIAG\review-result.json`; no broader
   output-folder exemption. The trusted host checks frozen state before reviewer
   start and, on every exit path, after the reviewer process and all its
   existing lifecycle/exit hooks have completed, using existing tooling (no
   new hooks installed, no exception). On any block, failures and evidence are preserved.
6. Only after those checks does the host write the owner handoff; commit
   only on a separate D5 request.

## 5. Acceptance (scoped repair verification only)

1. Before Stage B the host records a before-repair inventory: `git rev-parse
   HEAD`, the original dirty-path list from
   `git --no-optional-locks status --porcelain=v1 -uall`, and SHA-256 of
   **every** tracked, untracked and relevant ignored source file (not only
   dirty paths), in
   `C:\Users\alexx\AppData\Local\Temp\claude\C--Users-alexx-Documents-portfolio3-0\8ef66ae0-9c78-45c1-99df-646bea5dce6d\scratchpad\browser-gate-diag\before-repair-inventory.txt`,
   plus a separate complete Git metadata/object-store inventory. At end of
   turn the same inventories differ **only** in the approved test regions,
   plus any separately authorized operational handoff written after
   verification. Named gate caches are exempt only while gates run, never
   during review. Nothing is staged or cleaned.
2. `e2e/smoke.spec.ts`, the parity fixture, capture config/seed/time sources
   and the Windows two-file repair diff are byte-unchanged; no new hooks,
   config, threshold, mask, baseline or retry changes.
3. Stage 0 manifest matches; mutation red and restored-clean logs exist for
   each landed B-item.
4. Stage C step 2 counts met first-attempt before step 3; step 3 has five
   exit-0 gates, 10/10 specs, logs hashed and frozen.
5. Fresh Codex review result recorded with identity and integrity evidence.

This acceptance does not satisfy migration A1–A11, the Windows repair, or any
Phase 6, §18, owner or CI gate.

## 6. Owner decisions (none granted here)

- **OD-1**: Stage 0 + Stage A default runs. **OD-1s**: the two scratch
  specs, separately and only if needed.
- **OD-2 (B1)**, recommended: an explicitly bounded newline-portability
  maintenance authorization, P6-AC-21 semantics unchanged and cited by the
  later Phase 6 diff/QA, **only if compatible with governing rules**. If it
  is classified as forbidden Phase 6 implementation: stop for authorized
  instruction alignment and a compatible new session; no self-authorized
  work. Deferring keeps gate and migration blocked; no manifest switch.
- **OD-3 (B3)**: the palette edit on historical Phase 2 coverage.
- **OD-4 (B2)**: an AC-13 readiness-only amendment, if diagnosed; same
  compatibility caveat (Phase 6 forbids AC-13 edits). Replacing exact
  equality with metric tolerances is a future design/owner matter, **out of
  scope**, not a switch in this repair.
- **OD-5**: Stage C and the fresh review. **D5**: each commit separately.

**Recommended dependency order** (repair QA certifies neither migration nor
Windows repair; every checkpoint preserved):
1. Diagnose (OD-1, optionally OD-1s); report; stop.
2. Separately approve the classified repair (OD-2/3/4) after compatible
   authority for the scope intersection.
3. Repair → mutation proofs → targeted proof → five gates → freeze → fresh
   review → owner; repair commit on its own D5 request.
4. Refresh migration bootstrap (new snapshot, O1/O2 proofs, gates, new full
   fresh Codex review, owner acceptance); own D5 commit.
5. Separate Windows-repair review per `docs/codex-qa-proposal.md` §7; own
   D5 commit.
6. Legitimate Phase 6 only after clean authorized commits and prerequisites.

## 7. Stop conditions

Stop and report on: a path or range outside §3; a needed production/helper/
config change; any stop class in Stage A; a proposed weakening, sleep, retry
or timeout change; in Stage C targeted verification or the final required
gates, any first-attempt failure, red or unexecuted spec; a mutation proof
failing for the wrong reason; denied launch, missing session proof,
integrity drift, evidence overwrite or blocking review; Kimi, phase-command,
migration or Phase 6 drift. Expected pre-repair diagnostic failures and
intended mutation reds are retained evidence, not green verification, and do
not by themselves end the approved diagnostic series; all permission,
integrity, out-of-scope and classification stop rules apply throughout.
Preserve all evidence; never reset, stash, clean or discard.

## 8. Startup-maintenance amendment proposal — 2026-10-26

> **Status: PENDING scope amendment; proposal only.** Not approval, QA or
> implementation; authorizes no execution. OD-1 and the subsequent repair runs
> were owner-approved; this newly identified `app/globals.css` boundary is not,
> and no broad completion request covers it. §§1–7 and every approval record
> stay unchanged. Phase 6 forbids this file; §3 forbids `app/`. **Pending
> prerequisite**: an explicit, bounded owner authorization for this exact
> outside-Phase-6 maintenance insertion, then one bounded Codex engineer and a
> fresh read-only Codex QA. Paths here are written without drive-rooted
> backslash forms to avoid adding scanner candidates.

**Verified facts (host/CLI evidence, orchestrator-inspected).** Fresh
`codex exec` session `01a178e3-9fd2-7232-b24e-c9a941a9e188`, CLI
`0.164.0-alpha.11.1`, CLI-exposed model `gpt-6-astra`, read-only sandbox,
approval `never`, exit 0; source, Git and dependencies of the live tree and
preserved `$DIAG/a1` unchanged (receipt `startup-diagnosis-1/receipt.json`;
engineering investigation, not QA). Finding: Tailwind automatic source
discovery (Oxide) extracts **11 distinct** `--`-prefixed variable candidates
from Windows scratch paths in exactly `docs/agent-handoff.md` (tracked) and
`docs/browser-gate-repair-plan.md` (untracked); a backslash-hex fragment is
decoded as a CSS escape and `String.fromCodePoint(9369194)` throws
`RangeError` at `app/globals.css:1:1`. Each candidate alone reproduces; live
and snapshot both fail. Historical Stage A receipt: all four commands exited 1
at startup, 0 of 23 repetitions ran. **Unrun**: host startup, any browser
result, the five gates and independent QA.

**Proposed allowlist (only).** Insert immediately after `app/globals.css`
line 1, nothing else:

```css
@source not "../docs/agent-handoff.md";
@source not "../docs/browser-gate-repair-plan.md";
```

No other existing CSS/style byte, newline normalization, dependency, config,
test, baseline or historical-evidence edit. **Rejected**: excluding all
`docs/` (demonstrably drops utilities, e.g. `.contents`, `.truncate`,
`.drop-shadow`, and changes theme variables); `.gitignore` (one trigger is
tracked, and preservation/status matter).

**Acceptance criteria (all required; current values are pre-append analysis
and MUST be refreshed against the final snapshot):**
1. Insertion applied outside Phase 6 only after the explicit bounded owner
   authorization; diff limited to the two inserted lines.
2. New exact disposable snapshot per §4 procedure (independent Git metadata,
   isolated `npm ci`, fingerprints); `a1`, `bootstrap-snapshot` and all
   archives preserved, never reused.
3. Original-input red (exact `RangeError`) and proposed-input green, each in a
   separate fresh Node/PostCSS process (same-process cache contaminated one
   earlier diagnostic; that evidence is preserved).
4. Source discovery excludes exactly the two docs and all 11 bad candidates
   (recounted on the final snapshot).
5. Compiled CSS byte-identical to a diagnostic control: original candidates
   minus precisely the 11 bad ones. Current compiler evidence: 53,056 bytes,
   SHA-256 `d62a1d4e005e32fc8a9e83792e6ab391ecda42d4fc1ee2e1b0b4c080bb847467`;
   fresh-process PostCSS output 53,222 bytes (separate pipeline, not
   comparable byte-for-byte). Control is diagnostic, never a baseline update.
6. Fixed, unchanged Stage A commands; startup failures recorded distinctly
   from test assertions; stop immediately on any startup failure; no timeout,
   retry or style change. Startup success proves no AC result.
7. Final five unchanged gates green with all 10 E2E specs executed; then
   freeze source, Git, dependencies and evidence, checked before review and
   after review plus hook completion; fresh separate read-only Codex review.
8. Earlier test failures (F1–F3) are not waived; their repairs stay separate
   under OD-2/3/4.

**Unchanged limits.** No phase command except status; no commit without its
own separate request; no owner, content or capture acceptance. **Residual
risk**: a future path-like hazardous candidate in any file outside the two
excluded docs would reintroduce the startup failure; future classes written
only in the excluded docs would not be discovered.
