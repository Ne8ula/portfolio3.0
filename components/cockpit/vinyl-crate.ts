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
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import type { RandomSource, RandomStream } from "@/lib/random/seeded-streams"
import { CURSOR_POINTER } from "./cursors"
import { getFrameTimes } from "./frame-times"
import { PALETTE, makeFrost } from "./materials"
import { makeDecal } from "./decals"
import { SLEEVES as PROJECTS } from "@/lib/projects/catalog"
import { makeDiscTexture } from "./project-textures"
import {
  computeSleeveClearRise,
  computeSleeveMouthGap,
  isAtSleeveClearWaypoint,
} from "./vinyl-motion"
import {
  beginVisualAsset,
  registerCrateActions,
  registerVinylSleeveProbe,
  reportCrateTransient,
  unregisterCrateActions,
  unregisterVinylSleeveProbe,
} from "./test-hooks"
import { registerPointerActivation } from "./pointer-activation"

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

const CRATE_OCTAGON_VERTEX_SCALE = 1 / Math.cos(Math.PI / 8);

const CRATE_RECORD_COUNT = PROJECTS.length;
const CRATE_SLEEVE_W = 0.95;
const CRATE_SLEEVE_H = 0.98;
const CRATE_SLEEVE_T = 0.045;
const CRATE_SPACING = 0.072;
const CRATE_PAD_FRONT = 0.10;
const CRATE_PAD_BACK = 0.18;
const CRATE_WALL_T = 0.075;
const CRATE_TALL_H = 1.02;
const CRATE_BACK_TAB_Y_OFFSET = 0.018;
const CRATE_BACK_TAB_HEIGHT = 0.05;
const CRATE_PLATE_Z_OFFSET = 0.013;
const CRATE_PLATE_FACE_Z_OFFSET = 0.013;
const CRATE_BASE_HEIGHT = 0.13;
const CRATE_BASE_Y = 0.03;
const CRATE_FLOOR_TOP = CRATE_BASE_Y + CRATE_BASE_HEIGHT + 0.008;
const CRATE_RECORDS_GROUP_Y = CRATE_FLOOR_TOP + 0.002;
const CRATE_DEPTH =
  (CRATE_RECORD_COUNT - 1) * CRATE_SPACING +
  CRATE_SLEEVE_T +
  CRATE_PAD_FRONT +
  CRATE_PAD_BACK;
const CRATE_WIDTH = CRATE_SLEEVE_W + 0.16;
const CRATE_OUTER_WIDTH = CRATE_WIDTH + CRATE_WALL_T * 2;
const CRATE_PLATE_FACE_Z =
  CRATE_DEPTH / 2 +
  CRATE_WALL_T +
  CRATE_PLATE_Z_OFFSET +
  CRATE_PLATE_FACE_Z_OFFSET;
const CRATE_LEAN = 0.10;
const CRATE_LIFT = 0.34;
const CRATE_PUSH = 0.04;
const CRATE_TILT = 0.14;
const CRATE_DISC_RADIUS = CRATE_SLEEVE_H * 0.46;
const CRATE_DISC_RISE = 0.52;
const CRATE_DISC_PADDING = 0.010;
const CRATE_DISC_CLEARANCE = 0.025;
const CRATE_DISC_CLEAR_RISE = computeSleeveClearRise({
  sleeveHeight: CRATE_SLEEVE_H,
  discRadius: CRATE_DISC_RADIUS,
  clearance: CRATE_DISC_CLEARANCE,
});
const CRATE_FRONT_RECORD_Z =
  CRATE_DEPTH / 2 - CRATE_PAD_FRONT - CRATE_SLEEVE_T / 2;
const CRATE_PULLED_BASE_Y =
  CRATE_RECORDS_GROUP_Y + CRATE_SLEEVE_H / 2 + CRATE_LIFT;
const CRATE_PULLED_BASE_Z = CRATE_FRONT_RECORD_Z + CRATE_PUSH;

