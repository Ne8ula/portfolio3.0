# Phase 8A — derived execution brief (early visual candidate)

**Status.** The owner approved the 8A/8B package, the 8A workflow exception
and implementation intent on 2026-10-27 (OD-1, OD-2; provenance in
`docs/visual-first-amendment.md` §0; plan §0.9). This is the agent-authored
operationalization the amendment requires before implementation. It adds no
scope and is not a separately owner-reviewed design. Authority: amendment
§§2–4 → plan §8 Phase 8 → this brief. Unresolvable details are labelled in
§8; the engineer stops rather than guesses. Nothing here has run. OD-3
(commits, publication, checkpoints, baselines, waivers) is not granted.
**Amended 2026-10-27 (OD-2a, §9):** the owner permitted one narrow
backport of the existing two-file Windows runner repair as batch B0; QA is
deferred until after implementation, never waived. Nothing else changes.

## 1. Fixed limits

- **New compatible session only:** one Codex engineer, then a separate
  fresh read-only Codex reviewer. Never Claude review, self-review or Kimi.
  Single writer per worktree. (§10: for visual revision §4A only, the
  engineer is one native Opus 5.5 session; the Codex reviewer is unchanged.)
- Not a runner run or historical manifest. No phase command except
  `status`; the migration stays blocked/unaccepted, none of its bootstrap
  proofs is waived or certified.
- Never Phase 6 work or a deck-overlap stopgap; Phase 7 unchanged. No fixes
  to F1/F2/F3, the migration or the CSS startup issue under an 8A label, even
  when they turn gates red. The Windows `run-e2e` repair is the single
  exception, limited to the §9 B0 backport (OD-2a).
- Suspended: only the §9.6.3 band comparison against pre-migration sets
  (no `visual-scorecard.ts --compare-baseline` against
  `docs/baselines/phase-4-scorecard/`; record the suspension). Determinism
  (incl. F2), blank-canvas, error capture, geometry, interaction,
  accessibility and the five gates stay blocking.
- **Stop and return to the owner** on any need for a geometry/authored
  transform change to a protected artifact (the already-specified
  non-pickable backdrop and grounding helper surfaces in §3 are not such a
  change), a HUD change, a contract or `data-*` change, a path
  outside §§3–4, a dependency/config change, or a performance waiver.

## 2. Isolation and handoff (orchestrator, before dispatch)

1. Verify local `main` is `bfa8d8234fd698c8053fd9915a91b8ceeb5bd04e`, else
   stop.
2. Create the candidate **outside** the primary checkout, detached at that
   SHA (detached worktree or local clone; no push or publication). The
   primary checkout (`codex/phase-6-deck-hud`, its commits and inherited
   uncommitted work) stays untouched.
3. Overlay byte-for-byte from the primary checkout, after the orchestrator's
   prompt insertion, **only**: `AGENTS.md`, `CLAUDE.md`, `DESIGN.md`,
   `docs/visual-first-amendment.md`, `docs/phase-8-design.md`,
   `docs/hud-responsive-layout-plan.md`, `docs/codex-qa-proposal.md`,
   `docs/astra-orchestration.md`, `.claude/agents/portfolio-orchestrator.md`,
   `.claude/agents/portfolio-design.md`, `.agents/agents/kimi-phase-qa.md`
   (retired). Never Phase 6 code/tests, `scripts/**`, `tests/**`, manifests,
   settings, hooks or untracked tooling. Overlay files are read-only for the
   engineer, never staged or committed. (The §9 B0 repair is authored by the
   engineer on the base files, not overlaid from the primary checkout.)
   §10 item 4 adds one bounded overlay revision for visual revision §4A;
   this original list and its manifest stay preserved.
4. Fingerprint: base SHA, overlay manifest (path + SHA-256), lockfile
   digest, Node/npm/OS/browser versions; after engineering, digests of
   `git diff --binary <base>` and `git status --porcelain=v1 -uall`. Never
   present the candidate as `e03ae2b` or the Phase 6 line.
