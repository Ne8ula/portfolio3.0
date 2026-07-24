# DESIGN.md — Editorial Cockpit Design Guide

The reference for building any future web page, view, overlay, or component in this portfolio. The look is **"editorial cockpit"**: a literary print publication (cream paper, garamond display type, letterpress restraint) fused with a retro terminal / instrument-panel HUD (mono microtype, diagnostics, wireframes). Every new surface should read as both a *page from a fine-press book* and a *readout from a machine*.

Source of truth for tokens: [app/globals.css](app/globals.css) (`:root` vars) and [components/cockpit/materials.ts](components/cockpit/materials.ts) (`PALETTE` for 3D). This doc explains how to *use* them.

---

## 1. Core principles

1. **Cream, ink, mauve — and jade is the ONLY chromatic accent.** Never red, never blue, never yellow. Alerts, highlights, hovers, active states, cursors, status dots: all jade. If something needs to "pop," it pops jade or it pops via contrast/weight, not hue.
2. **Zero border radius.** `--radius: 0` is law. Every box, button, chip, dialog, and input is hard-cornered. Softness comes from color (warm creams), grain, and blur — never from rounding.
3. **Two typographic voices, always in tension.** Large serif display (Cormorant Garamond, light weight, tight tracking) against tiny uppercase mono labels (JetBrains Mono, wide tracking). A page with only one voice is off-brand.
4. **Quiet at rest, expressive on interaction.** Default state is calm and near-monochrome; hover/focus/active introduce the jade wireframe/glow/dot language. Don't decorate idle states.
5. **Diegetic chrome.** UI elements pretend to be part of the machine: version strings (`PORTFOLIO · V.2026.04`), system prefixes (`AX/OS v2.59 ready.`), coordinates, timestamps, `esc · return`. Prefer these over generic web furniture ("Menu", "Back", "Loading…").
6. **Texture sells it.** The `.grain` multiply overlay + `.vignette` radial darken sit over full-bleed scenes. Flat digital-clean surfaces feel wrong here; a faint paper/photo quality is the signature.

---

## 2. Palette

CSS vars in `globals.css`; use vars, never hex literals, in components (theme inversion depends on it).

| Token | Dark (default) | Role |
|---|---|---|
| `--cream` / `--cream-deep` / `--cream-warm` | `#E8E4DC` / `#D8D3C7` / `#F0EBE1` | Foreground text/lines on dark; page background on light |
| `--fog` / `--mist` | `#CFC9C0` / `#B9B5AE` | Tertiary lines, trim, dividers |
| `--ink` / `--ink-soft` / `--ink-faint` | `#1E1C1A` / `#55514B` / `#8E8A83` | Backgrounds (dark), secondary/tertiary text (light) |
| `--mauve-deep` / `--mauve` / `--mauve-light` | `#3A3644` / `#6E6878` / `#A8A2B0` | Cool neutral: borders, muted UI, secondary buttons |
| `--jade` / `--jade-deep` / `--jade-light` | `#4B6E4F` / `#3A5A3E` / `#7A9A7E` | THE accent: status dots, active states, focus rings, hover glow, links |
| `--scene-bg` | `#2d2b30` | 3D scene / full-bleed stage background |

Rules of thumb:
- **Ratio:** ~90% cream/ink neutrals, ~7% mauve, ~3% jade. Jade is punctuation, not paint.
- Translucent panels over scenes use ink glass: `rgba(30,28,26, .55–.96)` fills with `1px solid rgba(232,228,220, .16–.22)` borders.
- Hairlines everywhere are 1px, low opacity (`.25–.65`), often gradient-faded at the ends: `linear-gradient(to right, transparent, rgba(232,228,220,.45) 12%, … 88%, transparent)`.
- Light theme is a true inversion (vars swap, see `html[data-theme="light"]`) — never hand-pick light-mode colors; write against the vars and both themes work. Boot/warp phases are always dark.

## 3. Typography

Fonts: **Cormorant Garamond** (serif display), **JetBrains Mono** (everything else), **VT323** (terminal/boot text only).

| Class / pattern | Spec | Use |
|---|---|---|
| `.display` | Serif, weight 300–400, `letter-spacing: -.02em`, `line-height: .9–.95` | Page titles, hero names ("Alex Xiong" at 120px), card titles (22–24px) |
| `.label` | Mono 10px, `.22em` tracking, uppercase, 500, `--ink-soft` | Section labels, nav items, chip text |
| `.micro` | Mono 9px, `.18em` tracking, uppercase, `--ink-faint` | Metadata, footnotes, coordinates |
| `.term` / `.term-small` | VT323 15/13px | Boot screen and CRT/terminal contexts ONLY |
| Nav / wordmark trim | Mono 12–13px, `.24–.32em` tracking, 500–600 | Header chips, clock, version string |

Rules:
- **Scale jumps are extreme by design**: 9–13px mono sits directly next to 96–120px serif. There is almost no middle register; body copy is mono 11px / `line-height 1.55`, max-width ~560px.
- All mono UI text is UPPERCASE with wide tracking. Serif is never uppercase and never tracked wide.
- Serif italic (12px) is the flavor voice — taglines, purposes, one-line descriptions (`OBJECT · PURPOSE` tag pattern).
- Separators are middots with spaces: `PORTFOLIO · V.2026.04`, `ESC · RETURN`, `12:31 · EST`. Never slashes or pipes in labels (pipes are allowed as 1px vertical *rule elements*, not characters).
- Wordmark style: `{A_XIONG}` — serif with literal braces; system name style: `AX/OS`, `AX-01` — mono.

## 4. Layout

