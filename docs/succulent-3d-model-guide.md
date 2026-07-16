# Succulent Deco 3D Model Guide

This guide describes how to turn the generated succulent product image into a proper 3D object for the current cockpit landing page.

Reference image:

- `public/assets/succulent-deco.png`
- `public/assets/succulent-deco-source.png`

Current implementation target:

- File: `components/cockpit/decorations.ts`
- Existing object: `item('plant', -1.75, -1.2, 0)`
- Scene system: imperative three.js, built procedurally inside `buildDecorations`
- Material language: shared `PALETTE` and `makeFrost` from `components/cockpit/materials.ts`

## Goal

Replace the simple current plant, which is a frosted pot plus seven flat leaf planes, with a compact product-rendered succulent that matches the cockpit object language:

- Frosted translucent cream acrylic cylinder pot
- Dark inset soil disk
- Sculptural rosette of thick jade and sage leaves
- Tiny jade registration dots and vertical tick marks on the pot
- Small decoration scale, not a hero object
- No HUD tag, no interaction, no animation unless added later

The model should read clearly from the default cockpit camera, but it should not compete with the turntable, crate, PC, or coffee objects.

## Recommended Path

Build it procedurally in `decorations.ts`, using primitives and custom leaf geometry.

That fits the current cockpit best because the rest of the decorative objects are already procedural three.js meshes. It also keeps the bundle simple and avoids adding a GLB loader path just for one small desk object.

Use the generated PNG as visual reference, not as a runtime texture.

## Scale And Placement

Start from the current plant placement:

```ts
const g = item('plant', -1.75, -1.2, 0)
```

Suggested first pass:

```ts
const g = item('plant', -1.75, -1.2, 0)
g.scale.setScalar(1.15)
```

Approximate target dimensions in local plant coordinates:

- Pot radius: `0.18` to `0.22`
- Pot height: `0.22` to `0.28`
- Soil top: `y = 0.22` to `0.26`
- Leaf rosette top: `y = 0.55` to `0.68`
- Full object height after scale: under `0.85` desk units

If it starts visually fighting the turntable, reduce scale to `0.95` or move it slightly farther back:

```ts
window.__cockpitDecor.set('plant', { x: -1.9, z: -1.35, s: 1.0 })
```

Use the live bridge above in the browser console, then bake the final values into `decorations.ts`.

## Materials

Reuse existing shared materials where possible:

```ts
const frost = makeFrost({
  color: 0xE7E2D9,
  transmission: 0.75,
  roughness: 0.32,
  thickness: 0.06,
})

const soil = new THREE.MeshStandardMaterial({
  color: 0x241811,
  roughness: 0.92,
})

const leafMatA = new THREE.MeshPhysicalMaterial({
  color: PALETTE.jade,
  roughness: 0.58,
  clearcoat: 0.24,
  clearcoatRoughness: 0.55,
})

const leafMatB = new THREE.MeshPhysicalMaterial({
  color: PALETTE.jadeLt,
  roughness: 0.62,
  clearcoat: 0.18,
  clearcoatRoughness: 0.6,
})

const jade = new THREE.MeshStandardMaterial({
  color: PALETTE.jade,
  roughness: 0.62,
})
```

Keep the leaves muted. Avoid bright plant greens, terracotta, and warm orange browns; those break the cockpit palette.

## Pot Geometry

Use `LatheGeometry` instead of a plain cylinder. The generated image has a satin acrylic pot with a soft rounded base and a visible rim.

```ts
const potPts = [
  [0.000, 0.000],
  [0.172, 0.000],
  [0.190, 0.018],
  [0.202, 0.055],
  [0.205, 0.210],
  [0.198, 0.245],
  [0.182, 0.262],
].map(([x, y]) => new THREE.Vector2(x, y))

mesh(g, new THREE.LatheGeometry(potPts, 48), frost, 0, 0, 0)
```

Add a subtle rim:

```ts
const rim = mesh(g, new THREE.TorusGeometry(0.196, 0.008, 10, 48), frost, 0, 0.258, 0)
rim.rotation.x = Math.PI / 2
```

Add dark soil as a shallow disk just below the rim:

```ts
mesh(
  g,
  new THREE.CylinderGeometry(0.176, 0.176, 0.018, 32),
  soil,
  0,
  0.248,
  0
)
```

## Leaf Geometry

Avoid flat `PlaneGeometry` leaves. The reference image is a succulent rosette with thick, rounded leaves.

A practical procedural approach is to create one custom leaf mesh and instantiate it in rings.

### Leaf Shape

Use a flattened ellipsoid-like mesh with pointed ends. A good enough version can start from `SphereGeometry`:

```ts
function makeLeafGeometry(length = 0.26, width = 0.09, thickness = 0.035) {
  const geo = new THREE.SphereGeometry(1, 18, 10)
  geo.scale(width, thickness, length)

  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i)
    const tip = Math.abs(z) / length
    const taper = Math.max(0.18, 1 - Math.pow(tip, 1.8) * 0.55)
    pos.setX(i, pos.getX(i) * taper)
    pos.setY(i, pos.getY(i) * (0.75 + taper * 0.25))
  }

  geo.computeVertexNormals()
  return geo
}
```

This gives a pill-like succulent leaf. It will not be botanically perfect, but it will read well inside the cockpit because the scene already favors stylized product primitives.

For a sharper leaf tip, add a tiny cone or use a custom `BufferGeometry`. Start with the sphere version first; tune only if the silhouette feels too soft.

### Rosette Layout

Build the succulent as three rings plus a center cluster:

