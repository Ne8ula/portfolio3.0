# Phase 8A — visual revision proposal (design only, non-executable)

**Status: proposed, 2026-10-27; execution handoff in §7.** Written by Claude
`portfolio-design` from local source, one owner-supplied reference image and
one host-produced owner-preview capture (wording corrected 2026-10-27, §7).
Nothing here has run, and this document alone authorizes no work. It adds no scope to `docs/phase-8-design.md` (the
brief): §A items fit inside its §3 allowlist, and §B items need a new
owner-authored amendment first. OD-1/OD-2/OD-2a stay as they are and are not
asked for again. The brief's §1 limits, §6 ACs (incl. the full AC-22 matrix)
and §7 gates/fresh Codex QA still apply. QA is deferred, not waived.

Inputs read: the owner reference (glass laptop poster), candidate capture
`portfolio3.0-phase8a-recovery/preview-cockpit.png` (2560×1440, light theme,
SwiftShader; produced by the host during the owner preview, not supplied by
the owner), `preview-browser.json`, the candidate
`phase8a-candidate` and baseline `phase8a-baseline` sources (read-only), and
the vendor `@pmndrs/vanilla`/`three` sources in candidate `node_modules`. No
browser, gate, build, or external design tool was used. Dark theme, boot,
warp and hover were not captured, so findings about them are source-only.

## 1. Reference and critique

**What to take from the reference (mood, not geometry):** a cool graphite
wall that gets darker toward the top. A clear horizon where that wall meets
a brighter, pale receiving surface. One soft key from above and in front.
A tight, soft contact shadow under the object. Glass that shows up through
thin bright edge highlights and visible internals, not through milkiness.
Jade appears only as transmitted light from inside. The empty space reads
as calm because it is *toned*, not because it is filled. Do not copy the
laptop form, the ports, the poster typography or the cyan cast.

**Current capture vs. that reference:**

- *Blank top half.* The wall runs from `--fog` `#CFC9C0` to `--cream-warm`
  `#F0EBE1` (`globe-canvas.tsx` THEMES light, `backdropTop`/`backdropHorizon`),
  and the desk is `--cream-deep` `#D8D3C7`. So in light mode the desk is
  **darker** than the wall at the horizon, which is the reverse of the
  reference. The horizon disappears and roughly 55% of the frame reads as one
  flat value.
- *No grounding.* The three radial "impressions" (`globe-canvas.tsx`
  grounding block, `rgba(30,28,26,.32)` core, generic 4×3 rectangles) can't
  be seen under the crate, deck or PC in the capture.
- *Glass reads as frosted solid, or is missing.* See F1: source analysis
  indicates the AX-01 outer casing fails to compile; the capture is
  consistent with that, but it is not proven per mesh in a browser.
- *Overall haze.* Cream on cream with low specular contrast, so the edges
  of objects soften into the wall.

## 2. Recommended direction: "Toned studio sweep"

This is one cohesive change. Camera, models, transforms, HUD and hierarchy
do not move.

1. **Backdrop value structure** (static `studio-backdrop` texture only).
   - *Light:* use `--mauve-light`/`--mist` → `--fog` from the top of the
     frame down to the horizon (cool neutral, close to the reference's
     graphite). Add one broad, static elliptical `--cream-deep` light pool
     centred behind the crate–deck–PC cluster just above the desk line.
   - *Dark:* use `--ink` (top) → `--mauve-deep`, with a `--mauve` pool behind
     the same cluster.
   - In both themes the wall stays **darker than the lit desk** at the
     horizon. The pool and the top fall-off make the empty space read as
     deliberate studio depth, so no props or UI are added.
   - Stops use palette tokens only (AC-20).
2. **Desk as the brightest receiving plane.** Light mode: lit
   `--cream-warm`/`--cream`. Dark mode: lit `--mauve-deep` lifted by the key
   so it reads lighter than the wall bottom. The grid stays faint printed ink.
3. **Contact grounding.** Use two layers per footprint: a tight core (ink at
   about 0.35–0.45 alpha, a few cm) and a wide soft penumbra (about
   0.10–0.15). Shape each layer as a rounded rectangle or ellipse matched to
   the approved rest footprint, and nudge it away from the key (key at
   `(5,8,6)`, so shadows fall toward −x/−z). Cover the crate, deck, PC base,
   keyboard, mouse and coffee: a fixed count, as direct `tableGroup` children,
   floated 2–5 mm, with `raycast` no-op (AC-17). Footprints are read from
   `TWEAK_DEFAULTS` and never measured at runtime.
4. **Detail inside existing materials.**
   - Reshape the PMREM emitters into one long cream softbox strip above and
     in front, plus a narrow jade side strip. This gives every glass and
     clearcoat edge a thin, bright highlight like the reference.
   - Once F1 is fixed, the AX-01 casing should show its jade core and internals
     through the glass.
   - Object-specific wear lives in roughness maps only: handled crate,
     aged deck, pristine coffee. That wear shows only in highlights.
