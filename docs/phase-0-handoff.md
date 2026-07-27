# HANDOFF — Execute Phase 0 (Portfolio 3.0 responsive system)

You are picking up mid-project. The planning is **done and owner-approved**;
your job is to execute **Phase 0 only** of
[docs/hud-responsive-layout-plan.md](hud-responsive-layout-plan.md) (~2,560
lines, revision 6). Read that document's §8 "Phase 0", §A.4.1, §A.4.3, §A.7,
§3, and §9.6 before writing code. This handoff orients you and records facts
already verified so you don't re-derive them; the plan is the authority
wherever they differ.

## State of the repo

- Branch `main`. The working tree has **uncommitted changes** mixing three
  strands: (a) Phase −1 wrapper splits in `cockpit-hud.tsx`, (b) an
  uncommitted `cardMask.visible = ce > 0.9` fix at `turntable.ts:860`
  (deck-cover flicker), (c) unrelated Codex work (tea-set, cursors,
  decorations, theme-toggle, boot-screen, CLAUDE.md). **First task: propose
  a commit split to the owner** — the plan requires one reviewable commit
  per phase and Phase −1 is currently entangled.
- **Phase −1 is implemented and verified** (three outer-anchor/inner-animation
  wrapper splits: VinylInfoCard, browse arrows, hint in
  `components/cockpit/cockpit-hud.tsx`). Its entrance-transform **assertion
  was NOT implemented** — it is owed to Phase 0 and is one of your
  deliverables (see plan §8 Phase −1 for the spec: outer anchor's computed
  transform sampled at animation start/mid/end must be identical).
- Phase 0A **step 1 (extraction) is already done** — the dossier at the
  bottom of this document holds the facts pulled from alexxiong.me. Steps
  2–5 (gap-filling, drafting, owner approval, schema conversion) are
  owner-driven; do them only if the owner engages on the dossier's ⚠ items.
  Phases 0B–8: **do not start**. The reported deck-overlap bug is
  deliberately NOT stopgapped; Phase 6 fixes it. Do not "helpfully" fix it
  early.

## Phase 0 deliverables (full detail in plan §8)

1. **Docs**: create `docs/responsive-system.md` from plan §A; add contract
   sections to `DESIGN.md`; add mandatory-workflow rules to `CLAUDE.md`;
   create repository `AGENTS.md`. Also produce the six-project/profile
   content inventory from plan §2.5 (the dossier below is its raw input) —
   never inserting generated placeholder claims into the canonical catalog.
2. **Identifiers**: `data-hud`, `data-layout-region`, `data-layout-contract`,
   and `data-content-contract` attributes on the relevant elements.
3. **Strict modules** (NO `@ts-nocheck`): `lib/responsive/layout-contract.ts`
   (types incl. `SUPPORT_PROFILES` — profile `desktop-laptop-v1` only, see
   §A.7 for the exact shape), `lib/responsive/layout-contracts.ts`
   (`satisfies LayoutContract`), `lib/content/content-contract.ts`,
   `lib/content/content-contracts.ts` (`planned-phase-2` allowed only for
   §A.4.2's exact surfaces), `lib/content/content-approval.ts` (stable
   public-field serialization, SHA-256 hashing, manifest typing + pure
   validation for `content/portfolio-approvals.json` per §A.4.2 — never
   create or refresh an approval record yourself; owner-only), and
   `lib/portfolio/profile.ts` (strict serializable profile schema).
4. **Catalog split** (§A.4.1): `lib/projects/catalog.ts` = serializable
   `PROJECTS` + strict type, no three.js/window/document/`"use client"`/
   `@ts-nocheck`; `components/cockpit/project-textures.ts` keeps
   `makeDiscTexture` + three.js. Crate/turntable import from both. Keep the
   **provisional** schema (existing fields) — strict completeness validation
   must exist but run **non-blocking** until Phase 0B (content doesn't exist
   yet; Phase 0A authors it).
5. **Runtime validators** (pure functions): contract validation per §A.7 —
   including route-coverage scan of `app/**/page.tsx` (co-located contract or
   allowlisted exemption), support-profile validation (recognized profile
   key, positive dimensions, `normalMax ≥ normalMin`, viewport cases
   consistent with the profile, `desktop-laptop-v1` required on every
   current route), and approval-manifest validation (unique/known subjects,
   supported schema version, RFC 3339 UTC timestamps, hash shape).
