"use client"

import { Html } from "@react-three/drei"
import type { ThreeElements } from "@react-three/fiber"

interface CrateDividerProps {
  position?: ThreeElements["group"]["position"]
  label: string
}

// Thin kraft-card divider that sits between Z-stacked vinyls. Card is thin
// along Z so it slots between records without pushing them apart; tab sticks
// up on top, drei <Html> label hovers above it.
export function CrateDivider({ position = [0, 0, 0], label }: CrateDividerProps) {
  return (
    <group position={position} name={`divider-${label.toLowerCase()}`}>
      {/* Card body — spans the crate interior width, thin along Z */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.85, 0.56, 0.02]} />
        <meshToonMaterial color="#d6c8a3" />
      </mesh>
      {/* Index tab on top */}
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[0.18, 0.08, 0.022]} />
        <meshToonMaterial color="#d6c8a3" />
      </mesh>
      {/* Ink underline on the tab */}
      <mesh position={[0, 0.585, 0.013]}>
        <boxGeometry args={[0.16, 0.004, 0.002]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>

      <Html
        position={[0, 0.72, 0]}
        center
        distanceFactor={2.6}
        zIndexRange={[10, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            fontFamily: "VCR_OSD_MONO, monospace",
            fontSize: "14px",
            letterSpacing: "0.18em",
            color: "#2A2520",
            whiteSpace: "nowrap",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  )
}
