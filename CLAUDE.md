# Portfolio 3.0 — CLAUDE.md

> Living document. Update this file whenever the codebase, design system, or build status changes.

---

## Project Overview

**Owner**: Alex Xiong (Ne8ula)  
**Purpose**: Personal technical portfolio showcasing projects, skills, and contact — wrapped in a brutalist interactive interface that unfolds from a 3D cube into a desk-scene with a vinyl-crate project selector + CRT monitor detail view.  
**Version**: v.2025.04  
**Repo**: https://github.com/Ne8ula/portfolio3.0  
**Deployment**: Vercel (with Analytics enabled)  
**Status**: Redesign in progress. See [desk-scene plan](/Users/pandora2/.claude/plans/okay-currently-the-website-sorted-canyon.md) for the full 6-phase roadmap. **Phases 0–5 complete + first-person reframe/wooden-crate pass; Phase 6 (polish) is next up.**

### User flow (target)
1. Loading screen (creative brutalist/analog boot) →
2. Landing: 3D cube (CSS 3D, existing) — click to enter →
3. Fluid camera zoom-OUT into a desk scene (R3F, planned) with cube shrunk to paperweight →
4. Desk contains: vinyl crate (project selector styled after a "Speed Index" filing cabinet), turntable, early-2000s CRT monitor + keyboard →
5. Click a vinyl → animates onto turntable → CRT boots project-specific detail →
6. "EJECT" returns to desk.

### Reference imagery
Stored in [References/](References/). Key refs:
- `_.jpeg` + `33179f6…mp4` — AR-graffiti over photography (lime + electric-blue shards, kanji glitch, URL-protocol captions). Source of the **cold-electric overlay band**.
- `5d0b1c9…gif` — *every : second*: isometric floating photo-stack UI on parchment with minimal HUD. Source of the **vinyl-crate UX** (standing records, peel-forward hover, thin tag list right-rail, timestamp top-left).
- `af9d5fc…mp4` — isometric cartoon desk with saturated CRT + keyboard. Source of the **desk-scene flat-cel illustration style** (target: `MeshToonMaterial`, not PBR).

---

## Dev Commands

```bash
npm run dev      # Start local dev server (Next.js)
npm run build    # Production build
npm run start    # Serve production build
npm run lint     # ESLint check
```

---

## Tech Stack

| Layer | Tool | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.0.10 |
| Runtime | React | 19.2.0 |
| Language | TypeScript (strict) | ^5 |
| Styling | Tailwind CSS v4 | ^4.1.9 |
| Animation | Framer Motion | ^12.38.0 |
| Gesture | MediaPipe tasks-vision | ^0.10.34 |
| UI Components | shadcn/ui (new-york style) | — |
| Icons | Lucide React | ^0.454.0 |
| Forms | React Hook Form + Zod | 7.60.0 / 3.25.76 |
| Analytics | Vercel Analytics | 1.3.1 |
| Carousel | Embla Carousel | 8.5.1 |

**Important config notes:**
- Tailwind v4 uses `@import "tailwindcss"` syntax — NOT `@tailwind base/components/utilities`
- `next.config.mjs` has `typescript.ignoreBuildErrors: true` and `images.unoptimized: true`
- Path alias `@/*` maps to the project root
- `--radius: 0rem` globally — no rounded corners anywhere

---

## Design System

> Canonical source: `.agents/rules/visual-style-guide.md`

### Aesthetic — two coexisting bands

The site runs on a **warm parchment base (always)** + a **cold-electric overlay (transient)**. The warm band is the canvas — desk scene, body copy, layout chrome. The cold-electric band is flicker only — transitions, loading screen, CRT boot, HUD surfaces. Cold band must never occupy more than ~12% of viewport area and never colors body text.

### Warm band — anchors (do not change without broad review)

| CSS Variable | Hex | Usage |
|---|---|---|
| `--background` | `#F4F1E8` | Pale parchment base |
| `--foreground` | `#1A1A1A` | Deep ink black (text, borders) |
| `--primary` | `#C91D22` | Chinese Crimson/Vermilion — headers, highlights, interactive borders |
| `--secondary` | `#4B6E4F` | Muted Jade Green — tech accents, success states |
| `--accent` | `#D94833` | Vermilion Orange — secondary highlights |
| `--card` | `#E8E5DC` | Slightly darker tan — card surfaces |
| `--muted` | `#D9D5C8` | Grid lines, subtle fills |
| `--border` | `#1A1A1A` | Aggressive black structural lines |
| `--ring` | `#C91D22` | Focus ring color |

### Warm band — aging mid-tones (additive for lived-in surfaces)

| CSS Variable | Hex | Tailwind class |
|---|---|---|
| `--paper-warm` | `#EDE6D3` | `bg-paper-warm` |
| `--paper-shadow` | `#BFB59A` | `bg-paper-shadow` |
| `--ink-warm` | `#2A2520` | `text-ink-warm` |
| `--vermilion-soft` | `#B83C3F` | `text-vermilion-soft` |
| `--jade-soft` | `#5E8566` | `text-jade-soft` |
| `--tape-yellow` | `#D6B85A` | `bg-tape-yellow` |

### Cold-electric band — overlay accents only (never on body text)

| CSS Variable | Hex | Tailwind class |
|---|---|---|
| `--signal-lime` | `#C6F24A` | `text-signal-lime` |
| `--signal-blue` | `#2A4CFF` | `text-signal-blue` |
| `--signal-white` | `#F7F9F2` | `bg-signal-white` |

### Typography

| Font | Variable | Usage |
|---|---|---|
| `VCR_OSD_MONO` | `--font-mono` | Massive structural text, numbers, terminal printouts |
| `SpaceMono` | `--font-sans` / `--font-serif` | Body text, UI labels, readable content |

**Rules:**
- `font-mono` = VCR_OSD_MONO. `font-sans` = SpaceMono.
- Use `writing-mode: vertical-rl` on decorative text to mimic Eastern seal/stamp layouts
- Headings: heavy weights (`font-black`), large sizes (`text-6xl`+), `tracking-tighter`

### UI Rules (Strict)

- **No rounded corners** — `rounded-none` everywhere, `--radius: 0rem`
- **Shadows** — stark solid ink blocks only: `shadow-[4px_4px_0px_#1a1a1a]` or `shadow-[6px_6px_0px_#1a1a1a]`. No soft blurs.
- **Borders** — thick solid lines: `border-2`, `border-4`, or `border-[6px]`
- **Buttons** — always use `CyberButton` from `@/components/ui/cyber-button` for interactive buttons
- **Grid utility** — `.grid-pattern` gives a 32px structural grid background (uses `--muted`)
- **Blend modes** — use `mix-blend-multiply` on overlapping ink-style elements
- **Selection** — text selection inverts to black bg / parchment text

