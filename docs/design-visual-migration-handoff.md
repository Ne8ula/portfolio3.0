# Claude handoff — Editorial Cockpit visual migration

**Prepared:** 2026-07-28  
**Design authority:** [DESIGN.md](../DESIGN.md)  
**Technical authority:** [responsive-system.md](responsive-system.md)  
**Phase authority:** [hud-responsive-layout-plan.md](hud-responsive-layout-plan.md)

> **Status note (2026-08-14, plan revision 8).** The rendered appearance
> migration this handoff describes is now scheduled as **plan §8 Phase 8 —
> appearance and art-direction migration**, after the Phase 6/7 HUD
> re-anchoring and before the enforcement phase (now **Phase 9**,
> renumbered from Phase 8). The §5 gap analysis below remains the
> art-direction content reference feeding the Phase 8 design document. The
> §7 stage sequence, however, predates the Phase 3–5 deliveries and is
> **superseded where it conflicts with the plan**: Stage 5's "studio pass
> before the Phase 4 baselines" placement was overtaken by events — the
> Phase 4 baselines were recorded against the pre-migration scene, and
> baseline governance now lives in plan §8 Phase 8 (immutable Phase 4
> evidence; owner-approved replacement set at Phase 8 exit; Phase 9
> consumes only the replacement set). Stage 7's "migrate remaining HUD
> typography/panels while their geometry owner is active" is likewise
> superseded: Phases 6/7 re-anchor geometry only, and all typography/token
> restyling belongs to Phase 8. Stage 8's "Phase 8 should verify" refers to
> the enforcement phase now numbered Phase 9.

## 1. Mission

Bring the rendered portfolio into conformance with the finalized
`DESIGN.md` without discarding the working cockpit, weakening the responsive
and canonical-content systems delivered in Phases 0/0A/0B, or implementing
later responsive work out of order.

This is a migration of an established application, not a greenfield redesign.
Preserve the procedural three.js scene, its tuned object transforms, the
project/deck interaction, and the documented runtime bridge. Improve the
visual system around and within those foundations.

Do **not** execute this handoff as one large patch. Use the staged sequence in
§7, keep each stage independently reviewable, and run the repository gates
after every rendered change.

## 2. Required reading and authority order

Before changing rendered code, read completely:

1. `DESIGN.md`, especially §§2–11 and §§13–15.
2. `docs/responsive-system.md`.
3. The applicable phase in `docs/hud-responsive-layout-plan.md`.
4. `app/layout-contract.ts` and `lib/responsive/layout-contracts.ts`.
5. `lib/content/content-contracts.ts` for a content-bearing surface.
6. `lib/portfolio/profile.ts` and `lib/projects/catalog.ts` before displaying
   profile or project information.
7. `AGENTS.md` and `CLAUDE.md`.

When instructions differ, use this order:

1. canonical profile/catalog records for public facts;
2. `docs/responsive-system.md` for technical responsive behavior;
3. `docs/hud-responsive-layout-plan.md` for phase ownership;
4. `DESIGN.md` for visual and interaction intent;
5. this handoff for migration sequencing;
6. existing rendered code and the historical prototype.

`docs/cockpit-handoff/HANDOFF.md` and its prototype files are historical
implementation references only. They describe the old font, shadow, weather,
and HUD direction and must not override the current design guide.

## 3. Responsive consistency review

### Conclusion

The finalized design guide is consistent with the responsive system. No
responsive-contract change is required merely to adopt the guide.

The following rules agree across `DESIGN.md`,
`docs/responsive-system.md`, and the registered contracts:

- CSS viewport size—not physical display resolution or zoom detection—selects
  responsive behavior.
- Normal composition covers `1024×600` through `3440×1536`.
- Below either normal threshold, ordinary content reflows and the cockpit
  becomes a contained complex region.
- Content remains readable to a `320px` reflow floor.
- Above the normal maximum, designed scale is capped and extra space becomes
  negative space or ambient background.
- Browser zoom magnifies the experience; the application never
  counter-scales it.
