# Phase runner — Codex engineering ↔ fresh Codex QA (migration candidate, BLOCKED)

> **BLOCKED — do not execute engineering or QA paths.** On 2026-10-24 the
> owner prohibited Kimi in every repository session. A Codex-QA migration
> candidate of `scripts/phase-runner/` now exists in the worktree, but it is
> uncommitted, not bootstrap-reviewed, not owner-accepted and not activated
> (below). Until the remaining repository-hook/full-snapshot proofs, five
> green host gates on a frozen snapshot, a manual independent bootstrap review
> (`docs/codex-qa-proposal.md` §7 step 4) and owner acceptance, do not run `phase:init`, `phase:doctor`, `phase:run`,
> `phase:continue`, `phase:retest`, `phase:retry` or `phase:accept` (nor
> `phase:resume`), and never install Kimi hooks, log in, probe, or use
> `PHASE_RUNNER_KIMI_*`. Read-only `phase:status` inspection remains allowed.
> Nothing in this document is an authorized runnable example.
>
> Remaining prerequisites, in order: host O1/O2 proofs beyond the sacrificial
> fixture (repository hooks, both-tree integrity) and review of their
> integration into the candidate; host verification of the remaining open
> proofs (O3–O5, A1–A11) as the proposal requires; a separate fresh read-only
> Codex bootstrap reviewer with host-run fixed gates on an exact disposable
> snapshot and verified session/Git integrity; owner acceptance of that
> result; each local commit separately requested (D5). Historical Phase 2–5
> manifests still require Kimi and block prospective execution or retest
> unless separately amended and approved; they never run under Codex QA.
>
> The legacy Kimi sections further below are **historical reference only**.
> Their commands and "fresh Kimi QA" steps are not instructions to execute and
> cannot authorize Kimi. Historical Kimi PASS records stay historical. The
> candidate updates the `scripts/agent-handoff.mjs` header text to the Codex
> route; until accepted, any Kimi route still shown in `docs/agent-handoff.md`
> is not authority to invoke Kimi.

## Migration candidate status (2026-10-24, not activated)

A new compatible orchestration session is active. One Codex engineer thread
(`01a16fc9-2ab4-7f60-8529-bb105f84b4c5`) wrote only the eight approved
tooling/test/manifest paths and generated an untracked `debug.log`. Reported
results: lint, contract typecheck, contract validation and `npm run
test:unit` (433 tests, 33 files) passed; `CI=true npm run test:e2e` was
interrupted after more than seven minutes in `foundation.spec.ts` with exit 1,
so there is **no complete browser PASS**. No phase command beyond `status`
ran, nothing was committed, and no bootstrap reviewer or owner acceptance
exists. These are engineering-reported results, not independent QA. Phase 6
is not initialized; the Phase 2–5 manifests are unchanged.

Later the same day (engineer-reported and orchestrator-relayed, not QA): a
fresh Codex CLI session `01a16fee-4e1a-7513-be74-a0fe2936e2eb` proved on a
sacrificial fixture only that `--sandbox read-only` allows reads, denies an
append (EPERM, sentinel unchanged), exits 0 and still writes
`--output-last-message`; its rollout records `approval_policy` never,
`sandbox_policy` read-only, source `exec`. Repository hooks and full
both-tree integrity are **not** certified; earlier scratch-probe syntax and
stdin failures stay on record. A bounded refinement then changed only
`core.ts`, `phase-runner.ts` and `phase-runner.test.ts`: lint, contract
typecheck, contract validation, `test:unit` (437 tests, 33 files) and
`git diff --check` reported passing; E2E was not rerun, so the earlier
interrupted E2E stands and a full trusted-host E2E remains mandatory. A host
snapshot clone and isolated `npm ci` succeeded; no frozen final snapshot,
five host gates or independent QA exist yet.

Intended candidate behavior, from reading the source (not host-certified):

- **Activation checks.** `assertMigrationActivation()` in
  `scripts/phase-runner/phase-runner.ts` runs operational policy checks for
  `init`, `doctor`, `run`, `continue`, `retest`, `retry`, `accept` and
  `resume`. It neither records nor verifies owner acceptance and authorizes
  no runner use; real phase use stays prohibited by governance until the
  prerequisites above are met.
