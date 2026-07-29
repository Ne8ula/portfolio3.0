// Pure layout-contract validation (§A.7, §8 Phase 0). Runs in CI via
// scripts/validate-contracts.ts and in unit tests, so malformed data is
// caught even where TypeScript is bypassed. Filesystem access (the route
// scan) stays in the script; this module only judges the scan's findings.

import { hasRecordShape, isRecord, issue, type ValidationIssue } from '@/lib/shared/core'
import {
  ALLOWED_SUPPORT_PROFILES,
  LAYOUT_ADAPTATIONS,
  REQUIRED_ACCESSIBILITY_STATES,
  REQUIRED_VIEWPORT_CASES,
  SUPPORT_PROFILES,
  type LayoutContract,
  type SupportProfileId,
} from '@/lib/responsive/layout-contract'
import { expectedViewportTier } from '@/lib/responsive/tiers'

/** Validate the SUPPORT_PROFILES registry itself: positive dimensions and
 *  `normalMax ≥ normalMin` per axis (§8 Phase 0 validator list). */
export function validateSupportProfiles(
  profiles: Readonly<
    Record<string, { normalMin: { w: number; h: number }; normalMax: { w: number; h: number } }>
  > = SUPPORT_PROFILES,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  for (const [id, profile] of Object.entries(profiles)) {
    const subject = `support-profile ${id}`
    if (!hasRecordShape(profile)) {
      issues.push(issue(subject, 'profile must be an object'))
      continue
    }
    for (const [edge, size] of [
      ['normalMin', profile.normalMin],
      ['normalMax', profile.normalMax],
    ] as const) {
      if (!isFiniteSize(size)) {
        issues.push(issue(subject, `${edge} must be { w, h } finite numbers`))
        continue
      }
      if (!(size.w > 0) || !(size.h > 0)) {
        issues.push(issue(subject, `${edge} dimensions must be positive`))
      }
    }
    const { normalMin, normalMax } = profile
    if (
      isFiniteSize(normalMin) &&
      isFiniteSize(normalMax) &&
      (normalMax.w < normalMin.w || normalMax.h < normalMin.h)
    ) {
      issues.push(issue(subject, 'normalMax must be ≥ normalMin on both axes'))
    }
  }
  return issues
}

function isFiniteSize(value: unknown): value is { w: number; h: number } {
  if (!isRecord(value)) return false
  return (
    typeof value.w === 'number' &&
    Number.isFinite(value.w) &&
    typeof value.h === 'number' &&
    Number.isFinite(value.h)
  )
}

export type LayoutValidationOptions = {
  /** Profiles contracts may declare; defaults to ALLOWED_SUPPORT_PROFILES
   *  (`desktop-laptop-v1` only until a new profile is a reviewed change). */
  readonly allowedProfiles?: readonly SupportProfileId[]
  /** Contracts that must cover the full §9.1 matrix. Defaults to all. */
  readonly requireFullMatrix?: boolean
}

