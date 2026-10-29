import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { PALETTE } from '../../components/cockpit/materials'
import { buildDeskLamp } from '../../components/cockpit/decorations'

// Execute the actual imperative rig block with real lights/meshes. Only the GPU
// PMREM bake is stubbed, so tests need neither a browser nor another render pass.
const source = readFileSync(new URL('../../components/cockpit/globe-canvas.tsx', import.meta.url), 'utf8')
const start = source.indexOf('    let pmrem = null;')
const end = source.indexOf('    // -- GLASS MAC:', start)
if (start < 0 || end < 0) throw new Error('Studio rig block not found')
const integrationStart = source.indexOf('    const lampEmitter = decorations?.')
const integrationEnd = source.indexOf('    let teaSet = null;', integrationStart)
if (integrationStart < 0 || integrationEnd < 0) throw new Error('Lamp key integration not found')
const buildRig = new Function('THREE', 'scene', 'tableGroup', 'token', 'PALETTE', 'renderer', 'decorations',
  `${source.slice(start, end)}; ${source.slice(integrationStart, integrationEnd)}; return { envScene, environmentTexture };`) as (
  three: object, scene: THREE.Scene, table: THREE.Group,
  token: (name: string) => THREE.Color, palette: object, renderer: object, decorations: THREE.Group,
) => { envScene: THREE.Scene; environmentTexture: THREE.Texture }

function fixture(theme: 'light' | 'dark') {
  const scene = new THREE.Scene()
  const table = new THREE.Group()
  scene.add(table)
  let bakes = 0
  class PMREMStub {
    compileEquirectangularShader() {}
    fromScene() { bakes++; return { texture: new THREE.Texture() } }
  }
  const token = (name: string) => new THREE.Color(name === '--warp-cream'
    ? '#E9E5DC' : name === '--scene-warm-light' ? '#FFC58F' : theme === 'light' ? '#FFFFFF' : '#000000')
  const lamp = buildDeskLamp()
  table.add(lamp)
  const rig = buildRig({ ...THREE, PMREMGenerator: PMREMStub }, scene, table, token, PALETTE, {}, lamp)
  return { scene, table, ...rig, bakes }
}

describe('listening-room task-light rig', () => {
  it('keeps four lights, a soft shadow-disabled spot and table-relative key/target', () => {
    const { scene, table, bakes } = fixture('dark')
    const lights: THREE.Light[] = []
    scene.traverse(o => { if (o instanceof THREE.Light) lights.push(o) })
    expect(lights).toHaveLength(4)
    const key = lights.find(o => o instanceof THREE.SpotLight) as THREE.SpotLight
    expect(key).toBeDefined()
    expect(key.intensity).toBe(140)
    expect(key.color.getHexString()).toBe('ffc58f')
    expect(key.angle).toBe(0.70)
    expect(key.penumbra).toBe(0.95)
    expect(key.decay).toBe(2)
    expect(key.distance).toBe(0)
    expect(lights.every(light => !light.castShadow)).toBe(true)
    expect(key.parent?.name).toBe('task-lamp-emitter')
    expect(key.target.parent).toBe(table)
    table.position.set(1, -0.2, -6.8)
    table.rotation.y = 0.3
    scene.updateMatrixWorld(true)
    const expected = new THREE.Vector3(-5, 2.4, -2.35).applyMatrix4(table.matrixWorld)
    expect(key.getWorldPosition(new THREE.Vector3()).distanceTo(expected)).toBeLessThan(1e-10)
    const target = new THREE.Vector3(-2.8, 0.175, -0.2).applyMatrix4(table.matrixWorld)
    expect(key.target.getWorldPosition(new THREE.Vector3()).distanceTo(target)).toBeLessThan(1e-10)
    expect(bakes).toBe(1)
  })

  it('uses the same environment on either cold theme load, with restrained fill and negative cards', () => {
    const light = fixture('light')
    const dark = fixture('dark')
    const panels = (scene: THREE.Scene) => scene.children.map(o => {
      const mesh = o as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>
      return { color: mesh.material.color.toArray(), position: mesh.position.toArray() }
    })
    expect(panels(light.envScene)).toEqual(panels(dark.envScene))
    expect(light.scene.environmentIntensity).toBe(0.45)
    expect(dark.scene.environmentIntensity).toBe(0.45)
    expect(light.scene.environment).toBe(light.environmentTexture)
    expect(light.envScene.children).toHaveLength(6)
    const intensities: number[] = []
    light.scene.traverse(o => { if (o instanceof THREE.Light) intensities.push(o.intensity) })
    expect(intensities.sort((a, b) => a - b)).toEqual([0.08, 0.13, 0.18, 140])
  })
})
