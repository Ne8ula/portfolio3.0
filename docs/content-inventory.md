# Content Inventory — Phase 0A (profile + six-project catalog)

> Required by [hud-responsive-layout-plan.md](hud-responsive-layout-plan.md)
> §2.5 and §8 Phase 0: "map every current field and record each missing fact
> as owner input required."

**Purpose.** This document maps every field of the current provisional
catalog ([lib/projects/catalog.ts](../lib/projects/catalog.ts)) and profile
source against the strict §A.4.2 schemas (`Project`,
[`PublicProfile`](../lib/portfolio/profile.ts)), records the candidate facts
extracted from alexxiong.me on **2026-07-27** (the Phase 0A dossier in
[phase-0-handoff.md](phase-0-handoff.md)), and marks every gap explicitly.

**Status: AWAITING OWNER REVIEW — Phase 0A steps 2–4 (gap-filling,
drafting, owner approval).** Step 1 (extraction) is complete; nothing below
is owner-approved. Items marked ⚠ are owner decisions reproduced from the
dossier.

**Rules.**

- No placeholder, inferred, extended, or rounded-up claim may enter the
  canonical catalog. A gap stays an explicit gap until the owner fills it.
- Extracted facts — even those quoted from the owner's own site — are
  candidates, **not** approved content.
- Approval is manual and owner-only: records live in
  `content/portfolio-approvals.json` and are validated by
  [lib/content/content-approval.ts](../lib/content/content-approval.ts)
  (§A.4.2). Claude/Codex/automation must never create or refresh an
  approval record.
- The legacy alexxiong.me project pages may help the owner migrate
  material, but they are not a runtime dependency and must not be scraped
  during builds (§2.5).

**Status legend used in the tables below.**

| Status | Meaning |
|---|---|
| OK | Current value aligns with the extraction; carries into the draft unchanged (still covered by the final blanket owner sign-off). |
| OK (mechanical) | Structural derivation with no factual claim (e.g. slug from URL, line-break stripping). |
| NEEDS OWNER INPUT | No fact exists anywhere. The owner must supply it; the field stays empty until then. |
| NEEDS OWNER CONFIRMATION | An extracted (or ⚠-flagged) candidate exists but is **not approved**; the owner must confirm or correct the exact wording/figure before it enters the strict schema. |

---

## 1. Profile

**Current source:** none. `PROFILE` in
[lib/portfolio/profile.ts](../lib/portfolio/profile.ts) is deliberately
`null` — Phase 0 ships the schema only, and the canonical profile is
honestly absent rather than fabricated. The cockpit HUD carries no profile
data (the header shows the AX glyph and a weather chip only).

| Strict `PublicProfile` field | Current value | Dossier-extracted candidate (NOT approved) | Status |
|---|---|---|---|
| `name` | — (no source) | "Alex Xiong" | NEEDS OWNER CONFIRMATION |
| `targetRole` | — | "Creative Producer in gaming" | NEEDS OWNER CONFIRMATION |
| `summary` | — | Near-verbatim site bio: "My journey so far has been a kaleidoscope of roles, primarily within production, project management, and UX design," ready to "dive into any stage of the development process." Needs owner-approved concise wording, not a verbatim lift. | NEEDS OWNER INPUT (owner supplies/approves final wording) |
| `capabilities` | — | Project Management · UI/UX Design · Graphic Design · Game Design | NEEDS OWNER CONFIRMATION |
| `links` | — | LinkedIn `linkedin.com/in/alex-xiong-62b116204/` · Instagram `instagram.com/alex._.xiong/` | NEEDS OWNER CONFIRMATION (which links are recruiter-facing) |
| `email` (optional) | — | `alexxiong0522@gmail.com` (published on site) | NEEDS OWNER CONFIRMATION |
| `resumeUrl` (optional) | — | `https://www.alexxiong.me/s/Alex-Xiong-2025-Resume.pdf` ⚠ 2025 edition — confirm it is current before linking | NEEDS OWNER CONFIRMATION |

**Profile decisions (owner-only):**

