import { createHash } from 'node:crypto'

export const PHASE_RESULT_MARKER = 'PHASE_RUNNER_RESULT'

export const RUNNER_STATUSES = [
  'ready',
  'codex-running',
  'qa-running',
  'paused',
  'awaiting-owner',
  'blocked',
  'complete-awaiting-owner-ci',
] as const

export type RunnerStatus = (typeof RUNNER_STATUSES)[number]
export type GateStatus = 'pass' | 'fail' | 'not-run'
export type QaVerdict = 'pass' | 'fail' | 'blocked'

export interface PhaseStep {
  id: string
  title: string
  planItems: number[]
  scope: string[]
  ownerGateAfter: boolean
  commitAfterQa: PhaseCommit | null
}

export interface PhaseCommit {
  message: string
  paths: string[]
}

export interface PhaseManifest {
  schemaVersion: 1
  phase: number
  title: string
  source: string
  sourceSection: string
  designAuthorities: string[]
  requiredGates: string[]
  maxFixAttempts: number
  initialStep: string
  initiallyAcceptedThrough: string | null
  steps: PhaseStep[]
}

export interface GateResult {
  command: string
  status: GateStatus
  details: string
}

export interface CodexResult {
  phase: number
  step: string
  outcome: 'ready-for-qa' | 'blocked'
  summary: string
  filesChanged: string[]
  gates: GateResult[]
  unresolvedRisks: string[]
  handoff: string
}

export interface QaFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  blocking: boolean
  file: string
  line: string
  evidence: string
  expected: string
  actual: string
  reproduction: string
}

export interface KimiResult {
  phase: number
  step: string
  verdict: QaVerdict
  summary: string
  gates: GateResult[]
  findings: QaFinding[]
  residualRisks: string[]
  nextContext: string
  handoff: string
}

export interface PhaseRunnerState {
  schemaVersion: 1
  phase: number
  manifestDigest: string
  currentStep: string
  status: RunnerStatus
  qaPassedSteps: string[]
  ownerAcceptedThrough: string | null
  fixAttempts: Record<string, number>
  stepCommits: Record<string, string | null>
  initialDirtyPaths: string[]
  pendingFindings: QaFinding[]
  lastCodexResult: CodexResult | null
  lastKimiResult: KimiResult | null
  lastError: string | null
  updatedAt: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} must be a non-empty string`)
  }
  return value
}

function requireStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`${label} must be an array of strings`)
  }
  return value
}

function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${label} must be a boolean`)
  }
  return value
}

function requireNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} must be a number`)
  }
  return value
}

function parseCommit(value: unknown, label: string): PhaseCommit | null {
  if (value === undefined || value === null) return null
  if (!isRecord(value)) throw new Error(`${label} must be an object or null`)

  const paths = requireStringArray(value.paths, `${label}.paths`)
  if (paths.length === 0) {
    throw new Error(`${label}.paths must contain at least one path`)
  }
  for (const path of paths) {
    if (
      path.startsWith('/') ||
      path === '.' ||
      path.split('/').includes('..')
    ) {
      throw new Error(`${label}.paths contains an unsafe path: ${path}`)
    }
    const normalized = path.replace(/\/+$/, '')
    if (
      normalized === '.git' ||
      normalized.startsWith('.git/') ||
      normalized === '.agent-runs' ||
      normalized.startsWith('.agent-runs/') ||
      normalized === 'content/portfolio-approvals.json' ||
      normalized === 'docs/agent-handoff.md'
    ) {
      throw new Error(`${label}.paths contains a protected path: ${path}`)
    }
  }

  return {
    message: requireString(value.message, `${label}.message`),
    paths,
  }
}

export function manifestDigest(rawManifest: string): string {
  return createHash('sha256').update(rawManifest).digest('hex').slice(0, 16)
}

export function parseManifest(value: unknown): PhaseManifest {
  if (!isRecord(value)) throw new Error('phase manifest must be an object')
  if (value.schemaVersion !== 1) {
    throw new Error('phase manifest schemaVersion must be 1')
  }

  const rawSteps = value.steps
  if (!Array.isArray(rawSteps) || rawSteps.length === 0) {
    throw new Error('phase manifest steps must be a non-empty array')
  }

  const steps = rawSteps.map((rawStep, index): PhaseStep => {
    if (!isRecord(rawStep)) {
      throw new Error(`steps[${index}] must be an object`)
    }
    if (
      !Array.isArray(rawStep.planItems) ||
      rawStep.planItems.some((item) => !Number.isInteger(item))
    ) {
      throw new Error(`steps[${index}].planItems must contain integers`)
    }
    return {
      id: requireString(rawStep.id, `steps[${index}].id`),
      title: requireString(rawStep.title, `steps[${index}].title`),
      planItems: rawStep.planItems as number[],
      scope: requireStringArray(rawStep.scope, `steps[${index}].scope`),
      ownerGateAfter: requireBoolean(
        rawStep.ownerGateAfter,
        `steps[${index}].ownerGateAfter`,
      ),
      commitAfterQa: parseCommit(
        rawStep.commitAfterQa,
        `steps[${index}].commitAfterQa`,
      ),
    }
  })

  const stepIds = new Set(steps.map((step) => step.id))
  if (stepIds.size !== steps.length) {
    throw new Error('phase manifest step ids must be unique')
  }

  const initialStep = requireString(value.initialStep, 'initialStep')
  const initiallyAcceptedThrough =
    value.initiallyAcceptedThrough === null
      ? null
      : requireString(
          value.initiallyAcceptedThrough,
          'initiallyAcceptedThrough',
        )
  if (!stepIds.has(initialStep)) {
    throw new Error('initialStep must match a manifest step id')
  }
  const initialIndex = steps.findIndex((step) => step.id === initialStep)
  if (initiallyAcceptedThrough === null) {
    if (initialIndex !== 0) {
      throw new Error(
        'initiallyAcceptedThrough may be null only when initialStep is first',
      )
    }
  } else {
    if (!stepIds.has(initiallyAcceptedThrough)) {
      throw new Error(
        'initiallyAcceptedThrough must match a manifest step id or be null',
      )
    }
    if (
      steps.findIndex((step) => step.id === initiallyAcceptedThrough) >=
      initialIndex
    ) {
      throw new Error('initiallyAcceptedThrough must precede initialStep')
    }
  }

  const maxFixAttempts = requireNumber(value.maxFixAttempts, 'maxFixAttempts')
  if (!Number.isInteger(maxFixAttempts) || maxFixAttempts < 0) {
    throw new Error('maxFixAttempts must be a non-negative integer')
  }

  return {
    schemaVersion: 1,
    phase: requireNumber(value.phase, 'phase'),
    title: requireString(value.title, 'title'),
    source: requireString(value.source, 'source'),
    sourceSection: requireString(value.sourceSection, 'sourceSection'),
    designAuthorities: requireStringArray(
      value.designAuthorities,
      'designAuthorities',
    ),
    requiredGates: requireStringArray(value.requiredGates, 'requiredGates'),
    maxFixAttempts,
    initialStep,
    initiallyAcceptedThrough,
    steps,
  }
}

export function createInitialState(
  manifest: PhaseManifest,
  digest: string,
  now = new Date().toISOString(),
  initialDirtyPaths: string[] = [],
): PhaseRunnerState {
  const initialIndex = manifest.steps.findIndex(
    (step) => step.id === manifest.initialStep,
  )
  return {
    schemaVersion: 1,
    phase: manifest.phase,
    manifestDigest: digest,
    currentStep: manifest.initialStep,
    status: 'ready',
    qaPassedSteps: manifest.steps.slice(0, initialIndex).map((step) => step.id),
    ownerAcceptedThrough: manifest.initiallyAcceptedThrough,
    fixAttempts: Object.fromEntries(manifest.steps.map((step) => [step.id, 0])),
    stepCommits: Object.fromEntries(
      manifest.steps.map((step) => [step.id, null]),
    ),
    initialDirtyPaths,
    pendingFindings: [],
    lastCodexResult: null,
    lastKimiResult: null,
    lastError: null,
    updatedAt: now,
  }
}

export function parseState(value: unknown, manifest: PhaseManifest): PhaseRunnerState {
  if (!isRecord(value)) throw new Error('runner state must be an object')
  if (value.schemaVersion !== 1 || value.phase !== manifest.phase) {
    throw new Error('runner state does not match the manifest schema or phase')
  }
  const status = requireString(value.status, 'state.status')
  if (!RUNNER_STATUSES.includes(status as RunnerStatus)) {
    throw new Error(`unsupported runner status: ${status}`)
  }
  const currentStep = requireString(value.currentStep, 'state.currentStep')
  if (!manifest.steps.some((step) => step.id === currentStep)) {
    throw new Error(`state references unknown step: ${currentStep}`)
  }

  const ownerAcceptedThrough =
    value.ownerAcceptedThrough === null
      ? null
      : requireString(value.ownerAcceptedThrough, 'state.ownerAcceptedThrough')
  if (
    ownerAcceptedThrough !== null &&
    !manifest.steps.some((step) => step.id === ownerAcceptedThrough)
  ) {
    throw new Error(
      `state owner acceptance references unknown step: ${ownerAcceptedThrough}`,
    )
  }

  const initialDirtyPaths =
    value.initialDirtyPaths === undefined
      ? []
      : requireStringArray(value.initialDirtyPaths, 'state.initialDirtyPaths')
  const stepCommits: Record<string, string | null> = Object.fromEntries(
    manifest.steps.map((step) => [step.id, null]),
  )
  if (value.stepCommits !== undefined) {
    if (!isRecord(value.stepCommits)) {
      throw new Error('state.stepCommits must be an object')
    }
    for (const step of manifest.steps) {
      const commit = value.stepCommits[step.id]
      if (commit !== null && commit !== undefined) {
        stepCommits[step.id] = requireString(
          commit,
          `state.stepCommits.${step.id}`,
        )
      }
    }
  }

  return {
    ...(value as unknown as PhaseRunnerState),
    ownerAcceptedThrough,
    stepCommits,
    initialDirtyPaths,
  }
}

export function getStep(
  manifest: PhaseManifest,
  stepId: string,
): PhaseStep {
  const step = manifest.steps.find((candidate) => candidate.id === stepId)
  if (!step) throw new Error(`unknown phase step: ${stepId}`)
  return step
}

export function nextStep(
  manifest: PhaseManifest,
  stepId: string,
): PhaseStep | null {
  const index = manifest.steps.findIndex((step) => step.id === stepId)
  if (index < 0) throw new Error(`unknown phase step: ${stepId}`)
  return manifest.steps[index + 1] ?? null
}

export function pathMatchesAllowedCommitPath(
  path: string,
  allowedPaths: string[],
): boolean {
  return allowedPaths.some((allowed) => {
    if (allowed.endsWith('/')) return path.startsWith(allowed)
    return path === allowed
  })
}

export function acceptOwnerGate(
  manifest: PhaseManifest,
  state: PhaseRunnerState,
  now = new Date().toISOString(),
): PhaseRunnerState {
  if (state.status !== 'awaiting-owner') {
    throw new Error(
      `owner acceptance requires awaiting-owner state; current state is ${state.status}`,
    )
  }
  const step = getStep(manifest, state.currentStep)
  if (!step.ownerGateAfter || !state.qaPassedSteps.includes(step.id)) {
    throw new Error(
      `owner acceptance is not configured after independently passed ${step.id}`,
    )
  }
  const following = nextStep(manifest, step.id)
  if (!following) {
    throw new Error('final phase acceptance belongs to owner/CI, not phase:accept')
  }

  return {
    ...state,
    currentStep: following.id,
    status: 'ready',
    ownerAcceptedThrough: step.id,
    pendingFindings: [],
    lastCodexResult: null,
    lastKimiResult: null,
    lastError: null,
    updatedAt: now,
  }
}

export function canonicalGateCommand(command: string): string {
  return command.trim().replace(/^CI=true\s+/, '')
}

export function canonicalStepId(value: string): string {
  const match = /^step(?:-|\s+)(\d+)(?=$|[\s:—-])/i.exec(value.trim())
  return match ? `step-${match[1]}` : value.trim()
}

export function validateGateResults(
  gates: GateResult[],
  requiredGates: string[],
): void {
  const byCommand = new Map(
    gates.map((gate) => [canonicalGateCommand(gate.command), gate]),
  )
  for (const required of requiredGates) {
    const result = byCommand.get(canonicalGateCommand(required))
    if (!result) throw new Error(`missing required gate result: ${required}`)
    if (result.status !== 'pass') {
      throw new Error(`required gate is not green: ${required}`)
    }
  }
}

export function isHostRecoverableE2eFailure(
  result: CodexResult,
  requiredGates: string[],
): boolean {
  if (result.outcome !== 'blocked') return false
  const e2eCommand = 'npm run test:e2e'
  const byCommand = new Map(
    result.gates.map((gate) => [canonicalGateCommand(gate.command), gate]),
  )
  for (const required of requiredGates) {
    const canonical = canonicalGateCommand(required)
    const gate = byCommand.get(canonical)
    if (!gate) return false
    if (canonical === e2eCommand) {
      if (
        gate.status !== 'fail' ||
        !/(?:listen\s+EPERM|could not bind|bind(?:ing)?\s+(?:was\s+)?denied.*EPERM|port denial|port-enabled)/i.test(
          gate.details,
        )
      ) {
        return false
      }
    } else if (gate.status !== 'pass') {
      return false
    }
  }
  return !result.gates.some(
    (gate) =>
      gate.status === 'fail' &&
      canonicalGateCommand(gate.command) !== e2eCommand,
  )
}

function parseGateResults(value: unknown, label: string): GateResult[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`)
  return value.map((entry, index) => {
    if (!isRecord(entry)) throw new Error(`${label}[${index}] must be an object`)
    const status = requireString(entry.status, `${label}[${index}].status`)
    if (!['pass', 'fail', 'not-run'].includes(status)) {
      throw new Error(`${label}[${index}].status is invalid`)
    }
    return {
      command: requireString(entry.command, `${label}[${index}].command`),
      status: status as GateStatus,
      details: requireString(entry.details, `${label}[${index}].details`),
    }
  })
}

