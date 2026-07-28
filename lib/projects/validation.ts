// Pure catalog validation (§8 Phase 0).
//
// Two layers, deliberately separated:
//   1. validateCatalogStructure — BLOCKING from Phase 0: structural checks
//      on the provisional records (unique identity, non-empty prose,
//      serializability, URL/color shape).
//   2. validateCatalogCompleteness — strict §A.4.2 completeness. It exists
//      now but reports `pending` (non-blocking) until Phase 0B, because the
//      content it demands is authored in Phase 0A with owner approval.
//      "Non-blocking" never permits placeholder prose — it permits an
//      honestly incomplete provisional record.

import {
  isJsonSerializable,
  isNonEmptyString,
  issue,
  pending,
  type ValidationIssue,
} from '@/lib/shared/core'
import {
  catalogSlugs,
  projectDisplayTitle,
  projectSlug,
  type ProvisionalProject,
} from '@/lib/projects/catalog'

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/
const COVER_PREFIX = '/vinyl-covers/'
const SLUG_SHAPE = /^[a-z0-9-]+$/

const REQUIRED_PROSE_FIELDS = [
  'title',
  'category',
  'date',
  'tagline',
  'role',
  'tools',
] as const

/** Blocking structural validation of the provisional catalog. */
export function validateCatalogStructure(
  projects: readonly ProvisionalProject[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (projects.length === 0) {
    issues.push(issue('catalog', 'catalog is empty'))
    return issues
  }

  const seenSlugs = new Map<string, number>()
  const seenTitles = new Map<string, number>()
  const seenUrls = new Map<string, number>()

  projects.forEach((project, index) => {
    const subject = `project[${index}] ${projectDisplayTitle(project) || '(untitled)'}`

    for (const field of REQUIRED_PROSE_FIELDS) {
      if (!isNonEmptyString(project[field])) {
        issues.push(issue(subject, `required field "${field}" is empty`))
      }
    }

    if (!isNonEmptyString(project.url) || !/^https:\/\//.test(project.url)) {
      issues.push(issue(subject, `url must be an absolute https URL, got "${project.url}"`))
    } else {
      const slug = projectSlug(project)
      if (!SLUG_SHAPE.test(slug)) {
        issues.push(issue(subject, `derived slug "${slug}" is not url-safe`))
      }
      const priorSlug = seenSlugs.get(slug)
      if (priorSlug !== undefined) {
        issues.push(issue(subject, `derived slug "${slug}" duplicates project[${priorSlug}]`))
      }
      seenSlugs.set(slug, index)
      const priorUrl = seenUrls.get(project.url)
      if (priorUrl !== undefined) {
        issues.push(issue(subject, `url duplicates project[${priorUrl}]`))
      }
      seenUrls.set(project.url, index)
    }

    const displayTitle = projectDisplayTitle(project)
    const priorTitle = seenTitles.get(displayTitle)
    if (priorTitle !== undefined) {
      issues.push(issue(subject, `title duplicates project[${priorTitle}]`))
    }
    seenTitles.set(displayTitle, index)

    if (project.cover !== null) {
      if (!project.cover.startsWith(COVER_PREFIX)) {
        issues.push(
          issue(subject, `cover must be null or start with "${COVER_PREFIX}", got "${project.cover}"`),
        )
      }
    }

    for (const colorField of ['bg', 'accent', 'text'] as const) {
      if (!HEX_COLOR.test(project[colorField])) {
        issues.push(issue(subject, `${colorField} must be a #RRGGBB hex color`))
      }
    }

    if (!isJsonSerializable(project)) {
      issues.push(issue(subject, 'record is not JSON-serializable'))
    }
  })

  return issues
}

/**
 * Strict §A.4.2 completeness — every field the strict `Project` schema
 * demands that the provisional record cannot supply yet. NON-BLOCKING
 * (severity `pending`) until Phase 0B. Each pending row is an explicit
 * owner-input gap tracked in docs/content-inventory.md, never a slot to
 * fill with generated prose.
 */
export function validateCatalogCompleteness(
  projects: readonly ProvisionalProject[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const missingStrictFields = [
    'id',
    'slug',
    'status',
    'summary',
    'problem',
    'contributions',
    'outcomes',
    'skills',
    'links (typed kinds)',
    'cover alt text / decorative classification',
  ] as const

  projects.forEach((project, index) => {
    const subject = `project[${index}] ${projectDisplayTitle(project) || '(untitled)'}`
    for (const field of missingStrictFields) {
      issues.push(
        pending(
          subject,
          `strict schema field "${field}" awaits Phase 0A owner-approved content`,
        ),
      )
    }
  })

  const slugs = catalogSlugs(projects)
  if (new Set(slugs).size !== slugs.length) {
    // Duplicate slugs are already a blocking structural error; repeated here
    // so completeness output is self-contained.
    issues.push(issue('catalog', 'derived slugs are not unique'))
  }

  return issues
}
