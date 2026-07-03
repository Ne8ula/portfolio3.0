# Portfolio 3.0 — Visual Style Guide

> **Editorial Cockpit.** This supersedes the old two-band (warm parchment + cold-electric) Chinese-Brutalist guide, which was scrapped with the desk-scene direction. Canonical tokens: [../../app/globals.css](../../app/globals.css) and [../../docs/cockpit-handoff/ds/colors_and_type.css](../../docs/cockpit-handoff/ds/colors_and_type.css). Visual reference sheet: [../../docs/cockpit-handoff/Design System.html](../../docs/cockpit-handoff/Design%20System.html).

## The look
Editorial, photo-poster neutral. **Cream parchment + ink + mauve-grey structure + muted jade.** Jade is the *single* chromatic accent (live/success/hover/focus). No red, no vermilion, no cyberpunk neon. No rounded corners (`--radius: 0`). Soft editorial paper drop-shadows, never brutalist ink blocks.

## Two themes
- **Dark (default):** cream-on-ink. Scene bg `#2d2b30`.
- **Light:** inverts — ink-on-cream. Scene bg `#ECE6D8`. Applied via `html[data-theme="light"]`, and only during the `cockpit` phase (boot + warp always render dark).
- Persisted to `localStorage['cockpit-theme']`.

## Palette (dark defaults)
| Role | Var | Hex |
|---|---|---|
| Background / page | `--cream` | `#E8E4DC` |
| Lifted surface | `--cream-warm` | `#F0EBE1` |
| Card / pressed | `--cream-deep` | `#D8D3C7` |
| Inset / divider | `--fog` | `#CFC9C0` |
| Hairline | `--mist` | `#B9B5AE` |
| Ink (text/structure) | `--ink` | `#1E1C1A` |
| Secondary text | `--ink-soft` | `#55514B` |
| Tertiary chrome | `--ink-faint` | `#8E8A83` |
| Display pair | `--mauve-deep` | `#3A3644` |
| Structural accent | `--mauve` | `#6E6878` |
| Pale mauve | `--mauve-light` | `#A8A2B0` |
| **Accent** | `--jade` | `#4B6E4F` |
| Pressed jade | `--jade-deep` | `#3A5A3E` |
| Pale jade / selection | `--jade-light` | `#7A9A7E` |

## Typography
- **Display:** `Cormorant Garamond` serif, oversized (`clamp(4rem,10vw,8rem)`), tracking `-0.02em`. `.display` / `--font-serif`.
- **Body / UI / chrome:** `JetBrains Mono`, small labels with wide letter-spacing, uppercase. `--font-mono`. Helpers: `.label` (10px/.22em), `.micro` (9px/.18em).
- **Boot terminal:** `VT323` + `Major Mono Display`. Helpers: `.term`, `.term-small`, `.term-display`.
- Fonts load by literal family name via the `<link>` in `app/layout.tsx` (not `next/font`) — inline styles reference the family names directly.

## Motion & texture
- Motion eases: `--ease-brut: cubic-bezier(.16,1,.3,1)`, durations 120/240/520ms.
- Full keyframe library in `globals.css`: `term*` (boot CRT off/on, glitch, jitter, scan/band roll, noise, fadeIn), `warp*` (ring expand, stretch, rotate, flash, shrink-text), `softPulse` / `softBlink` (HUD live dots).
- Overlays above the scene: `.grain` (SVG fractal-noise, `mix-blend-mode: multiply`, ~35%) + `.vignette` (radial corner darken).

## Rules
- Jade is the only chromatic accent — everything else is the cream→ink→mauve neutral stack.
- `--radius: 0` everywhere. Hairline (1px) borders default; soft paper shadows (`0 18px 40px -20px rgba(30,28,26,.5)`), never hard ink blocks.
- 8px spacing grid. `::selection` → ink bg / cream text.
- Cockpit UI is predominantly inline-styled with `var(--…)` tokens — match that when adding to it rather than introducing Tailwind utility soup.
