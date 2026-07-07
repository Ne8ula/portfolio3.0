# Portfolio 3.0 — CLAUDE.md

> Living doc — describes the CURRENT state only, no history. Update via the `/update-claude-md` skill after meaningful changes. Hard budget: ≤ 9,000 characters.

## Overview
**Owner**: Alex Xiong (Ne8ula) · **Deploy**: Vercel · **Repo**: github.com/Ne8ula/portfolio3.0
Personal portfolio, the "Editorial Cockpit": boot a retro terminal → warp tunnel → land first-person at a 3D desk with three interactive objects — a vinyl crate of projects (left), a spinning turntable (center), and a transparent "superglass" retro terminal PC (right). Editorial HUD chrome, live weather, dark/light theme.

## Dev
`npm run dev` / `build` / `start` / `lint`. Next.js 16 App Router (Turbopack), React 19, TypeScript with `ignoreBuildErrors`; the 3D/HUD files use `@ts-nocheck`. three.js `^0.184` **imperative** (no React Three Fiber — do not convert). Tailwind v4 tokens + mostly inline styles with CSS vars. Fonts loaded by literal family name via `<link>` in [app/layout.tsx](app/layout.tsx) (Cormorant Garamond, JetBrains Mono, VT323, Major Mono Display). Unused deps (R3F, drei, zustand, framer-motion, shadcn/radix…) remain in package.json — safe to prune.

## User flow
1. **Boot** — POST terminal, ends on an `[ENTER THE ROOM]` confirm (Enter/Space/click).
2. **Warp** — ~1.8s trance tunnel → cockpit.
3. **Cockpit** — cursor free-look (±22° yaw, ±15° pitch), seated-at-desk framing. Custom wireframe SVG cursor; no center reticle.
   - **PC**: hover → jade brackets "AX/OS · CLICK TO ENTER"; click → camera dollies to the screen (`monitor` view) with the AX/OS ScreenDialog (cream "hello." glass UI — the future chatbot surface). Esc or `esc·return` exits.
   - **Crate**: hover → brackets "ARCHIVE · CLICK TO BROWSE"; click → `crate` view (camera hovers over the bin). Hovering a record tips it AND every record in front of it forward by the same angle (parallel tilt ⇒ physically cannot clip), the disc slides out two-stage, and VinylInfoCard shows n° / category / date / title. Clicking empty space returns.
   - **Theme toggle** (bottom-right) renders ONLY in the `cockpit` view mode; persists to `localStorage['cockpit-theme']`; boot/warp always dark.

## Architecture (components/cockpit/ — the whole app)
| File | Role |
|---|---|
| cockpit-app.tsx | Phase machine (boot→warp→cockpit), theme state, `TWEAK_DEFAULTS` layout values pushed into the scene via a **persistent apply loop (~180 frames)** — keep it; single-shot apply loses to StrictMode remounts. Hides ThemeToggle when viewMode ≠ 'cockpit'. |
| cockpit-hud.tsx | `Cockpit`: mounts GlobeCanvas + DOM HUD. SiteHeader = minimal one-line lockup (AX glyph · A\|XIONG *studio* · one-line weather chip, Open-Meteo + geolocation, NYC fallback). PCHoverHighlight / CrateHoverHighlight brackets, VinylInfoCard (viewport-clamped), ScreenDialog (matrix3d-mapped onto the 3D screen), `esc·return` button in focused modes. |
| globe-canvas.tsx | Imperative three.js scene: desk, starfield, lights + PMREM env, free-look camera. View modes `cockpit`/`monitor`/`crate` (modeT tween + focusKind). Builds glass-mac, vinyl-crate, turntable; owns the render loop + theme registry. |
| glass-mac.ts | The PC ("superglass terminal"): extruded grain-textured wedge base, dark recessed key tray + frosted-glass keycaps (one jade), frosted neck, iridescent-clearcoat glass head fully enclosing a dark CRT block (screen fills its face), vents/wire looms/jade-glow sprites in the air gap. **No mouse.** `applyTheme()`: CRT/tray/screen dark-gray in dark mode ↔ cream in light. Returns `{ keyboard(setOffset), applyTheme }`. |
| vinyl-crate.ts | `PROJECTS` array (15 placeholders: title/category/date/palette) → crate auto-sizes to the count. Records face the viewer, tightly packed, lean back. Hover cascade + two-stage disc pop. Owns crate picking + view-mode entry/exit. |
| turntable.ts | Decorative AT-LP-style deck (spinning platter), desk center. |
| cursors.ts | `CURSOR_DEFAULT` / `CURSOR_POINTER` — wireframe SVG data-URI cursors. |
| boot-screen.tsx / warp-transition.tsx / theme-toggle.tsx | Intro phases + toggle. |

[app/page.tsx](app/page.tsx) dynamically imports CockpitApp (`ssr:false`). [app/globals.css](app/globals.css) holds tokens + keyframes. `References/`, `3DModels/`, `backend/`, `frontend*/`, `database/` are pre-existing side dirs, not part of the app.

## window.__cockpit* bridge (preserve this contract)
Objects: `__cockpitScene/Camera/Renderer/TableGroup` · `__cockpitPC.setTransform({x,y,z,scale,yaw,pitch,roll})` · `__cockpitKeyboard.setOffset({x,y,z})` · `__cockpitVinyl.setTransform({x,y,z,rx,ry,rz,s})` · `__cockpitTurntable.setTransform({x,y,z,ry,s})` · `__cockpitFPV.setOffset({height,distance})` · `__cockpitTick(dt,t)`.
View mode: `__setCockpitViewMode(m)` / `__cockpitViewMode`; CustomEvents `cockpit-view-mode`, `cockpit-hover` (PC), `cockpit-crate-hover`, `cockpit-theme`.
Screen-space getters (HUD polls per rAF): `__getCockpitScreenRect` (screen quad → ScreenDialog), `__getCockpitPCRect`, `__getCockpitCrateRect`, `__getCockpitVinylHover` → `{x,y,index,title,category,date}`.
**Screen contract**: glass-mac sets `xray.userData.screenGroup` + `screenCorners{tl,tr,bl,br}` — the monitor-view camera and ScreenDialog (chatbot) depend on it. Keep it when remodeling the PC.

## Layout dial-ins (TWEAK_DEFAULTS in cockpit-app.tsx)
Crate `(-3.4, .18, .6)` ry `.35` s `1.45` · turntable `(0, .18, .8)` s `1.4` · PC `(4.7, .18, -.3)` yaw `-.5` s `1.3` · fpv height `-2.4` dist `-.6`. Tune live via the window setters (after the ~3s apply window), then bake the values back here.

## Design system
Palette: cream / ink / mauve + **jade as the only chromatic accent** (never red). Tokens in globals.css (`:root` + `html[data-theme="light"]`). Display serif Cormorant Garamond; chrome mono JetBrains Mono. `--radius: 0`. `.grain` + `.vignette` overlays. Dark is default.

## Gotchas
- React StrictMode double-mounts GlobeCanvas in dev — bridge globals get re-assigned; cleanup nulls them. Hence the persistent apply loop.
- All translucent 3D uses `depthWrite:false` — never overlap translucent volumes (renders as visual noise); keep zones separated the way glass-mac does (solid base / frosted neck / one glass head).
- ScreenDialog always renders above the canvas; its `send()` is a stub awaiting the real chatbot API.
- Weather reverse-geocode can hit CORS on localhost — fails gracefully to coords-only.

## Next
Wire real project data into `PROJECTS` + record click-through · chatbot behind ScreenDialog · `prefers-reduced-motion` · mobile fallback · prune unused deps.
