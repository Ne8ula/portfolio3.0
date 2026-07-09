// @ts-nocheck
// CoffeeStation — a stacked pour-over dripper and a frosted glass mug on
// the FAR LEFT wing of the desk — pushed past the default cockpit framing
// so the viewer has to look left to use it.
//
// The dripper follows the 6-angle product reference: a frosted-glass
// inverted cone on top holding a scalloped white paper filter and a bed of
// wet grounds (glossy brew bubbles on the surface), seated through a
// rounded frosted collar onto a cylindrical receiving cup. The cup wears a
// matte cream band over a frosted lower band (the brewed pool shows through
// it) and carries a small cream V-spout MOLDED into its rim — the spout
// belongs to the LOWER CUP, not the cone, and it faces the mug (+x). Both
// D-shaped frosted tube handles sit on the OPPOSITE side (−x), so nothing
// on the stack swings toward the mug during the pour. Jade accents: a
// narrow vertical marker on the cone, a small square near the collar.
// Frost encloses opaque content (paper / grounds / pool) the same way the
// crate walls blur the records — transmission, not alpha (see CLAUDE.md).
//
// One interaction loop, entirely in the cockpit view (camera never focuses):
//   idle     — the cone slow-drips into the receiving cup, mug empty.
//   pouring  — click the dripper → the WHOLE STACK arcs over the mug and
//              tilts AROUND THE CUP'S SPOUT (the spout stays fixed over the
//              mug while the stack cocks up), the cup's pool drains as the
//              mug fills, the pour ends with three trailing drips, then it
//              arcs home. SPOUT_H keeps the cup base clear of the mug rim
//              at every frame; tilting only lifts the base further away.
//   full     — an ASCII smoke plume (~90 glyphs) rises off the mug.
//   draining — click the full mug → the coffee sinks back to empty (and the
//              cup's pool refills), the mug never leaves the desk.
import * as THREE from "three"
import { CURSOR_POINTER } from "./cursors"
import { PALETTE, makeHeroGlass, makeFrost } from "./materials"
import { makeTextDecal } from "./decals"

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
function makeNoiseTexture(repeat = 4){
  const n = document.createElement('canvas');
  n.width = n.height = 256;
  const ctx = n.getContext('2d');
  const img = ctx.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4){
    const v = 200 + ((Math.random() * 55) | 0);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(n);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  return tex;
}

