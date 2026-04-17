# Portfolio 3.0 — CLAUDE.md

> Living document. Update this file whenever the codebase, design system, or build status changes.

---

## Project Overview

**Owner**: Alex Xiong (Ne8ula)  
**Purpose**: Personal technical portfolio showcasing projects, skills, and contact — wrapped in a cyberpunk/brutalist interactive interface.  
**Version**: v.2025.04  
**Repo**: https://github.com/Ne8ula/portfolio3.0  
**Deployment**: Vercel (with Analytics enabled)  
**Status**: Active development — hero page complete, content sections in progress

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

### Aesthetic

**Chinese-Brutalist Light Mode** — warm parchment base, stark black structural lines, Chinese cultural accent colors (vermilion + jade). Terminal-style framing (Marathon-inspired), strictly light mode only.

### Color Palette

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
│   ├── header.tsx            # Nav bar with status indicator
│   ├── isometric-cube.tsx    # Interactive 3D cube (main hero element)
│   ├── glitch-overlay.tsx    # Background SVG decal scatter + click ripple effect
│   ├── about-section.tsx     # About content section
│   ├── contact-section.tsx   # Contact section
│   ├── projects-section.tsx  # Projects showcase section
│   ├── vinyl-bin.tsx         # Recent work carousel
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
│   └── utils.ts              # cn() — classname merger (clsx + tailwind-merge)
├── public/
│   ├── fonts/                # vcr-osd-mono.ttf, spacemono-regular.ttf
│   ├── assets/micrographics/ # SVG tech decals for GlitchOverlay and cube faces
│   ├── images/               # Project reference images
│   └── logo.webp             # Alex Xiong brand logo
└── .agents/rules/
    └── visual-style-guide.md # CANONICAL design rules — read this before any UI work
```

---

## Key Components

### `app/page.tsx`
The only page. Full-screen hero layout (no scroll). Three-column layout on desktop:
- **Left** — Data Terminal: title card (`ALEX XIONG`) + about interface. Minimizable via `×` button.
- **Center** — `IsometricCube` + tech radar rings (rotating dashed circles, crosshairs, floating data boxes)
- **Right** — Decorative vertical panel: ruler marks, Japanese text (`システム警告 // SEC_9`), indicator dot
- **Footer** — copyright, GitHub / LinkedIn / X links
- `HandTrackerOverlay` floats bottom-right as a HUD

### `components/isometric-cube.tsx`
3D cube with 6 faces, each mapped to a route or decorative content:
- **Front** → `/projects` (red/primary, PROJECTS label)
- **Right** → `/about` (jade/secondary, ABOUT label)
- **Left** → `/contact` (ink/border, CONTACT label)
- **Back** → decorative grid with micrographic SVGs
- **Top** → system diagnostics display (MEM/CPU/NET)
- **Bottom** → grid pattern + spinning circles

**Rotation behavior:**
- Mouse X position drives `targetRotation`: `(xPercent - 0.5) * -270 + 45` (right = About, left = Contact)
- Lerp factor: `0.02` (very smooth, slow catch-up)
- Hover over cube locks rotation (prevents face from spinning away on click)
- MediaPipe egg-grip gesture overrides mouse rotation

**CSS:** Inline `<style>` block inside component. Sizes: 240px mobile → 340px md+. Perspective: `1200px`.

### `components/glitch-overlay.tsx`
Background effect layer. On mount: scatters 15 random SVG micrographic decals at random positions. Decals re-randomize every 4 seconds. Click anywhere creates a ripple visual. Uses `mix-blend-multiply`. Types: hologram (green), error (red), background (neutral).

### `components/ui/hand-tracker.tsx`
Fixed HUD (bottom-right). Shows MediaPipe status: OFFLINE → BOOTING → ONLINE. Displays EGG_GRIP detection. Toggle button enables/disables webcam. Driven by `useHandTracking` hook.

### `components/header.tsx`
Top nav: `[ABOUT] :: [PROJECTS] :: [CONTACT]` links. Right side: pulsing green "ONLINE" status dot. Thick borders, brutalist styling. Positioned `absolute top-0 z-50`.

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

### Done
- Hero page layout (full-screen, 3-column, responsive)
- Interactive 3D isometric cube with 6 faces and mouse rotation
- MediaPipe hand gesture control (egg grip → cube rotation)
- GlitchOverlay background effect with SVG decals + click ripples
- Header navigation with live status indicator
- HandTrackerOverlay HUD (MediaPipe toggle + status)
- CyberButton component with Framer Motion brutalist states
- GlitchText animation component
- Complete shadcn/ui component library (60+ components)
- CSS variable design system with Chinese-Brutalist theme
- Vercel deployment + analytics

### In Progress
- About section (`about-section.tsx` exists, not fully integrated)
- Projects section (`projects-section.tsx` exists, not routed)
- Contact section (`contact-section.tsx` exists, not routed)
- VinylBin recent work carousel (`vinyl-bin.tsx` exists)
- Cube face navigation routing (placeholder structure in place)

### Not Started
- `/about`, `/projects`, `/contact` individual pages
- Real portfolio content (currently placeholder text)
- Mobile gesture refinement
- Accessibility audit

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
