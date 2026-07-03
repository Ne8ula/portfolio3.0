# Handoff: Alex Xiong — "Editorial Cockpit" Portfolio

## Overview
A single-page, immersive personal portfolio built as a **first-person 3D cockpit**.
The visitor "boots up" a retro terminal, warps through a transition, and lands at a
desk in a 3D room where they can look around (cursor free-look) at a procedurally-built
translucent x-ray computer, a mechanical keyboard, and a wooden vinyl crate they can
scroll through. A HUD overlay frames the scene with editorial chrome, live weather, and
running "order/sales" telemetry. There is a dark/light theme toggle.

The whole thing runs client-side from `Cockpit.html` — no build step, no bundler.
React + Babel-in-browser + three.js are loaded from CDNs.

## About the Design Files
The files in this bundle are a **working HTML/JS prototype** — they run as-is by opening
`Cockpit.html` in a browser. They are also the design reference: they define the exact
look, motion, palette, typography, and 3D layout the finished portfolio should have.

Your task is to **continue this project** — either keep evolving it as a static
HTML/JS site, or port it into a real front-end environment (Vite + React, Next.js, etc.)
using the codebase's established patterns. If you port it, treat these files as the
authoritative spec for behavior and visuals. The 3D scene is **entirely procedural**
(no model files are loaded at runtime — see "Assets"), so it moves cleanly into any
three.js setup.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, motion timings, and 3D layout are
all here and intentional. Match them precisely. The design system is documented in
`ds/colors_and_type.css` and `Design System.html`.

---

## Architecture

`Cockpit.html` is the entry point and the app shell. It:
- Defines all CSS variables (`:root` for dark, `html[data-theme="light"]` for light) and
  the full keyframe library (boot glitch, CRT power cycle, warp transition, grain).
- Loads React 18.3.1, ReactDOM, Babel standalone, and **three.js r0.140** (+ GLTFLoader,
  DRACOLoader — currently unused, see Assets) from CDNs.
- Loads the component `.jsx` files as `<script type="text/babel" src="...">`.
- Renders `<App/>`, a phase state machine: **`boot` → `warp` → `cockpit`**.
- Owns the **Tweaks panel** (edit-mode dev tool) and the **theme toggle**.

### Phase state machine (in `Cockpit.html`)
1. **`boot`** — renders `<BootScreen/>`. A cinematic crash → reboot → POST terminal
   sequence (~10.5s), driven by an internal phase timeline. Calls `onDone` → sets `warp`.
2. **`warp`** — renders `<WarpTransition/>` (defined inline in `Cockpit.html`). A ~1.8s
   "trance" tunnel: expanding jade rings, rotating spokes, vertical stretch, white flash.
   Calls `onComplete` → sets `cockpit`.
3. **`cockpit`** — renders `<Cockpit interactive/>` (from `CockpitHUD.jsx`), which mounts
   the 3D scene and the HUD. Fully interactive.

### Component files (load order matters — set in `Cockpit.html`)
- **`BootScreen.jsx`** — the boot/crash/reboot terminal. Self-contained, phase-driven,
  uses a `useTypewriter` hook. Boot log copy is inline (see `loading-texts.json` note).
- **`CockpitHUD.jsx`** — defines `Cockpit({ interactive })`. Renders `<GlobeCanvas/>`
  (the 3D scene) plus all the DOM HUD chrome: header/footer editorial strips, crosshair,
  yaw/pitch readout, **live weather** (open-meteo API + reverse geocoding), running
  telemetry counters, PC-hover highlight, and view-mode handling (`cockpit` vs `monitor`).
- **`Globe.jsx`** — defines `GlobeCanvas({ yawRef, pitchRef })`. **This is the 3D engine.**
  Builds the entire scene procedurally in three.js: starfield, desk/table group, the
  translucent x-ray PC (frosted shell + jade wireframe internals), mechanical keyboard,
  lighting, camera free-look (smoothed yaw/pitch, clamped to ±22°/±15°), raycaster for
  PC hover, and the render loop. Exposes many `window.__cockpit*` handles (see below).
- **`VinylCrate.jsx`** — a self-contained wooden vinyl crate with 15 scrollable records;
  hover pops a record up to reveal cover art. Waits for `window.__cockpitScene` to exist,
  then attaches to the table group and hooks into the frame loop via `window.__cockpitTick`.

