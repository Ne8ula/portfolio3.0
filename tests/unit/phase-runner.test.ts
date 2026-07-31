import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  PHASE_RESULT_MARKER,
  buildCodexPrompt,
  canonicalGateCommand,
  canonicalStepId,
  createInitialState,
  extractKimiJson,
  getStep,
  isHostRecoverableE2eFailure,
  manifestDigest,
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
): KimiResult {
  return {
    phase: 2,
    step,
    verdict,
    summary: `${step} ${verdict}`,
    gates: requiredGates,
    findings: verdict === 'fail' ? [finding()] : [],
    residualRisks: [],
    nextContext: 'Verified context only.',
    handoff: `Handoff: Phase 2 ${step} ${verdict}.`,
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

  it('normalizes CI-prefixed e2e gate reporting', () => {
    expect(canonicalGateCommand('CI=true npm run test:e2e')).toBe(
      'npm run test:e2e',
    )
  })

  it('normalizes a descriptive step label without changing its step number', () => {
    expect(canonicalStepId('step-3 — catalogue routes')).toBe('step-3')
    expect(canonicalStepId('Step-4: enforcement')).toBe('step-4')
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