export function parseCodexResult(
  value: unknown,
  manifest: PhaseManifest,
  step: PhaseStep,
): CodexResult {
  if (!isRecord(value)) throw new Error('Codex result must be an object')
  const reportedStep =
    typeof value.step === 'string' ? canonicalStepId(value.step) : ''
  if (value.phase !== manifest.phase || reportedStep !== step.id) {
    throw new Error('Codex result phase/step does not match the active step')
  }
  const outcome = requireString(value.outcome, 'Codex result outcome')
  if (!['ready-for-qa', 'blocked'].includes(outcome)) {
    throw new Error(`unsupported Codex outcome: ${outcome}`)
  }
  const handoff = requireString(value.handoff, 'Codex result handoff')
  if (!handoff.startsWith('Handoff:')) {
    throw new Error('Codex result handoff must start with "Handoff:"')
  }
  const result: CodexResult = {
    phase: manifest.phase,
    step: step.id,
    outcome: outcome as CodexResult['outcome'],
    summary: requireString(value.summary, 'Codex result summary'),
    filesChanged: requireStringArray(value.filesChanged, 'Codex filesChanged'),
    gates: parseGateResults(value.gates, 'Codex gates'),
    unresolvedRisks: requireStringArray(
      value.unresolvedRisks,
      'Codex unresolvedRisks',
    ),
    handoff,
  }
  if (result.outcome === 'ready-for-qa') {
    validateGateResults(result.gates, manifest.requiredGates)
  }
  return result
}

