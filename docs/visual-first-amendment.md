# Visual-first amendment — Phase 8 split

## 0. Status and approval provenance (2026-10-27)

**OD-1 and OD-2 owner-approved 2026-10-27, including implementation intent;
OD-3 not granted.** Approval record (agent-recorded; not an owner
signature). On 2026-10-27 the owner, Alex Xiong, wrote in the orchestration
chat, verbatim:

> Approve the proposed visual package and workflow exception and start
> implementation (which I have also authroized).

The orchestrator relayed it to `portfolio-design`, which recorded it here.
The orchestrator's offer that the owner accepted specified the isolation base
as local `main` at `bfa8d8234fd698c8053fd9915a91b8ceeb5bd04e` (the §3 item 3
recommended choice). The approval covers OD-1 (package, §2 scope including
the semantic-route expansion, recommended desk treatment, unchanged
grain/vignette, 8A appearance-band suspension) and OD-2 (§3 exception, the
stored-source amendments, the new-session requirement, that base). It is
**not** a commit, push or publication request, a visual checkpoint, a
replacement-baseline approval, a performance waiver, a content approval, a
test PASS or a QA result (OD-3 stays separate and owner-authored).

**Activation condition, not a denial.** Implementation cannot start in the
session that recorded the approval: its loaded higher-priority rules still
require planning only, and §3 item 1 requires stored-source alignment and
then a compatible **new** session. A new compatible session may act on this
existing consent without re-requesting OD-1/OD-2.

**Applied 2026-10-27 by `portfolio-design` (documentation only):** plan §0.9
and Phase 8 status, `DESIGN.md` §14, `AGENTS.md`, `CLAUDE.md`,
`docs/phase-6-plan.md`, `docs/codex-qa-proposal.md`,
`docs/astra-orchestration.md`, and the derived execution brief
`docs/phase-8-design.md`. The orchestrator separately inserts the required
stored orchestrator-prompt alignment. No code, test, gate, branch, worktree,
commit, capture or QA was run or created. Observed state at recording: branch
`codex/phase-6-deck-hud`, HEAD `e03ae2b`, Phase 6 not initialized.

**OD-2a, 2026-10-27 (prospective; agent-recorded, not an owner
signature).** After the 8A pre-change baseline at `bfa8d82` was blocked by
the Windows runner (`docs/agent-handoff.md`, 2026-10-27T17:02:38Z), the
owner wrote, verbatim:

> Approve a narrow amendment permitting the existing two-file Windows runner
> repair in this candidate, skip QA and Independent QA right now, I just want
> the visuals to be implemented ASAP.

This permits only the base-compatible backport of that repair into
`scripts/run-e2e.mjs` and `tests/unit/e2e-runner.test.ts` as 8A batch B0,
exactly as bounded in `docs/phase-8-design.md` §9 (no Phase 6 inventory or
shard assertions, no CI/spec/config change). Base, overlay, visual scope and
OD-3 are unchanged. "Right now" defers QA until after implementation; the
separate fresh read-only Codex review (§4 item 8) and all §4 gates remain
mandatory before completion or acceptance, and nothing substitutes for them.

**Visual revision provider note, 2026-10-27 (prospective; agent-recorded).**
A later owner request and approval (verbatim in
`docs/phase-8a-visual-revision.md` §7) let one native Opus 5.5 session
replace the Codex engineer for that revision's §4A only
(`docs/phase-8-design.md` §10). Base, scope, fresh Codex QA and OD-3 are
unchanged; that revision's D-1/D-2/D-3 and V1–V7 stay unapproved proposals.

Sections 1–5 below are the **historical proposal text as approved**,
unchanged. Their "proposed", "pending" and "needs approval" wording records
the pre-approval state; §0 above supersedes it for status only.

---

