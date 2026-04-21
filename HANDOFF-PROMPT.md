# Handoff prompt — paste this into a new Claude Code chat

Copy everything between the `---` lines below into a fresh chat so context isn't condensed. The new session will pick up exactly where this one left off, ready to begin **Phase 6**.

---

I'm resuming a major UX redesign of my Next.js 16 portfolio at `/Users/pandora2/Documents/GitHub/portfolio3.0`. Please read the following before doing anything else:

1. **[CLAUDE.md](CLAUDE.md)** — updated project overview, two-band design system, overlay utilities, component map, and phase-by-phase build status. **Phases 0–5 are done, plus a Phase 5.1 first-person reframing + wooden-crate redesign pass.**
2. **[.agents/rules/visual-style-guide.md](.agents/rules/visual-style-guide.md)** — canonical visual rules (two-band: warm parchment base + cold-electric AR-graffiti overlay).
3. **[/Users/pandora2/.claude/plans/okay-currently-the-website-sorted-canyon.md](/Users/pandora2/.claude/plans/okay-currently-the-website-sorted-canyon.md)** — the approved 6-phase plan. Phase 6 is the final polish pass.
4. **[References/](References/)** — user-provided image/gif/mp4 references. Ref4 (`af9d5fc…mp4`, isometric cartoon desk with saturated CRT + keyboard) anchors the flat-cel illustration style. The first-person reframe added a BFCM-2025-Shopify reference for POV framing, and a wooden-record-crate reference for the Phase 5.1 crate.

## Target user flow (still the same)
Loading screen → CSS-3D cube landing → click cube → fluid camera zoom-OUT into a first-person desk scene (R3F) with the cube shrunk to a paperweight → desk has CRT on the LEFT, turntable on the RIGHT, wooden vinyl crate center-forward → hover flips through the crate bottom-to-top → click a vinyl → record arcs onto turntable → CRT boots project detail → `[EJECT]` returns to desk.

## What's already done in prior sessions

- **Phase 0** — two-band design tokens + overlay utilities live in [app/globals.css](app/globals.css). 8 AR-shard SVGs in [public/assets/overlays/ar-shards/](public/assets/overlays/ar-shards/).
- **Phase 1** — boot screen + asset preloader + session-gated `SceneReadyGate` wired into [app/layout.tsx](app/layout.tsx). `use-asset-preloader.ts` accepts `extraAssets` (used for cover art).
- **Phase 2** — R3F scene scaffold under [components/scene/](components/scene/). All meshes `MeshToonMaterial` / `MeshBasicMaterial` — no PBR. Stable `name="…"` on every pivot (`name="desk"`, `name="vinyl-crate"`, `name="vinyl-${project.id}"`, `name="turntable"`, `name="platter"`, `name="tonearm"`, `name="crt-monitor"`, `name="crt-screen"`, `name="keyboard"`, `name="cube-paperweight"`) — **don't rename these**. Dev URL override: `?view=desk|project|zooming|cube`.
- **Phase 3** — Cube → Desk handoff with easeOutCubic tween + three-stage DOM fade orchestration. Paperweight Y rotation continuity via `cubeHandoffRotationY`.
- **Phase 4** — Vinyl crate + 10 seeded projects in [lib/projects.ts](lib/projects.ts). Data-driven sleeves via `useTexture(project.coverArt)`. HUD overlay ([components/scene/crate-hud.tsx](components/scene/crate-hud.tsx)) with ticking timestamp + filter tags + `[save][share][?]`.
- **Phase 5** — Vinyl → Turntable → CRT reveal is fully wired:
  - [lib/scene/vinyl-layout.ts](lib/scene/vinyl-layout.ts) — geometry mirror, resolves crate slot + platter world poses.
  - [components/scene/vinyl-transport.tsx](components/scene/vinyl-transport.tsx) — persistent lift/arc/split/spin/reverse chain driven by `selectedVinylId`. Sleeve splits from record at `t = 0.55` mid-arc. Hand-rolled `useFrame` + refs.
  - [components/scene/vinyl.tsx](components/scene/vinyl.tsx) reads `transportActiveVinylId` and hides the crate sleeve through the full forward+playing+reverse cycle.
  - [components/scene/turntable.tsx](components/scene/turntable.tsx) — Hi-Fi low-poly plinth + platter spinning at `PLATTER_RPM = 33` + S-curve tonearm lerping `TONEARM_REST_Y = -π/6 → TONEARM_PLAY_Y = 0` after `TONEARM_DELAY_MS = 1000`. Stable `name="platter"` + `name="tonearm"`.
  - [components/scene/crt-monitor.tsx](components/scene/crt-monitor.tsx) — beige bezel + jade phosphor + `.scanlines`. 3–4 opacity pulses on boot, then drei `<Html transform occlude>` mounts [components/scene/crt-project-detail.tsx](components/scene/crt-project-detail.tsx) on the `crt-screen` child group.
  - [components/scene/crt-project-detail.tsx](components/scene/crt-project-detail.tsx) — React detail view: header / summary / highlights / `ex://` link pills / `[EJECT]` `CyberButton` calling `eject()`.
  - [components/scene/camera-rig.tsx](components/scene/camera-rig.tsx) — added third pose `CRT_POSITION / CRT_LOOK_AT`; `view === 'project'` tweens to it over `VIEW_TWEEN_MS = 800`, `eject()` tweens back.
  - Store ([lib/store/scene-store.ts](lib/store/scene-store.ts)) gained `transportActiveVinylId` + `setTransportActive`.
