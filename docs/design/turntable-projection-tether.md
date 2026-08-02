# Turntable projection redesign — "Registration Tether"

**Status: APPROVED (Direction A, owner-approved 2026-08-02).** This is the
binding spec for the implementation commit.

Design specification. No production code in this document. Replaces the
volumetric fresnel beam + radial glow pool in
`components/cockpit/turntable.ts` (the `beamMat` ShaderMaterial cone and
`baseGlow` plane). The deck state machine (`beamT`, `cardT`, arm thresholds,
depth-mask trick, `__cockpitDeck` bridge, card content and canvas) is
**unchanged** — this swaps visuals only.

---

## 1. Why the current beam fails

- `AdditiveBlending` at opacity 0.5 over an already-lit scene guarantees
  clipped, foggy whites in dark mode — the exact "sci-fi spotlight" the
  doctrine forbids. Over cream it must fall back to normal blending anyway,
  so the two themes don't even share a visual identity.
- A 0.22-radius cone flaring over a 0.5-radius disc covers ~40% of the
  record in screen space; the hero object disappears behind its own effect.
- Shimmer (`sin(vH·26 − t·1.6)`) is continuous ambient motion, violating
  "at rest the desk is quiet."
- Nothing else in the cockpit speaks "volumetric light." The site's
  projection language is *printed/annotated*: hairlines, brackets,
  letter-spaced micro-labels, jade squares as separators.

## 2. Directions considered

### A. Registration tether — APPROVED
An archival *callout*, not a light source. Two vertical jade hairlines rise
from the spinning record's label radius to the card's bottom edge, footed by
two small flat jade squares (the card's own separator token) and a thin
etched ring just outside the disc edge. Reads as a technical drawing leader
/ registration mark: the card is *annotating* the record, not being beamed
out of it. Cheapest possible geometry; record stays fully visible.

### B. Acrylic light pipe
A narrow (r ≈ 0.045) translucent rod from spindle to card — the late-90s
power-LED light pipe, edge-lit at its rim only. Honest to the era, but it
adds a physical object the plinth never molded, needs an opaque liner to
avoid the milk-slab gotcha, and centers the connection on the spindle where
the tonearm already lives. Not pursued.

### C. Index-ring ladder
Three static thin rings at graduated heights between platter and card — a
quieted hologram-projector trope. Still ornamental sci-fi; no editorial
precedent in the system. Rejected.

**Approved: A.** It reuses the site's existing projected-annotation
vocabulary (HUD brackets, hairlines, jade squares), costs almost nothing,
and inverts the hierarchy correctly: record first, card second, connective
tissue whisper-thin. Sections 3–8 below are the implementation contract.

---

## 3. Exact specification (Direction A)

All coordinates in the existing `holo` group space
(origin `PLATTER_X, 0, 0`; constants `BEAM_BOT = topY + 0.09`,
`CARD_BOT = 0.95`, `CARD_W = 0.94`, disc r = 0.5, label r = 0.155).

### Geometry

| Element | Geometry | Placement |
|---|---|---|
| Tether hairlines (×2) | `THREE.LineSegments`, 2 segments, `LineBasicMaterial` (1 device px) | x = ±0.155 (label radius), from y = `BEAM_BOT + 0.004` to y = `CARD_BOT + 0.05` (overshoot culled by the existing `cardMask` depth write, exactly as the beam tip is today) |
| Foot squares (×2) | one merged `PlaneGeometry` mesh, each square 0.014 × 0.014, lying flat (rotation.x = −π/2) | centered at (±0.155, `BEAM_BOT + 0.003`, 0) |
| Platter index ring | `THREE.RingGeometry(0.505, 0.518, 72)`, flat | y = `BEAM_BOT + 0.002` — a 6.5 mm etched ring just outside the disc edge, replacing the glow pool |

The tether group copies the card's yaw each frame (the card is a yaw-only
billboard) so line tops always meet the card's bottom edge; one quaternion
copy per frame, nothing else.

If 1-px `LineBasicMaterial` hairlines prove too faint on DPR-1 displays
during rendered verification, the approved fallback is two 0.0035-wide
quads (camera-yaw-following via the same group), same colors — decide from
the DPR-1 screenshot, not in code review.

### Color, opacity, blending

