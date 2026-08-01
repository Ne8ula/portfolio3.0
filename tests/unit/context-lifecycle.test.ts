import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  AUTO_RESTORE_BUDGET,
  READY_BUDGET_RESET_MS,
  RESTORE_WAIT_MS,
  STABILIZE_MS,
  createContextLifecycleState,
  reduceContextLifecycle,
} from '@/lib/responsive/context-lifecycle'

describe('context lifecycle', () => {
  it('pins the owner-approved timing and retry policy', () => {
    expect({
      stabilize: STABILIZE_MS,
      restoreWait: RESTORE_WAIT_MS,
      budget: AUTO_RESTORE_BUDGET,
      budgetReset: READY_BUDGET_RESET_MS,
    }).toEqual({
      stabilize: 500,
      restoreWait: 10_000,
      budget: 2,
      budgetReset: 60_000,
    })
  })

  it('moves initialization and a restored context through the ready path', () => {
    const initial = createContextLifecycleState()
    const ready = reduceContextLifecycle(initial, { type: 'frame-ready' })
    const lost = reduceContextLifecycle(ready, { type: 'context-lost' })
    const restoring = reduceContextLifecycle(lost, { type: 'context-restored' })
    const rebuilt = reduceContextLifecycle(restoring, { type: 'frame-ready' })

    expect(initial).toEqual({
      status: 'initializing',
      autoRestoresUsed: 0,
      rebuildCount: 0,
    })
    expect(ready.status).toBe('ready')
    expect(lost.status).toBe('lost')
    expect(restoring).toEqual({
      status: 'restoring',
      autoRestoresUsed: 1,
      rebuildCount: 1,
    })
    expect(rebuilt).toEqual({
      status: 'ready',
      autoRestoresUsed: 1,
      rebuildCount: 1,
    })
  })

  it('parks duplicate events and times out only from lost', () => {
    const ready = reduceContextLifecycle(createContextLifecycleState(), {
      type: 'frame-ready',
    })
    const lost = reduceContextLifecycle(ready, { type: 'context-lost' })

    expect(reduceContextLifecycle(lost, { type: 'context-lost' })).toBe(lost)
    expect(reduceContextLifecycle(ready, { type: 'context-restored' })).toBe(ready)
    expect(reduceContextLifecycle(ready, { type: 'restore-timeout' })).toBe(ready)
    expect(reduceContextLifecycle(lost, { type: 'restore-timeout' }).status).toBe(
      'terminal',
    )
  })

  it('uses two automatic rebuilds and makes the next loss terminal', () => {
    let state = reduceContextLifecycle(createContextLifecycleState(), {
      type: 'frame-ready',
    })

    for (let attempt = 1; attempt <= AUTO_RESTORE_BUDGET; attempt += 1) {
      state = reduceContextLifecycle(state, { type: 'context-lost' })
      state = reduceContextLifecycle(state, { type: 'context-restored' })
      state = reduceContextLifecycle(state, { type: 'frame-ready' })
      expect(state).toEqual({
        status: 'ready',
        autoRestoresUsed: attempt,
        rebuildCount: attempt,
      })
    }

    expect(reduceContextLifecycle(state, { type: 'context-lost' }).status).toBe(
      'terminal',
    )
  })

  it('counts a failed rebuild as another attempt and terminates when exhausted', () => {
    const ready = reduceContextLifecycle(createContextLifecycleState(), {
      type: 'frame-ready',
    })
    const lost = reduceContextLifecycle(ready, { type: 'context-lost' })
    const firstAttempt = reduceContextLifecycle(lost, { type: 'context-restored' })
    const secondAttempt = reduceContextLifecycle(firstAttempt, {
      type: 'restore-failed',
    })

    expect(secondAttempt).toEqual({
      status: 'restoring',
      autoRestoresUsed: 2,
      rebuildCount: 2,
    })
    expect(
      reduceContextLifecycle(secondAttempt, { type: 'restore-failed' }).status,
    ).toBe('terminal')
    expect(
      reduceContextLifecycle(createContextLifecycleState(), {
        type: 'restore-failed',
      }).status,
    ).toBe('terminal')
  })

  it('resets only the automatic budget after a stable ready window', () => {
    const state = {
      status: 'ready',
      autoRestoresUsed: 2,
      rebuildCount: 2,
    } as const

    expect(reduceContextLifecycle(state, { type: 'ready-budget-reset' })).toEqual({
      status: 'ready',
      autoRestoresUsed: 0,
      rebuildCount: 2,
    })
  })

  it('keeps renderer hooks development-only and introduces no runtime bridge', () => {
    const hooks = readFileSync('components/cockpit/test-hooks.ts', 'utf8')
    const lifecycle = readFileSync('lib/responsive/context-lifecycle.ts', 'utf8')

    expect(hooks).toContain(
      "export const testHooksEnabled = process.env.NODE_ENV !== 'production'",
    )
    expect(hooks).toContain('getRendererState(): RendererLifecycleSnapshot')
    expect(lifecycle).not.toMatch(/window\.__cockpit/)
  })
})
