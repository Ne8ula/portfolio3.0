// @ts-nocheck
// Turntable — "A.X / STUDIO" deck rebuilt from the multi-angle product
// renders: a low warm off-white molded base on small dark feet, a boxy
// low-profile lightly-frosted acrylic dust cover with rounded corners, a
// green-glass platter under a taupe grooved mat with a deep-jade label, a
// delicate silver tonearm with a black cartridge, a recessed pitch slider
// with a sage knob, and tiny sage/graphite micrographics (canvas-drawn control
// clusters + one sheet from /public/micrographics).
//
// The deck also PLAYS records (Figma Weave "Vinyl Player" flow): clicking a
// record in the crate flies its disc onto the platter — dust cover lifts and
// fades, the tonearm swings from its parked post onto the record, a jade
// projector beam rises from the platter and a holographic PROJECT INFO card
// (true in-scene canvas-textured plane) materializes above the deck. The
// crate orchestrates WHICH record plays via window.__cockpitDeck
// { play, eject, busy, index }; this file owns the flight, cover, arm, beam
// and card. Card's VIEW MORE button is raycast-picked (UV → canvas px);
// clicking empty space in deck view returns to the cockpit.
import * as THREE from "three"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js"
import { makeDecal, makeTextDecal } from "./decals"
import { PROJECTS, makeDiscTexture } from "./projects"
import { CURSOR_POINTER } from "./cursors"

const SAGE = '#6F8D75';
const MONO = '"JetBrains Mono", Consolas, monospace';

