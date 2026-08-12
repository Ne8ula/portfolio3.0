'use client'

import React from 'react'

import {
  PAN_INERTIA_HALFLIFE_MS,
  PAN_INERTIA_MAX_MS,
  PAN_INERTIA_MIN_SPEED_PX_S,
  PAN_FALLBACK_LINE_HEIGHT_PX,
  PAN_KEY_STEP_PX,
  PAN_POSITION_EPSILON_PX,
  PAN_SMOOTHING_TAU_MS,
  POINTER_ACTIVATION_SLOP_PX,
  clampPanOffset,
  inertiaDecay,
  normalizeWheelDelta,
  panStep,
  sizeRatioFor,
} from '@/lib/responsive/input-policy'

type ElementRef<T extends HTMLElement> = React.RefObject<T | null>
type ContainedPanMode = 'fit' | 'contained'

export type ContainedPanSnapshot = {
  readonly mode: ContainedPanMode
  readonly x: number
  readonly y: number
  readonly maxX: number
  readonly maxY: number
  readonly sizeRatio: number
  readonly inertiaActive: boolean
  readonly reducedMotion: boolean
}

type PanProbe = () => ContainedPanSnapshot
let activePanProbe: PanProbe | null = null

/** Development instrumentation seam consumed only by test-hooks.ts. The
 * shared ResponsiveStage never imports cockpit runtime code. */
export function getContainedPanSnapshotForTests(): ContainedPanSnapshot | null {
  return activePanProbe?.() ?? null
}

type UseContainedPanOptions = {
  readonly containerRef: ElementRef<HTMLDivElement>
  readonly surfaceRef: ElementRef<HTMLDivElement>
  readonly mode: ContainedPanMode
  readonly reducedMotion: boolean
}

type DragState = {
  readonly pointerId: number
  readonly downX: number
  readonly downY: number
  lastX: number
  lastY: number
  lastTime: number
  claimed: boolean
  velocityX: number
  velocityY: number
}

type PanController = {
  setMode(mode: ContainedPanMode): void
  setReducedMotion(reduced: boolean): void
  attach(): () => void
  destroy(): void
  reset(): void
  snapshot(): ContainedPanSnapshot
}

const INERTIA_DECAY_PER_SECOND =
  Math.log(2) / (PAN_INERTIA_HALFLIFE_MS / 1000)
const NATIVE_SCROLL_QUANTIZATION_PX = 0.5