> **Historical draft banner (superseded by §0).** DRAFT · PENDING OWNER
> APPROVAL · NOT AUTHORITY TO IMPLEMENT. It authorizes no engineering, phase
> command, doc amendment, commit, capture, branch/worktree or QA. Author:
> `portfolio-design`, 2026-10-27 (corrected the same day), branch
> `codex/phase-6-deck-hud`, HEAD `e03ae2b`. Source reads only: no browser,
> gate, build, test or model probe ran. No Kimi. It refines and reschedules
> plan §8 Phase 8. It is not a new design.

## 1. Current vs target

**Delivered foundations (source).** Semantic routes `/`, `/projects`,
`/projects/[slug]`, `/about` have contracts
(`lib/responsive/layout-contracts.ts:31-37`); `/recruiter` redirects to
`/about` (`next.config.mjs:12-15`). The document shell carries nav, contact and
résumé (`app/_components/document-shell.tsx:33-58`); the catalogue has numbers,
metadata, status and pagination (`app/projects/[slug]/page.tsx:86-159`) and
generated groove covers (`project-cover.tsx`). Role tokens exist
(`app/globals.css:58-62`); accessibility states stamp before paint
(`app/layout.tsx:29-61`); grain/vignette drop out under reduced-transparency,
high-contrast and forced-colors (`globals.css:157-175`).

**Remaining gaps (source-based, not current rendered proof).**

| Area | Source fact | Target |
|---|---|---|
| Type | Google CSS loads Cormorant/JetBrains/VT323/Major Mono (`layout.tsx:73-78`); body falls back to mono; `--font-ui/label/technical` → JetBrains (`globals.css:51-62`). Canvas redraws after font load only in `glass-mac.ts:563` | DESIGN §4 five families on DOM/SVG/canvas with font readiness |
| Background | Flat field, 700-point starfield, fog (`globe-canvas.tsx:93-135, 238-254, 854`) | §8 curved studio field per theme |
| Light | Ambient 0.72, key 0.85, fill 0.4 (`:478-485`); ACES exposure 1.2 (`:211-212`); hand-built PMREM room (`:488-509`) | §8 soft key, frontal fill, controlled jade rim |
| Material | Live heroes use `makeHeroGlass` (`materials.ts:25`): `@pmndrs/vanilla` `MeshTransmissionMaterial`, `transmissionSampler: true`, `samples: 6`, `transmission: 1`, roughness default 0.18, `depthWrite: false`; used by AX-01 (`globe-canvas.tsx:529` → `glass-mac.ts:181`), coffee (`coffee.ts:121`), props (`decorations.ts:291`). Frost panels use `makeFrost` (`materials.ts:57`, `MeshPhysicalMaterial`), e.g. crate walls (`vinyl-crate.ts:461`). `shellFillMat` (`globe-canvas.tsx:415`, aliased `:446`) is a legacy declaration, not the hero shell | §7 layered, modulated shells and per-object wear, transmission preserved |
| Grounding | A search finds no `castShadow`/`receiveShadow` flag in `components/cockpit/`. That only rules out standard shadow-map flags, not every baked/custom cue | Soft contact grounding |
| DOM chrome | Theme toggle rounded with drop shadows (`theme-toggle.tsx:24,35,50-52`); HUD exterior shadows (`cockpit-hud.tsx:544,703,993`, Phase 6-owned) | §11 hard corners, no drop shadows |

**Historical rendered evidence only.** Phase 4 `ac24` 1440×900 dark captures
(`mode-cockpit`, `mode-deck`) showed floating objects on a wire grid, a flat
ink field, matte-reading shells and all-mono chrome. Not verified on the
current HEAD; no light-theme or semantic-page renders were reviewed.

**Historical gate blockers (unresolved, not re-investigated here).** Recorded
host `test:e2e` at `e03ae2b` exited 1 with F2 (`phase4-hud:855`) and F3
(`phase4-hud:964`, AC-21) (`docs/browser-gate-repair-plan.md` §1). Later,
§8 of that plan and the newest `docs/agent-handoff.md` record a Tailwind
startup failure and a two-line `@source not` CSS exclusion whose authorization
and application are tracked there, not here. F1/F2/F3 remain unresolved. F2's
cause is unknown; it is not proven to come from Phase 6. No fresh gate, build
or browser result exists for this branch or for `main`.

