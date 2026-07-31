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
  hasRecordShape,
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
  /** Ordered professional-summary paragraphs — owner-approved wording only. */
  readonly about?: NonEmptyStrings
  readonly capabilities: NonEmptyStrings
  readonly links: readonly ProfileLink[]
  /** Public contact email, when the owner publishes one. */
  readonly email?: string
  /** URL of the published résumé (absolute https or site-relative path),
   *  when one is published. */
  readonly resumeUrl?: string
}

/** Canonical public profile record (Phase 0A step 5).
 *  Any public-field amendment requires the owner-controlled approval-hash
 *  workflow documented in docs/responsive-system.md §9. */
export const PROFILE: PublicProfile = {
  name: 'Alex Xiong',
  targetRole: 'Creative Technologist',
  summary:
    'Producer and designer whose journey spans product management, UX Research, ' +
    'and UI/UX design. Ready to dive into any stage of the ' +
    'development process. Passionate about interactive media and AI ' +
    'technologies. Now pursuing an information science and HCI ' +
    'background at Cornell Tech.',
  about: [
    'Hello! I\'m Alex Xiong, a creative technologist specializing in product design ' +
      'and UX research, based in New York City.',
    'I started in games because I wanted to make people feel something. At NYU I ' +
      'studied game design, co-founded Silverjay Studio, and co-directed Song of Maka, ' +
      'an award-winning narrative adventure now in post-production. As I sat through ' +
      'playtests, I realized the thing I couldn\'t stop watching was the players. Why ' +
      'they hesitated, where they got lost, what made them stay. That curiosity slowly ' +
      'became the catalyst to pivot.',
    'Now I\'m at Cornell Tech studying HCI and Information Science, and I build NPCs ' +
      'in the Game Assemblies Lab that hold a conversation instead of reciting one: ' +
      'LLM-driven characters in Unreal Engine 5 with emotional states, real voices, and ' +
      'no scripted lines. Lately I\'ve been distilling that system into a small local ' +
      'model, and building a desktop companion that lives on your screen and talks back ' +
      'with context.',
    'The through-line is simple. Play stopped being a separate place a long time ago; ' +
      'the systems behind our apps, feeds, and tools all borrow from games. I love ' +
      'continuing to learn about the human side of interactive media and create more ' +
      'projects not just for impact, but also for beauty.',
  ],
  capabilities: ['Product Management', 'UI/UX Design', 'UX Research', 'Game Design'],
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

  if (!hasRecordShape(profile)) return [issue(subject, 'profile must be an object')]

  if (!isNonEmptyString(profile.name)) issues.push(issue(subject, 'name is empty'))
  if (!isNonEmptyString(profile.targetRole)) issues.push(issue(subject, 'targetRole is empty'))
  if (!isNonEmptyString(profile.summary)) issues.push(issue(subject, 'summary is empty'))
  if (profile.about !== undefined) {
    if (!Array.isArray(profile.about)) {
      issues.push(issue(subject, 'about must be an array'))
    } else {
      if (profile.about.length === 0) {
        issues.push(issue(subject, 'about is empty'))
      }
      profile.about.forEach((paragraph, index) => {
        if (!isNonEmptyString(paragraph)) {
          issues.push(issue(subject, `about[${index}] must be a non-empty string`))
        }
      })
    }
  }
  if (!Array.isArray(profile.capabilities)) {
    issues.push(issue(subject, 'capabilities must be an array'))
  } else {
    if (profile.capabilities.length === 0) {
      issues.push(issue(subject, 'capabilities is empty'))
    }
    profile.capabilities.forEach((capability, index) => {
      if (!isNonEmptyString(capability)) {
        issues.push(issue(subject, `capabilities[${index}] is empty`))
      }
    })
  }

  const seenHrefs = new Set<string>()
  if (!Array.isArray(profile.links)) {
    issues.push(issue(subject, 'links must be an array'))
  } else {
    profile.links.forEach((link: ProfileLink, index: number) => {
      const linkSubject = `profile.links[${index}]`
      if (!hasRecordShape(link)) {
        issues.push(issue(linkSubject, 'link must be an object'))
        return
      }
      if (!isNonEmptyString(link.label)) issues.push(issue(linkSubject, 'label is empty'))
      if (!PROFILE_LINK_KINDS.includes(link.kind)) {
        issues.push(issue(linkSubject, `unknown link kind "${String(link.kind)}"`))
      }
      if (typeof link.href !== 'string' || !isValidProfileHref(link.href, link.kind)) {
        issues.push(
          issue(linkSubject, `href "${String(link.href)}" is not valid for kind "${link.kind}"`),
        )
      }
      if (seenHrefs.has(link.href)) {
        issues.push(issue(linkSubject, `duplicate href "${link.href}"`))
      }
      seenHrefs.add(link.href)
    })
  }

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
