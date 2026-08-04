# Phase runner — automated Codex ↔ Kimi delivery

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

## Commands

Every command defaults to Phase 2 for compatibility. Select Phase 3 with
`-- --phase 3`.

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
