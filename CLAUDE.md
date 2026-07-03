# Portfolio 3.0 — CLAUDE.md

> Living document. Update this file whenever the codebase, design system, or build status changes.

---

## Project Overview

**Owner**: Alex Xiong (Ne8ula)
**Purpose**: Personal technical portfolio, reimagined as an **"Editorial Cockpit"** — the visitor boots a retro terminal, warps through a trance transition, and lands first-person at a desk in a 3D room. They free-look (cursor) around a procedurally-built translucent x-ray computer, a mechanical keyboard, and a wooden vinyl crate they can scroll through. An editorial HUD frames the scene with chrome, live weather, and running telemetry. Dark/light theme toggle.
**Version**: v.2026.04
**Repo**: https://github.com/Ne8ula/portfolio3.0
**Deployment**: Vercel (with Analytics enabled)
**Status**: Ported from the `Portfolio Website.zip` handoff (see [docs/cockpit-handoff/HANDOFF.md](docs/cockpit-handoff/HANDOFF.md)). The previous "desk-scene / vinyl-crate on a brutalist landing" build was fully replaced. Build is green.

### ⚠️ Direction change (2026-07)
This repo previously implemented a Chinese-Brutalist landing → R3F desk scene ("vinyl crate" redesign, Phases 0–5.1). **That entire direction was scrapped and purged.** The site is now the Editorial Cockpit ported from the handoff bundle. If you find references to the old system (isometric cube, `useSceneStore`, `lib/projects.ts`, warm/cold two-band palette, MeshToonMaterial desk), they are gone — do not resurrect them.

### User flow
1. **Boot** — cinematic crash → reboot → POST terminal (~6s), ends on a `[ENTER THE ROOM]` confirm button (Enter/Space/click).
2. **Warp** — ~1.8s trance tunnel (expanding jade rings, rotating spokes, white flash).
3. **Cockpit** — first-person 3D desk. Cursor free-look (yaw ±22°, pitch ±15°, smoothed). Hover the x-ray PC → jade brackets + "click to enter" → click dollies into a `monitor` view with an on-screen dialog (Esc backs out). Click the vinyl crate to activate it, then scroll to browse and hover to pop a record up. Theme toggle bottom-right.