function parseFindings(value: unknown): QaFinding[] {
  if (!Array.isArray(value)) throw new Error('Kimi findings must be an array')
  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Kimi findings[${index}] must be an object`)
    }
    const severity = requireString(
      entry.severity,
      `Kimi findings[${index}].severity`,
    )
    if (!['critical', 'high', 'medium', 'low', 'info'].includes(severity)) {
      throw new Error(`Kimi findings[${index}].severity is invalid`)
    }
    return {
      severity: severity as QaFinding['severity'],
      blocking: requireBoolean(
        entry.blocking,
        `Kimi findings[${index}].blocking`,
      ),
      file: requireString(entry.file, `Kimi findings[${index}].file`),
      line: requireString(entry.line, `Kimi findings[${index}].line`),
      evidence: requireString(
        entry.evidence,
        `Kimi findings[${index}].evidence`,
      ),
      expected: requireString(
        entry.expected,
        `Kimi findings[${index}].expected`,
      ),
      actual: requireString(entry.actual, `Kimi findings[${index}].actual`),
      reproduction: requireString(
        entry.reproduction,
        `Kimi findings[${index}].reproduction`,
      ),
    }
  })
}

export function parseKimiResult(
  value: unknown,
  manifest: PhaseManifest,
  step: PhaseStep,
): KimiResult {
  if (!isRecord(value)) throw new Error('Kimi result must be an object')
  const reportedStep =
    typeof value.step === 'string' ? canonicalStepId(value.step) : ''
  if (value.phase !== manifest.phase || reportedStep !== step.id) {
    throw new Error('Kimi result phase/step does not match the active step')
  }
  const verdict = requireString(value.verdict, 'Kimi result verdict')
  if (!['pass', 'fail', 'blocked'].includes(verdict)) {
    throw new Error(`unsupported Kimi verdict: ${verdict}`)
  }
  const handoff = requireString(value.handoff, 'Kimi result handoff')
  if (!handoff.startsWith('Handoff:')) {
    throw new Error('Kimi result handoff must start with "Handoff:"')
  }
  const result: KimiResult = {
    phase: manifest.phase,
    step: step.id,
    verdict: verdict as QaVerdict,
    summary: requireString(value.summary, 'Kimi result summary'),
    gates: parseGateResults(value.gates, 'Kimi gates'),
    findings: parseFindings(value.findings),
    residualRisks: requireStringArray(
      value.residualRisks,
      'Kimi residualRisks',
    ),
    nextContext: requireString(value.nextContext, 'Kimi nextContext'),
    handoff,
  }

  if (result.verdict === 'pass') {
    validateGateResults(result.gates, manifest.requiredGates)
    if (result.findings.some((finding) => finding.blocking)) {
      throw new Error('Kimi cannot return PASS with a blocking finding')
    }
  }
  if (result.verdict === 'fail' && !result.findings.some((finding) => finding.blocking)) {
    throw new Error('Kimi FAIL must include at least one blocking finding')
  }
  return result
}

function extractJsonObject(text: string): unknown {
  const markerIndex = text.lastIndexOf(PHASE_RESULT_MARKER)
  if (markerIndex < 0) {
    throw new Error(`Kimi output is missing ${PHASE_RESULT_MARKER}`)
  }
  const afterMarker = text.slice(markerIndex + PHASE_RESULT_MARKER.length)
  const start = afterMarker.indexOf('{')
  const end = afterMarker.lastIndexOf('}')
  if (start < 0 || end <= start) {
    throw new Error('Kimi output marker is not followed by a JSON object')
  }
  return JSON.parse(afterMarker.slice(start, end + 1))
}

function contentText(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(contentText).join('')
  if (!isRecord(value)) return ''
  if (typeof value.text === 'string') return value.text
  if (typeof value.content === 'string') return value.content
  return contentText(value.content)
}

export function extractKimiJson(streamJson: string): unknown {
  const assistantTexts: string[] = []
  for (const line of streamJson.split('\n')) {
    if (!line.trim()) continue
    let record: unknown
    try {
      record = JSON.parse(line)
    } catch {
      continue
    }
    if (!isRecord(record)) continue
    const nestedMessage = isRecord(record.message) ? record.message : null
    const role =
      typeof record.role === 'string'
        ? record.role
        : typeof nestedMessage?.role === 'string'
          ? nestedMessage.role
          : ''
    const type = typeof record.type === 'string' ? record.type : ''
    if (role !== 'assistant' && type !== 'assistant') continue
    const text = contentText(nestedMessage?.content ?? record.content ?? record)
    if (text.includes(PHASE_RESULT_MARKER)) assistantTexts.push(text)
  }

  const marked = assistantTexts.at(-1)
  if (marked) return extractJsonObject(marked)
  return extractJsonObject(streamJson)
}

function formatScope(scope: string[]): string {
  return scope.map((item) => `- ${item}`).join('\n')
}

function formatFindings(findings: QaFinding[]): string {
  if (findings.length === 0) return 'None — this is a new implementation pass.'
  return findings
    .map(
      (finding, index) =>
        `${index + 1}. [${finding.severity.toUpperCase()}] ${finding.file}:${finding.line}\n` +
        `   Evidence: ${finding.evidence}\n` +
        `   Expected: ${finding.expected}\n` +
        `   Actual: ${finding.actual}\n` +
        `   Reproduce: ${finding.reproduction}`,
    )
    .join('\n')
}

function formatCommitBoundary(step: PhaseStep): string {
  if (!step.commitAfterQa) {
    return (
      'This step has no automatic commit. Its approved evidence remains ' +
      'uncommitted across the owner checkpoint and is included by the later ' +
      'manifest commit boundary.'
    )
  }
  return (
    `After independent QA PASS, the controller will create "${step.commitAfterQa.message}" ` +
    'from only these repository paths:\n' +
    step.commitAfterQa.paths.map((path) => `- ${path}`).join('\n')
  )
}

export function buildCodexPrompt(
  manifest: PhaseManifest,
  step: PhaseStep,
  state: PhaseRunnerState,
): string {
  const isFix = state.pendingFindings.length > 0
  return `You are Codex, the planning and engineering lead for this repository.

Implement Phase ${manifest.phase} ${step.id} — ${step.title} only.
This is ${isFix ? 'a fix pass for the same step after independent QA' : 'a new implementation pass'}.

Before acting, read:
- AGENTS.md
- docs/agent-handoff.md
- ${manifest.source} ${manifest.sourceSection}
${manifest.designAuthorities.map((path) => `- ${path}`).join('\n')}
- the live Git status and complete relevant diff

Canonical scope (plan items ${step.planItems.join(', ')}):
${formatScope(step.scope)}

Independent QA findings to address:
${formatFindings(state.pendingFindings)}

Controller commit boundary:
${formatCommitBoundary(step)}

Rules:
- Work only in the shared repository worktree; the phase runner holds the writer lock.
- Preserve every existing owner/agent change. Never reset, clean, stage, or rewrite unrelated work.
- Do not run git add or git commit. After independent QA PASS, the trusted phase controller owns only the manifest-approved commit boundary.
- If the approved design genuinely requires a path outside the controller commit boundary, return outcome "blocked" before editing that path.
- Do not begin another implementation step or a later phase.
- Do not edit, regenerate, stage, or commit content/portfolio-approvals.json.
- Preserve the Phase 6 deck-overlap test.fixme and all other documented phase boundaries.
- Resolve ambiguity by returning outcome "blocked"; do not silently redefine the approved design.
- Run all five required gates and do not return ready-for-qa while any required gate is red:
${manifest.requiredGates.map((gate) => `  - ${gate}`).join('\n')}
- End with a compact Handoff: sentence naming scope, files, verification, risks, and Kimi as next role.
- Your final response must conform exactly to the supplied JSON schema. Do not wrap it in Markdown.

Kimi's nextContext is advisory only. The canonical scope above is authoritative.`
}

