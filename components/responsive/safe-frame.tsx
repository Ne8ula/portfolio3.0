'use client'
// SafeFrame (§A.7 shared primitive, Phase 1): the stage minus edge and
// persistent-chrome reservations. Overlay content placed inside a SafeFrame
// keeps the shared gutter tokens instead of inventing per-component edge
// constants. Phase 4's hud-layout solver builds on this; Phase 1 provides
// only the reservation geometry (no projection).

import React from 'react'

export type SafeFrameInsets = {
  readonly top?: number
  readonly right?: number
  readonly bottom?: number
  readonly left?: number
}

export function SafeFrame({
  children,
  insets,
}: {
  readonly children: React.ReactNode
  /** Extra per-side chrome reservations, added to the shared edge gutter. */
  readonly insets?: SafeFrameInsets
}): React.ReactElement {
  const style: React.CSSProperties = {
    position: 'absolute',
    top: `calc(var(--stage-gutter) + ${insets?.top ?? 0}px)`,
    right: `calc(var(--stage-gutter) + ${insets?.right ?? 0}px)`,
    bottom: `calc(var(--stage-gutter) + ${insets?.bottom ?? 0}px)`,
    left: `calc(var(--stage-gutter) + ${insets?.left ?? 0}px)`,
    pointerEvents: 'none',
  }
  return (
    <div className="safe-frame" style={style}>
      {children}
    </div>
  )
}