5. `npm ci`; run the §7 commands on a disposable snapshot of base+overlay as
   the **pre-change baseline**. Red results are reported by test name, never
   waived; engineering may proceed, but 8A cannot finish while any is red.
6. No automatic merge, stage, commit or publication. Reconciliation into
   the Phase 6 line, Phase 7 or 8B needs its own owner-requested bounded
   scope (known overlap: `e2e/phase4-hud.spec.ts`, status docs).

## 3. Closed production allowlist

Base line references in the amendment were taken at `e03ae2b`; the engineer
re-locates each region on the base by its named block.

| Exact path | Permitted change only |
|---|---|
| `app/layout.tsx` | `next/font/google` (checked against `node_modules/next/dist/docs`) for the five DESIGN §4 families: `latin`, used weights only, `display: 'swap'`, default fallback adjustment, variables `--font-newsreader`, `--font-plex-sans`, `--font-plex-condensed`, `--font-plex-mono`, `--font-vt323` as an `<html>` className (definitions only). Drop `Major+Mono+Display` from the legacy URL and comment. Everything else unchanged. |
| `app/globals.css` | (a) Locally redefine the five role tokens to the raw variables, plus DESIGN §4 type rules, **only** on `.document-header`, `.document-main`, `.document-footer`, `.home-header`, `.home-main`, `.home-footer` (never `.home-shell`, which parents `CockpitEntry`). (b) `--doc-*` unification (phase-2-design §6.2): all eight names stay declared, values within the five families. (c) `.term`, `.term-small`, `.term-display` (boot-only) → raw VT323/Plex Mono variables. Byte-stable: `:root` tokens, `--font-serif/mono/sans`, `html`/`body`, `.display`/`.label`/`.micro`, `.grain`/`.vignette`, `data-a11y-*` blocks, support media queries, cockpit/HUD selectors. |
| `app/_components/document-shell.tsx`, `app/_components/project-cover.tsx`, `app/projects/page.tsx`, `app/projects/[slug]/page.tsx`, `app/about/page.tsx` | Presentational `className`s and `aria-hidden` decorative spans/SVG only (liner-note ornaments, decorative track numbers, refined covers). Decorative text may only repeat a canonical value already visible on the page. Headings, link text/hrefs, facts, element order, `data-*` and contract ids unchanged. |
| `components/cockpit/boot-screen.tsx` | Font-family strings (VT323 for CRT/terminal lines; Plex Mono elsewhere); the two glow `boxShadow`s (base equivalents of `:350`, `:674`) → authored border or pressed state. Timeline, text, gating, reduced-motion paths unchanged. |
| `components/cockpit/warp-transition.tsx` | The font-family string only. |
| `components/cockpit/theme-toggle.tsx` | `borderRadius` → 0 on all three boxes; remove both `boxShadow`s; literal colors → existing CSS variables. Outer box size/position, padding, font family/size, label, behavior, storage key and event unchanged. |
| `components/cockpit/globe-canvas.tsx` | Only: `THEMES` entries (remove star keys; add backdrop/desk tones); `scene.background`/theme-apply lines for those targets; `toneMapping`/`toneMappingExposure` values; the starfield block, replaced by the backdrop; desk material declarations (type/params only); the `__xrayLit` light + PMREM block; the `scene.fog` line; grounding planes as direct `tableGroup` children; disposal of new resources in existing teardown. `shellFillMat` untouched. Forbidden: camera/fit/pose, raycaster/`hoverPickables`, rect/anchor getters, sampler, renderer creation/sizing/DPR/resize/context-loss handlers, render loop, bridge assignments, test hooks, live-globe group, `edgeGlow`. |
| `components/cockpit/materials.ts` | `PALETTE` additions; optional map parameters on `makeHeroGlass`/`makeFrost` whose defaults reproduce current output; build-time map generators. |
| `components/cockpit/decals.ts` | Lit printed-ink material params; one exported helper reading a raw font variable from `document.documentElement` and awaiting `document.fonts.load`. |
| `components/cockpit/glass-mac.ts`, `components/cockpit/turntable.ts`, `components/cockpit/vinyl-crate.ts`, `components/cockpit/coffee.ts`, `components/cockpit/decorations.ts` | Material construction/params/map assignment; canvas font families via the helper; font-ready redraw (existing `glass-mac.ts` `document.fonts` pattern). |
| `components/cockpit/incense.ts`, `components/cockpit/project-textures.ts` | Canvas font families and font-ready redraw only; drawn text byte-identical. |

