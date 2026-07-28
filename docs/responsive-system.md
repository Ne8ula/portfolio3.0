# Responsive and Canonical-Content System — Technical Contract

This is the durable, neutral specification for the portfolio's responsive
layout, 3D framing, input, canonical-content, and enforcement systems. Agents
and humans read THIS document for day-to-day rules.
[docs/hud-responsive-layout-plan.md](hud-responsive-layout-plan.md) (cited
below as "the plan") remains the authority for any detail not yet resolved
here and for phase-by-phase implementation instructions.

Enforcement is executable: the modules under `lib/` are a strict TypeScript
island (no `@ts-nocheck`), validated by `scripts/validate-contracts.ts`,
unit tests, and a browser smoke harness. See §10 for the commands.

## 1. Support contract

The guarantee is not pixel-identical rendering. Font rasterization, WebGL
drivers, browser chrome, and fractional-pixel rounding vary. The guarantee
is (plan §A.1):

> Every supported page preserves its content, hierarchy, visual language,
> protected composition, and available actions within documented tolerances
> across the browser and viewport matrix.

For content-bearing routes, "preserves its content" also means essential
public identity and project information exists in visible, server-rendered
semantic HTML and remains understandable without JavaScript, WebGL, hover,
or cockpit navigation (§7).

Dimensions are **CSS viewport** sizes, never advertised monitor resolution.
The normal range is `1024×600` – `3440×1536`. Ranges live in the
`SUPPORT_PROFILES` registry in
[lib/responsive/layout-contract.ts](../lib/responsive/layout-contract.ts);
`desktop-laptop-v1` is currently the **only** allowed profile
(`ALLOWED_SUPPORT_PROFILES`). A future mobile plan adds a new profile as a
reviewed change to that registry — never by mutating per-contract literals.

Displays above the normal range stay functional but get no special 5K art
direction: clamp content scale and line length, keep the maximum designed
composition, and grow negative space or ambient scene background.

## 2. Responsive tiers

Never attempt to detect browser zoom, and never counter-scale text or UI to
cancel the user's zoom. Desktop zoom and a resized window both reduce the
available CSS viewport; the system responds to available space only
(plan §A.2). At 200% zoom, content must magnify; layout may adapt, but
content and functionality may not be clipped or lost.

| Tier | Available CSS viewport | Required behavior |
|---|---|---|
| Normal | at least `1024×600` | Dynamically frame 3D; reposition and proportionally scale DOM layout within design rules |
| Zoom/narrow | below either normal threshold | Reflow ordinary content and navigation; place the cockpit in a contained pannable region |
| Reflow floor | down to `320px` content width | Non-exempt content remains readable and operable in one primary scroll direction |
| Large | above `3440×1536` | Keep the designed maximum scale; center or reveal ambient background |

Runtime tier selection is `selectResponsiveTier()` in
[lib/responsive/tiers.ts](../lib/responsive/tiers.ts). The 320px reflow
floor is a guarantee *inside* `zoom-narrow`, not a separate runtime tier.
Declared viewport cases use `large-smoke` naming because the large tier is
exercised as a functional smoke case. The required §9.1 viewport matrix is
`REQUIRED_VIEWPORT_CASES` in `layout-contract.ts`.

## 3. Terminology and coordinate systems

Keep these terms distinct (plan §1):

| Term | Meaning | Used by |
|---|---|---|
| CSS viewport | Stage size in CSS pixels, after browser zoom and chrome | DOM HUD, camera aspect |
| Device pixel ratio (DPR) | Physical pixels per CSS pixel | WebGL backing buffer only |
| Stage coordinates | CSS pixels relative to the cockpit stage's top-left | All HUD layout functions |
| Projected rect | Unclamped stage-coordinate rectangle enclosing a 3D subject | Object-related HUD anchors |
| Safe frame | The stage minus edge and persistent-HUD reservations | Camera fitting and overlay placement |
| Render resolution | WebGL drawing-buffer width and height | Sharpness and GPU cost, never HUD position |

Changing DPR must not change any HUD position. Changing the CSS viewport may
change camera framing and HUD position, but the result must still meet the
plan §9 acceptance criteria. There is no adaptive performance resolution (no DPR lowering on
FPS drops); if wanted later it is a separate, measured feature.

