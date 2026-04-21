"use client"

export function Lights() {
  return (
    <>
      <ambientLight intensity={0.55} color="#f4f1e8" />
      {/* Warm key light — sits front-right, rakes across the desk */}
      <directionalLight
        position={[5, 6, 4]}
        intensity={1.1}
        color="#f4d79b"
      />
      {/* Jade rim — from back-left, separates silhouettes */}
      <directionalLight
        position={[-4, 3, -3]}
        intensity={0.45}
        color="#5e8566"
      />
      {/* Fill — cool under-bounce */}
      <hemisphereLight args={["#f7f9f2", "#2a2520", 0.35]} />
    </>
  )
}