```ts
function addLeaf(parent, geo, mat, angle, radius, y, pitch, roll = 0, scale = 1) {
  const leaf = mesh(
    parent,
    geo,
    mat,
    Math.cos(angle) * radius,
    y,
    Math.sin(angle) * radius
  )

  leaf.rotation.y = -angle
  leaf.rotation.x = pitch
  leaf.rotation.z = roll
  leaf.scale.setScalar(scale)
  return leaf
}

const rosette = new THREE.Group()
rosette.position.y = 0.255
g.add(rosette)

const outer = makeLeafGeometry(0.18, 0.045, 0.018)
for (let i = 0; i < 12; i++) {
  const a = (i / 12) * Math.PI * 2 + 0.1
  addLeaf(rosette, outer, i % 2 ? leafMatA : leafMatB, a, 0.095, 0.045, -0.55, 0, 1.0)
}

const mid = makeLeafGeometry(0.15, 0.043, 0.02)
for (let i = 0; i < 9; i++) {
  const a = (i / 9) * Math.PI * 2 + 0.45
  addLeaf(rosette, mid, i % 2 ? leafMatB : leafMatA, a, 0.060, 0.115, -0.28, 0, 0.95)
}

const inner = makeLeafGeometry(0.115, 0.038, 0.019)
for (let i = 0; i < 6; i++) {
  const a = (i / 6) * Math.PI * 2
  addLeaf(rosette, inner, i % 2 ? leafMatA : leafMatB, a, 0.026, 0.178, -0.08, 0, 0.88)
}

const bud = makeLeafGeometry(0.085, 0.03, 0.017)
for (let i = 0; i < 4; i++) {
  const a = (i / 4) * Math.PI * 2 + 0.65
  addLeaf(rosette, bud, leafMatB, a, 0.010, 0.22, 0.10, 0, 0.72)
}
```

Expected tuning:

- If the plant looks too spiky, lower `length`.
- If it looks like a cabbage, raise `pitch` on outer leaves.
- If it looks too busy at cockpit scale, reduce the outer ring from 12 leaves to 10.
- If it disappears against the dark room, increase leaf clearcoat slightly rather than saturating the green.

## Pot Micrographics

The generated asset has tiny jade dots and vertical ticks. In the 3D scene, make these as small geometry, not readable decals.

Front center dot column:

```ts
for (let i = 0; i < 7; i++) {
  const dot = mesh(g, new THREE.CylinderGeometry(0.004, 0.004, 0.002, 10), jade, 0, 0.075 + i * 0.022, 0.206)
  dot.rotation.x = Math.PI / 2
}
```

Lower rim ticks:

```ts
for (let i = 0; i < 13; i++) {
  const a = -0.95 + i * 0.16
  const tick = mesh(
    g,
    new THREE.BoxGeometry(0.003, 0.028, 0.002),
    jade,
    Math.sin(a) * 0.19,
    0.028,
    Math.cos(a) * 0.19
  )
  tick.lookAt(0, 0.028, 0)
}
```

Keep the micrographics sparse. They should register as instrumentation details, not decoration for its own sake.

## Suggested Replacement Block

Replace only the current `POTTED PLANT` block in `decorations.ts`. Do not change the other decorations.

High-level structure:

```ts
// POTTED SUCCULENT - back-left of the turntable
{
  const g = item('plant', -1.75, -1.2, 0)
  g.scale.setScalar(1.08)

  // 1. pot material, soil material, leaf materials
  // 2. lathed frosted acrylic pot
  // 3. rim torus and soil disk
  // 4. rosette group with ringed thick leaves
  // 5. jade dots and tick marks
}
```

Keep helper functions local to the block if they are plant-specific. Move them above the block only if another decoration will reuse them.

## Optional GLB Pipeline

Use this only if the procedural version is not detailed enough.

1. Model the pot and leaves in Blender using the PNG as reference.
2. Keep the object centered at origin with its base on `y = 0`.
3. Use real geometry for the leaves and pot micrographics.
4. Export as GLB with applied transforms.
5. Keep the triangle count low, ideally under 8k triangles for the whole plant.
6. Add the file under `public/models/succulent-deco.glb`.
7. Load it from `decorations.ts` only if you are comfortable adding a `GLTFLoader` path to the cockpit runtime.

For this codebase, the procedural version is still preferred. The cockpit handoff notes state that the scene is intentionally procedural and avoids runtime model files.

## QA Checklist

After implementation, verify these views:

- Default cockpit view: plant reads as a small desk artifact, not a hero.
- Turntable area: plant does not intersect the platter, tonearm, or dust cover.
- Dark theme: silhouette is visible against charcoal.
- Light theme: frosted pot does not disappear against cream.
- Browser console: `window.__cockpitDecor.list()` includes `plant`.
- Live tuning: `window.__cockpitDecor.set('plant', { x, z, ry, s })` still works.

Visual pass criteria:

- The rosette silhouette is visible at normal viewport scale.
- Leaves are muted jade/sage, not saturated green.
- Pot feels like frosted acrylic, not ceramic or terracotta.
- Micrographics echo the PC, crate, turntable, and shaker language.
- No animation, cursor change, HUD tag, or click affordance is introduced.

## Implementation Notes

This object should stay quiet. The purpose is to upgrade the current placeholder plant into the same product-object language as the rest of the cockpit, not to create another focal point.

The fastest good pass is:

1. Replace the flat leaf planes with thick procedural leaves.
2. Replace the cylinder pot with a lathed frosted pot.
3. Add 2 or 3 jade micrographic details.
4. Tune scale and placement from the browser console.
5. Bake the final transform into `decorations.ts`.
