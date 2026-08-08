# Portfolio 3.0 — CLAUDE.md

> Current-state handoff; ≤9,000 characters. Follow `AGENTS.md`'s Claude role
> and handoff protocol. Visual: `DESIGN.md`; technical: `docs/responsive-system.md`.

## Overview

**Owner** Alex Xiong (Ne8ula) · **Deploy** Vercel · **Repo**
Ne8ula/portfolio3.0.

“Editorial Cockpit”: boot a retro terminal → warp → arrive first-person at
Alex’s 3D personal workstation. Project-bearing heroes are the vinyl crate and
A.X / STUDIO turntable; AX-01 PC is the physically larger secondary workstation
anchor; coffee is ambient; personal props stay subordinate. At rest the desk is
quiet. Hover reveals a light-jade wireframe trace and `OBJECT · PURPOSE` tag.

## Stack and scope

Next.js 16 App Router/Turbopack, React 19, Tailwind v4, imperative three.js
`^0.184` with `@pmndrs/vanilla` MeshTransmissionMaterial. **No React Three
Fiber, WebGPU, or TSL.** App scope is `app/`, `components/cockpit/`,
`components/responsive/`, and `lib/`; other top-level app-like directories
are out of scope.

Required gates: `npm run lint | typecheck:contracts | validate:contracts |
test:unit | test:e2e` (Playwright uses a dev server). `next build` ignores TS
errors; the strict `tsconfig.contracts.json` island covers `lib/**`,
`components/responsive/**`, and contract tests (no `@ts-nocheck`); cockpit
modules remain `@ts-nocheck`.

## Current flow

1. **Boot** — POST/typewriter to `[ENTER THE ROOM]`; waits for the operable
   ACCESSIBILITY trigger; reduced motion renders static-ready (no timelines).
2. **Warp** — ~2.5s disposable wireframe airlock over the mounting cockpit.
   `window.__warpTimeScale` slows debugging. Reduced motion skips warp.
3. **Cockpit** — free-look `±22°/±15°`; objects still except purposeful motion
   (platter, interactions); cream arrow becomes jade hand over pickable items.
   - **PC** → `monitor` camera + matrix3d ScreenDialog; send remains a stub.
   - **Crate** → fixed top-down `crate`; hover highlights, click plays a record.
   - **Deck** → sleeve/cover/disc/tonearm sequence, jade beam + in-scene project
     card; VIEW MORE fires `cockpit-project-view` (destination stub).
   - Theme toggle only in base cockpit (`localStorage['cockpit-theme']`);
     boot/warp stay authored-dark.

## Architecture (`components/cockpit/`)

| File | Current responsibility |
|---|---|
| `cockpit-app.tsx` | Phase machine, theme, lifecycle/rebuild, `TWEAK_DEFAULTS`. |
| `cockpit-hud.tsx` | Site header, projected tags/brackets, browse UI, VinylInfoCard, ScreenDialog. |
| `globe-canvas.tsx` | Scene/render loop, camera modes, picking, themes, object builders. |
| `materials.ts` / `decals.ts` / `highlights.ts` | Glass/frost, micrographics, hover-only x-ray edges. |
| `glass-mac.ts` | AX-01 monitor/keyboard/mouse; protected benchmark. |
| `vinyl-crate.ts` / `turntable.ts` | Project selection, deck sequence, disc/card/beam, deck bridge. |
| `coffee.ts` / `decorations.ts` | Coffee loop and subordinate personal props; tablet/shaker clickable. |
| `test-hooks.ts` | Dev-only `__COCKPIT_TEST_HOOKS__`; additive, statically absent in production. |

`components/responsive/` (Phase 1): root `AccessibilityProvider` (matchMedia +
persisted `cockpit-a11y-v1` → `data-a11y-*` on `<html>`), ACCESSIBILITY
trigger/dialog, `ResponsivePage`/`ResponsiveStage`/`SafeFrame`/
`AccessibleExperienceLink`; `/responsive-preview` is the representative page.

Canonical public facts live only in `lib/projects/catalog.ts` +
`lib/portfolio/profile.ts` (six projects + profile owner-approved,
hash-protected); client artwork in `components/cockpit/project-textures.ts`
derives the `SLEEVES` visual tokens.

The root enhances Phase 2's server shell/routes with the cockpit. Phase 3 adds
`ResponsiveStage`, shared sizing, recovery, and canonical fallback.

## `window.__cockpit*` bridge — preserve exactly

Globals: `__cockpitScene/Camera/Renderer/TableGroup`.

Setters: `__cockpitPC.setTransform`, `__cockpitKeyboard.setOffset`,
`__cockpitVinyl.setTransform`, `__cockpitTurntable.setTransform`,
`__cockpitFPV.setOffset`, `__cockpitCoffee.setDripper/setMug`,
`__cockpitDecor.set`; tick: `__cockpitTick(dt,t)`.

