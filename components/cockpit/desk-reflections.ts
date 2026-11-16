import * as THREE from 'three'

type Point = { x: number; z: number }

function hull(points: Point[]) {
  const sorted = points.sort((a, b) => a.x - b.x || a.z - b.z)
  const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x)
  const half = (list: Point[]) => {
    const result: Point[] = []
    for (const p of list) {
      while (result.length > 1 && cross(result[result.length - 2]!, result[result.length - 1]!, p) <= 0) result.pop()
      result.push(p)
    }
    return result.slice(0, -1)
  }
  return [...half(sorted), ...half([...sorted].reverse())]
}

/** Artistic, compressed front-facing reflection impressions of the lower
 * structural forms. No artwork, live record, hologram, glass or pick volume;
 * no mirrored scene/camera or claim of physical reflection accuracy. */
export function deskReflectionForms(roots: readonly THREE.Object3D[], table: THREE.Object3D) {
  table.updateWorldMatrix(true, true)
  const inverse = table.matrixWorld.clone().invert()
  const forms: { points: Point[]; color: string; height: number }[] = []
  for (const root of roots) root.traverseVisible(object => {
    if (!(object instanceof THREE.Mesh)) return
    for (let parent: THREE.Object3D | null = object; parent && parent !== root.parent; parent = parent.parent) {
      if (parent.userData.noPick || parent.userData.noGlow) return
    }
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    const material = materials.find(m => m.visible && m.opacity === 1 && !m.transparent &&
      'color' in m && m.color instanceof THREE.Color && !('map' in m && m.map) &&
      !('transmission' in m && Number(m.transmission) > 0))
    if (!material || !('color' in material) || !(material.color instanceof THREE.Color)) return
    const transform = new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld)
    if (!object.geometry.boundingBox) object.geometry.computeBoundingBox()
    const bounds = object.geometry.boundingBox?.clone().applyMatrix4(transform)
    if (!bounds || bounds.min.y < 0.175 || bounds.max.y > 1.5) return
    const size = bounds.getSize(new THREE.Vector3())
    if (size.x < 0.12 || size.z < 0.12) return
    const positions = object.geometry.getAttribute('position')
    if (!positions) return
    const points: Point[] = []
    const vertex = new THREE.Vector3()
    // Bounded geometry sampling is sufficient once blurred to a few pixels.
    const stride = Math.max(1, Math.ceil(positions.count / 192))
    for (let i = 0; i < positions.count; i += stride) {
      vertex.fromBufferAttribute(positions, i).applyMatrix4(transform)
      points.push({ x: vertex.x, z: vertex.z + (vertex.y - 0.175) * 0.7 })
    }
    const outline = hull(points)
    if (outline.length >= 3) forms.push({
      points: outline, color: `#${material.color.getHexString()}`,
      height: (bounds.min.y + bounds.max.y) / 2 - 0.175,
    })
  })
  // Higher forms first; the low base remains the nearest, clearest fragment.
  return forms.sort((a, b) => b.height - a.height)
}

export function createDeskReflections(table: THREE.Object3D) {
  const canvas = document.createElement('canvas')
  canvas.width = 384
  canvas.height = 160
  const context = canvas.getContext('2d')!
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthWrite: false, toneMapped: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(22, 9), material)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = 0.176 // under the independent contact-shadow surface
  mesh.userData.noPick = true
  mesh.userData.noGlow = true
  mesh.raycast = () => {}
  table.add(mesh)
  let lastKey = ''
  return {
    mesh,
    update(roots: readonly THREE.Object3D[], theme: string) {
      if (!mesh.visible) return
      const key = theme + roots.map(root => [...root.position, ...root.quaternion, ...root.scale].join(',')).join('|')
      if (key === lastKey) return
      lastKey = key
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.filter = 'blur(3px)'
      for (const form of deskReflectionForms(roots, table)) {
        context.fillStyle = form.color
        context.globalAlpha = 0.10 * Math.exp(-form.height * 1.8)
        context.beginPath()
        form.points.forEach((p, i) => {
          const x = (p.x + 11) / 22 * canvas.width
          const y = (p.z + 4.5) / 9 * canvas.height
          if (i === 0) context.moveTo(x, y)
          else context.lineTo(x, y)
        })
        context.closePath()
        context.fill()
      }
      context.filter = 'none'
      context.globalAlpha = 1
      // Overlapping parts cannot create an opaque duplicate of the artifact.
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
      for (let i = 3; i < pixels.data.length; i += 4) pixels.data[i] = Math.min(pixels.data[i] ?? 0, 26)
      context.putImageData(pixels, 0, 0)
      texture.needsUpdate = true
    },
  }
}
