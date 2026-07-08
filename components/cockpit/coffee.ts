// @ts-nocheck
// CoffeeStation — a Chemex-style one-piece glass brewer and a double-wall
// glass mug on the FAR LEFT wing of the desk — pushed past the default
// cockpit framing so the viewer has to look left to use it.
// Built in the desk's GLASS family: one smooth hourglass hero-glass vessel
// (same enclosure pattern as the PC head — solid glass fully enclosing
// opaque ink coffee), a frosted waist collar with a jade tie, and a matte
// cream filter cone. The filter is OPAQUE on purpose: it sits inside the
// hero-glass funnel, and transmissive materials vanish from each other's
// transmission buffers (see CLAUDE.md gotchas).
//
// One interaction loop, entirely in the cockpit view (camera never focuses):
//   idle     — brewer holds coffee (slow brew-drip inside), mug empty.
//   pouring  — click the brewer → it arcs over the mug and tilts AROUND ITS
//              SPOUT (the spout stays fixed over the mug while the body
//              cocks up), the pool drains as the mug fills, the pour ends
//              with three trailing drips, then it arcs home.
//   full     — an ASCII smoke plume (~90 glyphs) rises off the mug.
//   draining — click the full mug → the coffee sinks back to empty (and the
//              brewer's pool refills), the mug never leaves the desk.
import * as THREE from "three"
import { CURSOR_POINTER } from "./cursors"
import { PALETTE, makeHeroGlass, makeFrost } from "./materials"

