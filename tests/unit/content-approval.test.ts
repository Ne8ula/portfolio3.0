// Phase 0 approval-machinery tests: deterministic serialization (visual
// excluded), stable SHA-256 hashing with a frozen drift snapshot, manifest
// validation, and pending/blocking verification behavior.

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  APPROVAL_SCHEMA_VERSION,
  approvalSerialization,
  approvalSubjectIdFor,
  computeApprovalHash,
  sha256Hex,
  validateApprovalManifest,
  verifyApprovals,
} from '@/lib/content/content-approval'
import type {
  ApprovalManifest,
  ApprovalSubjectId,
  ContentApproval,
} from '@/lib/content/content-approval'
import type { Project } from '@/lib/projects/catalog'
import type { PublicProfile } from '@/lib/portfolio/profile'

const PROJECT_FIXTURE: Project = {
  id: 'demo',
  slug: 'demo',
  title: 'Demo Project',
  category: 'tech demo',
  date: '2026',
  status: 'completed',
  tagline: 'A demo tagline for approval testing.',
  summary: 'A demo summary describing the fixture project.',
  role: 'Designer',
  problem: 'A demo problem statement.',
  contributions: ['Designed the demo flow'],
  outcomes: ['Shipped the demo'],
  tools: ['TypeScript'],
  skills: ['Systems design'],
  links: [{ label: 'Case study', href: 'https://example.com/case', kind: 'case-study' }],
  cover: { kind: 'image', src: '/vinyl-covers/x.png', alt: 'Demo cover art' },
  visual: { bg: '#fff' },
}

// Same values as PROJECT_FIXTURE, DIFFERENT key insertion order.
const PROJECT_FIXTURE_REORDERED: Project = {
  visual: { bg: '#fff' },
  cover: { alt: 'Demo cover art', src: '/vinyl-covers/x.png', kind: 'image' },
  links: [{ kind: 'case-study', href: 'https://example.com/case', label: 'Case study' }],
  skills: ['Systems design'],
  tools: ['TypeScript'],
  outcomes: ['Shipped the demo'],
  contributions: ['Designed the demo flow'],
  problem: 'A demo problem statement.',
  role: 'Designer',
  summary: 'A demo summary describing the fixture project.',
  tagline: 'A demo tagline for approval testing.',
  status: 'completed',
  date: '2026',
  category: 'tech demo',
  title: 'Demo Project',
  slug: 'demo',
  id: 'demo',
}

const PROFILE_FIXTURE: PublicProfile = {
  name: 'Alex Example',
  targetRole: 'Technical Designer',
  summary: 'Builds interactive systems with owner-approved content.',
  capabilities: ['Systems design'],
  links: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/example', kind: 'linkedin' },
    { label: 'Email', href: 'mailto:alex@example.com', kind: 'email' },
    { label: 'Resume', href: 'https://example.com/resume.pdf', kind: 'resume' },
  ],
}

// Fully-literal frozen fixture for the drift snapshot below. Do NOT edit —
// its hash is hard-coded so any serialization drift fails loudly.
const FROZEN_SNAPSHOT_FIXTURE: Project = Object.freeze<Project>({
  id: 'frozen-demo',
  slug: 'frozen-demo',
  title: 'Frozen Demo',
  category: 'tech demo',
  date: '2026-01-01',
  status: 'completed',
  tagline: 'Frozen tagline for the drift snapshot.',
  summary: 'Frozen summary for the drift snapshot.',
  role: 'Designer',
  problem: 'Frozen problem statement.',
  contributions: ['Frozen contribution'],
  outcomes: ['Frozen outcome'],
  tools: ['TypeScript'],
  skills: ['Serialization'],
  links: [{ label: 'Case study', href: 'https://example.com/frozen', kind: 'case-study' }],
  cover: { kind: 'image', src: '/vinyl-covers/frozen.png', alt: 'Frozen cover' },
})

const FROZEN_SNAPSHOT_HASH =
  '5f9c6121eb06b4e09981ab63f8a253e22eccb7ff1a06d7a734261a79866cca95'

const KNOWN_SUBJECTS: readonly ApprovalSubjectId[] = ['profile', 'project:demo']

