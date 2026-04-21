"use client"

import { Suspense } from "react"
import { CameraRig } from "./camera-rig"
import { Lights } from "./lights"
import { Desk } from "./desk"
import { VinylCrate } from "./vinyl-crate"
import { Turntable } from "./turntable"
import { CRTMonitor } from "./crt-monitor"
import { Keyboard } from "./keyboard"
import { CubePaperweight } from "./cube-paperweight"
import { VinylTransport } from "./vinyl-transport"
import { ScenePostprocessing } from "./scene-postprocessing"

export function SceneContent() {
  return (
    <>
      <CameraRig />
      <Lights />
      <Suspense fallback={null}>
        <Desk />
        <CubePaperweight />
        <VinylCrate />
        <Turntable />
        <CRTMonitor />
        <Keyboard />
        <VinylTransport />
      </Suspense>
      <ScenePostprocessing />
    </>
  )
}