- ⚠ **Phone number**: the site publishes one, but plan §A.4.2 forbids
  publishing private contact data. **Default: OMIT** pending an explicit
  owner decision to include it. It is not reproduced in this document.
- ⚠ **Résumé edition**: the extracted link is the 2025 edition; owner
  confirms it is the current résumé (or supplies a newer one) before it
  enters `resumeUrl`.

---

## 2. Projects — field mapping

Strict `Project` fields (§A.4.2): `id`, `slug`, `title`, `category`,
`date`, `status`, `tagline`, `summary`, `role`, `problem`,
`contributions`, `outcomes`, `tools`, `skills`, `team?`, `constraints?`,
`links`, `cover` (+ image `alt`). The provisional schema supplies only:
sleeve `title`, `category`, `date` (with `WIP` doubling as status),
`tagline`, `role`, `tools` (single string), `url`, `cover` path (no alt),
and presentation colors.

### 2.1 The Song of Maka (`/games/thesongofmaka`)

| Strict field | Current provisional value | Dossier candidate (NOT approved) | Status |
|---|---|---|---|
| `id` / `slug` | derived: `thesongofmaka` | same | OK (mechanical) |
| `title` | `THE SONG\nOF MAKA` (sleeve form; `projectDisplayTitle()` → "THE SONG OF MAKA") | "The Song of Maka" | OK (mechanical — canonical form strips line breaks) |
| `category` | `puzzle adventure` | 2D puzzle-adventure | OK |
| `date` | `2024` | ⚠ "4-year flagship, 2020–2024" — the span was **partly inferred by extraction**; confirm before use | NEEDS OWNER CONFIRMATION |
| `status` | — (implied non-WIP) | `completed` (implied by catalog marker + 2024 awards — implication, not a stated fact) | NEEDS OWNER CONFIRMATION |
| `tagline` | "A fallen king retakes his bird kingdom from a deadly disease." | Site summary says "retaking **their** bird kingdom" — catalog says "**his**". Owner picks the king's pronoun. | NEEDS OWNER CONFIRMATION |
| `summary` | — | 2D puzzle-adventure; evolved from Hollow Knight-inspired concepts to puzzle/environment-interaction over combat; ecological boss battles | NEEDS OWNER CONFIRMATION |
| `role` | `Creative Producer · Design Lead` | Creative Producer, Design Lead (co-directed with Game Director) | OK |
| `problem` | — | — (dossier gap: explicit problem statement missing) | NEEDS OWNER INPUT |
| `contributions` | — | co-direction; scouted and hired the team; design briefs, pitch decks, budget estimations for commercialization talks with Bilibili and Ubisoft; all design docs (Notion); UI/UX + all level design; art-pipeline oversight; Scrum/Kanban; monthly Tinylytics playtest reports | NEEDS OWNER CONFIRMATION (ownership claims — see §3, point 5) |
| `outcomes` | — | Best Game Grand Award, 4th CUSGA 2024 (⚠ "1st of 2000+ competitors" — **confirm figure**); Best Student Game, indiePlay China 2024; Best Narrative nomination, CUSGA 2024; Best Student Game nomination, Tencent Game Awards 2024; Best Visual nomination, 2nd CUSGA 2022; presented at GDC 2023 (NY State booth). ⚠ Dossier: strongest record — **verify certificates** for the awards/GDC appearance. | NEEDS OWNER CONFIRMATION |
| `tools` | `Unity · Figma · Adobe` | Unity, Figma, Procreate, Adobe Suite, Notion, Jira, Tinylytics (expanded list) | NEEDS OWNER CONFIRMATION |
| `skills` | — | — (no normalized skills separate from tools were extracted) | NEEDS OWNER INPUT |
| `team` | — | 15 (scouted and hired by Alex) — ownership claim | NEEDS OWNER CONFIRMATION |
| `constraints` | — | — | NEEDS OWNER INPUT (optional field) |
| `links` | `url` → alexxiong.me page only | prototype (Google Drive); case study `/thesongofmaka-casestudy` | NEEDS OWNER CONFIRMATION (targets + typed `kind`s) |
| `cover` / `alt` | `/vinyl-covers/song-of-maka.png`, no alt | — (alt text must describe visible information, not repeat the title) | NEEDS OWNER INPUT |

