// Canonical, serializable project catalog (§A.4.1 catalog/texture split).
//
// This module is server-safe by contract:
//   FORBIDDEN here: "use client", three.js, window, document, canvas code,
//   `@ts-nocheck`.
// Browser-only artwork generation lives in
// components/cockpit/project-textures.ts, which imports this catalog.
//
// Phase 0 status: the catalog carries the PROVISIONAL schema — the fields
// that existed before the responsive-system plan. The strict `Project`
// schema below (§A.4.2) is the target; strict completeness validation
// exists in lib/projects/validation.ts but reports non-blocking `pending`
// results until Phase 0B, because the content it demands is authored in
// Phase 0A with owner approval. Never fill a gap with invented facts.

import type { NonEmptyStrings } from '@/lib/shared/core'

// ── Strict target schema (§A.4.2) ─────────────────────────────────────────

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
 * The strict project record every catalog entry must satisfy once Phase 0A
 * content is owner-approved and Phase 0B flips completeness validation to
 * blocking. `outcomes` may be qualitative, but must be truthful; a project
 * with no measured result says so plainly via `status` and honest wording.
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
  /** Presentation-only tokens (sleeve palette etc.) — excluded from the
   *  §A.4.2 approval hash. */
  readonly visual?: Readonly<Record<string, string | number>>
}

// ── Provisional schema (current data, pre-Phase-0A) ───────────────────────

export type ProvisionalProject = {
  /** Sleeve-art form with authored line breaks; use projectDisplayTitle()
   *  for the canonical single-line title. */
  readonly title: string
  readonly category: string
  readonly date: string
  readonly tagline: string
  readonly role: string
  readonly tools: string
  readonly url: string
  /** `/vinyl-covers/…` thumbnail, or null for a generated motif cover. */
  readonly cover: string | null
  readonly bg: string
  readonly accent: string
  readonly text: string
}

// Real project records (from alexxiong.me). Content edits to this array are
// canonical-portfolio changes: they require the content-validation workflow
// and, after Phase 0B, an owner-approved record in
// content/portfolio-approvals.json.
export const PROJECTS: readonly ProvisionalProject[] = [
  // Owner-corrected 2026-07-27: canonical name is "Song of Maka" (no
  // leading "The"); the king's pronoun is "their" (matches the site).
  { title: 'SONG\nOF MAKA', category: 'puzzle adventure', date: '2024',
    tagline: 'A fallen king retakes their bird kingdom from a deadly disease.',
    role: 'Creative Producer · Design Lead', tools: 'Unity · Figma · Adobe',
    url: 'https://www.alexxiong.me/games/thesongofmaka',
    cover: '/vinyl-covers/song-of-maka.png',
    bg: '#E8E4DC', accent: '#4B6E4F', text: '#1E1C1A' },
  { title: 'CHU YU\nHONG', category: 'horror point & click', date: '2022',
    tagline: 'A narrative horror adventure steeped in traditional Chinese folklore.',
    role: 'Creative Director · Producer', tools: 'Photoshop · Figma · Procreate',
    url: 'https://www.alexxiong.me/games/chuyuhong',
    cover: '/vinyl-covers/chu-yu-hong.png',
    bg: '#1E1C1A', accent: '#7FA683', text: '#E8E4DC' },
  // Owner-corrected 2026-07-27: internship was June–September 2023.
  { title: 'TENCENT\nGAMES', category: 'event · ux design', date: '2023',
    tagline: 'Live-ops event design across Wild Rift, Lost Ark and Contra Returns.',
    role: 'Game Operations Intern', tools: 'UE5 Blueprint · WeChat H5',
    url: 'https://www.alexxiong.me/design/tencentgames',
    cover: null,
    bg: '#3A3644', accent: '#E8E4DC', text: '#E8E4DC' },
  { title: 'NYU\nWELCOME', category: 'branding', date: '2022',
    tagline: 'Campus-wide graphics campaign for NYU’s 2022 welcome season.',
    role: 'Digital Strategy Assistant', tools: 'Animate · Photoshop',
    url: 'https://www.alexxiong.me/design/nyuwelcome',
    cover: '/vinyl-covers/nyu-welcome.png',
    bg: '#6E6878', accent: '#E8E4DC', text: '#E8E4DC' },
  { title: 'SHANGHAI\nNOIR', category: 'voice game', date: 'WIP',
    tagline: 'A Clue-inspired murder mystery played entirely on Amazon Echo.',
    role: 'Narrative · Design · Code', tools: 'Alexa ADS · Twine · JS',
    url: 'https://www.alexxiong.me/wip/shanghainoir',
    cover: '/vinyl-covers/shanghai-noir.png',
    bg: '#2B4A30', accent: '#CFC9C0', text: '#E8E4DC' },
  { title: 'PROCGEN\nDUNGEON', category: 'tech demo', date: '2024',
    tagline: 'Instant in-engine procedural dungeon generation in Unreal 5.3.',
    role: 'Systems · Shaders', tools: 'UE 5.3 · Blueprints · Quixel',
    url: 'https://www.alexxiong.me/wip/procgendungeon',
    cover: '/vinyl-covers/procgen-dungeon.png',
    bg: '#D8D3C7', accent: '#3A5A3E', text: '#1E1C1A' },
]

// ── Pure helpers ──────────────────────────────────────────────────────────

/** Canonical single-line title: sleeve-art line breaks become spaces. */
export function projectDisplayTitle(project: ProvisionalProject): string {
  return project.title.replace(/\s*\n\s*/g, ' ').trim()
}

/**
 * Stable URL slug for a provisional record, derived from the last path
 * segment of its project URL (e.g. `thesongofmaka`). The strict schema
 * stores an explicit `slug`; this derivation bridges until Phase 0A.
 */
export function projectSlug(project: ProvisionalProject): string {
  const path = project.url.replace(/\/+$/, '')
  const segment = path.slice(path.lastIndexOf('/') + 1)
  return segment.toLowerCase()
}

export function catalogSlugs(
  projects: readonly ProvisionalProject[] = PROJECTS,
): readonly string[] {
  return projects.map(projectSlug)
}
