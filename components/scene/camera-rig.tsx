"use client"

import { useEffect, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useSceneStore } from "@/lib/store/scene-store"
import { readsPrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

// First-person desk — camera sits at eye level behind the desk, tilted
// down ~20° like someone leaning forward at their workstation.
const BASE_POSITION = new THREE.Vector3(0, 1.35, 3.2)
const BASE_LOOK_AT = new THREE.Vector3(0, 0.18, -0.2)

// Close-to-paperweight pose — camera sits here while the CSS cube owns the
// viewport. On handoff we tween from this out to BASE_POSITION so the dolly
// reads as "the whole desk pulling back from behind the cube."
const CUBE_POSITION = new THREE.Vector3(-1.2, 0.7, 1.6)
const CUBE_LOOK_AT = new THREE.Vector3(-1.9, 0.3, 0.45)

// CRT frame — Mac sits at world (-1.3, 0.09, -0.1) with a 0.25 rad Y
// rotation; screen face normal is (sin 0.25, 0, cos 0.25). This pose frames
// the jade phosphor dead-centre from ~1m out.
const CRT_POSITION = new THREE.Vector3(-0.97, 0.75, 1.19)
const CRT_LOOK_AT = new THREE.Vector3(-1.22, 0.69, 0.22)

const PARALLAX_X = 0.22
const PARALLAX_Y = 0.12
const PARALLAX_LERP = 0.08

const ZOOM_TWEEN_MS = 1400
const VIEW_TWEEN_MS = 800

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

type Tween = {
  start: number
  durationMs: number
  from: THREE.Vector3
  to: THREE.Vector3
  fromLook: THREE.Vector3
  toLook: THREE.Vector3
  onSettle?: () => void
}

export function CameraRig() {
  const { camera } = useThree()
  const view = useSceneStore((s) => s.view)
  const setView = useSceneStore((s) => s.setView)

  const target = useRef(new THREE.Vector2(0, 0))
  const tween = useRef<Tween | null>(null)
  const currentLook = useRef(BASE_LOOK_AT.clone())
  const reducedMotion = useRef(false)

  useEffect(() => {
    reducedMotion.current = readsPrefersReducedMotion()
  }, [])

  useEffect(() => {
    camera.fov = 52
    camera.near = 0.1
    camera.far = 50
    ;(camera as THREE.PerspectiveCamera).updateProjectionMatrix()
  }, [camera])

  useEffect(() => {
    const handle = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1
      const ny = (e.clientY / window.innerHeight) * 2 - 1
      target.current.set(nx, ny)
    }
    window.addEventListener("pointermove", handle)
    return () => window.removeEventListener("pointermove", handle)
  }, [])

  useEffect(() => {
    const snap = (pos: THREE.Vector3, look: THREE.Vector3) => {
      camera.position.copy(pos)
      currentLook.current.copy(look)
      camera.lookAt(currentLook.current)
      tween.current = null
    }

    if (view === "cube") {
      snap(CUBE_POSITION, CUBE_LOOK_AT)
      return
    }

    if (view === "zooming") {
      if (reducedMotion.current) {
        snap(BASE_POSITION, BASE_LOOK_AT)
        setView("desk")
        return
      }
      tween.current = {
        start: performance.now(),
        durationMs: ZOOM_TWEEN_MS,
        from: camera.position.clone(),
        to: BASE_POSITION.clone(),
        fromLook: currentLook.current.clone(),
        toLook: BASE_LOOK_AT.clone(),
        onSettle: () => setView("desk"),
      }
      return
    }

    if (view === "project") {
      if (reducedMotion.current) {
        snap(CRT_POSITION, CRT_LOOK_AT)
        return
      }
      tween.current = {
        start: performance.now(),
        durationMs: VIEW_TWEEN_MS,
        from: camera.position.clone(),
        to: CRT_POSITION.clone(),
        fromLook: currentLook.current.clone(),
        toLook: CRT_LOOK_AT.clone(),
      }
      return
    }

    if (view === "desk") {
      const dist = camera.position.distanceTo(BASE_POSITION)
      if (dist < 0.01) {
        tween.current = null
        currentLook.current.copy(BASE_LOOK_AT)
        camera.lookAt(currentLook.current)
        return
      }
      if (reducedMotion.current) {
        snap(BASE_POSITION, BASE_LOOK_AT)
        return
      }
      tween.current = {
        start: performance.now(),
        durationMs: VIEW_TWEEN_MS,
        from: camera.position.clone(),
        to: BASE_POSITION.clone(),
        fromLook: currentLook.current.clone(),
        toLook: BASE_LOOK_AT.clone(),
      }
    }
  }, [view, camera, setView])

  useFrame(() => {
    if (tween.current) {
      const now = performance.now()
      const raw = (now - tween.current.start) / tween.current.durationMs
      const t = Math.min(1, Math.max(0, raw))
      const k = easeOutCubic(t)
      camera.position.lerpVectors(tween.current.from, tween.current.to, k)
      currentLook.current.lerpVectors(tween.current.fromLook, tween.current.toLook, k)
      camera.lookAt(currentLook.current)
      if (t >= 1) {
        const settled = tween.current
        tween.current = null
        settled.onSettle?.()
      }
      return
    }

    if (reducedMotion.current) return

    if (view === "desk") {
      const want = BASE_POSITION.clone()
      want.x += target.current.x * PARALLAX_X
      want.y += -target.current.y * PARALLAX_Y
      camera.position.lerp(want, PARALLAX_LERP)
      currentLook.current.lerp(BASE_LOOK_AT, PARALLAX_LERP)
      camera.lookAt(currentLook.current)
      return
    }

    if (view === "project") {
      const want = CRT_POSITION.clone()
      want.x += target.current.x * PARALLAX_X * 0.3
      want.y += -target.current.y * PARALLAX_Y * 0.3
      camera.position.lerp(want, PARALLAX_LERP)
      currentLook.current.lerp(CRT_LOOK_AT, PARALLAX_LERP)
      camera.lookAt(currentLook.current)
      return
    }
  })

  return null
}