- **Phase 5.1** — First-person reframing + wooden-crate redesign (post-Phase-5):
  - Camera switched from isometric (FOV 32, `(3.6, 3.0, 5.0)`) to **first-person POV** (FOV 52, `(0, 1.35, 3.2)` → `(0, 0.18, -0.2)`). CRT intentionally sits on the LEFT of the frame, turntable on the RIGHT. See `BASE_POSITION / BASE_LOOK_AT / CUBE_POSITION / CUBE_LOOK_AT / CRT_POSITION / CRT_LOOK_AT` in [components/scene/camera-rig.tsx](components/scene/camera-rig.tsx).
  - Palette saturation bumps in [app/globals.css](app/globals.css): `--secondary → #3C8760`, `--accent → #E84A30`, `--vermilion-soft → #CB3A3D`, `--jade-soft → #4F9970`, `--tape-yellow → #E6B938`. Warm wood desk `#a5661f`.
  - [components/scene/turntable.tsx](components/scene/turntable.tsx) platter-render bug fixed: `cylinderGeometry`'s default axis is world Y (NO `rotation={[-π/2, 0, 0]}` on cylinder discs); `ringGeometry`'s default normal is world Z (keep the rotation on rings). Mixing them up was visible only in first-person.
  - [components/scene/vinyl-crate.tsx](components/scene/vinyl-crate.tsx) is now a square wooden crate (`0.95 × 1.2`) at `(0, 0.09, 0.55)` with tall back / low front walls, brass medallion, handle notch. **Slots stack along Z**, all sleeves lean uniformly at `-LEAN_RAD = -12°` around X.
  - [components/scene/vinyl.tsx](components/scene/vinyl.tsx) sleeves have bottom-pivot origin (mesh offset `[0, 0.26, 0]`) and a cascade flip-through hover driven by new `slotIndex` / `hoveredSlotIndex` props: active slot tips to `0.55 rad` + lifts, slots in front of it tip to `0.28 rad`, slots behind rest.
  - [components/scene/crate-divider.tsx](components/scene/crate-divider.tsx) re-oriented thin-along-Z for the new stacking. [components/scene/vinyl-hover-label.tsx](components/scene/vinyl-hover-label.tsx) Y bumped `0.55 → 0.78`. [lib/scene/vinyl-layout.ts](lib/scene/vinyl-layout.ts) updated so `getCrateSlotWorldPose` accounts for the bottom-pivot offset.
