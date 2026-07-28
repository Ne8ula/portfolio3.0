// Profile schema tests — Phase 0A complete: the canonical PROFILE export
// is the owner-approved record and must pass strict validation; broken
// fixture variants prove each validator rule.

import { describe, expect, it } from 'vitest'

import { PROFILE, validateProfile } from '@/lib/portfolio/profile'
import type { ProfileLinkKind, PublicProfile } from '@/lib/portfolio/profile'

function makeProfile(overrides: Partial<PublicProfile> = {}): PublicProfile {
  return {
    name: 'Alex Example',
    targetRole: 'Technical Designer',
    summary: 'Builds interactive systems and ships owner-approved portfolio content.',
    capabilities: ['Game production', 'Interaction design'],
    links: [
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/example', kind: 'linkedin' },
      { label: 'Email', href: 'mailto:alex@example.com', kind: 'email' },
      { label: 'Resume', href: 'https://example.com/resume.pdf', kind: 'resume' },
    ],
    ...overrides,
  }
}

function errorsOf(profile: PublicProfile) {
  return validateProfile(profile).filter((i) => i.severity === 'error')
}

describe('validateProfile — valid fixture', () => {
  it('reports zero issues for a well-formed profile', () => {
    expect(validateProfile(makeProfile())).toEqual([])
  })
})

describe('PROFILE export (owner-approved in Phase 0A)', () => {
  it('exists and passes strict validation', () => {
    expect(PROFILE).not.toBeNull()
    expect(validateProfile(PROFILE)).toEqual([])
  })

  it('links the owner-supplied 2026 résumé from public/', () => {
    expect(PROFILE.resumeUrl).toBe('/AlexXiong_Resume26.pdf')
  })
})

describe('validateProfile — broken variants', () => {
  it('errors on an empty summary', () => {
    const errors = errorsOf(makeProfile({ summary: '' }))
    expect(errors.some((i) => i.message.includes('summary'))).toBe(true)
  })

  it('errors on an empty capability entry', () => {
    const errors = errorsOf(makeProfile({ capabilities: ['Game production', ''] }))
    expect(errors.some((i) => i.message.includes('capabilities[1]'))).toBe(true)
  })

  it('errors on an unknown link kind', () => {
    const errors = errorsOf(
      makeProfile({
        links: [
          { label: 'LinkedIn', href: 'https://www.linkedin.com/in/example', kind: 'linkedin' },
          { label: 'Twitter', href: 'https://twitter.com/example', kind: 'twitter' as ProfileLinkKind },
        ],
      }),
    )
    expect(errors.some((i) => i.message.includes('unknown link kind'))).toBe(true)
  })

  it('errors when an email-kind link href is not mailto:', () => {
    const errors = errorsOf(
      makeProfile({
        links: [{ label: 'Email', href: 'alex@example.com', kind: 'email' }],
      }),
    )
    expect(errors.some((i) => i.message.includes('not valid for kind "email"'))).toBe(true)
  })

  it('errors when an email-kind link uses an https href', () => {
    const errors = errorsOf(
      makeProfile({
        links: [{ label: 'Email', href: 'https://example.com/contact', kind: 'email' }],
      }),
    )
    expect(errors.some((i) => i.message.includes('not valid for kind "email"'))).toBe(true)
  })

  it('errors on duplicate hrefs', () => {
    const errors = errorsOf(
      makeProfile({
        links: [
          { label: 'LinkedIn', href: 'https://www.linkedin.com/in/example', kind: 'linkedin' },
          { label: 'Website', href: 'https://www.linkedin.com/in/example', kind: 'website' },
        ],
      }),
    )
    expect(errors.some((i) => i.message.includes('duplicate href'))).toBe(true)
  })

  it('errors on an invalid email field', () => {
    const errors = errorsOf(makeProfile({ email: 'not-an-email' }))
    expect(errors.some((i) => i.message.includes('not a valid address'))).toBe(true)
  })

  it('errors on an http resumeUrl', () => {
    const errors = errorsOf(makeProfile({ resumeUrl: 'http://example.com/resume.pdf' }))
    expect(errors.some((i) => i.message.includes('resumeUrl'))).toBe(true)
  })
})
