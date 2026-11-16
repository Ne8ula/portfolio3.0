import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'
import { describe, expect, it, vi } from 'vitest'
import {
  acceptOwnerGate,
  assertQaAuthority,
  cliIdentity,
  reviewerArgs,
  FIXED_GATES,
  parseState,
  validateHostGates,
  buildCodexPrompt,
  buildQaPrompt,
  canonicalGateCommand,
  canonicalStepId,
  createInitialState,
  getStep,
  isHostRecoverableE2eFailure,
  manifestDigest,
  pathMatchesAllowedCommitPath,
  parseCodexResult,
  parseQaResult as parseRawQaResult,
  QA_ROLE,
  type QaEvidence,
  parseManifest,
  transitionAfterQa,
  type GateResult,
  type CodexResult,
  type QaResult,
  type QaFinding,
  type PhaseManifest,
  type PhaseStep,
} from '../../scripts/phase-runner/core'
import {
  assertIntegrity,
  assertMigrationActivation,
  assertCommitInitializationReady,
  binaryDiff,
  commitPassedStep,
  cleanupQaWorktree,
  createQaWorktree,
  gitIntegrity,
  gateSnapshot,
  npmInvocation,
  runLoggedCommand,
  runRequiredGates,
  safeRepositoryPath,
  selectedPathsSnapshot,
  sourceInventory,
  reviewSnapshot,
  qaArtifactsSnapshot,
  withQaEvidence,
  worktreeSnapshot,
} from '../../scripts/phase-runner/phase-runner'

const evidence: QaEvidence = {
  binding: { invocationId: 'synthetic-invocation', snapshot: 'source-hash', base: 'base-hash', gateRecord: 'gate-hash' },
  reviewer: { role: QA_ROLE, client: 'Codex CLI', executable: 'C:/test/codex.exe', cliVersion: 'synthetic-version', sessionId: 'review-session', model: 'not exposed' },
  gates: ['lint', 'typecheck:contracts', 'validate:contracts', 'test:unit', 'test:e2e'].map((script) => ({ command: 'npm run ' + script, exitCode: 0, logPath: script + '.log', logSha256: 'a'.repeat(64) })),
}
function parseQaResult(value: QaResult, manifest: PhaseManifest, step: PhaseStep, host = evidence) {
  const { reviewer: _reviewer, ...raw } = value
  return parseRawQaResult(raw, manifest, step, host)
}

const manifestPath = fileURLToPath(
  new URL(
    '../../scripts/phase-runner/manifests/phase-2.json',
    import.meta.url,
  ),
)
const rawManifest = readFileSync(manifestPath, 'utf8')
const manifest = parseManifest(JSON.parse(rawManifest))
const phase3ManifestPath = fileURLToPath(
  new URL(
    '../../scripts/phase-runner/manifests/phase-3.json',
    import.meta.url,
  ),
)
const rawPhase3Manifest = readFileSync(phase3ManifestPath, 'utf8')
const phase3Manifest = parseManifest(JSON.parse(rawPhase3Manifest))
const requiredGates: GateResult[] = manifest.requiredGates.map((command) => ({
  command,
  status: 'pass',
  details: 'exit 0',
}))

function finding(): QaFinding {
  return {
    severity: 'high',
    blocking: true,
    file: 'app/projects/page.tsx',
    line: '12',
    evidence: 'The required heading is absent.',
    expected: 'A visible project catalogue heading.',
    actual: 'No heading is rendered.',
    reproduction: 'Open /projects and inspect the h1.',
  }
}

function qaResult(
  step: string,
  verdict: QaResult['verdict'],
  phase = 2,
): QaResult {
  return {
    reviewer: evidence.reviewer,
    binding: evidence.binding,
    phase,
    step,
    verdict,
    summary: `${step} ${verdict}`,
    gates: requiredGates,
    findings: verdict === 'fail' ? [finding()] : [],
    residualRisks: [],
    nextContext: 'Verified context only.',
    handoff: `Handoff: Phase ${phase} ${step} ${verdict}.`,
  }
}

