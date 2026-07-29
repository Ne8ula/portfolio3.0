'use client'
// Root AccessibilityProvider (§A.6.2, Phase 1). Mounted from app/layout.tsx
// ABOVE route content and the cockpit phase machine, so boot, warp, cockpit,
// and ordinary routes consume one resolved preference state.
//
// - Initializes from persisted explicit overrides + live system signals.
// - Subscribes to matchMedia changes (never a one-time snapshot).
// - Stamps the resolved state on <html> as data attributes; CSS keys off
//   those, with `prefers-*` media queries as the no-JavaScript fallback.
// - Exposes `introReady`: boot timelines must not start until the
//   ACCESSIBILITY trigger is operable (§A.4.3 tier 2).
// Light/dark cockpit theme state stays separate (cockpit-app.tsx owns it).

import React from 'react'

import {
  ACCESSIBILITY_STORAGE_KEY,
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  NO_SYSTEM_SIGNALS,
  accessibilityAttributeValues,
  isSystemDefault,
  parseStoredPreferences,
  resolveAccessibility,
  serializePreferences,
  type AccessibilityPreferences,
  type ResolvedAccessibility,
  type SystemAccessibilitySignals,
} from '@/lib/responsive/accessibility'

export type AccessibilityContextValue = {
  readonly preferences: AccessibilityPreferences
  readonly resolved: ResolvedAccessibility
  readonly setPreference: <K extends keyof AccessibilityPreferences>(
    key: K,
    value: AccessibilityPreferences[K],
  ) => void
  readonly resetToSystem: () => void
  /** True once the ACCESSIBILITY trigger can receive activation. Boot
   *  timelines are gated on this (§A.4.3 tier 2). */
  readonly introReady: boolean
  readonly markTriggerReady: () => void
  readonly dialogOpen: boolean
  readonly setDialogOpen: (open: boolean) => void
}

const noop = (): void => undefined

const FALLBACK_CONTEXT: AccessibilityContextValue = {
  preferences: DEFAULT_ACCESSIBILITY_PREFERENCES,
  resolved: resolveAccessibility(DEFAULT_ACCESSIBILITY_PREFERENCES, NO_SYSTEM_SIGNALS),
  setPreference: noop,
  resetToSystem: noop,
  // Without a provider there is no trigger to wait for — never deadlock boot.
  introReady: true,
  markTriggerReady: noop,
  dialogOpen: false,
  setDialogOpen: noop,
}

const AccessibilityContext = React.createContext<AccessibilityContextValue>(FALLBACK_CONTEXT)

export function useAccessibility(): AccessibilityContextValue {
  return React.useContext(AccessibilityContext)
}

const SIGNAL_QUERIES = {
  prefersReducedMotion: '(prefers-reduced-motion: reduce)',
  prefersMoreContrast: '(prefers-contrast: more)',
  prefersReducedTransparency: '(prefers-reduced-transparency: reduce)',
} as const

function readSignals(): SystemAccessibilitySignals {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return NO_SYSTEM_SIGNALS
  }
  return {
    prefersReducedMotion: window.matchMedia(SIGNAL_QUERIES.prefersReducedMotion).matches,
    prefersMoreContrast: window.matchMedia(SIGNAL_QUERIES.prefersMoreContrast).matches,
    prefersReducedTransparency: window.matchMedia(
      SIGNAL_QUERIES.prefersReducedTransparency,
    ).matches,
  }
}

function readStoredPreferences(): AccessibilityPreferences {
  if (typeof window === 'undefined') return DEFAULT_ACCESSIBILITY_PREFERENCES
  try {
    return parseStoredPreferences(window.localStorage.getItem(ACCESSIBILITY_STORAGE_KEY))
  } catch {
    return DEFAULT_ACCESSIBILITY_PREFERENCES
  }
}

export function AccessibilityProvider({
  children,
}: {
  readonly children: React.ReactNode
}): React.ReactElement {
  // Lazy-initialized from storage + live system signals ON THE CLIENT, so
  // the first stamping pass below writes the SAME values the pre-paint
  // inline script in app/layout.tsx already stamped — never a brief default
  // flash over them. On the server both readers return system defaults.
  const [preferences, setPreferences] =
    React.useState<AccessibilityPreferences>(readStoredPreferences)
  const [signals, setSignals] = React.useState<SystemAccessibilitySignals>(readSignals)
  const [introReady, setIntroReady] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  // Live matchMedia subscriptions (§A.6.2 gap 2) — never a one-time snapshot.
  React.useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const lists = Object.values(SIGNAL_QUERIES).map((query) => window.matchMedia(query))
    const onChange = (): void => setSignals(readSignals())
    for (const list of lists) list.addEventListener('change', onChange)
    return () => {
      for (const list of lists) list.removeEventListener('change', onChange)
    }
  }, [])

  const resolved = React.useMemo(
    () => resolveAccessibility(preferences, signals),
    [preferences, signals],
  )

  // Stamp the resolved state on <html>. useLayoutEffect so a settings
  // change restyles in the same frame as the state change.
  React.useLayoutEffect(() => {
    const root = document.documentElement
    for (const [attribute, value] of Object.entries(accessibilityAttributeValues(resolved))) {
      root.setAttribute(attribute, value)
    }
  }, [resolved])

  const setPreference = React.useCallback(
    <K extends keyof AccessibilityPreferences>(
      key: K,
      value: AccessibilityPreferences[K],
    ): void => {
      setPreferences((prior) => {
        const next = { ...prior, [key]: value }
        try {
          if (isSystemDefault(next)) {
            window.localStorage.removeItem(ACCESSIBILITY_STORAGE_KEY)
          } else {
            window.localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, serializePreferences(next))
          }
        } catch {
          // Persistence is best-effort (tier 2); the in-session state stands.
        }
        return next
      })
    },
    [],
  )

  const resetToSystem = React.useCallback((): void => {
    try {
      window.localStorage.removeItem(ACCESSIBILITY_STORAGE_KEY)
    } catch {
      // Best-effort removal; in-session state still resets below.
    }
    setPreferences(DEFAULT_ACCESSIBILITY_PREFERENCES)
  }, [])

  const markTriggerReady = React.useCallback((): void => setIntroReady(true), [])

  const value = React.useMemo<AccessibilityContextValue>(
    () => ({
      preferences,
      resolved,
      setPreference,
      resetToSystem,
      introReady,
      markTriggerReady,
      dialogOpen,
      setDialogOpen,
    }),
    [preferences, resolved, setPreference, resetToSystem, introReady, markTriggerReady, dialogOpen],
  )

  return (
    <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
  )
}