View: `__setCockpitViewMode(m)` / `__cockpitViewMode`. Events:
`cockpit-view-mode`, `cockpit-hover`, `cockpit-crate-hover`, `cockpit-theme`,
`cockpit-project-view`.

Deck: `__cockpitDeck.play/eject/busy/index`; crate orchestrates it.

rAF/HUD getters: `__getCockpitScreenRect`, `__getCockpitPCRect`,
`__getCockpitCrateRect`, `__getCockpitAnchors`, `__cockpitHoveredTag`,
`__getCockpitVinylHover`, `__getCockpitDeckInfo`,
`__getCockpitDeckCardRect`;
`__cockpitVinylSelect(±1)` steps crate/deck.

Screen contract: AX-01 sets `xray.userData.screenGroup` and
`screenCorners{tl,tr,bl,br}`; monitor camera and ScreenDialog depend on both.
Test behavior, including Phase 3's `getRendererState()`, is additive only
through dev-only `__COCKPIT_TEST_HOOKS__`; never fold it into this bridge.

## Responsive/content workflow — mandatory

Phases −1 through 3 are delivered; Phase 3 awaits QA/controller commit. The owner-approved
`PROFILE.targetRole` is “Creative Technologist” and its current content hash
is recorded. Before any rendered
UI, layout, typography, 3D framing/material/lighting, interaction, or canonical
content work, read `DESIGN.md` §§13–15, `docs/responsive-system.md`, the
relevant `LayoutContract`/`ContentContract`, and canonical catalog/profile.
Update contracts and matching `data-*` identifiers when views change. A
rendered/content task is unfinished until all five gates pass.

Hard rules:

- The semantic DOM is canonical; no essential fact/action only in JSX, canvas,
  textures, hover, 3D, or client state.
- Never invent facts, ownership, metrics, or outcomes.
- Never create/refresh `content/portfolio-approvals.json` (owner-only); a
  public-field edit intentionally fails validation until owner review.
- Interactive 3D regions require a route or equivalent DOM alternative.
- Models/relative transforms do not respond independently; camera framing,
  negative space, chrome, and projected HUD may adapt.
- Subject HUD follows projected geometry; application chrome follows stage.
- New randomness accepts a seedable named stream; never patch `Math.random`.
- Preserve WCAG 2.2 AA plus the five explicit accessibility states and
  forced-colors precedence.
- The deck overlap belongs to Phase 6; do not stopgap it.

## Design system: current runtime and approved target

`DESIGN.md` is authoritative. Approved doctrine: a dreamlike 2050 personal
workstation expressed through late-1990s translucent electronics; the cockpit
is the machine and explicit semantic project pages are a vinyl-inflected
archival catalogue. Avoid cyberpunk, luxury editorial, illegible experiment,
and interaction overload.

Palette: cream/ink/mauve; jade is the sole chromatic family (60 neutral /
30 material jade / 10 signal jade).
DOM remains `--radius: 0`; physical models may use molded radii. Crate and
turntable are narrative heroes; AX-01 is the physically largest protected
benchmark; coffee/props stay subordinate. Exact runtime transforms remain in
`TWEAK_DEFAULTS`.

Approved typography target: Newsreader (identity/project display), IBM Plex
Sans (body/UI), Plex Sans Condensed (labels), Plex Mono (technical/screen),
VT323 (boot only); runtime still loads Cormorant Garamond + JetBrains Mono
behind role tokens (`--font-display/ui/label/technical/terminal`). The
“Creative Technologist” role (typed once, then stable) is owner-approved in
`PROFILE.targetRole` and covered by the current approval record.

Approved scene target: one photographed studio across all views—soft cream
key, frontal fill, controlled jade transmission/rim, mauve/ink or cream/fog
gradient field, soft physical grounding. Runtime lighting/background is not
migrated. UI drop shadows stay forbidden; physical 3D contact shadows are
allowed. Grain/vignette are restrained finishing, removed by the
reduced-transparency/high-contrast/forced-colors states.

## Gotchas

- Hero glass is transmissive, not alpha transparency: keep `depthWrite:false`;
  transmissives do not see each other; build bins/covers as thin shells.
- Bare transmissive props need opaque liners; solid volumes become milk slabs.
- Printed jade uses lit materials; unlit basic accents resemble light bars.
- Avoid coplanar faces; decals float/sink a few mm. Keep anisotropic blur low.
- Additive lines clamp white over cream; glow uses normal blend,
  `depthTest:false`, `renderOrder:999`.
- Never let an entrance keyframe overwrite a positioning transform: outer
  anchor positions, inner child animates (`tagFadeIn` pattern).
- `ResponsiveStage` owns contained panning; only its inner surface keeps the
  scroll pin. Dialog focus uses `preventScroll`.

## Next

Phase 3 independent QA/controller delivery → Phases 4–8 per the plan.
Approved visual migrations require scheduled rendered work; preserve phase
dependencies.