describe('phase runner', () => {
  it('initializes the accepted Phase 2 state at Step 3', () => {
    const state = createInitialState(
      manifest,
      manifestDigest(rawManifest),
      '2026-07-31T00:00:00.000Z',
    )

    expect(state.currentStep).toBe('step-3')
    expect(state.status).toBe('ready')
    expect(state.qaPassedSteps).toEqual(['step-0', 'step-1', 'step-2'])
    expect(state.ownerAcceptedThrough).toBe('step-2')
  })

  it('builds a canonical Step 3 Codex prompt without delegating scope to QA', () => {
    const state = createInitialState(manifest, manifestDigest(rawManifest))
    const prompt = buildCodexPrompt(manifest, getStep(manifest, 'step-3'), state)

    expect(prompt).toContain('Implement Phase 2 step-3')
    expect(prompt).toContain('plan items 7, 8')
    expect(prompt).toContain('Do not begin another implementation step')
    expect(prompt).toContain("QA's nextContext is advisory only")
    expect(prompt).toContain('content/portfolio-approvals.json')
    expect(prompt).toContain('Do not run git add or git commit')
    expect(prompt).toContain('Controller commit boundary:')
    expect(prompt).toContain(
      'If the approved design genuinely requires a path outside',
    )
  })

  it('initializes Phase 3 at its first step without fictional prior acceptance', () => {
    const state = createInitialState(
      phase3Manifest,
      manifestDigest(rawPhase3Manifest),
      '2026-07-31T00:00:00.000Z',
      ['content/portfolio-approvals.json'],
    )

    expect(state.currentStep).toBe('step-1')
    expect(state.qaPassedSteps).toEqual([])
    expect(state.ownerAcceptedThrough).toBeNull()
    expect(state.initialDirtyPaths).toEqual([
      'content/portfolio-approvals.json',
    ])
    expect(state.stepCommits).toEqual({
      'step-1': null,
      'step-2': null,
      'step-3': null,
      'step-4': null,
    })
  })

  it('maps Phase 3 into three commits around the owner-only AC-23 checkpoint', () => {
    expect(
      phase3Manifest.steps
        .filter((step) => step.commitAfterQa)
        .map((step) => step.planItems),
    ).toEqual([
      [1, 2, 3],
      [4, 5, 6],
      [8, 9],
    ])
    expect(getStep(phase3Manifest, 'step-3').ownerGateAfter).toBe(true)
    expect(getStep(phase3Manifest, 'step-3').commitAfterQa).toBeNull()
    expect(
      getStep(phase3Manifest, 'step-2').commitAfterQa?.paths,
    ).toContain('components/cockpit/cockpit-hud.tsx')
    expect(
      pathMatchesAllowedCommitPath(
        'docs/baselines/phase-3-dpr/hardware.json',
        getStep(phase3Manifest, 'step-4').commitAfterQa?.paths ?? [],
      ),
    ).toBe(true)
    expect(
      pathMatchesAllowedCommitPath(
        'content/portfolio-approvals.json',
        getStep(phase3Manifest, 'step-4').commitAfterQa?.paths ?? [],
      ),
    ).toBe(false)
  })

  it('advances from Step 3 to Step 4 after an independent PASS', () => {
    const state = createInitialState(manifest, manifestDigest(rawManifest))
    const next = transitionAfterQa(
      manifest,
      state,
      qaResult('step-3', 'pass'),
      '2026-07-31T00:01:00.000Z',
    )

    expect(next.status).toBe('ready')
    expect(next.currentStep).toBe('step-4')
    expect(next.qaPassedSteps).toContain('step-3')
  })

  it('returns a failed step to Codex with its findings and a bounded retry', () => {
    const state = createInitialState(manifest, manifestDigest(rawManifest))
    const next = transitionAfterQa(
      manifest,
      state,
      qaResult('step-3', 'fail'),
    )

    expect(next.status).toBe('ready')
    expect(next.currentStep).toBe('step-3')
    expect(next.fixAttempts['step-3']).toBe(1)
    expect(next.pendingFindings).toEqual([finding()])
  })

  it('stops after final Step 4 PASS for owner and CI acceptance', () => {
    const state = {
      ...createInitialState(manifest, manifestDigest(rawManifest)),
      currentStep: 'step-4',
      qaPassedSteps: ['step-0', 'step-1', 'step-2', 'step-3'],
    }
    const next = transitionAfterQa(
      manifest,
      state,
      qaResult('step-4', 'pass'),
    )

    expect(next.status).toBe('complete-awaiting-owner-ci')
    expect(next.qaPassedSteps).toContain('step-4')
  })

  it('stops after Phase 3 tooling QA and requires explicit owner acceptance', () => {
    const state = {
      ...createInitialState(
        phase3Manifest,
        manifestDigest(rawPhase3Manifest),
      ),
      currentStep: 'step-3',
      qaPassedSteps: ['step-1', 'step-2'],
    }
    const waiting = transitionAfterQa(
      phase3Manifest,
      state,
      qaResult('step-3', 'pass', 3),
    )

    expect(waiting.status).toBe('awaiting-owner')
    expect(waiting.currentStep).toBe('step-3')
    expect(waiting.ownerAcceptedThrough).toBeNull()

    const accepted = acceptOwnerGate(
      phase3Manifest,
      waiting,
      '2026-07-31T00:02:00.000Z',
    )
    expect(accepted.status).toBe('ready')
    expect(accepted.currentStep).toBe('step-4')
    expect(accepted.ownerAcceptedThrough).toBe('step-3')
  })

  it('refuses owner acceptance outside an awaiting-owner checkpoint', () => {
    const state = createInitialState(
      phase3Manifest,
      manifestDigest(rawPhase3Manifest),
    )
    expect(() => acceptOwnerGate(phase3Manifest, state)).toThrow(
      'owner acceptance requires awaiting-owner state',
    )
  })

  it('normalizes CI-prefixed e2e gate reporting', () => {
    expect(canonicalGateCommand('CI=true npm run test:e2e')).toBe(
      'npm run test:e2e',
    )
  })

  it('normalizes a descriptive step label without changing its step number', () => {
    expect(canonicalStepId('step-3 — catalogue routes')).toBe('step-3')
    expect(canonicalStepId('Step-4: enforcement')).toBe('step-4')
    expect(canonicalStepId('Step 1 — sizing policy')).toBe('step-1')
    expect(canonicalStepId('step-30 catalogue routes')).toBe('step-30')
    expect(canonicalStepId('6 — Contained pan only')).toBe('step-6')
  })

  it('accepts a descriptive Codex step label and isolates a host-recoverable e2e failure', () => {
    const result = parseCodexResult(
      {
        phase: 2,
        step: 'step-3 — catalogue routes',
        outcome: 'blocked',
        summary: 'Only the sandboxed browser gate is blocked.',
        filesChanged: ['app/projects/page.tsx'],
        gates: requiredGates.map((gate) =>
          gate.command === 'npm run test:e2e'
            ? {
                ...gate,
                status: 'fail',
                details: 'listen EPERM: could not bind 127.0.0.1:3000',
              }
            : gate,
        ),
        unresolvedRisks: ['E2E needs a port-enabled host.'],
        handoff: 'Handoff: Step 3 awaits host E2E.',
      },
      manifest,
      getStep(manifest, 'step-3'),
    )

    expect(result.step).toBe('step-3')
    expect(
      isHostRecoverableE2eFailure(result, manifest.requiredGates),
    ).toBe(true)
  })

  it('recognizes the bind-denied EPERM wording from a saved Codex result', () => {
    const result = parseCodexResult(
      {
        phase: 3,
        step: 'Step 1 — sizing policy and renderer parity',
        outcome: 'blocked',
        summary: 'Only the sandboxed browser gate is blocked.',
        filesChanged: ['lib/responsive/render-policy.ts'],
        gates: requiredGates.map((gate) =>
          gate.command === 'npm run test:e2e'
            ? {
                ...gate,
                status: 'fail',
                details:
                  'Failed before test execution: Next dev server bind denied with EPERM on 0.0.0.0:3000.',
              }
            : gate,
        ),
        unresolvedRisks: ['Browser verification requires the host controller.'],
        handoff: 'Handoff: Step 1 awaits host E2E.',
      },
      phase3Manifest,
      getStep(phase3Manifest, 'step-1'),
    )

    expect(
      isHostRecoverableE2eFailure(result, phase3Manifest.requiredGates),
    ).toBe(true)
  })

  it('recognizes denied-binding EPERM wording from a saved Codex result', () => {
    const result = parseCodexResult(
      {
        phase: 3,
        step: 'step-2',
        outcome: 'blocked',
        summary: 'Only the sandboxed browser gate is blocked.',
        filesChanged: ['components/cockpit/globe-canvas.tsx'],
        gates: requiredGates.map((gate) =>
          gate.command === 'npm run test:e2e'
            ? {
                ...gate,
                status: 'fail',
                details:
                  'Playwright could not start because the managed sandbox denied binding 0.0.0.0:3000 with EPERM; no browser test executed.',
              }
            : gate,
        ),
        unresolvedRisks: ['Browser verification requires the host controller.'],
        handoff: 'Handoff: Step 2 awaits host E2E.',
      },
      phase3Manifest,
      getStep(phase3Manifest, 'step-2'),
    )

    expect(
      isHostRecoverableE2eFailure(result, phase3Manifest.requiredGates),
    ).toBe(true)
  })

  it('recognizes failed-to-bind EPERM wording from a saved Codex result', () => {
    const result = parseCodexResult(
      {
        phase: 3,
        step: 'step-2',
        outcome: 'blocked',
        summary: 'Only the sandboxed browser gate is blocked.',
        filesChanged: ['components/cockpit/globe-canvas.tsx'],
        gates: requiredGates.map((gate) =>
          gate.command === 'npm run test:e2e'
            ? {
                ...gate,
                status: 'fail',
                details:
                  'No tests executed; the Playwright web server failed to bind 0.0.0.0:3000 with EPERM.',
              }
            : gate,
        ),
        unresolvedRisks: ['Browser verification requires the host controller.'],
        handoff: 'Handoff: Step 2 awaits host E2E.',
      },
      phase3Manifest,
      getStep(phase3Manifest, 'step-2'),
    )

    expect(
      isHostRecoverableE2eFailure(result, phase3Manifest.requiredGates),
    ).toBe(true)
  })

  it('recognizes a denied Playwright server bind from a saved Codex result', () => {
    const result = parseCodexResult(
      {
        phase: 3,
        step: 'step-2',
        outcome: 'blocked',
        summary: 'Only the sandboxed browser gate is blocked.',
        filesChanged: ['components/cockpit/globe-canvas.tsx'],
        gates: requiredGates.map((gate) =>
          gate.command === 'npm run test:e2e'
            ? {
                ...gate,
                status: 'fail',
                details:
                  'No tests executed because the sandbox denied the Playwright server bind to 0.0.0.0:3000 with EPERM.',
              }
            : gate,
        ),
        unresolvedRisks: ['Browser verification requires the host controller.'],
        handoff: 'Handoff: Step 2 awaits host E2E.',
      },
      phase3Manifest,
      getStep(phase3Manifest, 'step-2'),
    )

    expect(
      isHostRecoverableE2eFailure(result, phase3Manifest.requiredGates),
    ).toBe(true)
  })

  it('rejects PASS when a required gate is red', () => {
    const result = {
      ...qaResult('step-3', 'pass'),
      gates: requiredGates.map((gate) =>
        gate.command === 'npm run lint'
          ? { ...gate, status: 'fail' as const }
          : gate,
      ),
    }

    expect(() =>
      parseQaResult(result, manifest, getStep(manifest, 'step-3')),
    ).toThrow('reviewer gate table disagrees')
  })
})

