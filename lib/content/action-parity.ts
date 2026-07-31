// Canonical Phase 2 action-parity manifest (§A.4.2 / phase-2-design §8.4).
// It records the shared outcome for every meaningful cockpit function; it
// does not recreate camera motion in the document path.

import {
  CONTENT_CONTRACTS,
} from '@/lib/content/content-contracts'
import type { ContentContract } from '@/lib/content/content-contract'
import {
  hasRecordShape,
  isNonEmptyString,
  issue,
  type ValidationIssue,
} from '@/lib/shared/core'
import { SITE_ROUTES } from '@/lib/site/site'

export const AX_OS_FUTURE_STUB_LABEL =
  'AX/OS demonstration — message sending is not implemented.'

export const ACTION_PARITY_IDS = [
  'enter-skip-boot',
  'browse-projects',
  'view-more',
  'focus-view',
  'ax-os-dialog',
  'change-theme',
  'change-accessibility',
  'ambient-motion',
] as const

export type ActionParityId = (typeof ACTION_PARITY_IDS)[number]
export type ActionParityStatus = 'implemented' | 'decorative' | 'future-stub'

export type ActionParityRow = {
  readonly id: ActionParityId
  readonly cockpitFunction: string
  readonly domEquivalent: string
  readonly status: ActionParityStatus
  readonly domHref?: ContentContract['route']
  readonly stubLabel?: string
}

export const ACTION_PARITY: readonly ActionParityRow[] = [
  {
    id: 'enter-skip-boot',
    cockpitFunction: 'Enter / skip boot',
    domEquivalent: 'Document content and primary links are present before boot.',
    status: 'implemented',
    domHref: SITE_ROUTES.home,
  },
  {
    id: 'browse-projects',
    cockpitFunction: 'Browse crate / deck',
    domEquivalent: 'Project list with per-detail previous and next navigation.',
    status: 'implemented',
    domHref: SITE_ROUTES.projects,
  },
  {
    id: 'view-more',
    cockpitFunction: 'VIEW MORE',
    domEquivalent: 'Ordinary project-detail anchor.',
    status: 'implemented',
    domHref: SITE_ROUTES.projectDetail,
  },
  {
    id: 'focus-view',
    cockpitFunction: 'Enter / exit focused view',
    domEquivalent: 'Labeled links and Escape-dismissible menus.',
    status: 'implemented',
    domHref: SITE_ROUTES.projectDetail,
  },
  {
    id: 'ax-os-dialog',
    cockpitFunction: 'AX/OS dialog',
    domEquivalent: 'No duplicate assistant; the shared future feature is labeled honestly.',
    status: 'future-stub',
    stubLabel: AX_OS_FUTURE_STUB_LABEL,
  },
  {
    id: 'change-theme',
    cockpitFunction: 'Change theme',
    domEquivalent: 'Appearance controls use the shared document preference.',
    status: 'implemented',
  },
  {
    id: 'change-accessibility',
    cockpitFunction: 'Change accessibility',
    domEquivalent: 'Root accessibility dialog and persisted settings.',
    status: 'implemented',
  },
  {
    id: 'ambient-motion',
    cockpitFunction: 'Ambient scene motion',
    domEquivalent: 'No duplicate animation; the motion is decorative.',
    status: 'decorative',
  },
]

const ACTION_PARITY_STATUSES: readonly ActionParityStatus[] = [
  'implemented',
  'decorative',
  'future-stub',
]

export function validateActionParity(
  rows: readonly ActionParityRow[] = ACTION_PARITY,
  contracts: readonly ContentContract[] = CONTENT_CONTRACTS,
): ValidationIssue[] {
  if (!Array.isArray(rows)) {
    return [issue('action-parity', 'rows must be an array')]
  }

  const issues: ValidationIssue[] = []
  const contractRoutes = new Set(contracts.map((contract) => contract.route))
  const seenIds = new Set<string>()

  for (const row of rows) {
    if (!hasRecordShape(row)) {
      issues.push(issue('action-parity row (malformed)', 'row must be an object'))
      continue
    }

    const id = String(row.id)
    const subject = `action-parity ${id || '(missing id)'}`
    if (!(ACTION_PARITY_IDS as readonly string[]).includes(id)) {
      issues.push(issue(subject, `unknown row id "${id}"`))
    }
    if (seenIds.has(id)) {
      issues.push(issue(subject, 'duplicate row id'))
    }
    seenIds.add(id)

    if (!isNonEmptyString(row.cockpitFunction)) {
      issues.push(issue(subject, 'cockpitFunction is empty'))
    }
    if (!isNonEmptyString(row.domEquivalent)) {
      issues.push(issue(subject, 'domEquivalent is empty'))
    }
    if (!ACTION_PARITY_STATUSES.includes(row.status)) {
      issues.push(issue(subject, `unknown status "${String(row.status)}"`))
    }
    if (row.domHref !== undefined && !contractRoutes.has(row.domHref)) {
      issues.push(
        issue(
          subject,
          `domHref "${String(row.domHref)}" has no registered ContentContract`,
        ),
      )
    }
    if (
      row.status === 'future-stub' &&
      row.stubLabel !== AX_OS_FUTURE_STUB_LABEL
    ) {
      issues.push(issue(subject, 'future-stub must use the shared AX/OS label'))
    }
    if (row.status !== 'future-stub' && row.stubLabel !== undefined) {
      issues.push(issue(subject, 'stubLabel is allowed only on future-stub rows'))
    }
  }

  for (const requiredId of ACTION_PARITY_IDS) {
    if (!seenIds.has(requiredId)) {
      issues.push(issue('action-parity', `required row "${requiredId}" is missing`))
    }
  }

  return issues
}
