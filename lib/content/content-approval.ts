// Owner content-approval records (§A.4.2): stable public-field
// serialization, SHA-256 hashing, manifest typing, and pure validation for
// content/portfolio-approvals.json.
//
// The manifest is a tamper/staleness guard, not proof of truth or of human
// review. Approval is a MANUAL owner decision:
//   - Claude, Codex, and automation must NEVER create or refresh an
//     approval record without explicit owner confirmation for the exact
//     content being hashed.
//   - A content change invalidates the prior hash and stays blocked (from
//     Phase 0B) until the owner reviews it.
//   - Approval metadata is never emitted through HTML, JSON-LD, or
//     /portfolio.json.
//
// Node-only module (uses node:crypto); it is consumed by CI validation and
// owner tooling, never by client code.

import { createHash } from 'node:crypto'

import {
  isNonEmptyString,
  issue,
  pending,
  stableStringify,
  type JsonValue,
  type ValidationIssue,
} from '@/lib/shared/core'
import type { Project } from '@/lib/projects/catalog'
import type { PublicProfile } from '@/lib/portfolio/profile'

export const APPROVAL_SCHEMA_VERSION = 1

export type ApprovalSubjectId = 'profile' | `project:${string}`

export type ContentApproval = {
  readonly subjectId: ApprovalSubjectId
  readonly schemaVersion: typeof APPROVAL_SCHEMA_VERSION
  /** SHA-256 (lowercase hex) over the stable serialization below. */
  readonly approvedContentHash: string
  /** RFC 3339 UTC timestamp, e.g. 2026-07-27T21:15:00Z. */
  readonly approvedAt: string
}

export type ApprovalManifest = {
  readonly approvals: readonly ContentApproval[]
}

export type ApprovalSubject =
  | { readonly kind: 'profile'; readonly profile: PublicProfile }
  | { readonly kind: 'project'; readonly project: Project }

/**
 * Stable, key-sorted serialization of every public recruiter-facing field
 * for a profile or project — including links and image alternatives,
 * EXCLUDING presentation-only `visual` tokens (§A.4.2).
 */
export function approvalSerialization(subject: ApprovalSubject): string {
  if (subject.kind === 'profile') {
    return stableStringify({
      kind: 'profile',
      schemaVersion: APPROVAL_SCHEMA_VERSION,
      content: subject.profile as unknown as JsonValue,
    })
  }
  const { visual: _visual, ...publicFields } = subject.project
  return stableStringify({
    kind: 'project',
    schemaVersion: APPROVAL_SCHEMA_VERSION,
    content: publicFields as unknown as JsonValue,
  })
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex')
}

/** Hash the exact content an owner approves. Owner-tooling only — never
 *  call this to "fix" a failing approval check. */
export function computeApprovalHash(subject: ApprovalSubject): string {
  return sha256Hex(approvalSerialization(subject))
}

export function approvalSubjectIdFor(subject: ApprovalSubject): ApprovalSubjectId {
  return subject.kind === 'profile' ? 'profile' : `project:${subject.project.slug}`
}

const HASH_SHAPE = /^[0-9a-f]{64}$/
// RFC 3339 UTC: date-time with Z offset only (approval records are stored
// normalized to UTC).
const RFC3339_UTC = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?Z$/

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const

/** Calendar-validate a shape-valid timestamp. `Date.parse` silently
 *  normalizes day overflow (Feb 30 → Mar 2), so check components. */
function isRealUtcDateTime(value: string): boolean {
  const match = RFC3339_UTC.exec(value)
  if (!match) return false
  const [, year, month, day, hour, minute, second] = match.map(Number)
  if (
    year === undefined || month === undefined || day === undefined ||
    hour === undefined || minute === undefined || second === undefined
  ) {
    return false
  }
  if (month < 1 || month > 12) return false
  const monthDays =
    month === 2 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0)
      ? 29
      : DAYS_IN_MONTH[month - 1] ?? 0
  if (day < 1 || day > monthDays) return false
  return hour <= 23 && minute <= 59 && second <= 59
}

