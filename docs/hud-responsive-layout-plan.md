# Plan — Site-Wide Responsive System and Resolution-Independent Cockpit

- **Status**: product decisions finalized; revision 7 route amendment and
  enforceability audit applied. Phase −1 is complete **including its
  automated assertion** (delivered with Phase 0 in `e2e/smoke.spec.ts`).
  **Phases 0, 0A, 0B, and 1 are complete** (commits recorded in §8, including
  Phase 1 at `809607c`). Phase 2 is code-complete in the current reviewable
  worktree change and awaits independent QA/merge; its commit hash does not
  exist until that merge. The canonical
  catalog/profile carry owner-approved strict records with blocking
  approval gates. Phases 3–8 have not started.
- **Scope**: site-wide responsive/accessibility foundation, with focused
  cockpit views (`deck`, `crate`, `monitor`) as the first adopter.
- **Normal composition range**: `1024×600` CSS pixels through `3440×1536`,
  including 4:3, 16:10, 16:9, and 21:9 aspect ratios.
- **Zoom/narrow mode**: ordinary content reflows; the 3D cockpit becomes a
  contained, pannable composition with an equivalent DOM experience.
- **Browser target**: current Chrome, Safari, Firefox, and Edge on macOS,
  Windows, Linux, and ChromeOS.
- **Accessibility target**: WCAG 2.2 Level AA.
- **Primary bug**: the deck browse hint overlaps the holographic project card
  on a shorter viewport.

---

## 0. Review verdict

The original diagnosis is directionally correct: object-related DOM HUD is
positioned with viewport constants while the corresponding object is placed
through a 3D camera projection. Those two coordinate systems do not preserve
their relationship as viewport dimensions and aspect ratio change.

The original plan was not yet safe to implement as written. This revision
adds the missing details:

1. **Responsive layout and render resolution are separate systems.** HUD
   geometry is measured in CSS pixels. WebGL backing-buffer resolution is
   measured in device pixels and depends on `devicePixelRatio`.
2. **Projection needs an explicit coordinate contract.** Existing projection
   getters happen to work because the canvas currently begins at viewport
   origin. They should return stage-local CSS coordinates deliberately.
3. **A two-axis camera formula is not sufficient for depth-bearing subjects.**
   The monitor is almost planar and face-on; the crate and deck are not. Their
   fit should be solved from projected 3D framing points.
4. **DOM overlays must be measured.** A chip or info card cannot be placed
   reliably until its rendered width and height are known.
5. **Collision fallbacks must be deterministic.** “Clamp it” is not enough;
   each overlay needs a documented placement order when its preferred side
   has no room.
6. **Projection tracking must not add several unconditional React renders per
   frame.** One animation-frame sampler should serve the focused HUD, with
   semantic state and geometry updates separated.
7. **QA needs stable test entry points and numeric acceptance criteria.**
   Screenshot review remains useful, but it is secondary to geometry checks.

The user-approved product policy is:

- use a **hybrid responsive policy** for zoom and narrow windows;
- use the **fit policy** for 3D models;
- damp hover response near center on smaller viewports without reducing its
  full range, and decrease accumulated pan gain so equal pan requires more
  user input;
- provide an accessible DOM path for every meaningful cockpit action;
- make that DOM path the canonical human-, accessibility-, crawler-, and
  non-interactive-agent-readable portfolio rather than a secondary fallback;
- target WCAG 2.2 AA;
- enforce the system for future human-, Claude-, and Codex-generated work.

This document is the finalized implementation specification. Implementation
status is recorded per phase; completing one phase does not imply that later
requirements have shipped.

### 0.1 Revision 2 amendments

Seven decisions resolved after review, each verified against current code
before being written in:

| # | Amendment | Where | Verified against |
|---|---|---|---|
| 1 | `termFadeIn` reclassified from latent hazard to **live defect**; pre-Phase-0 hotfix added | §2.2.1, §8 Phase −1 | `globals.css` keyframe animates `transform`; 3 of 6 usages also set a positioning transform |
| 2 | `projects.ts` replaced by a catalog/texture split | §A.4.1, §8 Phase 0 & 2 | `projects.ts` imports `three` at module scope |
| 3 | Minimal CI and executable contract validation moved into Phase 0 | §8 Phase 0 | No test runner in `package.json`; `ignoreBuildErrors: true`; all cockpit modules `@ts-nocheck` |
| 4 | Boot defined as **theme-invariant but accessibility-overridable**, with a 5-level precedence order | §A.6.1, §A.6.2 | `boot-screen.tsx` runs rAF + 3 `setInterval` timelines; `cockpit-app.tsx` snapshots `prefers-reduced-motion` with no listener |
| 5 | Reference-sized absolute hover mapping replaced by a **nonlinear full-range** curve | §A.5, §9.4 | Reference divisor would cap edge yaw at ~71% on a 1024-wide stage |
| 6 | `sizeRatio` reserved for accumulated contained-stage panning only | §A.5, §9.4 | — |
| 7 | Browser automation given concrete technique: deterministic test bridge, blank-canvas verification, visual scorecard | §9.6.1–9.6.3, §9.7, Phase 0 | `preserveDrawingBuffer: false` on the main renderer vs `true` on the warp renderer |

