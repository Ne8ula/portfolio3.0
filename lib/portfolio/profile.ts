// Strict serializable public profile schema (§A.4.2).
//
// Server-safe by contract: no "use client", no browser globals, no rendered
// JSX, no `@ts-nocheck`.
//
// The PROFILE record below is Phase 0A output — owner-approved content
// (docs/content-inventory.md decisions ledger). Its approval hash lives in
// content/portfolio-approvals.json: editing any public field fails CI
// until the owner re-approves the exact new content. Per the ledger, the
// phone number is omitted (never add it without an explicit owner
// decision); resumeUrl links the owner-supplied 2026 résumé (ledger #13).
// Never infer facts the owner has not supplied.

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
  /** URL of the published résumé (absolute https or site-relative path),
   *  when one is published. */
  readonly resumeUrl?: string
}

/** The owner-approved public profile record (Phase 0A step 5). */
export const PROFILE: PublicProfile = {
  name: 'Alex Xiong',
  targetRole: 'Creative Producer in gaming',
  summary:
    'Producer and designer whose journey spans production, project ' +
    'management, and UX design — ready to dive into any stage of the ' +
    'development process. Now pursuing an information science and HCI ' +
    'background at Cornell Tech.',
  capabilities: ['Project Management', 'UI/UX Design', 'Graphic Design', 'Game Design'],
  links: [
    {
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/in/alex-xiong0522/',
      kind: 'linkedin',
    },
    {
      label: 'Instagram',
      href: 'https://www.instagram.com/alex._.xiong/',
      kind: 'instagram',
    },
    { label: 'Email', href: 'mailto:alexxiong0522@gmail.com', kind: 'email' },
  ],
  email: 'alexxiong0522@gmail.com',
  // Owner-supplied 2026 résumé (hosted in public/), 2026-07-28.
  resumeUrl: '/AlexXiong_Resume26.pdf',
}

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
  if (
    profile.resumeUrl !== undefined &&
    !/^https:\/\//.test(profile.resumeUrl) &&
    !profile.resumeUrl.startsWith('/')
  ) {
    issues.push(issue(subject, 'resumeUrl must be absolute https or site-relative'))
  }

  return issues
}

function isValidProfileHref(href: string, kind: ProfileLinkKind): boolean {
  if (kind === 'email') return href.startsWith('mailto:') && href.length > 'mailto:'.length
  return /^https:\/\/.+/.test(href)
}
