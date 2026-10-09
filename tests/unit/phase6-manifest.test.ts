import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  acceptOwnerGate,
  buildCodexPrompt,
  buildKimiPrompt,
  createInitialState,
  getStep,
  manifestDigest,
  parseCodexResult,
  parseKimiResult,
  parseManifest,
  pathMatchesAllowedCommitPath,
  transitionAfterQa,
} from '../../scripts/phase-runner/core'
import type {
  CodexResult,
  KimiResult,
  PhaseManifest,
} from '../../scripts/phase-runner/core'

const raw = readFileSync(
  new URL('../../scripts/phase-runner/manifests/phase-6.json', import.meta.url),
  'utf8',
)
const manifest = parseManifest(JSON.parse(raw))
const gates = [
  'npm run lint',
  'npm run typecheck:contracts',
  'npm run validate:contracts',
  'npm run test:unit',
  'npm run test:e2e',
]
const productionAndDeliveryPaths = [
  'components/cockpit/cockpit-hud.tsx',
  'lib/responsive/hud-layout.ts',
  'components/cockpit/test-hooks.ts',
  'tests/unit/hud-layout.test.ts',
  'e2e/smoke.spec.ts',
  'e2e/phase6-deck.spec.ts',
  'e2e/phase4-hud.spec.ts',
  '.github/workflows/ci.yml',
  'tests/unit/e2e-runner.test.ts',
  'docs/responsive-system.md',
  'CLAUDE.md',
  'docs/hud-responsive-layout-plan.md',
  'docs/phase-6-implementation.md',
]
const evidenceNames = [
  'OWNER-CHECKPOINT-TEMPLATE.md',
  'OWNER-CHECKPOINT.md',
  'capture-index.json',
  'deck-1440x900-light.png',
  'deck-1440x900-dark.png',
  'deck-1280x720-light.png',
  'deck-1280x720-dark.png',
  'deck-1024x600-light.png',
  'deck-1024x600-dark.png',
  'deck-1440x900-light-large-controls.png',
  'monitor-1440x900-light.png',
  'crate-1440x900-light.png',
  'crate-1440x900-dark.png',
  'deck-1440x900-light-bob.webm',
]

function initial(candidate = manifest) {
  return createInitialState(candidate, manifestDigest(raw), '2026-10-09T00:00:00.000Z')
}

// Synthetic records exercise pure functions only; these are not QA evidence.
function codexResult(step: string, phase = 6): CodexResult {
  return {
    phase,
    step,
    outcome: 'ready-for-qa',
    summary: 'Synthetic setup test result',
    filesChanged: [],
    gates: gates.map((command) => ({ command, status: 'pass', details: 'synthetic' })),
    unresolvedRisks: [],
    handoff: 'Handoff: synthetic test only.',
  }
}

function qaResult(step: string): KimiResult {
  return {
    phase: 6,
    step,
    verdict: 'pass',
    summary: 'Synthetic setup test result',
    gates: codexResult(step).gates,
    findings: [],
    residualRisks: [],
    nextContext: 'Synthetic test only',
    handoff: 'Handoff: synthetic test only.',
  }
}

function prompts(candidate: PhaseManifest, stepId = candidate.initialStep) {
  const step = getStep(candidate, stepId)
  return [
    buildCodexPrompt(candidate, step, initial(candidate)),
    buildKimiPrompt(candidate, step, codexResult(step.id, candidate.phase)),
  ]
}

