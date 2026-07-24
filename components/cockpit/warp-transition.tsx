// @ts-nocheck
"use client"
// WarpTransition — ~2.5s airlock between BootScreen and Cockpit.
// A dedicated (disposable) three.js scene: two wireframe doors slide apart while a
// Death-Stranding-style scan pulse expands from the seam, revealing a contour-grid
// terrain behind. The REAL cockpit is mounted underneath (see cockpit-app.tsx);
// a portal quad in the doorway punches a transparent hole that tracks the parting
// panels, so the desk shows through the widening gap, then the whole scan world
// dissolves. Cream/jade palette, glitch interference riding each scan wavefront.
// Debug: set window.__warpTimeScale = N before entering to play N× slower.
import React from "react"
import * as THREE from "three"

const DURATION_MS = 2500
const timeScale = () => (typeof window !== "undefined" && window.__warpTimeScale) || 1

// Baked palette (three.js can't read CSS vars; matches globals.css :root)
const CREAM = 0xe8e4dc
const JADE = 0x4b6e4f
const JADE_DEEP = 0x3a5a3e

const easeOut = (u) => 1 - Math.pow(1 - u, 2.2)
const easeInCubic = (u) => u * u * u
const easeInOutCubic = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)
const clamp01 = (v) => Math.min(1, Math.max(0, v))

const GLSL_HASH = `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
`

// ---- Terrain: opaque cream plane, grid + elevation contours drawn in the fragment
// shader, revealed radially by the scan wavefront.
const TERRAIN_VERT = `
varying vec3 vWorld;
varying float vH;
${GLSL_HASH}
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
void main(){
  vec3 p = position;
  float d = length(p.xz);
  float amp = smoothstep(5.0, 32.0, d) * 3.4;
  float h = (vnoise(p.xz * 0.16) * 0.72 + vnoise(p.xz * 0.37 + 13.7) * 0.28) * amp;
  p.y += h;
  vH = h;
  vWorld = p;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`

const TERRAIN_FRAG = `
uniform float uScanA;
uniform float uScanB;
uniform float uGlitch;
uniform float uTime;
varying vec3 vWorld;
varying float vH;
${GLSL_HASH}
void main(){
  vec3 cream     = vec3(0.910, 0.894, 0.863);
  vec3 jadeDeep  = vec3(0.227, 0.353, 0.243);
  vec3 jadeLight = vec3(0.478, 0.604, 0.494);

  vec2 g = vWorld.xz;
  // interference: horizontal slices shear the pattern while a glitch spike is live,
  // localized to a wide ring around the scan wavefront (the wave "hits" geometry)
  float d0 = length(g);
  float nearWave = exp(-pow((d0 - uScanA) / 6.0, 2.0)) + exp(-pow((d0 - uScanB) / 6.0, 2.0));
  float row = floor(gl_FragCoord.y / 5.0);
  g.x += (hash(vec2(row, floor(uTime * 47.0))) - 0.5) * uGlitch * clamp(nearWave, 0.0, 1.0) * 1.2;
  float d = length(g);

  // survey grid
  vec2 gp = g / 1.2;
  vec2 gf = abs(fract(gp) - 0.5);
  vec2 gw = fwidth(gp);
  float gridL = max(1.0 - smoothstep(0.0, gw.x * 1.6, gf.x),
                    1.0 - smoothstep(0.0, gw.y * 1.6, gf.y));

  // elevation contours
  float cf = vH * 1.6;
  float cw = fwidth(cf) * 1.6;
  float contour = 1.0 - smoothstep(0.0, cw, abs(fract(cf) - 0.5) * -1.0 + 0.5);
  contour *= smoothstep(0.05, 0.35, vH); // no contour noise on the flat apron

  float lines = max(gridL * 0.5, contour * 0.95);

  // the scan reveals; its wavefront burns bright
  float reveal = 1.0 - smoothstep(uScanA - 0.8, uScanA + 0.3, d);
  float band = exp(-pow((d - uScanA) / 0.9, 2.0)) + exp(-pow((d - uScanB) / 0.7, 2.0));
  float fog = smoothstep(52.0, 16.0, d);

  vec3 col = mix(cream, jadeDeep, lines * reveal * fog * 0.85);
  col = mix(col, jadeLight, clamp(band, 0.0, 1.0) * lines * fog);
  col -= vec3(0.055, 0.035, 0.05) * clamp(band, 0.0, 1.0) * fog; // faint wash where the wave itself passes
  gl_FragColor = vec4(col, 1.0);
}
`