Pure rectangle/stage geometry lives in
[lib/responsive/geometry.ts](../lib/responsive/geometry.ts) (stage
coordinates: CSS pixels, +y down, origin at the stage's top-left).

## 4. Layout law

The single placement rule (plan §3):

> If a DOM element describes or controls a 3D subject, it anchors to that
> subject's projected geometry. If it is application chrome, it anchors to
> the stage. CSS pixels may define gaps, padding, and minimum hit areas, but
> not an unrelated absolute subject position.

CSS constants are valid only when they describe spacing, not subject
position:

- minimum stage-edge gutter;
- subject-to-overlay gap;
- minimum button hit area;
- collision tolerance between HUD elements;
- a short last-valid-projection grace period during a deck swap (never on
  mode exit).

Values live in one shared module (Phase 4's
`components/cockpit/hud-layout.ts`, composing the primitives in
`lib/responsive/geometry.ts`) — never as repeated numeric literals in JSX.
Never clamp the projected subject rect itself: clamping destroys the
information needed to decide that camera framing is wrong. Starting token
values and the solver shape are in plan §3.

## 5. 3D fit policy

Models never resize, deform, or independently rearrange in response to
resolution. Model geometry, authored relative transforms, materials, and
hero hierarchy are preserved (plan §A.3). Responsive framing may change
only:

- camera aspect;
- camera distance and look target;
- visible negative space and ambient/peripheral scenery;
- projected positions of subject-attached HUD.

Protected hero subjects and interaction targets must remain inside the
per-view safe frame; the point-projection solver of plan §6 implements
this. Letterboxing is not the default — controlled compositional variation
is preferable to bars.

## 6. Input policy

[lib/responsive/input-policy.ts](../lib/responsive/input-policy.ts) is the
**single tuning module** for every input value. Nothing input-related is
selected by user-agent sniffing. "Cursor movement" is two behaviors with
two DIFFERENT mechanisms (plan §A.5) — do not merge them:

1. **Hover free-look** — normalized against the LIVE viewport, then shaped
   by `responseExponentFor(viewport)` (`1.0` at the reference `1440×900`,
   rising toward `1.7` at the smallest supported ratio). Because
   `1 ** e === 1`, the full `±22°` yaw / `±15°` pitch envelope is reachable
   at the stage edge on EVERY supported viewport; smaller viewports only
   damp response near center. Applying a reference-dimension divisor to
   hover (which would truncate the envelope) is the regression plan §9.4
   guards against.
2. **Contained-stage panning** — accumulated drag/trackpad/wheel/keyboard
   input has no reach ceiling, so it is scaled by `sizeRatioFor(viewport)`
   (floor `0.45`): a smaller viewport legitimately requires more movement
   for the same logical pan. `sizeRatio` applies ONLY here, never to hover.

Wheel input normalizes `WheelEvent.deltaMode` via `normalizeWheelDelta()`:
pixel deltas stay pixels, line deltas convert through the computed line
height, page deltas through the contained viewport dimension; results are
spike-clamped (`MAX_WHEEL_STEP_PX`). Maximum camera yaw/pitch stays bounded
independently of sensitivity. Reduced motion disables inertial continuation
and free-look parallax; explicit non-animated panning remains available.
Contained panning must not trap document scrolling (plan §A.5).

## 7. Canonical content

The visible semantic DOM is the canonical portfolio record. The cockpit may
select, arrange, animate, and decorate that record, but may not contain a
project fact, explanation, outcome, or action unavailable through an
ordinary document route (plan §A.4).

Strict schemas (server-safe, no `three`, no browser globals):

- `Project` in [lib/projects/catalog.ts](../lib/projects/catalog.ts) —
  identity, `status`, `tagline`, `summary`, `role`, `problem`,
  `contributions`, `outcomes`, `tools`, `skills`, `links`, `cover`, and a
  presentation-only `visual` block. Since Phase 0A/0B the catalog carries
  **owner-approved strict records** and validation
  ([lib/projects/validation.ts](../lib/projects/validation.ts)) is
  **blocking**. The cockpit reads the derived `SLEEVES` adapter
  (`sleeveRecord()`), which carries no unique facts — art titles, short
  labels, and palette come from the hashed-excluded `visual` tokens.
- `PublicProfile` in [lib/portfolio/profile.ts](../lib/portfolio/profile.ts)
  — `PROFILE` is the owner-approved record (validated blocking).

Required delivery surfaces, each declared as a `ContentContract`
(currently all `planned-phase-2`; Phase 2 flips them to `implemented`):

| Surface | Requirement (initial response) |
|---|---|
| `/` | Server-rendered identity/summary + visible ordinary links to VIEW PROJECTS, RECRUITER OVERVIEW, contact — before boot or hydration |
| `/projects` | Server-rendered complete project index with semantic headings, lists, summaries, roles, outcomes, normal links |
| `/projects/[slug]` | Server-rendered case study with all required fields and a canonical URL; coverage checked against every catalog slug |
| `/recruiter` | Server-rendered, print-friendly professional overview |

`/portfolio.json` is a **derivative** discovery aid generated from the same
sources ([lib/content/serializers.ts](../lib/content/serializers.ts)); it
carries canonical HTML URLs and never substitutes for visible HTML — which
is why it is intentionally excluded from `ContentContract.purpose`. JSON-LD
(`Person`, `CollectionPage`/`ItemList`, `CreativeWork`) is generated from
the same canonical source as the visible HTML; no fact may exist only in
JSON-LD. No crawler-only content: never render a duplicate corpus
off-screen, `display: none`, or `<noscript>`-only. The catalog stays free
of three.js per the §A.4.1 split — browser artwork generation lives in
`components/cockpit/project-textures.ts`, which imports the catalog, never
the reverse.

## 8. Degradation tiers

"Works without JavaScript" and "works without WebGL" are different
guarantees, tested separately (plan §A.4.3):

| Tier | Environment | Guarantee |
|---|---|---|
| 1 | JavaScript disabled | Server-rendered content, semantic headings, project/recruiter routes, ordinary links, and browser/system accessibility behavior (`prefers-*`, `forced-colors`) |
| 2 | JavaScript enabled, WebGL disabled | All meaningful interactive DOM alternatives: custom accessibility settings and persistence, theme persistence, dialogs, project controls |
| 3 | JavaScript and WebGL enabled | The full cockpit experience |

Settled rules:

- Accessibility-settings **persistence is tier 2, not tier 1**. At tier 1
  the user is protected by system preferences via CSS media queries and
  sensible defaults.
- **Do not emit an inert settings "control shell" into the no-JavaScript
  experience** — the settings dialog and its trigger are not tier-1
  requirements.
- At tier 2, the hydrated `ACCESSIBILITY` trigger must become **operable
  before any boot animation or timed cinematic begins** (delivered in
  Phase 1), so a user can change settings before motion starts.
- Tests must never assert tier-2 behavior in a tier-1 environment. Each
  meaningful action is implemented, explicitly decorative, or an explicitly
  named shared future feature; it may not disappear only because WebGL is
  unavailable.

Action-parity mapping (cockpit function → DOM equivalent) is in plan §A.4.2.

## 9. Owner approval workflow

Approval records live in `content/portfolio-approvals.json`, typed and
validated by
[lib/content/content-approval.ts](../lib/content/content-approval.ts):

- The hash is **SHA-256 (lowercase hex) over a stable, key-sorted
  serialization** of every public recruiter-facing field for the profile or
  project — including links and image alternatives, **excluding** the
  presentation-only `visual` field.
- Approval is a **manual owner decision**. Claude, Codex, and automation
  must **never create or refresh** an approval record without explicit
  owner confirmation for the exact content being hashed. `computeApprovalHash()`
  is owner tooling only — never call it to "fix" a failing check.
- A content change invalidates the prior hash and stays blocked until the
  owner reviews it. **Blocking since Phase 0B** (active): a missing or
  stale hash fails `npm run validate:contracts`. Structural manifest
  validity (unique known subjects, supported `schemaVersion`, RFC 3339
  UTC timestamps, 64-hex hash shape) is also blocking.
- Recording flow after an owner review:
  `npx tsx scripts/record-approvals.ts` rehashes all subjects — run it
  ONLY on explicit owner approval of the exact current content.
- The manifest is a tamper/staleness guard, not proof of truth or of human
  review. Approval metadata is never emitted through HTML, JSON-LD, or
  `/portfolio.json`.
- Known boundary (by §A.4.2 design): the presentation-only `visual` tokens
  are excluded from the hash yet some (sleeve art title, date/tools
  labels) are visible in the 3D cockpit. Editing them is a presentation
  change that no gate hashes — treat visual-token edits with the same care
  as any sleeve-visible change and keep them derivable from canonical
  fields wherever possible.

## 10. Contracts and enforcement

Every route/composed view declares a `LayoutContract`
([lib/responsive/layout-contract.ts](../lib/responsive/layout-contract.ts));
content-bearing routes additionally declare a `ContentContract`
([lib/content/content-contract.ts](../lib/content/content-contract.ts)).
Shapes, abbreviated:

```ts
type LayoutContract = {
  id: string
  supportProfile: SupportProfileId          // 'desktop-laptop-v1' only, today
  protectedRegions: readonly ProtectedRegion[]  // interactive ⇒ route/inline-controls alternative
  allowedAdaptations: readonly ('scale' | 'reposition' | 'reflow' | 'contain')[]
  accessibility: { keyboard: true; reflow: 'standard' | 'contained-complex-region'; states: … }
  viewportCases: readonly ViewportCase[]    // must cover REQUIRED_VIEWPORT_CASES
}

type ContentContract = {
  id: string
  route: `/${string}`
  implementation: 'planned-phase-2' | 'implemented'  // planned-… only for §A.4.2 surfaces
  purpose: 'entry' | 'project-index' | 'project-detail' | 'recruiter-summary'
  sources: readonly ('profile' | 'project-catalog')[]
  delivery: { serverRendered: true; javascriptIndependent: true; webglIndependent: true; visibleSemanticHtml: true }
  discoverability: { linkedFromInitialHtml: true; canonicalUrl: true; sitemap: true }
  structuredData: readonly ('Person' | 'CollectionPage' | 'ItemList' | 'CreativeWork' | …)[]
}
```

Contracts are declared with `satisfies LayoutContract` /
`satisfies ContentContract` and registered in
[lib/responsive/layout-contracts.ts](../lib/responsive/layout-contracts.ts)
and [lib/content/content-contracts.ts](../lib/content/content-contracts.ts).
Every `app/**/page.tsx` needs a co-located `layout-contract.ts` or a
documented exemption; the scan lives in
[scripts/validate-contracts.ts](../scripts/validate-contracts.ts) with pure
judgement in `lib/responsive/contract-validation.ts`.

DOM identifier scheme (used by diagnostics and browser tests):

| Attribute | Values |
|---|---|
| `data-layout-region` | `cockpit-stage` (the WebGL stage), `boot` (boot region), `app-shell` |
| `data-layout-contract` | the registered contract id (e.g. `cockpit-v1`) on the region root |
| `data-content-contract` | the content-contract id (e.g. `content-home-v1`) |
| `data-hud` | `site-header`, `return-control`, `vinyl-info-card`, `browse-arrow-prev`, `browse-arrow-next`, `browse-hint`, `screen-dialog`, `theme-toggle`, `boot-enter` |

Gate commands — run all of them before claiming a change done:

```
npm run lint                  # eslint . (scoped strict config, consistent-type-imports)
npm run typecheck:contracts   # tsc -p tsconfig.contracts.json (strict + noUncheckedIndexedAccess)
npm run validate:contracts    # tsx scripts/validate-contracts.ts (blocking vs pending)
npm run test:unit             # vitest run
npm run test:e2e              # playwright test (Chromium smoke, dev server)
```

`next build` proves nothing about types (`ignoreBuildErrors: true`, cockpit
modules are `@ts-nocheck`); CI runs the scoped typecheck directly.

## 11. Test bridge

`window.__COCKPIT_TEST_HOOKS__`
([components/cockpit/test-hooks.ts](../components/cockpit/test-hooks.ts))
is the deterministic development-only test bridge (plan §9.6.1). Shape:

```ts
type CockpitTestHooks = {
  configureVisualCapture(config: { seed: string; timeMs: number; pauseAmbient: true }): void
    // throws after skipIntro()/scene construction; Phase 4 wires seed + frozen clock
  skipIntro(): void                          // mount cockpit directly, no boot/warp
  enterView(mode: 'cockpit' | 'monitor' | 'crate' | 'deck'): Promise<void>  // resolves settled
  playRecord(index: number): Promise<void>   // resolves on landed, busy === false
  selectRecord(index: number): void          // Phase 0 addition — see note below
  getHudSnapshot(): Promise<HudSnapshot>     // one atomic read inside a single rAF
  isSettled(): boolean                       // settle gate; promises never sleep through timeouts
}
```

It is **additive only**: it never replaces or alters the preserved
`window.__cockpit*` live-tuning bridge.

`selectRecord` is a Phase 0 addition beyond the §9.6.1 minimum shape: it
puts the crate into its deterministic selection state (the legacy pull-out —
`selectedIdx` set, no deck flight). The Phase −1 entrance assertion needs it
because all three fixed overlays mount only while a record is selected, and
the deck-return selection window is too short to sample under software
rendering. Phase 8 reviews whether it stays.

Two settled Phase 0 decisions, recorded here as the durable rule:

1. **Production exclusion** = the `process.env.NODE_ENV !== 'production'`
   guard in `components/cockpit/test-hooks.ts`. Next.js inlines `NODE_ENV`,
   so the guard is statically eliminated from production bundles and the
   hook object is never attached. Browser tests therefore run against a
   **dev server** (see `playwright.config.ts` webServer); the Phase 8
   production gate builds for production and asserts
   `window.__COCKPIT_TEST_HOOKS__` is absent from the shipped artifact.
2. **§9.6.2 drawing-buffer read** = a synchronous in-frame forced
   re-render: call `renderer.render(scene, camera)` and then immediately
   `toDataURL()` **within the same JS task**, using the preserved
   `__cockpitRenderer` / `__cockpitScene` / `__cockpitCamera` bridge.
   `preserveDrawingBuffer` stays `false` in production and is never
   flipped — not even for the test path.

Blank-canvas verification (§9.6.2) is a precondition for every geometry
assertion: a blank frame invalidates every other result at that viewport.
Scorecard baselines (§9.6.3) require the §9.6.5 deterministic scene state
and are NOT recorded before Phase 4.

**Deferred to Phase 2 (tracked):** the §A.4.1 import-boundary lint rule —
no server component or `/projects` route may import `three`,
`components/cockpit/project-textures`, or any cockpit runtime module. It
lands with Phase 2's routes (there is no server component to protect yet);
until then the `import "client-only"` marker in `project-textures.ts` is
the active build-time boundary.

## 12. Phase status

| Phase | Delivers | Status |
|---|---|---|
| −1 | `termFadeIn` split (stable outer anchor / animated inner element) | Code complete; automated assertion in Phase 0 harness |
| 0 | The enforcement island: strict `lib/` contracts + validators, catalog/texture split, scoped typecheck, unit tests, Chromium smoke harness, test bridge, this document | **Delivered** |
| 0A | Owner-approved profile + six-project dossier (owner supplies facts) | **Delivered** (2026-07-28; all 7 records approved + hashed) |
| 0B | Strict catalog completeness + approval hashes become **blocking** | **Delivered** (gates active) |
| 1 | Shared responsive/accessibility foundation: tokens, `ResponsivePage`/`ResponsiveStage`/`SafeFrame` primitives, `AccessibilityProvider`, settings dialog, boot gating on the operable ACCESSIBILITY trigger | Pending |
| 2 | Server-rendered `/`, `/projects`, `/projects/[slug]`, `/recruiter`, metadata/JSON-LD/sitemap/`portfolio.json`; contracts flip to `implemented` | Pending (blocked by 1) |
| 3 | One idempotent renderer/viewport sizing function (`syncRendererSize`, DPR cap 2) | Pending |
| 4 | Projection bridge, hud-layout solver, seedable random streams, deterministic capture, first scorecard baselines | Pending |
| 5 | 3D fit solver + input normalization wiring | Pending |
| 6 / 7 | Re-anchor deck HUD / crate HUD (the known deck overlap is fixed HERE, not by an interim constant) | Pending |
| 8 | Full browser/viewport matrix, accessibility scans, production gate, enforcement skill, CI expansion | Pending |

Hard rules that survive every phase:

- The `window.__cockpit*` bridge documented in CLAUDE.md is **preserved**;
  test hooks stay additive and never alter it.
- three.js stays **imperative** — no React Three Fiber conversion.
- No stopgap layout fixes ship ahead of the system (plan §8); Phase −1 was
  the sole exception.

## 13. New-code rules

- **Randomness**: new scene code takes a **seedable named stream argument**
  (per-subsystem streams — starfield, textures, steam, prop jitter; plan
  §9.6.5). Never monkey-patch global `Math.random`; production keeps its
  natural variation, determinism is a test-build behavior.
- **New UI** composes the shared primitives once they exist
  (`ResponsivePage`, `ResponsiveStage`, `SafeFrame`, `ProjectedHud`,
  `AccessibleExperienceLink`, shared tokens) — no parallel breakpoint,
  projection, project-data, or recruiter-data systems.
- **New routes** declare a co-located `LayoutContract` (and a
  `ContentContract` if content-bearing), register it, and expose the
  matching `data-*` identifiers (§10).
- **Essential facts** go in the canonical catalog/profile — never only in
  JSX, canvas textures, 3D labels, hover state, or client-only modules.
- **Approval records** are owner-only (§9). An agent never writes to
  `content/portfolio-approvals.json`.
- **Agents run the gates** (§10 commands) before claiming a UI, layout, or
  content task done; failed required checks are unfinished work.

Unresolved details — token values under QA, solver internals, scorecard
tolerance bands, accessibility-dialog specifics — resolve against the plan
(§3, §6, §9.6.3, §A.6) until promoted into this document.
