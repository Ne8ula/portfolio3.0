import * as THREE from "three"
import { projects, type Project, type ProjectCategory } from "@/lib/projects"

// Mirrors the constants baked into components/scene/vinyl-crate.tsx.
// Kept in sync here so VinylTransport can resolve world poses for arc
// endpoints without importing component internals.
const CRATE_POSITION = new THREE.Vector3(0, 0.09, 0.55)
const CRATE_DEPTH = 1.2
const LEAN_DEG = 12
const LEAN_RAD = (LEAN_DEG * Math.PI) / 180

// Vinyl group origin sits at the bottom of the sleeve (bottom-pivot flip).
// The mesh sits MESH_Y above the origin, so sleeve centre in world space
// is origin + rotate([0, MESH_Y, 0], baseRotation).
const BASE_Y_LOCAL = 0.035
const MESH_Y = 0.26

const CATEGORY_ORDER: ProjectCategory[] = ["designs", "games", "prototypes"]

type Slot =
  | { kind: "divider"; category: ProjectCategory }
  | { kind: "vinyl"; project: Project }

function buildSlots(): Slot[] {
  const slots: Slot[] = []
  for (const category of CATEGORY_ORDER) {
    const group = projects.filter((p) => p.category === category)
    if (group.length === 0) continue
    slots.push({ kind: "divider", category })
    for (const p of group) slots.push({ kind: "vinyl", project: p })
  }
  return slots
}

const SLOT_TABLE = (() => {
  const slots = buildSlots()
  const step = CRATE_DEPTH / (slots.length + 1)
  const map = new Map<string, { zLocal: number }>()
  slots.forEach((slot, i) => {
    if (slot.kind !== "vinyl") return
    const zLocal = -CRATE_DEPTH / 2 + step * (i + 1)
    map.set(slot.project.id, { zLocal })
  })
  return map
})()

// Mirrors Turntable's world position + spindle offset.
const TURNTABLE_POSITION = new THREE.Vector3(1.6, 0.09, 0.5)
const SPINDLE_LOCAL = new THREE.Vector3(-0.05, 0.135, 0)

export function getCrateSlotWorldPose(projectId: string) {
  const entry = SLOT_TABLE.get(projectId)
  const zLocal = entry ? entry.zLocal : 0

  // rotate([0, MESH_Y, 0], Rx(-LEAN_RAD)) moves the centre up-and-back of
  // the bottom-pivot origin.
  const originY = CRATE_POSITION.y + BASE_Y_LOCAL
  const originZ = CRATE_POSITION.z + zLocal
  const centerY = originY + MESH_Y * Math.cos(-LEAN_RAD)
  const centerZ = originZ + MESH_Y * Math.sin(-LEAN_RAD)

  return {
    position: new THREE.Vector3(CRATE_POSITION.x, centerY, centerZ),
    rotation: new THREE.Euler(-LEAN_RAD, 0, 0),
  }
}

export function getPlatterWorldPose() {
  return {
    position: new THREE.Vector3(
      TURNTABLE_POSITION.x + SPINDLE_LOCAL.x,
      TURNTABLE_POSITION.y + SPINDLE_LOCAL.y,
      TURNTABLE_POSITION.z + SPINDLE_LOCAL.z,
    ),
    // Record lays flat: rotate group around X so the sleeve's +Z face points up.
    rotation: new THREE.Euler(-Math.PI / 2, 0, 0),
  }
}
