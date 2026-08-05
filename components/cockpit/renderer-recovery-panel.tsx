'use client'

import React from 'react'

import type { ContextLifecycleStatus } from '@/lib/responsive/context-lifecycle'
import { SITE_ROUTES } from '@/lib/site/site'

const PANEL_DELAY_MS = 250

export function RendererRecoveryPanel({
  announcement,
  status,
}: {
  readonly announcement: string
  readonly status: ContextLifecycleStatus
}): React.ReactElement {
  const panelRef = React.useRef<HTMLDivElement>(null)
  const recovering = status === 'lost' || status === 'restoring'
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    if (!recovering) {
      setVisible(false)
      return
    }
    const timer = window.setTimeout(() => setVisible(true), PANEL_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [recovering])

  React.useEffect(() => {
    if (!visible) return
    panelRef.current?.focus({ preventScroll: true })
  }, [visible])

  return (
    <>
      {recovering ? (
        <div
          aria-hidden="true"
          className="renderer-recovery-backdrop"
          data-renderer-recovery-backdrop
        />
      ) : null}
      <p
        className="renderer-status"
        data-hud="renderer-status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </p>
      {visible ? (
        <div
          ref={panelRef}
          className="renderer-recovery"
          data-hud="renderer-recovery"
          role="group"
          aria-labelledby="renderer-recovery-label"
          aria-describedby="renderer-recovery-copy"
          tabIndex={-1}
        >
          <p id="renderer-recovery-label" className="renderer-recovery-label">
            3D · INTERRUPTED
          </p>
          <p id="renderer-recovery-copy" className="renderer-recovery-copy">
            {status === 'lost'
              ? 'The 3D scene was interrupted. Waiting for the graphics system…'
              : 'Restoring the scene…'}
          </p>
          <a className="renderer-recovery-link" href={SITE_ROUTES.projects}>
            View projects
          </a>
        </div>
      ) : null}
    </>
  )
}
