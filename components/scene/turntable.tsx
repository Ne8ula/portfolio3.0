"use client"

import { useEffect, useRef, useState } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useSceneStore } from "@/lib/store/scene-store"
import { BloomTarget } from "./bloom-target"

// Warm-band palette — plinth reads as a cream/kraft surface so the dark
// vinyl disc + vermilion felt pop. No cold-electric tints here.
const PLINTH_TOP = "#d9d2b8"
const PLINTH_SIDE = "#a8a188"
const PLINTH_EDGE = "#2A2520"
const ACCENT_STRIP = "#C91D22"
const VINYL_BLACK = "#141210"
const VINYL_SHEEN = "#2a2520"
const FELT_COLOR = "#CB3A3D"
const FELT_RIM = "#4F9970"
const METAL_COLOR = "#d9d5c8"
const METAL_DARK = "#8a8577"
const RUBBER = "#1a1a1a"
const LABEL_CREAM = "#EDE6D3"

const PLATTER_RPM = 33
const PLATTER_RAD_PER_SEC = (PLATTER_RPM / 60) * 2 * Math.PI

const TONEARM_REST_Y = -Math.PI / 6
const TONEARM_PLAY_Y = 0
const ARM_LERP = 0.14

const TONEARM_DELAY_MS = 1000

function isDevProjectOverride() {
  if (typeof window === "undefined") return false
  return new URLSearchParams(window.location.search).get("view") === "project"
}

