#!/usr/bin/env -S npx tsx

import { spawn, spawnSync, execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  closeSync,
  copyFileSync,
  cpSync,
  createWriteStream,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join, relative, resolve, sep } from 'node:path'
import {
  buildCodexPrompt,
  buildKimiPrompt,
  canonicalGateCommand,
  createInitialState,
  extractKimiJson,
  getStep,
  isHostRecoverableE2eFailure,
  manifestDigest,
  parseCodexResult,
  parseKimiResult,
  parseManifest,
  parseState,
  transitionAfterQa,
  type CodexResult,
  type KimiResult,
  type PhaseManifest,
  type PhaseRunnerState,
} from './core'

const RUNNER_DIRECTORY = '.agent-runs'
const HANDOFF_PATH = join('docs', 'agent-handoff.md')
const MAX_COMMAND_OUTPUT = 64 * 1024 * 1024

interface RunnerPaths {
  root: string
  manifest: string
  schema: string
  kimiAgent: string
  stateDirectory: string
  state: string
  pause: string
  lock: string
  logs: string
}

interface LoadedRunner {
  paths: RunnerPaths
  manifest: PhaseManifest
  manifestDigest: string
}

interface ChildResult {
  stdout: string
  stderr: string
}

interface QaWorktree {
  parent: string
  path: string
}

function fail(message: string): never {
  throw new Error(message)
}

function gitText(args: string[], cwd: string): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: MAX_COMMAND_OUTPUT,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trimEnd()
}