describe('Phase 6 setup manifest', () => {
  it('parses the existing schema and starts at step 1 with no preaccepted state', () => {
    expect(manifest.schemaVersion).toBe(1)
    expect(manifest.phase).toBe(6)
    expect(manifest.source).toBe('docs/phase-6-design.md')
    expect(manifest.initialStep).toBe('step-1')
    expect(manifest.initiallyAcceptedThrough).toBeNull()
    expect(initial()).toMatchObject({
      currentStep: 'step-1',
      status: 'ready',
      qaPassedSteps: [],
      ownerAcceptedThrough: null,
      stepCommits: { 'step-1': null, 'step-2': null },
      fixAttempts: { 'step-1': 0, 'step-2': 0 },
      pendingFindings: [],
      lastCodexResult: null,
      lastKimiResult: null,
    })
    expect(() => parseManifest({ ...manifest, initialStep: 'step-2' })).toThrow(
      'initiallyAcceptedThrough may be null only when initialStep is first',
    )
  })

  it('retains exactly five required gates and three fix attempts for both packages', () => {
    expect(manifest.requiredGates).toEqual(gates)
    expect(manifest.maxFixAttempts).toBe(3)
    for (const step of manifest.steps) {
      expect(parseCodexResult(codexResult(step.id), manifest, step).outcome).toBe('ready-for-qa')
      expect(parseKimiResult(qaResult(step.id), manifest, step).verdict).toBe('pass')
      for (const command of gates) {
        const missing = codexResult(step.id)
        missing.gates = missing.gates.filter((gate) => gate.command !== command)
        expect(() => parseCodexResult(missing, manifest, step)).toThrow('missing required gate')
        const red = qaResult(step.id)
        red.gates = red.gates.map((gate) => gate.command === command
          ? { ...gate, status: 'fail' }
          : gate)
        expect(() => parseKimiResult(red, manifest, step)).toThrow('required gate is not green')
      }
    }
  })

  it('stops complete implementation at the owner gate before the only commit step', () => {
    expect(manifest.steps.map((step) => step.id)).toEqual(['step-1', 'step-2'])
    const first = getStep(manifest, 'step-1')
    expect(first.planItems).toEqual([1, 2, 3, 4, 5])
    expect(first.ownerGateAfter).toBe(true)
    expect(first.commitAfterQa).toBeNull()
    expect(() => acceptOwnerGate(manifest, initial())).toThrow('requires awaiting-owner')
    const waiting = transitionAfterQa(manifest, initial(), qaResult('step-1'))
    expect(waiting.currentStep).toBe('step-1')
    expect(waiting.status).toBe('awaiting-owner')
    expect(waiting.ownerAcceptedThrough).toBeNull()
    expect(waiting.stepCommits).toEqual({ 'step-1': null, 'step-2': null })
    expect(() => acceptOwnerGate(manifest, { ...waiting, qaPassedSteps: [] })).toThrow(
      'not configured after independently passed',
    )
    // The real operator must authenticate owner evidence before this pure transition.
    const accepted = acceptOwnerGate(manifest, waiting)
    expect(accepted.currentStep).toBe('step-2')
    expect(accepted.ownerAcceptedThrough).toBe('step-1')
    expect(accepted.lastCodexResult).toBeNull()
    expect(accepted.lastKimiResult).toBeNull()
    expect(accepted.qaPassedSteps).toEqual(['step-1'])
    const final = transitionAfterQa(manifest, accepted, qaResult('step-2'))
    expect(final.status).toBe('complete-awaiting-owner-ci')
    expect(final.qaPassedSteps).toEqual(['step-1', 'step-2'])
  })

  it('has one exact bounded delivery commit with the required final attribution', () => {
    const commits = manifest.steps.filter((step) => step.commitAfterQa)
    expect(commits.map((step) => step.id)).toEqual(['step-2'])
    const delivery = getStep(manifest, 'step-2')
    expect(delivery.ownerGateAfter).toBe(false)
    expect(delivery.planItems).toEqual([5])
    expect(delivery.commitAfterQa?.message.endsWith(
      '\n\nCo-Authored-By: Claude Code <noreply@anthropic.com>',
    )).toBe(true)
    const paths = delivery.commitAfterQa?.paths ?? []
    expect(paths).toEqual([
      ...productionAndDeliveryPaths,
      ...evidenceNames.map((name) => `docs/baselines/phase-6-deck/${name}`),
    ])
    expect(new Set(paths).size).toBe(paths.length)
    expect(paths.every((path) => !path.endsWith('/') && !/[*?]/.test(path))).toBe(true)
  })

  it('excludes protected, design, historical, and out-of-scope paths', () => {
    const paths = getStep(manifest, 'step-2').commitAfterQa?.paths ?? []
    for (const path of [
      'content/portfolio-approvals.json', 'content/another.json',
      'lib/projects/catalog.ts', 'lib/portfolio/profile.ts',
      'lib/responsive/layout-contracts.ts', 'lib/content/content-contracts.ts',
      'app/layout-contract.ts', 'app/globals.css',
      'DESIGN.md', 'AGENTS.md', 'docs/phase-6-design.md', 'docs/phase-6-plan.md',
      'docs/agent-handoff.md', 'docs/phase-runner.md',
      'scripts/phase-runner/core.ts', 'scripts/phase-runner/manifests/phase-6.json',
      'tests/unit/phase6-manifest.test.ts',
      'components/cockpit/globe-canvas.tsx', 'components/cockpit/hud-sampler.ts',
      'components/cockpit/focus-fit-store.ts', 'components/cockpit/vinyl-crate.ts',
      'components/cockpit/turntable.ts', 'components/cockpit/pointer-activation.ts',
      'components/responsive/use-contained-pan.ts',
      'lib/responsive/camera-fit.ts', 'lib/responsive/input-policy.ts',
      'e2e/phase5-fit.spec.ts', 'e2e/phase5-input.spec.ts',
      'e2e/fixtures/phase4-hud-parity.json',
      'docs/baselines/phase-4-scorecard/new.png',
      'docs/baselines/phase-5-input/OWNER-CHECKPOINT-2026-08-14.md',
      'docs/baselines/phase-6-deck/unapproved-extra.png',
      'components/unapproved.tsx', 'docs/unapproved.md',
      'package.json', 'package-lock.json', '.git/config', '.agent-runs/phase-6/state.json',
    ]) {
      expect(pathMatchesAllowedCommitPath(path, paths), path).toBe(false)
    }
  })

  it('makes owner evidence verification explicit in both final-step prompts', () => {
    for (const prompt of prompts(manifest, 'step-2')) {
      expect(prompt).toContain('OWNER-CHECKPOINT.md')
      expect(prompt).toContain('genuinely owner-authored, dated and signed')
      expect(prompt).toContain('outcome blocked')
      expect(prompt).toContain('must precede controller accept')
      expect(prompt).toContain('fresh independent Kimi QA')
      expect(prompt).toContain('not final CI/release acceptance')
    }
    for (const prompt of prompts(manifest)) {
      expect(prompt).toContain('UNFILLED OWNER-CHECKPOINT-TEMPLATE.md')
      expect(prompt).toContain('Stop at awaiting-owner with no commit')
      expect(prompt).toContain('step-2.commitAfterQa.paths')
      expect(prompt).toContain('mutation failure at compact/hintTier (not a precondition)')
    }
  })
})

