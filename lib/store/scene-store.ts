"use client"

import { create } from "zustand"
import type { ProjectCategory } from "@/lib/projects"

export type SceneView = "cube" | "zooming" | "desk" | "project"
export type CrateFilter = ProjectCategory | "all"

interface SceneState {
  view: SceneView
  selectedVinylId: string | null
  hoveredVinylId: string | null
  isPlaying: boolean
  // Final rotation (deg) the CSS cube landed on at handoff — used by
  // CubePaperweight so the 3D cube spawns at the same Y orientation, avoiding
  // a visible jump between the DOM cube and the R3F paperweight.
  cubeHandoffRotationY: number
  // Crate HUD filter — dims non-matching vinyls in the crate.
  filterCategory: CrateFilter
  // VinylTransport marks its animated project here so the matching crate
  // sleeve can hide itself for the duration of the arc + playback + eject.
  // Stays set through reverse so the crate vinyl doesn't pop in early.
  transportActiveVinylId: string | null

  setView: (view: SceneView) => void
  setHoveredVinyl: (id: string | null) => void
  enterDesk: (rotationY?: number) => void
  selectVinyl: (id: string) => void
  eject: () => void
  setFilterCategory: (filter: CrateFilter) => void
  setTransportActive: (id: string | null) => void
}

export const useSceneStore = create<SceneState>((set) => ({
  view: "cube",
  selectedVinylId: null,
  hoveredVinylId: null,
  isPlaying: false,
  cubeHandoffRotationY: 45,
  filterCategory: "all",
  transportActiveVinylId: null,

  setView: (view) => set({ view }),
  setHoveredVinyl: (id) => set({ hoveredVinylId: id }),
  enterDesk: (rotationY) =>
    set((s) =>
      s.view === "cube"
        ? {
            view: "zooming",
            ...(rotationY !== undefined ? { cubeHandoffRotationY: rotationY } : {}),
          }
        : s,
    ),
  selectVinyl: (id) =>
    set({ selectedVinylId: id, view: "project", isPlaying: true }),
  eject: () =>
    set({ view: "desk", selectedVinylId: null, isPlaying: false }),
  setFilterCategory: (filter) => set({ filterCategory: filter }),
  setTransportActive: (id) => set({ transportActiveVinylId: id }),
}))
