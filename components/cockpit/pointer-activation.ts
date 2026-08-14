// @ts-nocheck
// One canvas-level click arbiter for every cockpit artifact. Hit ownership is
// resolved on pointerdown, but actions wait for a same-pointer, sub-slop
// pointerup so the contained-pan controller can claim drags in Phase 5 step 6.

import { POINTER_ACTIVATION_SLOP_PX } from '@/lib/responsive/input-policy'
import {
  registerPointerActivationProbe,
  unregisterPointerActivationProbe,
} from './test-hooks'

export const POINTER_ACTIVATION_PRIORITY = [
  'crate',
  'deck',
  'coffee',
  'decorations',
  'pc',
] as const

const priorityIndex = new Map(
  POINTER_ACTIVATION_PRIORITY.map((owner, index) => [owner, index]),
)
const arbiters = new WeakMap()
const approvedNativeClicks = new WeakSet()

export function consumePointerActivationClick(target, detail){
  // Keyboard/programmatic activation has no pointer travel to arbitrate and
  // must retain the anchor's native behavior.
  if (detail === 0) return true
  if (!approvedNativeClicks.has(target)) return false
  approvedNativeClicks.delete(target)
  return true
}

function createArbiter(canvas){
  // The Phase 2 deck project anchor is a semantic DOM sibling over the
  // renderer. Listen once at their shared interaction surface so it follows
  // the same exact slop policy without sacrificing native link semantics.
  const interactionSurface = canvas.closest('[data-layout-region="cockpit-stage"]') || canvas
  const entries = new Map()
  const pending = new Map()
  const testPoints = new Map()
  let activationCount = 0
  let lastActivation = null

  const orderedEntries = () => [...entries.values()].sort(
    (a, b) => priorityIndex.get(a.owner) - priorityIndex.get(b.owner),
  )

  const resolveOwner = (point) => {
    for (const entry of orderedEntries()) {
      const hit = entry.hitTest(point)
      if (hit !== null && hit !== undefined) return { entry, hit }
    }
    return null
  }

  const resolveProxy = (target) => {
    const owner = target.getAttribute('data-pointer-activation-owner')
    const key = target.getAttribute('data-pointer-activation-proxy')
    const entry = entries.get(owner)
    if (!entry || !key) return null
    const hit = { key }
    const indexValue = target.getAttribute('data-pointer-activation-index')
    const index = indexValue === null ? null : Number(indexValue)
    if (Number.isInteger(index)) hit.index = index
    return { entry, hit }
  }

  const resolveTestPoint = (point) => {
    // A raycast hit hidden behind ordinary HUD cannot receive the real
    // pointerdown. Keep dev-only point discovery on the same delivery path.
    const target = document.elementFromPoint(point.x, point.y)
    if (!(target instanceof Element)) return null
    const nativeTarget = target.closest('[data-pointer-activation-proxy]')
    if (target !== canvas && nativeTarget === null) return null
    return nativeTarget
      ? resolveProxy(nativeTarget)
      : resolveOwner({ clientX: point.x, clientY: point.y })
  }

  const onPointerDown = (event) => {
    if (event.button !== 0) return
    const nativeTarget = event.target instanceof Element
      ? event.target.closest('[data-pointer-activation-proxy]')
      : null
    if (event.target !== canvas && nativeTarget === null) return
    // A semantic DOM proxy is itself the authored hit surface. Resolving its
    // declared owner/key avoids a one-frame race with the moving 3D card
    // beneath it while retaining a single pending record and action path.
    const resolved = nativeTarget ? resolveProxy(nativeTarget) : resolveOwner(event)
    if (resolved === null) {
      pending.delete(event.pointerId)
      return
    }
    pending.set(event.pointerId, {
      ...resolved,
      downX: event.clientX,
      downY: event.clientY,
      maxDisplacement: 0,
      nativeTarget,
    })
    // Deliberately no preventDefault(), stopPropagation(), or
    // stopImmediatePropagation(): Phase 5 step 6's ancestor pan controller
    // must receive this pointerdown to arm its own candidate.
  }

  const updateDisplacement = (record, event) => {
    const displacement = Math.hypot(
      event.clientX - record.downX,
      event.clientY - record.downY,
    )
    record.maxDisplacement = Math.max(record.maxDisplacement, displacement)
    return record.maxDisplacement
  }

  const onPointerMove = (event) => {
    const record = pending.get(event.pointerId)
    if (!record) return
    if (updateDisplacement(record, event) > POINTER_ACTIVATION_SLOP_PX) {
      pending.delete(event.pointerId)
    }
  }

  const onPointerUp = (event) => {
    const record = pending.get(event.pointerId)
    if (!record) return
    pending.delete(event.pointerId)
    if (updateDisplacement(record, event) > POINTER_ACTIVATION_SLOP_PX) return

    // Suppression moves from the old immediate pointerdown handlers to the
    // one resolved pointerup. Exactly one owner can act for this press.
    event.preventDefault()
    event.stopImmediatePropagation()
    event.stopPropagation()
    record.entry.action(record.hit, event)
    if (record.nativeTarget) {
      approvedNativeClicks.add(record.nativeTarget)
      window.setTimeout(() => approvedNativeClicks.delete(record.nativeTarget), 0)
    }
    activationCount += 1
    lastActivation = {
      owner: record.entry.owner,
      key: record.hit.key,
      count: activationCount,
    }
  }

  const clearPointer = (event) => pending.delete(event.pointerId)
  const clearAll = () => pending.clear()
  const clearWhenHidden = () => {
    if (document.visibilityState === 'hidden') clearAll()
  }

  interactionSurface.addEventListener('pointerdown', onPointerDown)
  interactionSurface.addEventListener('pointermove', onPointerMove)
  interactionSurface.addEventListener('pointerup', onPointerUp)
  interactionSurface.addEventListener('pointercancel', clearPointer)
  interactionSurface.addEventListener('lostpointercapture', clearPointer)
  canvas.addEventListener('webglcontextlost', clearAll)
  window.addEventListener('blur', clearAll)
  window.addEventListener('pagehide', clearAll)
  document.addEventListener('visibilitychange', clearWhenHidden)

  const arbiter = {
    entries,
    pending,
    resolveOwner,
    snapshot: () => {
      const record = pending.values().next().value
      return {
        pendingCount: pending.size,
        pendingActivation: record
          ? { owner: record.entry.owner, key: record.hit.key }
          : null,
        activationCount,
        lastActivation,
      }
    },
    dispose(){
      clearAll()
      interactionSurface.removeEventListener('pointerdown', onPointerDown)
      interactionSurface.removeEventListener('pointermove', onPointerMove)
      interactionSurface.removeEventListener('pointerup', onPointerUp)
      interactionSurface.removeEventListener('pointercancel', clearPointer)
      interactionSurface.removeEventListener('lostpointercapture', clearPointer)
      canvas.removeEventListener('webglcontextlost', clearAll)
      window.removeEventListener('blur', clearAll)
      window.removeEventListener('pagehide', clearAll)
      document.removeEventListener('visibilitychange', clearWhenHidden)
      unregisterPointerActivationProbe()
      arbiters.delete(canvas)
    },
  }

  registerPointerActivationProbe({
    snapshot: arbiter.snapshot,
    candidateAt(point){
      const resolved = resolveOwner(point)
      return resolved === null
        ? null
        : { owner: resolved.entry.owner, key: resolved.hit.key }
    },
    pointFor(key){
      const cached = testPoints.get(key)
      if (cached) {
        const resolved = resolveTestPoint(cached)
        if (resolved?.hit.key === key) return cached
        testPoints.delete(key)
      }
      for (const entry of orderedEntries()) {
        const proposed = entry.testPoint?.(key)
        const points = Array.isArray(proposed) ? proposed : proposed ? [proposed] : []
        for (const point of points) {
          const resolved = resolveTestPoint(point)
          if (resolved?.hit.key === key) {
            testPoints.set(key, point)
            return point
          }
        }
      }
      return null
    },
  })

  return arbiter
}

export function registerPointerActivation(canvas, entry){
  if (!canvas) return () => {}
  if (!priorityIndex.has(entry.owner)) {
    throw new Error(`Unknown pointer-activation owner: ${entry.owner}`)
  }
  let arbiter = arbiters.get(canvas)
  if (!arbiter) {
    arbiter = createArbiter(canvas)
    arbiters.set(canvas, arbiter)
  }
  if (arbiter.entries.has(entry.owner)) {
    throw new Error(`Duplicate pointer-activation owner: ${entry.owner}`)
  }
  const registered = { ...entry }
  arbiter.entries.set(entry.owner, registered)

  let active = true
  return () => {
    if (!active) return
    active = false
    if (arbiter.entries.get(entry.owner) === registered) {
      arbiter.entries.delete(entry.owner)
    }
    for (const [pointerId, record] of arbiter.pending) {
      if (record.entry === registered) arbiter.pending.delete(pointerId)
    }
    if (arbiter.entries.size === 0) arbiter.dispose()
  }
}
