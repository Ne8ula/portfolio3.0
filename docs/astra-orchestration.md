# Astra orchestration in Claude Code

This repo supports GPT-6 Astra as the coordinator inside the Claude Code CLI
through Eigenwise Model Gateway. This is a community integration, not an
Anthropic-supported non-Claude backend. The website has no runtime dependency
on the gateway. No Sidequest or second task controller is installed.

## Roles and launch

| Role | Runtime | Responsibility |
| --- | --- | --- |
| Orchestrator | Claude Code, `portfolio-orchestrator`, `claude-gpt-6-astra[1m]` | Plan, delegate, inspect evidence, supervise approved phase runs |
| Design | Claude Code, `portfolio-design`, native `opus` alias | Design exploration, critique, criteria, assigned design documents |
| Engineering | Codex CLI through the existing phase runner | Approved implementation and fixes |
| Independent QA | Kimi Code CLI through the existing phase runner | Review the disposable live-diff snapshot and run required checks |

From the repository root, start a **new** CLI process:

```sh
claude --agent portfolio-orchestrator
```

The named agent carries the Astra model and orchestration instructions. This
explicit launch also works without changing the user's global defaults. Use
`claude --agent portfolio-design` for a dedicated design session. Do not run
two writing sessions in this checkout. A normal `/model` switch changes the
model, not the active role or the phase's approval requirements.

This machine's local `agent` setting is `portfolio-orchestrator`, so a fresh
`claude` command in this repo selects it too. If Claude Code displays its
workspace trust dialog on first interactive launch, review and accept it to
activate the repo's permission rules. The automated smoke test used explicit
read-only tool permissions without changing the workspace trust record.

The orchestrator's native Agent tool is restricted to `portfolio-design`.
Engineering and Kimi QA remain separate CLI sessions managed by the existing
controller, not Claude subagents pretending to be those clients. The design
agent has no Bash or delegation tools and is instructed to write only assigned
design documents. These prompts complement the existing permission controls;
they are not an operating-system filesystem sandbox.

Read `AGENTS.md` and `docs/phase-runner.md`. Check the selected phase's status
before running it. Every phase command defaults to Phase 2, so always provide
`-- --phase N`. Never use run/init/retry/accept as connectivity checks. Final
owner/CI acceptance and protected content approvals stay owner-only.

At setup, Phase 5 is `complete-awaiting-owner-ci`. There is a Phase 6 design
document but no Phase 6 runner manifest. Do not launch an earlier manifest or
start Phase 6 implementation to bypass that gap. Verify live status each time.

## Installation and local wiring

Shared `.claude/settings.json` declares the marketplace and enabled plugin.
On another machine, install and activate it inside Claude Code:

```text
/plugin marketplace add Eigenwise/eigenwise-toolshed
/plugin install model-gateway@eigenwise-toolshed --scope project
/reload-plugins
/model-gateway:model-gateway
```

Ask it to set up Model Gateway for this project. Complete ChatGPT browser
authorization if requested, then run setup again. Fully restart Claude Code
after project wiring; reloading plugins alone does not refresh process
settings and the model picker. The gateway's stable launcher is:

```sh
node ~/.claude/model-gateway/model-gateway.js setup
node ~/.claude/model-gateway/model-gateway.js doctor
```

Setup verifies the proxy download checksum. Never bypass a failed verification.
It writes the loopback endpoint and discovery settings to
`.claude/settings.local.json`. **This repo already tracks that file**, so local
routing changes appear in Git: review them as machine-specific settings and
never add tokens, OAuth credentials, or gateway control secrets. Authentication
and gateway binaries remain in the user's home directory. Existing local
permission rules are preserved.

The `[1m]` alias avoids Claude Code's smaller unknown-model context assumption;
it does not promise a million-token backend limit. Keep gateway defaults unless
there is a measured reason to change them. Do not enable remote-control
compatibility, modify hosts files, or patch Claude Code. The CLI is the intended
entry point; Desktop and editor integration are not certified by this setup.

Codex and Kimi keep their authenticated CLI default models. The runner already
supports per-invocation `PHASE_RUNNER_CODEX_MODEL` and
`PHASE_RUNNER_KIMI_MODEL`; choosing Astra for the coordinator does not change
either worker's model. Kimi's login is independent of the gateway login.