- **QA authority.** `assertQaAuthority` rejects any manifest other than
  Phase 6, any manifest mentioning Kimi, and any `requiredGates` list other
  than the five fixed commands in order.
- **Engineering.** Codex `exec --sandbox workspace-write` in the real
  worktree, as before; Codex never stages or commits.
- **Fresh reviewer.** A new `codex exec --sandbox read-only --json
  --output-schema scripts/phase-runner/schemas/qa-result.schema.json
  --output-last-message <file under .agent-runs> --cd <disposable checkout>`
  with the approval policy explicitly pinned to `never` and finite stdin
  (EOF) for both roles; no resume, fork or model fallback.
- **Trusted-host gates.** In the disposable checkout the controller runs a
  fixed `npm ci`, then exactly the five `requiredGates` with `CI=true`,
  recording exit codes and log SHA-256 values. Only controller exit codes
  count; a reviewer gate table that disagrees is rejected.
- **Identity.** Executable path and `--version` from the controller's own
  launch, corroborated by the session ID in the CLI JSONL; a session equal to
  any engineering or earlier review session is rejected. The reviewer's own
  claims are never identity evidence. Role label: "Independent QA: Codex
  (fresh session)".
- **Integrity and binding.** Source, handoff, dependency and Git-state
  fingerprints of both the snapshot and the real worktree are checked before,
  during and after review; the verdict binds the invocation ID, snapshot,
  base `59c3dc9`/HEAD and gate record. Any mismatch blocks.

Unchanged: the state machine, `maxFixAttempts`, the lock, `awaiting-owner`,
`phase:accept`'s owner-gate requirement, controller-only commits from
`commitAfterQa.paths`, and the exclusion of the approval ledger and handoff.
O1–O5 and A1–A11 are open; none is host-certified by this document.

## Legacy Kimi reference (historical, inactive)

Every section from here to the end describes the legacy Kimi controller as
historical reference, except the two Phase 6 paragraphs at the start of
"Commands", which state current policy. None of it authorizes execution.

The phase runner automates the approved engineering/QA loop after Claude's
design work and any required owner decision are complete:

`Codex implementation → fresh Kimi QA → Codex fix ↔ fresh Kimi retest`

The runner does not control either VS Code chat panel. It starts separate,
non-interactive CLI sessions using Codex `exec` and Kimi print mode, while the
repository remains the communication and source-of-truth layer.

## Versioned phase manifests

Phase 2 Steps 0–2 have independent Kimi PASS reports. The owner accepted Step 2
on 2026-07-31, so the Phase 2 manifest initializes at **Step 3**. A Step 3 PASS
automatically advances to Step 4. A final Step 4 PASS stops in
`complete-awaiting-owner-ci`.

`scripts/phase-runner/manifests/phase-2.json` translates
`docs/phase-2-design.md` §12 into bounded work packages. The manifest—not either
agent's generated prose—chooses the next step.

`scripts/phase-runner/manifests/phase-3.json` translates the nine approved
`docs/phase-3-design.md` §9 implementation steps into four automation packages:

1. sizing (design Steps 1–3) → independent QA → commit 1;
2. lifecycle/recovery/tests (Steps 4–6) → independent QA → commit 2;
3. baseline tooling/software evidence (Step 7) → independent QA → explicit
   owner hardware + `about:gpucrash` checkpoint; and
4. contracts/docs/full evidence (Steps 8–9) → independent QA → commit 3.

The Phase 3 controller creates each local commit only after a fresh Kimi PASS
and only from the paths declared by that step's manifest. It never pushes,
merges, deploys, or grants final owner/CI acceptance. The Codex child does not
receive permission to write protected `.git` metadata.

## Commands (legacy reference — blocked, see banner)

Phase 6 QA-provider status (2026-10-24): the owner-approved D3 amendments are
applied in the uncommitted, unaccepted candidate manifest, in the
`docs/phase-6-plan.md` amendment note and in the `docs/phase-6-design.md`
supersession note; every Phase 6 review is fresh independent Codex QA. Phase 6
still cannot initialize or run (banner above).