const VALID_RECORD: ContentApproval = {
  subjectId: 'profile',
  schemaVersion: APPROVAL_SCHEMA_VERSION,
  approvedContentHash: 'a'.repeat(64),
  approvedAt: '2026-07-27T12:00:00Z',
}

// Severity-filtered: the CI gate blocks only on 'error' (see
// scripts/validate-contracts.ts), so these tests must assert BLOCKING
// findings — a regression downgrading manifest findings to 'pending' would
// otherwise keep the suite green while CI stopped rejecting bad manifests.
function manifestErrors(manifest: unknown) {
  return validateApprovalManifest(manifest, KNOWN_SUBJECTS).filter(
    (entry) => entry.severity === 'error',
  )
}

describe('approvalSerialization', () => {
  it('is deterministic across key insertion order', () => {
    const a = approvalSerialization({ kind: 'project', project: PROJECT_FIXTURE })
    const b = approvalSerialization({ kind: 'project', project: PROJECT_FIXTURE_REORDERED })
    expect(a).toBe(b)
  })

  it('excludes the presentation-only visual field', () => {
    const base = approvalSerialization({ kind: 'project', project: PROJECT_FIXTURE })
    const changedVisual = approvalSerialization({
      kind: 'project',
      project: { ...PROJECT_FIXTURE, visual: { bg: '#000000', accent: '#123456' } },
    })
    expect(changedVisual).toBe(base)
    expect(
      computeApprovalHash({
        kind: 'project',
        project: { ...PROJECT_FIXTURE, visual: { bg: '#000000' } },
      }),
    ).toBe(computeApprovalHash({ kind: 'project', project: PROJECT_FIXTURE }))
  })

  it('changes when a public field like tagline changes', () => {
    const base = approvalSerialization({ kind: 'project', project: PROJECT_FIXTURE })
    const changed = approvalSerialization({
      kind: 'project',
      project: { ...PROJECT_FIXTURE, tagline: 'A different tagline.' },
    })
    expect(changed).not.toBe(base)
  })
})