describe('migration A1-A11 synthetic regression evidence (not O1-O5 host certification)', () => {
  it('A4/A9 runs fixed host gates in order with CI=true, authoritative exits and log hashes', async () => {
    const root = mkdtempSync(join(tmpdir(), 'portfolio-gates-test-'))
    try {
      writeFileSync(join(root, 'gate.cjs'), "console.log(process.argv[2], process.env.CI, process.cwd()); if (process.argv[2] === process.env.SYNTHETIC_FAIL) process.exit(7)")
      writeFileSync(join(root, 'package.json'), JSON.stringify({ scripts: Object.fromEntries(
        FIXED_GATES.map((command) => [command.slice(8), `node gate.cjs ${command.slice(8)}`]),
      ) }))
      const logs = FIXED_GATES.map((_, i) => join(root, i + '.log'))
      const order: string[] = []
      const env = { ...process.env, CI: 'false', npm_config_cache: join(root, 'npm-cache') }
      const gates = await runRequiredGates(FIXED_GATES, root, env, logs,
        (records) => { order.push(records.at(-1)!.command) }, () => {})
      expect(order).toEqual(FIXED_GATES)
      for (const gate of gates) {
        expect(gate.exitCode).toBe(0)
        expect(gate.logSha256).toBe(createHash('sha256').update(readFileSync(gate.logPath)).digest('hex'))
        expect(readFileSync(gate.logPath, 'utf8')).toContain(`true ${root}`)
      }
      order.length = 0
      await expect(runRequiredGates(FIXED_GATES, root, { ...env, SYNTHETIC_FAIL: 'typecheck:contracts' }, logs,
        (records) => { order.push(records.at(-1)!.command) }, () => {})).rejects.toThrow('exited 7')
      expect(order).toEqual(FIXED_GATES.slice(0, 2))
    } finally { rmSync(root, { recursive: true, force: true }) }
  }, 15_000)

  it('A10/A11 blocks a failed or unavailable executable without retry or fallback', async () => {
    const root = mkdtempSync(join(tmpdir(), 'portfolio-launch-test-'))
    try {
      await expect(runLoggedCommand(process.execPath, ['-e', 'process.exit(13)'], {
        cwd: root, logPath: join(root, 'failed.log'), label: 'synthetic denied launch',
      })).rejects.toThrow('exited 13')
      await expect(runLoggedCommand(join(root, 'missing-executable'), [], {
        cwd: root, logPath: join(root, 'missing.log'), label: 'synthetic unavailable launch',
      })).rejects.toThrow()
    } finally { rmSync(root, { recursive: true, force: true }) }
  })
  it('A1/A10/A11 pins fresh read-only exec to never escalate, with no fallback', () => {
    expect(reviewerArgs('C:/disposable', 'qa.schema.json', 'out.json')).toEqual([
      'exec', '--sandbox', 'read-only', '-c', 'approval_policy=never',
      '--json', '--output-schema', 'qa.schema.json', '--output-last-message', 'out.json',
      '--cd', 'C:/disposable', '-',
    ])
    const source = readFileSync(new URL('../../scripts/phase-runner/phase-runner.ts', import.meta.url), 'utf8')
    expect(source).not.toMatch(/runKimi|PHASE_RUNNER_KIMI|kimi-phase-qa|danger-full-access|bypass-/)
    expect(source).toContain("if (output.exitCode !== 0) fail(`reviewer exited")
    expect(source).toContain('input: buildQaPrompt(')
    expect(source).toContain('input: buildCodexPrompt(')
    expect(source).not.toMatch(/args\.push\(build(?:Qa|Codex)Prompt/)
  })

  it('checks operational prerequisites without inventing bootstrap acceptance', () => {
    const root = mkdtempSync(join(tmpdir(), 'portfolio-preflight-test-'))
    // Node is a stand-in for the executable availability check; no Codex launch.
    vi.stubEnv('PHASE_RUNNER_CODEX_BIN', process.execPath)
    try {
      const future = parseManifest(JSON.parse(readFileSync(new URL('../../scripts/phase-runner/manifests/phase-6.json', import.meta.url), 'utf8')))
      const schema = join(root, 'result.schema.json')
      writeFileSync(schema, JSON.stringify({ type: 'object', additionalProperties: false, required: ['phase'] }))
      const loaded = { manifest: future, manifestDigest: 'synthetic', paths: {
        root, manifest: '', schema, qaSchema: schema, stateDirectory: '', state: '', pause: '', lock: '', logs: '',
      } }
      expect(() => assertMigrationActivation(loaded)).not.toThrow()
      expect(() => assertMigrationActivation({ ...loaded, manifest })).toThrow('authority')
      expect(() => assertMigrationActivation({ ...loaded, manifest: { ...future, maxFixAttempts: 4 } })).toThrow('three fix attempts')
      expect(() => assertMigrationActivation({ ...loaded, manifest: { ...future, requiredGates: FIXED_GATES.slice(1) } })).toThrow('fixed commands')
      writeFileSync(schema, '{}')
      expect(() => assertMigrationActivation(loaded)).toThrow('strict result schema')
      writeFileSync(schema, '{malformed')
      expect(() => assertMigrationActivation(loaded)).toThrow()
      expect(() => assertMigrationActivation({ ...loaded, paths: { ...loaded.paths, schema: join(root, 'missing') } })).toThrow()
      vi.stubEnv('PHASE_RUNNER_CODEX_BIN', join(root, 'missing-executable'))
      expect(() => assertMigrationActivation(loaded)).toThrow('CLI is unavailable')
    } finally {
      vi.unstubAllEnvs()
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('delivers complete engineering/reviewer prompts and EOF without command-line quoting or length loss', async () => {
    const root = mkdtempSync(join(tmpdir(), 'portfolio-stdin-test-'))
    try {
      const step = getStep(manifest, 'step-3')
      const state = createInitialState(manifest, 'synthetic')
      const report: CodexResult = { phase: manifest.phase, step: step.id, outcome: 'ready-for-qa',
        summary: 'Quoted "text" \\ path\r\nUnicode: 玉 — $() `literal`\n'.repeat(2000),
        filesChanged: [], gates: requiredGates, unresolvedRisks: [], handoff: 'Handoff: Synthetic engineering report.',
      }
      const prompts = [buildCodexPrompt(manifest, step, state), buildQaPrompt(manifest, step, report, evidence)]
      const args = reviewerArgs('C:/disposable path', 'qa schema.json', 'out file.json')
      expect(prompts[1]!.length).toBeGreaterThan(32767)
      for (const [i, input] of prompts.entries()) {
        const output = await runLoggedCommand(process.execPath, ['-e',
          "let input = ''; process.stdin.setEncoding('utf8'); process.stdin.on('data', chunk => input += chunk); process.stdin.on('end', () => process.stdout.write(JSON.stringify({ input, args: process.argv.slice(1) })));", '--', ...args], {
          cwd: root, logPath: join(root, i + '.log'), label: 'synthetic finite prompt', input,
        })
        expect(output.exitCode).toBe(0)
        expect(JSON.parse(output.stdout)).toEqual({ input, args })
      }
      const withoutInput = await runLoggedCommand(process.execPath, ['-e',
        "process.stdin.resume(); process.stdin.on('end', () => console.log('EOF'));"], {
        cwd: root, logPath: join(root, 'no-input.log'), label: 'synthetic absent input',
      })
      expect(withoutInput.stdout.trim()).toBe('EOF')
    } finally { rmSync(root, { recursive: true, force: true }) }
  })

  it('A2 requires one corroborated CLI thread, never model-authored identity', () => {
    const telemetry = JSON.stringify({ type: 'thread.started', thread_id: 'fresh' })
    expect(cliIdentity(telemetry, 'codex.exe', 'version', QA_ROLE, []).model).toBe('not exposed')
    for (const used of [['engineer', 'fresh'], ['fresh']]) {
      expect(() => cliIdentity(telemetry, 'codex.exe', 'version', QA_ROLE, used)).toThrow('reused')
    }
    for (const events of [
      [{ type: 'assistant', content: '{"sessionId":"fresh"}' }],
      [{ type: 'thread.started', thread_id: 'fresh', resumed: true }],
      [{ type: 'thread.started', thread_id: 'fresh', parent_thread_id: 'engineer' }],
      [{ type: 'thread.started', thread_id: 'fresh' }, { type: 'thread.started', thread_id: 'other' }],
      [{ type: 'thread.started', thread_id: 'fresh' }, { type: 'turn.started', thread_id: 'other' }],
      [{ type: 'thread.started', thread_id: 'fresh' }, { type: 'thread.forked' }],
    ]) expect(() => cliIdentity(events.map((e) => JSON.stringify(e)).join('\n'), 'exe', 'version', QA_ROLE, [])).toThrow()
    expect(() => cliIdentity(telemetry, 'exe', '', QA_ROLE, [])).toThrow('version')
    expect(() => cliIdentity('{partial', 'exe', 'version', QA_ROLE, [])).toThrow()
  })

  it.each(['invocationId', 'snapshot', 'base', 'gateRecord'] as const)('A2 rejects stale %s binding', (field) => {
    const result = qaResult('step-3', 'pass')
    result.binding = { ...result.binding, [field]: 'stale' }
    expect(() => parseQaResult(result, manifest, getStep(manifest, 'step-3'))).toThrow('binding mismatch')
  })

  it('A4 rejects missing, not-run/red, reordered and unproven host gates', () => {
    for (const gates of [
      evidence.gates.slice(1), [...evidence.gates].reverse(),
      evidence.gates.map((g, i) => i ? g : { ...g, exitCode: 1 }),
      evidence.gates.map((g, i) => i ? g : { ...g, exitCode: null }),
      evidence.gates.map((g, i) => i ? g : { ...g, logSha256: '' }),
    ]) expect(() => parseQaResult(qaResult('step-3', 'pass'), manifest, getStep(manifest, 'step-3'), { ...evidence, gates })).toThrow()
    expect(() => validateHostGates(evidence.gates, manifest.requiredGates)).not.toThrow()
  })

  it('A5 rejects malformed/extra fields, wrong step/phase and inconsistent findings', () => {
    const step = getStep(manifest, 'step-3')
    for (const result of [
      { ...qaResult('step-3', 'pass'), phase: 6 },
      { ...qaResult('step-4', 'pass') },
      { ...qaResult('step-3 — alias', 'pass') },
      { ...qaResult('step-3', 'pass'), findings: [finding()] },
      { ...qaResult('step-3', 'fail'), findings: [] },
    ]) expect(() => parseQaResult(result, manifest, step)).toThrow()
    expect(() => parseRawQaResult(null, manifest, step, evidence)).toThrow()
    expect(() => parseRawQaResult(qaResult('step-3', 'pass'), manifest, step, evidence)).toThrow('unknown fields')
    expect(() => parseRawQaResult(JSON.parse('{"phase":2}'), manifest, step, evidence)).toThrow()
  })

  it('A6/A8 preserves legacy attribution through parsing, QA and owner acceptance', () => {
    const legacy = { verdict: 'pass', provider: 'Kimi', untouched: [1, 2, 3] }
    const state = parseState({ ...createInitialState(phase3Manifest, 'digest'),
      currentStep: 'step-3', lastKimiResult: legacy }, phase3Manifest)
    const reviewed = transitionAfterQa(phase3Manifest, state, qaResult('step-3', 'pass', 3))
    expect(reviewed.lastKimiResult).toEqual(legacy)
    expect(reviewed.lastQaResult?.reviewer.role).toBe(QA_ROLE)
    expect(acceptOwnerGate(phase3Manifest, reviewed).lastKimiResult).toEqual(legacy)
    expect(() => parseState(state, phase3Manifest, 'changed-digest')).toThrow('digest changed')
    expect(() => acceptOwnerGate(phase3Manifest, { ...reviewed, qaPassedSteps: [] })).toThrow('independently passed')
    for (let i = 0; i < 4; i++) {
      state.fixAttempts['step-3'] = i
      const failed = transitionAfterQa(phase3Manifest, state, qaResult('step-3', 'fail', 3))
      expect(failed.status).toBe(i < 3 ? 'ready' : 'blocked')
    }
  })

  it('A8 blocks historical authority before any execution, preserving inspection', () => {
    for (const phase of [2, 3, 4, 5]) {
      const historical = parseManifest(JSON.parse(readFileSync(new URL(`../../scripts/phase-runner/manifests/phase-${phase}.json`, import.meta.url), 'utf8')))
      expect(() => assertQaAuthority(historical)).toThrow('authority')
    }
    const future = parseManifest(JSON.parse(readFileSync(new URL('../../scripts/phase-runner/manifests/phase-6.json', import.meta.url), 'utf8')))
    expect(() => assertQaAuthority(future)).not.toThrow()
    expect(() => assertQaAuthority({ ...future, requiredGates: [...future.requiredGates].reverse() })).toThrow('fixed commands')
  })

  it('A9 confines normalized Windows paths and uses shell-free fixed npm arguments', () => {
    const root = resolve('synthetic-root')
    expect(safeRepositoryPath(root.replaceAll('\\', '/'), 'a')).toBe(join(root, 'a'))
    expect(() => safeRepositoryPath(root, '../sibling')).toThrow('unsafe')
    expect(() => safeRepositoryPath(root, join(dirname(root), 'sibling'))).toThrow('unsafe')
    const invocation = npmInvocation(['run', 'test:e2e'])
    expect(invocation.executable).toBe(process.execPath)
    expect(invocation.args.slice(1)).toEqual(['run', 'test:e2e'])
  })
})

// These Git writes operate only on disposable, fabricated fixtures; no phase
// state, real checkout/index/ref, approval record or agent is ever touched.
function syntheticRepository<T>(run: (root: string) => T): T {
  const root = mkdtempSync(join(tmpdir(), 'portfolio-migration-test-'))
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: 'pipe' })
  try {
    git('init', '-q')
    writeFileSync(join(root, '.gitignore'), 'ignored-source\n.next\nnode_modules\n')
    mkdirSync(join(root, 'docs'))
    writeFileSync(join(root, 'docs/agent-handoff.md'), 'historical handoff\r\n')
    writeFileSync(join(root, 'source.ts'), 'const x = 1\r\n')
    git('add', '.')
    git('-c', 'user.name=Synthetic', '-c', 'user.email=synthetic@example.invalid', '-c', 'core.hooksPath=', 'commit', '-qm', 'synthetic only')
    writeFileSync(join(root, 'ignored-source'), 'ignored but protected')
    const result = run(root)
    if (result instanceof Promise) {
      return result.finally(() => rmSync(root, { recursive: true, force: true })) as T
    }
    rmSync(root, { recursive: true, force: true })
    return result
  } catch (error) {
    rmSync(root, { recursive: true, force: true })
    throw error
  }
}

describe('A3/A9 exact disposable integrity', () => {
  it.each(['add', 'modify', 'delete'])('detects %s of an unreachable Git object with refs/index unchanged', (operation) => {
    syntheticRepository((root) => {
      const git = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: 'pipe' })
      const refs = git('show-ref')
      const index = readFileSync(join(root, '.git/index'))
      const beforeAdd = gitIntegrity(root, 'HEAD')
      // Write a valid, writable synthetic loose object. git hash-object -w
      // marks its output read-only on Windows, preventing the mutation fixture.
      const content = Buffer.from('unreachable synthetic evidence')
      const objectBytes = Buffer.concat([Buffer.from(`blob ${content.length}\0`), content])
      const oid = createHash('sha1').update(objectBytes).digest('hex')
      const object = join(root, '.git/objects', oid.slice(0, 2), oid.slice(2))
      mkdirSync(dirname(object), { recursive: true })
      writeFileSync(object, deflateSync(objectBytes))
      expect(git('cat-file', '-p', oid)).toEqual(content)
      const before = operation === 'add' ? beforeAdd : gitIntegrity(root, 'HEAD')
      if (operation === 'modify') writeFileSync(object, 'corrupt unreachable object')
      if (operation === 'delete') unlinkSync(object)
      expect(git('show-ref')).toEqual(refs)
      expect(readFileSync(join(root, '.git/index'))).toEqual(index)
      expect(() => assertIntegrity(before, gitIntegrity(root, 'HEAD'), 'Git objects')).toThrow('blocked')
    })
  })

  it.each(['true', 'input', 'false'])('preserves raw CRLF and the exact binary HEAD diff with autocrlf=%s', (autocrlf) => {
    syntheticRepository((root) => {
      execFileSync('git', ['config', 'core.autocrlf', autocrlf], { cwd: root })
      execFileSync('git', ['config', 'core.eol', 'crlf'], { cwd: root })
      execFileSync('git', ['config', 'alias.synthetic', '!must-not-copy'], { cwd: root })
      writeFileSync(join(root, 'source.ts'), 'const x = 2\r\n// still CRLF\r\n')
      const raw = readFileSync(join(root, 'source.ts'))
      const diff = binaryDiff(root)
      if (autocrlf === 'true') {
        const wrong = execFileSync('git', ['-c', 'core.autocrlf=false', '-c', 'core.eol=lf',
          'diff', '--binary', '--no-ext-diff', '--no-textconv', 'HEAD', '--'], { cwd: root, stdio: 'pipe' })
        expect(wrong.equals(diff)).toBe(false)
      }
      const qa = createQaWorktree(root)
      try {
        expect(readFileSync(join(qa.path, 'source.ts'))).toEqual(raw)
        expect(binaryDiff(qa.path)).toEqual(diff)
        expect(readFileSync(join(qa.path, '.git/config'), 'utf8')).not.toContain('must-not-copy')
      } finally { cleanupQaWorktree(root, qa) }
    })
  })

  it('fails closed on unsupported diff configuration and retains the raw failed snapshot', () => {
    syntheticRepository((root) => {
      execFileSync('git', ['config', 'diff.noprefix', 'true'], { cwd: root })
      writeFileSync(join(root, 'source.ts'), 'changed source\r\n')
      let failedPath = ''
      try {
        createQaWorktree(root)
        expect.fail('different binary diffs must block snapshot creation')
      } catch (error) {
        expect(String(error)).toContain('disposable binary diff from HEAD changed')
        failedPath = String(error).match(/preserved QA snapshot: (.*); evidence:/)![1]!
      }
      const qa = { path: failedPath, parent: dirname(failedPath) }
      try {
        expect(readFileSync(join(qa.path, 'source.ts'))).toEqual(readFileSync(join(root, 'source.ts')))
        expect(JSON.parse(readFileSync(join(qa.parent, 'qa-outcome.json'), 'utf8')).snapshotPath).toBe(qa.path)
      } finally { cleanupQaWorktree(root, qa) }
    })
  })

  it.each(['real', 'disposable'])('freezes all artifacts, evidence and output-like paths in the %s tree', (target) => {
    syntheticRepository((root) => {
      const qa = createQaWorktree(root)
      try {
        const tree = target === 'real' ? root : qa.path
        const paths = ['.next/cache/chunk', 'test-results/trace.zip', 'playwright-report/index.html',
          'tsconfig.tsbuildinfo', 'tsconfig.contracts.tsbuildinfo', 'debug.log',
          'node_modules/.vite/vitest/results.json', 'node_modules/.vite-temp/config.mjs',
          '.agent-runs/logs/install.log', '.agent-runs/logs/gate.json', '.agent-runs/logs/gate.log',
          '.agent-runs/logs/review.json.extra']
        const outputs = ['.agent-runs/logs/review.json']
        for (const path of paths) {
          mkdirSync(dirname(join(tree, path)), { recursive: true })
          writeFileSync(join(tree, path), 'frozen evidence')
        }
        const before = reviewSnapshot(tree, target === 'real' ? outputs : [])
        for (const path of paths) {
          writeFileSync(join(tree, path), 'reviewer mutation')
          expect(() => assertIntegrity(before, reviewSnapshot(tree, target === 'real' ? outputs : []), path)).toThrow('blocked')
          unlinkSync(join(tree, path))
          expect(reviewSnapshot(tree, target === 'real' ? outputs : [])).not.toBe(before)
          writeFileSync(join(tree, path), 'frozen evidence')
        }
        writeFileSync(join(tree, outputs[0]!), 'host-owned result')
        if (target === 'real') expect(reviewSnapshot(tree, outputs)).toBe(before)
        else expect(reviewSnapshot(tree)).not.toBe(before)
        unlinkSync(join(tree, outputs[0]!))
        mkdirSync(join(tree, 'unexpected-empty-directory'))
        expect(reviewSnapshot(tree, target === 'real' ? outputs : [])).not.toBe(before)
      } finally { cleanupQaWorktree(root, qa) }
    })
  })

  it('never exempts a directory or tracked file named as controller output', () => {
    syntheticRepository((root) => {
      mkdirSync(join(root, 'output.json'))
      writeFileSync(join(root, 'output.json/hidden'), 'evidence')
      const before = reviewSnapshot(root, ['output.json', 'source.ts'])
      writeFileSync(join(root, 'output.json/hidden'), 'mutation')
      expect(reviewSnapshot(root, ['output.json', 'source.ts'])).not.toBe(before)
      writeFileSync(join(root, 'output.json/hidden'), 'evidence')
      writeFileSync(join(root, 'source.ts'), 'mutation')
      expect(reviewSnapshot(root, ['output.json', 'source.ts'])).not.toBe(before)
    })
  })

  it.each(['installed-code', 'named-cache'])('checks dependencies after successful synthetic gates: %s', async (kind) => {
    await syntheticRepository(async (root) => {
      writeFileSync(join(root, 'package.json'), JSON.stringify({ scripts: Object.fromEntries(
        FIXED_GATES.map((command) => [command.slice(8), 'node gate.cjs']),
      ) }))
      const mutation = kind === 'installed-code' ? 'node_modules/package/index.js' : 'node_modules/.vite/vitest/results.json'
      writeFileSync(join(root, 'gate.cjs'), `const fs = require('node:fs'); fs.mkdirSync(require('node:path').dirname(${JSON.stringify(mutation)}), {recursive:true}); fs.writeFileSync(${JSON.stringify(mutation)}, 'gate mutation');`)
      const qa = createQaWorktree(root)
      try {
        // Synthetic installation completed. Baseline is captured BEFORE gates.
        mkdirSync(join(qa.path, 'node_modules/package'), { recursive: true })
        writeFileSync(join(qa.path, 'node_modules/package/index.js'), 'original installed code')
        const installed = gateSnapshot(qa.path)
        const logs = FIXED_GATES.map((_, i) => join(qa.parent, i + '.log'))
        const records: typeof evidence.gates = []
        const run = () => runRequiredGates(FIXED_GATES, qa.path,
          { ...process.env, npm_config_cache: join(qa.parent, 'npm-cache') }, logs,
          (gates) => { records.splice(0, records.length, ...gates) },
          () => assertIntegrity(installed, gateSnapshot(qa.path), 'installed code'))
        if (kind === 'installed-code') {
          await expect(withQaEvidence(qa, run, () => {})).rejects.toThrow('installed code changed')
          expect(records).toHaveLength(1)
          expect(records[0]!.exitCode).toBe(0)
          expect(readFileSync(join(qa.path, mutation), 'utf8')).toBe('gate mutation')
          expect(JSON.parse(readFileSync(join(qa.parent, 'qa-outcome.json'), 'utf8')).snapshotPath).toBe(qa.path)
        } else {
          expect(await run()).toHaveLength(5)
          const frozen = reviewSnapshot(qa.path)
          const external = qaArtifactsSnapshot(qa)
          writeFileSync(join(qa.path, mutation), 'review mutation')
          expect(() => assertIntegrity(frozen, reviewSnapshot(qa.path), 'review cache')).toThrow('blocked')
          writeFileSync(join(qa.parent, '0.log'), 'forged gate evidence')
          expect(() => assertIntegrity(external, qaArtifactsSnapshot(qa), 'external evidence')).toThrow('blocked')
        }
      } finally { cleanupQaWorktree(root, qa) }
    })
  }, 15_000)

  it.each(['red gate', 'malformed result', 'integrity mismatch'])('retains snapshots, drift and artifacts after %s', async (failure) => {
    await syntheticRepository(async (root) => {
      const qa = createQaWorktree(root)
      try {
        mkdirSync(join(qa.path, 'test-results'))
        writeFileSync(join(qa.path, 'test-results/trace.zip'), 'failure evidence')
        const before = reviewSnapshot(qa.path)
        let verified = false
        const run = async () => {
          if (failure === 'red gate') {
            return runLoggedCommand(process.execPath, ['-e', 'process.exit(7)'], {
              cwd: qa.path, logPath: join(qa.parent, 'red-gate.log'), label: 'synthetic red gate',
            })
          }
          if (failure === 'malformed result') {
            writeFileSync(join(qa.parent, 'result.json'), '{malformed')
            return JSON.parse(readFileSync(join(qa.parent, 'result.json'), 'utf8'))
          }
          // Simulates an exit hook after the child result, before verification.
          writeFileSync(join(qa.path, 'source.ts'), 'unexpected disposable drift')
          return { verdict: 'pass' }
        }
        await expect(withQaEvidence(qa, run, () => {
          verified = true
          assertIntegrity(before, reviewSnapshot(qa.path), 'post-exit integrity')
        })).rejects.toThrow(`preserved QA snapshot: ${qa.path}`)
        expect(verified).toBe(true)
        expect(readFileSync(join(qa.path, 'test-results/trace.zip'), 'utf8')).toBe('failure evidence')
        const saved = JSON.parse(readFileSync(join(qa.parent, 'qa-outcome.json'), 'utf8'))
        expect(saved.snapshotPath).toBe(qa.path)
        expect(saved.outcome.errors.length).toBeGreaterThan(0)
        if (failure === 'red gate') expect(existsSync(join(qa.parent, 'red-gate.log'))).toBe(true)
        if (failure === 'malformed result') expect(readFileSync(join(qa.parent, 'result.json'), 'utf8')).toBe('{malformed')
        if (failure === 'integrity mismatch') expect(readFileSync(join(qa.path, 'source.ts'), 'utf8')).toBe('unexpected disposable drift')
      } finally { cleanupQaWorktree(root, qa) }
    })
  })

  it.each(['real', 'disposable'])('detects a hook-style handoff write in the %s tree after process exit', (target) => {
    syntheticRepository((root) => {
      const outputs = ['.agent-runs/phase-6/logs/synthetic-qa.jsonl']
      const qa = createQaWorktree(root, outputs)
      try {
        const before = worktreeSnapshot(root, outputs)
        expect(worktreeSnapshot(qa.path, outputs)).toBe(before)
        const changed = target === 'real' ? root : qa.path
        const unchanged = target === 'real' ? qa.path : root
        execFileSync(process.execPath, ['-e',
          "require('node:fs').appendFileSync(process.argv[1], '\\nsynthetic exit hook');",
          join(changed, 'docs/agent-handoff.md')], { cwd: changed, stdio: 'pipe' })
        expect(() => assertIntegrity(before, worktreeSnapshot(changed, outputs), 'source/handoff')).toThrow('integrity blocked')
        expect(worktreeSnapshot(unchanged, outputs)).toBe(before)
      } finally { cleanupQaWorktree(root, qa) }
    })
  })

  it('A7 preserves empty index, authority cleanliness, commit exclusions and dirty-file protection', () => {
    syntheticRepository((root) => {
      const candidate = { ...manifest, source: 'source.ts', steps: [{ ...getStep(manifest, 'step-3'),
        commitAfterQa: { message: 'synthetic', paths: ['source.ts'] } }] }
      const loaded = {
        manifest: candidate, manifestDigest: 'synthetic',
        paths: { root, manifest: join(root, '.gitignore'), schema: '', qaSchema: '', stateDirectory: '',
          state: '', pause: '', lock: '', logs: '' },
      }
      const state = createInitialState(candidate, 'synthetic')
      expect(assertCommitInitializationReady(loaded)).toEqual([])
      const protectedBefore = selectedPathsSnapshot(root, ['source.ts'])
      writeFileSync(join(root, 'source.ts'), 'changed owner source')
      expect(selectedPathsSnapshot(root, ['source.ts'])).not.toBe(protectedBefore)
      expect(() => assertCommitInitializationReady(loaded)).toThrow('must be clean')
      execFileSync('git', ['add', 'source.ts'], { cwd: root, stdio: 'pipe' })
      expect(() => commitPassedStep(loaded, state, qaResult('step-3', 'pass'))).toThrow('non-empty Git index')
      expect(() => assertCommitInitializationReady(loaded)).toThrow('empty Git index')
    })
    syntheticRepository((root) => {
      const candidate = { ...manifest, source: 'source.ts', steps: [{ ...getStep(manifest, 'step-3'),
        commitAfterQa: { message: 'synthetic', paths: ['source.ts'] } }] }
      const loaded = { manifest: candidate, manifestDigest: 'synthetic', paths: {
        root, manifest: join(root, '.gitignore'), schema: '', qaSchema: '', stateDirectory: '',
        state: '', pause: '', lock: '', logs: '' } }
      mkdirSync(join(root, 'content'))
      writeFileSync(join(root, 'content/portfolio-approvals.json'), 'synthetic exclusion fixture')
      writeFileSync(join(root, 'docs/agent-handoff.md'), 'synthetic handoff')
      const state = createInitialState(candidate, 'synthetic')
      expect(() => commitPassedStep(loaded, state, qaResult('step-3', 'pass'))).toThrow('no new files')
      writeFileSync(join(root, 'outside.ts'), 'outside boundary')
      expect(() => commitPassedStep(loaded, state, qaResult('step-3', 'pass'))).toThrow('outside its automatic commit boundary')
    })
  })
  it.each(['source.ts', 'added.ts', 'docs/agent-handoff.md', 'ignored-source', 'other.tsbuildinfo', 'next-env.d.ts'])('rejects changed/added %s including ignored source', (path) => {
    syntheticRepository((root) => {
      const before = worktreeSnapshot(root)
      writeFileSync(join(root, path), 'mutation')
      expect(() => assertIntegrity(before, worktreeSnapshot(root), 'fixture')).toThrow('blocked')
    })
  })

  it.each(['index', 'HEAD', 'refs/heads/unexpected', 'logs/refs/stash', 'hooks/synthetic'])('rejects Git metadata mutation %s', (path) => {
    syntheticRepository((root) => {
      const before = gitIntegrity(root, 'HEAD')
      const destination = join(root, '.git', path)
      mkdirSync(dirname(destination), { recursive: true })
      writeFileSync(destination, 'mutation')
      expect(() => assertIntegrity(before, gitIntegrity(root, 'HEAD'), 'Git')).toThrow()
    })
  })

  it('copies exact CRLF and ignored bytes without dependency links or real-tree drift', () => {
    syntheticRepository((root) => {
      mkdirSync(join(root, 'node_modules'))
      writeFileSync(join(root, 'node_modules/package.txt'), 'real dependency')
      const before = worktreeSnapshot(root)
      const gitBefore = gitIntegrity(root, 'HEAD')
      const qa = createQaWorktree(root)
      try {
        expect(worktreeSnapshot(qa.path)).toBe(before)
        expect(readFileSync(join(qa.path, 'source.ts'))).toEqual(readFileSync(join(root, 'source.ts')))
        expect(sourceInventory(qa.path, [], true)).not.toHaveProperty('node_modules/package.txt')
        writeFileSync(join(qa.path, 'ignored-source'), 'review mutation')
        expect(() => assertIntegrity(before, worktreeSnapshot(qa.path), 'QA')).toThrow()
        expect(worktreeSnapshot(root)).toBe(before)
        expect(gitIntegrity(root, 'HEAD')).toBe(gitBefore)
      } finally { cleanupQaWorktree(root, qa) }
    })
  })

  it('allows only named untracked gate artifacts, not tracked artifacts', () => {
    syntheticRepository((root) => {
      const before = worktreeSnapshot(root)
      mkdirSync(join(root, '.next'))
      writeFileSync(join(root, '.next/cache'), 'gate artifact')
      expect(worktreeSnapshot(root)).toBe(before)
      execFileSync('git', ['add', '-f', '.next/cache'], { cwd: root, stdio: 'pipe' })
      expect(worktreeSnapshot(root)).not.toBe(before)
    })
  })
})
