// Canonical, serializable project catalog (§A.4.1 catalog/texture split;
// §A.4.2 strict schema — Phase 0A step 5 conversion).
//
// This module is server-safe by contract:
//   FORBIDDEN here: "use client", three.js, window, document, canvas code,
//   `@ts-nocheck`.
// Browser-only artwork generation lives in
// components/cockpit/project-textures.ts, which imports this catalog.
//
// CONTENT RULES (docs/responsive-system.md §9, docs/content-inventory.md):
// every fact below is owner-approved via the Phase 0A process; edits to
// public fields invalidate the §A.4.2 approval hash in
// content/portfolio-approvals.json and fail CI until the owner re-approves
// the exact new content. Presentation-only `visual` tokens are excluded
// from the hash. Never edit facts here without owner sign-off.

import { isNonEmptyString, type NonEmptyStrings } from '@/lib/shared/core'

// ── Strict schema (§A.4.2) ────────────────────────────────────────────────

export type ProjectLinkKind = 'case-study' | 'live' | 'source' | 'media'

export type ProjectLink = {
  readonly label: string
  readonly href: string
  readonly kind: ProjectLinkKind
}

export type ProjectStatus = 'completed' | 'in-progress' | 'concept'

export type ProjectCover =
  | { readonly kind: 'image'; readonly src: string; readonly alt: string }
  | { readonly kind: 'generated'; readonly alt: ''; readonly decorative: true }

/**
 * The strict project record. `outcomes` may be qualitative, but must be
 * truthful; a project with no measured result says so plainly via `status`
 * and honest wording. Canonical titles carry no artwork line breaks — the
 * sleeve-art form lives in `visual.artTitle` and the texture layer derives
 * from it without changing the record.
 */
export type Project = {
  readonly id: string
  readonly slug: string
  readonly title: string
  readonly category: string
  readonly date: string
  readonly status: ProjectStatus
  readonly tagline: string
  readonly summary: string
  readonly role: string
  readonly problem: string
  readonly contributions: NonEmptyStrings
  readonly outcomes: NonEmptyStrings
  readonly tools: NonEmptyStrings
  readonly skills: NonEmptyStrings
  readonly constraints?: readonly string[]
  readonly team?: string
  readonly links: readonly ProjectLink[]
  readonly cover: ProjectCover
  /** Presentation-only tokens (sleeve art title, palette, short labels) —
   *  excluded from the §A.4.2 approval hash. */
  readonly visual?: Readonly<Record<string, string | number>>
}

// ── The six owner-approved records ────────────────────────────────────────