describe('phase-aware deck boundary in generated Codex and Kimi prompts', () => {
  it.each([2, 3, 4, 5])('preserves the deferred fixme before Phase 6 (phase %i)', (phase) => {
    const earlier = parseManifest(JSON.parse(readFileSync(
      new URL(`../../scripts/phase-runner/manifests/phase-${phase}.json`, import.meta.url),
      'utf8',
    )))
    for (const prompt of prompts(earlier)) {
      expect(prompt).toContain('Preserve the Phase 6 deck-overlap test.fixme')
      expect(prompt).not.toContain('Require the approved Phase 6 deck-overlap test.fixme conversion')
    }
  })

  it.each(['step-1', 'step-2'])('requires approved conversion without contradictory preservation in %s', (step) => {
    for (const prompt of prompts(manifest, step)) {
      expect(prompt).toContain('Require the approved Phase 6 deck-overlap test.fixme conversion to executable coverage')
      expect(prompt).toContain('Phase 4 AC-4 deck-row narrowing and AC-21 boundary amendment')
      expect(prompt).toContain('immutable e2e/fixtures/phase4-hud-parity.json fixture')
      expect(prompt).not.toContain('Preserve the Phase 6 deck-overlap test.fixme')
    }
  })

  it.each([7, 8, 9])('preserves completed coverage in later phase %i', (phase) => {
    // No later-phase manifest is created or executed by this synthetic prompt case.
    const later = parseManifest({
      ...manifest,
      phase,
      steps: [{
        id: 'step-1', title: 'Synthetic later phase', planItems: [1],
        scope: ['Preserve documented scope.'], ownerGateAfter: false,
      }],
    })
    for (const prompt of prompts(later)) {
      expect(prompt).toContain('Preserve completed Phase 6 deck-overlap executable coverage')
      expect(prompt).toContain('never reintroduce the discharged test.fixme')
      expect(prompt).toContain('Keep e2e/fixtures/phase4-hud-parity.json immutable')
      expect(prompt).not.toContain('Preserve the Phase 6 deck-overlap test.fixme')
      expect(prompt).not.toContain('Require the approved Phase 6 deck-overlap test.fixme conversion')
    }
  })
})