### Overlay utilities (in `app/globals.css`)

| Class | Purpose |
|---|---|
| `.paper-grain` | Absolute-positioned SVG turbulence, ~8% opacity, `mix-blend-multiply`. Additive aging layer — never replaces the base. |
| `.vignette-warm` | Soft brown radial corner darkening for long-lived warm surfaces. |
| `.edge-foxing` | Aged-paper stains at the four corners. |
| `.ar-shard` (+ `.ar-shard--blue`, `.ar-shard--slim`) | Angular clip-path wedges with electric fill and `mix-blend-screen`. Cold-electric band. |
| `.kanji-glitch` | Vertical-rl kanji chunks with hard-offset chromatic shadow. Cold-electric band. |
| `.url-tag` | Inline mono `ex://…` captions — HUD surfaces only. |
| `.scanlines` | Thin horizontal striping for CRT-style screen surfaces. |

---

## Project Architecture

```
portfolio3.0/
├── app/
│   ├── page.tsx              # Main hero page (single-page layout)
│   ├── layout.tsx            # Root layout: fonts, metadata, theme
│   └── globals.css           # Tailwind v4 import + CSS vars + @theme + utilities
├── components/
│   ├── ui/                   # 60+ shadcn/ui components + custom UI primitives
│   ├── loading/              # Boot screen + session gate (Phase 1)
│   │   ├── boot-screen.tsx         # Full-viewport brutalist boot sequence
│   │   ├── scene-ready-gate.tsx    # Wraps layout, gates first paint on asset preload
│   │   └── use-asset-preloader.ts  # DOM image preloader, returns 0→1 progress
│   ├── scene/                # R3F desk scene — scaffold (Phase 2) + crate wiring (Phase 4) + transport/turntable/CRT (Phase 5)
│   │   ├── scene-canvas.tsx        # <Canvas/> wrapper, reads ?view= URL override, gates pointer-events + opacity on view
│   │   ├── scene-content.tsx       # Composes CameraRig + Lights + all meshes inside <Suspense>
│   │   ├── camera-rig.tsx          # First-person perspective (fov 52) — three poses (BASE/CUBE/CRT) + pointer-parallax lerp
│   │   ├── lights.tsx              # Warm key + jade rim + hemi fill — tuned for MeshToonMaterial
│   │   ├── desk.tsx                # Desk slab + legs + parchment pad (warm wood #a5661f)
│   │   ├── vinyl-crate.tsx         # Square wooden crate — iterates lib/projects, inserts category dividers, Z-axis slot stack
│   │   ├── vinyl.tsx               # Data-driven sleeve — bottom-pivot flip-through hover, cascade-tip for slots in front
│   │   ├── vinyl-hover-label.tsx   # drei <Html> title + ex://project/<slug> caption — floats above sleeve top
│   │   ├── vinyl-transport.tsx     # Persistent sleeve+record pair — lift/arc/split/spin/reverse off selectedVinylId (Phase 5)
│   │   ├── crate-divider.tsx       # Thin kraft card + tab + drei <Html> category label, thin-along-Z for Z-stacked slots
│   │   ├── crate-hud.tsx           # DOM overlay — timestamp / every:project / filter tags / [save][share][?]
│   │   ├── turntable.tsx           # Hi-Fi low-poly plinth + platter + felt + spindle + S-curve tonearm w/ swing anim (Phase 5)
│   │   ├── crt-monitor.tsx         # Chunky beige CRT + jade-glow phosphor + scanlines + boot-flicker (Phase 5)
│   │   ├── crt-project-detail.tsx  # drei <Html transform occlude> React detail view + [EJECT] CyberButton (Phase 5)
│   │   ├── keyboard.tsx            # 14×4 key-cap grid on a cream baseplate
│   │   └── cube-paperweight.tsx    # Reuses the 6 cube-face SVGs via drei useTexture — shrunk cube on the desk
│   ├── header.tsx            # Nav bar with status indicator
│   ├── isometric-cube.tsx    # Interactive CSS-3D cube (landing hero)
│   ├── glitch-overlay.tsx    # Background SVG decal scatter + click ripple effect
│   ├── about-section.tsx     # [orphan] About content — will be superseded by CRT detail
│   ├── contact-section.tsx   # [orphan] Contact form — will be superseded by CRT detail
│   ├── projects-section.tsx  # [orphan] Placeholder — will be superseded by vinyl crate
│   ├── vinyl-bin.tsx         # [orphan] Carousel stub — superseded by 3D crate; mock data seeds lib/projects.ts
│   ├── technical-annotations.tsx  # Decorative tech overlay text
│   └── theme-provider.tsx    # Theme context wrapper
├── components/ui/
│   ├── cyber-button.tsx      # Brutalist button with Framer Motion states (USE THIS)
│   ├── glitch-text.tsx       # Hover-activated glitch text animation
│   ├── hand-tracker.tsx      # MediaPipe HUD overlay (bottom-right status)
│   └── (57 shadcn components...)
├── hooks/
│   ├── use-hand-tracking.ts  # MediaPipe gesture detection hook
│   ├── use-mouse-position.ts # Cursor position tracking
│   ├── use-mobile.ts         # Mobile breakpoint detection
│   └── use-toast.ts          # Toast notification hook
├── lib/
│   ├── projects.ts           # Canonical Project type + 10 seeded entries (4 designs / 3 games / 3 prototypes) — Phase 4
│   ├── scene/
│   │   └── vinyl-layout.ts   # Mirror of crate geometry — resolves world poses for crate slot + platter (Phase 5)
│   ├── store/
│   │   └── scene-store.ts    # Zustand: view | selectedVinylId | hoveredVinylId | isPlaying | cubeHandoffRotationY | filterCategory | transportActiveVinylId
│   └── utils.ts              # cn() — classname merger (clsx + tailwind-merge)
├── public/
│   ├── fonts/                # vcr-osd-mono.ttf, spacemono-regular.ttf
│   ├── assets/
│   │   ├── micrographics/    # 70 SVG tech decals (GlitchOverlay + cube back face)
│   │   ├── cube-faces/       # 6 SVG face textures — loaded as toon material maps by components/scene/cube-paperweight.tsx (Phase 2)
│   │   ├── covers/           # 10 placeholder project-sleeve SVGs — loaded by components/scene/vinyl.tsx (Phase 4)
│   │   ├── textures/         # paper-grain.svg + bitmap variants (Phase 0)
│   │   └── overlays/
│   │       └── ar-shards/    # 8 angular shard SVGs — cold-electric transitions (Phase 0)
│   ├── images/               # Project reference images
│   └── logo.webp             # Alex Xiong brand logo
├── References/               # User-provided design references (jpeg / gif / mp4) — see Reference imagery above
└── .agents/rules/
    └── visual-style-guide.md # CANONICAL design rules — read this before any UI work
```

