# Proposal: replace Kimi QA with a fresh, independent Codex QA session

**Status: Owner-approved plan; Kimi prohibited in all repository sessions;
stored instruction sources aligned; new compatible session active
(2026-10-24); migration candidate written but uncommitted, self-blocked and
unaccepted — O1/O2 proof integration, a complete browser gate, bootstrap
review, owner acceptance and technical proofs pending.**
Author role: `portfolio-design` (Claude design specialist), workflow criteria
only. Prepared 2026-10-24 on `codex/phase-6-deck-hud` at HEAD `e03ae2b`;
cumulative Phase 6 review base `59c3dc9`. No command, gate, agent or QA session
was run to produce this document. The owner approved D1–D4 on 2026-10-24
(§10); that approval is policy only and does not activate the plan (§1).

## 1. Status, scope and what does not change

- **Stored instruction sources aligned (2026-10-24).** The orchestrator
  updated `.claude/agents/portfolio-orchestrator.md` and
  `.claude/agents/portfolio-design.md` and retired
  `.agents/agents/kimi-phase-qa.md`; `portfolio-design` then aligned the
  prospective text of `AGENTS.md`, `CLAUDE.md`, `docs/astra-orchestration.md`
  and `docs/phase-runner.md`. Historical Kimi evidence was not edited.
- **Migration candidate (2026-10-24; uncommitted, blocked, unaccepted).**
  In the new session one Codex engineer changed the controller
  (`scripts/phase-runner/`), `phase-6.json` (D3 wording), the new QA schema,
  the `scripts/agent-handoff.mjs` header generator and their tests;
  `portfolio-design` then applied the D3 plan amendment note and the design
  supersession note. A later three-file refinement (§10) replaced the
  unconditional activation stub with operational policy checks that neither
  verify owner acceptance nor authorize runner use; no engineering or QA path
  may run until the §10 prerequisites and owner acceptance are met.
  Still Kimi-bound and unchanged: the Phase 2–5 manifests (historical; they
  block prospective execution). A legacy Kimi header in
  `docs/agent-handoff.md` is not authority to invoke Kimi. The documentation
  does not claim an accepted or active Codex QA controller (§10 status).
- The owner first cancelled Kimi access and then, on 2026-10-24, prohibited
  Kimi in every repository session (§10). No Kimi launch, login, probe, hook
  install or fallback is allowed. Every step that needs QA stays **blocked**
  until the migration is accepted. Do not read that as a waiver.
- Adoption requires **both**: (a) explicit owner decisions (§10) —
  **satisfied 2026-10-24 for D1–D4** — and (b) the governing instruction
  sources updated and loaded in a **new**, compatible orchestrator session —
  **stored sources updated; new compatible session active 2026-10-24**. A session
  started before the alignment keeps its older higher-priority Kimi rules; a
  repository edit does not change them. Until (b) holds, only planning is
  permitted: no replacement QA, and any Codex review is advisory, not QA.
- Policy approval is not activation. D1–D4 now authorize the bounded plan;
  migration engineering and its bootstrap review may start only after (b),
  in the new session, under the bootstrap exception in §7.
  D5 commits are still requested separately, one at a time. No decision
  accepts an implementation or advances Phase 6.
- Nothing becomes valid retroactively. No Kimi PASS is inferred. No step is
  accepted. No test is waived. No owner approval is implied. Pending items
  stay open: the two-file Windows repair, Phase 6 step 1, browser gates,
  mutation proof, captures and the §18 checkpoint.

