// Phase 0 serializer consistency tests: every derived representation
// (route metadata, JSON-LD, /portfolio.json) reads the same canonical
// fixture facts, carries canonical URLs, and never leaks approval metadata.

import { describe, expect, it } from 'vitest'

import {
  canonicalUrl,
  deriveProjectMetadata,
  deriveProjectJsonLd,
  deriveProjectsItemListJsonLd,
  derivePersonJsonLd,
  derivePortfolioJson,
} from '@/lib/content/serializers'
import type { Project } from '@/lib/projects/catalog'
import type { PublicProfile } from '@/lib/portfolio/profile'

const BASE = 'https://example.com'

const PROJECT_A: Project = {
  id: 'demo',
  slug: 'demo',
  title: 'Demo Project',
  category: 'tech demo',
  date: '2026',
  status: 'completed',
  tagline: 'A demo tagline for serializer testing.',
  summary: 'A demo summary describing the fixture project.',
  role: 'Designer',
  problem: 'A demo problem statement.',
  contributions: ['Designed the demo flow'],
  outcomes: ['Shipped the demo'],
  tools: ['TypeScript'],
  skills: ['Systems design', 'Serialization'],
  links: [{ label: 'Case study', href: 'https://example.com/case', kind: 'case-study' }],
  cover: { kind: 'image', src: '/vinyl-covers/x.png', alt: 'Demo cover art' },
  visual: { bg: '#fff' },
}

const PROJECT_B: Project = {
  id: 'second-demo',
  slug: 'second-demo',
  title: 'Second Demo',
  category: 'branding',
  date: '2025',
  status: 'in-progress',
  tagline: 'A second tagline.',
  summary: 'A second summary.',
  role: 'Producer',
  problem: 'A second problem statement.',
  contributions: ['Produced the second demo'],
  outcomes: ['Ongoing'],
  tools: ['Figma'],
  skills: ['Production'],
  links: [{ label: 'Live', href: 'https://example.com/live', kind: 'live' }],
  cover: { kind: 'generated', alt: '', decorative: true },
}

const PROJECTS_FIXTURE: readonly Project[] = [PROJECT_A, PROJECT_B]

const PROFILE_FIXTURE: PublicProfile = {
  name: 'Alex Example',
  targetRole: 'Technical Designer',
  summary: 'Builds interactive systems with owner-approved content.',
  capabilities: ['Systems design', 'Prototyping'],
  links: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/example', kind: 'linkedin' },
    { label: 'Instagram', href: 'https://www.instagram.com/example', kind: 'instagram' },
    { label: 'Website', href: 'https://example.org', kind: 'website' },
    { label: 'Resume', href: 'https://example.com/resume.pdf', kind: 'resume' },
    { label: 'Email', href: 'mailto:alex@example.com', kind: 'email' },
  ],
  email: 'alex@example.com',
  resumeUrl: 'https://example.com/resume.pdf',
}

type ListItem = { readonly position: number; readonly name: string; readonly url: string }
type PortfolioEntry = Record<string, unknown>

function at<T>(items: readonly T[], index: number): T {
  const item = items[index]
  if (item === undefined) throw new Error(`missing item at index ${index}`)
  return item
}

describe('canonicalUrl', () => {
  it('trims trailing slashes off the base URL', () => {
    expect(canonicalUrl('https://example.com/', '/projects')).toBe(
      'https://example.com/projects',
    )
    expect(canonicalUrl('https://example.com//', '/projects')).toBe(
      'https://example.com/projects',
    )
  })
})

describe('deriveProjectMetadata', () => {
  it('derives the canonical project URL and tagline description', () => {
    const meta = deriveProjectMetadata(PROJECT_A, BASE)
    expect(meta.canonical).toBe('https://example.com/projects/demo')
    expect(meta.description).toBe(PROJECT_A.tagline)
  })
})