### Legacy / unused (kept for reference — NOT loaded by `Cockpit.html`)
The boot sequence originally handed off to a Rubik's-cube loader before the cockpit.
That path was removed (`window.__cockpitCube = null`; "boot hands directly to cockpit").
These files are dead code but preserved in case you want the cube back:
- `CockpitCube.jsx` — `buildCockpitCube()`, a solved Rubik's cube with "ALEXXIONG" baked on.
- `RubiksCube.jsx`, `RubiksLoader.jsx`, `LoadingCube.jsx` — the old loader stage.

---

## The `window.__cockpit*` bridge
The React/DOM layer and the imperative three.js layer talk through globals set in
`Globe.jsx`. Key ones (preserve this contract if you refactor):
- `window.__cockpitScene`, `__cockpitCamera`, `__cockpitRenderer`, `__cockpitTableGroup`
  — three.js objects, published once the scene is built. `VinylCrate` polls for these.
- `window.__cockpitPC` — the x-ray PC group; has `.setTransform({x,y,z,scale,yaw,pitch,roll})`.
- `window.__cockpitKeyboard` — has `.setOffset({x,y,z})`.
- `window.__cockpitFPV` — has `.setOffset({height,distance})` (moves the viewer at the desk).
- `window.__cockpitVinyl` — the crate group; has `.setTransform({x,y,z,rx,ry,rz})`.
- `window.__cockpitSmoothedYaw` / `__cockpitSmoothedPitch` — read by the HUD for readouts.
- `window.__cockpitTick` — the crate registers a tick callback here; the render loop calls it.
- `window.__cockpitTheme` + `cockpit-theme` CustomEvent — theme broadcast to the 3D scene.
- `cockpit-view-mode` / `cockpit-hover` CustomEvents — 3D → HUD signals.

## Tweaks panel (dev tool)
`Cockpit.html` contains a `<TweaksPanel/>` with live sliders for positioning the cube, PC,
keyboard, FPV camera, and vinyl crate in 3D space. It's gated behind an edit-mode
postMessage protocol and is **not part of the shipped UI** — it's how the exact positions
were dialed in. The chosen values live in `TWEAK_DEFAULTS` (between the `/*EDITMODE-BEGIN*/`
and `/*EDITMODE-END*/` markers) in `Cockpit.html`. When you port, hardcode these values as
the initial transforms and you can drop the panel (or keep it as a dev overlay).

Current defaults: PC at `(3.55, 0.8, 0.45)` scale `1.05` yaw `-0.69`; vinyl crate at
`(-4.13, 0.32, 0.55)` ry `1.97`; fpv height `-1.98` distance `-0.64`. Full set in the file.

---

## Design Tokens
All defined in `Cockpit.html` `:root` and mirrored in `ds/colors_and_type.css`.

**Palette — "Editorial Cockpit": cream parchment + ink + mauve + muted jade. Jade is the
only chromatic accent. No rounded corners anywhere (`--radius: 0`).**

Dark (default):
- Cream (fg/text-on-dark): `#E8E4DC` / warm `#F0EBE1` / deep `#D8D3C7`
- Fog `#CFC9C0`, Mist `#B9B5AE`
- Ink (bg/structure): `#1E1C1A` / soft `#55514B` / faint `#8E8A83`
- Mauve: deep `#3A3644`, mid `#6E6878`, light `#A8A2B0`
- Jade (sole accent): `#4B6E4F` / deep `#3A5A3E` / light `#7A9A7E`
- Scene bg `#2d2b30`

Light theme inverts these (see `html[data-theme="light"]` block in `Cockpit.html`).

**Typography:**
- Display: `"Cormorant Garamond"` (serif), weights 300–600, tracking `-0.02em`, oversized.
- Body/UI/chrome: `"JetBrains Mono"`, small caps-ish labels with wide letter-spacing.
- Boot terminal also uses `"VT323"` and `"Major Mono Display"`.
- Scale: display `clamp(4rem,10vw,8rem)`; labels 10px, micro 9px, body 13px.

**Shadows:** soft editorial paper drops, e.g. `0 18px 40px -20px rgba(30,28,26,.5)`.
**Spacing:** 8px grid. **Motion:** `--ease-brut: cubic-bezier(.16,1,.3,1)`, durations 120/240/520ms.
**Texture:** SVG fractal-noise `.grain` overlay (multiply, ~35% opacity) + radial `.vignette`.