describe('computeApprovalHash', () => {
  it('returns 64 lowercase hex chars', () => {
    const hash = computeApprovalHash({ kind: 'project', project: PROJECT_FIXTURE })
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('equals sha256Hex over approvalSerialization', () => {
    const subject = { kind: 'profile', profile: PROFILE_FIXTURE } as const
    expect(computeApprovalHash(subject)).toBe(sha256Hex(approvalSerialization(subject)))
  })

  it('matches the frozen drift snapshot for the fully-literal fixture', () => {
    expect(
      computeApprovalHash({ kind: 'project', project: FROZEN_SNAPSHOT_FIXTURE }),
    ).toBe(FROZEN_SNAPSHOT_HASH)
  })
})

describe('approvalSubjectIdFor', () => {
  it('maps a profile subject to "profile"', () => {
    expect(approvalSubjectIdFor({ kind: 'profile', profile: PROFILE_FIXTURE })).toBe('profile')
  })

  it('maps a project subject to "project:" + slug', () => {
    expect(approvalSubjectIdFor({ kind: 'project', project: PROJECT_FIXTURE })).toBe(
      'project:demo',
    )
  })
})

describe('validateApprovalManifest', () => {
  it('passes a valid record', () => {
    expect(manifestErrors({ approvals: [VALID_RECORD] })).toEqual([])
  })

  it('fails a record missing required fields', () => {
    const issues = manifestErrors({ approvals: [{ subjectId: 'profile' }] })
    expect(issues.length).toBeGreaterThan(0)
  })

  it('fails a duplicate subject', () => {
    const issues = manifestErrors({ approvals: [VALID_RECORD, VALID_RECORD] })
    expect(issues.some((i) => i.message.includes('duplicate subject'))).toBe(true)
  })

  it('fails an unknown subject', () => {
    const issues = manifestErrors({
      approvals: [{ ...VALID_RECORD, subjectId: 'project:nope' }],
    })
    expect(issues.some((i) => i.message.includes('unknown subject'))).toBe(true)
  })

  it('fails an unsupported schemaVersion', () => {
    const issues = manifestErrors({ approvals: [{ ...VALID_RECORD, schemaVersion: 2 }] })
    expect(issues.some((i) => i.message.includes('unsupported schemaVersion'))).toBe(true)
  })

  it('fails a short hash', () => {
    const issues = manifestErrors({
      approvals: [{ ...VALID_RECORD, approvedContentHash: 'a'.repeat(63) }],
    })
    expect(issues.some((i) => i.message.includes('approvedContentHash'))).toBe(true)
  })

  it('fails an uppercase hash', () => {
    const issues = manifestErrors({
      approvals: [{ ...VALID_RECORD, approvedContentHash: 'A'.repeat(64) }],
    })
    expect(issues.some((i) => i.message.includes('approvedContentHash'))).toBe(true)
  })

  it('fails a timestamp with a +02:00 offset (UTC Z only)', () => {
    const issues = manifestErrors({
      approvals: [{ ...VALID_RECORD, approvedAt: '2026-07-27T12:00:00+02:00' }],
    })
    expect(issues.some((i) => i.message.includes('approvedAt'))).toBe(true)
  })

  it('fails a regex-valid but impossible date', () => {
    const issues = manifestErrors({
      approvals: [{ ...VALID_RECORD, approvedAt: '2026-13-01T00:00:00Z' }],
    })
    expect(issues.some((i) => i.message.includes('not a real date-time'))).toBe(true)
  })

  it('fails a non-object manifest', () => {
    expect(manifestErrors(null).length).toBeGreaterThan(0)
    expect(manifestErrors('nope').length).toBeGreaterThan(0)
    expect(manifestErrors([]).length).toBeGreaterThan(0)
  })

  it('fails when approvals is not an array', () => {
    const issues = manifestErrors({ approvals: {} })
    expect(issues.some((i) => i.message.includes('"approvals"'))).toBe(true)
  })
})

describe('verifyApprovals', () => {
  const currentHash = computeApprovalHash({ kind: 'project', project: PROJECT_FIXTURE })
  const subjects = [{ id: 'project:demo', currentHash }] as const
  const emptyManifest: ApprovalManifest = { approvals: [] }
  const staleManifest: ApprovalManifest = {
    approvals: [
      {
        subjectId: 'project:demo',
        schemaVersion: APPROVAL_SCHEMA_VERSION,
        approvedContentHash: 'b'.repeat(64),
        approvedAt: '2026-07-27T12:00:00Z',
      },
    ],
  }
  const matchingManifest: ApprovalManifest = {
    approvals: [
      {
        subjectId: 'project:demo',
        schemaVersion: APPROVAL_SCHEMA_VERSION,
        approvedContentHash: currentHash,
        approvedAt: '2026-07-27T12:00:00Z',
      },
    ],
  }

  it('reports a missing record as pending by default', () => {
    const issues = verifyApprovals(emptyManifest, subjects)
    expect(issues).toHaveLength(1)
    expect(issues.every((i) => i.severity === 'pending')).toBe(true)
  })

  it('reports a stale hash as pending by default', () => {
    const issues = verifyApprovals(staleManifest, subjects)
    expect(issues).toHaveLength(1)
    expect(issues.every((i) => i.severity === 'pending')).toBe(true)
  })

  it('escalates missing and stale to error with { blocking: true }', () => {
    const missing = verifyApprovals(emptyManifest, subjects, { blocking: true })
    const stale = verifyApprovals(staleManifest, subjects, { blocking: true })
    expect(missing.every((i) => i.severity === 'error')).toBe(true)
    expect(missing).toHaveLength(1)
    expect(stale.every((i) => i.severity === 'error')).toBe(true)
    expect(stale).toHaveLength(1)
  })

  it('reports no issues for a matching hash', () => {
    expect(verifyApprovals(matchingManifest, subjects)).toEqual([])
  })
})

describe('repo manifest', () => {
  it('content/portfolio-approvals.json parses and validates', () => {
    const raw = readFileSync(
      new URL('../../content/portfolio-approvals.json', import.meta.url),
      'utf8',
    )
    const parsed: unknown = JSON.parse(raw)
    expect(manifestErrors(parsed)).toEqual([])
  })
})

describe('validateApprovalManifest — malformed subjectId shape', () => {
  it('rejects a subjectId that is neither "profile" nor "project:<slug>"', () => {
    const issues = manifestErrors({
      approvals: [{ ...VALID_RECORD, subjectId: 'proj-demo' }],
    })
    expect(issues.some((entry) => entry.message.includes('malformed subjectId'))).toBe(true)
  })
})
