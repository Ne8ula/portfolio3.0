import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { OBB } from 'three/examples/jsm/math/OBB.js'
import { buildTeaSet } from '../../components/cockpit/tea-set'
import { buildIncense } from '../../components/cockpit/incense'
import { buildCoffee } from '../../components/cockpit/coffee'
import { buildDecorations } from '../../components/cockpit/decorations'
import { buildGlassMac } from '../../components/cockpit/glass-mac'
import { VINYL_CRATE_FOCUS_POINTS_LOCAL } from '../../components/cockpit/vinyl-crate'
import { setFrameTimes } from '../../components/cockpit/frame-times'
import { createRandomSource } from '../../lib/random/seeded-streams'

type Hit = { key: string }
type Activation = {
  owner: string
  hitTest(point: { clientX: number; clientY: number }): Hit | null
  action(hit: Hit): void
}
const activation = vi.hoisted(() => ({ handlers: [] as Activation[], dispose: vi.fn() }))
vi.mock('../../components/cockpit/pointer-activation', () => ({
  registerPointerActivation: (_element: unknown, handler: Activation) => {
    activation.handlers.push(handler)
    return activation.dispose
  },
}))
// Text decals are not collision geometry. Keep their parent transforms without
// loading fonts/assets; all structural meshes and transmission materials are real.
vi.mock('../../components/cockpit/decals', () => ({
  makeTextDecal: () => new THREE.Group(), makeDecal: () => new THREE.Group(),
}))

type Ritual = THREE.Group & { tick?: (dt: number, t: number) => void; dispose: () => void }
type Pose = { x?: number; y?: number; z?: number; ry?: number; s?: number }
type BridgeWindow = {
  __cockpitTeaSet: { set(pose: Pose): void } | null
  __cockpitIncense: { set(pose: Pose): void } | null
  __cockpitCoffee: { setDripper(pose: Pose): void; setMug(pose: Pose): void } | null
  __cockpitViewMode?: string
}
let bridge: BridgeWindow
const roots: Ritual[] = []

beforeEach(() => {
  activation.handlers.length = 0
  activation.dispose.mockClear()
  bridge = {} as BridgeWindow
  vi.stubGlobal('window', bridge)
  const context = new Proxy({
    createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    createRadialGradient: () => ({ addColorStop: () => undefined }),
    createLinearGradient: () => ({ addColorStop: () => undefined }),
  }, { get: (target, key) => Reflect.get(target, key) ?? (() => undefined) })
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => context }) })
})
afterEach(() => {
  for (const root of roots.splice(0)) root.dispose()
  vi.unstubAllGlobals()
})

function fixture() {
  const scene = new THREE.Scene()
  const table = new THREE.Group()
  scene.add(table)
  const options = { randomSource: createRandomSource('ritual-geometry') }
  const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 100)
  const renderer = { domElement: {
    style: {}, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 900, bottom: 900, width: 900, height: 900 }),
  } }
  const tea = buildTeaSet(scene, table, options) as Ritual
  const incense = buildIncense(scene, table, options) as Ritual
  const coffee = buildCoffee(scene, table, camera, renderer, options) as Ritual
  roots.push(tea, incense, coffee)
  const station = coffee.getObjectByName('coffee-station')!
  const mug = coffee.getObjectByName('coffee-mug')!
  const handler = activation.handlers.find(h => h.owner === 'coffee')!
  const tick = (dt: number, time: number) => {
    setFrameTimes(dt, time, null)
    coffee.tick!(dt, time)
    table.updateMatrixWorld(true)
  }
  return { scene, table, tea, incense, coffee, station, mug, handler, camera, renderer, tick }
}

function meshBoxes(root: THREE.Object3D) {
  root.updateWorldMatrix(true, true)
  const boxes: { name: string; box: THREE.Box3; oriented: OBB }[] = []
  root.traverseVisible(object => {
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    if (materials.every(m => !m.visible || m.opacity === 0)) return
    object.geometry.computeBoundingBox()
    boxes.push({
      name: object.name || object.geometry.type,
      box: object.geometry.boundingBox!.clone().applyMatrix4(object.matrixWorld),
      oriented: new OBB().fromBox3(object.geometry.boundingBox!).applyMatrix4(object.matrixWorld),
    })
  })
  return boxes
}
function bounds(root: THREE.Object3D) {
  return meshBoxes(root).reduce((result, item) => result.union(item.box), new THREE.Box3())
}
function localSize(root: THREE.Object3D) {
  const copy = root.clone(true)
  copy.position.set(0, 0, 0)
  copy.rotation.set(0, 0, 0)
  copy.scale.setScalar(1)
  return bounds(copy).getSize(new THREE.Vector3())
}
function material(root: THREE.Object3D, name: string) {
  return (root.getObjectByName(name) as THREE.Mesh).material as THREE.MeshPhysicalMaterial
}
function assertSeparate(a: THREE.Object3D, b: THREE.Object3D, time: number) {
  const bBoxes = meshBoxes(b)
  for (const left of meshBoxes(a)) for (const right of bBoxes) {
    if (left.box.intersectsBox(right.box) && left.oriented.intersectsOBB(right.oriented)) {
      throw new Error(`${a.name}/${left.name} ${JSON.stringify(left.box)} intersects ${b.name}/${right.name} ${JSON.stringify(right.box)} at ${time.toFixed(3)}s`)
    }
  }
}

