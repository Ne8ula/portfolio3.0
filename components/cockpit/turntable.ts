// @ts-nocheck
// Turntable — "A.X / STUDIO" deck rebuilt from the multi-angle product
// renders: a low warm off-white molded base on small dark feet, a boxy
// lightly-frosted acrylic dust cover with rounded corners, a green-glass
// platter under a taupe grooved mat with a pale sage label, a delicate
// silver tonearm with a black cartridge, a recessed pitch slider with a
// sage knob, and tiny sage/graphite micrographics (canvas-drawn control
// clusters + one sheet from /public/micrographics). Decorative — only the
// platter spins; no interactions yet.
import * as THREE from "three"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js"
import { makeDecal, makeTextDecal } from "./decals"

const SAGE = '#6F8D75';
const MONO = '"JetBrains Mono", Consolas, monospace';

export function buildTurntable(scene, tableGroup){
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
  const greenGlass = new THREE.MeshPhysicalMaterial({ color: 0xA9BFA5, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.12 });
  // Jade dash accents — LIT material; an unlit basic reads as a glowing
  // light-bar over the dim scene instead of printed jade ink.
  const sageSolid  = new THREE.MeshStandardMaterial({ color: 0x4B6E4F, roughness: 0.6 });
  const sageKnob   = new THREE.MeshStandardMaterial({ color: 0x8FA98F, roughness: 0.5 });

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

  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.01, 40),
    new THREE.MeshStandardMaterial({ color: 0xB3C4AF, roughness: 0.8 }));
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
  armAssembly.rotation.y = -0.80;            // swung in over the platter
  armAssembly.rotation.z = -0.06;            // gentle droop toward the record
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
  const powerBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.01, 24), baseMat);
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
  });
  const COVER_W = BASE_W - 0.06, COVER_D = BASE_D - 0.06, COVER_H = 0.52, CT = 0.015;
  const coverY0 = topY + 0.004;              // floats a hair above the deck — coplanar = flicker
  const wallH = COVER_H - CT + 0.004;        // walls sink slightly into the lid (no coplanar seam)
  const coverPanel = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.006), coverMat);
    m.position.set(x, y, z);
    group.add(m);
    return m;
  };
  coverPanel(COVER_W, wallH, CT, 0, coverY0 + wallH/2,   COVER_D/2 - CT/2);    // front
  coverPanel(COVER_W, wallH, CT, 0, coverY0 + wallH/2, -(COVER_D/2 - CT/2));   // back
  [-1, 1].forEach(s =>                                                          // sides
    coverPanel(CT, wallH, COVER_D - CT*2 - 0.002, s * (COVER_W/2 - CT/2), coverY0 + wallH/2, 0));
  coverPanel(COVER_W, CT, COVER_D, 0, coverY0 + COVER_H - CT/2, 0);            // lid

  // ── Spin ──────────────────────────────────────────────────────
  group.tick = function(dt){
    spin.rotation.y += dt * 1.6;
  };

  return group;
}