export function buildKimiPrompt(
  manifest: PhaseManifest,
  step: PhaseStep,
  codexResult: CodexResult,
): string {
  return `Perform independent, read-only QA for Phase ${manifest.phase} ${step.id} — ${step.title}.

You are in a disposable Git checkout containing the complete live diff. The real
Codex worktree is separate. Do not edit product code, tests, documentation,
configuration, approval records, or Git state. Your agent profile exposes no
Write/Edit tools. Use Bash only for read-only inspection and the required gates.

Before judging:
- read AGENTS.md, docs/agent-handoff.md, ${manifest.source} ${manifest.sourceSection}
- read ${manifest.designAuthorities.join(', ')}
- inspect git status and the complete relevant diff
- verify Codex's report against live files; the report is context, not proof

Canonical scope (plan items ${step.planItems.join(', ')}):
${formatScope(step.scope)}

Codex report:
${JSON.stringify(codexResult, null, 2)}

Run all five gates fresh:
${manifest.requiredGates.map((gate) => `- ${gate}`).join('\n')}

Verdict contract:
- PASS only when every required gate is green, no blocking finding remains,
  the step matches its approved scope, and QA made no repository write.
- FAIL for an actionable defect in this step. Include severity, file/line,
  evidence, expected/actual behavior, and reproduction steps.
- BLOCKED for an owner/design decision, missing authority, environmental
  failure that prevents judgment, or a phase-boundary conflict.
- nextContext may summarize evidence for Codex, but must not choose or redefine
  the next implementation step. The runner owns sequencing.
- handoff must begin with "Handoff:".

Your final assistant message must contain exactly this marker followed by one
JSON object and no prose after the object:

${PHASE_RESULT_MARKER}
{
  "phase": ${manifest.phase},
  "step": "${step.id}",
  "verdict": "pass | fail | blocked",
  "summary": "concise evidence-backed result",
  "gates": [
    {"command": "npm run lint", "status": "pass | fail | not-run", "details": "result"}
  ],
  "findings": [
    {
      "severity": "critical | high | medium | low | info",
      "blocking": true,
      "file": "path or N/A",
      "line": "line or N/A",
      "evidence": "observed evidence",
      "expected": "expected behavior",
      "actual": "actual behavior",
      "reproduction": "steps or N/A"
    }
  ],
  "residualRisks": ["risk or none"],
  "nextContext": "verified context only",
  "handoff": "Handoff: Phase ${manifest.phase} ${step.id} ..."
}`
}