Amendment 7 adapts three techniques from
[majidmanzarpour/threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills)
(MIT). The techniques are adopted; the skill set is **not** installed — it
assumes Vite and a game architecture, and its auto-triggering scope would
collide with `enforce-responsive-design` (§A.8).
[dgreenheck/webgpu-claude-skill](https://github.com/dgreenheck/webgpu-claude-skill)
was evaluated and rejected: it is WebGPU/TSL only, while this project is
WebGL throughout (`THREE.WebGLRenderer`, `@pmndrs/vanilla`
`MeshTransmissionMaterial`, hand-written GLSL in the beam and warp shaders).

No stopgap for the reported deck overlap. It is fixed in Phase 6 by the real
solver. Phase −1 is the only pre-foundation work, and it changes entrance
animation only — never a resting position.

### 0.2 Revision 3 consistency corrections

The final document audit resolved six internal inconsistencies:

1. `LayoutContract` now contains the identifiers, protected-region
   alternatives, accessibility declarations, and viewport metadata that the
   Phase 0 validator claims to enforce.
2. Route coverage is checked; a manually maintained registry alone cannot
   prove that every future route declares a contract.
3. Site-wide accessibility state is owned by a root provider rather than
   `CockpitApp`, so boot, cockpit, and `/projects` share one policy.
4. The Phase 5 wording now preserves nonlinear full-range hover and reserves
   reference-sized gain for accumulated pan.
5. The known deck overlap is a named pending acceptance test, not a passing
   baseline expectation.
6. The client-only texture boundary and the actual `termFadeIn` snap
   direction are explicit.

### 0.3 Revision 4 canonical-content amendments

The accessible DOM project path now carries a broader content guarantee:

1. The 3D cockpit is a presentation and navigation layer, never the sole
   source of essential portfolio information.
2. A strict, serializable project/profile source feeds visible semantic HTML,
   the cockpit, route metadata, JSON-LD, and a supplementary JSON
   representation.
3. `/`, `/projects`, `/projects/[slug]`, and `/recruiter` have explicit
   server-rendering, discoverability, and content requirements.
4. `ContentContract` is enforced alongside `LayoutContract`; project-field
   completeness, route coverage, initial HTML, structured-data consistency,
   and JavaScript-disabled access are CI concerns.
5. Claude and Codex must apply the same contract when creating or modifying
   project content, case studies, recruiter-facing content, canvas text, or
   interactive presentation.

This makes the portfolio robust for human recruiters, screen-reader users,
text-only clients, crawlers, and recruiting agents that do not operate the
cockpit. It cannot guarantee that every proprietary recruiter product will
crawl, interpret, rank, or retain the content; the enforceable guarantee is
that complete, coherent content is available through ordinary web
mechanisms without interaction, JavaScript execution, or WebGL.

### 0.4 Revision 5 amendments

Five further techniques adapted from the two evaluated skill repositories,
after reading the remaining skills in each:

| # | Amendment | Where | Source |
|---|---|---|---|
| 8 | WebGL context loss/restore — **verified unhandled today** | §10.1, Phase 3 | `webgpu-claude-skill` `device-loss.md` (concept transfer only) |
| 9 | Dominant-color share replaces background-region occupancy as the 4th scorecard metric | §9.6.3 | `inspect-threejs-canvas.mjs` |
| 10 | Console/page/network error capture as a pass gate, with a reasoned allowlist | §9.6.4, §9.6 step 10 | `threejs-qa-release` |
| 11 | Performance baseline method for the `DPR_CAP` decision | Phase 3 | `threejs-debug-profiler` |
| 12 | Production-gate the development surface as a release blocker | Phase 8 | `threejs-qa-release` |

`threejs-game-ui-designer` was read and **rejected**: its guidance
(viewport-relative units, corner anchoring with safe-area padding, `44px`
targets, test three viewports, check text clipping and cluster overlap) is
already exceeded by §6.2, §7, and §9.1. `threejs-gameplay-systems`,
`threejs-aaa-graphics-builder`, the director, and the three asset generators
are off-target for a non-game.

### 0.5 Revision 6 — contradiction and enforceability resolutions

A full-document audit surfaced five issues plus one clarity gap; owner
decisions resolved all six:

| # | Issue | Resolution | Where |
|---|---|---|---|
| 13 | JS-disabled parity unsatisfiable (settings persistence is JavaScript by definition) | Split into three degradation tiers; persistence is tier 2 | §A.4.3, Phase 2, §9.6 step 7 |
| 14 | Scorecard baseline nondeterministic — 42 lines / 53 `Math.random()` invocations across 7 modules | Seeded named streams in test builds, frozen capture clock, production randomness preserved; baselines deferred to Phase 4 | §9.6.5, Phase 0/4 |
| 15 | `ssr: false` illegal in a Server Component | Exact boundary specified: `app/page.tsx` (server) → `cockpit-entry.tsx` (client, owns the dynamic import) | §A.4.2, Phase 2 |
| 16 | Strict schema demands content no phase authors | Phase 0A (dossier + owner approval, no invented facts) before Phase 0B (blocking enforcement) | §8 |
| 17 | `normalMin`/`normalMax` literal types block a future mobile profile | Named `SUPPORT_PROFILES` registry; `desktop-laptop-v1` sole current profile | §A.7 |
| 18 | `/portfolio.json` purpose omission read as accidental | Explicit exclusion sentence added | §A.7 |

**Phase −1 status: complete** (code by Codex, verified 2026-07-27; commit
`ec521d6`). The entrance-transform assertion was **delivered with Phase 0**:
`e2e/smoke.spec.ts` samples each outer anchor's computed transform at the
start/mid/end of the inner entrance animation in Chromium and requires an
identical matrix, and additionally proves the animation actually ran.
Phase 8 expands this existing assertion across the final browser and
viewport matrix.

### 0.6 Revision 7 — `/recruiter` becomes `/about`

Owner decision D8, approved 2026-07-29, changes only the professional
summary surface's path and label. The complete print-friendly requirement
moves unchanged from `/recruiter` to `/about`; `/recruiter` remains a
permanent redirect. `ContentPurpose` uses `professional-summary`, the
contract id is `content-about-v1`, and all initial navigation says `About`.
No canonical profile/project fact changed as part of this amendment.

---

## A. Finalized site-wide product policy

### A.1 Support contract

The guarantee is not pixel-identical rendering. Font rasterization, WebGL
drivers, browser chrome, scrollbar behavior, and fractional-pixel rounding
vary across platforms. The implementation guarantee is:

> Every supported page preserves its content, hierarchy, visual language,
> protected composition, and available actions within documented tolerances
> across the browser and viewport matrix.

For content-bearing routes, “preserves its content” also means that essential
public identity and project information is present in visible,
server-rendered semantic HTML and remains understandable without JavaScript,
WebGL, hover, or cockpit navigation.

Use CSS viewport dimensions, not advertised monitor resolution. A Chromebook
panel loses some usable height to browser and operating-system chrome, so
`1024×600` is the minimum **content viewport** for the full normal
composition.

Displays larger than the normal range remain functional, but receive no
special 5K art direction. Clamp content scale and line length, preserve the
maximum designed composition, and use centered negative space or additional
scene background rather than enlarging UI indefinitely.

### A.2 Responsive tiers

Do not attempt to detect browser zoom. Desktop zoom and a resized window both
reduce the available CSS viewport, and cross-browser zoom detection is not a
reliable layout contract. Respond to available space:

| Tier | Available CSS viewport | Required behavior |
|---|---|---|
| Normal | at least `1024×600` | Dynamically frame 3D; reposition and proportionally scale DOM layout within design rules |
| Zoom/narrow | below either normal threshold | Reflow ordinary content and navigation; place cockpit in a contained pannable region |
| Reflow floor | down to `320px` content width | Non-exempt content remains readable and operable in one primary scroll direction |
| Large | above `3440×1536` | Keep the designed maximum scale; center or reveal ambient background |

At 200% browser zoom, content must magnify. Do not counter-scale text or UI
to cancel the user's zoom. Layout adaptation is allowed, but content and
functionality may not be clipped or lost.

### A.3 3D fit policy

Do not resize, deform, or independently rearrange the 3D models in response
to resolution. Preserve model geometry, authored relative transforms,
materials, and hero hierarchy.

Responsive framing may change:

- camera aspect;
- camera distance and look target;
- visible negative space;
- the amount of ambient/peripheral scenery;
- projected positions of subject-attached HUD.

Protected hero subjects and interaction targets must remain inside the
per-view safe frame. The point-projection solver in §6 implements this
policy. Letterboxing is not the default; controlled compositional variation
is preferable to bars.

### A.4 Hybrid zoom and canonical content alternative

In zoom/narrow mode:

1. The outer document becomes vertically scrollable.
2. Ordinary text, navigation, project metadata, settings, and dialogs reflow.
3. The cockpit preserves a minimum logical composition inside its own
   bounded region.
4. That region may pan in two dimensions without forcing the entire document
   to use two-dimensional scrolling.
5. A persistent `VIEW PROJECTS` action exposes an equivalent semantic DOM
   catalog without requiring boot, pointer hover, 3D picking, or WebGL.

Implement the catalog as a direct `/projects` route rendered from the same
`PROJECTS` source. It must load without mounting the WebGL cockpit and remain
linkable/bookmarkable; it is a first-class presentation, not visually hidden
screen-reader-only duplication, and **not** a second manually maintained
project list.

“Alternative” describes a different presentation, not secondary content.
The visible semantic DOM is the canonical portfolio record. The cockpit may
select, arrange, animate, and decorate that record, but it may not contain a
project fact, explanation, outcome, or action that is unavailable through an
ordinary document route.

#### A.4.1 Required catalog/texture split

`components/cockpit/projects.ts` currently imports `three` at module scope.
`document` is only touched inside `makeDiscTexture()`, so the module might
technically evaluate server-side today — but importing it would still pull
three.js into the server dependency graph and create a fragile
browser/server boundary. Split it before Phase 2:

| Module | Contents | Forbidden |
|---|---|---|
| `lib/projects/catalog.ts` | Strict `Project` type; the serializable `PROJECTS` array; optional pure helpers such as title normalization | `"use client"`, three.js, `window`, `document`, canvas code, `@ts-nocheck` |
| `lib/portfolio/profile.ts` | Strict serializable owner/recruiter profile used by visible pages and metadata | `"use client"`, browser globals, rendered JSX, `@ts-nocheck` |
| `components/cockpit/project-textures.ts` | `import "client-only"`; the three.js import; `makeDiscTexture()`; canvas/browser artwork generation; an import of the plain catalog | Server components and server-safe domain data |

Consumers become:

```ts
// /projects route
import { PROJECTS } from "@/lib/projects/catalog"

// crate and turntable
import { PROJECTS } from "@/lib/projects/catalog"
import { makeDiscTexture } from "./project-textures"
```

Add an import-boundary lint rule preventing `/projects` and any server
component from importing `three`, `components/cockpit/project-textures`, or
another cockpit runtime module. The `client-only` marker is a second,
build-time boundary if a future server component bypasses the lint rule.

#### A.4.2 Canonical portfolio content contract

The content contract serves five audiences from one source:

1. people using the visual cockpit;
2. people using the semantic routes with a pointer or keyboard;
3. assistive technology;
4. clients that do not execute JavaScript or WebGL;
5. crawlers and automated recruiting systems.

The last audience is not a reason to create hidden, keyword-stuffed, or
bot-specific copy. Concise public HTML that is useful to a human recruiter is
also the most reliable machine-readable representation.

The strict `Project` model must contain enough information to understand a
project without seeing or operating its 3D representation:

```ts
type NonEmptyStrings = readonly [string, ...string[]]

type ProjectLink = {
  label: string
  href: string
  kind: 'case-study' | 'live' | 'source' | 'media'
}

type Project = {
  id: string
  slug: string
  title: string
  category: string
  date: string
  status: 'completed' | 'in-progress' | 'concept'
  tagline: string
  summary: string
  role: string
  problem: string
  contributions: NonEmptyStrings
  outcomes: NonEmptyStrings
  tools: NonEmptyStrings
  skills: NonEmptyStrings
  constraints?: readonly string[]
  team?: string
  links: readonly ProjectLink[]
  cover:
    | { kind: 'image'; src: string; alt: string }
    | { kind: 'generated'; alt: ''; decorative: true }
  visual?: Readonly<Record<string, string | number>>
}
```

`summary` states what the work is and why it matters. `role` and
`contributions` distinguish the owner's work from team output. `problem`
supplies context. `outcomes` may be quantitative or qualitative, but must be
truthful; the implementation must never invent metrics to satisfy the type.
If a project is a concept or has no measured result, its status and outcome
must say so plainly. Canonical titles contain no artwork-specific line
breaks; the texture layer may derive an art title without changing the
record. An image cover's `alt` describes useful visible information rather
than repeating the title. A generated motif may use empty alternative text
only when it is explicitly decorative and contains no unique information.

The serializable profile source must supply the public identity, concise
professional summary, target discipline or role, capabilities, contact
routes, professional profile links, and résumé URL when a résumé is
published. Do not publish private contact data or infer facts that the owner
has not supplied.

Owner approval is a manual decision with an automated stale-content guard.
Store validation-only records in `content/portfolio-approvals.json`:

```ts
type ContentApproval = {
  subjectId: 'profile' | `project:${string}`
  schemaVersion: 1
  approvedContentHash: string
  approvedAt: string // RFC 3339 UTC timestamp
}
```

The hash is SHA-256 over a stable, key-sorted serialization of every public
recruiter-facing field for that profile or project, including links and image
alternatives but excluding presentation-only `visual` tokens. Approval
metadata is not emitted through HTML, JSON-LD, or `/portfolio.json`. CI can
prove that approved content has not changed; it cannot prove that a claim is
true or that a person actually reviewed it.

After Phase 0B, CI rejects a missing approval record, duplicate subject,
unknown project subject, unsupported schema version, or hash mismatch.
Claude, Codex, and automation must never create or refresh an approval record
without explicit owner confirmation for the exact content being hashed. A
content change invalidates the prior hash and remains blocked until the owner
reviews it.

Required delivery surfaces:

| Surface | Initial-response requirement |
|---|---|
| `/` | Server-rendered identity/portfolio summary plus visible ordinary links to `VIEW PROJECTS`, `ABOUT`, and contact; these exist before boot or cockpit hydration |
| `/projects` | Server-rendered complete project index using semantic headings, lists/articles, summaries, roles, outcomes, and normal links |
| `/projects/[slug]` | Server-rendered case study with the full required project fields and a canonical URL |
| `/about` | Server-rendered, print-friendly professional overview: identity, target work, capabilities, selected evidence, project links, contact, and résumé link when available |
| `/portfolio.json` | Supplementary public JSON generated from the same profile/catalog and carrying canonical HTML URLs; it never substitutes for visible HTML |

The current root route mounts a client-only dynamic cockpit. Phase 2 must
replace that page boundary with a Server Component shell that emits the
identity, summary, and ordinary navigation in the initial response, then
mounts the existing client-only cockpit through a child component. Essential
content must not wait for the boot sequence, hydration, a canvas draw,
pointer hover, 3D picking, texture inspection, or modal activation.

The Next.js boundary is exact, not a suggestion. `app/page.tsx` is today a
`"use client"` file whose `dynamic(…, { ssr: false })` call cannot simply
move up — Next.js rejects `ssr: false` inside a Server Component
([Next.js lazy-loading docs](https://nextjs.org/docs/app/guides/lazy-loading)).
The required structure is:

```text
app/page.tsx                          Server Component — identity, summary,
                                      ordinary navigation in initial HTML
components/cockpit/cockpit-entry.tsx  Client Component — owns
                                      dynamic(…, { ssr: false }) and mounts
                                      CockpitApp
```

The `ssr: false` call stays inside the Client Component; the Server
Component imports `cockpit-entry`, never `cockpit-app` directly.

This does not authorize a second visual composition on top of the cockpit.
The server shell should occupy the existing boot/header/navigation roles and
be progressively enhanced by the client experience without duplicate copy or
layout shift. The normal design language remains intact; its essential text
and links simply exist before hydration.

The route implementation must also provide:

- per-route title, description, canonical URL, and social-preview metadata;
- `app/sitemap.ts` entries for the canonical HTML routes;
- `app/robots.ts` that does not accidentally block those routes or their
  required images;
- visible breadcrumb or equivalent navigation on project detail pages;
- a logical heading hierarchy, landmarks, `article` elements, lists,
  definition lists where appropriate, and ordinary anchors with descriptive
  text;
- meaningful text alternatives for informative images and decorative
  classification for ornamental cockpit imagery;
- JSON-LD generated from the same source as the visible HTML: `Person` on the
  public profile/About surface, `ItemList` or `CollectionPage` for the
  catalog, and `CreativeWork` or a more specific truthful type for each
  project;
- structured data that matches the visible page; no facts may exist only in
  JSON-LD.

`/portfolio.json` and any future `llms.txt` are discovery aids only. Neither
is a universal recruiting-agent protocol, and neither counts toward
acceptance unless the corresponding visible server-rendered HTML is
complete. Follow the search-engine principles that JavaScript-independent
HTML is the most dependable delivery path and that structured data must
describe visible content:

- [Google JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [Schema.org `Person`](https://schema.org/Person)
- [Schema.org `CreativeWork`](https://schema.org/CreativeWork)

Do not render a duplicate project corpus off-screen, with `display: none`, or
only in `<noscript>` for crawler consumption. The normal semantic pages are
the public content. `<noscript>` may provide a concise cockpit-unavailable
notice and ordinary route links, but it is not the canonical content store.

The current cockpit stage forcibly resets its scroll position and the global
page uses `overflow: hidden`. Those behaviors may remain in normal mode, but
must be disabled or scoped differently in zoom/narrow mode.

The DOM alternative must provide meaningful action parity:

| Cockpit function | DOM equivalent |
|---|---|
| Enter or skip boot/warp | `SKIP INTRO` / direct content link |
| Browse crate or deck | Semantic project list with previous/next and direct selection |
| Open `VIEW MORE` | Normal project link using the same `PROJECTS` data |
| Enter/exit a focused view | Labeled open/close controls with `Escape` support |
| Use AX/OS dialog | Shared future stub labelled honestly; message sending is not implemented |
| Change theme/accessibility | Always-reachable settings controls |

Parity means the same content or functional outcome, not a literal recreation
of camera motion. If an experience is still a stub (the current AX/OS send
action), record it as unimplemented in both paths rather than inventing a
second fake implementation.

#### A.4.3 Degradation tiers — the split test guarantee

"Works without JavaScript" and "works without WebGL" are different
guarantees, and conflating them makes the contract unsatisfiable: a
preference dialog that persists settings is JavaScript by definition. The
enforceable guarantee is three tiers, each tested separately:

| Tier | Environment | Guarantee |
|---|---|---|
| 1 | JavaScript disabled | Server-rendered content, semantic headings, project/About routes, ordinary links, and **browser/system** accessibility behavior (`prefers-*`, `forced-colors`) remain available |
| 2 | JavaScript enabled, WebGL disabled | All meaningful interactive DOM alternatives function: custom accessibility settings and persistence, theme persistence, dialogs, project controls |
| 3 | JavaScript and WebGL enabled | The full cockpit experience |

Accessibility-settings **persistence is a tier-2 guarantee, not tier-1**. At
tier 1 the user is protected by system preferences, which the site honors
through CSS media queries and sensible defaults; the custom settings dialog
and its trigger are not tier-1 requirements. At tier 2, the hydrated
`ACCESSIBILITY` trigger must become operable before any boot animation or
timed cinematic begins, so a user can change settings before motion starts.
Do not emit an inert settings “control shell” into the no-JavaScript
experience.

Every parity row in the table above belongs to tier 2 unless it is pure
content, in which case it belongs to tier 1. Tests must not assert tier-2
behavior in a tier-1 environment. Each meaningful action must be implemented,
explicitly classified as decorative, or explicitly classified as a shared
future feature; it may not disappear only because WebGL is unavailable.

Purely decorative toy motion does not need a duplicate animation, but it
must not contain unique information or be the only route to meaningful
content.

This hybrid follows the intent of WCAG 2.2
[Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html)
and [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).
The cockpit may be treated as a complex two-dimensional region only when the
equivalent non-3D content outside it still reflows.

### A.5 Input and pan-speed policy

“Cursor movement” covers two separate behaviors and they must not share an
unexamined multiplier:

1. **Free-look/parallax** — pointer movement subtly changes camera yaw/pitch.
2. **Contained-stage panning** — drag, trackpad, wheel, or keyboard movement
   reveals a magnified cockpit region in zoom/narrow mode.

The current free-look divides pointer position by the live stage width and
height, which makes a smaller viewport more sensitive because fewer physical
pixels produce the same normalized motion.

The fix is **not** one shared multiplier. An absolute hover mapping cannot
simultaneously require more physical pixels than the small screen contains
*and* reach the same maximum angle at the screen edge. Applying a
reference-dimension divisor to hover would shorten the signature free-look
envelope — at `1024` wide against a `1440` reference the pointer would reach
only about `71%` of maximum yaw at the edge. That is an undesirable side
effect, not a product requirement. The two behaviors therefore get two
different treatments.

#### Hover free-look — preserve the full range, reshape the curve

Keep the full `±22°` yaw / `±15°` pitch envelope at every normal viewport.
Normalize against the live viewport, then shape the response:

```ts
const normalized = clamp(
  (pointerPosition - viewportCenter) / viewportHalfSize,
  -1,
  1
)

const shaped =
  Math.sign(normalized) * Math.pow(Math.abs(normalized), responseExponent)

const yaw = -shaped * MAX_YAW
```

Raise `responseExponent` on smaller viewports — roughly `1.0` at the
reference size toward `1.5–1.7` at the small end. Because `1 ** exponent`
is still `1`, this yields:

- full yaw and pitch at the stage edge on every viewport;
- less twitchy movement near center;
- more viewport-relative travel to reach medium camera angles;
- an unchanged expressive envelope.

#### Contained-stage panning — reference-dimension gain

`sizeRatio` applies **only** to accumulated drag, trackpad, wheel, and
keyboard-assisted panning. Accumulated input has no reach ceiling, so it can
legitimately demand more movement without losing range:

```ts
const INPUT_REFERENCE = { w: 1440, h: 900 }
const sizeRatio = clamp(
  Math.min(viewport.w / INPUT_REFERENCE.w, viewport.h / INPUT_REFERENCE.h),
  0.45,
  1
)
```

With these initial values, `1024×600` produces a ratio near `0.67`, requiring
about `1.5×` as much accumulated movement for the same pan as the reference
viewport. `512×300` reaches the `0.45` floor and requires about `2.2×`.
Treat those as testable starting behavior, then tune from real trackpad and
mouse trials without changing the direction of the policy.

The two interactions thus have distinct jobs: **hover preserves the
cockpit's expressive free-look; explicit pan becomes slower and more
deliberate on constrained viewports.**

Policy:

- hover parallax normalizes against the live viewport and reaches full
  bounded range at the stage edge on every supported size;
- viewport size changes hover *feel* through `responseExponent`, never
  through reachable range;
- accumulated drag/trackpad/wheel/keyboard pan multiplies normalized deltas
  by `sizeRatio`;
- maximum camera yaw/pitch remains bounded independently of sensitivity;
- tuning values — both `responseExponent` and `sizeRatio` — live in one
  input-policy module and are validated by tests, not selected through OS
  user-agent sniffing.

Wheel input must normalize `WheelEvent.deltaMode`:

- pixel deltas remain pixels;
- line deltas convert through the computed line height;
- page deltas convert through the contained viewport dimension.

Clamp extreme spikes and apply light smoothing consistently. Do not attempt
to identify “Mac trackpad” or “Windows mouse” from the user agent. Provide
pointer drag, trackpad/wheel, arrow-key/WASD, and reset-to-center paths.
Contained panning must not trap normal document scrolling: activate it only
over the cockpit region, expose visible instructions, and allow focus or the
pointer to leave normally.

Reduced-motion mode disables inertial continuation and free-look parallax;
explicit, non-animated panning remains available.

### A.6 Accessibility policy

WCAG 2.2 AA is the baseline, not an optional mode. The following are always
enabled:

- semantic landmarks, headings, buttons, and links;
- complete keyboard operation and logical focus order;
- visible, unobscured focus;
- no keyboard traps;
- accessible names and status announcements;
- no information communicated by color alone;
- hover interactions duplicated by focus/click;
- text alternatives and the equivalent DOM project path;
- controls at least `24×24` CSS pixels or conforming spacing, with `44×44`
  used as this project's preferred target.

Add an `ACCESSIBILITY` button that opens an accessible settings dialog. It is
separate from light/dark theme and offers:

| Setting | Values | Technical effect | User benefit |
|---|---|---|---|
| Motion | System / Full / Reduced | Honors `prefers-reduced-motion`; skips boot/warp, parallax, bob, flights, and inertia when reduced | Reduces vestibular discomfort and distraction |
| Contrast | Standard / High | Stronger token pairs, borders, focus rings, and solid panel backing | Improves legibility for low vision and difficult displays |
| Transparency | Standard / Reduced | Replaces glass/blur UI surfaces with opaque equivalents | Prevents background detail from interfering with text |
| Text | Standard / Large | Increases relative type and line spacing; invokes reflow rather than counter-scaling | Helps low-vision and reading-comfort needs |
| Controls | Standard / Large | Expands hit regions and spacing without requiring oversized glyphs | Helps tremor, motor, and precision limitations |

Use system preferences as defaults, persist explicit overrides locally, and
offer `USE SYSTEM SETTINGS` / `RESET`. The settings dialog itself must be
keyboard-operable, labelled, focus-contained while open, dismissible with
`Escape`, and safe at the reflow floor. It must be reachable from boot,
normal cockpit, and `/projects`, not only after the cinematic. Honor
`forced-colors: active` and supported system contrast preferences without
requiring the user to discover the custom panel.

Reference requirements:

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
- [Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)

#### A.6.1 Precedence, and how it applies to boot and warp

Boot and warp are **not** fully invariant. Their *identity* and
phase-specific palette are invariant; motion, legibility, text, and
operability are not. Resolve conflicts in this fixed order:

1. Browser/OS forced accessibility behavior (e.g. `forced-colors`).
2. Explicit user accessibility preferences.
3. System accessibility preferences.
4. Boot/warp authored theme.
5. Decorative effects.

| Setting | Boot | Warp |
|---|---|---|
| Light/dark theme | Ignored; boot retains authored palette | Ignored; warp retains authored palette |
| Reduced motion | Render an immediate static ready state — no scramble, glitch, typewriter, or timed wait | Skip warp |
| High contrast | Strengthen boot colors, remove weak overlays, preserve terminal art direction | Ensure skip/control visibility; simplify weak effects |
| Reduced transparency | Remove/reduce grain, scanlines, rolling bands, interference | Reduce translucent/glitch effects |
| Large text | Reflow the boot interface | Usually moot — reduced motion skips warp; essential controls still scale |
| Large controls | Enlarge `ENTER`, `SKIP`, `PROJECTS`, `ACCESSIBILITY` hit areas | Enlarge `SKIP` |
| Forced colors | Browser/system wins | Browser/system wins for exposed DOM controls |

So the light/dark toggle stays out of boot, but every accessibility setting
reaches it. The `ACCESSIBILITY` entry point must be reachable *before* the
cinematic, not only after it.

#### A.6.2 Two verified implementation gaps

Both are confirmed in the current code and must be fixed in Phase 1, not
deferred:

**Reduced motion does not reach boot.**
[boot-screen.tsx](../components/cockpit/boot-screen.tsx) drives its
typewriter, cursor blink, and glitch pulse through `requestAnimationFrame`
loops and three `setInterval` timers. The global CSS reduced-motion rule
cannot stop a JavaScript timeline. `reduceMotion` currently only skips the
warp *after* entry. Reduced motion must instead render boot directly in a
static ready state — the timelines must not start.

**Preference state is a one-time snapshot.**
[cockpit-app.tsx](../components/cockpit/cockpit-app.tsx) reads
`prefers-reduced-motion` inside a `useState` initializer with no
`matchMedia` change listener, so toggling the OS setting mid-session has no
effect.

Required shape: accessibility state is owned by a client
`AccessibilityProvider` mounted from the root layout, **above both the route
content and the cockpit phase machine**. `CockpitApp`, `BootScreen`,
`WarpTransition`, `Cockpit`, and `/projects` consume the same resolved
preferences. The provider initializes persisted/system preferences before
the interactive experience renders and subscribes to `matchMedia` changes
rather than taking a one-time snapshot.

Keep light/dark cockpit theme state separate from accessibility state. The
provider may set root data attributes or tokens for contrast, transparency,
text, controls, and motion; boot/warp then preserve their authored palette
subject to the precedence in §A.6.1.

### A.7 Enforcement for future designs

Documentation communicates the system; shared code and CI enforce it.

**Source of truth**

- `DESIGN.md` defines visual invariants, allowed responsive adaptations,
  responsive tiers, accessibility behavior, canonical content behavior, and
  the completion checklist.
- `docs/responsive-system.md` becomes the neutral technical contract once
  implementation begins; this plan supplies its initial layout,
  accessibility, and content-delivery rules.
- `CLAUDE.md` tells Claude that using and validating the responsive and
  canonical-content systems is mandatory.
- A repository `AGENTS.md` gives Codex and other compatible agents the same
  requirement.
- Optional Claude/Codex skills may scaffold compliant designs, but skills do
  not replace tests.

**Shared implementation**

Future pages must compose approved primitives rather than inventing their
own viewport rules:

- `ResponsivePage` — reflow, max width, normal/zoom tier state;
- `ResponsiveStage` — protected composition, fit/contained modes;
- `SafeFrame` / `ProjectedHud` — subject-attached overlays;
- `AccessibleExperienceLink` — DOM alternative entry;
- canonical profile/project selectors plus shared metadata, JSON-LD, and
  public-JSON serializers — multiple presentations without duplicate facts;
- shared fluid type, spacing, input, motion, contrast, and transparency
  tokens.

Every page or composed view declares a small layout contract:

```ts
type AccessibilityState =
  | 'reduced-motion'
  | 'high-contrast'
  | 'reduced-transparency'
  | 'large-text'
  | 'large-controls'

type ProtectedRegion = {
  id: string
  kind: 'three-dimensional' | 'two-dimensional'
  interactive: boolean
  alternative:
    | { kind: 'route'; href: `/${string}` }
    | { kind: 'inline-controls'; regionId: string }
    | { kind: 'description'; labelledBy: string }
    | { kind: 'decorative' }
}

const SUPPORT_PROFILES = {
  'desktop-laptop-v1': {
    normalMin: { w: 1024, h: 600 },
    normalMax: { w: 3440, h: 1536 },
  },
} as const

type SupportProfileId = keyof typeof SUPPORT_PROFILES

type LayoutContract = {
  id: string
  supportProfile: SupportProfileId
  protectedRegions: readonly ProtectedRegion[]
  allowedAdaptations: readonly (
    'scale' | 'reposition' | 'reflow' | 'contain'
  )[]
  accessibility: {
    keyboard: true
    reflow: 'standard' | 'contained-complex-region'
    states: readonly AccessibilityState[]
  }
  viewportCases: readonly {
    id: string
    w: number
    h: number
    tier: 'normal' | 'zoom-narrow' | 'large-smoke'
  }[]
}
```

Dimensions live in a named support profile rather than literal types on
every contract, so today's desktop/laptop range stays mandatory —
`desktop-laptop-v1` is currently the only allowed profile — without baking
the numbers into each contract. A future mobile plan introduces a new
profile deliberately, as a reviewed addition to `SUPPORT_PROFILES`, instead
of mutating a literal type that every existing contract repeats.

For an interactive protected region, validation rejects `description` and
`decorative` alternatives; it must declare a route or equivalent inline
controls. The cockpit contract therefore points to `/projects`. A static
informational graphic may use a description, and a truly decorative region
must be explicitly classified rather than silently omitted.

A registry alone is not coverage. The Phase 0 validation script scans every
`app/**/page.tsx` route and requires a co-located `layout-contract.ts` or a
documented exemption from a small allowlist. The registry imports every
discovered route contract. Composed non-route views register an ID and expose
the same ID through `data-layout-contract`, which browser tests reconcile
against the registry.

Layout behavior and content delivery are related but independently
enforceable. Content-bearing routes also declare:

```ts
type ContentContract = {
  id: string
  route: `/${string}`
  implementation: 'planned-phase-2' | 'implemented'
  purpose:
    | 'entry'
    | 'project-index'
    | 'project-detail'
    | 'recruiter-summary'
  sources: readonly ('profile' | 'project-catalog')[]
  delivery: {
    serverRendered: true
    javascriptIndependent: true
    webglIndependent: true
    visibleSemanticHtml: true
  }
  discoverability: {
    linkedFromInitialHtml: true
    canonicalUrl: true
    sitemap: true
  }
  structuredData: readonly (
    | 'Person'
    | 'CollectionPage'
    | 'ItemList'
    | 'CreativeWork'
    | 'SoftwareApplication'
    | 'WebSite'
  )[]
}
```

`lib/content/content-contract.ts` owns the type and pure validation.
`lib/content/content-contracts.ts` declares the required route contracts.
Dynamic `/projects/[slug]` coverage is checked against every catalog slug,
not treated as one untested wildcard. The JSON representation has its own
schema/consistency tests but is not a replacement route in this contract
because `visibleSemanticHtml: true` is deliberately non-negotiable.

`/portfolio.json` is intentionally excluded from `ContentContract.purpose`
because it is a non-HTML derivative governed by its own schema and
consistency tests. Do not add a JSON purpose unless the contract is
redesigned to support non-visible representations.

Phase 0 may use `planned-phase-2` only for the exact required surfaces in
§A.4.2. That state means the contract is validated but its delivery tests are
named pending work linked to Phase 2; it must never be reported as passing.
Phase 2 changes every required contract to `implemented`, removes the pending
markers, and enables route/initial-response assertions. CI rejects any
`planned-phase-2` value after the Phase 2 completion marker is recorded.

Catalog validation rejects duplicate IDs/slugs, empty required prose,
missing ownership or outcome information, non-serializable values, broken
internal URLs, missing image alternatives, and project links that do not
match a documented kind. Content-contract validation rejects a content route
that hydrates from an empty shell, requires canvas/WebGL, is absent from
the server-rendered ordinary-link graph or the sitemap, lacks a canonical
URL, or declares structured data not generated from its canonical source.

**Automated gates**

- pure unit tests validate geometry, tier selection, and input normalization;
- browser tests run Chromium, Firefox, and WebKit at the required viewport
  matrix;
- geometry assertions detect clipping, overlap, unreachable controls, and
  broken safe frames;
- accessibility automation catches detectable WCAG failures;
- tier-1 initial-response tests verify that canonical profile/project
  content and ordinary links exist with JavaScript disabled, without relying
  on WebGL or hydration;
- schema tests keep visible HTML, metadata, JSON-LD, `/portfolio.json`, and
  the canonical catalog/profile sources consistent;
- keyboard, real browser zoom, screen-reader, and branded-browser checks
  remain part of the manual release checklist;
- screenshot review verifies hierarchy and visual intent, while WebGL
  shaders are not subjected to brittle pixel-perfect diffs.

Add narrowly scoped lint rules for forbidden patterns in production UI:

- subject-attached HUD positioned from unrelated absolute viewport offsets;
- new direct `window.innerWidth/innerHeight` layout calculations outside the
  responsive service;
- `overflow: hidden` on ordinary content containers without a declared
  complex-layout exception;
- interactive canvas-only functionality without a DOM equivalent;
- essential project/profile text stored only in JSX, canvas textures, 3D
  labels, hover state, or client-only modules instead of the canonical
  profile/catalog;
- hidden crawler-only content or structured data that is not represented on
  the visible canonical page.

**Agent completion rule**

Claude, Codex, and future contributors may generate exploratory mockups, but
a design is not complete until it uses the shared primitives, declares its
layout and content contracts, keeps essential information in the canonical
source, and passes responsive, accessibility, and content-delivery gates.
CI—not an agent skill—is the final enforcement authority.

### A.8 Claude skill creation and automatic-use policy

Create a project-level Claude Code skill after `docs/responsive-system.md`
and the first shared primitives exist:

```text
.claude/skills/enforce-responsive-design/
├── SKILL.md
├── references/
│   └── task-checklist.md
└── scripts/
    └── validate-responsive.sh
```

Do not add a README, installation guide, or duplicate copy of the responsive
specification. `SKILL.md` should direct Claude to the repository-owned
`DESIGN.md`, `docs/responsive-system.md`, relevant `LayoutContract` and
`ContentContract`, canonical profile/catalog sources, and shared components.
The optional validation script should only orchestrate the project's
deterministic lint/test commands; it must not contain design or content
policy.

#### Creation process

1. **Collect concrete task examples.** Include new pages, modifications to an
   existing component, Figma/design-to-code work, HUD placement, camera
   framing, project/case-study content, recruiter metadata, and responsive
   review.
2. **Separate durable policy from workflow.** Put durable rules in
   `DESIGN.md` / `docs/responsive-system.md` and canonical facts in the
   profile/catalog; keep the skill focused on the steps Claude must perform
   for a task.
3. **Create**
   `.claude/skills/enforce-responsive-design/SKILL.md`. Project placement
   ensures the skill is versioned with the site and automatically discovered
   when Claude runs from this repository.
4. **Write specific frontmatter.** Automatic selection is primarily driven
   by `description`, so it must state both the capability and concrete
   triggers. Do not set `disable-model-invocation: true`; that would prevent
   automatic use.
5. **Write the workflow in imperative form.** Require reading the contract,
   classifying the layout tier, preserving invariants, using shared
   primitives, preserving canonical content, updating the applicable
   contracts, testing, and reporting results.
6. **Add only reusable resources.** Add `task-checklist.md` if the main skill
   would otherwise become long. Add `validate-responsive.sh` only after the
   underlying test commands exist, and execute it during skill validation.
7. **Validate discovery and triggering in a fresh Claude session.** Test
   positive, negative, and manual invocation prompts listed below.
8. **Forward-test on a real but bounded UI change.** Confirm the resulting
   code uses the primitives/canonical sources and runs the required gates;
   revise the description if Claude fails to load the skill automatically.
9. **Keep it current.** When the system changes, update the neutral contract
   first, then update the skill's workflow or references. Keep `SKILL.md`
   concise and move detail into one-level-deep references.

Claude Code watches project skill directories for changes, but creating a
new top-level skills directory may require restarting the session before
discovery. The skill remains manually available as
`/enforce-responsive-design`.

#### Required `SKILL.md` frontmatter

```yaml
---
name: enforce-responsive-design
description: >-
  Apply and verify this portfolio's site-wide responsive, canonical-content,
  3D framing, input scaling, and WCAG 2.2 AA rules. Use whenever Claude
  creates, implements, ports, reviews, or modifies a page, route, project
  case study, recruiter-facing surface, component, layout, navigation,
  modal, overlay, HUD element, typography system, camera framing, renderer
  sizing, viewport interaction, content shown in canvas/3D, or
  design-to-code output that can affect visual layout, content delivery, or
  accessibility.
---
```

Do not add `disable-model-invocation: true`. Leave user invocation enabled so
the owner can run `/enforce-responsive-design` for an explicit audit.

#### Required skill workflow

The body should instruct Claude to:

1. Read `DESIGN.md`, `docs/responsive-system.md`, the relevant
   `LayoutContract`/`ContentContract`, canonical profile/catalog source, and
   only the component-specific references needed.
2. State which visual properties are invariant and which may adapt.
3. Identify ordinary reflow content, protected 3D/two-dimensional regions,
   the required DOM alternative, and every essential fact/action the
   canonical semantic route must expose. Classify the required checks as
   degradation tier 1, 2, or 3 from §A.4.3; never require tier-2 interaction
   in a tier-1 JavaScript-disabled test.
4. Use the shared responsive primitives and tokens; do not create a parallel
   breakpoint, projection, project-data, or recruiter-data system.
5. Implement normal, zoom/narrow, reduced-motion, high-contrast, and keyboard
   behavior relevant to the task.
6. Keep visible HTML, metadata, JSON-LD, cockpit presentation, and
   supplementary JSON derived from the canonical source; never put essential
   information only in client state, canvas, a texture, hover, or 3D labels.
7. Treat approval records as owner-controlled. Never create or refresh
   `content/portfolio-approvals.json` hashes unless the owner explicitly
   approves the exact profile/project content in the current task.
8. Update or create the view's `LayoutContract` and `ContentContract` where
   applicable.
9. Run the scoped unit, tier-separated initial-HTML/content and interaction,
   browser geometry, accessibility, and visual checks.
10. Treat failed required checks as unfinished work and report any manual
   browser checks still required.

#### Automatic trigger policy

Claude should automatically use the skill—without the user naming it—when a
task does any of the following:

- creates a page, route, section, component, dialog, navigation element, or
  interactive visual surface;
- turns a generated concept, screenshot, Figma design, or written design
  description into code;
- changes sizing, spacing, typography, wrapping, positioning, breakpoints,
  container queries, scrolling, overflow, or zoom behavior;
- changes WebGL renderer sizing, camera fit, projected DOM anchors, HUD
  placement, cursor/parallax gain, or contained-stage panning;
- adds or changes an interaction that needs keyboard, focus, motion,
  contrast, target-size, or screen-reader treatment;
- creates or changes a project, case study, recruiter overview, résumé link,
  professional profile, route metadata, structured data, or content exposed
  through canvas/3D;
- moves a fact, label, outcome, or action into or out of a texture, WebGL
  object, animation, hover state, or client-only component;
- reviews a UI for responsiveness, cross-browser layout, or accessibility.

If a broader task contains any of those changes, the skill still triggers.
It should not trigger for backend-only work, dependency maintenance with no
rendered or canonical-content effect, or prose-only documentation unrelated
to the responsive/design/content contracts. A project-description edit is
not exempt merely because it looks data-only: it changes the canonical
portfolio output and must run content validation.

Add a concise rule to `CLAUDE.md`:

> Automatically invoke `/enforce-responsive-design` before creating,
> modifying, porting, or reviewing any rendered UI, canonical portfolio
> content, layout, 3D framing, or interaction behavior. A UI/content task is
> incomplete until its declared responsive, accessibility, and content
> checks pass.

#### Trigger validation prompts

Test automatic invocation in a fresh session without naming the skill:

- “Build a new project detail page from this design.”
- “Move the deck hint so it works on a Chromebook.”
- “Add a modal that matches the cockpit.”
- “Adjust the camera composition for ultrawide screens.”
- “Review this component for accessibility and browser zoom.”
- “Add a new project case study and show its title on a record texture.”
- “Update my role and outcomes for an existing project.”

Test that unrelated prompts do not load it:

- “Explain this server error without modifying the frontend.”
- “Update a backend-only test fixture that is not portfolio content.”

Finally invoke `/enforce-responsive-design` directly and confirm it performs
an audit rather than assuming code changes are authorized.

This process follows the official
[Claude Code skills documentation](https://code.claude.com/docs/en/skills):
project skills live under `.claude/skills/`, the description controls
automatic selection, and omitting `disable-model-invocation: true` allows
Claude to load the skill when relevant.

---

## 1. Terminology and coordinate systems

The implementation must keep these terms distinct:

| Term | Meaning | Used by |
|---|---|---|
| CSS viewport | The stage size in CSS pixels, after browser zoom and browser chrome | DOM HUD, camera aspect |
| Device pixel ratio (DPR) | Physical pixels per CSS pixel | WebGL backing buffer only |
| Stage coordinates | CSS pixels relative to the cockpit stage's top-left corner | All HUD layout functions |
| Projected rect | An unclamped stage-coordinate rectangle enclosing a 3D subject | Object-related HUD anchors |
| Safe frame | The part of the stage left after edge and persistent HUD reservations | Camera fitting and overlay placement |
| Render resolution | WebGL drawing-buffer width and height | Sharpness and GPU cost, not HUD position |

Changing DPR must not change any HUD position. Changing the CSS viewport may
change camera framing and HUD position, but the final layout must still meet
the acceptance criteria in §9.

This plan does **not** add adaptive performance resolution such as lowering
DPR when FPS drops. If that is desired later, it should be a separate,
measured performance feature.

---

## 2. Verified current behavior

### 2.1 Reported overlap

The deck hint uses a viewport constant:

- `BrowseArrows` in
  [cockpit-hud.tsx](../components/cockpit/cockpit-hud.tsx) places the hint at
  `top: 76; left: 50%`.

The holographic card uses the deck focus camera:

- `getFocusTarget()` in
  [turntable.ts](../components/cockpit/turntable.ts) exposes only
  `fitHeight`.
- The deck branch in
  [globe-canvas.tsx](../components/cockpit/globe-canvas.tsx) derives camera
  distance from that height and the vertical FOV.

The exact overlap point is affected by the camera angle, card animation,
browser chrome, and CSS viewport height. It is therefore too strong to claim
that the card always occupies one exact percentage of the viewport. The
verified mechanism is simpler: the card position is projection-driven while
the hint position is not, so their separation has no invariant.

### 2.2 Focused HUD audit

**Phase 4 implementation note.** The projection and sampling portion of this
audit is now implemented by the stage-relative
`lib/responsive/stage-projection.ts` contract and the single production
`components/cockpit/hud-sampler.ts` snapshot. The seven focused overlays no
longer run independent projection rAF loops, and `ScreenDialog` consumes the
same-frame monitor quad. The placement requirements in the table are
deliberately preserved: Phase 4 keeps reference-viewport placement parity;
deck and crate collision-solver re-anchoring remain Phase 6 and Phase 7.

| Element | Current behavior | Required behavior |
|---|---|---|
| Deck hint | Fixed `top: 76` | Anchor to the deck card; avoid the return control |
| Deck arrows | Card-relative, then independently clamped to viewport edges | Use measured arrow sizes and a shared collision solver |
| Crate hint | Fixed `top: 76` | Anchor to the crate rect |
| Crate arrows | Fixed at viewport sides | Anchor to the crate rect |
| `VinylInfoCard` | Fixed `bottom: 44`; projected record point is ignored | Anchor below the crate, with an above-crate fallback |
| `esc · return` | Fixed top-right viewport chrome | Keep viewport-anchored; publish its measured occupied rect |
| `ScreenDialog` | Matrix aligned to the projected screen quad | Preserve; normalize its projection coordinate contract |

### 2.2.1 `termFadeIn` — VERIFIED LIVE DEFECT

This is not a latent hazard. It is shipping today.

[globals.css](../app/globals.css) defines:

```css
@keyframes termFadeIn { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }
```

The keyframe animates `transform`, so for the animation's duration it
**replaces** any positioning transform set inline on the same element. Three
components set a centering transform and `termFadeIn` on one element, and
therefore visibly jump into place on every appearance:

| Component | Positioning transform | Animation | Symptom |
|---|---|---|---|
| `VinylInfoCard` | `translateX(-50%)` | `termFadeIn .18s` | Card enters shifted right, then snaps left into center |
| Previous/next arrows | `translateY(-50%)` | `termFadeIn .18s` | Arrows enter vertically offset, snap on settle |
| Browse hint | `translateX(-50%)` | `termFadeIn .18s` | Hint enters shifted right, then snaps left into center |

Audited as clean — `termFadeIn` with no positioning transform, so no wrapper
needed: `SiteHeader`, the nav submenu, and the boot-screen usage.

`tagFadeIn` proves the underlying issue and the general remedy, but its
composed transform is hard-coded to the name tags' `-50%/-100%` offsets and
is not reusable. The general fix is a wrapper split — outer element owns
position and transform, inner element owns the entrance animation:

```jsx
<div style={{ position, transform }}>
  <div style={{ animation: "termFadeIn .18s ease-out" }}>
    …
  </div>
</div>
```

Scheduled as a **pre-Phase-0 hotfix** (§8, Phase −1). It is independent of
the responsive system, carries no dependency on the projection or camera
work, and is the one defect in this document that is cheap to fix now.

### 2.3 Renderer resize audit

**Superseded by Phase 3.** Both
[globe-canvas.tsx](../components/cockpit/globe-canvas.tsx) and
[warp-transition.tsx](../components/cockpit/warp-transition.tsx) now use the
shared [renderer-size-sync.ts](../components/cockpit/renderer-size-sync.ts)
controller. It measures the renderer mount, separates unrounded CSS geometry
from capped-DPR drawing-buffer resolution, observes mount-only changes,
re-arms on DPR changes, retains `window.resize` as a fallback, and
synchronizes at frame start. The durable contract is recorded in
[docs/responsive-system.md](responsive-system.md#31-renderer-sizing-and-context-lifecycle).

### 2.4 Camera-fit audit

- `monitor`: fits width and height, which is appropriate for its nearly
  face-on planar screen.
- `deck`: fits an authored height only.
- `crate`: fits depth against vertical FOV and exposes a width that is not
  currently used.

Adding `fitWidth` and taking `max(distV, distH)` would improve the deck and
crate, but it would still be approximate. Points on the crate and deck sit at
different depths and the camera looks down at them. The production solution
should test the actual projected framing points at a candidate distance.

### 2.5 Canonical-content audit

[projects.ts](../components/cockpit/projects.ts) contains six project
records. Each currently provides a display title, category, date/WIP marker,
tagline, role, tools, external project URL, cover choice, and texture colors.
That is sufficient for the present record sleeve and holographic card, but
not for a standalone recruiter-readable case study.

The current source does not consistently provide:

- a stable ID or URL slug;
- a separate completion status;
- a plain canonical title without sleeve-art line breaks;
- the problem/context;
- specific owner contributions;
- outcomes or the honest absence of measured outcomes;
- skills normalized separately from tools;
- team/constraint context;
- descriptive alternatives for informative cover images;
- typed link purposes.

The linked legacy project pages may help the owner migrate existing material,
but they are not a runtime dependency and must not be scraped during builds.
Before the strict catalog can pass Phase 0, create a content inventory that
maps every current field and records each missing fact as owner input
required. Claude or Codex may restructure and edit supplied facts, but must
not fabricate ownership, outcomes, metrics, clients, collaborators, dates,
or skills.

---

## 3. Layout law

Encode this rule in code and project documentation:

> If a DOM element describes or controls a 3D subject, it anchors to that
> subject's projected geometry. If it is application chrome, it anchors to
> the stage. CSS pixels may define gaps, padding, and minimum hit areas, but
> not an unrelated absolute subject position.

The following constants are valid because they describe spacing, not subject
position:

- minimum stage-edge gutter;
- subject-to-overlay gap;
- minimum button hit area;
- collision tolerance;
- a short last-valid-projection grace period during a deck swap.

Keep the values in one module rather than repeating numeric literals in JSX.

Proposed file:

`components/cockpit/hud-layout.ts`

Initial tokens to validate during baseline capture:

```ts
const HUD_EDGE_GUTTER = 16        // minimum stage-edge clearance
const HUD_SUBJECT_GAP = 14        // subject-to-satellite clearance
const HUD_COLLISION_GAP = 8       // clearance between separate HUD elements
const HUD_MIN_HIT_SIZE = 44       // keyboard/pointer control box
const HUD_RECT_EPSILON = 0.25     // ignore smaller geometry changes
const HUD_RECT_GRACE_MS = 350     // deck swap only; never mode exit
const DPR_CAP = 2
```

These are starting values, not license to tune each component independently.
If QA changes one, change the shared token and re-run the whole viewport
matrix.

It should contain only pure types, constants, and layout functions so it can
be unit-tested without React or WebGL.

```ts
type Rect = { x: number; y: number; w: number; h: number }
type Size = { w: number; h: number }
type Insets = { top: number; right: number; bottom: number; left: number }

type FocusHudLayout = {
  hint: Rect
  previous: Rect
  next: Rect
  info?: Rect
  compact: boolean
}
```

Required helpers:

- `isFiniteRect(rect)`
- `insetRect(stage, insets)`
- `intersects(a, b, gap = 0)`
- `contains(outer, inner)`
- `placeAbove(anchor, size, gap)`
- `placeBelow(anchor, size, gap)`
- `placeBeside(anchor, size, side, gap)`
- `resolveFocusHudLayout(input)`

Do not clamp the projected subject rect itself. Clamping destroys the
information needed to decide that the camera framing is wrong.

---

## 4. Renderer and viewport sizing contract

Implement sizing in [globe-canvas.tsx](../components/cockpit/globe-canvas.tsx)
before changing camera framing.

### 4.1 One resize function

Create one idempotent `syncRendererSize()` function:

1. Read `mount.getBoundingClientRect()`.
2. Ignore zero or non-finite dimensions.
3. Use the unrounded CSS width and height for stage geometry.
4. Set `camera.aspect = width / height` and update its projection matrix.
5. Calculate `effectiveDpr = min(window.devicePixelRatio || 1, DPR_CAP)`.
6. If DPR changed, call `renderer.setPixelRatio(effectiveDpr)`.
7. If CSS size or DPR changed, call
   `renderer.setSize(width, height, false)`. The canvas remains CSS-filled by
   stylesheet; only the drawing buffer is rounded, by flooring
   `width × effectiveDpr` and `height × effectiveDpr`.
8. Cache the applied width, height, and DPR so unchanged notifications are
   no-ops.

Keep `DPR_CAP = 2` unless performance testing justifies a different value.

### 4.2 Resize triggers

Call the same function from:

- initial mount;
- a `ResizeObserver` attached to the mount;
- `window.resize` as a compatibility fallback;
- a re-armed resolution media query so moving the window between a Retina
  and non-Retina display updates DPR even when CSS size is unchanged.

Disconnect the observer, media-query listener, and window listener on
unmount.

### 4.3 Ordering

On a resize, camera projection must be updated before the next render and
before the next HUD projection sample. There must not be a frame where the
HUD uses a new DOM size with the old camera aspect.

The warp renderer in
[warp-transition.tsx](../components/cockpit/warp-transition.tsx) should use
the same DPR cap and resize policy, but it is a separate renderer and should
not share live renderer state.

---

## 5. Projection bridge contract

**Implemented in Phase 4.** `stage-projection.ts` owns the pure conversion and
validity rules; `hud-sampler.ts` owns the monotonic production frame id,
same-frame mode-aware snapshot, epsilon-gated publication, and deck-only
350 ms retained-card grace. Existing `window.__getCockpit*` getters remain
the preserved legacy tuning bridge, not the live HUD data path. The normative
contract below remains the review baseline for later camera and re-anchoring
phases.

All projection getters used by DOM overlays must return stage-local CSS
coordinates:

```ts
type ProjectedRect = Rect & {
  visible: boolean
  frameId: number
}
```

### 5.1 Coordinate conversion

Projection currently maps NDC into canvas width and height but assumes the
canvas origin is also the stage origin. Replace that assumption with:

```ts
x = canvasRect.left - stageRect.left + (ndcX * 0.5 + 0.5) * canvasRect.width
y = canvasRect.top  - stageRect.top  + (-ndcY * 0.5 + 0.5) * canvasRect.height
```

The stage rect should come from the element that owns the absolutely
positioned HUD. Pass that element to the scene or expose a stage-local
conversion helper; do not query unrelated DOM selectors from the 3D modules.

### 5.2 Validity rules

A projected rect is valid only when:

- every returned number is finite;
- canvas and stage dimensions are non-zero;
- every defining point is in front of the camera near plane;
- width and height are positive.

Return `null` for invalid or behind-camera geometry. Otherwise return the raw
rect even when part of it is outside the stage; set `visible` according to
whether that raw rect intersects the stage. This distinguishes a valid
off-screen projection from a missing subject without destroying its position.

### 5.3 Sampling

Use one focused-HUD frame subscription. `GlobeCanvas` should publish the
frame after updating the camera pose and matrices; focused HUD subscribes
once and reads every required getter from that callback. This is more
deterministic than hoping independent browser rAF callbacks run in the right
order.

The subscription should:

1. run after the scene has updated the camera for the frame;
2. read the active subject rect and semantic browse info;
3. retain the last valid deck rect only while `info.busy` is true, for a
   bounded grace period;
4. clear retained geometry immediately on focus-mode exit;
5. update React state only when semantic data changes;
6. update geometry through one snapshot or element refs, with a small
   sub-pixel equality tolerance.

Expose a subscribe/unsubscribe function or a small `EventTarget`; do not
dispatch a bubbling DOM event every frame.

Do not create one independent `requestAnimationFrame` loop per overlay.
Do not call `setState` unconditionally on every frame for unchanged data.

---

## 6. Focus-camera fitting

### 6.1 Replace scalar fit hints with framing points

The deck and crate `getFocusTarget()` APIs should return:

```ts
type FocusTarget = {
  center: THREE.Vector3
  outward: THREE.Vector3
  verticalBias: number
  framingPoints: THREE.Vector3[]
}
```

Framing points are authored local-space points transformed to world space:

- **deck**: outer deck/platter points plus the four holographic-card corners
  at maximum animated scale and bob height; use a conservative horizontal
  extent for the card's yaw billboard so fitting does not depend on the
  previous frame's camera;
- **crate**: exterior crate corners plus the maximum pulled-sleeve/disc
  extent;
- **monitor**: its four screen corners; its current analytic solution may
  remain if it produces the same safe-frame result.

Do not use `Box3.setFromObject()` every animation frame for the fit solve.
Create stable authored points or cache local bounds, then transform the small
point set when reframing is required.

### 6.2 Fit against a safe frame

The camera must frame the subject inside a safe rectangle, not merely inside
the whole viewport. The safe rectangle reserves:

- stage-edge gutters;
- the top-right return control;
- room above or below for the hint;
- side gutters for the arrow buttons;
- bottom room for the crate info card.

Use shared HUD spacing tokens. Reservations may differ by focus kind, but
they must not be duplicated as unrelated numbers in the camera and HUD
files.

Keep reservations stable for the whole focus mode. Derive them from the
maximum measured overlay sizes for that mode (including the longest project
title), not whichever controls happen to be visible on the current frame.
Otherwise the camera will “pump” when a card appears or the selected record
changes. Use conservative defaults until the hidden measurement pass
completes, then allow at most one reframing update.

### 6.3 Distance solve

For the deck and crate, use a bounded binary search:

1. Build the intended camera direction from `outward + verticalBias`.
2. Place the camera at `center + direction * candidateDistance`.
3. Look at `center` and update camera matrices.
4. Project every framing point.
5. Convert the safe frame from CSS pixels to NDC bounds.
6. The distance fits only when all points are in front of the camera and
   inside the safe NDC bounds.
7. Search for the smallest fitting distance within sensible per-view near
   and far limits.

Ten to sixteen iterations are enough and this solve only needs to run when:

- focus kind changes;
- stage size/aspect changes;
- an authored framing bound changes.

Cache the result between those events. Continue using the existing camera
transition interpolation so resizing or switching focus does not introduce
a pose snap.

### 6.4 Why not only `max(distV, distH)`

That formula assumes the fitted width and height lie in a plane perpendicular
to the view direction. It remains suitable for the monitor screen. It is not
the complete model for a top-down crate or a deck containing a raised card.
The point-projection solve handles aspect ratio, camera tilt, and depth with
one testable algorithm.

---

## 7. Focused-HUD placement rules

Measure the rendered size of each overlay with a ref and `ResizeObserver`.
Render it hidden until the first measurement rather than briefly showing it
at an incorrect origin.

### 7.1 Occupied stage chrome

The `esc · return` wrapper must expose its measured rect to the layout solver.
It remains stage-anchored. Its edge offsets may become shared spacing tokens,
but it must not follow a 3D subject.

### 7.2 Hint

Placement priority:

1. centered above the subject with the standard subject gap;
2. centered below the subject;
3. compact form in the navigation rail;
4. hide the nonessential hint if no collision-free placement exists.

At every priority, require:

- containment in the safe frame;
- no intersection with the subject;
- no intersection with the return control;
- no intersection with the info card or arrow buttons.

Text may wrap only at an explicit compact breakpoint. The preferred desktop
form remains one line.

### 7.3 Previous/next arrows

Placement priority:

1. outside the subject's left and right edges, vertically centered;
2. a horizontal navigation rail in the closest collision-free area above or
   below the subject;
3. stage-edge placement only if it still clears the subject.

Do not independently clamp each arrow after placement. Resolve the pair as
one layout so it stays balanced. Preserve at least a `44×44` CSS-pixel hit
area and keep disabled buttons visible.

Passing `__getCockpitCrateRect` to the crate browse controls is required; the
crate path must no longer use the “no rect means viewport edges” behavior.

### 7.4 Vinyl info card

Placement priority:

1. centered below the crate;
2. centered above the crate if the bottom reservation is exhausted;
3. centered in the widest collision-free safe-frame strip.

Clamp the card's width to the safe frame, not to a hard-coded viewport
position. Long titles must wrap within the measured card without changing
its relationship to the crate.

The projected selected-record point may remain part of semantic info, but it
is not the primary card anchor under this design.

### 7.5 Entrance animation

Use an outer element for `position/transform` and an inner element for fade or
slide animation. The animation must never overwrite the transform that
centers or tracks an overlay.

---

## 8. Implementation phases

Each phase should be a separate reviewable commit.

No other stopgap ships ahead of the system. The reported deck overlap is
fixed in Phase 6 by the real solver, **not** by an interim constant. Phase −1
is the sole exception, because it fixes a defect that is independent of the
responsive work and would otherwise persist through every intervening phase.

### Phase −1 — `termFadeIn` hotfix (pre-foundation)

**Implementation status: complete, including automated verification.** The
three scoped sites keep positioning transforms on stable outer anchors and
run `termFadeIn` on inner elements (code 2026-07-27). The focused Chromium
start/mid/end computed-transform assertion was delivered with Phase 0 in
`e2e/smoke.spec.ts`; Phase 8 expands that existing assertion across the
final browser and viewport matrix.

Scope is exactly the three defective sites in §2.2.1: `VinylInfoCard`, the
previous/next arrows, and the browse hint.

- Split each into an outer anchor element owning `position`/`transform` and
  an inner element owning `animation`.
- Do not change any element's resting position — this fixes the entrance
  only. The hint stays at `top: 76` until Phase 6 re-anchors it.
- Do not generalize `tagFadeIn`; its transform is name-tag specific.
- Leave the three audited-clean usages alone.

**Assertion**: the outer anchor's computed `transform` is unchanged for the
full duration of the entrance animation — sample at animation start, mid, and
end and require an identical matrix. Implement the first executable assertion
in Phase 0 and carry it forward into the Phase 8 geometry suite rather than
replacing or discarding it.

**Exit**: no focused-view overlay changes position during its entrance
animation.

### Phase 0 — baseline, contracts, and executable enforcement

**Implementation status: complete** (2026-07-27; commit `b3d3315`).
Delivered: catalog/texture split; strict contract/schema/validation modules
under `lib/**`; runtime validators + route-coverage scan
(`scripts/validate-contracts.ts`); scoped strict typecheck
(`tsconfig.contracts.json`); 156 unit tests (Vitest); Chromium smoke suite
incl. the Phase −1 assertion, §9.6.2 blank-canvas check, and the Phase 2 /
Phase 6 assertions as `test.fixme` pending markers; `__COCKPIT_TEST_HOOKS__`
bridge with the `configureVisualCapture` lifecycle guard; minimal CI
(`.github/workflows/ci.yml`); docs (`docs/responsive-system.md`,
`DESIGN.md` §10, `CLAUDE.md` rules, `AGENTS.md`,
`docs/content-inventory.md`); baseline screenshots + measured failure
record (`docs/baselines/phase-0/` — the deck hint↔card overlap reproduces
on 12 of 17 matrix viewports). The two §9.6 decisions are settled and
documented in `docs/responsive-system.md` §11: production exclusion via a
static `NODE_ENV` guard, drawing-buffer reads via synchronous in-frame
forced re-render. Completeness/approval checks run non-blocking pending
Phase 0B, as specified.

Contract enforcement cannot wait for the final phase. Without it, Phases 1–7
would build against contracts CI never checks. Phase 0 therefore establishes
a **strict, isolated enforcement island** — not the complete final test
suite.

**Documentation and baseline**

- Record current failures and reference screenshots at the §9 viewport
  matrix.
- Create a six-project/profile content inventory from §2.5. Mark facts that
  require owner input; do not insert generated placeholder claims into the
  canonical catalog.
- Create `docs/responsive-system.md` from the finalized policies in §A.
- Add the responsive/accessibility/canonical-content contracts to
  `DESIGN.md`.
- Add equivalent mandatory workflow rules to `CLAUDE.md` and a new
  repository `AGENTS.md`.
- Add `data-hud`, `data-layout-region`, `data-layout-contract`, and
  `data-content-contract` identifiers needed by diagnostics and tests.

**Strict contracts** — these modules must not use `@ts-nocheck`:

- `lib/responsive/layout-contract.ts` — the `LayoutContract` type.
- `lib/responsive/layout-contracts.ts` — per-view contracts for the cockpit
  and the project catalog.
- `lib/content/content-contract.ts` and
  `lib/content/content-contracts.ts` — the content-delivery type, pure
  validator, and required route declarations from §A.7.
- `lib/content/content-approval.ts` — stable public-field serialization,
  SHA-256 hash calculation, manifest typing, and pure validation for the
  approval records defined in §A.4.2.
- `lib/portfolio/profile.ts` and `lib/projects/catalog.ts` — the strict
  serializable public profile and project schemas from §A.4.2.
- Each contract declared with `satisfies LayoutContract`, so a misspelled or
  missing field fails typechecking rather than degrading silently.
- Each content contract declared with `satisfies ContentContract`.
- Perform the catalog/texture split from §A.4.1 here, since both contract
  families depend on the server-safe source.

**Runtime contract validation** — a pure validator, so malformed data is
caught even where TypeScript is bypassed. It checks:

- required viewport cases are present;
- contract, protected-region, and viewport-case identifiers are unique;
- every contract references a recognized `SUPPORT_PROFILES` key;
- the selected profile has positive dimensions and `normalMax.w/h` are each
  greater than or equal to `normalMin.w/h`;
- required viewport cases are consistent with the selected profile's
  normal, zoom/narrow, and large-smoke ranges;
- every current route uses `desktop-laptop-v1` unless a new profile is added
  through an explicit reviewed contract change;
- adaptation values are recognized;
- every interactive protected region declares a route or equivalent inline
  controls;
- descriptive/decorative alternatives are used only for non-interactive
  regions;
- required accessibility states are declared;
- every application route has a co-located contract or reviewed exemption;
- every registered composed view's `data-layout-contract` ID resolves to a
  known contract in browser tests;
- every required content route declares server-rendered, JavaScript-
  independent, WebGL-independent visible HTML;
- every project has a unique ID/slug and every required §A.4.2 field is
  present, non-empty, and JSON-serializable;
- informative covers have meaningful alternatives, while generated
  decorative motifs use the explicit decorative branch;
- each catalog slug maps to a project-detail content contract and canonical
  route;
- approval-manifest subjects are unique and known, schema versions are
  supported, timestamps are valid RFC 3339 UTC values, and approved hashes
  match current public profile/project content once Phase 0B enables the
  gate;
- initial navigation, sitemap coverage, canonical URLs, and declared
  structured-data types are complete.

The project-field completeness and approval-hash checks are implemented in
Phase 0 but explicitly report non-blocking pending results until Phase 0B.
All other Phase 0 structural checks are blocking immediately. “Non-blocking”
does not permit placeholder prose; it permits an honestly incomplete
provisional record while Phase 0A gathers owner-approved facts.

**A scoped typecheck command.** `next build` sets `ignoreBuildErrors: true`
and all 17 cockpit modules are `@ts-nocheck`, so the build proves nothing
about types. Either make full `tsc --noEmit` pass, or add a narrow strict
config covering the new responsive, content-contract, profile, and catalog
modules. **CI must run this command directly**, not rely on the build.

**Unit tests** — first use of a test runner in this repo. Cover:

- contract validation;
- responsive-tier selection;
- rectangle intersection and containment;
- input-gain calculation (both `responseExponent` and `sizeRatio` paths);
- wheel-delta normalization;
- project/profile schema validation, slug and URL validation, and
  serialization;
- deterministic approval serialization/hash fixtures plus missing, stale,
  duplicate, unknown-subject, and unsupported-version cases;
- content-contract validation and full dynamic project-route coverage;
- consistency helpers that derive metadata, JSON-LD, and `/portfolio.json`
  from the canonical source.

**A minimal browser harness** — runner configuration plus one Chromium smoke
test that reaches the boot screen, confirms the required layout identifiers
exist, proves the harness can resize the viewport, and executes the Phase −1
entrance-transform assertion in Chromium. Register the initial HTML
project/recruiter-link assertion as named pending work (for example,
`test.fixme`) linked to Phase 2; the current client-only root must not be
recorded as passing it. Add the known deck overlap assertion as separate
named pending work linked to Phase 6; it must not be recorded as expected
passing behavior or silently inverted into a baseline snapshot. Firefox,
WebKit, full geometry coverage, content-route coverage, accessibility scans,
and visual review expand in later phases.

Phase 0 must also settle two decisions the harness depends on, both
specified in §9.6:

- the shape of the §9.6.1 test bridge and its production-exclusion
  mechanism;
- how §9.6.2 reads the drawing buffer given `preserveDrawingBuffer: false`
  on the main renderer — in-frame callback or a test-only flag.

The Phase 0 baseline pass captures reference screenshots for human review
and applies the §9.6.2 blank-canvas check to the smoke test immediately: a
pending overlap test is only meaningful if the frame actually rendered.
§9.6.3 scorecard **regression baselines are not recorded in Phase 0** —
they require the §9.6.5 deterministic scene state, which lands in Phase 4;
recording them against today's nondeterministic scene would bake flakiness
into the reference set.

**Minimal CI, immediately** — lint, scoped typecheck, layout/content contract
validation, catalog/profile validation, unit tests, and the single browser
smoke test. The full cross-browser matrix can wait; contract enforcement
cannot.

**Exit**: normal, zoom/narrow, protected-region, allowed-adaptation, and DOM
alternative behavior plus canonical content delivery are declared before
implementation begins, **and** CI fails on a malformed/missing declaration.
Phase 2 delivery assertions are present but explicitly pending, never
silently passing. During Phase 0 the catalog carries the *existing* fields
under a provisional schema; strict `Project` **completeness** validation
exists but runs non-blocking until Phase 0B, because the content it demands
does not exist yet. The Phase 0 core may close with honest provisional gaps
while Phase 0A continues, but it may not fill those gaps with fabricated
placeholder content and Phase 2 remains blocked.

### Phase 0A — content dossier and owner approval

**Implementation status: complete** (2026-07-28; commits `5dc7c70` +
`12a3735`). All five steps ran: extraction (2026-07-27 dossier), gap
listing + drafting (docs/content-inventory.md), five owner decision passes
(26 ledger entries), full-content record approval for the profile and all
six projects, and hash recording (`content/portfolio-approvals.json`,
most recently `2026-07-29T00:41:59Z` after the owner approved the current
profile role, summary, and capabilities) via the
owner-only `scripts/record-approvals.ts`. The catalog was converted to the strict
schemas with a derived `SLEEVES` presentation adapter so the cockpit's
look is unchanged except owner-corrected facts (Song of Maka title/
pronoun/date-status, Tencent 2023). Honest gaps stayed gaps: Shanghai
Noir records `in-progress` with "no released outcome yet".

An inventory is not authored content. The strict `Project` schema demands
`summary`, `problem`, `contributions`, `outcomes`, and `skills` for all six
projects, and that prose largely does not exist (CLAUDE.md has carried a
"real taglines/descriptions pass" as open work since before this plan). The
public profile also needs an owner-approved professional summary,
capabilities, contact routes, professional links, and résumé URL when
published. Automation can require the fields; only the owner can supply the
facts. This phase produces the content the Phase 0B gate then enforces.

Process, in order:

1. **Extract** only existing, supportable facts for the public profile and
   all six projects — from the current catalog, alexxiong.me, and material
   the owner provides.
2. **List the gaps** for the profile and per project: missing professional
   summary/contact information, problem, contribution, outcome, team,
   constraint, and skill information.
3. **Draft** — Claude or Codex structures and edits the dossier without
   inventing facts. A gap stays an explicit gap; it is never filled with
   plausible prose.
4. **Owner supplies and approves** — the owner fills missing facts and
   approves the public profile plus every ownership claim, outcome, and
   metric.
5. **Record approval** — compute the §A.4.2 hash only after that explicit
   confirmation, write one manifest record for `profile` and one for each
   project, then convert the approved dossier to the strict schemas.

Phase 0A may run in parallel with Phases 0–1.

**Exit**: the profile and all six projects have owner-approved records in the
strict schemas plus matching approval-manifest hashes, with honest gaps
represented as such (`status`, qualitative outcomes) rather than invented.

### Phase 0B — strict catalog enforcement

**Implementation status: complete** (2026-07-28; commit `4e64287`). Strict `Project` completeness is blocking (folded into
`validateCatalogStructure` — the strict schema makes completeness a
structural property), `PROFILE` validation is blocking, and approval
verification is blocking (`verifyApprovals({ blocking: true })` in
`scripts/validate-contracts.ts`): a missing or stale hash fails the gate.
Verified by a live tamper test (unapproved tagline edit → "stale hash —
owner review required" failure → restore → green) and by unit tests.
Phase 2's content gates are now unblocked.

- Flip strict `Project` completeness validation from non-blocking to
  **blocking** in CI.
- Make approval-manifest validation blocking: a missing/stale profile or
  project hash fails the build. This is a tamper/staleness guard, not proof
  of factual truth or human review.
- From this point an incomplete record or missing/stale approval fails the
  build;
  `planned-phase-2` route contracts remain the only permitted pending
  state, per §A.7.
- Phase 0B must complete before Phase 2's content gates become blocking,
  since Phase 2 builds its routes on the approved catalog.

**Exit**: CI rejects a profile/catalog change violating the strict schema or
invalidating an approval hash, and every existing record passes both gates.

The dependency order is explicit:

| Work | Requires | Blocks |
|---|---|---|
| Phase 0 core | Phase −1 code | Phase 1 and Phase 0B |
| Phase 0A content | Owner source material | Phase 0B |
| Phase 0B enforcement | Phase 0 core and Phase 0A | Phase 2 |
| Phase 1 foundation | Phase 0 core | Phase 2 |
| Phase 2 routes | Phase 0B and Phase 1 | Later route/cockpit phases |

Phase 0B requires both the Phase 0 validation infrastructure and the Phase
0A owner-approved dossier. Phase 2 requires Phase 0B and Phase 1. This is a
dependency graph, not permission to merge Phase 2 with pending content.

### Phase 1 — shared responsive and accessibility foundation

**Implementation status: complete** (2026-07-28; commit `809607c`).
Delivered: role-based visual tokens (fonts, fluid
type, spacing, panel, focus, control) in `app/globals.css`;
`components/responsive/` primitives (`ResponsivePage`, `ResponsiveStage`,
`SafeFrame`, `AccessibleExperienceLink`); root `AccessibilityProvider` with
live matchMedia subscriptions, pre-paint attribute stamping, and persisted
explicit overrides (`cockpit-a11y-v1`); the ACCESSIBILITY trigger + settings
dialog (focus-contained, Escape, ≥44px targets) reachable from boot and
cockpit; static reduced-motion boot with no JS timelines and skipped warp;
boot gated on the operable trigger; the `/responsive-preview` representative
page + `responsive-preview-v1` contract; unit coverage
(`tests/unit/accessibility`) and Chromium coverage (`e2e/foundation.spec.ts`).
Owner decision 2026-07-28: header weather + automatic geolocation removed
entirely; sub-menu counts now derive from the canonical catalog.

- Add shared layout tokens and the `ResponsivePage`, `ResponsiveStage`,
  `SafeFrame`, and `AccessibleExperienceLink` primitives.
- Add the root-mounted `AccessibilityProvider` from §A.6.2 and make
  boot/cockpit/routes consume the same resolved preferences.
- Implement normal/zoom tier selection from available CSS size.
- Allow the outer document to reflow and scroll in zoom/narrow mode without
  breaking the normal full-bleed cockpit.
- Build the accessible settings dialog and persist explicit overrides.
- Honor system motion/contrast preferences before paint where possible.
- Render reduced-motion boot directly in its static ready state without
  starting its JavaScript animation timers, and skip warp on entry.
- Gate boot-animation start on the hydrated `ACCESSIBILITY` trigger being
  operable (§A.4.3 tier 2): boot timers must not begin until the trigger can
  receive activation, so a user can change settings before motion starts.

**Exit**: an empty representative page demonstrates every tier and setting
without cockpit-specific code.

### Phase 2 — canonical DOM and recruiter-readable content path

**Implementation status (2026-07-30): code complete in the current
reviewable worktree change; independent Kimi QA and merge are pending.**
There is no Phase 2 commit hash before merge; record it here when the owner
accepts and commits the reviewed change.

- Convert `app/page.tsx` into a Server Component shell that emits the public
  identity/summary and visible ordinary navigation in the initial HTML;
  mount the client-only cockpit through the §A.4.2 boundary — a new
  `components/cockpit/cockpit-entry.tsx` Client Component that owns the
  `dynamic(…, { ssr: false })` call (Next.js rejects `ssr: false` in Server
  Components) — without duplicating the visual composition or causing a
  hydration layout shift.
- Build the semantic `VIEW PROJECTS` catalog as a server-rendered route
  reading `lib/projects/catalog.ts` (split in Phase 0 per §A.4.1). It must
  not import `three` or any cockpit runtime module.
- Build server-rendered `/projects/[slug]` detail pages for every catalog
  entry, using `generateStaticParams` where appropriate, and the
  print-friendly `/about` overview from §A.4.2. Keep `/recruiter` as a
  permanent redirect under Revision 7.
- Generate per-route metadata and JSON-LD from the same canonical sources;
  add `sitemap.ts`, `robots.ts`, canonical URLs, and the supplementary
  `/portfolio.json` route handler.
- Change every required `ContentContract` from `planned-phase-2` to
  `implemented`, remove the Phase 2 pending markers, and make route coverage
  plus initial-response checks blocking CI.
- Enforce the import boundary with the lint rule from §A.4.1.
- Make it reachable before boot, from global navigation, and from the
  zoom/narrow cockpit container.
- Provide keyboard-operable project selection, links, focus management,
  status text, and meaningful non-canvas descriptions.
- Create an action-parity manifest for §A.4; every row must be implemented,
  explicitly decorative, or a shared future stub in both experiences.
- Test against the §A.4.3 tiers separately: tier 1 (JavaScript disabled)
  asserts content, routes, links, and system accessibility behavior only;
  tier 2 (JavaScript on, WebGL disabled) asserts the interactive DOM
  alternatives including settings persistence. Fetch initial HTML directly
  and assert the required content rather than relying only on a hydrated
  browser DOM. Never assert tier-2 behavior in a tier-1 environment.
- Validate that visible HTML, route metadata, JSON-LD, and
  `/portfolio.json` agree with the profile/catalog and contain no
  crawler-only facts. Require an owner content review before publishing new
  claims or metrics; automation verifies presence and consistency, not
  truth.

**Exit**: tier 1 — project discovery and all essential content remain
available with JavaScript disabled; tier 2 — every currently implemented
meaningful function outcome, including settings and theme persistence,
remains available with WebGL disabled; both without hover or cockpit
interaction. Every project is understandable from its canonical HTML,
`/about` supplies the print-friendly professional summary, and future stubs
are identified consistently in both experiences.

### Phase 3 — renderer and viewport sizing

**Implementation status: complete in the reviewable worktree** (2026-08-03;
owner checkpoint complete; independent QA and the controller-owned
`Phase 3: record DPR evidence and delivery` commit pending).

- Add the idempotent mount/DPR resize function.
- Add `ResizeObserver` and DPR-change handling.
- Apply the same policy to the warp renderer.
- Integrate `ResponsiveStage` without counter-scaling browser zoom.
- Implement WebGL context loss/restore per §10.1, on both renderers.

**Performance baseline for the `DPR_CAP` decision.** §4.1 keeps
`DPR_CAP = 2` "unless performance testing justifies a different value" but
does not say how to measure. Establish that method here:

1. Record a baseline per viewport — frame time and FPS, draw calls,
   triangles, geometry count, texture count, JS heap, and bundle size.
2. Change **one** variable at a time and re-measure the *same* scenario.
3. Compare against the baseline before accepting or rejecting the change.

Measure the deck and crate focused views specifically: they are the
fill-rate-heavy cases, where transmissive surfaces, the PMREM environment,
and the beam shader all composite at once. A high-DPR laptop panel at
`DPR_CAP = 2` renders roughly four times the fragments of DPR 1 through
those materials, so this is the scenario that decides the cap.

Record the resulting numbers in the shared input/render policy module, and
treat a `DPR_CAP` change as a policy amendment rather than a local tweak.

**Exit**: CSS size, camera aspect, and WebGL drawing-buffer size pass §9.2;
the context-loss test path in §10.1 recovers to a rendering state; the
`DPR_CAP` value is justified by recorded measurements rather than assumed.

### Phase 4 — shared geometry and projection contract

**Implementation status (2026-08-07):** the code is recorded in `f3dc4c4`,
`50ca962`, and `8987589`; the capture-only diagnostic allowlist follow-up is
`9fab531`. The SwiftShader and owner-certified hardware baselines are recorded
under `docs/baselines/phase-4-scorecard/`. Final delivery remains gated on
fresh independent QA; the AC-24 visual attachments are recorded in
`docs/phase-4-implementation.md`, and all five required gates are green.

- Add `hud-layout.ts` with pure geometry functions.
- Migrate the 53 `Math.random()` call sites to named seeded streams per
  §9.6.5, then record the first §9.6.3 scorecard baselines per renderer
  backend.
- Convert deck, crate, and monitor projection output to stage coordinates.
- Add validity checks and a frame identifier.
- Introduce one focused-HUD sampler and bounded last-valid behavior.
- Add the development overlay for safe frames and occupied HUD rectangles
  under `?hudDebug=1`.

**Exit**: existing placement is unchanged at the reference viewport, no
additional per-overlay rAF loops remain, repeated fixed-seed/fixed-time
captures are stable within the documented same-backend tolerance, and the
first backend-specific §9.6.3 baselines are recorded.

### Phase 5 — 3D fit and input normalization

- Define authored framing points for deck and crate.
- Add the cached projection-based fit solve.
- Reconcile the monitor fit with the same safe-frame contract.
- Separate hover parallax from contained-stage pan.
- Add nonlinear, live-viewport-normalized, full-range hover response.
- Add reference-dimension gain only for accumulated drag/trackpad/wheel/
  keyboard pan, plus normalized wheel deltas, reset, and reduced-motion
  behavior.
- Scope zoom/narrow panning to the cockpit container without trapping the
  outer page.

**Exit**: every focused subject fits its safe frame; the full Chromium
FIT-MATRIX plus HOVER-TRIO/PAN-SET automated evidence passes; and the owner
certifies the Phase 5 macOS precision-trackpad and owner-host detented-wheel
checkpoints. The deferred manual and browser rows named under Phase 8 remain
plan-final exit obligations.

### Phase 6 — re-anchor deck HUD

- Measure hint and arrow sizes.
- Anchor all three controls to the deck card rect.
- Add the return-control collision.
- Separate positioning wrappers from entrance animation.

**Exit**: the reported MacBook overlap is fixed and deck acceptance tests
pass.

### Phase 7 — re-anchor crate HUD

- Pass the crate rect into the browse controls.
- Anchor arrows and hint to the crate.
- Anchor the vinyl info card below/above the crate via the shared solver.
- Test longest project title and first/last disabled-arrow states.

**Exit**: crate acceptance tests pass.

### Phase 8 — enforcement, skill, and CI

- Expand the Phase 0 enforcement island to the full suite: browser geometry,
  action-parity, initial-HTML/content delivery, and automated accessibility
  tests across Chromium, Firefox, and WebKit.
- Expand the Phase 0 entrance-animation assertion across the final browser
  and viewport matrix as part of the geometry suite.
- Run the §9.6.3 scorecard across the final matrix using the deterministic,
  backend-specific baselines created in Phase 4; do not create a competing
  Phase 8 baseline set.
- Add narrowly scoped forbidden-pattern lint rules.
- Create and validate
  `.claude/skills/enforce-responsive-design/SKILL.md` using §A.8.
- Add the corresponding Codex instructions and ensure both agents point to
  the same neutral contract.
- Review screenshots for composition rather than pixel-perfect shader output.
- Add CI gates and the manual branded-browser/release checklist.
- Complete the deferred input-normalization exit obligations: re-run the
  Phase 5 automated traces in the expanded browser matrix; verify a Windows
  precision trackpad, a detented wheel mouse on Windows or Linux, and a
  ChromeOS touchpad; and verify Safari and Firefox wheel behavior through the
  Phase 8 browser projects. These obligations gate the plan-final
  input-normalization claim, not the Phase 5 implementation exit.
- Mark phases complete in this file.

**Production-gate the development surface.** Before the release build, assert
that every development-only affordance is absent from production output:

- the §9.6.1 `__COCKPIT_TEST_HOOKS__` bridge;
- the `?hudDebug=1` safe-frame/occupied-rect overlay from Phase 4;
- development-only warnings and diagnostic logging, including the §10 camera
  solver warning;
- any live-tuning setter kept only for authoring.

This is a build-output assertion run against the production bundle, not a
source-level review, and it is a release blocker. §9.6.1 requires the bridge
to be guarded; this is where that guarantee is verified against the artifact
actually shipped. The existing `window.__cockpit*` bridge is **not** covered
by this gate — CLAUDE.md defines it as a preserved runtime contract, and
§9.6.1 keeps the test hooks additive to it rather than folded into it.

Also review bundle size and large assets at this gate, and record the
deployment command, hosting assumptions, and residual risks alongside the
release checklist.

**Exit**: all §9 checks pass, the Claude skill triggers correctly, no
development surface is reachable in the production build, and future UI or
canonical-content changes cannot pass CI without their responsive,
accessibility, and content contracts.

---

## 9. Verification and acceptance criteria

### 9.1 CSS viewport matrix

Required normal-composition cases:

- `1024×600`
- `1024×768`
- `1280×720`
- `1280×800`
- `1366×650` (browser-chrome-constrained Chromebook/laptop)
- `1366×768`
- `1440×900`
- `1512×982`
- `1920×1080`
- `2048×1536`
- `2560×1440`
- `3440×1440`

Required zoom/narrow pressure cases:

- `800×450`
- `683×325`
- `512×300` (approximately the available layout pressure of `1024×600` at
  200% desktop zoom; not a substitute for a real zoom test)
- `320×568` for ordinary-content reflow

Large-display functional smoke case:

- `3840×2160`; no special visual optimization is required, but content scale
  must remain capped and functionality intact.

Treat these as **CSS viewport sizes**, not monitor panel resolutions.
Separately test real browser zoom at 120%, 150%, and 200% because a resized
test viewport does not reproduce every browser zoom behavior.

### 9.2 Renderer checks

After mount, live resize, and DPR change:

- `camera.aspect` equals stage CSS width divided by height within `0.001`;
- canvas CSS bounds equal stage CSS bounds within `1px`;
- drawing-buffer dimensions equal CSS dimensions multiplied by capped DPR
  within renderer rounding tolerance;
- projected DOM alignment does not move when only DPR changes;
- scale remains capped above the normal maximum rather than growing UI
  indefinitely;
- browser zoom is not counter-scaled;
- zero-size mount observations do not create `NaN`, `Infinity`, or a WebGL
  error.

### 9.3 Geometry checks

At each required normal viewport, in deck and crate steady states:

- every visible HUD rect contains finite values;
- every interactive HUD rect is inside the stage edge gutter;
- subject-to-hint, subject-to-arrow, and subject-to-info gaps meet the shared
  minimum;
- hint, arrows, info card, and return control do not intersect one another;
- arrows do not intersect the projected subject;
- each arrow hit area is at least `44×44`;
- the focused subject is contained in its safe frame;
- first and last records show the correct disabled arrow;
- the longest title remains contained in the info card.

In monitor steady state:

- the projected screen quad is contained in its safe frame;
- each `ScreenDialog` corner aligns with its corresponding projected 3D
  screen corner within `1px`;
- the return control remains reachable and does not cover the interactive
  screen.

Run the same checks after resizing an already-focused view, not only after
loading directly at the final size. Allow at most two animation frames for
geometry to settle after a resize notification.

During a deck swap:

- arrows remain disabled while busy;
- the last valid card rect is retained only for the documented grace period;
- retained geometry clears on mode exit;
- controls never jump to viewport edges because of a one-frame null rect.

In zoom/narrow mode:

- the cockpit has one bounded, labelled panning region;
- ordinary document content does not inherit two-dimensional scrolling;
- all cockpit controls are reachable by panning or through the DOM
  alternative;
- the page-level `VIEW PROJECTS` path remains visible or keyboard-reachable;
- the normal-mode scroll-reset handler does not cancel intentional contained
  panning.

### 9.4 Input normalization checks

Run the same logical **hover** input traces at `1440×900`, `1024×600`,
and `512×300`. Run accumulated-pan browser traces at the four declared
contained cases: `800×450`, `683×325`, `512×300`, and `320×568`.
Verify the `sizeRatio` curve at the original trio (`1.0` / `≈0.667` /
`0.45`) as pure unit evidence over `sizeRatioFor()`. For the browser pan
traces, accumulated movement at each contained case is inversely
proportional to its `sizeRatio`: `800×450` requires ≈2× the reference
input; `683×325`, `512×300`, and `320×568` require ≈2.2× at the floor.

- **hover free-look reaches full bounded yaw and pitch at the stage edge on
  every supported viewport** — this is the primary regression guard against
  reintroducing a reference-dimension divisor on hover;
- hover response near center is progressively damped as the viewport
  shrinks, per `responseExponent`, without changing reachable range;
- `sizeRatio` is applied to accumulated drag/trackpad/wheel/keyboard pan
  only, and never to absolute hover mapping;
- accumulated drag/trackpad movement uses the documented `sizeRatio`, so
  smaller viewports require more input for equal logical pan;
- maximum yaw/pitch remains bounded;
- the full allowed pan range remains reachable through accumulated input;
- pixel-, line-, and page-mode wheel events normalize to comparable logical
  displacement;
- extreme delta spikes are clamped without making fine trackpad movement
  unresponsive;
- arrow-key/WASD panning and reset-to-center work without a pointer;
- reduced-motion mode removes parallax and inertia while keeping explicit
  panning functional;
- scrolling outside the cockpit continues to move the document normally;
- no platform or browser user-agent string selects an input multiplier.

Tune the initial `0.45–1` `sizeRatio` and the `1.0 → 1.5–1.7`
`responseExponent` curve only from these traces and manual hardware testing.
Record any change in the shared input policy so future scenes inherit it.
Tuning `responseExponent` must never be used to reduce reachable hover
range.

Phase 5 manual input coverage must include:

- a macOS precision trackpad;
- a detented wheel mouse on the owner's host.

Phase 8 manual input coverage must include the deferred plan-final
obligations: a Windows precision trackpad; a detented wheel mouse on Windows
or Linux; a ChromeOS touchpad; and Safari and Firefox wheel behavior through
the expanded browser projects. Chromium automated traces, full fit evidence,
and the Phase 5 owner checkpoints remain required for the Phase 5 exit.

As pure unit evidence, the `sizeRatio` curve keeps the original reference
expectations: `1024×600` requires approximately `1.5×` the accumulated
movement of `1440×900`, while `512×300` requires approximately `2.2×`.
At the contained browser cases, the full allowed pan range must still be
reachable in a few deliberate drag or trackpad gestures.

### 9.5 Accessibility and action-parity checks

At minimum:

- text reaches 200% without clipped, obscured, or missing content or
  functionality;
- ordinary non-exempt content reflows at `320px` width without requiring
  two-dimensional reading;
- every meaningful cockpit function in §A.4 is available with WebGL disabled;
- the site can be completed by keyboard with logical, visible, unobscured
  focus and no trap;
- hover content is also available through focus or activation and can be
  dismissed where required;
- controls meet WCAG 2.2 AA target size/spacing, with project controls using
  the preferred `44×44` target;
- dark, light, high-contrast, and reduced-transparency token combinations
  meet contrast requirements;
- system reduced-motion defaults correctly and every explicit override
  persists and resets;
- reduced motion skips boot/warp and nonessential 3D motion without hiding
  state changes;
- the accessibility dialog remains operable at `320×568`;
- with JavaScript enabled, the `ACCESSIBILITY` trigger is operable before
  any boot animation or timed cinematic begins (§A.4.3 tier 2);
- automated accessibility scans report no accepted violation without a
  documented manual review.

Automation cannot prove full WCAG conformance. Complete manual keyboard,
screen-reader, zoom, forced-color/high-contrast, and motion review before a
release.

#### 9.5.1 Canonical content and non-interactive-agent checks

These checks verify delivery, not the behavior of a particular proprietary
recruiting product:

- request `/`, `/projects`, every `/projects/[slug]`, and `/about`
  directly and assert that the required headings, summaries, roles,
  contributions, outcomes, skills/tools, statuses, and ordinary links exist
  in the response-derived DOM before hydration;
- repeat navigation in a browser with JavaScript disabled and confirm that
  no essential fact or route depends on boot, hover, canvas, WebGL, a texture,
  or client state;
- assert that the initial `/` response visibly links to `/projects` and
  `/about`; assert `/recruiter` permanently redirects to `/about`; a crawler
  must not have to infer routes from a canvas;
- validate project/profile schemas, unique IDs/slugs, internal and canonical
  URLs, non-empty alternatives, and JSON serialization;
- after Phase 0B, recompute every §A.4.2 approval hash, reject
  missing/stale/unknown approval records, and assert that approval metadata
  is absent from HTML, JSON-LD, and `/portfolio.json`;
- generate visible page models, metadata, JSON-LD, and `/portfolio.json` from
  the same fixture in tests, then compare identity, title, summary, role,
  date/status, URL, image, and project count fields for consistency;
- parse every JSON-LD block, require the declared §A.4.2 types, and reject
  structured facts not present on the corresponding visible page;
- assert that `sitemap.xml` contains every canonical HTML route and that
  `robots.txt`, route metadata, or response headers do not apply `noindex` or
  crawler blocks unintentionally;
- assert that each cockpit project/action maps to a normal canonical link and
  that decorative 3D labels contain no unique project facts;
- verify `/portfolio.json` has a documented schema version and canonical HTML
  URLs, while treating failure to discover that endpoint as harmless because
  the HTML remains complete;
- inspect the public copy manually for accuracy, ownership clarity, and
  honest outcomes. Automated tests can require fields and consistency but
  cannot determine whether a claimed metric is true.

Do not pass these checks by injecting hidden duplicate prose. Tests should
query visible semantic content and accessible names. A page that contains
the words only in JSON-LD, off-screen crawler content, or a `<noscript>`
duplicate fails the contract.

The acceptance statement is deliberately bounded: the site makes its
portfolio content complete, standards-based, discoverable, and independent
of cockpit interaction. It does not promise selection, ranking, or correct
interpretation by every AI recruiter.

### 9.6 Browser automation

Use a browser test runner rather than a hand-written CDP driver unless the
project has a reason to avoid the dependency. A Playwright setup can:

1. start the Next.js app;
2. click the boot entry control by accessible role/name;
3. enter crate and deck through stable user actions or a development-only
   test bridge;
4. wait for camera transitions and `busy === false`;
5. collect `data-hud` and projected-subject rects;
6. run the numeric assertions above;
7. run the §A.4.3 tiers as separate projects: JavaScript disabled → tier-1
   content/link assertions only; WebGL disabled → tier-2 interactive
   parity including settings persistence;
8. fetch the initial HTML and validate content contracts, canonical links,
   metadata, and structured data without relying on hydration;
9. emulate motion/contrast preferences and run accessibility scans;
10. capture console, page, and network errors for the whole run (§9.6.4);
11. capture a screenshot for visual review.

If a test bridge is needed, expose the smallest deterministic development
API possible and exclude it from production behavior. Do not base tests on
hard-coded click coordinates.

The techniques below (§9.6.1–9.6.4) make steps 3, 6, 9, and 10 concrete,
and §9.6.5 supplies the determinism the scorecard depends on. §9.6.1–9.6.4
are adapted from
[majidmanzarpour/threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills)
(MIT), which solves the same problems for Three.js browser games. We adopt
the techniques only — that skill set assumes Vite and a game architecture and
is not installed in this project.

#### 9.6.1 Deterministic test bridge

The `[ENTER THE ROOM]` boot gate blocks every headless entry path, and the
existing `window.__cockpit*` surface is a live-tuning bridge, not a test
contract. Synthesizing keypresses through the boot cinematic is slow and
timing-dependent.

Expose one namespaced, development-only hook — modelled on the game skills'
`__THREE_GAME_TEST_HOOKS__` pattern — that is tree-shaken or guarded out of
production builds:

```ts
window.__COCKPIT_TEST_HOOKS__ = {
  configureVisualCapture(config: {
    seed: string
    timeMs: number
    pauseAmbient: true
  }): void                    // must run before skipIntro/scene construction
  skipIntro(): void            // mount the cockpit directly, no boot/warp
  enterView(mode: ViewMode): Promise<void>  // resolves after the camera transition settles
  playRecord(index: number): Promise<void>  // resolves on landed, busy === false
  getHudSnapshot(): {                       // one atomic read, single frame
    stage: Rect
    subject: ProjectedRect | null
    overlays: Record<string, Rect>
    safeFrame: Rect
    frameId: number
  }
  isSettled(): boolean         // no flight, no camera lerp, no card fade in progress
}
```

Requirements:

- **Pre-mount visual configuration.** `configureVisualCapture()` is
  test-build-only, accepts the fixed seed/capture time/ambient pause, and
  throws if called after `skipIntro()` or any scene construction begins.
  Phase 0 reserves and tests the lifecycle guard; Phase 4 connects it to the
  named random streams and frozen clock. A setter added after scene mount
  does not satisfy §9.6.5.
- **One atomic snapshot.** `getHudSnapshot()` must read every rect within a
  single frame using the §5.3 sampler, so assertions never compare rects from
  two different frames.
- **Promises resolve on settled state, not timeouts.** `isSettled()` is the
  gate; §9.3's "allow at most two animation frames to settle" is asserted,
  not slept through.
- **Guarded out of production.** Behind the dev/test condition, and asserted
  absent by a production-build test.
- **Additive only.** It must not replace or alter the existing
  `window.__cockpit*` contract, which stays as-is per CLAUDE.md.

This is the "smallest deterministic development API" the paragraph above
already calls for; the hook list is the specific shape.

#### 9.6.2 Canvas render verification

Every geometry assertion presupposes something was actually drawn. A WebGL
context loss, a shader compile failure, or a camera solve that placed the
subject behind the near plane all produce a **blank canvas with perfectly
valid HUD rects** — a silent pass.

Before running assertions at each viewport, verify the canvas rendered:

1. Read the drawing buffer (`toDataURL` on the WebGL canvas, or
   `readPixels` where the context allows).
2. Compute the fraction of non-background pixels and the count of distinct
   colors.
3. Fail if the frame is blank, uniformly one color, or below a minimum
   non-background fraction.

Because `preserveDrawingBuffer` is `false` on the main renderer
([globe-canvas.tsx](../components/cockpit/globe-canvas.tsx)) — unlike the
warp renderer, which sets it `true` — the read must happen inside a frame
callback, or the test path must enable preservation. Decide this in Phase 0;
do not silently flip the flag in production.

Run this as a precondition, not a separate suite: a blank canvas invalidates
every other result at that viewport.

#### 9.6.3 Visual scorecard instead of pixel diffing

§9.7 rules out pixel-perfect comparison of software-rendered WebGL against
Metal-rendered references, which leaves screenshot review with no automated
component at all. Measured aggregate metrics close that gap — they are
robust to rasterization differences while still catching real regressions:

| Metric | Catches |
|---|---|
| Color entropy | Scene collapsed to flat/washed output; lost material variety |
| Edge density | Wireframe glow, decals, or type failing to render |
| Luminance contrast | Theme inversion broken; high-contrast mode not applied |
| Dominant-color share | Scene collapsed toward one colour — the subject failed to draw, or a transmissive surface degenerated to an opaque slab |

These are the four metrics measured by the reference implementation
(`inspect-threejs-canvas.mjs` in the game-skills repo). Dominant-color share
replaces the "background-region occupancy" metric drafted in revision 2: it
is better defined, needs no per-view region mask, and catches the same
class of failure.

Assert **per-viewport tolerance bands** rather than exact values, and record
baselines per renderer backend — a SwiftShader baseline and a hardware
baseline are different reference sets and must never be compared to each
other. Where a metric exceeds its band, the failure must be resolved or the
tradeoff documented; an over-budget row may not be silently rebaselined.

The scorecard's regression claim is only valid against a deterministic
frame; §9.6.5 is therefore a prerequisite for these baselines. Without it,
scene construction differs on every load and the tolerance bands are either
flaky or meaningless.

This is a smoke check on composition, not a substitute for the human review
in §9.7. It answers "did the render collapse"; a person still answers "does
it read well."

#### 9.6.4 Console, page, and network error capture

Every check in §9.3–§9.6.3 can pass while the run logs a shader compile
failure, a rejected texture fetch, or an unhandled rejection. Capture the
error stream for the whole run and fail on anything not explicitly allowed.

Capture:

- console `error` and `warning` entries;
- uncaught exceptions and unhandled promise rejections;
- failed network requests (non-2xx and aborted).

This is cheap and high-yield in this project specifically:

- `public/micrographics/` holds 70 SVG sheets rasterized through
  [decals.ts](../components/cockpit/decals.ts); a broken sheet currently
  fails silently — its only handler is an `img.onerror` that revokes the
  object URL and reports nothing.
- Shader compile failures in the beam and warp GLSL surface as console
  errors, not as exceptions, and would otherwise pass every geometry check.
- `@pmndrs/vanilla` went missing from `node_modules` once already; an
  import-time failure must fail the suite loudly.

**Allowlist, don't disable.** Known-benign entries are matched by explicit
pattern with a comment giving the reason and a review date. Seed it with the
documented weather reverse-geocode CORS fallback on localhost, which is
expected behavior rather than a defect. Any allowlist entry that stops
matching should be removed, not left to hide a future error.

#### 9.6.5 Deterministic scene state for visual capture

**Verified**: scene construction is nondeterministic — 42 source lines
carrying 53 `Math.random()` invocations across seven cockpit modules
(source-line counts: coffee 6, glass-mac 7, incense 9, tea-set 9,
vinyl-crate 4, boot-screen 3, globe-canvas 4 — the starfield at
[globe-canvas.tsx:136](../components/cockpit/globe-canvas.tsx)). Every page
load builds a different starfield and different prop jitter, so no two
scorecard captures see the same frame.

Rules for the test path:

- **Preserve natural randomness in production.** Determinism is a test-build
  behavior; the live site keeps its organic variation.
- **Inject a fixed seed before scene construction in test builds**, through
  `configureVisualCapture()` in §9.6.1 before `skipIntro()` — never after the
  scene has already built. The hook must reject late configuration rather
  than silently reseeding only part of the scene.
- **Use separate named random streams** per subsystem — starfield, textures,
  steam, prop jitter — so a call-order change in one subsystem does not
  shift every other subsystem's values and invalidate unrelated baselines.
- **Freeze the animation clock or pause ambient animation during capture.**
  A deterministic build still animates; the platter spin, card bob, and
  steam would otherwise make frame N and frame N+1 different captures.
- **Never monkey-patch global `Math.random`.** The seams are explicit stream
  objects passed to (or imported by) the builders; patching the global would
  also capture third-party and framework calls and is order-dependent.
- **Keep separate tolerance baselines for SwiftShader and hardware
  rendering** (restating §9.6.3's rule — seeding does not merge them; the
  rasterizers still differ).
- **Retain the §9.6.2 blank-frame check independently.** It must keep
  working on *any* build, seeded or not; it is the production-shaped smoke
  check and must not grow a dependency on the deterministic path.

Migrating 53 call sites to streams is mechanical but touches seven modules.
The per-file figures above are **source-line counts**, not invocation counts:
coffee 6, glass-mac 7, incense 9, tea-set 9, vinyl-crate 4, boot-screen 3,
and globe-canvas 4. Migration belongs to Phase 4 alongside the
projection/sampler work; Phase 4 records the first backend-specific scorecard
baselines immediately after deterministic capture passes. Phase 8 consumes
and expands those baselines across the final matrix—it does not create a
different baseline set. New scene code must take a named stream argument from
the start.

Use Chromium, Firefox, and WebKit projects in CI. Before release, run branded
browser smoke checks:

| Platform | Required browsers |
|---|---|
| macOS | Safari, Chrome, Firefox |
| Windows | Edge, Chrome, Firefox |
| Linux | Chrome or Chromium, Firefox |
| ChromeOS | Chrome |

The goal is functional and compositional parity within tolerance, not
pixel-identical rasterization.

### 9.7 Visual review

Geometry tests answer whether elements fit and collide. Screenshot review
answers whether the composition still reads well.

Review:

- editorial hierarchy;
- visual balance at 4:3 and 21:9 extremes;
- whether compact fallback appears intentionally designed;
- shader/material behavior only as a smoke check, not a pixel diff;
- dark, light, high-contrast, and reduced-transparency states;
- normal, contained/pannable, and DOM-alternative experiences.

Software-rendered WebGL screenshots should not be used for strict
pixel-by-pixel comparisons with Metal-rendered reference images. The
automated portion of this review is the §9.6.3 scorecard, which measures
aggregate composition metrics instead. Human review covers everything the
scorecard cannot express.

### 9.8 CI

After local browser tests are stable, add a GitHub Actions job that installs
the browser runtime, builds or starts the app, and runs lint, contracts, unit,
initial-HTML/content, approval-hash, schema/structured-data consistency,
geometry, action-parity, and automated accessibility tests. Upload
screenshots, response/contract diagnostics, and geometry diagnostics only on
failure to keep artifacts useful.

Parallel agents are optional for subjective screenshot critique; they are
not required for deterministic viewport coverage and should not replace CI.

---

## 10. Failure handling and rollback

- If the camera solver fails to find a distance, use the last valid distance,
  log one development warning, and hide nonessential hints. Never apply a
  non-finite camera pose.
- If a subject projection is temporarily invalid, keep controls disabled and
  apply only the bounded grace rule. Do not fall back to unrelated viewport
  constants.
- If an overlay has not been measured, keep it visually hidden but mounted.
- If the viewport is below the normal composition threshold, enter the
  hybrid zoom/narrow tier. Reflow ordinary content, contain/pan the cockpit,
  and keep the DOM alternative reachable.
- If contained panning fails, fall back to the semantic project experience
  rather than clipping content or trapping focus.
- If the cockpit, hydration, JavaScript, or WebGL fails, the initial document
  and canonical routes still expose project/About navigation and all
  essential portfolio content.
- If structured-data or supplementary JSON generation fails validation,
  fail the build rather than publishing a representation that contradicts
  visible HTML. The visible server-rendered routes remain the source of
  truth.
- If an accessibility preference cannot be applied to a decorative effect,
  disable that effect; content and actions take priority over motion or
  translucency.

Renderer sizing, projection normalization, camera fitting, deck placement,
crate placement, input normalization, DOM parity, canonical content delivery,
structured-data generation, WebGL context recovery, and accessibility
settings remain separable rollback boundaries.

### 10.1 WebGL context loss — delivered in Phase 3

**Implementation status: complete in the reviewable worktree** (2026-08-03;
independent QA and controller delivery commit pending).

The pre-Phase-3 audit found no `webglcontextlost` listener, restore path, or
user-facing message. That historical gap is now closed. Context loss remains
a normal browser event — GPU reset, sleep/wake, long-background eviction, or
too many live WebGL contexts — and §9.6.2's blank-canvas check remains its
test-side detector.

Delivered handling:

- **Listen at initialization**, on the canvas from both
  [globe-canvas.tsx](../components/cockpit/globe-canvas.tsx) and
  [warp-transition.tsx](../components/cockpit/warp-transition.tsx). Register
  before first render, not after.
- **Call `preventDefault()` on `webglcontextlost`.** Without it the browser
  never fires `webglcontextrestored` and recovery is impossible.
- **Stop the render loop and mark the scene unavailable** while lost. Do not
  keep issuing draw calls against a dead context.
- **Rebuild on `webglcontextrestored`**: renderer, PMREM environment,
  materials, textures, and decal canvases must all be recreated. GPU-side
  resources do not survive.
- **Persist only durable state** — view mode, theme, accessibility
  preferences, selected record index. Discard transient state: disc flight,
  card fade, tonearm pose, coffee liquid levels, camera lerp progress.
  Restore to a clean at-rest cockpit in the last view mode, never mid-flight.
- **Brief delay before rebuilding**, so the GPU process has stabilized.
- **Distinguish first-load failure from post-loss blocking.** A browser that
  refuses a context after repeated loss needs a different message than one
  that never supported WebGL. In both terminal cases, route the user to the
  canonical content path from §A.4.2 rather than leaving a blank stage —
  the content contract already guarantees somewhere useful to send them.

Detection differs from the WebGPU pattern this is adapted from — events
rather than a `device.lost` promise — but the state-persistence and rebuild
discipline transfers directly. Adapted from
[dgreenheck/webgpu-claude-skill](https://github.com/dgreenheck/webgpu-claude-skill)
(MIT), whose WebGPU/TSL content is otherwise inapplicable here (§0.1,
amendment 7).

**Test path**: force loss with the `WEBGL_lose_context` extension
(`loseContext()` / `restoreContext()`) in the Phase 3 browser tests, and
assert that the scene returns to a rendering state passing §9.6.2. Chrome's
`about:gpucrash` remains the one-time manual verification for real
driver-level loss, which the extension does not fully reproduce. The owner
certified that production recovery run in
`docs/baselines/phase-3-dpr/OWNER-CHECKPOINT-2026-08-02.md`; no agent
self-certified it.

---

## 11. Documentation updates

When implementation lands:

- **docs/responsive-system.md** — neutral technical source for responsive
  tiers, layout/content contracts, canonical content delivery, primitives,
  3D fit, input scaling, and accessibility.
- **CLAUDE.md** — add the mandatory automatic skill rule from §A.8 plus a
  compact current-state summary.
- **AGENTS.md** — add the equivalent Codex workflow and validation rule.
- **DESIGN.md** — document invariants, permitted adaptations, stage chrome
  versus subject-attached HUD, canonical content rules, and the new-page/
  new-project checklist.
- **Claude skill** — create and validate
  `.claude/skills/enforce-responsive-design/` using §A.8.
- **This file** — change the status and mark each completed phase with its
  commit or pull request.

Avoid line-number-dependent documentation where possible; refer to stable
component and function names because this work will move the current lines.

---

## 12. Explicitly out of scope

### Mobile presentation

Mobile layout and content presentation need a separate design plan:

- free-look is cursor-driven;
- hover is part of the current object interaction language;
- the scene has no mobile GPU budget;
- boot and warp are a costly first-load gate on cellular.

A mobile fallback will likely present the same `PROJECTS` catalog through a
different UI rather than compressing the cockpit. Track that separately in
the proposed `docs/mobile-fallback-plan.md`.

Touch and precision-trackpad support for the desktop/laptop hybrid cockpit is
not excluded: Phase 5 must normalize explicit drag and trackpad panning.
What remains out of scope is a complete phone/tablet composition and mobile
GPU art direction.

### Adaptive render scaling

This plan keeps DPR synchronized and capped; it does not dynamically lower
or raise render resolution based on frame time. That feature needs its own
performance targets, hysteresis rules, quality floor, and device test matrix.
