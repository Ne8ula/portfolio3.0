# Portfolio 3.0 — CLAUDE.md

> Current-state map; <=9,000 characters. **Workflow: AGENTS.md only.**
> Client/model/role setup: docs/astra-orchestration.md. Visual DESIGN.md;
> technical docs/responsive-system.md.
>
> **Consolidation (2026-10-28):** one bounded-task workflow; phase documents
> are planning/reference, not execution controllers. The runner is shelved,
> not accepted. No Kimi. Fresh independent Codex QA, product checks and
> owner-only approvals remain. Stored edits require a NEW compatible session;
> they do not change this editing session's loaded rules or launch any work.

## Overview

Alex Xiong (Ne8ula) · Vercel · Ne8ula/portfolio3.0. “Editorial Cockpit”: boot
terminal → warp → first-person 3D workstation. Heroes: vinyl crate and A.X /
STUDIO turntable (projects); AX-01 PC is the larger secondary anchor;
coffee/props subordinate. At rest the desk is quiet; hover shows a light-jade
wireframe + `OBJECT · PURPOSE` tag. Next.js 16 (Turbopack), React 19, Tailwind
v4, imperative three.js `^0.184` + `@pmndrs/vanilla`
MeshTransmissionMaterial; **no React Three Fiber, WebGPU, or TSL.** App scope: `app/`, `components/cockpit/`,
`components/responsive/`, `lib/`. Gates: `npm run lint | typecheck:contracts |
validate:contracts | test:unit | test:e2e`. `next build` ignores TS errors;
the `tsconfig.contracts.json` island (`lib/**`, `components/responsive/**`,
contract tests) forbids `@ts-nocheck`; cockpit modules keep it.

## Flow

1. **Boot** — typewriter to `[ENTER THE ROOM]`; waits for the operable
   ACCESSIBILITY trigger; reduced motion is static-ready.
2. **Warp** — ~2.5s wireframe airlock (`window.__warpTimeScale` slows it);
   reduced motion skips it.
3. **Cockpit** — free-look `±22°/±15°` (shaped live visible-box policy, full
   edge envelope, no reduced-motion parallax); cream arrow → jade hand over
   pickables; one same-pointer, sub-slop `pointerup` arbiter. Safe-frame-fitted
   views: **PC** → `monitor` camera + matrix3d ScreenDialog (send stub);
   **Crate** → authored-point top-down `crate`, click plays a record;
   **Deck** → sleeve/cover/disc/tonearm sequence, jade beam + in-scene card,
   VIEW MORE fires `cockpit-project-view` (stub); Phase 6 code anchors
   hint/arrows to the published card with return-control collision
   (unverified, unaccepted). Below `1024×600`, `ResponsiveStage` gives one
   centred native-scroll crop (wheel/drag/keyboard pan, inertia,
   instructions, RESET). Theme toggle only in base cockpit
   (`localStorage['cockpit-theme']`); boot/warp stay dark.

## Architecture (`components/cockpit/`)

`cockpit-app.tsx` phase machine, theme, lifecycle, `TWEAK_DEFAULTS` ·
`cockpit-hud.tsx` header, projected tags, browse UI, VinylInfoCard,
ScreenDialog · `globe-canvas.tsx` render loop, focus fit/pose, picking, themes,
builders · `focus-fit-store.ts`/`pointer-activation.ts` overlay measurement;
click arbiter · `materials.ts`/`decals.ts`/`highlights.ts` glass, micrographics,
x-ray edges · `glass-mac.ts` AX-01 (protected benchmark) ·
`vinyl-crate.ts`/`turntable.ts` selection, deck sequence/card/beam, deck bridge
· `coffee.ts`/`decorations.ts` coffee, props (tablet/shaker clickable) ·
`test-hooks.ts` dev-only `__COCKPIT_TEST_HOOKS__`, absent in production.

`components/responsive/`: root `AccessibilityProvider` (matchMedia + persisted
`cockpit-a11y-v1` → `data-a11y-*` on `<html>`), ACCESSIBILITY trigger/dialog,
`ResponsivePage`/`ResponsiveStage`/`SafeFrame`/`AccessibleExperienceLink`, pan
controller, instructions/RESET; `/responsive-preview` is representative.
Canonical public facts live only in `lib/projects/catalog.ts` +
`lib/portfolio/profile.ts` (six projects + profile, owner-approved,
hash-protected); `components/cockpit/project-textures.ts` derives `SLEEVES`.

## `window.__cockpit*` bridge — preserve exactly

