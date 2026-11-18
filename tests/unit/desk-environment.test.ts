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
    expect(first).toHaveLength(20)
    expect([0,1,2,3].map(depth=>first.filter(c=>c.depth===depth).length)).toEqual([6,6,5,3])
    expect([0,1,2,3].map(depth=>first.filter(c=>c.depth===depth).flatMap(c=>c.fans).length)).toEqual([24,24,15,9])
    const heights=first.map(c=>c.bottom-c.top),gaps=first.slice(1).map((c,i)=>c.x-first[i]!.x)
    expect(Math.max(...heights)/Math.min(...heights)).toBeGreaterThanOrEqual(1.5)
    expect(Math.max(...gaps)/Math.min(...gaps)).toBeGreaterThanOrEqual(3)
    expect(first.some(c=>c.lean<0)&&first.some(c=>c.lean>0)).toBe(true)
    const clusters=first.flatMap(c=>c.fans),leaves=clusters.flatMap(c=>c.leaves)
    expect(clusters).toHaveLength(72);expect(leaves.length).toBeLessThanOrEqual(560)
    expect(first.every(c=>c.fans.every(f=>f.leaves.length>=(c.depth===0?7:6)&&f.leaves.length<=(c.depth===0?8:7)))).toBe(true)
    expect(new Set(leaves.map(l=>[l.length,l.width,l.angle,l.bend,l.taper].join(','))).size).toBe(leaves.length)
    const lengthRatio=Math.max(...leaves.map(l=>l.length))/Math.min(...leaves.map(l=>l.length))
    expect(lengthRatio).toBeGreaterThan(1.7);expect(lengthRatio).toBeLessThan(1.85)
    for(const c of first) for(const f of c.fans) for(const leaf of f.leaves) {
      expect(leaf.length).toBeGreaterThanOrEqual([84,95.2,112,140][c.depth]!* .95)
      expect(leaf.length).toBeLessThanOrEqual([84,95.2,112,140][c.depth]!*1.05)
    }
  })

  it('keeps complete dark-leaf curves and branches inside a padded approved zone', () => {
    for(const seed of ['ax-bamboo-depth-v1','screen-a','screen-b',...Array.from({length:20},(_,i)=>`zone-${i}`)]) {
      const pattern=bambooPattern(createRandomSource(seed).stream('listening-room/bamboo'))
      for(const culm of pattern.filter(c=>c.depth>=2)) for(const fan of culm.fans) {
        const points=[[fan.bx-5,fan.by+2],[fan.bx+5,fan.by-2],
          [fan.bx+Math.cos(fan.angle)*fan.reach,fan.by+Math.sin(fan.angle)*fan.reach]]
        for(const leaf of fan.leaves) {
          const dx=Math.cos(leaf.angle)*leaf.length,dy=Math.sin(leaf.angle)*leaf.length
          const nx=-Math.sin(leaf.angle),ny=Math.cos(leaf.angle)
          // Convex-hull containment proves both quadratic edges, not just tips.
          points.push([leaf.x,leaf.y],[leaf.x+dx,leaf.y+dy],
            [leaf.x+dx*leaf.taper+nx*(leaf.width+leaf.bend),leaf.y+dy*leaf.taper+ny*(leaf.width+leaf.bend)],
            [leaf.x+dx*.65+nx*(leaf.bend-leaf.width),leaf.y+dy*.65+ny*(leaf.bend-leaf.width)])
        }
        const fits=(l:number,r:number,b:number)=>points.every(([x,y])=>x!>=l*2048+8-1e-8&&x!<=r*2048-8+1e-8&&y!>=.07*1024+8-1e-8&&y!<=b*1024-8+1e-8)
        expect(fits(0,1,.27)||fits(.40,.51,.46),`${seed} depth ${culm.depth}`).toBe(true)
      }
    }
  })

  it('constructs the same production bamboo without consuming the capture source', () => {
    const line=source.split('\n').find(line=>line.includes('const backdropCache ='))!
    const construct=new Function('createStudioBackdropCache','createRandomSource',`${line};return backdropCache;`)
    const seeded=vi.fn(createRandomSource)
    const first=construct(bambooPattern,seeded)
    expect(construct(bambooPattern,seeded)).toEqual(first)
    expect(seeded.mock.calls).toEqual([['ax-bamboo-depth-v1'],['ax-bamboo-depth-v1']])
  })

  it('keeps culms and fans in both outer thirds of the supported cover crops', () => {
    for (const seed of ['desk-view-owner-fix', 'screen-a', 'screen-b', 'ax-bamboo-depth-v1']) {
      const pattern = bambooPattern(createRandomSource(seed).stream('listening-room/bamboo'))
      for (const [width, height] of [[1024,600],[1024,768],[1440,900],[2000,635],[2560,1440],[3440,1440]]) {
        const cover = backdropCover(width!, height!)
        const project = (x: number, y: number) => ({ x: (x-.5)/cover.x+.5, y: (y-.5)/cover.y+.5 })
        // The backdrop is screen-space: all nine camera looks use these same
        // UVs. Test exposed fan attachments below chrome, above the desk field.
        for (const [left, right] of [[0,1/3],[2/3,1]]) {
          const fans = pattern.filter(c=>c.depth<2).flatMap(c => c.fans).filter(fan => {
            const p = project(fan.bx/2048, fan.by/1024)
            return p.x > left!+.02 && p.x < right!-.02 && p.y > 244/height! && p.y < .55
          })
          expect(fans.length, `${seed} ${width}x${height} third ${left}`).toBeGreaterThan(0)
          expect(fans.some(fan => fan.leaves.some(leaf => {
            const tip = project((leaf.x+Math.cos(leaf.angle)*leaf.length)/2048,
              (leaf.y+Math.sin(leaf.angle)*leaf.length)/1024)
            return tip.x > left! && tip.x < right! && tip.y > 94/height! && tip.y < .55
          }))).toBe(true)
        }
      }
    }
  })

  it('closes the existing front and underside with outward faces while preserving knee space', () => {
    const geometries = sculptedDeskGeometries()
    const material = new THREE.MeshBasicMaterial({ side: THREE.FrontSide })
    const meshes = Object.entries(geometries).map(([name, geometry]) => {
      const mesh = new THREE.Mesh(geometry, material); mesh.name = name; return mesh
    })
    const cast = (origin: number[], direction: number[]) => new THREE.Raycaster(
      new THREE.Vector3(...origin), new THREE.Vector3(...direction),
    ).intersectObjects(meshes)
    for (let x = -10.4; x <= 10.4; x += .4) {
      for (const y of [.12, .06, .02, -.01, -.03, -.07, -.12, -.16]) {
        const hit = cast([x,y,5], [0,0,-1])[0]
        expect(hit, `front ${x}/${y}`).toBeDefined()
        expect(hit!.point.z).toBeLessThanOrEqual(deskFrontZ(x)+.025)
      }
    }
    for (let x = -5; x <= 5; x += .5) for (let z = -4; z <= 2.8; z += .4) {
      const hit = cast([x,-1,z], [0,1,0])[0]
      expect(hit?.object.name).toBe('body')
      expect(hit?.point.y).toBeCloseTo(-.175,6)
      expect(hit!.face!.normal.y).toBeLessThan(-.99)
    }
    expect(cast([0,-1,5], [0,0,-1])).toHaveLength(0)
    expect(cast([-8.4,-.17,0], [0,-1,0])[0]?.point.y).toBeCloseTo(-.175,6)
    expect(cast([10.8,-1,5], [0,0,-1])[0]?.object.name).toBe('body')
    meshes.forEach(mesh => mesh.geometry.dispose()); material.dispose()
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
    expect(canvases).toHaveLength(3)
    expect(canvases[0]).toMatchObject({width:2048,height:1024})
    expect(canvases[1]).toMatchObject({width:1024,height:512})
    expect(operations.filter(op => op[0]==='fill')).toHaveLength(528) // 24 fans x 8 + 48 x 7
    const draws=operations.filter(op=>op[0]==='drawImage')
    expect(draws).toHaveLength(22) // 4 composites + (4+3+2) down/up pairs
    const expectedSizes=[
      [1024,512,256,128,256,512,1024,2048],
      [1024,512,256,512,1024,2048], [1024,512,1024,2048], [],
    ]
    let cursor=0
    for(const sizes of expectedSizes) {
      let previous=2048
      for(const width of sizes) {
        expect(draws[cursor++]).toEqual(['drawImage','canvas',0,0,previous,previous/2,0,0,width,width/2])
        previous=width
      }
      expect(draws[cursor++]).toEqual(['drawImage','canvas',0,0])
    }
    expect(operations.some(op=>op[0]==='set'&&op[1]==='filter')).toBe(false)
    expect(operations.filter(op=>op[0]==='set'&&op[1]==='globalAlpha').map(op=>op[2])).toEqual([.40,.52,.66,.97])
    const rgba=(color:THREE.Color)=>{const hex=color.getHex();return `rgba(${hex>>16},${(hex>>8)&255},${hex&255},1)`}
    expect(operations.filter(op=>op[0]==='set'&&op[1]==='fillStyle').slice(1,5).map(op=>op[2])).toEqual(
      [.45,.25,0,0].map(mix=>rgba(palette.bamboo.clone().lerp(palette.silk,mix))))
    expect(operations.filter(op=>op[0]==='gradient'&&op[2]===.27*1024).map(op=>op[4])).toEqual(
      bambooPattern().filter(c=>c.depth>=2).sort((a,b)=>a.depth-b.depth).map(c=>(c.lane ? .58 : .50)*1024))
    const uuid=first.uuid,version=first.version
    expect(cache.get(palette)).toBe(first); expect(operations).toHaveLength(count)
    expect(cache.get({...palette,quiet:new THREE.Color('#F0EBE1')})).toBe(first)
    expect(first.uuid).toBe(uuid);expect(first.version).toBe(version)
    expect(operations).toHaveLength(count);expect(dispose).not.toHaveBeenCalled()
    const second = cache.get({...palette,silk:new THREE.Color('#F0EBE1')})
    expect(second).not.toBe(first); expect(dispose).toHaveBeenCalledTimes(1)
    expect(canvases).toHaveLength(4) // one replacement atlas; same two scratch canvases
    const release = vi.spyOn(second,'dispose')
    cache.dispose(); cache.dispose()
    expect(release).toHaveBeenCalledTimes(1)
    expect(canvases[0]).toMatchObject({width:1,height:1})
    expect(canvases[1]).toMatchObject({width:1,height:1})
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
