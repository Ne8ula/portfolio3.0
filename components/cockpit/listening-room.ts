import * as THREE from 'three'

type ContactFootprint = {
  x: number; z: number; width: number; depth: number
  weight: number; core: boolean
}

/** Low, opaque geometry only: invisible pick volumes and raised shells do
 * not cast a contact mark. Work in table space so FPV offsets cancel out. */
export function contactFootprints(roots: readonly THREE.Object3D[], table: THREE.Object3D) {
  table.updateWorldMatrix(true, true)
  const inverse = table.matrixWorld.clone().invert()
  const footprints: ContactFootprint[] = []
  for (const root of roots) {
    const tablet = root.userData.groundingProfile === 'tablet'
    root.traverseVisible(object => {
      if (!(object instanceof THREE.Mesh)) return
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      if (materials.every(m => !m.visible || m.opacity === 0 || ('transmission' in m && Number(m.transmission) > 0.4))) return
      if (!object.geometry.boundingBox) object.geometry.computeBoundingBox()
      const box = object.geometry.boundingBox?.clone()
        .applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld))
      if (!box || box.min.y < 0.12 || box.min.y > 0.30 || box.max.y > 0.65) return
      // The tablet's liner/plate/buttons sit above its four 0.025-high feet.
      // Only low contact points contribute, not the whole shallow assembly.
      if (tablet && box.min.y > 0.205) return
      const size = box.getSize(new THREE.Vector3())
      if (size.x < 0.025 || size.z < 0.025) return
      const center = box.getCenter(new THREE.Vector3())
      footprints.push({
        x: center.x, z: center.z, width: size.x, depth: size.z,
        weight: tablet ? 0.3 : 1,
        core: box.min.y <= 0.205 && size.x * size.z <= 0.25,
      })
    })
  }
  return footprints
}

/** One bounded opacity field, not source-over stamps. Rounded distance
 * falloffs retain separate feet and gaps without stacking coincident layers. */
export function contactShadowMask(footprints: readonly ContactFootprint[], width: number, height: number) {
  const mask = new Uint8ClampedArray(width * height)
  const fade = (distance: number, inner: number, outer: number) => {
    const t = THREE.MathUtils.clamp((distance - inner) / (outer - inner), 0, 1)
    return 1 - t * t * (3 - 2 * t)
  }
  for (const footprint of footprints) {
    // Pull broad patches inward; only the soft falloff extends past the base.
    const halfW = footprint.width * 0.44
    const halfD = footprint.depth * 0.44
    const radius = Math.min(halfW, halfD, 0.24)
    const feather = footprint.core ? 0.14 : 0.26
    const x0 = Math.max(0, Math.floor((footprint.x - halfW - feather + 11) / 22 * width))
    const x1 = Math.min(width - 1, Math.ceil((footprint.x + halfW + feather + 11) / 22 * width))
    const y0 = Math.max(0, Math.floor((footprint.z - halfD - feather + 4.5) / 9 * height))
    const y1 = Math.min(height - 1, Math.ceil((footprint.z + halfD + feather + 4.5) / 9 * height))
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const qx = Math.abs((x + 0.5) / width * 22 - 11 - footprint.x) - halfW + radius
      const qz = Math.abs((y + 0.5) / height * 9 - 4.5 - footprint.z) - halfD + radius
      const distance = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - radius
      const soft = 0.12 * fade(distance, -0.08, feather)
      const core = footprint.core ? 0.035 * fade(distance, -0.02, 0.035) : 0
      const alpha = Math.round(255 * footprint.weight * (soft + core))
      const index = y * width + x
      mask[index] = Math.max(mask[index] ?? 0, alpha)
    }
  }
  return mask
}

/** A static, softly feathered contact pass; no shadow cameras or frame-time
 * render targets. Rebuilt only when an authored root transform changes. */
export function createContactGrounding(table: THREE.Object3D, ink: THREE.Color) {
  const canvas = document.createElement('canvas')
  canvas.width = 1536
  canvas.height = 640
  const context = canvas.getContext('2d')!
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthWrite: false, toneMapped: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(22, 9), material)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = 0.177
  mesh.userData.noPick = true
  mesh.userData.noGlow = true
  table.add(mesh)
  let lastKey = ''
  return {
    mesh,
    update(roots: readonly THREE.Object3D[]) {
      // Root transforms include the authored PC/crate/deck plus prop groups.
      // Coffee motion does not rebuild the static grounding every frame.
      const key = roots.map(root => [...root.position, ...root.quaternion, ...root.scale].join(',')).join('|')
      if (key === lastKey) return
      lastKey = key
      const mask = contactShadowMask(contactFootprints(roots, table), canvas.width, canvas.height)
      const pixels = context.createImageData(canvas.width, canvas.height)
      const color = ink.getHex()
      for (let i = 0; i < mask.length; i++) {
        pixels.data[i * 4] = (color >> 16) & 255
        pixels.data[i * 4 + 1] = (color >> 8) & 255
        pixels.data[i * 4 + 2] = color & 255
        pixels.data[i * 4 + 3] = mask[i] ?? 0
      }
      context.putImageData(pixels, 0, 0)
      texture.needsUpdate = true
    },
  }
}

