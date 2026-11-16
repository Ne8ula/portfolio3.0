import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/** Fixed table-space boundary. Front recess never moves with the viewport. */
export function deskFrontZ(x: number) {
  const t = THREE.MathUtils.clamp((Math.abs(x) - 2.8) / 2.4, 0, 1)
  return 3.15 + 1.35 * t * t * (3 - 2 * t)
}

export function deskOutline(inset = 0) {
  const points: THREE.Vector2[] = []
  const arc = (x: number, z: number, start: number) => {
    for (let i = 0; i <= 4; i++) {
      const angle = start + i * Math.PI / 8
      points.push(new THREE.Vector2(x + 0.12 * Math.cos(angle), z + 0.12 * Math.sin(angle)))
    }
  }
  arc(-10.88, -4.38, Math.PI)
  arc(10.88, -4.38, Math.PI * 1.5)
  arc(10.88, 4.38, 0)
  points.push(new THREE.Vector2(5.2, 4.5))
  for (let i = 1; i <= 8; i++) {
    const x = 5.2 - i * 2.4 / 8
    points.push(new THREE.Vector2(x, deskFrontZ(x)))
  }
  points.push(new THREE.Vector2(-2.8, 3.15))
  for (let i = 1; i <= 8; i++) {
    const x = -2.8 - i * 2.4 / 8
    points.push(new THREE.Vector2(x, deskFrontZ(x)))
  }
  arc(-10.88, 4.38, Math.PI / 2)
  if (!inset) return points
  return points.map((p, i) => {
    const before = points[(i + points.length - 1) % points.length]!
    const after = points[(i + 1) % points.length]!
    const a = p.clone().sub(before).normalize()
    const b = after.clone().sub(p).normalize()
    const na = new THREE.Vector2(-a.y, a.x)
    const nb = new THREE.Vector2(-b.y, b.x)
    return p.clone().addScaledVector(na.add(nb), inset / (1 + a.dot(b)))
  })
}

/** Same XY plane and UV convention as the original 22x9 receivers. */
export function deskReceiverGeometry() {
  const geometry = new THREE.ShapeGeometry(new THREE.Shape(deskOutline(0.12).map(p => new THREE.Vector2(p.x, -p.y))))
  const position = geometry.getAttribute('position')
  const uv = geometry.getAttribute('uv')
  for (let i = 0; i < position.count; i++) {
    uv.setXY(i, (position.getX(i) + 11) / 22, (position.getY(i) + 4.5) / 9)
  }
  return geometry
}

function surface(rings: readonly [number, number][]) {
  const positions: number[] = []
  const indices: number[] = []
  const count = deskOutline().length
  rings.forEach(([inset, y]) => deskOutline(inset).forEach(p => positions.push(p.x, y, p.y)))
  for (let r = 0; r < rings.length - 1; r++) for (let i = 0; i < count; i++) {
    const a = r * count + i, b = r * count + (i + 1) % count
    indices.push(a, b, a + count, b, b + count, a + count)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function join(parts: THREE.BufferGeometry[]) {
  const flat = parts.map(part => {
    const g = part.index ? part.toNonIndexed() : part.clone()
    // Furniture-only continuous grain coordinates; receivers never use this.
    const p = g.getAttribute('position')
    const uv = new Float32Array(p.count * 2)
    for (let i = 0; i < p.count; i++) {
      uv[i*2] = (p.getX(i) + 11 + Math.max(0, -p.getY(i)-0.175)) / 22
      uv[i*2+1] = (p.getZ(i)+4.5) / 9
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv,2))
    return g
  })
  const geometry = mergeGeometries(flat)!
  parts.forEach(g => g.dispose())
  flat.forEach(g => g.dispose())
  return geometry
}

/** Four static meshes: cap, molded body/supports, recessed seam, diffuser. */
export function sculptedDeskGeometries() {
  const cap = deskReceiverGeometry().rotateX(-Math.PI / 2).translate(0, 0.175, 0)
  const bevel: [number, number][] = []
  for (let i = 0; i <= 4; i++) {
    const a = i * Math.PI / 8
    bevel.push([0.12 * (1 - Math.sin(a)), 0.055 + 0.12 * Math.cos(a)])
  }
  bevel.push([0, 0.035], [0.07, 0.035])
  const top = join([cap, surface(bevel)])
  const seam = surface([[0.07, 0.035], [0.07, -0.015]])
  const bottom = deskReceiverGeometry().rotateX(-Math.PI / 2).translate(0, -0.175, 0)
  const bottomIndex = bottom.index!
  for (let i = 0; i < bottomIndex.count; i += 3) {
    const a = bottomIndex.getX(i)
    bottomIndex.setX(i, bottomIndex.getX(i+2)); bottomIndex.setX(i+2, a)
  }
  bottom.computeVertexNormals()
  const underside = surface([[0.07,-0.015],[0.02,-0.015],[0.02,-0.055],[0.035,-0.105],[0.07,-0.15],[0.14,-0.175]])
  // Continuous right waterfall cross-section; all of it remains inside 22x9.
  const profile = new THREE.Shape()
  profile.moveTo(10.45, 0.175)
  profile.absarc(10.45, -0.375, 0.55, Math.PI / 2, 0, true)
  profile.lineTo(11, -7.68)
  profile.quadraticCurveTo(11, -7.8, 10.88, -7.8)
  profile.lineTo(10.77, -7.8)
  profile.quadraticCurveTo(10.65, -7.8, 10.65, -7.68)
  profile.lineTo(10.65, -0.375)
  profile.absarc(10.45, -0.375, 0.20, 0, Math.PI / 2, false)
  profile.closePath()
  const blade = new THREE.ExtrudeGeometry(profile, { depth: 8.9, bevelEnabled: false, curveSegments: 5 }).translate(0,0,-4.45)
  const pedestal = new THREE.BoxGeometry(3.6, 7.625, 5.2).translate(-8.4,-3.9875,0)
  const body = join([bottom, underside, blade, pedestal])
  // Recessed below the cap, with no transparent spill plane or top perimeter.
  const stripPoints: THREE.Vector3[] = []
  for (let i = 0; i <= 48; i++) {
    const x = -10.45 + i * 20.9 / 48
    stripPoints.push(new THREE.Vector3(x, 0.007, deskFrontZ(x) - 0.035))
  }
  // The front-facing waterfall strip is inset in the blade's front face.
  const front = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(stripPoints), 64, 0.018, 6, false)
  const waterfall = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(10.45,0.009,4.455), new THREE.Vector3(10.78,-0.3,4.455),
    new THREE.Vector3(10.82,-1.0,4.455), new THREE.Vector3(10.82,-7.55,4.455),
  ]), 20, 0.015, 4, false)
  const concealed = new THREE.BoxGeometry(2.8,0.03,0.03).translate(-8.4,-0.2,2.62)
  const diffuser = join([front, waterfall, concealed])
  return { top, body, seam, diffuser }
}
