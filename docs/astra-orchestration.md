# Astra orchestration in Claude Code

GPT-6 Astra runs in the Claude Code client through Eigenwise Model Gateway,
a community integration, not an Anthropic-supported non-Claude backend.
The website has no runtime dependency on that gateway.

## One policy

**AGENTS.md is the single workflow authority.** The owner directed this
prospective documentation-only consolidation on 2026-10-28. This companion
covers roles and setup, not additional phase gates. Phase documents remain
roadmap/reference; docs/agent-handoff.md remains the rolling task record.
The runner/migration stays shelved, unaccepted and unactivated. Historical
records below are preserved verbatim, not prospective launch instructions.

Use AGENTS.md for the task loop, procedural supersession, quality requirements,
permission boundaries and owner checkpoints. No Kimi. This simplification
neither accepts a failed candidate nor reseals an old alignment manifest.

## Configured roles and manual foreground startup

| Role | Client / role | Scope |
| --- | --- | --- |
| Orchestrator | Claude Code / portfolio-orchestrator / GPT-6 Astra | Brief, delegate, inspect evidence, handoff |
| Design | Claude Code / portfolio-design / GPT-6 Astra | Exploration, critique and assigned design documents |
| Engineering | Separate Codex CLI session by default | Bounded work; honor specific owner role/model assignments |
| Independent QA | NEW read-only Codex CLI process/session | Exact work and fresh host checks; never self-review |

These are configured roles, not runtime identity proof. Invoke portfolio-design
by name without a model override. One writer per worktree; design is not an
implementation or independent-QA substitute.

After stored sources are aligned, the owner can exit portfolio chats normally
and open a NEW foreground PowerShell window:

```powershell
Set-Location 'C:UsersalexxDocumentsportfolio3.0'
claude --agent portfolio-orchestrator
```

Do not resume/continue an old session to load replacement instructions. A model
switch or plugin reload alone does not reload the role prompt. Do not stop
preview servers, reset Git or change permissions just to restart.

First request: read AGENTS.md, CLAUDE.md, the stored orchestrator profile and
latest handoff; inspect primary Git status/diff read-only, report loaded-rule
conflicts, then wait. No diagnostics, agents, phase commands or writes belong
to that startup. A new launch is not itself proof of compatibility; stored
edits never override higher-priority rules already loaded. This editing
session launches nothing.

## Setup reference (not a startup checklist)

Use only for separately requested setup/repair. Ordinary task startup does not
install plugins, authenticate, change wiring or run doctor.

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

Codex keeps its authenticated default model unless a specific owner task
assignment says otherwise. Choosing Astra changes no worker model. The shelved
runner is not the active workflow; never use legacy PHASE_RUNNER_KIMI settings.

## Troubleshooting only when requested

Setup history/model discovery is not proof of a later runtime session.
Actual engineering/review follows AGENTS.md's evidence requirements, never
model self-identification. Read-only planning needs no connectivity, host
identity or custody diagnostic.

A separately requested repair stays within its exact scope and existing
permissions. Stop on denial; no alternate tool/route, sandbox bypass or Kimi
fallback. Preserve the exact error for the owner/client support controls.
Do not change shared gateway wiring or stop services incidentally. The sources
below are reference, not authority to execute a repair.

## Historical records

The dated records below are preserved evidence. Their Kimi probes, logins and
QA verdicts are historical and authorize no new Kimi use.

## Maintenance verification — 2026-10-21

- Refreshed the Eigenwise marketplace and updated the project-scoped Model
  Gateway plugin from 0.51.2 to 0.55.1. Its supported `setup` command downloaded
  proxy 0.1.45 (previously 0.1.40) and verified the archive SHA-256 before
  installation. Claude Code's updater confirmed 2.1.306 is current.
- Setup replaced the old supervisor through the plugin lifecycle commands.
  The October 14 port-conflict record is historical: the final doctor reports
  an owned 0.55.1 router, authenticated proxy, 29 live model rows, matching
  discovery cache, and passing model-ID comparison. Discovery briefly used
  the fallback catalog during startup, then recovered to the proxy catalog.
- Setup installed project-local SessionStart and UserPromptSubmit readiness
  hooks and refreshed native Claude pins to Opus 5.5 and Sonnet 5.5. Both
  readiness hooks returned exit 0 against the healthy router. Permissions,
  the `portfolio-orchestrator` default, and its Astra model remain intact.
- This installation had no saved context policy. After the update, doctor
  reports the current default Codex cap of 272000 and compaction past 187000;
  before the update Astra advertised 920000 with a sentry trigger of 880012.
  No custom context policy was written. Native Claude retains its full window.
- Isolated synthetic CLI probes passed with fallback disabled only for those
  processes: Astra read a generated temporary fixture and returned
  `ASTRA_GATEWAY_OK ALPHA-731`; Opus 5.5 returned `CLAUDE_GATEWAY_OK`; Sonnet 5.5
  returned `SONNET_GATEWAY_OK`. Gateway route metadata independently records
  `gpt-6-astra` on Codex and the two native models on Anthropic. These probes
  used no repository content and allowed no edits or delegation.
- Agent definitions validate; project settings parse; `git diff --check`
  passes. No rendered UI or application code changed, so product gates and
  browser E2E were not rerun. No phase workflow or independent Kimi QA ran.
  Codex/Kimi installations were not updated; Grok remains unused and lacks
  authentication. No outage, reboot, or long-context fault injection was run.
- Fully restart existing Claude Code processes in this project to load the
  updated plugin, hooks, native pins, and model picker. A plugin reload alone
  is insufficient. This verifies current connectivity, not immunity to future
  provider outages, rate limits, authentication expiry, or gateway bugs.

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