- Model geometry and authored relative transforms remain invariant.
- Camera framing, negative space, stage chrome, and projected HUD may adapt.
- Subject-related DOM follows projected subject geometry; application chrome
  follows the stage.
- The cockpit uses `scale`, `reposition`, and `contain`; ordinary project
  routes may additionally `reflow`.
- WCAG 2.2 AA and forced/system accessibility behavior outrank visual
  atmosphere.
- Essential content and actions have a semantic DOM path independent of
  WebGL and cockpit navigation.

### Resolved boundary: desktop/laptop, not mobile art direction

The `320px` case is a reflow and high-zoom safety floor inside the current
desktop/laptop support profile. It does not authorize a new phone/tablet
cockpit composition. A future mobile presentation remains separate work.

### Resolved canonical-content decision

`DESIGN.md` selects **Creative Technologist** as the target role. The owner
reviewed that exact `PROFILE.targetRole` amendment and recorded the matching
approval hash on 2026-07-28. The role remains canonical in
`lib/portfolio/profile.ts`; it must not be duplicated as a JSX or CSS fact.

An agent must never create or refresh `content/portfolio-approvals.json`;
future public-field amendments repeat the same owner-controlled review and
hash workflow.

## 4. What is already valuable and must be preserved

Phases −1, 0, 0A, and 0B already established:

- strict responsive and content contracts under `lib/`;
- the server-safe six-project catalog and profile;
- blocking catalog completeness and owner-approval hashes;
- the split between canonical project data and client-only texture creation;
- deterministic unit/browser infrastructure and Phase 0 visual references;
- the additive development-only `__COCKPIT_TEST_HOOKS__` bridge;
- the `termFadeIn` wrapper lesson and regression coverage;
- the registered `cockpit-v1` protected 3D region and `/projects`
  alternative;
- the viewport and accessibility-state contract matrix.

The current rendered application also already contains useful design work:

- a mostly aligned cream/ink/mauve/jade palette;
- procedural translucent equipment with cream liners and jade internals;
- the crate and turntable as working project-discovery artifacts;
- AX-01 as the established workstation form and screen-contract benchmark;
- hover-only jade edge traces and subject labels;
- purposeful crate/deck/coffee interactions with a quiet default pose;
- dark and light cockpit themes;
- tuned `TWEAK_DEFAULTS` and stable object relationships.

Preserve all of the following:

- imperative three.js; do not introduce React Three Fiber, WebGPU, or TSL;
- `TWEAK_DEFAULTS` object transforms unless the owner explicitly approves a
  modeling/composition change;
- `window.__cockpit*` names, values, events, and screen-corner contract;
- additive test hooks and their production exclusion;
- project selection, crate-to-deck handoff, deck playback, and return
  behavior;
- current Phase 0 baselines as historical evidence. Never overwrite them
  with the redesigned output.

## 5. Current visual gaps

### 5.1 Typography

Target:

- Newsreader for identity, project titles, editorial headings, and captions;
- IBM Plex Sans for body copy, navigation, controls, and explanations;
- IBM Plex Sans Condensed for compact labels;
- IBM Plex Mono for technical and object text;
- VT323 only for explicit boot/CRT use.

Current state:

- `app/layout.tsx` loads Cormorant Garamond, JetBrains Mono, VT323, and Major
  Mono Display from Google CSS;
- `app/globals.css` aliases ordinary sans text to JetBrains Mono;
- cockpit DOM, SVG, canvas textures, decals, and object screens contain many
  literal Cormorant/JetBrains family declarations;
- ordinary copy is frequently 9–11px uppercase mono.

Required direction:

- migrate font loading and role tokens coherently;
- introduce explicit display, body/UI, condensed-label, technical-mono, and
  terminal tokens rather than treating mono as the universal default;
- keep terminal typography inside boot and genuinely CRT-like screens;
- give readable text a middle register and appropriate line height;
- ensure canvas-rendered text waits for or redraws after fonts become ready;
- verify fallback metrics and layout at every required viewport.

