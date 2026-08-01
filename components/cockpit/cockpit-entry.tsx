'use client'

import dynamic from 'next/dynamic'
import React from 'react'

import { SITE_ROUTES } from '@/lib/site/site'

// The three.js runtime stays behind this client-only boundary. The loader is
// rendered only after the one-time capability probe succeeds.
const CockpitApp = dynamic(
  () => import('@/components/cockpit/cockpit-app').then((module) => module.CockpitApp),
  { ssr: false },
)

type WebGlCapability = 'checking' | 'available' | 'unavailable' | 'lost'

export function CockpitEntry(): React.ReactElement | null {
  const [capability, setCapability] = React.useState<WebGlCapability>('checking')
  const [cockpitMounted, setCockpitMounted] = React.useState(false)
  const [restartKey, setRestartKey] = React.useState(0)
  const runtimeNoticeRef = React.useRef<HTMLElement>(null)
  const onCockpitMountChange = React.useCallback((mounted: boolean): void => {
    setCockpitMounted(mounted)
  }, [])
  const onCockpitFatal = React.useCallback((): void => {
    setCapability('lost')
  }, [])

  React.useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
      setCapability(context ? 'available' : 'unavailable')
    } catch {
      setCapability('unavailable')
    }
  }, [])

  React.useEffect(() => {
    if (capability !== 'lost') return
    runtimeNoticeRef.current?.focus({ preventScroll: true })
  }, [capability])

  React.useEffect(() => {
    if (capability !== 'available' || !cockpitMounted) return

    const root = document.documentElement
    const shell = document.querySelector<HTMLElement>(
      '[data-layout-region="app-shell"]',
    )
    const header = shell?.querySelector<HTMLElement>(':scope > header') ?? null
    const main = shell?.querySelector<HTMLElement>(':scope > main') ?? null
    const previousScrollState = root.getAttribute('data-document-scroll')
    const previousHeaderInert = header?.inert ?? false
    const previousMainInert = main?.inert ?? false

    if (header) header.inert = true
    if (main) main.inert = true
    root.setAttribute('data-document-scroll', 'lock')

    return () => {
      if (header) header.inert = previousHeaderInert
      if (main) main.inert = previousMainInert
      if (previousScrollState === null) {
        root.removeAttribute('data-document-scroll')
      } else {
        root.setAttribute('data-document-scroll', previousScrollState)
      }
    }
  }, [capability, cockpitMounted])

  if (capability === 'checking') return null

  if (capability === 'unavailable') {
    return (
      <aside className="home-cockpit-notice" role="status">
        <p>
          The 3D cockpit is unavailable in this browser. Everything is available as
          ordinary pages.
        </p>
        <p>
          <a href={SITE_ROUTES.projects}>View projects</a>
          <span aria-hidden> · </span>
          <a href={SITE_ROUTES.about}>About</a>
        </p>
      </aside>
    )
  }

  if (capability === 'lost') {
    return (
      <aside
        ref={runtimeNoticeRef}
        className="home-cockpit-notice home-cockpit-runtime-notice"
        data-hud="cockpit-runtime-notice"
        role="status"
        tabIndex={-1}
      >
        <p>
          The 3D cockpit stopped after a graphics interruption and could not restart.
          Everything on this site is available as ordinary pages.
        </p>
        <p>
          <a href={SITE_ROUTES.projects}>View projects</a>
          <span aria-hidden> · </span>
          <a href={SITE_ROUTES.about}>About</a>
        </p>
        <p>
          <button
            type="button"
            className="home-cockpit-restart"
            data-hud="renderer-restart"
            onClick={() => {
              setCockpitMounted(false)
              setCapability('available')
              setRestartKey((key) => key + 1)
            }}
          >
            Restart the 3D cockpit
          </button>
        </p>
      </aside>
    )
  }

  return (
    <div
      className="cockpit-shell"
      data-layout-region="cockpit-shell"
      data-cockpit-mounted={cockpitMounted ? 'true' : 'false'}
    >
      <CockpitApp
        key={restartKey}
        onFatal={onCockpitFatal}
        onMountChange={onCockpitMountChange}
      />
    </div>
  )
}
