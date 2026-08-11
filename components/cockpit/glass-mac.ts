// @ts-nocheck
// GlassMac — "AX-01" workstation, rebuilt from the multi-angle product
// renders (front / side / three-quarter / top). Three artifacts on one
// footprint:
//   • MONITOR  — frosted translucent acrylic casing ring (hero glass) with
//     rounded corners + corner details, cream inner bezel, ivory "hello."
//     screen, micrographic strips on the left/right bezel rails.
//   • HINGE    — cream clamp blocks + deep-jade ribbed roller, frosted end
//     caps, "AX-01" designation.
//   • KEYBOARD — warm off-white wedge on a smoked-frost skirt, full 60%
//     QWERTY key field (legend atlas) over a graphite tray; muted-sage
//     BACKSPACE + deep-jade ESC.
//   • MOUSE    — modern retro-futuristic dome: off-white shell with painted
//     seams, frosted lower skirt, sage mark. Static prop (cockpit stays
//     dead still).
//
// Contract preserved:
//   • builds INTO `xray` (transform/raycast machinery intact)
//   • sets xray.userData.screenGroup + screenCorners (monitor view + the
//     ScreenDialog / future chatbot overlay)
//   • returns { keyboard (setOffset), applyTheme(theme) }
import * as THREE from "three"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js"
import type { RandomSource } from "@/lib/random/seeded-streams"
import { makeHeroGlass, makeFrost } from "./materials"
import { makeDecal } from "./decals"

type GlassMacBuildOptions = {
  readonly randomSource: RandomSource
}

export const GLASS_MAC_FOCUS_AUTHORING = {
  screen: { width: 1.78, height: 1.34, centerY: 0.10, z: 0.108 },
  verticalBias: 0,
} as const

export const GLASS_MAC_FOCUS_POINTS_LOCAL = [
  {
    x: -GLASS_MAC_FOCUS_AUTHORING.screen.width / 2,
    y: GLASS_MAC_FOCUS_AUTHORING.screen.height / 2,
    z: 0,
  },
  {
    x: GLASS_MAC_FOCUS_AUTHORING.screen.width / 2,
    y: GLASS_MAC_FOCUS_AUTHORING.screen.height / 2,
    z: 0,
  },
  {
    x: -GLASS_MAC_FOCUS_AUTHORING.screen.width / 2,
    y: -GLASS_MAC_FOCUS_AUTHORING.screen.height / 2,
    z: 0,
  },
  {
    x: GLASS_MAC_FOCUS_AUTHORING.screen.width / 2,
    y: -GLASS_MAC_FOCUS_AUTHORING.screen.height / 2,
    z: 0,
  },
] as const

const SCREEN_CORNER_KEYS = ['tl', 'tr', 'bl', 'br'] as const
const finiteFocusVector = (vector) =>
  Number.isFinite(vector.x) &&
  Number.isFinite(vector.y) &&
  Number.isFinite(vector.z)
const hasFrameableScale = (scale) =>
  finiteFocusVector(scale) &&
  scale.x !== 0 &&
  scale.y !== 0 &&
  scale.z !== 0

