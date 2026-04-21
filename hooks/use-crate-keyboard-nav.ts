"use client"

import { useEffect } from "react"
import { projects } from "@/lib/projects"
import { useSceneStore } from "@/lib/store/scene-store"

// Desk-view keyboard navigation:
//  ← / → cycle the currently-visible (respecting filterCategory) vinyls,
//         setting hoveredVinylId (so VinylHoverLabel follows the focus).
//  Enter — selectVinyl(hoveredVinylId).
// Project-view:
//  Esc   — eject().
//
// Mounted once at the page level so we have a single listener.
export function useCrateKeyboardNav() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const s = useSceneStore.getState()

      if (s.view === "project") {
        if (e.key === "Escape") {
          e.preventDefault()
          s.eject()
        }
        return
      }

      if (s.view !== "desk") return

      const visible = projects.filter(
        (p) => s.filterCategory === "all" || p.category === s.filterCategory,
      )
      if (visible.length === 0) return

      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault()
        const currentIdx = s.hoveredVinylId
          ? visible.findIndex((p) => p.id === s.hoveredVinylId)
          : -1
        const delta = e.key === "ArrowRight" ? 1 : -1
        const nextIdx =
          currentIdx === -1
            ? delta === 1
              ? 0
              : visible.length - 1
            : (currentIdx + delta + visible.length) % visible.length
        s.setHoveredVinyl(visible[nextIdx].id)
        return
      }

      if (e.key === "Enter") {
        if (!s.hoveredVinylId) return
        e.preventDefault()
        s.selectVinyl(s.hoveredVinylId)
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])
}