> **Phase 8A product-QA exception — 2026-10-27 (owner-approved OD-2,
> `docs/visual-first-amendment.md` §0; plan §0.9).** Prospective only; the
> D1–D4 records, §10 and every migration record stay as written. For the
> approved Phase 8A visual candidate **only**, this supersedes the blanket
> "every step that needs QA stays blocked until the migration is accepted"
> rule above and the §5 limit of new QA to Phase 6 and tooling reviews. In a
> new compatible session, independent of runner activation, one bounded
> Codex engineer may implement `docs/phase-8-design.md`, then a manual fresh
> read-only Codex reviewer (§§2–4, 6 constraints) reviews it. Required: an
> exact disposable snapshot, fixed host-run gates, CLI-corroborated fresh
> process/session identity, source/Git integrity, no sandbox or permission
> bypass or fallback, and no red or missing gate or blocking finding. A
> denied launch or missing proof blocks. The migration stays
> blocked/unaccepted; its bootstrap proofs are neither waived nor certified
> by this exception; every phase command except `status` stays forbidden;
> Phase 6 product work never runs outside the runner; Phase 7 is unchanged.
> No commit, acceptance or owner checkpoint is granted (OD-3).
>
> *Provider note 2026-10-27 (`docs/phase-8-design.md` §10).* For visual
> revision §4A only, the engineer is one native Opus 5.5 session; QA is
> unchanged: a manual fresh read-only Codex reviewer after implementation,
> never Claude or self-review. Deferred per OD-2a, not waived.

Objectives that do not change: the five required gates, the same-step
fix-retry limit (`maxFixAttempts: 3`), the single-writer lock, the owner
checkpoints, the protected `content/portfolio-approvals.json`, the
controller-only local commits, and owner/CI final acceptance.

## 2. Recommended workflow

`owner brief → Claude design → owner approval when required → Codex
engineering → NEW independent Codex reviewer → (FAIL) separate Codex
engineering fix → NEW independent Codex reviewer → owner/CI acceptance`

Independence requirements:

1. **New process and session.** Each review is a new `codex exec` process
   with a new session. It must never use `resume` or a fork, never continue
   the engineer's chat, and never reuse a session ID from any engineering
   turn. Each fix gets another new reviewer.
2. **Snapshot identity.** The reviewer works in a disposable checkout with
   the same HEAD, binary diff from HEAD and untracked file bytes as the live
   worktree. The controller has a starting point (`createQaWorktree`,
   `worktreeSnapshot` in `scripts/phase-runner/phase-runner.ts`), but it is
   not sufficient as is (§3). For Phase 6, the review scope is the cumulative
   change from `59c3dc9`, not just the uncommitted diff.
3. **Single writer.** The engineer is the only writer. The reviewer writes
   nothing in the repository. The engineering session cannot certify its own
   QA (`AGENTS.md`, communication rule 5, still applies).
4. **What "independent" means here.** It means a separate session and process
   with separate context. It does **not** mean a different model or provider.
   Both roles may run on the same Codex subscription and the same model.
   The owner accepted that correlated-risk trade-off on 2026-10-24 (D1).
5. **Recorded identity.** Role is recorded separately from client and model.
   The controller generates the record from its own launch (invocation ID,
   executable path, `--version` output, role) and corroborates it with actual
   CLI telemetry (session/thread ID from the JSONL stream; model only if the
   CLI exposes it, otherwise `not exposed`). Values the reviewer repeats in
   its JSON are never accepted as identity evidence on their own. Nobody
   fills in a model name from memory or from model self-report. An unknown
   model may be `not exposed`; an unknown or uncorroborated session identity
   blocks.
6. **Binding and freshness.** Each verdict is bound to its invocation ID,
   the snapshot and base fingerprints and the controller's gate record. The
   reviewer session must differ from every engineering session of the step
   and from every prior review session; each attempt needs a fresh one.

## 3. Reviewer constraints

- Must not edit source, tests, docs, config, manifests, approvals or the
  handoff. Must not use Git write commands (`add`, `commit`, `push`, `stash`,
  `reset`, `checkout` of tracked paths). Must not launch agents or delegate.
- **Current limit.** The existing `worktreeSnapshot` hashes the normalized
  Git diff and untracked bytes, not every file or Git metadata, and it
  explicitly **excludes** `docs/agent-handoff.md`. The current `runKimi`
  check therefore does not prove the read-only guarantees proposed here.
- **Required (implementation proof, not solved by prompt or existing hash).**
  The controller records exact relevant source, HEAD and base fingerprints
  before and after the review, in both the disposable checkout and the real
  worktree, plus a separate Git-state check (refs, index, stash list). The
  handoff is protected for the reviewer's duration. Only precisely listed
  artifact paths may change (the controller's own output/log files and the
  named gate artifacts in §4); there is no blanket exclusion of ignored
  files. Any other change blocks.