Do not leave an unbounded mixture of old and new families. A staged migration
is acceptable only when its final removal stage and deadline are recorded in
the phase plan.

### 5.2 DOM palette and geometry

Current CSS variables are a useful starting palette, but component-local hex,
RGBA, gradients, and theme branches remain common.

Required direction:

- route DOM colors, panel treatments, focus, borders, and motion through
  shared CSS variables;
- retain cream/ink/mauve as the foundation and use vivid jade only for
  meaningful focus, active state, or primary action;
- remove the red channel from `termRGB`; boot glitches still obey the
  one-chromatic-family law;
- replace multicolor emoji used as visual UI with monochrome text or SVG when
  the control survives the redesign;
- keep every DOM control and panel hard-cornered;
- remove exterior DOM drop shadows and glow shadows;
- permit restrained inset treatment only where it depicts a physical screen
  or pressed control and does not become a generic card shadow.

Known violations include the rounded, shadowed `ThemeToggle`, exterior
shadows in `SiteHeader` and its menu, and several hard-coded ScreenDialog
colors.

### 5.3 Stage chrome and navigation

The current header is visually dense, absolute, and partially fictional:

- primary items update local state rather than navigate;
- `finished · shipped 12` and `in-flight · 04` are not canonical catalog
  counts;
- the header requests visitor geolocation and renders weather in primary
  chrome;
- no always-reachable accessibility trigger exists;
- the global identity/navigation region competes with the scene and does not
  yet reflow.

Required direction:

- prioritize literal `Projects`, `Recruiter overview` or `About`, `Contact`,
  `Accessibility`, and `Theme` actions;
- derive every count or project statement from canonical data, or omit it;
- never present an inert button as navigation;
- do not add temporary links to routes before their owning phase implements
  them;
- treat weather as optional peripheral atmosphere, not primary navigation.
  Prefer removing it from the primary header and do not request geolocation
  automatically. If the owner elects to retain it, make it opt-in,
  nonessential, monochrome, and safely omitted under constrained layouts;
- let Phase 1 own responsive stage chrome and accessibility access;
- let Phase 2 own real semantic routes and initial-HTML navigation.

### 5.4 Accessibility styling

Current global CSS handles only a portion of reduced motion. Grain, vignette,
blur panels, JavaScript boot timelines, theme state, text size, and control
size are not resolved through one provider.

Required direction:

- implement the Phase 1 `AccessibilityProvider` before styling accessibility
  variants independently;
- make high contrast, reduced transparency, large text, and large controls
  token-driven root states;
- remove grain, weak overlays, blur, and decorative interference in the
  appropriate states;
- render reduced-motion boot immediately ready and skip warp;
- keep boot/warp authored-dark while allowing accessibility overrides;
- maintain visible, unobscured focus and preferred `44×44` hit regions;
- test forced colors without relying on the custom settings dialog.

### 5.5 3D scene art direction

The current scene has a flat theme background, sparse starfield, ambient/key/
fill lighting, and a useful material base. It does not yet read consistently
as a photographed product studio.

#### Modal reference: bounded translation