- **Full-bleed stage + floating HUD.** Pages are a single viewport (`overflow: hidden` on the cockpit; future scrolling pages may relax this) with UI pinned to edges over the content. Content owns the center; chrome owns the perimeter.
- **Anchor map** (from the cockpit — reuse on new pages): top-left wordmark + status; top-right nav chips + clock; left edge vertical `writing-mode: vertical-rl` micro label; bottom edge gradient scrim (`linear-gradient(to top, rgba(30,28,26,.55), transparent)`) carrying captions/controls; bottom-right utility (theme toggle, legend); bottom-left avatar/glyph dot.
- Generous edge insets: ~28–40px from viewport edges.
- **Hero text overlaps the scene** (the name sits over the 3D desk). Don't box content away from imagery — layer it, then use scrims for legibility.
- Corner-bracket framing (`⌐ ¬` style jade brackets) marks interactive/focusable regions — the "CLICK TO ENTER" pattern.
- Grids are implicit; alignment comes from the shared edge insets and hairline rules, not from visible columns or cards-with-shadows. **No drop shadows** — depth = translucency + border + scrim.

## 5. Components

**Buttons** — transparent fill, `1px solid var(--mauve)`, mono 9px `.22em` uppercase, `padding: 6px 12px`, square. Hover: border/text shift toward cream or jade. Active: global `scale: .96`. Primary action may invert (ink text on cream fill) as on the boot screen's `[ENTER THE ROOM]`.

**Chips / status pills** — ink glass (`rgba(30,28,26,.58)` + light border), mono 9px uppercase, containing a 3–6px square **jade dot** (never a circle) + text + optional 1px vertical divider. Used for weather, clock, hover tags.

**Dialogs / panels** ("AX/OS · DIALOG" pattern) — cream paper panel, hard corners, header row = mono bold uppercase title + jade underline rule + three ink dots (`● ● ●`) top-right, body in mono with `»`/`>` line prefixes, footer input as `> ask ax/os…` prompt with a bordered `SEND` label-button. Any future modal, form, or chat surface follows this anatomy.

**Name tags** (hover labels) — ink glass chip, mono uppercase `OBJECT · PURPOSE` where PURPOSE is serif italic; animate in with `tagFadeIn` (never `termFadeIn` — transform keyframes must compose the positioning translate).

**Info cards** (VinylInfoCard pattern) — translucent gradient panel (`rgba(232,228,220,.10)` → `rgba(30,28,26,.18)`) with a faint diagonal sheen, serif 22–24px title + 1px divider + mono `.3em` code + serif italic subtitle, jade `◄ / ►` steppers.

**Focus** — global, already defined: `outline: 2px solid var(--jade-light); outline-offset: 3px`. Never remove it, never restyle per-component.

**Selection** — inverted: ink background, cream text (`::selection`).

## 6. Motion

Keyframe library lives in `globals.css` — reuse before writing new ones.

- **Easing/tempo:** small and soft. Fade+rise entrances (`termFadeIn`/`typeIn`: 4–8px translateY), soft opacity pulses (`softBlink`, `softPulse`) for live indicators. Nothing bounces, nothing overshoots.
- **CRT/terminal grammar** for phase changes: `termCrtOn/Off`, `termScanRoll`, `termSweep`, `termGlitch`, `termRGB`. Glitch is *subtle and brief* — a flicker riding a transition wavefront, never a persistent effect (see memory: no flashes; seamless diegetic reveals).
- Hover reveals ease in ~200–400ms; idle scenes are dead still (only the turntable platter spins).
- **`prefers-reduced-motion: reduce` is fully honored** — global animation kill switch exists; the warp is skipped. Any new bespoke JS animation must check it too.
- Never animate `transform` in a keyframe on an element positioned by a translate without composing both (the `tagFadeIn` lesson).

## 7. Voice & microcopy

- System voice: lowercase-terminal or uppercase-label, never Title Case sentences. `AX/OS v2.59 ready.` / `Type a prompt to begin.` / `READY · AWAITING CONFIRMATION`.
- Serif voice: humane, brief, italic where secondary — "hello." on the PC screen.
- Prefer verbs-as-instructions in brackets: `[ENTER THE ROOM]`, `CLICK TO BROWSE`, `ESC · RETURN`.
- Dates/versions as diegetic firmware strings: `V.2026.04`.

## 8. 3D / imagery language (for any new scene or rendered asset)

- Product-render objects: off-white satin bases, milky **frost** panels, clear **hero glass** (`makeHeroGlass`/`makeFrost` in materials.ts), jade printed accents on LIT materials only (unlit basic materials glow like light-bars — forbidden for ink accents).
- Decal text `#6F8D75`, accent bars jade `0x4B6E4F`; micrographic silkscreen sheets from `public/micrographics/` via `decals.ts`.
- Hover language: light-jade wireframe edge trace (x-ray, normal blend) + name tag. No color washes, no outlines-at-rest.
- Screenshots for reference: `boot-screen.png`, `cockpit-view.png`, `crate-view.png` at repo root.

## 9. Checklist for a new page

- [ ] Both themes verified (write against vars; boot/warp-style intros stay dark)
- [ ] `.grain` + `.vignette` over any full-bleed scene
- [ ] Serif display + mono microtype both present; no mid-size generic type
- [ ] Jade only accent; no shadows; no rounded corners
- [ ] Edge-anchored HUD chrome, 28–40px insets, hairline rules
- [ ] Hover states additive (jade), idle states quiet
- [ ] Reduced motion respected; focus-visible untouched
- [ ] Microcopy in system voice (middots, brackets, version strings)