6. **Scoped typecheck**: `next build` has `ignoreBuildErrors: true` and all
   cockpit modules are `@ts-nocheck`, so add a narrow strict tsconfig
   covering only the new `lib/**` modules; CI runs `tsc --noEmit` on it
   directly.
7. **Unit tests** (first test runner in this repo — Vitest): contract,
   support-profile, and approval-manifest validation, tier selection, rect
   intersection/containment, input gain (`responseExponent` + `sizeRatio` —
   see §A.5, they are DIFFERENT mechanisms for hover vs pan), wheel-delta
   normalization. Plus the Phase −1 entrance-transform assertion
   (Chromium, start/mid/end computed-transform samples; Phase 8 later
   expands it cross-browser — do not discard it).
8. **Browser harness** (Playwright, Chromium only for now): one smoke test —
   boot screen reachable, layout identifiers present, viewport resizable,
   §9.6.2 blank-canvas check, and the deck overlap recorded as `test.fixme`
   linked to Phase 6 (never as a passing baseline). Reference screenshots
   for human review only — **no scorecard baselines** (those need Phase 4's
   seeding, §9.6.5).
9. **Bridge lifecycle + one decision to settle** (§9.6.1/9.6.2): the
   `__COCKPIT_TEST_HOOKS__` shape is now **specified in §9.6.1** — including
   `configureVisualCapture(seed/timeMs/pauseAmbient)`, which Phase 0 must
   reserve with its lifecycle guard (throws if called after `skipIntro()` or
   scene construction; Phase 4 wires it to real streams). Phase 0 decides
   and documents: the production-exclusion mechanism, and how to read the
   drawing buffer given `preserveDrawingBuffer: false` on the main renderer
   (in-frame callback vs test-only flag — never flip the flag in
   production).
10. **Minimal CI** (GitHub Actions): lint, scoped typecheck, contract +
    catalog validation, unit tests, the one smoke test.

## Verified facts — do not re-derive

- `components/cockpit/projects.ts` imports `three` at module scope;
  `document` only inside `makeDiscTexture()`.
- 17 cockpit modules use `@ts-nocheck`; no test runner exists in
  `package.json`.
- Boot gate `[ENTER THE ROOM]` blocks all headless entry (real
  Enter/Space/click required) — hence the test bridge.
- 42 lines / 53 `Math.random()` calls across 7 cockpit modules → scene is
  nondeterministic (Phase 4 problem, not yours — but new code you write must
  take a seedable stream argument if it generates randomness).
- No WebGL context-loss handling exists anywhere (Phase 3, §10.1).
- `termFadeIn` keyframe animates `transform` (globals.css:160) — root cause
  of the Phase −1 fix; `tagFadeIn` is the name-tag-specific composed variant.
- Main renderer: `preserveDrawingBuffer` unset (false), warp renderer: true.
- `npm run dev` → localhost:3000, ~1.4s cold start. **Gotcha**: node_modules
  drifts — if every route 500s with "Can't resolve '@pmndrs/vanilla'", run
  `npm install`. `/run-portfolio` skill has the full launch procedure.
- Weather chip CORS failure on localhost is expected (allowlist it in error
  capture, §9.6.4).

## Hard constraints (owner decisions — do not relitigate)

- `window.__cockpit*` bridge contract is preserved as-is; test hooks are
  **additive** (`__COCKPIT_TEST_HOOKS__`), never folded in.
- three.js stays **imperative WebGL** — no React Three Fiber, no WebGPU/TSL.
- Degradation tiers (§A.4.3): JS-disabled = content/links/system-a11y only —
  **no inert settings shell in the no-JS experience**; WebGL-disabled =
  interactive DOM parity incl. settings persistence, with the hydrated
  `ACCESSIBILITY` trigger operable **before any boot animation begins**
  (implemented Phase 1, checked in §9.5). Never assert tier-2 behavior in a
  tier-1 environment.
- `ssr: false` must stay inside a Client Component; the Server-Component
  shell + `cockpit-entry.tsx` boundary is **Phase 2**, not Phase 0.
- Design system: cream/ink/mauve + jade only, `--radius: 0`, tokens via CSS
  vars. New DOM must follow DESIGN.md.