// ---- Portal: a quad filling the doorway. Cream (opaque) while the doors are
// shut; as the panels part it writes alpha 0 in the widening gap (NoBlending
// stomps the framebuffer, premultiplied), punching a transparent hole in the
// canvas — the REAL cockpit scene mounted underneath shows through. A thin
// jade-light edge rides the reveal front.
const PORTAL_VERT = `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const PORTAL_FRAG = `
uniform float uSlide;
varying vec2 vUv;
void main(){
  vec3 cream     = vec3(0.910, 0.894, 0.863);
  vec3 jadeLight = vec3(0.478, 0.604, 0.494);
  // hole half-width tracks the panels' inner edges (doorway is 4.6 world units)
  float front = max(uSlide - 0.04, 0.0) / 4.6;
  float d = abs(vUv.x - 0.5);
  float a = smoothstep(front, front + 0.012, d); // 0 in the gap, 1 behind the panels
  float edge = exp(-pow((d - front) / 0.012, 2.0)) * step(0.001, front);
  vec3 col = mix(cream, jadeLight, edge);
  gl_FragColor = vec4(col * a, a);
}
`

// ---- Door / frame lines: jade wireframe that materializes as the scan hits it,
// with row-sliced jitter during glitch spikes.
const LINE_VERT = `
uniform float uGlitch;
uniform float uTime;
uniform float uScanA;
uniform float uScanB;
varying vec3 vWorld;
${GLSL_HASH}
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  float d0 = length(w.xz);
  float nearWave = exp(-pow((d0 - uScanA) / 6.0, 2.0)) + exp(-pow((d0 - uScanB) / 6.0, 2.0));
  float row = floor((w.y + 10.0) * 6.0);
  w.x += (hash(vec2(row, floor(uTime * 43.0))) - 0.5) * uGlitch * clamp(nearWave, 0.0, 1.0) * 0.4;
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`

const LINE_FRAG = `
uniform float uScanA;
uniform float uScanB;
varying vec3 vWorld;
void main(){
  float d = length(vWorld.xz);
  float reveal = 1.0 - smoothstep(uScanA - 0.5, uScanA + 0.2, d);
  float band = exp(-pow((d - uScanA) / 0.7, 2.0)) + exp(-pow((d - uScanB) / 0.6, 2.0));
  vec3 jade      = vec3(0.294, 0.431, 0.310);
  vec3 jadeLight = vec3(0.478, 0.604, 0.494);
  vec3 col = mix(jade, jadeLight, clamp(band, 0.0, 1.0));
  gl_FragColor = vec4(col, 0.18 + 0.82 * reveal);
}
`

// Line-segment soup helpers -------------------------------------------------
function segGeometry(pts) {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3))
  return geo
}

// One sliding panel, local origin at its center. Seam details on the +x edge;
// the right panel reuses this mirrored (scale.x = -1).
function doorPanelPoints(W, H) {
  const pts = []
  const seg = (x1, y1, x2, y2, z = 0) => pts.push(x1, y1, z, x2, y2, z)
  const hw = W / 2, hh = H / 2
  const rect = (x0, y0, x1, y1, z = 0) => {
    seg(x0, y0, x1, y0, z); seg(x1, y0, x1, y1, z)
    seg(x1, y1, x0, y1, z); seg(x0, y1, x0, y0, z)
  }
  rect(-hw, -hh, hw, hh)
  rect(-hw + 0.13, -hh + 0.13, hw - 0.13, hh - 0.13, 0.015)
  // horizontal mullions
  for (const y of [-1.5, -0.5, 0.5, 1.5]) seg(-hw + 0.13, y, hw - 0.13, y, 0.01)
  // X-brace in the middle band
  seg(-hw + 0.13, -0.5, hw - 0.13, 0.5, 0.02)
  seg(-hw + 0.13, 0.5, hw - 0.13, -0.5, 0.02)
  // doubled seam edge + handle ticks on the meeting side
  seg(hw - 0.05, -hh + 0.13, hw - 0.05, hh - 0.13, 0.02)
  for (const y of [-0.18, 0, 0.18]) seg(hw - 0.32, y, hw - 0.12, y, 0.025)
  return pts
}

// Static airlock frame around the doors, with corner brackets (the cockpit motif).
function framePoints(W, H, cy) {
  const pts = []
  const seg = (x1, y1, x2, y2, z = 0) => pts.push(x1, y1 + cy, z, x2, y2 + cy, z)
  const hw = W / 2, hh = H / 2
  const rect = (x0, y0, x1, y1, z) => {
    seg(x0, y0, x1, y0, z); seg(x1, y0, x1, y1, z)
    seg(x1, y1, x0, y1, z); seg(x0, y1, x0, y0, z)
  }
  rect(-hw - 0.12, -hh - 0.05, hw + 0.12, hh + 0.15, -0.06)
  rect(-hw - 0.26, -hh - 0.05, hw + 0.26, hh + 0.3, -0.07)
  // header ticks
  for (let i = -3; i <= 3; i++) seg(i * 0.55, hh + 0.15, i * 0.55, hh + 0.3, -0.065)
  // corner brackets
  const b = 0.42
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x = sx * (hw + 0.44), y = sy * (hh + (sy > 0 ? 0.44 : 0.19))
    seg(x, y, x - sx * b, y, -0.05)
    seg(x, y, x, y - sy * b, -0.05)
  }
  return pts
}

export function WarpTransition({ onComplete }) {
  const hostRef = React.useRef(null)

  React.useEffect(() => {
    const t = setTimeout(() => onComplete && onComplete(), DURATION_MS * timeScale())
    return () => clearTimeout(t)
  }, [onComplete])

  React.useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let renderer, raf
    const disposables = []
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.setClearColor(CREAM, 1)
      Object.assign(renderer.domElement.style, { position: "absolute", inset: "0" })
      host.appendChild(renderer.domElement)

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 120)
      camera.position.set(0, 0.35, 7.2)
      camera.lookAt(0, 0.15, -10)

      const uniforms = {
        uScanA: { value: 0 },
        uScanB: { value: -10 },
        uGlitch: { value: 0 },
        uTime: { value: 0 },
      }
      const uSlide = { value: 0 }

      // terrain — geometry baked into world space so position === world position
      const terrainGeo = new THREE.PlaneGeometry(90, 72, 170, 136)
      terrainGeo.rotateX(-Math.PI / 2)
      terrainGeo.translate(0, -2.2, -26)
      const terrainMat = new THREE.ShaderMaterial({
        uniforms, vertexShader: TERRAIN_VERT, fragmentShader: TERRAIN_FRAG,
      })
      scene.add(new THREE.Mesh(terrainGeo, terrainMat))
      disposables.push(terrainGeo, terrainMat)

      const lineMat = new THREE.ShaderMaterial({
        uniforms, vertexShader: LINE_VERT, fragmentShader: LINE_FRAG,
        transparent: true, depthWrite: false,
      })
      disposables.push(lineMat)

      const DOOR_W = 2.3, DOOR_H = 5, DOOR_CY = 0.3 // bottoms rest on the terrain apron
      const panelGeo = segGeometry(doorPanelPoints(DOOR_W, DOOR_H))
      disposables.push(panelGeo)
      const left = new THREE.LineSegments(panelGeo, lineMat)
      const right = new THREE.LineSegments(panelGeo, lineMat)
      right.scale.x = -1
      left.position.y = right.position.y = DOOR_CY
      scene.add(left, right)

      const frameGeo = segGeometry(framePoints(DOOR_W * 2, DOOR_H, DOOR_CY))
      disposables.push(frameGeo)
      scene.add(new THREE.LineSegments(frameGeo, lineMat))

      // portal quad — fills the doorway just behind the panels
      const portalGeo = new THREE.PlaneGeometry(DOOR_W * 2, DOOR_H)
      const portalMat = new THREE.ShaderMaterial({
        uniforms: { uSlide },
        vertexShader: PORTAL_VERT, fragmentShader: PORTAL_FRAG,
        blending: THREE.NoBlending,
      })
      const portal = new THREE.Mesh(portalGeo, portalMat)
      portal.position.set(0, DOOR_CY, -0.08)
      scene.add(portal)
      disposables.push(portalGeo, portalMat)

      const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
      }
      window.addEventListener("resize", onResize)

      // [time s, amplitude] — timed so a wavefront is crossing visible geometry
      const GLITCHES = [[0.22, 0.9], [1.2, 0.7], [1.85, 0.55]]
      const start = performance.now()
      const tick = () => {
        const t = (performance.now() - start) / 1000 / timeScale()
        uniforms.uTime.value = t

        // pulse A reveals the world; pulse B chases it later
        uniforms.uScanA.value = t < 0.12 ? 0 : 62 * easeOut(clamp01((t - 0.12) / 2.1))
        uniforms.uScanB.value = t < 1.15 ? -10 : 48 * easeOut(clamp01((t - 1.15) / 1.15))

        let g = 0
        for (const [t0, amp] of GLITCHES) if (t > t0) g += amp * Math.exp(-(t - t0) / 0.05)
        uniforms.uGlitch.value = Math.min(1, g)

        const slide = 3.15 * easeInOutCubic(clamp01((t - 0.5) / 1.3))
        left.position.x = -DOOR_W / 2 - slide
        right.position.x = DOOR_W / 2 + slide
        uSlide.value = slide

        camera.position.z = 7.2 + (0.5 - 7.2) * easeInCubic(clamp01((t - 0.55) / 1.9))

        renderer.render(scene, camera)
        if (t < DURATION_MS / 1000 + 0.2) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)

      return () => {
        cancelAnimationFrame(raf)
        window.removeEventListener("resize", onResize)
        disposables.forEach((d) => d.dispose())
        renderer.dispose()
        renderer.domElement.remove()
      }
    } catch {
      // WebGL unavailable — fall back to an opaque cream card so the timeout
      // + text overlay still carry the transition (no hole to reveal through)
      host.style.background = "var(--cream)"
      if (renderer) { try { renderer.dispose(); renderer.domElement.remove() } catch {} }
    }
  }, [])

  return (
    <div data-screen-label="00b Warp" style={{
      position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 50,
      // No background: the canvas carries the cream, and its doorway hole
      // must stay see-through to the cockpit mounted underneath.
      background: 'transparent',
      animation: `warpFinalFade ${DURATION_MS * timeScale()}ms ease-in forwards`,
      pointerEvents: 'none',
    }}>
      {/* three.js airlock scene */}
      <div ref={hostRef} aria-hidden style={{ position: 'absolute', inset: 0 }} />

      {/* Center text */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%,-50%)',
        fontFamily: '"VT323","JetBrains Mono",monospace',
        fontSize: 22, letterSpacing: '.32em', fontWeight: 700,
        color: '#F0EBE1',
        textTransform: 'uppercase', whiteSpace: 'nowrap',
        animation: `warpShrinkText ${DURATION_MS * timeScale()}ms cubic-bezier(.5,.05,.3,1) forwards`,
        textAlign: 'center',
      }}>
        — entering the room —
      </div>

      {/* Scanlines overlay */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'repeating-linear-gradient(to bottom, rgba(30,28,26,0.00) 0 2px, rgba(30,28,26,0.06) 2px 3px)',
        animation: 'termScanRoll 4s linear infinite',
        opacity: 0.7,
      }}/>
    </div>
  );
}
