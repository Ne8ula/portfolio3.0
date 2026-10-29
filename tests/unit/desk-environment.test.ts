import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { deskFrontZ, deskOutline, deskReceiverGeometry, sculptedDeskGeometries } from '../../components/cockpit/desk-outline'
import { createStudioBackdropCache, createAshGrain, createStudioMist, createSilkScreen, backdropCover, bambooPattern } from '../../components/cockpit/listening-room'
import { createRandomSource } from '../../lib/random/seeded-streams'
import { PALETTE, applyDecorativePreferences, makeAccentMaterial } from '../../components/cockpit/materials'

afterEach(() => vi.unstubAllGlobals())
const source = readFileSync(new URL('../../components/cockpit/globe-canvas.tsx', import.meta.url), 'utf8')

describe('sculpted desk and silk backdrop', () => {
  it('covers every stage without stretching or raster uploads, and keeps one screen surface', () => {
    const screen=createSilkScreen(),texture=new THREE.Texture()
    screen.set(texture,new THREE.Color('#1E1C1A'))
    const version=texture.version,geometry=screen.mesh.geometry
    const cases=[[1024,600],[1024,768],[1440,900],[2000,635],[2560,1440],[3440,1440],[800,450],[320,568],[3840,2160]]
    for(const [width,height] of [...cases,...cases.slice().reverse()]){
      const scale=backdropCover(width!,height!)
      expect(width!/(2048*scale.x)).toBeCloseTo(height!/(1024*scale.y),10)
      expect(scale.x).toBeGreaterThan(0);expect(scale.y).toBeGreaterThan(0)
      expect(Math.max(scale.x,scale.y)).toBe(1)
      screen.resize(width!,height!,{width:360,height:390},78)
      expect(screen.mesh.material.uniforms.cover!.value).toEqual(scale)
      expect(screen.mesh.geometry).toBe(geometry)
      expect(screen.mesh.material.uniforms.atlas!.value).toBe(texture)
      expect(texture.version).toBe(version)
    }
    expect(screen.mesh.children).toHaveLength(0)
    expect(screen.mesh.material.depthWrite).toBe(false)
    expect(screen.mesh.frustumCulled).toBe(false)
    expect(screen.mesh.userData.noPick&&screen.mesh.userData.noGlow).toBe(true)
  })

  it('retains seeded asymmetric leaf descriptors and bounds all leaf counts', () => {
    const pattern=(seed:string)=>bambooPattern(createRandomSource(seed).stream('listening-room/bamboo'))
    const first=pattern('screen-a')
    expect(first).toEqual(pattern('screen-a'))
    expect(first).not.toEqual(pattern('screen-b'))
    expect(first).toHaveLength(7)
    const clusters=first.flatMap(c=>c.fans),leaves=clusters.flatMap(c=>c.leaves)
    expect(clusters).toHaveLength(28);expect(leaves.length).toBeLessThanOrEqual(220)
    expect(clusters.every(c=>c.leaves.length>=5&&c.leaves.length<=9)).toBe(true)
    expect(new Set(leaves.map(l=>[l.length,l.width,l.angle,l.bend,l.taper].join(','))).size).toBe(leaves.length)
    expect(Math.max(...leaves.map(l=>l.length))/Math.min(...leaves.map(l=>l.length))).toBeGreaterThan(1.25)
  })

  it('uses continuous furniture grain UVs, bounded linear modulation and one faint static wisp', () => {
    const texture=createAshGrain(createRandomSource('wood-a').stream('listening-room/wood'))
    const pixels=texture.image.data as Uint8Array
    let minimum=255,maximum=0
    for(let i=0;i<pixels.length;i+=4){
      minimum=Math.min(minimum,pixels[i]!);maximum=Math.max(maximum,pixels[i]!)
      expect(pixels[i]).toBe(pixels[i+1]);expect(pixels[i]).toBe(pixels[i+2])
    }
    expect((maximum-minimum)/255).toBeGreaterThanOrEqual(.03)
    expect((maximum-minimum)/255).toBeLessThanOrEqual(.06)
    expect(texture.colorSpace).toBe(THREE.NoColorSpace)
    expect(texture.generateMipmaps).toBe(false)
    const desk=sculptedDeskGeometries()
    for(const geometry of [desk.top,desk.body]){
      const p=geometry.getAttribute('position'),uv=geometry.getAttribute('uv')
      expect(uv.count).toBe(p.count)
      for(let i=0;i<p.count;i++){
        expect(uv.getX(i)).toBeCloseTo((p.getX(i)+11+Math.max(0,-p.getY(i)-.175))/22,6)
        expect(uv.getY(i)).toBeCloseTo((p.getZ(i)+4.5)/9,6)
      }
    }
    const mist=createStudioMist(new THREE.Color('#FFC58F'))
    expect(mist.material.opacity).toBe(.016)
    expect(mist.material.depthTest).toBe(true);expect(mist.material.depthWrite).toBe(false)
    expect(mist.material.blending).toBe(THREE.NormalBlending)
    const mistData=(mist.material.map!.image as {data:Uint8Array}).data
    expect(pixels.byteLength+mistData.byteLength).toBe(589824)
    expect(mist.material.map!.generateMipmaps).toBe(false)
    const matrix=mist.matrix.clone(),version=mist.material.map!.version
    applyDecorativePreferences(mist,true);expect(mist.visible).toBe(false)
    applyDecorativePreferences(mist,false);expect(mist.visible).toBe(true)
    expect(mist.matrix).toEqual(matrix);expect(mist.material.map!.version).toBe(version)
  })

  it('keeps a fixed recessed outline, clipped receivers and original texture coordinates', () => {
    expect(deskFrontZ(0)).toBe(3.15)
    expect(deskFrontZ(2.8)).toBe(3.15)
    expect(deskFrontZ(5.2)).toBe(4.5)
    const geometry = deskReceiverGeometry()
    const positions = geometry.getAttribute('position'), uv = geometry.getAttribute('uv')
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), z = -positions.getY(i)
      expect(z).toBeLessThanOrEqual(deskFrontZ(x) + 1e-6)
      expect(uv.getX(i)).toBeCloseTo((x+11)/22,6)
      expect(uv.getY(i)).toBeCloseTo((4.5-z)/9,6)
    }
    // No triangle bridges across the concave opening.
    const index = geometry.index!
    for (let i = 0; i < index.count; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(positions,index.getX(i))
      const b = new THREE.Vector3().fromBufferAttribute(positions,index.getX(i+1))
      const c = new THREE.Vector3().fromBufferAttribute(positions,index.getX(i+2))
      for (let j = 0; j <= 10; j++) for (let k = 0; k <= 10-j; k++) {
        const p = a.clone().multiplyScalar(j/10).addScaledVector(b,k/10).addScaledVector(c,1-(j+k)/10)
        expect(-p.y).toBeLessThanOrEqual(deskFrontZ(p.x) + 0.005)
      }
    }
    expect(deskOutline().every(p => Math.abs(p.x)<=11 && Math.abs(p.y)<=4.5)).toBe(true)
    geometry.dispose()
  })

  it('builds four bounded static meshes below 3000 triangles with invariant satin and safe emission', () => {
    const start = source.indexOf('    const deskGeometry = sculptedDeskGeometries();')
    const end = source.indexOf('    // Bobblehead + pedestal removed',start)
    const table = new THREE.Group()
    new Function('THREE','PALETTE','sculptedDeskGeometries','makeAccentMaterial','token','tableGroup','createAshGrain','createStudioMist','randomSource',source.slice(start,end))(
      THREE,PALETTE,sculptedDeskGeometries,makeAccentMaterial,(name:string)=>new THREE.Color(name==='--scene-ash'?'#CDBCA4':'#FFC58F'),table,
      createAshGrain,createStudioMist,createRandomSource('desk-test'),
    )
    expect(table.children.filter(o=>o.name.startsWith('sculpted-desk'))).toHaveLength(4)
    let triangles = 0
    for (const object of table.children.filter(o=>o.name.startsWith('sculpted-desk'))) {
      const mesh = object as THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>
      triangles += (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count)/3
      expect(mesh.userData.noPick && mesh.userData.noGlow).toBe(true)
      expect(mesh.material.transparent).toBe(false)
      expect(mesh.material.metalness).toBe(0)
    }
    expect(triangles).toBeLessThanOrEqual(3000)
    const top = table.getObjectByName('sculpted-desk-top') as THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>
    const bounds = new THREE.Box3()
    table.children.filter(o=>o.name.startsWith('sculpted-desk')).forEach(o=>bounds.union(new THREE.Box3().setFromObject(o,true)))
    expect(bounds.min.y).toBeCloseTo(-7.8)
    expect(bounds.max.y).toBeCloseTo(0.175)
    expect(bounds.min.x).toBeGreaterThanOrEqual(-11.001)
    expect(bounds.max.x).toBeLessThanOrEqual(11.001)
    expect(top.material.color.getHex()).toBe(0xCDBCA4)
    expect(top.material.roughness).toBe(0.58)
    expect(top.material.envMapIntensity).toBe(0.3)
    table.updateMatrixWorld(true)
    const ray = new THREE.Raycaster(new THREE.Vector3(0,-.07,5),new THREE.Vector3(0,0,-1))
    expect(ray.intersectObjects(table.children).length).toBeGreaterThan(0)
    const supportRay = new THREE.Raycaster(new THREE.Vector3(-8.4,-.17,0),new THREE.Vector3(0,-1,0))
    const body = table.getObjectByName('sculpted-desk-body')!
    expect(supportRay.intersectObject(body)[0]?.point.y).toBeCloseTo(-.175,5)
    const diffuser = table.getObjectByName('sculpted-desk-diffuser') as THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>
    expect(diffuser.material.emissiveIntensity).toBe(1.1)
    applyDecorativePreferences(table,true)
    expect(diffuser.material.emissiveIntensity).toBe(0)
    expect(top.material.color.getHex()).toBe(0xCDBCA4)
    applyDecorativePreferences(table,false)
    expect(diffuser.material.emissiveIntensity).toBe(1.1)
    console.log('Desk resources:', { meshes: table.children.length, triangles })
    table.traverse(o => { if (o instanceof THREE.Mesh) o.geometry.dispose() })
  })

  it('paints deterministic bamboo depth once per palette, owns one texture and releases replacements', () => {
    const canvases: { width: number; height: number }[] = []
    const operations: unknown[][] = []
    const context = new Proxy({
      createLinearGradient: (...args: number[]) => {
        operations.push(['gradient',...args])
        return { addColorStop: (...stop: unknown[]) => operations.push(['stop',...stop]) }
      },
    }, { get: (target,key) => Reflect.get(target,key) ?? ((...args: unknown[]) => operations.push([key,...args.map(a => typeof a === 'object' ? 'canvas' : a)])),
      set: (target,key,value) => { operations.push(['set',key,value]); return Reflect.set(target,key,value) },
    })
    vi.stubGlobal('document',{createElement: () => {
      const canvas = { width:0,height:0,getContext:()=>context }; canvases.push(canvas); return canvas
    }})
    const cache = createStudioBackdropCache()
    const palette = { quiet:new THREE.Color('#26231F'),silk:new THREE.Color('#E8E4DC'),bamboo:new THREE.Color('#4B6E4F'),warm:new THREE.Color('#FFC58F') }
    const first = cache.get(palette), dispose = vi.spyOn(first,'dispose')
    const count = operations.length
    expect(first.image.width).toBe(2048); expect(first.image.height).toBe(1024)
    expect(first.generateMipmaps).toBe(false)
    expect(first.minFilter).toBe(THREE.LinearFilter)
    expect(first.colorSpace).toBe(THREE.SRGBColorSpace)
    expect(canvases).toHaveLength(2)
    expect(canvases[1]).toMatchObject({width:1,height:1})
    expect(operations.filter(op => op[0]==='fill')).toHaveLength(168) // default descriptors: 28 clusters x 6 leaves
    expect(operations.some(op=>JSON.stringify(op)===JSON.stringify(['set','filter','blur(16px)']))).toBe(true)
    expect(operations.some(op=>JSON.stringify(op)===JSON.stringify(['set','filter','blur(2px)']))).toBe(true)
    expect(cache.get(palette)).toBe(first); expect(operations).toHaveLength(count)
    const second = cache.get({...palette,quiet:new THREE.Color('#F0EBE1')})
    expect(second).not.toBe(first); expect(dispose).toHaveBeenCalledTimes(1)
    const release = vi.spyOn(second,'dispose')
    cache.dispose(); cache.dispose()
    expect(release).toHaveBeenCalledTimes(1)
  })

  it('coalesces actual theme callbacks after CSS settles and keeps the opaque preference fallback', () => {
    const start=source.indexOf('    const applyStudioPalette = () =>')
    const end=source.indexOf('    scene.background = new THREE.Color(T().bg);',start)
    const scene=new THREE.Scene()
    let light=false, simplified=false
    const callbacks: (()=>void)[]=[]
    const get=vi.fn((_palette: unknown)=>new THREE.Texture())
    const token=(name:string)=>new THREE.Color(name==='--ink' ? light?'#F0EBE1':'#1E1C1A'
      :name==='--scene-warm-light'?'#FFC58F':'#E8E4DC')
    const screen=createSilkScreen()
    const create=new Function('THREE','PALETTE','T','token','scene','backdropCache','simplifiedStudio','requestAnimationFrame','silkScreen',
      `let backdropFrame=null;${source.slice(start,end)}; return applyStudioPalette;`)
    const apply=create(THREE,PALETTE,()=>({}),token,scene,{get},()=>simplified,(callback:()=>void)=>{callbacks.push(callback);return callbacks.length},screen) as ()=>void
    apply();apply();light=true;apply()
    expect(callbacks).toHaveLength(1)
    callbacks.shift()!()
    expect(get).toHaveBeenCalledTimes(1)
    expect(get.mock.calls[0]?.[0]).toMatchObject({quiet:new THREE.Color('#F0EBE1')})
    const silk=new THREE.Color('#E8E4DC').lerp(new THREE.Color('#FFC58F'),.12).multiplyScalar(.87)
    expect(get.mock.calls[0]?.[0]).toMatchObject({silk})
    simplified=true;apply()
    expect(scene.background).toEqual(new THREE.Color('#F0EBE1'))
    expect(screen.mesh.visible).toBe(false)
    callbacks.shift()!()
    expect(get).toHaveBeenCalledTimes(1)
    simplified=false;apply();callbacks.shift()!()
    expect(get).toHaveBeenCalledTimes(2)
    expect(screen.mesh.visible).toBe(true)
    expect(get.mock.calls[1]?.[0]).toEqual(get.mock.calls[0]?.[0])
    light=false;apply();callbacks.shift()!()
    expect(get.mock.calls[2]?.[0]).toMatchObject({quiet:new THREE.Color('#1E1C1A')})
  })
})
