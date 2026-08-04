import { describe, expect, it } from 'vitest'

import {
  planE2eRuns,
  shouldIsolateE2eFiles,
} from '../../scripts/run-e2e.mjs'

describe('E2E runner support', () => {
  it('isolates the argument-free CI gate by default', () => {
    expect(
      shouldIsolateE2eFiles({
        args: [],
        ci: 'true',
        override: undefined,
      }),
    ).toBe(true)
  })

  it('preserves local and explicitly targeted Playwright commands', () => {
    expect(
      shouldIsolateE2eFiles({
        args: [],
        ci: undefined,
        override: undefined,
      }),
    ).toBe(false)
    expect(
      shouldIsolateE2eFiles({
        args: ['e2e/smoke.spec.ts', '--grep', 'renderer'],
        ci: 'true',
        override: undefined,
      }),
    ).toBe(false)
    expect(
      shouldIsolateE2eFiles({
        args: ['e2e/smoke.spec.ts'],
        ci: 'true',
        override: '1',
      }),
    ).toBe(false)
  })

  it('supports explicit isolation overrides', () => {
    expect(
      shouldIsolateE2eFiles({
        args: ['--workers=1'],
        ci: undefined,
        override: '1',
      }),
    ).toBe(true)
    expect(
      shouldIsolateE2eFiles({
        args: [],
        ci: 'true',
        override: '0',
      }),
    ).toBe(false)
  })

  it('creates one sorted Playwright run per spec file when isolated', () => {
    expect(
      planE2eRuns({
        args: [],
        ci: 'true',
        override: undefined,
        specFiles: ['e2e/smoke.spec.ts', 'e2e/foundation.spec.ts'],
      }),
    ).toEqual([
      {
        label: 'e2e/foundation.spec.ts',
        args: ['e2e/foundation.spec.ts'],
      },
      {
        label: 'e2e/smoke.spec.ts',
        args: ['e2e/smoke.spec.ts'],
      },
    ])
  })
})
