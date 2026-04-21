"use client"

const DESK_COLOR = "#a5661f"
const DESK_SHADOW = "#5c3a1a"
const LEG_COLOR = "#2a2520"

export function Desk() {
  return (
    <group name="desk">
      {/* Top slab */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[6.4, 0.18, 3.4]} />
        <meshToonMaterial color={DESK_COLOR} />
      </mesh>

      {/* Front edge shadow band (darker wood trim) */}
      <mesh position={[0, -0.1, 1.71]}>
        <boxGeometry args={[6.4, 0.05, 0.02]} />
        <meshBasicMaterial color={DESK_SHADOW} />
      </mesh>

      {/* Legs — simple square posts at the four corners */}
      {[
        [-3.0, -0.95, 1.5],
        [3.0, -0.95, 1.5],
        [-3.0, -0.95, -1.5],
        [3.0, -0.95, -1.5],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <boxGeometry args={[0.2, 2.0, 0.2]} />
          <meshToonMaterial color={LEG_COLOR} />
        </mesh>
      ))}

      {/* Desk pad (parchment rectangle mid-desk, subtle light paper) */}
      <mesh position={[0, 0.091, 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.2, 2.0]} />
        <meshBasicMaterial color="#ede6d3" />
      </mesh>
    </group>
  )
}