## 2. Package: 8A (early visual candidate) + 8B (HUD integration)

**Recommendation.** 8A and 8B **together** are the smallest complete visual
migration. 8A alone is a candidate. It is not a publishable or completed
portfolio, and it does not finish Phase 8. The split exists only because
typography changes the measured size of the focused HUD that Phases 6/7 own.
Materials, light, environment, canvas textures, boot/warp and semantic pages
carry no Phase 6/7-owned geometry.

### 8A-1 · Type and catalogue (recruiter experience first)

- `app/layout.tsx`: self-hosted subset families via `next/font` (checked
  against installed `node_modules/next/dist/docs`), exposed as **new scoped
  variables**. Legacy families stay loaded.
- `app/globals.css`: apply the DESIGN §4 role table (Plex Sans body 17–19px,
  1.55–1.7 leading, 60–72ch; Newsreader titles; Plex Mono metadata) **only**
  under document-tier, boot and warp scopes. Unify `--doc-*` tokens
  (`phase-2-design.md` §6.2). DOM stays hard-cornered and shadow-free.
- **Isolation rule.** `:root` role tokens, inherited `body` family, size and
  color stay as they are, so the cockpit HUD inherits nothing new before
  Phases 6/7. Any spillover into HUD measurement, or any needed HUD or
  contract edit, **blocks 8A**. It is never stopgapped.
- **Plan-scope expansion (needs approval):** `document-shell.tsx`,
  `project-cover.tsx`, `app/projects/page.tsx`, `app/projects/[slug]/page.tsx`,
  `app/about/page.tsx`. Changes are limited to presentational classes and
  `aria-hidden` decorative spans (liner-note captions, decorative track
  numbers, refined covers). Headings, links, facts, `data-*` identifiers and
  contracts stay unchanged.
- `boot-screen.tsx`, `warp-transition.tsx`: VT323 for CRT lines only, Plex Mono
  elsewhere, Major Mono removed. Glow/hover shadows (`:350`, `:674`) become
  an authored border or pressed state.
- `theme-toggle.tsx`: square, shadowless, tokenized; behavior and storage key
  unchanged.

### 8A-2 · Studio (immersive experience)

- **`globe-canvas.tsx`, light/background/environment blocks only.** Remove
  the starfield. Add a curved studio backdrop with a static palette gradient
  (cream/fog light, mauve/ink dark) and no time uniforms, swapped through the
  existing `themeTargets`. Rebuild the rig to §8 roles, with PMREM emitters
  limited to cream/fog/jade. One exposure and tone mapping for all camera
  states. Camera fit, sampler, picking and the renderer lifecycle are
  untouched. The legacy `shellFillMat` is left as it is.
- **Recommended desk treatment:** a lit, solid receiving surface with the
  grid kept as faint printed ink on a lit material.
- **Recommended grain/vignette disposition:** keep the existing restrained
  `.grain`/`.vignette` CSS unchanged, including its accessibility drop-outs.
  No new effects.
- **`materials.ts`/`decals.ts`: shell modulation.** Keep the transmissive
  shell (`MeshTransmissionMaterial`, `depthWrite: false`) and its vendor
  hooks. Prefer original authored roughness, thickness and density/wear maps
  in standard material slots, with seeded low-frequency fields and per-object
  wear (§7: handled crate/sleeves, gently aged turntable, pristine coffee).
  Keep cream liners and lit printed jade. Opacity is not the glass mechanism.
  The vendor `onBeforeCompile` is never overridden blindly. Any shader option
  stays narrow and chains the vendor hook. On error it falls back to the
  standard material and reports the error. No per-frame allocations. New
  tones become `PALETTE` entries.