- **Hooks.** Automatic hooks are not a loophole. The controller writes the
  handoff entry only after the integrity checks pass. Any hook-only
  exception must be explicitly authorized, specified and validated
  separately, and never writes model-authored source.
- **Reading order.** When practical, the prompt lists the approved scope, the
  acceptance criteria, the live diff and the controller's gate evidence
  first. The engineer's report comes last and is labelled "context, not
  proof". The reviewer is never denied the approved brief, the diff or the
  required evidence.
- **No silent fallback.** If the reviewer cannot launch, cannot authenticate,
  or returns malformed output, the step is blocked. It never falls back to
  the engineer's self-review, a Claude review, Kimi or another model.

## 4. Read-only review vs. gates that write

The gates do write. Next/TypeScript/Vitest/Playwright create caches,
`tsbuildinfo`, `.next/`, `test-results/` and reports, and the browser gate
binds a localhost port. **`codex --sandbox read-only` on its own cannot run
the five gates unchanged.** That claim is not made here.

Recommended design: reuse the trusted-controller pattern that already exists.
`resolveHostE2eGate` already runs a fixed `CI=true npm run test:e2e` outside
the model sandbox.

1. The controller creates the disposable snapshot and checks its fingerprint.
2. The controller runs **exactly** `manifest.requiredGates` in order, with
   cwd set to the disposable checkout. It uses the existing `CI=true`
   convention for E2E and accepts no other commands or arguments. Exit codes
   and log SHA-256 values go to `.agent-runs/phase-N/logs/`, an explicitly
   allowed artifact path.
3. The controller re-checks the snapshot fingerprint. Only the enumerated
   gate-artifact paths (for example `.next/`, `test-results/`,
   `*.tsbuildinfo`, the exact list fixed in the engineering brief) may
   change; tracked or untracked source may not.
4. The reviewer launches with `codex exec --sandbox read-only --json
   --output-schema <qa schema> --output-last-message <path under
   .agent-runs> --cd <disposable checkout>`. It gets the logs as evidence. It
   judges the source, the diff and the **fresh controller gate output**. It
   does not rely on the engineer's green table.
5. The gate statuses that count come from the controller's exit codes, not
   from what the reviewer reports. PASS requires all controller gates to have
   exit code 0 **and** a reviewer verdict of `pass` with no blocking finding.
   If the reviewer's gate table disagrees with the controller record, the
   result is rejected.

Host authorization: the controller must be launched by the owner, or by an
orchestrator holding explicit host permission for that exact npm script. If
the client or OS denies the launch, the gates, the sandbox or the approval
policy, the run stops with `blocked` and the exact denial. Under no
circumstances is `danger-full-access`, a disabled sandbox, an approval bypass
or arbitrary reviewer commands used as a fallback. The approval-policy
setting that prevents reviewer escalation without being denied by the client
is open proof O2. A prompt does not settle it.

## 5. Minimal technical change inventory (for a later, separately authorized engineering brief)

The plan reuses the existing controller and state machine. It adds no second
framework and no multi-provider plugin layer.