---

## Interactions & Behavior
- **Boot:** auto-plays ~10.5s. Typed header, streaming log lines (~45ms each), a stall,
  CRT crash/pinch, dark, CRT wake, POST reboot, monogram reveal.
- **Warp:** ~1.8s auto transition into the cockpit.
- **Cockpit free-look:** move the cursor to look around; yaw clamped ±22°, pitch ±15°,
  smoothed for a floaty feel. Camera can never leave the desk.
- **PC hover:** raycaster highlights the x-ray computer; cursor becomes pointer. There is a
  `monitor` view-mode (zoomed to the screen) vs `cockpit` view-mode; Esc backs out.
- **Vinyl crate:** horizontal scroll/wheel browses records; hover pops one up to show art.
- **Theme toggle:** bottom-right, persists to `localStorage` key `cockpit-theme`. Boot and
  warp screens are forced to dark regardless of theme; only the cockpit reflects it.
- **Live weather:** `CockpitHUD.jsx` calls `api.open-meteo.com` (forecast + reverse
  geocode) using the browser's geolocation. Fails gracefully if denied/offline.

## State
- `App` (Cockpit.html): `phase`, `theme` (localStorage), `tweaks`, `editMode`, `interactive`.
- `Cockpit` (CockpitHUD): `mode` (free-look), `hudYaw/hudPitch`, telemetry counters
  (`orders/opm/sales`), `viewMode`, `hoveringPC`, weather state.

---

## Assets
**The 3D scene loads NO external model files at runtime.** In `Globe.jsx`, GLB loading is
intentionally disabled (`const GLB_URL = null`) — the computer, keyboard, desk, and crate
are all built procedurally from three.js primitives. The `GLTFLoader`/`DRACOLoader` script
tags in `Cockpit.html` are vestigial and can be removed if you don't reintroduce a model.

Reference material from the design process (an experimental "Ghost in the Machine" GLTF
model + PBR textures, and a wireframe-ghost-shader writeup) lives in the original project's
`uploads/` folder. It is **not required** to run the site and is not copied here to keep the
bundle lean — grab it from the source project if you decide to load a real model.

**Fonts** are Google-hosted (Cormorant Garamond, JetBrains Mono, VT323, Major Mono Display).
**Icons/emoji:** the theme toggle uses `☀`/`☾` glyphs; otherwise no icon set.

---

## Files in this bundle
- `HANDOFF.md` — this document.
- `Cockpit.html` — **entry point.** Open this to run. App shell, phases, CSS, tweaks, theme.
- `BootScreen.jsx` — boot/crash/reboot terminal sequence.
- `CockpitHUD.jsx` — `Cockpit` component: HUD chrome + weather + mounts the 3D scene.
- `Globe.jsx` — `GlobeCanvas`: the procedural three.js scene (the core 3D engine).
- `VinylCrate.jsx` — scrollable 3D vinyl crate.
- `CockpitCube.jsx`, `RubiksCube.jsx`, `RubiksLoader.jsx`, `LoadingCube.jsx` — **legacy**,
  not loaded, kept for reference (old Rubik's-cube loader stage).
- `loading-texts.json` — editable boot-log copy (a content reference; the boot text is
  currently inline in `BootScreen.jsx`, so wire this up if you want data-driven copy).
- `ds/colors_and_type.css` — the design system tokens as CSS variables + `.ds-*` classes.
- `Design System.html` — visual reference sheet for the design system.

## Running it
Open `Cockpit.html` over **http** (not `file://`) so the Babel/three CDN scripts and the
relative `.jsx` fetches work — e.g. `npx serve` or any static server in this folder. The
`.jsx` files are loaded via Babel-in-browser; there is no build step.

## Suggested next steps for porting
1. Stand up Vite + React. Move the CSS variables into a global stylesheet (already isolated
   in `ds/colors_and_type.css`).
2. Convert the three `<script type="text/babel">` components into real modules. `Globe.jsx`
   is imperative three.js and moves over almost verbatim — keep the `window.__cockpit*`
   bridge or replace it with refs/context.
3. Precompile Babel away; pin three.js as an npm dep instead of the CDN.
4. Hardcode `TWEAK_DEFAULTS` as the initial 3D transforms; keep the Tweaks panel as a
   dev-only overlay behind an env flag.