Globals `__cockpitScene/Camera/Renderer/TableGroup`. Setters
`__cockpitPC.setTransform`, `__cockpitKeyboard.setOffset`,
`__cockpitVinyl.setTransform`, `__cockpitTurntable.setTransform`,
`__cockpitFPV.setOffset`, `__cockpitCoffee.setDripper/setMug`,
`__cockpitDecor.set`; tick `__cockpitTick(dt,t)`. View
`__setCockpitViewMode(m)`/`__cockpitViewMode`. Events `cockpit-view-mode`,
`cockpit-hover`, `cockpit-crate-hover`, `cockpit-theme`, `cockpit-project-view`.
Deck `__cockpitDeck.play/eject/busy/index` (crate orchestrates). rAF/HUD
getters `__getCockpitScreenRect`, `__getCockpitPCRect`, `__getCockpitCrateRect`,
`__getCockpitAnchors`, `__cockpitHoveredTag`, `__getCockpitVinylHover`,
`__getCockpitDeckInfo`, `__getCockpitDeckCardRect`; `__cockpitVinylSelect(±1)`
steps crate/deck. AX-01 sets `xray.userData.screenGroup` and
`screenCorners{tl,tr,bl,br}`; monitor camera and ScreenDialog need both. Test
behavior, including `getRendererState()`, is additive only via dev-only
`__COCKPIT_TEST_HOOKS__`; never fold it into this bridge.

## Responsive/content workflow — mandatory

Phases −1–5 are merged (Phase 5 `03fca60`: dated AC-27/AC-28 owner checkpoint,
historical Kimi QA PASS). Phase 6's seven §18 preconditions and D20 path are
owner-approved (2026-10-09); setup `59c3dc9`; step 1 incomplete, unaccepted
(partial `6a15c82`). Sandbox blocks browsers; host F3 mutation proof is
recorded; browser verification, captures, fresh Codex QA, §18 reviews and
owner/CI acceptance remain open (`docs/phase-6-implementation.md`).

Before rendered UI, layout, typography, 3D framing/material/lighting,
interaction, or content work, read `DESIGN.md` §§13–15,
`docs/responsive-system.md`, the relevant `LayoutContract`/`ContentContract`
and catalog/profile; update contracts and `data-*` identifiers when views
change; unfinished until all five gates pass. Hard rules:

- Semantic DOM is canonical: no essential fact/action only in JSX, canvas,
  textures, hover, 3D, or client state. Never invent facts, ownership,
  metrics, or outcomes.
- Never create/refresh `content/portfolio-approvals.json` (owner-only); a
  public-field edit fails validation until owner review.
- Interactive 3D regions need a route or equivalent DOM alternative.
- Models/relative transforms never adapt independently; camera framing,
  negative space, chrome, and projected HUD may. Subject HUD follows projected
  geometry; application chrome follows stage.
- New randomness takes a seedable named stream; never patch `Math.random`.
- WCAG 2.2 AA, five explicit accessibility states, forced-colors precedence.
- The deck overlap needs its complete scoped fix; do not add an unrelated stopgap.

## Design system

`DESIGN.md` is authoritative: a dreamlike 2050 workstation in late-1990s
translucent electronics; semantic project pages are a vinyl-inflected archival
catalogue. Avoid cyberpunk, luxury editorial, illegible experiment,
interaction overload. Cream/ink/mauve; jade is the sole chromatic family (60
neutral / 30 material / 10 signal). DOM `--radius: 0`; models may use molded
radii. Runtime transforms live in `TWEAK_DEFAULTS`. Plan §8 Phase 8 migrates
to the approved targets: Newsreader, IBM Plex Sans/Sans Condensed/Mono, VT323
boot only (runtime: Cormorant Garamond + JetBrains Mono behind
`--font-display/ui/label/technical/terminal`); one photographed studio (soft
cream key, frontal fill, jade transmission/rim, mauve/ink or cream/fog
gradient, soft grounding). No UI drop shadows; physical contact shadows OK.
Grain/vignette drop out under reduced-transparency/high-contrast/forced-colors.
`PROFILE.targetRole` “Creative Technologist” (typed once) is owner-approved.

## Gotchas

- Hero glass is transmissive, not alpha: `depthWrite:false`; transmissives
  don't see each other; bins/covers are thin shells; bare props need opaque
  liners (solid volumes become milk slabs).
- Printed jade uses lit materials (unlit accents look like light bars).
- Avoid coplanar faces; decals float/sink a few mm; low anisotropic blur.
- Additive lines clamp white over cream; glow: normal blend,
  `depthTest:false`, `renderOrder:999`.
- Entrance keyframes never overwrite positioning: outer anchor positions,
  inner child animates (`tagFadeIn`).
- `ResponsiveStage` owns panning; only its inner surface keeps the scroll pin.
  Dialog focus uses `preventScroll`.

## Next

After a fresh compatible read-only startup, wait for the owner's bounded task.
Use AGENTS.md, one handoff and the roadmap; do not resume a phase cursor or
start migration/identity/custody work by default. Phase 6 and the recovered 8A
candidate remain unfinished/unaccepted; their evidence, owner checkpoints and
specific engineering assignments are preserved. The old alignment after-record
is historical: it does not certify these newly edited instructions. No new
session, engineering, QA, commit or acceptance is launched by this update.
