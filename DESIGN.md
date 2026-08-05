# DESIGN.md — Editorial Cockpit Design Guide

The visual and interaction reference for every page, view, overlay, and
rendered artifact in this portfolio.

**Editorial Cockpit** is a personal workstation imagined in 2050 through the
industrial language of late-1990s translucent electronics. Its cockpit is a
softly photographed desk of familiar, dreamlike artifacts. Its project pages
are the accessible editorial catalogue that explains what those artifacts
contain.

The two experiences share one world, but they do different jobs:

| Cockpit — the workstation | Project routes — the catalogue |
|---|---|
| Interactive 3D artifacts | Direct, semantic case studies |
| Studio-lit atmosphere | Editorial product documentation |
| Hazy acrylic and visible internals | Opaque, highly readable text surfaces |
| Terminal and camera operation | Familiar headings and navigation |
| Quiet fictional details | Explicit portfolio language |
| Discovery and spatial memory | Complete canonical content |

Do not force every surface to look simultaneously like a terminal, a product
advertisement, and a book. The 3D world is the machine. The project routes
are the catalogue.

Token sources remain
[app/globals.css](app/globals.css) (`:root` variables) and
[components/cockpit/materials.ts](components/cockpit/materials.ts)
(`PALETTE`). Exact object transforms and runtime dial-ins remain in code; this
guide owns their visual hierarchy and intended relationships.

---

## 1. North star

The portfolio should feel:

- **personal** — a workstation owned and used by Alex, not an anonymous
  spaceship or corporate control room;
- **archival and friendly** — preserved equipment that invites inspection,
  never hostile machinery;
- **late-1990s by way of 2050** — translucent consumer electronics reimagined
  with contemporary speculative rendering;
- **photographed, not merely rendered** — composed through light, material,
  atmosphere, and a studio background;
- **dreamlike but plausible** — familiar product forms with restrained
  exaggeration, not literal replicas or physically impossible spectacle;
- **clear before clever** — interaction and content remain recognizably
  portfolio-based.

The strongest reference qualities are:

1. milky translucent shells with muted jade transmission;
2. selectively visible circuitry and fasteners;
3. consistent studio-product lighting;
4. technical labeling integrated into objects;
5. calm editorial framing around the work.

## 2. Non-negotiable design laws

1. **Cream, ink, mauve, and jade.** Jade is the only chromatic family. Never
   introduce red, blue, orange, or yellow as an interface or material accent.
2. **DOM geometry is hard-cornered.** `--radius: 0` remains the interface
   rule. Physical objects may and should use believable molded radii, bevels,
   seams, and softened polycarbonate edges.
3. **The cockpit is quiet at rest.** Interaction reveals focus; it does not
   compete with the objects through persistent glow, labels, or motion.
4. **The catalogue is explicit.** Project pages use recognizable navigation
   and section names. Vinyl references influence composition and material,
   never information clarity.
5. **Fiction stays peripheral.** Model numbers, firmware, and terminal
   language may reward attention, but primary navigation and portfolio actions
   say what they do.
6. **Accessibility outranks atmosphere.** System preferences, visible focus,
   contrast, text sizing, reduced transparency, and reduced motion always win.
7. **The DOM owns meaning.** The cockpit presents canonical project/profile
   records; it never becomes the sole source of a fact or action.
8. **No cyberpunk.** No neon color soup, tactical HUD clutter, constant
   glitches, hostile darkness, or decorative diagnostics without purpose.
9. **No luxury editorial.** Avoid fashion-brand preciousness, ornamental
   minimalism, and typography so delicate that the work feels untouchable.
10. **No portfolio gimmick.** The experience may be memorable without
    becoming unreadable, exhausting, or dependent on mastering an experiment.

## 3. Palette and color hierarchy

Use CSS variables in `globals.css`, never component-local hex values. Theme
inversion and accessibility states depend on the token system.

Phase 2 document routes use the bounded `--doc-*` surface tier from
`globals.css`. It draws only from this palette, follows
`data-appearance="light|dark"` plus system fallbacks, and stays independent
from the cockpit-only `data-theme` inversion. This is one palette with two
presentation contexts, not a second design system.