- **Contact grounding:** baked soft surface-impression planes, floated a few
  mm, with fixed and deterministic cost. They are excluded from fit bounds and
  raycasting and never change artifact geometry, fit or picking. Any actual
  geometry exception is an owner decision. It is never implied.
- **Canvas/SVG text** (`glass-mac.ts`, `turntable.ts`, `vinyl-crate.ts`,
  `project-textures.ts`, `coffee.ts`, `decorations.ts`, `incense.ts`): read the
  new scoped family at draw time, await `document.fonts.load`, and reuse the
  `glass-mac.ts:563` redraw pattern.
- **Randomness/recovery:** new randomness uses new named seeded streams. Any
  stream-inventory change from removing the starfield is itemized in
  `phase-8-design.md`. Context-loss rebuild restores backdrop, PMREM, material
  maps and decal canvases.

**Exclusions.** 8A excludes `cockpit-hud.tsx`, `cockpit-app.tsx`, `lib/**`,
solver, fit and input. Phase 6's commit allowlist does not include
`globe-canvas.tsx` or `globals.css`. That keeps the scopes disjoint, but it
grants 8A nothing. The exact production allowlist stays closed until approval.
The deck overlap stays visible in 8A evidence and stays labelled Phase 6.

### 8B · HUD integration (after Phases 6 and 7)

Restyle `cockpit-hud.tsx` with role tokens inside the Phase 6/7 contracts and
remove exterior shadows. Flip `:root` tokens and remove the legacy families
(the deadline for handoff §5.1 interim mixing). Record replacement baselines
under `docs/baselines/phase-8-scorecard/` and hold the Phase 8 owner
checkpoint, which stays after 8B.

## 3. Proposed amendments (pending; applied only after approval)