- Never invent project facts, metrics, or outcomes anywhere — content
  authoring is Phase 0A with owner approval.

## Definition of done

Plan §8 Phase 0 exit: all declarations exist before implementation begins;
CI fails on a malformed/missing declaration; Phase 2 delivery assertions
present but explicitly pending; completeness validation present but
non-blocking. Then update the plan: mark Phase 0 complete with its commit
hash, and note the Phase −1 assertion as delivered.

---

# Phase 0A dossier — facts extracted from alexxiong.me (2026-07-27)

This completes **Phase 0A step 1 (extraction)**. Steps 2–5 still apply:
these facts are extracted, **not owner-approved**. Structure and edit them;
never invent, extend, or round up a fact. Items marked ⚠ need an owner
decision or confirmation before entering the strict schema.

## Profile (source: https://www.alexxiong.me/)

- **Name**: Alex Xiong
- **Target role**: Creative Producer in gaming
- **Bio (near-verbatim)**: "My journey so far has been a kaleidoscope of
  roles, primarily within production, project management, and UX design,"
  ready to "dive into any stage of the development process."
- **Expertise**: Project Management · UI/UX Design · Graphic Design · Game
  Design
- **Links**: LinkedIn `linkedin.com/in/alex-xiong-62b116204/` · Instagram
  `instagram.com/alex._.xiong/` · email `alexxiong0522@gmail.com`
- **Résumé**: `https://www.alexxiong.me/s/Alex-Xiong-2025-Resume.pdf`
  ⚠ 2025 edition — confirm current before linking.
- ⚠ The site publishes a phone number. The plan (§A.4.2) says do not publish
  private contact data — **owner decides** whether phone joins the new
  profile source. Default: omit.

## The six catalog projects

Catalog (`projects.ts`) taglines/roles/tools already align with the site;
dates needing confirmation are flagged.

### 1. The Song of Maka — /games/thesongofmaka
- **Summary**: 2D puzzle-adventure — "a fallen king retaking their bird
  kingdom from a deadly disease." Evolved from Hollow Knight-inspired
  concepts to puzzle/environment-interaction over combat; ecological boss
  battles.
- **Role**: Creative Producer, Design Lead (co-directed with Game Director).
  **Team**: 15 (scouted and hired by Alex). ⚠ "4-year flagship,
  2020–2024" was partly *inferred* by extraction — confirm span.
- **Contributions**: co-direction; hiring; design briefs, pitch decks,
  budget estimations for commercialization talks with Bilibili and Ubisoft;
  all design docs (Notion); UI/UX + all level design; art-pipeline
  oversight; Scrum/Kanban; monthly Tinylytics playtest reports.
- **Outcomes (strongest record — verify certificates)**: Best Game Grand
  Award, 4th CUSGA 2024 (⚠ "1st of 2000+ competitors" — confirm figure);
  Best Student Game, indiePlay China 2024; Best Narrative nomination CUSGA
  2024; Best Student Game nomination Tencent Game Awards 2024; Best Visual
  nomination 2nd CUSGA 2022; presented at GDC 2023 (NY State booth).
- **Tools**: Unity, Figma, Procreate, Adobe Suite, Notion, Jira, Tinylytics.
- **Links**: prototype (Google Drive); case study `/thesongofmaka-casestudy`.
- **Gaps**: explicit problem statement; date confirmation.

### 2. Chu Yu Hong 楚雨虹 — /games/chuyuhong
- **Summary**: 2D horror point-and-click framed as a cursed documentary
  about a mall that was once an orphanage; Chinese folklore; three
  protagonists. Built in a 3-week BOOOM game jam, team of 7, at Silverjay
  Studio.
- **Contributions**: Creative Director / Project Lead / Producer; all UI/UX;
  all animations + promo videos; second-level demo design; 10 environmental
  art pieces across three chapters; co-created core mechanics; Notion sprint
  management; publisher negotiation via pitch decks.
- **Outcomes**: ⚠ publisher deal **under NDA** — publish only what the owner
  clears (e.g. "negotiated a publishing deal with a Chinese publisher").
  First high-complexity Silverjay project; community on Chinese blog.
- **Tools**: Photoshop, Illustrator, Figma, Procreate, AE, Premiere.
  **Gaps**: engine unstated; year unstated on site (catalog says 2022 —
  confirm); measurable outcomes.