| Family | Role |
|---|---|
| `--cream` / `--cream-deep` / `--cream-warm` | Polycarbonate, paper, primary light-theme fields, dark-theme foreground |
| `--ink` / `--ink-soft` / `--ink-faint` | Dark housings, dark-theme stage, primary and secondary text |
| `--fog` / `--mist` | Diffusion, secondary shells, quiet rules, studio atmosphere |
| `--mauve-deep` / `--mauve` / `--mauve-light` | Cool neutral depth, shadowed atmosphere, inactive structure |
| `--jade` / `--jade-deep` / `--jade-light` | Material tint, circuitry, active state, focus, CTA |

### 60 / 30 / 10

Treat the split as a hierarchy of visual energy, not a literal pixel count:

- **60% foundation** — cream, ink, fog, and mauve establish the scene;
- **30% material jade** — muted tinted acrylic, circuitry, printed details,
  reflections, and transmitted edge light;
- **10% signal jade** — the most vivid jade, reserved for CTAs, focus, active
  controls, and important indicators.

Signal jade may occupy far less than 10% of the screen. Its job is to carry
the final 10% of emphasis. Do not turn 40% of the viewport into saturated
green.

Additional rules:

- Jade is a material as well as an interface accent.
- Bright jade must indicate more than color alone through text, position,
  shape, focus, or state.
- When a vivid jade fill is used, choose ink or cream text by measured
  contrast rather than habit.
- Dark mode uses ink/mauve depth with cream objects and jade transmission.
- Light mode uses cream/fog atmosphere with ink structure and the same jade
  hierarchy.
- Boot and warp retain their authored-dark identity subject to accessibility
  overrides.

## 4. Typography

The approved direction is an editorial serif paired with an industrial
grotesque and a true mono:

- **Newsreader** — owner identity, project titles, major editorial headings,
  and restrained italic captions;
- **IBM Plex Sans** — body copy, navigation, controls, explanations, and
  accessible reading;
- **IBM Plex Sans Condensed** — compact product labels, metadata groups, and
  technical captions;
- **IBM Plex Mono** — model numbers, timestamps, object inscriptions, terminal
  output, and diagnostic detail;
- **VT323** — boot/CRT flavor only, never ordinary portfolio content.

This is the target system. Migrating the currently loaded runtime fonts is a
separate rendered-UI task and must be implemented and validated as one
coherent change; do not leave old and new families mixed indefinitely.

### Typographic roles

| Role | Treatment | Example |
|---|---|---|
| Owner identity | Newsreader Display, light/regular, large | `Alex Xiong` |
| Professional role | IBM Plex Sans, medium, stable | `Creative Technologist` |
| Project title | Newsreader Display, regular/medium | `Song of Maka` |
| Project body | IBM Plex Sans, 17–19px target, `1.55–1.7` line height, `60–72ch` measure | Problem, process, contribution, outcome |
| Section heading | IBM Plex Sans or Sans Condensed, semibold | `RESEARCH`, `CONTRIBUTIONS`, `OUTCOMES` |
| Project metadata | IBM Plex Mono, 12–14px | `PROJECT 01 · 2025 · COMPLETED` |
| Navigation and actions | IBM Plex Sans, 14–16px, medium | `View project`, `All projects`, `Contact` |
| Object inscription | IBM Plex Sans Condensed or Mono | `AX-01`, serial and control labels |
| Object screen | IBM Plex Mono; VT323 only where the screen is explicitly CRT-like | Playback information, AX/OS output |
| Editorial caption | Newsreader italic, readable secondary size | Explanation beneath an image |
| Decorative micrograph | IBM Plex Mono, may be smaller when nonessential | Registration marks and circuit labels |

Rules:

- Large identity and project titles may use extreme scale contrast, but
  readable content must retain a normal middle register.
- Never set project body copy in 9–11px mono.
- Wide-tracked uppercase belongs to metadata and product labeling, not every
  control or sentence.
- Important instructions use ordinary letter spacing and direct wording.
- Serif italic is an editorial voice, not a universal subtitle treatment.
- Use middots for compact metadata groups. Slashes remain valid inside actual
  model/system names such as `AX/OS` and `A.X / STUDIO`.
- The landing identity reads its name and role from
  `lib/portfolio/profile.ts`; never hard-code either in a client-only
  component. The chosen role wording is **Creative Technologist**; the owner
  approved the canonical amendment and recorded its content hash on
  2026-07-28. Future wording changes use the same owner-controlled workflow.