Phase 6 setup is prepared in `scripts/phase-runner/manifests/phase-6.json`
and `docs/phase-6-plan.md`; it has not initialized or executed a phase.
Setup verification passed: all four setup gates and `git diff --check`
were rerun successfully after the empty duplicate type-directory repair.
That plan preserves the original failure and exact repair/rerun evidence.
The design preconditions are owner-approved (2026-10-09). The setup review
is not waived; it requires a fresh independent Codex reviewer (plan
amendment note). Once every banner prerequisite holds, Phase 6 is selected
with an explicit phase argument. Step 1 groups all five design §19 items,
complete tests/docs/capture preparation and fresh independent Codex QA, then
stops at `awaiting-owner` without a commit. The orchestrator must verify a genuine
owner-authored dated `docs/baselines/phase-6-deck/OWNER-CHECKPOINT.md` against
the plan's evidence protocol before `phase:accept -- --phase 6`. Agents may
prepare an unfilled template only. The controller checks sequencing, not
owner identity/evidence. Step 2 verifies that evidence again, reruns all five
gates and fresh independent Codex QA, then permits the single bounded local delivery
commit. Missing/stale approval blocks delivery; neither the checkpoint nor
the commit grants final CI/release acceptance. No captures are made in setup.

**Historical legacy examples (Phase 3, Kimi era) — not authorized.** The
command blocks below record how the legacy controller was operated. The
candidate rejects every non-Phase-6 manifest and is not activated; never run
them as written. Every command defaults to Phase 2 for compatibility.

Initialize once after the selected manifest and its design source are tracked
and clean:

```sh
npm run phase:init -- --phase 3
```

Inspect the current cursor:

```sh
npm run phase:status -- --phase 3
```

Review both generated prompt templates without launching an agent or changing
state:

```sh
npm run phase:dry-run -- --phase 3
```

Validate both CLI installations, structured-output files, local state, and an
exact disposable QA snapshot without calling either model:

```sh
npm run phase:doctor -- --phase 3
```

Run continuously until PASS advances the phase, QA returns BLOCKED, the retry
limit is reached, a tool/environment failure occurs, or the phase completes:

```sh
npm run phase:run -- --phase 3
```

Request a pause from another terminal. A running agent is allowed to finish so
its work and report are not truncated; the controller stops before the next
agent:

```sh
npm run phase:pause -- --phase 3
npm run phase:resume -- --phase 3
```

Phase 3 stops in `awaiting-owner` after Step 7 QA. After the owner records and
certifies both the hardware DPR capture and the one-time `about:gpucrash`
recovery result, explicitly accept that checkpoint and resume:

```sh
npm run phase:accept -- --phase 3
npm run phase:run -- --phase 3
```

`phase:accept` cannot bypass Kimi: it works only when the current manifest step
has independently passed and declares an owner gate. It records acceptance of
the checkpoint and advances to the next canonical step.

After resolving an authentication, environment, or owner/design blocker,
explicitly make the same step runnable again:

```sh
npm run phase:retry -- --phase 3
npm run phase:run -- --phase 3
```

`retry` never advances the step and preserves any Kimi findings.

If Codex completed but its saved structured result was rejected or its only
red gate was a sandbox-denied localhost bind, continue without repeating the
Codex turn:

```sh
npm run phase:continue -- --phase 3
```

The controller validates the saved result against the active manifest step. If
the only failure is `listen EPERM` for E2E, it runs the fixed
`CI=true npm run test:e2e` command itself, outside the model sandbox. A green
host gate proceeds directly to fresh Kimi QA; any real browser failure remains
blocking.

The argument-free `CI=true` E2E gate runs every `e2e/*.spec.ts` file
sequentially in a fresh Playwright process. This preserves the complete test
inventory, CI retries, and failure artifacts while preventing a software-WebGL
stall in one file from contaminating the next file's Chromium process.
Explicitly targeted commands and ordinary local `npm run test:e2e` runs still
delegate directly to Playwright. Set `E2E_ISOLATE_FILES=1` to opt in manually
or `E2E_ISOLATE_FILES=0` to diagnose the legacy single-process path.

After the final step has passed, owner-approved amendments make the previous QA
verdict stale. Launch only a fresh independent Kimi review of the complete live
snapshot without repeating the completed Codex implementation:

```sh
npm run phase:retest -- --phase 3
```

