# Portfolio 3.0 — CLAUDE.md

> Living doc — describes the CURRENT state only, no history. Update via the `/update-claude-md` skill after meaningful changes. Hard budget: ≤ 9,000 characters.

## Overview
**Owner**: Alex Xiong (Ne8ula) · **Deploy**: Vercel · **Repo**: github.com/Ne8ula/portfolio3.0
Personal portfolio, the "Editorial Cockpit": boot a retro terminal → warp tunnel → land first-person at a 3D desk. Aesthetic: **artifacts under glass** — a frosted-acrylic vinyl crate of projects (left), a turntable under a glass dust cover (center), a "superglass" retro terminal PC (right), a glass coffee brewer + mug (FAR left — look left), on a wireframe-schematic desk. Editorial HUD chrome, live weather, dark/light theme.

## Dev
`npm run dev` / `build` / `start` / `lint`. Next.js 16 App Router (Turbopack), React 19, TS with `ignoreBuildErrors`; 3D/HUD files use `@ts-nocheck`. three.js `^0.184` **imperative** (no React Three Fiber — do not convert). `@pmndrs/vanilla` supplies MeshTransmissionMaterial. `postprocessing` + `three-mesh-bvh` installed, NOT yet wired. Tailwind v4 tokens + mostly inline styles with CSS vars. Fonts via `<link>` in [app/layout.tsx](app/layout.tsx) (Cormorant Garamond, JetBrains Mono, VT323, Major Mono Display). Unused deps (R3F, drei, zustand, framer-motion, shadcn/radix…) — prune freely.

## User flow
1. **Boot** — POST terminal, ends on an `[ENTER THE ROOM]` confirm (Enter/Space/click).
2. **Warp** — ~1.8s trance tunnel → cockpit.
3. **Cockpit** — cursor free-look (±22° yaw, ±15° pitch), seated-at-desk framing; camera + objects dead still (no bob/sway — only the platter spins). Custom wireframe SVG cursor; no center reticle.
   - **PC**: hover → jade brackets "AX/OS · CLICK TO ENTER"; click → camera dollies to the screen (`monitor` view) with the AX/OS ScreenDialog (the future chatbot surface). Esc or `esc·return` exits.
   - **Crate**: hover → brackets "ARCHIVE · CLICK TO BROWSE"; click → `crate` view (steep top-down over the bin; FIXED camera — no cursor parallax). Hover only HIGHLIGHTS a record (jade pins + halo — no motion). CLICK pulls it out: it and every record in front tip by the same angle (parallel ⇒ cannot clip), disc slides out, the bin dims, VinylInfoCard shows n°/category/date/title, ◄/► arrows step the stack. Click again or empty space puts it back; empty space with nothing pulled exits.
   - **Theme toggle** (bottom-right) renders ONLY in the `cockpit` view mode; persists to `localStorage['cockpit-theme']`; boot/warp always dark.

