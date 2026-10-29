import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { buildDecorations, buildDeskLamp } from '../../components/cockpit/decorations'
import { buildCoffee } from '../../components/cockpit/coffee'
import { buildTeaSet } from '../../components/cockpit/tea-set'
import { buildIncense } from '../../components/cockpit/incense'
import { buildGlassMac } from '../../components/cockpit/glass-mac'
import { buildTurntable } from '../../components/cockpit/turntable'
import { buildVinylCrate } from '../../components/cockpit/vinyl-crate'
import { applyDecorativePreferences, makeAccentMaterial } from '../../components/cockpit/materials'
import { createRandomSource } from '../../lib/random/seeded-streams'
import { setFrameTimes } from '../../components/cockpit/frame-times'
import { VINYL_CRATE_FOCUS_POINTS_LOCAL } from '../../components/cockpit/vinyl-crate'
import { deskOutline, sculptedDeskGeometries } from '../../components/cockpit/desk-outline'
import { createStudioMist } from '../../components/cockpit/listening-room'
import { solveCameraFit, projectFitPoint } from '../../lib/responsive/camera-fit'
import { MAX_YAW_RAD, MAX_PITCH_RAD } from '../../lib/responsive/input-policy'

type Activation = {
  owner: string
  action: (hit: { key: string }) => void
  hitTest: (point: { clientX: number; clientY: number }) => { key: string } | null
  testPoint?: (key: string) => { x: number; y: number }[] | null
}
const activations = vi.hoisted(() => [] as Activation[])
const crateActions = vi.hoisted(() => ({ selectRecord: (_index: number) => false }))
vi.mock('../../components/cockpit/pointer-activation', () => ({
  registerPointerActivation: (_canvas: unknown, handler: Activation) => { activations.push(handler); return () => {} },
}))
vi.mock('../../components/cockpit/decals', async importOriginal => ({
  ...await importOriginal<object>(), makeDecal: () => new THREE.Group(),
}))
vi.mock('../../components/cockpit/project-textures', () => ({ makeDiscTexture: () => new THREE.Texture() }))
vi.mock('../../components/cockpit/test-hooks', () => ({
  beginVisualAsset: () => () => {}, registerCrateActions: (actions: typeof crateActions) => Object.assign(crateActions,actions), registerVinylSleeveProbe: () => {},
  reportCrateTransient: () => {}, unregisterCrateActions: () => {}, unregisterVinylSleeveProbe: () => {},
  registerDeckTetherProbe: () => {}, registerVinylFlightProbe: () => {}, reportDeckTransient: () => {},
  unregisterDeckTetherProbe: () => {}, unregisterVinylFlightProbe: () => {},
}))

type Emissive = THREE.MeshStandardMaterial & { transmission?: number }
type RuntimeGroup = THREE.Group & { tick: (dt: number, t: number) => void; dispose: () => void }
let attributes: Map<string, string>
let forced: boolean
let observers: (() => void)[]
let mediaListeners: (() => void)[]
let bridge: Record<string, unknown>
const runtimes: RuntimeGroup[] = []
beforeEach(() => {
  activations.length = 0
  attributes = new Map(); forced = false; observers = []; mediaListeners = []
  const context = new Proxy({
    createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    measureText: (s: string) => ({ width: s.length * 8 }),
  }, { get: (target, key) => Reflect.get(target, key) ?? (() => {}) })
  vi.stubGlobal('document', {
    createElement: () => ({ width: 0, height: 0, getContext: () => context }),
    documentElement: { getAttribute: (key: string) => attributes.get(key) ?? null },
  })
  bridge = { addEventListener: () => {}, removeEventListener: () => {}, matchMedia: () => ({
    get matches() { return forced }, addEventListener: (_event: string, callback: () => void) => mediaListeners.push(callback),
    removeEventListener: () => {},
  }) }
  vi.stubGlobal('window', bridge)
  vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '#4B6E4F' }))
  vi.stubGlobal('Image', class {})
  vi.stubGlobal('MutationObserver', class {
    constructor(callback: () => void) { observers.push(callback) }
    observe() {} disconnect() {}
  })
})
afterEach(() => {
  runtimes.splice(0).forEach(runtime => runtime.dispose?.())
  vi.unstubAllGlobals()
})