`retest` is accepted only from `complete-awaiting-owner-ci`. It treats the
saved Codex result as historical context, starts Kimi in a new disposable
checkout, and reruns all five gates. PASS restores
`complete-awaiting-owner-ci`; FAIL returns the same step to Codex with the new
findings and bounded retry count. Run it only after the owner approves sending
the updated snapshot to Kimi.

## Safety and independence

- An atomic lock under `.agent-runs/` enforces one controller writer.
- Codex is the only model allowed to edit the real worktree, and it runs with
  a workspace-write sandbox.
- Codex never stages or commits. For manifest steps with `commitAfterQa`, the
  trusted controller records a local commit only after Kimi PASS.
- Automatic commits require a clean index, a tracked/clean manifest and design
  source, and initially clean phase-owned paths. The controller subtracts the
  initialization-time dirty set, verifies those owner files remain byte-stable
  across every Codex turn, rejects every path outside the step allowlist, and
  never stages `content/portfolio-approvals.json`,
  `docs/agent-handoff.md`, or `.agent-runs/`.
- Codex receives the approved step scope, the live handoff/diff, and only the
  findings for the same step.
- Required browser tests that cannot bind localhost inside Codex's sandbox are
  run by the trusted controller as a fixed command. Codex is not granted
  danger-full-access or unrestricted network access.
- Kimi starts in a fresh disposable Git checkout containing the complete live
  tracked and untracked diff. The real worktree is fingerprinted before and
  after QA.
- Kimi's custom agent profile has `Read`, `Grep`, `Glob`, `ReadMediaFile`, and
  `Bash`, but no `Write`, `Edit`, web, or sub-agent tools. Bash is retained for
  the five mandatory gates.
- Any Kimi write outside ignored test/build artifacts blocks the run.
- Every Codex fix receives a new Kimi session. Neither agent session is
  resumed.
- PASS is rejected when a required gate is missing/red or a blocking finding
  remains.
- Kimi may supply verified `nextContext`, but the runner ignores it for
  sequencing.
- Three failed QA/fix cycles block the step for owner intervention.
- `content/portfolio-approvals.json` remains owner-only.

The local state, structured results, and JSONL logs live under `.agent-runs/`
and are ignored by Git. The rolling `docs/agent-handoff.md` remains the shared,
human-readable communication record.

## CLI and model configuration

The runner uses the authenticated CLI defaults. This preserves the model
selected in the user's Codex and Kimi configuration rather than hard-coding an
unstable provider alias.

For Codex, an explicit binary override wins first. Otherwise the runner uses a
working `codex` from `PATH`; if Terminal does not expose one, it discovers the
newest working Codex binary bundled with VS Code, VS Code Insiders, or Cursor.
Kimi similarly falls back to `~/.kimi-code/bin/kimi`.

Optional per-invocation overrides:

```sh
PHASE_RUNNER_CODEX_BIN=/absolute/path/to/codex
PHASE_RUNNER_KIMI_BIN=/absolute/path/to/kimi
PHASE_RUNNER_CODEX_MODEL=<configured-codex-model>
PHASE_RUNNER_KIMI_MODEL=<configured-kimi-model>
```

Codex is called with `--sandbox workspace-write`,
`approval_policy="never"`, JSONL event output, and the versioned JSON output
schema. Kimi is called with `--agent-file .agents/agents/kimi-phase-qa.md` and
`--output-format stream-json`.

Do not use a lifecycle Stop hook as the state machine. Hooks continue to
capture handoffs; the runner owns locking, structured validation, retries, and
agent launch.

## Recovery

If the process is interrupted, run `npm run phase:status -- --phase N`. A status of
`blocked` contains the failure reason; resolve it and use `phase:retry`. A hard
interrupt may leave `codex-running` or `qa-running` plus a lock. Recover only
after confirming the recorded process is no longer active:

```sh
npm run phase:recover -- --phase 3
```

`recover` validates that the recorded PID is dead before removing the exact
runner lock, resets the same step to `ready`, and never advances or discards the
live diff. It refuses malformed or live locks rather than risking two writers.

If the versioned manifest changes after initialization, the runner refuses to
continue. Reconcile the manifest and local state deliberately instead of
silently reinterpreting completed work.