## Verification and recovery

Plugin installation and model discovery alone do not prove inference works.
Verify a fresh Astra CLI response, a tool call, and delegation to the native
Claude design agent. Verify Codex and Kimi independently before phase work.
Record actual CLI/transcript and gateway route metadata; do not accept a
model's self-identification as backend evidence.

```sh
claude plugin list --json
claude plugin validate .claude/agents
node ~/.claude/model-gateway/model-gateway.js doctor
npm run phase:status -- --phase 5
```

Use the current approved phase number for phase status/doctor. The phase
runner's doctor verifies the disposable QA snapshot and CLI executables; it
does not make model requests. Project hooks capture client identity separately
from the exposed model. Claude Code's Stop hook reads bounded assistant-model
metadata from its transcript when the payload omits the model; unavailable
metadata is explicitly `not exposed`.

For gateway auth failure, use `login`, complete browser authorization, and run
`setup` again. For Kimi's invalid authorization grant, run `kimi login`.
Missing Astra may indicate an old proxy: Astra requires proxy 0.1.36 or newer.
Use `setup` to update; do not fabricate model catalog entries.

To return this project to direct Anthropic access, remove gateway wiring before
uninstalling and start a fresh design/default session:

```sh
node ~/.claude/model-gateway/model-gateway.js env --remove
claude plugin disable model-gateway@eigenwise-toolshed --scope project
claude --agent portfolio-design
```

If a local `agent` default was set to `portfolio-orchestrator`, remove that key
from `.claude/settings.local.json` when reverting. Preserve unrelated keys.
Do not stop a shared gateway while another project is using it.

## Verification record — 2026-09-17

- Installed Model Gateway 0.51.2 and checksum-verified proxy 0.1.40.
- Claude Code 2.1.263; Codex CLI 0.153.4; Kimi Code 0.36.0.
- ChatGPT gateway authorization succeeded; Kimi's stale grant was renewed.
- Gateway doctor: authenticated, 21 model rows, correct project-local wiring,
  matching live model IDs, normal loopback mode. Grok is not configured or used.
- Fresh CLI smoke test: Astra read repository instructions, invoked
  `portfolio-design`, received its DESIGN.md palette answer, and returned
  `ASTRA_ORCHESTRATION_READY`. The gateway route log independently recorded
  `gpt-6-astra` on the Codex backend and `claude-opus-5` on Anthropic.
  Shell and editing tools were disabled. One Grep call was denied by the
  deliberately narrow test allowlist; the design agent completed with Read.
- Separate authenticated Codex and Kimi probes returned their expected markers.
- A fresh `claude` process with no `--agent` or `--model` override selected
  `claude-gpt-6-astra[1m]` and returned `DEFAULT_ORCHESTRATOR_READY` without tool
  calls, confirming this machine's local default. Codex's existing model is
  `gpt-6-astra`; Kimi's existing alias is `kimi-code/kimi-for-coding`.
- Phase 5 runner doctor passed CLI and exact disposable-snapshot checks. An
  initial attempt overlapped gateway settings writes and failed snapshot
  equality; it passed after configuration stopped changing. No phase ran.
- Agent definitions validated. Lint, contract typecheck/validation, and all
  388 unit tests passed, including three new handoff attribution tests.
- Browser E2E was not run: this change is agent tooling and documentation,
  with no rendered UI/application changes. Pre-existing Next dependency edits
  remain outside this setup's verification scope.
- Independent Kimi review: PASS for tooling scope, no blocking findings; it
  reran all four applicable gates and agent-definition/JSON validation in a
  disposable snapshot. Its report is captured in `docs/agent-handoff.md`.
  The pre-existing CLAUDE.md length overrun remains a future documentation task.
  This is not owner/CI acceptance of a product phase.

## Sources

- [Model Gateway setup and limitations](https://eigenwise.github.io/eigenwise-toolshed/getting-started/model-gateway/)
- [Claude Code custom agents](https://code.claude.com/docs/en/sub-agents)
- [Anthropic gateway support boundary](https://code.claude.com/docs/en/llm-gateway)