**`NormalBlending` everywhere. Additive is removed from the deck entirely**
(delete the `blend`/`beamOpacity` theme fields' additive branch). All
materials keep `transparent: true`, `depthWrite: false`,
`toneMapped: false`, `depthTest: true`.

| Element | Dark theme | Light theme |
|---|---|---|
| Hairlines | `#7A9A7E` @ 0.55 | `#3A5A3E` @ 0.50 |
| Foot squares | `#7FE6A4` @ 0.90 (signal jade — total area < 0.001 of frame, within the 10% signal budget) | `#3A5A3E` @ 1.0 |
| Index ring | `#4B6E4F` @ 0.45 | `#3A5A3E` @ 0.30 |

Render order: ring 994 → (existing `cardMask` 994.5) → hairlines + squares
995 → card 996. Same slots the beam system occupies today; no other
renderOrder changes.

### Motion

Driven by the **existing, unchanged** `beamT` (target `landed && armT >
0.55`, damping `dt · 4.0 · K`) and `easeInOut`:

- **Rise:** hairlines draw upward — `scale.y = ease(beamT)` with geometry
  origin at the base — ≈ 500 ms as today. Ring fades in over the first 40%
  of `beamT`; foot squares fade in over 120 ms once `beamT > 0.7`.
- **Settled:** completely static. No shimmer, no `uTime`, no opacity
  breathing. The spinning record and the card's existing bob are the only
  motion.
- **Eject/swap:** exact reverse through the same easing; mask arming rule
  (`ce > 0.9`) untouched.

## 4. How it connects record → card without overwhelming either

- The hairlines spring from the **label radius** — the part of the record
  that literally carries the project's identity — and land on the card's
  bottom hairline border, which becomes the "receiving rule." Card and
  tether share one typographic system.
- The foot squares repeat the card's jade-square separators at platter
  scale: the same mark at both ends says "these are one document."
- Between the two runs pure negative space. The record is never overdrawn;
  the card face is never touched (overshoot dies behind the depth mask).
- The index ring frames the disc like a printed platter graticule — it
  says "this object is being read" without emitting light.

## 5. Theme & accessibility states

| State | Behavior |
|---|---|
| Light theme | Deep-jade table above; no additive/white clamp problem by construction. |
| Dark theme | Lighter material jade; signal jade only on the two foot squares. |
| `prefers-reduced-motion` | No draw-on: tether, ring, and squares appear at final opacity in the same frame the card reaches its static-ready state (single ≤ 200 ms opacity step permitted, no scale animation). Reverse likewise. |
| Reduced transparency (`data-a11y-reduced-transparency`) | All opacities → 1.0; colors clamp to `#3A5A3E` (light) / `#7A9A7E` (dark). Hairline area is tiny, so full opacity stays quiet. |
| High contrast (`data-a11y-high-contrast`) | Hairlines and squares render neutral structural: ink `#14110F` (light) / cream `#F0EBE1` (dark) @ 1.0; ring hidden. Tether becomes a rule, not an accent. |
| `forced-colors` (takes precedence) | Tether, squares, and ring **hidden entirely** — they are decorative connective tissue; the card and the semantic DOM alternative carry all meaning (same precedent as grain/vignette removal). |

## 6. Performance budget (hard)

- **Draw calls:** ≤ 3 while deck active (ring, hairlines, squares); 0 when
  idle (`visible = false`). Current system uses 2, but drops a
  ShaderMaterial — net wins below dominate.
- **Geometry:** ≤ 160 triangles + 2 line segments total (current cone alone
  is ≈ 2,300 tris at 48×24 segments).
- **Materials:** ≤ 3, all `LineBasicMaterial`/`MeshBasicMaterial`. **Zero
  `ShaderMaterial`** — one fewer program compile at deck init.
- **Textures:** zero. The 128² glow `CanvasTexture` is deleted (−64 KB GPU).
- **Per-frame when active:** one quaternion copy (yaw follow) + the
  existing `beamT` lerp. No uniform writes, no `needsUpdate`, no canvas
  repaints, no allocations.
- **Per-frame when idle:** zero work.

## 7. Acceptance criteria (measurable)

Sampling regions come from `__getCockpitAnchors` / `__getCockpitDeckInfo`
projections; counters via dev-only `__COCKPIT_TEST_HOOKS__` (additive only —
never the runtime bridge).

1. **Record legibility (dark):** with deck settled, mean luminance of the
   disc crop differs from the same crop with the tether hidden by
   ΔL\* < 3. (Today the fog raises it dramatically.)
2. **No clipped whites (dark):** in the platter→card gap crop, max channel
   value ≤ 240 and jade-tinted pixels cover ≤ 3% of the crop area.
3. **Alignment:** at both card-bob extremes, a pixel column at each
   hairline's screen x is continuous (no gap > 1 px) from platter to card
   bottom edge.
4. **Draw calls:** tether system contributes ≤ 3 calls (renderer.info delta,
   deck active vs idle) and 0 when idle.
5. **Theme fidelity:** sampled hairline color within ΔE < 5 of the spec
   token in each theme.
6. **Quiet at rest:** two settled-frame captures 2 s apart differ only
   inside the disc (rotation) and card-bob regions — zero pixel change on
   the tether/ring.
7. **Reduced motion:** after `__cockpitDeck.play()`, tether is at final
   opacity in the same frame the card is, and `reportDeckTransient` clears
   with no easing tail attributable to the tether.
8. **Forced colors:** gap crop contains zero saturated (chromatic) pixels.
9. **No regressions:** existing deck e2e specs pass unchanged;
   `__getCockpitDeckInfo` shape and all `__cockpit*` bridge members
   unchanged; card canvas byte-identical for a given project/theme/hover.

## 8. Screenshot matrix for Codex / Kimi verification

Viewports: **1440×900 @ DPR 2** (primary) and **1280×800 @ DPR 1**
(hairline-weight check — this capture decides the line-vs-quad fallback).

Per viewport, dark **and** light theme:
- Full frame, deck settled (record playing, card up).
- Crop: platter + disc (legibility, criteria 1–2, ring placement).
- Crop: card bottom edge + tether tops at both bob extremes (criterion 3).
- Mid-rise frame ≈ 50% of the tether draw-on (slow via test-hook dt scaling
  or extract from a recorded video; `__warpTimeScale` does not cover the
  deck).
- Swap sequence (crate-select next record): eject → re-rise, confirming the
  mask-arming rule shows no card-shaped hole.

A11y runs (dark theme, primary viewport): `prefers-reduced-motion`
emulation, reduced-transparency state, high-contrast state,
`forced-colors: active` emulation — one settled full frame each.

## 9. Out of scope

Phase 6 deck-HUD overlap; any animation-performance optimization beyond
this visual swap (separate behavior-preserving engineering commit); card
content; state-machine timing changes.