export function Turntable() {
  const isPlaying = useSceneStore((s) => s.isPlaying)
  const platterRef = useRef<THREE.Group>(null)
  const tonearmRef = useRef<THREE.Group>(null)

  const [armDown, setArmDown] = useState(isPlaying || isDevProjectOverride())

  useEffect(() => {
    if (isPlaying) {
      if (armDown) return
      const t = setTimeout(() => setArmDown(true), TONEARM_DELAY_MS)
      return () => clearTimeout(t)
    } else {
      setArmDown(false)
    }
  }, [isPlaying, armDown])

  useEffect(() => {
    if (tonearmRef.current) {
      tonearmRef.current.rotation.y = armDown
        ? TONEARM_PLAY_Y
        : TONEARM_REST_Y
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame((_, delta) => {
    const platter = platterRef.current
    const arm = tonearmRef.current
    if (!platter || !arm) return

    if (armDown) {
      platter.rotation.y -= PLATTER_RAD_PER_SEC * delta
    }

    const targetY = armDown ? TONEARM_PLAY_Y : TONEARM_REST_Y
    arm.rotation.y += (targetY - arm.rotation.y) * ARM_LERP
  })

  return (
    <group position={[1.6, 0.09, 0.5]} name="turntable">
      {/* Rubber feet — four small pads under the plinth */}
      {[
        [-0.42, 0.01, -0.32],
        [0.42, 0.01, -0.32],
        [-0.42, 0.01, 0.32],
        [0.42, 0.01, 0.32],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <cylinderGeometry args={[0.04, 0.04, 0.02, 12]} />
          <meshToonMaterial color={RUBBER} />
        </mesh>
      ))}

      {/* Plinth body — cream top, darker side */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[1.0, 0.1, 0.8]} />
        <meshToonMaterial color={PLINTH_SIDE} />
      </mesh>
      {/* Plinth top plate — slightly inset so the side darker band shows */}
      <mesh position={[0, 0.112, 0]}>
        <boxGeometry args={[0.96, 0.01, 0.76]} />
        <meshToonMaterial color={PLINTH_TOP} />
      </mesh>

      {/* Ink edge bead around the plinth top — crisp cel-outline feel */}
      <mesh position={[0, 0.117, 0.381]}>
        <boxGeometry args={[0.96, 0.004, 0.002]} />
        <meshBasicMaterial color={PLINTH_EDGE} />
      </mesh>
      <mesh position={[0, 0.117, -0.381]}>
        <boxGeometry args={[0.96, 0.004, 0.002]} />
        <meshBasicMaterial color={PLINTH_EDGE} />
      </mesh>
      <mesh position={[0.481, 0.117, 0]}>
        <boxGeometry args={[0.002, 0.004, 0.76]} />
        <meshBasicMaterial color={PLINTH_EDGE} />
      </mesh>
      <mesh position={[-0.481, 0.117, 0]}>
        <boxGeometry args={[0.002, 0.004, 0.76]} />
        <meshBasicMaterial color={PLINTH_EDGE} />
      </mesh>

      {/* Vermilion brand strip — front face of the plinth */}
      <mesh position={[0, 0.04, 0.401]}>
        <boxGeometry args={[0.7, 0.015, 0.005]} />
        <meshBasicMaterial color={ACCENT_STRIP} />
      </mesh>

      {/* Platter well — dark recess the vinyl sits in. Cylinder default axis
          is Y, so no X rotation needed for a disc lying flat. */}
      <mesh position={[-0.05, 0.118, 0]}>
        <cylinderGeometry args={[0.37, 0.37, 0.008, 48]} />
        <meshToonMaterial color={PLINTH_EDGE} />
      </mesh>

      {/* Platter group — spins on world Y when armDown */}
      <group ref={platterRef} position={[-0.05, 0, 0]} name="platter">
        {/* Vinyl disc body — flat disc, axis up by default */}
        <mesh position={[0, 0.128, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 0.012, 64]} />
          <meshToonMaterial color={VINYL_BLACK} />
        </mesh>
        {/* Inner groove ring — ring's default normal is Z, flip to Y */}
        <mesh position={[0, 0.1345, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.18, 0.34, 64]} />
          <meshBasicMaterial color={VINYL_SHEEN} side={THREE.DoubleSide} />
        </mesh>
        {/* Felt disc (record label area) */}
        <mesh position={[0, 0.135, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.002, 48]} />
          <meshToonMaterial color={FELT_COLOR} />
        </mesh>
        {/* Cream label center */}
        <mesh position={[0, 0.1365, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.002, 32]} />
          <meshToonMaterial color={LABEL_CREAM} />
        </mesh>
        {/* Jade rim highlight — thin ring, flip to lie flat */}
        <mesh position={[0, 0.129, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.348, 0.352, 48]} />
          <meshBasicMaterial color={FELT_RIM} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Spindle — stationary metal peg */}
      <mesh position={[-0.05, 0.152, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.04, 16]} />
        <meshToonMaterial color={METAL_COLOR} />
      </mesh>
      <mesh position={[-0.05, 0.17, 0]}>
        <cylinderGeometry args={[0.014, 0.012, 0.004, 16]} />
        <meshToonMaterial color={METAL_DARK} />
      </mesh>

      {/* Pitch slider panel — front-right of plinth, reads as a control strip */}
      <mesh position={[0.28, 0.118, 0.28]}>
        <boxGeometry args={[0.18, 0.005, 0.04]} />
        <meshBasicMaterial color={PLINTH_EDGE} />
      </mesh>
      <mesh position={[0.32, 0.122, 0.28]}>
        <boxGeometry args={[0.04, 0.012, 0.03]} />
        <meshToonMaterial color={METAL_COLOR} />
      </mesh>

      {/* Start / stop buttons — left-front of plinth */}
      <mesh position={[-0.38, 0.122, 0.28]}>
        <cylinderGeometry args={[0.025, 0.025, 0.012, 20]} />
        <meshToonMaterial color={ACCENT_STRIP} />
      </mesh>
      <mesh position={[-0.3, 0.122, 0.28]}>
        <cylinderGeometry args={[0.018, 0.018, 0.012, 20]} />
        <meshToonMaterial color={METAL_DARK} />
      </mesh>

      {/* Speed switch — 33/45 toggle nub */}
      <mesh position={[0.35, 0.122, -0.3]}>
        <boxGeometry args={[0.04, 0.014, 0.025]} />
        <meshToonMaterial color={METAL_COLOR} />
      </mesh>

      {/* ------ Tonearm assembly (rear-right of plinth) ------ */}

      {/* Pivot post — chunky cylinder rising out of the plinth */}
      <mesh position={[0.35, 0.15, -0.3]}>
        <cylinderGeometry args={[0.045, 0.055, 0.08, 20]} />
        <meshToonMaterial color={METAL_DARK} />
      </mesh>
      {/* Pivot cap */}
      <mesh position={[0.35, 0.195, -0.3]}>
        <cylinderGeometry args={[0.048, 0.048, 0.012, 20]} />
        <meshToonMaterial color={METAL_COLOR} />
      </mesh>

      {/* Arm rest cradle — small U off the plinth to catch the arm at rest */}
      <mesh position={[0.44, 0.13, -0.18]}>
        <boxGeometry args={[0.05, 0.02, 0.04]} />
        <meshToonMaterial color={METAL_DARK} />
      </mesh>
      <mesh position={[0.44, 0.145, -0.18]}>
        <boxGeometry args={[0.05, 0.01, 0.01]} />
        <meshBasicMaterial color={PLINTH_EDGE} />
      </mesh>

      {/* Tonearm swing group — rotates around the pivot post */}
      <group
        position={[0.35, 0.2, -0.3]}
        rotation={[0, TONEARM_REST_Y, 0]}
        ref={tonearmRef}
        name="tonearm"
      >
        {/* Counterweight — chunky cylinder behind the pivot */}
        <mesh position={[0.11, 0, -0.08]}>
          <cylinderGeometry args={[0.045, 0.045, 0.08, 20]} />
          <meshToonMaterial color={PLINTH_EDGE} />
        </mesh>
        {/* Counterweight cap ring */}
        <mesh position={[0.11, 0.042, -0.08]}>
          <cylinderGeometry args={[0.048, 0.048, 0.006, 20]} />
          <meshToonMaterial color={METAL_COLOR} />
        </mesh>

        {/* Arm tube — thicker box, chamfered by a shadow underline below */}
        <mesh position={[-0.19, 0, 0.14]} rotation={[0, Math.PI / 4, 0]}>
          <boxGeometry args={[0.46, 0.022, 0.022]} />
          <meshToonMaterial color={METAL_COLOR} />
        </mesh>
        {/* Arm tube underline — ink shadow for cel readability */}
        <mesh
          position={[-0.19, -0.013, 0.14]}
          rotation={[0, Math.PI / 4, 0]}
        >
          <boxGeometry args={[0.46, 0.003, 0.022]} />
          <meshBasicMaterial color={PLINTH_EDGE} />
        </mesh>

        {/* S-curve bend — a second short segment angled slightly off the tip */}
        <mesh position={[-0.33, 0, 0.32]} rotation={[0, Math.PI / 3.2, 0]}>
          <boxGeometry args={[0.08, 0.02, 0.02]} />
          <meshToonMaterial color={METAL_COLOR} />
        </mesh>

        {/* Headshell block — wider, carries the cartridge */}
        <mesh position={[-0.36, -0.01, 0.36]}>
          <boxGeometry args={[0.07, 0.025, 0.055]} />
          <meshToonMaterial color={PLINTH_EDGE} />
        </mesh>
        {/* Cartridge — vermilion accent block (reads as the cartridge body).
            Bloom-tagged for a faint cartridge glow when armDown. */}
        <BloomTarget>
          {(ref) => (
            <mesh ref={ref} position={[-0.36, -0.03, 0.36]}>
              <boxGeometry args={[0.05, 0.018, 0.04]} />
              <meshBasicMaterial color={ACCENT_STRIP} />
            </mesh>
          )}
        </BloomTarget>
        {/* Stylus tip — tiny metal nub pointing down at the felt, bloom-tagged */}
        <BloomTarget>
          {(ref) => (
            <mesh ref={ref} position={[-0.36, -0.044, 0.36]}>
              <boxGeometry args={[0.008, 0.008, 0.008]} />
              <meshBasicMaterial color={METAL_COLOR} />
            </mesh>
          )}
        </BloomTarget>
      </group>
    </group>
  )
}
