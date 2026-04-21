"use client"

import { useEffect, useState } from "react"
import {
  EffectComposer,
  SelectiveBloom,
  Vignette,
} from "@react-three/postprocessing"
import { BlendFunction } from "postprocessing"
import { useBloomRegistry } from "@/lib/scene/bloom-registry"
import { useSceneStore } from "@/lib/store/scene-store"
import { readsPrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

// Phase 6 polish — a single EffectComposer layered on top of the desk scene.
// SelectiveBloom only affects meshes registered via BloomTarget (CRT phosphor,
// turntable cartridge/stylus). Vignette is a subtle corner darken, disabled on
// the cube landing so the CSS cube crossfades cleanly.
export function ScenePostprocessing() {
  const view = useSceneStore((s) => s.view)
  const targets = useBloomRegistry((s) => s.targets)

  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    setReducedMotion(readsPrefersReducedMotion())
  }, [])

  // While the camera sits on the cube landing, skip postprocessing so the R3F
  // canvas cross-fade with the DOM cube stays clean.
  const active = view !== "cube"
  if (!active || reducedMotion) return null

  return (
    <EffectComposer>
      <SelectiveBloom
        selection={targets}
        selectionLayer={10}
        intensity={0.7}
        luminanceThreshold={0}
        luminanceSmoothing={0.4}
        mipmapBlur
      />
      <Vignette
        blendFunction={BlendFunction.NORMAL}
        offset={0.35}
        darkness={0.6}
      />
    </EffectComposer>
  )
}
