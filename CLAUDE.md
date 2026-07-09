# Portfolio 3.0 — CLAUDE.md

> Living doc — describes the CURRENT state only, no history. Update via `/update-claude-md` after meaningful changes. Hard budget: ≤ 9,000 characters.

## Overview
**Owner**: Alex Xiong (Ne8ula) · **Deploy**: Vercel · **Repo**: github.com/Ne8ula/portfolio3.0
Personal portfolio, the "Editorial Cockpit": boot a retro terminal → warp tunnel → land first-person at a 3D desk. Aesthetic: **artifacts under glass** — vinyl crate of projects (left), A.X/STUDIO turntable (center), "AX-01" workstation PC (right), pour-over + mug (FAR left — look left), on a wireframe-schematic desk. Editorial HUD, live weather, dark/light theme.

## Dev
`npm run dev` / `build` / `start` / `lint`. Next.js 16 App Router (Turbopack), React 19, TS with `ignoreBuildErrors`; 3D/HUD files use `@ts-nocheck`. three.js `^0.184` **imperative** (no React Three Fiber — do not convert). `@pmndrs/vanilla` supplies MeshTransmissionMaterial. `postprocessing` + `three-mesh-bvh` installed, NOT yet wired. Tailwind v4 tokens + inline styles with CSS vars. Fonts via `<link>` in [app/layout.tsx](app/layout.tsx). `public/micrographics/`: 70 SVG sticker sheets (few used — see decals.ts). Unused deps (R3F, drei, zustand, framer-motion…) — prune freely.

## User flow
1. **Boot** — POST terminal, ends on an `[ENTER THE ROOM]` confirm (Enter/Space/click).
2. **Warp** — ~1.8s trance tunnel → cockpit.
3. **Cockpit** — cursor free-look (±22° yaw, ±15° pitch), seated-at-desk framing; camera + objects dead still (only the platter spins). Wireframe SVG cursor; no center reticle.
   - **PC**: hover → jade brackets "AX/OS · CLICK TO ENTER"; click → camera dollies to the screen (`monitor` view) + AX/OS ScreenDialog (future chatbot). Esc exits.
   - **Crate**: hover → brackets "ARCHIVE · CLICK TO BROWSE"; click → `crate` view (steep top-down; FIXED camera). Hover only HIGHLIGHTS a record (jade pins + halo). CLICK pulls it out: it and every record in front tip by the same angle (parallel ⇒ cannot clip), disc slides out, bin dims, VinylInfoCard + ◄/► arrows step the stack. Click again / empty space puts it back; empty space with nothing pulled exits.
   - **Theme toggle** (bottom-right) renders ONLY in `cockpit` view; persists to `localStorage['cockpit-theme']`; boot/warp always dark.

