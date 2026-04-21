"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useFrame } from "@react-three/fiber"
import { useTexture } from "@react-three/drei"
import * as THREE from "three"
import { type Project, projectById } from "@/lib/projects"
import { useSceneStore } from "@/lib/store/scene-store"
import {
  getCrateSlotWorldPose,
  getPlatterWorldPose,
} from "@/lib/scene/vinyl-layout"
import { readsPrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

// Timing — matches CLAUDE.md Phase 5 spec (≤1.2s forward).
const LIFT_MS = 300
const ARC_MS = 700
const FORWARD_MS = LIFT_MS + ARC_MS // 1000
const REVERSE_ARC_MS = 700
const REVERSE_DROP_MS = 300
const REVERSE_MS = REVERSE_ARC_MS + REVERSE_DROP_MS // 1000

const LIFT_Y = 0.3
const ARC_APEX_Y = 0.4
const SLEEVE_DRIFT_Y = 0.3
const SLEEVE_SPLIT_T = 0.55

const PLATTER_RPM = 33
const PLATTER_RAD_PER_SEC = (PLATTER_RPM / 60) * 2 * Math.PI

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

function bezierQuad(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  t: number,
  out: THREE.Vector3,
) {
  const u = 1 - t
  out.x = u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x
  out.y = u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y
  out.z = u * u * p0.z + 2 * u * t * p1.z + t * t * p2.z
  return out
}

type Phase =
  | { kind: "idle" }
  | { kind: "forward"; startMs: number }
  | { kind: "playing" }
  | { kind: "reverse"; startMs: number }

// Persistent transport component — mounted once in scene-content. When
// selectedVinylId changes, runs the lift → arc → split → spin animation;
// on eject, reverses. Keeps its `effectiveId` alive through the reverse arc
// so the returning sleeve has a project to texture from.
export function VinylTransport() {
  const selectedId = useSceneStore((s) => s.selectedVinylId)
  const setTransportActive = useSceneStore((s) => s.setTransportActive)

  const [effectiveId, setEffectiveId] = useState<string | null>(null)
  const phaseRef = useRef<Phase>({ kind: "idle" })

  // Dev override: `?view=project` should skip the arc and land directly in
  // playing state. We read the URL here because SceneCanvas's seeding effect
  // may or may not have fired yet — this is order-independent.
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("view") !== "project") return
    const s = useSceneStore.getState()
    const id = s.selectedVinylId ?? "design-01"
    setEffectiveId(id)
    phaseRef.current = { kind: "playing" }
    setTransportActive(id)
    if (s.selectedVinylId !== id || s.view !== "project") {
      s.selectVinyl(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const reduce = readsPrefersReducedMotion()
    if (selectedId) {
      if (effectiveId !== selectedId) {
        setEffectiveId(selectedId)
        phaseRef.current = reduce
          ? { kind: "playing" }
          : { kind: "forward", startMs: performance.now() }
        setTransportActive(selectedId)
      }
    } else if (effectiveId && phaseRef.current.kind !== "reverse") {
      if (reduce) {
        // Snap straight to idle — no arc back.
        setEffectiveId(null)
        phaseRef.current = { kind: "idle" }
        setTransportActive(null)
      } else {
        phaseRef.current = { kind: "reverse", startMs: performance.now() }
      }
    }
  }, [selectedId, effectiveId, setTransportActive])

  const project = effectiveId ? projectById(effectiveId) : null
  if (!project) return null

  return (
    <Suspense fallback={null}>
      <TransportBody
        key={project.id}
        project={project}
        phaseRef={phaseRef}
        onReverseDone={() => {
          setEffectiveId(null)
          phaseRef.current = { kind: "idle" }
          setTransportActive(null)
        }}
      />
    </Suspense>
  )
}

