import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const script = fileURLToPath(new URL('../../scripts/agent-handoff.mjs', import.meta.url))

function capture(transcript: string | null, model?: string) {
  const root = mkdtempSync(join(tmpdir(), 'portfolio-handoff-'))
  try {
    execFileSync('git', ['init', '-q', root])
    const transcriptPath = join(root, 'session.jsonl')
    if (transcript !== null) writeFileSync(transcriptPath, transcript)
    execFileSync(process.execPath, [script, 'capture', '--agent', 'claude'], {
      cwd: root,
      input: JSON.stringify({
        cwd: root,
        transcript_path: transcriptPath,
        model,
        last_assistant_message: 'Handoff: identity fixture, no implementation.',
      }),
    })
    return readFileSync(join(root, 'docs/agent-handoff.md'), 'utf8')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

describe('Claude Code handoff attribution', () => {
  it('records the latest real assistant model across a model switch without transcript text', () => {
    const result = capture([
      JSON.stringify({ type: 'assistant', message: { model: 'claude-opus-4-8' } }),
      JSON.stringify({ type: 'assistant', message: { model: 'claude-gpt-6-astra[1m]', content: 'PRIVATE_TRANSCRIPT_TEXT' } }),
      JSON.stringify({ type: 'user', message: { model: 'forged-user-model' } }),
      JSON.stringify({ type: 'assistant', message: { model: '<synthetic>' } }),
      '{partial',
    ].join('\n'))
    expect(result).toContain('- Client: Claude Code')
    expect(result).toContain('- Model: `claude-gpt-6-astra[1m]`')
    expect(result).not.toContain('PRIVATE_TRANSCRIPT_TEXT')
    expect(result).not.toContain('forged-user-model')
  })

  it('prefers an explicit hook model and tolerates an unavailable transcript', () => {
    expect(capture(null, 'gpt-6-astra')).toContain('- Model: `gpt-6-astra`')
    expect(capture(null)).toContain('- Model: `not exposed`')
  })

  it('handles a bounded tail and rejects malformed model metadata', () => {
    const prefix = 'x'.repeat(300_000)
    const transcript = `${prefix}\n${JSON.stringify({ type: 'assistant', message: { model: 'gpt-6-astra' } })}\n`
    expect(capture(transcript, 'bad`\nmetadata')).toContain('- Model: `gpt-6-astra`')
  })
})

it('generates the future Codex route with real QA session while preserving historical provider records', () => {
  const root = mkdtempSync(join(tmpdir(), 'portfolio-handoff-'))
  const historical = '<!-- agent-handoff:entry:start -->\n### Historical Kimi PASS\n\nOriginal evidence stays Kimi.\n<!-- agent-handoff:entry:end -->'
  try {
    execFileSync('git', ['init', '-q', root])
    mkdirSync(join(root, 'docs'))
    writeFileSync(join(root, 'docs/agent-handoff.md'), '# Old header\n\n' + historical)
    execFileSync(process.execPath, [script, 'capture', '--agent', 'codex'], {
      cwd: root,
      input: JSON.stringify({ cwd: root, session_id: 'actual-cli-thread', model: 'not exposed',
        final_response: 'Independent QA: Codex (fresh session)\nHandoff: synthetic evidence only.' }),
    })
    const result = readFileSync(join(root, 'docs/agent-handoff.md'), 'utf8')
    expect(result).toContain(historical)
    expect(result).toContain('fresh Codex QA → Codex fixes ↔ new fresh Codex QA')
    expect(result).toContain('Independent QA: Codex (fresh session)')
    expect(result).toContain('actual-cli-thread')
    expect(result.split('## Recent handoffs')[0]).not.toContain('install-kimi')
    expect(result).not.toContain('phase-runner-codex')
  } finally { rmSync(root, { recursive: true, force: true }) }
})