5. **Exposure.** One value for all views, tuned so that cream highlights
   don't clip once the desk brightens (AC-14).

**Rejected alternative:** filling the wall with architecture (a window,
shelving, posters) or with animated particles/stars. This breaks DESIGN §6
("no new objects to fill negative space") and needs geometry scope.

**Shadow limits.** The allowed cue is baked, static grounding. Real dynamic
shadows (`renderer.shadowMap`, light `castShadow`, per-mesh `castShadow` /
`receiveShadow`) touch renderer setup and builder meshes, both outside §3.
Transmissive shells would also cast solid shadows, and the cost falls under
AC-23. That route is amendment **D-3** (§5) and is not recommended now.
Static planes also don't follow the dev-only `__cockpit*.setTransform`
tuning; that's acceptable because rest transforms are fixed.

## 3. Findings

**F1 — Glass shader (confidence: high on mechanism, medium on count).**
- Candidate `materials.ts:36,53` now passes `thicknessMap` into
  `MeshTransmissionMaterial`. The baseline passed no maps. Callers:
  `glass-mac.ts:181`, `coffee.ts:144`, `decorations.ts:305`.
- The vendor replaces `transmission_fragment` and samples
  `texture2D(thicknessMap, vUv)` (`@pmndrs/vanilla/materials/MeshTransmissionMaterial.js:274-276`).
- In three 0.184, `vUv` is declared only `#if defined(USE_UV) ||
  defined(USE_ANISOTROPY)` (`ShaderChunk/uv_pars_fragment.glsl.js:2-4`), and
  `WebGLProgram.js` never emits `USE_UV` (only `USE_UV1..3`, lines 569-571).
  The core chunk itself uses `vThicknessMapUv` (`transmission_fragment.glsl.js:18`).
- This matches all six `preview-browser.json` errors (`'vUv' : undeclared
  identifier` at the thicknessMap line).
- How the six errors map onto the three materials is not verified.
- `MeshPhysicalMaterial` users of `makeSurfaceMaps` (turntable cover, crate
  walls) take the core path and are not affected.
- Effect (source-supported): the AX-01 `ring` and `backShell`
  (`glass-mac.ts:413,417`, both `glass`) are expected to fail to compile.
  The capture is consistent with that (no rounded glass casing around the
  bezel), but no per-mesh browser proof exists.
- AC-16 also fails as built: there is no fallback, and the only "report" is
  a console error.

**F2 — "PC wireframe shows a different model" (confidence: high, source; no
hover capture).**
- The outline geometry has **not** changed. The `glass-mac.ts` diff has no
  geometry, transform or hierarchy hunks.
- Two cause the mismatch:
  - (a) F1 is expected to hide the casing, while `highlights.ts:49-66` still traces its
    `EdgesGeometry`. The hover outline therefore draws a rounded, bevelled
    casing that isn't visible.
  - (b) **The edge set has grown.** `highlights.ts:56` skips only
    `isMeshBasicMaterial && transparent` planes. The candidate switched
    decal and text planes to `MeshStandardMaterial` (`decals.ts:19`,
    `glass-mac.ts:107,320`; baseline `MeshBasicMaterial`). Every label/decal
    plane above `minRadius` (0.14, or 0.05 for the crate,
    `globe-canvas.tsx:1194`) now gets a rectangular trace on the PC, crate,
    deck and coffee.
- Intentional internals (the jade core, `glass-mac.ts:420`) were always
  traced and are not a defect.

**F3 — Loading typography (confidence: high for 1–2, medium for 3–4; boot
and warp were not captured).** Normal-motion boot and warp, not only the
reduced-motion path:
1. *Role over-application.* `globals.css` `.term`/`.term-small` → VT323
   affects all boot chrome (stage list, registers/BUS `boot-screen.tsx:478-491`,
   console header `:291`, ACCESSIBILITY prompt `:691`, footer `:710-718`).
   Brief O-5 and DESIGN §4 limit VT323 to actual CRT/terminal lines.
2. *Synthetic bold.* `layout.tsx:20` loads VT323 at weight 400 only, but
   weight 700 is requested at warp `:436-437` ("— entering the room —", not a
   CRT line), boot `:575,:608` (`.term-small`), `:692`, and error lines `:513`.
3. *Optical size.* VT323 at 13px (`:501-502,:537`) is very small; the
   baseline had the same.
4. *First-paint swap.* With `display:'swap'`, boot may type in the
   fallback face before VT323/Plex load. This is unverified.

The legacy Google CSS (`layout.tsx:85`) stays until 8B, as approved.

## 4. Corrections