### The port (how it was done)
The handoff was a standalone HTML/JS prototype (React + Babel-in-browser + three.js **r0.140** from CDNs). It was ported into this Next.js repo **keeping the three.js imperative** (per the handoff's recommended path — it "moves almost verbatim"):
- CDN `window.THREE` → npm `three` (`^0.184.0`). `THREE.ColorManagement.enabled = false` is set in [globe-canvas.tsx](components/cockpit/globe-canvas.tsx) so the tuned emissive/tone values render like the r0.140 prototype.
- Babel `<script type="text/babel">` components → real `"use client"` modules under [components/cockpit/](components/cockpit/). The heavy imperative files carry `// @ts-nocheck`.
- The `window.__cockpit*` bridge (below) is **preserved intentionally** — don't refactor it away.
- The dev **Tweaks panel** + edit-mode `postMessage` protocol were dropped; the dialed-in `TWEAK_DEFAULTS` are hardcoded in [cockpit-app.tsx](components/cockpit/cockpit-app.tsx) and pushed into the live scene on mount.
- The legacy Rubik's-cube loader files were dropped (not ported).

---

## Dev Commands

```bash
npm run dev      # Start local dev server (Next.js, Turbopack)
npm run build    # Production build
npm run start    # Serve production build
npm run lint     # ESLint check
```

---

## Tech Stack

| Layer | Tool | Notes |
|---|---|---|
| Framework | Next.js (App Router) | 16.0.10, Turbopack |
| Runtime | React | 19.2.0 |
| Language | TypeScript | `ignoreBuildErrors: true`; ported 3D/HUD files use `@ts-nocheck` |
| 3D | three.js | `^0.184.0`, **imperative** (no React Three Fiber) |
| Styling | Tailwind CSS v4 + plain CSS vars/inline styles | most cockpit UI is inline-styled |
| Fonts | Google Fonts via `<link>` in layout | Cormorant Garamond, JetBrains Mono, VT323, Major Mono Display |
| Analytics | Vercel Analytics | — |

**Config notes:**
- `next.config.mjs`: `typescript.ignoreBuildErrors: true`, `images.unoptimized: true`.
- Path alias `@/*` → project root.
- Fonts are loaded by **literal family name** (not `next/font`) because the ported inline styles reference `"JetBrains Mono"`, `"VT323"`, etc. directly — keep the `<link>` in [app/layout.tsx](app/layout.tsx).
- `--radius: 0` — no rounded corners.
- **R3F / drei / postprocessing / mediapipe / shadcn / zustand deps remain in `package.json` but are unused** by the port. Safe to prune later; left in to avoid install churn.

---

## Design System — "Editorial Cockpit"

> Canonical source: [docs/cockpit-handoff/ds/colors_and_type.css](docs/cockpit-handoff/ds/colors_and_type.css) + [docs/cockpit-handoff/Design System.html](docs/cockpit-handoff/Design%20System.html). Tokens + keyframes live in [app/globals.css](app/globals.css). Short spec: [.agents/rules/visual-style-guide.md](.agents/rules/visual-style-guide.md).

**Palette** — cream parchment + ink + mauve + **muted jade (the sole chromatic accent)**. No vermilion/red. Two themes: **dark is default** (cream-on-ink); light inverts (ink-on-cream). Theme is applied via `html[data-theme="light"]` and only takes effect in the `cockpit` phase (boot/warp are always dark).

Core CSS variables (dark defaults, in `:root`):

| Var | Hex | Var | Hex |
|---|---|---|---|
| `--cream` | `#E8E4DC` | `--ink` | `#1E1C1A` |
| `--cream-warm` | `#F0EBE1` | `--ink-soft` | `#55514B` |
| `--cream-deep` | `#D8D3C7` | `--ink-faint` | `#8E8A83` |
| `--fog` | `#CFC9C0` | `--mauve-deep` | `#3A3644` |
| `--mist` | `#B9B5AE` | `--mauve` | `#6E6878` |
| `--jade` | `#4B6E4F` | `--mauve-light` | `#A8A2B0` |
| `--jade-deep` | `#3A5A3E` | `--jade-light` | `#7A9A7E` |
| `--scene-bg` | `#2d2b30` | `--page-grad-1..3` | cream ramp |

**Typography:**
- Display: `Cormorant Garamond` (serif), oversized, tracking `-0.02em`. Var `--font-serif`.
- Body / UI / chrome: `JetBrains Mono`, small caps-ish labels, wide letter-spacing. Var `--font-mono`.
- Boot terminal also uses `VT323` + `Major Mono Display`.
- Helper classes in globals.css: `.display`, `.label`, `.micro`, `.term`, `.term-small`, `.term-display`.

**Texture / motion:** `.grain` (SVG fractal-noise, multiply ~35%) + `.vignette` overlays sit above the scene. Keyframe library (boot CRT cycle, glitch, warp trance) is all in globals.css (`term*`, `warp*`, `softPulse`, etc.). `--radius: 0`, soft editorial paper shadows (not brutalist blocks).

---

## Project Architecture

```
portfolio3.0/
├── app/
│   ├── layout.tsx            # Root layout: Google Fonts <link>, metadata, Analytics
│   ├── page.tsx              # "use client" — dynamically imports CockpitApp (ssr:false)
│   └── globals.css           # Tailwind v4 import + cockpit tokens + keyframe library + helper classes
├── components/cockpit/       # THE ENTIRE APP lives here (ported from the handoff)
│   ├── cockpit-app.tsx       # App shell + phase state machine (boot → warp → cockpit) + theme + TWEAK_DEFAULTS apply
│   ├── boot-screen.tsx       # Cinematic crash→reboot→POST boot terminal; onDone → warp
│   ├── warp-transition.tsx   # ~1.8s trance tunnel; onComplete → cockpit
│   ├── theme-toggle.tsx      # Bottom-right dark/light switch (persists to localStorage 'cockpit-theme')
│   ├── cockpit-hud.tsx       # <Cockpit/> — mounts GlobeCanvas + all DOM HUD chrome (SiteHeader+weather, reticle, PC hover brackets, ScreenDialog, bottom editorial strip)
│   ├── globe-canvas.tsx      # <GlobeCanvas/> — the imperative three.js scene (x-ray PC, keyboard, desk, starfield, free-look camera, PC raycast/monitor view). Attaches the crate + owns the render loop.
│   └── vinyl-crate.ts        # buildVinylCrate(scene, tableGroup, camera, renderer) — 15 scrollable records; called by GlobeCanvas
├── docs/cockpit-handoff/     # Preserved handoff bundle (authoritative spec): HANDOFF.md, Cockpit.html, original .jsx, Design System.html, ds/colors_and_type.css
├── public/                   # (emptied — the 3D scene loads NO runtime assets; everything is procedural / canvas-drawn)
├── .agents/rules/visual-style-guide.md
└── References/, 3DModels/, backend/, database/, frontend*/  # Pre-existing side dirs, NOT part of this Next app; left untouched
```

### Component load order & responsibilities
`CockpitApp` (phase machine) → renders `BootScreen`, then `WarpTransition`, then `Cockpit`. `Cockpit` renders `GlobeCanvas` (the 3D engine) + DOM HUD. `GlobeCanvas`'s `useEffect` builds the whole scene imperatively and calls `buildVinylCrate(...)` directly (no polling).

### The `window.__cockpit*` bridge (preserve this contract)
The React/DOM layer and the imperative three.js layer talk through globals set in [globe-canvas.tsx](components/cockpit/globe-canvas.tsx):
- `__cockpitScene / __cockpitCamera / __cockpitRenderer / __cockpitTableGroup` — three.js objects.
- `__cockpitPC` — x-ray PC group; `.setTransform({x,y,z,scale,yaw,pitch,roll})`.
- `__cockpitKeyboard` — `.setOffset({x,y,z})`. `__cockpitFPV` — `.setOffset({height,distance})`. `__cockpitVinyl` — crate group; `.setTransform({x,y,z,rx,ry,rz})`.
- `__cockpitSmoothedYaw / __cockpitSmoothedPitch` — read by the HUD readouts.
- `__cockpitTick` — the render loop calls this each frame; the crate registers its tick here.
- `__cockpitTheme` + `cockpit-theme` CustomEvent — theme broadcast into the 3D scene.
- `cockpit-view-mode` / `cockpit-hover` CustomEvents — 3D → HUD signals. `__getCockpitScreenRect` / `__getCockpitPCRect` — screen-space projection for the DOM overlays.
All of these are nulled on `GlobeCanvas` unmount cleanup (safe under React strict-mode double-mount).

### Dialed-in transforms
`TWEAK_DEFAULTS` in [cockpit-app.tsx](components/cockpit/cockpit-app.tsx): PC `(3.55, 0.8, 0.45)` scale `1.05` yaw `-0.69`; vinyl crate `(-4.13, 0.32, 0.55)` ry `1.97`; fpv height `-1.98` distance `-0.64`. Pushed into the scene via the `window.__cockpit*` setters once the scene mounts (retries per-frame until ready).

---

## Interactions & Behavior
- **Boot** auto-plays; **Warp** auto-transitions; **Cockpit** free-look is clamped so the camera can never leave the desk.
- **PC hover** raycasts the x-ray computer; click → `monitor` view (dolly to screen) with an AX/OS dialog overlay; Esc returns.
- **Vinyl crate** must be clicked to activate, then wheel scrolls / hover pops a record.
- **Live weather**: `SiteHeader` calls `api.open-meteo.com` (forecast + reverse geocode) using browser geolocation; falls back to NYC; fails gracefully offline.
- **Theme** persists to `localStorage['cockpit-theme']`; boot/warp always render dark.

---

## Conventions
- **Two themes** (dark default + light). Do NOT reintroduce the old "light-mode-only" rule.
- **No `next/image`** (`images.unoptimized: true`); the scene loads no image assets anyway (procedural + canvas textures).
- **Tailwind v4 syntax** (`@import "tailwindcss"`), but the cockpit UI is mostly inline-styled with CSS vars — match that when editing.
- **Keep the three.js imperative** and the `window.__cockpit*` bridge. Don't rewrite to React Three Fiber without explicit sign-off.
- Jade (`--jade`) is the **only** chromatic accent. No red/vermilion.

## Possible next steps (not yet done)
- `prefers-reduced-motion`: snap the boot/warp/camera instead of animating.
- Wire real project data into the vinyl crate + the AX/OS `ScreenDialog` (currently placeholder albums + a stub chat).
- Prune unused deps (R3F, drei, postprocessing, mediapipe, shadcn/radix, zustand, framer-motion) from `package.json`.
- Mobile fallback (the cockpit is desktop/cursor-oriented).