export type StudioBackdropPalette = {
  quiet: THREE.Color; silk: THREE.Color; bamboo: THREE.Color; warm: THREE.Color
}
type Stream = { next(): number }
export function bambooPattern(random: Stream = { next: () => 0.5 }) {
  return Array.from({ length: 7 }, (_, index) => {
    const x = 0.31 + index * 0.105 + (random.next() - 0.5) * 0.025
    const top = 0.15 + random.next() * 0.11, lean = (random.next() - 0.5) * 0.09
    const fans = Array.from({ length: 4 }, (_, fan) => {
      const t = 0.20 + fan * 0.20 + (random.next() - 0.5) * 0.045
      const bx = (x + lean * t) * 2048, by = 690 + (top * 1024 - 690) * t
      const sign = (index + fan) % 2 ? 1 : -1
      const angle = sign > 0 ? -0.45 - random.next() * 0.4 : Math.PI + 0.45 + random.next() * 0.4
      const reach = 90 + random.next() * 65
      const leaves = Array.from({ length: 5 + Math.floor(random.next() * 3) }, (_, leaf) => {
        const along = 0.15 + leaf * 0.105 + random.next() * 0.045
        return {
          x: bx + Math.cos(angle) * reach * along,
          y: by + Math.sin(angle) * reach * along,
          angle: angle + (leaf % 2 ? 1 : -1) * (0.35 + random.next() * 0.35) + (random.next() - 0.5) * Math.PI / 15,
          length: 112 * (0.75 + random.next() * 0.5),
          width: 16 * (0.75 + random.next() * 0.5),
          bend: (random.next() - 0.5) * 22,
          taper: 0.35 + random.next() * 0.2,
        }
      })
      return { bx, by, angle, reach, leaves }
    })
    return { x, top, lean, distant: index % 2 === 0, fans }
  })
}

/** Silk artwork only. Quiet chrome masks live in stage coordinates, never
 * inside this atlas, so cover cropping cannot expose a rectangular dark band. */
export function studioBackdrop(palette: StudioBackdropPalette, pattern = bambooPattern()) {
  const canvas = document.createElement('canvas')
  canvas.width = 2048; canvas.height = 1024
  const context = canvas.getContext('2d')!
  const css = (color: THREE.Color, alpha = 1) => {
    const hex = color.getHex()
    return `rgba(${hex >> 16},${(hex >> 8) & 255},${hex & 255},${alpha})`
  }
  const field = context.createLinearGradient(0,0,0,1024)
  field.addColorStop(0,css(palette.silk.clone().lerp(palette.bamboo,0.12)))
  field.addColorStop(1,css(palette.silk))
  context.fillStyle=field; context.fillRect(0,0,2048,1024)
  const layer=document.createElement('canvas'); layer.width=2048;layer.height=1024
  const draw=layer.getContext('2d')!
  for(const distant of [true,false]) {
    draw.clearRect(0,0,2048,1024)
    draw.fillStyle=draw.strokeStyle=css(distant ? palette.bamboo.clone().lerp(palette.silk,0.3) : palette.bamboo)
    for(const culm of pattern.filter(c=>c.distant===distant)) {
      draw.lineWidth=distant?4:3
      draw.beginPath();draw.moveTo(culm.x*2048,690)
      draw.quadraticCurveTo((culm.x+culm.lean*0.4)*2048,420,(culm.x+culm.lean)*2048,culm.top*1024);draw.stroke()
      for(const fan of culm.fans) {
        draw.lineWidth=2
        draw.beginPath();draw.moveTo(fan.bx-5,fan.by+2);draw.lineTo(fan.bx+5,fan.by-2);draw.stroke()
        draw.beginPath();draw.moveTo(fan.bx,fan.by)
        draw.lineTo(fan.bx+Math.cos(fan.angle)*fan.reach,fan.by+Math.sin(fan.angle)*fan.reach);draw.stroke()
        for(const leaf of fan.leaves) {
          const dx=Math.cos(leaf.angle)*leaf.length,dy=Math.sin(leaf.angle)*leaf.length
          const nx=-Math.sin(leaf.angle),ny=Math.cos(leaf.angle)
          draw.beginPath();draw.moveTo(leaf.x,leaf.y)
          draw.quadraticCurveTo(leaf.x+dx*leaf.taper+nx*(leaf.width+leaf.bend),leaf.y+dy*leaf.taper+ny*(leaf.width+leaf.bend),leaf.x+dx,leaf.y+dy)
          draw.quadraticCurveTo(leaf.x+dx*0.65+nx*(leaf.bend-leaf.width),leaf.y+dy*0.65+ny*(leaf.bend-leaf.width),leaf.x,leaf.y)
          draw.fill()
        }
      }
    }
    context.save();context.globalAlpha=distant?0.16:0.46
    context.filter=distant?'blur(16px)':'blur(2px)'
    context.drawImage(layer,0,0);context.restore()
  }
  context.fillStyle=css(palette.silk.clone().lerp(palette.warm,0.08),0.06)
  context.fillRect(0,0,2048,1024)
  context.strokeStyle=css(palette.bamboo,0.13);context.lineWidth=2
  for(const x of [0.39,0.59,0.79]) {
    context.beginPath();context.moveTo(x*2048,0);context.lineTo(x*2048,1024);context.stroke()
  }
  layer.width=layer.height=1
  const texture=new THREE.CanvasTexture(canvas)
  texture.colorSpace=THREE.SRGBColorSpace
  texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false
  return texture
}

