"use client"

import { useMemo } from "react"
import { Vinyl } from "./vinyl"
import { CrateDivider } from "./crate-divider"
import { useSceneStore } from "@/lib/store/scene-store"
import { projects, type ProjectCategory } from "@/lib/projects"

// Wooden-crate palette — warm band, reads as a lived-in record box.
const WOOD = "#a0661f"
const WOOD_DARK = "#6b3f15"
const WOOD_EDGE = "#2A2520"
const INTERIOR = "#1f140a"
const BRASS = "#b08a3c"

// Square crate — users look down into it, sleeves stack front-to-back.
const CRATE_WIDTH = 0.95
const CRATE_DEPTH = 1.2
const CRATE_HEIGHT_BACK = 0.48
const CRATE_HEIGHT_FRONT = 0.3
const WALL = 0.04

const LEAN_DEG = 12
const LEAN_RAD = (LEAN_DEG * Math.PI) / 180

const CATEGORY_ORDER: ProjectCategory[] = ["designs", "games", "prototypes"]
const DIVIDER_LABEL: Record<ProjectCategory, string> = {
  designs: "DESIGN",
  games: "GAME",
  prototypes: "PROTO",
}

type Slot =
  | { kind: "divider"; label: string; category: ProjectCategory }
  | { kind: "vinyl"; project: (typeof projects)[number] }

function buildSlots(): Slot[] {
  const slots: Slot[] = []
  for (const category of CATEGORY_ORDER) {
    const group = projects.filter((p) => p.category === category)
    if (group.length === 0) continue
    slots.push({ kind: "divider", label: DIVIDER_LABEL[category], category })
    for (const p of group) slots.push({ kind: "vinyl", project: p })
  }
  return slots
}

export function VinylCrate() {
  const slots = useMemo(buildSlots, [])
  const step = CRATE_DEPTH / (slots.length + 1)

  const hoveredId = useSceneStore((s) => s.hoveredVinylId)
  const hoveredSlotIndex = useMemo(() => {
    if (!hoveredId) return null
    const idx = slots.findIndex(
      (s) => s.kind === "vinyl" && s.project.id === hoveredId,
    )
    return idx === -1 ? null : idx
  }, [hoveredId, slots])

  return (
    <group position={[0, 0.09, 0.55]} name="vinyl-crate">
      {/* Base plate */}
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[CRATE_WIDTH, 0.02, CRATE_DEPTH]} />
        <meshToonMaterial color={INTERIOR} />
      </mesh>

      {/* Back wall — tall, camera-facing at -Z */}
      <mesh
        position={[0, 0.02 + CRATE_HEIGHT_BACK / 2, -CRATE_DEPTH / 2 + WALL / 2]}
      >
        <boxGeometry args={[CRATE_WIDTH, CRATE_HEIGHT_BACK, WALL]} />
        <meshToonMaterial color={WOOD} />
      </mesh>

      {/* Front wall — lower, so vinyl tops + covers peek above */}
      <mesh
        position={[0, 0.02 + CRATE_HEIGHT_FRONT / 2, CRATE_DEPTH / 2 - WALL / 2]}
      >
        <boxGeometry args={[CRATE_WIDTH, CRATE_HEIGHT_FRONT, WALL]} />
        <meshToonMaterial color={WOOD} />
      </mesh>

      {/* Side walls */}
      <mesh
        position={[
          -CRATE_WIDTH / 2 + WALL / 2,
          0.02 + CRATE_HEIGHT_BACK / 2,
          0,
        ]}
      >
        <boxGeometry args={[WALL, CRATE_HEIGHT_BACK, CRATE_DEPTH]} />
        <meshToonMaterial color={WOOD} />
      </mesh>
      <mesh
        position={[
          CRATE_WIDTH / 2 - WALL / 2,
          0.02 + CRATE_HEIGHT_BACK / 2,
          0,
        ]}
      >
        <boxGeometry args={[WALL, CRATE_HEIGHT_BACK, CRATE_DEPTH]} />
        <meshToonMaterial color={WOOD} />
      </mesh>

      {/* Dark wood trim along the top rim of the sides (cel outline) */}
      <mesh
        position={[
          -CRATE_WIDTH / 2 + WALL / 2,
          0.02 + CRATE_HEIGHT_BACK + 0.004,
          0,
        ]}
      >
        <boxGeometry args={[WALL + 0.002, 0.008, CRATE_DEPTH]} />
        <meshBasicMaterial color={WOOD_DARK} />
      </mesh>
      <mesh
        position={[
          CRATE_WIDTH / 2 - WALL / 2,
          0.02 + CRATE_HEIGHT_BACK + 0.004,
          0,
        ]}
      >
        <boxGeometry args={[WALL + 0.002, 0.008, CRATE_DEPTH]} />
        <meshBasicMaterial color={WOOD_DARK} />
      </mesh>
      {/* Back-wall top rim */}
      <mesh
        position={[
          0,
          0.02 + CRATE_HEIGHT_BACK + 0.004,
          -CRATE_DEPTH / 2 + WALL / 2,
        ]}
      >
        <boxGeometry args={[CRATE_WIDTH, 0.008, WALL + 0.002]} />
        <meshBasicMaterial color={WOOD_DARK} />
      </mesh>

      {/* Front handle notch (visual detail — dark slot across the front panel) */}
      <mesh
        position={[
          0,
          0.02 + CRATE_HEIGHT_FRONT - 0.04,
          CRATE_DEPTH / 2 - WALL / 2 + 0.001,
        ]}
      >
        <boxGeometry args={[0.28, 0.035, 0.002]} />
        <meshBasicMaterial color={WOOD_EDGE} />
      </mesh>

      {/* Brass medallion on the front */}
      <mesh
        position={[
          0,
          0.02 + 0.1,
          CRATE_DEPTH / 2 - WALL / 2 + 0.003,
        ]}
      >
        <cylinderGeometry args={[0.038, 0.038, 0.005, 24]} />
        <meshBasicMaterial color={BRASS} />
      </mesh>
      <mesh
        position={[
          0,
          0.02 + 0.1,
          CRATE_DEPTH / 2 - WALL / 2 + 0.006,
        ]}
      >
        <cylinderGeometry args={[0.032, 0.032, 0.001, 24]} />
        <meshBasicMaterial color={WOOD_DARK} />
      </mesh>

      {/* Slots — stacked along Z, leaning back toward -Z so covers face +Z */}
      {slots.map((slot, i) => {
        const z = -CRATE_DEPTH / 2 + step * (i + 1)
        if (slot.kind === "divider") {
          return (
            <CrateDivider
              key={`div-${slot.label}`}
              position={[0, 0.02, z]}
              label={slot.label}
            />
          )
        }
        return (
          <Vinyl
            key={slot.project.id}
            project={slot.project}
            basePosition={[0, 0.035, z]}
            baseRotation={[-LEAN_RAD, 0, 0]}
            slotIndex={i}
            hoveredSlotIndex={hoveredSlotIndex}
          />
        )
      })}
    </group>
  )
}
