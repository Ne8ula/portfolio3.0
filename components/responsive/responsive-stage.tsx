'use client'
// ResponsiveStage (§A.7 shared primitive, Phase 1): a protected composition
// region with two modes derived from available space:
//
// - `fit`       — normal/large tier: the stage fills its container.
// - `contained` — zoom/narrow tier: the stage keeps the support profile's
//                 minimum normal composition (so the protected layout never
//                 reflows or deforms) inside a pannable scroll region.
//
// Panning is native scrolling: drag/trackpad/wheel work immediately and the
// region is keyboard-operable (focusable, arrow-key scroll) with no
// animated easing, satisfying reduced motion. Scrolling chains to the
// document at the region's edges, so contained panning never traps ordinary
// page scroll (§A.5). Browser zoom is never counter-scaled — the stage uses
// natural CSS pixels only (§A.2).
//
// Phase 1 exercises this on the representative page; Phase 2 integrates it
// into the real page shell (plan §8 Phase 2), after which Phase 3 gives the
// WebGL renderer its sizing contract.

import React from 'react'

import { SUPPORT_PROFILES, type SupportProfileId } from '@/lib/responsive/layout-contract'
import { selectResponsiveTier } from '@/lib/responsive/tiers'

export type ResponsiveStageMode = 'fit' | 'contained'

export function ResponsiveStage({
  children,
  label,
  profileId = 'desktop-laptop-v1',
  regionId,
}: {
  readonly children: React.ReactNode
  /** Accessible name for the pannable region in contained mode. */
  readonly label: string
  readonly profileId?: SupportProfileId
  /** Optional id so inline-controls/description alternatives can point here. */
  readonly regionId?: string
}): React.ReactElement {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [mode, setMode] = React.useState<ResponsiveStageMode>('fit')

  // Containment follows the LIVE CSS VIEWPORT tier (§A.2): the zoom/narrow
  // thresholds are defined against available viewport space, not against
  // whatever box happens to embed the stage — an embedded demo stage must
  // switch modes exactly when a full-bleed one would.
  React.useEffect(() => {
    const update = (): void => {
      const tier = selectResponsiveTier(
        { w: window.innerWidth, h: window.innerHeight },
        profileId,
      )
      setMode(tier === 'zoom-narrow' ? 'contained' : 'fit')
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [profileId])

  const min = SUPPORT_PROFILES[profileId].normalMin
  const contained = mode === 'contained'

  return (
    <div
      ref={containerRef}
      id={regionId}
      className="responsive-stage"
      data-stage-mode={mode}
      // Contained mode is a WCAG "complex region": expose it as a labelled,
      // keyboard-scrollable region instead of silently clipping.
      role={contained ? 'region' : undefined}
      aria-label={contained ? label : undefined}
      tabIndex={contained ? 0 : undefined}
      style={contained ? { overflow: 'auto' } : { overflow: 'hidden' }}
    >
      <div
        className="responsive-stage-surface"
        style={
          contained
            ? { width: min.w, height: min.h, position: 'relative' }
            : { width: '100%', height: '100%', position: 'relative' }
        }
      >
        {children}
      </div>
    </div>
  )
}
