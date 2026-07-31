// Unit tests for the layout-contract enforcement island (§A.7, §8 Phase 0):
// lib/responsive/contract-validation.ts against the real registry in
// lib/responsive/layout-contracts.ts, plus deliberately malformed variants
// proving CI fails on each §A.7 rule.

import { describe, expect, it } from 'vitest'
import {
  findRouteCoverageIssues,
  validateLayoutContracts,
  validateSupportProfiles,
} from '@/lib/responsive/contract-validation'
import {
  REQUIRED_VIEWPORT_CASES,
  SUPPORT_PROFILES,
  type LayoutContract,
} from '@/lib/responsive/layout-contract'
import {
  COCKPIT_LAYOUT_CONTRACT,
  LAYOUT_CONTRACTS,
  ROUTE_CONTRACT_EXEMPTIONS,
  ROUTE_LAYOUT_CONTRACTS,
} from '@/lib/responsive/layout-contracts'
import type { ValidationIssue } from '@/lib/shared/core'

/** A broken variant of the real cockpit contract. The cast lets tests model
 *  data that bypassed TypeScript (the exact case runtime validation exists
 *  for). */
function variant(patch: Record<string, unknown>): LayoutContract {
  return { ...COCKPIT_LAYOUT_CONTRACT, ...patch } as unknown as LayoutContract
}

function errorsOf(issues: readonly ValidationIssue[]): ValidationIssue[] {
  return issues.filter((entry) => entry.severity === 'error')
}

function hasError(
  issues: readonly ValidationIssue[],
  subjectPart: string,
  messagePart: string,
): boolean {
  return errorsOf(issues).some(
    (entry) => entry.subject.includes(subjectPart) && entry.message.includes(messagePart),
  )
}

const SUBJECT = 'layout-contract cockpit-v1'

describe('real registry', () => {
  it('LAYOUT_CONTRACTS passes validation with zero issues', () => {
    expect(validateLayoutContracts(LAYOUT_CONTRACTS)).toEqual([])
  })

  it('SUPPORT_PROFILES passes validateSupportProfiles with zero issues', () => {
    expect(validateSupportProfiles()).toEqual([])
    expect(Object.keys(SUPPORT_PROFILES)).toContain('desktop-laptop-v1')
  })

  it('the §9.1 matrix covers normal, zoom-narrow and large-smoke tiers', () => {
    const tiers = new Set(REQUIRED_VIEWPORT_CASES.map((viewportCase) => viewportCase.tier))
    expect(tiers).toEqual(new Set(['normal', 'zoom-narrow', 'large-smoke']))
  })

  it('registers every Phase 2 route and lets the cockpit document reflow', () => {
    expect(ROUTE_LAYOUT_CONTRACTS).toEqual({
      '/': 'cockpit-v1',
      '/about': 'about-v1',
      '/projects': 'projects-index-v1',
      '/projects/[slug]': 'project-detail-v1',
      '/responsive-preview': 'responsive-preview-v1',
    })
    expect(COCKPIT_LAYOUT_CONTRACT.allowedAdaptations).toContain('reflow')
  })
})

