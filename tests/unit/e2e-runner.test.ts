import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  discoverE2eSpecFiles,
  planE2eRuns,
  shouldIsolateE2eFiles,
} from '../../scripts/run-e2e.mjs'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

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

  it('keeps the CI browser matrix in exact sync with discovered spec files', () => {
    const workflow = readFileSync(
      resolve(repositoryRoot, '.github/workflows/ci.yml'),
      'utf8',
    )
    const matrixSpecs = [...workflow.matchAll(/^\s+spec:\s+(e2e\/[^\s]+\.spec\.ts)\s*$/gmu)]
      .map((match) => match[1])
      .sort()

    expect(matrixSpecs).toEqual(discoverE2eSpecFiles(repositoryRoot))
    expect(new Set(matrixSpecs).size).toBe(matrixSpecs.length)
  })

  it('limits extended GitHub job budgets to renderer-heavy specs and keeps focused AC-17 blocking', () => {
    const workflow = readFileSync(
      resolve(repositoryRoot, '.github/workflows/ci.yml'),
      'utf8',
    )

    expect(workflow).toContain('timeout-minutes: ${{ matrix.timeout }}')
    expect(workflow).toMatch(
      /id: phase3-renderer\n\s+spec: e2e\/phase3-renderer\.spec\.ts\n\s+timeout: 75\n\s+timing_scale: 1\.5/u,
    )
    expect(workflow).toMatch(
      /id: phase5-fit\n\s+spec: e2e\/phase5-fit\.spec\.ts\n\s+timeout: 90\n\s+timing_scale: 1\.5/u,
    )
    expect(workflow).toMatch(
      /id: phase5-input\n\s+spec: e2e\/phase5-input\.spec\.ts\n\s+timeout: 90/u,
    )
    expect(workflow).toContain('ac17-decoration:')
    expect(workflow).toContain(
      '--grep "AC-17 arbitrates wide-fit decorations where each target is reachable"',
    )
  })
})
