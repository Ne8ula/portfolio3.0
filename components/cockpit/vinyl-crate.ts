// @ts-nocheck
// VinylCrate — "VINYL CRATE 007": a frosted-acrylic archive crate rebuilt
// from the multi-angle product-render references (front/back/side/top).
// Shell language: milky frosted walls with rounded edges, a stepped side
// profile (tall at the back, low over the front opening, thin tall corner
// posts at the very front), a warm off-white molded base band on four dark
// feet, and a slightly-proud clear label plate across the lower front.
// Micrographic decals (007/ARCHIVE, DEVICE, ACCESS: PENDING, ALTERNATE…)
// are rasterized at runtime from the SVG sheets in /public/micrographics
// and tinted muted sage / graphite — printed silkscreen, not geometry.
//
// Records stack front-to-back inside (covers facing the viewer), packed
// like a real crate-digging bin. Interactions:
//   • cockpit view: hovering the crate shows a cursor + HUD brackets
//     (via the 'cockpit-crate-hover' event); clicking it asks GlobeCanvas
//     to focus the camera on the crate (view mode 'crate').
//   • crate view: hovering a record only HIGHLIGHTS it (jade normal
//     pins + pointer cursor) — no motion. CLICKING pulls it out: the
//     sleeve lifts+tips toward the camera while the black disc slides up
//     out of the sleeve mouth. Selected data is exposed via
//     window.__getCockpitVinylHover() for the HUD info card.
import * as THREE from "three"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js"
import { VertexNormalsHelper } from "three/examples/jsm/helpers/VertexNormalsHelper.js"
import { CURSOR_POINTER } from "./cursors"
import { PALETTE, makeFrost } from "./materials"
import { makeDecal } from "./decals"

// Placeholder project records — restructure-ready: title / category / date
// drive the hover card and the cover art. Palette: [bg, accent, text].
const PROJECTS = [
  { title: 'MIDNIGHT\nSIGNALS',  category: 'design',     date: '2025.11', bg:'#E8E4DC', accent:'#4B6E4F', text:'#1E1C1A' },
  { title: 'LONG\nSHADOW',       category: 'web',        date: '2025.08', bg:'#3A3644', accent:'#E8E4DC', text:'#E8E4DC' },
  { title: 'JADE\nHOUR',         category: 'design',     date: '2025.06', bg:'#4B6E4F', accent:'#F0EBE1', text:'#F0EBE1' },
  { title: 'ANALOGUE\nDREAMS',   category: 'prototype',  date: '2025.04', bg:'#D8D3C7', accent:'#3A3644', text:'#1E1C1A' },
  { title: 'COLD\nLINE FM',      category: 'web',        date: '2025.02', bg:'#1E1C1A', accent:'#7FA683', text:'#E8E4DC' },
  { title: 'RED\nHEM',           category: 'design',     date: '2024.12', bg:'#F0EBE1', accent:'#B24240', text:'#1E1C1A' },
  { title: 'ROOM 21',            category: 'game',       date: '2024.10', bg:'#6E6878', accent:'#E8E4DC', text:'#E8E4DC' },
  { title: 'FIELD\nNOTES v.II',  category: 'prototype',  date: '2024.08', bg:'#3A5A3E', accent:'#D8D3C7', text:'#F0EBE1' },
  { title: 'STATIC\nGARDEN',     category: 'game',       date: '2024.06', bg:'#A8A2B0', accent:'#1E1C1A', text:'#1E1C1A' },
  { title: 'NORTH\n&  SOUTH',    category: 'design',     date: '2024.04', bg:'#E8E4DC', accent:'#6E6878', text:'#1E1C1A' },
  { title: 'LOW\nTIDE',          category: 'web',        date: '2024.02', bg:'#2B4A30', accent:'#CFC9C0', text:'#E8E4DC' },
  { title: 'FOLIO',              category: 'design',     date: '2023.11', bg:'#CFC9C0', accent:'#3A5A3E', text:'#1E1C1A' },
  { title: 'AMBER\nPROTOCOL',    category: 'game',       date: '2023.09', bg:'#1E1C1A', accent:'#D8A24B', text:'#D8A24B' },
  { title: 'GREEN\nROOM',        category: 'prototype',  date: '2023.06', bg:'#7FA683', accent:'#1E1C1A', text:'#1E1C1A' },
  { title: 'UNTITLED\nSIDES',    category: 'experiment', date: '2023.03', bg:'#E8E4DC', accent:'#1E1C1A', text:'#1E1C1A' },
];