export function validateLayoutContracts(
  contracts: readonly LayoutContract[],
  options: LayoutValidationOptions = {},
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const allowedProfiles = options.allowedProfiles ?? ALLOWED_SUPPORT_PROFILES
  const requireFullMatrix = options.requireFullMatrix ?? true

  if (!Array.isArray(contracts)) {
    return [issue('layout-contracts', 'contracts must be an array')]
  }

  const seenContractIds = new Set<string>()
  for (const contract of contracts) {
    if (!hasRecordShape(contract)) {
      issues.push(issue('layout-contract (malformed)', 'contract must be an object'))
      continue
    }
    const subject = `layout-contract ${contract.id || '(missing id)'}`

    if (!contract.id) issues.push(issue(subject, 'contract id is empty'))
    if (seenContractIds.has(contract.id)) {
      issues.push(issue(subject, 'duplicate contract id'))
    }
    seenContractIds.add(contract.id)

    // Support profile — recognized key, allowed for current routes.
    const profile = (SUPPORT_PROFILES as Record<string, unknown>)[contract.supportProfile]
    if (!profile) {
      issues.push(
        issue(subject, `unrecognized support profile "${String(contract.supportProfile)}"`),
      )
    } else if (!allowedProfiles.includes(contract.supportProfile)) {
      issues.push(
        issue(
          subject,
          `profile "${contract.supportProfile}" is not allowed for current routes; ` +
            'adding a profile is a reviewed change to SUPPORT_PROFILES',
        ),
      )
    }

    // Protected regions.
    const seenRegionIds = new Set<string>()
    if (!Array.isArray(contract.protectedRegions)) {
      issues.push(issue(subject, 'protectedRegions must be an array'))
    } else {
      for (const region of contract.protectedRegions) {
        if (!hasRecordShape(region)) {
          issues.push(issue(`${subject} region (malformed)`, 'region must be an object'))
          continue
        }
        const regionSubject = `${subject} region ${region.id || '(missing id)'}`
        if (!region.id) issues.push(issue(regionSubject, 'region id is empty'))
        if (seenRegionIds.has(region.id)) issues.push(issue(regionSubject, 'duplicate region id'))
        seenRegionIds.add(region.id)
        if (region.kind !== 'three-dimensional' && region.kind !== 'two-dimensional') {
          issues.push(issue(regionSubject, `unrecognized region kind "${String(region.kind)}"`))
        }
        const alt = region.alternative
        if (!hasRecordShape(alt)) {
          issues.push(issue(regionSubject, 'alternative must be an object'))
        } else if (
          alt.kind !== 'route' &&
          alt.kind !== 'inline-controls' &&
          alt.kind !== 'description' &&
          alt.kind !== 'decorative'
        ) {
          issues.push(issue(regionSubject, `unrecognized alternative kind`))
        } else {
          if (region.interactive && (alt.kind === 'description' || alt.kind === 'decorative')) {
            issues.push(
              issue(
                regionSubject,
                'an interactive protected region must declare a route or inline-controls alternative',
              ),
            )
          }
          if (alt.kind === 'route' && !alt.href.startsWith('/')) {
            issues.push(
              issue(regionSubject, `alternative route "${alt.href}" must be site-relative`),
            )
          }
          if (alt.kind === 'inline-controls' && !alt.regionId) {
            issues.push(issue(regionSubject, 'inline-controls alternative needs a regionId'))
          }
          if (alt.kind === 'description' && !alt.labelledBy) {
            issues.push(issue(regionSubject, 'description alternative needs a labelledBy id'))
          }
        }
      }
    }

    // Adaptations.
    if (!Array.isArray(contract.allowedAdaptations)) {
      issues.push(issue(subject, 'allowedAdaptations must be an array'))
    } else {
      if (contract.allowedAdaptations.length === 0) {
        issues.push(issue(subject, 'allowedAdaptations is empty'))
      }
      const seenAdaptations = new Set<string>()
      for (const adaptation of contract.allowedAdaptations) {
        if (!LAYOUT_ADAPTATIONS.includes(adaptation)) {
          issues.push(issue(subject, `unrecognized adaptation "${String(adaptation)}"`))
        }
        if (seenAdaptations.has(adaptation)) {
          issues.push(issue(subject, `duplicate adaptation "${adaptation}"`))
        }
        seenAdaptations.add(adaptation)
      }
    }

    // Accessibility.
    if (!hasRecordShape(contract.accessibility)) {
      issues.push(issue(subject, 'accessibility must be an object'))
    } else {
      if (contract.accessibility.keyboard !== true) {
        issues.push(issue(subject, 'accessibility.keyboard must be literally true'))
      }
      if (
        contract.accessibility.reflow !== 'standard' &&
        contract.accessibility.reflow !== 'contained-complex-region'
      ) {
        issues.push(issue(subject, 'unrecognized accessibility.reflow value'))
      }
      if (!Array.isArray(contract.accessibility.states)) {
        issues.push(issue(subject, 'accessibility.states must be an array'))
      } else {
        for (const state of REQUIRED_ACCESSIBILITY_STATES) {
          if (!contract.accessibility.states.includes(state)) {
            issues.push(issue(subject, `required accessibility state "${state}" is not declared`))
          }
        }
      }
    }

    // Viewport cases.
    const seenCaseIds = new Set<string>()
    if (!Array.isArray(contract.viewportCases)) {
      issues.push(issue(subject, 'viewportCases must be an array'))
      continue
    }
    for (const viewportCase of contract.viewportCases) {
      if (!hasRecordShape(viewportCase)) {
        issues.push(issue(`${subject} viewport (malformed)`, 'viewport case must be an object'))
        continue
      }
      const caseSubject = `${subject} viewport ${viewportCase.id || '(missing id)'}`
      if (!viewportCase.id) issues.push(issue(caseSubject, 'viewport case id is empty'))
      if (seenCaseIds.has(viewportCase.id)) issues.push(issue(caseSubject, 'duplicate case id'))
      seenCaseIds.add(viewportCase.id)
      if (!(viewportCase.w > 0) || !(viewportCase.h > 0)) {
        issues.push(issue(caseSubject, 'dimensions must be positive'))
        continue
      }
      if (profile) {
        const expected = expectedViewportTier(
          { w: viewportCase.w, h: viewportCase.h },
          contract.supportProfile,
        )
        if (viewportCase.tier !== expected) {
          issues.push(
            issue(
              caseSubject,
              `tier "${viewportCase.tier}" is inconsistent with profile ` +
                `"${contract.supportProfile}" (expected "${expected}")`,
            ),
          )
        }
      }
    }
    if (requireFullMatrix) {
      for (const required of REQUIRED_VIEWPORT_CASES) {
        const covered = contract.viewportCases.some(
          (c: LayoutContract['viewportCases'][number]) =>
            c.w === required.w && c.h === required.h && c.tier === required.tier,
        )
        if (!covered) {
          issues.push(
            issue(subject, `required viewport case ${required.w}×${required.h} is missing`),
          )
        }
      }
    }
  }

  return issues
}