export function createStudioBackdropCache(random?: Stream) {
  const pattern=bambooPattern(random)
  let key='',texture: THREE.CanvasTexture|null=null
  return {
    get(palette: StudioBackdropPalette) {
      const next=Object.values(palette).map(color=>color.getHexString()).join(':')
      if(next!==key || !texture) {texture?.dispose();texture=studioBackdrop(palette,pattern);key=next}
      return texture
    },
    dispose(){texture?.dispose();texture=null;key=''},
  }
}

export function backdropCover(width: number,height: number) {
  const aspect=width/Math.max(1,height)
  return new THREE.Vector2(Math.min(1,aspect/2),Math.min(1,2/aspect))
}

/** One opaque far-plane surface, included in Three's existing transmission
 * buffer. Stage masks and cover UVs update without repainting/uploading pixels. */
export function createSilkScreen() {
  const material=new THREE.ShaderMaterial({
    uniforms:{atlas:{value:null},cover:{value:new THREE.Vector2(1,1)},quiet:{value:new THREE.Color()},
      stage:{value:new THREE.Vector2(1440,900)},identity:{value:new THREE.Vector2(380,390)},header:{value:78}},
    vertexShader:`varying vec2 screenUv;
      void main(){screenUv=uv;gl_Position=vec4(position.xy,0.999999,1.0);}`,
    fragmentShader:`uniform sampler2D atlas; uniform vec2 cover,stage,identity;
      uniform vec3 quiet; uniform float header; varying vec2 screenUv;
      void main(){
        vec2 p=vec2(screenUv.x,1.0-screenUv.y)*stage;
        vec3 silk=texture2D(atlas,(screenUv-0.5)*cover+0.5).rgb;
        float nav=1.0-smoothstep(max(0.0,header-1.0),header,p.y);
        gl_FragColor=vec4(mix(silk,quiet,nav),1.0);
        #include <colorspace_fragment>
      }`,
    depthTest:true,depthWrite:false,toneMapped:false,
  })
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material)
  mesh.name='bamboo-silk-screen';mesh.frustumCulled=false;mesh.renderOrder=-1000
  mesh.userData.noPick=true;mesh.userData.noGlow=true
  return {
    mesh,
    resize(width:number,height:number,identity?:{width:number;height:number},header=78){
      material.uniforms.cover!.value.copy(backdropCover(width,height))
      material.uniforms.stage!.value.set(width,height)
      material.uniforms.identity!.value.set(identity?.width??Math.min(380,width*.29),identity?.height??height*.43)
      material.uniforms.header!.value=header
    },
    set(texture:THREE.Texture,quiet:THREE.Color){material.uniforms.atlas!.value=texture;material.uniforms.quiet!.value.copy(quiet)},
  }
}

/** Sparse periodic ash grain; neutral 4% reflectance modulation, no knots. */
export function createAshGrain(random: Stream) {
  const w=1024,h=128,pixels=new Uint8Array(w*h*4),phase=random.next()*Math.PI*2
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const u=x/w*Math.PI*2,v=y/h*Math.PI*2
    const grain=Math.sin(v*17+0.22*Math.sin(u+phase))+0.2*Math.sin(v*73+0.08*Math.sin(u*2))
    const value=Math.round(249+5*grain/1.2),i=(y*w+x)*4
    pixels[i]=pixels[i+1]=pixels[i+2]=value;pixels[i+3]=255
  }
  const texture=new THREE.DataTexture(pixels,w,h)
  texture.colorSpace=THREE.NoColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping
  texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true
  return texture
}

/** Static atmospheric illustration, not particles, fog or light scattering. */
export function createStudioMist(color: THREE.Color) {
  const w=256,h=64,pixels=new Uint8Array(w*h*4)
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const u=x/(w-1),v=y/(h-1),center=0.48+0.15*Math.sin(u*Math.PI*1.4)
    const a=Math.exp(-Math.pow((v-center)/0.16,2))*Math.pow(Math.sin(u*Math.PI),2)
    const i=(y*w+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=255;pixels[i+3]=Math.round(a*255)
  }
  const texture=new THREE.DataTexture(pixels,w,h)
  texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(4.8,0.5),new THREE.MeshBasicMaterial({
    color,map:texture,transparent:true,opacity:0.016,depthTest:true,depthWrite:false,blending:THREE.NormalBlending,toneMapped:false,
  }))
  mesh.name='rear-corridor-mist';mesh.position.set(-1.8,1.45,-2.8)
  mesh.userData.noPick=true;mesh.userData.noGlow=true;mesh.userData.decorativeAtmosphere=true
  return mesh
}