/**
 * Structural manifest validation (blocking from Phase 0): unique and known
 * subjects, supported schema version, RFC 3339 UTC timestamps, hash shape.
 * Hash MATCHING against current content is verifyApprovals() below.
 */
export function validateApprovalManifest(
  manifest: unknown,
  knownSubjects: readonly ApprovalSubjectId[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const subjectLabel = 'approval-manifest'

  if (typeof manifest !== 'object' || manifest === null || Array.isArray(manifest)) {
    issues.push(issue(subjectLabel, 'manifest must be an object with an "approvals" array'))
    return issues
  }
  const approvals = (manifest as { approvals?: unknown }).approvals
  if (!Array.isArray(approvals)) {
    issues.push(issue(subjectLabel, '"approvals" must be an array'))
    return issues
  }

  const seenSubjects = new Set<string>()
  approvals.forEach((record: unknown, index: number) => {
    const recordLabel = `approval[${index}]`
    if (typeof record !== 'object' || record === null) {
      issues.push(issue(recordLabel, 'record must be an object'))
      return
    }
    const { subjectId, schemaVersion, approvedContentHash, approvedAt } = record as Record<
      string,
      unknown
    >

    if (!isNonEmptyString(subjectId)) {
      issues.push(issue(recordLabel, 'subjectId is missing'))
    } else {
      if (subjectId !== 'profile' && !subjectId.startsWith('project:')) {
        issues.push(issue(recordLabel, `malformed subjectId "${subjectId}"`))
      } else if (!knownSubjects.includes(subjectId as ApprovalSubjectId)) {
        issues.push(issue(recordLabel, `unknown subject "${subjectId}"`))
      }
      if (seenSubjects.has(subjectId)) {
        issues.push(issue(recordLabel, `duplicate subject "${subjectId}"`))
      }
      seenSubjects.add(subjectId)
    }

    if (schemaVersion !== APPROVAL_SCHEMA_VERSION) {
      issues.push(
        issue(recordLabel, `unsupported schemaVersion ${String(schemaVersion)}`),
      )
    }
    if (!isNonEmptyString(approvedContentHash) || !HASH_SHAPE.test(approvedContentHash)) {
      issues.push(issue(recordLabel, 'approvedContentHash must be 64 lowercase hex chars'))
    }
    if (!isNonEmptyString(approvedAt) || !RFC3339_UTC.test(approvedAt)) {
      issues.push(issue(recordLabel, 'approvedAt must be an RFC 3339 UTC timestamp (…Z)'))
    } else if (!isRealUtcDateTime(approvedAt)) {
      issues.push(issue(recordLabel, `approvedAt "${approvedAt}" is not a real date-time`))
    }
  })

  return issues
}

export type ApprovalCheckSubject = {
  readonly id: ApprovalSubjectId
  readonly currentHash: string
}

/**
 * Approval coverage + staleness. NON-BLOCKING (`pending`) until Phase 0B:
 * Phase 0's catalog is provisional and Phase 0A has not produced approved
 * content yet, so missing records are honest gaps, not failures. Phase 0B
 * flips these to blocking via the `blocking` flag.
 */
export function verifyApprovals(
  manifest: ApprovalManifest,
  subjects: readonly ApprovalCheckSubject[],
  options: { readonly blocking: boolean } = { blocking: false },
): ValidationIssue[] {
  const make = options.blocking ? issue : pending
  const issues: ValidationIssue[] = []
  const bySubject = new Map(manifest.approvals.map((a) => [a.subjectId, a]))

  for (const subject of subjects) {
    const record = bySubject.get(subject.id)
    if (!record) {
      issues.push(make(`approval ${subject.id}`, 'no owner-approved record exists'))
      continue
    }
    if (record.approvedContentHash !== subject.currentHash) {
      issues.push(
        make(
          `approval ${subject.id}`,
          'content changed since owner approval (stale hash) — owner review required',
        ),
      )
    }
  }

  return issues
}
