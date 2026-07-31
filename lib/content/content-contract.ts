// ContentContract — the content-delivery declaration for every
// content-bearing route (§A.7). Layout behavior and content delivery are
// related but independently enforceable; this file owns the type and the
// pure validator, lib/content/content-contracts.ts owns the declarations.

import { hasRecordShape, issue, type ValidationIssue } from '@/lib/shared/core'

export type ContentPurpose =
  | 'entry'
  | 'project-index'
  | 'project-detail'
  | 'professional-summary'

export type ContentSource = 'profile' | 'project-catalog'

export type StructuredDataType =
  | 'Person'
  | 'CollectionPage'
  | 'ItemList'
  | 'CreativeWork'
  | 'SoftwareApplication'
  | 'WebSite'

export type ContentContract = {
  readonly id: string
  readonly route: `/${string}`
  /** `planned-phase-2` is retained only so the validator can reject stale
   *  pre-completion declarations after the Phase 2 completion marker. */
  readonly implementation: 'planned-phase-2' | 'implemented'
  readonly purpose: ContentPurpose
  readonly sources: readonly ContentSource[]
  readonly delivery: {
    readonly serverRendered: true
    readonly javascriptIndependent: true
    readonly webglIndependent: true
    readonly visibleSemanticHtml: true
  }
  readonly discoverability: {
    readonly linkedFromInitialHtml: true
    readonly canonicalUrl: true
    readonly sitemap: true
  }
  readonly structuredData: readonly StructuredDataType[]
}

/**
 * The exact required §A.4.2 surfaces — the only routes allowed to carry
 * `implementation: 'planned-phase-2'`, and all of which must be declared.
 * `/portfolio.json` is intentionally NOT here: it is a non-HTML derivative
 * governed by its own schema/consistency tests, and `visibleSemanticHtml`
 * is deliberately non-negotiable for contract routes.
 */
export const REQUIRED_CONTENT_ROUTES = [
  '/',
  '/projects',
  '/projects/[slug]',
  '/about',
] as const

/** Phase 2 completion marker: CI rejects every stale planned declaration. */
export const PHASE_2_COMPLETE = true

const ROUTE_PURPOSES: Readonly<Record<string, ContentPurpose>> = {
  '/': 'entry',
  '/projects': 'project-index',
  '/projects/[slug]': 'project-detail',
  '/about': 'professional-summary',
}

const CONTENT_PURPOSES: readonly ContentPurpose[] = [
  'entry',
  'project-index',
  'project-detail',
  'professional-summary',
]

const CONTENT_SOURCES: readonly ContentSource[] = ['profile', 'project-catalog']

const STRUCTURED_DATA_TYPES: readonly StructuredDataType[] = [
  'Person',
  'CollectionPage',
  'ItemList',
  'CreativeWork',
  'SoftwareApplication',
  'WebSite',
]

export type ContentValidationOptions = {
  /** Slugs from the canonical catalog: dynamic `/projects/[slug]` coverage
   *  is checked against every one, not treated as an untested wildcard. */
  readonly catalogSlugs: readonly string[]
  readonly phase2Complete?: boolean
}