describe('derivePersonJsonLd', () => {
  it('describes the profile as a schema.org Person', () => {
    const person = derivePersonJsonLd(PROFILE_FIXTURE, BASE)
    expect(person['@type']).toBe('Person')
    expect(person.name).toBe(PROFILE_FIXTURE.name)
    expect(person.description).toBe(PROFILE_FIXTURE.summary)
    expect(person.jobTitle).toBe(PROFILE_FIXTURE.targetRole)
  })

  it('sameAs carries ONLY linkedin/instagram/website hrefs', () => {
    const person = derivePersonJsonLd(PROFILE_FIXTURE, BASE)
    expect(person.sameAs).toEqual([
      'https://www.linkedin.com/in/example',
      'https://www.instagram.com/example',
      'https://example.org',
    ])
    const sameAs = person.sameAs as unknown as readonly string[]
    expect(sameAs).not.toContain('https://example.com/resume.pdf')
    expect(sameAs).not.toContain('mailto:alex@example.com')
  })

  it('emits email iff the fixture has one, mailto: prefixed', () => {
    const withEmail = derivePersonJsonLd(PROFILE_FIXTURE, BASE)
    expect(withEmail.email).toBe('mailto:alex@example.com')

    const { email: _email, ...rest } = PROFILE_FIXTURE
    const withoutEmail = derivePersonJsonLd(rest, BASE)
    expect('email' in withoutEmail).toBe(false)
  })
})

describe('deriveProjectJsonLd', () => {
  it('describes a project as a schema.org CreativeWork at its canonical URL', () => {
    const work = deriveProjectJsonLd(PROJECT_A, BASE)
    expect(work['@type']).toBe('CreativeWork')
    expect(work.url).toBe('https://example.com/projects/demo')
    expect(work.keywords).toEqual([...PROJECT_A.skills])
  })

  it('emits an absolute image URL iff the cover kind is image', () => {
    const withImage = deriveProjectJsonLd(PROJECT_A, BASE)
    expect(withImage.image).toBe('https://example.com/vinyl-covers/x.png')

    const generated = deriveProjectJsonLd(PROJECT_B, BASE)
    expect('image' in generated).toBe(false)
  })
})

describe('deriveProjectsItemListJsonLd', () => {
  it('lists positions 1..n with canonical URLs', () => {
    const list = deriveProjectsItemListJsonLd(PROJECTS_FIXTURE, BASE)
    expect(list['@type']).toBe('ItemList')
    const elements = list.itemListElement as unknown as readonly ListItem[]
    expect(elements.map((e) => e.position)).toEqual([1, 2])
    expect(elements.map((e) => e.url)).toEqual([
      'https://example.com/projects/demo',
      'https://example.com/projects/second-demo',
    ])
  })
})

describe('derivePortfolioJson', () => {
  const portfolio = derivePortfolioJson(PROFILE_FIXTURE, PROJECTS_FIXTURE, BASE)
  const entries = portfolio.projects as unknown as readonly PortfolioEntry[]

  it('carries schemaVersion 1', () => {
    expect(portfolio.schemaVersion).toBe(1)
  })

  it('every project entry equals the canonical fixture facts', () => {
    expect(entries).toHaveLength(PROJECTS_FIXTURE.length)
    PROJECTS_FIXTURE.forEach((project, index) => {
      const entry = at(entries, index)
      expect(entry.title).toBe(project.title)
      expect(entry.summary).toBe(project.summary)
      expect(entry.role).toBe(project.role)
      expect(entry.status).toBe(project.status)
      expect(entry.date).toBe(project.date)
    })
  })

  it('entry URLs are canonical and match the ItemList URL per slug', () => {
    const list = deriveProjectsItemListJsonLd(PROJECTS_FIXTURE, BASE)
    const listElements = list.itemListElement as unknown as readonly ListItem[]
    PROJECTS_FIXTURE.forEach((project, index) => {
      const entry = at(entries, index)
      const expected = canonicalUrl(BASE, `/projects/${project.slug}`)
      expect(entry.url).toBe(expected)
      expect(at(listElements, index).url).toBe(expected)
    })
  })
})

describe('approval metadata never leaks', () => {
  it('no derived output contains approvedContentHash or approvedAt', () => {
    const { email: _email, ...profileWithoutEmail } = PROFILE_FIXTURE
    const outputs = [
      deriveProjectMetadata(PROJECT_A, BASE),
      deriveProjectMetadata(PROJECT_B, BASE),
      derivePersonJsonLd(PROFILE_FIXTURE, BASE),
      derivePersonJsonLd(profileWithoutEmail, BASE),
      deriveProjectJsonLd(PROJECT_A, BASE),
      deriveProjectJsonLd(PROJECT_B, BASE),
      deriveProjectsItemListJsonLd(PROJECTS_FIXTURE, BASE),
      derivePortfolioJson(PROFILE_FIXTURE, PROJECTS_FIXTURE, BASE),
    ]
    for (const output of outputs) {
      const text = JSON.stringify(output)
      expect(text).not.toContain('approvedContentHash')
      expect(text).not.toContain('approvedAt')
    }
  })
})