**Conflict.** `AGENTS.md` Phase discipline and plan Phase 8 ("Requires Phases
6 and 7 delivered") forbid 8A today. The generic outside-phase text, D2 and
the migration bootstrap do not authorize it. Under `docs/codex-qa-proposal.md`
§1, steps needing QA stay blocked pending migration. Its §5 compatibility
note and §10 D2 limit approved Codex QA to Phase 6 and explicitly approved
outside-phase **tooling** reviews. A product-visual review needs a **new,
narrow, owner-approved exception**.

**Proposed text (prospective; historical text and D1–D4 records unchanged):**

- **Plan, new §0.9 + Phase 8 status:** "Amendment <date>: Phase 8 splits. 8A
  (files per `docs/visual-first-amendment.md` §2) may precede Phases 6/7 as a
  bounded owner-authorized exception. 8B still requires Phases 6/7. The Phase
  8 plan's narrow suspension of pre-migration Phase 4 **appearance bands**
  applies to 8A. Determinism (including unresolved F2), error capture,
  blank-canvas, geometry, interaction, accessibility and the five gates are
  not suspended."
- **`docs/codex-qa-proposal.md` and `docs/astra-orchestration.md`, prospective
  note:** "Exception <date>: owner authorizes only bounded 8A implementation
  (one Codex engineer) and a manual fresh read-only Codex review,
  independent of runner activation. Requirements: an exact disposable
  snapshot, fixed host gates, verified fresh process/session identity,
  source/Git integrity, no sandbox or permission bypass, and no blocking
  findings. The migration stays blocked/unaccepted, and all phase commands
  except `status` stay forbidden. Phase 6 product work never runs outside the
  runner. Phase 7 is unchanged." Align `.claude/agents/portfolio-orchestrator.md`
  and `.claude/agents/portfolio-design.md` if the loaded named-agent text
  would otherwise conflict.
- **DESIGN.md §14; AGENTS.md Phase discipline; CLAUDE.md Next:** one line each
  naming 8A (plan §0.9) as the sanctioned ordering exception.
- **`docs/phase-6-plan.md` note:** "Phase 6 captures may show the 8A scene;
  placement criteria unchanged."
- **New `docs/phase-8-design.md`** must, **before implementation**, list the
  exact production allowlist, every required test/support path and numbered
  acceptance criteria. Unlisted test edits are not permitted.

**Prerequisites and sequencing.**

1. Explicit owner approval of the exception, alignment of stored sources,
   then a **compatible new session**. If the exception cannot be reconciled
   with higher-priority loaded rules, stop for a compatible new session. The
   edits are never read as live authorization.
2. `CLAUDE.md` and the plan are Phase 6 commit paths, so their amendments need
   a separately requested commit before Phase 6 init.
3. **Proposed isolation choice:** run 8A from an owner-selected exact `main`
   revision whose sources carry the aligned no-Kimi instructions. This only
   isolates the incomplete Phase 6 product work. It does not resolve
   F1/F2/F3, prove any gate green, or clean the current tree. No
   branch/worktree is created or switched now, no test is dropped and no
   earlier manifest is used. The dirty tree and Phase 6 history/evidence are
   preserved. Later reconciliation is required, with no automatic merge or
   commit. A red pre-change gate on any base is reported, never waived.
4. 8A becomes **eligible after approval and compatible activation**. Nothing
   here can run now.

## 4. Acceptance and evidence

1. `lint`, `typecheck:contracts`, `validate:contracts`, `test:unit`,
   `test:e2e` pass fresh on the host, and `next build` succeeds. A red or
   missing gate means not done. Removing old-baseline references does not
   count as a pass.
2. Fresh before/after captures, each with a documented source revision,
   backend (SwiftShader vs hardware, kept separate; hardware is owner-only)
   and viewport. Viewports: 2560×1440 CSS primary, plus 1440×900, 1024×600,
   narrow (`ResponsiveStage` crop, 320px reflow) and 3440×1440. Both themes:
   boot, warp, cockpit rest, crate, deck, monitor, semantic pages. Stored in a
   new `docs/baselines/phase-8a-candidate/` as **candidates**, never
   replacement baselines. Historical sets stay untouched.
3. Both themes, the five accessibility states plus forced-colors, and
   keyboard-only operation are checked. Grain, vignette and transmission
   styling drop out where required. WCAG 2.2 AA contrast holds on every
   semantic page.
4. No-JS and no-WebGL paths work. All six project pages, `/projects`,
   `/about` and `/recruiter` are complete, and résumé/contact links resolve.
5. Reduced motion is static. Context-loss restore gives a non-blank 8A canvas.
   No console, page or shader errors. Fallback paths are exercised.
6. **Invariants:** catalog/profile and `content/portfolio-approvals.json` are
   byte-stable. The `__cockpit*` bridge interface and behavior are stable.
   `TWEAK_DEFAULTS`, authored transforms and original artifact geometry
   (AX-01 included) are unchanged. `data-*` identifiers and contracts are
   stable unless separately approved. No HUD restyle. Font families are
   enumerated per scope, and the palette scan finds no off-family color.
7. **Performance:** with Phase 3's method and backend, the deck/crate median
   frame time at the DPR cap regresses ≤15% and there are no new sustained
   long tasks. Report the font and bundle delta.
8. One Codex engineer, then a separate fresh read-only Codex review under the
   §3 exception, with CLI/session identity evidence. Never Claude or
   self-review. Blocking findings mean not done.

## 5. Owner decisions (grouped)

- **OD-1 Approve the package:** the 8A/8B split, the §2 scope including the
  semantic-route expansion, the recommended desk treatment and grain/vignette
  disposition (rejectable), and the 8A appearance-band suspension.
- **OD-2 Approve the process:** the §3 narrow 8A QA exception, the stored-source
  amendments applied by `portfolio-design`, the new-session requirement, and
  the base (owner-selected exact `main` revision, recommended, or this
  branch).
- **OD-3 Separate and later:** each commit/push, the 8A visual review, the 8B
  checkpoint, replacement-baseline approval and any performance waiver. These
  stay owner-authored. Nothing here is approval or QA.
