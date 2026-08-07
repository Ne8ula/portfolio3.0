import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { shouldMountHudDebug } from '@/components/cockpit/hud-debug-overlay'

describe('HUD debug overlay production boundary', () => {
  it('requires the explicit query flag and rejects production', () => {
    expect(shouldMountHudDebug('?hudDebug=1', 'development')).toBe(true)
    expect(shouldMountHudDebug('?hudDebug=0', 'development')).toBe(false)
    expect(shouldMountHudDebug('', 'development')).toBe(false)
    expect(shouldMountHudDebug('?hudDebug=1', 'production')).toBe(false)
  })

  it('keeps the mount statically NODE_ENV-guarded and outside data-hud', () => {
    const hudSource = readFileSync(
      resolve(process.cwd(), 'components/cockpit/cockpit-hud.tsx'),
      'utf8',
    )
    const overlaySource = readFileSync(
      resolve(process.cwd(), 'components/cockpit/hud-debug-overlay.tsx'),
      'utf8',
    )

    expect(hudSource).toContain(
      "process.env.NODE_ENV !== 'production' && hudDebug",
    )
    expect(overlaySource).toContain('data-hud-debug-overlay')
    expect(overlaySource).toContain('aria-hidden="true"')
    expect(overlaySource).toContain("pointerEvents:'none'")
    expect(overlaySource).not.toMatch(/data-hud=/)
    expect(overlaySource).not.toMatch(/requestAnimationFrame/)
    expect(overlaySource).not.toMatch(
      /color-mix\([^)]*\b(?:[5-9]|[1-9]\d+)%/,
    )
    expect(overlaySource).not.toMatch(/boxShadow/)
  })
})
