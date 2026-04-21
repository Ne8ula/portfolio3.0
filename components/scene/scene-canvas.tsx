"use client"

import { useEffect } from "react"
import { Canvas } from "@react-three/fiber"
import { useSceneStore } from "@/lib/store/scene-store"
import { SceneContent } from "./scene-content"

// Warm parchment clear color — keeps the canvas visually continuous
// with the DOM page while the desk scene is visible behind it.
const CLEAR_COLOR = "#f4f1e8"

export function SceneCanvas() {
  const view = useSceneStore((s) => s.view)
  const setView = useSceneStore((s) => s.setView)

  // Dev override: ?view=desk|project|zooming|cube lets us inspect the scene
  // without going through the cube-click handoff.
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const forced = params.get("view")
    if (forced === "project") {
      // Project view needs a selected vinyl to render CRT content. Seed
      // design-01 if the store doesn't already have one.
      const s = useSceneStore.getState()
      if (!s.selectedVinylId) {
        s.selectVinyl("design-01")
      } else {
        setView("project")
      }
    } else if (
      forced === "desk" ||
      forced === "zooming" ||
      forced === "cube"
    ) {
      setView(forced)
    }
  }, [setView])

  const interactive = view === "desk" || view === "project"
  const visible = view !== "cube"

  return (
    <div
      className="fixed inset-0 z-[1]"
      style={{
        pointerEvents: interactive ? "auto" : "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 600ms ease",
      }}
      aria-hidden={!interactive}
    >
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [3.6, 3.0, 5.0], fov: 32 }}
        onCreated={({ gl }) => {
          gl.setClearColor(CLEAR_COLOR, 1)
        }}
      >
        <SceneContent />
      </Canvas>
    </div>
  )
}
