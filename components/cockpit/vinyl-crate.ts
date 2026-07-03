// @ts-nocheck
// VinylCrate — a 3D wooden record bin that sits on the cockpit desk.
// Records are stacked front-to-back (covers facing the viewer) and packed
// tightly like a real crate-digging bin; the crate is sized exactly to the
// number of PROJECTS. Interactions:
//   • cockpit view: hovering the crate shows a cursor + HUD brackets
//     (via the 'cockpit-crate-hover' event); clicking it asks GlobeCanvas
//     to focus the camera on the crate (view mode 'crate').
//   • crate view: hovering a record lifts+tips the sleeve toward the
//     camera while the black disc slides up out of the sleeve mouth.
//     Hover data (title/date/category + screen position) is exposed via
//     window.__getCockpitVinylHover() for the HUD info card.
//     Clicking empty space returns to the cockpit view.
import * as THREE from "three"
import { CURSOR_POINTER } from "./cursors"

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

export function buildVinylCrate(scene, tableGroup, camera, renderer){
  const group = new THREE.Group();
  tableGroup.add(group);

  // ── Record + crate dimensions ─────────────────────────────────
  // Records stack along Z (front-to-back, covers facing +Z / the
  // viewer). The crate interior is derived from the record count so
  // the bin always fits its contents exactly.
  const N = PROJECTS.length;
  const SLEEVE_W = 0.95;   // cover width  (X)
  const SLEEVE_H = 0.98;   // cover height (Y)
  const SLEEVE_T = 0.045;  // sleeve thickness (Z) — real-LP proportion
  const SPACING  = 0.072;  // Z stride between sleeves — packed like a real bin
  const LEAN     = 0.10;   // uniform backward lean (rad)

  const PAD_FRONT = 0.10;
  const PAD_BACK  = 0.18;  // extra room for the lean
  // Interior derived from the record count; with real-LP sleeve
  // proportions this lands close to square (a normal milk-crate bin).
  const CRATE_D = (N - 1) * SPACING + SLEEVE_T + PAD_FRONT + PAD_BACK; // interior depth (Z)
  const CRATE_W = SLEEVE_W + 0.16;                                     // interior width (X)
  const WALL_T  = 0.09;
  const SIDE_H  = 0.60;
  const BACK_H  = 0.74;
  const FRONT_H = 0.42;

  // Hover motion targets
  const LIFT      = 0.22;  // sleeve rise
  const PUSH      = 0.10;  // sleeve toward viewer
  const TILT      = 0.30;  // sleeve tips toward viewer (rad, from vertical)
  const DISC_RISE = 0.52;  // disc slides out of the sleeve mouth

  const baseX = -3.4, baseY = 0.18, baseZ = 0.6;
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

  const woodMat = new THREE.MeshLambertMaterial({ color: 0xB69A74 });
  const woodDarkMat = new THREE.MeshLambertMaterial({ color: 0x7A5F42 });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x55412A, transparent:true, opacity:0.85 });
  const floorMat = new THREE.MeshLambertMaterial({ color: 0x8A6D4C });

  const crateMeshes = [];  // walls + floor — raycast targets for "clicked the crate"
  const addEdges = (mesh) => {
    const seg = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), edgeMat);
    seg.position.copy(mesh.position);
    seg.rotation.copy(mesh.rotation);
    group.add(seg);
  };

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(CRATE_W + WALL_T*2, WALL_T, CRATE_D + WALL_T*2),
    floorMat
  );
  floor.position.y = WALL_T/2;
  group.add(floor); addEdges(floor); crateMeshes.push(floor);

  // Side walls (run along Z) with handle holes
  [-1, 1].forEach(s => {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(WALL_T, SIDE_H, CRATE_D + WALL_T*2),
      woodMat
    );
    wall.position.set(s * (CRATE_W/2 + WALL_T/2), SIDE_H/2 + WALL_T, 0);
    group.add(wall); addEdges(wall); crateMeshes.push(wall);
    const hole = new THREE.Mesh(
      new THREE.TorusGeometry(0.10, 0.03, 6, 16),
      woodDarkMat
    );
    hole.position.set(s * (CRATE_W/2 + WALL_T/2 + 0.001), SIDE_H*0.68 + WALL_T, 0);
    hole.rotation.y = Math.PI/2;
    group.add(hole);
  });

  // Back wall — tall (records lean against it)
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(CRATE_W, BACK_H, WALL_T),
    woodMat
  );
  backWall.position.set(0, BACK_H/2 + WALL_T, -CRATE_D/2 - WALL_T/2);
  group.add(backWall); addEdges(backWall); crateMeshes.push(backWall);

  // Front wall — low, so covers peek over it. Carries the bin label.
  const frontWall = new THREE.Mesh(
    new THREE.BoxGeometry(CRATE_W, FRONT_H, WALL_T),
    woodMat
  );
  frontWall.position.set(0, FRONT_H/2 + WALL_T, CRATE_D/2 + WALL_T/2);
  group.add(frontWall); addEdges(frontWall); crateMeshes.push(frontWall);

  const labelC = document.createElement('canvas');
  labelC.width = 512; labelC.height = 96;
  const lctx = labelC.getContext('2d');
  lctx.fillStyle = '#F0EBE1';
  lctx.fillRect(0, 0, 512, 96);
  lctx.strokeStyle = '#55412A';
  lctx.lineWidth = 3;
  lctx.strokeRect(6, 6, 500, 84);
  lctx.fillStyle = '#1E1C1A';
  lctx.font = '600 30px "JetBrains Mono", monospace';
  lctx.textAlign = 'center';
  lctx.textBaseline = 'middle';
  lctx.fillText(`ARCHIVE · ${N} PROJECTS`, 256, 48);
  const labelTex = new THREE.CanvasTexture(labelC);
  const labelPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 0.18),
    new THREE.MeshBasicMaterial({ map: labelTex })
  );
  labelPlane.position.set(0, FRONT_H*0.55 + WALL_T, CRATE_D/2 + WALL_T + 0.002);
  group.add(labelPlane);

  // ── Records ───────────────────────────────────────────────────
  const recordsGroup = new THREE.Group();
  recordsGroup.position.set(0, WALL_T, 0);
  group.add(recordsGroup);

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

    // Disc — hidden inside the sleeve at rest, slides up +Y on hover.
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(SLEEVE_H*0.46, SLEEVE_H*0.46, 0.02, 40),
      new THREE.MeshLambertMaterial({ map: makeDiscTexture(i) })
    );
    disc.rotation.x = Math.PI/2;   // face the viewer (+Z)
    disc.position.set(0, 0, 0);
    vinyl.add(disc);

    recordsGroup.add(vinyl);
    vinyls.push({ group: vinyl, sleeve, disc, data: vinyl.userData });
  }

  // ── Picking ───────────────────────────────────────────────────
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hoveredIdx = -1;
  let hoverCrate = false;   // cockpit-view hover (for HUD brackets)
  let pulsedIdx = -1, pulsedUntil = 0;

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
        pulsedIdx = idx;
        pulsedUntil = performance.now() + 900;
        e.stopPropagation();
      } else if (!pickCrate(e) && window.__setCockpitViewMode){
        window.__setCockpitViewMode('cockpit');
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

  // Hovered record → { x, y, title, category, date } (crate-view info card)
  window.__getCockpitVinylHover = function(){
    if (viewMode() !== 'crate' || hoveredIdx < 0) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const v = vinyls[hoveredIdx];
    v.group.updateWorldMatrix(true, false);
    // Anchor just above the sleeve mouth (not the full disc height) so the
    // card stays on-screen; VinylInfoCard clamps the rest.
    const p = v.group.localToWorld(new THREE.Vector3(0, SLEEVE_H*0.62 + DISC_RISE*0.4, 0));
    const pr = p.project(camera);
    if (pr.z > 1) return null;
    const proj = PROJECTS[hoveredIdx];
    return {
      index: hoveredIdx,
      x: ( pr.x*0.5+0.5)*rect.width,
      y: (-pr.y*0.5+0.5)*rect.height,
      title: proj.title.replace('\n', ' '),
      category: proj.category,
      date: proj.date,
    };
  };

  // ── Per-frame animation ───────────────────────────────────────
  group.tick = function(dt){
    if (viewMode() !== 'crate' && hoveredIdx !== -1) hoveredIdx = -1;
    const pulseActive = performance.now() < pulsedUntil;
    const active = hoveredIdx >= 0 ? hoveredIdx : (pulseActive ? pulsedIdx : -1);

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
  };

  // Expose a disposer so GlobeCanvas can detach listeners on unmount.
  group.disposeCrate = function(){
    renderer.domElement.removeEventListener('pointermove', onPointerMove);
    renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
    renderer.domElement.removeEventListener('pointerdown', onPointerDown, true);
    window.__getCockpitCrateRect = null;
    window.__getCockpitVinylHover = null;
  };

  return group;
}
