import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { createDeskReflections, deskReflectionForms } from '../../components/cockpit/desk-reflections'
import { makeEdgeGlow } from '../../components/cockpit/highlights'
import { setFrameTimes } from '../../components/cockpit/frame-times'

function fixture() {
  const table = new THREE.Group()
  const root = new THREE.Group()
  table.add(root)
  const base = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 1), new THREE.MeshStandardMaterial({ color: 0xD2CCBF }))
  base.position.y = 0.3
  root.add(base)
  return { table, root, base }
}

describe('cached partial desk reflections', () => {
  it('derives colored silhouettes from actual geometry and cancels table offsets', () => {
    const { table, root } = fixture()
    const platter = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 24), new THREE.MeshStandardMaterial({ color: 0x4B6E4F }))
    platter.position.set(-0.3, 0.55, 0)
    root.add(platter)
    root.position.set(-3.45, 0, 0.4)
    root.rotation.y = 0.2
    root.scale.setScalar(1.9)
    const before = deskReflectionForms([root], table)
    expect(before).toHaveLength(2)
    expect(before.some(f => f.color === '#4b6e4f' && f.points.length > 8)).toBe(true)
    expect(before.some(f => f.color === '#d2ccbf')).toBe(true)
    table.position.set(0, -2.8, -6.4)
    table.rotation.y = 0.35
    const after = deskReflectionForms([root], table)
    expect(after).toHaveLength(before.length)
    after.forEach((form, i) => {
      expect(form.height).toBeCloseTo(before[i]!.height)
      expect(form.points.length).toBe(before[i]!.points.length)
      form.points.forEach((point, j) => {
        expect(point.x).toBeCloseTo(before[i]!.points[j]!.x)
        expect(point.z).toBeCloseTo(before[i]!.points[j]!.z)
      })
    })
  })

  it('excludes invisible picks, glass, artwork, raised objects and opted-out subtrees', () => {
    const { table, root, base } = fixture()
    const invisible = base.clone()
    invisible.material = new THREE.MeshStandardMaterial({ opacity: 0, transparent: true })
    root.add(invisible)
    const glass = base.clone()
    glass.material = new THREE.MeshPhysicalMaterial({ transmission: 1 })
    root.add(glass)
    const artwork = base.clone()
    artwork.material = new THREE.MeshStandardMaterial({ map: new THREE.Texture() })
    root.add(artwork)
    const raised = base.clone()
    raised.position.y = 2
    root.add(raised)
    const hidden = base.clone()
    hidden.visible = false
    root.add(hidden)
    for (const exclusion of ['noPick', 'noGlow']) {
      const group = new THREE.Group()
      group.userData[exclusion] = true
      group.add(base.clone())
      root.add(group)
    }
    expect(deskReflectionForms([root], table)).toHaveLength(1)
    expect(invisible.material.opacity).toBe(0)
    expect(base.position.y).toBe(0.3)
  })

  it('caps opacity, caches transforms/theme, and allocates no render target', () => {
    const pixels = { data: new Uint8ClampedArray(384 * 160 * 4).fill(255) }
    const context = {
      clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
      closePath: vi.fn(), fill: vi.fn(), putImageData: vi.fn(),
      getImageData: vi.fn(() => pixels), filter: '', globalAlpha: 1, fillStyle: '',
    }
    const canvas = { width: 0, height: 0, getContext: () => context }
    vi.stubGlobal('document', { createElement: () => canvas })
    try {
      const { table, root } = fixture()
      const reflection = createDeskReflections(table)
      expect([canvas.width, canvas.height]).toEqual([384, 160])
      reflection.update([root], 'dark')
      reflection.update([root], 'dark')
      expect(context.putImageData).toHaveBeenCalledTimes(1)
      expect(pixels.data[0]).toBe(255)
      expect(pixels.data[3]).toBe(26)
      root.position.x += 0.1
      reflection.update([root], 'dark')
      reflection.update([root], 'light')
      expect(context.putImageData).toHaveBeenCalledTimes(3)
      reflection.mesh.visible = false
      reflection.update([root], 'dark')
      expect(context.putImageData).toHaveBeenCalledTimes(3)
      expect(reflection.mesh.userData).toMatchObject({ noPick: true, noGlow: true })
      expect(reflection.mesh.material.depthWrite).toBe(false)
      reflection.mesh.geometry.dispose()
      reflection.mesh.material.map?.dispose()
      reflection.mesh.material.dispose()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('steady hover traces', () => {
  it('retains entry/exit fades and exclusions without a held-hover pulse', () => {
    const { root, base } = fixture()
    const excluded = new THREE.Group()
    excluded.userData.noGlow = true
    const excludedMesh = base.clone()
    excluded.add(excludedMesh)
    root.add(excluded)
    const glow = makeEdgeGlow()
    const material = glow.attach('test', root)
    const tick = (time: number) => {
      setFrameTimes(0.1, time, null)
      glow.tick(time, 1)
    }
    tick(0)
    expect(material.opacity).toBe(0)
    glow.setBoost('test', 1)
    tick(0.1)
    expect(material.opacity).toBeGreaterThan(0)
    expect(material.opacity).toBeLessThan(0.87)
    for (let i = 2; i <= 80; i++) tick(i * 0.1)
    expect(material.opacity).toBeCloseTo(0.87, 10)
    for (let i = 81; i <= 120; i++) {
      tick(i * 0.1)
      expect(material.opacity).toBeCloseTo(0.87, 10)
    }
    expect(excludedMesh.children).toHaveLength(0)
    expect(base.children.some(child => child.userData.__edgeGlow)).toBe(true)
    glow.setBoost('test', 0)
    tick(12.1)
    expect(material.opacity).toBeGreaterThan(0)
    expect(material.opacity).toBeLessThan(0.87)
    for (let i = 122; i <= 160; i++) tick(i * 0.1)
    expect(material.opacity).toBeLessThan(0.001)
    glow.dispose()
    expect(base.children).toHaveLength(0)
  })
})