export function validateContentContracts(
  contracts: readonly ContentContract[],
  options: ContentValidationOptions,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const phase2Complete = options.phase2Complete ?? PHASE_2_COMPLETE

  const seenIds = new Set<string>()
  const seenRoutes = new Set<string>()

  if (!Array.isArray(contracts)) {
    return [issue('content-contracts', 'contracts must be an array')]
  }

  for (const contract of contracts) {
    if (!hasRecordShape(contract)) {
      issues.push(issue('content-contract (malformed)', 'contract must be an object'))
      continue
    }
    const subject = `content-contract ${contract.id || '(missing id)'}`

    if (!contract.id) issues.push(issue(subject, 'contract id is empty'))
    if (seenIds.has(contract.id)) issues.push(issue(subject, 'duplicate contract id'))
    seenIds.add(contract.id)

    if (typeof contract.route !== 'string' || !contract.route.startsWith('/')) {
      issues.push(issue(subject, `route "${String(contract.route)}" must be site-relative`))
    }
    if (seenRoutes.has(contract.route)) {
      issues.push(issue(subject, `duplicate route "${contract.route}"`))
    }
    seenRoutes.add(contract.route)

    if (contract.implementation === 'planned-phase-2') {
      if (!(REQUIRED_CONTENT_ROUTES as readonly string[]).includes(contract.route)) {
        issues.push(
          issue(
            subject,
            `"planned-phase-2" is allowed only for the §A.4.2 required surfaces, not "${contract.route}"`,
          ),
        )
      }
      if (phase2Complete) {
        issues.push(
          issue(subject, 'Phase 2 is recorded complete; "planned-phase-2" is no longer allowed'),
        )
      }
    } else if (contract.implementation !== 'implemented') {
      issues.push(
        issue(subject, `unrecognized implementation "${String(contract.implementation)}"`),
      )
    }

    if (!CONTENT_PURPOSES.includes(contract.purpose)) {
      issues.push(issue(subject, `unrecognized purpose "${String(contract.purpose)}"`))
    }
    const expectedPurpose = ROUTE_PURPOSES[contract.route]
    if (expectedPurpose && contract.purpose !== expectedPurpose) {
      issues.push(
        issue(subject, `route "${contract.route}" must declare purpose "${expectedPurpose}"`),
      )
    }

    if (!Array.isArray(contract.sources)) {
      issues.push(issue(subject, 'sources must be an array'))
    } else {
      if (contract.sources.length === 0) issues.push(issue(subject, 'sources is empty'))
      for (const source of contract.sources) {
        if (!CONTENT_SOURCES.includes(source)) {
          issues.push(issue(subject, `unrecognized source "${String(source)}"`))
        }
      }
    }

    // Literal-true delivery/discoverability guarantees (runtime check for
    // callers that bypass TypeScript). Iterate the REQUIRED key lists, not
    // Object.entries — a TS-bypassed contract that OMITS a key must fail,
    // not slip through as vacuously valid.
    const deliveryKeys = [
      'serverRendered',
      'javascriptIndependent',
      'webglIndependent',
      'visibleSemanticHtml',
    ] as const
    for (const key of deliveryKeys) {
      if (contract.delivery?.[key] !== true) {
        issues.push(issue(subject, `delivery.${key} must be literally true`))
      }
    }
    const discoverabilityKeys = ['linkedFromInitialHtml', 'canonicalUrl', 'sitemap'] as const
    for (const key of discoverabilityKeys) {
      if (contract.discoverability?.[key] !== true) {
        issues.push(issue(subject, `discoverability.${key} must be literally true`))
      }
    }

    if (!Array.isArray(contract.structuredData)) {
      issues.push(issue(subject, 'structuredData must be an array'))
    } else {
      if (contract.structuredData.length === 0) {
        issues.push(issue(subject, 'structuredData is empty'))
      }
      for (const type of contract.structuredData) {
        if (!STRUCTURED_DATA_TYPES.includes(type)) {
          issues.push(issue(subject, `unrecognized structured-data type "${String(type)}"`))
        }
      }
    }
  }

  // Required-surface coverage.
  for (const requiredRoute of REQUIRED_CONTENT_ROUTES) {
    if (!seenRoutes.has(requiredRoute)) {
      issues.push(
        issue('content-contracts', `required route "${requiredRoute}" has no content contract`),
      )
    }
  }

  // Dynamic project-detail coverage against every catalog slug.
  if (seenRoutes.has('/projects/[slug]')) {
    if (options.catalogSlugs.length === 0) {
      issues.push(issue('content-contracts', 'catalog has no slugs to cover /projects/[slug]'))
    }
    const seenSlugs = new Set<string>()
    for (const slug of options.catalogSlugs) {
      if (!/^[a-z0-9-]+$/.test(slug)) {
        issues.push(
          issue('content-contracts', `catalog slug "${slug}" cannot form a /projects/ URL`),
        )
      }
      if (seenSlugs.has(slug)) {
        issues.push(issue('content-contracts', `duplicate catalog slug "${slug}"`))
      }
      seenSlugs.add(slug)
    }
  }

  return issues
}