---

## Key Components

### `app/page.tsx`
The only page. Four visual layers stacked by `view` from `useSceneStore`, with a three-stage fade orchestration for the Phase 3 handoff:
1. **R3F canvas** (`<SceneCanvas/>`, dynamically imported, `ssr: false`) — fixed, `z-[1]`. Crossfades `opacity 0 → 1` during `zooming` (600 ms ease) so the desk is already visible as the camera settles. `pointer-events: auto` only in `desk | project`.
2. **`CrateHud`** — DOM overlay at `z-[50]`, visible only when `view === 'desk'` (Phase 4). Sits above the canvas but below `GlitchOverlay`.
3. **DOM landing shell** — header, 3-column hero, footer, `HandTrackerOverlay`. **Shell** (`shellVisible`) stays on through `cube + zooming` so the CSS cube can cross-fade *over* the already-visible R3F desk; it only fully hides once `view === 'desk'`. **Side panels** (left terminal + right vertical panel + tech-radar rings) dim first via `sidePanelsDimmed = view !== 'cube'` so the eye isn't pulled sideways during the dolly. **Cube wrapper** fades `opacity 1→0, scale 1→0.95` (400 ms) via `cubeFaded = view !== 'cube'`.
4. **`GlitchOverlay`** — decorative, `z-[60]`, must remain above the R3F canvas and `CrateHud`.

Landing hero layout (desktop, while `view==='cube'`):
- **Left** — Data Terminal: title card (`ALEX XIONG`) + about interface. Minimizable via `×` button.
- **Center** — `IsometricCube` + tech radar rings (rotating dashed circles, crosshairs, floating data boxes)
- **Right** — Decorative vertical panel: ruler marks, Japanese text (`システム警告 // SEC_9`), indicator dot
- **Footer** — copyright, GitHub / LinkedIn / X links
- `HandTrackerOverlay` floats bottom-right as a HUD

### `components/isometric-cube.tsx`
3D cube with 6 decorative faces. **Click on any face** triggers the Phase 3 handoff — not per-face routing. Face content:
- **Front** — PROJECTS label (red/primary)
- **Right** — ABOUT label (jade/secondary)
- **Left** — CONTACT label (ink/border)
- **Back** — decorative grid with micrographic SVGs
- **Top** — system diagnostics (MEM/CPU/NET)
- **Bottom** — grid pattern + spinning circles

**Click handler:** every face calls `handleCubeClick`, which reads the current `rotationRef.current` (last animate-tick `rotateY`) and calls `useSceneStore.getState().enterDesk(rotationY)`. The store stashes it as `cubeHandoffRotationY` so `CubePaperweight` spawns at the same Y orientation — no visible jump across the DOM→WebGL seam.

**Rotation behavior:**
- Mouse X position drives `targetRotation`: `(xPercent - 0.5) * -270 + 45` (right = About, left = Contact)
- Lerp factor: `0.02` (very smooth, slow catch-up)
- MediaPipe egg-grip gesture overrides mouse rotation
- **No hover-lock gymnastics**: the old `isHovered` latch was removed in Phase 3. With a single click handler the cube no longer needs to freeze rotation to prevent users from mis-clicking a face that spun away mid-click.

**CSS:** Inline `<style>` block inside component. Sizes: 240px mobile → 340px md+. Perspective: `1200px`.

### `components/glitch-overlay.tsx`
Background effect layer. On mount: scatters 15 random SVG micrographic decals at random positions. Decals re-randomize every 4 seconds. Click anywhere creates a ripple visual. Uses `mix-blend-multiply`. Types: hologram (green), error (red), background (neutral).

### `components/ui/hand-tracker.tsx`
Fixed HUD (bottom-right). Shows MediaPipe status: OFFLINE → BOOTING → ONLINE. Displays EGG_GRIP detection. Toggle button enables/disables webcam. Driven by `useHandTracking` hook.

### `components/header.tsx`
Top nav: `[ABOUT] :: [PROJECTS] :: [CONTACT]` links. Right side: pulsing green "ONLINE" status dot. Thick borders, brutalist styling. Positioned `absolute top-0 z-50`.

### `components/loading/scene-ready-gate.tsx` (Phase 1)
Root-layout wrapper. On first visit per `sessionStorage` session, mounts `<BootScreen/>` above `{children}` with `AnimatePresence` and dismisses once `useAssetPreloader().progress === 1` AND a minimum dramatic hold (default 900 ms) has elapsed. Subsequent client-side navigations skip the boot.

### `components/loading/boot-screen.tsx`
Full-viewport parchment boot sequence. Centerpiece terminal card streams `BOOT_LINES` (7 lines) purely on time at ~280 ms/line (preload resolves instantly in dev, so tying to progress skipped the drama). Block-char progress bar (`█░`). Shards keyed to the time-driven reveal ratio: lime wedge at 30%, lime-bolt + vertical-rl kanji (`リギ`) at 70%. Minimum dramatic hold `holdMs=2400`. Exit animation: 200 ms CRT-shutter collapse (`scaleY: 0.02`). Uses `.paper-grain` + `.vignette-warm` + `.edge-foxing` + `.scanlines` + `.url-tag` + `.kanji-glitch`.

### `components/loading/use-asset-preloader.ts`
Returns `{ progress, done }`. Preloads a `CRITICAL_ASSETS` list (paper grain, shards, logo) via `new Image()`. Counts both `onload` and `onerror` as "tick" so a missing asset doesn't stall the gate. Accepts an `extraAssets` array for page-specific preloads — **Phase 4 wires `projects.map(p => p.coverArt)` through `SceneReadyGate`** so boot gates on cover-art caching and vinyls render without a texture flash on first paint.

### `components/scene/scene-canvas.tsx` (Phase 2)
Client-only wrapper around R3F `<Canvas/>`. Reads `view` from `useSceneStore`; parses `?view=` query param once on mount as a dev override (`cube|zooming|desk|project`). `dpr={[1,2]}`, warm clear color (`#f4f1e8`), camera pre-seated but `CameraRig` re-seats it per view. Wrapper `<div>` is `fixed inset-0 z-[1]`, `opacity: visible ? 1 : 0` (600 ms ease), `pointer-events: auto` only when `view` is `'desk' | 'project'`. `visible = view !== 'cube'` — canvas crossfades in *during* `zooming`. Imported via `next/dynamic({ ssr: false })` from [app/page.tsx](app/page.tsx) — R3F needs the browser.

### `components/scene/scene-content.tsx`
Canvas children. Mounts `<CameraRig/>` + `<Lights/>` eagerly, wraps all mesh components in `<Suspense fallback={null}/>` so `useTexture` on the cube-face SVGs can stream in without crashing first paint.