export const VINYL_CRATE_FOCUS_AUTHORING = {
  recordCount: CRATE_RECORD_COUNT,
  sleeve: {
    width: CRATE_SLEEVE_W,
    height: CRATE_SLEEVE_H,
    thickness: CRATE_SLEEVE_T,
    spacing: CRATE_SPACING,
    lean: CRATE_LEAN,
    lift: CRATE_LIFT,
    push: CRATE_PUSH,
    tilt: CRATE_TILT,
  },
  shell: {
    interiorDepth: CRATE_DEPTH,
    interiorWidth: CRATE_WIDTH,
    wallThickness: CRATE_WALL_T,
    outerWidth: CRATE_OUTER_WIDTH,
    halfWidth: CRATE_OUTER_WIDTH / 2,
    halfDepth: CRATE_PLATE_FACE_Z,
    topY: CRATE_TALL_H + CRATE_BACK_TAB_Y_OFFSET + CRATE_BACK_TAB_HEIGHT / 2,
  },
  pulledSleeve: {
    topY: 1.54,
    topZ: 0.26,
    mouthY: 1.00,
    mouthZ: 0.30,
    baseY: CRATE_PULLED_BASE_Y,
    baseZ: CRATE_PULLED_BASE_Z,
  },
  disc: {
    radius: CRATE_DISC_RADIUS,
    padding: CRATE_DISC_PADDING,
    previewRise: CRATE_DISC_RISE,
    clearRise: CRATE_DISC_CLEAR_RISE,
    clearance: CRATE_DISC_CLEARANCE,
    minTilt: -CRATE_LEAN,
    maxTilt: CRATE_TILT,
  },
  center: { x: 0, y: 0.985, z: 0 },
  verticalBias: 1.8,
} as const;

const tiltedDiscOctagon = (tilt) => {
  const radius =
    (VINYL_CRATE_FOCUS_AUTHORING.disc.radius +
      VINYL_CRATE_FOCUS_AUTHORING.disc.padding) *
    CRATE_OCTAGON_VERTEX_SCALE;
  const cosTilt = Math.cos(tilt);
  const sinTilt = Math.sin(tilt);
  return Array.from({ length: 8 }, (_, index) => {
    const angle = Math.PI / 8 + index * Math.PI / 4;
    const planeY =
      VINYL_CRATE_FOCUS_AUTHORING.disc.previewRise +
      Math.sin(angle) * radius;
    return {
      x: Math.cos(angle) * radius,
      y: VINYL_CRATE_FOCUS_AUTHORING.pulledSleeve.baseY + cosTilt * planeY,
      z: VINYL_CRATE_FOCUS_AUTHORING.pulledSleeve.baseZ + sinTilt * planeY,
    };
  });
};

const crateShellPoints = [
  ...[-1, 1].flatMap((xSign) =>
    [-1, 1].map((zSign) => ({
      x: xSign * VINYL_CRATE_FOCUS_AUTHORING.shell.halfWidth,
      y: VINYL_CRATE_FOCUS_AUTHORING.shell.topY,
      z: zSign * VINYL_CRATE_FOCUS_AUTHORING.shell.halfDepth,
    })),
  ),
  ...[-1, 1].flatMap((xSign) =>
    [-1, 1].map((zSign) => ({
      x: xSign * VINYL_CRATE_FOCUS_AUTHORING.shell.halfWidth,
      y: 0,
      z: zSign * VINYL_CRATE_FOCUS_AUTHORING.shell.halfDepth,
    })),
  ),
];
const crateSleevePoints = [
  {
    x: -CRATE_SLEEVE_W / 2,
    y: VINYL_CRATE_FOCUS_AUTHORING.pulledSleeve.topY,
    z: VINYL_CRATE_FOCUS_AUTHORING.pulledSleeve.topZ,
  },
  {
    x: CRATE_SLEEVE_W / 2,
    y: VINYL_CRATE_FOCUS_AUTHORING.pulledSleeve.topY,
    z: VINYL_CRATE_FOCUS_AUTHORING.pulledSleeve.topZ,
  },
  {
    x: -CRATE_SLEEVE_W / 2,
    y: VINYL_CRATE_FOCUS_AUTHORING.pulledSleeve.mouthY,
    z: VINYL_CRATE_FOCUS_AUTHORING.pulledSleeve.mouthZ,
  },
  {
    x: CRATE_SLEEVE_W / 2,
    y: VINYL_CRATE_FOCUS_AUTHORING.pulledSleeve.mouthY,
    z: VINYL_CRATE_FOCUS_AUTHORING.pulledSleeve.mouthZ,
  },
];

export const VINYL_CRATE_FOCUS_POINTS_LOCAL = [
  ...crateShellPoints,
  ...crateSleevePoints,
  ...tiltedDiscOctagon(VINYL_CRATE_FOCUS_AUTHORING.disc.minTilt),
  ...tiltedDiscOctagon(VINYL_CRATE_FOCUS_AUTHORING.disc.maxTilt),
] as const;

const finiteFocusVector = (vector) =>
  Number.isFinite(vector.x) &&
  Number.isFinite(vector.y) &&
  Number.isFinite(vector.z);
const hasFrameableScale = (scale) =>
  finiteFocusVector(scale) &&
  scale.x !== 0 &&
  scale.y !== 0 &&
  scale.z !== 0;

