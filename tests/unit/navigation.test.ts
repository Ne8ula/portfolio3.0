import { describe, expect, it } from 'vitest'

import {
  SITE_NAV,
  deriveSiteNav,
} from '@/lib/site/navigation'
import { CONTENT_CONTRACTS } from '@/lib/content/content-contracts'
import type { PublicProfile } from '@/lib/portfolio/profile'
import { PROFILE } from '@/lib/portfolio/profile'
import { SITE_ROUTES } from '@/lib/site/site'

describe('SITE_NAV', () => {
  it('uses literal Projects/About routes and the canonical profile contact', () => {
    expect(SITE_NAV).toEqual([
      { label: 'Projects', href: SITE_ROUTES.projects, kind: 'internal' },
      { label: 'About', href: SITE_ROUTES.about, kind: 'internal' },
      {
        label: 'Contact',
        href: PROFILE.links.find((link) => link.kind === 'email')?.href,
        kind: 'contact',
      },
    ])
  })

  it('registers a ContentContract for every internal navigation href', () => {
    const contractRoutes: ReadonlySet<string> = new Set(
      CONTENT_CONTRACTS.map((contract) => contract.route),
    )
    for (const item of SITE_NAV.filter((candidate) => candidate.kind === 'internal')) {
      expect(contractRoutes.has(item.href)).toBe(true)
    }
  })

  it('derives contact from the supplied profile instead of hard-coding it', () => {
    const fixture: PublicProfile = {
      name: 'Example',
      targetRole: 'Designer',
      summary: 'A concise summary.',
      capabilities: ['Design'],
      links: [
        {
          label: 'Email',
          href: 'mailto:different@example.com',
          kind: 'email',
        },
      ],
    }
    expect(deriveSiteNav(fixture)[2]).toEqual({
      label: 'Contact',
      href: 'mailto:different@example.com',
      kind: 'contact',
    })
  })

  it('fails loudly when the canonical profile has no usable contact action', () => {
    const fixture: PublicProfile = {
      name: 'Example',
      targetRole: 'Designer',
      summary: 'A concise summary.',
      capabilities: ['Design'],
      links: [],
    }
    expect(() => deriveSiteNav(fixture)).toThrow(
      'requires a canonical email link',
    )
  })
})
