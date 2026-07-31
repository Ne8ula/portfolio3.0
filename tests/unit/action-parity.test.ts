import { describe, expect, it } from 'vitest'

import {
  ACTION_PARITY,
  ACTION_PARITY_IDS,
  AX_OS_FUTURE_STUB_LABEL,
  validateActionParity,
} from '@/lib/content/action-parity'
import type { ActionParityRow } from '@/lib/content/action-parity'

describe('ACTION_PARITY', () => {
  it('contains every required row exactly once and validates cleanly', () => {
    expect(ACTION_PARITY.map((row) => row.id)).toEqual(ACTION_PARITY_IDS)
    expect(validateActionParity()).toEqual([])
  })

  it('uses the shared honest label for the AX/OS future stub', () => {
    const axOs = ACTION_PARITY.find((row) => row.id === 'ax-os-dialog')
    expect(axOs?.status).toBe('future-stub')
    expect(axOs?.stubLabel).toBe(AX_OS_FUTURE_STUB_LABEL)
  })
})

describe('validateActionParity rejects malformed manifests', () => {
  it('reports a missing required row', () => {
    const rows = ACTION_PARITY.filter((row) => row.id !== 'view-more')
    expect(
      validateActionParity(rows).some((entry) =>
        entry.message.includes('required row "view-more" is missing'),
      ),
    ).toBe(true)
  })

  it('reports duplicate rows and unregistered DOM routes', () => {
    const duplicate = ACTION_PARITY[0]
    if (!duplicate) throw new Error('missing action-parity fixture')
    const invalidRoute = {
      ...duplicate,
      id: 'view-more',
      domHref: '/missing',
    } as unknown as ActionParityRow
    const issues = validateActionParity([...ACTION_PARITY, duplicate, invalidRoute])
    expect(issues.some((entry) => entry.message.includes('duplicate row id'))).toBe(
      true,
    )
    expect(
      issues.some((entry) =>
        entry.message.includes('has no registered ContentContract'),
      ),
    ).toBe(true)
  })

  it('rejects a future stub that drifts from the shared label', () => {
    const rows = ACTION_PARITY.map((row) =>
      row.id === 'ax-os-dialog'
        ? { ...row, stubLabel: 'Pretend this works.' }
        : row,
    )
    expect(
      validateActionParity(rows).some((entry) =>
        entry.message.includes('must use the shared AX/OS label'),
      ),
    ).toBe(true)
  })
})
