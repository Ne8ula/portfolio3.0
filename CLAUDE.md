# Portfolio 3.0 — CLAUDE.md

> Living doc — describes the CURRENT state only, no history. Update via `/update-claude-md` after meaningful changes. Hard budget: ≤ 9,000 characters.

## Overview
**Owner**: Alex Xiong (Ne8ula) · **Deploy**: Vercel · **Repo**: Ne8ula/portfolio3.0
The "Editorial Cockpit" portfolio: boot a retro terminal → warp tunnel → land first-person at a 3D desk of **artifacts under glass**. Size hierarchy: vinyl crate + A.X/STUDIO turntable = HEROES, "AX-01" PC (right) secondary, pour-over + mug (FAR left) ambient, hobby decorations below all. Clean at rest; hover a hero → light-jade wireframe trace + name tag (OBJECT · PURPOSE).

## Dev
`npm run dev` / `build` / `start` / `lint`. Next.js 16 App Router (Turbopack), React 19, TS with `ignoreBuildErrors`; 3D/HUD files use `@ts-nocheck`. three.js `^0.184` **imperative** (no React Three Fiber — do not convert). `@pmndrs/vanilla` supplies MeshTransmissionMaterial. `postprocessing` + `three-mesh-bvh` installed, NOT yet wired. Tailwind v4 tokens + inline styles with CSS vars. `public/micrographics/`: 70 SVG sticker sheets (few used — see decals.ts). Unused deps (R3F, drei, zustand…) — prune freely.

## User flow
1. **Boot** — POST terminal, ends on an `[ENTER THE ROOM]` confirm (Enter/Space/click).
2. **Warp** — ~2.5s wireframe airlock (own disposable three.js scene in warp-transition.tsx): a DS-style scan pulse reveals a contour-grid terrain, sliding doors part, camera dollies through; glitch flicker rides the wavefront. The REAL cockpit mounts UNDERNEATH during warp (theme + TWEAK apply loop run from warp on) and a NoBlending portal quad punches a transparent hole tracking the door gap, so the desk shows through, then the scan world dissolves (wrapper fade). Debug: `window.__warpTimeScale = N` slows N×.
3. **Cockpit** — cursor free-look (±22° yaw, ±15° pitch); camera + objects dead still (only the platter spins); wireframe SVG cursor, no reticle.
   - **PC**: hover → tag + glow + jade brackets "AX/OS · CLICK TO ENTER"; click → camera dollies to the screen (`monitor` view) + AX/OS ScreenDialog (future chatbot). Esc exits.
   - **Crate**: hover → tag + glow + brackets "ARCHIVE · CLICK TO BROWSE"; click → `crate` view (steep top-down; FIXED camera). Hover only HIGHLIGHTS a record (jade pins + halo); CLICK pulls it out: it and every record in front tip by the same angle (parallel ⇒ cannot clip), disc slides out, bin dims, VinylInfoCard + ◄/► arrows step the stack. Click again/empty space returns it; empty with none pulled exits.
   - **Theme toggle** (bottom-right) renders ONLY in `cockpit` view; persists to `localStorage['cockpit-theme']`; boot/warp always dark.