describe('validateLayoutContracts rejects malformed contracts', () => {
  it('flags duplicate contract ids', () => {
    const issues = validateLayoutContracts([COCKPIT_LAYOUT_CONTRACT, variant({})])
    expect(hasError(issues, SUBJECT, 'duplicate contract id')).toBe(true)
  })

  it('flags an unrecognized support profile', () => {
    const issues = validateLayoutContracts([variant({ supportProfile: 'mobile-v1' })])
    expect(hasError(issues, SUBJECT, 'unrecognized support profile "mobile-v1"')).toBe(true)
  })

  it('rejects an interactive protected region with a decorative alternative', () => {
    const issues = validateLayoutContracts([
      variant({
        protectedRegions: [
          {
            id: 'stage',
            kind: 'three-dimensional',
            interactive: true,
            alternative: { kind: 'decorative' },
          },
        ],
      }),
    ])
    expect(
      hasError(issues, `${SUBJECT} region stage`, 'route or inline-controls alternative'),
    ).toBe(true)
  })

  it('rejects an interactive protected region with a description alternative', () => {
    const issues = validateLayoutContracts([
      variant({
        protectedRegions: [
          {
            id: 'stage',
            kind: 'three-dimensional',
            interactive: true,
            alternative: { kind: 'description', labelledBy: 'stage-caption' },
          },
        ],
      }),
    ])
    expect(
      hasError(issues, `${SUBJECT} region stage`, 'route or inline-controls alternative'),
    ).toBe(true)
  })

  it('accepts a NON-interactive region with a description alternative', () => {
    const issues = validateLayoutContracts([
      variant({
        protectedRegions: [
          {
            id: 'backdrop',
            kind: 'three-dimensional',
            interactive: false,
            alternative: { kind: 'description', labelledBy: 'backdrop-caption' },
          },
        ],
      }),
    ])
    expect(issues).toEqual([])
  })

  it('flags empty allowedAdaptations', () => {
    const issues = validateLayoutContracts([variant({ allowedAdaptations: [] })])
    expect(hasError(issues, SUBJECT, 'allowedAdaptations is empty')).toBe(true)
  })

  it('flags a duplicate adaptation', () => {
    const issues = validateLayoutContracts([variant({ allowedAdaptations: ['scale', 'scale'] })])
    expect(hasError(issues, SUBJECT, 'duplicate adaptation "scale"')).toBe(true)
  })

  it('flags an unknown adaptation', () => {
    const issues = validateLayoutContracts([variant({ allowedAdaptations: ['scale', 'morph'] })])
    expect(hasError(issues, SUBJECT, 'unrecognized adaptation "morph"')).toBe(true)
  })

  it('flags accessibility.keyboard !== true', () => {
    const issues = validateLayoutContracts([
      variant({
        accessibility: { ...COCKPIT_LAYOUT_CONTRACT.accessibility, keyboard: false },
      }),
    ])
    expect(hasError(issues, SUBJECT, 'accessibility.keyboard must be literally true')).toBe(true)
  })

  it('flags a missing required accessibility state', () => {
    const issues = validateLayoutContracts([
      variant({
        accessibility: {
          ...COCKPIT_LAYOUT_CONTRACT.accessibility,
          states: COCKPIT_LAYOUT_CONTRACT.accessibility.states.filter(
            (state) => state !== 'large-controls',
          ),
        },
      }),
    ])
    expect(
      hasError(issues, SUBJECT, 'required accessibility state "large-controls" is not declared'),
    ).toBe(true)
  })

  it('flags a duplicate viewport-case id', () => {
    const issues = validateLayoutContracts([
      variant({
        viewportCases: [
          ...REQUIRED_VIEWPORT_CASES,
          { id: 'normal-1024x600', w: 1280, h: 720, tier: 'normal' },
        ],
      }),
    ])
    expect(hasError(issues, `${SUBJECT} viewport normal-1024x600`, 'duplicate case id')).toBe(true)
  })

  it('flags non-positive viewport dimensions', () => {
    const issues = validateLayoutContracts([
      variant({
        viewportCases: [
          ...REQUIRED_VIEWPORT_CASES,
          { id: 'zero-width', w: 0, h: 600, tier: 'normal' },
        ],
      }),
    ])
    expect(hasError(issues, `${SUBJECT} viewport zero-width`, 'dimensions must be positive')).toBe(
      true,
    )
  })

  it('flags a tier inconsistent with the support profile (800×450 labeled normal)', () => {
    const issues = validateLayoutContracts([
      variant({
        viewportCases: [
          ...REQUIRED_VIEWPORT_CASES,
          { id: 'mislabeled-zoom', w: 800, h: 450, tier: 'normal' },
        ],
      }),
    ])
    expect(
      hasError(
        issues,
        `${SUBJECT} viewport mislabeled-zoom`,
        'inconsistent with profile "desktop-laptop-v1" (expected "zoom-narrow")',
      ),
    ).toBe(true)
  })

  it('flags a missing required §9.1 viewport case (requireFullMatrix defaults true)', () => {
    const issues = validateLayoutContracts([
      variant({
        viewportCases: REQUIRED_VIEWPORT_CASES.filter(
          (viewportCase) => viewportCase.id !== 'zoom-800x450',
        ),
      }),
    ])
    expect(hasError(issues, SUBJECT, 'required viewport case 800×450 is missing')).toBe(true)
  })
})