function makeCoverTexture(i, random: RandomStream){
  const { bg, accent, text, title, category, date, cover } = PROJECTS[i];
  const SIZE = 512;
  const c = document.createElement('canvas');
  c.width = SIZE; c.height = SIZE;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);
  for (let k = 0; k < 800; k++){
    ctx.fillStyle = `rgba(0,0,0,${random.next()*0.04})`;
    ctx.fillRect(random.next()*SIZE, random.next()*SIZE, 1, 1);
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

  // Real thumbnail (public/vinyl-covers): the generated motif above shows
  // instantly, then the photo repaints over it — full-bleed cover crop
  // with an ink label strip so the title stays readable on any art.
  if (cover){
    const finishAsset = beginVisualAsset();
    const img = new Image();
    img.onload = () => {
      const s = Math.max(SIZE / img.width, SIZE / img.height);
      const w = img.width * s, h = img.height * s;
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
      ctx.fillStyle = 'rgba(20,17,15,0.8)';
      ctx.fillRect(0, SIZE - 108, SIZE, 108);
      ctx.fillStyle = '#F0EBE1';
      ctx.font = 'bold 34px "Cormorant Garamond", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(title.replace('\n', ' '), SIZE/2, SIZE - 62);
      ctx.fillStyle = '#7A9A7E';
      ctx.font = '600 13px "JetBrains Mono", monospace';
      ctx.fillText(`${category.toUpperCase()} · ${date}`, SIZE/2, SIZE - 30);
      ctx.fillStyle = 'rgba(20,17,15,0.8)';
      ctx.fillRect(24, 24, 64, 30);
      ctx.fillStyle = '#F0EBE1';
      ctx.font = '600 13px "JetBrains Mono", monospace';
      ctx.fillText(`№ ${String(i+1).padStart(2,'0')}`, 56, 44);
      ctx.strokeStyle = 'rgba(240,235,225,0.5)';
      ctx.lineWidth = 3;
      ctx.strokeRect(6, 6, SIZE - 12, SIZE - 12);
      tex.needsUpdate = true;
      finishAsset();
    };
    img.onerror = () => finishAsset(true);
    img.src = cover;
  }
  return tex;
}

