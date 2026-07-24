# Portfolio 3.0 — CLAUDE.md

> Living doc — describes the CURRENT state only, no history. Update via `/update-claude-md` after meaningful changes. Hard budget: ≤ 9,000 characters.

## Overview
**Owner**: Alex Xiong (Ne8ula) · **Deploy**: Vercel · **Repo**: Ne8ula/portfolio3.0
The "Editorial Cockpit" portfolio: boot a retro terminal → warp tunnel → land first-person at a 3D desk of **artifacts under glass**. Size hierarchy: vinyl crate + A.X/STUDIO turntable = HEROES, "AX-01" PC (right) secondary, pour-over + mug (FAR left) ambient, hobby decorations below all. Clean at rest; hover a hero → light-jade wireframe trace + name tag (OBJECT · PURPOSE).

## Dev
`npm run dev` / `build` / `start` / `lint`. Next.js 16 App Router (Turbopack), React 19, TS with `ignoreBuildErrors`; 3D/HUD files use `@ts-nocheck`. three.js `^0.184` **imperative** (no React Three Fiber — do not convert). `@pmndrs/vanilla` supplies MeshTransmissionMaterial. Runtime deps are intentionally minimal; `postprocessing` + `three-mesh-bvh` remain installed for planned wiring. Tailwind v4 tokens + inline styles with CSS vars. `public/micrographics/`: 70 SVG sticker sheets (few used — see decals.ts).

## User flow
1. **Boot** — POST terminal, ends on an `[ENTER THE ROOM]` confirm (Enter/Space/click).
2. **Warp** — ~2.5s wireframe airlock (own disposable three.js scene in warp-transition.tsx): DS-style scan pulse reveals a contour-grid terrain, doors part, camera dollies through; glitch rides the wavefront. The REAL cockpit mounts UNDERNEATH (theme + TWEAK apply run from warp on); a NoBlending portal quad punches a transparent hole tracking the door gap, then the scan world dissolves. Debug: `window.__warpTimeScale = N` slows N×.
   - `prefers-reduced-motion: reduce` skips the warp and suppresses CSS animation/transition motion.
3. **Cockpit** — cursor free-look (±22° yaw, ±15° pitch); camera + objects dead still (only the platter spins); wireframe SVG cursor, no reticle.
   - **PC**: hover → tag + glow + jade brackets "AX/OS · CLICK TO ENTER"; click → camera dollies to the screen (`monitor` view) + AX/OS ScreenDialog (future chatbot). Esc exits.
   - **Crate**: hover → tag + glow + brackets "ARCHIVE · CLICK TO BROWSE"; click → `crate` view (steep top-down; FIXED camera). Hover only HIGHLIGHTS a record (jade pins + halo); CLICKING one PLAYS it (deck hand-off below); empty-space click exits.
   - **Deck** (`deck` view — Figma Weave "Vinyl Player" flow): sleeve tips out (bin keeps full color — no focus dim), the dust cover swings open on its rear hinges (~103°), the disc flies to the platter, tonearm swings on, a jade beam rises and a holographic PROJECT INFO card (in-scene canvas plane, yaw-billboarded, ◄/► arrows parked at its sides via `__getCockpitDeckCardRect`) materializes; a depth mask behind the card ties the beam cleanly into its bottom edge. ◄/► swap records; VIEW MORE fires `cockpit-project-view` (stub); Esc/click-away reverses everything to clean-at-rest.
   - **Theme toggle** (bottom-right) renders ONLY in `cockpit` view; persists to `localStorage['cockpit-theme']`; boot/warp always dark.

