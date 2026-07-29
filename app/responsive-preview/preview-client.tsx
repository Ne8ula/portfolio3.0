'use client'
// Client body of the Phase 1 representative page. Composes ONLY the shared
// primitives (ResponsivePage, ResponsiveStage, SafeFrame,
// AccessibleExperienceLink, AccessibilityProvider context) so the
// foundation is demonstrably cockpit-independent.

import React from 'react'

import { AccessibleExperienceLink } from '@/components/responsive/accessible-experience-link'
import { useAccessibility } from '@/components/responsive/accessibility-provider'
import { ResponsivePage, useResponsiveTier } from '@/components/responsive/responsive-page'
import { ResponsiveStage } from '@/components/responsive/responsive-stage'
import { SafeFrame } from '@/components/responsive/safe-frame'

import { RESPONSIVE_PREVIEW_LAYOUT_CONTRACT } from './layout-contract'

export function ResponsivePreviewClient(): React.ReactElement {
  return (
    <ResponsivePage contractId={RESPONSIVE_PREVIEW_LAYOUT_CONTRACT.id}>
      <main>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-display)', lineHeight: 1.1, margin: 0 }}>
          Responsive foundation
        </h1>
        <p style={{ maxWidth: '60ch' }}>
          This page demonstrates the Phase 1 shared system: viewport tiers,
          the contained stage, the safe frame, and the accessibility
          settings. It uses no cockpit code. Resize the window, zoom the
          browser, or open the <strong>Accessibility</strong> panel
          (bottom-left) to watch each state respond.
        </p>

        <TierReadout />
        <AccessibilityReadout />

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-heading)' }}>
          Contained stage
        </h2>
        <p id="preview-stage-desc" style={{ maxWidth: '60ch' }}>
          The box below is a placeholder protected composition. In the
          normal and large tiers it fits the available width. Below the
          normal thresholds it keeps its designed 1024×600 composition and
          becomes a pannable region — scroll or use arrow keys inside it —
          while this ordinary text keeps reflowing down to a 320px content
          width. Browser zoom is never counter-scaled.
        </p>
        <div style={{ height: 'min(60vh, 480px)', border: '1px solid var(--ink-faint)' }}>
          <ResponsiveStage label="Preview stage (pannable demonstration region)" regionId="preview-stage">
            <PlaceholderComposition />
            <SafeFrame>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  border: '1px dashed var(--jade)',
                }}
                aria-hidden
              />
            </SafeFrame>
          </ResponsiveStage>
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-heading)' }}>
          Accessible experience link
        </h2>
        <p style={{ maxWidth: '60ch' }}>
          Protected regions declare a DOM alternative. This one points at the
          in-page settings summary above:
        </p>
        <AccessibleExperienceLink
          alternative={{ kind: 'inline-controls', regionId: 'a11y-state-readout' }}
        >
          Jump to the accessibility state summary
        </AccessibleExperienceLink>
      </main>
    </ResponsivePage>
  )
}

function TierReadout(): React.ReactElement {
  const tier = useResponsiveTier()
  return (
    <section aria-labelledby="tier-readout-heading">
      <h2 id="tier-readout-heading" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-heading)' }}>
        Viewport tier
      </h2>
      <p>
        Current tier: <strong data-preview-tier={tier}>{tier}</strong>
      </p>
      <ul>
        <li>normal — 1024×600 through 3440×1536: full designed composition.</li>
        <li>zoom-narrow — below either normal threshold: ordinary content reflows; stages become contained and pannable.</li>
        <li>large — above the normal maximum: designed scale is capped and negative space grows.</li>
      </ul>
    </section>
  )
}

const STATE_LABELS = {
  reducedMotion: 'Reduced motion',
  highContrast: 'High contrast',
  reducedTransparency: 'Reduced transparency',
  largeText: 'Large text',
  largeControls: 'Large controls',
} as const

function AccessibilityReadout(): React.ReactElement {
  const { resolved } = useAccessibility()
  // The provider's client state is lazy-initialized from storage, so the
  // hydration render can differ from the server HTML; show live values only
  // after mount (this readout is a JS demonstration, not tier-1 content).
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  return (
    <section
      id="a11y-state-readout"
      aria-labelledby="a11y-readout-heading"
      tabIndex={-1}
    >
      <h2 id="a11y-readout-heading" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-heading)' }}>
        Accessibility state
      </h2>
      <p>
        Resolved from your explicit choices and system preferences (explicit
        wins; forced colors always wins in the browser):
      </p>
      <ul>
        {(Object.keys(STATE_LABELS) as ReadonlyArray<keyof typeof STATE_LABELS>).map((key) => (
          <li
            key={key}
            data-preview-state={key}
            data-active={mounted ? (resolved[key] ? 'true' : 'false') : undefined}
          >
            {STATE_LABELS[key]}: <strong>{mounted ? (resolved[key] ? 'on' : 'off') : '…'}</strong>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Decorative 2D stand-in for a protected composition (no WebGL). */
function PlaceholderComposition(): React.ReactElement {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'radial-gradient(ellipse at 30% 20%, var(--page-grad-1), var(--page-grad-2) 45%, var(--page-grad-3) 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          fontFamily: 'var(--font-label)',
          fontSize: 'var(--text-label)',
          letterSpacing: '.22em',
          textTransform: 'uppercase',
          color: 'var(--ink-soft)',
        }}
      >
        protected composition · 1024×600 minimum
      </div>
      {(['12%', '50%', '88%'] as const).map((x) =>
        (['20%', '80%'] as const).map((y) => (
          <span
            key={`${x}-${y}`}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: 8,
              height: 8,
              transform: 'translate(-50%, -50%)',
              border: '1px solid var(--jade)',
            }}
          />
        )),
      )}
    </div>
  )
}