// ASCII smoke plume — ~90 glyphs along three winding streamlines that
// widen, shrink and fade as they rise. Baked once into a canvas texture.
function makeSmokeTexture(){
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
    const x = W/2 + wind + (Math.random() - 0.5) * 14;
    const size = Math.max(10, 26 - t * 12 + (Math.random() * 4 - 2));
    ctx.font = `600 ${size}px "JetBrains Mono", monospace`;
    ctx.globalAlpha = Math.max(0.05, (1 - t) * 0.9) * (0.7 + Math.random() * 0.3);
    ctx.fillStyle = Math.random() < 0.12 ? '#4B6E4F' : '#7A9A7E';
    ctx.fillText(glyphs[(Math.random() * glyphs.length) | 0], x, y);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

export function buildCoffee(scene, tableGroup, camera, renderer){
  const group = new THREE.Group();
  tableGroup.add(group);

  // ── Materials — glass family ──────────────────────────────────
  const glass  = makeHeroGlass({ thickness: 0.3, roughness: 0.15, aberration: 0.015 });
  const edgeMat= new THREE.LineBasicMaterial({ color: PALETTE.line, transparent: true, opacity: 0.32, depthWrite: false });
  const frost  = makeFrost({ transmission: 0.7, roughness: 0.3, thickness: 0.05 });
  const paper  = new THREE.MeshStandardMaterial({ color: 0xEFE8DA, roughness: 0.92, metalness: 0, side: THREE.DoubleSide });
  const coffee = new THREE.MeshLambertMaterial({ color: 0x2E2016 });   // dark brew
  const jade   = new THREE.MeshLambertMaterial({ color: PALETTE.jade });
  const pickMat= new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });

  const addGlass = (geo, parent, y = 0, mat = glass) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y;
    parent.add(m);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 24), edgeMat);
    e.position.y = y;
    parent.add(e);
    return m;
  };
  const addRing = (r, y, parent) => {
    const pts = [];
    for (let i = 0; i <= 64; i++){
      const a = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    }
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), edgeMat);
    l.position.y = y;
    parent.add(l);
    return l;
  };

  // ── Placement: FAR left — outside the default cockpit framing.
  // Compact pairing: brewer just LEFT of the mug, both near the desk front.
  const REST = new THREE.Vector3(-7.8, 0.18, 1.9);    // brewer
  const MUG  = new THREE.Vector3(-5.9, 0.18, 2.1);    // mug — right of the brewer, toward the crate

  // ── Brewer — station → tilt pivot (at the spout) → body ──────
  // The tilt group's origin sits at the SPOUT, so mid-pour the spout stays
  // dead still over the mug while the body swings up around it.
  const station = new THREE.Group();
  station.position.copy(REST);
  station.scale.setScalar(1.45);
  group.add(station);
  const SPOUT = new THREE.Vector3(0.49, 1.12, 0);     // spout tip, station-local
  const tiltG = new THREE.Group();
  tiltG.position.copy(SPOUT);
  station.add(tiltG);
  const body = new THREE.Group();
  body.position.copy(SPOUT).negate();
  tiltG.add(body);

  // one-piece hourglass vessel — smooth 48-seg lathe (bulb, waist, funnel)
  const brewerProfile = [
    [0.000, 0.000], [0.260, 0.000], [0.380, 0.050], [0.450, 0.180],
    [0.440, 0.320], [0.360, 0.440], [0.260, 0.530], [0.215, 0.580],
    [0.205, 0.620], [0.235, 0.700], [0.315, 0.820], [0.395, 0.960],
    [0.430, 1.060],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  addGlass(new THREE.LatheGeometry(brewerProfile, 48), body, 0);
  // pulled pour lip on the rim (+x side — the pivot point of the tilt)
  const lip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.095, 0.11, 16, 1, true, -Math.PI/2, Math.PI), glass);
  lip.position.set(0.415, 1.065, 0);
  lip.rotation.z = -0.5;
  body.add(lip);
  const lipEdge = new THREE.LineSegments(new THREE.EdgesGeometry(lip.geometry, 24), edgeMat);
  lipEdge.position.copy(lip.position);
  lipEdge.rotation.copy(lip.rotation);
  body.add(lipEdge);
  // frosted waist collar (clear of the glass on all sides — z-fight gotcha)
  // with a jade tie ring, Chemex-fashion
  const collarProfile = [
    [0.245, 0.0], [0.315, 0.012], [0.340, 0.040], [0.340, 0.075], [0.315, 0.103], [0.245, 0.115],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const collar = new THREE.Mesh(new THREE.LatheGeometry(collarProfile, 32), frost);
  collar.position.y = 0.555;
  body.add(collar);
  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.344, 0.010, 8, 40), jade);
  tie.rotation.x = Math.PI / 2;
  tie.position.y = 0.613;
  body.add(tie);
  // filter cone — smooth matte cream (opaque; see header), brew bed on top
  const filter = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.045, 0.36, 48, 1, true), paper);
  filter.position.y = 0.86;
  body.add(filter);
  addRing(0.34, 1.042, body);   // cream rim line ties it to the wireframe language
  const bed = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 32), coffee);
  bed.position.y = 0.90;
  body.add(bed);
  // brewed pool in the bulb — bottom-anchored so it can drain; counter-rotated
  // per-frame so the surface stays level while the body tilts
  const POOL_H = 0.17;
  const poolGeo = new THREE.CylinderGeometry(0.30, 0.26, 1, 24);
  poolGeo.translate(0, 0.5, 0);
  const pool = new THREE.Mesh(poolGeo, coffee);
  pool.position.y = 0.05;
  pool.scale.y = POOL_H;
  body.add(pool);
  // idle brew-drip — a drop falling from the filter tip into the pool
  const idleDrop = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), coffee);
  idleDrop.visible = false;
  body.add(idleDrop);
  // invisible fat pick volume around the brewer
  const stationPick = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.3, 8), pickMat);
  stationPick.position.y = 0.6;
  body.add(stationPick);

  // ── Double-wall glass mug (origin at its base) ────────────────
  const mug = new THREE.Group();
  mug.position.copy(MUG);
  mug.scale.setScalar(1.25);
  group.add(mug);

  // rounded double-wall cup — smooth lathe profile, taller proper-cup stance
  const mugProfile = [
    [0.0, 0.0], [0.19, 0.0], [0.25, 0.04], [0.28, 0.14],
    [0.30, 0.30], [0.31, 0.46], [0.315, 0.55],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  addGlass(new THREE.LatheGeometry(mugProfile, 32), mug, 0);
  // the coffee — unit-height cylinder anchored at its bottom, ENCLOSED in
  // the solid glass volume (same pattern as the CRT inside the PC head)
  const liquidGeo = new THREE.CylinderGeometry(0.21, 0.16, 1, 14);
  liquidGeo.translate(0, 0.5, 0);
  const liquid = new THREE.Mesh(liquidGeo, coffee);
  liquid.position.y = 0.06;
  liquid.scale.y = 0.0001;
  mug.add(liquid);
  const LIQUID_MAX = 0.36;   // world height of a full pour (inside the mug)
  const mugPick = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.32, 0.62, 8), pickMat);
  mugPick.position.y = 0.31;
  mug.add(mugPick);

  // ── Pour stream + trailing drips (desk-local) ─────────────────
  const streamGeo = new THREE.CylinderGeometry(0.028, 0.02, 1, 8);
  streamGeo.translate(0, 0.5, 0);
  const stream = new THREE.Mesh(streamGeo, coffee);
  stream.visible = false;
  group.add(stream);
  const drops = [0, 1, 2].map(i => {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 10), coffee);
    d.visible = false;
    d.userData.delay = i * 0.16;
    group.add(d);
    return d;
  });
  let dropClock = Infinity;   // time since the drip phase began

  // ── ASCII smoke sprites (three offset copies of the plume) ────
  const smokeTex = makeSmokeTexture();
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
  // idle → (click brewer) pouring → full → (click mug) draining → idle
  let state = 'idle';
  let anim = 0;
  let level = 0;
  let idleT = 0;
  const LIFT_T = 1.0, POUR_T = 1.8, DRIP_T = 0.55, RET_T = 1.0;
  const TILT0 = 0.42, TILT1 = 0.60;   // pour tilt deepens as the pool empties
  const ARC = 0.5;                    // lift arc height
  const SPOUT_H = 1.6;                // spout height above MUG.y mid-pour
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
  const onPointerDown = (e) => {
    if (e.button !== 0 || viewMode() !== 'cockpit') return;
    const hit = pick(e);
    if (hit === 'dripper' && state === 'idle'){ state = 'pouring'; anim = 0; dropClock = Infinity; e.stopPropagation(); }
    else if (hit === 'mug' && state === 'full'){ state = 'draining'; e.stopPropagation(); }
    else if (hit) e.stopPropagation();
  };
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerdown', onPointerDown, true);

  // ── Per-frame ─────────────────────────────────────────────────
  group.tick = function(dt, t){
    const surf = () => MUG.y + (0.06 + level * LIQUID_MAX) * 1.25;   // mug liquid surface

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
        stream.position.set(MUG.x + Math.sin(t * 19) * 0.006, s, MUG.z);
        stream.scale.y = Math.max(0.01, top - s);
        stream.scale.x = stream.scale.z = 1 + Math.sin(t * 23) * 0.12;
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

    // idle brew-drip inside the brewer (filter tip → pool)
    idleT += dt;
    const ft = idleT % 2.6;
    if (state === 'idle' && ft < 0.38){
      const q = ft / 0.38;
      idleDrop.position.set(0, 0.68 - q * q * 0.44, 0);
      idleDrop.visible = true;
    } else idleDrop.visible = false;

    // mug level + pool level (the pool refills as the mug drains)
    liquid.scale.y = Math.max(0.0001, level * LIQUID_MAX);
    pool.scale.y = Math.max(0.03, POOL_H * (1 - 0.75 * level));

    const smokeTarget = (state === 'full' || (state === 'draining' && level > 0.5)) ? 1 : 0;
    smokeVis += (smokeTarget - smokeVis) * Math.min(1, dt * 2.5);
    smokes.forEach(s => {
      const p = (t * 0.12 + s.userData.phase) % 1;
      s.position.set(
        MUG.x + Math.sin((t + s.userData.phase * 9) * 1.1) * 0.06,
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
    setMug({ x, y, z, s } = {}){
      if (typeof x === 'number') MUG.x = x;
      if (typeof y === 'number') MUG.y = y;
      if (typeof z === 'number') MUG.z = z;
      if (typeof s === 'number') mug.scale.setScalar(s);
      mug.position.copy(MUG);
      computeOver();
    },
  };
  group.dispose = function(){
    renderer.domElement.removeEventListener('pointermove', onPointerMove);
    renderer.domElement.removeEventListener('pointerdown', onPointerDown, true);
    window.__cockpitCoffee = null;
  };

  return group;
}
