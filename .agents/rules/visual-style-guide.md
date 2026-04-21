# Portfolio 3.0 — Visual Style Guide

This guide defines the aesthetic for the Portfolio 3.0 frontend. All agents adjusting CSS, UI components, or design architecture must follow these rules.

## Aesthetic model: two bands

The site runs on **two coexisting visual bands**. The warm band is the canvas; the cold-electric band is the overlay. They never invert those roles.

### Warm band (base layer — always present)
- A lived-in Chinese-Brutalist light mode: parchment paper, ink black, vermilion, jade. Paper grain, subtle vignette, lived-in warmth. The desk scene, body text, layout chrome, and static surfaces all live here.
- Vibe: tactile, tactical, structural, slightly aged.

### Cold-electric band (overlay layer — transient)
- AR-graffiti language: angular shards, kanji-glitch chunks, URL-protocol captions (`ex://…`), electric lime + electric blue. Inspired by the reference imagery in `References/`.
- Appears during: loading screen, cube→desk transition, CRT boot sequence, HUD data surfaces, hover/selection flashes.
- **Coverage cap**: the cold band must never occupy more than ~12% of viewport area at any moment. It is accent, not ground.
- Never used on body text, section headings, or any sustained surface — it's a flicker.

## Color palette

### Warm band (anchors — do not change without broad review)
- `--background` `#F4F1E8` — pale parchment base.
- `--foreground` `#1a1a1a` — deep ink black (text, borders).
- `--primary` `#C91D22` — Chinese crimson / vermilion — headers, extreme highlights, primary interactive borders.
- `--secondary` `#4B6E4F` — muted jade green — tech accents, success states.
- `--card` `#E8E5DC` — slightly darker tan surface.
- `--accent` `#D94833` — vermilion orange — secondary accent.
- `--border` `#1a1a1a` — thick structural ink lines.

### Warm band (mid-tone aging layer — additive, for lived-in surfaces)
- `--paper-warm` `#EDE6D3` · `--paper-shadow` `#BFB59A` · `--ink-warm` `#2A2520`
- `--vermilion-soft` `#B83C3F` · `--jade-soft` `#5E8566` · `--tape-yellow` `#D6B85A`

### Cold-electric band (overlay accents only)
- `--signal-lime` `#C6F24A` · `--signal-blue` `#2A4CFF` · `--signal-white` `#F7F9F2`

## Typography
- **Primary font** `VCR_OSD_MONO` — massive structural text, numbers, terminal printouts, HUD.
- **Secondary font** `SpaceMono` — body copy, UI labels, readable paragraphs.
- Vertical writing modes (`writing-mode: vertical-rl`) for decorative seal/stamp chunks.
- Headings: heavy weights, massive sizes (`text-6xl`+), `tracking-tighter`.
- **URL-protocol captions** (`ex://boot.0224`, `stx://metal.h34rt`) use the `.url-tag` utility, only inside HUD surfaces and transitions.

## Structural rules
- **No rounded corners** — `rounded-none` everywhere, `--radius: 0rem`.
- **Shadows** — solid ink blocks only (e.g. `shadow-[6px_6px_0px_#1a1a1a]`). No soft blurs or `rgba` alphas.
- **Borders** — thick solid lines: `border-2`, `border-4`, or `border-[6px]`.
- **Buttons** — always use `CyberButton` from `@/components/ui/cyber-button` for interactive buttons.
- **Grid** — `.grid-pattern` is the 32px structural grid background.

## Overlay utilities (cold-electric surfaces)
- `.paper-grain` — ~8% opacity SVG noise, `mix-blend-multiply`. Additive aging, never replaces the base.
- `.vignette-warm`, `.edge-foxing` — paper aging for long-lived warm surfaces.
- `.ar-shard` (and `.ar-shard--blue`, `.ar-shard--slim`) — angular clip-path wedges with electric fill, `mix-blend-screen`.
- `.kanji-glitch` — vertical-rl kanji chunks with hard-offset chromatic shadow.
- `.url-tag` — inline `ex://…` captions on HUD surfaces.
- `.scanlines` — CRT horizontal striping.

## Dark mode
Out of scope. The existing `.dark` CSS variant shares the same tokens as `:root` — do not introduce divergent dark-mode values.
