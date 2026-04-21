"use client"

import { create } from "zustand"
import type * as THREE from "three"

// Registry of meshes that should glow under the SelectiveBloom pass.
// Children (CRT phosphor, turntable stylus) register on mount, unregister on
// unmount. scene-content reads `targets` and hands the array to SelectiveBloom.
interface BloomRegistry {
  targets: THREE.Object3D[]
  register: (obj: THREE.Object3D) => void
  unregister: (obj: THREE.Object3D) => void
}

export const useBloomRegistry = create<BloomRegistry>((set) => ({
  targets: [],
  register: (obj) =>
    set((s) =>
      s.targets.includes(obj) ? s : { targets: [...s.targets, obj] },
    ),
  unregister: (obj) =>
    set((s) => ({ targets: s.targets.filter((t) => t !== obj) })),
}))