describe('validateSupportProfiles rejects malformed profiles', () => {
  it('flags non-positive dimensions and normalMax below normalMin', () => {
    const issues = validateSupportProfiles({
      bad: { normalMin: { w: 0, h: 600 }, normalMax: { w: -5, h: 100 } },
    })
    expect(hasError(issues, 'support-profile bad', 'normalMin dimensions must be positive')).toBe(
      true,
    )
    expect(hasError(issues, 'support-profile bad', 'normalMax dimensions must be positive')).toBe(
      true,
    )
    expect(hasError(issues, 'support-profile bad', 'normalMax must be ≥ normalMin')).toBe(true)
  })
})

describe('findRouteCoverageIssues', () => {
  const declaredIds = LAYOUT_CONTRACTS.map((contract) => contract.id)

  it('errors on a scanned route without a co-located contract', () => {
    const issues = findRouteCoverageIssues(
      [{ route: '/x', hasCoLocatedContract: false }],
      {},
      declaredIds,
      [],
    )
    expect(hasError(issues, 'route /x', 'no co-located layout-contract.ts')).toBe(true)
  })

  it('does not error when the same route is exempted', () => {
    const issues = findRouteCoverageIssues(
      [{ route: '/x', hasCoLocatedContract: false }],
      {},
      declaredIds,
      ['/x'],
    )
    expect(issues).toEqual([])
  })

  it('errors when a mapping points at an unknown contract id', () => {
    const issues = findRouteCoverageIssues(
      [{ route: '/', hasCoLocatedContract: true }],
      { '/': 'ghost-v1' },
      declaredIds,
      [],
    )
    expect(hasError(issues, 'route /', '"ghost-v1" is not in the registry')).toBe(true)
  })

  it('errors when a mapping names a route that was never scanned', () => {
    const issues = findRouteCoverageIssues(
      [{ route: '/', hasCoLocatedContract: true }],
      { '/': COCKPIT_LAYOUT_CONTRACT.id, '/ghost': COCKPIT_LAYOUT_CONTRACT.id },
      declaredIds,
      [],
    )
    expect(hasError(issues, 'route /ghost', 'maps a route that does not exist')).toBe(true)
  })

  it('passes the real registry on the happy path', () => {
    const issues = findRouteCoverageIssues(
      [
        { route: '/', hasCoLocatedContract: true },
        { route: '/about', hasCoLocatedContract: true },
        { route: '/projects', hasCoLocatedContract: true },
        { route: '/projects/[slug]', hasCoLocatedContract: true },
        { route: '/responsive-preview', hasCoLocatedContract: true },
      ],
      ROUTE_LAYOUT_CONTRACTS,
      declaredIds,
      ROUTE_CONTRACT_EXEMPTIONS,
    )
    expect(issues).toEqual([])
  })
})