export function buildTurntable(scene, tableGroup, camera, renderer){
  const group = new THREE.Group();
  group.position.set(0, 0.18, 0.8);
  group.rotation.y = 0;   // faces the viewer dead-on
  group.scale.setScalar(1.4);
  tableGroup.add(group);
  window.__cockpitTurntable = group;
  group.setTransform = function({ x, y, z, ry, s } = {}){
    if (typeof x === 'number') group.position.x = x;
    if (typeof y === 'number') group.position.y = y;
    if (typeof z === 'number') group.position.z = z;
    if (typeof ry === 'number') group.rotation.y = ry;
    if (typeof s === 'number') group.scale.setScalar(s);
  };

  // ── Materials (reference: off-white satin / frosted acrylic / sage) ──
  const baseMat   = new THREE.MeshPhysicalMaterial({ color: 0xD2CCBF, roughness: 0.55, clearcoat: 0.15, clearcoatRoughness: 0.5 });
  const recessMat = new THREE.MeshStandardMaterial({ color: 0xB4AEA1, roughness: 0.7 });
  const feetMat   = new THREE.MeshLambertMaterial({ color: 0x24221F });
  const silver    = new THREE.MeshStandardMaterial({ color: 0xD6D2C9, roughness: 0.25, metalness: 0.85 });
  const darkPart  = new THREE.MeshStandardMaterial({ color: 0x2E2B26, roughness: 0.45, metalness: 0.2 });
  // Green platter glass reads as tinted glass but stays OPAQUE — a
  // transmissive platter would vanish when seen through the transmissive
  // dust cover (transmissive materials hide from each other's buffers).
  const greenGlass = new THREE.MeshPhysicalMaterial({ color: 0x94AE90, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.12 });
  // Jade dash accents — LIT material; an unlit basic reads as a glowing
  // light-bar over the dim scene instead of printed jade ink.
  const sageSolid  = new THREE.MeshStandardMaterial({ color: 0x4B6E4F, roughness: 0.6 });
  const sageKnob   = new THREE.MeshStandardMaterial({ color: 0x6F8D75, roughness: 0.5 });

  // ── Base ──────────────────────────────────────────────────────
  const BASE_W = 1.9, BASE_D = 1.45, BASE_H = 0.22;
  const base = new THREE.Mesh(new RoundedBoxGeometry(BASE_W, BASE_H, BASE_D, 3, 0.045), baseMat);
  base.position.y = 0.03 + BASE_H / 2;
  group.add(base);
  const topY = 0.03 + BASE_H;   // deck surface

  // Feet — small dark pads; the base floats on them (soft shadow gap).
  [-1, 1].forEach(sx => [-1, 1].forEach(sz => {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.032, 18), feetMat);
    foot.position.set(sx * (BASE_W/2 - 0.16), 0.016, sz * (BASE_D/2 - 0.14));
    group.add(foot);
  }));

  // ── Platter stack (green glass disc → taupe mat → sage label) ─
  // Centered slightly left, like the top view. Everything in the spin
  // group rotates; the spindle stays put. Each layer floats a few mm
  // above the one below — coplanar caps flash while spinning.
  const PLATTER_X = -0.28;
  const spin = new THREE.Group();
  spin.position.set(PLATTER_X, topY, 0);
  group.add(spin);

  const glassDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.53, 0.53, 0.028, 56), greenGlass);
  glassDisc.position.y = 0.018;
  spin.add(glassDisc);

  // Taupe mat with faint concentric grooves on the top cap.
  const matTopC = document.createElement('canvas');
  matTopC.width = matTopC.height = 512;
  {
    const ctx = matTopC.getContext('2d');
    ctx.fillStyle = '#8F8A80';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = 'rgba(0,0,0,0.07)';
    ctx.lineWidth = 1;
    for (let r = 96; r < 250; r += 5){
      ctx.beginPath(); ctx.arc(256, 256, r, 0, Math.PI * 2); ctx.stroke();
    }
  }
  const matTopTex = new THREE.CanvasTexture(matTopC);
  matTopTex.anisotropy = 8;
  const matSide = new THREE.MeshStandardMaterial({ color: 0x8F8A80, roughness: 0.9 });
  const mat = new THREE.Mesh(
    new THREE.CylinderGeometry(0.47, 0.47, 0.022, 56),
    [matSide, new THREE.MeshStandardMaterial({ map: matTopTex, roughness: 0.9 }), matSide]
  );
  mat.position.y = 0.045;
  spin.add(mat);

  // deep-jade record label — the platter's chromatic focal point
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.01, 40),
    new THREE.MeshStandardMaterial({ color: 0x4B6E4F, roughness: 0.8 }));
  label.position.y = 0.062;
  spin.add(label);

  const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.075, 12), silver);
  spindle.position.set(PLATTER_X, topY + 0.04, 0);
  group.add(spindle);

  // ── Tonearm — thin silver tube from a back-right pivot, black
  // cartridge head resting over the platter edge (top-view pose). ──
  const armPivot = new THREE.Group();
  armPivot.position.set(0.63, topY, -0.36);
  group.add(armPivot);
  const armBase = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.09, 24), darkPart);
  armBase.position.y = 0.045;
  armPivot.add(armBase);
  const armCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 16), silver);
  armCollar.position.y = 0.115;
  armPivot.add(armCollar);

  const armAssembly = new THREE.Group();
  armAssembly.position.y = 0.13;
  // Two poses: PARKED (rest — cartridge off the platter, along the deck's
  // right/front) and PLAY (swung in over the record). armT eases between
  // them when a record lands/leaves; the arm lifts slightly mid-swing.
  const ARM_PARK = { y: -1.35, z:  0.03 };
  const ARM_PLAY = { y: -0.80, z: -0.06 };
  armAssembly.rotation.y = ARM_PARK.y;
  armAssembly.rotation.z = ARM_PARK.z;
  armPivot.add(armAssembly);
  const armTube = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.88, 12), silver);
  armTube.rotation.z = Math.PI / 2;
  armTube.position.x = -0.44;
  armAssembly.add(armTube);
  const cartridge = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.035, 0.045), darkPart);
  cartridge.position.set(-0.86, -0.022, 0);
  armAssembly.add(cartridge);
  const stylus = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.014, 0.02), silver);
  stylus.position.set(-0.885, -0.048, 0);
  armAssembly.add(stylus);
  const counterStub = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.07, 14), silver);
  counterStub.rotation.z = Math.PI / 2;
  counterStub.position.x = 0.09;
  armAssembly.add(counterStub);

  // ── Controls ──────────────────────────────────────────────────
  // Pitch slider, right side: recessed track + sage knob.
  const track = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.44), recessMat);
  track.position.set(0.82, topY + 0.002, 0.05);
  group.add(track);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.4), darkPart);
  slot.position.set(0.82, topY + 0.006, 0.05);
  group.add(slot);
  const knob = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.022, 0.055, 2, 0.008), sageKnob);
  knob.position.set(0.82, topY + 0.016, 0.14);
  group.add(knob);

  // Power button, front-left: recessed dimple.
  const powerRing = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.008, 24), recessMat);
  powerRing.position.set(-0.75, topY + 0.002, 0.52);
  group.add(powerRing);
  const powerBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.01, 24), sageSolid);
  powerBtn.position.set(-0.75, topY + 0.007, 0.52);
  group.add(powerBtn);

  // ── Micrographics ─────────────────────────────────────────────
  // Canvas-drawn clusters for the reference-specific marks; one sticker
  // sheet from the pack on the rear. All floated 3mm off their faces.
  const text = (lines, { size = 26, align = 'left', color = SAGE } = {}) => (ctx, W, H) => {
    ctx.fillStyle = color;
    ctx.font = `500 ${size}px ${MONO}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    const x = align === 'right' ? W - 8 : (align === 'center' ? W/2 : 8);
    lines.forEach((ln, i) => ctx.fillText(ln, x, 10 + i * (size * 1.45)));
  };
  const put = (mesh, x, y, z, { rx = 0, ry = 0 } = {}) => {
    mesh.position.set(x, y, z);
    mesh.rotation.x = rx; mesh.rotation.y = ry;
    group.add(mesh);
    return mesh;
  };
  const FLAT = { rx: -Math.PI / 2 };   // decals lying on the deck surface
  const frontZ = BASE_D/2 + 0.003, backZ = -(BASE_D/2 + 0.003), faceY = 0.03 + BASE_H/2;

  // Deck top, beside the power button: speed dots.
  put(makeTextDecal(text(['• 33', '• 45'], { size: 30 }), { width: 0.12, pxW: 128, pxH: 128 }),
      -0.62, topY + 0.004, 0.52, FLAT);
  // Deck top, right rear corner: catalog block (right-aligned, like the top view).
  put(makeTextDecal(text(['A.X / STUDIO', 'A:X / STUDIO', '33⅓ RPM'], { size: 24, align: 'right' }), { width: 0.42, pxW: 512, pxH: 140 }),
      0.62, topY + 0.004, 0.42, FLAT);
  // Deck top, slider scale: +/− ticks along the track.
  put(makeTextDecal((ctx) => {
    ctx.fillStyle = SAGE;
    ctx.font = `500 30px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText('+', 32, 36);
    for (let i = 0; i < 7; i++) ctx.fillRect(32 - (i === 3 ? 14 : 9), 58 + i * 22, i === 3 ? 28 : 18, 3);
    ctx.fillText('−', 32, 248);
  }, { width: 0.055, pxW: 64, pxH: 256 }), 0.75, topY + 0.004, 0.05, FLAT);
  // Deck top, near the tonearm base: dotted calibration circle.
  put(makeTextDecal((ctx) => {
    ctx.strokeStyle = SAGE; ctx.fillStyle = SAGE; ctx.lineWidth = 3;
    for (let i = 0; i < 12; i++){
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(64 + Math.cos(a)*44, 64 + Math.sin(a)*44, 4, 0, Math.PI*2); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(64, 64, 6, 0, Math.PI*2); ctx.stroke();
  }, { width: 0.09, pxW: 128, pxH: 128, opacity: 0.8 }), 0.63, topY + 0.004, -0.12, FLAT);

  // Front face, left: framed icon + catalog text (front view).
  put(makeTextDecal((ctx, W, H) => {
    ctx.strokeStyle = SAGE; ctx.fillStyle = SAGE; ctx.lineWidth = 3;
    ctx.strokeRect(8, 24, 88, 88);
    ctx.beginPath(); ctx.arc(52, 68, 26, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(52, 68, 10, 0, Math.PI*2); ctx.stroke();
    ctx.font = `500 26px ${MONO}`;
    ctx.textBaseline = 'top';
    ['A.X / STUDIO', '33⅓ RPM', 'A4/05 0015'].forEach((ln, i) => ctx.fillText(ln, 122, 22 + i * 38));
  }, { width: 0.48, pxW: 512, pxH: 136 }), -0.42, faceY + 0.01, frontZ);
  // Front face, right: speed selector diagram.
  put(makeTextDecal((ctx) => {
    ctx.strokeStyle = SAGE; ctx.fillStyle = SAGE; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(8, 64); ctx.lineTo(150, 64); ctx.stroke();
    ctx.beginPath(); ctx.arc(172, 64, 22, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(172, 64, 7, 0, Math.PI*2); ctx.fill();
    ctx.font = `500 24px ${MONO}`;
    ctx.textBaseline = 'middle';
    ctx.fillText('→ 33⅓', 210, 46);
    ctx.fillText('→ 45', 210, 84);
  }, { width: 0.34, pxW: 320, pxH: 128 }), 0.62, faceY, frontZ);
  // Front face, far left: sage registration dash.
  put(new THREE.Mesh(new THREE.PlaneGeometry(0.014, 0.07), sageSolid), -0.82, faceY - 0.02, frontZ);

  // Back face: catalog text + boxed serial + triangle glyph (rear view).
  put(makeTextDecal((ctx, W, H) => {
    ctx.strokeStyle = SAGE; ctx.fillStyle = SAGE; ctx.lineWidth = 3;
    ctx.font = `500 26px ${MONO}`;
    ctx.textBaseline = 'top';
    // triangle glyph
    ctx.beginPath(); ctx.moveTo(10, 96); ctx.lineTo(58, 96); ctx.lineTo(58, 48); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(22, 96); ctx.lineTo(58, 60); ctx.stroke();
    ctx.fillText('A.X / STUDIO', 92, 34);
    ctx.fillText('33⅓ RPM', 92, 74);
    ctx.strokeRect(348, 20, 120, 100);
    ctx.fillText('A4/05', 362, 30);
    ctx.fillText('◈ 5', 362, 62);
    ctx.fillText('0015', 362, 92);
  }, { width: 0.62, pxW: 512, pxH: 140 }), 0.30, faceY + 0.01, backZ, { ry: Math.PI });
  // Back face, left: tiny maintenance sticker from the pack + sage dash.
  put(makeDecal('Micrographics Vol.1 - Editable 64.svg', { width: 0.2, tint: '#77746E', opacity: 0.8 }),
      -0.55, faceY, backZ, { ry: Math.PI });
  put(new THREE.Mesh(new THREE.PlaneGeometry(0.014, 0.07), sageSolid), -0.82, faceY - 0.02, backZ, { ry: Math.PI });

  // ── Dust cover — thin-walled frosted acrylic SHELL, inset on the
  // base. The front-view reference is mostly clear: milky only at
  // grazing angles, bright rounded edges. A solid transmissive block
  // reads as a milk cube (two thick refracting surfaces compound), so
  // the cover is five thin panels instead — like the crate walls. ──
  // Dialed in live against the front-view render: low ior/env/clearcoat
  // keep grazing-angle fresnel from washing the lid out under the
  // cockpit's high camera — the deck stays readable through the acrylic.
  const coverMat = new THREE.MeshPhysicalMaterial({
    color: 0xFFFFFF, transmission: 1, roughness: 0.06, thickness: 0.015,
    ior: 1.25, metalness: 0, envMapIntensity: 0.22,
    clearcoat: 0.15, clearcoatRoughness: 0.15, specularIntensity: 0.35,
    transparent: true, opacity: 1,   // fades out as the cover lifts for playback
  });
  // COVER_H sits low — just clearing the tonearm collar (~0.39 above deck
  // origin) instead of the old tall 0.52 box.
  const COVER_W = BASE_W - 0.06, COVER_D = BASE_D - 0.06, COVER_H = 0.36, CT = 0.015;
  const coverY0 = topY + 0.004;              // floats a hair above the deck — coplanar = flicker
  const wallH = COVER_H - CT + 0.004;        // walls sink slightly into the lid (no coplanar seam)
  // All five panels ride one group so the lift/fade animates as a unit.
  const coverGroup = new THREE.Group();
  group.add(coverGroup);
  const coverPanel = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.006), coverMat);
    m.position.set(x, y, z);
    coverGroup.add(m);
    return m;
  };
  coverPanel(COVER_W, wallH, CT, 0, coverY0 + wallH/2,   COVER_D/2 - CT/2);    // front
  coverPanel(COVER_W, wallH, CT, 0, coverY0 + wallH/2, -(COVER_D/2 - CT/2));   // back
  [-1, 1].forEach(s =>                                                          // sides
    coverPanel(CT, wallH, COVER_D - CT*2 - 0.002, s * (COVER_W/2 - CT/2), coverY0 + wallH/2, 0));
  coverPanel(COVER_W, CT, COVER_D, 0, coverY0 + COVER_H - CT/2, 0);            // lid

  // ══════════════════════════════════════════════════════════════
  // DECK — playback machinery (record flight, cover, arm, beam, card)
  // ══════════════════════════════════════════════════════════════
  const REDUCE = typeof window !== 'undefined' && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const vm = () => window.__cockpitViewMode || 'cockpit';
  const WS = () => group.getWorldScale(new THREE.Vector3()).x || 1;
  const easeInOut = (x) => x < .5 ? 2*x*x : 1 - Math.pow(-2*x + 2, 2) / 2;

  // Hologram palette — saturated light jade lines over translucent ink in
  // dark theme (additive beam); deep-jade ink over milk in light theme
  // (additive clamps white over cream — normal blend there).
  const deckTheme = () => (window.__cockpitTheme === 'light')
    ? { line: '#3A5A3E', soft: 'rgba(58,90,62,0.6)',    faint: 'rgba(58,90,62,0.3)',
        bg: 'rgba(240,235,225,0.36)', btnFill: 'rgba(58,90,62,0.14)',
        beam: 0x3A5A3E, blend: THREE.NormalBlending, beamOpacity: 0.26 }
    : { line: '#8FE3A8', soft: 'rgba(143,227,168,0.62)', faint: 'rgba(143,227,168,0.3)',
        bg: 'rgba(10,16,12,0.46)', btnFill: 'rgba(143,227,168,0.16)',
        beam: 0x7FE6A4, blend: THREE.AdditiveBlending, beamOpacity: 0.5 };
  let COL = deckTheme();

  // ── The record on the platter ─────────────────────────────────
  // Lives at scene root during flight (world-space bezier), then attaches
  // into the spin group so the platter rotation carries it.
  const DISC_REST_Y = 0.078;   // spin-local — floats 2mm over the jade label
  const discMat = new THREE.MeshPhysicalMaterial({ roughness: 0.55, clearcoat: 1, clearcoatRoughness: 0.18 });
  const deckDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.018, 48), discMat);
  deckDisc.visible = false;
  deckDisc.userData.noGlow = true;
  scene.add(deckDisc);
  const discTexCache = new Map();
  const discTex = (i) => {
    if (!discTexCache.has(i)) discTexCache.set(i, makeDiscTexture(i));
    return discTexCache.get(i);
  };

  // ── Holographic PROJECT INFO card + projector beam ────────────
  const holo = new THREE.Group();
  holo.position.set(PLATTER_X, 0, 0);
  holo.userData.noGlow = true;    // never edge-glow-traced
  group.add(holo);

  const CARD_PX_W = 640, CARD_PX_H = 800;
  const CARD_W = 0.94, CARD_H = 1.175;
  const BEAM_BOT = topY + 0.09, CARD_BOT = 0.95;
  const CARD_Y = CARD_BOT + CARD_H / 2;
  const BEAM_H = CARD_BOT - BEAM_BOT;
  const BTN = { x: 56, y: 696, w: 528, h: 64 };   // canvas-px VIEW MORE hit rect

  const cardCanvas = document.createElement('canvas');
  cardCanvas.width = CARD_PX_W; cardCanvas.height = CARD_PX_H;
  const cctx = cardCanvas.getContext('2d');
  const rr = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  function drawCard(index, hover){
    const p = PROJECTS[index];
    const W = CARD_PX_W, H = CARD_PX_H;
    cctx.clearRect(0, 0, W, H);
    cctx.letterSpacing = '0px';
    // frame + translucent fill
    rr(cctx, 12, 12, W - 24, H - 24, 24);
    cctx.fillStyle = COL.bg; cctx.fill();
    cctx.strokeStyle = COL.line; cctx.lineWidth = 2.5; cctx.stroke();
    // corner brackets, floated just outside the frame
    cctx.lineWidth = 3;
    cctx.beginPath();
    cctx.moveTo(4, 34); cctx.lineTo(4, 4); cctx.lineTo(34, 4);
    cctx.moveTo(W - 34, 4); cctx.lineTo(W - 4, 4); cctx.lineTo(W - 4, 34);
    cctx.moveTo(W - 4, H - 34); cctx.lineTo(W - 4, H - 4); cctx.lineTo(W - 34, H - 4);
    cctx.moveTo(34, H - 4); cctx.lineTo(4, H - 4); cctx.lineTo(4, H - 34);
    cctx.stroke();
    // header
    cctx.fillStyle = COL.line;
    cctx.textAlign = 'left'; cctx.textBaseline = 'alphabetic';
    cctx.letterSpacing = '5px';
    cctx.font = `600 26px ${MONO}`;
    cctx.fillText('PROJECT INFO', 56, 78);
    cctx.textAlign = 'right';
    cctx.fillStyle = COL.soft;
    cctx.font = `500 24px ${MONO}`;
    cctx.fillText(String(index + 1).padStart(2, '0'), W - 56, 78);
    cctx.fillStyle = COL.soft;
    cctx.fillRect(56, 98, W - 112, 2);
    // media placeholder — rounded frame + crosshair
    rr(cctx, 56, 124, W - 112, 294, 10);
    cctx.strokeStyle = COL.soft; cctx.lineWidth = 2; cctx.stroke();
    cctx.strokeStyle = COL.line; cctx.lineWidth = 2;
    cctx.beginPath();
    cctx.moveTo(W/2 - 24, 271); cctx.lineTo(W/2 + 24, 271);
    cctx.moveTo(W/2, 247); cctx.lineTo(W/2, 295);
    cctx.stroke();
    // title + description
    cctx.textAlign = 'left';
    cctx.fillStyle = COL.line;
    cctx.letterSpacing = '2px';
    cctx.font = `700 40px ${MONO}`;
    cctx.fillText(p.title.replace('\n', ' '), 56, 490);
    cctx.letterSpacing = '1px';
    cctx.fillStyle = COL.soft;
    cctx.font = `400 20px ${MONO}`;
    cctx.fillText('Short project description goes here.', 56, 530);
    // ROLE / TOOLS / YEAR rows — dashed placeholders, real year
    const rows = [['ROLE', null], ['TOOLS', null], ['YEAR', p.date]];
    rows.forEach(([label, val], i) => {
      const y = 584 + i * 44;
      cctx.letterSpacing = '4px';
      cctx.fillStyle = COL.line;
      cctx.font = `600 20px ${MONO}`;
      cctx.textAlign = 'left';
      cctx.fillText(label, 56, y);
      if (val){
        cctx.letterSpacing = '2px';
        cctx.fillStyle = COL.soft;
        cctx.font = `500 20px ${MONO}`;
        cctx.textAlign = 'right';
        cctx.fillText(val, W - 56, y);
      } else {
        cctx.strokeStyle = COL.faint; cctx.lineWidth = 3;
        cctx.setLineDash([10, 10]);
        cctx.beginPath();
        cctx.moveTo(300, y - 7); cctx.lineTo(W - 56, y - 7);
        cctx.stroke();
        cctx.setLineDash([]);
      }
    });
    // VIEW MORE button
    rr(cctx, BTN.x, BTN.y, BTN.w, BTN.h, 10);
    if (hover){ cctx.fillStyle = COL.btnFill; cctx.fill(); }
    cctx.strokeStyle = COL.line; cctx.lineWidth = 2.4; cctx.stroke();
    cctx.fillStyle = COL.line;
    cctx.textAlign = 'center';
    cctx.letterSpacing = '6px';
    cctx.font = `600 23px ${MONO}`;
    cctx.fillText('VIEW MORE', W / 2 + 3, BTN.y + 41);
    cctx.letterSpacing = '0px';
    cardTex.needsUpdate = true;
  }

  const cardTex = new THREE.CanvasTexture(cardCanvas);
  cardTex.anisotropy = 8;
  cardTex.colorSpace = THREE.SRGBColorSpace;
  const cardMat = new THREE.MeshBasicMaterial({
    map: cardTex, transparent: true, opacity: 0,
    depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
  const card = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), cardMat);
  card.position.y = CARD_Y;
  card.renderOrder = 996;
  card.visible = false;
  holo.add(card);

  // Projector beam — vertical alpha-gradient cylinder, rises platter → card.
  const beamCanvas = document.createElement('canvas');
  beamCanvas.width = 32; beamCanvas.height = 128;
  {
    const bctx = beamCanvas.getContext('2d');
    const g = bctx.createLinearGradient(0, 128, 0, 0);
    g.addColorStop(0,    'rgba(255,255,255,0)');
    g.addColorStop(0.08, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.6,  'rgba(255,255,255,0.5)');
    g.addColorStop(1,    'rgba(255,255,255,0.1)');
    bctx.fillStyle = g;
    bctx.fillRect(0, 0, 32, 128);
  }
  const beamTex = new THREE.CanvasTexture(beamCanvas);
  const beamMat = new THREE.MeshBasicMaterial({
    map: beamTex, color: COL.beam, transparent: true, opacity: 0,
    blending: COL.blend, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.10, 1, 40, 1, true), beamMat);
  beam.renderOrder = 995;
  beam.visible = false;
  holo.add(beam);
  // soft glow pool on the platter under the beam
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 128;
  {
    const gctx = glowCanvas.getContext('2d');
    const g = gctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.25)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    gctx.fillStyle = g;
    gctx.fillRect(0, 0, 128, 128);
  }
  const baseGlowMat = new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(glowCanvas), color: COL.beam, transparent: true,
    opacity: 0, blending: COL.blend, depthWrite: false, toneMapped: false,
  });
  const baseGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), baseGlowMat);
  baseGlow.rotation.x = -Math.PI / 2;
  baseGlow.position.y = BEAM_BOT + 0.004;
  baseGlow.renderOrder = 994;
  baseGlow.visible = false;
  holo.add(baseGlow);
  // Hologram pieces never intercept the cockpit hover raycast
  holo.traverse(o => { o.userData.noPick = true; });

  // ── Playback state machine ────────────────────────────────────
  let playing = -1;       // project index on (or inbound to) the platter
  let landed = false;
  let flight = null;      // { dir, t, dur, started, from(), to(), q0, q0fn(), q1fn(), s0, s1, onDone }
  let queued = null;      // play args waiting behind an eject (swap)
  let pendingEject = null;
  let coverT = 0, armT = 0, beamT = 0, cardT = 0;
  let btnHover = false;
  let elapsed = 0;

  const V3 = new THREE.Vector3();
  const VERT_QUAT = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
  const platterWorld = () => {
    group.updateMatrixWorld(true);
    return spin.localToWorld(new THREE.Vector3(0, DISC_REST_Y, 0));
  };
  const flatWorldQuat = () => group.getWorldQuaternion(new THREE.Quaternion());

  function startPlay(args){
    playing = args.index;
    drawCard(args.index, false);
    discMat.map = discTex(args.index);
    discMat.needsUpdate = true;
    if (args.onDepart) args.onDepart();
    if (deckDisc.parent !== scene) scene.attach(deckDisc);
    deckDisc.visible = true;
    const r0 = args.fromRadius ? args.fromRadius() : 0.45 * WS();
    flight = {
      dir: 'in', t: 0, dur: REDUCE ? 0.01 : 0.72, started: false,
      from: args.from, to: platterWorld,
      q0: null,
      q0fn: () => (args.fromQuat ? args.fromQuat() : VERT_QUAT.clone()),
      q1fn: flatWorldQuat,
      s0: r0 / 0.5, s1: WS(),
      onDone: () => {
        spin.attach(deckDisc);
        deckDisc.position.set(0, DISC_REST_Y, 0);
        deckDisc.rotation.x = 0; deckDisc.rotation.z = 0;
        deckDisc.scale.setScalar(1);
        landed = true;
      },
    };
  }

  function startEject(args){
    landed = false;
    if (deckDisc.parent !== scene) scene.attach(deckDisc);
    const curPos = deckDisc.position.clone();
    flight = {
      dir: 'out', t: 0, dur: REDUCE ? 0.01 : 0.6, started: true,
      from: () => curPos, to: args.to || platterWorld,
      q0: deckDisc.quaternion.clone(),
      q0fn: null,
      q1fn: () => (args.toQuat ? args.toQuat() : VERT_QUAT.clone()),
      s0: deckDisc.scale.x, s1: args.toRadius ? args.toRadius() / 0.5 : deckDisc.scale.x,
      onDone: () => {
        deckDisc.visible = false;
        if (args.onArrive) args.onArrive();
        if (queued){ const q = queued; queued = null; startPlay(q); }
        else playing = -1;
      },
    };
  }

  const play = (args) => {
    if (flight || landed){ queued = args; return; }   // swap: waits for the eject
    startPlay(args);
  };
  const eject = (args = {}) => {
    if (!landed && !flight){ playing = -1; if (args.onArrive) args.onArrive(); return; }
    if (flight && flight.dir === 'in'){ pendingEject = args; return; }
    if (flight && flight.dir === 'out'){ if (args.onArrive) args.onArrive(); return; }
    startEject(args);
  };

  window.__cockpitDeck = {
    play, eject,
    get busy(){ return !!(flight || queued || pendingEject); },
    get index(){ return playing; },
  };
  // HUD bridge — deck-view browse arrows
  window.__getCockpitDeckInfo = () => (vm() === 'deck' && playing >= 0)
    ? { index: playing, count: PROJECTS.length, busy: !!(flight || queued || pendingEject) }
    : null;

  // ── Camera-focus target for GlobeCanvas ('deck' view mode) ────
  group.getFocusTarget = function(){
    group.updateMatrixWorld(true);
    const ws = WS();
    const center = group.localToWorld(new THREE.Vector3(PLATTER_X, 1.08, 0));
    const q = group.getWorldQuaternion(new THREE.Quaternion());
    const outward = new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize();
    return { center, outward, fitHeight: 2.5 * ws };
  };

  // ── Deck-view picking: VIEW MORE hover/click + click-away exit ─
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pickCard = (e) => {
    if (!renderer || !camera) return null;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObject(card, false);
    return hits.length ? hits[0] : null;
  };
  const inButton = (hit) => {
    if (!hit.uv) return false;
    const px = hit.uv.x * CARD_PX_W, py = (1 - hit.uv.y) * CARD_PX_H;
    return px >= BTN.x && px <= BTN.x + BTN.w && py >= BTN.y && py <= BTN.y + BTN.h;
  };
  const onDeckMove = (e) => {
    if (vm() !== 'deck' || !card.visible){
      if (btnHover){ btnHover = false; if (playing >= 0) drawCard(playing, false); }
      return;
    }
    const hit = pickCard(e);
    const over = !!(hit && inButton(hit));
    if (over !== btnHover){
      btnHover = over;
      if (playing >= 0) drawCard(playing, over);
      renderer.domElement.style.cursor = over ? CURSOR_POINTER : '';
    }
  };
  const onDeckDown = (e) => {
    if (vm() !== 'deck' || e.button !== 0) return;
    const hit = card.visible ? pickCard(e) : null;
    if (hit){
      if (inButton(hit) && playing >= 0){
        // Future record click-through — for now announce the intent.
        window.dispatchEvent(new CustomEvent('cockpit-project-view', { detail: { index: playing } }));
      }
      e.stopPropagation();
    } else {
      if (window.__setCockpitViewMode) window.__setCockpitViewMode('cockpit');
      e.stopPropagation();
    }
  };
  if (renderer){
    renderer.domElement.addEventListener('pointermove', onDeckMove);
    renderer.domElement.addEventListener('pointerdown', onDeckDown, true);
  }

  const onTheme = () => {
    COL = deckTheme();
    beamMat.color.setHex(COL.beam);   beamMat.blending = COL.blend;   beamMat.needsUpdate = true;
    baseGlowMat.color.setHex(COL.beam); baseGlowMat.blending = COL.blend; baseGlowMat.needsUpdate = true;
    if (playing >= 0) drawCard(playing, btnHover);
  };
  window.addEventListener('cockpit-theme', onTheme);

  // ── Per-frame: spin + playback sequencing ─────────────────────
  const K = REDUCE ? 20 : 1;
  group.tick = function(dt, t){
    elapsed = (typeof t === 'number') ? t : elapsed + dt;
    spin.rotation.y += dt * 1.6;

    // Cover: open (lift + late fade) whenever a record is on deck/inbound.
    const coverTgt = (playing >= 0 || flight || queued) ? 1 : 0;
    coverT += (coverTgt - coverT) * Math.min(1, dt * 3.0 * K);
    coverGroup.position.y = easeInOut(coverT) * 0.5;
    coverMat.opacity = 1 - Math.min(1, Math.max(0, (coverT - 0.25) / 0.6));
    coverGroup.visible = coverMat.opacity > 0.02;

    // Record flight — quadratic bezier between LIVE endpoints (the crate
    // sleeve keeps animating while the disc is airborne).
    if (flight){
      if (!flight.started && flight.dir === 'in' && coverT < 0.5){
        // hold on the (rising) sleeve until the cover is out of the way
        deckDisc.position.copy(flight.from());
        deckDisc.quaternion.copy(flight.q0fn());
        deckDisc.scale.setScalar(flight.s0);
      } else {
        if (!flight.started){ flight.started = true; flight.q0 = flight.q0fn ? flight.q0fn() : flight.q0; }
        flight.t += dt;
        const e = easeInOut(Math.min(1, flight.t / flight.dur));
        const p0 = flight.from(), p2 = flight.to();
        const mid = p0.clone().lerp(p2, 0.5);
        mid.y = Math.max(p0.y, p2.y) + 0.55 * WS();
        const a = p0.clone().lerp(mid, e);
        const b = mid.clone().lerp(p2, e);
        deckDisc.position.copy(a.lerp(b, e));
        const q = flight.q0.clone().slerp(flight.q1fn(), e);
        q.multiply(new THREE.Quaternion().setFromAxisAngle(V3.set(0, 1, 0), e * 2.2));
        deckDisc.quaternion.copy(q);
        deckDisc.scale.setScalar(flight.s0 + (flight.s1 - flight.s0) * e);
        if (flight.t >= flight.dur){
          const f = flight;
          flight = null;
          f.onDone();
          if (pendingEject){ const pe = pendingEject; pendingEject = null; eject(pe); }
        }
      }
    }

    // Tonearm: park ↔ play, lifting slightly mid-swing.
    armT += ((landed ? 1 : 0) - armT) * Math.min(1, dt * 2.6 * K);
    const ae = easeInOut(armT);
    armAssembly.rotation.y = ARM_PARK.y + (ARM_PLAY.y - ARM_PARK.y) * ae;
    armAssembly.rotation.z = ARM_PARK.z + (ARM_PLAY.z - ARM_PARK.z) * ae + 0.09 * Math.sin(Math.PI * ae);

    // Beam rises once the arm is engaging; card materializes out of it.
    const beamTgt = (landed && armT > 0.55) ? 1 : 0;
    const cardTgt = (landed && armT > 0.82) ? 1 : 0;
    beamT += (beamTgt - beamT) * Math.min(1, dt * 4.0 * K);
    cardT += (cardTgt - cardT) * Math.min(1, dt * 3.4 * K);

    const be = easeInOut(beamT);
    beam.visible = beamT > 0.02;
    if (beam.visible){
      beam.scale.set(1, Math.max(0.001, be), 1);
      beam.position.y = BEAM_BOT + BEAM_H * be * 0.5;
      beam.rotation.y += dt * 0.4;
      beamMat.opacity = COL.beamOpacity * be;
    }
    baseGlow.visible = beam.visible;
    if (baseGlow.visible) baseGlowMat.opacity = 0.55 * be;

    const ce = easeInOut(cardT);
    card.visible = cardT > 0.02;
    if (card.visible){
      card.scale.setScalar(0.9 + 0.1 * ce);
      card.position.y = CARD_Y + 0.06 * (1 - ce) + 0.012 * Math.sin(elapsed * 1.4);
      // subtle materialize flicker while fading in — settles at full
      cardMat.opacity = (0.96 - 0.16 * Math.max(0, Math.sin(elapsed * 42)) * (1 - ce)) * ce;
      // yaw-only billboard: face the camera, stay upright
      if (camera){
        const wp = card.getWorldPosition(new THREE.Vector3());
        const cp = camera.getWorldPosition(new THREE.Vector3());
        cp.y = wp.y;
        card.lookAt(cp);
      }
    }
  };

  group.disposeDeck = function(){
    if (renderer){
      renderer.domElement.removeEventListener('pointermove', onDeckMove);
      renderer.domElement.removeEventListener('pointerdown', onDeckDown, true);
    }
    window.removeEventListener('cockpit-theme', onTheme);
    if (deckDisc.parent) deckDisc.parent.remove(deckDisc);
    window.__cockpitDeck = null;
    window.__getCockpitDeckInfo = null;
  };

  return group;
}