describe('assembled ritual objects', () => {
  it('seats actual bottoms at the desk and stays within the authored envelopes', () => {
    const { tea, incense, station, mug } = fixture()
    for (const [root, limit] of [
      [tea, new THREE.Vector3(1.91, 1.05, 1.36)],
      [incense, new THREE.Vector3(0.51, 1.21, 0.61)],
      [station, new THREE.Vector3(1.40, 1.65, 1.25)],
      [mug, new THREE.Vector3(0.95, 0.80, 0.90)],
    ] as const) {
      expect(bounds(root).min.y).toBeCloseTo(0.18, 5)
      const size = localSize(root)
      for (const axis of ['x', 'y', 'z'] as const) expect(size[axis]).toBeLessThanOrEqual(limit[axis])
    }
    expect(bounds(tea).intersectsBox(bounds(station))).toBe(false)
    expect(bounds(tea).intersectsBox(bounds(mug))).toBe(false)
    expect(bounds(tea).intersectsBox(bounds(incense))).toBe(false)
  })

  it('uses thin clear walls, frosted rear/cone surfaces and separate opaque cores', () => {
    const { tea, incense, station, mug } = fixture()
    for (const [root, name] of [
      [tea, 'tray-clear-base'], [tea, 'pot-clear-front'], [incense, 'clear-plinth'],
      [station, 'receiving-clear-wall'], [mug, 'mug-clear-wall'],
    ] as const) {
      const wall = material(root, name)
      expect(wall.transmission).toBeGreaterThan(0.8)
      expect(wall.thickness).toBeGreaterThanOrEqual(0.02)
      expect(wall.thickness).toBeLessThanOrEqual(0.04)
      expect(wall.iridescence).toBe(0)
    }
    expect(material(tea, 'pot-frost-rear').roughness).toBeGreaterThan(material(tea, 'pot-clear-front').roughness)
    for (const [root, name] of [
      [tea, 'pot-filter-basket'], [tea, 'pot-ink-core'], [tea, 'stepped-lid'],
      [incense, 'ink-ash-basin'], [incense, 'ceramic-socket'],
      [station, 'cream-paper-filter'], [station, 'ink-grounds'], [mug, 'mug-opaque-inner-base'],
    ] as const) {
      expect(material(root, name).opacity).toBe(1)
      expect(material(root, name).transmission ?? 0).toBe(0)
    }
    expect(tea.getObjectsByProperty('name', 'cup-thick-rim')).toHaveLength(2)
    expect(incense.getObjectsByProperty('name', 'recessed-fastener')).toHaveLength(2)
    expect(station.getObjectsByProperty('name', 'handle-pad')).toHaveLength(2)
  })

  it('leaves the ritual cluster outside the fixed crate shell and pulled-sleeve/disc envelope', () => {
    const { tea, incense, station, mug } = fixture()
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(-3.45, 0.18, 0.40),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.20),
      new THREE.Vector3(1.9, 1.9, 1.9),
    )
    const crate = new THREE.Box3().setFromPoints(VINYL_CRATE_FOCUS_POINTS_LOCAL.map(
      p => new THREE.Vector3(p.x, p.y, p.z).applyMatrix4(matrix),
    ))
    for (const object of [tea, station, mug]) {
      expect(bounds(object).max.x).toBeLessThan(crate.min.x - 0.03)
    }
    // Foreground incense is now owner-authored in front, with a full travel
    // gap. Actual six-sleeve projected clearance is covered by lamp/scene tests.
    expect(bounds(incense).min.z).toBeGreaterThanOrEqual(crate.max.z + 0.15)
  })

  it('keeps passive bridges and lifecycle without any incense plume or time-driven changes', () => {
    const { scene, tea, incense } = fixture()
    const sceneCount = scene.children.length
    const before = incense.toJSON()
    for (let time = 0; time < 10; time += 0.1) incense.tick!(0.1, time)
    expect(incense.toJSON()).toEqual(before)
    expect(incense.getObjectsByProperty('type', 'Sprite')).toHaveLength(0)
    expect(scene.children).toHaveLength(sceneCount)
    expect(Object.keys(bridge.__cockpitTeaSet!)).toEqual(['set'])
    expect(Object.keys(bridge.__cockpitIncense!)).toEqual(['set'])
    bridge.__cockpitTeaSet!.set({ x: 1, y: 2, z: 3, ry: 0.2, s: 1.1 })
    bridge.__cockpitIncense!.set({ x: 4, y: 5, z: 6, ry: 0.3, s: 0.9 })
    expect(tea.position.toArray()).toEqual([1, 2, 3])
    expect(incense.scale.x).toBe(0.9)
    tea.dispose()
    incense.dispose()
    expect(bridge.__cockpitTeaSet).toBeNull()
    expect(bridge.__cockpitIncense).toBeNull()
  })

  it('keeps the modeled spout pinned over the mug and the liquid level through a full cycle', () => {
    const { coffee, station, mug, handler, tick, renderer } = fixture()
    const rest = station.position.clone()
    const spout = coffee.getObjectByName('receiving-open-spout')!
    const pool = coffee.getObjectByName('receiving-liquid')!
    const liquid = coffee.getObjectByName('mug-liquid')!
    handler.action({ key: 'coffee-dripper' })
    for (let i = 1; i <= 540; i++) {
      tick(1 / 120, i / 120)
      if (i > 120 && i < 336) {
        const mouth = spout.localToWorld(new THREE.Vector3(0, 0.18, 0))
        expect(mouth.x).toBeCloseTo(mug.position.x)
        expect(mouth.z).toBeCloseTo(mug.position.z)
        const up = new THREE.Vector3(0, 1, 0).transformDirection(pool.matrixWorld)
        expect(up.y).toBeCloseTo(1)
      }
    }
    expect(station.position.distanceTo(rest)).toBeLessThan(0.00001)
    expect(liquid.scale.y).toBeCloseTo(0.48, 2)
    handler.action({ key: 'coffee-mug' })
    for (let i = 1; i <= 500; i++) tick(1 / 120, 4.5 + i / 120)
    expect(liquid.scale.y).toBe(0.0001)
    expect(pool.scale.y).toBeCloseTo(0.34)
    expect(Object.keys(bridge.__cockpitCoffee!)).toEqual(['setDripper', 'setMug'])
    coffee.dispose()
    expect(bridge.__cockpitCoffee).toBeNull()
    expect(activation.dispose).toHaveBeenCalledTimes(1)
    expect(renderer.domElement.removeEventListener).toHaveBeenCalledWith('pointermove', expect.any(Function))
  })

  it('clears the mug, tea, incense and fixed sax geometry throughout the coffee sweep', () => {
    const { scene, table, tea, incense, station, mug, handler, camera, renderer, tick } = fixture()
    const decor = buildDecorations(scene, table, camera, renderer) as Ritual
    roots.push(decor)
    const sax = decor.children[0]!
    expect(sax.position.toArray()).toEqual([-6.10, 0.18, -2.65])
    assertSeparate(tea, sax, 0)
    assertSeparate(mug, tea, 0)
    assertSeparate(mug, incense, 0)
    handler.action({ key: 'coffee-dripper' })
    for (let i = 0; i <= 540; i++) {
      tick(i ? 1 / 120 : 0, i / 120)
      for (const obstacle of [mug, tea, incense, sax]) assertSeparate(station, obstacle, i / 120)
    }
  })

  it('retains real coffee pick hits, focus exclusion and setters after recalibration', () => {
    const { table, station, mug, handler, camera, tick } = fixture()
    camera.position.set(-7.6, 6, 6)
    camera.lookAt(-7.6, 0.8, -0.5)
    camera.updateMatrixWorld(true)
    const point = (object: THREE.Object3D, y: number) => {
      table.updateMatrixWorld(true)
      const v = object.localToWorld(new THREE.Vector3(0, y, 0)).project(camera)
      return { clientX: (v.x + 1) * 450, clientY: (1 - v.y) * 450 }
    }
    expect(handler.hitTest(point(station, 1))).toEqual({ key: 'coffee-dripper' })
    bridge.__cockpitViewMode = 'crate'
    expect(handler.hitTest(point(station, 1))).toBeNull()
    bridge.__cockpitViewMode = 'cockpit'
    bridge.__cockpitCoffee!.setDripper({ x: -8.1, y: 0.2, z: -1.3, s: 1.05 })
    bridge.__cockpitCoffee!.setMug({ x: -7.7, y: 0.2, z: 0.2, ry: -0.3, s: 1.02 })
    expect(station.position.toArray()).toEqual([-8.1, 0.2, -1.3])
    expect(mug.rotation.y).toBe(-0.3)
    handler.action({ key: 'coffee-dripper' })
    for (let i = 1; i <= 270; i++) tick(1 / 60, i / 60)
    expect(handler.hitTest(point(mug, 0.4))).toEqual({ key: 'coffee-mug' })
  })

  it('keeps the repositioned tablet and its moving stylus clear of AX-01, keyboard and mouse', () => {
    const { scene, table, camera, renderer } = fixture()
    const decor = buildDecorations(scene, table, camera, renderer) as Ritual
    roots.push(decor)
    const tablet = decor.children[1]!
    expect(tablet.userData.groundingProfile).toBe('tablet')
    const pc = new THREE.Group()
    pc.name = 'AX-01'
    pc.position.set(4.65, 0.18, -1.10)
    pc.rotation.y = -0.42
    pc.scale.setScalar(1.35)
    table.add(pc)
    buildGlassMac(pc, { randomSource: createRandomSource('ritual-clearance') })
    const handler = activation.handlers.find(h => h.owner === 'decorations')!
    handler.action({ key: 'tablet' })
    for (let i = 0; i <= 480; i++) {
      decor.tick!(i ? 1 / 120 : 0, i / 120)
      assertSeparate(tablet, pc, i / 120)
    }
  })
})