| Path | Narrow purpose |
| --- | --- |
| `scripts/phase-runner/phase-runner.ts` | Replace `runKimi` (L958) with a Codex reviewer dispatch: new `codex exec`, read-only, its own output file. Add controller-run gates in the disposable checkout (§4). Update `doctor` (L769) to check the Codex reviewer instead of the Kimi executable and agent-file frontmatter. Generalize `executablePath`/`captureHandoff` (`'codex' \| 'kimi'`) and handoff texts L879/L1347. Pass the corroborated session ID to `captureHandoff`, not the fixed `phase-runner-${agent}`. Keep `retest`/`continue`/`execute` sequencing. Windows fixes only where evidence-backed and needed for this migration's launch/path/snapshot compatibility; keep root confinement and safety checks, prefer existing executable overrides, no privilege escalation, broad rewrites, or config/dependency churn. |
| `scripts/phase-runner/core.ts` | Rename `KimiResult` to a generic `QaResult` with a required `reviewer` attribution `{role, client, cliVersion, sessionId, model}`. Update `parseFindings`/`parseKimiResult` messages, `buildKimiPrompt` (L757) to a reviewer prompt, `buildCodexPrompt` L751/L754 ("Kimi as next role"), and `extractKimiJson` (no longer needed if the output file is used). Use `lastQaResult` for new state and leave any legacy `lastKimiResult` value untouched. Keep `validateGateResults`, `transitionAfterQa` and `acceptOwnerGate` semantics. |
| `scripts/phase-runner/schemas/qa-result.schema.json` (**new**) | A strict schema for the reviewer's `--output-schema`. No standalone Kimi schema exists today; the Kimi contract lived only in the prompt plus `parseKimiResult`. `codex-result.schema.json` stays unchanged. |
| `tests/unit/phase-runner.test.ts`, `tests/unit/phase6-manifest.test.ts` (L227 asserts "fresh independent Kimi QA") | Regression coverage for the checks in §6 and §8. Synthetic data only. No launched agents and no real state. |
| `scripts/agent-handoff.mjs`, `tests/unit/agent-handoff.test.ts` | Update the generated `docs/agent-handoff.md` header's prospective route text (still names Kimi). Change attribution only if role cannot be carried in the report text. Existing Kimi hook install/uninstall code stays as inert legacy code (touches no credentials) but must never be invoked. |
| `.agents/agents/kimi-phase-qa.md` | **Retired 2026-10-24** (orchestrator edit; historical text retained, returns BLOCKED if loaded). The controller still references it; the migration removes that reference. |
| `AGENTS.md`, `CLAUDE.md`, `docs/phase-runner.md`, `docs/astra-orchestration.md`, `.claude/agents/portfolio-orchestrator.md`, `.claude/agents/portfolio-design.md` | **Prospective text aligned 2026-10-24** (stored sources; loading requires a new session). `docs/phase-runner.md` now describes the blocked migration candidate (2026-10-24) and keeps the Kimi-only controller text as inactive legacy reference. Historical entries stay unchanged. |
| `docs/responsive-system.md`, `docs/hud-responsive-layout-plan.md` | Only if needed: narrow prospective current-state/QA-provider text. Historical design and evidence text stays unchanged. |
| `scripts/phase-runner/manifests/phase-6.json` (step scopes L42, L52–54), `docs/phase-6-plan.md` (L30–31, L40), `docs/phase-6-design.md` (source; L87, L1223, L1497, L1519) | **Prospective authority amendment, owner-approved 2026-10-24 (D3); not yet applied.** Approved: change the Kimi wording in the manifest and plan, and add one supersession note to the design source, dated with the real date of the future authorized amendment (no approval date is written now). The design body is not rewritten. **Applied 2026-10-24**: manifest in the uncommitted candidate; plan amendment note and design supersession note by `portfolio-design`. Not reviewed or accepted. |

Compatibility rules:
- Any manifest edit changes `manifestDigest`. `loadState` already refuses
  state whose digest does not match. Phase 6 has no state on this machine
  (`.agent-runs` absent), so nothing needs migration. If mismatched state
  exists anywhere, the run fails closed. Never reset, re-initialize or
  relabel it.
- The Phase 2–5 manifests, their evidence and docs that cite Kimi verdicts
  (for example `docs/phase-5-implementation.md` and
  `docs/baselines/phase-3-dpr/`) stay byte-for-byte unchanged. Those
  historical Kimi verdicts stay labelled Kimi.
- New QA policy applies only to Phase 6 and to explicitly approved
  outside-phase tooling reviews. Any historical manifest that requires Kimi
  **blocks** prospective execution or retest until separately authorized; it
  never silently uses the new QA while keeping old authority text. No
  general multi-provider framework.
- `assertCommitInitializationReady` requires the manifest and the design
  source to be tracked and clean, and every Phase 6 commit path to be clean.
  `CLAUDE.md`, `docs/responsive-system.md`,
  `docs/hud-responsive-layout-plan.md` and `tests/unit/e2e-runner.test.ts`
  are all Phase 6 commit paths. So both the authority amendments and the
  pending Windows repair must be committed before Phase 6 can initialize.
  Each commit needs its own owner authorization (D5).

## 6. Fail-closed QA result contract

The controller rejects the result, and the step becomes `blocked` (or
returns to FAIL, where noted), when any of these hold:

