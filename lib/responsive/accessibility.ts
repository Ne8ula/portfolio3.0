// Accessibility preference model (§A.6, Phase 1). Pure — no React, no
// browser globals — so precedence and persistence parsing are unit-tested.
// The runtime owner is components/responsive/accessibility-provider.tsx,
// which feeds system signals in from matchMedia and stamps the resolved
// state onto the root element as data attributes.
//
// Precedence (§A.6.1): forced browser/OS behavior → explicit user
// preference → system preference → authored theme → decorative effects.
// This module implements the explicit-vs-system step; `forced-colors`
// stays with the browser and is never overridden here.

import { isRecord } from '@/lib/shared/core'

/** One user-facing setting: follow the system signal or override it. */
export type MotionSetting = 'system' | 'full' | 'reduced'
export type ContrastSetting = 'system' | 'standard' | 'high'
export type TransparencySetting = 'system' | 'standard' | 'reduced'
/** Text/controls have no OS media signal; `system` resolves to standard. */
export type TextSetting = 'system' | 'standard' | 'large'
export type ControlsSetting = 'system' | 'standard' | 'large'

export type AccessibilityPreferences = {
  readonly motion: MotionSetting
  readonly contrast: ContrastSetting
  readonly transparency: TransparencySetting
  readonly text: TextSetting
  readonly controls: ControlsSetting
}

/** What the platform reports (matchMedia at runtime; all-false on server). */
export type SystemAccessibilitySignals = {
  readonly prefersReducedMotion: boolean
  readonly prefersMoreContrast: boolean
  readonly prefersReducedTransparency: boolean
}

/** The single resolved state every consumer (boot, warp, cockpit, routes,
 *  representative page) reads. Mirrors the contract's five
 *  `AccessibilityState` values. */
export type ResolvedAccessibility = {
  readonly reducedMotion: boolean
  readonly highContrast: boolean
  readonly reducedTransparency: boolean
  readonly largeText: boolean
  readonly largeControls: boolean
}

export const DEFAULT_ACCESSIBILITY_PREFERENCES: AccessibilityPreferences = {
  motion: 'system',
  contrast: 'system',
  transparency: 'system',
  text: 'system',
  controls: 'system',
}

export const NO_SYSTEM_SIGNALS: SystemAccessibilitySignals = {
  prefersReducedMotion: false,
  prefersMoreContrast: false,
  prefersReducedTransparency: false,
}

/** localStorage key for explicit overrides (tier 2 guarantee — §A.4.3). */
export const ACCESSIBILITY_STORAGE_KEY = 'cockpit-a11y-v1'

/**
 * Root data attributes carrying the RESOLVED state. CSS keys off these;
 * `prefers-*` media queries remain the no-JavaScript fallback, scoped with
 * `:not([data-a11y-…])` so an explicit override always wins (§A.6.1).
 */
export const ACCESSIBILITY_ATTRIBUTES = {
  motion: 'data-a11y-motion',
  contrast: 'data-a11y-contrast',
  transparency: 'data-a11y-transparency',
  text: 'data-a11y-text',
  controls: 'data-a11y-controls',
} as const

export function resolveAccessibility(
  preferences: AccessibilityPreferences,
  signals: SystemAccessibilitySignals,
): ResolvedAccessibility {
  return {
    reducedMotion:
      preferences.motion === 'system'
        ? signals.prefersReducedMotion
        : preferences.motion === 'reduced',
    highContrast:
      preferences.contrast === 'system'
        ? signals.prefersMoreContrast
        : preferences.contrast === 'high',
    reducedTransparency:
      preferences.transparency === 'system'
        ? signals.prefersReducedTransparency
        : preferences.transparency === 'reduced',
    largeText: preferences.text === 'large',
    largeControls: preferences.controls === 'large',
  }
}

/** Attribute values stamped on the root element for the resolved state. */
export function accessibilityAttributeValues(
  resolved: ResolvedAccessibility,
): Readonly<Record<(typeof ACCESSIBILITY_ATTRIBUTES)[keyof typeof ACCESSIBILITY_ATTRIBUTES], string>> {
  return {
    [ACCESSIBILITY_ATTRIBUTES.motion]: resolved.reducedMotion ? 'reduced' : 'full',
    [ACCESSIBILITY_ATTRIBUTES.contrast]: resolved.highContrast ? 'high' : 'standard',
    [ACCESSIBILITY_ATTRIBUTES.transparency]: resolved.reducedTransparency
      ? 'reduced'
      : 'standard',
    [ACCESSIBILITY_ATTRIBUTES.text]: resolved.largeText ? 'large' : 'standard',
    [ACCESSIBILITY_ATTRIBUTES.controls]: resolved.largeControls ? 'large' : 'standard',
  }
}

const MOTION_VALUES: readonly MotionSetting[] = ['system', 'full', 'reduced']
const CONTRAST_VALUES: readonly ContrastSetting[] = ['system', 'standard', 'high']
const TRANSPARENCY_VALUES: readonly TransparencySetting[] = ['system', 'standard', 'reduced']
const TEXT_VALUES: readonly TextSetting[] = ['system', 'standard', 'large']
const CONTROLS_VALUES: readonly ControlsSetting[] = ['system', 'standard', 'large']

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback
}

/**
 * Parse persisted overrides. Malformed or partial data degrades field-by-
 * field to the system-following defaults — persistence must never be able
 * to wedge the experience.
 */
export function parseStoredPreferences(raw: unknown): AccessibilityPreferences {
  let value: unknown = raw
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw)
    } catch {
      return DEFAULT_ACCESSIBILITY_PREFERENCES
    }
  }
  if (!isRecord(value)) return DEFAULT_ACCESSIBILITY_PREFERENCES
  return {
    motion: pick(value.motion, MOTION_VALUES, 'system'),
    contrast: pick(value.contrast, CONTRAST_VALUES, 'system'),
    transparency: pick(value.transparency, TRANSPARENCY_VALUES, 'system'),
    text: pick(value.text, TEXT_VALUES, 'system'),
    controls: pick(value.controls, CONTROLS_VALUES, 'system'),
  }
}

export function serializePreferences(preferences: AccessibilityPreferences): string {
  return JSON.stringify(preferences)
}

/** True when every setting still follows the system (nothing to persist). */
export function isSystemDefault(preferences: AccessibilityPreferences): boolean {
  return (
    preferences.motion === 'system' &&
    preferences.contrast === 'system' &&
    preferences.transparency === 'system' &&
    preferences.text === 'system' &&
    preferences.controls === 'system'
  )
}
