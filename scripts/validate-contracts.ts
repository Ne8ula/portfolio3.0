// Contract + catalog validation gate (§8 Phase 0). Run via
// `npm run validate:contracts` (tsx). All filesystem access lives here;
// judgement is delegated to the pure validators in lib/** so it stays
// unit-testable.
//
// Exit code 1 on any BLOCKING issue. `pending` issues (strict catalog
// completeness, approval coverage — non-blocking until Phase 0B; route
// delivery — Phase 2) are printed and labeled, never hidden, never fatal
// here.

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
import { validateApprovalManifest } from '@/lib/content/content-approval'
import { catalogSlugs, PROJECTS } from '@/lib/projects/catalog'
import {
  validateCatalogCompleteness,
  validateCatalogStructure,
} from '@/lib/projects/validation'

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

issues.push(...validateCatalogStructure(PROJECTS))
issues.push(...validateCatalogCompleteness(PROJECTS))

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

  // Approval COVERAGE is pending until Phase 0B: the provisional catalog
  // cannot be hashed as strict §A.4.2 content, so staleness cannot be
  // computed yet — only record-exists coverage. Structural manifest
  // validity above is already blocking. Phase 0B replaces this block with
  // a blocking verifyApprovals() over computeApprovalHash() of the strict
  // records.
  const manifest = manifestRaw as { approvals?: readonly { subjectId?: unknown }[] }
  if (Array.isArray(manifest.approvals)) {
    const approvedSubjects = new Set(
      manifest.approvals.map((record) => String(record?.subjectId)),
    )
    for (const subjectId of knownSubjects) {
      if (!approvedSubjects.has(subjectId)) {
        issues.push({
          severity: 'pending',
          subject: `approval ${subjectId}`,
          message: 'no owner-approved record exists (Phase 0A produces it; blocking from Phase 0B)',
        })
      }
    }
  }
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
