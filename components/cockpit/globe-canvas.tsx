"use client"
// @ts-nocheck
// GlobeCanvas - the procedural three.js cockpit scene (x-ray PC, keyboard,
// desk, starfield, free-look camera, PC hover/monitor view).
// Ported from the Cockpit.html prototype (Globe.jsx): CDN three -> npm three,
// and the vinyl crate is now attached directly instead of self-polling.
import React from "react"
import * as THREE from "three"
import { buildVinylCrate } from "./vinyl-crate"
import { buildTurntable } from "./turntable"
import { buildCoffee } from "./coffee"
import { buildGlassMac } from "./glass-mac"
import { CURSOR_POINTER } from "./cursors"

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
    if (!mount) return;
    THREE.ColorManagement.enabled = false;

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
    let glassMacHandle = null;   // set once the GlassMac is built
    const applyTheme = () => {
      const t = T();
      if (glassMacHandle && glassMacHandle.applyTheme) glassMacHandle.applyTheme(curTheme);
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
        // Triangulated lattice (webgl_helpers style) instead of edge outlines
        new THREE.WireframeGeometry(new THREE.CylinderGeometry(0.22, 0.22, 8, 6, 6)),
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
      new THREE.WireframeGeometry(new THREE.BoxGeometry(20, 0.15, 7.5, 8, 1, 3)),
      shelfWireMat
    );
    shelfWire.position.y = -4;
    tableGroup.add(shelfWire);

    // Desk surface — webgl_helpers-style triangulated schematic mesh: a
    // segmented plane rendered via WireframeGeometry (every triangle edge,
    // diagonals included) replaces the old straight ruled grid.
    const meshGridGeo = new THREE.PlaneGeometry(21.6, 8.8, 12, 5);
    meshGridGeo.rotateX(-Math.PI/2);
    const meshGridMat = new THREE.LineBasicMaterial({ color: T().gridLine, transparent:true, opacity: T().gridOp });
    themeTargets.gridLine.push(meshGridMat);
    const meshGrid = new THREE.LineSegments(new THREE.WireframeGeometry(meshGridGeo), meshGridMat);
    meshGrid.position.y = 0.19;
    tableGroup.add(meshGrid);

    // Jade normal pins at every grid vertex — the VertexNormalsHelper look,
    // built as static local-space segments so they track the desk transform
    // (and the FPV offset) for free.
    const pinPts = [];
    const gridPos = meshGridGeo.getAttribute('position');
    for (let i = 0; i < gridPos.count; i++){
      const px = gridPos.getX(i), pz = gridPos.getZ(i);
      pinPts.push(new THREE.Vector3(px, 0.19, pz), new THREE.Vector3(px, 0.53, pz));
    }
    const pinMat = new THREE.LineBasicMaterial({ color: T().jadeAccent, transparent:true, opacity: 0.35 });
    themeTargets.jadeAccent.push(pinMat);
    tableGroup.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pinPts), pinMat));

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

    // -- GLASS MAC: transparent acrylic all-in-one + keyboard + mouse --
    // Superglass redesign (see components/cockpit/glass-mac.ts). Builds
    // into xray and wires the screen-overlay contract (screenCorners).
    const glassMac = buildGlassMac(xray);
    const keyboard = glassMac.keyboard;
    window.__cockpitKeyboard = keyboard;
    glassMacHandle = glassMac;
    glassMac.applyTheme(curTheme);


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
        renderer.domElement.style.cursor = hit ? CURSOR_POINTER : '';
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
    // VIEW MODE — 'cockpit' (default), 'monitor' (dolly to the PC
    // screen) or 'crate' (dolly to the vinyl crate). modeT eases
    // 0 → 1 toward the focused pose; focusKind remembers WHICH pose
    // so the ease-out after exiting still uses the right target.
    // ══════════════════════════════════════════════════════════════
    let viewMode = 'cockpit';
    let focusKind = 'monitor';
    let modeT = 0;  // 0 = cockpit, 1 = focused (monitor or crate)
    let smoothYaw = 0, smoothPitch = 0;  // butter-lerped toward cursor target
    window.__cockpitViewMode = 'cockpit';
    const setViewMode = (m) => {
      viewMode = m;
      if (m === 'monitor' || m === 'crate') focusKind = m;
      window.__cockpitViewMode = m;
      window.dispatchEvent(new CustomEvent('cockpit-view-mode', { detail:{ mode: m } }));
      if (m === 'cockpit'){ hoverPC = false; renderer.domElement.style.cursor = ''; }
    };
    window.__setCockpitViewMode = setViewMode;

    // Attach the wooden vinyl crate (VinylCrate.jsx port). It registers its own
    // hover/scroll listeners and a per-frame tick the render loop pumps.
    let crate = null;
    try { crate = buildVinylCrate(scene, tableGroup, camera, renderer); } catch (e) { /* crate optional */ }
    let turntable = null;
    try { turntable = buildTurntable(scene, tableGroup); } catch (e) { /* turntable optional */ }
    let coffeeStation = null;
    try { coffeeStation = buildCoffee(scene, tableGroup, camera, renderer); } catch (e) { /* coffee optional */ }
    window.__cockpitTick = (dt, t) => {
      if (crate && crate.tick) crate.tick(dt, t);
      if (turntable && turntable.tick) turntable.tick(dt, t);
      if (coffeeStation && coffeeStation.tick) coffeeStation.tick(dt, t);
    };

    const clock = new THREE.Clock();
    let raf;
    const animate = () => {
      const dt = clock.getDelta();
      const t = clock.elapsedTime;

      // Ease modeT toward target (0 = cockpit, 1 = focused pose)
      const target = (viewMode === 'monitor' || viewMode === 'crate') ? 1 : 0;
      modeT += (target - modeT) * Math.min(1, dt * 2.2);

      // Globe stays hidden
      globeGroup.visible = false;

      // Bobblehead removed — no-op

      tBox.rotation.x += dt*.6;
      tBox.rotation.y += dt*.9;
      tRing.rotation.z += dt*.3;

      // PC sits dead still — no idle oscillation.
      xray.rotation.y = pcYaw;

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

      // Cockpit target — static seat, no breathing bob (desk objects must
      // read as perfectly still).
      const cockpitPos = new THREE.Vector3(0, 0, 0);
      const cockpitYaw = yaw;
      const cockpitPitch = pitch;

      // Focused pose — either the PC monitor or the vinyl crate.
      let monitorPos, monitorQuat;
      if (focusKind === 'crate' && crate && crate.getFocusTarget){
        // Crate target — hover above-and-in-front of the bin, looking
        // down into it so the covers + top edges read while digging.
        const info = crate.getFocusTarget();
        const fovY = camera.fov * Math.PI / 180;
        // Distance so the record row (crate depth) fits the viewport height.
        const dist = Math.max(1.5, (info.fitDepth / 0.8) / (2 * Math.tan(fovY / 2)));
        const dir = info.outward.clone().add(new THREE.Vector3(0, 1.8, 0)).normalize();   // steep top-down over the bin
        monitorPos = info.center.clone().add(dir.multiplyScalar(dist));
        // NO cursor parallax here — the crate view must hold a fixed
        // perspective while records are pulled/browsed (moving toward the
        // HUD arrows would otherwise swing the camera).
        const look = new THREE.PerspectiveCamera();
        look.position.copy(monitorPos);
        look.up.set(0, 1, 0);
        look.lookAt(info.center);
        monitorQuat = look.quaternion.clone();
      } else {
      // Monitor target — aim camera directly at the 3D screen center.
      // The PC (xray) is yawed so its local +Z faces the viewer (default
      // camera at origin). Use xray's world +Z direction as the outward
      // normal, regardless of cross-product winding quirks.
      xray.updateMatrixWorld(true);
      const sc = xray.userData && xray.userData.screenCorners;
      const sg = (xray.userData && xray.userData.screenGroup) || xray;
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
      if (crate && crate.disposeCrate) crate.disposeCrate();
      if (coffeeStation && coffeeStation.dispose) coffeeStation.dispose();
      window.__cockpitTick = null;
      window.__cockpitScene = null;
      window.__cockpitCamera = null;
      window.__cockpitRenderer = null;
      window.__cockpitTableGroup = null;
      window.__cockpitPC = null;
      window.__cockpitKeyboard = null;
      window.__cockpitFPV = null;
      window.__cockpitVinyl = null;
      window.__cockpitTurntable = null;
      window.__getCockpitScreenRect = null;
      window.__getCockpitPCRect = null;
      window.__setCockpitViewMode = null;
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{position:'absolute',inset:0,zIndex:0}}/>;
}

function easeInOut(x){ return x<.5 ? 2*x*x : 1-Math.pow(-2*x+2,2)/2; }
export { GlobeCanvas };