// ── Reference material palette (brief: warm off-white base, milky
// frost, muted sage accents only — never bright neon green) ─────────
const CRATE_COLORS = {
  base:     0xD2CCBF,   // warm off-white molded base band
  floor:    0xC9C2B5,   // interior tray plate
  frost:    0xE3DFD8,   // milky gray acrylic tint
  sage:     0x4B6E4F,   // solid accent bars/tabs — PALETTE.jade; the unlit
                        // basic material skips tone mapping, so lighter hexes
                        // wash out on screen (decal TEXT stays #6F8D75)
  graphite: 0x6E6E68,   // small labels where green is too loud
  feet:     0x24221F,
};

function makeCoverTexture(i){
  const { bg, accent, text, title, category, date } = PROJECTS[i];
  const SIZE = 512;
  const c = document.createElement('canvas');
  c.width = SIZE; c.height = SIZE;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);
  for (let k = 0; k < 800; k++){
    ctx.fillStyle = `rgba(0,0,0,${Math.random()*0.04})`;
    ctx.fillRect(Math.random()*SIZE, Math.random()*SIZE, 1, 1);
  }
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, SIZE-48, SIZE-48);
  ctx.save();
  ctx.translate(SIZE/2, SIZE/2 - 40);
  const motif = i % 5;
  if (motif === 0){
    for (let r = 40; r < 160; r += 18){
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI*2);
      ctx.stroke();
    }
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
  } else if (motif === 1){
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(0, -120); ctx.lineTo(110, 0); ctx.lineTo(0, 120); ctx.closePath();
    ctx.fill();
  } else if (motif === 2){
    for (let b = 0; b < 7; b++){
      const h = 40 + (Math.sin(b*1.3)+1)*60;
      ctx.fillStyle = accent;
      ctx.fillRect(-130 + b*38, -h/2, 26, h);
    }
  } else if (motif === 3){
    ctx.strokeStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 100, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-140, 0); ctx.lineTo(140, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -140); ctx.lineTo(0, 140); ctx.stroke();
  } else {
    ctx.fillStyle = accent;
    ctx.fillRect(-100, -100, 200, 200);
    ctx.fillStyle = bg;
    ctx.fillRect(-40, -40, 80, 80);
  }
  ctx.restore();

  ctx.fillStyle = text;
  ctx.font = 'bold 34px "Cormorant Garamond", Georgia, serif';
  ctx.textAlign = 'center';
  const lines = title.split('\n');
  lines.forEach((ln, li) => {
    ctx.fillText(ln, SIZE/2, SIZE - 120 + li*38);
  });
  ctx.fillStyle = accent;
  ctx.font = '600 14px "JetBrains Mono", monospace';
  ctx.letterSpacing = '2px';
  ctx.fillText(`${category.toUpperCase()} · ${date}`, SIZE/2, SIZE - 40);

  ctx.fillStyle = accent;
  ctx.font = '600 11px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`№ ${String(i+1).padStart(2,'0')}`, 40, 50);
  ctx.textAlign = 'right';
  ctx.fillText(date, SIZE-40, 50);

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Top-edge strip — the sliver you read while digging through the bin.
function makeTopEdgeTexture(i){
  const { bg, accent, text, title } = PROJECTS[i];
  const W = 512, H = 64;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  for (let k = 0; k < 80; k++){
    ctx.fillStyle = `rgba(0,0,0,${Math.random()*0.08})`;
    ctx.fillRect(Math.random()*W, Math.random()*H, 2 + Math.random()*6, 1);
  }
  ctx.fillStyle = accent;
  ctx.fillRect(24, H/2 - 1, 40, 2);
  ctx.fillRect(W - 64, H/2 - 1, 40, 2);
  ctx.fillStyle = text;
  ctx.font = '600 24px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title.replace('\n', ' '), W/2, H/2);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function makeDiscTexture(i){
  const { accent, category } = PROJECTS[i];
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#12100F';
  ctx.beginPath(); ctx.arc(S/2, S/2, S/2-2, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let r = 44; r < S/2 - 6; r += 3){
    ctx.beginPath(); ctx.arc(S/2, S/2, r, 0, Math.PI*2); ctx.stroke();
  }
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.arc(S/2, S/2, 44, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#1E1C1A';
  ctx.beginPath(); ctx.arc(S/2, S/2, 5, 0, Math.PI*2); ctx.fill();
  ctx.font = '600 10px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(category.toUpperCase(), S/2, S/2 - 24);
  ctx.fillText(`№ ${String(i+1).padStart(2,'0')}`, S/2, S/2 + 30);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  return tex;
}

// Soft radial jade halo — the hover highlight behind a sleeve.
function makeHaloTexture(){
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(S/2, S/2, S*0.18, S/2, S/2, S/2);
  g.addColorStop(0,    'rgba(122,154,126,0.9)');
  g.addColorStop(0.55, 'rgba(122,154,126,0.28)');
  g.addColorStop(1,    'rgba(122,154,126,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(c);
}

export function buildVinylCrate(scene, tableGroup, camera, renderer){
  const group = new THREE.Group();
  tableGroup.add(group);

  // ── Record + crate dimensions ─────────────────────────────────
  // Records stack along Z (front-to-back, covers facing +Z / the
  // viewer). The crate interior depth is derived from the record count;
  // wall heights follow the reference renders: tall back + sides, a
  // stepped-down section over the front opening, thin full-height
  // corner posts at the very front, all on an off-white base band.
  const N = PROJECTS.length;
  const SLEEVE_W = 0.95;   // cover width  (X)
  const SLEEVE_H = 0.98;   // cover height (Y)
  const SLEEVE_T = 0.045;  // sleeve thickness (Z) — real-LP proportion
  const SPACING  = 0.072;  // Z stride between sleeves — packed like a real bin
  const LEAN     = 0.10;   // uniform backward lean (rad)

  const PAD_FRONT = 0.10;
  const PAD_BACK  = 0.18;  // extra room for the lean
  const CRATE_D = (N - 1) * SPACING + SLEEVE_T + PAD_FRONT + PAD_BACK; // interior depth (Z)
  const CRATE_W = SLEEVE_W + 0.16;                                     // interior width (X)
  const WALL_T  = 0.075;   // thick molded acrylic

  const BASE_H    = 0.13;  // off-white base band height
  const BASE_Y0   = 0.03;  // band floats on the feet
  const WALL_Y0   = BASE_Y0 + BASE_H - 0.01;  // walls sink 10mm into the band (no gap, no coplanar seam)
  const TALL_H    = 1.02;  // back + rear-side wall top (from crate bottom)
  const FRONT_TOP = 0.60;  // front wall + stepped side section top
  const NOTCH_D   = 0.34;  // depth of the stepped-down side section, from the front face
  const FLOOR_TOP = BASE_Y0 + BASE_H + 0.008; // interior tray plate top

  // Pull-out motion targets. Mostly RISE, little tilt: under the steep
  // top-down crate camera, a record tipping toward the lens picks up ugly
  // wide-angle foreshortening (worst for the front rows) — rising reads clean.
  const LIFT      = 0.34;  // sleeve rise
  const PUSH      = 0.04;  // sleeve toward viewer
  const TILT      = 0.14;  // sleeve tips toward viewer (rad, from vertical)
  const DISC_RISE = 0.52;  // disc slides out of the sleeve mouth

  const baseX = -3.2, baseY = 0.18, baseZ = 1.15;
  const baseRX = 0, baseRY = 0.35, baseRZ = 0;
  group.position.set(baseX, baseY, baseZ);
  group.rotation.set(baseRX, baseRY, baseRZ);
  group.scale.setScalar(1.45);
  group.setTransform = function({ x, y, z, rx, ry, rz, s } = {}){
    if (typeof x === 'number') group.position.x = x;
    if (typeof y === 'number') group.position.y = y;
    if (typeof z === 'number') group.position.z = z;
    if (typeof rx === 'number') group.rotation.x = rx;
    if (typeof ry === 'number') group.rotation.y = ry;
    if (typeof rz === 'number') group.rotation.z = rz;
    if (typeof s === 'number') group.scale.setScalar(s);
  };
  window.__cockpitVinyl = group;

  // ── Materials (reference: milky frost / off-white satin / sage) ──
  const wallMat = makeFrost({ color: CRATE_COLORS.frost, transmission: 0.82, roughness: 0.5, thickness: 0.08 });
  wallMat.clearcoat = 0.5;             // brighter highlights along rounded rims
  wallMat.clearcoatRoughness = 0.3;
  const plateMat = makeFrost({ color: 0xEDEAE3, transmission: 0.9, roughness: 0.32, thickness: 0.03 });
  plateMat.clearcoat = 0.7;
  plateMat.clearcoatRoughness = 0.2;
  const baseMat  = new THREE.MeshPhysicalMaterial({ color: CRATE_COLORS.base, roughness: 0.55, clearcoat: 0.15, clearcoatRoughness: 0.5 });
  const floorMat = new THREE.MeshPhysicalMaterial({ color: CRATE_COLORS.floor, roughness: 0.8 });
  const feetMat  = new THREE.MeshLambertMaterial({ color: CRATE_COLORS.feet });
  // LIT material — an unlit basic here reads as a glowing light-bar over
  // the dim scene; standard shades with the room and matches the decal ink.
  const sageMat  = new THREE.MeshStandardMaterial({ color: CRATE_COLORS.sage, roughness: 0.6 });

  const crateMeshes = [];  // shell meshes — raycast targets for "clicked the crate"
  const shell = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    group.add(m);
    crateMeshes.push(m);
    return m;
  };

  const OUT_W = CRATE_W + WALL_T*2;   // exterior footprint
  const OUT_D = CRATE_D + WALL_T*2;

  // Feet — four dark rounded pads; the band floats on them (soft shadow gap).
  [-1, 1].forEach(sx => [-1, 1].forEach(sz => {
    const foot = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.04, 0.11, 2, 0.015), feetMat);
    foot.position.set(sx*(OUT_W/2 - 0.14), 0.02, sz*(OUT_D/2 - 0.14));
    group.add(foot);
  }));

  // Off-white molded base band.
  shell(new RoundedBoxGeometry(OUT_W, BASE_H, OUT_D, 3, 0.035), baseMat,
        0, BASE_Y0 + BASE_H/2, 0);

  // Interior tray plate — the warm floor you see in the top view.
  shell(new RoundedBoxGeometry(CRATE_W - 0.02, 0.035, CRATE_D - 0.02, 2, 0.015), floorMat,
        0, FLOOR_TOP - 0.0175, 0);

  // Walls sit slightly inset from the band edge (reference shows the band
  // proud of the acrylic). Frost is transmissive, not alpha-blended, so
  // walls may overlap the band and enclose the records safely.
  const wallW = OUT_W - 0.012;
  const wallR = 0.028;                 // rounded acrylic edges

  // Back wall — full height.
  shell(new RoundedBoxGeometry(wallW, TALL_H - WALL_Y0, WALL_T, 2, wallR), wallMat,
        0, (WALL_Y0 + TALL_H)/2, -(CRATE_D/2 + WALL_T/2));

  // Small molded tab on the back rim center (top-view reference).
  shell(new RoundedBoxGeometry(0.16, 0.05, WALL_T + 0.006, 2, 0.012), wallMat,
        0, TALL_H + 0.018, -(CRATE_D/2 + WALL_T/2));

  // Front wall — low, records peek over it.
  shell(new RoundedBoxGeometry(wallW, FRONT_TOP - WALL_Y0, WALL_T, 2, wallR), wallMat,
        0, (WALL_Y0 + FRONT_TOP)/2, CRATE_D/2 + WALL_T/2);

  // Side walls — tall rear segment, stepped-down front segment (the
  // side-view step from the reference).
  const zBack   = -(CRATE_D/2 + WALL_T);
  const zFront  =   CRATE_D/2 + WALL_T;
  const zNotch  =   CRATE_D/2 - NOTCH_D;
  const rearLen  = zNotch - zBack;
  const frontLen = zFront - zNotch;
  [-1, 1].forEach(s => {
    const x = s * (CRATE_W/2 + WALL_T/2);
    shell(new RoundedBoxGeometry(WALL_T, TALL_H - WALL_Y0, rearLen, 2, wallR), wallMat,
          x, (WALL_Y0 + TALL_H)/2, (zBack + zNotch)/2);
    shell(new RoundedBoxGeometry(WALL_T, FRONT_TOP - WALL_Y0, frontLen, 2, wallR), wallMat,
          x, (WALL_Y0 + FRONT_TOP)/2, (zNotch + zFront)/2);
  });

  // Slightly-proud clear label plate across the lower front — carries the
  // 007/ARCHIVE and DEVICE silkscreen blocks in the reference.
  const PLATE_H = 0.33;
  const plateZ = CRATE_D/2 + WALL_T + 0.013;
  const plate = shell(new RoundedBoxGeometry(CRATE_W * 0.96, PLATE_H, 0.022, 2, 0.012), plateMat,
        0, WALL_Y0 + 0.035 + PLATE_H/2, plateZ);

  // ── Micrographic decals (silkscreen planes, floated off the frost) ──
  const decals = [];
  const addDecal = (file, opts, x, y, z, ry = 0) => {
    const d = makeDecal(file, opts);
    d.position.set(x, y, z);
    d.rotation.y = ry;
    group.add(d);
    decals.push(d);
    return d;
  };
  const plateFaceZ = plateZ + 0.013;
  const plateMidY = plate.position.y - 0.03;
  // Front: 007 / ARCHIVE — DECODING // ACCESS GRANTED block, lower-left.
  addDecal('Micrographics Vol.1 - Editable 57.svg', { width: 0.36, tint: '#6F8D75', opacity: 0.9 },
           -CRATE_W*0.24, plateMidY, plateFaceZ);
  // Front: DEVICE / REMOTE INTERFACE — ONLINE block, lower-right.
  addDecal('Micrographics Vol.1 - Editable 53.svg', { width: 0.42, tint: '#6F8D75', opacity: 0.9 },
           CRATE_W*0.24, plateMidY, plateFaceZ);
  // Back: ACCESS: PENDING status block.
  addDecal('Micrographics Vol.1 - Editable 60.svg', { width: 0.56, tint: '#6E6E68', opacity: 0.85 },
           0, 0.52, -(CRATE_D/2 + WALL_T + 0.004), Math.PI);
  // Left side: ALTERNATE / STATUS block on the tall section.
  addDecal('Micrographics Vol.1 - Editable 65.svg', { width: 0.5, tint: '#6E6E68', opacity: 0.85 },
           -(CRATE_W/2 + WALL_T + 0.004), 0.56, -0.1, -Math.PI/2);
  // Right side: 007 / ONLINE diagnostics — asymmetric from the left.
  addDecal('Micrographics Vol.1 - Editable 44.svg', { width: 0.46, tint: '#6E6E68', opacity: 0.85 },
           CRATE_W/2 + WALL_T + 0.004, 0.56, -0.05, Math.PI/2);

  // Sage accents — the only chromatic marks on the shell.
  const sageBits = [
    // vertical registration bar, front plate center
    { g: new THREE.PlaneGeometry(0.016, 0.17), p: [0, plateMidY + 0.01, plateFaceZ], ry: 0 },
    // tiny tab on the base band, front-right corner
    { g: new THREE.PlaneGeometry(0.035, 0.035), p: [OUT_W/2 - 0.09, BASE_Y0 + BASE_H*0.5, OUT_D/2 + 0.002], ry: 0 },
    // tab on the base band, left side near the back
    { g: new THREE.PlaneGeometry(0.026, 0.05), p: [-(OUT_W/2 + 0.002), BASE_Y0 + BASE_H*0.5, -OUT_D/2 + 0.16], ry: -Math.PI/2 },
    // vertical dash low on the left wall, near the front
    { g: new THREE.PlaneGeometry(0.012, 0.1), p: [-(CRATE_W/2 + WALL_T + 0.004), 0.34, zNotch + 0.1], ry: -Math.PI/2 },
    // two dashes flanking the rear status block
    { g: new THREE.PlaneGeometry(0.012, 0.09), p: [-0.42, 0.5, -(CRATE_D/2 + WALL_T + 0.004)], ry: Math.PI },
    { g: new THREE.PlaneGeometry(0.012, 0.09), p: [ 0.42, 0.5, -(CRATE_D/2 + WALL_T + 0.004)], ry: Math.PI },
  ];
  sageBits.forEach(({ g, p, ry }) => {
    const m = new THREE.Mesh(g, sageMat);
    m.position.set(...p);
    m.rotation.y = ry;
    group.add(m);
  });

  // Focus-dim registry: when a record is pulled out, everything else in
  // the bin drops back (color-darkened — NOT opacity, which would go ghostly).
  const dimmables = [wallMat, plateMat, baseMat, floorMat, sageMat, ...decals.map(d => d.material)]
    .map(m => ({ m, base: m.color.clone() }));
  let dimT = 0;

  // ── Records ───────────────────────────────────────────────────
  const recordsGroup = new THREE.Group();
  recordsGroup.position.set(0, FLOOR_TOP + 0.002, 0);
  group.add(recordsGroup);

  const haloTex = makeHaloTexture();
  const vinyls = [];
  const frontZ = CRATE_D/2 - PAD_FRONT - SLEEVE_T/2;

  for (let i = 0; i < N; i++){
    const vinyl = new THREE.Group();
    const restZ = frontZ - i * SPACING;   // i=0 nearest the viewer
    const restY = SLEEVE_H/2;
    vinyl.position.set(0, restY, restZ);
    vinyl.rotation.x = -LEAN;
    vinyl.userData = { i, restY, restZ, hover: 0, disc: 0, tilt: 0 };

    const coverTex = makeCoverTexture(i);
    const topTex = makeTopEdgeTexture(i);
    const edgeCol = new THREE.MeshLambertMaterial({ color: PROJECTS[i].bg });
    const sleeveMats = [
      edgeCol,                                             // +X edge
      edgeCol,                                             // -X edge
      new THREE.MeshLambertMaterial({ map: topTex }),      // +Y top — readable strip
      edgeCol,                                             // -Y bottom
      new THREE.MeshLambertMaterial({ map: coverTex }),    // +Z front — cover art
      new THREE.MeshLambertMaterial({ color: PROJECTS[i].bg })  // -Z back
    ];
    const sleeve = new THREE.Mesh(
      new THREE.BoxGeometry(SLEEVE_W, SLEEVE_H, SLEEVE_T),
      sleeveMats
    );
    vinyl.add(sleeve);
    const sleeveEdge = new THREE.LineSegments(
      new THREE.EdgesGeometry(sleeve.geometry),
      new THREE.LineBasicMaterial({ color: 0x1E1C1A, transparent:true, opacity:0.5 })
    );
    vinyl.add(sleeveEdge);

    // Hover halo — jade glow plane just behind the sleeve (child of the
    // vinyl group, so it tracks tilt/lift for free). Additive, no depth.
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(SLEEVE_W*1.8, SLEEVE_H*1.8),
      new THREE.MeshBasicMaterial({ map: haloTex, color: 0x7A9A7E, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    );
    halo.position.z = -(SLEEVE_T/2 + 0.012);
    vinyl.add(halo);

    // Disc — hidden inside the sleeve at rest, slides up +Y on hover.
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(SLEEVE_H*0.46, SLEEVE_H*0.46, 0.02, 40),
      // Clearcoat = pressed-vinyl gloss; the matte cardboard sleeves stay Lambert.
      new THREE.MeshPhysicalMaterial({ map: makeDiscTexture(i), roughness: 0.55, clearcoat: 1, clearcoatRoughness: 0.18 })
    );
    disc.rotation.x = Math.PI/2;   // face the viewer (+Z)
    disc.position.set(0, 0, 0);
    vinyl.add(disc);

    recordsGroup.add(vinyl);
    const mats = [...new Set(sleeveMats)].map(m => ({ m, base: m.color.clone() }));
    vinyls.push({ group: vinyl, sleeve, disc, halo, mats, data: vinyl.userData });
  }

  // ── Hover diagnostics — webgl_helpers-style jade normal pins ──
  // A VertexNormalsHelper sprays short jade ticks along the hovered
  // sleeve's vertex normals (the three.js webgl_helpers look). Helpers
  // self-position in world space, so they live at scene root — NOT in
  // the (scaled/rotated) crate group — and are created lazily per record.
  const pinHelpers = new Map();
  const getPins = (i) => {
    let h = pinHelpers.get(i);
    if (!h){
      h = new VertexNormalsHelper(vinyls[i].sleeve, 0.08, PALETTE.jadeLt);
      h.material.transparent = true;
      h.material.opacity = 0;
      h.material.depthWrite = false;
      h.visible = false;
      scene.add(h);
      pinHelpers.set(i, h);
    }
    return h;
  };

  // ── Picking ───────────────────────────────────────────────────
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hoveredIdx = -1;      // highlight only (pins + cursor) — never moves records
  let selectedIdx = -1;     // click-selected record — the one pulled out
  let hoverCrate = false;   // cockpit-view hover (for HUD brackets)

  const sleevePickables = vinyls.map(v => v.sleeve);
  const viewMode = () => window.__cockpitViewMode || 'cockpit';

  function setNDC(e){
    const r = renderer.domElement.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
  }

  function pickVinyl(e){
    setNDC(e);
    const hits = raycaster.intersectObjects(sleevePickables, false);
    if (!hits.length) return -1;
    const v = vinyls.find(vv => vv.sleeve === hits[0].object);
    return v ? v.data.i : -1;
  }

  function pickCrate(e){
    setNDC(e);
    if (raycaster.intersectObjects(sleevePickables, false).length) return true;
    if (raycaster.intersectObjects(crateMeshes, false).length) return true;
    return false;
  }

  const onPointerMove = (e) => {
    const mode = viewMode();
    if (mode === 'crate'){
      if (hoverCrate){ hoverCrate = false; window.dispatchEvent(new CustomEvent('cockpit-crate-hover', { detail:{ hovering:false } })); }
      const idx = pickVinyl(e);
      if (idx !== hoveredIdx){
        hoveredIdx = idx;
        renderer.domElement.style.cursor = idx >= 0 ? CURSOR_POINTER : '';
      }
    } else if (mode === 'cockpit'){
      hoveredIdx = -1;
      const over = pickCrate(e);
      if (over !== hoverCrate){
        hoverCrate = over;
        window.dispatchEvent(new CustomEvent('cockpit-crate-hover', { detail:{ hovering: over } }));
        if (over) renderer.domElement.style.cursor = CURSOR_POINTER;
        else if (!window.__cockpitHoverPC) renderer.domElement.style.cursor = '';
      }
    } else {
      hoveredIdx = -1;
    }
  };
  const onPointerLeave = () => {
    hoveredIdx = -1;
    if (hoverCrate){ hoverCrate = false; window.dispatchEvent(new CustomEvent('cockpit-crate-hover', { detail:{ hovering:false } })); }
  };
  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    const mode = viewMode();
    if (mode === 'cockpit'){
      if (pickCrate(e) && window.__setCockpitViewMode){
        window.__setCockpitViewMode('crate');
        e.stopPropagation();
      }
    } else if (mode === 'crate'){
      const idx = pickVinyl(e);
      if (idx >= 0){
        // Click pulls the record out; clicking it again slides it back.
        selectedIdx = (selectedIdx === idx) ? -1 : idx;
        e.stopPropagation();
      } else if (!pickCrate(e)){
        // Empty space: first click puts a pulled record back; with
        // nothing pulled, it returns to the cockpit.
        if (selectedIdx >= 0) selectedIdx = -1;
        else if (window.__setCockpitViewMode) window.__setCockpitViewMode('cockpit');
      }
    }
  };

  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerleave', onPointerLeave);
  renderer.domElement.addEventListener('pointerdown', onPointerDown, true);

  // ── Camera-focus target for GlobeCanvas ('crate' view mode) ───
  group.getFocusTarget = function(){
    group.updateMatrixWorld(true);
    const center = group.localToWorld(new THREE.Vector3(0, 0.55, 0));
    const q = group.getWorldQuaternion(new THREE.Quaternion());
    const outward = new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize();
    const ws = group.getWorldScale(new THREE.Vector3()).x || 1;
    return { center, outward, fitDepth: (CRATE_D + 1.0) * ws, fitWidth: (CRATE_W + 0.8) * ws };
  };

  // ── Screen-space projections for the DOM HUD ──────────────────
  // Crate bounding rect (cockpit-view hover brackets)
  window.__getCockpitCrateRect = function(){
    const rect = renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const bbox = new THREE.Box3().setFromObject(group);
    if (bbox.isEmpty()) return null;
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,anyInFront=false;
    for (let xi = 0; xi < 2; xi++) for (let yi = 0; yi < 2; yi++) for (let zi = 0; zi < 2; zi++){
      const c = new THREE.Vector3(
        xi ? bbox.max.x : bbox.min.x,
        yi ? bbox.max.y : bbox.min.y,
        zi ? bbox.max.z : bbox.min.z
      );
      const v = c.clone().applyMatrix4(camera.matrixWorldInverse);
      if (v.z < -0.05) anyInFront = true;
      const p = c.project(camera);
      const sx = ( p.x*0.5+0.5)*rect.width;
      const sy = (-p.y*0.5+0.5)*rect.height;
      if (sx<minX) minX=sx; if (sy<minY) minY=sy;
      if (sx>maxX) maxX=sx; if (sy>maxY) maxY=sy;
    }
    if (!anyInFront) return null;
    return { x:minX, y:minY, w:maxX-minX, h:maxY-minY };
  };

  // Pulled-out (click-selected) record → { x, y, title, category, date }
  // for the crate-view info card. Same bridge name as before — the HUD
  // doesn't care whether selection is hover- or click-driven.
  window.__getCockpitVinylHover = function(){
    if (viewMode() !== 'crate' || selectedIdx < 0) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const v = vinyls[selectedIdx];
    v.group.updateWorldMatrix(true, false);
    // Anchor just above the sleeve mouth (not the full disc height) so the
    // card stays on-screen; VinylInfoCard clamps the rest.
    const p = v.group.localToWorld(new THREE.Vector3(0, SLEEVE_H*0.62 + DISC_RISE*0.4, 0));
    const pr = p.project(camera);
    if (pr.z > 1) return null;
    const proj = PROJECTS[selectedIdx];
    return {
      index: selectedIdx,
      count: N,
      x: ( pr.x*0.5+0.5)*rect.width,
      y: (-pr.y*0.5+0.5)*rect.height,
      title: proj.title.replace('\n', ' '),
      category: proj.category,
      date: proj.date,
    };
  };

  // Arrow-browse bridge for the HUD: step the pulled record through the
  // stack. -1 = the record beneath (toward the viewer), +1 = the record
  // above (deeper into the bin). Clamped at both ends.
  window.__cockpitVinylSelect = function(delta){
    if (viewMode() !== 'crate' || selectedIdx < 0) return;
    const n = selectedIdx + delta;
    if (n >= 0 && n < N) selectedIdx = n;
  };

  // ── Per-frame animation ───────────────────────────────────────
  group.tick = function(dt){
    if (viewMode() !== 'crate'){
      hoveredIdx = -1;
      selectedIdx = -1;   // leaving the view slides any pulled record back
    }
    const active = selectedIdx;   // only a CLICKED record moves — hover never does

    // Crate-digging cascade: the hovered record AND every record in
    // front of it tip forward by the SAME angle. Equal rotations keep
    // the sleeves parallel, so they can translate/rotate without ever
    // interpenetrating — collision-safe by construction. Records behind
    // the hovered one stay leaned back against the stack.
    vinyls.forEach(v => {
      const d = v.data;
      const isHover = d.i === active;
      const inFrontBlock = active >= 0 && d.i < active;   // lower i = nearer the viewer
      const tiltTarget = (isHover || inFrontBlock) ? 1 : 0;
      const liftTarget = isHover ? 1 : 0;
      d.tilt  += (tiltTarget - d.tilt)  * Math.min(1, dt * 8);
      d.hover += (liftTarget - d.hover) * Math.min(1, dt * 8);
      d.disc  += (liftTarget - d.disc)  * Math.min(1, dt * 5);  // lags the sleeve — two-stage feel
      v.group.rotation.x = -LEAN + d.tilt * (LEAN + TILT);
      v.group.position.y = d.restY + d.hover * LIFT;
      v.group.position.z = d.restZ + d.hover * PUSH;
      v.disc.position.y = d.disc * DISC_RISE;
      if (d.disc > 0.02) v.disc.rotateY(dt * 1.4 * d.disc);   // lazy spin while exposed
    });

    // Jade normal pins = the hover highlight (records stay put until clicked).
    if (hoveredIdx >= 0) getPins(hoveredIdx);
    pinHelpers.forEach((h, i) => {
      const target = i === hoveredIdx ? 0.85 : 0;
      h.material.opacity += (target - h.material.opacity) * Math.min(1, dt * 10);
      h.visible = h.material.opacity > 0.02;
      if (h.visible) h.update();   // track the sleeve while it tilts/lifts
    });

    // Focus dim + hover halos. The pulled record stays lit; the rest of
    // the bin drops back. Halos glow on hover, faintly on the selection.
    dimT += (((selectedIdx >= 0) ? 1 : 0) - dimT) * Math.min(1, dt * 6);
    const dimScale = 1 - 0.6 * dimT;
    dimmables.forEach(({ m, base }) => m.color.copy(base).multiplyScalar(dimScale));
    vinyls.forEach(v => {
      const lit = v.data.i === selectedIdx;
      v.mats.forEach(({ m, base }) => m.color.copy(base).multiplyScalar(lit ? 1 : dimScale));
      const haloTarget = v.data.i === hoveredIdx ? 0.95 : (lit ? 0.4 : 0);
      v.halo.material.opacity += (haloTarget - v.halo.material.opacity) * Math.min(1, dt * 10);
    });
  };

  // Expose a disposer so GlobeCanvas can detach listeners on unmount.
  group.disposeCrate = function(){
    pinHelpers.forEach(h => { scene.remove(h); h.dispose?.(); });
    pinHelpers.clear();
    renderer.domElement.removeEventListener('pointermove', onPointerMove);
    renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
    renderer.domElement.removeEventListener('pointerdown', onPointerDown, true);
    window.__getCockpitCrateRect = null;
    window.__getCockpitVinylHover = null;
    window.__cockpitVinylSelect = null;
  };

  return group;
}