### 2.2 Chu Yu Hong 楚雨虹 (`/games/chuyuhong`)

| Strict field | Current provisional value | Dossier candidate (NOT approved) | Status |
|---|---|---|---|
| `id` / `slug` | derived: `chuyuhong` | same | OK (mechanical) |
| `title` | `CHU YU\nHONG` → "CHU YU HONG" | "Chu Yu Hong 楚雨虹" (Chinese characters in canonical title: owner call) | NEEDS OWNER CONFIRMATION |
| `category` | `horror point & click` | 2D horror point-and-click | OK |
| `date` | `2022` | ⚠ year **unstated on the site** — catalog says 2022, confirm | NEEDS OWNER CONFIRMATION |
| `status` | — (implied non-WIP) | `completed` (built in a 3-week jam; implication, not stated) | NEEDS OWNER CONFIRMATION |
| `tagline` | "A narrative horror adventure steeped in traditional Chinese folklore." | aligns with site | OK |
| `summary` | — | Cursed-documentary framing about a mall that was once an orphanage; Chinese folklore; three protagonists; built in a 3-week BOOOM game jam, team of 7, at Silverjay Studio | NEEDS OWNER CONFIRMATION |
| `role` | `Creative Director · Producer` | Creative Director / Project Lead / Producer | OK |
| `problem` | — | — (dossier gap: explicit problem statement missing) | NEEDS OWNER INPUT |
| `contributions` | — | all UI/UX; all animations + promo videos; second-level demo design; 10 environmental art pieces across three chapters; co-created core mechanics; Notion sprint management; publisher negotiation via pitch decks | NEEDS OWNER CONFIRMATION (ownership claims) |
| `outcomes` | — | ⚠ publisher deal is **under NDA** — publish only what the owner clears (e.g. "negotiated a publishing deal with a Chinese publisher"); first high-complexity Silverjay project; community on Chinese blog. Dossier gap: no measurable outcomes extracted. | NEEDS OWNER CONFIRMATION (NDA phrasing) + NEEDS OWNER INPUT (measurable outcomes, if any exist) |
| `tools` | `Photoshop · Figma · Procreate` | Photoshop, Illustrator, Figma, Procreate, AE, Premiere. Dossier gap: **engine unstated** | NEEDS OWNER CONFIRMATION (+ engine: NEEDS OWNER INPUT) |
| `skills` | — | — | NEEDS OWNER INPUT |
| `team` | — | 7, at Silverjay Studio | NEEDS OWNER CONFIRMATION |
| `constraints` | — | 3-week BOOOM game jam timebox | NEEDS OWNER CONFIRMATION |
| `links` | `url` → alexxiong.me page only | build download (Mandarin only, Drive); Figma design pipeline | NEEDS OWNER CONFIRMATION |
| `cover` / `alt` | `/vinyl-covers/chu-yu-hong.png`, no alt | — | NEEDS OWNER INPUT |

### 2.3 Tencent Games (`/design/tencentgames`)

⚠ **NDA banner on the source page: "most work remains confidential."**
Only the three public sub-projects below may be published; nothing beyond
them enters the schema. Owner clears the exact NDA scope (§3, point 2).