function TransportBody({
  project,
  phaseRef,
  onReverseDone,
}: {
  project: Project
  phaseRef: React.MutableRefObject<Phase>
  onReverseDone: () => void
}) {
  const sleeveRef = useRef<THREE.Group>(null)
  const recordRef = useRef<THREE.Group>(null)
  const recordSpinRef = useRef<THREE.Group>(null)

  const slotPose = useMemo(() => getCrateSlotWorldPose(project.id), [project.id])
  const platterPose = useMemo(() => getPlatterWorldPose(), [])

  const coverTex = useTexture(project.coverArt) as THREE.Texture

  const sleeveMaterial = useMemo(() => {
    coverTex.anisotropy = 4
    coverTex.needsUpdate = true
    return new THREE.MeshToonMaterial({
      map: coverTex,
      color: "#f4f1e8",
      transparent: true,
      opacity: 1,
    })
  }, [coverTex])

  const spineMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(project.accentColor),
        transparent: true,
        opacity: 1,
      }),
    [project.accentColor],
  )

  const recordBodyMaterial = useMemo(
    () =>
      new THREE.MeshToonMaterial({
        color: "#0a0a0a",
        transparent: true,
        opacity: 1,
      }),
    [],
  )
  const recordLabelMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(project.accentColor),
        transparent: true,
        opacity: 1,
      }),
    [project.accentColor],
  )

  const tmpPos = useRef(new THREE.Vector3())
  const p0 = useRef(new THREE.Vector3())
  const p1 = useRef(new THREE.Vector3())
  const p2 = useRef(new THREE.Vector3())
  const reverseSettledRef = useRef(false)

  useFrame((_, delta) => {
    const sleeve = sleeveRef.current
    const record = recordRef.current
    const recordSpin = recordSpinRef.current
    if (!sleeve || !record || !recordSpin) return

    const phase = phaseRef.current
    const now = performance.now()

    if (phase.kind === "idle") {
      sleeve.visible = false
      record.visible = false
      return
    }

    if (phase.kind === "forward") {
      const elapsed = now - phase.startMs

      if (elapsed < LIFT_MS) {
        // Lift from crate slot.
        const t = elapsed / LIFT_MS
        const k = easeOutCubic(t)
        const liftY = LIFT_Y * k

        sleeve.position.set(
          slotPose.position.x,
          slotPose.position.y + liftY,
          slotPose.position.z,
        )
        sleeve.rotation.set(
          slotPose.rotation.x,
          slotPose.rotation.y,
          slotPose.rotation.z,
        )
        record.position.copy(sleeve.position)
        record.rotation.copy(sleeve.rotation)

        sleeve.visible = true
        record.visible = false
        sleeveMaterial.opacity = 1
        spineMaterial.opacity = 1
      } else if (elapsed < FORWARD_MS) {
        // Arc from lifted pose to platter.
        const t = (elapsed - LIFT_MS) / ARC_MS
        const k = easeInOutCubic(t)

        p0.current.set(
          slotPose.position.x,
          slotPose.position.y + LIFT_Y,
          slotPose.position.z,
        )
        p2.current.copy(platterPose.position)
        p1.current.set(
          (p0.current.x + p2.current.x) / 2,
          Math.max(p0.current.y, p2.current.y) + ARC_APEX_Y,
          (p0.current.z + p2.current.z) / 2,
        )
        bezierQuad(p0.current, p1.current, p2.current, k, tmpPos.current)

        const rX = THREE.MathUtils.lerp(
          slotPose.rotation.x,
          platterPose.rotation.x,
          k,
        )
        const rY = THREE.MathUtils.lerp(
          slotPose.rotation.y,
          platterPose.rotation.y,
          k,
        )
        const rZ = THREE.MathUtils.lerp(
          slotPose.rotation.z,
          platterPose.rotation.z,
          k,
        )

        record.position.copy(tmpPos.current)
        record.rotation.set(rX, rY, rZ)

        if (t < SLEEVE_SPLIT_T) {
          // Pre-split: sleeve + record move as one; record hidden (inside sleeve).
          sleeve.position.copy(tmpPos.current)
          sleeve.rotation.set(rX, rY, rZ)
          sleeve.visible = true
          record.visible = false
          sleeveMaterial.opacity = 1
          spineMaterial.opacity = 1
        } else {
          // Post-split: record continues on arc, sleeve drifts up and fades.
          record.visible = true
          const splitLocalT = (t - SLEEVE_SPLIT_T) / (1 - SLEEVE_SPLIT_T)
          sleeve.position.set(
            tmpPos.current.x,
            tmpPos.current.y + SLEEVE_DRIFT_Y * easeOutCubic(splitLocalT),
            tmpPos.current.z,
          )
          sleeve.rotation.set(rX, rY, rZ)
          const fade = 1 - splitLocalT
          sleeveMaterial.opacity = fade
          spineMaterial.opacity = fade
          sleeve.visible = fade > 0.01
        }
      } else {
        // Settle — park on platter and flip to playing.
        record.position.copy(platterPose.position)
        record.rotation.set(
          platterPose.rotation.x,
          platterPose.rotation.y,
          platterPose.rotation.z,
        )
        record.visible = true
        sleeve.visible = false
        sleeveMaterial.opacity = 0
        spineMaterial.opacity = 0
        phaseRef.current = { kind: "playing" }
      }
      return
    }

    if (phase.kind === "playing") {
      record.position.copy(platterPose.position)
      record.rotation.set(
        platterPose.rotation.x,
        platterPose.rotation.y,
        platterPose.rotation.z,
      )
      record.visible = true
      sleeve.visible = false
      // With record's X=-π/2, its local Z maps to world Y — rotating the inner
      // spin group on Z spins the disc around the platter's up axis.
      recordSpin.rotation.z -= PLATTER_RAD_PER_SEC * delta
      return
    }

    if (phase.kind === "reverse") {
      const elapsed = now - phase.startMs

      if (elapsed < REVERSE_ARC_MS) {
        // Arc back from platter to apex above crate slot.
        const t = elapsed / REVERSE_ARC_MS
        const k = easeInOutCubic(t)

        p0.current.copy(platterPose.position)
        p2.current.set(
          slotPose.position.x,
          slotPose.position.y + LIFT_Y,
          slotPose.position.z,
        )
        p1.current.set(
          (p0.current.x + p2.current.x) / 2,
          Math.max(p0.current.y, p2.current.y) + ARC_APEX_Y,
          (p0.current.z + p2.current.z) / 2,
        )
        bezierQuad(p0.current, p1.current, p2.current, k, tmpPos.current)

        const rX = THREE.MathUtils.lerp(
          platterPose.rotation.x,
          slotPose.rotation.x,
          k,
        )
        const rY = THREE.MathUtils.lerp(
          platterPose.rotation.y,
          slotPose.rotation.y,
          k,
        )
        const rZ = THREE.MathUtils.lerp(
          platterPose.rotation.z,
          slotPose.rotation.z,
          k,
        )

        record.position.copy(tmpPos.current)
        record.rotation.set(rX, rY, rZ)

        const SPLIT_T_REV = 0.45
        if (t < SPLIT_T_REV) {
          // Early: record visible, sleeve fades in above & drifts down onto it.
          record.visible = true
          const splitLocalT = t / SPLIT_T_REV
          sleeve.position.set(
            tmpPos.current.x,
            tmpPos.current.y + SLEEVE_DRIFT_Y * (1 - easeOutCubic(splitLocalT)),
            tmpPos.current.z,
          )
          sleeve.rotation.set(rX, rY, rZ)
          const fade = splitLocalT
          sleeveMaterial.opacity = fade
          spineMaterial.opacity = fade
          sleeve.visible = fade > 0.01
        } else {
          // Late: sleeve envelopes record; record goes invisible inside.
          sleeve.position.copy(tmpPos.current)
          sleeve.rotation.set(rX, rY, rZ)
          sleeve.visible = true
          sleeveMaterial.opacity = 1
          spineMaterial.opacity = 1
          record.visible = false
        }

        // Slow the spin down.
        const spinFactor = 1 - easeOutCubic(t)
        recordSpin.rotation.z -= PLATTER_RAD_PER_SEC * delta * spinFactor
      } else if (elapsed < REVERSE_MS) {
        // Drop into crate slot.
        const t = (elapsed - REVERSE_ARC_MS) / REVERSE_DROP_MS
        const k = easeOutCubic(t)

        const startY = slotPose.position.y + LIFT_Y
        const endY = slotPose.position.y
        sleeve.position.set(
          slotPose.position.x,
          THREE.MathUtils.lerp(startY, endY, k),
          slotPose.position.z,
        )
        sleeve.rotation.set(
          slotPose.rotation.x,
          slotPose.rotation.y,
          slotPose.rotation.z,
        )
        sleeve.visible = true
        record.visible = false
        sleeveMaterial.opacity = 1
        spineMaterial.opacity = 1
      } else if (!reverseSettledRef.current) {
        reverseSettledRef.current = true
        sleeve.visible = false
        record.visible = false
        onReverseDone()
      }
      return
    }
  })

  useEffect(() => {
    reverseSettledRef.current = false
  }, [project.id])

  return (
    <>
      <group ref={sleeveRef} name="transport-sleeve" visible={false}>
        <mesh material={sleeveMaterial}>
          <boxGeometry args={[0.52, 0.52, 0.02]} />
        </mesh>
        <mesh position={[-0.22, 0, 0.011]} material={spineMaterial}>
          <boxGeometry args={[0.05, 0.52, 0.003]} />
        </mesh>
      </group>

      <group ref={recordRef} name="transport-record" visible={false}>
        <group ref={recordSpinRef}>
          {/* Black vinyl body — cylinder axis along group +Z (rotate X by π/2
              so that when the record group is flat on the platter at X=-π/2,
              the combined rotation leaves the axis along world +Y). */}
          <mesh rotation={[Math.PI / 2, 0, 0]} material={recordBodyMaterial}>
            <cylinderGeometry args={[0.25, 0.25, 0.008, 48]} />
          </mesh>
          {/* Accent label disc */}
          <mesh
            position={[0, 0, 0.006]}
            rotation={[Math.PI / 2, 0, 0]}
            material={recordLabelMaterial}
          >
            <cylinderGeometry args={[0.08, 0.08, 0.002, 32]} />
          </mesh>
        </group>
      </group>
    </>
  )
}
