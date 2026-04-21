"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { useTexture } from "@react-three/drei"
import * as THREE from "three"
import type { Project } from "@/lib/projects"
import { useSceneStore } from "@/lib/store/scene-store"
import { VinylHoverLabel } from "./vinyl-hover-label"

interface VinylProps {
  project: Project
  basePosition: [number, number, number]
  baseRotation: [number, number, number]
  slotIndex: number
  hoveredSlotIndex: number | null
}

// Flip-through metaphor — group origin sits at the bottom edge of the sleeve
// so X-rotation pivots around the bottom (thumbing-through-records feel).
// Hovered vinyl tips forward the most; vinyls in front of it (higher slot
// index, closer to viewer) tip partway as though already flipped past.
const FLIP_ACTIVE_RAD = 0.55
const FLIP_PAST_RAD = 0.28
const HOVER_LIFT_Y = 0.08
const HOVER_PUSH_Z = 0.06
const PAST_PUSH_Z = 0.03
const LERP = 0.18
const DIM_OPACITY = 0.35

const MESH_Y = 0.26

export function Vinyl({
  project,
  basePosition,
  baseRotation,
  slotIndex,
  hoveredSlotIndex,
}: VinylProps) {
  const groupRef = useRef<THREE.Group>(null)

  const hoveredId = useSceneStore((s) => s.hoveredVinylId)
  const filter = useSceneStore((s) => s.filterCategory)
  const transportActiveId = useSceneStore((s) => s.transportActiveVinylId)
  const setHoveredVinyl = useSceneStore((s) => s.setHoveredVinyl)
  const selectVinyl = useSceneStore((s) => s.selectVinyl)

  const isHovered = hoveredSlotIndex === slotIndex
  const isFlipped = hoveredSlotIndex != null && slotIndex > hoveredSlotIndex
  const isFilteredOut = filter !== "all" && filter !== project.category
  const isTransported = transportActiveId === project.id

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

  useFrame(() => {
    const g = groupRef.current
    if (!g) return

    const targetRotX = isHovered
      ? FLIP_ACTIVE_RAD
      : isFlipped
        ? FLIP_PAST_RAD
        : baseRotation[0]
    const targetY = basePosition[1] + (isHovered ? HOVER_LIFT_Y : 0)
    const targetZ =
      basePosition[2] +
      (isHovered ? HOVER_PUSH_Z : isFlipped ? PAST_PUSH_Z : 0)

    g.position.x += (basePosition[0] - g.position.x) * LERP
    g.position.y += (targetY - g.position.y) * LERP
    g.position.z += (targetZ - g.position.z) * LERP
    g.rotation.x += (targetRotX - g.rotation.x) * LERP
    g.rotation.y += (baseRotation[1] - g.rotation.y) * LERP
    g.rotation.z += (baseRotation[2] - g.rotation.z) * LERP

    const targetOpacity = isFilteredOut && !isHovered ? DIM_OPACITY : 1
    sleeveMaterial.opacity += (targetOpacity - sleeveMaterial.opacity) * LERP
    spineMaterial.opacity += (targetOpacity - spineMaterial.opacity) * LERP
  })

  const interactive = !isFilteredOut

  return (
    <group
      ref={groupRef}
      position={basePosition}
      rotation={baseRotation}
      name={`vinyl-${project.id}`}
      visible={!isTransported}
      onPointerEnter={(e) => {
        if (!interactive || isTransported) return
        e.stopPropagation()
        setHoveredVinyl(project.id)
        document.body.style.cursor = "pointer"
      }}
      onPointerLeave={(e) => {
        e.stopPropagation()
        if (hoveredId === project.id) setHoveredVinyl(null)
        document.body.style.cursor = ""
      }}
      onClick={(e) => {
        if (!interactive || isTransported) return
        e.stopPropagation()
        selectVinyl(project.id)
      }}
    >
      {/* Sleeve body — mesh offset so group origin = bottom edge */}
      <mesh position={[0, MESH_Y, 0]} material={sleeveMaterial}>
        <boxGeometry args={[0.52, 0.52, 0.02]} />
      </mesh>
      {/* Accent spine — left edge of the sleeve */}
      <mesh position={[-0.22, MESH_Y, 0.011]} material={spineMaterial}>
        <boxGeometry args={[0.05, 0.52, 0.003]} />
      </mesh>

      <VinylHoverLabel project={project} visible={isHovered} />
    </group>
  )
}
