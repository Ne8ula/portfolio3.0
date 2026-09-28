import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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