1. The output is malformed or fails the schema. The output file is missing,
   or there is more than one candidate result.
2. `phase` or `step` does not match the active manifest step.
3. Any required gate is missing, `not-run` or red in the **controller**
   record, or the reviewer's gate table disagrees with that record.
4. The verdict is `pass` with a blocking finding, or `fail` with none (this
   check exists today).
5. The snapshot fingerprint at reviewer start differs from the fingerprint
   at gate time, HEAD/base drifted, Git state changed, the handoff changed,
   any path outside the allowed artifact list changed, or the real worktree
   changed during QA (§3).
6. Controller-generated identity is missing or not corroborated by CLI
   telemetry; the session ID equals any engineering or prior review session
   ID; the JSONL shows a resume or fork; or the verdict is not bound to the
   invocation ID, snapshot/base fingerprints and gate record.
7. The reviewer wrote to the repository. Trace-based checks for attempted
   Git writes, delegation or escalation are a supplemental control only
   where telemetry exists; they do not replace sandbox/permission
   enforcement and are not promised where the CLI does not expose them.

These stay as they are: the finding fields (severity, blocking, file, line,
evidence, expected, actual, reproduction), the fix-attempt limit, the lock,
`awaiting-owner`, `phase:accept`'s requirement of an independently passed
step, controller-only commits from `commitAfterQa.paths`, and the exclusion
of the approval ledger and handoff from commits. New records are labelled
**"Independent QA: Codex (fresh session)"** with the recorded provider and
model evidence. They are never labelled Kimi.

## 7. Adoption sequence and bootstrap

The migration changes the QA mechanism itself, so the new controller cannot
certify its own build. Kimi is unavailable and is not demanded.

1. **Owner policy decision** (§10, D1–D4). **Done 2026-10-24**: the owner's
   chat approval is recorded in §10 by an agent; no signature is implied.
2. **Aligned orchestration.** The governing instruction sources are updated,
   and a **new**, compatible orchestrator session loads them. **Stored
   sources updated 2026-10-24** (§1); the new-session load is **pending**. An
   owner chat message or a repository edit alone does not satisfy this step.
   Until then the steps below do not run; only planning does. *(Later
   2026-10-24: a new compatible session is active; §10 status.)*
3. **Bounded migration engineering** (requires D3). One Codex engineering session receives
   a brief limited to §5 and the regression tests. All five gates apply. E2E
   only needs to show that nothing regressed, since product behavior does not
   change. *(2026-10-24: candidate written, not complete — browser gate
   interrupted, activation self-blocked; §10 status.)*
4. **Bootstrap review.** A **manual** fresh Codex reviewer session, prepared
   by the orchestrator under host authorization, runs outside the migrated
   controller:
   - an immutable disposable snapshot of the migration diff, with recorded
     fingerprints;
   - the fixed gates run by the host, with logs and exit codes handed to the
     reviewer;
   - a read-only reviewer that is not the migration engineer's session.
   FAIL leads to a separate engineering fix and then a new reviewer. The
   owner accepts the result. A local commit happens only if the owner
   requests it separately. The bootstrap scope includes the D3 Phase 6
   authority amendments. *(2026-10-24: not started.)*
5. **Pending Windows two-file repair** (`scripts/run-e2e.mjs`,
   `tests/unit/e2e-runner.test.ts`). It gets its own fresh Codex review
   using the same manual procedure, or the migrated controller once
   accepted. The disposable QA snapshot recorded in the rolling handoff
   (`docs/agent-handoff.md`) is never ready evidence while stale: QA must
   refresh and re-fingerprint it against the live worktree first. After that
   comes owner-authorized local commit (D5), which clears the clean-init
   prerequisite. No stash, discard or guard bypass.
6. **Phase 6 step 1.** First, pre-init **non-mutating** doctor-equivalent
   checks and synthetic tests only; no real `phase:init`/`phase:run` probes
   (real `phase:doctor` calls `loadState` and needs initialized state, so it
   cannot run first). Then, once the approved sources and commit paths are
   tracked and clean and actual work is authorized: real `phase:init` for
   Phase 6 (no inherited QA, review base `59c3dc9`), then real
   `phase:doctor`, then `phase:run` only if every prerequisite is green. This
   proposal work runs no phase command.

