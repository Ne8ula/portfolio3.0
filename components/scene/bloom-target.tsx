"use client"

import { useEffect, useRef } from "react"
import type * as THREE from "three"
import { useBloomRegistry } from "@/lib/scene/bloom-registry"

// Wrap a mesh to flag it as a SelectiveBloom target. Registers the actual
// Object3D instance with the bloom registry on mount.
export function BloomTarget({
  children,
}: {
  children: (ref: React.MutableRefObject<THREE.Mesh | null>) => React.ReactNode
}) {
  const ref = useRef<THREE.Mesh | null>(null)
  const register = useBloomRegistry((s) => s.register)
  const unregister = useBloomRegistry((s) => s.unregister)

  useEffect(() => {
    const obj = ref.current
    if (!obj) return
    register(obj)
    return () => unregister(obj)
  }, [register, unregister])

  return <>{children(ref)}</>
}