// Top-edge strip — the sliver you read while digging through the bin.
function makeTopEdgeTexture(i, random: RandomStream){
  const { bg, accent, text, title } = PROJECTS[i];
  const W = 512, H = 64;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  for (let k = 0; k < 80; k++){
    ctx.fillStyle = `rgba(0,0,0,${random.next()*0.08})`;
    ctx.fillRect(random.next()*W, random.next()*H, 2 + random.next()*6, 1);
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

type VinylCrateBuildOptions = {
  readonly randomSource: RandomSource
  readonly restore?: unknown
}

export function buildVinylCrate(
  scene,
  tableGroup,
  camera,
  renderer,
  options: VinylCrateBuildOptions,
){
  const coverGrainRandom = options.randomSource.stream('vinyl-crate/cover-grain');
  const edgeWearRandom = options.randomSource.stream('vinyl-crate/edge-wear');
  const group = new THREE.Group();
  tableGroup.add(group);

  // ── Record + crate dimensions ─────────────────────────────────
  // Records stack along Z (front-to-back, covers facing +Z / the
  // viewer). The crate interior depth is derived from the record count;
  // wall heights follow the reference renders: tall back + sides, a
  // stepped-down section over the front opening, thin full-height
  // corner posts at the very front, all on an off-white base band.
  const N = VINYL_CRATE_FOCUS_AUTHORING.recordCount;
  const restore = options.restore;
  const restoredIndex = Number.isInteger(restore?.recordIndex)
    && restore.recordIndex >= 0
    && restore.recordIndex < N
    ? restore.recordIndex
    : -1;
  const SLEEVE_W = VINYL_CRATE_FOCUS_AUTHORING.sleeve.width;
  const SLEEVE_H = VINYL_CRATE_FOCUS_AUTHORING.sleeve.height;
  const SLEEVE_T = VINYL_CRATE_FOCUS_AUTHORING.sleeve.thickness;
  const SPACING = VINYL_CRATE_FOCUS_AUTHORING.sleeve.spacing;
  const LEAN = VINYL_CRATE_FOCUS_AUTHORING.sleeve.lean;

  const PAD_FRONT = CRATE_PAD_FRONT;
  const CRATE_D = VINYL_CRATE_FOCUS_AUTHORING.shell.interiorDepth;
  const CRATE_W = VINYL_CRATE_FOCUS_AUTHORING.shell.interiorWidth;
  const WALL_T = VINYL_CRATE_FOCUS_AUTHORING.shell.wallThickness;

  const BASE_H = CRATE_BASE_HEIGHT;  // off-white base band height
  const BASE_Y0 = CRATE_BASE_Y;  // band floats on the feet
  const WALL_Y0   = BASE_Y0 + BASE_H - 0.01;  // walls sink 10mm into the band (no gap, no coplanar seam)
  const TALL_H = CRATE_TALL_H;  // back + rear-side wall top (from crate bottom)
  const FRONT_TOP = 0.60;  // front wall + stepped side section top
  const NOTCH_D   = 0.34;  // depth of the stepped-down side section, from the front face
  const FLOOR_TOP = CRATE_FLOOR_TOP; // interior tray plate top

  // Pull-out motion targets. Mostly RISE, little tilt: under the steep
  // top-down crate camera, a record tipping toward the lens picks up ugly
  // wide-angle foreshortening (worst for the front rows) — rising reads clean.
  const LIFT = VINYL_CRATE_FOCUS_AUTHORING.sleeve.lift;
  const PUSH = VINYL_CRATE_FOCUS_AUTHORING.sleeve.push;
  const TILT = VINYL_CRATE_FOCUS_AUTHORING.sleeve.tilt;
  const DISC_RADIUS = VINYL_CRATE_FOCUS_AUTHORING.disc.radius;
  const DISC_RISE = VINYL_CRATE_FOCUS_AUTHORING.disc.previewRise;
  const DISC_CLEARANCE = VINYL_CRATE_FOCUS_AUTHORING.disc.clearance;
  const DISC_CLEAR_RISE = VINYL_CRATE_FOCUS_AUTHORING.disc.clearRise;
  const DISC_CLEAR_PROGRESS = DISC_CLEAR_RISE / DISC_RISE;

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
  shell(new RoundedBoxGeometry(
    0.16,
    CRATE_BACK_TAB_HEIGHT,
    WALL_T + 0.006,
    2,
    0.012,
  ), wallMat, 0, TALL_H + CRATE_BACK_TAB_Y_OFFSET, -(CRATE_D/2 + WALL_T/2));

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
  const plateZ = CRATE_D/2 + WALL_T + CRATE_PLATE_Z_OFFSET;
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
  const plateFaceZ = plateZ + CRATE_PLATE_FACE_Z_OFFSET;
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

  // ── Records ───────────────────────────────────────────────────
  const recordsGroup = new THREE.Group();
  recordsGroup.position.set(0, CRATE_RECORDS_GROUP_Y, 0);
  recordsGroup.userData.noGlow = true;   // edge-glow traces the shell only — 15 outlined sleeves read as noise
  group.add(recordsGroup);

  const haloTex = makeHaloTexture();
  const vinyls = [];
  const frontZ = CRATE_D/2 - PAD_FRONT - SLEEVE_T/2;
  const SLEEVE_PANEL_T = 0.006;
  const SLEEVE_INNER_GAP = computeSleeveMouthGap(
    SLEEVE_T,
    SLEEVE_PANEL_T,
  );
  const SLEEVE_SEAM_W = 0.012;
  const SLEEVE_SEAM_H = 0.012;
  const SLEEVE_PANEL_Z = (SLEEVE_T - SLEEVE_PANEL_T) / 2;

  for (let i = 0; i < N; i++){
    const vinyl = new THREE.Group();
    const restZ = frontZ - i * SPACING;   // i=0 nearest the viewer
    const restY = SLEEVE_H/2;
    vinyl.position.set(0, restY, restZ);
    vinyl.rotation.x = -LEAN;
    vinyl.userData = { i, restY, restZ, hover: 0, disc: 0, tilt: 0 };

    const coverTex = makeCoverTexture(i, coverGrainRandom);
    const topTex = makeTopEdgeTexture(i, edgeWearRandom);
    const edgeCol = new THREE.MeshLambertMaterial({ color: PROJECTS[i].bg });
    const coverMat = new THREE.MeshLambertMaterial({ map: coverTex });
    const topMat = new THREE.MeshLambertMaterial({
      map: topTex,
      side: THREE.DoubleSide,
    });
    // Open paper jacket: separate front/back boards plus side and bottom
    // seams. The former BoxGeometry top cap is intentionally absent, leaving
    // an actual gap wider than the 0.02-thick disc.
    const frontGeometry = new THREE.BoxGeometry(
      SLEEVE_W,
      SLEEVE_H,
      SLEEVE_PANEL_T,
    ).translate(0, 0, SLEEVE_PANEL_Z);
    const sleeveShellGeometry = mergeGeometries([
      new THREE.BoxGeometry(
        SLEEVE_W,
        SLEEVE_H,
        SLEEVE_PANEL_T,
      ).translate(0, 0, -SLEEVE_PANEL_Z),
      new THREE.BoxGeometry(
        SLEEVE_SEAM_W,
        SLEEVE_H,
        SLEEVE_INNER_GAP,
      ).translate(
        -SLEEVE_W / 2 + SLEEVE_SEAM_W / 2,
        0,
        0,
      ),
      new THREE.BoxGeometry(
        SLEEVE_SEAM_W,
        SLEEVE_H,
        SLEEVE_INNER_GAP,
      ).translate(
        SLEEVE_W / 2 - SLEEVE_SEAM_W / 2,
        0,
        0,
      ),
      new THREE.BoxGeometry(
        SLEEVE_W - SLEEVE_SEAM_W * 2,
        SLEEVE_SEAM_H,
        SLEEVE_INNER_GAP,
      ).translate(
        0,
        -SLEEVE_H / 2 + SLEEVE_SEAM_H / 2,
        0,
      ),
    ]);

    // Preserve the readable top-edge title as a raised rear registration
    // lip. It sits behind the open mouth instead of sealing it.
    const rearLipGeometry = new THREE.PlaneGeometry(
      SLEEVE_W * 0.92,
      0.06,
    ).translate(
      0,
      SLEEVE_H / 2 + 0.025,
      -SLEEVE_PANEL_Z - SLEEVE_PANEL_T / 2 - 0.001,
    );
    // The cover board, U-shell, and rear lip share one mesh with three
    // material groups. This is fewer sleeve draw calls than the former
    // closed six-face box while preserving the physical opening.
    const sleeve = new THREE.Mesh(
      mergeGeometries(
        [frontGeometry, sleeveShellGeometry, rearLipGeometry],
        true,
      ),
      [coverMat, edgeCol, topMat],
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
      new THREE.CylinderGeometry(DISC_RADIUS, DISC_RADIUS, 0.02, 40),
      // Clearcoat = pressed-vinyl gloss; the matte cardboard sleeves stay Lambert.
      new THREE.MeshPhysicalMaterial({ map: makeDiscTexture(i), roughness: 0.55, clearcoat: 1, clearcoatRoughness: 0.18 })
    );
    disc.rotation.x = Math.PI/2;   // face the viewer (+Z)
    disc.position.set(0, 0, 0);
    vinyl.add(disc);

    recordsGroup.add(vinyl);
    vinyls.push({ group: vinyl, sleeve, disc, halo, data: vinyl.userData });
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
  let selectedIdx = (restore?.viewMode === 'crate' || restore?.viewMode === 'deck')
    ? restoredIndex
    : -1;
  let hoverCrate = false;   // cockpit-view hover (for HUD brackets)

  const sleevePickables = vinyls.map(v => v.sleeve);
  const viewMode = () => window.__cockpitViewMode || 'cockpit';

  // ── Deck hand-off ─────────────────────────────────────────────
  // Clicking a record in the crate no longer just pulls it out — the disc
  // flies to the turntable (window.__cockpitDeck, owned by turntable.ts)
  // and the deck projects the holographic PROJECT INFO card. The crate
  // keeps owning SELECTION (sleeve tip animation + ◄/► stepping); the deck
  // owns the flight, platter, beam and card. Live world-position getters
  // are passed so flights track the sleeves while they animate.
  let deckOut = restore?.viewMode === 'deck' && restoredIndex >= 0;
  let returning = false;   // fly-back in progress after leaving deck view
  let insertingIdx = -1;   // returned disc lowering vertically into its mouth
  let returnInsertionObserved = false;
  let returnStartedAtClearWaypoint = false;
  if (selectedIdx >= 0) {
    vinyls.forEach((vinyl) => {
      const selected = vinyl.data.i === selectedIdx;
      const inFront = vinyl.data.i < selectedIdx;
      vinyl.data.tilt = selected || inFront ? 1 : 0;
      vinyl.data.hover = selected ? 1 : 0;
      vinyl.data.disc = selected ? 1 : 0;
      vinyl.group.rotation.x = -LEAN + vinyl.data.tilt * (LEAN + TILT);
      vinyl.group.position.y = vinyl.data.restY + vinyl.data.hover * LIFT;
      vinyl.group.position.z = vinyl.data.restZ + vinyl.data.hover * PUSH;
      vinyl.disc.position.y = vinyl.data.disc * DISC_RISE;
    });
    if (deckOut) vinyls[selectedIdx].disc.visible = false;
  }
  const deck = () => window.__cockpitDeck;
  const discWorldPos  = (i) => () => vinyls[i].disc.getWorldPosition(new THREE.Vector3());
  const discWorldClearPos = (i) => {
    const point = new THREE.Vector3();
    return () => vinyls[i].group.localToWorld(
      point.set(0, DISC_CLEAR_RISE, 0),
    );
  };
  const discWorldQuat = (i) => () => vinyls[i].disc.getWorldQuaternion(new THREE.Quaternion());
  const discWorldRadius = (i) => () =>
    DISC_RADIUS * (vinyls[i].disc.getWorldScale(new THREE.Vector3()).x || 1);
  const discTexture = (i) => vinyls[i].disc.material.map;

  const sendToDeck = (idx) => {
    const d = deck();
    if (!d) return false;
    selectedIdx = idx;
    deckOut = true;
    d.play({
      index: idx,
      from: discWorldPos(idx),
      fromClear: discWorldClearPos(idx),
      fromQuat: discWorldQuat(idx),
      fromRadius: discWorldRadius(idx),
      clearance: DISC_CLEARANCE,
      openSleeve: true,
      texture: discTexture(idx),
      onDepart: () => { vinyls[idx].disc.visible = false; },
    });
    return true;
  };

  // §9.6.1 test bridge: the same record→deck flow a crate click drives,
  // exposed to __COCKPIT_TEST_HOOKS__.playRecord, plus a deterministic
  // crate SELECTION (the legacy pull-out state — selectedIdx with no deck
  // flight) for the Phase −1 entrance assertion. No-ops in production.
  registerCrateActions({
    playRecord: (idx) => {
      if (idx < 0 || idx >= vinyls.length) return false;
      const d = deck();
      if (!d || d.busy || returning) return false;
      if (viewMode() !== 'crate') return false;
      const ok = sendToDeck(idx);
      if (ok && window.__setCockpitViewMode) window.__setCockpitViewMode('deck');
      return ok;
    },
    selectRecord: (idx) => {
      if (idx < 0 || idx >= vinyls.length) return false;
      if (viewMode() !== 'crate') return false;
      if (deckOut || returning) return false;
      selectedIdx = idx;
      return true;
    },
  });
  registerVinylSleeveProbe(() => {
    const activeIndex =
      insertingIdx >= 0 ? insertingIdx : selectedIdx;
    const activeVinyl =
      activeIndex >= 0 ? vinyls[activeIndex] : null;
    const activeRise = activeVinyl
      ? activeVinyl.data.disc * DISC_RISE
      : 0;
    let phase = 'idle';
    if (insertingIdx >= 0) phase = 'inserting';
    else if (returning) phase = 'returning';
    else if (deckOut && deck()?.busy) phase = 'departing';
    else if (selectedIdx >= 0) phase = 'preview';
    return {
      phase,
      activeIndex,
      openMouth: true,
      mouthGap: SLEEVE_INNER_GAP,
      sleeveTopY: SLEEVE_H / 2,
      discRadius: DISC_RADIUS,
      previewRise: DISC_RISE,
      clearRise: DISC_CLEAR_RISE,
      clearanceMargin: DISC_CLEARANCE,
      activeRise,
      discBottomClearance:
        activeRise - DISC_RADIUS - SLEEVE_H / 2,
      returnInsertionObserved,
      returnStartedAtClearWaypoint,
    };
  });

  const recallFromDeck = (idx, onDone) => {
    const d = deck();
    if (!d){ if (idx >= 0) vinyls[idx].disc.visible = true; if (onDone) onDone(); return; }
    d.eject({
      to: discWorldClearPos(idx),
      toQuat: discWorldQuat(idx),
      toRadius: discWorldRadius(idx),
      clearance: DISC_CLEARANCE,
      openSleeve: true,
      onArrive: () => {
        if (idx >= 0){
          const vinyl = vinyls[idx];
          vinyl.data.disc = DISC_CLEAR_PROGRESS;
          vinyl.disc.position.y = DISC_CLEAR_RISE;
          vinyl.disc.visible = true;
          insertingIdx = idx;
          returnInsertionObserved = true;
          returnStartedAtClearWaypoint = isAtSleeveClearWaypoint(
            vinyl.data.disc * DISC_RISE,
            DISC_CLEAR_RISE,
          );
        }
        if (onDone) onDone();
      },
    });
  };

  // Leaving the deck view (Esc / click-away) flies the record home, then
  // slides the sleeve back into the bin.
  const onViewModeChange = (e) => {
    const m = e.detail && e.detail.mode;
    if (deckOut && m !== 'deck'){
      const old = selectedIdx;
      deckOut = false;
      returning = true;
      recallFromDeck(old, () => { returning = false; selectedIdx = -1; });
    }
  };
  window.addEventListener('cockpit-view-mode', onViewModeChange);

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
  const unregisterCrateActivation = registerPointerActivation(
    renderer.domElement,
    {
      owner: 'crate',
      hitTest: (point) => {
        const mode = viewMode();
        if (mode === 'cockpit') {
          return pickCrate(point) ? { key: 'crate-entry' } : null;
        }
        if (mode !== 'crate') return null;
        const index = pickVinyl(point);
        if (index >= 0) return { key: 'crate-sleeve', index };
        return pickCrate(point) ? null : { key: 'crate-click-away' };
      },
      action: (hit) => {
        if (hit.key === 'crate-entry') {
          window.__setCockpitViewMode?.('crate');
          return;
        }
        if (hit.key === 'crate-sleeve') {
          const idx = hit.index;
          // Click sends the record to the turntable: the sleeve tips out,
          // the disc rises and flies to the platter (deck view). Falls back
          // to the old pull-out toggle if the deck isn't available.
          if (deck() && !deck().busy){
            if (sendToDeck(idx) && window.__setCockpitViewMode) window.__setCockpitViewMode('deck');
          } else if (!deck()){
            selectedIdx = (selectedIdx === idx) ? -1 : idx;
          }
          return;
        }
        // Empty space: first click puts a pulled record back; with nothing
        // pulled, it returns to the cockpit.
        if (selectedIdx >= 0) selectedIdx = -1;
        else window.__setCockpitViewMode?.('cockpit');
      },
    },
  );

  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerleave', onPointerLeave);

  // ── Camera-focus target for GlobeCanvas ('crate' view mode) ───
  const crateFocusCenter = new THREE.Vector3();
  const crateFocusQuaternion = new THREE.Quaternion();
  const crateFocusOutward = new THREE.Vector3();
  const crateFocusWorldScale = new THREE.Vector3();
  const crateFocusPoints = VINYL_CRATE_FOCUS_POINTS_LOCAL.map(
    () => new THREE.Vector3(),
  );
  const crateFocusTarget = {
    center: crateFocusCenter,
    outward: crateFocusOutward,
    verticalBias: VINYL_CRATE_FOCUS_AUTHORING.verticalBias,
    framingPoints: crateFocusPoints,
  };
  group.getFocusTarget = function(){
    group.updateWorldMatrix(true, false);
    crateFocusCenter
      .set(
        VINYL_CRATE_FOCUS_AUTHORING.center.x,
        VINYL_CRATE_FOCUS_AUTHORING.center.y,
        VINYL_CRATE_FOCUS_AUTHORING.center.z,
      )
      .applyMatrix4(group.matrixWorld);
    group.getWorldQuaternion(crateFocusQuaternion);
    crateFocusOutward
      .set(0, 0, 1)
      .applyQuaternion(crateFocusQuaternion)
      .normalize();
    for (let index = 0; index < VINYL_CRATE_FOCUS_POINTS_LOCAL.length; index += 1){
      const local = VINYL_CRATE_FOCUS_POINTS_LOCAL[index];
      crateFocusPoints[index]
        .set(local.x, local.y, local.z)
        .applyMatrix4(group.matrixWorld);
      if (!finiteFocusVector(crateFocusPoints[index])) return null;
    }
    group.getWorldScale(crateFocusWorldScale);
    if (
      !finiteFocusVector(crateFocusCenter) ||
      !finiteFocusVector(crateFocusOutward) ||
      !hasFrameableScale(crateFocusWorldScale) ||
      crateFocusOutward.lengthSq() === 0 ||
      crateFocusPoints.length === 0 ||
      !Number.isFinite(crateFocusTarget.verticalBias)
    ) return null;
    return crateFocusTarget;
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
  const hudBounds = Array.from({ length: 8 }, () => new THREE.Vector3());
  group.getSubjectBoundsWorld = function(){
    const bbox = new THREE.Box3().setFromObject(group);
    if (bbox.isEmpty()) return null;
    let index = 0;
    for (let xi = 0; xi < 2; xi++) {
      for (let yi = 0; yi < 2; yi++) {
        for (let zi = 0; zi < 2; zi++) {
          hudBounds[index++].set(
            xi ? bbox.max.x : bbox.min.x,
            yi ? bbox.max.y : bbox.min.y,
            zi ? bbox.max.z : bbox.min.z,
          );
        }
      }
    }
    return hudBounds;
  };
  const hudSelectionAnchor = new THREE.Vector3();
  group.getHudSelection = function(){
    if (viewMode() !== 'crate' || selectedIdx < 0) return null;
    const vinyl = vinyls[selectedIdx];
    vinyl.group.updateWorldMatrix(true, false);
    hudSelectionAnchor
      .set(0, SLEEVE_H * 0.62 + DISC_RISE * 0.4, 0)
      .applyMatrix4(vinyl.group.matrixWorld);
    const project = PROJECTS[selectedIdx];
    return {
      index: selectedIdx,
      count: N,
      anchorWorld: hudSelectionAnchor,
      title: project.title.replace('\n', ' '),
      category: project.category,
      date: project.date,
    };
  };

  // Arrow-browse bridge for the HUD: step the selected record through the
  // stack. -1 = the record beneath (toward the viewer), +1 = the record
  // above (deeper into the bin). Clamped at both ends. In deck view a step
  // swaps the playing record: the old disc flies home while the new sleeve
  // tips out and its disc flies onto the platter.
  window.__cockpitVinylSelect = function(delta){
    const mode = viewMode();
    if (selectedIdx < 0) return;
    const n = selectedIdx + delta;
    if (n < 0 || n >= N) return;
    if (mode === 'deck'){
      const d = deck();
      if (!d || d.busy || !deckOut) return;
      const old = selectedIdx;
      selectedIdx = n;
      recallFromDeck(old);
      d.play({
        index: n,
        from: discWorldPos(n),
        fromClear: discWorldClearPos(n),
        fromQuat: discWorldQuat(n),
        fromRadius: discWorldRadius(n),
        clearance: DISC_CLEARANCE,
        openSleeve: true,
        texture: discTexture(n),
        onDepart: () => { vinyls[n].disc.visible = false; },
      });
    } else if (mode === 'crate'){
      selectedIdx = n;
    }
  };

  // ── Per-frame animation ───────────────────────────────────────
  group.tick = function(dt){
    const { captureActive, dtAmbient } = getFrameTimes();
    let captureTransient = false;
    const snapCompleted = (value, target) =>
      captureActive && Math.abs(target - value) <= 0.02 ? target : value;
    const trackCaptureEasing = (value, target) => {
      if (captureActive && value !== target) captureTransient = true;
    };
    const mode = viewMode();
    if (mode !== 'crate') hoveredIdx = -1;
    // Leaving the crate slides any pulled record back — EXCEPT while it's
    // out on the deck (deck view) or mid-flight home (returning), where
    // the sleeve must stay tipped until the disc lands back in it.
    if (mode !== 'crate' && mode !== 'deck' && !deckOut && !returning){
      selectedIdx = -1;
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
      const discTarget = d.i === insertingIdx ? 0 : liftTarget;
      d.disc  += (discTarget - d.disc)  * Math.min(1, dt * 5);
      d.tilt = snapCompleted(d.tilt, tiltTarget);
      d.hover = snapCompleted(d.hover, liftTarget);
      d.disc = snapCompleted(d.disc, discTarget);
      trackCaptureEasing(d.tilt, tiltTarget);
      trackCaptureEasing(d.hover, liftTarget);
      trackCaptureEasing(d.disc, discTarget);
      v.group.rotation.x = -LEAN + d.tilt * (LEAN + TILT);
      v.group.position.y = d.restY + d.hover * LIFT;
      v.group.position.z = d.restZ + d.hover * PUSH;
      v.disc.position.y = d.disc * DISC_RISE;
      if (d.disc > 0.02) {
        v.disc.rotateY(dtAmbient * 1.4 * Math.min(1, d.disc));
      }
    });
    if (
      insertingIdx >= 0
      && vinyls[insertingIdx].data.disc < 0.01
    ){
      vinyls[insertingIdx].data.disc = 0;
      vinyls[insertingIdx].disc.position.y = 0;
      insertingIdx = -1;
    }

    // Jade normal pins = the hover highlight (records stay put until clicked).
    if (hoveredIdx >= 0) getPins(hoveredIdx);
    pinHelpers.forEach((h, i) => {
      const target = i === hoveredIdx ? 0.85 : 0;
      h.material.opacity += (target - h.material.opacity) * Math.min(1, dt * 10);
      h.material.opacity = snapCompleted(h.material.opacity, target);
      trackCaptureEasing(h.material.opacity, target);
      h.visible = h.material.opacity > 0.02;
      if (h.visible) h.update();   // track the sleeve while it tilts/lifts
    });

    // Hover halos — the bin keeps its full color while a record is
    // pulled/playing (no focus dim); the selection just gets a faint halo.
    vinyls.forEach(v => {
      const lit = v.data.i === selectedIdx;
      const haloTarget = v.data.i === hoveredIdx ? 0.95 : (lit ? 0.4 : 0);
      v.halo.material.opacity += (haloTarget - v.halo.material.opacity) * Math.min(1, dt * 10);
      v.halo.material.opacity = snapCompleted(v.halo.material.opacity, haloTarget);
      trackCaptureEasing(v.halo.material.opacity, haloTarget);
    });
    reportCrateTransient(captureActive && captureTransient);
  };

  // Expose a disposer so GlobeCanvas can detach listeners on unmount.
  group.disposeCrate = function(){
    pinHelpers.forEach(h => { scene.remove(h); h.dispose?.(); });
    pinHelpers.clear();
    renderer.domElement.removeEventListener('pointermove', onPointerMove);
    renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
    unregisterCrateActivation();
    window.removeEventListener('cockpit-view-mode', onViewModeChange);
    window.__getCockpitCrateRect = null;
    window.__getCockpitVinylHover = null;
    window.__cockpitVinylSelect = null;
    unregisterCrateActions();
    unregisterVinylSleeveProbe();
    reportCrateTransient(false);
  };

  return group;
}
