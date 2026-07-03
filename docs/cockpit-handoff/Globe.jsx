// Globe.jsx — cockpit 3D scene.
// A translucent x-ray retro computer sits on the RIGHT side of the desk
// (replaces the old airplane-on-orbit-rail). Front bezel faces the camera
// so the glowing jade screen is visible; CRT funnel, circuit board, keys,
// mouse and cable all rendered as frosted shell + jade-wireframe internals
// in the site's editorial palette.
function GlobeCanvas({ yawRef, pitchRef }){
  const mountRef = React.useRef(null);

  React.useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !window.THREE) return;
    const THREE = window.THREE;

    const scene = new THREE.Scene();
    // Theme-driven palette. Light = warm cream stage; Dark = ink-deep stage.
    const THEMES = {
      dark: {
        bg:        0x2d2b30,
        fog:       0x2d2b30,
        starCol:   0xE8E4DC,
        starOpac:  0.40,
        deskFill:  0xE8E4DC,
        deskFillOp:0.16,
        deskWire:  0xCFC9C0,
        deskWireOp:0.85,
        gridLine:  0xCFC9C0,
        gridOp:    0.18,
        legFillOp: 0.14,
        legWireOp: 0.60,
        shelfFillOp:0.10,
        shelfWireOp:0.50,
        jadeAccent:0x4B6E4F,
      },
      light: {
        bg:        0xECE6D8,
        fog:       0xECE6D8,
        starCol:   0x6E6878,
        starOpac:  0.55,
        deskFill:  0xC9C2B2,
        deskFillOp:0.55,
        deskWire:  0x4A4640,
        deskWireOp:0.85,
        gridLine:  0x6E685E,
        gridOp:    0.30,
        legFillOp: 0.45,
        legWireOp: 0.70,
        shelfFillOp:0.40,
        shelfWireOp:0.60,
        jadeAccent:0x3A5A3E,
      }
    };
    let curTheme = (window.__cockpitTheme === 'light') ? 'light' : 'dark';
    const T = () => THEMES[curTheme];
    scene.background = new THREE.Color(T().bg);
    window.__cockpitScene = scene;
    // Registries — populated as we build the scene; used by theme apply.
    const themeTargets = {
      deskFill: [],   // {mat, baseOpac?} — uses theme.deskFill + deskFillOp
      deskWire: [],   // wire LineBasicMaterial
      gridLine: [],
      starsMat: null,
      legFill:  [],
      legWire:  [],
      shelfFill:[],
      shelfWire:[],
      jadeAccent:[],  // jade-accent line/mesh basic materials
    };
    const applyTheme = () => {
      const t = T();
      scene.background = new THREE.Color(t.bg);
      if (scene.fog){ scene.fog.color = new THREE.Color(t.fog); }
      themeTargets.deskFill.forEach(m => { m.color.setHex(t.deskFill); m.opacity = t.deskFillOp; });
      themeTargets.deskWire.forEach(m => { m.color.setHex(t.deskWire); m.opacity = t.deskWireOp; });
      themeTargets.gridLine.forEach(m => { m.color.setHex(t.gridLine); m.opacity = t.gridOp; });
      themeTargets.legFill.forEach(m => { m.color.setHex(t.deskFill); m.opacity = t.legFillOp; });
      themeTargets.legWire.forEach(m => { m.color.setHex(t.deskWire); m.opacity = t.legWireOp; });
      themeTargets.shelfFill.forEach(m => { m.color.setHex(t.deskFill); m.opacity = t.shelfFillOp; });
      themeTargets.shelfWire.forEach(m => { m.color.setHex(t.deskWire); m.opacity = t.shelfWireOp; });
      themeTargets.jadeAccent.forEach(m => { m.color.setHex(t.jadeAccent); });
      if (themeTargets.starsMat){
        themeTargets.starsMat.color.setHex(t.starCol);
        themeTargets.starsMat.opacity = t.starOpac;
      }
    };
    const onTheme = (e) => {
      curTheme = (e.detail && e.detail.theme === 'light') ? 'light' : 'dark';
      applyTheme();
    };
    window.addEventListener('cockpit-theme', onTheme);

    const camera = new THREE.PerspectiveCamera(68, mount.clientWidth/mount.clientHeight, 0.1, 2000);
    camera.position.set(0, 0, 0);
    window.__cockpitCamera = camera;

    const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mount.appendChild(renderer.domElement);
    window.__cockpitRenderer = renderer;

    // Starfield — sparse cream dots
    const starGeo = new THREE.BufferGeometry();
    const starCount = 700;
    const starPos = new Float32Array(starCount*3);
    for (let i=0;i<starCount;i++){
      const r = 800;
      const t = Math.random()*Math.PI*2;
      const p = Math.acos(2*Math.random()-1);
      starPos[i*3]   = r*Math.sin(p)*Math.cos(t);
      starPos[i*3+1] = r*Math.sin(p)*Math.sin(t);
      starPos[i*3+2] = r*Math.cos(p);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starsMat = new THREE.PointsMaterial({ color: T().starCol, size:1.3, sizeAttenuation:false, transparent:true, opacity: T().starOpac });
    themeTargets.starsMat = starsMat;
    const stars = new THREE.Points(starGeo, starsMat);
    scene.add(stars);

    // ──────────────────────────────────────────────────────────────
    // COCKPIT TABLE (foreground desk)
    // ──────────────────────────────────────────────────────────────
    const tableGroup = new THREE.Group();
    const tableBaseY = -5.2, tableBaseZ = -7;
    tableGroup.position.set(0, tableBaseY, tableBaseZ);
    scene.add(tableGroup);
    window.__cockpitTableGroup = tableGroup;
    // FPV camera-offset controls:
    //  height  = how high above the desk the viewer sits (raises camera → lowers desk)
    //  distance = how far back the viewer is (pushes desk away → larger negative Z)
    let fpvHeight = 0, fpvDistance = 0;
    window.__cockpitFPV = {
      setOffset({ height, distance } = {}){
        if (typeof height   === 'number') fpvHeight   = height;
        if (typeof distance === 'number') fpvDistance = distance;
        tableGroup.position.set(0, tableBaseY - fpvHeight, tableBaseZ - fpvDistance);
      }
    };
    scene.add(tableGroup);

    const tableTopMat = new THREE.MeshBasicMaterial({ color: T().deskFill, transparent:true, opacity: T().deskFillOp });
    themeTargets.deskFill.push(tableTopMat);
    const tableTop = new THREE.Mesh(
      new THREE.BoxGeometry(22, 0.35, 9),
      tableTopMat
    );
    tableGroup.add(tableTop);
    const tableWireMat = new THREE.LineBasicMaterial({ color: T().deskWire, transparent:true, opacity: T().deskWireOp });
    themeTargets.deskWire.push(tableWireMat);
    const tableWire = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(22, 0.35, 9)),
      tableWireMat
    );
    tableGroup.add(tableWire);

    const inlayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-10.8, 0.19, 4.4),
      new THREE.Vector3( 10.8, 0.19, 4.4)
    ]);
    const inlayMat = new THREE.LineBasicMaterial({ color: T().jadeAccent });
    themeTargets.jadeAccent.push(inlayMat);
    tableGroup.add(new THREE.Line(inlayGeo, inlayMat));

    const legPositions = [[-10, -4, -4], [10, -4, -4], [-10, -4, 4], [10, -4, 4]];
    legPositions.forEach(([x,y,z]) => {
      const legMat = new THREE.MeshBasicMaterial({ color: T().deskFill, transparent:true, opacity: T().legFillOp });
      themeTargets.legFill.push(legMat);
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 8, 10),
        legMat
      );
      leg.position.set(x, y, z);
      tableGroup.add(leg);
      const legWireMat = new THREE.LineBasicMaterial({ color: T().deskWire, transparent:true, opacity: T().legWireOp });
      themeTargets.legWire.push(legWireMat);
      const legWire = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.22, 0.22, 8, 10)),
        legWireMat
      );
      legWire.position.set(x, y, z);
      tableGroup.add(legWire);
    });

    const shelfMat = new THREE.MeshBasicMaterial({ color: T().deskFill, transparent:true, opacity: T().shelfFillOp });
    themeTargets.shelfFill.push(shelfMat);
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(20, 0.15, 7.5),
      shelfMat
    );
    shelf.position.y = -4;
    tableGroup.add(shelf);
    const shelfWireMat = new THREE.LineBasicMaterial({ color: T().deskWire, transparent:true, opacity: T().shelfWireOp });
    themeTargets.shelfWire.push(shelfWireMat);
    const shelfWire = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(20, 0.15, 7.5)),
      shelfWireMat
    );
    shelfWire.position.y = -4;
    tableGroup.add(shelfWire);

    const gridSize = 9;
    for (let i = -gridSize; i <= gridSize; i += 1.5){
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(i, 0.19, -4.4),
        new THREE.Vector3(i, 0.19,  4.4)
      ]);
      const gm = new THREE.LineBasicMaterial({ color: T().gridLine, transparent:true, opacity: T().gridOp });
      themeTargets.gridLine.push(gm);
      tableGroup.add(new THREE.Line(g, gm));
    }
    for (let i = -4; i <= 4; i += 1.5){
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-10.8, 0.19, i),
        new THREE.Vector3( 10.8, 0.19, i)
      ]);
      const gm = new THREE.LineBasicMaterial({ color: T().gridLine, transparent:true, opacity: T().gridOp });
      themeTargets.gridLine.push(gm);
      tableGroup.add(new THREE.Line(g, gm));
    }

    const tagCorners = [[-10.8, 4.4], [10.8, 4.4], [-10.8, -4.4], [10.8, -4.4]];
    tagCorners.forEach(([x,z]) => {
      const len = 0.8;
      const sx = Math.sign(x) * -1, sz = Math.sign(z) * -1;
      const pts = [
        new THREE.Vector3(x + sx*len, 0.19, z),
        new THREE.Vector3(x,           0.19, z),
        new THREE.Vector3(x,           0.19, z + sz*len)
      ];
      const cm = new THREE.LineBasicMaterial({ color: T().jadeAccent });
      themeTargets.jadeAccent.push(cm);
      tableGroup.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        cm
      ));
    });

    // Bobblehead + pedestal removed — they were post-exit artifacts
    // that broke the scene's silhouette. The Rubik's cube now floats
    // freely above the desk surface (anchored by CockpitCube's y-lift).
    const bobGroup = new THREE.Group();   // empty stub — kept for animate-loop refs
    tableGroup.add(bobGroup);

    // Stubs kept for animate-loop compatibility
    const tBox = new THREE.Group();
    const tRing = new THREE.Group();

    // ══════════════════════════════════════════════════════════════
    // X-RAY COMPUTER — on the RIGHT side of the desk.
    // Scale in desk units (1 unit ≈ bobblehead size). Bonnet faces the
    // cockpit camera (+Z), so the green screen is visible from the front.
    // ══════════════════════════════════════════════════════════════
    const xray = new THREE.Group();
    // Sit on table top (y=0.18 surface). Right side of table (x=+7).
    xray.position.set(7, 0.18, 0);
    tableGroup.add(xray);

    // Materials — TRANSLUCENT frosted acrylic shell (MeshPhysicalMaterial
    // with transmission + green attenuation, matching the reference
    // acrylic look). Requires a scene.environment map to reflect/refract
    // against, so we build a PMREM from a RoomEnvironment below.
    // ── GHOST WIREFRAME MATERIALS (from glb-wireframe-ghost-effect.md) ──
    // Body shell: soft semi-transparent jade-tinted acrylic — keeps the
    // ghost x-ray feel while reading as actual translucent material.
    const shellFillMat = new THREE.MeshPhysicalMaterial({
      color:               new THREE.Color(0xCFE6CC),  // light jade
      emissive:            new THREE.Color(0x6B8F6E),  // soft jade glow
      emissiveIntensity:   0.06,
      roughness:           0.35,
      metalness:           0.05,
      transmission:        0.85,                       // acrylic transparency
      ior:                 1.42,
      thickness:           0.6,
      attenuationColor:    new THREE.Color(0xBFE0BC),
      attenuationDistance: 2.4,
      transparent:         true,
      opacity:             0.18,                       // soft, not invisible
      depthWrite:          false,
      side:                THREE.DoubleSide,
      envMapIntensity:     0.7
    });
    // Edge silhouette material — warm cream, 78% opacity, sharp edges only
    const shellEdgeMat = new THREE.LineBasicMaterial({
      color:       0xF0EBE1,
      transparent: true,
      opacity:     0.78,
      depthWrite:  false
    });
    // Wireframe (full triangle mesh) material — light jade-mauve, 55%
    const shellWireMat = new THREE.LineBasicMaterial({
      color:       0xB8C8B5,
      transparent: true,
      opacity:     0.5,
      depthWrite:  false
    });
    const shellAccentMat = shellFillMat;  // alias — same ghost treatment
    const shellDarkMat = new THREE.MeshBasicMaterial({
      color: 0x2A2722
    });
    const jadeWireMat = new THREE.LineBasicMaterial({
      color: 0x4B6E4F
    });
    const jadeSoftMat = new THREE.MeshLambertMaterial({
      color: 0x5C8061
    });
    const jadeBrightMat = new THREE.MeshLambertMaterial({
      color: 0x7FA683
    });
    const screenFillMat = new THREE.MeshBasicMaterial({
      color: 0x4A6B4E
    });
    const screenGlowMat = new THREE.MeshBasicMaterial({
      color: 0x6B8E70
    });
    const boardMat = new THREE.MeshLambertMaterial({
      color: 0x2B4A30
    });

    // Add soft lighting so Lambert materials render properly.
    // (Previous version used MeshBasicMaterial everywhere; switching
    // to Lambert gives us subtle shading for the opaque shell.)
    if (!scene.userData.__xrayLit){
      scene.userData.__xrayLit = true;
      const amb = new THREE.AmbientLight(0xFFFBF0, 0.72);
      scene.add(amb);
      const key = new THREE.DirectionalLight(0xFFF4D6, 0.85);
      key.position.set(5, 8, 6);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xBFD6C4, 0.4);
      fill.position.set(-6, 3, -2);
      scene.add(fill);
      // PMREM environment so the translucent acrylic has something to
      // reflect/refract against. Uses RoomEnvironment when available.
      try {
        const pmrem = new THREE.PMREMGenerator(renderer);
        pmrem.compileEquirectangularShader();
        // Build a small "room" by hand: a box of colored emissive planes
        // around the origin. Produces a convincing PBR env for the
        // MeshPhysicalMaterial (reflections + refraction).
        const envScene = new THREE.Scene();
        const boxGeo = new THREE.BoxGeometry(1, 1, 1);
        const boxMat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, side: THREE.BackSide });
        const room = new THREE.Mesh(boxGeo, boxMat);
        room.scale.setScalar(20);
        envScene.add(room);
        // Emissive panels (windows) — warm + cool
        const warm = new THREE.Mesh(
          new THREE.PlaneGeometry(6, 6),
          new THREE.MeshBasicMaterial({ color: 0xFFE8C6 })
        );
        warm.position.set(0, 4, -9.9);
        envScene.add(warm);
        const cool = new THREE.Mesh(
          new THREE.PlaneGeometry(6, 3),
          new THREE.MeshBasicMaterial({ color: 0xCFE5D3 })
        );
        cool.position.set(-9.9, 2, 0);
        cool.rotation.y = Math.PI/2;
        envScene.add(cool);
        const top = new THREE.Mesh(
          new THREE.PlaneGeometry(10, 10),
          new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
        );
        top.position.set(0, 9.9, 0);
        top.rotation.x = Math.PI/2;
        envScene.add(top);
        scene.environment = pmrem.fromScene(envScene, 0.04).texture;
      } catch(e){ /* ok — material just won't refract as richly */ }
    }

    function buildShell(geo, group){
      const mesh = new THREE.Mesh(geo, shellFillMat);
      group.add(mesh);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), shellEdgeMat);
      group.add(edges);
      return mesh;
    }

    // Build a canvas texture showing a jade "x-ray" circuit board
    // silhouette — used on the SIDE panels of the opaque case so the
    // case reads as translucent without actually being transparent.
    function makeCircuitSideTexture(){
      const W = 512, H = 512;
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const ctx = c.getContext('2d');
      // Frosted cream base
      ctx.fillStyle = '#E8E2D2';
      ctx.fillRect(0, 0, W, H);
      // Soft inner gradient so edges feel sealed
      const vg = ctx.createRadialGradient(W/2, H/2, W*0.1, W/2, H/2, W*0.7);
      vg.addColorStop(0, 'rgba(232,226,210,0)');
      vg.addColorStop(1, 'rgba(182,176,160,0.35)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
      // Circuit board silhouette — rectangle with traces, faded
      ctx.save();
      ctx.globalAlpha = 0.65;
      ctx.fillStyle = '#4B6E4F';
      ctx.fillRect(60, 180, W-120, H-240);
      // Traces
      ctx.strokeStyle = '#3A5A3E';
      ctx.lineWidth = 2;
      for (let i = 0; i < 40; i++){
        ctx.beginPath();
        const x1 = 70 + Math.random()*(W-140);
        const y1 = 190 + Math.random()*(H-260);
        const horiz = Math.random() < 0.5;
        const len = 20 + Math.random()*120;
        ctx.moveTo(x1, y1);
        ctx.lineTo(horiz ? x1+len : x1, horiz ? y1 : y1+len);
        ctx.stroke();
      }
      // Chips
      ctx.fillStyle = '#2B4A30';
      for (let i = 0; i < 6; i++){
        const x = 80 + Math.random()*(W-180);
        const y = 200 + Math.random()*(H-260);
        ctx.fillRect(x, y, 30 + Math.random()*40, 14 + Math.random()*18);
      }
      // Solder dots
      ctx.fillStyle = '#7FA683';
      for (let i = 0; i < 80; i++){
        const x = 70 + Math.random()*(W-140);
        const y = 190 + Math.random()*(H-260);
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
      // Soft vertical frost streaks
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#FFFFFF';
      for (let i = 0; i < 14; i++){
        const x = Math.random()*W;
        ctx.fillRect(x, 0, 1 + Math.random()*2, H);
      }
      ctx.globalAlpha = 1;
      // Mold lines / case seams
      ctx.strokeStyle = 'rgba(120,115,100,0.45)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(12, 12, W-24, H-24);
      const tex = new THREE.CanvasTexture(c);
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      return tex;
    }
    const circuitSideTex = makeCircuitSideTexture();
    const sidePanelMat = new THREE.MeshLambertMaterial({ map: circuitSideTex });

    // Frosted front texture — cleaner, minimal circuitry peeking in
    function makeFrostedTexture(){
      const W = 256, H = 256;
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#EBE5D5';
      ctx.fillRect(0, 0, W, H);
      // Subtle mottled frost
      for (let i = 0; i < 400; i++){
        ctx.fillStyle = `rgba(255,255,255,${Math.random()*0.08})`;
        ctx.beginPath();
        ctx.arc(Math.random()*W, Math.random()*H, 1 + Math.random()*3, 0, Math.PI*2);
        ctx.fill();
      }
      const tex = new THREE.CanvasTexture(c);
      return tex;
    }
    // Ghost-wireframe shell — alias to shellFillMat for consistency.
    // The "frosted" look now comes from layered wireframe + edge geometry,
    // not from physical-material transmission.
    const frostedMat = shellFillMat;

    // ── OUTER CASE — tall chunky "bonnet + chin" single-piece form ─
    // Dims: width 2.6, height 3.4, depth 2.6 — slightly bigger than bobblehead
    // Y=0 is the base of the case sitting on the desktop.
    const caseW = 2.6, caseH = 3.4, caseD = 2.6;

    // Upper bonnet (main body) — rounded top edges via extruded side profile.
    // Build a rounded-rect Shape in the YZ plane, then extrude along X.
    const upperH = 2.6;
    function makeRoundedSideShape(depth, height, radius){
      const d = depth/2, h = height/2, r = radius;
      const s = new THREE.Shape();
      // Start bottom-back, go counter-clockwise
      s.moveTo(-d,  -h);
      s.lineTo( d,  -h);                           // bottom edge
      s.lineTo( d,   h - r);                       // right side up to corner start
      s.quadraticCurveTo( d,  h, d - r, h);        // top-front rounded corner
      s.lineTo(-d + r, h);                         // top edge
      s.quadraticCurveTo(-d, h, -d, h - r);        // top-back rounded corner
      s.lineTo(-d, -h);                            // back side down
      return s;
    }
    const bonnetShape = makeRoundedSideShape(caseD, upperH, 0.55);
    const upperGeo = new THREE.ExtrudeGeometry(bonnetShape, {
      depth: caseW, bevelEnabled: true,
      bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, curveSegments: 12
    });
    // Extrusion is along +Z by default, starting at z=0. Re-orient so the
    // shape's X-axis becomes world Z (depth) and extrusion axis becomes world X.
    upperGeo.rotateY(-Math.PI/2);
    upperGeo.translate(caseW/2, 0, 0);   // center extrusion on origin
    // Multi-material skipped — Extrude side groups are fragile; instead
    // we paint the whole case with the frosted material and add separate
    // jade circuit-silhouette decal planes on the side faces below.
    const upperMesh = new THREE.Mesh(upperGeo, frostedMat);
    upperMesh.position.y = 0.8 + upperH/2;
    xray.add(upperMesh);
    const upperEdge = new THREE.LineSegments(
      new THREE.EdgesGeometry(upperGeo, 20), shellEdgeMat
    );
    upperEdge.position.y = upperMesh.position.y;
    // Layer 1: full wireframe — dense triangle structure (ghost effect)
    const upperWire = new THREE.LineSegments(
      new THREE.WireframeGeometry(upperGeo), shellWireMat
    );
    upperWire.position.y = upperMesh.position.y;
    xray.add(upperWire);
    xray.add(upperEdge);

    // Jade circuit-silhouette DECALS on left + right side panels.
    // These sit just outside each side face to simulate "the case is
    // translucent and you can see the motherboard through the frost".
    // They are opaque jade planes with circuit details — no blending.
    const decalTex = makeCircuitSideTexture();
    const decalMat = new THREE.MeshLambertMaterial({
      map: decalTex
    });
    const decalW = caseD * 0.82, decalH = upperH * 0.78;
    const decalY = 0.8 + upperH/2 - 0.05;
    [-1, 1].forEach(side => {
      const dg = new THREE.PlaneGeometry(decalW, decalH);
      const dm = new THREE.Mesh(dg, decalMat);
      dm.position.set(side * (caseW/2 + 0.002), decalY, 0);
      dm.rotation.y = side === 1 ? -Math.PI/2 : Math.PI/2;
      xray.add(dm);
    });

    // Chin / base — narrower, slightly rounded front-bottom
    const chinH = 0.8;
    const chinW = caseW * 0.88;
    const chinD = caseD * 0.95;
    const chinShape = new THREE.Shape();
    const cd = chinD/2, ch = chinH/2, cr = 0.14;
    chinShape.moveTo(-cd, -ch + cr);
    chinShape.quadraticCurveTo(-cd, -ch, -cd + cr, -ch);
    chinShape.lineTo(cd - cr, -ch);
    chinShape.quadraticCurveTo(cd, -ch, cd, -ch + cr);
    chinShape.lineTo(cd, ch);
    chinShape.lineTo(-cd, ch);
    chinShape.lineTo(-cd, -ch + cr);
    const chinGeo = new THREE.ExtrudeGeometry(chinShape, {
      depth: chinW, bevelEnabled: true,
      bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 8
    });
    chinGeo.rotateY(-Math.PI/2);
    chinGeo.translate(chinW/2, 0, 0);
    const chinMesh = new THREE.Mesh(chinGeo, frostedMat);
    chinMesh.position.y = chinH/2;
    xray.add(chinMesh);
    const chinEdge = new THREE.LineSegments(new THREE.EdgesGeometry(chinGeo, 20), shellEdgeMat);
    chinEdge.position.y = chinH/2;
    xray.add(chinEdge);
    // Layer 1: full wireframe on chin (ghost effect)
    const chinWire = new THREE.LineSegments(new THREE.WireframeGeometry(chinGeo), shellWireMat);
    chinWire.position.y = chinH/2;
    xray.add(chinWire);

    // Carry handle — short arch on top
    const handleGeo = new THREE.TorusGeometry(0.35, 0.055, 6, 20, Math.PI);
    const handle = new THREE.Mesh(handleGeo, shellFillMat);
    handle.position.set(0, caseH + 0.05, 0);
    handle.rotation.x = -Math.PI/2;
    xray.add(handle);
    const handleWire = new THREE.LineSegments(new THREE.EdgesGeometry(handleGeo), shellEdgeMat);
    handleWire.position.copy(handle.position);
    handleWire.rotation.copy(handle.rotation);
    xray.add(handleWire);

    // ── FRONT SCREEN (bezel + glowing green face) on +Z face ──────
    // Group everything screen-related so corner exposure + visuals share
    // one transform. Centered at screenCenterY on the case front.
    const bezelW = 1.85, bezelH = 1.45;
    const screenCenterY = 0.8 + 1.45;  // middle of upper bonnet, below handle
    const frontZ = caseD/2 + 0.005;

    const screenGroup = new THREE.Group();
    screenGroup.position.set(0, screenCenterY, frontZ);
    xray.add(screenGroup);

    // Bezel rim — a thin frame ring, jade-tinted to match UI
    const rimMat = new THREE.MeshLambertMaterial({ color: 0xBDC3B2 });
    const rimT = 0.07;
    const rimParts = [
      { w: bezelW + rimT*2, h: rimT, x: 0, y:  bezelH/2 + rimT/2 },
      { w: bezelW + rimT*2, h: rimT, x: 0, y: -bezelH/2 - rimT/2 },
      { w: rimT, h: bezelH, x: -bezelW/2 - rimT/2, y: 0 },
      { w: rimT, h: bezelH, x:  bezelW/2 + rimT/2, y: 0 }
    ];
    rimParts.forEach(p => {
      const g = new THREE.BoxGeometry(p.w, p.h, 0.08);
      const m = new THREE.Mesh(g, rimMat);
      m.position.set(p.x, p.y, 0);
      screenGroup.add(m);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), shellEdgeMat);
      e.position.copy(m.position);
      screenGroup.add(e);
    });

    // Screen glass — EMISSIVE glowing plane (from reference).
    // Bright cream-green with emissive glow, low roughness — reads as a
    // live CRT rather than a dead dark panel. HTML dialogue UI renders
    // on top of this.
    const screenGeo = new THREE.PlaneGeometry(bezelW, bezelH);
    const screen = new THREE.Mesh(screenGeo, new THREE.MeshStandardMaterial({
      color: 0xccffcc,
      emissive: 0x55aa55,
      emissiveIntensity: 1.2,
      roughness: 0.1
    }));
    screen.position.set(0, 0, 0.005);
    screenGroup.add(screen);
    // Subtle backlight plane (behind the HTML overlay in 2D)
    const innerGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(bezelW * 0.985, bezelH * 0.98),
      new THREE.MeshBasicMaterial({ color: 0xaee0b0 })
    );
    innerGlow.position.set(0, 0, 0.01);
    screenGroup.add(innerGlow);

    // Tiny jade power dot (top-right of screen)
    const powerDot = new THREE.Mesh(
      new THREE.CircleGeometry(0.03, 12),
      new THREE.MeshBasicMaterial({ color: 0x7FA683 })
    );
    powerDot.position.set(bezelW/2 - 0.1, bezelH/2 - 0.1, 0.02);
    screenGroup.add(powerDot);

    // ── Expose screen corners for HTML overlay alignment ────────────
    // Corners are LOCAL to screenGroup; the projection code below uses
    // screenGroup.localToWorld on them each frame so the HTML dialogue
    // travels with the PC (any transform applied to xray propagates).
    xray.userData.screenGroup = screenGroup;
    xray.userData.screenCorners = {
      tl: new THREE.Vector3(-bezelW/2,  bezelH/2, 0.005),
      tr: new THREE.Vector3( bezelW/2,  bezelH/2, 0.005),
      bl: new THREE.Vector3(-bezelW/2, -bezelH/2, 0.005),
      br: new THREE.Vector3( bezelW/2, -bezelH/2, 0.005),
    };

    // Apple-style logo hole omitted intentionally — original silhouette.
    // Instead: small jade monogram "AX" etched on the bezel rim bottom-left
    // (drawn as two short jade lines so it reads as a tiny brand mark)
    const markMat = new THREE.LineBasicMaterial({ color: 0x4B6E4F });
    const markPts = [
      new THREE.Vector3(-bezelW/2 - rimT - 0.05, screenCenterY - bezelH/2 - rimT/2 + 0.02, frontZ + 0.05),
      new THREE.Vector3(-bezelW/2 - rimT + 0.08, screenCenterY - bezelH/2 - rimT/2 + 0.02, frontZ + 0.05)
    ];
    xray.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(markPts), markMat));

    // Disk slot on the chin
    const slotGeo = new THREE.BoxGeometry(0.9, 0.06, 0.04);
    const slot = new THREE.Mesh(slotGeo, jadeBrightMat);
    slot.position.set(0.1, chinH * 0.55, caseD/2 * 0.95 + 0.005);
    xray.add(slot);
    xray.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(slotGeo),
      jadeWireMat
    )).position.copy(slot.position);

    // Eject hole next to slot
    const ejectGeo = new THREE.CircleGeometry(0.025, 10);
    const eject = new THREE.Mesh(ejectGeo, new THREE.MeshBasicMaterial({ color: 0x4B6E4F }));
    eject.position.set(0.7, chinH * 0.55, caseD/2 * 0.95 + 0.006);
    xray.add(eject);

    // ── CRT FUNNEL INSIDE BONNET (visible through acrylic shell) ──
    // Wireframe emissive internal material (from reference) — simulates
    // the structural x-ray look through the translucent case.
    const internalMat = new THREE.MeshStandardMaterial({
      color: 0x224422,
      emissive: 0x113311,
      emissiveIntensity: 0.5,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });
    const funnelGeo = new THREE.CylinderGeometry(0.35, 0.9, 1.3, 16);
    const funnel = new THREE.Mesh(funnelGeo, internalMat);
    funnel.rotation.x = Math.PI/2;   // orient along Z (bezel front → back)
    funnel.position.set(0, screenCenterY, -0.05);
    xray.add(funnel);

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.5, 12);
    const neck = new THREE.Mesh(neckGeo, internalMat);
    neck.rotation.x = Math.PI/2;
    neck.position.set(0, screenCenterY, -0.85);
    xray.add(neck);

    // Yoke ring around neck
    const yokeGeo = new THREE.TorusGeometry(0.24, 0.05, 6, 20);
    const yoke = new THREE.Mesh(yokeGeo, internalMat);
    yoke.position.set(0, screenCenterY, -0.65);
    xray.add(yoke);

    // ── CIRCUIT BOARD on the floor of the bonnet ──────────────────
    const boardY = 0.8 + 0.08;   // just above chin interior
    const boardGeo = new THREE.BoxGeometry(caseW * 0.82, 0.06, caseD * 0.82);
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(0, boardY, 0);
    xray.add(board);
    xray.add(new THREE.LineSegments(new THREE.EdgesGeometry(boardGeo), jadeWireMat))
      .position.copy(board.position);

    // Random circuit traces on board
    for (let i=0; i<14; i++){
      const x1 = (Math.random()-0.5)*caseW*0.76;
      const z1 = (Math.random()-0.5)*caseD*0.76;
      const horiz = Math.random() < 0.6;
      const len = 0.1 + Math.random()*0.5;
      const x2 = horiz ? x1 + len : x1;
      const z2 = horiz ? z1 : z1 + len;
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x1, boardY + 0.04, z1),
        new THREE.Vector3(x2, boardY + 0.04, z2)
      ]);
      xray.add(new THREE.Line(geo, jadeWireMat));
    }

    // Components on the board
    const compShellMat = new THREE.MeshBasicMaterial({
      color: 0xD6CEBE, transparent:true, opacity:0.78
    });
    const comps = [
      { x: -0.7, z: -0.5, w: 0.45, h: 0.28, d: 0.3, mat: compShellMat },    // PSU
      { x:  0.6, z:  0.2, w: 0.35, h: 0.12, d: 0.35, mat: jadeBrightMat }, // chip
      { x:  0.7, z: -0.5, w: 0.3, h: 0.3, d: 0.3, mat: jadeBrightMat },    // fan
      { x: -0.2, z:  0.6, w: 0.7, h: 0.08, d: 0.1, mat: compShellMat },    // ram
      { x: -0.2, z:  0.45, w: 0.7, h: 0.08, d: 0.1, mat: compShellMat },
    ];
    comps.forEach(c => {
      const g = new THREE.BoxGeometry(c.w, c.h, c.d);
      const m = new THREE.Mesh(g, c.mat);
      m.position.set(c.x, boardY + 0.03 + c.h/2, c.z);
      xray.add(m);
      const e = new THREE.LineSegments(
        new THREE.EdgesGeometry(g),
        c.mat === jadeBrightMat ? jadeWireMat : shellEdgeMat
      );
      e.position.copy(m.position);
      xray.add(e);
    });

    // Fan rings inside the fan block
    for (let i=0; i<2; i++){
      const r = 0.06 + i*0.05;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.01, 6, 18),
        jadeWireMat
      );
      ring.position.set(0.7, boardY + 0.18, -0.5);
      ring.rotation.x = Math.PI/2;
      xray.add(ring);
    }

    // ── VENT SLOTS on upper bonnet front (top area) — three rows ──
    for (let row=0; row<3; row++){
      for (let i=0; i<7; i++){
        const vent = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.018, 0.015),
          shellDarkMat
        );
        vent.position.set(-0.66 + i*0.22, caseH - 0.18 - row*0.06, frontZ + 0.005);
        xray.add(vent);
      }
    }
    // Side vent strips (left + right cheeks of bonnet)
    for (let side of [-1, 1]){
      for (let i=0; i<8; i++){
        const svent = new THREE.Mesh(
          new THREE.BoxGeometry(0.015, 0.12, 0.22),
          shellDarkMat
        );
        svent.position.set(side * (caseW/2 + 0.005), 1.6 + (i-4)*0.14, -0.1);
        xray.add(svent);
      }
    }

    // ── Chin logo plate: "ax" wordmark in jade ────────────────────
    const plateGeo = new THREE.PlaneGeometry(0.5, 0.16);
    const plate = new THREE.Mesh(plateGeo, new THREE.MeshBasicMaterial({
      color: 0x3E5F42, transparent:true, opacity:0.85
    }));
    plate.position.set(-0.75, chinH * 0.55, caseD/2 * 0.95 + 0.006);
    xray.add(plate);
    xray.add(new THREE.LineSegments(new THREE.EdgesGeometry(plateGeo), jadeWireMat))
      .position.copy(plate.position);

    // ── PORTS on rear face ────────────────────────────────────────
    const backZ = -caseD/2 - 0.005;
    for (let i=0; i<4; i++){
      const portGeo = new THREE.BoxGeometry(0.2, 0.08, 0.02);
      const p = new THREE.Mesh(portGeo, jadeBrightMat);
      p.position.set(-0.45 + i*0.3, 0.3, backZ);
      xray.add(p);
      xray.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(portGeo), jadeWireMat
      )).position.copy(p.position);
    }

    // ══════════════════════════════════════════════════════════════
    // KEYBOARD — STANDALONE 3D MODEL (not connected to the PC)
    // ══════════════════════════════════════════════════════════════
    // Lives directly under `scene`, with its own transform/setOffset
    // so it can be repositioned independently of the PC.
    // Style guideline: ghost-wireframe + cream-deep frosted plate, ink
    // edges, single jade accent (power key, top-right). Slim profile,
    // generous gutter, dotted hairline framing the deck edge.
    function makeRoundedRectShape(w, d, r){
      const hw = w/2, hd = d/2;
      const s = new THREE.Shape();
      s.moveTo(-hw + r, -hd);
      s.lineTo(hw - r, -hd);
      s.quadraticCurveTo(hw, -hd, hw, -hd + r);
      s.lineTo(hw, hd - r);
      s.quadraticCurveTo(hw, hd, hw - r, hd);
      s.lineTo(-hw + r, hd);
      s.quadraticCurveTo(-hw, hd, -hw, hd - r);
      s.lineTo(-hw, -hd + r);
      s.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
      return s;
    }

    const keyboard = new THREE.Group();
    // PARENTED TO `xray` (the PC group). Keyboard inherits the PC's
    // position, scale, and yaw, so they always read as a paired desk
    // setup no matter where the PC is tweaked to. Local coordinates:
    //   • +Z (local) = the direction the monitor's screen faces, which
    //     is "toward the camera" once xray's yaw is applied. So
    //     positive local Z places the keyboard in front of the screen.
    //   • Y is relative to the PC's xray origin (which sits ON the
    //     desk top at xray.position.y). Keyboard chassis is 0.18 thick
    //     and we want it resting on the desk → y ≈ +0.09 (half thickness).
    //   • X = 0 (centered with the PC column).
    const kbBaseX = 0, kbBaseY = 0.09, kbBaseZ = 2.4;
    keyboard.position.set(kbBaseX, kbBaseY, kbBaseZ);
    // No keyboard yaw — it inherits xray's yaw, so its front edge already
    // points toward the camera.
    keyboard.rotation.y = 0;
    xray.add(keyboard);
    keyboard.setOffset = function({ x = 0, y = 0, z = 0 } = {}){
      keyboard.position.set(kbBaseX + x, kbBaseY + y, kbBaseZ + z);
    };
    window.__cockpitKeyboard = keyboard;

    // ── Materials specific to the mechanical keyboard ──
    // Chassis: SEMI-TRANSLUCENT JADE — frosted jade-glass body so the
    // mechanism beneath reads through the shell. Tuned to the design
    // system's --jade (#4B6E4F) but lifted toward jade-light for the
    // glassy feel; opacity drops to 0.55 so plate + switches show through.
    const kbChassisMat = new THREE.MeshBasicMaterial({
      color: 0x6E9472, transparent: true, opacity: 0.55,
      depthWrite: false
    });
    // Switch plate: deep jade — darker base note that visually anchors
    // the translucent chassis above. Shows through the frosted shell
    // and fills the gutters between caps.
    const kbPlateMat = new THREE.MeshBasicMaterial({
      color: 0x2A4830
    });
    // Switch stems: deep jade-ink housing visible between cap and plate.
    const kbSwitchMat = new THREE.MeshBasicMaterial({
      color: 0x1A2A1E
    });
    // Keycap base materials — three palette tracks:
    //   • cream-deep alphas  → #D8D3C7 (--cream-deep)
    //   • dark jade modifiers → #00BB77 (per user) — replaces the
    //     previous mauve-deep modifier track for a tighter monochromatic
    //     jade story across chassis + plate + mod caps.
    //   • jade accent (esc, enter, power) → #4B6E4F (--jade)
    // toneMapped:false → render the exact hex. ACES tone mapping is
    // active on the renderer (exposure 1.2) and was pushing 0x00BB77
    // toward turquoise; this opts the keycap colors out of that.
    const kbCapAlphaMat = new THREE.MeshBasicMaterial({ color: 0xD8D3C7, toneMapped: false });
    const kbCapModMat   = new THREE.MeshBasicMaterial({ color: 0x00BB77, toneMapped: false });
    const kbCapJadeMat  = new THREE.MeshBasicMaterial({ color: 0x4B6E4F, toneMapped: false });
    const kbEdgeDarkMat = new THREE.LineBasicMaterial({
      color: 0x0F0E0D, transparent: true, opacity: 0.85
    });
    const kbEdgeLightMat = new THREE.LineBasicMaterial({
      color: 0x55514B, transparent: true, opacity: 0.7
    });

    // ── CHASSIS — chunky two-tier body (typing angle: rear taller) ──
    // Rear edge sits higher to give the typing wedge feel.
    const KB_W = 2.6, KB_D = 0.95;
    const KB_H_FRONT = 0.10, KB_H_REAR = 0.18;
    // Build chassis as an extruded rounded rect, then tilt it slightly
    // along x-axis to wedge the front lower.
    const chassisShape = makeRoundedRectShape(KB_W, KB_D, 0.05);
    const chassisGeo = new THREE.ExtrudeGeometry(chassisShape, {
      depth: KB_H_REAR, bevelEnabled: true, bevelThickness: 0.012,
      bevelSize: 0.012, bevelSegments: 2, curveSegments: 8
    });
    chassisGeo.rotateX(-Math.PI/2);
    chassisGeo.translate(0, KB_H_REAR/2, 0);
    const chassis = new THREE.Mesh(chassisGeo, kbChassisMat);
    chassis.renderOrder = 2;
    keyboard.add(chassis);
    keyboard.add(new THREE.LineSegments(new THREE.EdgesGeometry(chassisGeo, 20), kbEdgeDarkMat));

    // Wedge tilt — rotate whole keyboard ~5° forward so back is higher
    keyboard.rotation.x = -0.06;

    // ── SWITCH PLATE — recessed inside the chassis, ink-dark ──
    // Visible between caps creates the "floating key" mechanical look.
    const PLATE_W = KB_W - 0.18;
    const PLATE_D = KB_D - 0.16;
    const PLATE_H = 0.014;
    const PLATE_TOP_Y = KB_H_REAR + PLATE_H/2;  // sit on top of chassis
    const kbSwitchPlateShape = makeRoundedRectShape(PLATE_W, PLATE_D, 0.025);
    const kbSwitchPlateGeo = new THREE.ExtrudeGeometry(kbSwitchPlateShape, {
      depth: PLATE_H, bevelEnabled: false, curveSegments: 6
    });
    kbSwitchPlateGeo.rotateX(-Math.PI/2);
    kbSwitchPlateGeo.translate(0, PLATE_H/2, 0);
    const kbSwitchPlate = new THREE.Mesh(kbSwitchPlateGeo, kbPlateMat);
    kbSwitchPlate.position.y = KB_H_REAR;
    keyboard.add(kbSwitchPlate);
    keyboard.add(new THREE.LineSegments(new THREE.EdgesGeometry(kbSwitchPlateGeo), kbEdgeDarkMat))
      .position.y = KB_H_REAR;

    // ── KEY LAYOUT — 75% layout (mech standard), 14 cols × 5 rows ──
    // Tighter pitch than chiclet; small but visible gutter showing plate.
    const KEY_W = 0.155, KEY_DEPTH = 0.155;
    const CAP_H = 0.078;        // tall sculpted cap
    const SWITCH_H = 0.038;     // switch stem visible below cap
    const GUTTER = 0.022;
    const COL_PITCH = KEY_W + GUTTER;
    const ROW_PITCH = KEY_DEPTH + GUTTER;
    const COLS = 14;
    const TOTAL_KB_W = COLS * COL_PITCH - GUTTER;
    const colStartX = -TOTAL_KB_W / 2 + KEY_W / 2;

    const PLATE_TOP_ABS = KB_H_REAR + PLATE_H;
    const SWITCH_BOT = PLATE_TOP_ABS;
    const SWITCH_TOP = SWITCH_BOT + SWITCH_H;
    const CAP_BOT    = SWITCH_TOP - 0.008;  // cap overlaps switch slightly
    const CAP_CENTER = CAP_BOT + CAP_H/2;

    // Center of grid in z. We want 5 rows centered (slight bias toward back
    // for nav cluster room).
    const ROWS = 5;
    const rowOffsets = [];
    for (let r = 0; r < ROWS; r++){
      rowOffsets.push((r - (ROWS-1)/2) * ROW_PITCH);
    }

    // addKey: capStyle = 'alpha' | 'mod' | 'jade'
    const addKey = (x, z, w, d, capStyle = 'alpha') => {
      // Switch housing — small black square stem under the cap
      const SW_W = w * 0.55, SW_D = d * 0.55;
      const swGeo = new THREE.BoxGeometry(SW_W, SWITCH_H, SW_D);
      const sw = new THREE.Mesh(swGeo, kbSwitchMat);
      sw.position.set(x, SWITCH_BOT + SWITCH_H/2, z);
      keyboard.add(sw);
      // Tiny cross-stem detail on top of switch (Cherry MX +)
      const stemA = new THREE.BoxGeometry(SW_W * 0.45, 0.006, SW_W * 0.1);
      const stemB = new THREE.BoxGeometry(SW_W * 0.1, 0.006, SW_W * 0.45);
      [stemA, stemB].forEach(g => {
        const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({color: 0xC8B98A}));
        m.position.set(x, SWITCH_TOP + 0.003, z);
        keyboard.add(m);
      });

      // Sculpted keycap — slightly tapered on top (OEM profile feel).
      // Build by stacking: a thicker base box + a slightly smaller top "dish"
      // box. Combined with edge lines this reads as sculpted.
      const capMat = capStyle === 'jade' ? kbCapJadeMat
                   : capStyle === 'mod'  ? kbCapModMat
                                          : kbCapAlphaMat;

      const capBaseGeo = new THREE.BoxGeometry(w, CAP_H * 0.55, d);
      const capBase = new THREE.Mesh(capBaseGeo, capMat);
      capBase.position.set(x, CAP_BOT + (CAP_H * 0.55)/2, z);
      keyboard.add(capBase);
      keyboard.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(capBaseGeo), kbEdgeDarkMat
      )).position.copy(capBase.position);

      // Tapered top — narrower on each axis for sculpted profile.
      const TAPER = 0.018;
      const capTopGeo = new THREE.BoxGeometry(w - TAPER*2, CAP_H * 0.45, d - TAPER*2);
      const capTop = new THREE.Mesh(capTopGeo, capMat);
      capTop.position.set(x, CAP_BOT + CAP_H * 0.55 + (CAP_H * 0.45)/2, z);
      keyboard.add(capTop);
      keyboard.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(capTopGeo), kbEdgeDarkMat
      )).position.copy(capTop.position);

      // Subtle inner-top dish line (for surface-detail readability)
      const dishInset = 0.012;
      const ww = w - TAPER*2, dd = d - TAPER*2;
      const dishY = capTop.position.y + (CAP_H * 0.45)/2 + 0.001;
      const dishPts = [
        new THREE.Vector3(x - ww/2 + dishInset, dishY, z - dd/2 + dishInset),
        new THREE.Vector3(x + ww/2 - dishInset, dishY, z - dd/2 + dishInset),
        new THREE.Vector3(x + ww/2 - dishInset, dishY, z + dd/2 - dishInset),
        new THREE.Vector3(x - ww/2 + dishInset, dishY, z + dd/2 - dishInset),
        new THREE.Vector3(x - ww/2 + dishInset, dishY, z - dd/2 + dishInset),
      ];
      keyboard.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(dishPts),
        kbEdgeLightMat
      ));
    };

    // ── ROW 0: Function row (Esc + F-keys, slightly shorter caps) ──
    const FN_DEPTH = KEY_DEPTH * 0.78;
    for (let c = 0; c < COLS; c++) {
      const x = colStartX + c * COL_PITCH;
      const z = rowOffsets[0] - (KEY_DEPTH - FN_DEPTH)/2;
      // Esc (col 0) and Power/Lock (col COLS-1) → jade accents
      const style = (c === 0 || c === COLS - 1) ? 'jade' : 'mod';
      addKey(x, z, KEY_W, FN_DEPTH, style);
    }

    // ── ROW 1: Number row (1234… + Backspace) ──
    for (let c = 0; c < COLS - 1; c++) {
      const x = colStartX + c * COL_PITCH;
      addKey(x, rowOffsets[1], KEY_W, KEY_DEPTH, 'alpha');
    }
    // Backspace (1.5u-ish — last position uses standard width here for grid alignment;
    // we draw it as a wider mod cap)
    {
      const x = colStartX + (COLS - 1) * COL_PITCH;
      addKey(x, rowOffsets[1], KEY_W, KEY_DEPTH, 'mod');
    }

    // ── ROW 2: Tab row (QWERTY…) — first cap is Tab (mod) ──
    for (let c = 0; c < COLS; c++) {
      const x = colStartX + c * COL_PITCH;
      const style = (c === 0 || c === COLS - 1) ? 'mod' : 'alpha';
      addKey(x, rowOffsets[2], KEY_W, KEY_DEPTH, style);
    }

    // ── ROW 3: Home row (ASDF…) — Caps + Enter as mods, Enter as jade accent ──
    for (let c = 0; c < COLS; c++) {
      const x = colStartX + c * COL_PITCH;
      let style = 'alpha';
      if (c === 0) style = 'mod';            // Caps Lock
      else if (c === COLS - 1) style = 'jade';// Enter (the single jade alpha-zone accent)
      addKey(x, rowOffsets[3], KEY_W, KEY_DEPTH, style);
    }

    // ── ROW 4: Bottom row — modifiers + spacebar ──
    // Layout: [Ctrl][Win][Alt] [SPACE 6u] [Alt][Fn][Ctrl][←][↓][→]
    // We map this into 14 cols: 3 left mods (1u each) + space (6u) + 5 right (1u each)
    {
      const z = rowOffsets[4];
      // 3 left mods
      for (let c = 0; c < 3; c++) {
        const x = colStartX + c * COL_PITCH;
        addKey(x, z, KEY_W, KEY_DEPTH, 'mod');
      }
      // Spacebar — cols 3..8 (6 columns wide)
      const SPACE_COLS = 6;
      const SPACE_W = SPACE_COLS * COL_PITCH - GUTTER;
      const spaceCx = colStartX + (3 + (SPACE_COLS - 1)/2) * COL_PITCH;
      addKey(spaceCx, z, SPACE_W, KEY_DEPTH, 'alpha');
      // 5 right mods (cols 9..13)
      for (let c = 9; c < COLS; c++) {
        const x = colStartX + c * COL_PITCH;
        addKey(x, z, KEY_W, KEY_DEPTH, 'mod');
      }
    }

    // ── VOLUME KNOB — signature Keychron Q/V detail, top-right of chassis ──
    const knobR = 0.085, knobH = 0.06;
    const knobGeo = new THREE.CylinderGeometry(knobR, knobR, knobH, 24);
    const knob = new THREE.Mesh(knobGeo, new THREE.MeshBasicMaterial({color: 0x1A1815}));
    // Sit just behind the function row, far right (outside the key grid)
    const knobX = KB_W/2 - knobR - 0.06;
    const knobZ = -KB_D/2 + knobR + 0.06;
    knob.position.set(knobX, KB_H_REAR + knobH/2, knobZ);
    keyboard.add(knob);
    keyboard.add(new THREE.LineSegments(new THREE.EdgesGeometry(knobGeo), kbEdgeDarkMat))
      .position.copy(knob.position);
    // Knurled grip — 8 vertical lines around knob barrel
    const knobMidY = KB_H_REAR + knobH/2;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const ix = knobX + Math.cos(a) * knobR;
      const iz = knobZ + Math.sin(a) * knobR;
      const knurlPts = [
        new THREE.Vector3(ix, KB_H_REAR + 0.005, iz),
        new THREE.Vector3(ix, KB_H_REAR + knobH - 0.005, iz),
      ];
      keyboard.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(knurlPts), kbEdgeLightMat
      ));
    }
    // Jade indicator dot on knob top
    const knobDotGeo = new THREE.CircleGeometry(0.008, 12);
    knobDotGeo.rotateX(-Math.PI/2);
    const knobDot = new THREE.Mesh(knobDotGeo, kbCapJadeMat);
    knobDot.position.set(knobX, KB_H_REAR + knobH + 0.001, knobZ + knobR * 0.6);
    keyboard.add(knobDot);

    // ── USB-C PORT — small slot on rear chassis face ──
    const usbW = 0.07, usbH = 0.025, usbD = 0.02;
    const usbGeo = new THREE.BoxGeometry(usbW, usbH, usbD);
    const usb = new THREE.Mesh(usbGeo, kbSwitchMat);
    usb.position.set(-KB_W/2 * 0.4, KB_H_REAR * 0.55, -KB_D/2 - usbD/2 + 0.005);
    keyboard.add(usb);
    keyboard.add(new THREE.LineSegments(new THREE.EdgesGeometry(usbGeo), kbEdgeDarkMat))
      .position.copy(usb.position);

    // ── STATUS LED — small jade dot near front-right of chassis ──
    const ledGeo = new THREE.CircleGeometry(0.011, 16);
    ledGeo.rotateX(-Math.PI/2);
    const led = new THREE.Mesh(ledGeo, kbCapJadeMat);
    led.position.set(KB_W/2 - 0.08, KB_H_REAR + 0.001, KB_D/2 - 0.08);
    keyboard.add(led);

    // ── MOUSE — proper desktop mouse, sized + shaped right ──
    // Larger footprint so it reads as a mouse next to the keyboard.
    // Body: rounded oval from a circular-ish rounded rect, taller front
    // tapering toward a slightly lower back. Built as half a stretched
    // sphere for the dome, with a flat base.
    const mouse = new THREE.Group();
    mouse.position.set(2.4, 0, caseD/2 + 0.6);
    xray.add(mouse);

    const MOUSE_W = 0.6, MOUSE_L = 1.0, MOUSE_H = 0.3;

    // Dome: half-sphere, scaled to mouse footprint, sitting on the desk
    const domeGeo = new THREE.SphereGeometry(0.5, 24, 16, 0, Math.PI*2, 0, Math.PI/2);
    domeGeo.scale(MOUSE_W, MOUSE_H, MOUSE_L);
    const dome = new THREE.Mesh(domeGeo, frostedMat);
    mouse.add(dome);
    mouse.add(new THREE.LineSegments(new THREE.EdgesGeometry(domeGeo, 18), shellEdgeMat));
    mouse.add(new THREE.LineSegments(new THREE.WireframeGeometry(domeGeo), shellWireMat));

    // Flat base disc — closes the bottom of the half-sphere
    const baseGeo = new THREE.CircleGeometry(0.5, 24);
    baseGeo.scale(MOUSE_W, MOUSE_L, 1);
    baseGeo.rotateX(-Math.PI/2);
    const baseM = new THREE.Mesh(baseGeo, frostedMat);
    baseM.position.y = 0.001;
    mouse.add(baseM);
    mouse.add(new THREE.LineSegments(new THREE.EdgesGeometry(baseGeo), shellEdgeMat))
      .position.copy(baseM.position);
    // Button split line — runs along top of dome from front-center back ~60%
    const btnSplit = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, MOUSE_H + 0.005, -MOUSE_L*0.45),
      new THREE.Vector3(0, MOUSE_H + 0.005,  MOUSE_L*0.05)
    ]);
    mouse.add(new THREE.Line(btnSplit, shellEdgeMat));

    // Scroll wheel — small slot near the front
    const wheelGeo = new THREE.TorusGeometry(0.04, 0.012, 6, 14);
    const wheel = new THREE.Mesh(wheelGeo, shellAccentMat);
    wheel.position.set(0, MOUSE_H * 0.95, -MOUSE_L * 0.18);
    wheel.rotation.z = Math.PI/2;
    mouse.add(wheel);
    mouse.add(new THREE.LineSegments(new THREE.EdgesGeometry(wheelGeo), shellEdgeMat))
      .position.copy(wheel.position);

    // Mouse cable — curves from back of mouse toward chin of case
    const cablePts = [];
    const mouseBaseX = 2.4, mouseBaseZ = caseD/2 + 0.6;
    for (let i=0; i<=32; i++){
      const t = i/32;
      const x = mouseBaseX - t*0.9;
      const z = mouseBaseZ + MOUSE_L*0.5 - t*0.6;
      const y = 0.04 + Math.sin(t*Math.PI)*0.06;
      cablePts.push(new THREE.Vector3(x, y, z));
    }
    xray.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(cablePts),
      shellEdgeMat
    ));

    // (Keyboard cable removed — keyboard is now a standalone entity.)

    // Orient so the face is toward the camera (camera is at z ≈ 0 looking
    // at the xray group at world z ≈ -7 → already face-on).
    // Slight rotation so the computer has a little 3/4 presence.
    xray.rotation.y = -0.35;  // face tilts slightly toward viewer from right side

    // ══════════════════════════════════════════════════════════════
    // GLB MODEL — Ghost in the Machine (per glb-wireframe-ghost-effect.md)
    // ══════════════════════════════════════════════════════════════
    // Hide the hand-built PC body (everything currently under xray) so the
    // GLB takes its place. We keep `xray` as the parent group so all the
    // existing transform/screen-overlay machinery still works.
    const handBuiltChildren = xray.children.slice();
    // The procedural iMac G3 (built above as `xray` children) is the
    // canonical PC. The Meshy GLB attempt was abandoned because it
    // ships as a single 1.5M-vertex primitive — one mesh, one material,
    // monitor + keyboard + mouse + cables all welded together. Without
    // sub-mesh decomposition there's no way to hide the desk
    // accessories, and our procedural keyboard/screen overlay needs a
    // clean tower-only PC. Keep the procedural model visible.
    handBuiltChildren.forEach(c => { c.visible = true; });
    window.__cockpitGLBLoaded = true;  // signal "PC ready" for any code that waits on this
    const GLB_URL = null;  // intentionally disabled — see note above

    function isScreenMesh(child){
      const n = (child.name || '').toLowerCase();
      if (/screen|display|monitor|lcd|crt|panel/.test(n)) return true;
      if (child.geometry){
        const sz = new THREE.Vector3();
        child.geometry.computeBoundingBox();
        child.geometry.boundingBox.getSize(sz);
        const sorted = [sz.x, sz.y, sz.z].sort((a,b)=>a-b);
        if (sorted[2] > 0 && sorted[0] / sorted[2] < 0.08) return true;
      }
      return false;
    }

    function applyGhostEffect(model){
      // Scale to ~8u along longest axis, then center on xray origin (with
      // base resting on table top — y = 0).
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) model.scale.multiplyScalar(8.0 / maxDim);
      box.setFromObject(model);
      box.getCenter(center);
      const minY = box.min.y;
      model.position.x -= center.x;
      model.position.y -= minY;        // rest base on y=0 (xray local)
      model.position.z -= center.z;

      const meshes = [];
      model.traverse(c => { if (c.isMesh) meshes.push(c); });

      // ── Hide GLB-baked keyboard + mouse + cable accessories ──
      // The Meshy "Ghost in the Machine" model bakes a keyboard, mouse,
      // and desk clutter into the same scene as the monitor/case. We
      // want only the PC tower + screen — the procedural keyboard
      // (parented to scene, not xray) is the typing surface.
      //
      // Heuristic uses MODEL-LOCAL coordinates (after model has been
      // centered+scaled but before it joins the xray group, so all
      // ancestor matrices up to `model` are identity except the
      // model's own translate+scale, which we strip by subtracting).
      // For each mesh, compute its world-space bbox via setFromObject
      // — `model` is not yet attached to anything, so this gives us
      // bboxes in the model's own frame. Then:
      //   • flat = height < 35% of larger horizontal extent
      //   • low  = center sits in bottom 30% of the model's height
      // Anything matching both = desk accessory → hide.
      model.updateMatrixWorld(true);
      const modelBox = new THREE.Box3().setFromObject(model);
      const modelMinY = modelBox.min.y;
      const modelHeight = modelBox.max.y - modelMinY;
      const deskCutoff = modelMinY + modelHeight * 0.30;
      let hiddenCount = 0;
      const debugInfo = [];
      meshes.forEach(m => {
        m.geometry.computeBoundingBox();
        const wbox = new THREE.Box3().setFromObject(m);
        const wsize = wbox.getSize(new THREE.Vector3());
        const wcenter = wbox.getCenter(new THREE.Vector3());
        const horiz = Math.max(wsize.x, wsize.z);
        const flatness = wsize.y / Math.max(horiz, 1e-6);
        const isLow = wcenter.y < deskCutoff;
        const isFlat = flatness < 0.45;
        if (isLow && isFlat){
          m.visible = false;
          m.userData._hiddenAccessory = true;
          hiddenCount++;
        }
        if (debugInfo.length < 30){
          debugInfo.push({
            sx: +wsize.x.toFixed(2), sy: +wsize.y.toFixed(2), sz: +wsize.z.toFixed(2),
            cy: +wcenter.y.toFixed(2),
            flat: +flatness.toFixed(2),
            isLow, isFlat, hide: isLow && isFlat,
          });
        }
      });
      window.__cockpitGLBDebug = {
        modelMinY, modelHeight, deskCutoff,
        totalMeshes: meshes.length, hiddenCount,
        sample: debugInfo,
      };

      // Filter the working mesh list down to what's still visible — we
      // don't want to apply ghost materials / wireframes to the hidden
      // keyboard/mouse pieces.
      const liveMeshes = meshes.filter(m => m.visible);

      // Find largest screen-candidate among visible meshes
      let screenMesh = null, screenArea = 0;
      liveMeshes.forEach(m => {
        if (isScreenMesh(m)){
          const s = new THREE.Vector3();
          m.geometry.boundingBox.getSize(s);
          const a = s.x * s.y * s.z;
          if (!screenMesh || a > screenArea){ screenMesh = m; screenArea = a; }
        }
      });

      // ── Replace materials ──
      liveMeshes.forEach(child => {
        if (child === screenMesh){
          child.material = new THREE.MeshStandardMaterial({
            color: 0x0C1A10,
            emissive: new THREE.Color(0x4B6E4F),
            emissiveIntensity: 0.6,
            roughness: 0.25,
            metalness: 0.1,
            transparent: false,
            opacity: 1.0,
            depthWrite: true,
            envMapIntensity: 0.4,
          });
        } else {
          child.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0xA8A2B0),
            emissive: new THREE.Color(0x6E6878),
            emissiveIntensity: 0.08,
            roughness: 0.5,
            metalness: 0.15,
            transparent: true,
            opacity: 0.06,
            depthWrite: false,
            side: THREE.DoubleSide,
            envMapIntensity: 0.6,
          });
        }
      });

      // ── Wireframe + edge overlays (body only) ──
      liveMeshes.forEach(child => {
        if (child === screenMesh) return;
        try {
          const wireGeo = new THREE.WireframeGeometry(child.geometry);
          const wireLine = new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({
            color: 0xA8A2B0, transparent: true, opacity: 0.55, depthWrite: false,
          }));
          child.add(wireLine);

          const edgeGeo = new THREE.EdgesGeometry(child.geometry, 20);
          const edgeLine = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({
            color: 0xF0EBE1, transparent: true, opacity: 0.78, depthWrite: false,
          }));
          child.add(edgeLine);
        } catch(e){ /* skip non-indexed geometry */ }
      });

      xray.add(model);

      // ── Wire screen overlay to detected screen mesh ──
      if (screenMesh){
        screenMesh.geometry.computeBoundingBox();
        const bb = screenMesh.geometry.boundingBox;
        // Determine the flat axis (smallest extent) — that's the screen normal
        const ext = new THREE.Vector3(
          bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z
        );
        const axes = [
          {axis:'x', val:ext.x}, {axis:'y', val:ext.y}, {axis:'z', val:ext.z}
        ].sort((a,b)=>a.val-b.val);
        const flat = axes[0].axis;
        // Build the 4 corner points in screenMesh-local space (slightly
        // offset along the flat axis toward the front so the overlay sits
        // on the visible face).
        const off = (bb.max[flat] - bb.min[flat]) * 0.5 + 0.001;
        const cx = (bb.max.x + bb.min.x) / 2;
        const cy = (bb.max.y + bb.min.y) / 2;
        const cz = (bb.max.z + bb.min.z) / 2;
        const make = (signU, signV) => {
          const v = new THREE.Vector3(cx, cy, cz);
          if (flat === 'x'){
            v.set(cx + off, cy + signV*(bb.max.y-bb.min.y)/2, cz + signU*(bb.max.z-bb.min.z)/2);
          } else if (flat === 'y'){
            v.set(cx + signU*(bb.max.x-bb.min.x)/2, cy + off, cz + signV*(bb.max.z-bb.min.z)/2);
          } else {
            v.set(cx + signU*(bb.max.x-bb.min.x)/2, cy + signV*(bb.max.y-bb.min.y)/2, cz + off);
          }
          return v;
        };
        xray.userData.screenGroup = screenMesh;
        xray.userData.screenCorners = {
          tl: make(-1,  1),
          tr: make( 1,  1),
          bl: make(-1, -1),
          br: make( 1, -1),
        };
      }

      window.__cockpitGLBLoaded = true;
    }

    // GLB load intentionally disabled — see note at GLB_URL definition.
    // The procedural iMac G3 above is the canonical PC.

    // ── Tweaks: expose transform setter for the Tweaks panel ──
    let pcX = 7, pcY = 0.18, pcZ = 0, pcScale = 1, pcYaw = -0.35, pcPitch = 0, pcRoll = 0;
    xray.setTransform = function({ x, y, z, scale, yaw, pitch, roll } = {}){
      if (typeof x === 'number') pcX = x;
      if (typeof y === 'number') pcY = y;
      if (typeof z === 'number') pcZ = z;
      if (typeof scale === 'number') pcScale = scale;
      if (typeof yaw === 'number') pcYaw = yaw;
      if (typeof pitch === 'number') pcPitch = pitch;
      if (typeof roll === 'number') pcRoll = roll;
      xray.position.set(pcX, pcY, pcZ);
      xray.scale.setScalar(pcScale);
      xray.rotation.x = pcPitch;
      xray.rotation.y = pcYaw;
      xray.rotation.z = pcRoll;
    };
    window.__cockpitPC = xray;

    // Screen rect projection — HTML overlay uses this to position the
    // dialogue UI exactly over the monitor's screen in viewport space.
    xray.getScreenRect = function(){
      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      scene.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);
      camera.updateProjectionMatrix();
      const sc = xray.userData.screenCorners;
      const sg = xray.userData.screenGroup || xray;
      // View-space check: all corners must be in front of the camera,
      // otherwise the 2D projection wraps around and the overlay twists.
      const viewZ = (local) => {
        const w = sg.localToWorld(local.clone());
        return w.applyMatrix4(camera.matrixWorldInverse).z;
      };
      const zTL=viewZ(sc.tl), zTR=viewZ(sc.tr), zBL=viewZ(sc.bl), zBR=viewZ(sc.br);
      if (zTL > -0.1 || zTR > -0.1 || zBL > -0.1 || zBR > -0.1) return { visible:false };
      // Back-face culling: if the screen's normal points away from the
      // camera, don't render the overlay (we're looking at the back).
      // Use abs() — the sign of cross(edgeX, edgeY) depends on corner
      // winding which is an internal detail.
      const worldTL = sg.localToWorld(sc.tl.clone());
      const worldTR = sg.localToWorld(sc.tr.clone());
      const worldBL = sg.localToWorld(sc.bl.clone());
      const edgeX = worldTR.clone().sub(worldTL);
      const edgeY = worldBL.clone().sub(worldTL);
      const normal = edgeX.clone().cross(edgeY).normalize();
      const toCam = camera.position.clone().sub(worldTL).normalize();
      if (Math.abs(normal.dot(toCam)) < 0.02) return { visible:false };
      const toScreen = (local) => {
        const w = sg.localToWorld(local.clone());
        const p = w.project(camera);
        return { x:(p.x*0.5+0.5)*rect.width, y:(-p.y*0.5+0.5)*rect.height };
      };
      const TL=toScreen(sc.tl), TR=toScreen(sc.tr), BL=toScreen(sc.bl), BR=toScreen(sc.br);
      if (![TL.x,TL.y,TR.x,TR.y,BL.x,BL.y,BR.x,BR.y].every(isFinite)) return { visible:false };
      return { corners: { TL, TR, BL, BR }, visible:true };
    };
    window.__getCockpitScreenRect = () => xray.getScreenRect();

    // PC bounding-box projection for hover highlight
    window.__getCockpitPCRect = function(){
      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      scene.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);
      camera.updateProjectionMatrix();
      const bbox = new THREE.Box3().setFromObject(xray);
      if (bbox.isEmpty()) return null;
      const corners = [
        new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.min.z),
        new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.min.z),
        new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.min.z),
        new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.min.z),
        new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.max.z),
        new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.max.z),
        new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.max.z),
        new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.max.z),
      ];
      let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,anyInFront=false;
      corners.forEach(c => {
        const v = c.clone().applyMatrix4(camera.matrixWorldInverse);
        if (v.z < -0.05) anyInFront = true;
        const p = c.project(camera);
        const sx = ( p.x*0.5+0.5)*rect.width;
        const sy = (-p.y*0.5+0.5)*rect.height;
        if (sx<minX) minX=sx; if (sy<minY) minY=sy;
        if (sx>maxX) maxX=sx; if (sy>maxY) maxY=sy;
      });
      if (!anyInFront) return null;
      return { x:minX, y:minY, w:maxX-minX, h:maxY-minY };
    };


    // ══════════════════════════════════════════════════════════════
    // RUBIK'S CUBE removed — boot hands directly to cockpit.
    const rubiks = null;
    window.__cockpitCube = null;
    window.__getCockpitCubeScreenTarget = () => null;

    scene.fog = new THREE.Fog(T().fog, 60, 180);

    // ══════════════════════════════════════════════════════════════
    // LIVE GLOBE SCENE — hidden until user clicks the PC.
    // A large wireframe earth floating in space; cream continents on
    // jade wireframe ocean. Camera zooms to it when activated.
    // ══════════════════════════════════════════════════════════════
    const globeGroup = new THREE.Group();
    globeGroup.visible = false;
    // Place globe far in front of the default camera position so the
    // cockpit desk is not visible when we transition to globe view.
    globeGroup.position.set(0, 1.2, -8);
    scene.add(globeGroup);

    // Wireframe sphere (ocean)
    const globeR = 2.4;
    const globeGeo = new THREE.SphereGeometry(globeR, 48, 32);
    const globeWire = new THREE.Mesh(
      globeGeo,
      new THREE.MeshBasicMaterial({ color: 0x4B6E4F, wireframe: true, transparent: true, opacity: 0.55 })
    );
    globeGroup.add(globeWire);
    // Inner solid sphere (deep jade)
    const globeSolid = new THREE.Mesh(
      new THREE.SphereGeometry(globeR * 0.985, 48, 32),
      new THREE.MeshBasicMaterial({ color: 0x0E1A12 })
    );
    globeGroup.add(globeSolid);
    // Dotted longitude/latitude emphasis
    const gridGeo = new THREE.SphereGeometry(globeR * 1.002, 24, 16);
    const gridEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(gridGeo, 1),
      new THREE.LineBasicMaterial({ color: 0x7FA683, transparent: true, opacity: 0.35 })
    );
    globeGroup.add(gridEdges);
    // Scattered cream "city" points on the surface
    const cityCount = 120;
    const cityPos = new Float32Array(cityCount*3);
    for (let i=0;i<cityCount;i++){
      const t = Math.random()*Math.PI*2;
      const p = Math.acos(2*Math.random()-1);
      const r = globeR * 1.01;
      cityPos[i*3]   = r*Math.sin(p)*Math.cos(t);
      cityPos[i*3+1] = r*Math.sin(p)*Math.sin(t);
      cityPos[i*3+2] = r*Math.cos(p);
    }
    const cityGeo = new THREE.BufferGeometry();
    cityGeo.setAttribute('position', new THREE.BufferAttribute(cityPos, 3));
    const cities = new THREE.Points(cityGeo, new THREE.PointsMaterial({
      color: 0xE8E4DC, size: 3, sizeAttenuation: false, transparent: true, opacity: 0.9
    }));
    globeGroup.add(cities);
    // Outer glow halo
    const haloGeo = new THREE.RingGeometry(globeR*1.02, globeR*1.35, 64);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x4B6E4F, transparent: true, opacity: 0.08, side: THREE.DoubleSide
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    globeGroup.add(halo);
    // Orbit arc
    const orbitPts = [];
    for (let i=0;i<=128;i++){
      const a = (i/128)*Math.PI*2;
      orbitPts.push(new THREE.Vector3(Math.cos(a)*globeR*1.5, Math.sin(a)*globeR*0.18, Math.sin(a)*globeR*1.5));
    }
    globeGroup.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(orbitPts),
      new THREE.LineBasicMaterial({ color: 0x7FA683, transparent: true, opacity: 0.45 })
    ));

    // ══════════════════════════════════════════════════════════════
    // RAYCASTING — hover + click on PC (xray group)
    // ══════════════════════════════════════════════════════════════
    const raycaster = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2();
    let hoverPC = false;
    // Collect xray meshes for raycasting
    const pcPickables = [];
    xray.traverse(o => { if (o.isMesh) pcPickables.push(o); });

    const updatePickFromEvent = (e) => {
      const r = renderer.domElement.getBoundingClientRect();
      mouseNDC.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouseNDC.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(mouseNDC, camera);
      const hits = raycaster.intersectObjects(pcPickables, false);
      return hits.length > 0;
    };

    const onPointerMove = (e) => {
      if (viewMode !== 'cockpit') return;
      const hit = updatePickFromEvent(e);
      if (hit !== hoverPC){
        hoverPC = hit;
        window.__cockpitHoverPC = hoverPC;
        window.dispatchEvent(new CustomEvent('cockpit-hover', { detail:{ hovering: hit } }));
        renderer.domElement.style.cursor = hit ? 'pointer' : '';
      }
    };
    const onPointerDown = (e) => {
      if (viewMode !== 'cockpit') return;
      if (e.button !== 0) return;
      if (updatePickFromEvent(e)){
        setViewMode('monitor');
        e.stopPropagation();
        e.preventDefault();
      }
    };
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    // ══════════════════════════════════════════════════════════════
    // VIEW MODE — 'cockpit' (default) or 'monitor' (dolly in to screen)
    // Smoothly tween camera targets between the two.
    // ══════════════════════════════════════════════════════════════
    let viewMode = 'cockpit';
    let modeT = 0;  // 0 = cockpit, 1 = monitor
    let smoothYaw = 0, smoothPitch = 0;  // butter-lerped toward cursor target
    const setViewMode = (m) => {
      viewMode = m;
      window.__cockpitViewMode = m;
      window.dispatchEvent(new CustomEvent('cockpit-view-mode', { detail:{ mode: m } }));
      if (m === 'cockpit'){ hoverPC = false; renderer.domElement.style.cursor = ''; }
    };
    window.__setCockpitViewMode = setViewMode;

    const clock = new THREE.Clock();
    let raf;
    const animate = () => {
      const dt = clock.getDelta();
      const t = clock.elapsedTime;

      // Ease modeT toward target (0 = cockpit, 1 = monitor)
      const target = (viewMode === 'monitor') ? 1 : 0;
      modeT += (target - modeT) * Math.min(1, dt * 2.2);

      // Globe stays hidden
      globeGroup.visible = false;

      // Bobblehead removed — no-op

      tBox.rotation.x += dt*.6;
      tBox.rotation.y += dt*.9;
      tRing.rotation.z += dt*.3;

      // Tiny oscillation of the computer (no screen pulse — HTML overlay handles)
      xray.rotation.y = pcYaw + Math.sin(t*0.25)*0.05;

      if (rubiks && rubiks.update) rubiks.update(t, dt);

      // External tick hooks (e.g. VinylCrate)
      if (window.__cockpitTick) window.__cockpitTick(dt, t);

      // ── Camera ────────────────────────────────────────────────
      // Cockpit pose: cursor drives yaw/pitch with breathing bob.
      // Monitor pose: dolly toward the PC monitor, face-on.
      // Butter-smooth the mouse-driven yaw/pitch — a slow exponential
      // ease so sweeping the cursor feels like pulling a heavy gimbal.
      const yawTarget = yawRef.current || 0;
      const pitchTarget = pitchRef.current || 0;
      const smoothK = 1 - Math.exp(-dt * 2.2); // ~0.45s settle time
      smoothYaw   += (yawTarget   - smoothYaw)   * smoothK;
      smoothPitch += (pitchTarget - smoothPitch) * smoothK;
      window.__cockpitSmoothedYaw = smoothYaw;
      window.__cockpitSmoothedPitch = smoothPitch;
      const yaw = smoothYaw;
      const pitch = smoothPitch;

      // Cockpit target
      const cockpitPos = new THREE.Vector3(
        Math.sin(t*.4)*.12,
        Math.sin(t*.6)*.15,
        0
      );
      const cockpitYaw = yaw;
      const cockpitPitch = pitch;

      // Monitor target — aim camera directly at the 3D screen center.
      // The PC (xray) is yawed so its local +Z faces the viewer (default
      // camera at origin). Use xray's world +Z direction as the outward
      // normal, regardless of cross-product winding quirks.
      xray.updateMatrixWorld(true);
      const sc = xray.userData && xray.userData.screenCorners;
      const sg = (xray.userData && xray.userData.screenGroup) || xray;
      let monitorPos, monitorQuat;
      if (sc){
        const wTL = sg.localToWorld(sc.tl.clone());
        const wTR = sg.localToWorld(sc.tr.clone());
        const wBL = sg.localToWorld(sc.bl.clone());
        const wBR = sg.localToWorld(sc.br.clone());
        const center = wTL.clone().add(wTR).add(wBL).add(wBR).multiplyScalar(0.25);
        const edgeX = wTR.clone().sub(wTL);
        const edgeY = wBL.clone().sub(wTL);
        // Outward normal: use the PC's local +Z direction in world (front).
        const outward = new THREE.Vector3(0, 0, 1).applyQuaternion(xray.getWorldQuaternion(new THREE.Quaternion()));
        outward.normalize();
        const screenW = edgeX.length();
        const screenH = edgeY.length();
        const fovY = camera.fov * Math.PI / 180;
        const aspect = camera.aspect || 1;
        // Distance so the screen fills ~80% of the viewport's short edge.
        const fitFill = 0.8;
        const distV = (screenH / fitFill) / (2 * Math.tan(fovY / 2));
        const distH = (screenW / fitFill) / (2 * Math.tan(fovY / 2) * aspect);
        const dollyDist = Math.max(distV, distH);
        monitorPos = center.clone().add(outward.clone().multiplyScalar(dollyDist));
        // Tiny cursor parallax
        monitorPos.x += yaw * 0.15;
        monitorPos.y += pitch * 0.1;
        // Compute the look-at quaternion using a throwaway Camera so we
        // use Three's camera convention (-Z forward). Object3D.lookAt
        // orients +Z which would flip us 180°.
        const look = new THREE.PerspectiveCamera();
        look.position.copy(monitorPos);
        look.up.set(0, 1, 0);
        look.lookAt(center);
        monitorQuat = look.quaternion.clone();
      } else {
        // Fallback
        const pcWorld = new THREE.Vector3();
        xray.getWorldPosition(pcWorld);
        monitorPos = new THREE.Vector3(pcWorld.x, pcWorld.y + 1.2, pcWorld.z + 2.4);
        monitorQuat = new THREE.Quaternion();
      }

      // Interpolate
      const mt = easeInOut(modeT);
      camera.position.x = cockpitPos.x + (monitorPos.x - cockpitPos.x) * mt;
      camera.position.y = cockpitPos.y + (monitorPos.y - cockpitPos.y) * mt;
      camera.position.z = cockpitPos.z + (monitorPos.z - cockpitPos.z) * mt;
      // Cockpit orientation as a quaternion (YXZ euler)
      const cockpitQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(cockpitPitch, cockpitYaw, 0, 'YXZ')
      );
      camera.quaternion.copy(cockpitQuat).slerp(monitorQuat, mt);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      camera.aspect = mount.clientWidth/mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('cockpit-theme', onTheme);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{position:'absolute',inset:0,zIndex:0}}/>;
}

function easeInOut(x){ return x<.5 ? 2*x*x : 1-Math.pow(-2*x+2,2)/2; }
Object.assign(window, { GlobeCanvas });