### `components/scene/camera-rig.tsx` (Phase 3 + 5)
Manual camera controller — no drei `OrbitControls`. Sets fov 52 / near 0.1 / far 50 on mount. **Three poses** (rewritten in the first-person reframe pass — see Phase 5.1 below):
- `BASE_POSITION = (0, 1.35, 3.2)` / `BASE_LOOK_AT = (0, 0.18, -0.2)` — first-person desk view, eye-height behind desk tilted down ~20°.
- `CUBE_POSITION = (-1.2, 0.7, 1.6)` / `CUBE_LOOK_AT = (-1.9, 0.3, 0.45)` — close-to-paperweight; R3F layer sits statically behind the CSS cube.
- `CRT_POSITION = (-0.92, 0.72, 0.78)` / `CRT_LOOK_AT = (-1.17, 0.66, -0.18)` — frames the jade phosphor dead-centre from ~1 m out for the project detail view.

**View-driven behavior** (via `useEffect(view)` + `useFrame`):
- `cube` — camera parked at `CUBE_POSE` statically; parallax off.
- `zooming` — hand-rolled easeOutCubic tween (`ZOOM_TWEEN_MS = 1400`) lerps position + `currentLook` from the live camera pose to `BASE_POSITION` / `BASE_LOOK_AT`. On settle, calls `setView('desk')`.
- `project` — tween (`VIEW_TWEEN_MS = 800`) from current pose to `CRT_POSITION` / `CRT_LOOK_AT`. Parallax resumes afterwards around the CRT pose at reduced strength (`0.3×`).
- `desk` — tween back to `BASE_POSITION` on return; once settled, pointer parallax (`PARALLAX_X = 0.22`, `PARALLAX_Y = 0.12`, `PARALLAX_LERP = 0.08`). Suppressed at distances `< 0.01` from base.

A `currentLook: Vector3` ref tracks the actually-applied lookAt so transitions tween → parallax never snap.

### `components/scene/lights.tsx`
`ambientLight` @ 0.55, warm directional key @ 1.1 from `(5,6,4)` (colour `#f4d79b`), jade rim @ 0.45 from back-left (`#5e8566`), hemi fill (`#f7f9f2` / `#2a2520`). Tuned so `MeshToonMaterial` reads as cel-shaded under Ref4's saturated-flat look without washing out the parchment base.

### `components/scene/desk.tsx`, `keyboard.tsx`, `cube-paperweight.tsx`
Flat-cel geometry — boxes, cylinders, planes. All meshes use `<meshToonMaterial>` or `<meshBasicMaterial>` (no PBR). **Pivot + group naming is locked** (`name="desk"`, `name="vinyl-crate"`, `name="vinyl-${project.id}"`, etc.) so transport arcs + GLTF drop-ins don't have to touch parent transforms. `CubePaperweight` loads the 6 [public/assets/cube-faces/](public/assets/cube-faces/) SVGs via drei `useTexture` into a `MeshToonMaterial[]`. Its world position was nudged from `(-2.25, …, 0.4)` → `(-1.9, …, 0.45)` during the first-person reframe so it stays in-frame at FOV 52. Y rotation is driven by `useSceneStore(s => s.cubeHandoffRotationY)` so the 3D cube spawns at the same angle the CSS cube ended on at click-time. `Desk` uses warm wood `#a5661f` / shadow `#5c3a1a`.

### `components/scene/vinyl.tsx` (Phase 4 + 5.1)
Data-driven sleeve — takes `{ project, basePosition, baseRotation, slotIndex, hoveredSlotIndex }`. Loads `project.coverArt` via drei `useTexture` into a `MeshToonMaterial` (parchment-tinted `#f4f1e8`, `transparent: true`). Accent spine `MeshBasicMaterial` tinted from `project.accentColor`. Group is `name={\`vinyl-${project.id}\`}` — **transport arc lookup depends on this pattern**.

**Group origin sits at the bottom edge of the sleeve** (mesh offset `[0, 0.26, 0]`) so X-rotation pivots around the bottom — the "thumbing through records" flip-through feel. `useFrame` picks one of three rotational targets:
- `isHovered` (slotIndex === hoveredSlotIndex) → `FLIP_ACTIVE_RAD = 0.55` + lift `+0.08 Y` + push `+0.06 Z`
- `isFlipped` (slotIndex > hoveredSlotIndex — i.e., vinyls closer to the viewer that have "been flipped past") → `FLIP_PAST_RAD = 0.28` + push `+0.03 Z`
- otherwise → resting `baseRotation[0]` (`-LEAN_RAD`, top leaning back).

Filter dim-lerp drives both sleeve + spine materials to `opacity 0.35` when `filterCategory !== 'all' && !== project.category`; `LERP = 0.18`. Also hides itself (`visible={!isTransported}`) while `transportActiveVinylId === project.id` so the transport's own sleeve/record mesh owns the visual through the arc + reverse. `onClick` → `selectVinyl(id)`.

### `components/scene/vinyl-crate.tsx` (Phase 4 + 5.1)
Square wooden-record-crate. World position `(0, 0.09, 0.55)`, `CRATE_WIDTH = 0.95`, `CRATE_DEPTH = 1.2`, tall back wall (`CRATE_HEIGHT_BACK = 0.48`) + lower front wall (`CRATE_HEIGHT_FRONT = 0.3`) so vinyl tops peek above. Kraft / warm-wood palette (`WOOD = #a0661f`, `WOOD_DARK = #6b3f15`), dark top-rim trim along the sides + back, brass medallion + handle notch on the front panel. **Slots stack along the Z axis**: `step = CRATE_DEPTH / (slots.length + 1)`, `z = -CRATE_DEPTH / 2 + step * (i + 1)`. Iterates `projects` grouped by `CATEGORY_ORDER = ['designs','games','prototypes']`, inserts a `CrateDivider` before each category run. All sleeves lean back uniformly around X at `LEAN_RAD = 12°` (not alternating). Computes `hoveredSlotIndex` once from `useSceneStore.hoveredVinylId` and passes both `slotIndex` + `hoveredSlotIndex` to every `<Vinyl/>` so the cascade flip-through works. **Group name stays `vinyl-crate`.**

### `components/scene/crate-divider.tsx` (Phase 4 + 5.1)
Thin kraft card — rewritten thin-along-Z (`0.85 × 0.56 × 0.02`, colour `#d6c8a3`) so it slots between Z-stacked vinyls without pushing them apart. Index tab on top (`0.18 × 0.08 × 0.022`) + ink underline. drei `<Html>` at `position=[0, 0.72, 0]`, `center`, `distanceFactor=2.6`, renders the label in `VCR_OSD_MONO` uppercase with `0.18em` letter-spacing. Three instances mount via `VinylCrate`'s slot builder — `DESIGN / GAME / PROTO`. Group is `name={\`divider-${label.toLowerCase()}\`}`.