- **Build is green** (`npm run build` passes). Dev: `/`, `/?view=desk`, `/?view=zooming`, `/?view=project` all render; cube-click flies through the chain; CRT shows the detail; EJECT reverses cleanly.

## What to do next — Phase 6: Polish

Follow the plan's Phase 6 section. Concretely, deliver the following in order — but stop and check in before shipping the mobile fallback:

### 1. Accessibility + input (small, must-haves first)

- **`prefers-reduced-motion`** — in [components/scene/camera-rig.tsx](components/scene/camera-rig.tsx), [components/scene/vinyl-transport.tsx](components/scene/vinyl-transport.tsx), and [components/loading/boot-screen.tsx](components/loading/boot-screen.tsx): if the media query matches, **snap** instead of tween. Specifically:
  - `CameraRig`: on view change, just set `position` + `lookAt` directly, no easeOutCubic.
  - `VinylTransport`: jump to the `playing` / `idle` end state — no arc, no split.
  - `BootScreen`: keep the info but skip the per-line reveal cadence + shard animation.
  - Use `window.matchMedia("(prefers-reduced-motion: reduce)")` with a `.matches` boolean captured in a ref. Don't subscribe to changes; one read on mount is fine.
- **Keyboard nav** — on `view === 'desk'`:
  - `←` / `→` cycle between currently-visible (respecting `filterCategory`) vinyls, setting `hoveredVinylId`.
  - `Enter` calls `selectVinyl(hoveredVinylId)`.
  - On `view === 'project'`: `Esc` calls `eject()`.
  - Implement as one `useEffect` at the [app/page.tsx](app/page.tsx) level that reads the store and attaches a `keydown` listener. Don't scatter across components.
- **Focus ring for keyboard users** — when keyboard-hover moves, make sure `VinylHoverLabel` still shows. It already keys off `hoveredVinylId` via `hoveredSlotIndex === slotIndex`, so this should work if the keyboard handler sets `setHoveredVinyl(id)` — verify.

### 2. Postprocessing bloom (the money shot)

- Install `@react-three/postprocessing` + `postprocessing`. Wire the `<EffectComposer/>` inside [components/scene/scene-content.tsx](components/scene/scene-content.tsx) as a child of `<Canvas/>`.
- **Bloom gated to emissive-only**: the CRT phosphor plane and the turntable's cartridge/stylus tip should be tagged to bloom. Everything else must not. In practice: set a high `luminanceThreshold` (~1.1) so only near-pure-white / high-intensity emissive materials pass, OR use the selective-bloom trick via `SelectiveBloom` + `layers`. Pick whichever is less invasive; selective-bloom is cleaner.
- Subtle `<Vignette/>` (offset ~0.35, darkness ~0.6) for the desk scene only. Fades off on `view === 'cube'`.
- **Do not over-bloom**: the design is Chinese-Brutalist flat cel, not cyberpunk neon. Bloom should be a faint glow around the phosphor, not a halo you can see from across the room.

### 3. Sound (optional — ask before committing to deps)

- The plan lists `howler` for optional audio. Before installing, ask: does the user want sound in the MVP, or defer to a post-launch pass? If yes:
  - `click.wav` on cube click + on vinyl click (low-volume mechanical click).
  - `vinyl-drop.wav` when the record lands on the platter (t=1.0s into forward arc).
  - `crt-boot.wav` with the flicker pulses.
  - Gate behind a store flag `soundEnabled: boolean` (default `false`) + a `[🔊]` toggle in the `CrateHud`. Respect `prefers-reduced-motion` (imply sound-off too).

### 4. Mobile fallback

