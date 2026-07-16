// @ts-nocheck
// TeaSet — a Chinese tea ritual still-life IN FRONT OF THE CRATE (it
// replaces the old tiny teaSet decoration at coffee-tier "ambient" scale —
// bigger than a hobby prop, quieter than the heroes). Built from the
// 6-angle product reference, in the PC WORKSTATION'S material language:
// matte grained porcelain (satin cream MeshStandard + speckle bump, the
// glass-mac recipe), NOT frosted glass — nothing here transmits.
//   • wenge tea box — a low dark-hardwood chest (canvas-grained, gongfu
//     tea-tray idiom): raised rim frame, recessed slatted drain deck the
//     set sits on, hidden foot for a shadow-gap reveal, jade rim line
//   • large teapot — near-spherical body with a whisper of fired glaze,
//     fitted lid, JADE torus-knot lid knob, jade loop handle, short spout
//   • two HOLLOW porcelain cups — open bowls with a visible rim and a
//     glazed inner cavity over fine-grained matte outer walls
//   • tripod incense censer OFF the tray (desk-center side, per the
//     reference): porcelain donut body on three legs, jade satin bowl,
//     warm-brown incense stick
// Static and non-interactive by design — the one live element is the incense:
// a thin ASCII glyph plume (the coffee mug's smoke language, slimmed down)
// drifts continuously off the stick, and the ember tip breathes. Palette
// stays inside the system: porcelain + obsidian + jade accents on LIT
// materials; the ember is a desaturated warm cream (hot-ash white, never
// red/orange).
import * as THREE from "three"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js"
import { PALETTE } from "./materials"

