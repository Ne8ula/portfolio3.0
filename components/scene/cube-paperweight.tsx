"use client"

import { useMemo } from "react"
import { useTexture } from "@react-three/drei"
import * as THREE from "three"
import { useSceneStore } from "@/lib/store/scene-store"

const FACE_URLS = [
  "/assets/cube-faces/face-about.svg",    // +x (right)
  "/assets/cube-faces/face-contact.svg",  // -x (left)
  "/assets/cube-faces/face-top.svg",      // +y
  "/assets/cube-faces/face-bottom.svg",   // -y
  "/assets/cube-faces/face-projects.svg", // +z (front)
  "/assets/cube-faces/face-core.svg",     // -z (back)
]

const SIZE = 0.35
const DEG_TO_RAD = Math.PI / 180

export function CubePaperweight() {
  const textures = useTexture(FACE_URLS) as THREE.Texture[]
  // CSS cube's final rotateY (deg) at handoff. Mapped 1:1 to the group's Y
  // rotation so the paperweight spawns aligned with the DOM cube's last pose
  // and no visible jump occurs across the DOM→WebGL seam.
  const handoffDeg = useSceneStore((s) => s.cubeHandoffRotationY)

  const materials = useMemo(
    () =>
      textures.map((tex) => {
        tex.anisotropy = 4
        tex.needsUpdate = true
        return new THREE.MeshToonMaterial({ map: tex, color: "#f4f1e8" })
      }),
    [textures]
  )

  return (
    <group
      position={[-1.9, 0.09 + SIZE / 2, 0.45]}
      rotation={[0, handoffDeg * DEG_TO_RAD, 0]}
      name="cube-paperweight"
    >
      <mesh material={materials}>
        <boxGeometry args={[SIZE, SIZE, SIZE]} />
      </mesh>
      {/* Subtle ink outline — slightly larger dark box behind reads as cel-outline */}
      <mesh scale={[1.015, 1.015, 1.015]}>
        <boxGeometry args={[SIZE, SIZE, SIZE]} />
        <meshBasicMaterial color="#1a1a1a" side={THREE.BackSide} />
      </mesh>
    </group>
  )
}
