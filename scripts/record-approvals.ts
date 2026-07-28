// OWNER-ONLY approval recorder (§A.4.2, Phase 0A step 5 / later
// re-approvals). Writes content/portfolio-approvals.json with the SHA-256
// hash of every public profile/project record AS IT CURRENTLY EXISTS.
//
// RULE (docs/responsive-system.md §9): run this ONLY when the owner has
// explicitly approved the exact current content of every subject being
// hashed. Claude, Codex, and automation must never run it to "fix" a
// failing approval check — a stale hash means the owner needs to review a
// content change, and that review happens BEFORE this tool runs.
//
// Usage: npx tsx scripts/record-approvals.ts

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

import {
  approvalSubjectIdFor,
  computeApprovalHash,
  APPROVAL_SCHEMA_VERSION,
  type ApprovalManifest,
  type ApprovalSubject,
} from '@/lib/content/content-approval'
import { PROJECTS } from '@/lib/projects/catalog'
import { PROFILE, validateProfile } from '@/lib/portfolio/profile'
import { validateCatalogStructure } from '@/lib/projects/validation'

// Refuse to hash invalid content — approval presupposes a complete record.
const structuralIssues = [
  ...validateCatalogStructure(PROJECTS),
  ...validateProfile(PROFILE),
].filter((issue) => issue.severity === 'error')
if (structuralIssues.length > 0) {
  console.error('Refusing to record approvals over invalid content:')
  for (const issue of structuralIssues) console.error(`  ✗ [${issue.subject}] ${issue.message}`)
  process.exit(1)
}

const approvedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

const subjects: ApprovalSubject[] = [
  { kind: 'profile', profile: PROFILE },
  ...PROJECTS.map((project) => ({ kind: 'project' as const, project })),
]

const manifest: ApprovalManifest = {
  approvals: subjects.map((subject) => ({
    subjectId: approvalSubjectIdFor(subject),
    schemaVersion: APPROVAL_SCHEMA_VERSION,
    approvedContentHash: computeApprovalHash(subject),
    approvedAt,
  })),
}

const outPath = join(process.cwd(), 'content', 'portfolio-approvals.json')
writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Recorded ${manifest.approvals.length} approval(s) at ${approvedAt}:`)
for (const record of manifest.approvals) {
  console.log(`  ${record.subjectId}  ${record.approvedContentHash.slice(0, 12)}…`)
}