- **Links**: build download (Mandarin only, Drive); Figma design pipeline.

### 3. Tencent Games — /design/tencentgames
- ⚠ **NDA banner on page**: "most work remains confidential." Three public
  sub-projects only; publish nothing beyond them.
- **Summary**: live-ops event design + UX during a Tencent Games internship
  — Wild Rift WeChat check-in/referral events; Lost Ark WeChat AI assistant
  (PM/UX, UE5 Blueprint poses + interface, reward mechanics, UI transfer
  pathways); Contra Returns assistant event (PM/QA lead — timing analysis
  from prior campaigns, **managed 50 QA testers**, built the bug database).
- **Outcomes**: ⚠ page says **"targeted"** increases in ARPDAU/MAU/DAU/
  retention — no measured figures are public. The schema's honest-outcomes
  rule means phrasing must stay "designed to increase…" unless the owner
  supplies cleared numbers. Presented event result reports to Tencent/Wild
  Rift team.
- **Gaps**: year (catalog says 2022 — confirm); internship duration.

### 4. NYU Welcome 2022 — /design/nyuwelcome
- **Summary**: unified branding campaign for NYU's welcome week, Summer
  2022, as Digital Strategy Assistant (internship). Problem is stated:
  NYU needed one visual identity across digital + physical touchpoints.
- **Contributions**: primary logo (deployed 10+ platforms incl. Kimmel);
  animated logo variants (Reels/TikTok/YouTube, Adobe Animate); Instagram
  content calendar; volunteer t-shirt worn by 150+ staff; assets for 10+
  departments; NYU Mobile App event UI; branding guide; daily stakeholder
  meetings with faculty.
- **Tools**: Adobe Animate, Photoshop, NYU CMS. **Gaps**: minimal — the
  most schema-complete project already.

### 5. Shanghai Noir — /wip/shanghainoir
- **Summary**: solo, **ongoing** voice-activated detective game on Amazon
  Echo — Agatha Christie / Clue-inspired, randomized culprits/weapons/
  motives, multiple endings. Context stated: exploring narrative on
  emerging platforms after seeing Skyrim on Echo.
- **Contributions**: everything — Twine (SugarCube) + JS ↔ ADS integration,
  custom intents/invocation setup, narrative design; Gen-AI-assisted prompt
  generation.
- **Status/outcomes**: WIP — schema records `in-progress` with **no
  invented outcomes**. **Links**: ADS code zip on the page.

### 6. ProcGen Dungeon — /wip/procgendungeon
- **Summary**: procedural dungeon generation demo in UE 5.3 — cellular
  automata + wave function collapse + digger methods; instant generation
  with environment assets and foliage. Context stated: "Procedural
  Generation in Unreal" class project. **Completed** despite living under
  /wip. ⚠ status mismatch — catalog says 2024/complete; site section
  implies WIP. Owner confirms status + year.
- **Contributions**: custom + postprocessing shaders; automated asset
  integration; environment grammar rulesets; procedural foliage; Blueprint
  scripting.
- **Tools**: UE 5.3, Blueprints, custom shaders, Quixel. **Links**: project
  file (Drive). **Gaps**: outcomes (qualitative is fine — it's a tech demo).

## Not in the catalog (owner decision, not Phase 0 scope)

The site lists more work than the 6-record catalog: Re:Live (two versions),
Entangled, Night of Chaos, NYU CSS, Destiny 2 UX Suggestions, Excel Escape
Room, Switch, Corporate Espionage, Gaming Industry Analysis. The cockpit
crate stays at 6; whether `/projects` eventually indexes more is an owner
call for a later phase — do not add them now.

## Cross-cutting gap summary for the owner (Phase 0A step 4)

1. Confirm dates: Maka span, Chu Yu Hong year, Tencent year/duration,
   ProcGen year + status.
2. Clear NDA phrasing: Chu Yu Hong publisher; Tencent scope.
3. Decide: phone number in/out; résumé version; CUSGA "2000+ competitors"
   figure.
4. Supply explicit problem statements where missing (Maka, Chu Yu Hong,
   Tencent).
5. Approve every ownership claim above ("all UI/UX", "hired 15", "managed
   50 QA testers") — they are quoted from the owner's own site but the
   schema requires explicit sign-off.
