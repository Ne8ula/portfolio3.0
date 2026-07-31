# Phase runner — automated Codex ↔ Kimi delivery

The phase runner automates the approved engineering/QA loop after Claude's
design work and any required owner decision are complete:

`Codex implementation → fresh Kimi QA → Codex fix ↔ fresh Kimi retest`

The runner does not control either VS Code chat panel. It starts separate,
non-interactive CLI sessions using Codex `exec` and Kimi print mode, while the
repository remains the communication and source-of-truth layer.

## Current initialization

Phase 2 Steps 0–2 have independent Kimi PASS reports. The owner accepted Step 2
on 2026-07-31, so the Phase 2 manifest initializes at **Step 3**. A Step 3 PASS
automatically advances to Step 4. A final Step 4 PASS stops in
`complete-awaiting-owner-ci`; the runner never commits, pushes, merges, deploys,
or grants final acceptance.

The versioned manifest is
`scripts/phase-runner/manifests/phase-2.json`. It translates
`docs/phase-2-design.md` §12 into bounded work packages. The manifest—not either
agent's generated prose—chooses the next step.

## Commands

Initialize once:

```sh
npm run phase:init
```

Inspect the current cursor:

```sh
npm run phase:status
```

Review both generated prompt templates without launching an agent or changing
state:

```sh
npm run phase:dry-run
```

Validate both CLI installations, structured-output files, local state, and an
exact disposable QA snapshot without calling either model:

```sh
npm run phase:doctor
```

Run continuously until PASS advances the phase, QA returns BLOCKED, the retry
limit is reached, a tool/environment failure occurs, or the phase completes:

```sh
npm run phase:run
```

Request a pause from another terminal. A running agent is allowed to finish so
its work and report are not truncated; the controller stops before the next
agent:

```sh
npm run phase:pause
npm run phase:resume
```

After resolving an authentication, environment, or owner/design blocker,
explicitly make the same step runnable again:

```sh
npm run phase:retry
npm run phase:run
```

`retry` never advances the step and preserves any Kimi findings.

If Codex completed but its saved structured result was rejected or its only
red gate was a sandbox-denied localhost bind, continue without repeating the
Codex turn:

```sh
npm run phase:continue
```

The controller validates the saved result against the active manifest step. If
the only failure is `listen EPERM` for E2E, it runs the fixed
`CI=true npm run test:e2e` command itself, outside the model sandbox. A green
host gate proceeds directly to fresh Kimi QA; any real browser failure remains
blocking.

After the final step has passed, owner-approved amendments make the previous QA
verdict stale. Launch only a fresh independent Kimi review of the complete live
snapshot without repeating the completed Codex implementation:

```sh
npm run phase:retest
```

`retest` is accepted only from `complete-awaiting-owner-ci`. It treats the
saved Codex result as historical context, starts Kimi in a new disposable
checkout, and reruns all five gates. PASS restores
`complete-awaiting-owner-ci`; FAIL returns the same step to Codex with the new
findings and bounded retry count. Run it only after the owner approves sending
the updated snapshot to Kimi.

## Safety and independence

- An atomic lock under `.agent-runs/` enforces one controller writer.
- Codex alone writes to the real worktree with a workspace-write sandbox.
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

If the process is interrupted, run `npm run phase:status`. A status of
`blocked` contains the failure reason; resolve it and use `phase:retry`. A hard
interrupt may leave `codex-running` or `qa-running` plus a lock. Recover only
after confirming the recorded process is no longer active:

```sh
npm run phase:recover
```

`recover` validates that the recorded PID is dead before removing the exact
runner lock, resets the same step to `ready`, and never advances or discards the
live diff. It refuses malformed or live locks rather than risking two writers.

If the versioned manifest changes after initialization, the runner refuses to
continue. Reconcile the manifest and local state deliberately instead of
silently reinterpreting completed work.
