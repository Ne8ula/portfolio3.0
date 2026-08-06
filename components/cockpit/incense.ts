// @ts-nocheck
// Incense burner — split out of the tea set into its own artifact, sitting
// OFF the tea tray toward desk center (same world spot the old censer held).
// Rebuilt from the product reference in the FROSTED-GLASS language (the
// coffee station's makeFrost, not the tea set's porcelain):
//   • squat frosted BUN body — a milky pressed-glass cushion: bulging
//     belly, pinched waist, mushroom-cap crown that dishes into a recess
//   • jade glass RING seated in the crown recess, its center hole holds
//     the stick (LIT satin jade + clearcoat — the mug-foot idiom)
//   • low jade-glass BASE plate under the body with notched bracket feet
//     (four wall arcs riding tiny gaps — the notches read as cut feet)
//   • one thin speckled kraft-tan incense stick, dead vertical, capped by
//     a pale ash-grey tip
// Still the quiet live element of the corner: the thin ASCII glyph plume
// drifts off the tip and the ember breathes (hot-ash cream, never red).
import * as THREE from "three"
import type { RandomSource, RandomStream } from "@/lib/random/seeded-streams"
import { getFrameTimes } from "./frame-times"
import { PALETTE, makeFrost } from "./materials"

// Thin ASCII smoke plume — incense-weight: fewer glyphs and a narrower wind
// than the coffee mug's steam, so it reads as a single lazy ribbon.
function makeIncenseTexture(random: RandomStream){
  const W = 110, H = 420;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const glyphs = ['~', '·', ';', '`', ':', "'", '^'];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const N = 60;
  for (let i = 0; i < N; i++){
    const t = i / (N - 1);                                    // 0 bottom → 1 top
    const y = H - 14 - t * (H - 28);
    const lane = i % 2;                                       // 2 interleaved streamlines
    const wind = Math.sin(t * Math.PI * 3.1 + lane * 2.4) * (5 + t * 22);
    const x = W / 2 + wind + (random.next() - 0.5) * 9;
    const size = Math.max(9, 21 - t * 10 + (random.next() * 4 - 2));
    ctx.font = `600 ${size}px "JetBrains Mono", monospace`;
    ctx.globalAlpha = Math.max(0.05, (1 - t) * 0.85) * (0.7 + random.next() * 0.3);
    ctx.fillStyle = random.next() < 0.12 ? '#4B6E4F' : '#7A9A7E';
    ctx.fillText(glyphs[(random.next() * glyphs.length) | 0], x, y);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

// Kraft-paper stick skin — warm tan flecked with darker incense-dust
// speckles so the rod reads as pressed powder, not painted dowel.
function makeStickTexture(random: RandomStream){
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#A8916A';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 900; i++){
    const dark = random.next() < 0.7;
    ctx.fillStyle = dark
      ? `rgba(74,58,38,${0.15 + random.next() * 0.35})`
      : `rgba(214,198,168,${0.12 + random.next() * 0.3})`;
    ctx.fillRect(random.next() * S, random.next() * S, 1, 1 + random.next() * 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 8);
  return tex;
}

type IncenseBuildOptions = {
  readonly randomSource: RandomSource
}

export function buildIncense(scene, tableGroup, options: IncenseBuildOptions){
  const smokeGlyphRandom = options.randomSource.stream('incense/smoke-glyphs');
  const stickSpeckleRandom = options.randomSource.stream('incense/stick-speckle');
  const group = new THREE.Group();
  group.position.set(-4.5, 0.18, 3.25);   // mug↔crate seam, in front of the tea set (their visual overlap is intentional)
  group.rotation.y = 0.35;
  group.scale.setScalar(0.85);
  tableGroup.add(group);

  // ── Materials ────────────────────────────────────────────────────
  // body: milky pressed frost — a small solid reads as the reference's
  // sandblasted glass (the milk-slab gotcha is a feature at this scale)
  const bodyFrost = makeFrost({ color: 0xEDE9DF, transmission: 0.7, roughness: 0.34, thickness: 0.14 });
  // base: jade glass — same frost recipe, tinted; lower transmission so it
  // keeps its green body over the dim desk
  const jadeFrost = makeFrost({ color: 0x63836A, transmission: 0.4, roughness: 0.38, thickness: 0.1 });
  // ring: LIT satin jade with a whisper of glaze (the mug-foot rule —
  // chromatic anchors never transmit)
  const jadeRing  = new THREE.MeshPhysicalMaterial({ color: PALETTE.jade, roughness: 0.38, metalness: 0,
    clearcoat: 0.4, clearcoatRoughness: 0.35 });
  const stickMat  = new THREE.MeshStandardMaterial({ map: makeStickTexture(stickSpeckleRandom), roughness: 0.95, metalness: 0 });
  const ashMat    = new THREE.MeshStandardMaterial({ color: 0xC9C6BE, roughness: 0.9, metalness: 0 });
  const edgeMat   = new THREE.LineBasicMaterial({ color: PALETTE.jadeLt, transparent: true, opacity: 0.3, depthWrite: false });

  const mesh = (geo, mat, y = 0, x = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    group.add(m);
    return m;
  };
  const lathe = (pts, seg = 56) =>
    new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  const addRing = (r, y) => {
    const pts = [];
    for (let i = 0; i <= 56; i++){
      const a = (i / 56) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    }
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), edgeMat);
    l.position.y = y;
    group.add(l);
    return l;
  };

  // ── Base — low jade plate on notched bracket feet ────────────────
  // Four wall arcs lift the plate 12mm; the gaps between them read as the
  // reference's cut-out foot notches.
  for (let i = 0; i < 4; i++){
    const foot = mesh(new THREE.CylinderGeometry(0.242, 0.242, 0.012, 18, 1, false, 0, 1.15), jadeFrost, 0.006);
    foot.rotation.y = (i / 4) * Math.PI * 2 + 0.2;
  }
  // plate — straight wall, rounded top edge easing in under the body
  mesh(lathe([
    [0.150, 0.000], [0.232, 0.002], [0.246, 0.014], [0.247, 0.038],
    [0.238, 0.048], [0.200, 0.052], [0.150, 0.053],
  ]), jadeFrost, 0.012);
  const BASE_TOP = 0.063;

  // ── Body — the frosted bun: belly → waist → overhung crown cap ───
  // One closed lathe; the crown dishes into a recess that seats the ring.
  const BODY_Y = BASE_TOP - 0.005;          // sunk 5mm into the plate — never coplanar
  mesh(lathe([
    [0.150, 0.000], [0.225, 0.020], [0.278, 0.060], [0.295, 0.115],
    [0.282, 0.170], [0.238, 0.215], [0.245, 0.235], [0.272, 0.262],
    [0.268, 0.290], [0.235, 0.315], [0.175, 0.336], [0.120, 0.344],
    [0.100, 0.340], [0.088, 0.326], [0.082, 0.312], [0.040, 0.308],
    [0.000, 0.308],
  ], 64), bodyFrost, BODY_Y);

  // ── Jade ring — flat washer floated 2mm above the recess floor ───
  const RING_Y = BODY_Y + 0.310;
  mesh(lathe([
    [0.033, 0.018], [0.033, 0.004], [0.040, 0.000], [0.090, 0.000],
    [0.098, 0.005], [0.100, 0.012], [0.093, 0.020], [0.044, 0.022],
    [0.037, 0.021],
  ], 48), jadeRing, RING_Y);
  addRing(0.100, RING_Y + 0.024);
  addRing(0.247, BASE_TOP + 0.002);

  // ── Stick — dead vertical through the ring's hole, ash-grey tip ──
  const STICK_R = 0.0105, STICK_LEN = 1.22, STICK_BASE = RING_Y - 0.05;
  mesh(new THREE.CylinderGeometry(STICK_R, STICK_R, STICK_LEN, 10), stickMat, STICK_BASE + STICK_LEN / 2);
  const TIP_Y = STICK_BASE + STICK_LEN;
  mesh(new THREE.CylinderGeometry(STICK_R + 0.0012, STICK_R + 0.0008, 0.05, 10), ashMat, TIP_Y - 0.025);
  // ember point — desaturated hot-ash cream breathing at the very tip
  const emberMat = new THREE.MeshBasicMaterial({ color: 0xE6C9A3, transparent: true, opacity: 0.9 });
  const ember = mesh(new THREE.SphereGeometry(0.013, 8, 8), emberMat, TIP_Y + 0.004);
  ember.userData.noGlow = true;

  // ── ASCII plume — three phase-offset sprite copies off the tip ───
  const TIP = new THREE.Vector3();          // tip, world (refreshed per frame)
  const smokeTex = makeIncenseTexture(smokeGlyphRandom);
  const smokes = [0, 0.34, 0.68].map(phase => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: smokeTex, transparent: true, opacity: 0, depthWrite: false, color: 0x7A9A7E,
    }));
    s.scale.set(0.34, 1.35, 1);
    s.userData.phase = phase;
    s.userData.noGlow = true;
    scene.add(s);                           // scene-level: sprites must not inherit the group's yaw
    return s;
  });

  // ── Per-frame — smoke drift + ember breathing (always on) ────────
  group.tick = function(dt, t){
    const { tAmbient } = getFrameTimes();
    ember.getWorldPosition(TIP);
    smokes.forEach(s => {
      const p = (tAmbient * 0.10 + s.userData.phase) % 1;
      s.position.set(
        TIP.x + Math.sin((tAmbient + s.userData.phase * 8) * 0.9) * 0.05,
        TIP.y + 0.62 + p * 1.05,
        TIP.z
      );
      s.material.opacity = Math.min(1, p * 5) * (1 - p) * 0.8;
    });
    emberMat.opacity =
      0.72 +
      Math.sin(tAmbient * 6.3) * 0.12 +
      Math.sin(tAmbient * 17.7) * 0.08;
  };

  // ── Live dial-in bridge + cleanup ────────────────────────────────
  window.__cockpitIncense = {
    set({ x, y, z, ry, s } = {}){
      if (typeof x === 'number') group.position.x = x;
      if (typeof y === 'number') group.position.y = y;
      if (typeof z === 'number') group.position.z = z;
      if (typeof ry === 'number') group.rotation.y = ry;
      if (typeof s === 'number') group.scale.setScalar(s);
    },
  };
  group.dispose = function(){
    smokes.forEach(s => scene.remove(s));
    window.__cockpitIncense = null;
  };

  return group;
}
