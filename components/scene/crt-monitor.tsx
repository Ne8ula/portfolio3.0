"use client"

import { useEffect, useRef, useState } from "react"
import { useFrame } from "@react-three/fiber"
import { Html, Edges } from "@react-three/drei"
import * as THREE from "three"
import { projectById } from "@/lib/projects"
import { useSceneStore } from "@/lib/store/scene-store"
import { CrtProjectDetail } from "./crt-project-detail"
import { BloomTarget } from "./bloom-target"

// Clear-acrylic Macintosh-Classic-style all-in-one. Transparent polycarbonate
// shell + fine ink-line edges traced on every piece — reads as a technical
// x-ray illustration rather than a solid chassis. Ghost interior details
// (CRT neck, mainboard) peek through the glass.

const INK = "#1A1A1A"
const GLASS = "#f4f1e8"
const GLASS_OPACITY = 0.08
const INNER_GHOST = "#2a2520"
const SCREEN_OFF = "#0a1510"
const SCREEN_PHOSPHOR = "#4B6E4F"
const SCREEN_FLICKER_LIME = "#C6F24A"
const ACCENT = "#C91D22"

const BOOT_START_MS = 1400
const BOOT_DURATION_MS = 600
const BOOT_DONE_MS = BOOT_START_MS + BOOT_DURATION_MS

// Body dims — classic all-in-one proportions (taller than wide, shallow).
const W = 0.72
const H = 0.95
const D = 0.66
const SCREEN_W = 0.5
const SCREEN_H = 0.4
const SCREEN_Y = 0.6
const FRONT = D / 2

type ScreenPhase = "off" | "booting" | "on"

function isDevProjectOverride() {
  if (typeof window === "undefined") return false
  return new URLSearchParams(window.location.search).get("view") === "project"
}