**Rollback / blocked recovery.** If the migration or its review fails: stop
the controller; preserve all uncommitted edits, logs and state; record the
failure. No automatic reset, stash, discard or checkout, and no model or
provider fallback. Any later rollback needs an explicit owner-authorized,
bounded procedure that preserves evidence. The old committed Kimi
controller remains historical; it is unusable without its restored
prerequisites and is never an automatic fallback. Never restore earlier QA
acceptance, mark anything passed, or retry an earlier phase. Old Kimi
records stay untouched.

## 8. Measurable adoption checks (migration acceptance criteria)

Each check needs actual evidence: a unit test or a recorded host command with
exit code. A prompt claim does not count.

| # | Check | Pass condition |
| --- | --- | --- |
| A1 | Fresh reviewer | Unit test: the dispatch argument list contains `exec`, `--sandbox read-only` and `--cd <disposable path>`, and no `resume` or fork. Host evidence: reviewer session ID ≠ every engineering and prior review session ID. |
| A2 | Identity evidence | Identity comes from controller launch plus CLI telemetry; a result whose session/version is missing, uncorroborated, or only reviewer-asserted is rejected. Verdict bound to invocation ID, snapshot/base and gate record. Model is CLI-reported or `not exposed`. |
| A3 | Mutation rejection | Synthetic tests: a changed tracked file, an added untracked file, a changed handoff, a Git-state change (ref/index/stash), a change outside the allowed artifact list, or real worktree drift during QA each give `blocked`. |
| A4 | Gate authority | Controller-recorded red, missing or `not-run` gate plus reviewer `pass` gives a reject. Reviewer and controller gate disagreement gives a reject. The five `requiredGates` strings are unchanged in every manifest. |
| A5 | Verdict contract | Wrong phase/step, malformed JSON, PASS with a blocking finding, FAIL without one: each is rejected (existing coverage is kept and renamed). |
| A6 | Owner gate | `phase:accept` still requires `awaiting-owner` plus an independently passed step. No path writes `ownerAcceptedThrough` from a QA result. |
| A7 | Commit safeguards | Existing `tests/unit/phase-runner.test.ts` coverage (`commitAfterQa` manifest boundaries, owner transitions) is retained. Add synthetic coverage as needed for runtime commit exclusions, protected dirty paths and empty index; no direct `commitPassedStep` runtime test exists today. The approval ledger and handoff are never staged. Owner/CI gates unchanged. |
| A8 | State compatibility | State whose digest does not match fails closed. A legacy `lastKimiResult` value is preserved, not rewritten. The Phase 2–5 manifest bytes are unchanged (hash comparison). |
| A9 | Windows host behavior | Recorded `phase:doctor`-equivalent evidence **without phase init**: `codex.exe` resolution (discovery at L264 searches an extensionless `codex`), the `npm` spawn (`runLoggedCommand('npm', …)` at L845 runs without a shell, so `npm.cmd` resolution is suspect), path handling in `safeRepositoryPath` (Git returns `C:/…` while `resolve` returns `C:\…`, so a suspected mismatch), the `node_modules` link (`symlinkSync(..., 'dir')` at L745 may need privilege), long paths, link/cache isolation, the exact hidden host npm arguments, and CRLF in the disposable checkout. These are source-reading suspicions only, not diagnosed; none has been executed. Each needs actual proof without init probes before any fix. |
| A10 | Permission respect | The reviewer and controller launches use only owner-granted permissions. Any denial yields a recorded `blocked` with no weaker retry. |
| A11 | No fallback | A failed reviewer launch or authentication gives `blocked`. A test confirms that no Kimi, engineer or other-model path is reachable. |

The five product gates, the browser matrix, mutation and captures are Phase 6
acceptance. They are not prerequisites for this proposal, and they are not
replaced by A1–A11.

## 9. Owner steering kept unchanged

The primary working preview is **2560×1440 CSS (16:9 QHD)**, even though the
physical monitor is ultrawide. Ultrawide accessibility stays. The full
matrix, including **3440×1440**, stays. The approved **1440×900**
reference/bob evidence and every reserved capture size in
`phase-6.json` stay. This proposal renders and redesigns no UI.

