// Unit tests for the content-contract enforcement island (§A.4.2, §A.7):
// lib/content/content-contract.ts's pure validator against the real
// declarations in lib/content/content-contracts.ts and the canonical
// catalog slugs, plus malformed variants proving CI fails on each rule.

import { describe, expect, it } from 'vitest'
import {
  PHASE_2_COMPLETE,
  REQUIRED_CONTENT_ROUTES,
  validateContentContracts,
  type ContentContract,
} from '@/lib/content/content-contract'
import {
  ABOUT_CONTENT_CONTRACT,
  CONTENT_CONTRACTS,
  HOME_CONTENT_CONTRACT,
} from '@/lib/content/content-contracts'
import { catalogSlugs, PROJECTS } from '@/lib/projects/catalog'
import type { ValidationIssue } from '@/lib/shared/core'

const realSlugs = catalogSlugs(PROJECTS)

/** A broken variant of the real home contract. The cast lets tests model
 *  data that bypassed TypeScript (the exact case runtime validation exists
 *  for). */
function variant(patch: Record<string, unknown>): ContentContract {
  return { ...HOME_CONTENT_CONTRACT, ...patch } as unknown as ContentContract
}

/** The real registry with the '/' contract swapped for a broken variant. */
function withHomeReplaced(replacement: ContentContract): ContentContract[] {
  return CONTENT_CONTRACTS.map((contract) => (contract.route === '/' ? replacement : contract))
}

function hasError(
  issues: readonly ValidationIssue[],
  subjectPart: string,
  messagePart: string,
): boolean {
  return issues.some(
    (entry) =>
      entry.severity === 'error' &&
      entry.subject.includes(subjectPart) &&
      entry.message.includes(messagePart),
  )
}

const HOME_SUBJECT = 'content-contract content-home-v1'

describe('real registry', () => {
  it('exposes the §A.4.2 constants', () => {
    expect(REQUIRED_CONTENT_ROUTES).toEqual(['/', '/projects', '/projects/[slug]', '/about'])
    expect(PHASE_2_COMPLETE).toBe(true)
    expect(CONTENT_CONTRACTS.every((contract) => contract.implementation === 'implemented')).toBe(
      true,
    )
    expect(ABOUT_CONTENT_CONTRACT).toMatchObject({
      id: 'content-about-v1',
      route: '/about',
      purpose: 'professional-summary',
      structuredData: ['Person'],
    })
  })

  it('catalogSlugs(PROJECTS) yields the six real slugs', () => {
    expect(realSlugs).toEqual([
      'songofmaka',
      'chuyuhong',
      'tencentgames',
      'nyuwelcome',
      'shanghainoir',
      'procgendungeon',
    ])
  })

  it('CONTENT_CONTRACTS with the real slugs passes with zero issues', () => {
    expect(validateContentContracts(CONTENT_CONTRACTS, { catalogSlugs: realSlugs })).toEqual([])
  })
})

describe('validateContentContracts rejects malformed contracts', () => {
  it('rejects planned-phase-2 on a non-required route', () => {
    const blog = variant({
      id: 'content-blog-v1',
      route: '/blog',
      implementation: 'planned-phase-2',
    })
    const issues = validateContentContracts([...CONTENT_CONTRACTS, blog], {
      catalogSlugs: realSlugs,
      phase2Complete: false,
    })
    expect(issues).toHaveLength(1)
    expect(
      hasError(
        issues,
        'content-contract content-blog-v1',
        '"planned-phase-2" is allowed only for the §A.4.2 required surfaces, not "/blog"',
      ),
    ).toBe(true)
  })

  it('rejects every remaining planned-phase-2 contract once Phase 2 is complete', () => {
    const plannedHome = variant({ implementation: 'planned-phase-2' })
    const contracts = withHomeReplaced(plannedHome)
    const issues = validateContentContracts(contracts, {
      catalogSlugs: realSlugs,
    })
    expect(
      hasError(
        issues,
        `content-contract ${plannedHome.id}`,
        '"planned-phase-2" is no longer allowed',
      ),
    ).toBe(true)
  })

  it('names a dropped required route', () => {
    const issues = validateContentContracts(
      CONTENT_CONTRACTS.filter((contract) => contract.route !== '/about'),
      { catalogSlugs: realSlugs },
    )
    expect(
      hasError(issues, 'content-contracts', 'required route "/about" has no content contract'),
    ).toBe(true)
  })

  it('flags duplicate ids and duplicate routes', () => {
    const issues = validateContentContracts([...CONTENT_CONTRACTS, { ...HOME_CONTENT_CONTRACT }], {
      catalogSlugs: realSlugs,
    })
    expect(hasError(issues, HOME_SUBJECT, 'duplicate contract id')).toBe(true)
    expect(hasError(issues, HOME_SUBJECT, 'duplicate route "/"')).toBe(true)
  })

  it('flags a purpose/route mismatch', () => {
    const issues = validateContentContracts(
      withHomeReplaced(variant({ purpose: 'project-index' })),
      { catalogSlugs: realSlugs },
    )
    expect(hasError(issues, HOME_SUBJECT, 'route "/" must declare purpose "entry"')).toBe(true)
  })

  it('flags empty sources', () => {
    const issues = validateContentContracts(withHomeReplaced(variant({ sources: [] })), {
      catalogSlugs: realSlugs,
    })
    expect(hasError(issues, HOME_SUBJECT, 'sources is empty')).toBe(true)
  })

  it('flags an unknown structuredData type', () => {
    const issues = validateContentContracts(
      withHomeReplaced(variant({ structuredData: ['Person', 'BlogPosting'] })),
      { catalogSlugs: realSlugs },
    )
    expect(hasError(issues, HOME_SUBJECT, 'unrecognized structured-data type "BlogPosting"')).toBe(
      true,
    )
  })

  it('flags a delivery flag forced false past the type system', () => {
    const issues = validateContentContracts(
      withHomeReplaced(
        variant({ delivery: { ...HOME_CONTENT_CONTRACT.delivery, serverRendered: false } }),
      ),
      { catalogSlugs: realSlugs },
    )
    expect(hasError(issues, HOME_SUBJECT, 'delivery.serverRendered must be literally true')).toBe(
      true,
    )
  })
})

