"use client"

import { Edges } from "@react-three/drei"

// Transparent-acrylic keyboard matched to the clear Macintosh Classic body —
// fine ink-line edges trace the baseplate + every key cap. Sits directly in
// front of the monitor, far enough left to clear the vinyl crate entirely.

const INK = "#1A1A1A"
const GLASS = "#f4f1e8"
const GLASS_OPACITY = 0.08
const KEY_OPACITY = 0.1
const KEY_DARK_OPACITY = 0.18
const ACCENT = "#C91D22"

export function Keyboard() {
  const rows = 4
  const cols = 12
  const keySize = 0.06
  const gap = 0.012
  const baseW = 0.8
  const baseD = 0.3
  const startX = -((cols - 1) * (keySize + gap)) / 2
  const startZ = -((rows - 1) * (keySize + gap)) / 2 + 0.015

  return (
    <group position={[-1.3, 0.09, 0.55]} rotation={[0, 0.25, 0]} name="keyboard">
      {/* Baseplate — wedge-ish flat slab, translucent */}
      <mesh position={[0, 0.025, 0]}>
        <boxGeometry args={[baseW, 0.05, baseD]} />
        <meshBasicMaterial
          color={GLASS}
          transparent
          opacity={GLASS_OPACITY}
          depthWrite={false}
        />
        <Edges color={INK} threshold={15} />
      </mesh>

      {/* Inner key-well frame — thinner inset slab, ghost edge only */}
      <mesh position={[0, 0.052, 0.01]}>
        <boxGeometry args={[baseW - 0.08, 0.008, baseD - 0.06]} />
        <meshBasicMaterial
          color={GLASS}
          transparent
          opacity={0.04}
          depthWrite={false}
        />
        <Edges color={INK} threshold={15} />
      </mesh>

      {/* Cable stub — small nub trailing off the back, ink line for the cord */}
      <mesh position={[0.36, 0.03, -baseD / 2 - 0.01]}>
        <boxGeometry args={[0.04, 0.015, 0.02]} />
        <meshBasicMaterial color={INK} transparent opacity={0.45} depthWrite={false} />
        <Edges color={INK} threshold={15} />
      </mesh>

      {/* Key grid — each cap is a translucent box with traced edges */}
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((__, c) => {
          const x = startX + c * (keySize + gap)
          const z = startZ + r * (keySize + gap)
          const isAccent = r === 0 && c === cols - 1
          const isSpace = r === rows - 1 && c >= 3 && c <= cols - 4
          // Skip individual caps for the space-bar row — render one wide bar
          if (isSpace && c !== 3) return null
          if (isSpace && c === 3) {
            const spaceCols = cols - 7
            const spaceW = spaceCols * (keySize + gap) - gap
            const cxSpace =
              startX + (3 * (keySize + gap)) + (spaceW - keySize) / 2
            return (
              <mesh key={`${r}-${c}`} position={[cxSpace, 0.075, z]}>
                <boxGeometry args={[spaceW, 0.03, keySize]} />
                <meshBasicMaterial
                  color={GLASS}
                  transparent
                  opacity={KEY_OPACITY}
                  depthWrite={false}
                />
                <Edges color={INK} threshold={15} />
              </mesh>
            )
          }
          return (
            <mesh key={`${r}-${c}`} position={[x, 0.075, z]}>
              <boxGeometry args={[keySize, 0.03, keySize]} />
              <meshBasicMaterial
                color={isAccent ? ACCENT : GLASS}
                transparent
                opacity={isAccent ? 0.85 : KEY_OPACITY}
                depthWrite={false}
              />
              <Edges color={INK} threshold={15} />
            </mesh>
          )
        }),
      )}

      {/* Two pill-feet under the back edge — raise the wedge angle visually */}
      <mesh position={[-0.3, 0.005, -baseD / 2 + 0.02]}>
        <boxGeometry args={[0.06, 0.01, 0.02]} />
        <meshBasicMaterial
          color={INK}
          transparent
          opacity={KEY_DARK_OPACITY}
          depthWrite={false}
        />
        <Edges color={INK} threshold={15} />
      </mesh>
      <mesh position={[0.3, 0.005, -baseD / 2 + 0.02]}>
        <boxGeometry args={[0.06, 0.01, 0.02]} />
        <meshBasicMaterial
          color={INK}
          transparent
          opacity={KEY_DARK_OPACITY}
          depthWrite={false}
        />
        <Edges color={INK} threshold={15} />
      </mesh>
    </group>
  )
}