| Strict field | Current provisional value | Dossier candidate (NOT approved) | Status |
|---|---|---|---|
| `id` / `slug` | derived: `tencentgames` | same | OK (mechanical) |
| `title` | `TENCENT\nGAMES` → "TENCENT GAMES" | "Tencent Games" | OK (mechanical) |
| `category` | `event · ux design` | live-ops event design + UX | OK |
| `date` | `2022` | ⚠ year — catalog says 2022, **confirm**; internship duration is a dossier gap | NEEDS OWNER CONFIRMATION (year) + NEEDS OWNER INPUT (duration) |
| `status` | — (implied non-WIP) | `completed` (internship concluded; implication) | NEEDS OWNER CONFIRMATION |
| `tagline` | "Live-ops event design across Wild Rift, Lost Ark and Contra Returns." | aligns with the three public sub-projects | OK |
| `summary` | — | Live-ops event design + UX during a Tencent Games internship: Wild Rift WeChat check-in/referral events; Lost Ark WeChat AI assistant (PM/UX, UE5 Blueprint poses + interface, reward mechanics, UI transfer pathways); Contra Returns assistant event (PM/QA lead) | NEEDS OWNER CONFIRMATION (must stay within cleared NDA scope) |
| `role` | `Game Operations Intern` | internship (PM/UX; PM/QA lead on Contra Returns) | OK |
| `problem` | — | — (dossier gap: explicit problem statement missing) | NEEDS OWNER INPUT |
| `contributions` | — | Wild Rift WeChat check-in/referral event design; Lost Ark WeChat AI assistant PM/UX incl. UE5 Blueprint poses + interface, reward mechanics, UI transfer pathways; Contra Returns: timing analysis from prior campaigns, **managed 50 QA testers**, built the bug database; presented event result reports to Tencent/Wild Rift team | NEEDS OWNER CONFIRMATION (ownership claims + NDA scope) |
| `outcomes` | — | ⚠ page says **"targeted"** increases in ARPDAU/MAU/DAU/retention — **no measured figures are public**. Honest-outcomes rule: phrasing must stay "designed to increase…" unless the owner supplies cleared numbers. | NEEDS OWNER CONFIRMATION (phrasing; cleared numbers if any) |
| `tools` | `UE5 Blueprint · WeChat H5` | UE5 Blueprint; WeChat platform | OK |
| `skills` | — | — | NEEDS OWNER INPUT |
| `team` | — | — | NEEDS OWNER INPUT (optional field) |
| `constraints` | — | NDA: most work confidential; three public sub-projects only | NEEDS OWNER CONFIRMATION (exact cleared phrasing) |
| `links` | `url` → alexxiong.me page only | — (no additional links extracted) | NEEDS OWNER INPUT |
| `cover` / `alt` | `null` → generated motif cover | Strict generated cover requires `alt: ''` + `decorative: true` — valid only while the cover carries no unique information. Real Tencent cover art is a known pending item; if added, it needs descriptive alt. | NEEDS OWNER CONFIRMATION |

### 2.4 NYU Welcome 2022 (`/design/nyuwelcome`)

Dossier note: the most schema-complete project already; gaps are minimal.

| Strict field | Current provisional value | Dossier candidate (NOT approved) | Status |
|---|---|---|---|
| `id` / `slug` | derived: `nyuwelcome` | same | OK (mechanical) |
| `title` | `NYU\nWELCOME` → "NYU WELCOME" | "NYU Welcome 2022" | NEEDS OWNER CONFIRMATION (whether the year joins the canonical title) |
| `category` | `branding` | unified branding campaign | OK |
| `date` | `2022` | Summer 2022 (stated on site) | OK |
| `status` | — (implied non-WIP) | `completed` | NEEDS OWNER CONFIRMATION |
| `tagline` | "Campus-wide graphics campaign for NYU’s 2022 welcome season." | aligns | OK |
| `summary` | — | Unified branding campaign for NYU's welcome week, Summer 2022, as Digital Strategy Assistant (internship) | NEEDS OWNER CONFIRMATION |
| `role` | `Digital Strategy Assistant` | same (internship) | OK |
| `problem` | — | Stated on site: NYU needed one visual identity across digital + physical touchpoints | NEEDS OWNER CONFIRMATION |
| `contributions` | — | primary logo (deployed 10+ platforms incl. Kimmel); animated logo variants (Reels/TikTok/YouTube, Adobe Animate); Instagram content calendar; volunteer t-shirt worn by 150+ staff; assets for 10+ departments; NYU Mobile App event UI; branding guide; daily stakeholder meetings with faculty | NEEDS OWNER CONFIRMATION (site-quoted figures: 10+, 150+, 10+) |
| `outcomes` | — | deployment facts above double as outcomes; no separate measured outcomes extracted | NEEDS OWNER CONFIRMATION (which facts count as outcomes) |
| `tools` | `Animate · Photoshop` | Adobe Animate, Photoshop, NYU CMS | NEEDS OWNER CONFIRMATION |
| `skills` | — | — | NEEDS OWNER INPUT |
| `team` | — | — | NEEDS OWNER INPUT (optional field) |
| `constraints` | — | — | NEEDS OWNER INPUT (optional field) |
| `links` | `url` → alexxiong.me page only | — (no additional links extracted) | NEEDS OWNER INPUT |
| `cover` / `alt` | `/vinyl-covers/nyu-welcome.png`, no alt | — | NEEDS OWNER INPUT |

