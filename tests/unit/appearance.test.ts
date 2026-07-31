import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  APPEARANCE_ATTRIBUTE,
  APPEARANCE_EVENT,
  APPEARANCE_STORAGE_KEY,
  appearanceAttributeValue,
  parseStoredAppearance,
  resolveAppearance,
} from '@/lib/responsive/appearance'

describe('document appearance resolution', () => {
  it('follows the system only when no explicit light/dark choice exists', () => {
    expect(resolveAppearance('system', false)).toBe('light')
    expect(resolveAppearance('system', true)).toBe('dark')
    expect(resolveAppearance('light', true)).toBe('light')
    expect(resolveAppearance('dark', false)).toBe('dark')
  })

  it('parses the existing persisted values and degrades malformed values to system', () => {
    expect(parseStoredAppearance('light')).toBe('light')
    expect(parseStoredAppearance('dark')).toBe('dark')
    expect(parseStoredAppearance('system')).toBe('system')
    expect(parseStoredAppearance(null)).toBe('system')
    expect(parseStoredAppearance('sepia')).toBe('system')
  })

  it('maps the resolved value onto the root attribute', () => {
    expect(appearanceAttributeValue('system', true)).toEqual({
      'data-appearance': 'dark',
    })
  })
})

describe('appearance naming contract', () => {
  it('pins the storage key, root attribute, and existing cockpit event', () => {
    expect(APPEARANCE_STORAGE_KEY).toBe('cockpit-theme')
    expect(APPEARANCE_ATTRIBUTE).toBe('data-appearance')
    expect(APPEARANCE_EVENT).toBe('cockpit-theme')
  })

  it('keeps the pre-paint script aligned with the pinned names', () => {
    const layoutSource = readFileSync(
      new URL('../../app/layout.tsx', import.meta.url),
      'utf8',
    )
    expect(layoutSource).toContain(`localStorage.getItem('cockpit-theme')`)
    expect(layoutSource).toContain(`root.setAttribute('data-appearance'`)
  })

  it('keeps the always-reachable dialog wired to the shared appearance contract', () => {
    const dialogSource = readFileSync(
      new URL(
        '../../components/responsive/accessibility-dialog.tsx',
        import.meta.url,
      ),
      'utf8',
    )
    expect(dialogSource).toContain('data-hud="appearance-control"')
    expect(dialogSource).toContain('APPEARANCE_STORAGE_KEY')
    expect(dialogSource).toContain('APPEARANCE_EVENT')
    expect(dialogSource).toContain("setAppearance('system')")
  })
})
