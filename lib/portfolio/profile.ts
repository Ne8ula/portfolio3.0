// Strict serializable public profile schema (§A.4.2).
//
// Server-safe by contract: no "use client", no browser globals, no rendered
// JSX, no `@ts-nocheck`.
//
// Phase 0 deliberately ships the SCHEMA ONLY. The profile instance is
// Phase 0A output: the owner supplies and approves the professional
// summary, capabilities, contact routes, links, and résumé URL before a
// record enters this module. Do not publish private contact data (the
// site's phone number stays out unless the owner explicitly opts in) and
// never infer facts the owner has not supplied.

import {
  isNonEmptyString,
  issue,
  type NonEmptyStrings,
  type ValidationIssue,
} from '@/lib/shared/core'

export type ProfileLinkKind =
  | 'linkedin'
  | 'instagram'
  | 'email'
  | 'resume'
  | 'website'
  | 'other'

export type ProfileLink = {
  readonly label: string
  readonly href: string
  readonly kind: ProfileLinkKind
}

export type PublicProfile = {
  readonly name: string
  /** Target discipline/role, e.g. the role the portfolio is applying for. */
  readonly targetRole: string
  /** Concise professional summary — owner-approved wording only. */
  readonly summary: string
  readonly capabilities: NonEmptyStrings
  readonly links: readonly ProfileLink[]
  /** Public contact email, when the owner publishes one. */
  readonly email?: string
  /** Absolute URL of the published résumé, when one is published. */
  readonly resumeUrl?: string
}

/**
 * The owner-approved profile record. Populated by Phase 0A step 5 after
 * explicit owner approval; until then the canonical profile source is
 * honestly absent rather than fabricated.
 */
export const PROFILE: PublicProfile | null = null

const PROFILE_LINK_KINDS: readonly ProfileLinkKind[] = [
  'linkedin',
  'instagram',
  'email',
  'resume',
  'website',
  'other',
]

export function validateProfile(profile: PublicProfile): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const subject = 'profile'

  if (!isNonEmptyString(profile.name)) issues.push(issue(subject, 'name is empty'))
  if (!isNonEmptyString(profile.targetRole)) issues.push(issue(subject, 'targetRole is empty'))
  if (!isNonEmptyString(profile.summary)) issues.push(issue(subject, 'summary is empty'))
  if (profile.capabilities.length === 0) {
    issues.push(issue(subject, 'capabilities is empty'))
  }
  profile.capabilities.forEach((capability, index) => {
    if (!isNonEmptyString(capability)) {
      issues.push(issue(subject, `capabilities[${index}] is empty`))
    }
  })

  const seenHrefs = new Set<string>()
  profile.links.forEach((link, index) => {
    const linkSubject = `profile.links[${index}]`
    if (!isNonEmptyString(link.label)) issues.push(issue(linkSubject, 'label is empty'))
    if (!PROFILE_LINK_KINDS.includes(link.kind)) {
      issues.push(issue(linkSubject, `unknown link kind "${String(link.kind)}"`))
    }
    if (!isValidProfileHref(link.href, link.kind)) {
      issues.push(issue(linkSubject, `href "${link.href}" is not valid for kind "${link.kind}"`))
    }
    if (seenHrefs.has(link.href)) {
      issues.push(issue(linkSubject, `duplicate href "${link.href}"`))
    }
    seenHrefs.add(link.href)
  })

  if (profile.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
    issues.push(issue(subject, `email "${profile.email}" is not a valid address`))
  }
  if (profile.resumeUrl !== undefined && !/^https:\/\//.test(profile.resumeUrl)) {
    issues.push(issue(subject, 'resumeUrl must be an absolute https URL'))
  }

  return issues
}

function isValidProfileHref(href: string, kind: ProfileLinkKind): boolean {
  if (kind === 'email') return href.startsWith('mailto:') && href.length > 'mailto:'.length
  return /^https:\/\/.+/.test(href)
}