### `components/scene/vinyl-hover-label.tsx` (Phase 4 + 5.1)
drei `<Html>` at `position=[0, 0.78, 0]`, `center`, `distanceFactor=2.2` — Y bumped from 0.55 to clear the new bottom-pivot sleeve top at y=0.52. Parchment card with ink border + solid brutalist shadow (`4px 4px 0 #1A1A1A`). Shows `project.title` in VCR_OSD_MONO `font-weight:900` and `ex://project/${slug}` caption beneath, tinted by `project.accentColor`. Controlled via the `visible` prop (fades 160 ms via inline style). `pointerEvents: none`.

### `components/scene/crate-hud.tsx` (Phase 4)
**DOM overlay, not drei `<Html>`.** Mounted in [app/page.tsx](app/page.tsx) above `<SceneCanvas/>`. Outer `<div className="fixed inset-0 z-[50]">` with opacity gated on `view === 'desk'` (400 ms ease). Layout:
- **Top-left**: `sys//crate_index` kicker + live `YYYY.MM.DD // HH:MM:SS` stamp (updates via `setInterval(1000)`).
- **Top-center**: `every : project` low-opacity label (Ref3's center signature).
- **Right-rail (middle)**: `FILTER_ORDER = [{all 10}, {designs}, {games}, {prototypes}]` — each a `<button>` calling `setFilterCategory(key)`. Active filter: vermilion colour + `▸` pointer + underline. Thin VCR_OSD_MONO links (no `CyberButton` chrome — intentional per Ref3).
- **Bottom-right**: `[save] [share] [?]` triad, purely visual.
- **Bottom-left**: `jade-soft` pulse dot + `crate_online` status text.
`projects.length` seeds the `all N` label — stays accurate if the array grows.

### `lib/store/scene-store.ts` (Phase 2 + 3 + 4 + 5)
Zustand. State: `view: 'cube' | 'zooming' | 'desk' | 'project'`, `selectedVinylId`, `hoveredVinylId`, `isPlaying`, `cubeHandoffRotationY` (deg, default 45 — final CSS-cube rotateY captured at click-time), `filterCategory: 'all' | ProjectCategory` (consumed by `Vinyl` dim-lerp + `CrateHud` active tag), `transportActiveVinylId: string | null` (Phase 5 — `VinylTransport` marks its animated project here so the matching crate sleeve hides itself through forward arc + playback + reverse until the drop settles). Actions: `setView`, `setHoveredVinyl`, `enterDesk(rotationY?)`, `selectVinyl(id)` (also flips `view='project'` + `isPlaying=true`), `eject()` (flips `view='desk'`, clears selection, stops play), `setFilterCategory(filter)`, `setTransportActive(id)`.

### `lib/projects.ts` (Phase 4)
Canonical `ProjectCategory = 'designs' | 'games' | 'prototypes'` + `Project { id, slug, title, category, year, coverArt, accentColor, body: { summary, highlights[], links[] } }`. Seeded with 10 placeholders in category-grouped order: `design-01..04`, `game-01..03`, `proto-01..03`. Accent colours drawn only from the warm-band palette (`#C91D22`, `#4B6E4F`, `#D94833`, `#D6B85A`) — no cold-electric tints on sleeves per the style guide. Exports `projectById(id)` lookup helper. Cover art paths point to `/assets/covers/<slug>.svg`.

### `components/scene/turntable.tsx` (Phase 5)
Hi-Fi low-poly plinth (cream top `#d9d2b8` + darker sides + vermilion accent strip) at world `(1.6, 0.09, 0.5)`. Platter well (cylinder) + vinyl disc body (`#141210`) + felt-top mat (`#CB3A3D`) + jade rim highlight (`#4F9970`, `ringGeometry` so `rotation={[-π/2, 0, 0]}` tips the face up). Spindle, groove ring, cream label (`#EDE6D3`), rubber feet, pitch slider, start button, speed toggle, and an S-curve tonearm with counterweight + headshell + vermilion cartridge + stylus tip. **Group name `turntable`** with children `name="platter"` + `name="tonearm"` — the transport + any future reverse animation reads these. Tonearm rotation state: `isPlaying` true + `TONEARM_DELAY_MS = 1000` debounce → `setArmDown(true)` → lerps Y rotation from `TONEARM_REST_Y = -π/6` to `TONEARM_PLAY_Y = 0` at `ARM_LERP = 0.14`. Platter spins at `PLATTER_RPM = 33` (`PLATTER_RAD_PER_SEC = (33/60) * 2π`) only while armDown. `isDevProjectOverride()` helper lets `?view=project` skip the arm-down debounce.

**Rotation gotcha**: `cylinderGeometry`'s default axis is world Y (already vertical), so the flat discs (well, vinyl body, felt, label) must NOT have `rotation={[-π/2, 0, 0]}` — they'd tip on their side. `ringGeometry`'s default normal is world Z, so those DO need `rotation={[-π/2, 0, 0]}` to lay flat. Mixing them up was a visible first-person bug fixed during Phase 5.

### `components/scene/crt-monitor.tsx` (Phase 5)
Chunky beige CRT bezel + dark hood vent + jade phosphor screen plane + `.scanlines` CSS via drei `<Html>` for the on-screen striping. Positioned at world `(-1.3, 0.09, -0.7)` with a `0.25 rad` Y rotation so the screen face points roughly at the camera without breaking the first-person framing. **Child group `name="crt-screen"`** hosts `<CrtProjectDetail/>` via drei `<Html transform occlude>` on `view === 'project'`. Boot-flicker lerp on screen material opacity reads as a 3–4 pulse sequence before the React detail resolves. Warm band only — the one cold-electric accent (brief signal-lime flash) is gated to the boot pulse per the style guide.

### `components/scene/crt-project-detail.tsx` (Phase 5)
React component rendered inside the drei `<Html transform occlude>` on the `crt-screen` plane. Looks up `selectedVinylId` via `projectById` and renders VCR_OSD_MONO body copy on parchment:
- Header: `[title] // [CATEGORY] // [year]`
- Summary paragraph from `project.body.summary`
- Bulleted `project.body.highlights`
- `project.body.links` rendered as `ex://` url-tag pills
- `[EJECT]` `CyberButton` at bottom → `useSceneStore.getState().eject()`

Scanline striping is inside the `<Html>` so it reads as on-screen, not world-space.

### `components/scene/vinyl-transport.tsx` (Phase 5)
Persistent transport component mounted once inside `scene-content.tsx`. When `selectedVinylId` changes, runs the chained animation; when it clears, runs the reverse. Hand-rolled `useFrame` + refs — no tween library.

**Timings:**
- Forward: `LIFT_MS = 300` (rise in crate slot) → `ARC_MS = 700` quadratic bezier from lifted slot to platter, sleeve splits off at `SLEEVE_SPLIT_T = 0.55` and drifts up fading while the record continues to the spindle → settle and flip to `playing`.
- Playing: record parks on the platter, spins at `PLATTER_RPM = 33`. Sleeve hidden.
- Reverse: `REVERSE_ARC_MS = 700` sleeve fades back in over the record, then both arc back above the slot → `REVERSE_DROP_MS = 300` drop into the slot → `onReverseDone()` clears `effectiveId` + `transportActiveVinylId`.

Reads arc endpoints from `getCrateSlotWorldPose(projectId)` + `getPlatterWorldPose()` in `lib/scene/vinyl-layout.ts` — **never imports component internals**. Marks `setTransportActive(id)` through the full forward+playing+reverse so the crate sleeve hides itself the whole time.

**Record-mesh rotation**: the outer record group gets `platterPose.rotation = (-π/2, 0, 0)` (flat on platter); the inner cylinder mesh has its own `rotation={[π/2, 0, 0]}` so the composed rotation is identity (cylinder axis stays world Y) — lets the intermediate `recordSpinRef` spin around its local Z without tipping the disc.

Dev override: `?view=project` on mount seeds `selectedVinylId` + jumps directly to the `playing` phase, skipping the forward arc.

### `lib/scene/vinyl-layout.ts` (Phase 5 + 5.1)
Out-of-component geometry mirror so `VinylTransport` can resolve world poses without pulling in the crate component. Mirrors: `CRATE_POSITION = (0, 0.09, 0.55)`, `CRATE_DEPTH = 1.2`, `LEAN_DEG = 12`, category slot iteration (must stay in sync with `vinyl-crate.tsx`). `BASE_Y_LOCAL = 0.035` + `MESH_Y = 0.26` match the bottom-pivot offset in `vinyl.tsx`, so `getCrateSlotWorldPose(id)` returns the sleeve's *visual centre* in world space (origin + rotate `[0, MESH_Y, 0]` by the X lean) — which is what the transport's sleeve-centred mesh needs as its lift-from-slot anchor. `getPlatterWorldPose()` = `(1.6 + -0.05, 0.09 + 0.135, 0.5)` with rotation `(-π/2, 0, 0)`.

---

## Custom Hooks

### `hooks/use-hand-tracking.ts`
Initializes MediaPipe `HandLandmarker` from CDN (`@mediapipe/tasks-vision@0.10.3`). Requests webcam access. Runs per-frame landmark detection in a `requestAnimationFrame` loop.

**Egg Grip detection logic:**
- Index + middle fingertips extended (tip farther from wrist than PIP joint)
- Ring + pinky curled (tip closer to wrist than PIP joint)

**Rotation formula (when egg grip active):**
```
targetRotation = (wrist.x - 0.5) * -800 + (twistDeltaX * -2500) + 45
```
- `wrist.x` = landmark[0].x
- `twistDeltaX` = landmark[9].x - landmark[0].x (middle knuckle vs wrist)

**Returns:** `{ rotateY, isReady, isEggGesture, videoRef, isEnabled, toggleTracking }`

### `hooks/use-mouse-position.ts`
Tracks `{ x, y }` cursor coordinates for interactive elements.

### `hooks/use-mobile.ts`
Returns boolean — whether viewport width is below mobile breakpoint.

---

## Build Status

### Phase 0 — Style-guide evolution (done)
- Two-band token system in `app/globals.css` (`--paper-warm`, `--ink-warm`, `--vermilion-soft`, `--jade-soft`, `--tape-yellow`, `--paper-shadow`, `--signal-lime`, `--signal-blue`, `--signal-white`).
- Overlay utilities: `.paper-grain`, `.vignette-warm`, `.edge-foxing`, `.ar-shard`, `.kanji-glitch`, `.url-tag`, `.scanlines`.
- `.agents/rules/visual-style-guide.md` rewritten as the two-band spec.
- `public/assets/textures/paper-grain.svg` + 8 shard SVGs in `public/assets/overlays/ar-shards/`.

### Phase 1 — Loading screen (done)
- `components/loading/boot-screen.tsx`, `use-asset-preloader.ts`, `scene-ready-gate.tsx`.
- Wired into `app/layout.tsx` (`<SceneReadyGate>{children}</SceneReadyGate>`).
- Per-session first-boot via `sessionStorage` flag.

### Legacy (still in place)
- Hero page layout (full-screen, 3-column, responsive) in `app/page.tsx`
- Interactive CSS-3D isometric cube in `components/isometric-cube.tsx` (6 faces, mouse + hand-gesture rotation)
- MediaPipe hand tracking (egg grip) in `hooks/use-hand-tracking.ts`
- `GlitchOverlay` background effect in `components/glitch-overlay.tsx`
- `Header` top nav + `HandTrackerOverlay` HUD
- `CyberButton` + `GlitchText` animation primitives
- 60+ shadcn/ui components
- Vercel deployment + Analytics

### Phase 2 — R3F desk scene scaffolding (done)
- Installed `three @react-three/fiber @react-three/drei zustand` (+ `@types/three` dev).
- `lib/store/scene-store.ts` — Zustand: `view`, `selectedVinylId`, `hoveredVinylId`, `isPlaying` + `setView/setHoveredVinyl/enterDesk/selectVinyl/eject`.
- Full `components/scene/` tree rendering placeholder geometry: `scene-canvas`, `scene-content`, `camera-rig` (iso-ish fov 32 + pointer parallax), `lights` (warm key + jade rim), `desk`, `vinyl-crate` (10 standing sleeves + brass tags), `vinyl`, `turntable`, `crt-monitor`, `keyboard`, `cube-paperweight` (reuses the 6 [public/assets/cube-faces/](public/assets/cube-faces/) SVGs via drei `useTexture`).
- Materials are 100% `MeshToonMaterial` / `MeshBasicMaterial` — flat-cel look, no PBR.
- `<SceneCanvas/>` mounted in `app/page.tsx` via `next/dynamic({ ssr: false })`; opacity + pointer-events gated on `view`. DOM landing fades out when `view !== 'cube'` so the two layers no longer collide.
- Dev URL override: `?view=desk|project|zooming|cube` seeds the store on mount.
- Boot-screen cadence reworked: time-driven 280 ms/line, shard checkpoints tied to reveal ratio, `holdMs=2400` — boot now reads as a deliberate 2-ish-second sequence instead of a single-frame flash.
- `npm run build` green.

### Phase 3 — Cube→Desk handoff (done)
- **Single click handoff**: [components/isometric-cube.tsx](components/isometric-cube.tsx) — all 6 faces `onClick={handleCubeClick}` → `useSceneStore.getState().enterDesk(rotationRef.current)`. Dropped `router` / `isHovered` rotation-lock. `rotationRef` tracks the live `rotateY` each animate tick.
- **Store extension**: [lib/store/scene-store.ts](lib/store/scene-store.ts) — added `cubeHandoffRotationY: number` (default 45); `enterDesk(rotationY?)` stashes it.
- **Camera tween**: [components/scene/camera-rig.tsx](components/scene/camera-rig.tsx) — added `CUBE_POSITION / CUBE_LOOK_AT`; easeOutCubic tween over 1400 ms on `view === 'zooming'`; calls `setView('desk')` on settle. Parallax suppressed during tween; `currentLook` ref keeps lookAt continuous across cube → zooming → desk.
- **Fade orchestration** in [app/page.tsx](app/page.tsx) — three-stage: (1) side panels + radar rings fade at `view !== 'cube'`; (2) cube wrapper fades `opacity 1→0 / scale 1→0.95` (400 ms) on `cubeFaded = view !== 'cube'`; (3) whole shell fades only at `view === 'desk'`. R3F canvas crossfades in during `zooming`.
- **Paperweight rotation continuity**: [components/scene/cube-paperweight.tsx](components/scene/cube-paperweight.tsx) — reads `cubeHandoffRotationY` from store, applies to group Y rotation (deg→rad). If handoff lands showing the wrong face, a single-axis sign flip is the tuning knob.
- No `components/transition/cube-handoff.tsx` created — `CameraRig` `useEffect(view)` + page opacity classes were enough. No tween deps added (hand-rolled `useFrame` + `useRef`).
- `prefers-reduced-motion` snap fallback parked for Phase 6 per plan.
- `npm run build` green. Dev server returns 200 on `/`, `/?view=desk`, `/?view=zooming`.

### Phase 4 — Vinyl crate + project data (done)
- **Data** [lib/projects.ts](lib/projects.ts) — `ProjectCategory`, `Project` + 10 seeded placeholders (4 Designs / 3 Games / 3 Prototypes). Warm-band accent palette only. `projectById(id)` helper exported.
- **Cover art** — 10 parchment-style placeholder SVGs in [public/assets/covers/](public/assets/covers/). Large VCR_OSD_MONO numeral, accent category-tag block, ink border, small accent chit — all roughly 1024² viewBox, `<slug>.svg` naming.
- **Crate wiring** [components/scene/vinyl-crate.tsx](components/scene/vinyl-crate.tsx) — iterates `projects` grouped by `CATEGORY_ORDER`, inserts a [`CrateDivider`](components/scene/crate-divider.tsx) before each run, lays out across `CRATE_WIDTH = 2.3`. Kraft walls + brass tags unchanged.
- **Data-driven vinyl** [components/scene/vinyl.tsx](components/scene/vinyl.tsx) — cover-art texture via `useTexture`, peel-forward `useFrame` lerp (`+0.25 Z / +0.10 Y / −8°` tilt, `LERP = 0.18`), filter dim-lerp on both sleeve + spine materials (`opacity 0.35` when `filterCategory !== 'all' && project.category`). Click → `selectVinyl(id)`. Groups named `vinyl-${project.id}`.
- **Hover label** [components/scene/vinyl-hover-label.tsx](components/scene/vinyl-hover-label.tsx) — drei `<Html>` parchment card with `VCR_OSD_MONO` title + accent-tinted `ex://project/<slug>` caption; fades via inline style.
- **Dividers** [components/scene/crate-divider.tsx](components/scene/crate-divider.tsx) — kraft card + tab + drei `<Html>` label (`DESIGN / GAME / PROTO`). Group `divider-${label.toLowerCase()}`.
- **HUD** [components/scene/crate-hud.tsx](components/scene/crate-hud.tsx) — DOM overlay at `z-[50]` (below `GlitchOverlay`'s `z-[60]`), visible only on `desk`. Ticking mono timestamp top-left, `every : project` center-top, right-rail `all N / designs / games / prototypes` filter tags (thin mono links, active = vermilion + ▸ + underline), `[save] [share] [?]` visual-only triad bottom-right, `crate_online` pulse bottom-left.
- **Store extension** [lib/store/scene-store.ts](lib/store/scene-store.ts) — added `filterCategory: CrateFilter` (default `'all'`) + `setFilterCategory(filter)`. Chose store over local `useState` so Phase 5's CRT can honour the filter later.
- **Preload** [components/loading/scene-ready-gate.tsx](components/loading/scene-ready-gate.tsx) — passes `projects.map(p => p.coverArt)` as `extraAssets` to the preloader so boot gates on covers.
- **Mount** [app/page.tsx](app/page.tsx) — `<CrateHud/>` sits above `<SceneCanvas/>`, below the DOM landing shell.
- **Click-to-CRT deferred** — selecting a vinyl currently just flips `selectedVinylId` + `view='project'`; no visual response yet (that's Phase 5).
- `npm run build` green. Dev server on `/` and `/?view=desk` both 200.

### Phase 5 — Vinyl → Turntable → CRT reveal (done)
- **Layout mirror** [lib/scene/vinyl-layout.ts](lib/scene/vinyl-layout.ts) — resolves world poses for crate slots + platter; consumed by `VinylTransport` without importing component internals.
- **Transport** [components/scene/vinyl-transport.tsx](components/scene/vinyl-transport.tsx) — persistent sleeve+record pair. Forward chain: `LIFT_MS = 300` → `ARC_MS = 700` quadratic bezier → sleeve splits at `SLEEVE_SPLIT_T = 0.55` (fades+drifts up) while the record continues → settle on platter + flip to `playing`. Reverse chain mirrors it (`REVERSE_ARC_MS = 700` + `REVERSE_DROP_MS = 300`). Hand-rolled `useFrame` + refs; no tween library.
- **Transport hide-the-crate-sleeve** [components/scene/vinyl.tsx](components/scene/vinyl.tsx) — reads `transportActiveVinylId` and hides (`visible={!isTransported}`) through the full forward+playing+reverse until `onReverseDone` clears it, so the crate sleeve doesn't pop in early.
- **Turntable** [components/scene/turntable.tsx](components/scene/turntable.tsx) — rebuilt in Hi-Fi low-poly style (plinth + platter + felt + spindle + groove ring + rubber feet + pitch slider + start button + speed toggle + S-curve tonearm + counterweight + headshell + cartridge + stylus). Tonearm debounce `TONEARM_DELAY_MS = 1000` after `isPlaying` flips, swings `TONEARM_REST_Y = -π/6 → TONEARM_PLAY_Y = 0` at `ARM_LERP = 0.14`. Platter spins at `PLATTER_RPM = 33` only while armDown. Stable `name="platter"` + `name="tonearm"` preserved.
- **CRT boot + detail** [components/scene/crt-monitor.tsx](components/scene/crt-monitor.tsx) + [components/scene/crt-project-detail.tsx](components/scene/crt-project-detail.tsx) — 3–4 opacity pulses on the phosphor over ~600 ms, then drei `<Html transform occlude>` renders the React detail on the `crt-screen` child group. Detail = header (`title // CATEGORY // year`) + summary + highlights bullets + `ex://` link pills + `[EJECT]` `CyberButton` → `eject()`.
- **Camera CRT pose** [components/scene/camera-rig.tsx](components/scene/camera-rig.tsx) — added `CRT_POSITION / CRT_LOOK_AT` third pose; `view === 'project'` tweens to it over `VIEW_TWEEN_MS = 800` and back on eject. Parallax resumes around the CRT pose at `0.3×` the desk strength.
- **Store extension** [lib/store/scene-store.ts](lib/store/scene-store.ts) — `transportActiveVinylId` + `setTransportActive`.
- **Dev override** — `?view=project` on mount jumps directly to the `playing` phase (seeds `selectedVinylId = 'design-01'` if none set).
- `npm run build` green.

### Phase 5.1 — First-person reframing + wooden-crate redesign (done)
Post-Phase-5 UX polish pass prompted by a BFCM-2025-Shopify first-person reference + a wooden-record-crate reference photo.
- **Camera: isometric → first-person** [components/scene/camera-rig.tsx](components/scene/camera-rig.tsx) — FOV 32 → **52**; `BASE_POSITION (3.6, 3.0, 5.0)` → **`(0, 1.35, 3.2)`**, `BASE_LOOK_AT (0, 0.35, 0)` → **`(0, 0.18, -0.2)`**. Reads as someone leaning forward at a workstation. Parallax halved (`X = 0.22 / Y = 0.12 / LERP = 0.08`). `CUBE_POSE` retuned to `(-1.2, 0.7, 1.6)` → `(-1.9, 0.3, 0.45)` to survive the tighter frame.
- **CRT on the left** — `CRT_POSITION (-0.92, 0.72, 0.78)` / `CRT_LOOK_AT (-1.17, 0.66, -0.18)` — frames the jade phosphor dead-centre from ~1 m out.
- **Cube paperweight nudge** [components/scene/cube-paperweight.tsx](components/scene/cube-paperweight.tsx) — `(-2.25, …, 0.4)` → `(-1.9, …, 0.45)` to stay in-frame at FOV 52.
- **Saturated palette bumps** [app/globals.css](app/globals.css) — `--secondary #4B6E4F → #3C8760`, `--accent #D94833 → #E84A30`, `--vermilion-soft #B83C3F → #CB3A3D`, `--jade-soft #5E8566 → #4F9970`, `--tape-yellow #D6B85A → #E6B938`. Warm wood [components/scene/desk.tsx](components/scene/desk.tsx) `#8a5a2b → #a5661f`.
- **Platter-render bug fix** [components/scene/turntable.tsx](components/scene/turntable.tsx) — dropped `rotation={[-π/2, 0, 0]}` from the cylinder discs (platter well, vinyl body, felt, label) so they stay flat; kept it on `ringGeometry` (groove ring, jade rim) because ringGeometry's default normal is Z. In isometric the bug was invisible; in first person the cylinders were tipping onto their sides.
- **Square wooden crate** [components/scene/vinyl-crate.tsx](components/scene/vinyl-crate.tsx) — rewrote as a square record box. World pos `(0, 0.09, 0.55)`, `CRATE_WIDTH = 0.95 / CRATE_DEPTH = 1.2`, tall back + low front walls, dark top-rim trim, brass medallion + front handle notch. Slots stack along **Z** (front-to-back) instead of X. All sleeves lean uniformly at `-LEAN_RAD = -12°` around X.
- **Flip-through hover** [components/scene/vinyl.tsx](components/scene/vinyl.tsx) — sleeve mesh offset `+0.26 Y` so the group origin is at the bottom edge (X-rotation pivots around the bottom). New `slotIndex` / `hoveredSlotIndex` props drive a cascade: hovered slot → `FLIP_ACTIVE_RAD = 0.55` + lift/push, slots in front of it (higher index) → `FLIP_PAST_RAD = 0.28` + push, slots behind → resting lean.
- **Divider re-orientation** [components/scene/crate-divider.tsx](components/scene/crate-divider.tsx) — card flipped thin-along-Z (`0.85 × 0.56 × 0.02`) + tab (`0.18 × 0.08 × 0.022`) + ink underline rotated onto the Z-face.
- **Layout mirror kept in sync** [lib/scene/vinyl-layout.ts](lib/scene/vinyl-layout.ts) — `getCrateSlotWorldPose` now accounts for the bottom-pivot origin (rotates `[0, MESH_Y, 0]` by the X lean) so transport lift-from-slot anchors to the sleeve's visual centre. Turntable world pose unchanged.
- **Hover-label Y bump** [components/scene/vinyl-hover-label.tsx](components/scene/vinyl-hover-label.tsx) — `0.55 → 0.78` to clear the new bottom-pivot sleeve top.
- `npm run build` green.

### Phase 6 — Polish (pending — next up)
`@react-three/postprocessing` (Bloom gated to CRT emissive + subtle Vignette). Optional sound via `howler`. `prefers-reduced-motion` snap transitions. Keyboard nav (`←/→/Enter/Esc`). Mobile flat fallback in `components/mobile/flat-desk.tsx`. Hand-tracker kept on landing only (off in desk scene). Delete orphan section components.

### Decisions pending (from plan Open Questions)
- GLTF model pipeline vs placeholders in prod
- Cover art source + resolution
- Real routes (`/desk/[slug]`) vs store-driven single-page
- Sound in MVP vs Phase 6
- Remove vestigial `.dark` block?

---

## Conventions

- **No dark mode** — everything is light mode only. `.dark` vars exist in CSS but are identical to `:root`. Do not implement a dark mode toggle.
- **No image optimization** — `images.unoptimized: true` in `next.config.mjs`. Use `<img>` directly, not `<Image>` from next/image.
- **Tailwind v4 syntax** — `@import "tailwindcss"`, `@theme inline { ... }`. Do not use v3 `@tailwind` directives.
- **Shadcn aliases** — `@/components/ui/*`, `@/hooks/*`, `@/lib/utils`
- **TypeScript** — strict mode on. Build errors are suppressed via `ignoreBuildErrors: true` but type correctness is still the goal.
- **Framer Motion** — use for all interactive UI states. Never use plain CSS transitions for button interactions.
- **CyberButton** — always use `@/components/ui/cyber-button` for buttons. Never roll vanilla `<button>` elements for primary interactions.
- **Shadows** — solid ink only: `shadow-[Xpx_Ypx_0px_#1a1a1a]`. No `blur`, no `rgba` alpha shadows.
- **Borders** — `border-2` minimum, `rounded-none` always.