export function buildCoffee(scene, tableGroup, camera, renderer){
  const group = new THREE.Group();
  tableGroup.add(group);

  // ── Materials — glass family ──────────────────────────────────
  const glass  = makeHeroGlass({ thickness: 0.3, roughness: 0.15, aberration: 0.015 });
  const edgeMat= new THREE.LineBasicMaterial({ color: PALETTE.line, transparent: true, opacity: 0.32, depthWrite: false });
  const frostG = makeFrost({ color: 0xE7E2D9, transmission: 0.8, roughness: 0.3, thickness: 0.06 });   // cone + cup shells — glassy, never opaque plastic
  const frostC = makeFrost({ color: 0xE7E2D9, transmission: 0.5,  roughness: 0.32, thickness: 0.08 });   // collar — less see-through (frost behind frost shows nothing)
  const frostH = makeFrost({ color: 0xE4DFD6, transmission: 0.5,  roughness: 0.28, thickness: 0.1  });   // tube handles
  const creamTex = makeNoiseTexture(4);
  const cream  = new THREE.MeshStandardMaterial({ color: 0xE9E3D7, roughness: 0.82, metalness: 0,
    roughnessMap: creamTex, bumpMap: creamTex, bumpScale: 0.012 });
  const paperTex = makeNoiseTexture(6);
  const paper  = new THREE.MeshStandardMaterial({ color: 0xEFE8DA, roughness: 0.95, metalness: 0, side: THREE.DoubleSide,
    roughnessMap: paperTex, bumpMap: paperTex, bumpScale: 0.008 });
  const coffee = new THREE.MeshLambertMaterial({ color: 0x2E2016 });   // dark brew
  const grounds= new THREE.MeshStandardMaterial({ color: 0x241811, roughness: 0.6, metalness: 0 });
  const bubble = new THREE.MeshPhysicalMaterial({ color: 0x1C120C, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.1 });
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

  // D-shaped tube handle — authored in the xy plane on −x, then yawed to
  // ~105° azimuth so it reads in silhouette from the cockpit seat (dead-on
  // −x hides behind the body). End points sit just inside the parent's wall
  // so the open tube ends stay hidden. Any azimuth off +x stays clear of
  // the mug during the pour tilt (the tilt rotates about z, so the handle
  // only swings up and away).
  const addHandle = (pts, parent, r = 0.038, yaw = 1.31) => {
    const g = new THREE.Group();
    g.rotation.y = yaw;
    parent.add(g);
    const curve = new THREE.CatmullRomCurve3(
      pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'catmullrom', 0.6);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, r, 10, false), frostH));
    return g;
  };

  // ── Placement: FAR left — outside the default cockpit framing.
  // Compact pairing: dripper just LEFT of the mug, both near the desk front.
  const REST = new THREE.Vector3(-7.8, 0.18, 1.9);    // dripper stack
  const MUG  = new THREE.Vector3(-5.9, 0.18, 2.1);    // mug — right of the dripper, toward the crate

  // ── Dripper — station → tilt pivot (at the CUP'S SPOUT) → body ─
  // The tilt group's origin sits at the receiving cup's spout tip, so
  // mid-pour the spout stays dead still over the mug while the whole
  // stack cocks up around it.
  const station = new THREE.Group();
  station.position.copy(REST);
  station.scale.setScalar(1.45);
  group.add(station);
  const SPOUT = new THREE.Vector3(0.405, 0.49, 0);    // cup spout tip, station-local
  const tiltG = new THREE.Group();
  tiltG.position.copy(SPOUT);
  station.add(tiltG);
  const body = new THREE.Group();
  body.position.copy(SPOUT).negate();
  tiltG.add(body);

  // ── Receiving cup — frosted cylinder, thick rounded base ──────
  const cupProfile = [
    [0.000, 0.000], [0.190, 0.000], [0.265, 0.018], [0.298, 0.055],
    [0.308, 0.130], [0.312, 0.300], [0.312, 0.480], [0.300, 0.505], [0.270, 0.512],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  addGlass(new THREE.LatheGeometry(cupProfile, 48), body, 0, frostG);
  // matte cream band wrapped around the upper half (floated off the shell —
  // never coplanar); the pool stays visible through the frosted band below.
  // The pour spout is MOLDED into the band, not attached: vertices near +x
  // flare outward toward the rim, so the lip grows out of the surface.
  const bandGeo = new THREE.CylinderGeometry(0.320, 0.318, 0.255, 64, 8, true);
  {
    const pos = bandGeo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++){
      v.fromBufferAttribute(pos, i);
      const a = Math.atan2(v.z, v.x);                       // 0 rad = +x (seam is at +z — safe)
      if (Math.abs(a) > 0.5) continue;
      const fa = Math.cos((a / 0.5) * Math.PI / 2);
      const fy = Math.pow((v.y + 0.1275) / 0.255, 2);       // fades in toward the rim
      const r = Math.hypot(v.x, v.z) + 0.05 * fa * fa * fy;
      pos.setXYZ(i, Math.cos(a) * r, v.y, Math.sin(a) * r);
    }
    bandGeo.computeVertexNormals();
  }
  const band = new THREE.Mesh(bandGeo, cream);
  band.position.y = 0.372;
  body.add(band);
  // pinched tongue finishing the molded bulge — a z-squashed cone whose
  // wide base is buried inside the band, tapering to the pour tip (the
  // pour pivot lives at that tip)
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.065, 0.15, 20), cream);
  spout.scale.z = 0.5;
  spout.position.set(0.330, 0.493, 0);
  spout.rotation.z = -1.55;
  body.add(spout);
  // cup handle — D-loop on the −x side (away from the mug)
  addHandle([
    [-0.295, 0.155], [-0.445, 0.150], [-0.505, 0.205],
    [-0.508, 0.360], [-0.455, 0.435], [-0.295, 0.440],
  ], body);
  // brewed pool in the cup — bottom-anchored so it can drain; counter-rotated
  // per-frame so the surface stays level while the stack tilts. It tops out
  // BELOW the cream band, so any counter-rotation poke hides behind the
  // blurred frosted band and never shows through the opaque cream.
  const POOL_H = 0.20;
  const poolGeo = new THREE.CylinderGeometry(0.245, 0.20, 1, 24);
  poolGeo.translate(0, 0.5, 0);
  const pool = new THREE.Mesh(poolGeo, coffee);
  pool.position.y = 0.028;
  pool.scale.y = POOL_H;
  body.add(pool);

  // ── Collar — rounded frosted platform between cup and cone ────
  const collarProfile = [
    [0.245, 0.000], [0.330, 0.008], [0.352, 0.038], [0.350, 0.072],
    [0.325, 0.100], [0.240, 0.122], [0.150, 0.128], [0.130, 0.120],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  addGlass(new THREE.LatheGeometry(collarProfile, 48), body, 0.50, frostC);
  // small jade square marker near the collar (between spout and viewer side)
  const sq = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.032, 0.006), jade);
  {
    const a = 0.6;
    sq.position.set(Math.cos(a) * 0.328, 0.462, Math.sin(a) * 0.328);
    sq.lookAt(sq.position.x * 2, sq.position.y, sq.position.z * 2);
  }
  body.add(sq);

  // ── Cone dripper — frosted inverted cone, neck through the collar ─
  const coneG = new THREE.Group();
  coneG.position.y = 0.555;
  body.add(coneG);
  const coneProfile = [
    [0.095, 0.000], [0.100, 0.030], [0.112, 0.070], [0.150, 0.130],
    [0.425, 0.555], [0.448, 0.585], [0.452, 0.612], [0.436, 0.628],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  addGlass(new THREE.LatheGeometry(coneProfile, 48), coneG, 0, frostG);
  addRing(0.452, 0.612, coneG);   // rim line ties it to the wireframe language
  // scalloped paper filter — opaque, its folded lip rises above the glass rim
  const filterGeo = new THREE.CylinderGeometry(0.42, 0.26, 0.30, 64, 6, true);
  scallopTop(filterGeo);
  const filter = new THREE.Mesh(filterGeo, paper);
  filter.position.y = 0.51;
  coneG.add(filter);
  // wet grounds — one dark truncated cone: its side silhouettes through the
  // frosted glass below the paper band, its top face is the brew bed
  const bed = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.16, 0.34, 48), grounds);
  bed.position.y = 0.335;
  coneG.add(bed);
  // glossy brew bubbles on the bed (the top-view detail)
  [
    [ 0.10,  0.14, 0.034], [-0.13, -0.05, 0.022],
    [ 0.02, -0.15, 0.016], [ 0.15, -0.02, 0.012],
  ].forEach(([x, z, r]) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 10), bubble);
    b.position.set(x, 0.505, z);
    coneG.add(b);
  });
  // narrow vertical jade marker on the cone wall (per the reference)
  const mark = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.105, 0.006), jade);
  {
    const a = 0.6, my = 0.30;
    const r = 0.15 + 0.647 * (my - 0.13) + 0.012;   // wall radius at my, floated out
    mark.position.set(Math.cos(a) * r, my, Math.sin(a) * r);
    mark.lookAt(mark.position.x * 2, my - r * 0.647, mark.position.z * 2);   // lie along the flaring wall
  }
  coneG.add(mark);
  // cone handle — D-loop hugging the slanted wall, −x side
  addHandle([
    [-0.190, 0.205], [-0.420, 0.170], [-0.520, 0.225],
    [-0.545, 0.360], [-0.500, 0.440], [-0.355, 0.462],
  ], coneG);

  // idle brew-drip — a drop falling from the cone's neck into the cup pool
  const idleDrop = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), coffee);
  idleDrop.visible = false;
  body.add(idleDrop);
  // invisible fat pick volume around the whole stack (handles included)
  const stationPick = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 1.35, 8), pickMat);
  stationPick.position.y = 0.62;
  body.add(stationPick);

  // ── Frosted glass mug (origin at its base) ────────────────────
  // Straight cylinder, thick rounded rim, thick base, rounded-rectangular
  // glass handle — double-wall lathe so the rim reads as a translucent ring
  // from above and the coffee shows through the frosted wall as a dark mass
  // with a horizontal fill line.
  const mug = new THREE.Group();
  mug.position.copy(MUG);
  mug.rotation.y = -0.4;   // handle (+x local) cheated toward the viewer
  mug.scale.setScalar(1.25);
  group.add(mug);

  // body — up the outer wall, over the rounded rim, down the inner wall to
  // a raised interior floor (thick underside glass, per the bottom view).
  // SAME glass as the dripper: the shell shares frostG (cone/cup) and the
  // handle shares frostH (tube handles), so the pair reads as one set and
  // any dripper material tune carries over automatically.
  const mugProfile = [
    [0.000, 0.000], [0.200, 0.000], [0.270, 0.012], [0.295, 0.045],
    [0.300, 0.090], [0.300, 0.500], [0.298, 0.545], [0.285, 0.575],
    [0.262, 0.590], [0.240, 0.575], [0.232, 0.545], [0.230, 0.500],
    [0.230, 0.115], [0.210, 0.095], [0.100, 0.085], [0.000, 0.085],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  addGlass(new THREE.LatheGeometry(mugProfile, 48), mug, 0, frostG);

  // handle — rounded-rectangular tube on +x, joints buried in the wall
  const handlePts = [
    [0.255, 0.175], [0.420, 0.160], [0.510, 0.215], [0.535, 0.300],
    [0.510, 0.385], [0.420, 0.440], [0.255, 0.425],
  ].map(([x, y]) => new THREE.Vector3(x, y, 0));
  const handleCurve = new THREE.CatmullRomCurve3(handlePts, false, 'catmullrom', 0.4);
  const handle = new THREE.Mesh(new THREE.TubeGeometry(handleCurve, 48, 0.045, 12, false), frostH);
  mug.add(handle);
  handlePts.forEach((p, i) => {           // cap the open tube ends (inside the wall)
    if (i !== 0 && i !== handlePts.length - 1) return;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), frostH);
    cap.position.copy(p);
    mug.add(cap);
  });

  // the coffee — unit-height cylinder anchored at its bottom, ENCLOSED in
  // the frosted volume (same pattern as the CRT inside the PC head), with a
  // crema ring riding the surface (reads as the fill line through the wall)
  const liquidGeo = new THREE.CylinderGeometry(0.222, 0.222, 1, 32);
  liquidGeo.translate(0, 0.5, 0);
  // near-black brew, darker than the shared `coffee` — the frosted wall
  // lightens whatever it encloses, so this lands at the reference tone
  const liquid = new THREE.Mesh(liquidGeo, new THREE.MeshLambertMaterial({ color: 0x100906 }));
  liquid.position.y = 0.09;
  liquid.scale.y = 0.0001;
  mug.add(liquid);
  const crema = new THREE.Mesh(
    new THREE.RingGeometry(0.176, 0.220, 32),
    new THREE.MeshLambertMaterial({ color: 0x8F6742 })
  );
  crema.rotation.x = -Math.PI / 2;
  crema.visible = false;
  mug.add(crema);
  const LIQUID_MAX = 0.30;   // full pour surface ≈ ⅔ of the mug height

  // muted green accents — vertical marker on the wall, square on the handle
  const marker = makeTextDecal((ctx, W, H) => {
    ctx.fillStyle = '#6F8D75';
    ctx.fillRect(W / 2 - 6, 8, 12, H - 16);
  }, { width: 0.024, pxW: 32, pxH: 160, opacity: 0.9 });
  marker.position.set(0, 0.46, 0.304);
  mug.add(marker);
  const chip = makeTextDecal((ctx, W, H) => {
    ctx.fillStyle = '#6F8D75';
    ctx.fillRect(4, 4, W - 8, H - 8);
  }, { width: 0.035, pxW: 64, pxH: 64, opacity: 0.9 });
  chip.position.set(0.584, 0.235, 0);
  chip.rotation.y = Math.PI / 2;
  mug.add(chip);

  const mugPick = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.40, 0.68, 8), pickMat);
  mugPick.position.y = 0.34;
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
  // idle → (click dripper) pouring → full → (click mug) draining → idle
  let state = 'idle';
  let anim = 0;
  let level = 0;
  let idleT = 0;
  const LIFT_T = 1.0, POUR_T = 1.8, DRIP_T = 0.55, RET_T = 1.0;
  const TILT0 = 0.42, TILT1 = 0.60;   // pour tilt deepens as the pool empties
  const ARC = 0.5;                    // lift arc height
  // SPOUT_H — spout height above MUG.y mid-pour. The pivot sits LOW on the
  // stack (the cup's rim), so this must keep the cup base (0.49·1.45 ≈ 0.71
  // below the pivot) clear of the mug rim (0.59·1.25 ≈ 0.74 above MUG.y):
  // 1.75 − 0.71 = 1.04 → ~0.30 clearance untilted; the tilt only swings the
  // base up and away from the mug, so that is the worst frame.
  const SPOUT_H = 1.75;
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

    // idle brew-drip inside the dripper (cone neck → cup pool, glimpsed
    // through the frosted lower band of the cup)
    idleT += dt;
    const ft = idleT % 2.6;
    if (state === 'idle' && ft < 0.34){
      const q = ft / 0.34;
      idleDrop.position.set(0, 0.50 - q * q * 0.32, 0);
      idleDrop.visible = true;
    } else idleDrop.visible = false;

    // mug level + pool level (the pool refills as the mug drains)
    liquid.scale.y = Math.max(0.0001, level * LIQUID_MAX);
    crema.position.y = 0.09 + level * LIQUID_MAX + 0.004;   // rides the surface
    crema.visible = level > 0.03;
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
    renderer.domElement.removeEventListener('pointerdown', onPointerDown, true);
    window.__cockpitCoffee = null;
  };

  return group;
}