function createPanController(
  containerRef: ElementRef<HTMLDivElement>,
  surfaceRef: ElementRef<HTMLDivElement>,
): PanController {
  let mode: ContainedPanMode = 'fit'
  let reducedMotion = false
  let targetX = 0
  let targetY = 0
  let maxX = 0
  let maxY = 0
  let drag: DragState | null = null
  let inertiaVelocityX = 0
  let inertiaVelocityY = 0
  let inertiaStartedAt = 0
  let inertiaActive = false
  let frameId = 0
  let lastFrameTime: number | null = null
  let centerOnRangeReady = false
  let lastWrittenX = 0
  let lastWrittenY = 0
  let detachListeners: (() => void) | null = null

  const container = (): HTMLDivElement | null => containerRef.current

  const ratio = (): number => sizeRatioFor({
    w: window.innerWidth,
    h: window.innerHeight,
  })

  const readRange = (): void => {
    const element = container()
    const surface = surfaceRef.current
    if (!element || !surface) {
      maxX = 0
      maxY = 0
      return
    }
    maxX = Math.max(0, surface.scrollWidth - element.clientWidth)
    maxY = Math.max(0, surface.scrollHeight - element.clientHeight)
  }

  const writeScroll = (x: number, y: number): void => {
    const element = container()
    if (!element) return
    const nextX = clampPanOffset(x, maxX)
    const nextY = clampPanOffset(y, maxY)
    element.scrollLeft = nextX
    element.scrollTop = nextY
    // Browsers may quantize native scroll positions to whole CSS pixels.
    // Attribute the event to the value the element actually committed while
    // retaining the exact accumulator target (which may be a half pixel).
    lastWrittenX = element.scrollLeft
    lastWrittenY = element.scrollTop
  }

  const centerCommittedRange = (): boolean => {
    readRange()
    if (!centerOnRangeReady || (maxX === 0 && maxY === 0)) return false
    targetX = maxX / 2
    targetY = maxY / 2
    centerOnRangeReady = false
    writeScroll(targetX, targetY)
    return true
  }

  const cancelFrame = (): void => {
    if (frameId !== 0) cancelAnimationFrame(frameId)
    frameId = 0
    lastFrameTime = null
  }

  const cancelInertia = (): void => {
    inertiaActive = false
    inertiaVelocityX = 0
    inertiaVelocityY = 0
    inertiaStartedAt = 0
  }

  const releaseDrag = (): void => {
    const element = container()
    const pointerId = drag?.pointerId
    drag = null
    if (
      element &&
      pointerId !== undefined &&
      element.hasPointerCapture(pointerId)
    ) {
      element.releasePointerCapture(pointerId)
    }
  }

  const resyncToNative = (): void => {
    const element = container()
    if (!element) return
    readRange()
    targetX = clampPanOffset(element.scrollLeft, maxX)
    targetY = clampPanOffset(element.scrollTop, maxY)
  }

  const stopForLifecycle = (): void => {
    releaseDrag()
    cancelInertia()
    cancelFrame()
    resyncToNative()
  }

  const frame = (now: number): void => {
    frameId = 0
    const element = container()
    if (!element || mode !== 'contained') {
      cancelFrame()
      return
    }

    const dtMs = lastFrameTime === null ? 0 : Math.max(0, now - lastFrameTime)
    lastFrameTime = now

    if (inertiaActive && dtMs > 0) {
      if (now - inertiaStartedAt >= PAN_INERTIA_MAX_MS) {
        cancelInertia()
      } else {
        const priorX = inertiaVelocityX
        const priorY = inertiaVelocityY
        const nextX = inertiaDecay(priorX, dtMs)
        const nextY = inertiaDecay(priorY, dtMs)
        const displacementX = (priorX - nextX) / INERTIA_DECAY_PER_SECOND
        const displacementY = (priorY - nextY) / INERTIA_DECAY_PER_SECOND
        const proposedX = targetX + displacementX
        const proposedY = targetY + displacementY
        const clampedX = clampPanOffset(proposedX, maxX)
        const clampedY = clampPanOffset(proposedY, maxY)

        targetX = clampedX
        targetY = clampedY
        inertiaVelocityX = clampedX === proposedX ? nextX : 0
        inertiaVelocityY = clampedY === proposedY ? nextY : 0
        if (Math.abs(inertiaVelocityX) < PAN_INERTIA_MIN_SPEED_PX_S) {
          inertiaVelocityX = 0
        }
        if (Math.abs(inertiaVelocityY) < PAN_INERTIA_MIN_SPEED_PX_S) {
          inertiaVelocityY = 0
        }
        if (inertiaVelocityX === 0 && inertiaVelocityY === 0) {
          cancelInertia()
        }
      }
    }

    const deltaX = targetX - element.scrollLeft
    const deltaY = targetY - element.scrollTop
    if (reducedMotion) {
      writeScroll(targetX, targetY)
    } else if (
      Math.abs(deltaX) <= NATIVE_SCROLL_QUANTIZATION_PX &&
      Math.abs(deltaY) <= NATIVE_SCROLL_QUANTIZATION_PX
    ) {
      writeScroll(targetX, targetY)
    } else if (dtMs > 0) {
      const progress = 1 - Math.exp(-dtMs / PAN_SMOOTHING_TAU_MS)
      writeScroll(
        element.scrollLeft + deltaX * progress,
        element.scrollTop + deltaY * progress,
      )
    }

    const unsettled =
      Math.abs(targetX - element.scrollLeft) > NATIVE_SCROLL_QUANTIZATION_PX ||
      Math.abs(targetY - element.scrollTop) > NATIVE_SCROLL_QUANTIZATION_PX
    if (inertiaActive || unsettled) frameId = requestAnimationFrame(frame)
    else lastFrameTime = null
  }

  const ensureFrame = (): void => {
    if (mode !== 'contained' || frameId !== 0) return
    frameId = requestAnimationFrame(frame)
  }

  const applyTargetDelta = (deltaX: number, deltaY: number): boolean => {
    readRange()
    const nextX = clampPanOffset(targetX + deltaX, maxX)
    const nextY = clampPanOffset(targetY + deltaY, maxY)
    const moved = nextX !== targetX || nextY !== targetY
    targetX = nextX
    targetY = nextY
    if (moved) {
      if (reducedMotion) writeScroll(targetX, targetY)
      else ensureFrame()
    }
    return moved
  }

  const reset = (): void => {
    if (mode !== 'contained') return
    cancelInertia()
    readRange()
    targetX = maxX / 2
    targetY = maxY / 2
    if (reducedMotion) writeScroll(targetX, targetY)
    else ensureFrame()
  }

  const setMode = (nextMode: ContainedPanMode): void => {
    if (nextMode === mode) return
    stopForLifecycle()
    mode = nextMode
    if (mode === 'contained') {
      centerOnRangeReady = true
      centerCommittedRange()
    } else {
      centerOnRangeReady = false
    }
  }

  const setReducedMotion = (reduced: boolean): void => {
    reducedMotion = reduced
    if (!reduced || mode !== 'contained') return
    cancelInertia()
    cancelFrame()
    writeScroll(targetX, targetY)
  }

  const attach = (): (() => void) => {
    if (detachListeners) return detachListeners
    const element = container()
    const surface = surfaceRef.current
    if (!element || !surface || mode !== 'contained') return () => {}

    // Try the committed range at listener attachment. If layout has not
    // exposed overflow yet, centerOnRangeReady stays armed and the first
    // ResizeObserver report completes initial/re-entry centering.
    centerCommittedRange()

    const onScroll = (): void => {
      if (
        Math.abs(element.scrollLeft - lastWrittenX) <= PAN_POSITION_EPSILON_PX &&
        Math.abs(element.scrollTop - lastWrittenY) <= PAN_POSITION_EPSILON_PX
      ) {
        return
      }
      cancelInertia()
      cancelFrame()
      resyncToNative()
    }

    const onPointerDown = (event: PointerEvent): void => {
      if (event.button !== 0 || drag !== null) return
      cancelInertia()
      drag = {
        pointerId: event.pointerId,
        downX: event.clientX,
        downY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        lastTime: event.timeStamp,
        claimed: false,
        velocityX: 0,
        velocityY: 0,
      }
    }

    const onPointerMove = (event: PointerEvent): void => {
      const active = drag
      if (!active || active.pointerId !== event.pointerId) return
      const displacement = Math.hypot(
        event.clientX - active.downX,
        event.clientY - active.downY,
      )
      if (!active.claimed && displacement > POINTER_ACTIVATION_SLOP_PX) {
        active.claimed = true
        element.setPointerCapture(event.pointerId)
      }
      if (!active.claimed) return

      event.preventDefault()
      const gain = ratio()
      const deltaX = panStep(-(event.clientX - active.lastX), gain)
      const deltaY = panStep(-(event.clientY - active.lastY), gain)
      // Bound the sampling window to one inertia half-life so a stalled
      // render/main thread does not turn a real drag into an artificial
      // zero-velocity release.
      const dtSeconds = Math.min(
        Math.max(0, event.timeStamp - active.lastTime),
        PAN_INERTIA_HALFLIFE_MS,
      ) / 1000
      applyTargetDelta(deltaX, deltaY)
      if (dtSeconds > 0) {
        active.velocityX = deltaX / dtSeconds
        active.velocityY = deltaY / dtSeconds
      }
      active.lastX = event.clientX
      active.lastY = event.clientY
      active.lastTime = event.timeStamp
    }

    const finishPointer = (event: PointerEvent, allowInertia: boolean): void => {
      const active = drag
      if (!active || active.pointerId !== event.pointerId) return
      const claimed = active.claimed
      const velocityX = active.velocityX
      const velocityY = active.velocityY
      releaseDrag()
      if (!claimed) return
      event.preventDefault()
      if (
        allowInertia &&
        !reducedMotion &&
        (Math.abs(velocityX) >= PAN_INERTIA_MIN_SPEED_PX_S ||
          Math.abs(velocityY) >= PAN_INERTIA_MIN_SPEED_PX_S)
      ) {
        inertiaVelocityX = velocityX
        inertiaVelocityY = velocityY
        inertiaStartedAt = performance.now()
        inertiaActive = true
        ensureFrame()
      }
    }

    const onPointerUp = (event: PointerEvent): void => finishPointer(event, true)
    const onPointerCancel = (event: PointerEvent): void => finishPointer(event, false)
    const onLostPointerCapture = (event: PointerEvent): void => {
      if (drag?.pointerId === event.pointerId) stopForLifecycle()
    }

    const onWheel = (event: WheelEvent): void => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      cancelInertia()
      let axis: 'x' | 'y'
      let rawDelta: number
      if (event.shiftKey && event.deltaX === 0) {
        axis = 'x'
        rawDelta = event.deltaY
      } else if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        axis = 'x'
        rawDelta = event.deltaX
      } else {
        axis = 'y'
        rawDelta = event.deltaY
      }
      if (rawDelta === 0) return

      const computedLineHeight = Number.parseFloat(getComputedStyle(element).lineHeight)
      const lineHeightPx =
        Number.isFinite(computedLineHeight) && computedLineHeight > 0
          ? computedLineHeight
          : PAN_FALLBACK_LINE_HEIGHT_PX
      const normalized = normalizeWheelDelta(rawDelta, event.deltaMode, {
        lineHeightPx,
        pageSizePx: axis === 'x' ? element.clientWidth : element.clientHeight,
      })
      const gained = panStep(normalized, ratio())
      if (applyTargetDelta(axis === 'x' ? gained : 0, axis === 'y' ? gained : 0)) {
        event.preventDefault()
      } else {
        // Consumption is decided by the accumulator. If smoothing still
        // trails an accumulator already at its bound, settle native scroll
        // synchronously before leaving this event unconsumed so the browser
        // can chain it to the document instead of re-consuming it here.
        writeScroll(targetX, targetY)
      }
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (document.activeElement !== element || event.target !== element) return
      const gain = ratio()
      let deltaX = 0
      let deltaY = 0
      let home = false
      switch (event.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          deltaX = -panStep(PAN_KEY_STEP_PX, gain)
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          deltaX = panStep(PAN_KEY_STEP_PX, gain)
          break
        case 'ArrowUp':
        case 'w':
        case 'W':
          deltaY = -panStep(PAN_KEY_STEP_PX, gain)
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          deltaY = panStep(PAN_KEY_STEP_PX, gain)
          break
        case 'PageUp':
          deltaY = -panStep(element.clientHeight, gain)
          break
        case 'PageDown':
          deltaY = panStep(element.clientHeight, gain)
          break
        case 'Home':
          home = true
          break
        default:
          return
      }

      cancelInertia()
      if (home) {
        readRange()
        if (targetX === maxX / 2 && targetY === maxY / 2) return
        reset()
        event.preventDefault()
        return
      }
      if (applyTargetDelta(deltaX, deltaY)) event.preventDefault()
    }

    const onResize = (): void => {
      cancelInertia()
      const priorTargetX = targetX
      const priorTargetY = targetY
      readRange()
      if (centerCommittedRange()) return
      targetX = clampPanOffset(targetX, maxX)
      targetY = clampPanOffset(targetY, maxY)
      if (targetX === priorTargetX && targetY === priorTargetY) return
      if (reducedMotion) writeScroll(targetX, targetY)
      else ensureFrame()
    }

    const onLifecycleCancel = (): void => stopForLifecycle()
    const onVisibilityChange = (): void => {
      if (document.visibilityState !== 'visible') stopForLifecycle()
    }

    const resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(element)
    resizeObserver.observe(surface)
    element.addEventListener('scroll', onScroll)
    element.addEventListener('pointerdown', onPointerDown)
    element.addEventListener('pointermove', onPointerMove)
    element.addEventListener('pointerup', onPointerUp)
    element.addEventListener('pointercancel', onPointerCancel)
    element.addEventListener('lostpointercapture', onLostPointerCapture)
    element.addEventListener('wheel', onWheel, { passive: false })
    element.addEventListener('keydown', onKeyDown)
    element.addEventListener('blur', onLifecycleCancel)
    element.addEventListener('webglcontextlost', onLifecycleCancel, true)
    window.addEventListener('blur', onLifecycleCancel)
    window.addEventListener('pagehide', onLifecycleCancel)
    document.addEventListener('visibilitychange', onVisibilityChange)

    detachListeners = () => {
      resizeObserver.disconnect()
      element.removeEventListener('scroll', onScroll)
      element.removeEventListener('pointerdown', onPointerDown)
      element.removeEventListener('pointermove', onPointerMove)
      element.removeEventListener('pointerup', onPointerUp)
      element.removeEventListener('pointercancel', onPointerCancel)
      element.removeEventListener('lostpointercapture', onLostPointerCapture)
      element.removeEventListener('wheel', onWheel)
      element.removeEventListener('keydown', onKeyDown)
      element.removeEventListener('blur', onLifecycleCancel)
      element.removeEventListener('webglcontextlost', onLifecycleCancel, true)
      window.removeEventListener('blur', onLifecycleCancel)
      window.removeEventListener('pagehide', onLifecycleCancel)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      detachListeners = null
      stopForLifecycle()
    }
    return detachListeners
  }

  return {
    setMode,
    setReducedMotion,
    attach,
    destroy(): void {
      detachListeners?.()
      stopForLifecycle()
    },
    reset,
    snapshot(): ContainedPanSnapshot {
      readRange()
      return {
        mode,
        x: targetX,
        y: targetY,
        maxX,
        maxY,
        sizeRatio: ratio(),
        inertiaActive,
        reducedMotion,
      }
    },
  }
}

export function useContainedPan({
  containerRef,
  surfaceRef,
  mode,
  reducedMotion,
}: UseContainedPanOptions): { readonly reset: () => void } {
  const controllerRef = React.useRef<PanController | null>(null)
  if (controllerRef.current === null) {
    controllerRef.current = createPanController(containerRef, surfaceRef)
  }
  const controller = controllerRef.current

  React.useLayoutEffect(() => {
    controller.setReducedMotion(reducedMotion)
    controller.setMode(mode)
  }, [controller, mode, reducedMotion])

  React.useEffect(() => {
    if (mode !== 'contained') return
    return controller.attach()
  }, [controller, mode])

  React.useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    const probe = (): ContainedPanSnapshot => controller.snapshot()
    activePanProbe = probe
    return () => {
      if (activePanProbe === probe) activePanProbe = null
    }
  }, [controller])

  React.useEffect(() => () => controller.destroy(), [controller])

  return React.useMemo(() => ({ reset: () => controller.reset() }), [controller])
}