### 2.5 Shanghai Noir (`/wip/shanghainoir`)

| Strict field | Current provisional value | Dossier candidate (NOT approved) | Status |
|---|---|---|---|
| `id` / `slug` | derived: `shanghainoir` | same | OK (mechanical) |
| `title` | `SHANGHAI\nNOIR` → "SHANGHAI NOIR" | "Shanghai Noir" | OK (mechanical) |
| `category` | `voice game` | voice-activated detective game (Amazon Echo) | OK |
| `date` | `WIP` (doubles as status) | — (no start/target year extracted) | NEEDS OWNER INPUT |
| `status` | `WIP` marker | `in-progress` — dossier: schema records `in-progress` with **no invented outcomes** | OK |
| `tagline` | "A Clue-inspired murder mystery played entirely on Amazon Echo." | aligns (Agatha Christie / Clue-inspired) | OK |
| `summary` | — | Solo, ongoing voice-activated detective game on Amazon Echo; randomized culprits/weapons/motives; multiple endings | NEEDS OWNER CONFIRMATION |
| `role` | `Narrative · Design · Code` | solo — everything | OK |
| `problem` | — | Context stated on site: exploring narrative on emerging platforms after seeing Skyrim on Echo | NEEDS OWNER CONFIRMATION |
| `contributions` | — | Twine (SugarCube) + JS ↔ ADS integration; custom intents/invocation setup; narrative design; Gen-AI-assisted prompt generation | NEEDS OWNER CONFIRMATION |
| `outcomes` | — | none — WIP. Honest wording required (e.g. "in progress; no released outcomes"), never an invented result. | NEEDS OWNER CONFIRMATION (exact honest wording) |
| `tools` | `Alexa ADS · Twine · JS` | Twine (SugarCube), JS, Alexa ADS | OK |
| `skills` | — | — | NEEDS OWNER INPUT |
| `team` | — | solo | NEEDS OWNER CONFIRMATION |
| `constraints` | — | — | NEEDS OWNER INPUT (optional field) |
| `links` | `url` → alexxiong.me page only | ADS code zip on the page | NEEDS OWNER CONFIRMATION |
| `cover` / `alt` | `/vinyl-covers/shanghai-noir.png`, no alt | — | NEEDS OWNER INPUT |

### 2.6 ProcGen Dungeon (`/wip/procgendungeon`)

