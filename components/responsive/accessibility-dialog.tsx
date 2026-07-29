'use client'
// ACCESSIBILITY trigger + settings dialog (§A.6, Phase 1). The trigger is
// stage chrome, reachable from boot, cockpit, and ordinary routes because
// app/layout.tsx mounts it above the phase machine. Boot timelines are
// gated on this trigger being operable (§A.4.3 tier 2) — it reports
// readiness through the provider's `markTriggerReady`.
//
// Styling is token-driven (globals.css): hard corners, opaque panel
// backing, tokenized focus, ≥44px hit targets that grow under
// large-controls. Boot/warp keep their authored palette; this chrome uses
// the shared panel tokens so it stays legible over both.

import React from 'react'

import type {
  AccessibilityPreferences,
  ContrastSetting,
  ControlsSetting,
  MotionSetting,
  TextSetting,
  TransparencySetting,
} from '@/lib/responsive/accessibility'

import { useAccessibility } from './accessibility-provider'

type SettingKey = keyof AccessibilityPreferences

type SettingOption = { readonly value: string; readonly label: string }

type SettingRow = {
  readonly key: SettingKey
  readonly legend: string
  readonly help: string
  readonly options: readonly SettingOption[]
}

const SETTING_ROWS: readonly SettingRow[] = [
  {
    key: 'motion',
    legend: 'Motion',
    help: 'Reduced skips the boot cinematic and warp and stops nonessential animation.',
    options: [
      { value: 'system', label: 'System' },
      { value: 'full', label: 'Full' },
      { value: 'reduced', label: 'Reduced' },
    ],
  },
  {
    key: 'contrast',
    legend: 'Contrast',
    help: 'High strengthens text, borders, and focus indicators.',
    options: [
      { value: 'system', label: 'System' },
      { value: 'standard', label: 'Standard' },
      { value: 'high', label: 'High' },
    ],
  },
  {
    key: 'transparency',
    legend: 'Transparency',
    help: 'Reduced replaces glass and grain effects with opaque surfaces.',
    options: [
      { value: 'system', label: 'System' },
      { value: 'standard', label: 'Standard' },
      { value: 'reduced', label: 'Reduced' },
    ],
  },
  {
    key: 'text',
    legend: 'Text size',
    help: 'Large increases reading sizes and line spacing.',
    options: [
      { value: 'standard', label: 'Standard' },
      { value: 'large', label: 'Large' },
    ],
  },
  {
    key: 'controls',
    legend: 'Control size',
    help: 'Large expands buttons and hit regions.',
    options: [
      { value: 'standard', label: 'Standard' },
      { value: 'large', label: 'Large' },
    ],
  },
]

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function AccessibilityTrigger(): React.ReactElement | null {
  const { markTriggerReady, dialogOpen, setDialogOpen } = useAccessibility()

  // Render nothing until hydration: the settings dialog is a tier-2
  // guarantee and §A.4.3 forbids emitting an inert settings control shell
  // into the no-JavaScript experience. At tier 1 the visitor is protected
  // by system preferences via CSS media queries.
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  // Boot waits on this signal, so it must fire only after the button is
  // actually committed to the DOM (the render below), never before.
  React.useEffect(() => {
    if (mounted) markTriggerReady()
  }, [mounted, markTriggerReady])

  if (!mounted) return null

  return (
    <>
      <button
        type="button"
        data-hud="accessibility-trigger"
        className="a11y-trigger"
        aria-haspopup="dialog"
        aria-expanded={dialogOpen}
        onClick={() => setDialogOpen(true)}
      >
        <span aria-hidden className="a11y-trigger-mark">
          ◇
        </span>
        Accessibility
      </button>
      {dialogOpen ? <AccessibilityDialog /> : null}
    </>
  )
}

function AccessibilityDialog(): React.ReactElement {
  const { preferences, setPreference, resetToSystem, setDialogOpen } = useAccessibility()
  const panelRef = React.useRef<HTMLDivElement>(null)
  const returnFocusRef = React.useRef<Element | null>(null)

  const close = React.useCallback((): void => setDialogOpen(false), [setDialogOpen])

  // Focus containment: focus the panel on open, cycle Tab inside it, close
  // on Escape, and return focus to the opener on unmount.
  React.useEffect(() => {
    returnFocusRef.current = document.activeElement
    const panel = panelRef.current
    if (panel) {
      const first = panel.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? panel).focus()
    }
    return () => {
      const opener = returnFocusRef.current
      if (opener instanceof HTMLElement) opener.focus()
    }
  }, [])

  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      close()
      return
    }
    if (event.key !== 'Tab') return
    const panel = panelRef.current
    if (!panel) return
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (!first || !last) return
    const active = document.activeElement
    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const setValue = (key: SettingKey, value: string): void => {
    switch (key) {
      case 'motion':
        setPreference('motion', value as MotionSetting)
        break
      case 'contrast':
        setPreference('contrast', value as ContrastSetting)
        break
      case 'transparency':
        setPreference('transparency', value as TransparencySetting)
        break
      case 'text':
        setPreference('text', value as TextSetting)
        break
      case 'controls':
        setPreference('controls', value as ControlsSetting)
        break
    }
  }

  return (
    <div className="a11y-overlay" onClick={close}>
      {/* Dialog panel — clicks inside must not reach the closing backdrop. */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="a11y-dialog-title"
        data-hud="accessibility-dialog"
        className="a11y-dialog"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <h2 id="a11y-dialog-title" className="a11y-dialog-title">
          Accessibility settings
        </h2>
        <p className="a11y-dialog-help">
          System follows your operating-system preference. Explicit choices
          persist on this device.
        </p>

        {SETTING_ROWS.map((row) => {
          // Text/controls have no OS signal, so their rows expose no System
          // option; their stored "system" state resolves to Standard and the
          // Standard radio must show as selected (a row with nothing checked
          // reads as broken).
          const stored = preferences[row.key]
          const selected =
            stored === 'system' && !row.options.some((option) => option.value === 'system')
              ? 'standard'
              : stored
          return (
            <fieldset key={row.key} className="a11y-fieldset">
              <legend className="a11y-legend">{row.legend}</legend>
              <div className="a11y-options" role="presentation">
                {row.options.map((option) => {
                  const id = `a11y-${row.key}-${option.value}`
                  return (
                    <span key={option.value} className="a11y-option">
                      <input
                        type="radio"
                        id={id}
                        name={`a11y-${row.key}`}
                        value={option.value}
                        checked={selected === option.value}
                        onChange={() => setValue(row.key, option.value)}
                      />
                      <label htmlFor={id}>{option.label}</label>
                    </span>
                  )
                })}
              </div>
              <p className="a11y-help">{row.help}</p>
            </fieldset>
          )
        })}

        <div className="a11y-dialog-actions">
          <button type="button" className="a11y-button" onClick={resetToSystem}>
            Use system settings
          </button>
          <button type="button" className="a11y-button a11y-button-primary" onClick={close}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
