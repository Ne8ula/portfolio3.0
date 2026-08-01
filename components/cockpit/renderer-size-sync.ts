import type { PerspectiveCamera, WebGLRenderer } from 'three'

import {
  computeRenderSizeTarget,
  renderSizeTargetsEqual,
} from '@/lib/responsive/render-policy'
import type { RenderSizeTarget } from '@/lib/responsive/render-policy'

type RendererSizeSyncOptions = {
  readonly mount: HTMLElement
  readonly renderer: Pick<WebGLRenderer, 'setPixelRatio' | 'setSize'>
  readonly camera: Pick<PerspectiveCamera, 'aspect' | 'updateProjectionMatrix'>
  readonly onApplied: (target: RenderSizeTarget, sizeVersion: number) => void
}

export type RendererSizeSync = {
  sync(): void
  dispose(): void
}

/**
 * Bind one renderer to one authoritative mount box.
 *
 * ResizeObserver, window resize, DPR media-query changes, and the owner's
 * frame-start call all converge on the same exact equality gate.
 */
export function createRendererSizeSync({
  mount,
  renderer,
  camera,
  onApplied,
}: RendererSizeSyncOptions): RendererSizeSync {
  let applied: RenderSizeTarget | null = null
  let disposed = false
  let sizeVersion = 0
  let resolutionQuery: MediaQueryList | null = null
  let resizeObserver: ResizeObserver | null = null

  const sync = (): void => {
    if (disposed) return

    const box = mount.getBoundingClientRect()
    const target = computeRenderSizeTarget({
      cssWidth: box.width,
      cssHeight: box.height,
      devicePixelRatio: window.devicePixelRatio,
    })
    if (target === null || renderSizeTargetsEqual(target, applied)) return

    const cssSizeChanged =
      applied === null ||
      target.cssWidth !== applied.cssWidth ||
      target.cssHeight !== applied.cssHeight
    const dprChanged = applied === null || target.dpr !== applied.dpr

    if (cssSizeChanged) {
      camera.aspect = target.cssWidth / target.cssHeight
      camera.updateProjectionMatrix()
    }
    if (dprChanged) renderer.setPixelRatio(target.dpr)
    if (cssSizeChanged || dprChanged) {
      renderer.setSize(target.cssWidth, target.cssHeight, false)
    }

    applied = target
    sizeVersion += 1
    onApplied(target, sizeVersion)
  }

  const removeResolutionQuery = (): void => {
    resolutionQuery?.removeEventListener('change', onResolutionChange)
    resolutionQuery = null
  }

  const armResolutionQuery = (): void => {
    if (disposed || typeof window.matchMedia !== 'function') return
    resolutionQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    resolutionQuery.addEventListener('change', onResolutionChange)
  }

  function onResolutionChange(): void {
    sync()
    removeResolutionQuery()
    armResolutionQuery()
  }

  window.addEventListener('resize', sync)

  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(sync)
    try {
      resizeObserver.observe(mount, { box: 'border-box' })
    } catch {
      resizeObserver.observe(mount)
    }
  }

  armResolutionQuery()

  return {
    sync,
    dispose(): void {
      if (disposed) return
      disposed = true
      resizeObserver?.disconnect()
      resizeObserver = null
      window.removeEventListener('resize', sync)
      removeResolutionQuery()
      applied = null
    },
  }
}
