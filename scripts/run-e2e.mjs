#!/usr/bin/env node

import { readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const scriptPath = fileURLToPath(import.meta.url)
const repositoryRoot = resolve(dirname(scriptPath), '..')
const require = createRequire(import.meta.url)
const playwrightCli = require.resolve('@playwright/test/cli')

export function discoverE2eSpecFiles(root = repositoryRoot) {
  const testDirectory = join(root, 'e2e')
  return readdirSync(testDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.spec.ts'))
    .map((entry) => relative(root, join(testDirectory, entry.name)))
    .sort()
}

export function shouldIsolateE2eFiles({
  args,
  ci,
  override,
}) {
  const hasExplicitSpecFile = args.some((arg) =>
    /\.spec\.[cm]?[jt]sx?$/u.test(arg),
  )
  if (hasExplicitSpecFile) return false
  if (override === '0') return false
  if (override === '1') return true
  return ci === 'true' && args.length === 0
}

export function planE2eRuns({
  args,
  ci,
  override,
  specFiles,
}) {
  if (!shouldIsolateE2eFiles({ args, ci, override })) {
    return [{ label: 'playwright suite', args }]
  }
  return [...specFiles].sort().map((specFile) => ({
    label: specFile,
    args: [specFile, ...args],
  }))
}

function runPlaywright(args, env) {
  const result = spawnSync(
    process.execPath,
    [playwrightCli, 'test', ...args],
    {
      cwd: repositoryRoot,
      env,
      stdio: 'inherit',
    },
  )

  if (result.error) throw result.error
  if (result.signal) {
    console.error(`[e2e] Playwright stopped after signal ${result.signal}.`)
    return 1
  }
  return result.status ?? 1
}

export function main({
  args = process.argv.slice(2),
  env = process.env,
  specFiles = discoverE2eSpecFiles(),
} = {}) {
  const runs = planE2eRuns({
    args,
    ci: env.CI,
    override: env.E2E_ISOLATE_FILES,
    specFiles,
  })
  const isolated = runs.length > 1

  if (isolated) {
    console.log(
      `[e2e] Running ${runs.length} spec files sequentially in isolated Playwright processes.`,
    )
  }

  for (const [index, run] of runs.entries()) {
    if (isolated) {
      console.log(`[e2e] ${index + 1}/${runs.length}: ${run.label}`)
    }
    const runEnv = { ...env }
    if (isolated) {
      runEnv.PLAYWRIGHT_HTML_OUTPUT_DIR = join(
        repositoryRoot,
        'playwright-report',
        `${index + 1}`,
      )
    }
    const status = runPlaywright(run.args, runEnv)
    if (status !== 0) return status
  }

  return 0
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : ''
if (invokedPath === scriptPath) {
  process.exitCode = main()
}