- The role may type on once, then remains stable. It does not delete and loop
  indefinitely. Reduced motion renders it immediately.

## 5. Cockpit composition

The visitor is sitting at Alex's personal workstation. The view is spatial
and interactive, but it remains recognizably a portfolio landing page.

- The desk and artifacts occupy the lower compositional field.
- Owner identity has a distinct, readable landing-page region and does not
  masquerade as object labeling.
- The center remains calm enough for camera movement and object recognition.
- Stage chrome belongs at the perimeter; subject-attached controls follow
  projected geometry.
- At most three large masses compete for first reading: the crate, turntable,
  and AX-01 workstation.
- Coffee and personal artifacts enrich the scene without creating a second
  row of heroes.
- Peripheral objects may fall outside the camera crop as aspect ratio changes;
  they may not be independently rescaled or rearranged per viewport.
- The scene should still read correctly if decorative props fail to load.

The cockpit may use model codes and quiet system details, but visible primary
navigation remains literal: projects, about/recruiter information, contact,
accessibility, theme, and return.

## 6. 3D physical scale and narrative hierarchy

Physical size, narrative importance, interaction priority, and screen
coverage are different axes. The physically largest artifact does not
automatically become the portfolio's primary hero.

Use a 12-inch vinyl record as the world-scale anchor. Objects should feel
plausibly related to that record and to one another. A restrained
approximately 10–15% heroic exaggeration is allowed for the AX-01, crate, and
turntable to preserve the dreamlike concept-render quality.

The ratios below describe **perceived mass relative to one project hero**,
not viewport percentages or literal Three.js `scale` values:

| Artifact | Physical scale | Narrative tier | Visual treatment |
|---|---:|---|---|
| Vinyl crate | `1.0` hero reference | Primary | Project-bearing hero; layered sleeves, used surfaces, clear interaction |
| A.X / STUDIO turntable | `1.0–1.1` | Primary | Project-bearing hero; precise mechanics, gently aged finish |
| AX-01 PC + keyboard + mouse | `1.15–1.35` silhouette | Secondary workstation anchor | May be physically largest and partly edge-framed; protected visual benchmark |
| Pour-over + mug | `0.3–0.45` | Ambient interactive | Pristine ritual object; quiet contrast and no project-level emphasis |
| Drawing tablet | `0.45–0.6`, low profile | Personal artifact | Broad but visually flat; must not read as a fourth hero |
| Saxophone | `0.3–0.45`, vertical | Personal artifact | Narrow silhouette and restrained reflectance |
| Plant, handheld, shaker | `0.15–0.3` each | Personal/decorative | Small identity cues; limited detail and interaction emphasis |

Exact transforms remain in `TWEAK_DEFAULTS` and the model modules. Do not copy
runtime scale numbers into this guide as a second source of truth.

### Hierarchy laws

- Crate and turntable are the project-discovery heroes.
- AX-01 establishes the personal-workstation fiction and is the protected
  modeling/material benchmark. Future work may improve its lighting and
  material response but must not casually redesign its form language.
- A focused view may make one artifact temporarily dominant through camera,
  lighting, and attached UI; it may not resize the artifact.
- Responsive behavior changes camera aspect, distance, target, crop, and
  negative space. Model geometry and authored relative transforms remain
  invariant.
- Detail density descends with hierarchy. Heroes receive internals, seams,
  fasteners, decals, and material layering; small props receive only what
  they need to read.
- Hover treatment cannot promote an ambient object above a project hero.
- Do not add new desk objects merely to fill negative space. New objects need
  a narrative purpose, a hierarchy tier, and a density review.

## 7. Material and aging language

The world is translucent but not uniformly transparent.

- **Hero glass** reveals an authored layer of the object, not the entire scene
  behind it.
- **Milky polycarbonate** diffuses silhouettes and transmitted jade while
  preserving the object's mass.
- **Opaque cream liners** prevent glass objects from reading as empty shells.
- **Visible internals** are primary visual texture; they need not simulate a
  complete functional circuit.
- **Printed details** use lit materials. Unlit accent planes that glow like
  light bars are forbidden for ordinary ink.
- **Hazy acrylic** may carry mild bloom, diffusion, edge wear, and imperfect
  refraction.
- Avoid glass-on-glass stacks that collapse into visual noise or rendering
  artifacts.