## Architecture (components/cockpit/ — the whole app)
| File | Role |
|---|---|
| cockpit-app.tsx | Phase machine (boot→warp→cockpit), theme state, `TWEAK_DEFAULTS` pushed into the scene via a **persistent apply loop (~180 frames)** — keep it; single-shot apply loses to StrictMode remounts. |
| cockpit-hud.tsx | `Cockpit`: mounts GlobeCanvas + DOM HUD. SiteHeader (AX glyph · weather chip: Open-Meteo + geolocation, NYC fallback). PC/Crate hover brackets, VinylInfoCard + browse arrows, ScreenDialog (matrix3d-mapped onto the 3D screen), `esc·return` in focused modes. |
| globe-canvas.tsx | Imperative three.js scene: schematic wireframe desk, starfield, lights + PMREM env, free-look camera. View modes `cockpit`/`monitor`/`crate`. Builds glass-mac, vinyl-crate, turntable, coffee; owns the render loop + theme registry. |
| materials.ts | Shared recipes: `PALETTE`, `makeHeroGlass()` (drei-vanilla MeshTransmissionMaterial, `transmissionSampler:true` → rides three's built-in transmission buffer, no FBO), `makeFrost()` (MeshPhysicalMaterial frosted acrylic). |
| decals.ts | `makeDecal(file,{width,tint,opacity})` rasterizes a `public/micrographics/` sheet at 4×, flat-tints it, swaps Roboto Mono → system mono (SVG-in-img can't load webfonts). `makeTextDecal(draw,{...})` = bespoke canvas cluster. Planes float ~3mm off faces. |
| glass-mac.ts | The PC ("AX-01" workstation), built into `xray`: hero-glass monitor casing + cream bezel + ivory "hello." screen w/ micrographic rails, cream hinge clamps + ribbed roller, off-white 60% QWERTY wedge (one sage BACKSPACE) on smoked-frost skirt, static dome mouse. `applyTheme()` swaps screen wallpaper (dark CRT ↔ ivory). Returns `{ keyboard(setOffset), applyTheme }`. |
| vinyl-crate.ts | `PROJECTS` (15 placeholders: title/category/date/palette) → "VINYL CRATE 007": frosted rounded-panel shell (tall back/sides, stepped-down front, off-white base band on feet, proud front label plate), SVG sticker decals + jade tabs. Records blur through walls. Hover = pin+halo (lazy VertexNormalsHelper at scene root, removed in `disposeCrate`); click = pull-out (`selectedIdx` drives motion/dim/card/arrows). Owns crate picking + view-mode entry/exit. |
| turntable.ts | Decorative "A.X / STUDIO" deck: off-white base on feet, THIN 5-panel frosted cover shell (`coverMat`: low ior/env so grazing fresnel doesn't wash the lid), green-glass platter (opaque on purpose) + taupe grooved mat + sage label, silver tonearm, pitch slider, canvas+SVG micrographics. Only the spin group animates. |
| coffee.ts | Coffee station, FAR left. Pour-over stack: frosted cone (scalloped filter + grounds) on a receiving cup — cream band, V-spout molded into the CUP facing the mug, D-handles yawed away (silhouette-visible). Frosted mug. Cockpit-view click loop (no camera focus): idle drip → click dripper → stack arcs over and tilts AROUND THE CUP'S SPOUT (`SPOUT_H` keeps its base off the mug rim) → mug fills → ASCII smoke plume → click full mug → slow drain. `__cockpitCoffee.setDripper/setMug`. |
| cursors.ts | `CURSOR_DEFAULT` / `CURSOR_POINTER` — wireframe SVG data-URI cursors. |
| boot-screen / warp-transition / theme-toggle | Intro phases + toggle. |

[app/page.tsx](app/page.tsx) dynamically imports CockpitApp (`ssr:false`). [app/globals.css](app/globals.css): tokens + keyframes. `References/`, `3DModels/`, `backend/`, `frontend*/`, `database/` are side dirs, not the app.

## window.__cockpit* bridge (preserve this contract)
Objects: `__cockpitScene/Camera/Renderer/TableGroup` · `__cockpitPC.setTransform({x,y,z,scale,yaw,pitch,roll})` · `__cockpitKeyboard.setOffset({x,y,z})` · `__cockpitVinyl.setTransform({x,y,z,rx,ry,rz,s})` · `__cockpitTurntable.setTransform({x,y,z,ry,s})` · `__cockpitFPV.setOffset({height,distance})` · `__cockpitTick(dt,t)`.
View mode: `__setCockpitViewMode(m)` / `__cockpitViewMode`; CustomEvents `cockpit-view-mode`, `cockpit-hover` (PC), `cockpit-crate-hover`, `cockpit-theme`.
Screen-space getters (HUD polls per rAF): `__getCockpitScreenRect` (screen quad → ScreenDialog), `__getCockpitPCRect`, `__getCockpitCrateRect`, `__getCockpitVinylHover` → `{x,y,index,count,title,category,date}` (PULLED record, null if none) · `__cockpitVinylSelect(±1)` steps it (HUD arrows).
**Screen contract**: glass-mac sets `xray.userData.screenGroup` + `screenCorners{tl,tr,bl,br}` — the monitor-view camera and ScreenDialog (chatbot) depend on it. Keep it when remodeling the PC.

## Layout dial-ins (TWEAK_DEFAULTS in cockpit-app.tsx)
Crate `(-3.2, .18, 1.15)` ry `.35` s `1.45` · turntable `(0, .18, .8)` ry `0` s `1.4` · PC `(4.7, .18, .4)` yaw `-.5` s `1.5` · fpv height `-2.4` dist `-.6` · coffee (baked in coffee.ts): brewer `(-7.8, .18, 1.9)` s `1.45`, mug `(-5.9, .18, 2.1)` s `1.25`. Tune live via window setters, then bake back.

## Design system
Palette: cream / ink / mauve + **jade as the only chromatic accent** (never red). Tokens in globals.css; 3D palette in [materials.ts](components/cockpit/materials.ts) `PALETTE`. Serif Cormorant Garamond; mono JetBrains Mono. `--radius: 0`. `.grain` + `.vignette`. Dark default. 3D language: product-render objects (off-white satin bases, milky frost, micrographic silkscreens — decal TEXT `#6F8D75`, solid accent bars jade `0x4B6E4F` on LIT materials) + webgl diagnostics on desk + crate pins.

## Gotchas
- StrictMode double-mounts GlobeCanvas in dev — cleanup nulls bridge globals; hence the persistent apply loop.
- Hero glass is transmissive, NOT alpha-blended: it can fully enclose opaque objects. Keep `depthWrite:false` so lines/sprites INSIDE aren't depth-culled. Alpha-blended translucency must never overlap.
- Transmissive materials don't see each other in the transmission buffer — no glass behind glass.
- A SOLID transmissive volume reads as a milk slab — build covers/bins as thin panel shells.
- Unlit `MeshBasicMaterial` accents glow like light-bars over the dim scene — printed-ink accents must be LIT materials.
- Never leave faces coplanar — z-fights flash, worst under spinning geometry; float/sink a few mm. Keep hero-glass `anisotropicBlur` low.
- VertexNormalsHelper positions in WORLD space — add at scene root, `.update()` per frame while visible.
- ScreenDialog `send()` is a stub. Its idle "hello." panel is a theme-aware DOM overlay covering the 3D screen texture.
- Weather reverse-geocode can hit CORS on localhost — falls back to coords-only.

## Next
Real project data in `PROJECTS` + record click-through · chatbot behind ScreenDialog · wire `postprocessing` (grain/vignette + jade bloom) · `prefers-reduced-motion` · mobile fallback.