## 10. Owner decisions (D1–D4 approved 2026-10-24; D5 per commit)

**Approval record (agent-recorded; not an owner signature).** On 2026-10-24
the owner, Alex Xiong, wrote in the orchestration chat, verbatim:

> Approve all decisions with recommendations and then resume and continue to
> implement with Phase 6.

The orchestrator relayed it to `portfolio-design`, which recorded it here.
It approves the recommended choice of each of D1–D4 below and nothing else.
It is not a D5 commit request, final phase acceptance, a §18 owner
checkpoint, a content approval, or a waiver of any gate or proof. The
owner's intent to resume Phase 6 is retained, but it runs only after the §7
prerequisites hold; it does not override the running session's Kimi
requirement.

- **D1. Correlated-risk trade-off.** Engineering and QA may share one
  provider and model; independence comes from separate sessions and
  processes only. **Accepted** (no per-invocation model override requested).
- **D2. QA policy.** Fresh independent Codex QA as defined in §§2–4 and §6
  replaces independent Kimi QA for **future** Phase 6 reviews and explicitly
  approved outside-phase tooling reviews only (first: the pending Windows
  repair, then Phase 6 step 1). Policy only; not engineering authorization.
  **Approved.**
- **D3. Migration engineering and authority amendments** (the only decision
  that authorizes engineering). A later bounded engineering brief limited to
  §5, plus prospective amendments to the Phase 6 manifest and plan and one
  supersession note in `docs/phase-6-design.md` dated on the real amendment
  date. Historical evidence is not edited. **Approved**; not yet applied, and
  no amendment is dated before it is actually made.
- **D4. Bootstrap and instruction alignment.** The manual fresh-Codex
  bootstrap review in §7 step 4 as the independent review of the migration,
  and the §7 step 2 update of governing instruction sources, loaded in a new
  session. **Approved**; stored-source alignment done 2026-10-24 (§1);
  new-session activation pending.
- **D5. Commits.** Not included and not granted. Each local commit
  (migration, Windows repair) still needs its own separate explicit owner
  request.

**Observed state at recording (2026-10-24).** Branch `codex/phase-6-deck-hud`,
HEAD `e03ae2b`. `npm run phase:status -- --phase 6` exited 1 and reported
that Phase 6 is not initialized; no init, run, retry or accept happened. The
`scripts/run-e2e.mjs` + `tests/unit/e2e-runner.test.ts` repair is still
uncommitted and unreviewed. No migration, QA or test PASS is claimed.

**Later owner instruction (agent-recorded; not an owner signature).** Also on
2026-10-24 the owner wrote, verbatim:

> Change and fix the authorized operator to not use Kimi in any sessions.

This prohibits Kimi in every new repository session and work item: no launch,
login, probe, hook install or fallback. It does not edit historical Kimi PASS
records, does not change unrelated global user configuration, and does not
authorize running earlier phases under Codex without approved manifest
amendments. It is not a D5 commit request or a waiver.

**Instruction-source alignment (done in stored files; not active here).** The
orchestrator applied the future-session edits to
`.claude/agents/portfolio-orchestrator.md` and
`.claude/agents/portfolio-design.md` and retired
`.agents/agents/kimi-phase-qa.md`; `portfolio-design` aligned the prospective
text of the four governance documents (§5). The session that made these edits
still runs its old loaded rules, so the alignment authorizes no migration
engineering or replacement QA there. Activation requires a new compatible
session.

**Migration-candidate state (later on 2026-10-24; orchestrator-reported,
not independent QA).** This supersedes the "pending" status remarks above
without changing any decision. A new compatible orchestration session is
active. One Codex engineer thread
(`01a16fc9-2ab4-7f60-8529-bb105f84b4c5`) wrote only the eight approved §5
tooling/test/manifest paths and generated an untracked `debug.log`. Lint,
contract typecheck, contract validation and `npm run test:unit` (433 tests,
33 files) passed; `CI=true npm run test:e2e` was interrupted after more than
seven minutes in `foundation.spec.ts` (exit 1), so no complete browser PASS
exists. No phase command beyond `status` ran; nothing was committed; no
bootstrap reviewer ran; the owner has accepted nothing. At that point the
candidate's `assertMigrationActivation()` unconditionally blocked `init`,
`doctor`, `run`, `continue`, `retest`, `retry`, `accept` and `resume` until
O1/O2 proof integration plus review and acceptance (superseded below). The
candidate is **not activated or complete**. The Phase 2–5 manifests are unchanged; Phase 6 is not
initialized. `portfolio-design` then applied the D3 plan amendment note and
design supersession note (dated 2026-10-24) and these status updates; no
D1–D4 reapproval is needed, and no D5 commit was requested.