export function buildGlassMac(xray, options: GlassMacBuildOptions){
  const padSpeckleRandom = options.randomSource.stream('glass-mac/pad-speckle');
  const screenNoiseRandom = options.randomSource.stream('glass-mac/screen-noise');
  const surfaceSpeckleRandom = options.randomSource.stream('glass-mac/surface-speckle');
  const redrawOnFonts = [];   // canvas textures redrawn once webfonts land

  // ── Canvas helpers ────────────────────────────────────────────
  const makeGrainTexture = () => {
    const S = 256;
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#E7E2D5';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 220; i++){
      ctx.fillStyle = `rgba(${screenNoiseRandom.next() < 0.5 ? '255,255,255' : '120,115,100'},${0.015 + screenNoiseRandom.next()*0.04})`;
      ctx.fillRect(0, screenNoiseRandom.next()*S, S, 1);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  };

  // Text decal → plane mesh (transparent canvas, crisp at close range).
  const textPlane = (draw, w, h, texW = 512, texH = 64) => {
    const c = document.createElement('canvas');
    c.width = texW; c.height = texH;
    const ctx = c.getContext('2d');
    const render = () => { ctx.clearRect(0, 0, texW, texH); draw(ctx, texW, texH); };
    render();
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    tex.colorSpace = THREE.SRGBColorSpace;
    redrawOnFonts.push(() => { render(); tex.needsUpdate = true; });
    return new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false })
    );
  };

  // ── Screen wallpaper (light = the reference render, dark = CRT) ──
  const drawScreen = (ctx, theme) => {
    const W = 1024, H = 768;
    const light = theme === 'light';
    ctx.fillStyle = light ? '#ECE7DB' : '#131110';
    ctx.fillRect(0, 0, W, H);
    // paper speckle + soft scanlines
    for (let i = 0; i < 350; i++){
      ctx.fillStyle = light
        ? `rgba(90,85,72,${0.01 + surfaceSpeckleRandom.next()*0.025})`
        : `rgba(240,235,225,${0.008 + surfaceSpeckleRandom.next()*0.015})`;
      ctx.fillRect(surfaceSpeckleRandom.next()*W, surfaceSpeckleRandom.next()*H, 1.5, 1.5);
    }
    ctx.fillStyle = light ? 'rgba(0,0,0,0.028)' : 'rgba(255,255,255,0.02)';
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
    // vignette
    const vg = ctx.createRadialGradient(W/2, H/2, H*0.35, W/2, H/2, H*0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, light ? 'rgba(60,55,45,0.10)' : 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = light ? '#2A2722' : 'rgba(232,228,220,0.88)';
    ctx.font = 'italic 500 128px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('hello.', W/2, H*0.42);
    try { ctx.letterSpacing = '14px'; } catch(e){}
    ctx.fillStyle = light ? '#6F8D75' : '#7A9A7E';
    ctx.font = '500 30px "JetBrains Mono", monospace';
    ctx.fillText('A.X / STUDIO', W/2 + 7, H*0.575);
    try { ctx.letterSpacing = '0px'; } catch(e){}
    ctx.fillStyle = light ? 'rgba(85,81,75,0.7)' : 'rgba(232,228,220,0.4)';
    ctx.font = '500 28px "JetBrains Mono", monospace';
    ctx.fillText('—', W/2, H*0.66);
    ctx.fillStyle = light ? 'rgba(85,81,75,0.5)' : 'rgba(232,228,220,0.3)';
    ctx.font = '500 19px "JetBrains Mono", monospace';
    ctx.fillText('AX/OS · CLICK TO WAKE', W/2, H*0.9);
  };
  const makeScreenTexture = (theme) => {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 768;
    const ctx = c.getContext('2d');
    drawScreen(ctx, theme);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    redrawOnFonts.push(() => { drawScreen(ctx, theme); tex.needsUpdate = true; });
    return tex;
  };

  // ── Micrographic rail baseline (registration line + plus marks + sage
  // tick). The vector sheets themselves come from /public/micrographics
  // via the shared makeDecal helper (handles the SVG webfont swap).
  const railBaseline = () => textPlane((ctx, W, H) => {
    ctx.strokeStyle = 'rgba(110,105,94,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W/2, 40); ctx.lineTo(W/2, H - 40); ctx.stroke();
    const plus = (x, y, s) => {
      ctx.beginPath();
      ctx.moveTo(x - s, y); ctx.lineTo(x + s, y);
      ctx.moveTo(x, y - s); ctx.lineTo(x, y + s);
      ctx.stroke();
    };
    plus(W/2, 26, 9);
    plus(W/2, H - 26, 9);
    ctx.fillStyle = '#78977D';
    ctx.fillRect(W/2 - 7, 64, 14, 14);
  }, 0.3, 1.55, 192, 1024);

  // ── Materials ─────────────────────────────────────────────────
  const glass    = makeHeroGlass({ thickness: 0.5, roughness: 0.3, aberration: 0.012 });   // smoky frosted casing
  const frostCap = makeFrost({ transmission: 0.7, roughness: 0.3, thickness: 0.08 });      // hinge caps / mouse skirt
  const frostSkirtMat = makeFrost({ color: 0x9B958A, transmission: 0.55, roughness: 0.35, thickness: 0.06 });
  const edgeMat  = new THREE.LineBasicMaterial({ color: 0xF0EBE1, transparent: true, opacity: 0.4, depthWrite: false });
  const edgeInk  = new THREE.LineBasicMaterial({ color: 0x55514B, transparent: true, opacity: 0.4 });
  const creamMat = new THREE.MeshStandardMaterial({ color: 0xE7E2D5, map: makeGrainTexture(), roughness: 0.55, metalness: 0.05 });
  const bezelMat = new THREE.MeshStandardMaterial({ color: 0xE2DDD0, roughness: 0.6, metalness: 0.04 });
  const bezelHiMat = new THREE.MeshStandardMaterial({ color: 0xEDE8DB, roughness: 0.55, metalness: 0.04 });
  const shadowMat= new THREE.MeshBasicMaterial({ color: 0x8A857A });
  const keyMat   = new THREE.MeshStandardMaterial({ color: 0xEFEAE0, roughness: 0.5, metalness: 0.03 });
  const keyModMat= new THREE.MeshStandardMaterial({ color: 0xD9D4C8, roughness: 0.55, metalness: 0.03 });
  const sageMat  = new THREE.MeshStandardMaterial({ color: 0x8FAF94, roughness: 0.55, metalness: 0.03 });
  const jade     = new THREE.MeshLambertMaterial({ color: 0x78977D });
  const jadeDeep = new THREE.MeshStandardMaterial({ color: 0x4B6E4F, roughness: 0.55, metalness: 0.05 });
  const graphite = new THREE.MeshStandardMaterial({ color: 0x3A3733, roughness: 0.6, metalness: 0.08 });
  const trimMat  = new THREE.MeshStandardMaterial({ color: 0xC6C1B8, roughness: 0.35, metalness: 0.4 });
  const inkSlot  = new THREE.MeshLambertMaterial({ color: 0x3A3733 });

  const edge = (mesh, mat = edgeInk, thresh = 30) => {
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, thresh), mat);
    e.position.copy(mesh.position);
    e.rotation.copy(mesh.rotation);
    (mesh.parent || xray).add(e);
    return e;
  };

  const roundedRect = (w, h, r, PathClass = THREE.Shape) => {
    const s = new PathClass();
    const x = -w/2, y = -h/2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  };

  // ══ KEYBOARD BASE — warm off-white wedge on a smoked skirt ═══════
  // Footprint: x ±1.525, z −0.35 (hinge shelf) → +1.4 (front lip).
  const BASE_W = 3.05;
  const profile = new THREE.Shape();     // profile.x → world z (rotateY below)
  profile.moveTo(-0.35, 0.02);
  profile.lineTo(-0.35, 0.31);
  profile.quadraticCurveTo(-0.2, 0.335, 0.0, 0.33);
  profile.lineTo( 1.36, 0.135);
  profile.quadraticCurveTo(1.4, 0.128, 1.4, 0.1);
  profile.lineTo( 1.4, 0.02);
  profile.closePath();
  const wedgeGeo = new THREE.ExtrudeGeometry(profile, { depth: BASE_W, bevelEnabled: false, curveSegments: 6 });
  wedgeGeo.translate(0, 0, -BASE_W/2);
  wedgeGeo.rotateY(-Math.PI/2);
  const wedge = new THREE.Mesh(wedgeGeo, creamMat);
  xray.add(wedge);
  edge(wedge, edgeMat, 26);
  // smoked-frost skirt under the wedge (translucent lower band from the renders)
  const skirt = new THREE.Mesh(new RoundedBoxGeometry(BASE_W - 0.06, 0.09, 1.69, 2, 0.03), frostSkirtMat);
  skirt.position.set(0, 0.04, 0.525);
  xray.add(skirt);

  // front-face decals: sage status square (left), A.X (right)
  const baseSage = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.015), jade);
  baseSage.position.set(-1.28, 0.075, 1.398);
  xray.add(baseSage);
  const axLabel = textPlane((ctx, w, h) => {
    ctx.fillStyle = '#7A756B';
    ctx.font = '600 34px "JetBrains Mono", monospace';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText('A . X', w - 12, h/2);
  }, 0.24, 0.06, 256, 64);
  axLabel.position.set(1.22, 0.075, 1.402);
  xray.add(axLabel);
  // left side face: ····· ■ A.X / STUDIO (from the side render)
  const sideLabel = textPlane((ctx, w, h) => {
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#8A857A';
    ctx.font = '600 26px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('·····', 10, h/2);
    ctx.fillStyle = '#78977D';
    ctx.fillRect(88, h/2 - 13, 26, 26);
    ctx.fillStyle = '#7A756B';
    ctx.font = '600 30px "JetBrains Mono", monospace';
    ctx.fillText('A.X / STUDIO', 132, h/2);
  }, 0.85, 0.075, 640, 64);
  sideLabel.rotation.y = -Math.PI/2;
  sideLabel.position.set(-1.527, 0.16, 0.72);
  xray.add(sideLabel);

  // ══ KEY FIELD — 60% QWERTY on the sloped deck, legend atlas ══════
  const TILT = 0.138;                              // deck slope (0.33 → 0.135 over 1.4)
  const keyboard = new THREE.Group();
  const kbBaseX = 0, kbBaseY = 0.245, kbBaseZ = 0.62;
  keyboard.position.set(kbBaseX, kbBaseY, kbBaseZ);
  keyboard.rotation.x = TILT;
  xray.add(keyboard);
  keyboard.setOffset = function({ x = 0, y = 0, z = 0 } = {}){
    keyboard.position.set(kbBaseX + x, kbBaseY + y, kbBaseZ + z);
  };
  // graphite tray — the key field floats over a dark well instead of cream
  const tray = new THREE.Mesh(new RoundedBoxGeometry(2.9, 0.035, 1.04, 1, 0.015), graphite);
  tray.position.y = 0.004;
  keyboard.add(tray);
  edge(tray, edgeMat);

  const KEY_ROWS = [
    [['ESC',1,'jade'],['1',1],['2',1],['3',1],['4',1],['5',1],['6',1],['7',1],['8',1],['9',1],['0',1],['-',1],['+',1],['BACKSPACE',2,'sage']],
    [['TAB',1.5],['Q',1],['W',1],['E',1],['R',1],['T',1],['Y',1],['U',1],['I',1],['O',1],['P',1],['[',1],[']',1],['\\',1.5]],
    [['CAPS',1.75],['A',1],['S',1],['D',1],['F',1],['G',1],['H',1],['J',1],['K',1],['L',1],[';',1],["'",1],['ENTER',2.25,'mod']],
    [['SHIFT',2.25,'mod'],['Z',1],['X',1],['C',1],['V',1],['B',1],['N',1],['M',1],[',',1],['.',1],['/',1],['SHIFT',2.75,'mod']],
    [['CTRL',1.25,'mod'],['WIN',1.25,'mod'],['ALT',1.25,'mod'],['',6.25],['ALT',1,'mod'],['FN',1,'mod'],['←',1,'mod'],['↓',1,'mod'],['→',1,'mod']],
  ];
  // one shared legend atlas — 16×8 grid of 128px cells, one cell per key
  const AT_C = 128, AT_COLS = 16, AT_ROWS = 8;
  const atlasCanvas = document.createElement('canvas');
  atlasCanvas.width = AT_C * AT_COLS; atlasCanvas.height = AT_C * AT_ROWS;
  const atlasCtx = atlasCanvas.getContext('2d');
  const legends = [];                              // {i, label, kind}
  const drawAtlas = () => {
    atlasCtx.clearRect(0, 0, atlasCanvas.width, atlasCanvas.height);
    atlasCtx.textAlign = 'center';
    atlasCtx.textBaseline = 'middle';
    legends.forEach(({ i, label, kind }) => {
      const cx = (i % AT_COLS) * AT_C + AT_C/2;
      const cy = Math.floor(i / AT_COLS) * AT_C + AT_C/2;
      atlasCtx.fillStyle = kind === 'sage' ? '#3E4A40' : kind === 'jade' ? '#D9E2D6' : '#8A8478';
      atlasCtx.font = label.length > 1
        ? `600 ${label.length > 6 ? 20 : 26}px "JetBrains Mono", monospace`
        : '600 46px "JetBrains Mono", monospace';
      atlasCtx.fillText(label, cx, cy);
    });
  };
  const atlasTex = new THREE.CanvasTexture(atlasCanvas);
  atlasTex.anisotropy = 8;
  atlasTex.colorSpace = THREE.SRGBColorSpace;
  redrawOnFonts.push(() => { drawAtlas(); atlasTex.needsUpdate = true; });
  const legendMat = new THREE.MeshBasicMaterial({ map: atlasTex, transparent: true, depthWrite: false, toneMapped: false });

  const U = 2.8/15, GAP = 0.016, KEY_D = 0.165, ROW_P = 0.185, KEY_H = 0.062;
  const keyGeoCache = new Map();
  let atlasIdx = 0;
  KEY_ROWS.forEach((row, r) => {
    let cursor = -7.5;
    const z = (r - 2) * ROW_P;
    row.forEach(([label, wu, kind]) => {
      const cx = (cursor + wu/2) * U;
      cursor += wu;
      const kw = wu * U - GAP;
      if (!keyGeoCache.has(wu)) keyGeoCache.set(wu, new RoundedBoxGeometry(kw, KEY_H, KEY_D, 2, 0.015));
      const mat = kind === 'sage' ? sageMat : kind === 'jade' ? jadeDeep : kind === 'mod' ? keyModMat : keyMat;
      const k = new THREE.Mesh(keyGeoCache.get(wu), mat);
      k.position.set(cx, 0.055, z);
      keyboard.add(k);
      if (label){
        const i = atlasIdx++;
        legends.push({ i, label, kind });
        const lp = new THREE.PlaneGeometry(kw * 0.82, KEY_D * 0.62);
        const u0 = (i % AT_COLS) / AT_COLS, v1 = 1 - Math.floor(i / AT_COLS) / AT_ROWS;
        const du = 1/AT_COLS, dv = 1/AT_ROWS;
        const uv = lp.attributes.uv;
        for (let vi = 0; vi < uv.count; vi++){
          uv.setXY(vi, u0 + uv.getX(vi) * du, v1 - (1 - uv.getY(vi)) * dv);
        }
        const l = new THREE.Mesh(lp, legendMat);
        l.rotation.x = -Math.PI/2;
        l.position.set(cx, 0.055 + KEY_H/2 + 0.002, z);
        keyboard.add(l);
      }
    });
  });
  drawAtlas();
  atlasTex.needsUpdate = true;

  // ══ HINGE — clamp blocks + ribbed roller + frosted caps ══════════
  const HINGE_Y = 0.46, HINGE_Z = -0.05;
  const hingeBlockGeo = new RoundedBoxGeometry(0.36, 0.26, 0.3, 2, 0.04);
  [-0.37, 0.37].forEach(x => {
    const b = new THREE.Mesh(hingeBlockGeo, creamMat);
    b.position.set(x, HINGE_Y, HINGE_Z);
    xray.add(b);
    edge(b, edgeMat);
  });
  // deep-jade roller barrel under the silver ribs — the hinge's accent piece
  const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.62, 20), jadeDeep);
  roller.rotation.z = Math.PI/2;
  roller.position.set(0, HINGE_Y + 0.02, HINGE_Z);
  xray.add(roller);
  for (let i = 0; i < 9; i++){
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.107, 0.006, 6, 24), trimMat);
    rib.rotation.y = Math.PI/2;
    rib.position.set(-0.24 + i * 0.06, HINGE_Y + 0.02, HINGE_Z);
    xray.add(rib);
  }
  [-0.62, 0.62].forEach(x => {
    const cap = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.27, 0.31, 2, 0.05), frostCap);
    cap.position.set(x, HINGE_Y, HINGE_Z);
    xray.add(cap);
  });
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.02), inkSlot);
  slot.position.set(-0.42, HINGE_Y + 0.03, HINGE_Z + 0.146);
  xray.add(slot);
  const hingeSage = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.015), jade);
  hingeSage.position.set(-0.28, HINGE_Y - 0.04, HINGE_Z + 0.148);
  xray.add(hingeSage);
  const hingeLabel = textPlane((ctx, w, h) => {
    ctx.fillStyle = '#7A756B';
    ctx.font = '600 34px "JetBrains Mono", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('AX-01', w/2, h/2);
  }, 0.22, 0.055, 256, 64);
  hingeLabel.position.set(0.37, HINGE_Y - 0.02, HINGE_Z + 0.152);
  xray.add(hingeLabel);

  // ══ MONITOR — frosted casing ring, cream bezel, ivory screen ═════
  const MON_W = 3.0, MON_H = 2.35, RING_D = 0.26;
  const monitor = new THREE.Group();
  monitor.position.set(0, 1.72, -0.05);
  monitor.rotation.x = -0.04;                     // whisper of back-lean
  xray.add(monitor);

  // casing = extruded rounded-rect ring (screen is NOT behind glass — the
  // ScreenDialog matrix3d overlay must land on an undistorted quad)
  const HOLE_W = 2.56, HOLE_H = 1.99;
  const ringShape = roundedRect(MON_W, MON_H, 0.24);
  ringShape.holes.push(roundedRect(HOLE_W, HOLE_H, 0.12, THREE.Path));
  const ringGeo = new THREE.ExtrudeGeometry(ringShape, {
    depth: RING_D, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.045, bevelSegments: 3, curveSegments: 10,
  });
  ringGeo.translate(0, 0, -RING_D/2);
  const ring = new THREE.Mesh(ringGeo, glass);
  monitor.add(ring);
  // frosted back shell with a deep-jade core floating inside — the internal
  // mass reads as a jade slab under glass (artifact-under-glass accent)
  const backShell = new THREE.Mesh(new RoundedBoxGeometry(MON_W - 0.06, MON_H - 0.06, 0.16, 3, 0.07), glass);
  backShell.position.z = -0.32;
  monitor.add(backShell);
  const core = new THREE.Mesh(new RoundedBoxGeometry(2.6, 2.0, 0.1, 2, 0.04), jadeDeep);
  core.position.z = -0.32;
  monitor.add(core);

  // cream bezel plate (fills the ring cutout, recessed from the glass face)
  const bezel = new THREE.Mesh(new RoundedBoxGeometry(2.78, 2.16, 0.16, 2, 0.05), bezelMat);
  bezel.position.z = 0.02;
  monitor.add(bezel);
  edge(bezel, edgeMat);

  // screen: shadow reveal → ivory wallpaper → raised inner frame
  const SCREEN_W = GLASS_MAC_FOCUS_AUTHORING.screen.width;
  const SCREEN_H = GLASS_MAC_FOCUS_AUTHORING.screen.height;
  const SCREEN_CY = GLASS_MAC_FOCUS_AUTHORING.screen.centerY;
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.46), shadowMat);
  shadow.position.set(0, SCREEN_CY, 0.101);
  monitor.add(shadow);
  const frameShape = roundedRect(2.02, 1.58, 0.05);
  frameShape.holes.push(roundedRect(1.9, 1.46, 0.03, THREE.Path));
  const frameGeo = new THREE.ExtrudeGeometry(frameShape, { depth: 0.028, bevelEnabled: false, curveSegments: 6 });
  const frame = new THREE.Mesh(frameGeo, bezelHiMat);
  frame.position.set(0, SCREEN_CY, 0.1);
  monitor.add(frame);

  const screenTexLight = makeScreenTexture('light');
  const screenTexDark  = makeScreenTexture('dark');
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTexDark, toneMapped: false });
  const screenGroup = new THREE.Group();
  screenGroup.position.set(0, SCREEN_CY, GLASS_MAC_FOCUS_AUTHORING.screen.z);
  monitor.add(screenGroup);
  screenGroup.add(new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_W, SCREEN_H), screenMat));
  xray.userData.screenGroup = screenGroup;
  const [screenTl, screenTr, screenBl, screenBr] =
    GLASS_MAC_FOCUS_POINTS_LOCAL.map(
      (point) => new THREE.Vector3(point.x, point.y, point.z),
    );
  xray.userData.screenCorners = {
    tl: screenTl,
    tr: screenTr,
    bl: screenBl,
    br: screenBr,
  };

  // bezel rails: registration baseline + micrographic sheet each side
  // (related but not identical strips, per the reference)
  [-1, 1].forEach(side => {
    const base = railBaseline();
    base.position.set(side * 1.085, SCREEN_CY, 0.102);
    monitor.add(base);
    const sheet = makeDecal(
      side < 0 ? 'Micrographics Vol.1 - Editable 1.svg' : 'Micrographics Vol.1 - Editable 3.svg',
      { width: side < 0 ? 0.24 : 0.17, tint: '#6E695E', opacity: 0.75 }
    );
    sheet.position.set(side * 1.085, SCREEN_CY - 0.18, 0.104);
    monitor.add(sheet);
  });

  const bezelLabel = textPlane((ctx, w, h) => {
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillStyle = '#7A756B';
    ctx.font = '600 30px "JetBrains Mono", monospace';
    ctx.fillText('A.X // ST0210', 10, h/2);
  }, 0.55, 0.06, 512, 56);
  bezelLabel.position.set(-0.6, 0.885, 0.102);
  monitor.add(bezelLabel);
  const bezelStatus = textPlane((ctx, w, h) => {
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#78977D';
    ctx.fillRect(w - 150, h/2 - 13, 26, 26);
    ctx.fillStyle = '#8A8478';
    ctx.font = '600 30px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('·····', w - 108, h/2);
  }, 0.35, 0.06, 320, 56);
  bezelStatus.position.set(0.63, 0.885, 0.102);
  monitor.add(bezelStatus);

  // molded corner details on the glass face — sage rings echo the accents
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.005, 6, 20), jade);
    t.position.set(sx * (MON_W/2 - 0.155), sy * (MON_H/2 - 0.155), 0.187);
    monitor.add(t);
  });

  // ══ MOUSE — dome shell + frosted skirt, to the right ═════════════
  // Pulled slightly toward the desk front so the protein shaker (a desk
  // decoration standing behind it, beside the monitor) reads past it.
  const mouse = new THREE.Group();
  mouse.position.set(2.12, 0, 0.95);
  mouse.rotation.y = -0.12;
  xray.add(mouse);
  // frosted lower skirt (extruded ellipse)
  const skirtShape = new THREE.Shape();
  skirtShape.absellipse(0, 0, 0.245, 0.35, 0, Math.PI * 2);
  const skirtGeo = new THREE.ExtrudeGeometry(skirtShape, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 2, curveSegments: 24 });
  skirtGeo.rotateX(-Math.PI/2);
  const mSkirt = new THREE.Mesh(skirtGeo, frostCap);
  mSkirt.position.y = 0.016;
  mouse.add(mSkirt);
  // top shell — hemisphere dome with painted seams / marks
  const mc = document.createElement('canvas');
  mc.width = 512; mc.height = 256;
  const mctx = mc.getContext('2d');
  const drawMouseSkin = () => {
    mctx.fillStyle = '#EBE6DA';
    mctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 120; i++){
      mctx.fillStyle = `rgba(120,115,100,${0.01 + padSpeckleRandom.next()*0.02})`;
      mctx.fillRect(padSpeckleRandom.next()*512, padSpeckleRandom.next()*256, 1.5, 1.5);
    }
    mctx.strokeStyle = 'rgba(150,144,132,0.9)';
    mctx.lineWidth = 2.5;
    // center split down the front (front meridian ≈ u 0.25 → x 128)
    mctx.beginPath(); mctx.moveTo(128, 26); mctx.lineTo(128, 120); mctx.stroke();
    // transverse button seam across the front half
    mctx.beginPath(); mctx.moveTo(52, 118); mctx.lineTo(204, 118); mctx.stroke();
    // sage mark + A.X toward the back of the dome
    mctx.fillStyle = '#78977D';
    mctx.fillRect(122, 168, 13, 13);
    mctx.fillStyle = '#8A8478';
    mctx.font = '600 15px "JetBrains Mono", monospace';
    mctx.textAlign = 'center';
    mctx.fillText('A . X', 129, 156);
  };
  drawMouseSkin();
  const mTex = new THREE.CanvasTexture(mc);
  mTex.anisotropy = 4;
  mTex.colorSpace = THREE.SRGBColorSpace;
  redrawOnFonts.push(() => { drawMouseSkin(); mTex.needsUpdate = true; });
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1, 36, 18, 0, Math.PI * 2, 0, Math.PI/2),
    new THREE.MeshStandardMaterial({ map: mTex, roughness: 0.45, metalness: 0.03 })
  );
  dome.scale.set(0.235, 0.29, 0.345);
  dome.position.y = 0.03;
  mouse.add(dome);
  // scroll slot at the seam junction
  const wheel = new THREE.Mesh(new RoundedBoxGeometry(0.022, 0.02, 0.06, 1, 0.008), jadeDeep);
  wheel.position.set(0, 0.30, 0.12);
  wheel.rotation.x = 0.35;
  mouse.add(wheel);

  // ── Fonts: redraw every canvas decal once webfonts are loaded ────
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready){
    document.fonts.ready.then(() => redrawOnFonts.forEach(fn => fn())).catch(() => {});
  }

  // ── Theme — ivory reference screen in light, quiet CRT in dark ───
  const applyTheme = (theme) => {
    const light = theme === 'light';
    screenMat.map = light ? screenTexLight : screenTexDark;
    screenMat.needsUpdate = true;
    shadowMat.color.setHex(light ? 0x8A857A : 0x55514B);
    edgeInk.color.setHex(light ? 0x8E8A83 : 0x55514B);
  };

  const hudScreenCorners = {
    tl: new THREE.Vector3(),
    tr: new THREE.Vector3(),
    bl: new THREE.Vector3(),
    br: new THREE.Vector3(),
  };
  const getScreenCornersWorld = () => {
    const sourceGroup = xray.userData.screenGroup || xray;
    const sourceCorners = xray.userData.screenCorners;
    if (!sourceCorners) return null;
    sourceGroup.updateWorldMatrix(true, false);
    for (const key of ['tl', 'tr', 'bl', 'br']){
      hudScreenCorners[key]
        .copy(sourceCorners[key])
        .applyMatrix4(sourceGroup.matrixWorld);
    }
    return hudScreenCorners;
  };

  const focusCenter = new THREE.Vector3();
  const focusQuaternion = new THREE.Quaternion();
  const focusOutward = new THREE.Vector3();
  const focusWorldScale = new THREE.Vector3();
  const focusFramingPoints = GLASS_MAC_FOCUS_POINTS_LOCAL.map(
    () => new THREE.Vector3(),
  );
  const focusTarget = {
    center: focusCenter,
    outward: focusOutward,
    verticalBias: GLASS_MAC_FOCUS_AUTHORING.verticalBias,
    framingPoints: focusFramingPoints,
  };
  const getFocusTarget = () => {
    const sourceGroup = xray.userData.screenGroup || xray;
    const sourceCorners = xray.userData.screenCorners;
    if (!sourceCorners) return null;
    sourceGroup.updateWorldMatrix(true, false);
    focusCenter.set(0, 0, 0);
    for (let index = 0; index < SCREEN_CORNER_KEYS.length; index += 1){
      const source = sourceCorners[SCREEN_CORNER_KEYS[index]];
      if (!source || !finiteFocusVector(source)) return null;
      focusFramingPoints[index]
        .copy(source)
        .applyMatrix4(sourceGroup.matrixWorld);
      if (!finiteFocusVector(focusFramingPoints[index])) return null;
      focusCenter.add(focusFramingPoints[index]);
    }
    focusCenter.multiplyScalar(1 / focusFramingPoints.length);
    xray.getWorldQuaternion(focusQuaternion);
    focusOutward
      .set(0, 0, 1)
      .applyQuaternion(focusQuaternion)
      .normalize();
    xray.getWorldScale(focusWorldScale);
    if (
      !finiteFocusVector(focusCenter) ||
      !finiteFocusVector(focusOutward) ||
      !hasFrameableScale(focusWorldScale) ||
      focusOutward.lengthSq() === 0 ||
      focusFramingPoints.length === 0 ||
      !Number.isFinite(focusTarget.verticalBias)
    ) return null;
    return focusTarget;
  };

  const hudSubjectBounds = Array.from({ length: 8 }, () => new THREE.Vector3());
  const getSubjectBoundsWorld = () => {
    const bbox = new THREE.Box3().setFromObject(xray);
    if (bbox.isEmpty()) return null;
    let index = 0;
    for (let xi = 0; xi < 2; xi++) {
      for (let yi = 0; yi < 2; yi++) {
        for (let zi = 0; zi < 2; zi++) {
          hudSubjectBounds[index++].set(
            xi ? bbox.max.x : bbox.min.x,
            yi ? bbox.max.y : bbox.min.y,
            zi ? bbox.max.z : bbox.min.z,
          );
        }
      }
    }
    return hudSubjectBounds;
  };

  return {
    keyboard,
    applyTheme,
    getFocusTarget,
    getScreenCornersWorld,
    getSubjectBoundsWorld,
  };
}