### A. Already permitted by the §3 allowlist

| # | Correction | File / region | Minimum check |
|---|---|---|---|
| A1 | Stop forwarding `thicknessMap` to `MeshTransmissionMaterial`; keep `roughnessMap` (standard slot) for hero glass; `makeFrost` unchanged. No custom shader preferred. | `materials.ts` `makeHeroGlass` | Zero WebGL shader errors in all states; AX-01 ring/backShell drawn; AC-16, AC-21 |
| A2 | Backdrop tones/pool (§2.1), desk tones (§2.2), PMREM strips (§2.4), exposure | `globe-canvas.tsx` THEMES, backdrop block, desk materials, `__xrayLit`/PMREM block, `toneMappingExposure` | AC-13/14/15/20; HUD contrast (§5) |
| A3 | Two-layer shaped grounding, fixed count | `globe-canvas.tsx` grounding block, teardown | AC-17; fit/input/pick suites |
| A4 | Roughness-map wear strength per object | `materials.ts` `makeSurfaceMaps`, builder call sites | AC-16, AC-19 streams unchanged |
| A5 | `.term`, `.term-small` → Plex Mono; VT323 stays only in `LogStream`/`PostStream` inline strings; warp string → Plex Mono | `globals.css` `.term*`; `boot-screen.tsx:501,537`; `warp-transition.tsx:436` | AC-11; F3 checks (§5) |

### B. Needs an owner amendment (do not start)

- **D-1 (edge set).** This applies if decal/text planes keep lit
  `MeshStandardMaterial` per DESIGN §7. To restore the baseline hover edge
  set, set the existing `userData.noGlow = true` opt-out on decal/text-plane
  meshes (`decals.ts` mesh factory, `glass-mac.ts:95-109,320`). That touches
  hover behaviour, which §3 forbids.
  - *Permitted interim option:* revert those planes to the baseline
    `MeshBasicMaterial`. This restores the edge set but leaves ink unlit
    (DESIGN §7 debt). It is the owner's call. It is not part of §4A and is
    not selected; no engineer applies it without an explicit owner decision.
- **D-2 (boot sizing).** Any VT323 size, tracking or weight change
  (`:501-502,:513,:537`, `.term-display` −0.02em tracking) is outside
  "font-family strings only". If D-2 is not approved, F3.2 on error lines
  and F3.3 are recorded as residuals (like O-3).
- **D-3 (dynamic shadows).** Renderer shadow map plus per-mesh flags: needs
  renderer and builder scope and an AC-23 performance re-run. Not
  recommended.

No new runner, script, dependency, post-processing, spec file or threshold.
Evidence stays inside the §4 appended blocks and AC-25 captures.

## 5. Visual acceptance criteria (proposed; adds to P8A-AC, never replaces)

V1–V7 are proposed review measurements, not owner-approved thresholds. They
add no gate; P8A-AC and the brief's §7 gates stay the binding checks.

Representative captures: 2560×1440 (primary), 1440×900, 1024×600,
3440×1440. Cover normal and reduced motion, both themes, rest / hover (PC,
crate, deck, coffee) / keyboard focus, and the crate/deck/monitor views.
The full AC-22 matrix (12 normal, narrow, 3840×2160, zoom 120/150/200%)
remains mandatory.

- **V1 Shader.** Zero WebGL program/shader console errors. A forced failure
  falls back to a non-blank render and is reported; errors are never
  suppressed or filtered.
- **V2 Silhouette.** At rest (2560×1440), the projected bbox of the PC hover
  trace matches the rendered AX-01 silhouette within ±2 CSS px. Per-target
  edge-line counts equal the baseline for each hover target.
- **V3 Source immutability.** Zero diff in geometry arguments, transforms,
  hierarchy, pick registration, bridge, `screenGroup`/`screenCorners`,
  camera/fit, HUD, contracts (AC-02/03).
- **V4 Backdrop.** At the horizon, the sampled lit desk is brighter than the
  adjacent wall (relative-luminance ratio ≥ 1.2) in both themes. Wall top is
  darker than the pool. Every HUD text region keeps WCAG 2.2 AA (≥ 4.5:1
  small, ≥ 3:1 large) against sampled backdrop pixels. Same backdrop in all
  four views.
- **V5 Grounding.** Under the crate, deck and PC, a desk sample just outside
  the footprint on the side away from the key is ≥ 8% lower in luminance than
  a sample 30% farther out. The shadow has no hard edge and the plane is
  never visible as a rectangle.
- **V6 Fonts.** On the normal boot, reduced-motion boot and warp:
  - only `LogStream`/`PostStream` elements compute to the next/font VT323
    family;
  - all other boot/warp text computes to the Plex Mono family;
  - `document.fonts.check()` is true and the matching `FontFace.status` is
    `loaded` before the first `[ENTER THE ROOM]` frame is captured;
  - no element whose computed family is VT323 has weight > 400, except
    error lines recorded under D-2.