// ── Route coverage (§A.7: a registry alone is not coverage) ──────────────

export type RouteScanEntry = {
  /** Route path derived from an app-router `page.tsx`, e.g. "/" or "/projects". */
  readonly route: string
  /** True when a layout-contract.ts sits beside the page file. */
  readonly hasCoLocatedContract: boolean
}

/**
 * Judge the filesystem scan: every discovered route needs a co-located
 * contract or a documented exemption, every route-contract mapping must
 * point at a declared contract, and every mapped route must exist.
 */
export function findRouteCoverageIssues(
  scanned: readonly RouteScanEntry[],
  routeContracts: Readonly<Record<string, string>>,
  declaredContractIds: readonly string[],
  exemptions: readonly string[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const scannedRoutes = new Set(scanned.map((entry) => entry.route))

  for (const entry of scanned) {
    const subject = `route ${entry.route}`
    if (exemptions.includes(entry.route)) continue
    if (!entry.hasCoLocatedContract) {
      issues.push(
        issue(subject, 'no co-located layout-contract.ts and no documented exemption'),
      )
    }
    const contractId = routeContracts[entry.route]
    if (!contractId) {
      issues.push(issue(subject, 'route is not registered in ROUTE_LAYOUT_CONTRACTS'))
    } else if (!declaredContractIds.includes(contractId)) {
      issues.push(
        issue(subject, `registered contract id "${contractId}" is not in the registry`),
      )
    }
  }

  for (const mappedRoute of Object.keys(routeContracts)) {
    if (!scannedRoutes.has(mappedRoute)) {
      issues.push(
        issue(`route ${mappedRoute}`, 'ROUTE_LAYOUT_CONTRACTS maps a route that does not exist'),
      )
    }
  }

  return issues
}