describe('catalog-slug coverage of /projects/[slug]', () => {
  it('errors when the catalog has no slugs but the dynamic route is declared', () => {
    const issues = validateContentContracts(CONTENT_CONTRACTS, { catalogSlugs: [] })
    expect(
      hasError(issues, 'content-contracts', 'catalog has no slugs to cover /projects/[slug]'),
    ).toBe(true)
  })

  it('errors on a duplicate catalog slug', () => {
    const issues = validateContentContracts(CONTENT_CONTRACTS, {
      catalogSlugs: [...realSlugs, 'songofmaka'],
    })
    expect(
      hasError(issues, 'content-contracts', 'duplicate catalog slug "songofmaka"'),
    ).toBe(true)
  })

  it('errors on an uppercase/invalid slug', () => {
    const issues = validateContentContracts(CONTENT_CONTRACTS, {
      catalogSlugs: [...realSlugs, 'Bad_Slug'],
    })
    expect(
      hasError(issues, 'content-contracts', 'catalog slug "Bad_Slug" cannot form a /projects/ URL'),
    ).toBe(true)
  })
})

describe('hardening — remaining malformed branches', () => {
  it('returns structured issues, not TypeErrors, for malformed nested values', () => {
    const noSources = validateContentContracts(
      withHomeReplaced(variant({ sources: undefined })),
      { catalogSlugs: realSlugs },
    )
    expect(hasError(noSources, HOME_SUBJECT, 'sources must be an array')).toBe(true)

    const badStructured = validateContentContracts(
      withHomeReplaced(variant({ structuredData: 'Person' })),
      { catalogSlugs: realSlugs },
    )
    expect(hasError(badStructured, HOME_SUBJECT, 'structuredData must be an array')).toBe(true)

    const badRoute = validateContentContracts(
      withHomeReplaced(variant({ route: undefined })),
      { catalogSlugs: realSlugs },
    )
    expect(hasError(badRoute, HOME_SUBJECT, 'must be site-relative')).toBe(true)

    const nullContract = validateContentContracts(
      [null as unknown as ContentContract],
      { catalogSlugs: realSlugs },
    )
    expect(
      hasError(nullContract, 'content-contract (malformed)', 'contract must be an object'),
    ).toBe(true)
  })

  it('rejects an unrecognized implementation value', () => {
    const issues = validateContentContracts(
      withHomeReplaced(variant({ implementation: 'shipped' })),
      { catalogSlugs: realSlugs },
    )
    expect(hasError(issues, HOME_SUBJECT, 'unrecognized implementation')).toBe(true)
  })

  it('rejects an unrecognized purpose', () => {
    const issues = validateContentContracts(
      withHomeReplaced(variant({ purpose: 'landing' })),
      { catalogSlugs: realSlugs },
    )
    expect(hasError(issues, HOME_SUBJECT, 'unrecognized purpose')).toBe(true)
  })

  it('rejects an unrecognized source', () => {
    const issues = validateContentContracts(
      withHomeReplaced(variant({ sources: ['cms'] })),
      { catalogSlugs: realSlugs },
    )
    expect(hasError(issues, HOME_SUBJECT, 'unrecognized source')).toBe(true)
  })

  it('rejects a false discoverability flag', () => {
    const issues = validateContentContracts(
      withHomeReplaced(
        variant({
          discoverability: { linkedFromInitialHtml: false, canonicalUrl: true, sitemap: true },
        }),
      ),
      { catalogSlugs: realSlugs },
    )
    expect(hasError(issues, HOME_SUBJECT, 'discoverability.linkedFromInitialHtml')).toBe(true)
  })

  it('rejects a delivery object MISSING a required key (TS-bypass case)', () => {
    const issues = validateContentContracts(withHomeReplaced(variant({ delivery: {} })), {
      catalogSlugs: realSlugs,
    })
    for (const key of [
      'serverRendered',
      'javascriptIndependent',
      'webglIndependent',
      'visibleSemanticHtml',
    ]) {
      expect(hasError(issues, HOME_SUBJECT, `delivery.${key}`)).toBe(true)
    }
  })

  it('rejects a discoverability object MISSING a required key (TS-bypass case)', () => {
    const issues = validateContentContracts(
      withHomeReplaced(variant({ discoverability: { canonicalUrl: true } })),
      { catalogSlugs: realSlugs },
    )
    expect(hasError(issues, HOME_SUBJECT, 'discoverability.linkedFromInitialHtml')).toBe(true)
    expect(hasError(issues, HOME_SUBJECT, 'discoverability.sitemap')).toBe(true)
  })
})
