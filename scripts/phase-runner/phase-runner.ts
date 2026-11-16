#!/usr/bin/env -S npx tsx

import { spawn, spawnSync, execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import {
  closeSync,
  copyFileSync,
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
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import {
  assertQaAuthority,
  cliIdentity,
  reviewerArgs,
  validateHostGates,
  FIXED_GATES,
  QA_ROLE,
  type CliIdentity,
  type HostGate,
  acceptOwnerGate,
  buildCodexPrompt,
  buildQaPrompt,
  createInitialState,
  getStep,
  manifestDigest,
  pathMatchesAllowedCommitPath,
  parseCodexResult,
  parseQaResult,
  parseManifest,
  parseState,
  transitionAfterQa,
  type CodexResult,
  type QaResult,
  type PhaseManifest,
  type PhaseRunnerState,
} from './core'

const RUNNER_DIRECTORY = '.agent-runs'
const HANDOFF_PATH = 'docs/agent-handoff.md'
const MAX_COMMAND_OUTPUT = 64 * 1024 * 1024

interface RunnerPaths {
  root: string
  manifest: string
  schema: string
  qaSchema: string
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
  exitCode: number
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
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
    encoding: 'utf8',
    maxBuffer: MAX_COMMAND_OUTPUT,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trimEnd()
}

function gitCommandSucceeded(args: string[], cwd: string): boolean {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return !result.error && result.status === 0
}

function repositoryRoot(cwd: string): string {
  try {
    return resolve(gitText(['rev-parse', '--show-toplevel'], cwd))
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
    qaSchema: join(root, 'scripts', 'phase-runner', 'schemas', 'qa-result.schema.json'),
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
    loaded.manifestDigest,
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

export function executablePath(): string {
  if (process.env.PHASE_RUNNER_CODEX_BIN) return resolve(process.env.PHASE_RUNNER_CODEX_BIN)
  const name = process.platform === 'win32' ? 'codex.exe' : 'codex'
  for (const directory of (process.env.PATH ?? '').split(process.platform === 'win32' ? ';' : ':')) {
    const candidate = resolve(directory, name)
    if (existsSync(candidate)) return candidate
  }
  const candidates: Array<{ path: string; modifiedAt: number }> = []
  for (const editor of ['.vscode', '.vscode-insiders', '.cursor']) {
    const root = join(homedir(), editor, 'extensions')
    if (!existsSync(root)) continue
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith('openai.chatgpt-')) continue
      const bin = join(root, entry.name, 'bin')
      if (!existsSync(bin)) continue
      for (const platform of readdirSync(bin, { withFileTypes: true })) {
        const candidate = join(bin, platform.name, name)
        if (existsSync(candidate)) candidates.push({ path: candidate, modifiedAt: lstatSync(candidate).mtimeMs })
      }
    }
  }
  candidates.sort((a, b) => b.modifiedAt - a.modifiedAt)
  return candidates[0]?.path ?? fail('Codex executable unavailable; set PHASE_RUNNER_CODEX_BIN')
}

export function npmInvocation(args: string[]): { executable: string; args: string[] } {
  // A fixed JS entry point avoids Windows shell parsing and npm.cmd EINVAL.
  const cli = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
  if (!existsSync(cli)) return fail('npm CLI not found beside Node; host proof required')
  return { executable: process.execPath, args: [cli, ...args] }
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

export async function runLoggedCommand(
  executable: string,
  args: string[],
  options: {
    cwd: string
    env?: NodeJS.ProcessEnv
    logPath: string
    label: string
    echoStdout?: boolean
    heartbeatMs?: number
    recordFailure?: boolean
    telemetryOnly?: boolean
    input?: string
  },
): Promise<ChildResult> {
  mkdirSync(dirname(options.logPath), { recursive: true })
  const log = createWriteStream(options.logPath, { flags: 'w' })
  const child = spawn(executable, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
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
    if (!options.telemetryOnly) log.write(chunk)
    process.stderr.write(chunk)
    if (stderrSize < MAX_COMMAND_OUTPUT) {
      stderr.push(chunk)
      stderrSize += chunk.length
    }
  })

  const status = await new Promise<number>((resolveStatus, rejectStatus) => {
    child.once('error', rejectStatus)
    child.once('close', (code) => resolveStatus(code ?? 1))
    // A finite UTF-8 prompt followed by EOF, never an inherited/open stdin.
    // Keep large prompts out of Windows' command-line length limit.
    child.stdin.once('error', rejectStatus)
    child.stdin.end(options.input, 'utf8')
  }).finally(async () => {
    if (heartbeat) clearInterval(heartbeat)
    await new Promise<void>((done, reject) => {
      log.once('error', reject)
      log.end(done)
    })
  })

  const result = {
    exitCode: status,
    stdout: Buffer.concat(stdout).toString('utf8'),
    stderr: Buffer.concat(stderr).toString('utf8'),
  }
  if (options.telemetryOnly) writeFileSync(`${options.logPath}.stderr`, result.stderr)
  if (status !== 0 && !options.recordFailure) {
    throw new Error(
      `${options.label} exited ${status}; inspect ${relative(options.cwd, options.logPath)}`,
    )
  }
  return result
}

export async function runRequiredGates(
  required: string[], cwd: string, env: NodeJS.ProcessEnv, logPaths: string[],
  record: (gates: HostGate[]) => void,
  checkIntegrity: () => void,
): Promise<HostGate[]> {
  if (JSON.stringify(required) !== JSON.stringify(FIXED_GATES) || logPaths.length !== required.length) {
    return fail('host gates require exactly the five fixed commands and logs')
  }
  const gates: HostGate[] = []
  for (const [i, command] of required.entries()) {
    const invocation = npmInvocation(['run', command.slice('npm run '.length)])
    const logPath = logPaths[i]!
    const output = await runLoggedCommand(invocation.executable, invocation.args, {
      cwd, env: { ...env, CI: 'true' }, logPath, label: command,
      heartbeatMs: 30_000, recordFailure: true,
    })
    gates.push({ command, exitCode: output.exitCode, logPath,
      logSha256: createHash('sha256').update(readFileSync(logPath)).digest('hex') })
    record(gates)
    checkIntegrity()
    if (output.exitCode !== 0) fail(`host gate exited ${output.exitCode}: ${command}; no reviewer dispatched`)
  }
  validateHostGates(gates, required)
  return gates
}

function handoffHash(root: string): string {
  const path = join(root, HANDOFF_PATH)
  return existsSync(path)
    ? createHash('sha256').update(readFileSync(path)).digest('hex')
    : ''
}

function captureHandoff(
  root: string,
  identity: CliIdentity,
  finalReport: string,
): void {
  const script = join(root, 'scripts', 'agent-handoff.mjs')
  const result = spawnSync(
    process.execPath,
    [script, 'capture', '--agent', 'codex'],
    {
      cwd: root,
      input: JSON.stringify({
        cwd: root,
        session_id: identity.sessionId,
        model: identity.model,
        final_response: `${identity.role}\n${finalReport}`,
      }),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  )
  if (result.error || result.status !== 0) {
    throw new Error(
      `could not capture Codex handoff: ${result.stderr || result.error?.message}`,
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

function formatQaReport(result: QaResult): string {
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

function changedRepositoryPaths(root: string): string[] {
  return [
    ...new Set([
      ...gitText(['diff', '--name-only', 'HEAD', '--', '.'], root)
        .split('\n')
        .filter(Boolean),
      ...untrackedPaths(root).filter(
        (path) => !path.startsWith(`${RUNNER_DIRECTORY}/`),
      ),
    ]),
  ].sort()
}

export function selectedPathsSnapshot(root: string, paths: string[]): string {
  const hash = createHash('sha256')
  for (const path of [...new Set(paths)].sort()) {
    if (path === HANDOFF_PATH) continue
    hash.update(path)
    const absolute = safeRepositoryPath(root, path)
    if (!existsSync(absolute)) {
      hash.update('missing')
      continue
    }
    const stats = lstatSync(absolute)
    if (stats.isSymbolicLink()) {
      hash.update('symlink')
      hash.update(readlinkSync(absolute))
    } else if (stats.isFile()) {
      hash.update('file')
      hash.update(readFileSync(absolute))
    } else {
      hash.update('unsupported')
    }
  }
  return hash.digest('hex')
}

export function assertCommitInitializationReady(
  loaded: LoadedRunner,
): string[] {
  const commitSteps = loaded.manifest.steps.filter(
    (step) => step.commitAfterQa !== null,
  )
  const initialDirtyPaths = changedRepositoryPaths(loaded.paths.root)
  if (commitSteps.length === 0) return initialDirtyPaths

  if (
    !gitCommandSucceeded(
      ['diff', '--cached', '--quiet', '--exit-code', '--', '.'],
      loaded.paths.root,
    )
  ) {
    return fail(
      'automatic phase commits require an empty Git index before initialization',
    )
  }

  const manifestPath = relative(loaded.paths.root, loaded.paths.manifest)
  for (const authorityPath of [manifestPath, loaded.manifest.source]) {
    if (
      !gitCommandSucceeded(
        ['ls-files', '--error-unmatch', '--', authorityPath],
        loaded.paths.root,
      )
    ) {
      return fail(
        `${authorityPath} must be tracked before initializing a phase with automatic commits`,
      )
    }
    if (
      gitText(
        ['status', '--short', '--untracked-files=all', '--', authorityPath],
        loaded.paths.root,
      )
    ) {
      return fail(
        `${authorityPath} must be clean before initializing a phase with automatic commits`,
      )
    }
  }

  const allAllowedPaths = commitSteps.flatMap(
    (step) => step.commitAfterQa?.paths ?? [],
  )
  const conflicting = initialDirtyPaths.filter((path) =>
    pathMatchesAllowedCommitPath(path, allAllowedPaths),
  )
  if (conflicting.length > 0) {
    return fail(
      'phase-owned commit paths must be clean before initialization: ' +
        conflicting.join(', '),
    )
  }
  return initialDirtyPaths
}

export function commitPassedStep(
  loaded: LoadedRunner,
  state: PhaseRunnerState,
  result: QaResult,
): PhaseRunnerState {
  if (result.verdict !== 'pass') return state
  const step = getStep(loaded.manifest, state.currentStep)
  const commit = step.commitAfterQa
  if (!commit) return state
  if (state.stepCommits[step.id]) {
    return fail(
      `${step.id} already records commit ${state.stepCommits[step.id]}; the runner will not rewrite it automatically`,
    )
  }
  if (
    !gitCommandSucceeded(
      ['diff', '--cached', '--quiet', '--exit-code', '--', '.'],
      loaded.paths.root,
    )
  ) {
    return fail('automatic phase commit refused a non-empty Git index')
  }

  const initialDirty = new Set(state.initialDirtyPaths)
  const candidates = changedRepositoryPaths(loaded.paths.root).filter(
    (path) =>
      !initialDirty.has(path) &&
      path !== HANDOFF_PATH &&
      path !== 'content/portfolio-approvals.json',
  )
  if (candidates.length === 0) {
    return fail(`${step.id} passed QA but has no new files to commit`)
  }
  const outsideBoundary = candidates.filter(
    (path) => !pathMatchesAllowedCommitPath(path, commit.paths),
  )
  if (outsideBoundary.length > 0) {
    return fail(
      `${step.id} changed files outside its automatic commit boundary: ` +
        outsideBoundary.join(', '),
    )
  }

  execFileSync('git', ['add', '--', ...candidates], {
    cwd: loaded.paths.root,
    encoding: 'utf8',
    maxBuffer: MAX_COMMAND_OUTPUT,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const staged = gitText(
    ['diff', '--cached', '--name-only', '--', '.'],
    loaded.paths.root,
  )
    .split('\n')
    .filter(Boolean)
    .sort()
  if (
    staged.length !== candidates.length ||
    staged.some((path, index) => path !== candidates[index])
  ) {
    return fail(
      'automatic phase commit staging did not match the verified candidate set',
    )
  }

  execFileSync('git', ['commit', '-m', commit.message], {
    cwd: loaded.paths.root,
    encoding: 'utf8',
    maxBuffer: MAX_COMMAND_OUTPUT,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const commitSha = gitText(['rev-parse', '--short=12', 'HEAD'], loaded.paths.root)
  const next = {
    ...state,
    stepCommits: {
      ...state.stepCommits,
      [step.id]: commitSha,
    },
    updatedAt: new Date().toISOString(),
  }
  writeState(loaded.paths.state, next)
  console.log(
    `Committed independently passed ${step.id} as ${commitSha}: ${commit.message}`,
  )
  return next
}

export function safeRepositoryPath(root: string, path: string): string {
  const normalizedRoot = resolve(root)
  const target = resolve(normalizedRoot, path)
  const rel = relative(normalizedRoot, target)
  if (isAbsolute(rel) || rel === '..' || rel.startsWith('..' + sep)) {
    return fail(`unsafe repository-relative path: ${path}`)
  }
  return target
}

// Only named generated artifacts; ignored source (.env*, next-env.d.ts, etc.)
// stays protected. Tracked files never acquire an artifact exemption.
const GATE_DIRECTORIES = ['.next', 'test-results', 'playwright-report']
// debug.log is Chromium's observed Windows GPU diagnostic output (A9).
const GATE_FILES = ['tsconfig.tsbuildinfo', 'tsconfig.contracts.tsbuildinfo', 'debug.log']
// Vite/Vitest's generated caches, not an exemption for installed package code.
const DEPENDENCY_GATE_CACHES = ['node_modules/.vite', 'node_modules/.vite-temp']
export function sourceInventory(root: string, outputs: string[] = [], includeDependencies = false,
  stage: 'gate' | 'review' = 'gate'): Record<string, string> {
  const tracked = new Set(gitText(['ls-files', '-z'], root).split('\0').filter(Boolean))
  const result: Record<string, string> = {}
  function walk(directory: string, prefix = ''): void {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = prefix ? prefix + '/' + entry.name : entry.name
      if (path === '.git') continue
      const absolute = safeRepositoryPath(root, path)
      const stat = lstatSync(absolute)
      if (stat.isSymbolicLink()) return fail(`unproven link isolation: ${path}`)
      const untracked = !tracked.has(path) && ![...tracked].some((p) => p.startsWith(path + '/'))
      // Controller exceptions name individual files, never directories/subtrees.
      const generated = untracked && ((stat.isFile() && outputs.includes(path)) ||
        (stage === 'gate' && (GATE_DIRECTORIES.includes(path) || GATE_FILES.includes(path) ||
          DEPENDENCY_GATE_CACHES.includes(path) || (!includeDependencies && path === 'node_modules'))))
      if (generated) continue
      if (stat.isDirectory()) {
        if (stage === 'review') result[path + '/'] = 'directory'
        walk(absolute, path)
      }
      else if (stat.isFile()) result[path] = createHash('sha256').update(readFileSync(absolute)).digest('hex')
      else return fail(`unsupported source entry: ${path}`)
    }
  }
  walk(resolve(root))
  return result
}

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

export function worktreeSnapshot(root: string, outputs: string[] = []): string {
  return digest(sourceInventory(root, outputs))
}

export function gateSnapshot(root: string): string {
  return digest(sourceInventory(root, [], true))
}

export function reviewSnapshot(root: string, outputs: string[] = []): string {
  return digest(sourceInventory(root, outputs, true, 'review'))
}

export function gitIntegrity(root: string, base = '59c3dc9'): string {
  const gitDir = resolve(root, gitText(['rev-parse', '--git-dir'], root))
  const commonDir = resolve(root, gitText(['rev-parse', '--git-common-dir'], root))
  const files: Record<string, string> = {}
  const gitEntry = join(root, '.git')
  if (lstatSync(gitEntry).isSymbolicLink()) return fail('linked Git metadata is unsupported')
  if (lstatSync(gitEntry).isFile()) files.gitlink = createHash('sha256').update(readFileSync(gitEntry)).digest('hex')
  function walk(directory: string, prefix = ''): void {
    if (lstatSync(directory).isSymbolicLink()) return fail('linked Git metadata is unsupported')
    for (const entry of readdirSync(directory).sort()) {
      const path = prefix ? prefix + '/' + entry : entry
      const absolute = join(directory, entry)
      const stat = lstatSync(absolute)
      if (stat.isSymbolicLink()) return fail('linked Git metadata is unsupported')
      if (stat.isDirectory()) {
        files[path + '/'] = 'directory'
        walk(absolute, path)
      } else if (stat.isFile()) files[path] = createHash('sha256').update(readFileSync(absolute)).digest('hex')
      else return fail('unsupported Git metadata entry')
    }
  }
  // Include unreachable loose objects and packs, plus shared metadata for a
  // linked worktree. External alternate object stores cannot be isolated here.
  if (existsSync(join(commonDir, 'objects/info/alternates')) || process.env.GIT_ALTERNATE_OBJECT_DIRECTORIES ||
      process.env.GIT_OBJECT_DIRECTORY) {
    return fail('alternate Git object stores are unsupported')
  }
  walk(gitDir, 'git')
  if (commonDir !== gitDir) walk(commonDir, 'common')
  return digest({ files, head: gitText(['rev-parse', 'HEAD'], root),
    base: gitText(['rev-parse', base + '^{tree}'], root),
    refs: gitText(['show-ref'], root), stash: gitText(['stash', 'list'], root) })
}

export function assertIntegrity(before: string, after: string, label: string): void {
  if (before !== after) fail(`${label} changed; source/Git/handoff integrity blocked`)
}

export function binaryDiff(root: string): Buffer {
  return execFileSync('git', ['diff', '--binary', '--no-ext-diff', '--no-textconv', 'HEAD', '--'], {
    cwd: root, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
    stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: MAX_COMMAND_OUTPUT,
  })
}

function preserveQaOutcome(qa: QaWorktree, outcome: unknown): string {
  const record = join(qa.parent, 'qa-outcome.json')
  try {
    writeFileSync(record, JSON.stringify({ snapshotPath: qa.path, outcome }, null, 2), { flag: 'wx' })
  } catch (error) {
    return fail(`cannot record QA outcome at ${record}: ${String(error)}; preserved QA snapshot: ${qa.path}; ${JSON.stringify(outcome)}`)
  }
  return record
}

export function qaArtifactsSnapshot(qa: QaWorktree): string {
  const entries: Record<string, string> = {}
  function walk(directory: string, prefix = ''): void {
    for (const entry of readdirSync(directory).sort()) {
      const path = prefix ? prefix + '/' + entry : entry
      if (path === 'worktree') continue // separately protected, including Git
      const absolute = join(directory, entry)
      const stat = lstatSync(absolute)
      if (stat.isSymbolicLink()) fail(`unproven QA artifact link: ${path}`)
      if (stat.isDirectory()) {
        entries[path + '/'] = 'directory'
        walk(absolute, path)
      } else if (stat.isFile()) entries[path] = createHash('sha256').update(readFileSync(absolute)).digest('hex')
      else fail(`unsupported QA artifact: ${path}`)
    }
  }
  walk(qa.parent)
  return digest(entries)
}

// Retain even successful snapshots for host diagnosis/acceptance. In particular,
// neither errors nor failed verdicts may delete artifacts or uncommitted drift.
export async function withQaEvidence<T>(qa: QaWorktree, run: () => Promise<T>, verify: () => void): Promise<T> {
  let result: T | undefined
  const errors: string[] = []
  try { result = await run() } catch (error) { errors.push(String(error)) }
  try { verify() } catch (error) { errors.push(String(error)) }
  const record = preserveQaOutcome(qa, { result, errors })
  if (errors.length) return fail(`${errors.join('\n')}; preserved QA snapshot: ${qa.path}; evidence: ${record}`)
  return result as T
}

export function createQaWorktree(root: string, outputs: string[] = []): QaWorktree {
  const parent = mkdtempSync(join(tmpdir(), 'portfolio3-phase-qa-'))
  const path = join(parent, 'worktree')
  try {
    // No shared objects, symlinks, junctions, dependency tree or cache.
    execFileSync('git', ['clone', '--no-local', '--no-checkout', '--quiet', root, path], {
      cwd: root, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: MAX_COMMAND_OUTPUT,
    })
    // Mirror only built-in newline normalization. Never copy hooks, filters or
    // arbitrary user configuration; unsupported diff semantics fail comparison.
    for (const [key, fallback] of [['core.autocrlf', 'false'], ['core.eol', 'native']]) {
      const setting = spawnSync('git', ['config', '--get', key!], { cwd: root, encoding: 'utf8' })
      if (setting.error || (setting.status !== 0 && setting.status !== 1)) fail(`cannot read ${key}`)
      const value = setting.status === 0 ? setting.stdout.trim() : fallback!
      const allowed = key === 'core.autocrlf' ? ['true', 'false', 'input'] : ['lf', 'crlf', 'native']
      if (!allowed.includes(value)) fail(`unsupported normalization setting: ${key}`)
      execFileSync('git', ['config', key!, value], { cwd: path })
    }
    execFileSync('git', ['checkout', '--detach', '--quiet', gitText(['rev-parse', 'HEAD'], root)], { cwd: path })
    execFileSync('git', ['remote', 'remove', 'origin'], { cwd: path })
    const live = sourceInventory(root, outputs)
    const original = sourceInventory(path)
    for (const file of Object.keys(original)) {
      if (!(file in live)) unlinkSync(safeRepositoryPath(path, file))
    }
    // Copy raw bytes, including tracked CRLF and ignored source. Git patches
    // normalize line endings and cannot prove exact physical source identity.
    for (const file of Object.keys(live)) {
      const destination = safeRepositoryPath(path, file)
      mkdirSync(dirname(destination), { recursive: true })
      copyFileSync(safeRepositoryPath(root, file), destination)
    }
    assertIntegrity(digest(live), worktreeSnapshot(path, outputs), 'disposable snapshot')
    if (!binaryDiff(root).equals(binaryDiff(path))) fail('disposable binary diff from HEAD changed')
    return { parent, path }
  } catch (error) {
    const record = preserveQaOutcome({ parent, path }, { error: String(error) })
    return fail(`${String(error)}; preserved QA snapshot: ${path}; evidence: ${record}`)
  }
}

export function cleanupQaWorktree(root: string, worktree: QaWorktree): void {
  void root
  const parent = resolve(worktree.parent)
  if (dirname(parent) !== resolve(tmpdir()) || !parent.split(sep).at(-1)?.startsWith('portfolio3-phase-qa-') ||
      resolve(worktree.path) !== join(parent, 'worktree')) return fail('unsafe disposable cleanup path')
  if (existsSync(parent)) rmSync(parent, { recursive: true, force: true })
}

function executableVersion(executable: string): string {
  const result = spawnSync(executable, ['--version'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (result.error || result.status !== 0) return fail('Codex version evidence unavailable')
  return (result.stdout || result.stderr).trim() || fail('Codex version evidence empty')
}

function priorSessionIds(loaded: LoadedRunner, state: PhaseRunnerState): string[] {
  const sessions = new Set(state.sessions.map((s) => s.sessionId))
  if (!existsSync(loaded.paths.logs)) return [...sessions]
  for (const name of readdirSync(loaded.paths.logs)) {
    if (!/(?:-codex|-qa)\.jsonl$/.test(name)) continue
    // Failed/malformed attempts must not silently disappear from freshness checks.
    // Missing CLI identity in any prior attempt requires operator reconciliation.
    const identity = cliIdentity(readFileSync(join(loaded.paths.logs, name), 'utf8'),
      'historical CLI log', 'historical CLI log', 'history', [])
    sessions.add(identity.sessionId)
  }
  return [...sessions]
}

function doctor(loaded: LoadedRunner): void {
  loadState(loaded)
  assertMigrationActivation(loaded)
}

export function assertMigrationActivation(loaded: LoadedRunner): void {
  // Operational preflight only. Governing instructions still require complete
  // host proofs, manual independent bootstrap QA and genuine owner acceptance
  // before real runner use. No flag or inferred acceptance replaces that review.
  assertQaAuthority(loaded.manifest)
  if (loaded.manifest.maxFixAttempts !== 3) fail('migration requires three fix attempts')
  assertExecutable(executablePath(), 'Codex')
  for (const path of [loaded.paths.schema, loaded.paths.qaSchema]) {
    const schema = JSON.parse(readFileSync(path, 'utf8'))
    if (schema?.type !== 'object' || schema.additionalProperties !== false ||
        !Array.isArray(schema.required) || !schema.required.length) {
      fail(`strict result schema unavailable: ${path}`)
    }
  }
  npmInvocation(['ci'])
}

function codexResultPath(
  loaded: LoadedRunner,
  state: PhaseRunnerState,
): string {
  const step = getStep(loaded.manifest, state.currentStep)
  const label = `${step.id}-${state.fixAttempts[step.id] ?? 0}`
  return join(loaded.paths.stateDirectory, `codex-result-${label}.json`)
}

async function runCodex(
  loaded: LoadedRunner,
  state: PhaseRunnerState,
): Promise<CodexResult> {
  const step = getStep(loaded.manifest, state.currentStep)
  const executable = executablePath()
  assertExecutable(executable, 'Codex')
  const usedSessions = priorSessionIds(loaded, state)
  const label = `${step.id}-${state.fixAttempts[step.id] ?? 0}`
  const resultPath = codexResultPath(loaded, state)
  if (existsSync(resultPath)) unlinkSync(resultPath)
  const logPath = join(
    loaded.paths.logs,
    `${timestampSlug()}-${label}-codex.jsonl`,
  )
  const beforeHandoff = handoffHash(loaded.paths.root)
  const protectedDirtyPaths = [
    ...state.initialDirtyPaths,
    'content/portfolio-approvals.json',
  ]
  const beforeProtectedDirty = selectedPathsSnapshot(
    loaded.paths.root,
    protectedDirtyPaths,
  )
  const args = [
    'exec',
    '--sandbox',
    'workspace-write',
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
  args.push('-')

  console.log(`Starting Codex for Phase ${loaded.manifest.phase} ${step.id}.`)
  const output = await runLoggedCommand(executable, args, {
    cwd: loaded.paths.root,
    logPath,
    label: `Codex ${step.id}`,
    heartbeatMs: 30_000,
    telemetryOnly: true,
    input: buildCodexPrompt(loaded.manifest, step, state),
  })
  const identity = cliIdentity(output.stdout, executable, executableVersion(executable),
    'Engineering: Codex', usedSessions)
  state.sessions.push(identity)
  if (
    selectedPathsSnapshot(loaded.paths.root, protectedDirtyPaths) !==
    beforeProtectedDirty
  ) {
    return fail(
      'Codex changed an initialization-time owner file or the protected approval ledger',
    )
  }
  if (!existsSync(resultPath)) {
    return fail(`Codex did not write its structured result: ${resultPath}`)
  }
  const parsedResult = parseCodexResult(
    JSON.parse(readFileSync(resultPath, 'utf8')),
    loaded.manifest,
    step,
  )
  const result = parsedResult
  if (
    result !== parsedResult ||
    handoffHash(loaded.paths.root) === beforeHandoff
  ) {
    captureHandoff(loaded.paths.root, identity, formatCodexReport(result))
  }
  return result
}

async function runQa(
  loaded: LoadedRunner,
  state: PhaseRunnerState,
  codexResult: CodexResult,
): Promise<QaResult> {
  assertQaAuthority(loaded.manifest)
  if (!state.sessions?.some((s) => s.role === 'Engineering: Codex')) {
    return fail('missing corroborated engineering session history; cannot establish independent QA')
  }
  const step = getStep(loaded.manifest, state.currentStep)
  const executable = executablePath()
  assertExecutable(executable, 'Codex')
  const cliVersion = executableVersion(executable)
  const usedSessions = priorSessionIds(loaded, state)
  const invocationId = randomUUID()
  const logPath = join(loaded.paths.logs, invocationId + '-qa.jsonl')
  const resultPath = join(loaded.paths.logs, invocationId + '-qa-result.json')
  const gatePath = join(loaded.paths.logs, invocationId + '-gates.json')
  const installLog = join(loaded.paths.logs, invocationId + '-npm-ci.log')
  const gateLogs = loaded.manifest.requiredGates.map((_, i) => join(loaded.paths.logs, invocationId + '-gate-' + i + '.log'))
  const outputs = [logPath, `${logPath}.stderr`, resultPath, gatePath, installLog, ...gateLogs].map((p) => relative(loaded.paths.root, p).split(sep).join('/'))
  mkdirSync(loaded.paths.logs, { recursive: true })
  const realSource = worktreeSnapshot(loaded.paths.root, outputs)
  const realAll = reviewSnapshot(loaded.paths.root, outputs)
  const realGit = gitIntegrity(loaded.paths.root)
  const base = gitText(['rev-parse', '59c3dc9'], loaded.paths.root)
  const head = gitText(['rev-parse', 'HEAD'], loaded.paths.root)
  const qa = createQaWorktree(loaded.paths.root, outputs)
  let gates: HostGate[] = []
  let reviewer: CliIdentity | undefined
  let qaGit: string | undefined
  let installed: string | undefined
  let qaReview: string | undefined
  let realReview: string | undefined
  let externalReview: string | undefined
  const reviewOutputs = [logPath, `${logPath}.stderr`, resultPath].map((p) => relative(loaded.paths.root, p).split(sep).join('/'))
  const parsed = await withQaEvidence(qa, async () => {
    qaGit = gitIntegrity(qa.path)
    assertIntegrity(realSource, worktreeSnapshot(qa.path, outputs), 'gate snapshot')
    assertIntegrity(head, gitText(['rev-parse', 'HEAD'], qa.path), 'snapshot HEAD')
    assertIntegrity(base, gitText(['rev-parse', '59c3dc9'], qa.path), 'snapshot base')
    const temporary = join(qa.parent, 'tmp')
    mkdirSync(temporary)
    const env = { ...process.env, CI: 'true', npm_config_cache: join(qa.parent, 'npm-cache'),
      TEMP: temporary, TMP: temporary, TMPDIR: temporary, GIT_OPTIONAL_LOCKS: '0' }
    const install = npmInvocation(['ci'])
    await runLoggedCommand(install.executable, install.args, {
      cwd: qa.path, env, logPath: installLog, label: 'Isolated npm ci', heartbeatMs: 30_000,
    })
    installed = gateSnapshot(qa.path)
    assertIntegrity(realSource, worktreeSnapshot(qa.path, outputs), 'install source')
    assertIntegrity(qaGit, gitIntegrity(qa.path), 'install Git state')
    gates = await runRequiredGates(loaded.manifest.requiredGates, qa.path, env, gateLogs,
      (records) => writeFileSync(gatePath, JSON.stringify({ invocationId, snapshot: realSource, base, head, gates: records }, null, 2)),
      () => {
        assertIntegrity(realSource, worktreeSnapshot(qa.path, outputs), 'gate source')
        assertIntegrity(installed!, gateSnapshot(qa.path), 'gate installed dependencies/source')
        assertIntegrity(qaGit!, gitIntegrity(qa.path), 'gate Git state')
      })
    const binding = { invocationId, snapshot: realSource,
      base: digest({ base, head, tree: gitText(['rev-parse', '59c3dc9^{tree}'], qa.path) }),
      gateRecord: createHash('sha256').update(readFileSync(gatePath)).digest('hex') }
    qaReview = reviewSnapshot(qa.path)
    assertIntegrity(realAll, reviewSnapshot(loaded.paths.root, outputs), 'real pre-review source/artifacts')
    assertIntegrity(realGit, gitIntegrity(loaded.paths.root), 'real pre-review Git')
    // Gate/install logs and records now freeze too. Only these three exact
    // host launch/result files remain writable, in the controller tree only.
    realReview = reviewSnapshot(loaded.paths.root, reviewOutputs)
    externalReview = qaArtifactsSnapshot(qa)
    const args = reviewerArgs(qa.path, loaded.paths.qaSchema, resultPath)
    // Fresh read-only exec with approval_policy=never; no weaker retry on denial.
    const output = await runLoggedCommand(executable, args, {
      cwd: qa.path, env, logPath, label: QA_ROLE, heartbeatMs: 30_000, recordFailure: true,
      telemetryOnly: true,
      input: buildQaPrompt(loaded.manifest, step, codexResult, { binding, gates }),
    })
    reviewer = cliIdentity(output.stdout, executable, cliVersion, QA_ROLE,
      usedSessions)
    if (output.exitCode !== 0) fail(`reviewer exited ${output.exitCode}; no fallback`)
    assertIntegrity(qaReview, reviewSnapshot(qa.path), 'review source/dependencies/artifacts')
    for (const gate of gates) assertIntegrity(gate.logSha256,
      createHash('sha256').update(readFileSync(gate.logPath)).digest('hex'), 'host gate log')
    assertIntegrity(binding.gateRecord, createHash('sha256').update(readFileSync(gatePath)).digest('hex'), 'host gate record')
    // One controller-chosen, fresh output file only; never scrape assistant prose.
    return parseQaResult(JSON.parse(readFileSync(resultPath, 'utf8')), loaded.manifest, step,
      { binding, reviewer, gates })
  }, () => {
    // Run every check even after a malformed/failed reviewer or a hook write;
    // preserve both the original failure and all integrity failures in evidence.
    const errors: string[] = []
    for (const check of [
      () => assertIntegrity(realSource, worktreeSnapshot(qa.path, outputs), 'QA source/handoff'),
      () => { if (qaGit) assertIntegrity(qaGit, gitIntegrity(qa.path), 'QA Git state') },
      () => { if (installed) assertIntegrity(installed, gateSnapshot(qa.path), 'QA installed dependencies') },
      () => { if (qaReview) assertIntegrity(qaReview, reviewSnapshot(qa.path), 'QA review artifacts') },
      () => { if (externalReview) assertIntegrity(externalReview, qaArtifactsSnapshot(qa), 'QA external artifacts') },
      () => assertIntegrity(realReview ?? realAll,
        reviewSnapshot(loaded.paths.root, realReview ? reviewOutputs : outputs), 'real source/handoff/dependencies/artifacts'),
      () => assertIntegrity(realGit, gitIntegrity(loaded.paths.root), 'real Git state'),
    ]) {
      try { check() } catch (error) { errors.push(String(error)) }
    }
    if (reviewer) state.sessions.push(reviewer)
    if (errors.length) fail(errors.join('\n'))
  })
  if (!parsed || !reviewer) return fail('missing QA result or identity proof')
  captureHandoff(loaded.paths.root, reviewer, formatQaReport(parsed))
  return parsed
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
  const initialDirtyPaths = assertCommitInitializationReady(loaded)
  const state = createInitialState(
    loaded.manifest,
    loaded.manifestDigest,
    new Date().toISOString(),
    initialDirtyPaths,
  )
  writeState(loaded.paths.state, state)
  console.log(
    `Initialized Phase ${loaded.manifest.phase} at ${state.currentStep}; ` +
      `owner acceptance is recorded through ${state.ownerAcceptedThrough ?? 'none'}.`,
  )
}

function printStatus(loaded: LoadedRunner): void {
  const state = loadState(loaded)
  const step = getStep(loaded.manifest, state.currentStep)
  console.log(
    `Phase ${state.phase}: ${state.status}\n` +
      `Current step: ${step.id} — ${step.title}\n` +
      `QA-passed: ${state.qaPassedSteps.join(', ') || 'none'}\n` +
      `Owner accepted through: ${state.ownerAcceptedThrough ?? 'none'}\n` +
      `Step commits: ${
        Object.entries(state.stepCommits)
          .filter(([, commit]) => commit)
          .map(([stepId, commit]) => `${stepId}=${commit}`)
          .join(', ') || 'none'
      }\n` +
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
  console.log('\n=== FRESH CODEX QA PROMPT TEMPLATE ===\n')
  console.log(buildQaPrompt(loaded.manifest, step, placeholder))
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

function acceptOwnerCheckpoint(loaded: LoadedRunner): void {
  acquireLock(loaded.paths)
  try {
    const state = loadState(loaded)
    const next = acceptOwnerGate(loaded.manifest, state)
    writeState(loaded.paths.state, next)
    console.log(
      `Owner checkpoint accepted through ${state.currentStep}; ` +
        `Phase ${state.phase} is ready at ${next.currentStep}.`,
    )
  } finally {
    releaseLock(loaded.paths)
  }
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
      codexResult = parsedResult
      captureHandoff(
        loaded.paths.root,
        state.sessions.filter((s) => s.role === 'Engineering: Codex').at(-1) ?? fail('missing saved engineering identity'),
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
    let qaResult: QaResult
    try {
      qaResult = await runQa(loaded, state, codexResult)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      state = updateState(loaded, state, {
        status: 'blocked',
        lastError: message,
      })
      throw error
    }

    let stateAfterCommit: PhaseRunnerState
    try {
      stateAfterCommit = commitPassedStep(
        loaded,
        { ...state, status: 'qa-running' },
        qaResult,
      )
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
      stateAfterCommit,
      qaResult,
    )
    writeState(loaded.paths.state, state)
    console.log(
      `Codex QA verdict for ${qaResult.step}: ${qaResult.verdict.toUpperCase()}.`,
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
        'snapshot is ready for a fresh independent Codex QA QA pass; inspect the ' +
        'complete live diff and rerun all required gates.',
    }

    state = updateState(loaded, state, {
      status: 'qa-running',
      lastError: null,
    })
    let qaResult: QaResult
    try {
      qaResult = await runQa(loaded, state, retestContext)
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
      qaResult,
    )
    writeState(loaded.paths.state, state)
    console.log(
      `Fresh Codex QA verdict for ${qaResult.step}: ${qaResult.verdict.toUpperCase()}.`,
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
        console.log('Paused after Codex and before Codex QA QA.')
        break
      }

      state = updateState(loaded, state, { status: 'qa-running' })
      let qaResult: QaResult
      try {
        qaResult = await runQa(loaded, state, codexResult)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        state = updateState(loaded, state, {
          status: 'blocked',
          lastError: message,
        })
        throw error
      }

      let stateAfterCommit: PhaseRunnerState
      try {
        stateAfterCommit = commitPassedStep(
          loaded,
          { ...state, status: 'qa-running' },
          qaResult,
        )
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
        stateAfterCommit,
        qaResult,
      )
      writeState(loaded.paths.state, state)
      console.log(
        `Codex QA verdict for ${qaResult.step}: ${qaResult.verdict.toUpperCase()}.`,
      )

      if (state.status === 'ready') {
        if (qaResult.verdict === 'fail') {
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

  if (command !== 'status' && command !== 'dry-run') assertQaAuthority(loaded.manifest)
  if (['init', 'doctor', 'run', 'continue', 'retest', 'retry', 'accept', 'resume'].includes(command)) {
    assertMigrationActivation(loaded)
  }

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
    case 'accept':
      acceptOwnerCheckpoint(loaded)
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
        'usage: phase-runner.ts [init|status|dry-run|doctor|run|pause|resume|retry|accept|recover|continue|retest] [--phase N]',
      )
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch((error: unknown) => {
  process.stderr.write(
    `phase-runner: ${error instanceof Error ? error.message : String(error)}\n`,
  )
  process.exitCode = 1
})