Builder prohibitions: geometry arguments, positions/rotations/scales, group
hierarchy, pick registration, bridge setters,
`xray.userData.screenGroup`/`screenCorners`, animation, hover/selection.
Shaders: only `shell-modulation` (narrow, chains the vendor
`onBeforeCompile`, falls back to the standard material and reports on
error) and `studio-backdrop` (static, no time uniforms); prefer standard map
slots and no shader. No post-processing, no per-frame allocation.

## 4. Test, support and evidence allowlist

| Exact path | Permitted change |
|---|---|
| `tests/unit/phase8a-appearance.test.ts` (new) | Source-level checks for AC-04, 05, 11, 12, 18, 19, 20. |
| `e2e/phase2-completion.spec.ts` | Append one `test.describe('Phase 8A document typography')`; existing tests byte-identical. |
| `e2e/phase3-renderer.spec.ts` | Append one `test.describe('Phase 8A studio')`; existing tests byte-identical. |
| `e2e/phase4-hud.spec.ts` | Two edits forced by the approved starfield removal: (1) the capture-state stream-inventory expectation = fixture list minus `starfield` plus AC-19 streams (fixture untouched); (2) in AC-13/14 only the natural-randomness half retargets from the 700-point starfield to the 120-point `globe-cities` `Points` buffer. The seeded half (F2's failing assertion) stays byte-identical. Not an F2 fix. |
| `scripts/run-e2e.mjs` | B0 only (§9): slash-normalize discovered spec paths. Nothing else. |
| `tests/unit/e2e-runner.test.ts` | B0 only (§9): one regression test and LF/CRLF-tolerant workflow checks. Base inventory and CI expectations unchanged. |
| `docs/phase-8a-implementation.md` (new) | Implementation report. |
| `docs/baselines/phase-8a-candidate/` (new) | Candidate captures, perf records, provenance README. |

Forbidden: new e2e spec files (the CI-matrix sync test would force
`.github/workflows/ci.yml` and further `tests/unit/e2e-runner.test.ts` edits),
`e2e/fixtures/**`, every other spec/unit test, `playwright.config.ts`,
`scripts/**` except the B0 change to `scripts/run-e2e.mjs`, `package.json`,
the lockfile, `docs/baselines/phase-0/` through
`phase-6-deck/`. `scripts/capture-baselines.ts` writes the immutable
`phase-0` set: never run it. Thresholds, timeouts and retries stay as they
are. No new `test.skip`/`fixme`. If a check cannot fit these paths, block.

## 5. Batches (one engineer session, in order)

- **B0 — Windows runner compatibility (support, not product):** the §9
  two-file repair only, including its regression test; no new
  pre-implementation host gate. B1/B2/B3 then proceed in the same single
  engineer session (owner steering: visuals first, review after
  implementation). B0 regressions and real `CI=true test:e2e` discovery are
  verified in the unchanged required final host gates before QA/acceptance;
  full required gates are not waived. The original pre-change red baseline
  already exists and remains. If B0 cannot be done within §9, stop.
- **B1 — catalogue and type:** fonts, scoped tokens, `--doc-*`, document
  components, boot/warp, theme toggle; AC-04…AC-12.
- **B2 — studio:** backdrop, rig/PMREM, exposure, desk, shell modulation,
  grounding, canvas text, stream inventory; AC-13…AC-21.
- **B3 — reconciliation and evidence:** matrix, recovery, performance,
  report; AC-22…AC-26. Then hand to host gates and QA (AC-27).

## 6. Acceptance criteria (cite as `P8A-AC-nn`)

- **AC-01** §2 fingerprint and pre-change baseline recorded.
- **AC-02** Changed paths ⊆ §3 ∪ §4; overlay digests unchanged.
- **AC-03** Byte-stable: all `lib/**` (catalog, profile, contracts),
  `content/portfolio-approvals.json`, `app/**/layout-contract.ts`,
  `components/responsive/**`, `cockpit-hud.tsx`, `cockpit-app.tsx`
  (`TWEAK_DEFAULTS`), `test-hooks.ts`; Phase 4 34-name bridge assertion green.
- **AC-04** Computed root role tokens and `body` font-family equal base;
  Phase 4/5 HUD parity suites green; theme-toggle rect equals base.
- **AC-05** Only the five families added; Major Mono absent; the remaining
  legacy request unchanged until 8B; font/bundle delta reported.
- **AC-06** On `/`, `/projects`, six `/projects/[slug]`, `/about` at
  1440×900 and 320px: titles Newsreader; body Plex Sans 17–19px, leading
  1.55–1.7, 60–72ch; metadata Plex Mono 12–14px; section headings Plex
  Sans/Condensed semibold; nav/actions Plex Sans 14–16px (computed first
  family equals the raw variable's first family).
- **AC-07** Font requests blocked: routes complete, no 320px horizontal
  overflow, contrast held.
- **AC-08** Opaque catalogue (alpha-1 backgrounds behind body text), hard
  corners, no document-scope `box-shadow`; accessible-name, heading and link
  inventories equal base.
- **AC-09** Existing Phase 2 audit, contrast, 44px, forced-colors and
  reduced-motion tests green in both appearances; five states plus forced
  colors, keyboard, skip link and visible focus verified.
- **AC-10** Tier 1 (no JS) and Tier 2 (no WebGL) green; résumé/contact
  resolve; `/recruiter` → `/about`.
- **AC-11** Boot/warp authored-dark; VT323 only on CRT lines; reduced
  motion static boot, skipped warp; ACCESSIBILITY gating unchanged.
- **AC-12** Theme toggle square, shadowless, behavior unchanged.
- **AC-13** Starfield removed; curved backdrop, static palette gradient per
  theme via `themeTargets`; `raycast` no-op; outside fit/Box3 sources; same
  in all four views.
- **AC-14** DESIGN §8 roles; PMREM emitters cream/fog/jade only; one
  exposure and tone mapping for all camera states.
- **AC-15** Lit solid desk; grid as faint printed ink on a lit material;
  `.grain`/`.vignette` byte-identical.
- **AC-16** `MeshTransmissionMaterial` kept (`depthWrite: false`, vendor
  hooks); original map modulation; DESIGN §7 wear (handled crate/sleeves,
  aged turntable, pristine coffee; AX-01 form unchanged); liners and lit
  jade kept; forced shader failure falls back non-blank and is reported.
- **AC-17** Grounding planes floated 2–5 mm, fixed count, `raycast` no-op,
  never under an artifact root, pickable or Box3-measured object;
  fit/input/pick suites green.
- **AC-18** Seven canvas files: no legacy literal, raw variables only,
  redraw after `document.fonts.load`, drawn strings byte-identical.
- **AC-19** No `Math.random`; `starfield` stream removed; new streams only
  `materials/shell-field`, `materials/wear`; inventory itemized; F2 stays
  blocking.
- **AC-20** Palette lineage (unit + rendered): every color literal in
  `PALETTE`, `THEMES`, light/PMREM/backdrop blocks and `--doc-*` traces to
  an approved DESIGN cream/ink/mauve/fog/jade family token (source audit,
  each literal itemized with its token); sampled computed/rendered styles
  match those family tokens; existing measured WCAG contrast checks and
  visual review hold. No new numeric gamut or tolerance is introduced and
  the palette is never silently broadened; an untraceable literal is a
  reported failure, never loosened.
- **AC-21** Context-loss restore non-blank with backdrop, PMREM, maps and
  decals; repeated-failure routing unchanged.
- **AC-22** §9.6.2 non-blank and §9.6.4 zero unexpected errors at the
  twelve §9.1 normal viewports × rest/crate/deck/monitor × both themes, plus
  one contained case. The full applicable plan §9.1 matrix stays required:
  all twelve normal viewports; narrow 800×450, 683×325, 512×300, 320×568;
  large 3840×2160; real browser zoom 120%, 150%, 200%; and the current
  required browser/accessibility coverage. No Phase 9 CI expansion or new
  tooling is pulled into 8A. The 8B-only obligations (no legacy HUD font
  families; integration with delivered, completed Phase 6/7 solver suites;
  accepted replacement baselines) stay at 8B per the approved split, not
  waived.
- **AC-23** `scripts/perf/dpr-baseline.ts` on SwiftShader vs
  `docs/baselines/phase-3-dpr/software-swiftshader-2026-08-01.json`: deck and
  crate median frame time ≤ +15%, no new sustained long tasks, `DPR_CAP`
  unchanged. Exceeding blocks; waivers owner-only; hardware runs owner-only.
- **AC-24** §7 commands green, fresh, on the exact snapshot.
- **AC-25** Focused before/after candidate screenshots (owner-requested,
  no commit required): 2560×1440 primary, 1440×900, 1024×600,
  narrow (`ResponsiveStage` crop, 320px reflow), 3440×1440; both themes;
  boot, warp, rest, crate, deck, monitor, semantic pages. Captured with
  existing Playwright/browser APIs inside the §4 appended test blocks or
  focused host checks, saved in `docs/baselines/phase-8a-candidate/`; each
  records base SHA plus `git diff --binary` and untracked-file digests, fixed
  capture state, backend identity, viewport and DPR; backends never
  compared; same-backend repeat determinism; deck overlap labelled Phase 6.
  Not a new runner, script or framework; no old-baseline comparison; never
  presented as accepted replacement baselines. These screenshots are a
  subset of evidence, not a reduction of AC-22's matrix. Official
  `visual-scorecard.ts` replacement-baseline certification stays at
  8B/owner (O-2).
- **AC-26** Report: suspension, stream inventory, each test edit,
  performance, fingerprints, baseline, and that the HUD keeps legacy
  families until 8B, so 8A is not publishable.
- **AC-27** Fresh read-only Codex QA, no blocking finding; its scope
  includes the B0 support changes.
- **AC-28** B0 (§9): diff of the two support paths limited to §9; base test
  inventory, CI matrix expectations and `.github/workflows/ci.yml` unchanged;
  regression test present and green; no Phase 6 inventory or shard
  assertion imported.

## 7. Validation and QA

Host, exact disposable snapshot: `npm ci`, `npm run build`, `npm run lint`,
`npm run typecheck:contracts`, `npm run validate:contracts`,
`npm run test:unit`, `npm run test:e2e` (`CI=true` where existing host
policy requires). `npm run build` takes the documented canonical origin
(`docs/phase-2-design.md`, `SITE_URL` resolution, owner decision D1) as a host process variable for that
invocation only: `NEXT_PUBLIC_SITE_URL=https://www.alexxiong.me`, recorded
in the gate log; no env/config file or source URL change. If
`run-e2e.mjs` still cannot run on the host after the §9 B0 repair, block;
never import more of the primary checkout's repair. Reviewer: a new `codex exec` process and
session (never the engineer's, resumed or forked), read-only sandbox,
`approval_policy` never, own output file; identity from CLI version, session
ID and rollout telemetry, not self-report. Inputs: this brief, fingerprint,
diff, host gate logs. Findings carry severity, file/line, evidence and
reproduction. Denied launch, identity mismatch, integrity drift, red or
missing gate, or a blocking finding blocks; fixes need a new engineering
turn and another fresh reviewer. Then **stop** for owner visual review of
the AC-25 candidate screenshots and any OD-3 decisions (commits,
publication, replacement baselines); no commit is a prerequisite for 8A
evidence. 8A does not complete Phase 8; 8B, the replacement set and
the checkpoint follow delivered Phases 6/7.

## 8. Labelled items (do not resolve by inference)

Resolved interpretations (not blockers):

- **O-1** Resolved consent interpretation: the owner approved the 8A/8B
  package and implementation intent (OD-1, OD-2), which satisfies plan
  Phase 8's owner-approved-design requirement for 8A; this derived brief is
  not separately owner-reviewed and adds no scope, so no further approval is
  pending. Any actual departure from the approved package returns to the
  owner.
- **O-2** `scripts/perf/visual-scorecard.ts` requires clean committed source
  (host-verified at `bfa8d8234fd698c8053fd9915a91b8ceeb5bd04e`, lines
  460–465). That guard governs only the canonical scorecard harness, which
  8A neither runs for certification nor modifies or bypasses. AC-25
  candidate screenshots need no commit. If a specific evidence obligation
  truly cannot be met without an out-of-scope change, that obligation alone
  blocks.
- **O-5** Ordinary specified type roles under approved DESIGN §4: VT323 for
  actual CRT/terminal lines; IBM Plex Mono for non-CRT boot status text
  (including `.term-display` numerals). No fresh font consent is needed.

Genuine constraints (stop only on actual, observed failure; never
pre-assumed):

- **O-3** Boot red `#B13A2A` and its glitch `textShadow` are a known
  residual defect outside the narrowed boot scope: recorded, not fixed, no
  code scope added here.
- **O-4** `next/font/google` fetches at build; if the host actually denies
  the fetch, stop (local font files are out of bounds).
- **O-6** If appended e2e blocks actually exceed CI job timeouts, stop
  (`ci.yml` is out of bounds).

## 9. Amendment OD-2a — Windows runner repair (2026-10-27, prospective)

**Provenance (agent-recorded, not an owner signature).** After the
orchestrator reported the blocked pre-change baseline and asked whether to
permit the existing two-file Windows runner repair with separate fresh Codex
QA, the owner wrote in the orchestration chat, verbatim:

> Approve a narrow amendment permitting the existing two-file Windows runner
> repair in this candidate, skip QA and Independent QA right now, I just want
> the visuals to be implemented ASAP.

Relayed by the orchestrator; recorded here by `portfolio-design`
(documentation only). Sections 1–8 above were amended in place only where
they contradicted this record; the historical proposal in
`docs/visual-first-amendment.md` §§1–5 is unchanged.

**Observed baseline that triggered it (orchestrator-reported; original
evidence in `docs/agent-handoff.md`, 2026-10-27T17:02:38Z).** Detached
`bfa8d8234fd698c8053fd9915a91b8ceeb5bd04e` with the exact eleven-file §2
overlay: `npm ci`, lint, `typecheck:contracts`, `validate:contracts` pass;
build fails (no HTTPS site origin); `test:unit` 386 pass / 2 fail
(`e2e-runner.test.ts` Windows path inventory and LF-only workflow regex);
`CI=true test:e2e` fails with "No tests found" for `e2e\foundation.spec.ts`.
No engineer or QA was launched. That evidence stays as recorded.

**What is permitted (B0, before B1).**

1. Base and overlay paths unchanged: same base SHA, same eleven overlay
   paths. The two overlay documents amended for OD-2a carry refreshed
   digests; the original pre-change manifest and evidence are preserved;
   all other overlay bytes are unchanged. No `scripts/**`, `tests/**` or Phase 6 file is overlaid
   wholesale; the engineer authors B0 on the base files.
2. `scripts/run-e2e.mjs`: normalize each discovered spec path to forward
   slashes (split on `path.sep`, join with `/`). No other change.
3. `tests/unit/e2e-runner.test.ts`: (a) one regression test asserting that
   discovered paths are sorted, forward-slash and point to existing files,
   using a spec present at the base (e.g. `e2e/foundation.spec.ts`);
   (b) make the existing workflow checks accept LF and CRLF bytes and test
   both. Base spec inventory and CI expectations are preserved.
4. **Not permitted:** copying or importing the primary checkout's
   `phase6-deck` inventory or shard assertions (absent at `bfa8d82`); any
   CI/spec inventory, `ci.yml`, `playwright.config.ts`, timeout, retry,
   skip, threshold or config change; migrations; Phase 6 product work.

**Effect on stop conditions.** This one observed runner failure no longer
blocks bounded engineering. Every other §1 stop condition stands. The build
origin is handled by the §7 host-only invocation variable.

**QA steering.** "Skip QA and Independent QA right now" is read as
**deferring** review until implementation is done. It does not waive or
replace AC-27: higher-priority session rules require a separate fresh
read-only Codex review before completion or acceptance, and the owner was
told so. No self-review or Claude review substitutes for it. The five fixed
host gates, build and browser evidence (AC-22…AC-25) remain required on the
exact final disposable snapshot, and the review covers the B0 changes.

**Not granted.** No commit, push, publication, checkpoint, replacement
baseline, performance waiver, gate waiver or migration step. OD-3 stays
separate and owner-authored.

## 10. Visual revision §4A — native Opus 5.5 engineer (2026-10-27, prospective)

**Provenance.** Owner request and approval, verbatim, in
`docs/phase-8a-visual-revision.md` §7 (agent-recorded, not signatures).
They grant the requested visual intent and one future native Opus 5.5
engineering handoff. They do **not** approve that document's D-1/D-2/D-3,
V1–V7 as thresholds, hover/font-size/dynamic-shadow extensions, PC model
changes or OD-3. §§1–9 stand except where this section narrows them.

**Exception (one-time, provider only).** For the revision's §4A corrections
only, one native Claude Code Opus 5.5 implementation session, in the
separate `portfolio-8a-engineer` role (never `portfolio-design`), replaces
the §1 "one Codex engineer". Nothing else changes: Astra in Claude Code
stays orchestrator; the migration bootstrap, runner and general phase
ownership are untouched; no phase command except `status`. The separate
fresh read-only Codex reviewer of §7 stays mandatory after implementation;
Claude review or self-review never substitutes. No fallback provider, no
resume of the original Codex engineer, no competing writer, no sandbox or
permission weakening. Scope is §4A inside the §3 closed paths; anything
outside them stops and returns to the owner.

**Prerequisites (status 2026-10-27: item 1 done; items 2–5 open).** Only
the session that made the stored edits is barred from implementation; a new
compatible session may dispatch after items 2–5 pass. *OD-R1 (owner,
2026-10-27; record in `docs/phase-8a-recovery-plan.md` §6, approved pre-edit
SHA-256 `71305b786341cbff681345c48732ce56ec06e5869232212c8851414eab875739`,
copy at `C:/Users/alexx/Documents/portfolio3.0-phase8a-recovery/od-r1-approved-plan-71305b786341.md`)
approved Route B and the plan's §5 amendments to items 2–4 below; it
approves no visual implementation. Profile alignment was applied by the
orchestrator under owner permission, subject to verification; none of it is
active in the session that made it or in any resumed session.*

1. Stored-prompt alignment by the orchestrator: done 2026-10-27 under the
   owner's manual permission (`.claude/agents/portfolio-orchestrator.md`
   updated with this §4A exception; `.claude/agents/portfolio-8a-engineer.md`
   created, model opus, no delegation). The earlier `[Self-Modification]`
   denial stays on record. No new session or engineer launched yet.
2. A **new** compatible orchestrator session. It verifies and preserves the
   recovered evidence at `C:/Users/alexx/Documents/portfolio3.0-phase8a-recovery`
   (`preview-after.json`, `preview-recovery-integrity.json`,
   `preview-browser.json`; candidate `phase8a-candidate`, source baseline
   `phase8a-baseline`; never the retired scratchpad). Base stays
   `bfa8d8234fd698c8053fd9915a91b8ceeb5bd04e`; the existing candidate
   production diff is kept. *OD-R1 alternative:* the work location may
   instead be the owner-approved successor
   `C:/Users/alexx/Documents/portfolio3.0-phase8a-recovery/phase8a-candidate-r2`,
   created only by Route B of `docs/phase-8a-recovery-plan.md` and carrying
   the existing candidate's verified bytes at the same base. The original
   `phase8a-candidate`, `phase8a-baseline` and all evidence stay preserved
   in place, read-only; no Git command runs in either original tree.
3. Integrity. Context recorded at 19:20:46Z (not certification): diff
   `e5a40c5e47e537be9b63a74cf8789a6e4b9d79743e804122660d0486b30f8843`,
   status `30b229a639d93fc6724b05ceef5d89120b8d7619e3b917bcfbce41cf9f5db7e4`,
   report `bd9de09cf4657972d8f306e7153bb9979974d5f8ee60b63cecd8c77664087449`
   matched the prior preview; the raw Git index (`0c27b84c…`) still differs
   from pre-engineering (`fdce5bcf…`), cause unestablished. That drift must
   be reconciled or independently proven (plan Route A) before integrity is
   claimed or engineering is dispatched, or, if the original bytes are
   unavailable, the owner-approved provenance transition in
   `docs/phase-8a-recovery-plan.md` must complete with RB-1…RB-8 (incl.
   RB-7L) and a PASS from a new fresh read-only Codex custody review; the
   `fdce` gap stays disclosed, never reconciled or accepted by it. Never
   rewrite the index or bypass a guard to make hashes match; any drift or
   missing proof blocks.
4. Bounded governance refresh. Record a **new** overlay revision manifest
   (path + SHA-256; the original §2 manifest and OD-2a digests stay
   preserved) and refresh byte-for-byte from the primary checkout only the
   original eleven §2 governance paths plus `docs/phase-8a-visual-revision.md`
   and `.claude/agents/portfolio-8a-engineer.md`. No primary production,
   tests, scripts, settings or hooks are imported; no geometry, HUD or
   Phase 6 work. After a Route B PASS, this refresh operates on the
   successor only, with its own new manifest; it never overwrites the
   original candidate, baseline, their manifests or historical evidence.
5. Identity. Before any edit, actual Claude Code CLI/transcript metadata
   must show model `claude-opus-5-5` for the engineer session; self-report
   never counts. Absent, mismatched or permission-denied: stop.

**OD-R1 stop.** Route B runs only in a **new** compatible session and ends
at the custody report to the owner, PASS or BLOCKED. Items 4–5, engineer
launch, build, the five gates, AC-22…AC-25 browser/performance evidence,
the fresh read-only Codex product QA and owner visual review then need a
separately directed continuation; none follows automatically.

**Custody continuation (OD-R1-C1, prospective, not executed).** The Route B
custody review (`01a17f3d-ce40-7c32-b055-4a43cc95a48a`) returned BLOCKED.
That result stands, and nothing earlier becomes PASS. Item 3's
"PASS from a new fresh read-only Codex custody review" may instead come
from the procedure in `docs/phase-8a-custody-continuation.md`:

- the existing successor, reused read-only;
- fixed primary Git-inventory and preview-observation evidence collected
  by the host under ordinary permissions;
- exactly one new fresh read-only Codex reviewer, who reassesses
  RB-1…RB-8 (incl. RB-7L);
- a new evidence directory only.

The procedure runs only in a new compatible session that the owner starts
for that review-only task. Its narrow supersession of "no retry by
another route" covers only that named procedure. It does not cover the
editing session, other commands, or any later attempt. Any denial or
missing proof stops the procedure. The `fdce` gap stays disclosed. The
procedure ends at the custody report, whether PASS or BLOCKED, and the
items 4–5 stop above still applies.

**Completion still requires** the §7 host-only build and all five gates on
the exact final disposable snapshot, the AC-22…AC-25 browser and
performance evidence, and the fresh read-only Codex review (deferred per
OD-2a, not waived). Then stop for owner visual review. No commit, push,
publication, acceptance or replacement baseline; checkpoints, content and
historical evidence stay as recorded.