export const PROJECTS: readonly Project[] = [
  {
    id: 'songofmaka',
    slug: 'songofmaka',
    title: 'Song of Maka',
    category: 'puzzle adventure',
    date: '2021–Present',
    status: 'in-progress',
    tagline: 'A fallen king retakes their bird kingdom from a deadly disease.',
    summary:
      '2D puzzle-adventure about a fallen king retaking their bird kingdom ' +
      'from a deadly disease. Evolved from Hollow Knight-inspired combat ' +
      'concepts toward puzzle and environment interaction, with ecological ' +
      'boss battles.',
    role: 'Creative Producer · Design Lead',
    problem:
      'A 15-person student team needed to sustain a five-year production ' +
      '— now in post-production — while evolving early Hollow ' +
      'Knight-inspired combat concepts into a differentiated ' +
      'puzzle-and-environment-interaction adventure.',
    contributions: [
      'Co-directed the game with the Game Director',
      'Scouted and hired the 15-person team',
      'Wrote design briefs, pitch decks, and budget estimations for commercialization talks with Bilibili and Ubisoft',
      'Owned all design documentation in Notion',
      'Designed the UI/UX and all levels',
      'Oversaw the art pipeline',
      'Ran Scrum/Kanban production',
      'Produced monthly Tinylytics playtest reports',
    ],
    outcomes: [
      'Best Game Grand Award, 4th CUSGA 2024 — 1st of 2000+ competitors',
      'Best Student Game, indiePlay China 2024',
      'Best Narrative nomination, CUSGA 2024',
      'Best Student Game nomination, Tencent Game Awards 2024',
      'Best Visual nomination, 2nd CUSGA 2022',
      'Presented at GDC 2023 (New York State booth)',
    ],
    tools: ['Unity', 'Figma', 'Procreate', 'Adobe Suite', 'Notion', 'Jira', 'Tinylytics'],
    skills: [
      'Creative production',
      'Game design',
      'Level design',
      'UI/UX design',
      'Team building & hiring',
      'Scrum/Kanban',
      'Playtest analysis',
    ],
    team: '15 — scouted and hired by Alex',
    links: [
      {
        label: 'Project page',
        href: 'https://www.alexxiong.me/games/songofmaka',
        kind: 'case-study',
      },
    ],
    cover: {
      kind: 'image',
      src: '/vinyl-covers/song-of-maka.png',
      alt:
        'Night scene beneath a glowing pale tree: a caped bird bard plays ' +
        'music by the water as small birds gather, under the title ' +
        '"Song of Maka".',
    },
    visual: {
      artTitle: 'SONG\nOF MAKA',
      dateLabel: '2024',
      toolsLabel: 'Unity · Figma · Adobe',
      bg: '#E8E4DC',
      accent: '#4B6E4F',
      text: '#1E1C1A',
    },
  },
  {
    id: 'chuyuhong',
    slug: 'chuyuhong',
    title: 'Chu Yu Hong',
    category: 'horror point & click',
    date: '2022',
    status: 'completed',
    tagline: 'A narrative horror adventure steeped in traditional Chinese folklore.',
    summary:
      '2D horror point-and-click — Chinese title 楚雨虹, rendered as the ' +
      'subtitle — framed as a cursed documentary about a mall that was ' +
      'once an orphanage, drawing on Chinese folklore across three ' +
      'protagonists. Built in a three-week BOOOM game jam by a team of ' +
      'seven at Silverjay Studio.',
    role: 'Creative Director · Project Lead · Producer',
    problem:
      "Silverjay Studio's first high-complexity project: deliver a " +
      'folklore-driven horror point-and-click across three protagonists ' +
      'with a team of seven, inside a three-week BOOOM game-jam timebox.',
    contributions: [
      'Directed and produced as Creative Director / Project Lead',
      'Designed all UI/UX',
      'Created all animations and promo videos',
      'Designed the second-level demo',
      'Painted 10 environmental art pieces across three chapters',
      'Co-created the core mechanics',
      'Ran sprint management in Notion',
    ],
    outcomes: [
      'First high-complexity project at Silverjay Studio',
      'Built a community on a Chinese blog',
    ],
    tools: ['Photoshop', 'Illustrator', 'Figma', 'Procreate', 'After Effects', 'Premiere'],
    skills: [
      'Creative direction',
      'Production',
      'UI/UX design',
      '2D animation',
      'Environmental art',
      'Video editing',
    ],
    team: '7 — Silverjay Studio',
    constraints: ['Three-week BOOOM game-jam timebox'],
    links: [
      {
        label: 'Project page',
        href: 'https://www.alexxiong.me/games/chuyuhong',
        kind: 'case-study',
      },
    ],
    cover: {
      kind: 'image',
      src: '/vinyl-covers/chu-yu-hong.png',
      alt:
        'Distressed horror poster: a ghostly figure in the dark beside ' +
        'large cracked red Chinese characters reading Chu Yu Hong, with ' +
        'Chinese taglines and credits.',
    },
    visual: {
      artTitle: 'CHU YU\nHONG',
      roleLabel: 'Creative Director · Producer',
      toolsLabel: 'Photoshop · Figma · Procreate',
      bg: '#1E1C1A',
      accent: '#7FA683',
      text: '#E8E4DC',
    },
  },
  {
    id: 'tencentgames',
    slug: 'tencentgames',
    title: 'Tencent Games',
    category: 'event · ux design',
    date: '2023',
    status: 'completed',
    tagline: 'Live-ops event design across Wild Rift, Lost Ark and Contra Returns.',
    summary:
      'Live-ops event design and UX during a Tencent Games internship ' +
      '(June–September 2023): WeChat check-in and referral events for Wild ' +
      'Rift, a WeChat AI assistant for Lost Ark, and a WeChat assistant ' +
      'event for Contra Returns. Most work remains confidential; only ' +
      'these three public sub-projects are described.',
    role: 'Game Operations Intern',
    problem:
      'Three live titles — Wild Rift, Lost Ark, and Contra Returns — ' +
      'needed WeChat-based live-ops events and assistant experiences ' +
      'designed to increase ARPDAU, MAU, DAU, and retention.',
    contributions: [
      'Designed Wild Rift WeChat check-in and referral events',
      'PM/UX for the Lost Ark WeChat AI assistant — UE5 Blueprint poses and interface, reward mechanics, UI transfer pathways',
      'PM/QA lead for the Contra Returns WeChat assistant event — timing analysis from prior campaigns, managed 50 QA testers, built the bug database',
      'Presented event result reports to the Tencent / Wild Rift team',
    ],
    outcomes: [
      'Events designed to increase ARPDAU, MAU, DAU, and retention — measured results remain confidential',
      'Event result reports delivered to the Tencent Wild Rift team',
    ],
    tools: ['UE5 Blueprint', 'WeChat H5'],
    skills: ['Live-ops event design', 'Project management', 'UX design', 'QA coordination'],
    constraints: ['NDA: only three public sub-projects may be described'],
    links: [
      {
        label: 'Project page',
        href: 'https://www.alexxiong.me/design/tencentgames',
        kind: 'case-study',
      },
    ],
    cover: { kind: 'generated', alt: '', decorative: true },
    visual: {
      artTitle: 'TENCENT\nGAMES',
      toolsLabel: 'UE5 Blueprint · WeChat H5',
      bg: '#3A3644',
      accent: '#E8E4DC',
      text: '#E8E4DC',
    },
  },
  {
    id: 'nyuwelcome',
    slug: 'nyuwelcome',
    title: 'NYU Welcome 2022',
    category: 'branding',
    date: '2022',
    status: 'completed',
    tagline: 'Campus-wide graphics campaign for NYU’s 2022 welcome season.',
    summary:
      "Unified branding campaign for NYU's 2022 welcome week as Digital " +
      'Strategy Assistant: one visual identity across digital and physical ' +
      'touchpoints, from the primary logo to platform-specific animations ' +
      'and event UI.',
    role: 'Digital Strategy Assistant',
    problem:
      'NYU needed one visual identity for welcome week across its digital ' +
      'and physical touchpoints.',
    contributions: [
      'Designed the primary logo, deployed across 10+ platforms including the Kimmel Center',
      'Created animated logo variants for Reels, TikTok, and YouTube in Adobe Animate',
      'Ran the Instagram content calendar',
      'Designed the volunteer t-shirt worn by 150+ staff',
      'Produced assets for 10+ departments',
      'Designed the NYU Mobile App event UI',
      'Wrote the branding guide',
      'Held daily stakeholder meetings with faculty',
    ],
    outcomes: [
      'One identity deployed across 10+ platforms and 10+ departments',
      'Volunteer t-shirt worn by 150+ staff during welcome week',
    ],
    tools: ['Adobe Animate', 'Photoshop', 'NYU CMS'],
    skills: [
      'Branding',
      'Graphic design',
      'Motion design',
      'Content strategy',
      'Stakeholder management',
    ],
    links: [
      {
        label: 'Project page',
        href: 'https://www.alexxiong.me/design/nyuwelcome',
        kind: 'case-study',
      },
    ],
    cover: {
      kind: 'image',
      src: '/vinyl-covers/nyu-welcome.png',
      alt:
        'Neon-styled illustration of the New York skyline between the ' +
        'Brooklyn and Manhattan bridges, a glowing vinyl-record ' +
        '"NYU Welcome 2022" logo in the sky above the words ' +
        '"Branding Guide".',
    },
    visual: {
      artTitle: 'NYU\nWELCOME',
      toolsLabel: 'Animate · Photoshop',
      bg: '#6E6878',
      accent: '#E8E4DC',
      text: '#E8E4DC',
    },
  },
  {
    id: 'shanghainoir',
    slug: 'shanghainoir',
    title: 'Shanghai Noir',
    category: 'voice game',
    date: 'ongoing',
    status: 'in-progress',
    tagline: 'A Clue-inspired murder mystery played entirely on Amazon Echo.',
    summary:
      'Solo, research-oriented passion project in audio interaction: a ' +
      'voice-activated detective game for Amazon Echo — an Agatha ' +
      'Christie / Clue-inspired mystery with randomized culprits, ' +
      'weapons, and motives, and multiple endings. One of the final ' +
      'undergraduate (BFA) projects that broadened an interest in the ' +
      'implications of interactive technology, leading to information ' +
      'science and HCI study at Cornell Tech.',
    role: 'Narrative · Design · Code',
    problem:
      'A research-oriented exploration of audio interaction: can an ' +
      'emerging voice platform (Amazon Echo) carry a branching, ' +
      'replayable detective narrative? Sparked by seeing Skyrim running ' +
      'on the Echo.',
    contributions: [
      'Everything, solo: narrative design plus Twine (SugarCube) and JavaScript integration with Alexa (ADS)',
      'Custom intents and invocation setup',
      'Gen-AI-assisted prompt generation',
    ],
    outcomes: ['In progress — no released outcome yet'],
    tools: ['Alexa ADS', 'Twine (SugarCube)', 'JavaScript'],
    skills: ['Narrative design', 'Voice UX', 'Audio interaction', 'Scripting'],
    links: [
      {
        label: 'Project page',
        href: 'https://www.alexxiong.me/wip/shanghainoir',
        kind: 'case-study',
      },
    ],
    cover: {
      kind: 'image',
      src: '/vinyl-covers/shanghai-noir.png',
      alt:
        'Rain-slicked neon alley at night in a stylized Shanghai: glowing ' +
        'red and pink Chinese shop signs crowd a narrow street fading ' +
        'into fog.',
    },
    visual: {
      artTitle: 'SHANGHAI\nNOIR',
      dateLabel: 'WIP',
      toolsLabel: 'Alexa ADS · Twine · JS',
      bg: '#2B4A30',
      accent: '#CFC9C0',
      text: '#E8E4DC',
    },
  },
  {
    id: 'procgendungeon',
    slug: 'procgendungeon',
    title: 'ProcGen Dungeon',
    category: 'tech demo',
    date: '2024',
    status: 'completed',
    tagline: 'Instant in-engine procedural dungeon generation in Unreal 5.3.',
    summary:
      'Procedural dungeon generation demo in Unreal Engine 5.3 combining ' +
      'cellular automata, wave function collapse, and digger methods — ' +
      'instant generation complete with environment assets and foliage. ' +
      'Built for a "Procedural Generation in Unreal" class; with Shanghai ' +
      'Noir, one of the final undergraduate (BFA) projects that broadened ' +
      'an interest in the implications of interactive technology, leading ' +
      'to information science and HCI study at Cornell Tech.',
    role: 'Systems · Shaders',
    problem:
      'Class project: generate complete, dressed dungeon environments ' +
      'in-engine, instantly, by combining cellular automata, ' +
      'wave-function-collapse, and digger algorithms.',
    contributions: [
      'Custom and postprocessing shaders',
      'Automated asset integration',
      'Environment grammar rulesets',
      'Procedural foliage',
      'Blueprint scripting',
    ],
    outcomes: [
      'Completed tech demo: instant in-engine generation with environment assets and foliage',
    ],
    tools: ['Unreal Engine 5.3', 'Blueprints', 'Custom shaders', 'Quixel'],
    skills: [
      'Procedural generation',
      'Technical art',
      'Shader development',
      'Blueprint scripting',
    ],
    links: [
      {
        label: 'Project page',
        href: 'https://www.alexxiong.me/wip/procgendungeon',
        kind: 'case-study',
      },
    ],
    cover: {
      kind: 'image',
      src: '/vinyl-covers/procgen-dungeon.png',
      alt:
        'Unreal Engine editor screenshot of a procedurally generated ' +
        'sand-colored dungeon village with peaked rooftops, framed by the ' +
        'editor panels around the viewport.',
    },
    visual: {
      artTitle: 'PROCGEN\nDUNGEON',
      toolsLabel: 'UE 5.3 · Blueprints · Quixel',
      bg: '#D8D3C7',
      accent: '#3A5A3E',
      text: '#1E1C1A',
    },
  },
]

