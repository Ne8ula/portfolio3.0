// VinylCrate.jsx
// A 3D wooden vinyl crate that sits on the cockpit desk. Holds 15 vinyl
// records standing upright like file folders. User scrolls horizontally
// to browse; hovering pops a single vinyl upward to reveal its cover art.
//
// Scene wiring: we listen for `window.__cockpitScene` to be ready
// (populated by GlobeCanvas) and attach to the existing table group.
// Self-contained — adds its own raycaster for hover + wheel listener
// that does NOT compete with the PC hover logic (we only claim events
// when the pointer is over the crate bounds).
(function(){
  const THREE = window.THREE;

  // Record cover palettes — 15 fictional albums in the site's editorial
  // cream/jade/mauve palette. Each entry: [bg, accent, text, title, artist]
  const COVERS = [
    ['#E8E4DC','#4B6E4F','#1E1C1A', 'MIDNIGHT\nSIGNALS',    'HOLLOWAY'],
    ['#3A3644','#E8E4DC','#E8E4DC', 'LONG\nSHADOW',          'MARA PIRES'],
    ['#4B6E4F','#F0EBE1','#F0EBE1', 'JADE\nHOUR',            'TENDERLINE'],
    ['#D8D3C7','#3A3644','#1E1C1A', 'ANALOGUE\nDREAMS',      'K. OKAFOR'],
    ['#1E1C1A','#7FA683','#E8E4DC', 'COLD\nLINE FM',         'THE ERRATA'],
    ['#F0EBE1','#B24240','#1E1C1A', 'RED\nHEM',              'JUNE LACROIX'],
    ['#6E6878','#E8E4DC','#E8E4DC', 'ROOM 21',               'SOFT MONUMENT'],
    ['#3A5A3E','#D8D3C7','#F0EBE1', 'FIELD\nNOTES v.II',     'AKIRA & SANS'],
    ['#A8A2B0','#1E1C1A','#1E1C1A', 'STATIC\nGARDEN',        'IVORY DISTRICT'],
    ['#E8E4DC','#6E6878','#1E1C1A', 'NORTH\n&  SOUTH',       'REYES, M.'],
    ['#2B4A30','#CFC9C0','#E8E4DC', 'LOW\nTIDE',             'GULLS, CORWIN'],
    ['#CFC9C0','#3A5A3E','#1E1C1A', 'FOLIO',                 'VENN'],
    ['#1E1C1A','#D8A24B','#D8A24B', 'AMBER\nPROTOCOL',       'NIGHT OFFICE'],
    ['#7FA683','#1E1C1A','#1E1C1A', 'GREEN\nROOM',           'HANA SATŌ'],
    ['#E8E4DC','#1E1C1A','#1E1C1A', 'UNTITLED\nSIDES',       'THE ARCHIVE']
  ];

  function makeCoverTexture(i){
    const [bg, accent, text, title, artist] = COVERS[i];
    const SIZE = 512;
    const c = document.createElement('canvas');
    c.width = SIZE; c.height = SIZE;
    const ctx = c.getContext('2d');
    // bg
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, SIZE, SIZE);
    // subtle grain
    for (let k = 0; k < 800; k++){
      ctx.fillStyle = `rgba(0,0,0,${Math.random()*0.04})`;
      ctx.fillRect(Math.random()*SIZE, Math.random()*SIZE, 1, 1);
    }
    // border
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 24, SIZE-48, SIZE-48);
    // cover-specific mark — each index gets a different geometric motif
    ctx.save();
    ctx.translate(SIZE/2, SIZE/2 - 40);
    const motif = i % 5;
    if (motif === 0){
      // Concentric rings (vinyl motif)
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
      // Halved diamond
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(0, -120); ctx.lineTo(110, 0); ctx.lineTo(0, 120); ctx.closePath();
      ctx.fill();
    } else if (motif === 2){
      // Staggered bars (sound levels)
      for (let b = 0; b < 7; b++){
        const h = 40 + (Math.sin(b*1.3)+1)*60;
        ctx.fillStyle = accent;
        ctx.fillRect(-130 + b*38, -h/2, 26, h);
      }
    } else if (motif === 3){
      // Crosshair + circle
      ctx.strokeStyle = accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 100, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-140, 0); ctx.lineTo(140, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -140); ctx.lineTo(0, 140); ctx.stroke();
    } else {
      // Solid square with cutout
      ctx.fillStyle = accent;
      ctx.fillRect(-100, -100, 200, 200);
      ctx.fillStyle = bg;
      ctx.fillRect(-40, -40, 80, 80);
    }
    ctx.restore();

    // Title
    ctx.fillStyle = text;
    ctx.font = 'bold 34px "Cormorant Garamond", Georgia, serif';
    ctx.textAlign = 'center';
    const lines = title.split('\n');
    lines.forEach((ln, li) => {
      ctx.fillText(ln, SIZE/2, SIZE - 120 + li*38);
    });
    // Artist
    ctx.fillStyle = accent;
    ctx.font = '600 14px "JetBrains Mono", monospace';
    ctx.letterSpacing = '2px';
    ctx.fillText(artist, SIZE/2, SIZE - 40);

    // Catalog number (top-left)
    ctx.fillStyle = accent;
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`CAT № ${String(165 - i).padStart(3,'0')}`, 40, 50);
    // Side marker (top-right)
    ctx.textAlign = 'right';
    ctx.fillText(['A / B','LP','12"','EP','A-SIDE'][i%5], SIZE-40, 50);

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  }

  // Sleeve SIDE spine texture (what we see when records stand in crate)
  function makeSpineTexture(i){
    const [bg, accent, text, title, artist] = COVERS[i];
    const W = 128, H = 512;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    // wear streaks
    for (let k = 0; k < 60; k++){
      ctx.fillStyle = `rgba(0,0,0,${Math.random()*0.08})`;
      ctx.fillRect(Math.random()*W, Math.random()*H, 1, 2 + Math.random()*8);
    }
    // stripes
    ctx.fillStyle = accent;
    ctx.fillRect(0, 60, W, 3);
    ctx.fillRect(0, H-63, W, 3);
    // text ROTATED (reads top→bottom)
    ctx.save();
    ctx.translate(W/2, H/2);
    ctx.rotate(-Math.PI/2);
    ctx.fillStyle = text;
    ctx.font = '600 26px "Cormorant Garamond", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const oneLine = title.replace('\n',' ');
    ctx.fillText(oneLine, 0, -18);
    ctx.fillStyle = accent;
    ctx.font = '600 13px "JetBrains Mono", monospace';
    ctx.fillText(artist, 0, 18);
    ctx.restore();
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  }

  function buildVinylCrate(scene, tableGroup, camera, renderer){
    const group = new THREE.Group();
    // Sits on desk surface (y=0.18 in table local). Between pedestal
    // (x=0) and PC (x=7). Slightly back so the keyboard in front stays
    // readable.
    tableGroup.add(group);

    // Crate dimensions — holds 15 records comfortably.
    // CRATE_H shortened so the crate walls match vinyl sleeve height
    // instead of towering over them — records sit snugly like files.
    const CRATE_W = 4.8;   // interior length (along X, the scroll axis)
    const CRATE_D = 1.4;   // front-to-back depth
    const CRATE_H = 0.78;  // height of side walls (sleeve height ≈ 1.0)

    // Base transform — modifiable via Tweaks.
    const baseX = 3.0, baseY = 0.18, baseZ = -2.4;
    const baseRX = 0, baseRY = -0.22, baseRZ = 0;
    group.position.set(baseX, baseY, baseZ);
    group.rotation.set(baseRX, baseRY, baseRZ);
    group.setTransform = function({ x, y, z, rx, ry, rz } = {}){
      if (typeof x === 'number') group.position.x = x;
      if (typeof y === 'number') group.position.y = y;
      if (typeof z === 'number') group.position.z = z;
      if (typeof rx === 'number') group.rotation.x = rx;
      if (typeof ry === 'number') group.rotation.y = ry;
      if (typeof rz === 'number') group.rotation.z = rz;
    };
    window.__cockpitVinyl = group;

    // Materials — light wood + darker edge, matching editorial palette
    const woodMat = new THREE.MeshLambertMaterial({ color: 0xB69A74 });
    const woodDarkMat = new THREE.MeshLambertMaterial({ color: 0x7A5F42 });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x55412A, transparent:true, opacity:0.85 });
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x8A6D4C });

    const WALL_T = 0.09;

    // Crate FLOOR
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(CRATE_W + WALL_T*2, WALL_T, CRATE_D + WALL_T*2),
      floorMat
    );
    floor.position.y = WALL_T/2;
    group.add(floor);
    group.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(floor.geometry), edgeMat
    )).position.copy(floor.position);

    // Side walls (left + right ends)
    [-1, 1].forEach(s => {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(WALL_T, CRATE_H, CRATE_D + WALL_T*2),
        woodMat
      );
      wall.position.set(s * (CRATE_W/2 + WALL_T/2), CRATE_H/2 + WALL_T, 0);
      group.add(wall);
      group.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(wall.geometry), edgeMat
      )).position.copy(wall.position);
      // Finger hole on end panels
      const hole = new THREE.Mesh(
        new THREE.TorusGeometry(0.12, 0.035, 6, 16),
        woodDarkMat
      );
      hole.position.set(s * (CRATE_W/2 + WALL_T/2 + 0.001), CRATE_H*0.65 + WALL_T, 0);
      hole.rotation.y = Math.PI/2;
      group.add(hole);
    });

    // Front + back walls (long sides) — front is SHORTER so we can see
    // the records standing inside, like a shop crate.
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(CRATE_W, CRATE_H, WALL_T),
      woodMat
    );
    backWall.position.set(0, CRATE_H/2 + WALL_T, -CRATE_D/2 - WALL_T/2);
    group.add(backWall);
    group.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(backWall.geometry), edgeMat
    )).position.copy(backWall.position);

    const frontWall = new THREE.Mesh(
      new THREE.BoxGeometry(CRATE_W, CRATE_H * 0.55, WALL_T),
      woodMat
    );
    frontWall.position.set(0, CRATE_H*0.55/2 + WALL_T, CRATE_D/2 + WALL_T/2);
    group.add(frontWall);
    group.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(frontWall.geometry), edgeMat
    )).position.copy(frontWall.position);

    // Label on front wall — "SIDE A / CATALOG"
    const labelC = document.createElement('canvas');
    labelC.width = 512; labelC.height = 96;
    const lctx = labelC.getContext('2d');
    lctx.fillStyle = '#F0EBE1';
    lctx.fillRect(0, 0, 512, 96);
    lctx.strokeStyle = '#55412A';
    lctx.lineWidth = 3;
    lctx.strokeRect(6, 6, 500, 84);
    lctx.fillStyle = '#1E1C1A';
    lctx.font = '600 28px "JetBrains Mono", monospace';
    lctx.textAlign = 'center';
    lctx.textBaseline = 'middle';
    lctx.fillText('CORRESPONDENCE · LP · 15 SIDES', 256, 48);
    const labelTex = new THREE.CanvasTexture(labelC);
    const labelGeo = new THREE.PlaneGeometry(1.8, 0.33);
    const labelPlane = new THREE.Mesh(labelGeo, new THREE.MeshBasicMaterial({ map: labelTex }));
    labelPlane.position.set(0, CRATE_H*0.35 + WALL_T, CRATE_D/2 + WALL_T + 0.002);
    group.add(labelPlane);

    // ────────────────────────────────────────────────────────────
    // VINYLS — 15 standing records like file folders
    // Records slide along X (scroll axis). A staggered vertical offset
    // (like the reference photo's "speed index" tab staircase) gives
    // visual rhythm: every 3rd record sits a bit higher so its tab
    // sticks out of the crate.
    // ────────────────────────────────────────────────────────────
    const recordsGroup = new THREE.Group();
    // recordsGroup sits INSIDE crate, positioned at the crate floor.
    recordsGroup.position.set(0, WALL_T, 0);
    group.add(recordsGroup);

    const N = 15;
    const SLEEVE_W = 0.95;      // face width
    const SLEEVE_H = 1.00;      // face height
    const SLEEVE_T = 0.06;      // thickness (spine)
    const SPACING = 0.20;       // stride between records (most of sleeve hidden behind next)

    // Compute range: first record at x = -CRATE_W/2 + margin, last at other end.
    // With SPACING * (N-1) as total stride length.
    const totalStride = SPACING * (N - 1);
    const firstX = -totalStride / 2;

    const vinyls = [];

    // Reusable vinyl disc geometry — black record with center label
    function makeDiscTexture(i){
      const [, accent] = COVERS[i];
      const S = 256;
      const c = document.createElement('canvas');
      c.width = S; c.height = S;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#12100F';
      ctx.beginPath(); ctx.arc(S/2, S/2, S/2-2, 0, Math.PI*2); ctx.fill();
      // grooves
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let r = 44; r < S/2 - 6; r += 3){
        ctx.beginPath(); ctx.arc(S/2, S/2, r, 0, Math.PI*2); ctx.stroke();
      }
      // label
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.arc(S/2, S/2, 44, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#1E1C1A';
      ctx.beginPath(); ctx.arc(S/2, S/2, 5, 0, Math.PI*2); ctx.fill();
      // label text
      ctx.fillStyle = '#1E1C1A';
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(COVERS[i][4], S/2, S/2 - 24);
      ctx.fillText(`№ ${String(165-i).padStart(3,'0')}`, S/2, S/2 + 28);
      const tex = new THREE.CanvasTexture(c);
      tex.anisotropy = 8;
      return tex;
    }

    for (let i = 0; i < N; i++){
      const vinyl = new THREE.Group();
      // baseX offset + stride
      const restX = firstX + i * SPACING;
      // Staggered "file tab" height — offset every third record up a hair
      const tabOffset = (i % 3 === 0) ? 0.12 : (i % 3 === 1 ? 0 : 0.06);
      const restY = SLEEVE_H/2 + tabOffset;
      vinyl.position.set(restX, restY, 0);
      vinyl.userData = { i, restX, restY, tabOffset, hover: 0 };

      // Sleeve (cardboard square)
      const coverTex = makeCoverTexture(i);
      const spineTex = makeSpineTexture(i);
      const backMat  = new THREE.MeshLambertMaterial({ color: COVERS[i][0] });
      const sleeveMats = [
        new THREE.MeshLambertMaterial({ map: spineTex }),   // +X
        new THREE.MeshLambertMaterial({ map: spineTex }),   // -X
        new THREE.MeshLambertMaterial({ color: COVERS[i][0] }), // +Y (top)
        new THREE.MeshLambertMaterial({ color: COVERS[i][0] }), // -Y (bottom)
        new THREE.MeshLambertMaterial({ map: coverTex }),   // +Z (front)
        backMat                                              // -Z (back)
      ];
      const sleeve = new THREE.Mesh(
        new THREE.BoxGeometry(SLEEVE_T, SLEEVE_H, SLEEVE_W),
        sleeveMats
      );
      vinyl.add(sleeve);
      const sleeveEdge = new THREE.LineSegments(
        new THREE.EdgesGeometry(sleeve.geometry),
        new THREE.LineBasicMaterial({ color: 0x1E1C1A, transparent:true, opacity:0.5 })
      );
      vinyl.add(sleeveEdge);

      // Vinyl disc inside — peeks out the top a bit
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(SLEEVE_H*0.48, SLEEVE_H*0.48, 0.015, 36),
        new THREE.MeshLambertMaterial({ map: makeDiscTexture(i) })
      );
      disc.rotation.z = Math.PI/2;
      // Disc peeks 0.03 above sleeve top
      disc.position.set(0.005, 0.02, 0);
      vinyl.add(disc);

      // Tabbed top edge — a small flag for visual variety (like a
      // speed-index file tab). Wide rectangles, different colors per
      // index group.
      if (i % 3 === 0){
        const tabMat = new THREE.MeshLambertMaterial({ color: 0x1E1C1A });
        const tabGeo = new THREE.BoxGeometry(SLEEVE_T + 0.002, 0.08, 0.35);
        const tab = new THREE.Mesh(tabGeo, tabMat);
        tab.position.set(0, SLEEVE_H/2 + 0.04, -SLEEVE_W/2 + 0.22);
        vinyl.add(tab);
        // tab number text
        const tC = document.createElement('canvas');
        tC.width = 128; tC.height = 32;
        const tctx = tC.getContext('2d');
        tctx.fillStyle = '#1E1C1A';
        tctx.fillRect(0, 0, 128, 32);
        tctx.fillStyle = '#E8E4DC';
        tctx.font = '600 20px "JetBrains Mono", monospace';
        tctx.textAlign = 'center';
        tctx.textBaseline = 'middle';
        tctx.fillText(`${165 - i}`, 64, 16);
        const tTex = new THREE.CanvasTexture(tC);
        const tagPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(0.32, 0.07),
          new THREE.MeshBasicMaterial({ map: tTex })
        );
        tagPlane.position.set(SLEEVE_T/2 + 0.001, SLEEVE_H/2 + 0.04, -SLEEVE_W/2 + 0.22);
        tagPlane.rotation.y = Math.PI/2;
        vinyl.add(tagPlane);
      }

      recordsGroup.add(vinyl);
      vinyls.push({ group: vinyl, sleeve, data: vinyl.userData });
    }

    // ────────────────────────────────────────────────────────────
    // SCROLL — horizontal wheel scrolls the records along X.
    // We translate recordsGroup.position.x directly; clamp to keep
    // all records within the crate bounds.
    // ────────────────────────────────────────────────────────────
    let scrollX = 0;
    let targetScrollX = 0;
    const maxScroll = Math.max(0, (totalStride - (CRATE_W - SLEEVE_W)) / 2 + 0.3);
    const minScroll = -maxScroll;

    // ────────────────────────────────────────────────────────────
    // HOVER — raycast into vinyls; whichever is under the pointer
    // eases its Y up so its cover rises above the crate.
    // ────────────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let hoveredIdx = -1;
    let pointerOverCrate = false;
    // Crate must be CLICKED to activate hover-preview. A second click
    // outside the crate (or on the crate itself toggles off) deactivates.
    let crateActive = false;

    const pickables = vinyls.map(v => v.sleeve);

    function updatePick(e){
      const r = renderer.domElement.getBoundingClientRect();
      ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(pickables, false);
      if (hits.length){
        const mesh = hits[0].object;
        const v = vinyls.find(vv => vv.sleeve === mesh);
        // Only expose hover when the crate has been activated by a click.
        hoveredIdx = crateActive ? (v ? v.data.i : -1) : -1;
        pointerOverCrate = true;
      } else {
        // Also check if near the crate bounding box for scroll capture
        const boxHits = raycaster.intersectObject(floor, false);
        pointerOverCrate = boxHits.length > 0;
        hoveredIdx = -1;
      }
    }

    // Helper: is the pointer currently over any vinyl or the crate floor?
    function pickCrate(e){
      const r = renderer.domElement.getBoundingClientRect();
      ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.intersectObjects(pickables, false).length) return true;
      if (raycaster.intersectObject(floor, false).length) return true;
      return false;
    }

    renderer.domElement.addEventListener('pointermove', updatePick);
    renderer.domElement.addEventListener('pointerleave', () => {
      hoveredIdx = -1; pointerOverCrate = false;
    });
    // Wheel: only scroll when the crate is ACTIVATED (clicked first).
    renderer.domElement.addEventListener('wheel', (e) => {
      if (!crateActive) return;
      if (!pointerOverCrate && hoveredIdx < 0) return;
      e.preventDefault();
      targetScrollX = Math.max(minScroll, Math.min(maxScroll, targetScrollX - e.deltaY * 0.004 - e.deltaX * 0.004));
    }, { passive: false });

    // Click handler: first click on the crate activates; clicking outside
    // the crate deactivates. While active, clicking a vinyl also pulses
    // it forward like a "pull to preview" flourish.
    let pulsedIdx = -1, pulsedUntil = 0;
    renderer.domElement.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const onCrate = pickCrate(e);
      if (onCrate){
        if (!crateActive){
          // Activate. Immediately compute which vinyl is under the cursor
          // so the first hover reads the right record.
          crateActive = true;
          updatePick(e);
          renderer.domElement.style.cursor = 'pointer';
          // Prevent this click from reaching other scene listeners (PC).
          e.stopPropagation();
        } else if (hoveredIdx >= 0){
          pulsedIdx = hoveredIdx;
          pulsedUntil = performance.now() + 900;
          e.stopPropagation();
        }
      } else if (crateActive){
        // Click outside the crate → deactivate.
        crateActive = false;
        hoveredIdx = -1;
      }
    }, true); // capture phase, so we can claim before the PC handler

    // ────────────────────────────────────────────────────────────
    // TICK — ease scroll + hover each frame
    // ────────────────────────────────────────────────────────────
    group.tick = function(dt, now){
      // scroll ease
      scrollX += (targetScrollX - scrollX) * Math.min(1, dt * 8);
      recordsGroup.position.x = scrollX;

      const pulseActive = performance.now() < pulsedUntil;

      vinyls.forEach(v => {
        const d = v.data;
        const isHover = (d.i === hoveredIdx) || (pulseActive && d.i === pulsedIdx);
        const target = isHover ? 1 : 0;
        d.hover += (target - d.hover) * Math.min(1, dt * 7);
        // Lift up + tilt forward; push slightly out of crate toward camera (+Z local = toward viewer)
        const lift = d.hover * 0.55;
        const forward = d.hover * 0.18;
        const tilt = d.hover * 0.18;  // radians
        v.group.position.y = d.restY + lift;
        v.group.position.z = forward;
        v.group.rotation.x = -tilt;
      });
    };

    return group;
  }

  // Wait for cockpit scene to be alive, then attach.
  function tryAttach(){
    const scene = window.__cockpitScene;
    const tableGroup = window.__cockpitTableGroup;
    const camera = window.__cockpitCamera;
    const renderer = window.__cockpitRenderer;
    if (!scene || !tableGroup || !camera || !renderer){
      return requestAnimationFrame(tryAttach);
    }
    if (window.__cockpitVinylCrate) return;
    const crate = buildVinylCrate(scene, tableGroup, camera, renderer);
    window.__cockpitVinylCrate = crate;
    // Hook tick into the cockpit's frame pump
    const prevTick = window.__cockpitTick || (() => {});
    window.__cockpitTick = (dt, now) => {
      prevTick(dt, now);
      if (crate && crate.tick) crate.tick(dt, now);
    };
  }
  tryAttach();

  window.__VinylCrate = { buildVinylCrate };
})();