## Architecture (components/cockpit/ — the whole app)
| File | Role |
|---|---|
| cockpit-app.tsx | Phase machine (boot→warp→cockpit), theme state, `TWEAK_DEFAULTS` pushed via a **persistent ~180-frame apply loop** — keep it (see Gotchas). |
| cockpit-hud.tsx | `Cockpit`: mounts GlobeCanvas + DOM HUD. SiteHeader (AX glyph · weather chip: Open-Meteo + geolocation, NYC fallback). ObjectTags (hover-only, via `__cockpitHoveredTag`; PC/crate get tag + brackets), VinylInfoCard + browse arrows, ScreenDialog (matrix3d-mapped onto the 3D screen). |
| globe-canvas.tsx | Imperative three.js scene: wireframe desk, starfield, PMREM env, free-look camera. View modes `cockpit`/`monitor`/`crate`. Builds glass-mac, vinyl-crate, turntable, coffee, decorations + edge glow; hover raycast (PC/turntable/coffee → glow + `__cockpitHoveredTag`; crate via its event); owns the render loop + theme registry (`glowLine`/`glowBlend`). |
| materials.ts | Shared recipes: `PALETTE`, `makeHeroGlass()` (drei-vanilla MeshTransmissionMaterial, `transmissionSampler:true`, no FBO), `makeFrost()` (frosted acrylic). |
| decals.ts | `makeDecal(file,opts)` rasterizes a micrographics sheet at 4×, flat-tints it, swaps Roboto Mono → system mono (SVG-in-img can't load webfonts); `makeTextDecal(draw,opts)` = bespoke canvas cluster. Planes float ~3mm off faces. |
| glass-mac.ts | The PC ("AX-01"), built into `xray`: hero-glass monitor casing + cream bezel, ivory "hello." screen, 60% QWERTY wedge, dome mouse. `applyTheme()` swaps wallpaper (dark CRT ↔ ivory). |
| vinyl-crate.ts | `PROJECTS` (15 placeholders) → "VINYL CRATE 007": frosted panel shell, SVG decals + jade tabs. Records blur through walls (recordsGroup is `noGlow`). Hover = pin+halo (lazy VertexNormalsHelper — WORLD space, so it lives at scene root); click = pull-out (`selectedIdx`). Owns crate picking + view-mode entry. |
| turntable.ts | Decorative "A.X / STUDIO" deck: THIN LOW 5-panel frosted cover shell (`coverMat`), green-glass platter, tonearm, jade details. Only the spin group animates. |
| coffee.ts | Coffee station, FAR left: frosted pour-over cone on a receiving cup (V-spout molded into the CUP, faces the mug) + frosted mug on an opaque JADE foot band — SHARES the dripper's `frostG/H` so the set tunes as one; animated liquids `noGlow`. Click loop: dripper → stack arcs over, tilting around the cup's spout (`SPOUT_H` clears the mug rim) → mug fills → ASCII smoke → click full mug → drain. Exposes `getAnchorWorld()` + `glowTargets`. |
| decorations.ts | Hobby props, small/LIT/palette-safe (sax, tablet, gachapon, plant, handheld, shaker). All static EXCEPT two clickables (`root.tick`; takes camera+renderer; PC hitbox wins overlapping clicks): shaker — frosted flip-cap bottle, half-fill shake, near-crate height (s 2.2) beside the PC, click → wiggle + slosh; drawing tablet — flat in FRONT of the keyboard, yaw matched to the PC: hero-glass shell over an opaque cream liner (liner is REQUIRED — the see-through desk shows the void through bare transmissive glass) + cream edge lines, charcoal plate PROUD of the rim (transparent decals can't sit under transmissive glass), faked-recess 5-button strip (leftmost button JADE), jade plate strip + nib, micro-dot decal, stylus leaning on the front rim with its rear cap ON the desk (gravity pose), click → lifts + scribbles ~1.6s. `__cockpitDecor.list()`/`.set()`. |
| highlights.ts | `makeEdgeGlow()`: hover-only wireframe — EdgesGeometry traces per hero (one shared mat each), invisible at rest, ease in on hover. Normal-blend saturated light jade; depthWrite + depthTest OFF (x-ray) + renderOrder 999. Per-target `edgeThresh`/`minRadius` (crate `10°/.05`). `userData.noGlow` silences a subtree; tiny meshes + transparent-basic decals skipped. Faded in focused views; themed via `glowLine`/`glowBlend`. |
| cursors.ts / boot-screen / warp-transition / theme-toggle | SVG data-URI cursors · intro phases · toggle. |

[app/page.tsx](app/page.tsx) dynamically imports CockpitApp (`ssr:false`). [app/globals.css](app/globals.css): tokens + keyframes. `References/`, `3DModels/`, `backend/`, `frontend*/`, `database/` are side dirs, not the app.

## window.__cockpit* bridge (preserve this contract)
`__cockpitScene/Camera/Renderer/TableGroup` · setters: `__cockpitPC.setTransform`, `__cockpitKeyboard.setOffset`, `__cockpitVinyl.setTransform`, `__cockpitTurntable.setTransform`, `__cockpitFPV.setOffset`, `__cockpitCoffee.setDripper/setMug`, `__cockpitDecor.set` · `__cockpitTick(dt,t)`.
View mode: `__setCockpitViewMode(m)` / `__cockpitViewMode`; CustomEvents `cockpit-view-mode`, `cockpit-hover` (PC), `cockpit-crate-hover`, `cockpit-theme`.
rAF getters for the HUD: `__getCockpitScreenRect` (screen quad → ScreenDialog), `__getCockpitPCRect`, `__getCockpitCrateRect`, `__getCockpitAnchors` → `[{id,x,y}]` (name tags), `__cockpitHoveredTag` (hovered hero id | null), `__getCockpitVinylHover` (pulled record | null) · `__cockpitVinylSelect(±1)` steps it.
**Screen contract**: glass-mac sets `xray.userData.screenGroup` + `screenCorners{tl,tr,bl,br}` — monitor-view camera + ScreenDialog depend on it; keep when remodeling the PC.

## Layout dial-ins (TWEAK_DEFAULTS in cockpit-app.tsx)
Crate `(-3.7, .18, 1.15)` ry `.35` s `1.7` · turntable `(0.2, .18, .9)` ry `0` s `1.75` · PC `(5.2, .18, 0)` yaw `-.55` s `1.35` · fpv height `-2.4` dist `-.6` · coffee (baked in coffee.ts): dripper `(-7.2, .18, 2.7)` s `1.45`, mug `(-5.6, .18, 3.3)` s `1.25` ry `-.4` · decoration spots baked in decorations.ts. Tune live via window setters, then bake back.

## Design system
Palette: cream / ink / mauve + **jade as the only chromatic accent** (never red). Tokens in globals.css; 3D palette in [materials.ts](components/cockpit/materials.ts) `PALETTE`. Serif Cormorant Garamond; mono JetBrains Mono. `--radius: 0`. `.grain` + `.vignette`. Dark default. 3D language: product-render objects (off-white satin bases, milky frost, micrographic silkscreens — decal TEXT `#6F8D75`, accent bars jade `0x4B6E4F` on LIT materials) + webgl diagnostics + crate pins + hover wireframe glow.

## Gotchas
- StrictMode double-mounts GlobeCanvas in dev — cleanup nulls bridge globals; hence the persistent apply loop.
- Hero glass is transmissive, NOT alpha-blended: it can enclose opaque objects — keep `depthWrite:false` so contents aren't depth-culled; alpha-blended translucency must never overlap.
- Transmissives don't see each other (no glass behind glass); a SOLID transmissive volume reads as a milk slab — build covers/bins as thin panel shells.
- Unlit `MeshBasicMaterial` accents glow like light-bars over the dim scene — printed-ink accents must be LIT materials.
- Never leave faces coplanar — z-fights flash, worst under spinning geometry; float/sink a few mm. Keep hero-glass `anisotropicBlur` low.
- Additive lines clamp to WHITE over cream; transmissive covers depth-cull depth-tested lines — hence the glow's normal blend + `depthTest:false`.
- Keyframes animating `transform` override positioning translates — name tags use `tagFadeIn` (composes both), never `termFadeIn`.
- ScreenDialog `send()` is a stub. Its idle "hello." panel is a theme-aware DOM overlay covering the 3D screen texture.
- Weather reverse-geocode can hit CORS on localhost — falls back to coords-only.

## Next
Real project data in `PROJECTS` + record click-through · chatbot behind ScreenDialog · wire `postprocessing` · `prefers-reduced-motion` · mobile fallback.
