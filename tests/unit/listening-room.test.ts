import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { contactFootprints, contactShadowMask, createContactGrounding } from '../../components/cockpit/listening-room'

function fixture() {
  const table = new THREE.Group()
  const root = new THREE.Group()
  table.add(root)
  const foot = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 0.5), new THREE.MeshStandardMaterial())
  foot.position.set(2, 0.23, 1)
  root.add(foot)
  return { table, root, foot }
}

describe('listening-room contact grounding', () => {
  it('follows authored scale and rotation while cancelling the table FPV transform', () => {
    const { table, root } = fixture()
    root.position.set(-3.45, 0, 0.4)
    root.rotation.y = Math.PI / 2
    root.scale.set(1.9, 1, 1.9)
    const before = contactFootprints([root], table)
    expect(before).toHaveLength(1)
    expect(before[0]?.width).toBeCloseTo(0.95)
    expect(before[0]?.depth).toBeCloseTo(1.9)
    table.position.set(0, -2.8, -6.4)
    table.rotation.y = 0.3
    const after = contactFootprints([root], table)
    for (const key of ['x', 'z', 'width', 'depth'] as const) {
      expect(after[0]?.[key]).toBeCloseTo(before[0]?.[key] ?? NaN)
    }
  })

  it('excludes invisible pick volumes, hidden objects, glass and raised geometry', () => {
    const { table, root, foot } = fixture()
    const pick = foot.clone()
    pick.material = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0 })
    root.add(pick)
    const glass = foot.clone()
    glass.material = new THREE.MeshPhysicalMaterial({ transmission: 1 })
    root.add(glass)
    const hidden = foot.clone()
    hidden.visible = false
    root.add(hidden)
    const raised = foot.clone()
    raised.position.y = 0.55
    root.add(raised)
    expect(contactFootprints([root], table)).toHaveLength(1)
    expect(foot.position.y).toBe(0.23)
    expect(pick.material.opacity).toBe(0)
  })

  it('limits the tablet to attenuated feet, excluding its stacked liner and controls', () => {
    const table = new THREE.Group()
    const tablet = new THREE.Group()
    tablet.position.y = 0.18
    table.add(tablet)
    const material = new THREE.MeshStandardMaterial()
    for (const x of [-0.93, 0.93]) for (const z of [-0.645, 0.645]) {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.025, 10), material)
      foot.position.set(x, 0.0125, z)
      tablet.add(foot)
    }
    const liner = new THREE.Mesh(new THREE.BoxGeometry(2.23, 0.052, 1.58), material)
    liner.position.y = 0.065
    tablet.add(liner)
    const controls = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.03, 0.21), material)
    controls.position.set(0, 0.115, -0.525)
    tablet.add(controls)
    const ordinary = contactFootprints([tablet], table)
    expect(ordinary).toHaveLength(6)
    tablet.userData.groundingProfile = 'tablet'
    const attenuated = contactFootprints([tablet], table)
    expect(attenuated).toHaveLength(4)
    expect(attenuated.every(f => f.weight === 0.3 && f.core && f.width < 0.11 && f.depth < 0.11)).toBe(true)
    const coverage = (mask: Uint8ClampedArray) => mask.reduce((sum, alpha) => sum + alpha, 0)
    expect(coverage(contactShadowMask(attenuated, 880, 360)))
      .toBeLessThan(coverage(contactShadowMask(ordinary, 880, 360)) * 0.1)
  })

  it('never accumulates darkness from duplicate or overlapping mesh layers', () => {
    const { table, root } = fixture()
    const footprints = contactFootprints([root], table)
    const single = contactShadowMask(footprints, 440, 180)
    expect(contactShadowMask([...footprints, ...footprints, ...footprints], 440, 180)).toEqual(single)
    const shifted = footprints.map(f => ({ ...f, x: f.x + 0.2, weight: 0.3 }))
    const second = contactShadowMask(shifted, 440, 180)
    const combined = contactShadowMask([...footprints, ...shifted], 440, 180)
    expect(combined).toEqual(contactShadowMask([...shifted, ...footprints], 440, 180))
    for (let i = 0; i < combined.length; i++) {
      if (combined[i] !== Math.max(single[i] ?? 0, second[i] ?? 0)) throw new Error(`Accumulated alpha at ${i}`)
    }
  })

  it('rounds corners and feathers outward without a broad hard contact core', () => {
    const footprint = { x: 0, z: 0, width: 2, depth: 1, weight: 1, core: false }
    const mask = contactShadowMask([footprint], 880, 360)
    const sample = (x: number, z: number) => mask[Math.floor((z + 4.5) / 9 * 360) * 880 + Math.floor((x + 11) / 22 * 880)] ?? 0
    expect(sample(0, 0)).toBeLessThanOrEqual(Math.round(255 * 0.12))
    expect(sample(0.88, 0.44)).toBeLessThan(sample(0.88, 0))
    expect(sample(0.88, 0)).toBeGreaterThan(sample(0.98, 0))
    expect(sample(0.98, 0)).toBeGreaterThan(sample(1.08, 0))
    expect(sample(1.08, 0)).toBeGreaterThan(0)
    expect(sample(1.2, 0)).toBe(0)
  })

  it('keeps the static transform cache and noninteractive grounding mesh', () => {
    const putImageData = vi.fn()
    const context = {
      createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }),
      putImageData,
    }
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => context }) })
    try {
      const { table, root } = fixture()
      const grounding = createContactGrounding(table, new THREE.Color(0x1E1C1A))
      grounding.update([root])
      grounding.update([root])
      expect(putImageData).toHaveBeenCalledTimes(1)
      root.position.x += 0.25
      grounding.update([root])
      expect(putImageData).toHaveBeenCalledTimes(2)
      expect(grounding.mesh.userData).toMatchObject({ noPick: true, noGlow: true })
      expect(grounding.mesh.material.depthWrite).toBe(false)
      grounding.mesh.geometry.dispose()
      grounding.mesh.material.map?.dispose()
      grounding.mesh.material.dispose()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