## Architecture (components/cockpit/ — the whole app)
| File | Role |
|---|---|
| cockpit-app.tsx | Phase machine (boot→warp→cockpit), theme state, `TWEAK_DEFAULTS` layout values pushed into the scene via a **persistent apply loop (~180 frames)** — keep it; single-shot apply loses to StrictMode remounts. |
| cockpit-hud.tsx | `Cockpit`: mounts GlobeCanvas + DOM HUD. SiteHeader (AX glyph · A\|XIONG *studio* · weather chip: Open-Meteo + geolocation, NYC fallback). PC/Crate hover brackets, VinylInfoCard (fixed bottom-center placard) + browse arrows + hint chip, ScreenDialog (matrix3d-mapped onto the 3D screen), `esc·return` in focused modes. |
| globe-canvas.tsx | Imperative three.js scene: desk, starfield, lights + PMREM env, free-look camera. View modes `cockpit`/`monitor`/`crate`. Desk is webgl_helpers-style schematic: triangulated `WireframeGeometry` grid/legs/shelf + jade pin ticks. Builds glass-mac, vinyl-crate, turntable, coffee; owns the render loop + theme registry. |
| materials.ts | Shared recipes: `PALETTE`, `makeHeroGlass()` (drei-vanilla MeshTransmissionMaterial, `transmissionSampler:true` → rides three's built-in transmission buffer, no FBO), `makeFrost()` (MeshPhysicalMaterial frosted acrylic). All desk-object glass tunes from here. |
| glass-mac.ts | The PC ("superglass terminal"): extruded grain-textured wedge base, dark key tray + transmission-frost keycaps (one jade), frosted neck, hero-glass head (2.6w > 2.45 tray) fully enclosing a dark CRT block (screen fills its face; no vent grille), wire looms/jade-glow sprites in the air gap. **No mouse.** `applyTheme()`: CRT/tray/screen dark ↔ cream. Returns `{ keyboard(setOffset), applyTheme }`. |
| vinyl-crate.ts | `PROJECTS` array (15 placeholders: title/category/date/palette) → frosted-acrylic bin auto-sized to the count (ink floor; records blur through walls). Matte sleeves, clearcoat discs. Hover = pin+halo highlight (lazy VertexNormalsHelper at scene root, removed in `disposeCrate`); click = pull-out (`selectedIdx` drives motion, dim, card, arrows). Owns crate picking + view-mode entry/exit. |
| turntable.ts | Decorative AT-LP-style deck (spinning platter, brushed-metal PBR plinth) under a hero-glass dust cover; jade `PolarGridHelper` calibration ring around the platter. Desk center. |
| coffee.ts | Coffee station, far-left. Chemex-style one-piece hero-glass brewer (lathe): frosted waist + jade tie, matte OPAQUE filter cone (glass-in-glass vanishes — see gotchas), draining/refilling pool, idle brew-drip. Glass mug. Cockpit-view click loop (no camera focus): brewer arcs over and tilts AROUND ITS SPOUT (stream never drifts), fills mug + 3 trailing drips → ASCII smoke plume (~90 glyphs) → click full mug → slow drain. `__cockpitCoffee.setDripper/setMug`. |
| cursors.ts | `CURSOR_DEFAULT` / `CURSOR_POINTER` — wireframe SVG data-URI cursors. |
| boot-screen / warp-transition / theme-toggle | Intro phases + toggle. |

[app/page.tsx](app/page.tsx) dynamically imports CockpitApp (`ssr:false`). [app/globals.css](app/globals.css) holds tokens + keyframes. `References/`, `3DModels/`, `backend/`, `frontend*/`, `database/` are pre-existing side dirs, not part of the app.

## window.__cockpit* bridge (preserve this contract)
Objects: `__cockpitScene/Camera/Renderer/TableGroup` · `__cockpitPC.setTransform({x,y,z,scale,yaw,pitch,roll})` · `__cockpitKeyboard.setOffset({x,y,z})` · `__cockpitVinyl.setTransform({x,y,z,rx,ry,rz,s})` · `__cockpitTurntable.setTransform({x,y,z,ry,s})` · `__cockpitFPV.setOffset({height,distance})` · `__cockpitTick(dt,t)`.
View mode: `__setCockpitViewMode(m)` / `__cockpitViewMode`; CustomEvents `cockpit-view-mode`, `cockpit-hover` (PC), `cockpit-crate-hover`, `cockpit-theme`.
Screen-space getters (HUD polls per rAF): `__getCockpitScreenRect` (screen quad → ScreenDialog), `__getCockpitPCRect`, `__getCockpitCrateRect`, `__getCockpitVinylHover` → `{x,y,index,count,title,category,date}` (the PULLED record, null if none) · `__cockpitVinylSelect(±1)` steps the pulled record (HUD arrows).
**Screen contract**: glass-mac sets `xray.userData.screenGroup` + `screenCorners{tl,tr,bl,br}` — the monitor-view camera and ScreenDialog (chatbot) depend on it. Keep it when remodeling the PC.

## Layout dial-ins (TWEAK_DEFAULTS in cockpit-app.tsx)
Crate `(-3.2, .18, 1.15)` ry `.35` s `1.45` · turntable `(0, .18, .8)` ry `0` (dead-on) s `1.4` · PC `(4.7, .18, .4)` yaw `-.5` s `1.5` · fpv height `-2.4` dist `-.6` · coffee (baked in coffee.ts): brewer `(-7.8, .18, 1.9)` s `1.45`, mug `(-5.9, .18, 2.1)` s `1.25`. Tune live via the window setters (after the ~3s apply window), then bake back.

## Design system
Palette: cream / ink / mauve + **jade as the only chromatic accent** (never red). Tokens in globals.css (`:root` + `html[data-theme="light"]`); 3D palette mirrored in [materials.ts](components/cockpit/materials.ts) `PALETTE`. Display serif Cormorant Garamond; chrome mono JetBrains Mono. `--radius: 0`. `.grain` + `.vignette` overlays. Dark is default. 3D language: artifacts under glass (hero glass / frost) + webgl_helpers diagnostics (normal pins, polar grid, triangulated wireframes).

## Gotchas
- StrictMode double-mounts GlobeCanvas in dev — cleanup nulls bridge globals; hence the persistent apply loop.
- Hero glass (`makeHeroGlass`) is transmissive, NOT alpha-blended: it can fully enclose opaque objects (PC head→CRT, dust cover→deck, coffee). Keep `depthWrite:false` so lines/sprites INSIDE aren't depth-culled. Alpha-blended translucency must never overlap other translucent volumes.
- Transmissive materials don't see each other in the transmission buffer (three hides them when rendering it) — don't stack glass behind glass expecting refraction.
- Never leave faces coplanar — z-fights flash, worst under spinning geometry; float them a few mm. Keep hero-glass `anisotropicBlur` low — its noisy sampling shimmers over moving content.
- VertexNormalsHelper positions in WORLD space — add at scene root and `.update()` per frame while visible.
- ScreenDialog `send()` is a stub awaiting the chatbot API.
- Weather reverse-geocode can hit CORS on localhost — fails gracefully to coords-only.

## Next
Real project data in `PROJECTS` + record click-through · chatbot behind ScreenDialog · wire `postprocessing` (grain/vignette + jade bloom) · `prefers-reduced-motion` · mobile fallback · prune unused deps.
