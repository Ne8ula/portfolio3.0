// @ts-nocheck
// Assembled pour-over station and clear mug: thin protective walls, opaque
// working cores and an open spout that is also the mechanical tilt pivot.
// The existing idle -> pouring -> full -> draining loop stays in cockpit view.
// Purposeful brew drops, trailing drips and full-mug steam retain their lifecycle.
import * as THREE from "three"
import type { RandomSource, RandomStream } from "@/lib/random/seeded-streams"
import { CURSOR_POINTER } from "./cursors"
import { getFrameTimes } from "./frame-times"
import { PALETTE, makeHeroGlass, makeFrost, makeAccentMaterial } from "./materials"
import { registerPointerActivation } from "./pointer-activation"

// ASCII smoke plume — ~90 glyphs along three winding streamlines that
// widen, shrink and fade as they rise. Baked once into a canvas texture.
function makeSmokeTexture(random: RandomStream){
  const W = 160, H = 420;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const glyphs = ['~', '·', ';', '°', '`', ':', "'", '^', '*'];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const N = 90;
  for (let i = 0; i < N; i++){
    const t = i / (N - 1);                                    // 0 bottom → 1 top
    const y = H - 16 - t * (H - 32);
    const lane = i % 3;                                       // 3 interleaved streamlines
    const wind = Math.sin(t * Math.PI * 2.6 + lane * 2.1) * (10 + t * 34);
    const x = W/2 + wind + (random.next() - 0.5) * 14;
    const size = Math.max(10, 26 - t * 12 + (random.next() * 4 - 2));
    ctx.font = `600 ${size}px "JetBrains Mono", monospace`;
    ctx.globalAlpha = Math.max(0.05, (1 - t) * 0.9) * (0.7 + random.next() * 0.3);
    ctx.fillStyle = random.next() < 0.12 ? '#4B6E4F' : '#7A9A7E';
    ctx.fillText(glyphs[(random.next() * glyphs.length) | 0], x, y);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

// Scalloped paper rim — radial sine folds that fade in toward the top edge,
// so only the exposed lip of the filter waves (the body stays smooth).
function scallopTop(geo, lobes = 11, amp = 0.015){
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  let yMin = Infinity, yMax = -Infinity;
  for (let i = 0; i < pos.count; i++){
    const y = pos.getY(i);
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;
  }
  for (let i = 0; i < pos.count; i++){
    v.fromBufferAttribute(pos, i);
    const f = Math.pow((v.y - yMin) / (yMax - yMin), 3);
    if (f <= 0.001) continue;
    const a = Math.atan2(v.z, v.x);
    const r = Math.hypot(v.x, v.z) + Math.sin(a * lobes + 0.7) * amp * f;
    const y = v.y + Math.cos(a * lobes * 2 + 1.3) * amp * 0.7 * f;
    pos.setXYZ(i, Math.cos(a) * r, y, Math.sin(a) * r);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

// Fine speckle noise — bump/roughness map so the cream ceramic and paper
// read subtly textured (per the reference renders) instead of flat plastic.
function makeNoiseTexture(random: RandomStream, repeat = 4){
  const n = document.createElement('canvas');
  n.width = n.height = 256;
  const ctx = n.getContext('2d');
  const img = ctx.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4){
    const v = 200 + ((random.next() * 55) | 0);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(n);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  return tex;
}

type CoffeeBuildOptions = {
  readonly randomSource: RandomSource
}

export function buildCoffee(scene, tableGroup, camera, renderer, options: CoffeeBuildOptions){
  const noiseRandom = options.randomSource.stream('coffee/noise');
  const steamGlyphRandom = options.randomSource.stream('coffee/steam-glyphs');
  const group = new THREE.Group();
  tableGroup.add(group);

  // Thin protective walls surround opaque working parts; dimensions are table units.
  const clear = makeHeroGlass({ thickness: 0.03, roughness: 0.16 });
  const frost = makeFrost({ thickness: 0.03, roughness: 0.32, transmission: 0.82 });
  const creamTex = makeNoiseTexture(noiseRandom, 4);
  const cream = new THREE.MeshStandardMaterial({ color: PALETTE.cream, roughness: 0.55, bumpMap: creamTex, bumpScale: 0.003 });
  const ink = new THREE.MeshStandardMaterial({ color: PALETTE.ink, roughness: 0.65 });
  const coffee = new THREE.MeshLambertMaterial({ color: PALETTE.ink });
  const jade = new THREE.MeshStandardMaterial({ color: PALETTE.jade, roughness: 0.5 });
  const pickMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const add = (name,geo,mat,parent,x=0,y=0,z=0) => {
    const m=new THREE.Mesh(geo,mat);m.name=name;m.position.set(x,y,z);parent.add(m);return m;
  };
  const lathe = pts => new THREE.LatheGeometry(pts.map(([r,y])=>new THREE.Vector2(r,y)),48);
  const ring = (name,r,t,mat,parent,y) => {
    const m=add(name,new THREE.TorusGeometry(r,t,8,48),mat,parent,0,y);m.rotation.x=Math.PI/2;return m;
  };
  const REST=new THREE.Vector3(-8.00,0.18,-1.25);
  const MUG=new THREE.Vector3(-7.60,0.18,0.10);
  const station=new THREE.Group();station.name='coffee-station';station.position.copy(REST);group.add(station);
  // The modeled spout mouth and the tilt pivot are the same physical point.
  const SPOUT=new THREE.Vector3(0.53,0.60,0);
  const tiltG=new THREE.Group();tiltG.name='coffee-spout-pivot';tiltG.position.copy(SPOUT);station.add(tiltG);
  const body=new THREE.Group();body.name='coffee-body';body.position.copy(SPOUT).negate();tiltG.add(body);
  add('receiving-clear-wall',lathe([[0,0],[0.30,0],[0.35,0.035],[0.38,0.12],[0.38,0.60],[0.35,0.64],
    [0.32,0.64],[0.35,0.59],[0.35,0.13],[0.32,0.055],[0,0.055]]),clear,body);
  ring('receiving-base-rim',0.325,0.025,clear,body,0.035);
  ring('receiving-upper-rim',0.335,0.018,clear,body,0.635);
  const spout=add('receiving-open-spout',lathe([[0.055,0],[0.045,0.18],[0.022,0.18],[0.03,0]]),clear,body,0.35,0.60,0);
  spout.rotation.z=-Math.PI/2;
  const handleCurve=new THREE.CatmullRomCurve3([[-0.36,0.20],[-0.61,0.19],[-0.67,0.33],[-0.61,0.51],[-0.36,0.52]].map(([x,y])=>new THREE.Vector3(x,y,0)));
  add('receiving-open-handle',new THREE.TubeGeometry(handleCurve,32,0.03,10,false),clear,body);
  for(const y of [0.20,0.52])add('handle-pad',new THREE.BoxGeometry(0.075,0.07,0.08),cream,body,-0.37,y);
  ring('collar-dark-seam',0.33,0.017,ink,body,0.655);
  add('cream-filter-collar',lathe([[0.13,0],[0.40,0],[0.40,0.055],[0.13,0.055]]),cream,body,0,0.67);
  add('shallow-frost-cone',lathe([[0.12,0],[0.14,0.07],[0.54,0.80],[0.55,0.86],
    [0.52,0.86],[0.51,0.80],[0.11,0.07],[0.09,0]]),frost,body,0,0.72);
  ring('cone-clear-rim',0.535,0.016,clear,body,1.58);
  const paperGeo=new THREE.CylinderGeometry(0.505,0.25,0.44,48,6,true);
  scallopTop(paperGeo,11,0.012);
  const paper=new THREE.MeshStandardMaterial({color:PALETTE.cream,roughness:0.92,side:THREE.DoubleSide});
  add('cream-paper-filter',paperGeo,paper,body,0,1.40);
  add('ink-grounds',new THREE.CylinderGeometry(0.35,0.17,0.34,40),ink,body,0,1.21);
  const POOL_H=0.34;
  const poolGeo=new THREE.CylinderGeometry(0.29,0.27,1,32);poolGeo.translate(0,0.5,0);
  const pool=add('receiving-liquid',poolGeo,coffee,body,0,0.06);
  pool.scale.y=POOL_H;pool.userData.noGlow=true;
  const idleDrop=add('idle-brew-drop',new THREE.SphereGeometry(0.016,8,8),coffee,body);
  idleDrop.visible=false;idleDrop.userData.noGlow=true;
  const stationPick=add('coffee-station-pick',new THREE.CylinderGeometry(0.72,0.72,1.66,12),pickMat,station,0,0.83);
  const mug=new THREE.Group();mug.name='coffee-mug';mug.position.copy(MUG);mug.rotation.y=-0.4;group.add(mug);
  add('mug-clear-wall',lathe([[0,0],[0.29,0],[0.345,0.045],[0.345,0.70],[0.33,0.76],
    [0.30,0.76],[0.315,0.70],[0.315,0.075],[0,0.075]]),clear,mug);
  add('mug-opaque-inner-base',new THREE.CylinderGeometry(0.30,0.29,0.03,40),cream,mug,0,0.075);
  ring('mug-jade-foot',0.32,0.018,makeAccentMaterial(jade),mug,0.028);
  ring('mug-clear-rim',0.315,0.018,clear,mug,0.755);
  const mugHandle=new THREE.CatmullRomCurve3([[0.32,0.20],[0.52,0.20],[0.56,0.35],[0.52,0.57],[0.32,0.57]].map(([x,y])=>new THREE.Vector3(x,y,0)));
  add('mug-open-handle',new THREE.TubeGeometry(mugHandle,32,0.03,10,false),clear,mug);
  for(const y of [0.20,0.57])add('mug-handle-pad',new THREE.BoxGeometry(0.07,0.07,0.08),cream,mug,0.33,y);
  const liquidGeo=new THREE.CylinderGeometry(0.29,0.29,1,32);liquidGeo.translate(0,0.5,0);
  const liquid=add('mug-liquid',liquidGeo,coffee,mug,0,0.09);liquid.scale.y=0.0001;liquid.userData.noGlow=true;
  const crema=add('liquid-surface',new THREE.RingGeometry(0.24,0.288,32),jade,mug);
  crema.rotation.x=-Math.PI/2;crema.visible=false;crema.userData.noGlow=true;
  const LIQUID_MAX=0.48;
  const mugPick=add('coffee-mug-pick',new THREE.CylinderGeometry(0.62,0.62,0.80,12),pickMat,mug,0,0.40);

  // ── Pour stream + trailing drips (desk-local) ─────────────────
  const streamGeo = new THREE.CylinderGeometry(0.028, 0.02, 1, 8);
  streamGeo.translate(0, 0.5, 0);
  const stream = new THREE.Mesh(streamGeo, coffee);
  stream.visible = false;
  stream.userData.noGlow = true;
  group.add(stream);
  const drops = [0, 1, 2].map(i => {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 10), coffee);
    d.visible = false;
    d.userData.delay = i * 0.16;
    d.userData.noGlow = true;
    group.add(d);
    return d;
  });
  let dropClock = Infinity;   // time since the drip phase began

  // ── ASCII smoke sprites (three offset copies of the plume) ────
  const smokeTex = makeSmokeTexture(steamGlyphRandom);
  const smokes = [0, 0.37, 0.71].map(phase => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: smokeTex, transparent: true, opacity: 0, depthWrite: false, color: 0x7A9A7E,
    }));
    s.scale.set(0.6, 1.6, 1);
    s.userData.phase = phase;
    group.add(s);
    return s;
  });
  let smokeVis = 0;

  // ── State machine ─────────────────────────────────────────────
  // idle → (click dripper) pouring → full → (click mug) draining → idle
  let state = 'idle';
  let anim = 0;
  let level = 0;
  let idleT = 0;
  const LIFT_T = 1.0, POUR_T = 1.8, DRIP_T = 0.55, RET_T = 1.0;
  const TILT0 = 0.42, TILT1 = 0.60;   // pour tilt deepens as the pool empties
  const ARC = 0.55;                    // lift arc height
  // The rebuilt spout is 0.60 high; lift leaves the cup base
  // at least 0.29 above the 0.76-high mug before tilt.
  const SPOUT_H = 1.65;
  // OVER places the SPOUT (the tilt pivot) directly over the mug — the body
  // position is derived from it, so the stream never drifts off the mug.
  const OVER = new THREE.Vector3();
  const computeOver = () => {
    const s = station.scale.x;
    OVER.set(MUG.x - SPOUT.x * s, MUG.y + SPOUT_H - SPOUT.y * s, MUG.z);
  };
  computeOver();
  const ease = (p) => p * p * (3 - 2 * p);
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const setTilt = (a) => {
    tiltG.rotation.z = -a;
    pool.rotation.z = a;   // counter-rotate: liquid surface stays level
  };

  // ── Picking (cockpit view only) ───────────────────────────────
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const projectedPickPoint = new THREE.Vector3();
  const projectedPickBox = new THREE.Box3();
  let overCoffee = false;
  const viewMode = () => window.__cockpitViewMode || 'cockpit';
  const pick = (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.intersectObject(stationPick, false).length) return 'dripper';
    if (raycaster.intersectObject(mugPick, false).length) return 'mug';
    return null;
  };
  const onPointerMove = (e) => {
    if (viewMode() !== 'cockpit') return;
    const hit = pick(e);
    const clickable = (hit === 'dripper' && state === 'idle') || (hit === 'mug' && state === 'full');
    if (clickable && !overCoffee){ overCoffee = true; renderer.domElement.style.cursor = CURSOR_POINTER; }
    else if (!clickable && overCoffee){
      overCoffee = false;
      if (!window.__cockpitHoverPC) renderer.domElement.style.cursor = '';
    }
  };
  const unregisterCoffeeActivation = registerPointerActivation(
    renderer.domElement,
    {
      owner: 'coffee',
      hitTest: (point) => {
        if (viewMode() !== 'cockpit') return null;
        const hit = pick(point);
        if (hit === 'dripper' && state === 'idle') return { key: 'coffee-dripper' };
        if (hit === 'mug' && state === 'full') return { key: 'coffee-mug' };
        return hit ? { key: 'coffee-blocked' } : null;
      },
      testPoint: (key) => {
        const object = key === 'coffee-dripper' && state === 'idle'
          ? stationPick
          : key === 'coffee-mug' && state === 'full'
            ? mugPick
            : null;
        if (!object) return null;
        object.updateWorldMatrix(true, false);
        camera.updateMatrixWorld(true);
        const r = renderer.domElement.getBoundingClientRect();
        object.geometry.computeBoundingBox();
        projectedPickBox.copy(object.geometry.boundingBox).applyMatrix4(object.matrixWorld);
        const min = { x: Infinity, y: Infinity };
        const max = { x: -Infinity, y: -Infinity };
        for (const x of [projectedPickBox.min.x, projectedPickBox.max.x]) {
          for (const y of [projectedPickBox.min.y, projectedPickBox.max.y]) {
            for (const z of [projectedPickBox.min.z, projectedPickBox.max.z]) {
              projectedPickPoint.set(x, y, z).project(camera);
              const screenX = r.left + (projectedPickPoint.x + 1) * r.width / 2;
              const screenY = r.top + (1 - projectedPickPoint.y) * r.height / 2;
              min.x = Math.min(min.x, screenX); min.y = Math.min(min.y, screenY);
              max.x = Math.max(max.x, screenX); max.y = Math.max(max.y, screenY);
            }
          }
        }
        const left = Math.max(r.left + 1, min.x);
        const right = Math.min(r.right - 1, max.x);
        const top = Math.max(r.top + 1, min.y);
        const bottom = Math.min(r.bottom - 1, max.y);
        if (left > right || top > bottom) return null;
        const points = [];
        for (const yf of [0.5, 0.25, 0.75]) {
          for (const xf of [0.5, 0.25, 0.75]) {
            points.push({
              x: left + (right - left) * xf,
              y: top + (bottom - top) * yf,
            });
          }
        }
        return points;
      },
      action: (hit) => {
        if (hit.key === 'coffee-dripper') {
          state = 'pouring';
          anim = 0;
          dropClock = Infinity;
        } else if (hit.key === 'coffee-mug') {
          state = 'draining';
        }
      },
    },
  );
  renderer.domElement.addEventListener('pointermove', onPointerMove);

  // ── Per-frame ─────────────────────────────────────────────────
  group.tick = function(dt, t){
    const { dtAmbient, tAmbient } = getFrameTimes();
    const surf = () => MUG.y + (0.09 + level * LIQUID_MAX) * mug.scale.y;   // mug liquid surface

    if (state === 'pouring'){
      anim += dt;
      if (anim < LIFT_T){
        // arc over to the mug; the tilt eases in on the way so the body
        // arrives already cocked for the pour
        const p = ease(anim / LIFT_T);
        station.position.lerpVectors(REST, OVER, p);
        station.position.y += Math.sin(p * Math.PI) * ARC;
        setTilt(TILT0 * ease(clamp01((p - 0.3) / 0.7)));
        stream.visible = false;
      } else if (anim < LIFT_T + POUR_T){
        // spout pinned over the mug; body tips further as the pool drains
        station.position.copy(OVER);
        level = Math.min(1, level + dt / POUR_T);
        setTilt(TILT0 + (TILT1 - TILT0) * ease(level));
        const top = MUG.y + SPOUT_H - 0.04;
        const s = surf();
        stream.position.set(MUG.x + Math.sin(tAmbient * 19) * 0.006, s, MUG.z);
        stream.scale.y = Math.max(0.01, top - s);
        stream.scale.x = stream.scale.z = 1 + Math.sin(tAmbient * 23) * 0.12;
        stream.visible = true;
      } else if (anim < LIFT_T + POUR_T + DRIP_T){
        // stream cuts, body relaxes halfway, trailing drips take over
        if (dropClock === Infinity) dropClock = 0;
        const q = ease((anim - LIFT_T - POUR_T) / DRIP_T);
        setTilt(TILT1 + (TILT0 * 0.5 - TILT1) * q);
        stream.visible = false;
      } else if (anim < LIFT_T + POUR_T + DRIP_T + RET_T){
        const p = ease((anim - LIFT_T - POUR_T - DRIP_T) / RET_T);
        station.position.lerpVectors(OVER, REST, p);
        station.position.y += Math.sin(p * Math.PI) * ARC * 0.7;
        setTilt(TILT0 * 0.5 * (1 - p));
        stream.visible = false;
      } else {
        station.position.copy(REST);
        setTilt(0);
        stream.visible = false;
        state = 'full';
      }
    } else if (state === 'draining'){
      level = Math.max(0, level - dt / 4);
      if (level === 0) state = 'idle';
    }

    // trailing drips — spawned at the pour's end, fall from the spout mark
    if (dropClock !== Infinity && dropClock < 5){
      dropClock += dt;
      const top = MUG.y + SPOUT_H - 0.06;
      drops.forEach(d => {
        const tt = dropClock - d.userData.delay;
        const y = top - 3.6 * tt * tt;
        const live = tt > 0 && y > surf();
        d.visible = live;
        if (live) d.position.set(MUG.x, y, MUG.z);
      });
    }

    // idle brew-drip inside the dripper (cone neck → cup pool, glimpsed
    // through the frosted lower band of the cup)
    idleT += dtAmbient;
    const ft = idleT % 2.6;
    if (state === 'idle' && ft < 0.34){
      const q = ft / 0.34;
      idleDrop.position.set(0, 0.68 - q * q * 0.27, 0);
      idleDrop.visible = true;
    } else idleDrop.visible = false;

    // mug level + pool level (the pool refills as the mug drains)
    liquid.scale.y = Math.max(0.0001, level * LIQUID_MAX);
    crema.position.y = 0.09 + level * LIQUID_MAX + 0.004;   // rides the surface
    crema.visible = level > 0.03;
    pool.scale.y = Math.max(0.03, POOL_H * (1 - 0.75 * level));

    const smokeTarget = (state === 'full' || (state === 'draining' && level > 0.5)) ? 1 : 0;
    // Smoke visibility belongs to the ambient lane, not the mechanical
    // completion-snap set. Capture freezes this ease at its authored state.
    smokeVis += (smokeTarget - smokeVis) * Math.min(1, dtAmbient * 2.5);
    smokes.forEach(s => {
      const p = (tAmbient * 0.12 + s.userData.phase) % 1;
      s.position.set(
        MUG.x + Math.sin((tAmbient + s.userData.phase * 9) * 1.1) * 0.06,
        MUG.y + 0.8 + p * 0.9,
        MUG.z
      );
      s.material.opacity = smokeVis * (1 - p) * 0.85;
      s.visible = s.material.opacity > 0.01;
    });
  };

  // ── Bridge (live dial-in) + cleanup ───────────────────────────
  window.__cockpitCoffee = {
    setDripper({ x, y, z, s } = {}){
      if (typeof x === 'number') REST.x = x;
      if (typeof y === 'number') REST.y = y;
      if (typeof z === 'number') REST.z = z;
      if (typeof s === 'number') station.scale.setScalar(s);
      computeOver();
      if (state !== 'pouring') station.position.copy(REST);
    },
    setMug({ x, y, z, s, ry } = {}){
      if (typeof x === 'number') MUG.x = x;
      if (typeof y === 'number') MUG.y = y;
      if (typeof z === 'number') MUG.z = z;
      if (typeof s === 'number') mug.scale.setScalar(s);
      if (typeof ry === 'number') mug.rotation.y = ry;
      mug.position.copy(MUG);
      computeOver();
    },
  };
  group.dispose = function(){
    renderer.domElement.removeEventListener('pointermove', onPointerMove);
    unregisterCoffeeActivation();
    window.__cockpitCoffee = null;
  };

  // World-space point just above the dripper stack — the HUD name tag
  // anchors here (see __getCockpitAnchors in globe-canvas).
  group.getAnchorWorld = function(out = new THREE.Vector3()){
    return station.localToWorld(out.set(0, 1.70, 0));
  };
  // Edge-glow targets: only the two artifact groups, never the desk-local
  // effects (stream/drops/smoke) parked at group level.
  group.glowTargets = [station, mug];

  return group;
}
