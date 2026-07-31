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

  it('accepts an ordered non-empty about paragraph list', () => {
    expect(
      validateProfile(
        makeProfile({
          about: ['First approved paragraph.', 'Second approved paragraph.'],
        }),
      ),
    ).toEqual([])
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

  it('contains the four owner-approved about paragraphs in order', () => {
    expect(PROFILE.about).toEqual([
      'Hello! I\'m Alex Xiong, a creative technologist specializing in product design and UX research, based in New York City.',
      'I started in games because I wanted to make people feel something. At NYU I studied game design, co-founded Silverjay Studio, and co-directed Song of Maka, an award-winning narrative adventure now in post-production. As I sat through playtests, I realized the thing I couldn\'t stop watching was the players. Why they hesitated, where they got lost, what made them stay. That curiosity slowly became the catalyst to pivot.',
      'Now I\'m at Cornell Tech studying HCI and Information Science, and I build NPCs in the Game Assemblies Lab that hold a conversation instead of reciting one: LLM-driven characters in Unreal Engine 5 with emotional states, real voices, and no scripted lines. Lately I\'ve been distilling that system into a small local model, and building a desktop companion that lives on your screen and talks back with context.',
      'The through-line is simple. Play stopped being a separate place a long time ago; the systems behind our apps, feeds, and tools all borrow from games. I love continuing to learn about the human side of interactive media and create more projects not just for impact, but also for beauty.',
    ])
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

  it('returns structured issues for malformed about content', () => {
    const notAnArray = makeProfile({
      about: 'Not an array' as unknown as PublicProfile['about'],
    })
    expect(errorsOf(notAnArray)).toContainEqual(
      expect.objectContaining({
        subject: 'profile',
        message: 'about must be an array',
      }),
    )

    const emptyAbout = makeProfile({
      about: [] as unknown as PublicProfile['about'],
    })
    expect(errorsOf(emptyAbout)).toContainEqual(
      expect.objectContaining({
        subject: 'profile',
        message: 'about is empty',
      }),
    )

    const emptyParagraph = makeProfile({ about: ['Approved paragraph.', '  '] })
    expect(errorsOf(emptyParagraph)).toContainEqual(
      expect.objectContaining({
        subject: 'profile',
        message: 'about[1] must be a non-empty string',
      }),
    )

    const nonStringParagraph = makeProfile({
      about: [null] as unknown as PublicProfile['about'],
    })
    expect(errorsOf(nonStringParagraph)).toContainEqual(
      expect.objectContaining({
        subject: 'profile',
        message: 'about[0] must be a non-empty string',
      }),
    )
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

  it('returns structured issues, not TypeErrors, for malformed nested values', () => {
    const noCapabilities = makeProfile({
      capabilities: undefined as unknown as PublicProfile['capabilities'],
    })
    expect(
      errorsOf(noCapabilities).some((i) => i.message.includes('capabilities must be an array')),
    ).toBe(true)

    const noLinks = makeProfile({ links: undefined as unknown as PublicProfile['links'] })
    expect(errorsOf(noLinks).some((i) => i.message.includes('links must be an array'))).toBe(true)

    const nullLink = makeProfile({ links: [null] as unknown as PublicProfile['links'] })
    expect(errorsOf(nullLink).some((i) => i.message.includes('link must be an object'))).toBe(true)
  })
})
