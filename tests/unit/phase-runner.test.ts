import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  PHASE_RESULT_MARKER,
  acceptOwnerGate,
  buildCodexPrompt,
  canonicalGateCommand,
  canonicalStepId,
  createInitialState,
  extractKimiJson,
  getStep,
  isHostRecoverableE2eFailure,
  manifestDigest,
  pathMatchesAllowedCommitPath,
  parseCodexResult,
  parseKimiResult,
  parseManifest,
  transitionAfterQa,
  type GateResult,
  type KimiResult,
  type QaFinding,
} from '../../scripts/phase-runner/core'

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

function kimiResult(
  step: string,
  verdict: KimiResult['verdict'],
  phase = 2,
): KimiResult {
  return {
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

  it('builds a canonical Step 3 Codex prompt without delegating scope to Kimi', () => {
    const state = createInitialState(manifest, manifestDigest(rawManifest))
    const prompt = buildCodexPrompt(manifest, getStep(manifest, 'step-3'), state)

    expect(prompt).toContain('Implement Phase 2 step-3')
    expect(prompt).toContain('plan items 7, 8')
    expect(prompt).toContain('Do not begin another implementation step')
    expect(prompt).toContain("Kimi's nextContext is advisory only")
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

  it('extracts a marked Kimi JSON result from stream-json output', () => {
    const payload = kimiResult('step-3', 'pass')
    const stream = [
      JSON.stringify({ role: 'assistant', content: 'Reviewing the diff.' }),
      JSON.stringify({
        role: 'assistant',
        content: `${PHASE_RESULT_MARKER}\n${JSON.stringify(payload)}`,
      }),
    ].join('\n')

    const parsed = parseKimiResult(
      extractKimiJson(stream),
      manifest,
      getStep(manifest, 'step-3'),
    )

    expect(parsed).toEqual(payload)
  })

  it('advances from Step 3 to Step 4 after an independent PASS', () => {
    const state = createInitialState(manifest, manifestDigest(rawManifest))
    const next = transitionAfterQa(
      manifest,
      state,
      kimiResult('step-3', 'pass'),
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
      kimiResult('step-3', 'fail'),
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
      kimiResult('step-4', 'pass'),
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
      kimiResult('step-3', 'pass', 3),
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

  it('rejects PASS when a required gate is red', () => {
    const result = {
      ...kimiResult('step-3', 'pass'),
      gates: requiredGates.map((gate) =>
        gate.command === 'npm run lint'
          ? { ...gate, status: 'fail' as const }
          : gate,
      ),
    }

    expect(() =>
      parseKimiResult(result, manifest, getStep(manifest, 'step-3')),
    ).toThrow('required gate is not green')
  })
})