**Fixture proof and refinement (later on 2026-10-24; engineer-reported and
orchestrator-relayed, not independent QA).** The 433-test result and
interrupted E2E above remain the first engineer's earlier record. A fresh
Codex CLI session (`01a16fee-4e1a-7513-be74-a0fe2936e2eb`, CLI model
`gpt-6-astra`) ran on a sacrificial fixture only: the read succeeded, an
append was denied (EPERM), the sentinel was unchanged, exit 0, and
`--output-last-message` was written; the rollout records `approval_policy`
never, `sandbox_policy` read-only, source `exec`. Earlier scratch-probe
syntax and stdin failures are retained; no permission was weakened and no
denied launch was bypassed. Repository hooks and full both-tree integrity
are **not** certified. A bounded refinement then changed only
`scripts/phase-runner/core.ts`, `phase-runner.ts` and
`tests/unit/phase-runner.test.ts`: reviewer arguments explicitly pin
`approval_policy` never and read-only; both roles get finite stdin with EOF;
`assertMigrationActivation()` now runs operational policy checks instead of
an unconditional throw and neither records nor verifies owner acceptance or
authorizes runner use. Reported: lint, contract typecheck, contract
validation, `test:unit` (437 tests, 33 files) and `git diff --check` pass;
E2E not rerun (full trusted-host E2E still mandatory). A host snapshot clone
and isolated `npm ci` succeeded; no frozen final snapshot, five host gates or
independent bootstrap QA exist. Real phase use stays prohibited until the
remaining proofs, five green host gates, a fresh manual independent Codex
bootstrap review and genuine owner acceptance; each commit is separately
requested (D5). Nothing here is QA, acceptance or owner consent.

## 11. Open technical proofs and risks

- **O1.** Codex 0.164 on Windows: whether `--sandbox read-only` actually
  blocks writes while still allowing reads and the `--output-last-message`
  write. *Status 2026-10-24:* shown on a sacrificial fixture only (§10);
  repository hooks and full both-tree integrity remain unproven.
- **O2.** Which approval-policy setting makes reviewer escalation impossible
  without the client denying it (the client previously denied
  `approval_policy="never"` from Claude Code). The same denial may also
  affect the engineering dispatch at L911. *Status 2026-10-24:* the fixture
  rollout records `approval_policy` never and the launch exited 0 (§10); not
  yet shown for the full-snapshot reviewer path.
- **O3.** Whether the JSONL exposes session/thread ID, resume markers and
  model.
- **O4.** Whether gate caches reached through the `node_modules` link can
  write into the main checkout. If they can, switch to a fixed controller
  `npm ci` in the snapshot.
- **O5.** The A9 Windows suspicions.

Risks:
- Same-model reviewers can share blind spots (D1).
- QA consumes Codex subscription quota. Shared quota is not unlimited and
  not free of cost.
- Controller-run gates make the controller part of the trusted computing
  base.

**Next role:** the orchestrator in the active compatible session: host
O1/O2 proofs and their integration into the candidate (a separate bounded
engineering turn), a complete host browser gate, and evidence for the other
open proofs; then a fresh read-only Codex bootstrap reviewer (§7 step 4) →
owner acceptance → Windows-repair review → Phase 6 step 1. O1–O5 and A1–A11
stay open until proven; the runner stays blocked until the migration is
owner-accepted. The owner is needed again only for each D5 commit request,
bootstrap result acceptance, and the existing Phase 6 checkpoints; D1–D4 are
not re-requested. *(Superseded next-role text, 2026-10-24 before the new
session: start a new compatible session, then §7 steps 3–6.)*
