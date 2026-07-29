// Accessibility preference model tests (§A.6, Phase 1): precedence of
// explicit overrides vs system signals, persistence parsing, and the
// resolved root-attribute values CSS keys off.

import { describe, expect, it } from 'vitest'

import {
  ACCESSIBILITY_ATTRIBUTES,
  ACCESSIBILITY_STORAGE_KEY,
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  NO_SYSTEM_SIGNALS,
  accessibilityAttributeValues,
  isSystemDefault,
  parseStoredPreferences,
  resolveAccessibility,
  serializePreferences,
} from '@/lib/responsive/accessibility'

describe('resolveAccessibility — §A.6.1 precedence', () => {
  it('follows system signals when every setting is "system"', () => {
    const resolved = resolveAccessibility(DEFAULT_ACCESSIBILITY_PREFERENCES, {
      prefersReducedMotion: true,
      prefersMoreContrast: true,
      prefersReducedTransparency: false,
    })
    expect(resolved).toEqual({
      reducedMotion: true,
      highContrast: true,
      reducedTransparency: false,
      largeText: false,
      largeControls: false,
    })
  })

  it('explicit "full"/"standard" overrides win over system signals', () => {
    const resolved = resolveAccessibility(
      {
        motion: 'full',
        contrast: 'standard',
        transparency: 'standard',
        text: 'system',
        controls: 'system',
      },
      {
        prefersReducedMotion: true,
        prefersMoreContrast: true,
        prefersReducedTransparency: true,
      },
    )
    expect(resolved.reducedMotion).toBe(false)
    expect(resolved.highContrast).toBe(false)
    expect(resolved.reducedTransparency).toBe(false)
  })

  it('explicit "reduced"/"high"/"large" overrides win with no system signal', () => {
    const resolved = resolveAccessibility(
      {
        motion: 'reduced',
        contrast: 'high',
        transparency: 'reduced',
        text: 'large',
        controls: 'large',
      },
      NO_SYSTEM_SIGNALS,
    )
    expect(resolved).toEqual({
      reducedMotion: true,
      highContrast: true,
      reducedTransparency: true,
      largeText: true,
      largeControls: true,
    })
  })

  it('text/controls "system" resolves to standard (no OS media signal)', () => {
    const resolved = resolveAccessibility(DEFAULT_ACCESSIBILITY_PREFERENCES, NO_SYSTEM_SIGNALS)
    expect(resolved.largeText).toBe(false)
    expect(resolved.largeControls).toBe(false)
  })
})

describe('parseStoredPreferences — persistence never wedges the experience', () => {
  it('round-trips serialized preferences', () => {
    const prefs = {
      motion: 'reduced',
      contrast: 'high',
      transparency: 'standard',
      text: 'large',
      controls: 'system',
    } as const
    expect(parseStoredPreferences(serializePreferences(prefs))).toEqual(prefs)
  })

  it('degrades malformed JSON to system defaults', () => {
    expect(parseStoredPreferences('{not json')).toEqual(DEFAULT_ACCESSIBILITY_PREFERENCES)
    expect(parseStoredPreferences(null)).toEqual(DEFAULT_ACCESSIBILITY_PREFERENCES)
    expect(parseStoredPreferences(42)).toEqual(DEFAULT_ACCESSIBILITY_PREFERENCES)
    expect(parseStoredPreferences([])).toEqual(DEFAULT_ACCESSIBILITY_PREFERENCES)
  })

  it('degrades unknown field values individually, keeping valid ones', () => {
    const parsed = parseStoredPreferences(
      JSON.stringify({ motion: 'chaotic', contrast: 'high', text: 'large' }),
    )
    expect(parsed).toEqual({
      motion: 'system',
      contrast: 'high',
      transparency: 'system',
      text: 'large',
      controls: 'system',
    })
  })

  it('flags system-default preference sets (nothing worth persisting)', () => {
    expect(isSystemDefault(DEFAULT_ACCESSIBILITY_PREFERENCES)).toBe(true)
    expect(isSystemDefault({ ...DEFAULT_ACCESSIBILITY_PREFERENCES, text: 'large' })).toBe(false)
  })
})

describe('root data attributes', () => {
  it('pins the storage key and attribute names the inline script mirrors', () => {
    // app/layout.tsx duplicates these in its pre-hydration inline script
    // (it cannot import modules); this pin catches silent drift.
    expect(ACCESSIBILITY_STORAGE_KEY).toBe('cockpit-a11y-v1')
    expect(ACCESSIBILITY_ATTRIBUTES).toEqual({
      motion: 'data-a11y-motion',
      contrast: 'data-a11y-contrast',
      transparency: 'data-a11y-transparency',
      text: 'data-a11y-text',
      controls: 'data-a11y-controls',
    })
  })

  it('maps the resolved state onto attribute values', () => {
    const values = accessibilityAttributeValues({
      reducedMotion: true,
      highContrast: false,
      reducedTransparency: true,
      largeText: false,
      largeControls: true,
    })
    expect(values).toEqual({
      'data-a11y-motion': 'reduced',
      'data-a11y-contrast': 'standard',
      'data-a11y-transparency': 'reduced',
      'data-a11y-text': 'standard',
      'data-a11y-controls': 'large',
    })
  })
})
