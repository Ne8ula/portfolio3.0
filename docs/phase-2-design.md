# Phase 2 Design Specification — Canonical DOM and Recruiter-Readable Content Path

Role: Claude, design lead (`AGENTS.md` §"Three-agent roles").
Status: **APPROVED by the owner 2026-07-29.** Owner decisions D1–D9 are settled
(§11), including the exact `/about` prose to be hashed. **D10 was raised after
approval** (the canonical domain collides with the catalog's own links); its
recommended resolution is the default and requires no canonical content change,
so it does not block. Next role: **Codex implementation** — start at §12 Step 0.
No production code was written by design; this document is the brief, and
§11 is the decision record Codex and QA both read as authoritative.

Authorities read for this specification: `AGENTS.md`, `docs/agent-handoff.md`,
`DESIGN.md` (§§1–15), `docs/responsive-system.md`, the plan
(`docs/hud-responsive-layout-plan.md` §A.4, §A.4.1–A.4.3, §A.5–A.7, §8 Phase 2,
§9.5, §9.5.1), `docs/content-inventory.md`, live Git status, and the live
contract/canonical sources under `lib/`.

---

## 0. Phase 0 / Phase 1 acceptance verification

**Committed.** `main` is clean and level with `origin/main`. Phase 0, 0A, 0B and
Phase 1 are all in history:

| Phase | Commit |
|---|---|
| 0 — enforcement island | `b3d3315` |
| 0A — owner-approved content + hashes | `5dc7c70`, `12a3735` |
| 0B — strict gates become blocking | `4e64287` |
| 1 — responsive/accessibility foundation | `809607c` ("Accessibility Phase 0 and 1 commits") |

Phase 1 landed as one squashed commit rather than the three commits the previous
handoff proposed. That is a bookkeeping difference only; the content is present.

**Accepted.** Independent QA (Kimi, `docs/agent-handoff.md`,
2026-07-29T00:47:18Z) returned **Phase 0 = PASS, Phase 1 = PASS** with all five
gates green and every prior finding (F1–F5) resolved; F7 (ledger drift) was
closed by decision-ledger entry #26 in `docs/content-inventory.md`, which is
present in the committed tree.

**Re-verified independently this turn**, on the committed tree:

| Gate | Result |
|---|---|
| `npm run lint` | exit 0 |
| `npm run typecheck:contracts` | exit 0 |
| `npm run validate:contracts` | exit 0 — 3 layout, 4 content, 2 routes, 6 catalog records |
| `npm run test:unit` | 199/199 in 10 files |
| `npm run test:e2e` | 12 passed, 2 skipped (the two designed `test.fixme` markers: Phase 2 initial-HTML links, Phase 6 deck overlap) |

**Housekeeping carried into the Phase 2 commit** (documentation accuracy, not
product defects):

- H1. `docs/hud-responsive-layout-plan.md:1914` still says the Phase 1 commit
  hash is "to be recorded here on review/merge" — record `809607c`.
- H2. `docs/responsive-system.md` §12 still lists Phase 1 as "not yet
  committed" — correct it and move Phase 2 to "Delivered".
- H3. `e2e/smoke.spec.ts:17-24` console allowlist still names the weather chip,
  which the owner removed in Phase 1. Remove the stale allowlist entry so real
  network errors are not silently swallowed.

**Conclusion: Phase 2 is unblocked.**

---

## 1. Design intent for Phase 2

Phase 2 does not add a second portfolio. It makes the portfolio that already
exists in `lib/projects/catalog.ts` and `lib/portfolio/profile.ts` *legible
without the cockpit*, in the same design language.

The organising idea, consistent with `DESIGN.md` §1 and §10:

> The cockpit is the machine. The routes are the **archival catalogue** the
> machine reads from. The catalogue is a first-class printed artifact — an
> index card set and a set of liner notes — not a stripped-down fallback.

Three consequences that drive every decision below:

1. **The document exists first.** At first paint `/` is a real, readable,
   scrollable document carrying identity, role, summary, contact, and the six
   project links. The cockpit then mounts *above* it as an enhancement.
2. **One vocabulary, two presentations.** Nav labels, project ordering, project
   URLs, status wording, and counts come from one module each. The cockpit
   header and the document header cannot drift.
3. **The catalogue is explicit** (`DESIGN.md` §2 law 4). Real headings —
   Overview, Problem, Role, Contributions, Outcomes, Tools and skills, Next
   project. Vinyl language lives in composition, crops, micrographics and
   catalogue numbers, never in place of an information label.

### 1.1 What Phase 2 is not

Explicitly out of scope, to protect phase dependencies (`DESIGN.md` §14):

- No renderer/viewport sizing work (Phase 3), no projection or `hud-layout`
  solver (Phase 4), no 3D fit or input normalization (Phase 5), no deck/crate
  HUD re-anchoring (Phases 6/7). **The known deck HUD overlap stays.**
- No WebGL *context-loss* handling (Phase 3, §10.1). Phase 2 adds only an
  initial capability probe — see §6.3.
- No typography migration to Newsreader / IBM Plex, no lighting or
  scene-background migration. Those are scheduled rendered changes
  (`docs/design-visual-migration-handoff.md`). Phase 2 uses the existing role
  tokens `--font-display/ui/label/technical` so the migration remains a
  single coherent change later.
- No new canonical facts, no new metrics, no re-wording of approved content.

---

## 2. Route inventory, contracts, identifiers

| Route | Layout contract | Content contract | Purpose |
|---|---|---|---|
| `/` | `cockpit-v1` (amend) | `content-home-v1` | entry |
| `/projects` | `projects-index-v1` (relocate) | `content-projects-v1` | project index |
| `/projects/[slug]` | `project-detail-v1` (new) | `content-project-detail-v1` | project detail |
| `/about` | `about-v1` (new) | `content-about-v1` | professional summary |
| `/recruiter` | — (permanent redirect → `/about`) | — | legacy/guessable URL |
| `/portfolio.json` | — (route handler, no page) | — (derivative, deliberately uncontracted) | discovery aid |
| `/responsive-preview` | `responsive-preview-v1` | — | Phase 1 demo, `noindex`, excluded from sitemap |

**Owner decision D8 (2026-07-29): `/recruiter` becomes `/about`.** A route that
names its audience in the URL frames the portfolio as a job application rather
than a body of work. Every content requirement §A.4.2 places on the recruiter
surface — identity, target work, capabilities, evidence, project links,
contact, résumé link, print-friendliness — is unchanged and moves intact to
`/about`, which is the universal convention for exactly this page and carries
`schema.org/Person` just as naturally. `DESIGN.md` §12 already sanctions the
naming ("`About` **or** `Recruiter overview`"). `/recruiter` survives as a
permanent (308) redirect so the guessable URL still lands.

This requires a **plan amendment (Revision 7)**, because `/recruiter` is a
hard-coded required route in the validator. Exact edits in §2.1 and §12.

### 2.1 Contract changes

- **Relocate** `PROJECTS_INDEX_LAYOUT_CONTRACT` out of
  `lib/responsive/layout-contracts.ts` into `app/projects/layout-contract.ts`.
  The route-coverage scan (`scripts/validate-contracts.ts`) requires a
  co-located `layout-contract.ts` the moment `app/projects/page.tsx` exists;
  the registry keeps importing and re-exporting it.
- **New** `app/projects/[slug]/layout-contract.ts` → `project-detail-v1` and
  `app/about/layout-contract.ts` → `about-v1`. Both:
  `supportProfile: 'desktop-laptop-v1'`, `protectedRegions: []`,
  `allowedAdaptations: ['scale','reposition','reflow']`,
  `accessibility: { keyboard: true, reflow: 'standard', states: <all five> }`,
  `viewportCases: REQUIRED_VIEWPORT_CASES`.
- **Amend `cockpit-v1`**: add `'reflow'` to `allowedAdaptations` — the route now
  contains an ordinary reflowing document beneath the protected stage.
  `accessibility.reflow` stays `'contained-complex-region'`. The protected
  region's `{ kind: 'route', href: '/projects' }` alternative becomes live, so
  every `AccessibleExperienceLink` for it passes `routeImplemented`.
- **Extend `ROUTE_LAYOUT_CONTRACTS`** with `/projects`, `/projects/[slug]`,
  `/about` (keys must match the scanner's emitted route strings exactly,
  including the literal `[slug]` segment).
- **Revision 7 amendment — the `/recruiter` → `/about` rename.** Contained,
  reviewable, and touching only the surface's *path and label*, never its
  required content:
  - `lib/content/content-contract.ts`: `REQUIRED_CONTENT_ROUTES` swaps
    `'/recruiter'` → `'/about'`; `ROUTE_PURPOSES` maps `'/about'`;
    `ContentPurpose` renames `'recruiter-summary'` → `'professional-summary'`.
  - `lib/content/content-contracts.ts`: `RECRUITER_CONTENT_CONTRACT` →
    `ABOUT_CONTENT_CONTRACT`, id `content-about-v1`, route `/about`, purpose
    `professional-summary`, `structuredData: ['Person']` unchanged.
  - `tests/unit/content-contracts.test.ts` updated to the new identifiers.
  - `next.config.mjs`: permanent redirect `/recruiter` → `/about`.
  - Documentation: plan §A.4.2 required-surface table, §8 Phase 2 bullets and
    exit text, a new §0.6 "Revision 7 amendment" note recording the owner
    decision and its date; `docs/responsive-system.md` §7 delivery table.
  Nothing in the surface's *requirements* changes — a QA reviewer should be
  able to diff the requirement wording and find it identical apart from the
  path.
- **Flip all four `ContentContract`s** to `implementation: 'implemented'` and
  set `PHASE_2_COMPLETE = true` in `lib/content/content-contract.ts` **in the
  same commit as the routes**. The constant is the completion marker; from then
  on any remaining `planned-phase-2` fails validation.

### 2.2 DOM identifier scheme

`docs/responsive-system.md` §10 gains two documented values:

| Attribute | Added value | Meaning |
|---|---|---|
| `data-layout-region` | `cockpit-shell` | root of the client cockpit overlay on `/` |
| `data-hud` | `skip-link`, `primary-nav`, `appearance-control` | new stage chrome |

Per-route roots:

| Element | Attributes |
|---|---|
| `/` server shell root | `data-layout-region="app-shell"` `data-layout-contract="cockpit-v1"` `data-content-contract="content-home-v1"` |
| `/` cockpit overlay root | `data-layout-region="cockpit-shell"` |
| cockpit stage (unchanged) | `data-layout-region="cockpit-stage"` `data-layout-contract="cockpit-v1"` |
| `/projects` root | `data-layout-contract="projects-index-v1"` `data-content-contract="content-projects-v1"` |
| `/projects/[slug]` root | `data-layout-contract="project-detail-v1"` `data-content-contract="content-project-detail-v1"` |
| `/about` root | `data-layout-contract="about-v1"` `data-content-contract="content-about-v1"` |

`CockpitApp` **stops** rendering `data-layout-region="app-shell"` and
`data-content-contract` (its root becomes the `cockpit-shell` overlay); the
server shell owns both. There must remain exactly **one `<main>` per
document**, owned by the server shell.

---

## 3. `/` — the cold-start document and its cockpit

### 3.1 Boundary structure (exact, per §A.4.2)

```
app/page.tsx                          Server Component. Renders the shell:
                                      header + <main> canonical record + footer,
                                      then <CockpitEntry/>.
components/cockpit/cockpit-entry.tsx  Client Component. Owns
                                      dynamic(() => …cockpit-app, { ssr:false }),
                                      the WebGL probe, the overlay root, the
                                      inert handoff, and the scroll lock.
```

`app/page.tsx` imports **only** `cockpit-entry` — never `cockpit-app`, never
`three`, never `project-textures`. Enforced by the §A.4.1 lint rule (§8.3).

### 3.2 Composition — "the terminal has already printed the manifest"

The design problem is that a server-rendered landing document and a boot
terminal must not read as two competing compositions (§A.4.2: *"the server
shell should occupy the existing boot/header/navigation roles… without
duplicate copy or layout shift"*).

Resolution: the server document **is the pre-boot state of the same region**.
The boot screen already renders as a cream CRT terminal with ink text
(`boot-screen.tsx:214`, `background: var(--cream)`). The document is authored in
the same field, the same type roles, and the same left-column/centre rhythm, so
hydration reads as *the terminal waking up over a printout that was already
there*, not as a page swap.

Initial HTML of `/`, in order:

1. **Skip link** — `data-hud="skip-link"`, first focusable, → `#main`.
2. **`<header>` (banner)** — the identity lockup (existing A · XIONG · studio
   mark) and `<nav aria-label="Primary" data-hud="primary-nav">` with real
   anchors: **Projects** → `/projects`, **About** → `/about`, **Contact** →
   `mailto:` from `PROFILE.links`, **Résumé (PDF)** → `PROFILE.resumeUrl`.
3. **`<main id="main" tabindex="-1">`**
   - `<h1>` `PROFILE.name` — display role type.
   - Role line — `PROFILE.targetRole` ("Creative Technologist"), plain, stable.
     `DESIGN.md` §4 permits the type-on once at tier 3; the DOM text is never
     animated away and reduced motion renders it immediately.
   - `PROFILE.summary` — one paragraph, 60–72ch measure.
   - Capabilities — `<ul>` from `PROFILE.capabilities`.
   - **Primary actions** — the three contract-required links repeated as
     prominent controls: *View projects*, *About*, *Contact*.
   - **Catalogue manifest** — `<ol>` of the six projects in catalog order,
     styled as a directory listing (catalogue number is decorative; the real
     content is the link). Each row: linked title → `/projects/<slug>`,
     category, date, status, tagline. This is what makes project discovery
     independent of the canvas (§9.5.1: *"a crawler must not have to infer
     routes from a canvas"*).
   - **`<noscript>`** — one concise sentence: the 3D cockpit needs JavaScript;
     everything on this site is available as ordinary pages. Links to
     `/projects` and `/about`. It is a notice, never a content store.
4. **`<footer>` (contentinfo)** — contact block: email, LinkedIn, Instagram,
   résumé. All from `PROFILE.links`.

Voice per `DESIGN.md` §12: DOM text is sentence case ("View projects",
"About", "Contact"). Wide-tracked uppercase is a CSS
`text-transform` treatment on label-role items only, so accessible names stay
readable. Tests assert accessible names case-insensitively.

### 3.3 Layering rules (cockpit over document)

- The overlay is `position: fixed; inset: 0` and is mounted only when the
  cockpit can actually run (§6.3). It never re-flows the document.
- While the overlay is mounted, the shell's `<header>` and `<main>` receive the
  **`inert`** attribute (React 19 supports it natively) and lose it on unmount.
  Rationale: invisible-but-focusable links behind a full-screen overlay are a
  keyboard trap and a screen-reader phantom.
- **The covering rule**: the overlay may cover the document only while the
  overlay itself exposes the same routes. The cockpit's site header therefore
  renders the *same* anchors from the *same* source module (§4). Covering must
  never be the reason a fact or route is unreachable.
- Scroll: the overlay sets `data-document-scroll="lock"` on `<html>` on mount
  and removes it on unmount (§7.1).

### 3.4 Cockpit navigation becomes real

Current state, verified: `cockpit-hud.tsx:261-269` renders `projects`,
`designs`, `about`, `contact` as `<button>`s that only set local `active`
state. They navigate nowhere, and `designs` corresponds to no route and no
canonical concept. This violates `DESIGN.md` §2 law 5 and §12.

Required in Phase 2:

- The nav renders real `<a>` elements from the shared `SITE_NAV` module:
  **Projects** → `/projects`, **About** → `/about`, **Contact** → `mailto:`.
  **`designs` is removed** (owner decision D3): the design work is already in
  the catalogue as first-class records — Tencent Games and NYU Welcome 2022 —
  and a second nav item pointing at a subset of the same six projects would
  imply a route that does not exist. **`about` stays** and becomes the
  professional-summary page the owner is authoring.
- The Projects sub-menu keeps its catalog-derived counts and becomes two real
  links: *Completed* → `/projects#completed`, *In progress* →
  `/projects#in-progress`. The counts already derive from the catalog
  (`cockpit-hud.tsx:257-258`) and must continue to.
- The sub-menu must open on **focus as well as hover** and close on `Escape`
  (§9.5: hover content available through focus, dismissible).
- The nav keeps its visual treatment. Anchors, not buttons; `:hover` and
  `:focus-visible` share the same state change.

### 3.5 Deck `VIEW MORE` becomes a link

`cockpit-project-view` currently fires into a stub destination. In Phase 2 the
in-scene project card's `VIEW MORE` is an `<a href="/projects/<slug>">` so that
middle-click, copy-link, and keyboard activation all behave normally. The
custom event may remain for scene bookkeeping, but navigation must not depend
on it.

---

## 4. Single-source modules (no drift by construction)

Three new strict-island modules under `lib/`. Each is pure, server-safe, and
unit-tested.

| Module | Exports | Consumed by |
|---|---|---|
| `lib/site/site.ts` | `SITE_URL` resolution + validation, `SITE_ROUTES` | metadata, sitemap, robots, JSON-LD, `/portfolio.json` |
| `lib/site/navigation.ts` | `SITE_NAV` (label, href, kind), derived from `PROFILE` + `SITE_ROUTES` | server header, cockpit header, footer, about page |
| `lib/content/action-parity.ts` | `ACTION_PARITY` rows + `validateActionParity()` | §8.4 manifest test, stub labelling |

**`SITE_URL` resolution order (owner decision D1 — settled):**

1. `process.env.NEXT_PUBLIC_SITE_URL` — the custom domain, named by the owner
   on 2026-07-29: **`https://www.alexxiong.me`** (with `www`; the apex must
   301 to it in Vercel domain config so canonical URLs stay single-origin).
   Setting this one Vercel environment variable is the entire change — no code
   edit. **This domain currently serves the owner's previous portfolio, which
   creates a same-origin link collision — see §11 D10.**
2. `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` — the stable Vercel
   production alias, used until the domain is repointed. Deliberately **not**
   `VERCEL_URL`, which changes per deployment and would emit unstable
   canonical URLs.
3. `http://localhost:3000` — development only.

Validation: absolute, no trailing slash, `https` outside development. Every
consumer (metadata, sitemap, robots, `/portfolio.json`, JSON-LD) is
server-side, so the server-only Vercel variable is sufficient and the origin
never needs a `NEXT_PUBLIC_` client exposure.

Codex must leave a one-line comment at the resolution site recording the
target domain so the swap point is obvious to the next reader.

`SITE_NAV` is the reason the cockpit header and the document header cannot
diverge: both map the same array. A unit test asserts every `SITE_NAV` internal
href has a registered `ContentContract`.

---

## 5. `/projects`, `/projects/[slug]`, `/about`

Shared page frame for all three (and reused conceptually by `/`):

- `ResponsivePage` wrapper (SSR-rendered — it is a client component but not
  `ssr:false`, so `data-layout-contract` is in the initial HTML).
- Landmarks: one `banner`, one `nav[aria-label="Primary"]`, one `main`, one
  `contentinfo`. Skip link first.
- Reading column 60–72ch for body copy; index/detail may use a two-column grid
  at normal tier that collapses at zoom-narrow.
- Body copy sits on opaque surfaces (`DESIGN.md` §10) — never over imagery.
- No entrance or scroll-triggered animation anywhere in Phase 2. This is a
  deliberate simplification: it removes an entire class of reduced-motion risk
  and keeps the catalogue calm.

### 5.1 `/projects` — the index

Purpose: scan six records fast, then commit to one.

- `<h1>` "Projects". Below it, one derived line: *"Six projects — four
  completed, two in progress."* Counts derive from `PROJECTS`; the words are
  generated from the data, never typed.
- Two sections, in catalog order within each:
  `<h2 id="completed">Completed</h2>` and
  `<h2 id="in-progress">In progress</h2>`. These are the anchor targets the
  cockpit sub-menu links to. Both headings carry `tabindex="-1"` so the anchor
  jump moves focus (the Phase 1 F4 lesson).
- Each entry is an `<article id="project-<slug>">`:
  - decorative catalogue number (`aria-hidden`) + `<h3>` linked title →
    `/projects/<slug>`;
  - sleeve-crop cover, square, `max-width:100%`; `alt` from `cover.alt`;
    `cover.kind === 'generated'` renders the DOM motif with `alt=""` and
    `aria-hidden` (Tencent Games only);
  - metadata group (`Plex Mono` role, middot-separated): category · date ·
    status. **Status is text plus an optional jade square — never colour
    alone.**
  - `tagline` as the editorial caption, `summary` as the body paragraph;
  - `role`, and `tools`/`skills` as compact lists;
  - "View project" link.
- `CollectionPage` + `ItemList` JSON-LD, order identical to the visible order.

Design note: no filtering UI, no JavaScript sorting. The two sections plus six
articles are the whole interaction, and they work at tier 1.

### 5.2 `/projects/[slug]` — the liner notes

- `generateStaticParams()` over `catalogSlugs()`; `export const dynamicParams =
  false` so an unknown slug is a real 404.
- Breadcrumb (required by §A.4.2): Home → Projects → *title*, as an ordered
  list in a `<nav aria-label="Breadcrumb">`.
- `<h1>` = `title`; `tagline` directly beneath as the editorial caption.
- Metadata strip: catalogue number (decorative), `category`, `date`, `status`,
  `team` when present.
- Cover: full-bleed-within-column sleeve crop, same alt rules as the index.
- **Sections, rendered only when the canonical field exists:**

  | Heading | Source |
  |---|---|
  | Overview | `summary` |
  | Problem | `problem` |
  | Role | `role` |
  | Contributions | `contributions` (list) |
  | Constraints | `constraints` (list, when present) |
  | Outcomes | `outcomes` (list) |
  | Tools and skills | `tools`, `skills` (two lists) |
  | Links | `links` (external anchors) |
  | Next project | catalog order |

  **`Process` is not rendered.** `DESIGN.md` §10 offers it as an example
  heading, but no canonical `process` field exists and Phase 2 may not invent
  one. Recorded as a deliberate omission.
- `links[]` entries are classified by `classifyProjectLink(link, SITE_URL)`
  (§11 D10). `'external'` links render as ordinary anchors with
  `rel="noopener"` and a visible textual indication that they leave the site —
  never an icon or colour alone. `'self'` links (same host as the canonical
  origin) are **not rendered**: once `www.alexxiong.me` serves this repo, all
  six of today's "Project page" links become self-references to the page the
  reader is already on.
- Previous / Next project: **wraps** around the catalog (matching the crate's
  `__cockpitVinylSelect(±1)` stepping), and each link names its destination
  project so direction is never ambiguous.
- `CreativeWork` JSON-LD from `deriveProjectJsonLd`; canonical URL from
  `deriveProjectMetadata`.

### 5.3 `/about` — the professional summary

One dense, honest page, written in the first person as Alex's own account of
the work — not a page addressed to an audience. It carries every requirement
§A.4.2 placed on the recruiter surface; only the framing changed.

**Design consequence of the rename.** Because the page is no longer addressed
to a hiring audience, it must not *read* like a CV rendered in HTML. The
structure is: who I am → how I work → what I have made → how to reach me. The
evidence section is the same data a recruiter needs, presented as a record
rather than a pitch.

- `<h1>` `PROFILE.name`; role line (`PROFILE.targetRole`); `PROFILE.summary`;
  capabilities.
- **Owner-authored professional summary** — `PROFILE.about`, a paragraph
  array, rendered as sequential `<p>` elements at the top of the page under
  the identity block, in body type at a 60–72ch measure. It is canonical
  public content living in `lib/portfolio/profile.ts`, never in JSX. The
  owner supplied and resolved the prose on 2026-07-29; **the exact text to be
  hashed is in §11 D9** and is transcribed verbatim, never re-worded or
  re-wrapped in meaning. Until the owner's approval run completes, the page
  renders the existing approved `PROFILE.summary` and is complete without it.
- Reading order on the page is: identity + role → `about` prose → capabilities
  → evidence → contact. The short `PROFILE.summary` is **not** repeated here;
  it belongs to `/` and to metadata. The `about` prose supersedes it on this
  page, so the same reader never meets two versions of the same paragraph.
- Evidence: **all six projects in catalog order** — no "selected work" subset,
  which would imply a ranking the owner has not approved. Per project: title
  (linked to its detail page), role, date, status, and the **full** `outcomes`
  list. Nothing paraphrased.
- Contact block and **Download résumé (PDF)** link.
- `Person` JSON-LD.
- **Print stylesheet** (`@media print`) is a first-class deliverable and
  survives the rename — printing an About page is ordinary behavior:
  single column; no fixed chrome, no overlays, no grain/vignette; black on
  white; `a[href^="http"]::after { content: " (" attr(href) ")" }` so URLs
  survive paper; `break-inside: avoid` on each project block; page margins set;
  the accessibility trigger hidden.
- `/recruiter` returns a permanent redirect here, so the guessable URL and any
  link already shared still resolve.

---

## 6. Responsive, appearance, and degradation

### 6.1 Tier behavior for document routes

| Tier | Behavior |
|---|---|
| normal (≥1024×600) | Designed composition; `.responsive-page` max-width caps line length; two-column index/detail grid allowed |
| zoom-narrow | Single column; header becomes static (never sticky); metadata groups wrap; images `max-width:100%`; no horizontal scroll |
| reflow floor (320px) | All content readable and operable in one primary scroll direction |
| large (>3440×1536) | Designed maximum is kept; negative space grows; no 5K art direction |

At 200% zoom nothing counter-scales. Document routes never use the contained
stage — they have no protected region.

### 6.2 Appearance (theme) on document routes

Verified problem: `data-theme` is a **cockpit-scene** attribute. It is set only
during warp/cockpit and removed at boot (`cockpit-app.tsx:81-91`), and
`html[data-theme="light"]` *inverts* `--cream`/`--ink`
(`globals.css:127-149`) because those tokens mean "HUD-on-scene", not "page
surface". Reusing them on an ordinary page makes theme *light* render a *dark*
document. Meanwhile `DESIGN.md` §10 requires project pages to honor the
persisted theme, and §A.4.2 lists theme persistence as a tier-2 parity row.

**Decision — minimal, no cockpit regression risk:**

1. Keep `data-theme` and its inversion exactly as they are. Boot and warp keep
   their authored identity.
2. Add a **document surface tier** to `globals.css`: `--doc-surface`,
   `--doc-surface-raised`, `--doc-surface-sunken`, `--doc-ink`,
   `--doc-ink-muted`, `--doc-rule`, `--doc-jade`, `--doc-jade-strong`. Values
   come from the `DESIGN.md` §3 palette (the same hexes already in the file).
   These never invert with the cockpit HUD.
3. Add `data-appearance="light|dark"` on `<html>`, stamped **pre-paint** by
   extending the existing inline script in `app/layout.tsx`, resolved from
   `localStorage['cockpit-theme']` (unchanged key) with
   `prefers-color-scheme` as the fallback when nothing is stored. Tier 1 gets
   the media-query fallback only, matching the §A.6.1 precedence pattern
   already used for `data-a11y-*`.
4. Document routes and the `/` shell style **only** from `--doc-*`. The cockpit
   overlay keeps the existing tokens.
5. **Always-reachable appearance control**: an *Appearance* fieldset
   (System / Light / Dark) joins the existing accessibility dialog, which is
   mounted at root and therefore reachable from every route and every phase.
   It writes `cockpit-theme` and dispatches the existing `cockpit-theme` event
   so a mounted cockpit follows immediately — the `window.__cockpit*` bridge is
   unchanged. The in-scene theme toggle stays as the atmospheric duplicate.
6. Resolution (`system` → `prefers-color-scheme`) is a pure function in
   `lib/responsive/appearance.ts`, unit-tested, mirrored by the inline script
   with the key/attribute names pinned by test, exactly as
   `lib/responsive/accessibility.ts` is today.

Recorded as a deliberate, bounded addition rather than a token-system
refactor; unifying the two tiers belongs to the scheduled visual migration
(`docs/design-visual-migration-handoff.md`), not to Phase 2.

### 6.3 WebGL capability and the tier-2 guarantee

Today, with WebGL disabled the user still reaches `[ENTER THE ROOM]` and lands
on a dead canvas. That fails §A.4.3 tier 2.

`cockpit-entry.tsx` performs **one** capability probe on mount — a throwaway
`canvas.getContext('webgl2') ?? getContext('webgl')`, no cockpit import, no
renderer code. If unavailable:

- the cockpit is never imported or mounted;
- the document is never made `inert` and the scroll lock never applies;
- a concise notice renders inside the document (not a modal, not a blocking
  dialog): the 3D cockpit is unavailable in this browser; everything is
  available as ordinary pages, with links to `/projects` and `/about`.

Context **loss/restore** remains Phase 3 (§10.1). This is initial capability
only.

---

## 7. Cross-cutting corrections Phase 2 must make

### 7.1 Document scroll — a live tier-1 defect

`globals.css:158-161` sets `html, body { height:100%; overflow:hidden }`
globally. `ResponsivePage` opts out via `data-document-scroll="reflow"` in a
**client effect** — which never runs at tier 1. Any server-rendered route taller
than the viewport would be unscrollable with JavaScript disabled: content loss,
and a WCAG 2.2 Reflow failure.

**Fix (inverts the default, reuses the Phase 1 attribute — no `:has()`
dependency):**

```css
html, body { margin: 0; min-height: 100%; }          /* scrollable by default */

html[data-document-scroll="lock"],
html[data-document-scroll="lock"] body { height: 100%; overflow: hidden; }

/* zoom/narrow releases the lock so the contained stage can pan without
   trapping document scroll (§A.5, §A.4.2). Thresholds mirror
   SUPPORT_PROFILES['desktop-laptop-v1'].normalMin. */
@media (max-width: 1023px), (max-height: 599px) {
  html[data-document-scroll="lock"],
  html[data-document-scroll="lock"] body { height: auto; overflow: auto; }
}
```

`"lock"` is set by the cockpit overlay on mount and removed on unmount. A unit
test parses `globals.css` and asserts the two thresholds equal
`normalMin.w - 1` and `normalMin.h - 1` from the support profile, so the CSS
mirror can never silently drift.

### 7.2 Scoped scroll reset

`cockpit-hud.tsx:90` force-resets `scrollLeft/scrollTop` on the stage. That
must remain scoped to the stage element and must never reach the document
(CLAUDE.md gotcha: *"rescope it when Phase 2 integrates the contained stage"*).
Verification: focusing a link in the document below the cockpit while the
cockpit is unmounted does not snap scroll to 0.

### 7.3 Root metadata

`app/layout.tsx:12-13` currently ships `title: "CLR // LIVE_GLOBE_FPS"` — a
fictional string standing where the owner's identity belongs, contrary to
`DESIGN.md` §2 law 5 and §12. Replace with values **derived** from canonical
data (no new claims):

- title: `` `${PROFILE.name} — ${PROFILE.targetRole}` `` → "Alex Xiong —
  Creative Technologist";
- description: the first sentence of `PROFILE.summary`, or the whole summary
  when ≤160 characters. Derivation is a pure, unit-tested helper.
- `metadataBase: new URL(SITE_URL)`.

### 7.4 AX/OS send stub

`cockpit-hud.tsx:931-953` fabricates a reply (`"> ack. '…' logged. (api
offline)"`). §A.4.2 requires an unimplemented experience to be *recorded as
unimplemented in both paths* rather than faked. Phase 2 labels the control and
its surrounding screen text as a non-functional demonstration, using the single
shared label constant from `lib/content/action-parity.ts`, and the same wording
appears in the parity manifest. No DOM twin of the assistant is built.

---

## 8. Metadata, discovery, enforcement

### 8.1 Per-route metadata

Every route exports `metadata` / `generateMetadata` producing title,
description, canonical URL, and social-preview fields, all derived through
`lib/content/serializers.ts` + `lib/site/site.ts`. Social preview image: the
project cover for detail routes (`cover.kind === 'image'`), otherwise no image
— an invented OG card would be a second visual composition.

### 8.2 sitemap, robots, `/portfolio.json`

- `app/sitemap.ts`: exactly `/`, `/projects`, `/about`, and every
  `/projects/<slug>`. `/responsive-preview` is excluded; `/recruiter` is
  excluded because it is a redirect, not a canonical document.
- `app/robots.ts`: allow all; declare the sitemap; must **not** block
  `/vinyl-covers/*` or `/AlexXiong_Resume26.pdf`.
- `next.config.mjs` permanent redirects: `/recruiter` → `/about`, and the
  legacy old-site paths `/games/:slug`, `/design/:slug`, `/wip/:slug` →
  `/projects/:slug` (§11 D10). None of these appear in the sitemap.
- `app/portfolio.json/route.ts`: returns `derivePortfolioJson(PROFILE,
  PROJECTS, SITE_URL)` with `application/json`, `schemaVersion: 1`, canonical
  HTML URLs, and **no approval metadata**.

### 8.3 Import-boundary lint (§A.4.1, deferred to Phase 2 and now due)

An ESLint `no-restricted-imports` block scoped to `app/**` and `lib/**`
forbidding `three`, `@/components/cockpit/project-textures`, and
`@/components/cockpit/*` — with a single explicit allowance for
`app/page.tsx` importing `@/components/cockpit/cockpit-entry`. The
`import "client-only"` marker stays as the build-time second boundary.

### 8.4 Action-parity manifest

`lib/content/action-parity.ts` declares every §A.4.2 row with a status of
`implemented`, `decorative`, or `future-stub`:

| Cockpit function | DOM equivalent | Status |
|---|---|---|
| Enter / skip boot | Document is already the content; primary links present pre-boot | implemented |
| Browse crate / deck | `/projects` list + per-detail previous/next | implemented |
| `VIEW MORE` | `/projects/<slug>` anchor | implemented |
| Enter / exit focused view | Labeled links and Escape-dismissible menus | implemented |
| AX/OS dialog | — (assistant is not implemented) | future-stub |
| Change theme | Appearance fieldset in the accessibility dialog | implemented |
| Change accessibility | Accessibility dialog (Phase 1) | implemented |
| Ambient scene motion (coffee, platter) | none | decorative |

`validateActionParity()` asserts: no row is missing, every `domHref` resolves to
a route carrying a `ContentContract`, and every `future-stub` row uses the
shared label constant.

---

## 9. Measurable acceptance criteria

Each criterion names the check that proves it. All five gates must be green.

### Tier 1 — JavaScript disabled

- **AC-1** `page.request.get()` on `/`, `/projects`, all six
  `/projects/<slug>`, and `/about` returns 200, and the *response HTML*
  (not the hydrated DOM) contains each route's required fields: title, status,
  tagline, summary, role, problem, every `contributions` and `outcomes` entry,
  every `tools`/`skills` entry, and every `links[].href`.
- **AC-2** `/` response HTML contains `href="/projects"` and `href="/about"`.
  *This flips `e2e/smoke.spec.ts:349` from `test.fixme` to a passing test — the
  marker is removed, never inverted silently. Its `/recruiter` assertion is
  rewritten to `/about` under the owner-approved Revision 7 rename (§2.1), and
  a companion test asserts `/recruiter` responds 308 to `/about`.*
- **AC-3** With `javaScriptEnabled: false`, each route scrolls: at 320×568,
  `document.scrollingElement.scrollHeight > clientHeight` where content
  overflows, and `scrollWidth <= clientWidth + 1` (no horizontal scroll) on
  every route.
- **AC-4** With `javaScriptEnabled: false`, zero `[data-hud="accessibility-trigger"]`
  and zero `[data-hud="accessibility-dialog"]` nodes on all new routes (the
  Phase 1 rule, extended).
- **AC-5** No route's essential text lives in `<noscript>`, `display:none`, or
  off-screen: a test asserts every required field is inside a visible element
  (non-zero bounding box) with JavaScript disabled.

### Tier 2 — JavaScript on, WebGL disabled

- **AC-6** With WebGL blocked, `/` renders the document non-`inert`, shows the
  cockpit-unavailable notice, and `[data-layout-region="cockpit-stage"]` is
  absent.
- **AC-7** Accessibility overrides and the appearance choice persist across
  reload with WebGL disabled, and "Use system settings" resets both.
- **AC-8** Every `implemented` row of `ACTION_PARITY` is reachable with WebGL
  disabled; the `future-stub` row is labelled with the shared constant in both
  experiences.

### Tier 3 — full cockpit

- **AC-9** The existing Phase 0 smoke suite passes unchanged: boot reachable,
  `cockpit-stage` matches the viewport within 1px at 1024×600 and 1440×900,
  blank-canvas check, Phase −1 entrance assertion.
- **AC-10** The cockpit header exposes real anchors whose `href`s equal
  `SITE_NAV`; the Projects sub-menu opens on focus and closes on `Escape`.
- **AC-11** After `playRecord(n)`, the card's `VIEW MORE` is an anchor with
  `href="/projects/<slug for n>"`.
- **AC-12** While the cockpit is mounted, the document `<main>` is `inert` and
  contains no tabbable element; after unmount it is operable again.
- **AC-13** The Phase 6 deck-overlap `test.fixme` is still present and still
  skipped. Fixing it in Phase 2 is a failure, not a bonus.

### Layout, contracts, content

- **AC-14** `npm run validate:contracts` passes with `PHASE_2_COMPLETE = true`,
  all four content contracts `implemented`, 6 layout contracts and 5 covered
  routes reported.
- **AC-15** Every `app/**/page.tsx` has a co-located `layout-contract.ts`;
  `ROUTE_CONTRACT_EXEMPTIONS` stays empty.
- **AC-16** Each new route root carries its `data-layout-contract` and
  `data-content-contract`, and each id resolves in the registry.
- **AC-17** Unit test: the `globals.css` scroll-lock media thresholds equal
  `SUPPORT_PROFILES['desktop-laptop-v1'].normalMin` minus one pixel per axis.
- **AC-18** Unit test: sitemap entries == `{/, /projects, /about} ∪
  {/projects/<slug> for every catalog slug}`, and both `/responsive-preview`
  and `/recruiter` are absent.
- **AC-19** Unit test: `/portfolio.json` output contains no `approvedAt`,
  `approvedContentHash`, or `schemaVersion` field from the approval manifest,
  and every project entry's `url` is the canonical HTML URL.
- **AC-20** Unit test: every JSON-LD fact appears in the visible page model
  built from the same fixture — `Person`, `CollectionPage`/`ItemList`,
  `CreativeWork` — and no structured fact exists that the page lacks.
- **AC-20b** When `PROFILE.about` exists: every paragraph is rendered visibly
  on `/about`, in order, and is present in the tier-1 response HTML;
  `/portfolio.json` carries the same array; JSON-LD `Person.description`
  continues to use the concise `summary`, not the prose, so the structured
  description stays a description.
- **AC-35** Domain collision (§11 D10): unit test — `classifyProjectLink()`
  returns `'self'` for every catalog link when `SITE_URL` host is
  `www.alexxiong.me` and `'external'` when it is the Vercel alias; no `'self'`
  link is rendered on a detail page. E2E — `/games/songofmaka`,
  `/design/nyuwelcome`, and `/wip/procgendungeon` each respond 308 to
  `/projects/<slug>`, and a loop over all six catalog slugs asserts the
  redirect for whichever legacy prefix each one used.
- **AC-21** Unit test: `SITE_NAV` internal hrefs all have a registered
  `ContentContract`; `validateActionParity()` returns no issues.
- **AC-22** `npm run lint` fails when a file under `app/**` (other than
  `app/page.tsx` importing `cockpit-entry`) imports `three`,
  `project-textures`, or a cockpit runtime module. Codex demonstrates this by
  temporarily introducing the import and recording the failure in the handoff.

### Accessibility (WCAG 2.2 AA + the five states)

- **AC-23** Automated scan (axe or equivalent) reports zero violations on `/`,
  `/projects`, one detail page, and `/about`, in both appearances.
- **AC-24** Heading order is strictly sequential on every route (no skipped
  level); exactly one `h1`; one banner, one nav, one main, one contentinfo.
- **AC-25** Skip link is the first focusable element and moves focus to
  `#main`; `#completed` / `#in-progress` anchors move focus to their headings.
- **AC-26** Every interactive target is ≥44×44 CSS px and satisfies the WCAG
  target-spacing rule at both `--control-min` values.
- **AC-27** Text/background contrast ≥4.5:1 (≥3:1 for large text and UI
  boundaries) measured in: light appearance, dark appearance, high-contrast
  state, and reduced-transparency state.
- **AC-28** `forced-colors: active` — all structural boundaries survive
  (borders, not shadows); grain and vignette are removed; no information is
  carried by colour alone anywhere (status especially).
- **AC-29** Reduced motion: no document route starts any animation or
  transition; the role line renders immediately.
- **AC-30** Keyboard-only completion of every route with visible, unobscured
  focus and no trap, verified manually and recorded.
- **AC-31** `/about` prints to a clean single-column page with expanded
  link URLs, no fixed chrome, and no page-break mid-project (manual check with
  a saved PDF attached to the handoff).

### Visual / design conformance

- **AC-32** `DESIGN.md` §15 checklist completed for each new route: palette
  hierarchy with jade as the only chromatic family, `--radius: 0`, no DOM drop
  shadows, correct typographic roles (no body copy in 9–11px mono), generous
  negative space, one clear reading column.
- **AC-33** No essential fact or action exists only in the cockpit, a texture,
  a hover state, or client-only state — reviewed against `docs/content-inventory.md`.
- **AC-34** Both appearances screenshotted at 1440×900 and 320×568 for `/`,
  `/projects`, one detail page, and `/about`, attached to the handoff.

---

## 10. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | The server document under the overlay reads as "crawler-only" content to a reviewer | It is the entire experience at tiers 1–2, painted first at tier 3, and `inert` only while an equivalent presentation covers it (§3.3). Stated explicitly so QA judges the rule, not the appearance. |
| R2 | Removing the global `overflow:hidden` regresses the cockpit's full-bleed layout | The lock is reapplied by the overlay on mount; AC-9 re-runs the full Phase 0 smoke suite including the exact-viewport stage assertion. |
| R3 | Making cockpit nav real changes a protected composition | Same visual treatment, same positions; only element type and behavior change. Both themes re-verified. |
| R4 | `--doc-*` tier looks like a parallel token system | Bounded, documented, in `globals.css`, sourced from the §3 palette; unification is scheduled with the visual migration. |
| R5 | The canonical domain `www.alexxiong.me` is the same host as all six catalog `links[]`, so they become same-origin 404s at cutover | Legacy path redirects plus host-based self-link suppression (§11 D10, AC-35). No canonical content edit, correct behavior both before and after the domain moves. |
| R6 | Phase 2 tempts a "quick" deck-overlap fix while the HUD is open | AC-13 makes leaving it broken an explicit pass condition. |

---

## 11. Owner decisions

**D1–D9 were answered by the owner on 2026-07-29 and are settled.** They are
recorded here verbatim in effect, because Codex and QA both read this section
as the decision record for Phase 2. Nothing in this section authorises an
agent to write `content/portfolio-approvals.json`; that remains owner-only.

- **D1 — Canonical origin: Vercel first. SETTLED.** Use the Vercel production
  URL now; the owner holds a domain he intends to attach to this repo but has
  not named it yet. Resolution order and the "one environment variable to
  swap" property are specified in §4. No longer blocking for implementation;
  the domain is a **reminder for deploy time**, not a gate on the phase.
- **D2 — Chu Yu Hong subtitle: ship without one. SETTLED.** No `subtitle`
  field is added, no approval hash is invalidated, and 楚雨虹 continues to
  reach the reader through the approved `summary`. Ledger #15's promise is
  satisfied in substance; if the owner later wants it typographically
  separated, that is a canonical content change on its own owner-approval
  turn.
- **D3 — Cockpit nav: keep About, drop Designs. SETTLED.** Nav is Projects /
  About / Contact (§3.4). The owner is authoring a professional summary for
  About — see D9.
- **D4 — Root metadata wording: confirmed.** "Alex Xiong — Creative
  Technologist" plus the first sentence of the approved summary, both derived
  from canonical data (§7.3).
- **D5 — Appearance control in the accessibility dialog: confirmed** (§6.2).
- **D6 — Previous/next wraps around the catalog: confirmed** (§5.2).
- **D7 — `Process` heading omitted: confirmed** (§5.2).
- **D8 — `/recruiter` becomes `/about`. SETTLED.** The owner judged an
  audience-named route to be pandering, and design agrees: the framing, not
  the content, was the problem. The surface keeps every §A.4.2 requirement
  including print-friendliness and all six projects in catalog order; only
  the path and framing change (§2, §5.3). Requires the Revision 7 plan
  amendment in §2.1.

### D10 — The canonical domain collides with the catalog's own links

**Raised by design 2026-07-29, after the owner named the domain. The
recommended resolution below is the DEFAULT — Codex implements it unless the
owner objects — because it requires no canonical content change and therefore
blocks nothing.**

The domain is `www.alexxiong.me` — **the same host all six catalog
`links[]` entries point at**:

| Project | Approved `links[0].href` |
|---|---|
| songofmaka | `https://www.alexxiong.me/games/songofmaka` |
| chuyuhong | `https://www.alexxiong.me/games/chuyuhong` |
| tencentgames | `https://www.alexxiong.me/design/tencentgames` |
| nyuwelcome | `https://www.alexxiong.me/design/nyuwelcome` |
| shanghainoir | `https://www.alexxiong.me/wip/shanghainoir` |
| procgendungeon | `https://www.alexxiong.me/wip/procgendungeon` |

Owner amendment (2026-07-31): the canonical identifier and slug for
**Song of Maka** are `songofmaka`, matching the title with no leading “The.”
The previous `/games/thesongofmaka` and `/projects/thesongofmaka` paths are
legacy inputs only and permanently redirect to `/projects/songofmaka`.

The moment the domain is repointed to this repo, all six become **same-origin
404s**, and §5.2 would render each of them as an "external" link that leaves
the site — to itself. This is hashed, owner-approved content, so it cannot be
edited casually, and no existing gate detects it: the hrefs are valid absolute
`https` URLs, and validation has no knowledge of which host the site will
occupy.

**Recommended resolution — three parts, zero content change, no re-hash:**

1. **Legacy path redirects** (permanent, in `next.config.mjs`):
   `/games/:slug`, `/design/:slug`, `/wip/:slug` → `/projects/:slug`. Every
   old slug is identical to its catalog slug, verified against all six
   records, so three parameterized rules cover the whole old site. This
   preserves inbound links, résumé links, bookmarks, and whatever search
   equity `www.alexxiong.me` has accumulated — the cutover stops being a
   cliff.
2. **Self-link suppression at render time.** A pure helper
   `classifyProjectLink(link, siteUrl)` returns `'external' | 'self'` by
   comparing hosts. `'self'` links are **not rendered** — after the cutover
   they are self-references, and the detail page the reader is already on *is*
   the case study. This is a presentation derivation from canonical data,
   exactly like the sleeve labels in `sleeveRecord()`, so the approval hash is
   untouched. Before the domain moves, the same helper classifies them
   `'external'` and they render normally — the behavior is correct at both
   ends of the migration, with no flag day.
3. **Apex → `www` 301** in Vercel domain config, so exactly one origin is
   canonical.

**Alternative the owner may prefer instead of (2):** retire the six `links[]`
entries in a content turn. That is a canonical edit — it invalidates all six
project hashes and needs a full approval run. It is *cleaner long-term* and
*more expensive now*. The recommended path leaves that door open without
blocking Phase 2.

**Owner should also know:** repointing the domain retires the old site. The
new detail pages carry the full approved record for every project, so nothing
factual is lost — but any old-site material that never entered the catalog
(additional images, longer write-ups, the Drive builds and Figma pipeline
noted as open items in `docs/content-inventory.md`) disappears with it. Worth
capturing anything wanted before the cutover.

### D9 — Owner-authored professional summary for `/about`

**Prose supplied by the owner 2026-07-29. Not yet approvable — content review
found one contradiction and two new claim classes.**

Shape: `about?: NonEmptyStrings` on `PublicProfile` (paragraphs, in order).
`approvalSerialization()` serializes the whole profile object
(`lib/content/content-approval.ts:58-64`), so the field enters the approval
hash automatically — no serializer edit. Adding it invalidates the current
profile hash `2e5b3672…`; only the owner may re-run
`npx tsx scripts/record-approvals.ts`, and only against the exact final text.

**Codex must not draft, paraphrase, reflow, or placeholder this prose.**

#### D9 — RESOLVED 2026-07-29. Final text below.

The owner chose **option (a)**: align the prose to the approved record. Both
optional swaps in D9d were declined by default and the text keeps the owner's
wording ("narrative adventure", "product design"). One grammar fix (the
sentence fragment) and one comma are the only other departures from the
supplied draft.

**This is the exact content to be hashed. Transcribe it character-for-character
into `PROFILE.about` as four ordered paragraphs.** Quoting style follows the
file's existing convention (see `PROFILE.summary`); the choice of quote
character must not alter a single character of the text.

> Hello! I'm Alex Xiong, a creative technologist specializing in product design and UX research, based in New York City.

> I started in games because I wanted to make people feel something. At NYU I studied game design, co-founded Silverjay Studio, and co-directed Song of Maka, an award-winning narrative adventure now in post-production. As I sat through playtests, I realized the thing I couldn't stop watching was the players. Why they hesitated, where they got lost, what made them stay. That curiosity slowly became the catalyst to pivot.

> Now I'm at Cornell Tech studying HCI and Information Science, and I build NPCs in the Game Assemblies Lab that hold a conversation instead of reciting one: LLM-driven characters in Unreal Engine 5 with emotional states, real voices, and no scripted lines. Lately I've been distilling that system into a small local model, and building a desktop companion that lives on your screen and talks back with context.

> The through-line is simple. Play stopped being a separate place a long time ago; the systems behind our apps, feeds, and tools all borrow from games. I love continuing to learn about the human side of interactive media and create more projects not just for impact, but also for beauty.

**Approval sequence — the order matters:**

1. Codex adds `about?: NonEmptyStrings` to `PublicProfile`, transcribes the
   four paragraphs, and extends `validateProfile()` to reject an empty
   paragraph. It does **not** touch `content/portfolio-approvals.json`.
2. `npm run validate:contracts` and `npm run test:unit` go **red** at this
   point — a stale profile hash. That is the guard working as designed, not a
   defect, and Codex reports it as such rather than "fixing" it.
3. The owner reads the diff against this section, then runs
   `npx tsx scripts/record-approvals.ts`. Both gates go green.
4. Codex records the ledger entries below and re-runs all five gates.

**Required `docs/content-inventory.md` ledger entries (sixth decision pass,
2026-07-29)** — the decision record is how ownership claims stay traceable:

- **#27** Profile gains `about`: a four-paragraph professional summary for
  `/about`, owner-authored and owner-approved verbatim.
- **#28** New ownership claim approved: **co-founded Silverjay Studio**
  (extends the enumerated list in #11).
- **#29** New owner-supplied facts published: New York City base; game design
  study at NYU; the Game Assemblies Lab NPC system (Unreal Engine 5,
  LLM-driven characters, emotional states, real voices, no scripted lines);
  the distilled small local model; the desktop companion project.
- **#30** "Shipped Song of Maka" corrected to "co-directed … now in
  post-production" before publication, preserving consistency with the
  project record's `in-progress` status and ledger #14. No project record
  changed; the six project hashes stay untouched.
- **#31** Open, deliberately deferred: the Game Assemblies Lab NPC system
  exists only as profile prose and has no catalogue record. Promoting it to a
  seventh project is a future owner content turn, not Phase 2 work.

The original analysis that produced these entries is preserved below.

#### D9a — Blocking contradiction: "shipped Song of Maka" (resolved by option a)

The prose says Alex "shipped Song of Maka". The owner-approved catalog record
says the opposite: `status: 'in-progress'`, `date: '2021–Present'`, and a
problem statement reading "a five-year production — now in post-production"
(ledger #14 explicitly superseded the earlier 2020–2024 completed framing).

Published together, `/about` and `/projects/songofmaka` would contradict
each other about the same project on the same site. No gate catches this —
the two facts live in different fields — but a recruiter reads both. Under
the honest-outcomes rule this must be reconciled before hashing, not after.

Owner chooses one:
- **(a) Align the prose** to the record — recommended, changes one clause;
- **(b) Change the record** to `completed` — a separate project-level content
  change requiring its own review and re-approval, and contradicting ledger
  #14;
- **(c) Neither** — not available; shipping the contradiction is not an option.

#### D9b — New ownership claim: "co-founded Silverjay Studio"

The catalog places Chu Yu Hong "at Silverjay Studio" with the role "Creative
Director · Project Lead · Producer" and a team of seven. It never states
co-founding. Ledger #11 approved a specific, enumerated list of ownership
claims; this is not among them. It is the owner's own statement about himself,
so it is publishable — but it must be recorded as a **new ledger entry**, not
absorbed silently, because ownership claims are exactly the class the ledger
exists to track.

#### D9c — New owner-supplied facts (publishable, need ledger entries)

None of these conflict with anything; they are simply new and currently
unrecorded: New York City as base; game design study at NYU; the Game
Assemblies Lab NPC system (Unreal Engine 5, LLM-driven characters, emotional
states, real voices, no scripted lines); distilling it into a small local
model; the desktop companion project.

Design note, not a blocker: the lab NPC system, the local model, and the
desktop companion are current, substantial work that exists **only** as About
prose — there is no catalogue record, so they get no detail page, no
structured data, and no crate presence. Prose in `PROFILE` is canonical, so
this is legal. But the strongest version of this portfolio has the NPC system
as a seventh catalogue record. That is a Phase 0A-style content turn the owner
can run whenever he wants; it is **not** Phase 2 work and must not delay it.

#### D9d — Minor alignment (owner's call, no blocker)

- "specializing in product design and UX research" vs approved
  `capabilities: ['Product Management', 'UI/UX Design', 'UX Research', 'Game
  Design']`. On the same page the prose and the capability list sit inches
  apart, so "product design" beside "Product Management" reads as a wobble.
  Align one to the other, or accept it.
- "narrative adventure game" vs the canonical `category: 'puzzle adventure'`.
  Not false — Song of Maka carries a Best Narrative nomination — but the two
  labels appear on `/about` and `/projects` respectively.
- One grammar fix is needed regardless: "As I sat through playtests and
  realized…" is a sentence fragment.

---

## 12. Codex implementation handoff

Suggested order; one reviewable commit for Phase 2 (or split at the marked
seam). Nothing here authorises a canonical content edit — `PROFILE` and
`PROJECTS` are read-only for this phase, and `content/portfolio-approvals.json`
is owner-only.

**Step 0 — canonical content (owner-gated, do first so the approval run can
happen in parallel with the rest)**
0. Add `about?: NonEmptyStrings` to `PublicProfile`, transcribe the four
   approved paragraphs from §11 D9 character-for-character, extend
   `validateProfile()`. Expect `validate:contracts` and `test:unit` to go red
   on the stale profile hash — report it, never "fix" it. The owner runs
   `npx tsx scripts/record-approvals.ts`; then add ledger entries #27–#31.

**Step 1 — foundations (no visible change)**
1. `lib/site/site.ts`, `lib/site/navigation.ts`, `lib/responsive/appearance.ts`,
   `lib/content/action-parity.ts` + unit tests. Strict-island rules:
   no `@ts-nocheck`, `noUncheckedIndexedAccess`, `import type`.
2. `globals.css`: document-surface tokens, appearance blocks, scroll-lock
   inversion (§6.2, §7.1). Extend the `app/layout.tsx` pre-paint script for
   `data-appearance`; pin key/attribute names by unit test.
3. Root metadata + `metadataBase` (§7.3).

**Step 2 — the `/` boundary**
4. `components/cockpit/cockpit-entry.tsx`: `dynamic(…, { ssr:false })`, WebGL
   probe, overlay root `data-layout-region="cockpit-shell"`, `inert` handoff,
   `data-document-scroll="lock"` lifecycle, unavailable notice.
5. `app/page.tsx` → Server Component shell (§3.2). `CockpitApp` drops
   `data-layout-region="app-shell"` / `data-content-contract`.
6. Cockpit header nav → real anchors from `SITE_NAV`; focus-openable sub-menu;
   `VIEW MORE` → anchor (§3.4, §3.5). AX/OS stub labelling (§7.4).

**Step 3 — the catalogue routes**
7. `app/projects/` (page + relocated `layout-contract.ts`),
   `app/projects/[slug]/`, `app/about/`, each with its contract file and
   `data-*` identifiers (§2, §5).
8. `app/sitemap.ts`, `app/robots.ts`, `app/portfolio.json/route.ts` (§8.2),
   and the permanent redirects in `next.config.mjs`: `/recruiter` → `/about`
   plus the legacy `/games|/design|/wip/:slug` → `/projects/:slug` rules
   (§11 D10). Add `classifyProjectLink()` and wire it into detail-page link
   rendering (§5.2).

**Step 4 — enforcement**
9. Apply the **Revision 7 amendment** (§2.1): `REQUIRED_CONTENT_ROUTES`,
   `ROUTE_PURPOSES`, the `ContentPurpose` rename, `ABOUT_CONTENT_CONTRACT`,
   and the matching unit tests. Do this as its own reviewable step — it is a
   plan amendment, not an implementation detail.
10. Flip the four content contracts to `implemented`; set
    `PHASE_2_COMPLETE = true`; extend `ROUTE_LAYOUT_CONTRACTS`; amend
    `cockpit-v1` (§2.1).
11. Import-boundary lint rule (§8.3).
12. Tests: rewrite and un-`fixme` `e2e/smoke.spec.ts:349` (AC-2, now asserting
    `/about`); add the `/recruiter` → 308 test; add the tier-1 and tier-2
    suites (AC-1, AC-3…AC-8); add the unit tests (AC-17…AC-21); leave the
    Phase 6 `test.fixme` untouched (AC-13).
13. Documentation: plan §A.4.2 required-surface table, §8 Phase 2 bullets and
    exit text, and a new "Revision 7 amendment" note recording D8 with its
    date; `docs/responsive-system.md` §7/§10/§11/§12 (route rename, contracts
    `implemented`, new identifiers, import rule no longer deferred, Phase 2
    delivered), plan §8 Phase 2 status + commit hash, `DESIGN.md` §3 note on
    the document-surface tier and §12 nav wording (About, not "Recruiter
    overview"), and housekeeping H1–H3 from §0.

**Definition of done:** all five gates green, AC-1…AC-34 evidenced (automated
where stated, manual checks recorded with artifacts), and a handoff report
naming what was verified, what was deferred, and to which phase.

**Return to design (do not decide alone):** any change to the cockpit's
protected composition beyond element type; any new visual composition on `/`;
anything that would require editing `PROFILE`, `PROJECTS`, or the approval
manifest — including the D9 About prose, which is the owner's to write and
approve; any temptation to fix the deck overlap.

**Deploy-time checklist (not a phase gate):** set
`NEXT_PUBLIC_SITE_URL=https://www.alexxiong.me`, add the apex → `www` 301 in
Vercel domain config, then re-verify canonical URLs, `sitemap.xml`, JSON-LD
`url` fields, and `/portfolio.json` against it, and confirm the six legacy
project paths redirect rather than 404 (§4, §11 D1/D10).