// Thin ASCII smoke plume — incense-weight: fewer glyphs and a narrower wind
// than the coffee mug's steam, so it reads as a single lazy ribbon.
function makeIncenseTexture(){
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
    const x = W / 2 + wind + (Math.random() - 0.5) * 9;
    const size = Math.max(9, 21 - t * 10 + (Math.random() * 4 - 2));
    ctx.font = `600 ${size}px "JetBrains Mono", monospace`;
    ctx.globalAlpha = Math.max(0.05, (1 - t) * 0.85) * (0.7 + Math.random() * 0.3);
    ctx.fillStyle = Math.random() < 0.12 ? '#4B6E4F' : '#7A9A7E';
    ctx.fillText(glyphs[(Math.random() * glyphs.length) | 0], x, y);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

// Fine speckle noise — bump/roughness map so the porcelain reads subtly
// textured instead of flat plastic (same trick as the coffee cream).
function makeSpeckleTexture(repeat = 4){
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

// Dark wenge wood — near-black brown with long directional grain streaks
// and fine pores (the map doubles as a bump map), so the tea box reads as
// oiled hardwood rather than flat plastic. Streaks run along canvas V,
// which lands along world z on box tops — one consistent grain direction.
function makeWoodTexture(){
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1D1712';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 170; i++){               // long grain streaks
    const x = Math.random() * S;
    const w = 1 + Math.random() * 3;
    const len = S * (0.3 + Math.random() * 0.7);
    const y = Math.random() * S;
    const tone = Math.random() < 0.55 ? '8,6,4' : '62,48,36';
    ctx.fillStyle = `rgba(${tone},${0.07 + Math.random() * 0.15})`;
    ctx.fillRect(x, y - len / 2, w, len);
  }
  for (let i = 0; i < 520; i++){               // fine open pores
    ctx.fillStyle = `rgba(10,8,6,${0.05 + Math.random() * 0.12})`;
    ctx.fillRect(Math.random() * S, Math.random() * S, 1, 2 + Math.random() * 6);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

export function buildTeaSet(scene, tableGroup){
  const group = new THREE.Group();
  group.position.set(-3.45, 0.18, 3.35);  // in front of the crate
  group.rotation.y = 0.35;                // parallel to the crate's yaw
  group.scale.setScalar(0.85);
  tableGroup.add(group);

  // ── Materials — the glass-mac satin family, zero transmission ──
  const speckle     = makeSpeckleTexture(5);
  const speckleFine = makeSpeckleTexture(9);
  // censer: fully matte grained porcelain
  const porcelain = new THREE.MeshStandardMaterial({ color: 0xE9E4D7, roughness: 0.72, metalness: 0.02,
    roughnessMap: speckle, bumpMap: speckle, bumpScale: 0.01 });
  // teapot: same cream, stronger frost grain, plus a whisper of glaze sheen
  const potPorcelain = new THREE.MeshPhysicalMaterial({ color: 0xE9E4D7, roughness: 0.58, metalness: 0.02,
    roughnessMap: speckle, bumpMap: speckle, bumpScale: 0.016, clearcoat: 0.22, clearcoatRoughness: 0.5 });
  // cups: finer grain outside, glazed inside (separate inner shell below)
  const cupMatte = new THREE.MeshStandardMaterial({ color: 0xEFEAE0, roughness: 0.62, metalness: 0.02,
    roughnessMap: speckleFine, bumpMap: speckleFine, bumpScale: 0.009 });
  const cupGlaze = new THREE.MeshPhysicalMaterial({ color: 0xF2EEE4, roughness: 0.32, metalness: 0,
    clearcoat: 0.55, clearcoatRoughness: 0.25, side: THREE.DoubleSide });
  const jade      = new THREE.MeshStandardMaterial({ color: PALETTE.jade, roughness: 0.55, metalness: 0.05 });
  const jadeBowl  = new THREE.MeshPhysicalMaterial({ color: PALETTE.jade, roughness: 0.42, metalness: 0,
    clearcoat: 0.3, clearcoatRoughness: 0.4 });
  const woodTex   = makeWoodTexture();
  const wenge     = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.62, metalness: 0,
    bumpMap: woodTex, bumpScale: 0.01, envMapIntensity: 0.55 });
  const footMat   = new THREE.MeshStandardMaterial({ color: 0x151312, roughness: 0.9 });
  const inkWell   = new THREE.MeshStandardMaterial({ color: 0x1C211B, roughness: 0.7 });
  const stickMat  = new THREE.MeshStandardMaterial({ color: 0x6B4F2E, roughness: 0.9 });
  // light-jade wireframe accents — hover-glow color at rest, on every rim
  const edgeMat   = new THREE.LineBasicMaterial({ color: PALETTE.jadeLt, transparent: true, opacity: 0.35, depthWrite: false });

  const mesh = (parent, geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const addRing = (parent, r, y, x = 0, z = 0) => {   // wireframe rim tie-in
    const pts = [];
    for (let i = 0; i <= 56; i++){
      const a = (i / 56) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    }
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), edgeMat);
    l.position.set(x, y, z);
    parent.add(l);
    return l;
  };
  const lathe = (pts, seg = 48) =>
    new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);

  // ── Tray — wenge TEA BOX: a low wooden chest with a raised rim frame
  // and a recessed SLATTED drain deck (the gongfu tea-tray idiom), floated
  // on a hidden near-black foot so a shadow-gap runs underneath. The set
  // sits on the slats; the rim reads as real box walls, not a plate edge.
  const BOX_W = 2.1, BOX_D = 1.7, RIM_T = 0.055, RIM_H = 0.05;
  mesh(group, new RoundedBoxGeometry(BOX_W - 0.3, 0.05, BOX_D - 0.3, 2, 0.02), footMat, 0, 0.025, 0);
  // chest body — vertical sides, softly eased corners
  mesh(group, new RoundedBoxGeometry(BOX_W, 0.11, BOX_D, 2, 0.022), wenge, 0, 0.095, 0);
  const BOX_TOP = 0.15;
  // dark well floor under the slats (depth shadow in the gaps)
  mesh(group, new THREE.BoxGeometry(BOX_W - 0.18, 0.006, BOX_D - 0.18), inkWell, 0, BOX_TOP + 0.004, 0);
  // rim frame — four wall strips standing proud of the deck
  const rimY = BOX_TOP + RIM_H / 2 - 0.008;   // sunk 8mm into the chest top
  [-1, 1].forEach(s => {
    mesh(group, new RoundedBoxGeometry(BOX_W, RIM_H, RIM_T, 1, 0.012), wenge, 0, rimY, s * (BOX_D / 2 - RIM_T / 2));
    mesh(group, new RoundedBoxGeometry(RIM_T, RIM_H, BOX_D - 2 * RIM_T - 0.004, 1, 0.012), wenge, s * (BOX_W / 2 - RIM_T / 2), rimY, 0);
  });
  const RIM_TOP = rimY + RIM_H / 2;
  // slat deck — parallel boards running along z, recessed below the rim
  const SLATS = 12, fieldW = BOX_W - 2 * RIM_T - 0.03, slatW = 0.14;
  const slatGap = (fieldW - SLATS * slatW) / (SLATS - 1);
  for (let i = 0; i < SLATS; i++){
    const x = -fieldW / 2 + slatW / 2 + i * (slatW + slatGap);
    mesh(group, new RoundedBoxGeometry(slatW, 0.016, BOX_D - 2 * RIM_T - 0.03, 1, 0.006), wenge, x, BOX_TOP + 0.012, 0);
  }
  const TRAY_TOP = BOX_TOP + 0.02;            // slat surface — the set sits here
  // jade perimeter line riding the rim top (the wireframe language)
  {
    const w = BOX_W / 2 - 0.02, d = BOX_D / 2 - 0.02;
    const pts = [
      new THREE.Vector3(-w, 0, -d), new THREE.Vector3(w, 0, -d),
      new THREE.Vector3(w, 0, d), new THREE.Vector3(-w, 0, d),
      new THREE.Vector3(-w, 0, -d),
    ];
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), edgeMat);
    l.position.y = RIM_TOP + 0.002;
    group.add(l);
  }
  // small jade chip inlaid on the front rim — the set's quiet maker's mark
  mesh(group, new THREE.BoxGeometry(0.06, 0.008, 0.03), jade, 0.72, RIM_TOP + 0.002, BOX_D / 2 - RIM_T / 2);

  // ── Teapot — the anchor, LEFT side of the box, spout toward the cups ─
  const pot = new THREE.Group();
  pot.position.set(-0.35, TRAY_TOP + 0.002, 0.08);
  group.add(pot);
  // body — defined shoulder rolling into a short raised neck ring (the
  // lid seat), no longer a plain squashed sphere
  mesh(pot, lathe([
    [0.000, 0.008], [0.190, 0.008], [0.310, 0.050], [0.395, 0.140],
    [0.432, 0.270], [0.428, 0.390], [0.375, 0.500], [0.290, 0.570],
    [0.235, 0.588], [0.228, 0.600], [0.232, 0.614],
  ], 56), potPorcelain);
  // fitted lid — a stepped disc that OVERHANGS the neck (visible under-lip,
  // per the reference) and domes up to a flat platform for the knot
  mesh(pot, lathe([
    [0.180, 0.000], [0.238, 0.006], [0.246, 0.020], [0.238, 0.034],
    [0.198, 0.054], [0.120, 0.072], [0.000, 0.078],
  ], 44), potPorcelain, 0, 0.606, 0);
  addRing(pot, 0.247, 0.628);
  // sculptural knot knob — jade torus knot resting on the lid platform
  const knob = mesh(pot, new THREE.TorusKnotGeometry(0.048, 0.019, 72, 10, 2, 3), jade, 0, 0.722, 0);
  knob.scale.set(1, 0.78, 1);
  knob.rotation.x = Math.PI / 2;
  // spout — an open tapered tube leaning out of the shoulder: frosted cone
  // wall, rolled lip torus at the mouth, dark bore sunk just inside (reads
  // as a real pour opening, not a solid cone)
  const spoutG = new THREE.Group();
  spoutG.position.set(0.315, 0.330, 0);
  spoutG.rotation.z = -0.85;
  pot.add(spoutG);
  mesh(spoutG, lathe([[0.088, 0.000], [0.066, 0.115], [0.048, 0.215], [0.046, 0.255]], 24), potPorcelain);
  const lip = mesh(spoutG, new THREE.TorusGeometry(0.046, 0.0075, 8, 22), potPorcelain, 0, 0.255, 0);
  lip.rotation.x = Math.PI / 2;
  mesh(spoutG, new THREE.CylinderGeometry(0.039, 0.039, 0.012, 16), inkWell, 0, 0.246, 0);
  // handle — thick jade C-loop tube, both ends buried in the body wall
  // (attaches high at the shoulder and low at the belly, like the reference)
  const handlePts = [
    [-0.34, 0.475], [-0.50, 0.465], [-0.585, 0.375], [-0.60, 0.245],
    [-0.535, 0.125], [-0.33, 0.100],
  ].map(([x, y]) => new THREE.Vector3(x, y, 0));
  const handleCurve = new THREE.CatmullRomCurve3(handlePts, false, 'catmullrom', 0.5);
  pot.add(new THREE.Mesh(new THREE.TubeGeometry(handleCurve, 48, 0.044, 12, false), jade));

  // ── Two cups — HOLLOW open bowls, RIGHT side of the box ─────────
  // One lathe: pedestal foot → waist → bell-flared outer wall → ROUNDED RIM
  // with real ~15mm wall thickness → inner wall → raised floor. The visible
  // rim thickness is what makes the wall read solid, not a plane. A separate
  // inset glaze shell lines the cavity (sunk ~5mm — never coplanar).
  const cupGeo = lathe([
    [0.000, 0.000], [0.062, 0.000], [0.071, 0.008], [0.073, 0.030],
    [0.066, 0.044], [0.088, 0.058], [0.130, 0.086], [0.163, 0.122],
    [0.182, 0.152], [0.190, 0.170], [0.189, 0.177], [0.182, 0.180],
    [0.174, 0.176], [0.168, 0.166], [0.146, 0.130], [0.108, 0.094],
    [0.070, 0.080], [0.030, 0.076], [0.000, 0.076],
  ], 44);
  const cupGlazeGeo = lathe([
    [0.000, 0.071], [0.055, 0.073], [0.100, 0.088], [0.138, 0.124], [0.162, 0.158],
  ], 44);
  [[0.48, -0.34], [0.58, 0.26]].forEach(([x, z]) => {
    mesh(group, cupGeo, cupMatte, x, TRAY_TOP + 0.002, z);
    mesh(group, cupGlazeGeo, cupGlaze, x, TRAY_TOP + 0.002, z);
    addRing(group, 0.190, TRAY_TOP + 0.002 + 0.176, x, z);
  });

  // ── Incense censer — tripod, OFF the tray toward desk center ───
  // (+x local, matching the reference's tray-right placement; clears the
  // gachapon/cards spots, which are on their way out anyway)
  const censer = new THREE.Group();
  censer.position.set(1.5, 0, 0.15);
  group.add(censer);
  // three splayed porcelain legs
  for (let i = 0; i < 3; i++){
    const a = (i / 3) * Math.PI * 2 + 0.5;
    const leg = mesh(censer, new THREE.CapsuleGeometry(0.048, 0.16, 4, 10), porcelain,
      Math.cos(a) * 0.145, 0.125, Math.sin(a) * 0.145);
    leg.rotation.z = Math.cos(a) * 0.14;
    leg.rotation.x = -Math.sin(a) * 0.14;
  }
  // puffy donut body (flattened torus — its top opening seats the bowl)
  const bun = mesh(censer, new THREE.TorusGeometry(0.150, 0.105, 12, 30), porcelain, 0, 0.295, 0);
  bun.rotation.x = Math.PI / 2;
  bun.scale.z = 0.62;                       // squash along the torus axis (world y)
  // collar rising out of the donut hole
  mesh(censer, new THREE.CylinderGeometry(0.112, 0.126, 0.055, 24), porcelain, 0, 0.360, 0);
  // jade satin bowl + dark ash well
  mesh(censer, new THREE.CylinderGeometry(0.134, 0.104, 0.110, 24), jadeBowl, 0, 0.435, 0);
  mesh(censer, new THREE.CylinderGeometry(0.096, 0.096, 0.014, 20), inkWell, 0, 0.478, 0);
  addRing(censer, 0.134, 0.492);
  // incense stick — thin, near-vertical, planted in the well
  const stick = mesh(censer, new THREE.CylinderGeometry(0.009, 0.009, 0.95, 8), stickMat, 0.015, 0.93, 0.01);
  stick.rotation.z = 0.035;
  // ember tip — desaturated hot-ash cream (unlit dot, deliberately tiny)
  const emberMat = new THREE.MeshBasicMaterial({ color: 0xE6C9A3, transparent: true, opacity: 0.9 });
  const ember = mesh(censer, new THREE.SphereGeometry(0.015, 8, 8), emberMat, -0.018, 1.405, 0.01);
  ember.userData.noGlow = true;

  // ── ASCII incense plume — three phase-offset sprite copies ─────
  const TIP = new THREE.Vector3();          // stick tip, world (refreshed per frame)
  const smokeTex = makeIncenseTexture();
  const smokes = [0, 0.34, 0.68].map(phase => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: smokeTex, transparent: true, opacity: 0, depthWrite: false, color: 0x7A9A7E,
    }));
    s.scale.set(0.34, 1.35, 1);
    s.userData.phase = phase;
    s.userData.noGlow = true;
    scene.add(s);                           // scene-level: sprites must not inherit the set's yaw
    return s;
  });

  // ── Per-frame — smoke drift + ember breathing (always on) ──────
  group.tick = function(dt, t){
    ember.getWorldPosition(TIP);
    smokes.forEach(s => {
      const p = (t * 0.10 + s.userData.phase) % 1;
      s.position.set(
        TIP.x + Math.sin((t + s.userData.phase * 8) * 0.9) * 0.05,
        TIP.y + 0.62 + p * 1.05,
        TIP.z
      );
      s.material.opacity = Math.min(1, p * 5) * (1 - p) * 0.8;
    });
    emberMat.opacity = 0.72 + Math.sin(t * 6.3) * 0.12 + Math.sin(t * 17.7) * 0.08;
  };

  // ── Live dial-in bridge + cleanup ──────────────────────────────
  window.__cockpitTeaSet = {
    set({ x, y, z, ry, s } = {}){
      if (typeof x === 'number') group.position.x = x;
      if (typeof y === 'number') group.position.y = y;
      if (typeof z === 'number') group.position.z = z;
      if (typeof ry === 'number') group.rotation.y = ry;
      if (typeof s === 'number') group.scale.setScalar(s);
    },
    setCenser({ x, z } = {}){
      if (typeof x === 'number') censer.position.x = x;
      if (typeof z === 'number') censer.position.z = z;
    },
  };
  group.dispose = function(){
    smokes.forEach(s => scene.remove(s));
    window.__cockpitTeaSet = null;
  };

  return group;
}
