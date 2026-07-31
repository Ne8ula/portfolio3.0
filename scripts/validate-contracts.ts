// Contract + catalog validation gate (§8 Phase 0; Phase 0B form). Run via
// `npm run validate:contracts` (tsx). All filesystem access lives here;
// judgement is delegated to the pure validators in lib/** so it stays
// unit-testable.
//
// Exit code 1 on any BLOCKING issue. Since Phase 0B, strict catalog
// completeness, profile validation, and approval verification (missing or
// STALE hashes vs the current content) are all BLOCKING: a canonical
// content edit fails this gate until the owner re-approves the exact new
// content. Phase 2 route delivery and action parity are blocking.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import process from 'node:process'

import type { ValidationIssue } from '@/lib/shared/core'
import {
  findRouteCoverageIssues,
  validateLayoutContracts,
  validateSupportProfiles,
  type RouteScanEntry,
} from '@/lib/responsive/contract-validation'
import {
  LAYOUT_CONTRACTS,
  ROUTE_CONTRACT_EXEMPTIONS,
  ROUTE_LAYOUT_CONTRACTS,
} from '@/lib/responsive/layout-contracts'
import { validateContentContracts } from '@/lib/content/content-contract'
import { CONTENT_CONTRACTS } from '@/lib/content/content-contracts'
import { validateActionParity } from '@/lib/content/action-parity'
import {
  computeApprovalHash,
  validateApprovalManifest,
  verifyApprovals,
  type ApprovalManifest,
} from '@/lib/content/content-approval'
import { catalogSlugs, PROJECTS } from '@/lib/projects/catalog'
import { validateCatalogStructure } from '@/lib/projects/validation'
import { PROFILE, validateProfile } from '@/lib/portfolio/profile'

const repoRoot = process.cwd()

// ── Route-coverage scan: every app/**/page.tsx needs a co-located
//    layout-contract.ts or a documented exemption (§A.7) ─────────────────

function scanRoutes(appDir: string): RouteScanEntry[] {
  const entries: RouteScanEntry[] = []
  const walk = (dir: string): void => {
    for (const dirent of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, dirent.name)
      if (dirent.isDirectory()) {
        // Route groups `(name)` resolve transparently (stripped below);
        // private folders (`_name`) never produce routes.
        if (!dirent.name.startsWith('_')) walk(full)
      } else if (dirent.name === 'page.tsx' || dirent.name === 'page.ts') {
        const relDir = relative(appDir, dir)
        const segments = relDir
          .split(sep)
          .filter((segment) => segment.length > 0 && !/^\(.*\)$/.test(segment))
        const route = `/${segments.join('/')}`
        entries.push({
          route: route === '//' ? '/' : route,
          hasCoLocatedContract:
            existsSync(join(dir, 'layout-contract.ts')) ||
            existsSync(join(dir, 'layout-contract.tsx')),
        })
      }
    }
  }
  walk(appDir)
  return entries
}

// ── Run all validators ────────────────────────────────────────────────────

const issues: ValidationIssue[] = []

issues.push(...validateSupportProfiles())
issues.push(...validateLayoutContracts(LAYOUT_CONTRACTS))

const scannedRoutes = scanRoutes(join(repoRoot, 'app'))
issues.push(
  ...findRouteCoverageIssues(
    scannedRoutes,
    ROUTE_LAYOUT_CONTRACTS,
    LAYOUT_CONTRACTS.map((contract) => contract.id),
    ROUTE_CONTRACT_EXEMPTIONS,
  ),
)

const slugs = catalogSlugs(PROJECTS)
issues.push(...validateContentContracts(CONTENT_CONTRACTS, { catalogSlugs: [...slugs] }))
issues.push(...validateActionParity())

issues.push(...validateCatalogStructure(PROJECTS))
issues.push(...validateProfile(PROFILE))

const manifestPath = join(repoRoot, 'content', 'portfolio-approvals.json')
let manifestRaw: unknown = null
try {
  manifestRaw = JSON.parse(readFileSync(manifestPath, 'utf8'))
} catch (error) {
  issues.push({
    severity: 'error',
    subject: 'approval-manifest',
    message: `cannot read/parse ${relative(repoRoot, manifestPath)}: ${String(error)}`,
  })
}

if (manifestRaw !== null) {
  const knownSubjects = ['profile' as const, ...slugs.map((slug) => `project:${slug}` as const)]
  issues.push(...validateApprovalManifest(manifestRaw, knownSubjects))

  // Phase 0B: BLOCKING approval verification — every subject needs an
  // owner-approved record whose hash matches the CURRENT public content.
  // A missing or stale hash fails the build until the owner reviews the
  // exact content and the record is refreshed (owner-only; a tamper/
  // staleness guard, not proof of truth).
  issues.push(
    ...verifyApprovals(
      manifestRaw as ApprovalManifest,
      [
        { id: 'profile', currentHash: computeApprovalHash({ kind: 'profile', profile: PROFILE }) },
        ...PROJECTS.map((project) => ({
          id: `project:${project.slug}` as const,
          currentHash: computeApprovalHash({ kind: 'project', project }),
        })),
      ],
      { blocking: true },
    ),
  )
}

// ── Report ────────────────────────────────────────────────────────────────

const errors = issues.filter((item) => item.severity === 'error')
const pendings = issues.filter((item) => item.severity === 'pending')

if (pendings.length > 0) {
  console.log(`\nPENDING (non-blocking until Phase 0B / Phase 2) — ${pendings.length} item(s):`)
  const grouped = new Map<string, string[]>()
  for (const item of pendings) {
    const list = grouped.get(item.subject) ?? []
    list.push(item.message)
    grouped.set(item.subject, list)
  }
  for (const [subject, messages] of grouped) {
    console.log(`  ${subject}:`)
    for (const message of messages) console.log(`    - ${message}`)
  }
}

if (errors.length > 0) {
  console.error(`\nBLOCKING contract validation failures — ${errors.length} item(s):`)
  for (const item of errors) console.error(`  ✗ [${item.subject}] ${item.message}`)
  process.exit(1)
}

console.log(
  `\n✓ contracts valid — ${LAYOUT_CONTRACTS.length} layout, ${CONTENT_CONTRACTS.length} content, ` +
    `${scannedRoutes.length} route(s) covered, ${PROJECTS.length} catalog records structurally valid` +
    (pendings.length > 0 ? ` (${pendings.length} pending gap(s) tracked)` : ''),
)
