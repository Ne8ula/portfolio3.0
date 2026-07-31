import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { SUPPORT_PROFILES } from '@/lib/responsive/layout-contract'

const css = readFileSync(
  new URL('../../app/globals.css', import.meta.url),
  'utf8',
)

describe('document scroll foundation', () => {
  it('keeps the default document scrollable and scopes overflow locking', () => {
    expect(css).toMatch(
      /html,\s*body\s*\{[\s\S]*?min-height:\s*100%;[\s\S]*?\}/,
    )
    expect(css).toContain('html[data-document-scroll="lock"]')
  })

  it('mirrors the support-profile minimum minus one pixel in CSS', () => {
    const profile = SUPPORT_PROFILES['desktop-laptop-v1']
    expect(css).toContain(`@media (max-width: ${profile.normalMin.w - 1}px),`)
    expect(css).toContain(`(max-height: ${profile.normalMin.h - 1}px)`)
  })
})

describe('document-surface token tier', () => {
  it('declares every required --doc-* token and both explicit appearances', () => {
    for (const token of [
      '--doc-surface',
      '--doc-surface-raised',
      '--doc-surface-sunken',
      '--doc-ink',
      '--doc-ink-muted',
      '--doc-rule',
      '--doc-jade',
      '--doc-jade-strong',
    ]) {
      expect(css).toContain(`${token}:`)
    }
    expect(css).toContain(':root[data-appearance="light"]')
    expect(css).toContain(':root[data-appearance="dark"]')
  })
})