// ── Pure helpers ──────────────────────────────────────────────────────────

export function catalogSlugs(projects: readonly Project[] = PROJECTS): readonly string[] {
  return projects.map((project) => project.slug)
}

// ── Cockpit presentation adapter ──────────────────────────────────────────
// The 3D layer (crate sleeves, deck card, disc textures) reads this derived
// shape, NOT the strict record directly. It carries no unique facts: every
// field is the canonical value or a `visual` presentation token derived
// from it (sleeve-art title with authored line breaks, shortened tool
// label, palette). Still server-safe — plain data derivation.

export type SleeveRecord = {
  readonly title: string
  readonly category: string
  readonly date: string
  readonly tagline: string
  readonly role: string
  readonly tools: string
  readonly cover: string | null
  readonly bg: string
  readonly accent: string
  readonly text: string
}

export function sleeveRecord(project: Project): SleeveRecord {
  const visual = project.visual ?? {}
  const token = (key: string, fallback: string): string => {
    const value = visual[key]
    return isNonEmptyString(value) ? value : fallback
  }
  return {
    title: token('artTitle', project.title.toUpperCase()),
    category: project.category,
    date: token('dateLabel', project.status === 'completed' ? project.date : 'WIP'),
    tagline: project.tagline,
    role: token('roleLabel', project.role),
    tools: token('toolsLabel', project.tools.join(' · ')),
    cover: project.cover.kind === 'image' ? project.cover.src : null,
    bg: token('bg', '#E8E4DC'),
    accent: token('accent', '#4B6E4F'),
    text: token('text', '#1E1C1A'),
  }
}

export const SLEEVES: readonly SleeveRecord[] = PROJECTS.map(sleeveRecord)