function fixture() {
  const scene = new THREE.Scene(), table = new THREE.Group()
  scene.add(table)
  const camera = new THREE.PerspectiveCamera(68, 1440 / 900, 0.1, 2000)
  const renderer = { domElement: { style: {}, addEventListener: () => {}, removeEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1440, height: 900, right: 1440, bottom: 900 }),
  } }
  const options = { randomSource: createRandomSource('lamp-accents') }
  const decor = buildDecorations(scene, table, camera, renderer) as RuntimeGroup
  runtimes.push(decor)
  return { scene, table, camera, renderer, options, decor }
}
function meshes(root: THREE.Object3D) {
  const result: THREE.Mesh<THREE.BufferGeometry, Emissive>[] = []
  root.traverseVisible(o => { if (o instanceof THREE.Mesh) result.push(o as THREE.Mesh<THREE.BufferGeometry, Emissive>) })
  return result
}
function maskPixel(material: Emissive, x: number, y: number) {
  const image = material.emissiveMap!.image as { width: number; data: Uint8Array }
  return image.data[(y * image.width + x) * 4]
}
function parameters(geometry: THREE.BufferGeometry) {
  return (geometry as THREE.BufferGeometry & { parameters?: { width?: number; height?: number } }).parameters
}
const globe = readFileSync(new URL('../../components/cockpit/globe-canvas.tsx', import.meta.url), 'utf8')
const resolveRestCamera = new Function('THREE','solveCameraFit','projectFitPoint','MAX_YAW_RAD','MAX_PITCH_RAD',
  globe.slice(globe.indexOf('function resolveRestCamera('),globe.indexOf('function disposeObjectGraph('))+'; return resolveRestCamera;')(
    THREE,solveCameraFit,projectFitPoint,MAX_YAW_RAD,MAX_PITCH_RAD,
  ) as (w:number,h:number,p:THREE.Vector3[],crease:THREE.Vector3,r:{width:number;height:number;header:number},all:THREE.Vector3[]) => {position:THREE.Vector3;pitch:number;valid:boolean;span:number}

function restSubjects(f:ReturnType<typeof fixture>, existingCrate?:RuntimeGroup) {
  const crate=existingCrate??buildVinylCrate(f.scene,f.table,f.camera,f.renderer,f.options) as RuntimeGroup
  const turntable=buildTurntable(f.scene,f.table,f.camera,f.renderer) as RuntimeGroup
  const xray=new THREE.Group();f.table.add(xray);buildGlassMac(xray,f.options)
  const coffeeStation=buildCoffee(f.scene,f.table,f.camera,f.renderer,f.options) as RuntimeGroup
  runtimes.push(coffeeStation)
  runtimes.push(turntable);if(!existingCrate)runtimes.push(crate)
  crate.position.set(-3.45,.18,.4);crate.rotation.y=.2;crate.scale.setScalar(1.9)
  turntable.position.set(.15,.18,.95);turntable.rotation.y=-.08;turntable.scale.setScalar(1.75)
  xray.position.set(4.65,.18,-1.1);xray.rotation.y=-.42;xray.scale.setScalar(1.35)
  const start=globe.indexOf('    const restSubjects = ')
  const end=globe.indexOf('    let restPose=',start)
  const subjects=new Function('THREE','crate','turntable','xray','decorations','coffeeStation',globe.slice(start,end)+';return restSubjects;')(
    THREE,crate,turntable,xray,f.decor,coffeeStation,
  ) as {root:THREE.Object3D;points:THREE.Vector3[];major:boolean}[]
  return Object.assign((width:number,height:number) => {
    f.table.updateMatrixWorld(true)
    const points=(major:boolean)=>subjects.filter(s=>!major||s.major).flatMap(s=>s.points.map(p=>p.clone().applyMatrix4(s.root.matrixWorld)))
    const pose=resolveRestCamera(width,height,points(true),f.table.localToWorld(new THREE.Vector3(0,.007,3.115)),
      {width:312,height:228,header:78},points(false))
    return pose
  }, { subjects, coffeeStation, crate })
}

function hull(points: THREE.Vector2[]) {
  const cross = (a: THREE.Vector2,b: THREE.Vector2,c: THREE.Vector2) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
  points.sort((a,b)=>a.x-b.x || a.y-b.y)
  const chain = (list: THREE.Vector2[]) => {
    const result: THREE.Vector2[] = []
    for (const p of list) {
      while (result.length>1 && cross(result[result.length-2]!,result[result.length-1]!,p)<=0) result.pop()
      result.push(p)
    }
    return result.slice(0,-1)
  }
  return [...chain(points),...chain([...points].reverse())]
}
function projection(mesh: THREE.Mesh, camera: THREE.Camera, width: number, height: number) {
  const positions = mesh.geometry.getAttribute('position')
  const points = []
  for (let i=0;i<positions.count;i++) {
    const p = new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld).project(camera)
    points.push(new THREE.Vector2((1+p.x)*width/2,(1-p.y)*height/2))
  }
  return hull(points)
}
function polygonGap(a: THREE.Vector2[], b: THREE.Vector2[]) {
  let separated = false
  for (const polygon of [a,b]) for (let i=0;i<polygon.length;i++) {
    const edge = polygon[(i+1)%polygon.length]!.clone().sub(polygon[i]!)
    const axis = new THREE.Vector2(-edge.y,edge.x).normalize()
    const aa = a.map(p=>p.dot(axis)), bb = b.map(p=>p.dot(axis))
    if (Math.max(...aa)<Math.min(...bb) || Math.max(...bb)<Math.min(...aa)) separated = true
  }
  if (!separated) return 0
  let gap = Infinity
  for (const [points,edges] of [[a,b],[b,a]]) for (const p of points!) for (let i=0;i<edges!.length;i++) {
    const start = edges![i]!, delta = edges![(i+1)%edges!.length]!.clone().sub(start)
    const t = THREE.MathUtils.clamp(p.clone().sub(start).dot(delta)/delta.lengthSq(),0,1)
    gap = Math.min(gap,p.distanceTo(start.clone().addScaledVector(delta,t)))
  }
  return gap
}

