// Pure catalog validation — Phase 0B form: the catalog now carries the
// strict §A.4.2 schema, so completeness IS structural validation and every
// check is BLOCKING. (The Phase 0 provisional/pending split retired when
// the owner-approved records landed in Phase 0A step 5.)

import {
  isJsonSerializable,
  isNonEmptyString,
  hasRecordShape,
  issue,
  type ValidationIssue,
} from '@/lib/shared/core'
import type { Project, ProjectLinkKind, ProjectStatus } from '@/lib/projects/catalog'

const SLUG_SHAPE = /^[a-z0-9-]+$/
const COVER_PREFIX = '/vinyl-covers/'

const PROJECT_STATUSES: readonly ProjectStatus[] = ['completed', 'in-progress', 'concept']
const LINK_KINDS: readonly ProjectLinkKind[] = ['case-study', 'live', 'source', 'media']

const REQUIRED_PROSE_FIELDS = [
  'title',
  'category',
  'date',
  'tagline',
  'summary',
  'role',
  'problem',
] as const

const REQUIRED_LIST_FIELDS = ['contributions', 'outcomes', 'tools', 'skills'] as const

/** Blocking strict-schema validation of the canonical catalog. */
export function validateCatalogStructure(projects: readonly Project[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (!Array.isArray(projects)) {
    return [issue('catalog', 'catalog must be an array')]
  }
  if (projects.length === 0) {
    issues.push(issue('catalog', 'catalog is empty'))
    return issues
  }

  const seenIds = new Map<string, number>()
  const seenSlugs = new Map<string, number>()
  const seenTitles = new Map<string, number>()

  projects.forEach((project: Project, index: number) => {
    if (!hasRecordShape(project)) {
      issues.push(issue(`project[${index}]`, 'record must be an object'))
      return
    }
    const subject = `project[${index}] ${project.title || '(untitled)'}`

    // Identity.
    for (const [field, seen] of [
      ['id', seenIds],
      ['slug', seenSlugs],
    ] as const) {
      const value = project[field]
      if (!isNonEmptyString(value) || !SLUG_SHAPE.test(value)) {
        issues.push(issue(subject, `${field} "${String(value)}" must be a url-safe slug`))
        continue
      }
      const prior = seen.get(value)
      if (prior !== undefined) {
        issues.push(issue(subject, `${field} "${value}" duplicates project[${prior}]`))
      }
      seen.set(value, index)
    }

    // Required prose.
    for (const field of REQUIRED_PROSE_FIELDS) {
      if (!isNonEmptyString(project[field])) {
        issues.push(issue(subject, `required field "${field}" is empty`))
      }
    }
    if (typeof project.title === 'string') {
      if (project.title.includes('\n')) {
        issues.push(
          issue(subject, 'canonical title contains a line break — art form belongs in visual.artTitle'),
        )
      }
      const priorTitle = seenTitles.get(project.title)
      if (priorTitle !== undefined) {
        issues.push(issue(subject, `title duplicates project[${priorTitle}]`))
      }
      seenTitles.set(project.title, index)
    }

    if (!PROJECT_STATUSES.includes(project.status)) {
      issues.push(issue(subject, `unrecognized status "${String(project.status)}"`))
    }

    // Required non-empty lists.
    for (const field of REQUIRED_LIST_FIELDS) {
      const list = project[field]
      if (!Array.isArray(list) || list.length === 0) {
        issues.push(issue(subject, `required list "${field}" is empty`))
        continue
      }
      list.forEach((entry, entryIndex) => {
        if (!isNonEmptyString(entry)) {
          issues.push(issue(subject, `${field}[${entryIndex}] is empty`))
        }
      })
    }

    // Optional context fields must be non-empty when present.
    if (project.team !== undefined && !isNonEmptyString(project.team)) {
      issues.push(issue(subject, 'team is present but empty'))
    }
    if (project.constraints !== undefined) {
      if (!Array.isArray(project.constraints)) {
        issues.push(issue(subject, 'constraints must be an array'))
      } else {
        if (project.constraints.length === 0) {
          issues.push(issue(subject, 'constraints is present but empty'))
        }
        project.constraints.forEach((entry, entryIndex) => {
          if (!isNonEmptyString(entry)) {
            issues.push(issue(subject, `constraints[${entryIndex}] is empty`))
          }
        })
      }
    }

    // Links: typed kinds, resolvable hrefs.
    if (!Array.isArray(project.links)) {
      issues.push(issue(subject, 'links must be an array'))
    } else {
      project.links.forEach((link, linkIndex) => {
        const linkSubject = `${subject} links[${linkIndex}]`
        if (!hasRecordShape(link)) {
          issues.push(issue(linkSubject, 'link must be an object'))
          return
        }
        if (!isNonEmptyString(link.label)) issues.push(issue(linkSubject, 'label is empty'))
        if (!LINK_KINDS.includes(link.kind)) {
          issues.push(issue(linkSubject, `unrecognized link kind "${String(link.kind)}"`))
        }
        if (
          typeof link.href !== 'string' ||
          (!/^https:\/\/.+/.test(link.href) && !link.href.startsWith('/'))
        ) {
          issues.push(
            issue(linkSubject, `href "${String(link.href)}" must be https:// or site-relative`),
          )
        }
      })
    }

    // Cover: informative images need meaningful alternatives; generated
    // motifs use the explicit decorative branch (§A.4.2).
    if (!hasRecordShape(project.cover)) {
      issues.push(issue(subject, 'cover must be an object'))
    } else if (project.cover.kind === 'image') {
      if (
        typeof project.cover.src !== 'string' ||
        !project.cover.src.startsWith(COVER_PREFIX)
      ) {
        issues.push(
          issue(
            subject,
            `cover.src must start with "${COVER_PREFIX}", got "${String(project.cover.src)}"`,
          ),
        )
      }
      if (!isNonEmptyString(project.cover.alt)) {
        issues.push(issue(subject, 'image cover needs a meaningful alt description'))
      }
    } else if (project.cover.kind === 'generated') {
      if (project.cover.alt !== '' || project.cover.decorative !== true) {
        issues.push(
          issue(subject, 'generated cover must be explicitly decorative with empty alt'),
        )
      }
    } else {
      issues.push(issue(subject, 'unrecognized cover kind'))
    }

    // Presentation tokens stay presentation-typed.
    if (project.visual !== undefined) {
      if (!hasRecordShape(project.visual)) {
        issues.push(issue(subject, 'visual must be an object'))
      } else {
        for (const [key, value] of Object.entries(project.visual)) {
          if (typeof value !== 'string' && typeof value !== 'number') {
            issues.push(issue(subject, `visual.${key} must be a string or number`))
          }
        }
      }
    }

    if (!isJsonSerializable(project)) {
      issues.push(issue(subject, 'record is not JSON-serializable'))
    }
  })

  return issues
}
