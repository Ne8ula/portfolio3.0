'use client'
// ResponsiveStage (§A.7 shared primitive, Phase 1): a protected composition
// region with two modes derived from available space:
//
// - `fit`       — normal/large tier: the stage fills its container.
// - `contained` — zoom/narrow tier: the stage keeps the support profile's
//                 minimum normal composition (so the protected layout never
//                 reflows or deforms) inside a pannable scroll region.
//
// Native scrolling remains the transport and source of truth. Phase 5 adds
// the contained-only managed input layer (drag/wheel/keyboard, gain,
// drag-release inertia, and reset) without changing the surface ancestry or
// trapping document scroll at the region's bounds.
//
// Phase 1 exercises this on the representative page; Phase 2 integrates it
// into the real page shell (plan §8 Phase 2), after which Phase 3 gives the
// WebGL renderer its sizing contract.

import React from 'react'

import { useAccessibility } from '@/components/responsive/accessibility-provider'
import { useContainedPan } from '@/components/responsive/use-contained-pan'
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
  /** Accessible name for the protected stage region in every mode. */
  readonly label: string
  readonly profileId?: SupportProfileId
  /** Optional id so inline-controls/description alternatives can point here. */
  readonly regionId?: string
}): React.ReactElement {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const surfaceRef = React.useRef<HTMLDivElement>(null)
  const [mode, setMode] = React.useState<ResponsiveStageMode>('fit')
  const { resolved } = useAccessibility()
  const generatedId = React.useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const panDescriptionId = `${regionId ?? `responsive-stage-${generatedId}`}-pan-instructions`

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
  const pan = useContainedPan({
    containerRef,
    surfaceRef,
    mode,
    reducedMotion: resolved.reducedMotion,
  })

  return (
    <div className="responsive-stage-frame">
      <div
        ref={containerRef}
        id={regionId}
        className="responsive-stage"
        data-stage-mode={mode}
        role="region"
        aria-label={label}
        aria-describedby={contained ? panDescriptionId : undefined}
        tabIndex={0}
        style={contained ? { overflow: 'auto' } : { overflow: 'hidden' }}
      >
        <div
          ref={surfaceRef}
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
      {contained ? (
        <div className="pan-instructions" data-hud="pan-instructions">
          <span
            id={panDescriptionId}
            className="pan-instructions-caption"
            aria-hidden={false}
          >
            DRAG · ARROWS/WASD · HOME CENTERS
          </span>
          <button
            type="button"
            className="pan-reset"
            data-hud="pan-reset"
            aria-label="Reset pan to center"
            onClick={pan.reset}
          >
            RESET
          </button>
        </div>
      ) : null}
      <style>{`
        .responsive-stage-frame {
          position: relative;
          width: 100%;
          height: 100%;
        }
        .responsive-stage:focus-visible {
          outline: var(--focus-ring-width) solid var(--focus-ring);
          outline-offset: calc(-1 * var(--focus-ring-width));
        }
        .pan-instructions {
          position: absolute;
          left: 12px;
          bottom: 12px;
          z-index: 120;
          display: flex;
          align-items: stretch;
          width: max-content;
          max-width: calc(100% - 24px);
          box-sizing: border-box;
          background: var(--ink);
          color: var(--cream);
          border: var(--panel-border-width) solid var(--mauve);
          border-radius: var(--radius);
          font-family: var(--font-label);
          text-transform: uppercase;
        }
        .pan-instructions-caption {
          min-width: 0;
          padding: var(--space-2) var(--space-3);
          align-self: center;
          font-size: calc(10px * var(--text-scale));
          line-height: 1.4;
          letter-spacing: .22em;
          white-space: normal;
          overflow-wrap: anywhere;
          pointer-events: none;
        }
        .pan-reset {
          flex: 0 0 auto;
          min-width: var(--control-min);
          min-height: var(--control-min);
          padding: 0 var(--space-3);
          background: var(--cream);
          color: var(--ink);
          border: 0;
          border-left: var(--panel-border-width) solid var(--mauve);
          border-radius: var(--radius);
          font: inherit;
          font-size: calc(10px * var(--text-scale));
          font-weight: 600;
          letter-spacing: .18em;
          cursor: pointer;
        }
        .pan-reset:hover {
          color: var(--jade-deep);
        }
        @media (forced-colors: active) {
          .pan-instructions,
          .pan-reset {
            background: Canvas !important;
            color: CanvasText !important;
            border-color: CanvasText !important;
            forced-color-adjust: auto;
          }
        }
      `}</style>
    </div>
  )
}
