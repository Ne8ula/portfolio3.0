# AGENTS.md — rules for coding agents in this repository

Single repository workflow policy for compatible agents. `CLAUDE.md`, role
profiles and `docs/astra-orchestration.md` refer here, not to separate controllers.

## Orientation

This is Alex Xiong's "Editorial Cockpit" portfolio: boot terminal → warp →
first-person 3D desk of interactive artifacts. Next.js 16 App Router
(Turbopack), React 19, Tailwind v4 tokens. The 3D scene is **imperative
three.js** (`components/cockpit/`) — **NO React Three Fiber, NO WebGPU/TSL**;
do not convert or introduce either. Design reference: `DESIGN.md`. Technical
layout/content contract reference: `docs/responsive-system.md`. Full plan:
`docs/hud-responsive-layout-plan.md`.

## One task workflow

**Owner-directed consolidation, 2026-10-28; prospective.** This is the single
workflow policy. CLAUDE.md is the current-state map; role profiles and
docs/astra-orchestration.md point here. Use one roadmap,
docs/hud-responsive-layout-plan.md, and one rolling docs/agent-handoff.md.
Stored edits require a NEW compatible session and never override a running
session's higher-priority instructions. Report conflicts; do not bypass them.
This documentation alignment grants no product approval, acceptance or launch.

### Plans are not controllers

For new compatible tasks, this policy supersedes procedural routing in the
roadmap, docs/phase-*.md, runner manifests, docs/codex-qa-proposal.md and
docs/visual-first-amendment.md. Manifest readiness, phase initialization and
advancement, fixed controller retries/commits, numerical ordering, runner-only
engineering and outside-phase routing exceptions no longer select ordinary
tasks. The runner/migration is shelved, not accepted or activated; no phase
command or migration completion is an ordinary-task prerequisite.

Keep phase plans as outcomes, technical dependencies and product criteria.
Preserve historical evidence, owner scope/model assignments, protected content,
and visual/hardware/baseline owner checkpoints. No deferred feature is approved.
Recovery requirements protect affected artifacts, not unrelated tasks. Never
import, normalize or trust a candidate with unresolved source/Git integrity.
Preserve its trees/evidence; no Git commands in either original recovered tree.
The 8A custody BLOCKED verdict and fdce-to-0c27 index gap remain unresolved.
Old hash manifests cover original bytes; never rewrite them to certify new text.

### One bounded task

Task -> design/owner decisions where needed -> one engineer -> tests -> fresh
independent read-only Codex review -> owner commit/publication decision.

- Orchestrator: GPT-6 Astra in Claude Code; client/model/role are distinct.
  Read this policy, handoff, Git status and live diff. Hold the brief and inspect
  evidence; never author product code. Instruction alignment and operational
  handoffs are orchestration work, not product engineering.
- Design: portfolio-design by name, no model override; its definition selects
  the model. Delegate exploration/design documents with scope, allowed files,
  deliverable and criteria. Never substitute design for engineering or QA.
- Engineering: one separate bounded Codex session by default. Honor specific
  owner-assigned roles/models for their tasks; no silent provider substitution.
- QA: NEW read-only Codex process/session, never the engineer, a resumed/forked
  reviewer or Claude subagent. Review the exact snapshot, brief, diff and fresh
  fixed host checks; verify before/after source/Git integrity and CLI/session
  evidence, not model claims. Same-provider risk remains owner-accepted. No
  reviewer writes, delegation or escalation. Report severity, location, evidence
  and reproduction. Each engineering fix needs another fresh review.

Missing technical inputs/owner decisions remain explicit. Unrelated historical
blockers are not new prerequisites. Stop on denial or blocking findings; no
automatic retry loop. One writer per worktree; never discard/reset/stage another
session's work. No permission, trust, sandbox, ownership or settings workaround,
alternate denied route, or unrequested model/configuration change.

**No Kimi:** never launch, authenticate, retry, probe, install hooks or fall back.
Historical evidence grants no usage. Product changes retain all five checks
below, applicable browser/visual verification and accessibility/contracts.
Missing/red required evidence is unfinished, not PASS. Host commands must be
fixed, authorized and bound to the review snapshot; no sandbox bypass.
Read-only/docs-only tasks use bounded static checks, not product tests,
identity probes or custody merely to edit docs. Self-checks are not independent QA.

Owner checkpoints/approval records remain protected. Request each local commit
separately; no automatic commit, push, publication, deployment, baseline or
acceptance. End substantive work with Handoff: scope, files, checks/results,
unresolved decisions and next role. Update the existing handoff if its hook is
unavailable, preserving prior entries; never during read-only startup/frozen
review. Hooks grant no write authority. Handoffs are context, not approval/proof.