export function transitionAfterQa(
  manifest: PhaseManifest,
  state: PhaseRunnerState,
  result: KimiResult,
  now = new Date().toISOString(),
): PhaseRunnerState {
  const step = getStep(manifest, state.currentStep)
  if (result.step !== step.id) {
    throw new Error('cannot transition with a QA result for another step')
  }

  const next: PhaseRunnerState = {
    ...state,
    lastKimiResult: result,
    lastError: null,
    updatedAt: now,
  }

  if (result.verdict === 'blocked') {
    return { ...next, status: 'blocked' }
  }

  if (result.verdict === 'fail') {
    const attempts = (state.fixAttempts[step.id] ?? 0) + 1
    const fixAttempts = { ...state.fixAttempts, [step.id]: attempts }
    if (attempts > manifest.maxFixAttempts) {
      return {
        ...next,
        status: 'blocked',
        fixAttempts,
        pendingFindings: result.findings,
        lastError: `maximum fix attempts exceeded for ${step.id}`,
      }
    }
    return {
      ...next,
      status: 'ready',
      fixAttempts,
      pendingFindings: result.findings,
    }
  }

  const qaPassedSteps = state.qaPassedSteps.includes(step.id)
    ? state.qaPassedSteps
    : [...state.qaPassedSteps, step.id]
  const following = nextStep(manifest, step.id)
  if (!following) {
    return {
      ...next,
      status: 'complete-awaiting-owner-ci',
      qaPassedSteps,
      pendingFindings: [],
    }
  }
  if (step.ownerGateAfter) {
    return {
      ...next,
      status: 'awaiting-owner',
      qaPassedSteps,
      pendingFindings: [],
    }
  }
  return {
    ...next,
    currentStep: following.id,
    status: 'ready',
    qaPassedSteps,
    pendingFindings: [],
    lastCodexResult: null,
    lastKimiResult: null,
  }
}
