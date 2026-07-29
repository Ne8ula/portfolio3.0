# AGENTS.md — rules for coding agents in this repository

For Codex and other compatible agents. Claude receives the equivalent rules
via `CLAUDE.md`; the two documents must stay consistent in substance.

## Orientation

This is Alex Xiong's "Editorial Cockpit" portfolio: boot terminal → warp →
first-person 3D desk of interactive artifacts. Next.js 16 App Router
(Turbopack), React 19, Tailwind v4 tokens. The 3D scene is **imperative
three.js** (`components/cockpit/`) — **NO React Three Fiber, NO WebGPU/TSL**;
do not convert or introduce either. Design reference: `DESIGN.md`. Technical
layout/content contract reference: `docs/responsive-system.md`. Full plan:
`docs/hud-responsive-layout-plan.md`.

## Three-agent roles and automatic handoff

These are default ownership boundaries. An explicit owner request may override
them, but an agent must say when it is working outside its default role.
`AGENTS.md` coordinates behavior; it does not grant one client access to
another vendor's model or subscription.

- **Claude — design lead.** Own design exploration, interaction intent, visual
  critique, and measurable acceptance criteria. For rendered work, reconcile
  proposals with `DESIGN.md`, the responsive system, and the applicable
  contracts. Do not implement production code unless the owner explicitly
  assigns implementation.
- **Codex — planning and engineering lead.** Own repository discovery,
  implementation plans, production code, migrations, and developer-facing
  verification. Implement the approved design intent without silently
  redefining it. Return design ambiguity to Claude or the owner.
- **Kimi K3 — independent QA lead.** Review the brief, live Git diff, and
  Codex's verification evidence; run the applicable gates and inspect behavior
  at risk. Default to no product-code edits while judging a change. Report
  findings with severity, file/line, evidence, expected versus actual
  behavior, and reproduction steps. A requested fix is a separate engineering
  turn and requires a fresh independent QA pass.

Use this sequence for work that needs all three roles:

`owner brief → Claude design → owner approval when required → Codex plan/code
→ Kimi QA → Codex fixes ↔ Kimi retest → owner/CI acceptance`

Communication is repository-backed:

1. Before acting, read `docs/agent-handoff.md`, `git status`, and the relevant
   diff. Git and canonical repository files remain the source of truth.
2. Only one agent may write to a shared worktree at a time. Never discard,
   reset, stage, or rewrite another agent's changes to create a clean state.
3. End a substantive turn with a compact final report containing `Handoff:`
   plus the completed scope, files changed, verification run and results,
   unresolved risks/decisions, and the next role.
4. Lifecycle hooks capture that final report and the Git snapshot into the
   single rolling `docs/agent-handoff.md`; the owner does not create a handoff
   file per turn. If a client hook is unavailable, the finishing agent must
   update the existing handoff itself before reporting completion.
5. The receiving agent must verify the handoff against the live files and
   diff. A handoff is context, not proof. Kimi cannot mark QA `PASS` with a red
   required gate, and Codex cannot self-certify the independent QA role.

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

## Phase discipline

Work proceeds in the phases defined in `docs/hud-responsive-layout-plan.md`
§8, one reviewable commit per phase. **Do not implement later phases' work ad
hoc.** In particular: the known deck HUD overlap is Phase 6's fix — do not
stopgap, patch, or "helpfully" fix it early. If a bug's fix is assigned to a
future phase, record it (e.g. `test.fixme` linked to that phase) instead of
fixing it out of order.

## Scope hygiene

- `References/`, `3DModels/`, `backend/`, `frontend*/`, `database/` are side
  directories, not the app. The app is `app/` + `components/cockpit/` +
  `lib/`.
- The strict "enforcement island" (`lib/**`, `tsconfig.contracts.json`) has
  no `@ts-nocheck`, uses `noUncheckedIndexedAccess`, and requires
  `import type` for type-only imports — keep new `lib/` code to that
  standard.