## Mandatory workflow for ANY rendered-UI, layout, or content change

1. **Read first**: `DESIGN.md`, `docs/responsive-system.md`, and the relevant
   `LayoutContract` (`lib/responsive/layout-contracts.ts`) and, for
   content-bearing surfaces, `ContentContract`
   (`lib/content/content-contracts.ts`).
2. **Canonical facts live ONLY in** `lib/projects/catalog.ts` and
   `lib/portfolio/profile.ts`. Never place a project/profile fact,
   explanation, outcome, or action solely in JSX, canvas textures, 3D labels,
   hover-only state, or client-only modules. The cockpit presents the record;
   it never owns it.
3. **Update the contracts when views change**: a new or restructured
   route/view must declare (or amend) its `LayoutContract` and, when
   content-bearing, its `ContentContract`, and carry the matching `data-hud`,
   `data-layout-region`, `data-layout-contract`, and `data-content-contract`
   identifiers.
4. **Run the gates** and treat any failure as unfinished work — never report
   done with a red gate:
   - `npm run lint`
   - `npm run typecheck:contracts`
   - `npm run validate:contracts`
   - `npm run test:unit`
   - `npm run test:e2e`

CI, not an agent's judgment, is the final enforcement authority.

## Content rules (non-negotiable)

- **NEVER invent project facts, metrics, or outcomes** — no rounded-up
  numbers, no inferred dates, no "targeted" results rewritten as achieved.
  Content authoring is Phase 0A and requires explicit owner approval.
- **NEVER create or refresh records in `content/portfolio-approvals.json`.**
  Approval records are owner-only. Validation code may read and verify them;
  agents may not author them.
- NDA-flagged material (Tencent scope, Chu Yu Hong publisher) is published
  only as the owner has cleared it — nothing beyond the already-public text.

## Cockpit bridge and test hooks

- Preserve the `window.__cockpit*` bridge contract exactly as documented in
  `CLAUDE.md` — same names, same shapes, same events.
- Test instrumentation is **additive only**, via `__COCKPIT_TEST_HOOKS__`
  (dev-only, compiled out of production builds). Never fold test behavior
  into the `__cockpit*` bridge, and never ship test hooks to production.
- Phase 3 renderer policy is shared by the main and warp renderers:
  mount-box CSS sizing, capped DPR drawing buffers, `ResizeObserver`,
  resize/DPR fallbacks, and frame-start synchronization. Main-context loss
  rebuilds by remount with durable state restored at rest; repeated failure
  returns the visitor to canonical document routes. `getRendererState()` is
  development-only test instrumentation; the live `window.__cockpit*` bridge
  remains unchanged.
- Phase 4 adds one production-owned, monotonic, stage-coordinate focused-HUD
  sampler with epsilon-gated publication and deck-only bounded grace. The 53
  former cockpit `Math.random()` calls use 14 seedable named streams while
  null-seed production draws remain natural. The backend-separated capture
  protocol and immutable evidence live in
  `docs/baselines/phase-4-scorecard/`; hardware capture/certification remains
  owner-only and must never be compared with SwiftShader.

## Design system hard rules

- Palette: cream / ink / mauve, and **jade is the only chromatic accent** —
  never red, blue, or yellow, in DOM or 3D.
- `--radius: 0` — every box is hard-cornered. No drop shadows.
- Colors via CSS vars (`app/globals.css`) only — theme inversion depends on
  it. Verify **both** light and dark themes (boot/warp stay dark).
- `prefers-reduced-motion` is fully honored; any new JS animation must check
  it. Accessibility/system preferences (`forced-colors`, contrast, etc.) win
  over authored styling.
- **The `termFadeIn` lesson**: never animate `transform` in a keyframe on an
  element that is positioned by a translate — the keyframe overrides the
  positioning. Use the wrapper split: an outer element owns
  position/transform, an inner element owns the animation (the `tagFadeIn`
  pattern).

## Roadmap use

Choose owner-directed tasks using the roadmap and real technical dependencies,
not a phase cursor. The deck overlap needs its complete scoped fix, not an
unrelated stopgap. Product criteria and genuine owner checkpoints remain.

## Scope hygiene

- `References/`, `3DModels/`, `backend/`, `frontend*/`, `database/` are side
  directories, not the app. The app is `app/` + `components/cockpit/` +
  `lib/`.
- The strict "enforcement island" (`lib/**`, `tsconfig.contracts.json`) has
  no `@ts-nocheck`, uses `noUncheckedIndexedAccess`, and requires
  `import type` for type-only imports — keep new `lib/` code to that
  standard.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