describe('hardening — remaining malformed branches (§8 runtime-validator list)', () => {
  const region = COCKPIT_LAYOUT_CONTRACT.protectedRegions[0]!

  it('rejects duplicate protected-region ids', () => {
    const issues = validateLayoutContracts([
      variant({
        protectedRegions: [
          region,
          { id: region.id, kind: 'two-dimensional', interactive: false, alternative: { kind: 'decorative' } },
        ],
      }),
    ])
    expect(hasError(issues, 'cockpit-stage', 'duplicate region id')).toBe(true)
  })

  it('rejects an empty protected-region id', () => {
    const issues = validateLayoutContracts([variant({ protectedRegions: [{ ...region, id: '' }] })])
    expect(hasError(issues, SUBJECT, 'region id is empty')).toBe(true)
  })

  it('rejects an unrecognized region kind', () => {
    const issues = validateLayoutContracts([
      variant({ protectedRegions: [{ ...region, kind: 'four-dimensional' }] }),
    ])
    expect(hasError(issues, 'cockpit-stage', 'unrecognized region kind')).toBe(true)
  })

  it('rejects a non-site-relative route alternative', () => {
    const issues = validateLayoutContracts([
      variant({
        protectedRegions: [{ ...region, alternative: { kind: 'route', href: 'https://x.example' } }],
      }),
    ])
    expect(hasError(issues, 'cockpit-stage', 'must be site-relative')).toBe(true)
  })

  it('rejects inline-controls without a regionId', () => {
    const issues = validateLayoutContracts([
      variant({
        protectedRegions: [
          { ...region, alternative: { kind: 'inline-controls', regionId: '' } },
        ],
      }),
    ])
    expect(hasError(issues, 'cockpit-stage', 'needs a regionId')).toBe(true)
  })

  it('rejects a description alternative without a labelledBy', () => {
    const issues = validateLayoutContracts([
      variant({
        protectedRegions: [
          {
            ...region,
            interactive: false,
            alternative: { kind: 'description', labelledBy: '' },
          },
        ],
      }),
    ])
    expect(hasError(issues, 'cockpit-stage', 'needs a labelledBy')).toBe(true)
  })

  it('rejects a recognized profile that is not in allowedProfiles', () => {
    const issues = validateLayoutContracts([COCKPIT_LAYOUT_CONTRACT], { allowedProfiles: [] })
    expect(hasError(issues, SUBJECT, 'not allowed for current routes')).toBe(true)
  })

  it('rejects an unrecognized accessibility.reflow value', () => {
    const issues = validateLayoutContracts([
      variant({
        accessibility: { ...COCKPIT_LAYOUT_CONTRACT.accessibility, reflow: 'fluid' },
      }),
    ])
    expect(hasError(issues, SUBJECT, 'unrecognized accessibility.reflow')).toBe(true)
  })

  it('returns structured issues, not TypeErrors, for malformed nested values', () => {
    expect(
      hasError(validateLayoutContracts([variant({ protectedRegions: undefined })]), SUBJECT,
        'protectedRegions must be an array'),
    ).toBe(true)
    expect(
      hasError(validateLayoutContracts([variant({ protectedRegions: [null] })]),
        'region (malformed)', 'region must be an object'),
    ).toBe(true)
    const regionWithoutAlternative = {
      ...COCKPIT_LAYOUT_CONTRACT.protectedRegions[0],
      alternative: undefined,
    }
    expect(
      hasError(
        validateLayoutContracts([variant({ protectedRegions: [regionWithoutAlternative] })]),
        SUBJECT, 'alternative must be an object'),
    ).toBe(true)
    expect(
      hasError(validateLayoutContracts([variant({ allowedAdaptations: 'scale' })]), SUBJECT,
        'allowedAdaptations must be an array'),
    ).toBe(true)
    expect(
      hasError(validateLayoutContracts([variant({ accessibility: null })]), SUBJECT,
        'accessibility must be an object'),
    ).toBe(true)
    expect(
      hasError(
        validateLayoutContracts([
          variant({
            accessibility: { ...COCKPIT_LAYOUT_CONTRACT.accessibility, states: 'all' },
          }),
        ]),
        SUBJECT, 'accessibility.states must be an array'),
    ).toBe(true)
    expect(
      hasError(validateLayoutContracts([variant({ viewportCases: undefined })]), SUBJECT,
        'viewportCases must be an array'),
    ).toBe(true)
    expect(
      hasError(validateLayoutContracts([null as unknown as LayoutContract]),
        'layout-contract (malformed)', 'contract must be an object'),
    ).toBe(true)
  })

  it('returns structured issues for malformed support-profile sizes', () => {
    const malformed = {
      'broken-v1': { normalMin: null, normalMax: { w: 100, h: 100 } },
    } as unknown as Parameters<typeof validateSupportProfiles>[0]
    const issues = validateSupportProfiles(malformed)
    expect(hasError(issues, 'broken-v1', 'normalMin must be { w, h } finite numbers')).toBe(true)
  })

  it('pins the §9.1 required viewport matrix exactly (17 cases)', () => {
    expect(REQUIRED_VIEWPORT_CASES.map((c) => [c.w, c.h, c.tier])).toEqual([
      [1024, 600, 'normal'],
      [1024, 768, 'normal'],
      [1280, 720, 'normal'],
      [1280, 800, 'normal'],
      [1366, 650, 'normal'],
      [1366, 768, 'normal'],
      [1440, 900, 'normal'],
      [1512, 982, 'normal'],
      [1920, 1080, 'normal'],
      [2048, 1536, 'normal'],
      [2560, 1440, 'normal'],
      [3440, 1440, 'normal'],
      [800, 450, 'zoom-narrow'],
      [683, 325, 'zoom-narrow'],
      [512, 300, 'zoom-narrow'],
      [320, 568, 'zoom-narrow'],
      [3840, 2160, 'large-smoke'],
    ])
  })
})