- Build [components/mobile/flat-desk.tsx](components/mobile/flat-desk.tsx) — a flat, scrollable DOM layout (no R3F) for `useIsMobile() === true`. Render in [app/page.tsx](app/page.tsx) behind a `useIsMobile` check before the `<SceneCanvas/>`.
- Shape: stacked sections — header, vinyl grid (category-grouped, tap-to-open), CRT-style project detail modal, `[EJECT]` closes. Reuse [components/scene/crt-project-detail.tsx](components/scene/crt-project-detail.tsx)'s DOM shape if you can (extract a shared `ProjectDetail` component).
- **Check in with the user before investing here** — the desktop experience may deserve more polish first, and "flat fallback" is a big-surface task.

### 5. Hand-tracker scoping

- [components/ui/hand-tracker.tsx](components/ui/hand-tracker.tsx) + [hooks/use-hand-tracking.ts](hooks/use-hand-tracking.ts) are mounted globally. Gate the HUD to `view === 'cube'` only — MediaPipe should shut down its webcam + `requestAnimationFrame` loop on desk/project views. The cube already consumes the gesture; the desk scene has no use for it and shouldn't hold the camera hot.
- Verify `toggleTracking()` still cleans up the stream.

### 6. Cleanup + orphan purge

Now that the redesign is shipping, delete the Phase-0 orphans listed in [CLAUDE.md](CLAUDE.md):
- [components/about-section.tsx](components/about-section.tsx)
- [components/projects-section.tsx](components/projects-section.tsx)
- [components/contact-section.tsx](components/contact-section.tsx)
- [components/vinyl-bin.tsx](components/vinyl-bin.tsx) — confirm no remaining imports (it seeded [lib/projects.ts](lib/projects.ts); the data now lives there, so it's safe to remove).

Also address the **Decisions pending** block in CLAUDE.md:
- GLTF model pipeline vs placeholders — flag if the placeholder geometry still reads acceptably after bloom, otherwise queue GLTF sourcing.
- `.dark` vars in [app/globals.css](app/globals.css) — remove if truly unused (run a quick grep for `.dark` class usage first).

## Phase 6 acceptance

- `prefers-reduced-motion: reduce` snaps all tweens + boot screen. No jank.
- `←/→/Enter` navigates the crate on desk view; `Esc` ejects on project view.
- CRT phosphor bloom reads as a faint glow — not a halo. No other mesh blooms accidentally. Vignette engaged on desk, disengaged on cube.
- Hand-tracker webcam shuts off once `view !== 'cube'`. Toggle works.
- (If approved) `soundEnabled` flag works, toggle in HUD, respects reduced-motion.
- Mobile (`useIsMobile()`) renders the flat fallback; desktop unaffected.
- Orphan components deleted, no dangling imports. `.dark` block removed if unused.
- `npm run build` green, `npm run lint` clean.

## Ground rules (unchanged from prior phases)

- Tailwind v4 syntax (`@import "tailwindcss"`, `@theme inline`).
- No `next/image` (`images.unoptimized: true`).
- `CyberButton` for all primary buttons (EJECT, sound toggle, etc.).
- Light mode only. No dark-mode toggle.
- All scene meshes stay `MeshToonMaterial` / `MeshBasicMaterial`. **Bloom is the only postprocessing exception.**
- **Don't rename stable scene-graph names** (`vinyl-crate`, `vinyl-${id}`, `turntable`, `platter`, `tonearm`, `crt-monitor`, `crt-screen`, `cube-paperweight`, `desk`, `keyboard`, `divider-${label}`).
- **Don't pull in tween libraries** — hand-rolled `useFrame` + refs + easeOutCubic for any new animation.
- Cold-electric band (`--signal-lime`, `--signal-blue`, `--signal-white`) stays ≤12% of viewport. Bloom on CRT is warm-band (the jade phosphor itself) — that's fine.
- Respect the `.agents/rules/visual-style-guide.md` two-band rules when picking any new colors.

## Report back

After implementing, run `npm run build` and `npm run dev`. Validate the Phase 6 acceptance list end-to-end. Summarize what shipped vs deferred. Flag anything that regressed in prior phases — the first-person reframe was recent and some edge cases may only surface under the new POV.