The owner has approved [Modal's landing-page cube](https://modal.com/) as a
reference for **the translucent shell texture/material appearance only**.

Use the reference to understand:

- local texture/opacity variation that makes a shell feel layered instead of
  uniformly transparent;
- roughness and density variation across broad faces and rounded edges;
- the balance between milky diffusion and selectively visible material behind
  the shell.

Do not reproduce:

- Modal's cube geometry, texture artwork, HDR/source assets, particle sprites,
  code, or implementation;
- its black-void composition, neon-lime field, yellow core, cyan edge
  separation, or heavily clipped highlight;
- its lighting rig, post-processing, animation, particles, layout, typography,
  interaction, or any other website behavior;
- its product-brand language anywhere in Alex's portfolio.

Build an original or procedurally generated shell texture for this project.
Retain the cream/ink/mauve/jade palette, photographed studio,
personal-workstation narrative, object hierarchy, opaque cream liners,
quiet-at-rest behavior, and selective jade transmission. Lighting and motion
follow `DESIGN.md` independently and take no direction from Modal. The intended
result is **comparable shell textural depth expressed through Editorial
Cockpit**, not a Modal-like scene.

Required direction:

- replace the cockpit starfield/flat-space impression with a broad
  cream/fog/mauve/ink studio field or curved seamless-backdrop impression;
- retain a restrained soft cream key and frontal fill;
- add controlled jade transmission/rim response without outlining every
  object;
- improve soft physical grounding and contact shadows within a measured GPU
  budget;
- keep exposure, tone mapping, and balance coherent across cockpit, monitor,
  crate, and deck views;
- consolidate 3D color roles through `materials.ts` `PALETTE` and the scene
  theme registry instead of multiplying unrelated color literals;
- keep AX-01’s form language intact;
- preserve authored model scale and relative transforms;
- keep coffee and personal props visually subordinate;
- verify that decoration-load failure does not break the main composition.

For translucent shells, prefer a hybrid implementation:

- retain real transmission/refraction where it materially improves the
  object;
- add original roughness/thickness or opacity modulation instead of one
  uniform glass response;
- place readable cream liners and jade-lit internals behind the shell;
- use a palette-safe PMREM/HDR environment and the shared studio lights;
- apply selective bloom only to controlled luminous internals and transmitted
  edges;
- avoid chromatic aberration that introduces cyan, yellow, red, or blue
  fringes.

Lighting/material work must not silently change camera fit, renderer sizing,
or HUD coordinates. It needs a named visual work item before Phase 4 records
the first deterministic visual scorecard baselines.

### 5.6 Motion

Preserve purposeful physical operation and remove ambient spectacle:

- role text types once and stays visible;
- no looping deletion/retyping;
- no idle camera bob, object bob, bounce, or elastic overshoot;
- glitch stays brief and limited to boot/warp;
- reduced motion removes free-look parallax, inertia, boot timelines, warp,
  and nonessential machinery while preserving immediate state changes;
- never animate `transform` on the element that owns a positioning translate.

Do not “clean up” the existing `termFadeIn` wrapper split by recombining its
responsibilities.

## 6. Source-of-truth and content guardrails

- Public profile and project facts come only from
  `lib/portfolio/profile.ts` and `lib/projects/catalog.ts`.
- The cockpit may use the derived `SLEEVES` presentation adapter but must not
  invent unique facts in texture or canvas code.
- Never infer project metrics, dates, status, ownership, counts, or outcomes.
- Do not turn fictional AX/OS text into primary explanation.
- Do not use hidden, crawler-only, hover-only, canvas-only, or
  JavaScript-only copies of essential content.
- Phase 2, not this visual handoff alone, implements the semantic home,
  project, case-study, and recruiter routes.
- Project routes should be designed directly as the explicit archival
  catalogue described in `DESIGN.md`; do not flatten the cockpit into a
  faux-terminal page.

## 7. Recommended implementation sequence

### Stage 0 — restore a trustworthy Phase 0 gate

Before Phase 1 or rendered work, close the outstanding QA defects:

1. Ensure ESLint actually includes `app/layout-contract.ts` and
   `components/cockpit/test-hooks.ts`; verify with `eslint --print-config`.
2. Reject impossible RFC 3339 dates rather than relying on `Date.parse`
   normalization.
3. Make runtime contract validators return structured issues for malformed
   nested values instead of throwing `TypeError`.
4. Synchronize Phase 0/0A completion facts in the authoritative plan.
5. Run all five gates and obtain a green QA decision.

Do not compensate for a weak gate with manual confidence.

### Stage 1 — Phase 1 responsive/accessibility foundation

Implement Phase 1 as planned:

- shared fluid layout, type, spacing, panel, focus, and control tokens;
- `ResponsivePage`, `ResponsiveStage`, `SafeFrame`, and
  `AccessibleExperienceLink`;
- root `AccessibilityProvider`;
- normal, zoom/narrow, and large tier behavior;
- contained stage behavior without counter-scaling browser zoom;
- accessible persisted settings and system-preference precedence;
- static reduced-motion boot, skipped warp, and boot start gated on an
  operable `ACCESSIBILITY` trigger;
- a cockpit-independent representative page demonstrating all tiers and
  accessibility states.

At this stage, establish target visual tokens but do not broadly restyle the
cockpit or alter subject HUD coordinates.

### Stage 2 — typography and DOM visual foundation

After Phase 1 passes, make one coherent rendered-UI migration:

- load and expose the approved font families;
- migrate global typographic roles;
- convert common DOM color/panel/focus/control treatment to shared tokens;
- remove the red glitch channel, rounded toggle geometry, and exterior DOM
  drop shadows;
- make grain/vignette/panel transparency respond to accessibility state;
- preserve component behavior and the current bridge;
- record any temporary legacy-font boundary and its removal stage.

This stage may make typography-fit corrections, but it must not use new
absolute coordinates to stopgap Phase 6/7 HUD overlap or projection work.

### Stage 3 — Phase 2 routes in the target catalogue language

Build the server-rendered home shell, project index, project details,
recruiter view, metadata, structured data, sitemap, and derivative JSON
exactly as Phase 2 specifies.

Design them in the finalized visual system from their first implementation:

- Newsreader editorial hierarchy;
- IBM Plex Sans readable body;
- IBM Plex Mono metadata;
- explicit headings and ordinary links;
- opaque readable content surfaces;
- vinyl-inspired square media, liner-note captions, registration marks, and
  catalogue rhythm without metaphor replacing semantics;
- authored dark/light and accessibility variants;
- full no-JavaScript content and WebGL-disabled interaction guarantees.

Do not build a legacy-styled route with the intention of restyling it later.

### Stage 4 — Phase 3 renderer sizing

Complete `syncRendererSize`, ResizeObserver/DPR handling, the DPR cap, warp
renderer parity, and context recovery before tuning studio visuals. Visual
evaluation is unreliable while canvas sizing and DPR synchronization are
still unstable.

### Stage 5 — named studio-scene visual pass

*[Superseded — see the status note. This pass did not run before Phase 4;
its scope is now owned by plan §8 Phase 8, and the baseline instruction
below is replaced by Phase 8's baseline governance.]*

Add a reviewed, named work item to the phase plan **after Phase 3 and before
Phase 4 visual baselines**. Its scope is:

- studio background;
- lighting roles and physical grounding;
- palette/material consolidation;
- restrained atmosphere;
- cross-theme and accessibility appearance;
- performance checks.

It must explicitly exclude:

- camera fit and input normalization (Phase 5);
- model-responsive rearrangement;
- deck/crate HUD anchoring (Phases 6/7);
- AX-01 form redesign;
- canonical content changes.

Only after this pass is accepted should Phase 4 record the first
deterministic visual scorecard baselines. Store redesigned baselines in a new
phase-specific directory; keep `docs/baselines/phase-0/` unchanged.

### Stage 6 — Phases 4 and 5 geometry, fit, and input

Implement projection, safe-frame, deterministic capture, 3D fit, and input
normalization from the existing plan. Do not hand-tune screenshots with
per-viewport model transforms.

The visual design should now adapt through:

- camera aspect, distance, and target;
- ambient negative space;
- stage chrome;
- projected HUD;
- contained panning.

### Stage 7 — Phases 6 and 7 HUD migration

Combine visual cleanup with each HUD’s assigned re-anchoring work so it is
not styled against obsolete coordinates:

- Phase 6: deck subject UI and known overlap;
- Phase 7: crate subject UI.

Also migrate remaining cockpit header, tags, browse controls, info cards, and
ScreenDialog typography/panels to the shared target tokens when their
geometry owner is active. *[Superseded — see the status note: Phases 6/7
re-anchor geometry only; this restyling belongs to plan §8 Phase 8.]*
Preserve keyboard/click parity and at least the
preferred hit-area policy.

Do not add interim viewport constants before these phases.

### Stage 8 — enforcement and final review

Phase 9 (enforcement — formerly numbered Phase 8) should verify:

- the complete viewport/browser matrix;
- dark, light, high-contrast, reduced-transparency, large-text,
  large-control, reduced-motion, and forced-color behavior;
- no unapproved chromatic family;
- no rounded DOM panels or exterior DOM drop shadows;
- no essential fact or action unique to canvas/WebGL;
- production exclusion of test hooks;
- nonblank and compositionally valid WebGL output;
- target fonts loaded without old runtime families lingering;
- semantic routes and structured output match canonical records.

## 8. File-oriented migration map

| Area | Existing files | Intended action |
|---|---|---|
| Global tokens/fonts | `app/globals.css`, `app/layout.tsx` | Add approved font roles, fluid/accessibility tokens, remove legacy universal-mono assumptions |
| Root state | `components/cockpit/cockpit-app.tsx`, root layout | Move accessibility ownership above cockpit phases; keep theme separate |
| Intro | `boot-screen.tsx`, `warp-transition.tsx` | Keep authored-dark identity; remove forbidden color; implement preference behavior in Phase 1 |
| Stage chrome | `cockpit-hud.tsx`, `theme-toggle.tsx` | Literal navigation, square controls, tokenized panels, responsive stage attachment |
| Subject HUD | `cockpit-hud.tsx`, later `hud-layout.ts` | Migrate only with projection/re-anchor phases |
| Scene | `globe-canvas.tsx` | Studio field, coherent lighting, grounding; do not combine with renderer/fit work |
| 3D materials | `materials.ts`, object builders | Consolidate palette roles and material response; preserve forms/transforms |
| Object text | `glass-mac.ts`, `turntable.ts`, `vinyl-crate.ts`, texture/decal modules | Move to Plex roles and redraw after fonts load; keep content canonical |
| Routes | Phase 2 `app/**` additions | Build directly in the archival catalogue language |
| Tests/baselines | `tests/**`, `docs/baselines/**` | Keep Phase 0 evidence; add phase-specific deterministic references |

## 9. Validation and review protocol

For each stage:

1. State the exact phase/work item and files in scope.
2. State which properties are invariant and which may adapt.
3. Capture a before image from the existing Phase 0 reference where useful.
4. Implement one bounded change.
5. Test dark and light themes.
6. Test all five accessibility states plus forced colors where applicable.
7. Test at minimum:
   - `1024×600`;
   - `1366×768`;
   - `1440×900`;
   - `2560×1440`;
   - `3440×1440`;
   - `800×450`;
   - `512×300`;
   - `320×568`;
   - `3840×2160`.
8. Check ordinary document scroll separately from contained cockpit panning.
9. Verify no model transform changes with viewport.
10. Run:

```text
npm run lint
npm run typecheck:contracts
npm run validate:contracts
npm run test:unit
npm run test:e2e
```

11. Run `npm run build` for a release-oriented visual stage.
12. Report residual design gaps instead of hiding them with one-off
    coordinates or untracked exceptions.

## 10. Definition of done

The visual migration is complete only when:

- the cockpit reads as a quiet, personal 2050 workstation built through
  late-1990s translucent-electronics language;
- the project routes read as an explicit archival catalogue rather than a
  terminal imitation;
- the approved typography roles are coherent across DOM, SVG, canvas, and
  object screens;
- cream/ink/mauve form the foundation and jade is the only chromatic family;
- DOM geometry is square and exterior DOM drop shadows are absent;
- the studio background, lighting, material transmission, and grounding
  remain coherent from every supported cockpit camera;
- AX-01, crate, turntable, coffee, and props retain their required narrative
  hierarchy;
- responsive adaptation never deforms or independently rearranges models;
- every required action and fact is accessible without WebGL;
- accessibility states visibly and functionally override atmosphere;
- the canonical role and any other changed public facts have owner-approved
  records;
- all required gates and the production build are green.