function gitBuffer(args: string[], cwd: string): Buffer {
  return execFileSync('git', args, {
    cwd,
    encoding: null,
    maxBuffer: MAX_COMMAND_OUTPUT,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

function repositoryRoot(cwd: string): string {
  try {
    return gitText(['rev-parse', '--show-toplevel'], cwd)
  } catch {
    return fail(`not inside a Git repository: ${cwd}`)
  }
}

function runnerPaths(root: string, phase: number): RunnerPaths {
  const stateDirectory = join(root, RUNNER_DIRECTORY, `phase-${phase}`)
  return {
    root,
    manifest: join(
      root,
      'scripts',
      'phase-runner',
      'manifests',
      `phase-${phase}.json`,
    ),
    schema: join(
      root,
      'scripts',
      'phase-runner',
      'schemas',
      'codex-result.schema.json',
    ),
    kimiAgent: join(root, '.agents', 'agents', 'kimi-phase-qa.md'),
    stateDirectory,
    state: join(stateDirectory, 'state.json'),
    pause: join(stateDirectory, 'pause-requested'),
    lock: join(root, RUNNER_DIRECTORY, `phase-${phase}.lock`),
    logs: join(stateDirectory, 'logs'),
  }
}

function loadRunner(root: string, phase: number): LoadedRunner {
  const paths = runnerPaths(root, phase)
  if (!existsSync(paths.manifest)) {
    return fail(`phase manifest does not exist: ${paths.manifest}`)
  }
  const rawManifest = readFileSync(paths.manifest, 'utf8')
  const manifest = parseManifest(JSON.parse(rawManifest))
  if (manifest.phase !== phase) {
    return fail(`phase manifest declares Phase ${manifest.phase}, not ${phase}`)
  }
  return {
    paths,
    manifest,
    manifestDigest: manifestDigest(rawManifest),
  }
}

function writeAtomically(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true })
  const temporary = `${path}.tmp-${process.pid}`
  writeFileSync(temporary, content, 'utf8')
  renameSync(temporary, path)
}

function writeState(path: string, state: PhaseRunnerState): void {
  writeAtomically(path, `${JSON.stringify(state, null, 2)}\n`)
}

function loadState(loaded: LoadedRunner): PhaseRunnerState {
  if (!existsSync(loaded.paths.state)) {
    return fail(
      `Phase ${loaded.manifest.phase} is not initialized. Run npm run phase:init first.`,
    )
  }
  const state = parseState(
    JSON.parse(readFileSync(loaded.paths.state, 'utf8')),
    loaded.manifest,
  )
  if (state.manifestDigest !== loaded.manifestDigest) {
    return fail(
      'the phase manifest changed after initialization; inspect and reconcile the state before running',
    )
  }
  return state
}

function updateState(
  loaded: LoadedRunner,
  state: PhaseRunnerState,
  patch: Partial<PhaseRunnerState>,
): PhaseRunnerState {
  const next = {
    ...state,
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  writeState(loaded.paths.state, next)
  return next
}

function acquireLock(paths: RunnerPaths): void {
  mkdirSync(dirname(paths.lock), { recursive: true })
  try {
    mkdirSync(paths.lock)
  } catch {
    return fail(
      `another phase runner owns ${relative(paths.root, paths.lock)}; inspect its owner.json before retrying`,
    )
  }
  writeFileSync(
    join(paths.lock, 'owner.json'),
    `${JSON.stringify(
      {
        pid: process.pid,
        startedAt: new Date().toISOString(),
        cwd: paths.root,
      },
      null,
      2,
    )}\n`,
    'utf8',
  )
}

function releaseLock(paths: RunnerPaths): void {
  if (existsSync(paths.lock)) rmSync(paths.lock, { recursive: true, force: true })
}

function executablePath(kind: 'codex' | 'kimi'): string {
  const override =
    kind === 'codex'
      ? process.env.PHASE_RUNNER_CODEX_BIN
      : process.env.PHASE_RUNNER_KIMI_BIN
  if (override) return resolve(override)

  if (kind === 'codex') {
    const pathResult = spawnSync('codex', ['--version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    if (!pathResult.error && pathResult.status === 0) return 'codex'

    const extensionRoots = [
      join(homedir(), '.vscode', 'extensions'),
      join(homedir(), '.vscode-insiders', 'extensions'),
      join(homedir(), '.cursor', 'extensions'),
    ]
    const candidates: Array<{ path: string; modifiedAt: number }> = []
    for (const extensionRoot of extensionRoots) {
      if (!existsSync(extensionRoot)) continue
      for (const entry of readdirSync(extensionRoot, { withFileTypes: true })) {
        if (!entry.isDirectory() || !entry.name.startsWith('openai.chatgpt-')) {
          continue
        }
        const binRoot = join(extensionRoot, entry.name, 'bin')
        if (!existsSync(binRoot)) continue
        for (const platform of readdirSync(binRoot, { withFileTypes: true })) {
          if (!platform.isDirectory()) continue
          const candidate = join(binRoot, platform.name, 'codex')
          if (!existsSync(candidate)) continue
          candidates.push({
            path: candidate,
            modifiedAt: lstatSync(join(extensionRoot, entry.name)).mtimeMs,
          })
        }
      }
    }
    candidates.sort((left, right) => right.modifiedAt - left.modifiedAt)
    const discovered = candidates.find((candidate) => {
      const result = spawnSync(candidate.path, ['--version'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      return !result.error && result.status === 0
    })
    if (discovered) return discovered.path
  }

  if (kind === 'kimi') {
    const bundled = join(homedir(), '.kimi-code', 'bin', 'kimi')
    if (existsSync(bundled)) return bundled
  }
  return kind
}

function assertExecutable(executable: string, label: string): void {
  const result = spawnSync(executable, ['--version'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (result.error || result.status !== 0) {
    return fail(
      `${label} CLI is unavailable at ${executable}; install/authenticate it or set its PHASE_RUNNER_*_BIN override`,
    )
  }
}

function timestampSlug(): string {
  return new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
}

async function runLoggedCommand(
  executable: string,
  args: string[],
  options: {
    cwd: string
    env?: NodeJS.ProcessEnv
    logPath: string
    label: string
    echoStdout?: boolean
    heartbeatMs?: number
  },
): Promise<ChildResult> {
  mkdirSync(dirname(options.logPath), { recursive: true })
  const log = createWriteStream(options.logPath, { flags: 'w' })
  const child = spawn(executable, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const stdout: Buffer[] = []
  const stderr: Buffer[] = []
  let stdoutSize = 0
  let stderrSize = 0
  const heartbeat =
    options.heartbeatMs && options.heartbeatMs > 0
      ? setInterval(() => {
          console.log(
            `${options.label} is still running; events are being recorded in ${options.logPath}.`,
          )
        }, options.heartbeatMs)
      : null
  heartbeat?.unref()

  child.stdout.on('data', (chunk: Buffer) => {
    log.write(chunk)
    if (options.echoStdout) process.stdout.write(chunk)
    if (stdoutSize < MAX_COMMAND_OUTPUT) {
      stdout.push(chunk)
      stdoutSize += chunk.length
    }
  })
  child.stderr.on('data', (chunk: Buffer) => {
    log.write(chunk)
    process.stderr.write(chunk)
    if (stderrSize < MAX_COMMAND_OUTPUT) {
      stderr.push(chunk)
      stderrSize += chunk.length
    }
  })

  const status = await new Promise<number>((resolveStatus, rejectStatus) => {
    child.once('error', rejectStatus)
    child.once('close', (code) => resolveStatus(code ?? 1))
  }).finally(() => {
    if (heartbeat) clearInterval(heartbeat)
    log.end()
  })

  const result = {
    stdout: Buffer.concat(stdout).toString('utf8'),
    stderr: Buffer.concat(stderr).toString('utf8'),
  }
  if (status !== 0) {
    throw new Error(
      `${options.label} exited ${status}; inspect ${relative(options.cwd, options.logPath)}`,
    )
  }
  return result
}

function handoffHash(root: string): string {
  const path = join(root, HANDOFF_PATH)
  return existsSync(path)
    ? createHash('sha256').update(readFileSync(path)).digest('hex')
    : ''
}

function captureHandoff(
  root: string,
  agent: 'codex' | 'kimi',
  finalReport: string,
): void {
  const script = join(root, 'scripts', 'agent-handoff.mjs')
  const result = spawnSync(
    process.execPath,
    [script, 'capture', '--agent', agent],
    {
      cwd: root,
      input: JSON.stringify({
        cwd: root,
        session_id: `phase-runner-${agent}`,
        final_response: finalReport,
      }),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  )
  if (result.error || result.status !== 0) {
    throw new Error(
      `could not capture ${agent} handoff: ${result.stderr || result.error?.message}`,
    )
  }
}

function formatCodexReport(result: CodexResult): string {
  const gates = result.gates
    .map((gate) => `- ${gate.command}: ${gate.status} — ${gate.details}`)
    .join('\n')
  const risks =
    result.unresolvedRisks.length > 0
      ? result.unresolvedRisks.map((risk) => `- ${risk}`).join('\n')
      : '- None reported.'
  return `${result.summary}

Verification:
${gates}

Unresolved risks:
${risks}

${result.handoff}`
}

function formatKimiReport(result: KimiResult): string {
  const gates = result.gates
    .map((gate) => `- ${gate.command}: ${gate.status} — ${gate.details}`)
    .join('\n')
  const findings =
    result.findings.length > 0
      ? result.findings
          .map(
            (finding) =>
              `- ${finding.severity.toUpperCase()} ${finding.file}:${finding.line} — ${finding.evidence}`,
          )
          .join('\n')
      : '- None.'
  return `${result.summary}

Verdict: ${result.verdict.toUpperCase()}

Verification:
${gates}

Findings:
${findings}

${result.handoff}`
}

function untrackedPaths(root: string): string[] {
  const output = gitText(
    ['ls-files', '--others', '--exclude-standard', '-z'],
    root,
  )
  return output.split('\0').filter(Boolean)
}

function safeRepositoryPath(root: string, path: string): string {
  const resolved = resolve(root, path)
  if (resolved !== root && !resolved.startsWith(`${root}${sep}`)) {
    return fail(`unsafe repository-relative path: ${path}`)
  }
  return resolved
}

function worktreeSnapshot(root: string): string {
  const hash = createHash('sha256')
  hash.update(
    gitBuffer(
      [
        'diff',
        '--binary',
        'HEAD',
        '--',
        '.',
        `:(exclude)${HANDOFF_PATH}`,
      ],
      root,
    ),
  )
  for (const path of untrackedPaths(root).sort()) {
    if (path === HANDOFF_PATH || path.startsWith(`${RUNNER_DIRECTORY}/`)) continue
    const absolute = safeRepositoryPath(root, path)
    hash.update(path)
    const stats = lstatSync(absolute)
    if (stats.isSymbolicLink()) {
      hash.update(readlinkSync(absolute))
    } else if (stats.isFile()) {
      hash.update(readFileSync(absolute))
    }
  }
  return hash.digest('hex').slice(0, 16)
}

function createQaWorktree(root: string): QaWorktree {
  const parent = mkdtempSync(join(tmpdir(), 'portfolio3-phase-qa-'))
  const path = join(parent, 'worktree')
  try {
    execFileSync('git', ['clone', '--shared', '--no-checkout', '--quiet', root, path], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: MAX_COMMAND_OUTPUT,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    execFileSync('git', ['checkout', '--detach', '--quiet', 'HEAD'], {
      cwd: path,
      encoding: 'utf8',
      maxBuffer: MAX_COMMAND_OUTPUT,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    execFileSync('git', ['remote', 'remove', 'origin'], {
      cwd: path,
      encoding: 'utf8',
      maxBuffer: MAX_COMMAND_OUTPUT,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const diff = gitBuffer(['diff', '--binary', 'HEAD', '--', '.'], root)
    if (diff.length > 0) {
      execFileSync(
        'git',
        ['apply', '--binary', '--whitespace=nowarn', '-'],
        {
          cwd: path,
          input: diff,
          encoding: 'utf8',
          maxBuffer: MAX_COMMAND_OUTPUT,
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      )
    }

    for (const untracked of untrackedPaths(root)) {
      if (untracked.startsWith(`${RUNNER_DIRECTORY}/`)) continue
      const source = safeRepositoryPath(root, untracked)
      const destination = safeRepositoryPath(path, untracked)
      mkdirSync(dirname(destination), { recursive: true })
      const stats = lstatSync(source)
      if (stats.isSymbolicLink()) {
        symlinkSync(readlinkSync(source), destination)
      } else if (stats.isFile()) {
        copyFileSync(source, destination)
      } else {
        cpSync(source, destination, {
          recursive: true,
          preserveTimestamps: true,
          dereference: false,
        })
      }
    }

    const dependencies = join(root, 'node_modules')
    const qaDependencies = join(path, 'node_modules')
    if (existsSync(dependencies) && !existsSync(qaDependencies)) {
      symlinkSync(dependencies, qaDependencies, 'dir')
    }
    return { parent, path }
  } catch (error) {
    cleanupQaWorktree(root, { parent, path })
    throw error
  }
}

function cleanupQaWorktree(root: string, worktree: QaWorktree): void {
  void root
  if (existsSync(worktree.parent)) {
    rmSync(worktree.parent, { recursive: true, force: true })
  }
}

function executableVersion(executable: string): string {
  const result = spawnSync(executable, ['--version'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return (result.stdout || result.stderr).trim()
}

function doctor(loaded: LoadedRunner): void {
  const state = loadState(loaded)
  const codex = executablePath('codex')
  const kimi = executablePath('kimi')
  assertExecutable(codex, 'Codex')
  assertExecutable(kimi, 'Kimi')
  JSON.parse(readFileSync(loaded.paths.schema, 'utf8'))

  const agentFile = readFileSync(loaded.paths.kimiAgent, 'utf8')
  const frontmatter = agentFile.split('---')[1] ?? ''
  if (
    !frontmatter.includes('- Read') ||
    !frontmatter.includes('- Bash') ||
    frontmatter.includes('- Write') ||
    frontmatter.includes('- Edit') ||
    !frontmatter.includes('subagents: []')
  ) {
    return fail('Kimi QA agent does not enforce the expected tool boundary')
  }

  const realBefore = worktreeSnapshot(loaded.paths.root)
  const qaWorktree = createQaWorktree(loaded.paths.root)
  try {
    if (worktreeSnapshot(qaWorktree.path) !== realBefore) {
      return fail('the disposable QA checkout does not match the live worktree')
    }
  } finally {
    cleanupQaWorktree(loaded.paths.root, qaWorktree)
  }
  if (worktreeSnapshot(loaded.paths.root) !== realBefore) {
    return fail('doctor changed the real worktree snapshot')
  }

  console.log(
    [
      `Phase ${state.phase} runner doctor: PASS`,
      `Codex: ${executableVersion(codex)}`,
      `Kimi: ${executableVersion(kimi)}`,
      `Manifest: ${loaded.manifestDigest}`,
      `Cursor: ${state.currentStep} (${state.status})`,
      'Disposable QA checkout: exact live snapshot, cleaned successfully',
      'No model session was launched.',
    ].join('\n'),
  )
}

function codexResultPath(
  loaded: LoadedRunner,
  state: PhaseRunnerState,
): string {
  const step = getStep(loaded.manifest, state.currentStep)
  const label = `${step.id}-${state.fixAttempts[step.id] ?? 0}`
  return join(loaded.paths.stateDirectory, `codex-result-${label}.json`)
}

async function resolveHostE2eGate(
  loaded: LoadedRunner,
  state: PhaseRunnerState,
  result: CodexResult,
): Promise<CodexResult> {
  if (
    !isHostRecoverableE2eFailure(result, loaded.manifest.requiredGates)
  ) {
    return result
  }

  const step = getStep(loaded.manifest, state.currentStep)
  const label = `${step.id}-${state.fixAttempts[step.id] ?? 0}`
  const logPath = join(
    loaded.paths.logs,
    `${timestampSlug()}-${label}-host-e2e.log`,
  )
  console.log(
    'Codex could not bind the local test port inside its sandbox. ' +
      'Running the fixed E2E gate from the trusted phase controller.',
  )
  await runLoggedCommand('npm', ['run', 'test:e2e'], {
    cwd: loaded.paths.root,
    env: {
      ...process.env,
      CI: 'true',
    },
    logPath,
    label: `Host E2E ${step.id}`,
    echoStdout: true,
    heartbeatMs: 30_000,
  })

  return {
    ...result,
    outcome: 'ready-for-qa',
    summary:
      `${result.summary} The trusted phase controller then ran the required ` +
      'E2E gate outside the model sandbox and it passed.',
    gates: result.gates.map((gate) =>
      canonicalGateCommand(gate.command) === 'npm run test:e2e'
        ? {
            command: 'npm run test:e2e',
            status: 'pass',
            details:
              'Host phase controller exit 0 after the Codex sandbox denied localhost binding.',
          }
        : gate,
    ),
    unresolvedRisks: result.unresolvedRisks.filter(
      (risk) =>
        !/(?:e2e.*(?:port|bind)|port-enabled|port denial)/i.test(risk),
    ),
    handoff:
      `${result.handoff} Host verification subsequently made the required ` +
      'E2E gate green; the change is ready for independent Kimi QA.',
  }
}

async function runCodex(
  loaded: LoadedRunner,
  state: PhaseRunnerState,
): Promise<CodexResult> {
  const step = getStep(loaded.manifest, state.currentStep)
  const executable = executablePath('codex')
  assertExecutable(executable, 'Codex')
  const label = `${step.id}-${state.fixAttempts[step.id] ?? 0}`
  const resultPath = codexResultPath(loaded, state)
  if (existsSync(resultPath)) unlinkSync(resultPath)
  const logPath = join(
    loaded.paths.logs,
    `${timestampSlug()}-${label}-codex.jsonl`,
  )
  const beforeHandoff = handoffHash(loaded.paths.root)
  const args = [
    'exec',
    '--sandbox',
    'workspace-write',
    '-c',
    'approval_policy="never"',
    '--json',
    '--output-schema',
    loaded.paths.schema,
    '--output-last-message',
    resultPath,
    '--cd',
    loaded.paths.root,
  ]
  if (process.env.PHASE_RUNNER_CODEX_MODEL) {
    args.push('--model', process.env.PHASE_RUNNER_CODEX_MODEL)
  }
  args.push(buildCodexPrompt(loaded.manifest, step, state))

  console.log(`Starting Codex for Phase ${loaded.manifest.phase} ${step.id}.`)
  await runLoggedCommand(executable, args, {
    cwd: loaded.paths.root,
    logPath,
    label: `Codex ${step.id}`,
    heartbeatMs: 30_000,
  })
  if (!existsSync(resultPath)) {
    return fail(`Codex did not write its structured result: ${resultPath}`)
  }
  const parsedResult = parseCodexResult(
    JSON.parse(readFileSync(resultPath, 'utf8')),
    loaded.manifest,
    step,
  )
  const result = await resolveHostE2eGate(loaded, state, parsedResult)
  if (
    result !== parsedResult ||
    handoffHash(loaded.paths.root) === beforeHandoff
  ) {
    captureHandoff(loaded.paths.root, 'codex', formatCodexReport(result))
  }
  return result
}

async function runKimi(
  loaded: LoadedRunner,
  state: PhaseRunnerState,
  codexResult: CodexResult,
): Promise<KimiResult> {
  const step = getStep(loaded.manifest, state.currentStep)
  const executable = executablePath('kimi')
  assertExecutable(executable, 'Kimi')
  const realSnapshot = worktreeSnapshot(loaded.paths.root)
  const qaWorktree = createQaWorktree(loaded.paths.root)
  const qaSnapshot = worktreeSnapshot(qaWorktree.path)
  const label = `${step.id}-${state.fixAttempts[step.id] ?? 0}`
  const logPath = join(
    loaded.paths.logs,
    `${timestampSlug()}-${label}-kimi.jsonl`,
  )

  try {
    const args = ['--agent-file', loaded.paths.kimiAgent]
    if (process.env.PHASE_RUNNER_KIMI_MODEL) {
      args.push('--model', process.env.PHASE_RUNNER_KIMI_MODEL)
    }
    args.push(
      '--prompt',
      buildKimiPrompt(loaded.manifest, step, codexResult),
      '--output-format',
      'stream-json',
    )
    console.log(
      `Starting fresh Kimi QA for Phase ${loaded.manifest.phase} ${step.id} in an isolated checkout.`,
    )
    const output = await runLoggedCommand(executable, args, {
      cwd: qaWorktree.path,
      env: {
        ...process.env,
        KIMI_DISABLE_CRON: '1',
      },
      logPath,
      label: `Kimi QA ${step.id}`,
      heartbeatMs: 30_000,
    })
    if (worktreeSnapshot(qaWorktree.path) !== qaSnapshot) {
      return fail(
        'Kimi QA changed a versioned or untracked repository file in its disposable worktree',
      )
    }
    if (worktreeSnapshot(loaded.paths.root) !== realSnapshot) {
      return fail(
        'the real worktree changed while Kimi QA was running; another writer may be active',
      )
    }
    const result = parseKimiResult(
      extractKimiJson(output.stdout),
      loaded.manifest,
      step,
    )
    captureHandoff(loaded.paths.root, 'kimi', formatKimiReport(result))
    return result
  } finally {
    cleanupQaWorktree(loaded.paths.root, qaWorktree)
  }
}

function initialize(loaded: LoadedRunner): void {
  if (existsSync(loaded.paths.state)) {
    return fail(
      `Phase ${loaded.manifest.phase} already has state at ${relative(
        loaded.paths.root,
        loaded.paths.state,
      )}; initialization never overwrites existing progress`,
    )
  }
  const state = createInitialState(
    loaded.manifest,
    loaded.manifestDigest,
  )
  writeState(loaded.paths.state, state)
  console.log(
    `Initialized Phase ${loaded.manifest.phase} at ${state.currentStep}; owner acceptance is recorded through ${state.ownerAcceptedThrough}.`,
  )
}

function printStatus(loaded: LoadedRunner): void {
  const state = loadState(loaded)
  const step = getStep(loaded.manifest, state.currentStep)
  console.log(
    `Phase ${state.phase}: ${state.status}\n` +
      `Current step: ${step.id} — ${step.title}\n` +
      `QA-passed: ${state.qaPassedSteps.join(', ') || 'none'}\n` +
      `Owner accepted through: ${state.ownerAcceptedThrough}\n` +
      `Fix attempts for current step: ${state.fixAttempts[step.id] ?? 0}\n` +
      `Updated: ${state.updatedAt}`,
  )
  if (state.lastError) console.log(`Last error: ${state.lastError}`)
}

function dryRun(loaded: LoadedRunner): void {
  const state = loadState(loaded)
  const step = getStep(loaded.manifest, state.currentStep)
  const placeholder: CodexResult = {
    phase: loaded.manifest.phase,
    step: step.id,
    outcome: 'ready-for-qa',
    summary: '(Codex structured result is inserted here at runtime.)',
    filesChanged: [],
    gates: loaded.manifest.requiredGates.map((command) => ({
      command,
      status: 'pass',
      details: '(runtime result)',
    })),
    unresolvedRisks: [],
    handoff: `Handoff: Phase ${loaded.manifest.phase} ${step.id} runtime result.`,
  }
  console.log('=== CODEX PROMPT ===\n')
  console.log(buildCodexPrompt(loaded.manifest, step, state))
  console.log('\n=== KIMI PROMPT TEMPLATE ===\n')
  console.log(buildKimiPrompt(loaded.manifest, step, placeholder))
  console.log(
    '\nDry run only: no agent process, state transition, or worktree was created.',
  )
}

function requestPause(loaded: LoadedRunner): void {
  mkdirSync(loaded.paths.stateDirectory, { recursive: true })
  closeSync(openSync(loaded.paths.pause, 'a'))
  if (!existsSync(loaded.paths.lock) && existsSync(loaded.paths.state)) {
    const state = loadState(loaded)
    if (state.status === 'ready') {
      updateState(loaded, state, { status: 'paused' })
    }
  }
  console.log(
    'Pause requested. An active runner will stop after the current agent finishes.',
  )
}

function resume(loaded: LoadedRunner): void {
  if (existsSync(loaded.paths.pause)) unlinkSync(loaded.paths.pause)
  const state = loadState(loaded)
  if (state.status === 'paused') {
    updateState(loaded, state, { status: 'ready', lastError: null })
  }
  console.log('Pause cleared. Run npm run phase:run to continue.')
}

function retry(loaded: LoadedRunner): void {
  if (existsSync(loaded.paths.lock)) {
    return fail('cannot retry while another phase runner owns the lock')
  }
  const state = loadState(loaded)
  if (state.status !== 'blocked') {
    return fail(`retry requires blocked state; current state is ${state.status}`)
  }
  updateState(loaded, state, { status: 'ready', lastError: null })
  console.log(
    `Phase ${state.phase} ${state.currentStep} is ready to retry. Existing QA findings were preserved.`,
  )
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'EPERM'
    )
  }
}

function recover(loaded: LoadedRunner): void {
  const state = loadState(loaded)
  if (!['codex-running', 'qa-running'].includes(state.status)) {
    return fail(
      `recover requires an interrupted running state; current state is ${state.status}`,
    )
  }

  if (existsSync(loaded.paths.lock)) {
    const ownerPath = join(loaded.paths.lock, 'owner.json')
    if (!existsSync(ownerPath)) {
      return fail('runner lock has no owner.json; inspect it manually')
    }
    const owner = JSON.parse(readFileSync(ownerPath, 'utf8')) as {
      pid?: unknown
    }
    if (!Number.isInteger(owner.pid)) {
      return fail('runner lock owner.json has no valid PID')
    }
    if (processIsAlive(owner.pid as number)) {
      return fail(
        `runner PID ${String(owner.pid)} is still alive; recovery would create two writers`,
      )
    }
    rmSync(loaded.paths.lock, { recursive: true, force: true })
  }

  updateState(loaded, state, {
    status: 'ready',
    lastError:
      `Recovered interrupted ${state.status} state. ` +
      'The same step will restart from the live diff.',
  })
  console.log(
    `Recovered Phase ${state.phase} ${state.currentStep}. Inspect the live diff, then run npm run phase:run.`,
  )
}

async function continueSavedCodexResult(
  loaded: LoadedRunner,
): Promise<void> {
  acquireLock(loaded.paths)
  let state = loadState(loaded)
  let continueLoop = false
  try {
    if (state.status !== 'blocked') {
      return fail(
        `continue requires blocked state with a saved Codex result; current state is ${state.status}`,
      )
    }
    const resultPath = codexResultPath(loaded, state)
    if (!existsSync(resultPath)) {
      return fail(`no saved Codex result exists at ${resultPath}`)
    }

    state = updateState(loaded, state, {
      status: 'codex-running',
      lastError: null,
    })
    const step = getStep(loaded.manifest, state.currentStep)
    let codexResult: CodexResult
    try {
      const parsedResult = parseCodexResult(
        JSON.parse(readFileSync(resultPath, 'utf8')),
        loaded.manifest,
        step,
      )
      codexResult = await resolveHostE2eGate(
        loaded,
        state,
        parsedResult,
      )
      captureHandoff(
        loaded.paths.root,
        'codex',
        formatCodexReport(codexResult),
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      state = updateState(loaded, state, {
        status: 'blocked',
        lastError: message,
      })
      throw error
    }

    state = updateState(loaded, state, {
      lastCodexResult: codexResult,
    })
    if (codexResult.outcome === 'blocked') {
      state = updateState(loaded, state, {
        status: 'blocked',
        lastError: codexResult.summary,
      })
      console.log(`Codex remains blocked: ${codexResult.summary}`)
      return
    }

    state = updateState(loaded, state, { status: 'qa-running' })
    let kimiResult: KimiResult
    try {
      kimiResult = await runKimi(loaded, state, codexResult)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      state = updateState(loaded, state, {
        status: 'blocked',
        lastError: message,
      })
      throw error
    }

    state = transitionAfterQa(
      loaded.manifest,
      { ...state, status: 'qa-running' },
      kimiResult,
    )
    writeState(loaded.paths.state, state)
    console.log(
      `Kimi verdict for ${kimiResult.step}: ${kimiResult.verdict.toUpperCase()}.`,
    )
    continueLoop = state.status === 'ready'
    if (!continueLoop) {
      console.log(`Runner stopped in state: ${state.status}.`)
    }
  } finally {
    releaseLock(loaded.paths)
  }

  if (continueLoop) {
    console.log(`Continuing automatically from ${state.currentStep}.`)
    await execute(loaded)
  }
}

async function retestCompletedStep(loaded: LoadedRunner): Promise<void> {
  acquireLock(loaded.paths)
  let state = loadState(loaded)
  try {
    if (state.status !== 'complete-awaiting-owner-ci') {
      return fail(
        `retest requires complete-awaiting-owner-ci state; current state is ${state.status}`,
      )
    }
    const previousCodexResult = state.lastCodexResult
    if (
      !previousCodexResult ||
      previousCodexResult.step !== state.currentStep
    ) {
      return fail(
        `retest requires a saved Codex result for ${state.currentStep}`,
      )
    }

    const liveFiles = [
      ...new Set([
        ...gitText(
          ['diff', '--name-only', 'HEAD', '--', '.'],
          loaded.paths.root,
        )
          .split('\n')
          .filter(Boolean),
        ...untrackedPaths(loaded.paths.root).filter(
          (path) => !path.startsWith(`${RUNNER_DIRECTORY}/`),
        ),
      ]),
    ].sort()
    const retestContext: CodexResult = {
      ...previousCodexResult,
      summary:
        'Historical Codex implementation report follows. The owner approved ' +
        'a fresh independent QA pass after additional live-snapshot changes; ' +
        'verify the complete diff and rerun every gate rather than relying on ' +
        `the earlier report. ${previousCodexResult.summary}`,
      filesChanged: liveFiles,
      handoff:
        `Handoff: Owner-approved Phase ${state.phase} ${state.currentStep} ` +
        'snapshot is ready for a fresh independent Kimi QA pass; inspect the ' +
        'complete live diff and rerun all required gates.',
    }

    state = updateState(loaded, state, {
      status: 'qa-running',
      lastError: null,
    })
    let kimiResult: KimiResult
    try {
      kimiResult = await runKimi(loaded, state, retestContext)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      state = updateState(loaded, state, {
        status: 'blocked',
        lastError: message,
      })
      throw error
    }

    state = transitionAfterQa(
      loaded.manifest,
      { ...state, status: 'qa-running' },
      kimiResult,
    )
    writeState(loaded.paths.state, state)
    console.log(
      `Fresh Kimi verdict for ${kimiResult.step}: ${kimiResult.verdict.toUpperCase()}.`,
    )
    if (state.status === 'ready') {
      console.log(
        `Returning ${state.currentStep} to Codex for fix attempt ${state.fixAttempts[state.currentStep]}.`,
      )
    } else {
      console.log(`Runner stopped in state: ${state.status}.`)
    }
  } finally {
    releaseLock(loaded.paths)
  }
}

async function execute(loaded: LoadedRunner): Promise<void> {
  acquireLock(loaded.paths)
  let state = loadState(loaded)
  try {
    if (existsSync(loaded.paths.pause)) {
      state = updateState(loaded, state, { status: 'paused' })
      console.log('The phase is paused. Run npm run phase:resume first.')
      return
    }
    if (state.status !== 'ready') {
      return fail(
        `Phase ${state.phase} cannot run from state ${state.status}; inspect npm run phase:status`,
      )
    }

    while (state.status === 'ready') {
      if (existsSync(loaded.paths.pause)) {
        state = updateState(loaded, state, { status: 'paused' })
        console.log('Paused before starting the next agent.')
        break
      }

      state = updateState(loaded, state, {
        status: 'codex-running',
        lastError: null,
      })
      let codexResult: CodexResult
      try {
        codexResult = await runCodex(loaded, state)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        state = updateState(loaded, state, {
          status: 'blocked',
          lastError: message,
        })
        throw error
      }
      state = updateState(loaded, state, {
        lastCodexResult: codexResult,
      })
      if (codexResult.outcome === 'blocked') {
        state = updateState(loaded, state, {
          status: 'blocked',
          lastError: codexResult.summary,
        })
        console.log(`Codex blocked on ${state.currentStep}: ${codexResult.summary}`)
        break
      }

      if (existsSync(loaded.paths.pause)) {
        state = updateState(loaded, state, { status: 'paused' })
        console.log('Paused after Codex and before Kimi QA.')
        break
      }

      state = updateState(loaded, state, { status: 'qa-running' })
      let kimiResult: KimiResult
      try {
        kimiResult = await runKimi(loaded, state, codexResult)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        state = updateState(loaded, state, {
          status: 'blocked',
          lastError: message,
        })
        throw error
      }

      state = transitionAfterQa(
        loaded.manifest,
        { ...state, status: 'qa-running' },
        kimiResult,
      )
      writeState(loaded.paths.state, state)
      console.log(
        `Kimi verdict for ${kimiResult.step}: ${kimiResult.verdict.toUpperCase()}.`,
      )

      if (state.status === 'ready') {
        if (kimiResult.verdict === 'fail') {
          console.log(
            `Returning ${state.currentStep} to Codex for fix attempt ${state.fixAttempts[state.currentStep]}.`,
          )
        } else {
          console.log(`Advancing automatically to ${state.currentStep}.`)
        }
        continue
      }
      if (state.status === 'complete-awaiting-owner-ci') {
        console.log(
          `Phase ${state.phase} independently passed all configured steps; owner/CI acceptance is now required.`,
        )
      } else {
        console.log(`Runner stopped in state: ${state.status}.`)
      }
    }
  } finally {
    releaseLock(loaded.paths)
  }
}

function parsePhase(args: string[]): number {
  const index = args.indexOf('--phase')
  const value = index >= 0 ? Number(args[index + 1]) : 2
  if (!Number.isInteger(value) || value <= 0) {
    return fail('--phase must be a positive integer')
  }
  return value
}

async function main(): Promise<void> {
  const [command = 'status', ...args] = process.argv.slice(2)
  const root = repositoryRoot(process.cwd())
  const loaded = loadRunner(root, parsePhase(args))

  switch (command) {
    case 'init':
      initialize(loaded)
      break
    case 'status':
      printStatus(loaded)
      break
    case 'dry-run':
      dryRun(loaded)
      break
    case 'doctor':
      doctor(loaded)
      break
    case 'run':
      await execute(loaded)
      break
    case 'pause':
      requestPause(loaded)
      break
    case 'resume':
      resume(loaded)
      break
    case 'retry':
      retry(loaded)
      break
    case 'recover':
      recover(loaded)
      break
    case 'continue':
      await continueSavedCodexResult(loaded)
      break
    case 'retest':
      await retestCompletedStep(loaded)
      break
    default:
      fail(
        'usage: phase-runner.ts [init|status|dry-run|doctor|run|pause|resume|retry|recover|continue|retest] [--phase 2]',
      )
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `phase-runner: ${error instanceof Error ? error.message : String(error)}\n`,
  )
  process.exitCode = 1
})