| Strict field | Current provisional value | Dossier candidate (NOT approved) | Status |
|---|---|---|---|
| `id` / `slug` | derived: `procgendungeon` | same | OK (mechanical) |
| `title` | `PROCGEN\nDUNGEON` → "PROCGEN DUNGEON" | "ProcGen Dungeon" | OK (mechanical) |
| `category` | `tech demo` | procedural dungeon generation demo | OK |
| `date` | `2024` | ⚠ **status/date mismatch** — catalog says 2024/complete; the site's `/wip` section implies WIP, while the page says the project is **completed**. Owner confirms both status and year. | NEEDS OWNER CONFIRMATION |
| `status` | — (implied non-WIP despite `/wip` URL) | `completed` per page text; ⚠ same mismatch as above | NEEDS OWNER CONFIRMATION |
| `tagline` | "Instant in-engine procedural dungeon generation in Unreal 5.3." | aligns | OK |
| `summary` | — | Procedural dungeon generation demo in UE 5.3 — cellular automata + wave function collapse + digger methods; instant generation with environment assets and foliage | NEEDS OWNER CONFIRMATION |
| `role` | `Systems · Shaders` | solo class-project work (implied) | NEEDS OWNER CONFIRMATION |
| `problem` | — | Context stated on site: "Procedural Generation in Unreal" class project | NEEDS OWNER CONFIRMATION |
| `contributions` | — | custom + postprocessing shaders; automated asset integration; environment grammar rulesets; procedural foliage; Blueprint scripting | NEEDS OWNER CONFIRMATION |
| `outcomes` | — | — (dossier gap: outcomes missing; qualitative is fine — it's a tech demo) | NEEDS OWNER INPUT |
| `tools` | `UE 5.3 · Blueprints · Quixel` | UE 5.3, Blueprints, custom shaders, Quixel | OK |
| `skills` | — | — | NEEDS OWNER INPUT |
| `team` | — | — | NEEDS OWNER INPUT (optional field) |
| `constraints` | — | class-project scope ("Procedural Generation in Unreal") | NEEDS OWNER CONFIRMATION |
| `links` | `url` → alexxiong.me page only | project file (Drive) | NEEDS OWNER CONFIRMATION |
| `cover` / `alt` | `/vinyl-covers/procgen-dungeon.png`, no alt | — | NEEDS OWNER INPUT |

### Out of scope

The site lists more work than the 6-record catalog (Re:Live ×2, Entangled,
Night of Chaos, NYU CSS, Destiny 2 UX Suggestions, Excel Escape Room,
Switch, Corporate Espionage, Gaming Industry Analysis). The cockpit crate
stays at 6; indexing more on `/projects` is an owner call for a later
phase — not Phase 0.

---

## 3. Cross-cutting owner checklist (Phase 0A step 4)

Mirrors the dossier's 5-point gap summary; every item blocks the strict
schema until resolved:

1. **Confirm dates**: Maka span (2020–2024 partly inferred), Chu Yu Hong
   year (unstated on site; catalog says 2022), Tencent year (catalog says
   2022) + internship duration, ProcGen year **and** status
   (WIP-vs-completed mismatch).
2. **Clear NDA phrasing**: Chu Yu Hong publisher deal; Tencent scope
   (three public sub-projects only; outcomes stay "targeted"/"designed
   to increase…" unless cleared numbers are supplied).
3. **Decide**: phone number in/out (default OMIT); résumé version (2025
   edition currency); CUSGA "1st of 2000+ competitors" figure.
4. **Supply explicit problem statements** where missing: Maka, Chu Yu
   Hong, Tencent.
5. **Approve every ownership claim** — "all UI/UX", "hired 15", "managed
   50 QA testers", "all level design", "all animations", etc. These are
   quoted from the owner's own site, but the schema still requires
   explicit sign-off before any of them enters the strict catalog.

Additional verification queued with the owner: award certificates and the
GDC 2023 appearance (dossier: "strongest record — verify certificates").

---

## 4. What happens next

1. **Owner supplies/approves** (Phase 0A steps 2–4): fills every
   NEEDS OWNER INPUT gap, confirms/corrects every NEEDS OWNER CONFIRMATION
   candidate, and signs off on final wording per subject (profile + six
   projects).
2. **Hashes recorded** (Phase 0A step 5): only after that explicit
   approval, a SHA-256 hash over the stable key-sorted serialization of
   the approved public fields (excluding presentation-only `visual`
   tokens) is recorded per subject in `content/portfolio-approvals.json` —
   by the owner's direction only, never by automation.
3. **Strict schema conversion**: the provisional records in
   `lib/projects/catalog.ts` are converted to the strict `Project` shape
   and the approved `PublicProfile` instance replaces `PROFILE = null` in
   `lib/portfolio/profile.ts`.
4. **Phase 0B flips enforcement to blocking**: completeness validation
   (currently non-blocking `pending`) and approval-manifest validation
   (missing/duplicate/unknown subject, unsupported schema version, hash
   mismatch) become CI-blocking. Any later content change invalidates its
   hash and stays blocked until the owner re-reviews.