- **V7 Composition.** Owner visual review of the AC-25 set: wall reads as
  toned depth, three heroes still lead, jade stays ≤ signal share,
  grain/vignette byte-identical, both themes.

## 6. Blockers and open decisions

1. **Implementer: stored-prompt alignment done 2026-10-27; new session
   pending.** The owner's request and approval (§7) are recorded as a narrow
   provider exception in `docs/phase-8-design.md` §10. The orchestrator's
   stored-prompt alignment (`.claude/agents/portfolio-orchestrator.md`, new
   `.claude/agents/portfolio-8a-engineer.md`) landed under the owner's manual
   permission. It becomes actionable only when a new compatible session
   verifies native Opus 5.5 identity and passes §10 items 2–5; not yet
   launched. No silent provider substitution.
2. **Integrity.** The raw byte drift in the recovered candidate's Git index
   is unresolved; the logical index equals HEAD. Before fingerprinting
   (§2.4) it must be reconciled with original evidence (recovery plan
   Route A) or, if that is unavailable, superseded prospectively by the
   owner-approved OD-R1 successor transition (`docs/phase-8-design.md` §10
   items 2–3; `docs/phase-8a-recovery-plan.md`), which needs a new
   compatible session, RB-1…RB-8 and a PASS custody review. That transition
   does not explain or accept the historical drift; it stays disclosed.
3. **Gates and QA.** Host `npm run build` and the five gates, the browser
   matrix, AC-23 performance and the fresh read-only Codex QA (AC-27) are
   still pending. Nothing here is accepted. OD-3 is not granted.
4. **Owner decisions (open):** D-1 (or the interim revert), D-2, D-3. Whether
   the §2 direction is the intended reading of "kinda like this image" is
   confirmed only at the owner visual review (V7/AC-25).

Next role (historical, superseded by §7): orchestrator relays §2/§6 to the
owner. After that, a new compatible session dispatches the Codex engineer
for §A.

## 7. Provenance and execution handoff (2026-10-27, prospective)

**Owner messages (agent-recorded, not signatures).** The owner, Alex Xiong,
wrote in the orchestration chat, verbatim:

> Fix the glass-material shader. Redesign the background through Claude
> models and implement with Opus 5.5 to make the aesthetic simplistic but
> also not have too much blank space. Ensure it fits with the rest of the
> scene. [Image #1] Ensure the aesthetic is still kinda like this image.
> There should also be more shadows, and more details, the PC wireframe
> shows a different 3D model as well. The typography during the loading
> scene is not correct.

Then, **before this document was delivered**:

> I approve the proposal. Create a compatible implementation session for me.

The orchestrator told the owner that it was preparing an Opus handoff for
the existing permitted corrections only; that the hover, font-size and
dynamic-shadow extensions had not been presented before the approval and
stay unapproved; and that there are no PC model changes.

**What this records.** Owner authority for (a) the requested visual intent
and (b) a future native Opus 5.5 engineering handoff for §4A, as bounded in
`docs/phase-8-design.md` §10. It is **not** approval of this document's
D-1/D-2/D-3 (including the D-1 interim revert), of V1–V7 as thresholds, of
any geometry/PC-model, hover, HUD or Phase 6 change, or of OD-3.
OD-1/OD-2/OD-2a stand and are not re-requested.

**Corrected presentation (wording only; direction unchanged).** (1) The
2560×1440 screenshot was a host-produced owner-preview capture, not an
owner-supplied image; the only owner-supplied image is the reference.
(2) The missing AX-01 glass surfaces are source-supported and consistent
with the capture, not proven per mesh in a browser.

**Handoff scope.** Only the §4A rows, and only where they fall inside the
brief's closed §3 paths and permitted changes. Where a row names a region
outside §3 (for example A4 builder call sites outside §3), brief §3 governs:
the engineer stops and returns to the owner. The work lands on the existing
recovered candidate or its owner-approved successor container
`phase8a-candidate-r2` (OD-R1, recovery plan Route B) (base
`bfa8d8234fd698c8053fd9915a91b8ceeb5bd04e`, existing production diff kept,
carried byte-for-byte into any successor). Prerequisites, identity,
integrity and QA rules are in brief §10; none is satisfied by this document.

Next role: a **new** compatible Astra/Claude Code session runs brief §10
items 2–3 (Route A, or the OD-R1 Route B transition ending at the fresh
read-only Codex custody report). Items 4–5 and any engineering follow only
as a separately directed continuation. Stored-prompt alignment was done
2026-10-27 and OD-R1 alignment applied, subject to orchestrator
verification; the sessions that made those stored edits implement nothing.