describe('static task lamp and opt-in jade accents', () => {
  it('keeps actual coffee and decoration hit tests reachable at all nine literal look limits', () => {
    const f=fixture();f.table.position.set(0,-2.6,-7.4)
    const fit=restSubjects(f)
    const reports=[]
    const coffee=activations.find(a=>a.owner==='coffee')!
    const decor=activations.find(a=>a.owner==='decorations')!
    const reachable=(handler:Activation,key:string,width:number,height:number) => {
      const candidates=handler.testPoint?.(key)??[]
      return candidates.some(p=>p.x>=0&&p.x<=width&&p.y>=94&&p.y<=height&&
        (p.x>328||p.y>244)&&handler.hitTest({clientX:p.x,clientY:p.y})?.key===key)
    }
    for(const [width,height] of [[1024,600],[1024,768],[1440,900],[2000,635],[2560,1440],[3440,1440]]){
      f.renderer.domElement.getBoundingClientRect=()=>({left:0,top:0,width:width!,height:height!,right:width!,bottom:height!})
      f.camera.aspect=width!/height!;f.camera.updateProjectionMatrix()
      const seat=fit(width!,height!);expect(seat.valid).toBe(true)
      reports.push({stage:`${width}x${height}`,eye:seat.position.toArray().map(v=>+v.toFixed(4)),heroFraction:+(seat.span/(1-78/height!)).toFixed(4)})
      for(const yaw of [-6,0,6])for(const pitch of [-3,0,3]){
        f.camera.position.copy(seat.position);f.camera.rotation.set(seat.pitch+pitch*Math.PI/180,yaw*Math.PI/180,0,'YXZ')
        f.camera.updateMatrixWorld(true);f.table.updateMatrixWorld(true)
        const label=`${width}x${height} yaw ${yaw} pitch ${pitch}`
        const extrema={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity}
        for(const subject of fit.subjects) for(const point of subject.points){
          const ndc=point.clone().applyMatrix4(subject.root.matrixWorld).project(f.camera)
          extrema.minX=Math.min(extrema.minX,ndc.x);extrema.maxX=Math.max(extrema.maxX,ndc.x)
          extrema.minY=Math.min(extrema.minY,ndc.y);extrema.maxY=Math.max(extrema.maxY,ndc.y)
        }
        expect(extrema.minX,label).toBeGreaterThanOrEqual(-.960001)
        expect(extrema.maxX,label).toBeLessThanOrEqual(.960001)
        expect(extrema.minY,label).toBeGreaterThanOrEqual(-.980001)
        expect(extrema.maxY,label).toBeLessThanOrEqual(1-188/height!+.000001)
        expect(reachable(coffee,'coffee-dripper',width!,height!),label+' dripper').toBe(true)
        for(const key of ['tablet','shaker'])expect(reachable(decor,key,width!,height!),label+' '+key).toBe(true)
      }
    }
    coffee.action({key:'coffee-dripper'})
    for(let i=0;i<600;i++){setFrameTimes(1/60,i/60,null);fit.coffeeStation.tick(1/60,i/60)}
    for(const [width,height] of [[1024,600],[1440,900],[2000,635],[2560,1440]]){
      f.renderer.domElement.getBoundingClientRect=()=>({left:0,top:0,width:width!,height:height!,right:width!,bottom:height!})
      f.camera.aspect=width!/height!;f.camera.updateProjectionMatrix()
      const seat=fit(width!,height!)
      for(const yaw of [-6,0,6])for(const pitch of [-3,0,3]){
        f.camera.position.copy(seat.position);f.camera.rotation.set(seat.pitch+pitch*Math.PI/180,yaw*Math.PI/180,0,'YXZ')
        f.camera.updateMatrixWorld(true);f.table.updateMatrixWorld(true)
        expect(reachable(coffee,'coffee-mug',width!,height!),`${width}x${height} mug ${yaw}/${pitch}`).toBe(true)
      }
    }
    const protectedCount=fit.subjects.reduce((n,s)=>n+s.points.length,0)
    const majorCount=fit.subjects.filter(s=>s.major).reduce((n,s)=>n+s.points.length,0)
    console.log('Measured rest fits (312x228 plaque fixture, not browser evidence):',JSON.stringify(reports))
    console.log('Rest fit scratch typed-array bytes per uncached solve:',(protectedCount*9+majorCount)*3*8)
  })

  it('refits the real rest assembly continuously through the stage matrix without moving roots', () => {
    const f=fixture();f.table.position.set(0,-2.6,-7.4)
    const fit=restSubjects(f), before=f.table.children.map(o=>({p:o.position.toArray(),q:o.quaternion.toArray(),s:o.scale.toArray()}))
    const furniture = new THREE.Group()
    const geometries = sculptedDeskGeometries()
    for (const [name, geometry] of Object.entries(geometries)) {
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial())
      mesh.name = name; furniture.add(mesh)
    }
    furniture.position.copy(f.table.position); furniture.updateMatrixWorld(true)
    const cases=[[1024,600],[1024,768],[1440,900],[2000,635],[2560,1440],[3440,1440],[3840,2160]]
    const saved=new Map<string,ReturnType<typeof fit>>()
    for(const [width,height] of [...cases,...cases.slice().reverse()]){
      const seat=fit(width!,height!),key=width+'x'+height
      expect(seat.valid,key).toBe(true)
      const camera=new THREE.PerspectiveCamera(68,width!/height!,.1,2000)
      camera.position.copy(seat.position);camera.rotation.x=seat.pitch;camera.updateMatrixWorld(true)
      const crease=f.table.localToWorld(new THREE.Vector3(0,.007,3.115)).project(camera)
      // Protected forward stylus at all nine looks takes precedence over the
      // proposed 90–94% art band; the actual exposed crease is at 84%.
      expect((1-crease.y)/2).toBeCloseTo(.84,8)
      // The luminous core must actually be exposed through the channel,
      // rather than merely projecting a hidden center onto the bottom band.
      const core = furniture.localToWorld(new THREE.Vector3(0,.007,3.115))
      const ray = new THREE.Raycaster(seat.position, core.clone().sub(seat.position).normalize())
      expect(ray.intersectObjects(furniture.children)[0]?.object.name,key).toBe('diffuser')
      if(saved.has(key))expect(seat).toEqual(saved.get(key))
      saved.set(key,seat)
      const adjacent=fit(width!+1,height!)
      expect(adjacent.position.distanceTo(seat.position)).toBeLessThan(.03)
    }
    expect(f.table.children.map(o=>({p:o.position.toArray(),q:o.quaternion.toArray(),s:o.scale.toArray()}))).toEqual(before)
    furniture.children.forEach(o=>{const m=o as THREE.Mesh; m.geometry.dispose();(m.material as THREE.Material).dispose()})
  })

  it('separates shaker materials and preserves the five moving cover panels and stationary gasket', () => {
    const f=fixture()
    const body=f.decor.getObjectByName('shaker-frosted-body') as THREE.Mesh<THREE.BufferGeometry,THREE.MeshPhysicalMaterial>
    expect(body.material.transmission).toBe(.62);expect(body.material.roughness).toBe(.30)
    const shaker=f.decor.children[3]!
    const cap=meshes(shaker).filter(m=>m.material.userData.decorativeClear&&m!==body)
    expect(cap.length).toBeGreaterThanOrEqual(6)
    expect(cap.every(m=>m.material.transmission===.12)).toBe(true)
    expect(cap[0]!.material.color.getHex()).not.toBe(body.material.color.getHex())
    const deck=buildTurntable(f.scene,f.table,f.camera,f.renderer) as RuntimeGroup;runtimes.push(deck)
    const cover=deck.getObjectByName('dust-cover-panels')!,hinge=cover.parent!
    const panels=meshes(cover).filter(m=>m.geometry.type==='RoundedBoxGeometry')
    expect(panels).toHaveLength(5)
    expect(panels.every(m=>m.material.transmission===1&&m.material.roughness===.14)).toBe(true)
    const rim=deck.getObjectByName('dust-cover-edge-stock')!,gasket=deck.getObjectByName('dust-cover-seating-gasket')!
    expect(rim.parent).toBe(cover);expect(gasket.parent).toBe(deck)
    const edgeMaterial=(rim as THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>).material
    expect(rim.userData.noPick&&gasket.userData.noPick).toBe(true)
    expect([rim,gasket].reduce((count,object)=>{
      const geometry=(object as THREE.Mesh).geometry
      return count+(geometry.index?.count??geometry.getAttribute('position').count)/3
    },0)).toBe(132)
    deck.updateWorldMatrix(true,true)
    const seat=gasket.matrixWorld.clone(),rimClosed=rim.matrixWorld.clone()
    hinge.rotation.x=-1.1;deck.updateWorldMatrix(true,true)
    expect(gasket.matrixWorld).toEqual(seat);expect(rim.matrixWorld).not.toEqual(rimClosed)
    applyDecorativePreferences(f.table,true)
    expect(body.material.transmission).toBe(0)
    expect(panels.every(m=>m.material.transmission===0)).toBe(true)
    expect(edgeMaterial.transparent).toBe(false);expect(edgeMaterial.opacity).toBe(1)
    applyDecorativePreferences(f.table,false)
    expect(body.material.transmission).toBe(.62)
    expect(panels.every(m=>m.material.transmission===1)).toBe(true)
    expect(edgeMaterial.transparent).toBe(true);expect(edgeMaterial.opacity).toBe(.5)
  })

  it('keeps foreground incense clear of all six actual sleeve surfaces and travel bounds', () => {
    const f=fixture()
    const { scene,table,camera,renderer,options } = f
    const incense = buildIncense(scene,table,options) as RuntimeGroup
    const crate = buildVinylCrate(scene,table,camera,renderer,options) as RuntimeGroup
    runtimes.push(incense,crate)
    crate.position.set(-3.45,0.18,0.4); crate.rotation.y=0.2; crate.scale.setScalar(1.9)
    table.updateMatrixWorld(true)
    const travel = new THREE.Box3().setFromPoints(VINYL_CRATE_FOCUS_POINTS_LOCAL.map(p=>new THREE.Vector3(p.x,p.y,p.z).applyMatrix4(crate.matrixWorld)))
    const incenseBounds = new THREE.Box3().setFromObject(incense,true)
    expect(incenseBounds.min.z - travel.max.z).toBeGreaterThanOrEqual(0.15)
    console.log('Incense table-space travel gap:',incenseBounds.min.z-travel.max.z)
    table.position.set(0,-2.6,-7.4)
    const rest=restSubjects(f,crate)
    const sleeves = meshes(crate).filter(m=>Array.isArray(m.material) && Number.isInteger(m.parent?.userData.i))
    expect(sleeves).toHaveLength(6)
    bridge.__cockpitViewMode = 'crate'
    let minimum = Infinity
    for (const [width,height] of [[1440,900],[2560,1440]] as const) {
      camera.aspect=width/height; camera.updateProjectionMatrix()
      const seat=rest(width,height)
      expect(seat.valid).toBe(true)
      camera.position.copy(seat.position);camera.rotation.set(seat.pitch,0,0);camera.updateMatrixWorld(true)
      table.updateMatrixWorld(true)
      const target = (crate as RuntimeGroup & { getFocusTarget(): {
        center: THREE.Vector3; outward: THREE.Vector3; verticalBias: number; framingPoints: THREE.Vector3[]
      } }).getFocusTarget()
      const direction=target.outward.clone();direction.y+=target.verticalBias;direction.normalize()
      const fit=solveCameraFit({center:target.center,direction,points:target.framingPoints,
        fovYRad:68*Math.PI/180,aspect:camera.aspect,near:.1,
        ndcBounds:{minX:-.65,maxX:.65,minY:-.65,maxY:.65},distance:{min:1.5,max:60}})
      expect(fit.status).toBe('fit')
      if(fit.status!=='fit')throw new Error('No focus fit')
      const focused=new THREE.PerspectiveCamera(68,camera.aspect,.1,2000)
      focused.position.copy(target.center).addScaledVector(direction,fit.distance);focused.lookAt(target.center)
      // Sample rest, entry and fitted focus. Runtime HUD/free-look coverage
      // still belongs to the subsequent browser checks.
      const cameras=[0,.25,.5,.75,1].map(t=>{
        const view=camera.clone();view.position.lerp(focused.position,t)
        view.quaternion.slerp(focused.quaternion,t);view.updateMatrixWorld(true);return view
      })
      const incensePolygons=cameras.map(view=>meshes(incense).map(m=>projection(m,view,width,height)))
      for (let selected=0;selected<6;selected++) {
        expect(crateActions.selectRecord(selected)).toBe(true)
        for (let step=0;step<40;step++) {
          setFrameTimes(1/60,step/60,null); crate.tick(1/60,step/60)
          table.updateMatrixWorld(true)
          for(let viewIndex=0;viewIndex<cameras.length;viewIndex++) {
            const sleevePolygons = sleeves.map(m=>projection(m,cameras[viewIndex]!,width,height))
            for (const part of incensePolygons[viewIndex]!) for (const sleeve of sleevePolygons) {
              minimum=Math.min(minimum,polygonGap(part,sleeve))
            }
          }
        }
      }
    }
    expect(minimum).toBeGreaterThanOrEqual(16)
    console.log('Incense minimum projected sleeve gap:',minimum)
  }, 30000)

  it('keeps actual low support footprints at least .30 from the new front recess', () => {
    const { scene,table,camera,renderer,options,decor } = fixture()
    const crate = buildVinylCrate(scene,table,camera,renderer,options) as RuntimeGroup
    const deck = buildTurntable(scene,table,camera,renderer) as RuntimeGroup
    const pc = new THREE.Group(); table.add(pc); buildGlassMac(pc,options)
    const tea = buildTeaSet(scene,table,options) as RuntimeGroup
    const incense = buildIncense(scene,table,options) as RuntimeGroup
    const coffee = buildCoffee(scene,table,camera,renderer,options) as RuntimeGroup
    runtimes.push(crate,deck,tea,incense,coffee)
    crate.position.set(-3.45,.18,.4);crate.rotation.y=.20;crate.scale.setScalar(1.9)
    deck.position.set(.15,.18,.95);deck.rotation.y=-.08;deck.scale.setScalar(1.75)
    pc.position.set(4.65,.18,-1.1);pc.rotation.y=-.42;pc.scale.setScalar(1.35)
    table.updateMatrixWorld(true)
    let minimum=Infinity
    const outline=deskOutline(.12)
    for (const root of [crate,deck,pc,tea,incense,coffee,...decor.children]) for (const mesh of meshes(root)) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      if (materials.every(m=>m.opacity===0)) continue
      const bounds = new THREE.Box3().setFromObject(mesh,true)
      if (bounds.min.y > .205 || bounds.max.y < .175) continue
      const p=mesh.geometry.getAttribute('position')
      for(let i=0;i<p.count;i++) {
        const point=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld)
        if(point.y>.205)continue
        const p2=new THREE.Vector2(point.x,point.z)
        for(let edge=0;edge<outline.length;edge++) {
          const a=outline[edge]!,delta=outline[(edge+1)%outline.length]!.clone().sub(a)
          const t=THREE.MathUtils.clamp(p2.clone().sub(a).dot(delta)/delta.lengthSq(),0,1)
          minimum=Math.min(minimum,p2.distanceTo(a.clone().addScaledVector(delta,t)))
        }
      }
    }
    expect(minimum).toBeGreaterThanOrEqual(.30)
    console.log('Minimum front support clearance:',minimum)
  })

  it('grounds a seven-mesh articulated lamp, aims its aperture and preserves decoration order/bridge', () => {
    const { decor } = fixture()
    const lamp = decor.getObjectByName('desk-lamp')!
    const bounds = new THREE.Box3().setFromObject(lamp, true)
    expect(bounds.min.y).toBeCloseTo(0.18)
    const size = bounds.getSize(new THREE.Vector3())
    expect(size.x).toBeLessThan(4.1)
    expect(size.y).toBeLessThan(4.1)
    expect(size.z).toBeLessThan(2)
    console.log('Lamp envelope:',size.toArray())
    expect(meshes(lamp)).toHaveLength(7)
    expect(meshes(lamp).every(m => m.userData.noPick && m.userData.noGlow)).toBe(true)
    const lampLights: THREE.Light[] = []
    lamp.traverse(object => { if (object instanceof THREE.Light) lampLights.push(object) })
    expect(lampLights).toHaveLength(0)
    const emitter = lamp.getObjectByName('task-lamp-emitter')!
    const position = emitter.getWorldPosition(new THREE.Vector3())
    expect(position.distanceTo(new THREE.Vector3(-5, 2.4, -2.35))).toBeLessThan(1e-10)
    const axis = new THREE.Vector3(0, -1, 0).transformDirection(emitter.matrixWorld)
    expect(axis.dot(new THREE.Vector3(-2.8, 0.175, -0.2).sub(position).normalize())).toBeCloseTo(1)
    const api = bridge.__cockpitDecor as { list: () => string[]; set: (name: string) => boolean }
    expect(Object.keys(api)).toEqual(['list', 'set'])
    expect(api.list()).toEqual(['sax', 'tablet', 'plant', 'shaker'])
    expect(api.set('desk-lamp')).toBe(false)
    expect(decor.children[4]).toBe(lamp)
  })

  it('keeps the actual lamp inside rest projections and below header/identity at both capture sizes', () => {
    const f=fixture()
    const { decor, table, camera } = f
    // Unchanged v4 tableBase minus authored FPV offsets.
    table.position.set(0, -5.2 - (-2.6), -7 - 0.4)
    const lamp = decor.getObjectByName('desk-lamp')!
    const rest=restSubjects(f)
    for (const [width, height] of [[1440, 900], [2560, 1440]]) {
      camera.aspect = width! / height!; camera.updateProjectionMatrix()
      const seat=rest(width!,height!);expect(seat.valid).toBe(true)
      camera.position.copy(seat.position);camera.rotation.set(seat.pitch,0,0);camera.updateMatrixWorld(true)
      table.updateMatrixWorld(true)
      const shade=lamp.getObjectByName('lamp-opaque-shade') as THREE.Mesh
      const sleeveMeshes=meshes(rest.crate).filter(m=>Array.isArray(m.material)&&Number.isInteger(m.parent?.userData.i))
      const shadeHull=projection(shade,camera,width!,height!)
      const sleeveGap=Math.min(...sleeveMeshes.map(m=>polygonGap(shadeHull,projection(m,camera,width!,height!))))
      const xs=shadeHull.map(p=>p.x),ys=shadeHull.map(p=>p.y)
      const raycaster=new THREE.Raycaster()
      let samples=0,unoccluded=0
      for(let y=0;y<24;y++)for(let x=0;x<24;x++){
        const px=Math.min(...xs)+(Math.max(...xs)-Math.min(...xs))*(x+.5)/24
        const py=Math.min(...ys)+(Math.max(...ys)-Math.min(...ys))*(y+.5)/24
        raycaster.setFromCamera(new THREE.Vector2(px/width!*2-1,1-py/height!*2),camera)
        const surface=raycaster.intersectObject(shade)[0]
        if(!surface)continue
        samples++
        const sleeve=raycaster.intersectObjects(sleeveMeshes)[0]
        if(!sleeve||sleeve.distance>surface.distance)unoccluded++
      }
      expect(samples).toBeGreaterThan(100)
      console.log('Lamp shade versus sleeve geometry (not rendered opacity):',JSON.stringify({width,height,sleeveGap,unoccludedFraction:unoccluded/samples,samples}))
      for (const mesh of meshes(lamp)) {
        const positions = mesh.geometry.attributes.position!
        for (let index = 0; index < positions.count; index++) {
          const point = new THREE.Vector3().fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld).project(camera)
          expect(Math.abs(point.x)).toBeLessThan(0.98)
          expect(Math.abs(point.y)).toBeLessThan(0.98)
          const x = (1 + point.x) * width! / 2, y = (1 - point.y) * height! / 2
          // Explicit plaque fixture; browser regressions measure wrapped DOM.
          expect(y).toBeGreaterThan(102)
          expect(x > 328 || y > 244, `${mesh.name}: ${x},${y} at ${width}`).toBe(true)
        }
      }
    }
  })

  it('clears actual coffee motion and existing sax/crate geometry without moving them', () => {
    const { scene, table, camera, renderer, options, decor } = fixture()
    const coffee = buildCoffee(scene, table, camera, renderer, options) as RuntimeGroup
    const crate = buildVinylCrate(scene, table, camera, renderer, options) as RuntimeGroup
    runtimes.push(coffee, crate)
    crate.position.set(-3.45, 0.18, 0.4); crate.rotation.y = 0.2; crate.scale.setScalar(1.9)
    const lamp = decor.getObjectByName('desk-lamp')!
    lamp.updateWorldMatrix(true, true)
    const lampMeshes = meshes(lamp)
    const assertClear = (root: THREE.Object3D) => {
      root.updateWorldMatrix(true, true)
      for (const obstacle of meshes(root).filter(m => !Array.isArray(m.material) && m.material.opacity > 0)) {
        obstacle.geometry.computeBoundingBox()
        const inverse = obstacle.matrixWorld.clone().invert()
        const box = obstacle.geometry.boundingBox!
        for (const part of lampMeshes) {
          // Merged rails/pivots have empty space inside their overall bounds.
          // Test their real triangles against each obstacle's local solid box.
          const transform = inverse.clone().multiply(part.matrixWorld)
          part.geometry.computeBoundingBox()
          if (!box.intersectsBox(part.geometry.boundingBox!.clone().applyMatrix4(transform))) continue
          const positions = part.geometry.getAttribute('position'), index = part.geometry.index
          const count = index?.count ?? positions.count
          for (let i = 0; i < count; i += 3) {
            const points = [0,1,2].map(n => new THREE.Vector3().fromBufferAttribute(positions, index ? index.getX(i+n) : i+n).applyMatrix4(transform))
            expect(box.intersectsTriangle(new THREE.Triangle(points[0]!, points[1]!, points[2]!)), obstacle.name || obstacle.geometry.type).toBe(false)
          }
        }
      }
    }
    assertClear(decor.children[0]!)
    assertClear(crate)
    activations.find(a => a.owner === 'coffee')!.action({ key: 'coffee-dripper' })
    for (let i = 0; i <= 540; i++) {
      setFrameTimes(1 / 120, i / 120, null); coffee.tick(1 / 120, i / 120)
      assertClear(coffee.getObjectByName('coffee-station')!)
    }
  })

  it('isolates emission from shared cores/liquids and masks mixed texture content', () => {
    const { scene, table, camera, renderer, options, decor } = fixture()
    const pc = new THREE.Group(); table.add(pc); buildGlassMac(pc, options)
    const coffee = buildCoffee(scene, table, camera, renderer, options) as RuntimeGroup
    const tea = buildTeaSet(scene, table, options) as RuntimeGroup
    const incense = buildIncense(scene, table, options) as RuntimeGroup
    const deck = buildTurntable(scene, table, camera, renderer) as RuntimeGroup
    const crate = buildVinylCrate(scene, table, camera, renderer, options) as RuntimeGroup
    runtimes.push(coffee, tea, incense, deck, crate)
    for (const root of [pc, coffee, tea, incense, deck, crate, ...decor.children]) {
      expect(meshes(root).filter(m => m.material.userData?.decorativeEmission).length).toBeGreaterThan(0)
    }
    const small = (root: THREE.Object3D, name: string) => root.getObjectByName(name) as THREE.Mesh<THREE.BufferGeometry, Emissive>
    expect(small(coffee, 'mug-jade-foot').material.emissiveIntensity).toBe(1.4)
    expect(small(coffee, 'liquid-surface').material.emissive.getHex()).toBe(0)
    expect(small(coffee, 'mug-jade-foot').material).not.toBe(small(coffee, 'liquid-surface').material)
    const core = meshes(pc).find(m => m.geometry.type === 'RoundedBoxGeometry' && parameters(m.geometry)?.width === 2.6)!
    expect(core.material.userData.decorativeEmission).toBeUndefined()
    expect(core.material.emissive.getHex()).toBe(0)
    const barrel = meshes(pc).find(m => m.geometry.type === 'CylinderGeometry' && parameters(m.geometry)?.height === 0.62)!
    expect(barrel.material.userData.decorativeEmission).toBeUndefined()
    const grid = meshes(decor.children[1]!).find(m => m.material.emissiveMap)!
    expect(grid.material.isMeshStandardMaterial).toBe(true)
    expect(maskPixel(grid.material, 14, 20)).toBe(255)
    expect(maskPixel(grid.material, 26, 24)).toBe(0) // micro-dot grid excluded
    const mouse = meshes(pc).find(m => (m.material.emissiveMap?.image as { width?: number } | undefined)?.width === 512)!
    expect(maskPixel(mouse.material, 125, 172)).toBe(255)
    expect(maskPixel(mouse.material, 129, 156)).toBe(0) // A.X text excluded
    // Image 4/5/6: shaker tick, deck front dash, tablet margin have real lit emission.
    for (const [root, width, height] of [[decor.children[3]!, 0.012, 0.095], [deck, 0.014, 0.07], [decor.children[1]!, 0.016, 0.006]] as const) {
      const detail = meshes(root).find(m => parameters(m.geometry)?.width === width && parameters(m.geometry)?.height === height)!
      expect(detail.material.emissiveIntensity).toBe(1.4)
      expect(detail.material.emissive.getHex()).not.toBe(0)
    }
    // No broad glass, foliage, album art, text-only decal or playback line opt-ins.
    expect(meshes(decor.children[2]!).filter(m => m.material.vertexColors).every(m => !m.material.userData.decorativeEmission)).toBe(true)
    const allMaterials = (root: THREE.Object3D) => meshes(root).flatMap(m => Array.isArray(m.material) ? m.material : [m.material])
    expect(allMaterials(deck).filter(m => m.map && !m.emissiveMap).every(m => !m.userData.decorativeEmission)).toBe(true)
    expect(allMaterials(crate).filter(m => m.map).every(m => !m.userData.decorativeEmission)).toBe(true)
  })

  it('uses the production preference observer for cold/live/reset of all five states and forced colors', () => {
    const { scene, decor } = fixture()
    const mist = createStudioMist(new THREE.Color('#FFC58F')); scene.add(mist)
    const simplifiedStart = globe.indexOf('    const simplifiedStudio = () =>')
    const simplifiedEnd = globe.indexOf('    const applyStudioPalette', simplifiedStart)
    const observerStart = globe.indexOf('    const updateStudioPreferences = () =>')
    const observerEnd = globe.indexOf('    window.__cockpitTick', observerStart)
    const setup = new Function('scene', 'applyDecorativePreferences', 'applyTheme', 'grounding', 'deskReflections',
      `const rendererSizeTarget=null; const syncRestPose=()=>{};${globe.slice(simplifiedStart, simplifiedEnd)}\n${globe.slice(observerStart, observerEnd)}`)
    const lamp = decor.getObjectByName('desk-lamp')!
    const clear = (lamp.getObjectByName('lamp-clear-collar') as THREE.Mesh<THREE.BufferGeometry, Emissive>).material
    const emissives = meshes(decor).filter(m => m.material.userData.decorativeEmission).map(m => m.material)
    const originalMatrices = meshes(lamp).map(m => m.matrix.clone())
    const key = new THREE.SpotLight(0xF2EEE6, 130)
    lamp.getObjectByName('task-lamp-emitter')!.add(key)
    attributes.set('data-a11y-transparency', 'reduced')
    setup(scene, applyDecorativePreferences, () => {}, { mesh: {} }, { mesh: {} })
    expect(clear.transmission).toBe(0)
    expect(emissives.every(m => m.emissiveIntensity === 0)).toBe(true)
    expect(mist.visible).toBe(false)
    const update = () => observers.forEach(callback => callback())
    attributes.clear(); update()
    expect(clear.transmission).toBe(1)
    for (const [name, value, disabled] of [
      ['motion', 'reduced', false], ['contrast', 'high', true], ['transparency', 'reduced', true],
      ['text', 'large', false], ['controls', 'large', false],
    ] as const) {
      attributes.set(`data-a11y-${name}`, value); update()
      expect(emissives.every(m => m.emissiveIntensity === (disabled ? 0 : m.userData.decorativeEmission))).toBe(true)
      expect(clear.transmission).toBe(disabled ? 0 : 1)
      expect(clear.depthWrite).toBe(disabled)
      expect(mist.visible).toBe(!disabled)
      attributes.clear(); update()
      expect(mist.visible).toBe(true)
    }
    forced = true; mediaListeners.forEach(callback => callback())
    expect(clear.transmission).toBe(0)
    expect(mist.visible).toBe(false)
    forced = false; mediaListeners.forEach(callback => callback())
    expect(clear.transmission).toBe(1)
    expect(mist.visible).toBe(true)
    expect(meshes(lamp).map(m => m.matrix)).toEqual(originalMatrices)
    expect(meshes(lamp).every(m => m.visible)).toBe(true)
    expect(key.intensity).toBe(130)
  })

  it('keeps source materials unchanged and releases cloned materials/masks through scene disposal', () => {
    const source = new THREE.MeshStandardMaterial({ color: 0x4B6E4F, roughness: 0.57 })
    source.map = new THREE.Texture({ width: 32, height: 16 })
    const accent = makeAccentMaterial(source, { rectangles: [[2, 2, 4, 4]] }) as Emissive
    expect(source.emissive.getHex()).toBe(0)
    expect(accent.roughness).toBe(source.roughness)
    const root = new THREE.Group()
    const geometry = new THREE.BoxGeometry()
    root.add(new THREE.Mesh(geometry, source), new THREE.Mesh(geometry, accent), buildDeskLamp())
    const disposeMask = vi.spyOn(accent.emissiveMap!, 'dispose')
    const disposeMap = vi.spyOn(source.map, 'dispose')
    const disposeAccent = vi.spyOn(accent, 'dispose')
    const disposeGeometry = vi.spyOn(geometry, 'dispose')
    const start = globe.indexOf('function disposeObjectGraph(root)')
    const end = globe.indexOf('export { GlobeCanvas }', start)
    new Function('root', `${globe.slice(start, end)}; disposeObjectGraph(root);`)(root)
    expect(disposeMask).toHaveBeenCalledTimes(1)
    expect(disposeMap).toHaveBeenCalledTimes(1)
    expect(disposeAccent).toHaveBeenCalledTimes(1)
    expect(disposeGeometry).toHaveBeenCalledTimes(1)
    expect(root.children).toHaveLength(0)
  })
})