export function CRTMonitor() {
  const isPlaying = useSceneStore((s) => s.isPlaying)
  const selectedId = useSceneStore((s) => s.selectedVinylId)

  const [phase, setPhase] = useState<ScreenPhase>(
    isPlaying || isDevProjectOverride() ? "on" : "off",
  )

  useEffect(() => {
    if (isPlaying) {
      if (phase === "on") return
      const t1 = window.setTimeout(() => setPhase("booting"), BOOT_START_MS)
      const t2 = window.setTimeout(() => setPhase("on"), BOOT_DONE_MS)
      return () => {
        window.clearTimeout(t1)
        window.clearTimeout(t2)
      }
    } else {
      setPhase("off")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying])

  const project = selectedId ? projectById(selectedId) : null

  return (
    <group position={[-1.3, 0.09, -0.1]} rotation={[0, 0.25, 0]} name="crt-monitor">
      {/* Chassis — translucent polycarbonate shell */}
      <mesh position={[0, H / 2, 0]}>
        <boxGeometry args={[W, H, D]} />
        <meshBasicMaterial
          color={GLASS}
          transparent
          opacity={GLASS_OPACITY}
          depthWrite={false}
        />
        <Edges color={INK} threshold={15} />
      </mesh>

      {/* Chin bevel — subtle inset box on the lower third to suggest the
          Classic's stepped lower chassis. Pure edges, no fill. */}
      <mesh position={[0, 0.18, FRONT - 0.04]}>
        <boxGeometry args={[W - 0.04, 0.34, 0.08]} />
        <meshBasicMaterial color={GLASS} transparent opacity={0} depthWrite={false} />
        <Edges color={INK} threshold={15} />
      </mesh>

      {/* Screen recess — shallow box inset from the front face */}
      <mesh position={[0, SCREEN_Y, FRONT - 0.025]}>
        <boxGeometry args={[SCREEN_W + 0.06, SCREEN_H + 0.06, 0.05]} />
        <meshBasicMaterial color={INK} transparent opacity={0.12} depthWrite={false} />
        <Edges color={INK} threshold={15} />
      </mesh>

      {/* Screen phosphor plane — dark when off, jade when on.
          Tagged as a SelectiveBloom target so the phosphor glows faintly. */}
      <BloomTarget>
        {(ref) => (
          <mesh ref={ref} position={[0, SCREEN_Y, FRONT + 0.001]}>
            <planeGeometry args={[SCREEN_W, SCREEN_H]} />
            <meshBasicMaterial color={phase === "off" ? SCREEN_OFF : SCREEN_PHOSPHOR} />
          </mesh>
        )}
      </BloomTarget>

      {/* Emissive halo — bloom-tagged so it reads as the soft glow edge */}
      <BloomTarget>
        {(ref) => (
          <mesh ref={ref} position={[0, SCREEN_Y, FRONT + 0.002]}>
            <planeGeometry args={[SCREEN_W - 0.04, SCREEN_H - 0.04]} />
            <meshBasicMaterial
              color={SCREEN_PHOSPHOR}
              transparent
              opacity={phase === "off" ? 0 : 0.2}
            />
          </mesh>
        )}
      </BloomTarget>

      {phase === "booting" && <BootFlicker />}

      {/* Html project-detail anchor */}
      <group name="crt-screen" position={[0, SCREEN_Y, FRONT + 0.004]}>
        {project && (
          <Html
            transform
            occlude="blending"
            scale={0.00062}
            pointerEvents={phase === "on" ? "auto" : "none"}
            style={{
              opacity: phase === "on" ? 1 : 0,
              transition: "opacity 300ms ease",
              width: 820,
              height: 620,
            }}
          >
            <CrtProjectDetail project={project} />
          </Html>
        )}
      </group>

      {/* Floppy disk slot — dark horizontal bar through the chin */}
      <mesh position={[0.06, 0.24, FRONT + 0.002]}>
        <boxGeometry args={[0.28, 0.022, 0.005]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      {/* Eject button square next to the slot */}
      <mesh position={[0.24, 0.24, FRONT + 0.003]}>
        <boxGeometry args={[0.02, 0.014, 0.006]} />
        <meshBasicMaterial color={INK} />
      </mesh>

      {/* Brand-accent chit — tiny vermilion square bottom-left of chin */}
      <mesh position={[-0.26, 0.1, FRONT + 0.002]}>
        <boxGeometry args={[0.04, 0.04, 0.003]} />
        <meshBasicMaterial color={ACCENT} />
      </mesh>

      {/* Power LED */}
      <mesh position={[0.28, 0.09, FRONT + 0.002]}>
        <boxGeometry args={[0.02, 0.02, 0.003]} />
        <meshBasicMaterial color={phase === "off" ? "#5a1010" : ACCENT} />
      </mesh>

      {/* ---------- Ghost interior — visible through the clear shell ---------- */}

      {/* CRT neck — cylinder tapering back from the tube into the chassis */}
      <mesh
        position={[0, SCREEN_Y, -0.1]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.06, 0.14, 0.38, 16, 1, true]} />
        <meshBasicMaterial
          color={INNER_GHOST}
          transparent
          opacity={0.0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
        <Edges color={INK} threshold={20} />
      </mesh>

      {/* Yoke ring on the CRT neck — a single visible band */}
      <mesh position={[0, SCREEN_Y, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.04, 16, 1, true]} />
        <meshBasicMaterial
          color={INNER_GHOST}
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
        <Edges color={INK} threshold={20} />
      </mesh>

      {/* Mainboard — thin plate sitting in the lower chassis */}
      <mesh position={[0, 0.07, -0.05]}>
        <boxGeometry args={[W - 0.12, 0.01, D - 0.18]} />
        <meshBasicMaterial color={INNER_GHOST} transparent opacity={0} depthWrite={false} />
        <Edges color={INK} threshold={15} />
      </mesh>
      {/* Two chip packages on the mainboard — small blocks for technical-illo feel */}
      <mesh position={[-0.12, 0.09, -0.05]}>
        <boxGeometry args={[0.1, 0.02, 0.08]} />
        <meshBasicMaterial color={INK} transparent opacity={0.45} depthWrite={false} />
        <Edges color={INK} threshold={15} />
      </mesh>
      <mesh position={[0.12, 0.09, -0.05]}>
        <boxGeometry args={[0.08, 0.02, 0.12]} />
        <meshBasicMaterial color={INK} transparent opacity={0.45} depthWrite={false} />
        <Edges color={INK} threshold={15} />
      </mesh>

      {/* Vent slats — top of chassis, thin grille */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={`vent-${i}`} position={[-0.2 + i * 0.08, H - 0.01, 0]}>
          <boxGeometry args={[0.05, 0.004, D - 0.18]} />
          <meshBasicMaterial color={INK} />
        </mesh>
      ))}
    </group>
  )
}

function BootFlicker() {
  const ref = useRef<THREE.Mesh>(null)
  const startRef = useRef(performance.now())

  useFrame(() => {
    const mesh = ref.current
    if (!mesh) return
    const elapsed = performance.now() - startRef.current
    const t = Math.min(1, elapsed / BOOT_DURATION_MS)
    const beat = Math.floor(t * 7)
    const onBeat = beat % 2 === 0
    const damp = 1 - t * 0.4
    const target = (onBeat ? 0.75 : 0.15) * damp
    const mat = mesh.material as THREE.MeshBasicMaterial
    mat.opacity = target
  })

  return (
    <mesh ref={ref} position={[0, SCREEN_Y, FRONT + 0.0025]}>
      <planeGeometry args={[SCREEN_W, SCREEN_H]} />
      <meshBasicMaterial color={SCREEN_FLICKER_LIME} transparent opacity={0.4} />
    </mesh>
  )
}