## Architecture (components/cockpit/ — the whole app)
| File | Role |
|---|---|
| cockpit-app.tsx | Phase machine (boot→warp→cockpit), theme state, `TWEAK_DEFAULTS` pushed via a **persistent ~180-frame apply loop** — keep it (see Gotchas). |
| cockpit-hud.tsx | `Cockpit`: mounts GlobeCanvas + DOM HUD. SiteHeader (AX glyph · weather chip: Open-Meteo + geolocation, NYC fallback). ObjectTags (hover-only, via `__cockpitHoveredTag`; PC/crate get tag + brackets), VinylInfoCard + browse arrows, ScreenDialog (matrix3d-mapped onto the 3D screen). |
| globe-canvas.tsx | Imperative three.js scene: wireframe desk, starfield, PMREM env, free-look camera. View modes `cockpit`/`monitor`/`crate`/`deck` (focused↔focused switches blend via a captured-pose lerp, no snap). Builds glass-mac, vinyl-crate, turntable, coffee, decorations + edge glow; hover raycast (PC/turntable/coffee → glow + `__cockpitHoveredTag`; crate via its event; `userData.noPick` opts out — deck holograms); owns the render loop + theme registry (`glowLine`/`glowBlend`). |
| materials.ts | Shared recipes: `PALETTE`, `makeHeroGlass()` (drei-vanilla MeshTransmissionMaterial, `transmissionSampler:true`, no FBO), `makeFrost()` (frosted acrylic). |
| decals.ts | `makeDecal(file,opts)` rasterizes a micrographics sheet at 4×, flat-tints it, swaps Roboto Mono → system mono (SVG-in-img can't load webfonts); `makeTextDecal(draw,opts)` = bespoke canvas cluster. Planes float ~3mm off faces. |
| glass-mac.ts | The PC ("AX-01"), built into `xray`: hero-glass monitor casing + cream bezel, ivory "hello." screen, 60% QWERTY wedge, dome mouse. `applyTheme()` swaps wallpaper (dark CRT ↔ ivory). |
| projects.ts | Shared `PROJECTS` — 6 REAL projects (Song of Maka, Chu Yu Hong, Tencent Games, NYU Welcome, Shanghai Noir, ProcGen Dungeon) with tagline/role/tools/url + `cover` thumbnails in `public/vinyl-covers/` (null → generated motif; Tencent) + `makeDiscTexture`. Crate sleeves and deck disc/card read the same catalog; crate depth auto-derives from count. |
| vinyl-crate.ts | "VINYL CRATE 007": frosted panel shell, SVG decals + jade tabs. Records blur through walls (recordsGroup `noGlow`). Hover = pin+halo (lazy VertexNormalsHelper — WORLD space, lives at scene root). Owns crate picking, view-mode entry + deck SELECTION: click → `__cockpitDeck.play` with live `from/fromQuat/fromRadius` getters + `stopImmediatePropagation` (else the deck's same-canvas listener reads the mode-flip click as click-away); `__cockpitVinylSelect` swaps in deck view; leaving deck recalls the disc, sleeve stays tipped until it lands (`deckOut`/`returning`). |
| turntable.ts | "A.X / STUDIO" deck: 5-panel frosted cover shell in `coverGroup` inside `coverHinge` (rear-edge pivot + two dark hinge barrels), green-glass platter, tonearm (ARM_PARK↔ARM_PLAY), jade details. Deck machinery: owns `__cockpitDeck{play,eject,busy,index}` + `__getCockpitDeckInfo`; disc flight = quadratic bezier with LIVE endpoint getters (disc rides scene root, `spin.attach()` on land); jade beam + 640×800-canvas holo card in a `noGlow`/`noPick` group, theme-aware redraw, VIEW MORE via UV→px hit rect; `getFocusTarget()` for the deck camera; honors reduced-motion. |
| coffee.ts | Coffee station, FAR left: frosted pour-over cone on a receiving cup (V-spout molded into the CUP, faces the mug) + frosted mug on an opaque JADE foot band — SHARES the dripper's `frostG/H` so the set tunes as one; animated liquids `noGlow`. Click loop: dripper → stack arcs over, tilting around the cup's spout (`SPOUT_H` clears the mug rim) → mug fills → ASCII smoke → click full mug → drain. Exposes `getAnchorWorld()` + `glowTargets`. |
| decorations.ts | Hobby props, small/LIT/palette-safe (sax, tablet, gachapon, plant, handheld, shaker). Static EXCEPT two clickables (`root.tick`; takes camera+renderer; PC hitbox wins): shaker (s 2.2, beside PC) → wiggle + slosh; drawing tablet (flat before the keyboard, yaw = PC): hero-glass shell over an opaque cream liner (REQUIRED — bare transmissive glass shows the void through the see-through desk), charcoal plate PROUD of the rim (transparent decals can't sit under transmissive glass), 5-button strip (leftmost JADE), stylus in gravity pose; click → lifts + scribbles ~1.6s. `__cockpitDecor.list()`/`.set()`. |
| highlights.ts | `makeEdgeGlow()`: hover-only wireframe — EdgesGeometry traces per hero (one shared mat each), invisible at rest, ease in on hover. Normal-blend saturated light jade; depthWrite + depthTest OFF (x-ray) + renderOrder 999. Per-target `edgeThresh`/`minRadius` (crate `10°/.05`). `userData.noGlow` silences a subtree; tiny meshes + transparent-basic decals skipped. Faded in focused views; themed via `glowLine`/`glowBlend`. |
| cursors.ts / boot-screen / warp-transition / theme-toggle | SVG data-URI cursors · intro phases · toggle. |

[app/page.tsx](app/page.tsx) dynamically imports CockpitApp (`ssr:false`). [app/globals.css](app/globals.css): tokens + keyframes. `References/`, `3DModels/`, `backend/`, `frontend*/`, `database/` are side dirs, not the app.

## window.__cockpit* bridge (preserve this contract)
`__cockpitScene/Camera/Renderer/TableGroup` · setters: `__cockpitPC.setTransform`, `__cockpitKeyboard.setOffset`, `__cockpitVinyl.setTransform`, `__cockpitTurntable.setTransform`, `__cockpitFPV.setOffset`, `__cockpitCoffee.setDripper/setMug`, `__cockpitDecor.set` · `__cockpitTick(dt,t)`.
View mode: `__setCockpitViewMode(m)` / `__cockpitViewMode`; CustomEvents `cockpit-view-mode`, `cockpit-hover` (PC), `cockpit-crate-hover`, `cockpit-theme`, `cockpit-project-view` (VIEW MORE).
Deck: `__cockpitDeck.play/eject/busy/index` (turntable-owned; crate orchestrates).
rAF getters for the HUD: `__getCockpitScreenRect` (screen quad → ScreenDialog), `__getCockpitPCRect`, `__getCockpitCrateRect`, `__getCockpitAnchors` → `[{id,x,y}]` (name tags), `__cockpitHoveredTag` (hovered hero id | null), `__getCockpitVinylHover` (pulled record | null), `__getCockpitDeckInfo` (playing record | null) · `__cockpitVinylSelect(±1)` steps both views.
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
- The stage div scrolls PROGRAMMATICALLY despite overflow:hidden (matrix3d ScreenDialog juts past the viewport; focus/scrollIntoView pans the whole scene) — its onScroll pins scroll to 0, keep it.

## Next
VIEW MORE destination (`cockpit-project-view` stub; PROJECTS carry `url`) · Tencent cover art · real taglines/descriptions pass · chatbot behind ScreenDialog · wire `postprocessing` · mobile fallback.