Condition is object-specific:

| Object | Condition |
|---|---|
| AX-01 | Archival, friendly, personally familiar; current form is the benchmark |
| Turntable | Gently aged, carefully maintained |
| Vinyl crate and sleeves | Clearly handled and personally used |
| Coffee equipment | Pristine and deliberate |
| Personal artifacts | Selective wear appropriate to use, never universal grime |

Permitted imperfections include subtle scratches, softened printing, mild
edge haze, fingerprints visible only in highlights, and gentle display aging.
Avoid heavy dirt, horror decay, distressed overlays, or nostalgia applied as
a uniform filter.

### External material reference boundary

[Modal's landing-page cube](https://modal.com/) is an approved **quality
reference for its translucent shell texture only**, not a style, lighting, or
motion source. Study only:

- the local opacity, roughness, and density variation that makes the shell
  appear layered instead of uniformly transparent;
- the way the surface texture preserves readable depth across broad faces and
  rounded edges;
- the balance between milky diffusion and selectively visible material behind
  the shell.

Translate those qualities into this portfolio's own material system. Do not
copy Modal's cube geometry, texture artwork, source assets, black-void
composition, neon-lime palette, cyan/yellow color separation, lighting,
post-processing, animation, particle field, layout, or brand presentation.
Any new shell texture must be original or procedurally generated for this
project. Lighting and motion continue to follow this guide independently and
take no direction from the Modal website.

The result must still read as Alex's cream/ink/mauve/jade personal
workstation: milky polycarbonate, opaque cream liners, selectively visible
internals, restrained jade transmission, believable wear, and physical
grounding. Reference similarity is successful when the shell gains comparable
textural depth—not when the cockpit begins to resemble Modal's landing page.

## 8. Studio lighting and scene background

Every cockpit view belongs to one consistent virtual product-photography
studio. Interaction moves the camera through that studio; it does not switch
to unrelated lighting setups per object.

### Lighting roles

1. **Large soft key** — broad cream light from above/front-side establishes
   form without hard commercial gloss.
2. **Low frontal fill** — preserves circuitry and labels inside translucent
   shells.
3. **Jade transmission/rim** — a controlled rear or side contribution catches
   acrylic edges and internal material. It is not a neon outline.
4. **Ambient studio field** — mauve/ink depth in dark mode and cream/fog depth
   in light mode.
5. **Physical grounding** — soft contact shadows and ambient occlusion connect
   objects to the desk.

The DOM rule against drop shadows remains. Physically generated 3D shadows
are part of the photographed world and are encouraged when soft and
plausible.

### Background

- Replace flat scene colors with slow, broad studio gradients or a curved
  seamless-backdrop impression.
- Gradients use palette tokens only; they do not introduce a second accent.
- Dark mode should retain visible atmospheric separation between ink,
  mauve, cream objects, and jade transmission.
- Light mode should not wash cream objects into the background; edge
  separation and contact grounding remain visible.
- Grain and vignette are restrained finishing tools, not mandatory proof of
  style. Reduced transparency, high contrast, and forced colors may remove
  or replace them.
- Exposure, tone mapping, and color balance remain consistent across cockpit,
  crate, deck, and monitor camera views.

The desired result is a scene that looks photographed from every interactive
angle, not a single hero render that falls apart when the camera moves.

## 9. Interaction and motion

Interaction should feel like operating a terminal and moving a camera around
a physical desk.

- Free-look remains bounded and quiet.
- Default camera and objects are still; only purposeful machinery moves.
- Hover/focus uses a light-jade wireframe trace and a concise name tag.
- Focused transitions reveal the artifact rather than performing spectacle.
- Physical controls should feel pressed, lifted, opened, or moved—not merely
  recolored.
- The role text types once and settles. It never becomes a perpetual loading
  indicator.
- Glitch belongs to boot/warp transitions only, remains brief, and never
  flashes continuously.
- No bounce, overshoot, elastic easing, gratuitous parallax, or idle bobbing
  that makes the desk feel weightless.

`prefers-reduced-motion` and the explicit reduced-motion setting disable boot
timelines, warp, free-look parallax, inertia, and nonessential object
animation while preserving immediate state changes and explicit panning.

Never animate `transform` on an element whose position also depends on a
translate. Use the established wrapper split: the outer element owns
position/transform; the inner element owns entrance animation.

## 10. Project catalogue and case-study pages

Project routes are first-class portfolio pages, not a fallback and not a
flattened imitation of the cockpit.

They should feel like an archival product catalogue with vinyl-related
art direction:

- sleeve-like hero imagery and square media crops;
- liner-note captions;
- catalogue numbers and technical metadata;
- groove, label, spindle, track, and registration micrographics;
- sequential previous/next project rhythm;
- cream/ink/mauve fields with material jade and signal jade;
- generous negative space and one clear reading column.

The vinyl language is visual, not semantic. Use explicit headings such as:

- `Overview`
- `Problem`
- `Role`
- `Contributions`
- `Process`
- `Outcomes`
- `Tools and skills`
- `Next project`

Do not replace these with `SIDE A`, `TRACK 01`, or other metaphors as the sole
label. A decorative track number may accompany the real heading.

Catalogue rules:

- Body copy sits on opaque or sufficiently solid surfaces; never place long
  reading text directly over busy glass or 3D imagery.
- Navigation uses ordinary links and buttons with descriptive names.
- The page may be editorially composed without forcing a single viewport or
  hiding overflow.
- Light and dark themes are both fully authored and honor the persisted theme
  choice.
- Reduced transparency replaces glass/blur framing with opaque equivalents
  without weakening hierarchy.
- Project pages remain complete without JavaScript, WebGL, animation, or the
  cockpit.

## 11. Components and interface chrome

### Actions

- Primary actions use direct labels and may use signal-jade fill when contrast
  passes.
- Secondary actions use transparent or neutral fills with tokenized borders.
- All buttons remain hard-cornered and meet the shared hit-area policy.
- Active/hover color is paired with border, weight, text, or motion-safe state
  change.

### Chips and metadata

- Use compact rectilinear groups for state, category, date, and model
  information.
- A jade square or rule may punctuate a state, but never becomes the only
  state indicator.
- Avoid rounded status pills and excessive glass chips.

### Dialogs and panels

- AX/OS and object-screen panels may retain terminal anatomy.
- Ordinary project forms and accessibility settings use clear web semantics,
  labels, help text, error text, and predictable control placement.
- Status and recovery notices use the standard panel anatomy: plain factual
  wording, palette-only treatment with jade reserved for the action, no alarm
  color, no decorative animation, and always a visible canonical route out.
- Reduced transparency produces opaque backing.
- Do not apply fictional headers to every modal.

### Subject-attached UI

- Name tags, brackets, browse arrows, and info cards attach to projected
  subject geometry.
- Stage chrome—identity, global navigation, accessibility, theme, and
  return—attaches to the stage.
- Subject UI is additive on hover/focus and has keyboard/click parity.

### Focus and selection

- Global focus remains visible and tokenized; never remove it.
- Focus must not be obscured by the cockpit crop, stage controls, or a
  translucent panel.
- Selection may invert ink and cream when contrast remains valid.

## 12. Voice and microcopy

The dominant voice is Alex's portfolio, not a fictional operating system.

- Navigation says `Projects`, `About`, `Contact`, `Accessibility`, and
  `Theme`. `/recruiter` is a legacy redirect to `/about`, not a navigation
  label.
- Project actions say `View project`, `Previous project`, and `Next project`.
- System language is quietly discoverable in boot, model codes, object
  screens, and technical annotations.
- Use `AX/OS`, `AX-01`, firmware strings, coordinates, and timestamps as
  texture—not as substitutes for explanation.
- Avoid generic sci-fi phrases, tactical jargon, excessive brackets, and
  fake warnings.
- Serif captions are humane and brief; body copy is plain, specific, and
  factual.

Canonical project/profile facts live only in
`lib/projects/catalog.ts` and `lib/portfolio/profile.ts`. Do not invent,
paraphrase beyond approval, or store a fact solely in JSX, canvas, a decal,
hover state, or a client-only module.

## 13. Responsive and accessibility contract

Technical source of truth:
[docs/responsive-system.md](docs/responsive-system.md). Where this guide and
the technical contract differ, the technical contract wins.

### Invariant versus adaptive

3D geometry, authored relative transforms, materials, and hero hierarchy are
fixed. The following may adapt:

- camera aspect, distance, and look target;
- visible negative space and peripheral scenery;
- stage-chrome position and proportional scale;
- projected subject-attached UI;
- ordinary document reflow.

Never resize, deform, or independently rearrange models in response to
resolution. Letterboxing is not the default.

### Responsive tiers

| Tier | Viewport | Behavior |
|---|---|---|
| Normal | `1024×600` through `3440×1536` | Dynamic 3D framing; HUD repositions/scales within its contract |
| Zoom/narrow | Below either normal threshold | Ordinary content reflows; cockpit becomes a contained pannable region |
| Reflow floor | Down to `320px` content width | Non-exempt content remains readable in one primary scroll direction |
| Large | Above the normal maximum | Cap designed scale and center with negative space or ambient background |

At 200% browser zoom, content magnifies. Never counter-scale to cancel zoom.

### Layout law

If a DOM element describes or controls a 3D subject, it anchors to that
subject's projected geometry. If it is application chrome, it anchors to the
stage. CSS pixel constants are legal only for gaps, padding, and minimum hit
areas—not unrelated subject positions.

### Accessibility baseline

WCAG 2.2 AA is always on:

- semantic landmarks and complete keyboard operation;
- visible, unobscured focus;
- no color-only information;
- hover duplicated by focus/activation;
- at least `24×24` targets under the WCAG spacing rule, with `44×44`
  preferred for this portfolio;
- complete content without WebGL;
- system behavior and explicit states for reduced motion, high contrast,
  reduced transparency, large text, and large controls;
- `forced-colors` and system preferences win over authored styling.

Boot and warp keep their authored-dark identity, but they do not override
motion, contrast, transparency, text, control-size, or forced-color needs.

### Canonical content and degradation

The visible semantic DOM is the portfolio record. Required project/profile
information must be server-rendered and understandable without JavaScript,
WebGL, hover, or cockpit navigation.

- Tier 1, JavaScript disabled: semantic content and ordinary links remain.
- Tier 2, JavaScript enabled and WebGL disabled: meaningful interactive DOM
  alternatives remain.
- Tier 3: full cockpit.

Every route/view declares the required `LayoutContract`; content-bearing
routes additionally declare a `ContentContract`. Rendered roots carry the
matching `data-hud`, `data-layout-region`, `data-layout-contract`, and
`data-content-contract` identifiers.

## 14. Phase discipline

The implementation sequence in
[docs/hud-responsive-layout-plan.md](docs/hud-responsive-layout-plan.md)
remains authoritative.

- Do not implement later phases ad hoc.
- Do not stopgap the known deck HUD overlap before Phase 6.
- Typography migration, lighting implementation, scene-background work, and
  identity animation are rendered changes: schedule them deliberately,
  update applicable contracts, and run the full gates.
- Preserve the documented `window.__cockpit*` bridge.
- Test instrumentation stays additive and development-only through
  `__COCKPIT_TEST_HOOKS__`.
- Three.js remains imperative. Do not introduce React Three Fiber, WebGPU, or
  TSL.

## 15. Completion checklist

### Any rendered page, view, component, or scene

- [ ] Reads as part of the 2050 personal workstation / archival catalogue
- [ ] Does not drift into cyberpunk, luxury editorial, or experimental-art
      illegibility
- [ ] Uses the approved palette hierarchy and no second chromatic family
- [ ] Honors light/dark plus all accessibility states
- [ ] Uses the approved typographic role rather than generic mono everywhere
- [ ] Keeps DOM geometry square while allowing believable physical radii
- [ ] Preserves the physical-scale and narrative hierarchy
- [ ] Keeps essential facts/actions in the canonical semantic path
- [ ] Respects reduced motion and the transform-wrapper rule
- [ ] Uses stage versus subject attachment correctly

### New or changed route/view

- [ ] `LayoutContract` declared and registered
- [ ] `ContentContract` declared when content-bearing
- [ ] Matching `data-*` contract and HUD identifiers rendered
- [ ] Ordinary content reflows; protected regions declare an alternative
- [ ] No invented project/profile facts
- [ ] Owner approval obtained before canonical public content changes
- [ ] Both themes and all five accessibility states verified
- [ ] Full gates green:
      `npm run lint` ·
      `npm run typecheck:contracts` ·
      `npm run validate:contracts` ·
      `npm run test:unit` ·
      `npm run test:e2e`
