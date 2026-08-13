"use client"
// @ts-nocheck
// GlobeCanvas - the procedural three.js cockpit scene (x-ray PC, keyboard,
// desk, starfield, free-look camera, PC hover/monitor view).
// Ported from the Cockpit.html prototype (Globe.jsx): CDN three -> npm three,
// and the vinyl crate is now attached directly instead of self-polling.
import React from "react"
import * as THREE from "three"
import { createRandomSource } from "@/lib/random/seeded-streams"
import {
  safeFrameToNdcBounds,
  solveCameraFit,
} from "@/lib/responsive/camera-fit"
import {
  FOCUS_CAMERA_DISTANCE_BOUNDS,
  FOCUS_FALLBACK_DISTANCE,
  FIT_NDC_MARGIN,
  MIN_FIT_FRAME_PX,
  computeSafeFrame,
} from "@/lib/responsive/hud-layout"
import { buildVinylCrate } from "./vinyl-crate"
import { buildTurntable } from "./turntable"
import { buildCoffee } from "./coffee"
import { buildGlassMac } from "./glass-mac"
import { buildDecorations } from "./decorations"
import { buildTeaSet } from "./tea-set"
import { buildIncense } from "./incense"
import { makeEdgeGlow } from "./highlights"
import { CURSOR_POINTER } from "./cursors"
import {
  clearMainRendererSize,
  getVisualCaptureFrameState,
  getVisualCaptureSeed,
  markSceneConstructed,
  reportFrame,
  reportMainRendererSize,
  reportVisualCaptureStream,
  registerFocusFitProbe,
  unregisterFocusFitProbe,
} from "./test-hooks"
import { getFrameTimes, setFrameTimes } from "./frame-times"
import {
  computeHudFrame,
  getCurrentHudFrameId,
  nextHudFrameId,
  parkHudSampler,
  resetHudSampler,
} from "./hud-sampler"
import { createRendererSizeSync } from "./renderer-size-sync"
import { registerPointerActivation } from "./pointer-activation"
import {
  getEffectiveFocusReservations,
  getFocusReservationsEpoch,
  resetFocusFitStore,
  setActiveFocusKind,
  setFocusFitStatus,
  subscribeFocusFitEvents,
} from "./focus-fit-store"

// Globe.jsx — cockpit 3D scene.
// A translucent x-ray retro computer sits on the RIGHT side of the desk
// (replaces the old airplane-on-orbit-rail). Front bezel faces the camera
// so the glowing jade screen is visible; CRT funnel, circuit board, keys,
// mouse and cable all rendered as frosted shell + jade-wireframe internals
// in the site's editorial palette.
function GlobeCanvas({ yawRef, pitchRef, onContextEvent, restore }){
  const mountRef = React.useRef(null);

  React.useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    resetHudSampler();
    resetFocusFitStore();
    // Lifecycle cutoff for the §9.6.1 test bridge: visual-capture
    // configuration must precede scene construction.
    markSceneConstructed();
    const captureFrameState = getVisualCaptureFrameState();
    const visualCaptureSeed = getVisualCaptureSeed();
    const preservePhase4FocusBaseline =
      visualCaptureSeed === 'ax-cockpit-phase4-v1';
    const baseRandomSource = createRandomSource(visualCaptureSeed);
    const randomSource = {
      seeded: baseRandomSource.seeded,
      stream(name){
        reportVisualCaptureStream(name);
        return baseRandomSource.stream(name);
      },
    };
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
        glowLine:  0x7FE6A4,             // saturated light jade wireframe
        glowBlend: THREE.NormalBlending,
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
        glowLine:  0x3A5A3E,             // additive washes out on ivory —
        glowBlend: THREE.NormalBlending, // deep-jade ink outline instead
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
      glowLine: [],   // edge-glow trace materials (highlights.ts)
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
      themeTargets.glowLine.forEach(m => { m.color.setHex(t.glowLine); m.blending = t.glowBlend; m.needsUpdate = true; });
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

    const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 2000);
    camera.position.set(0, 0, 0);
    window.__cockpitCamera = camera;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
    } catch {
      window.removeEventListener('cockpit-theme', onTheme);
      disposeObjectGraph(scene);
      window.__cockpitScene = null;
      window.__cockpitCamera = null;
      onContextEvent?.('failed');
      return;
    }
    let disposed = false;
    let contextAlive = true;
    let raf;
    const onContextLost = (event) => {
      event.preventDefault();
      if (disposed || !contextAlive) return;
      contextAlive = false;
      if (raf !== undefined) cancelAnimationFrame(raf);
      raf = undefined;
      sizeSync.dispose();
      parkHudSampler();
      reportFrame(false, getCurrentHudFrameId());
      onContextEvent?.('lost');
    };
    const onContextRestored = () => {
      if (disposed) return;
      onContextEvent?.('restored');
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    Object.assign(renderer.domElement.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      display: 'block',
    });
    mount.appendChild(renderer.domElement);
    window.__cockpitRenderer = renderer;
    let rendererSizeVersion = 0;
    let rendererSizeTarget = null;
    const sizeSync = createRendererSizeSync({
      mount,
      renderer,
      camera,
      onApplied: (target, sizeVersion) => {
        rendererSizeTarget = target;
        rendererSizeVersion = sizeVersion;
        reportMainRendererSize(target, sizeVersion);
        if (contextAlive && !disposed) renderer.render(scene, camera);
      },
    });
    sizeSync.sync();

    // Starfield — sparse cream dots
    const starGeo = new THREE.BufferGeometry();
    const starCount = 700;
    const starPos = new Float32Array(starCount*3);
    const starfieldRandom = randomSource.stream('starfield');
    for (let i=0;i<starCount;i++){
      const r = 800;
      const t = starfieldRandom.next()*Math.PI*2;
      const p = Math.acos(2*starfieldRandom.next()-1);
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
    let focusTransformEpoch = 0;
    // FPV camera-offset controls:
    //  height  = how high above the desk the viewer sits (raises camera → lowers desk)
    //  distance = how far back the viewer is (pushes desk away → larger negative Z)
    let fpvHeight = 0, fpvDistance = 0;
    window.__cockpitFPV = {
      setOffset({ height, distance } = {}){
        let changed = false;
        if (typeof height === 'number' && height !== fpvHeight) {
          fpvHeight = height;
          changed = true;
        }
        if (typeof distance === 'number' && distance !== fpvDistance) {
          fpvDistance = distance;
          changed = true;
        }
        tableGroup.position.set(0, tableBaseY - fpvHeight, tableBaseZ - fpvDistance);
        if (changed) focusTransformEpoch += 1;
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

    let pmrem = null;
    let envScene = null;
    let environmentTexture = null;

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
        pmrem = new THREE.PMREMGenerator(renderer);
        pmrem.compileEquirectangularShader();
        // Build a small "room" by hand: a box of colored emissive planes
        // around the origin. Produces a convincing PBR env for the
        // MeshPhysicalMaterial (reflections + refraction).
        envScene = new THREE.Scene();
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
        environmentTexture = pmrem.fromScene(envScene, 0.04).texture;
        scene.environment = environmentTexture;
      } catch(e){ /* ok — material just won't refract as richly */ }
    }

    // -- GLASS MAC: transparent acrylic all-in-one + keyboard + mouse --
    // Superglass redesign (see components/cockpit/glass-mac.ts). Builds
    // into xray and wires the screen-overlay contract (screenCorners).
    const glassMac = buildGlassMac(xray, { randomSource });
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
      let changed = false;
      if (typeof x === 'number' && x !== pcX) { pcX = x; changed = true; }
      if (typeof y === 'number' && y !== pcY) { pcY = y; changed = true; }
      if (typeof z === 'number' && z !== pcZ) { pcZ = z; changed = true; }
      if (typeof scale === 'number' && scale !== pcScale) { pcScale = scale; changed = true; }
      if (typeof yaw === 'number' && yaw !== pcYaw) { pcYaw = yaw; changed = true; }
      if (typeof pitch === 'number' && pitch !== pcPitch) { pcPitch = pitch; changed = true; }
      if (typeof roll === 'number' && roll !== pcRoll) { pcRoll = roll; changed = true; }
      xray.position.set(pcX, pcY, pcZ);
      xray.scale.setScalar(pcScale);
      xray.rotation.x = pcPitch;
      xray.rotation.y = pcYaw;
      xray.rotation.z = pcRoll;
      if (changed) focusTransformEpoch += 1;
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
    const globeCitiesRandom = randomSource.stream('globe-cities');
    for (let i=0;i<cityCount;i++){
      const t = globeCitiesRandom.next()*Math.PI*2;
      const p = Math.acos(2*globeCitiesRandom.next()-1);
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
    // RAYCASTING — hover over the heroes (PC / turntable / coffee) +
    // click on PC. The crate owns its own picking (vinyl-crate.ts) and
    // reports hover via the 'cockpit-crate-hover' event. Hover drives
    // the per-object edge glow and the HUD name tag (__cockpitHoveredTag).
    // ══════════════════════════════════════════════════════════════
    const raycaster = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2();
    const projectedPcPoint = new THREE.Vector3();
    const projectedPcTop = new THREE.Vector3();
    const projectedPcBottom = new THREE.Vector3();
    let hoverId = null;   // 'pc' | 'turntable' | 'coffee' | null
    // Pickable meshes per hover target. PC is built already; turntable and
    // coffee register into this map after they're constructed below.
    const pcPickables = [];
    xray.traverse(o => { if (o.isMesh) pcPickables.push(o); });
    const hoverPickables = { pc: pcPickables, turntable: [], coffee: [] };

    const pickHoverId = (e) => {
      const r = renderer.domElement.getBoundingClientRect();
      mouseNDC.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouseNDC.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(mouseNDC, camera);
      let best = null, bestDist = Infinity;
      for (const id in hoverPickables){
        const hits = raycaster.intersectObjects(hoverPickables[id], false);
        if (hits.length && hits[0].distance < bestDist){ best = id; bestDist = hits[0].distance; }
      }
      return best;
    };

    const applyHover = (id) => {
      if (id === hoverId) return;
      hoverId = id;
      window.__cockpitHoveredTag = id;
      const hp = id === 'pc';
      if (hp !== !!window.__cockpitHoverPC){
        window.__cockpitHoverPC = hp;
        window.dispatchEvent(new CustomEvent('cockpit-hover', { detail:{ hovering: hp } }));
      }
      Object.keys(hoverPickables).forEach(k => edgeGlow.setBoost(k, id === k ? 1 : 0));
      // Pointer cursor only for the clickable PC — coffee manages its own
      // cursor (click loop), the turntable is decorative.
      renderer.domElement.style.cursor = hp ? CURSOR_POINTER : '';
    };

    const onPointerMove = (e) => {
      if (viewMode !== 'cockpit') return;
      applyHover(pickHoverId(e));
    };
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    const unregisterPcActivation = registerPointerActivation(
      renderer.domElement,
      {
        owner: 'pc',
        hitTest: (point) => viewMode === 'cockpit' && pickHoverId(point) === 'pc'
          ? { key: 'pc' }
          : null,
        testPoint: (key) => {
          if (key !== 'pc' || viewMode !== 'cockpit') return null;
          const screenCorners = xray.userData.screenCorners;
          const screenGroup = xray.userData.screenGroup || xray;
          if (!screenCorners || !screenGroup) return null;
          scene.updateMatrixWorld(true);
          camera.updateMatrixWorld(true);
          camera.updateProjectionMatrix();
          const r = renderer.domElement.getBoundingClientRect();
          if (!r.width || !r.height) return null;
          const points = [];
          // Prefer the authored CRT face over a coarse whole-PC bounding box.
          // The arbiter validates every proposal through DOM delivery, owner
          // priority, and the live PC raycast before exposing it to Playwright.
          for (const yf of [0.5, 0.35, 0.65]) {
            for (const xf of [0.5, 0.35, 0.65]) {
              projectedPcTop.copy(screenCorners.tl).lerp(screenCorners.tr, xf);
              projectedPcBottom.copy(screenCorners.bl).lerp(screenCorners.br, xf);
              projectedPcPoint.copy(projectedPcTop).lerp(projectedPcBottom, yf);
              screenGroup.localToWorld(projectedPcPoint);
              projectedPcPoint.project(camera);
              points.push({
                x: r.left + (projectedPcPoint.x + 1) * r.width / 2,
                y: r.top + (1 - projectedPcPoint.y) * r.height / 2,
              });
            }
          }
          return points;
        },
        action: () => setViewMode('monitor'),
      },
    );

    // ══════════════════════════════════════════════════════════════
    // VIEW MODE — 'cockpit' (default), 'monitor' (dolly to the PC
    // screen) or 'crate' (dolly to the vinyl crate). modeT eases
    // 0 → 1 toward the focused pose; focusKind remembers WHICH pose
    // so the ease-out after exiting still uses the right target.
    // ══════════════════════════════════════════════════════════════
    const restoredViewMode = restore?.viewMode ?? 'cockpit';
    let viewMode = restoredViewMode;
    let focusKind = restoredViewMode === 'cockpit' ? 'monitor' : restoredViewMode;
    let modeT = restoredViewMode === 'cockpit' ? 0 : 1;
    let focusSwitch = null;  // eases between two focused poses (crate → deck)
    const REFIT_BLEND_S = 0.6;
    const REFIT_MAX_FRAME_STEP_S = 1 / 30;
    const focusLookCamera = new THREE.PerspectiveCamera();
    const focusPosition = new THREE.Vector3();
    const baselineFocusCenter = new THREE.Vector3();
    const baselineFocusDirection = new THREE.Vector3();
    const baselineFocusQuaternion = new THREE.Quaternion();
    const focusBlendPosition = new THREE.Vector3();
    const focusBlendQuaternion = new THREE.Quaternion();
    const fitCache = new Map();
    const lastValidFitDistance = new Map();
    const failedFitEpisodes = new Set();
    let focusFitSolveCount = 0;
    const tombstoneFit = (kind) => {
      const entry = fitCache.get(kind);
      if (entry) entry.tombstoned = true;
    };
    const discardTombstone = (kind) => {
      const entry = fitCache.get(kind);
      if (entry?.tombstoned) fitCache.delete(kind);
    };
    const unsubscribeFocusFitEvents = subscribeFocusFitEvents((event) => {
      if (event.type !== 'accessibility-invalidated') return;
      for (const kind of event.discardedKinds) {
        if (kind === focusKind && viewMode === 'cockpit' && modeT >= 0.005) {
          tombstoneFit(kind);
        } else {
          fitCache.delete(kind);
        }
      }
    });
    let smoothYaw = 0, smoothPitch = 0;  // butter-lerped toward cursor target
    const FOCUSED = (m) => m === 'monitor' || m === 'crate' || m === 'deck';
    if (FOCUSED(restoredViewMode)) setActiveFocusKind(restoredViewMode);
    window.__cockpitViewMode = restoredViewMode;
    const setViewMode = (m) => {
      const wasFocused = FOCUSED(viewMode);
      const previousFocusKind = focusKind;
      let capturedDepartingPose = false;
      viewMode = m;
      if (FOCUSED(m)){
        // Switching directly between two focused poses (crate → deck):
        // modeT is already ~1, so without this the camera would snap.
        // Capture the current pose and blend toward the new target. The
        // crate→deck move completes just before the dust cover clears at
        // ~400ms, so the record flight is viewed from a stable camera
        // instead of combining two large motions in the same frames.
        if (wasFocused && focusKind !== m && modeT > 0.3){
          capturedDepartingPose = true;
          focusSwitch = {
            pos: camera.position.clone(),
            quat: camera.quaternion.clone(),
            t: 0,
            duration: focusKind === 'crate' && m === 'deck' ? 0.38 : 0.85,
            refit: false,
          };
        }
        const transition = setActiveFocusKind(m);
        if (transition.cancelledUncommitted && transition.departedKind) {
          if (capturedDepartingPose) fitCache.delete(transition.departedKind);
          else tombstoneFit(transition.departedKind);
        }
        focusKind = m;
        if (previousFocusKind !== m) discardTombstone(previousFocusKind);
      } else {
        const transition = setActiveFocusKind(null);
        if (transition.cancelledUncommitted && transition.departedKind) {
          tombstoneFit(transition.departedKind);
        }
      }
      window.__cockpitViewMode = m;
      window.dispatchEvent(new CustomEvent('cockpit-view-mode', { detail:{ mode: m } }));
      if (m === 'cockpit'){ applyHover(null); renderer.domElement.style.cursor = ''; }
    };
    window.__setCockpitViewMode = setViewMode;

    // Attach the wooden vinyl crate (VinylCrate.jsx port). It registers its own
    // hover/scroll listeners and a per-frame tick the render loop pumps.
    let crate = null;
    try {
      crate = buildVinylCrate(scene, tableGroup, camera, renderer, {
        randomSource,
        restore,
      });
    } catch (e) { /* crate optional */ }
    let turntable = null;
    try {
      turntable = buildTurntable(scene, tableGroup, camera, renderer, { restore });
    } catch (e) { /* turntable optional */ }
    const invalidateFocusOnCall = (target, method) => {
      if (!target || typeof target[method] !== 'function') return;
      const original = target[method];
      target[method] = function(...args){
        const before = [
          target.position.x, target.position.y, target.position.z,
          target.rotation.x, target.rotation.y, target.rotation.z,
          target.scale.x, target.scale.y, target.scale.z,
        ];
        const value = original.apply(this, args);
        const objectTransformChanged =
          before[0] !== target.position.x ||
          before[1] !== target.position.y ||
          before[2] !== target.position.z ||
          before[3] !== target.rotation.x ||
          before[4] !== target.rotation.y ||
          before[5] !== target.rotation.z ||
          before[6] !== target.scale.x ||
          before[7] !== target.scale.y ||
          before[8] !== target.scale.z;
        if (objectTransformChanged || value === true) focusTransformEpoch += 1;
        return value;
      };
    };
    invalidateFocusOnCall(crate, 'setTransform');
    invalidateFocusOnCall(turntable, 'setTransform');
    invalidateFocusOnCall(turntable, 'setArmPose');
    let coffeeStation = null;
    try { coffeeStation = buildCoffee(scene, tableGroup, camera, renderer, { randomSource }); } catch (e) { /* coffee optional */ }
    let decorations = null;
    try { decorations = buildDecorations(scene, tableGroup, camera, renderer); } catch (e) { /* decorations optional */ }
    let teaSet = null;
    try { teaSet = buildTeaSet(scene, tableGroup, { randomSource }); } catch (e) { /* tea set optional */ }
    let incense = null;
    try { incense = buildIncense(scene, tableGroup, { randomSource }); } catch (e) { /* incense optional */ }
    window.__cockpitTick = (dt, t) => {
      setFrameTimes(dt, t, captureFrameState);
      if (crate && crate.tick) crate.tick(dt, t);
      if (turntable && turntable.tick) turntable.tick(dt, t);
      if (coffeeStation && coffeeStation.tick) coffeeStation.tick(dt, t);
      if (decorations && decorations.tick) decorations.tick(dt, t);
      if (teaSet && teaSet.tick) teaSet.tick(dt, t);
      if (incense && incense.tick) incense.tick(dt, t);
    };

    // Register turntable + coffee meshes with the hover raycaster (the
    // coffee set includes its invisible fat pick volumes — generous target).
    // Skip the deck's hologram meshes (card/beam — userData.noPick): they
    // sit in front of everything in deck view and must never grab hover.
    if (turntable) turntable.traverse(o => { if (o.isMesh && !o.userData.noPick) hoverPickables.turntable.push(o); });
    if (coffeeStation && coffeeStation.glowTargets)
      coffeeStation.glowTargets.forEach(root =>
        root.traverse(o => { if (o.isMesh) hoverPickables.coffee.push(o); }));

    // ── Edge-glow traces on the four interactive heroes ───────────
    // Jade schematic outlines (highlights.ts), invisible at rest — each
    // fades in as a faint outline glow while its object is hovered
    // (PC/turntable/coffee via applyHover; crate via its hover event).
    const edgeGlow = makeEdgeGlow();
    try {
      themeTargets.glowLine.push(edgeGlow.attach('pc', xray, { color: T().glowLine }));
      // crate: rounded-box shell + frost walls have soft creases — trace
      // with a much finer crease angle and let smaller parts in, so the
      // hover outline actually reads.
      if (crate)     themeTargets.glowLine.push(edgeGlow.attach('crate', crate, { color: T().glowLine, edgeThresh: 10, minRadius: 0.05 }));
      if (turntable) themeTargets.glowLine.push(edgeGlow.attach('turntable', turntable, { color: T().glowLine }));
      if (coffeeStation && coffeeStation.glowTargets)
        themeTargets.glowLine.push(edgeGlow.attach('coffee', coffeeStation.glowTargets, { color: T().glowLine }));
    } catch (e) { /* glow is cosmetic */ }
    const onCrateHoverGlow = (e) => {
      const h = !!(e.detail && e.detail.hovering);
      edgeGlow.setBoost('crate', h ? 1 : 0);
      // Crate hover also drives its HUD name tag. Only clear on unhover if
      // the crate still owns the tag (the central raycast may have already
      // handed it to pc/turntable/coffee in this same pointermove).
      if (h) window.__cockpitHoveredTag = 'crate';
      else if (window.__cockpitHoveredTag === 'crate') window.__cockpitHoveredTag = null;
    };
    window.addEventListener('cockpit-crate-hover', onCrateHoverGlow);

    // ── Name-tag anchors for the HUD (ObjectTags) ─────────────────
    // World-space points floated above each hero, projected to screen
    // space. The HUD polls this per rAF and draws the "PC · CHATBOT"-style
    // labels only in the cockpit view.
    const anchorV = new THREE.Vector3();
    window.__getCockpitAnchors = function(){
      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      const out = [];
      const push = (id, world) => {
        if (!world) return;
        const v = world.clone().applyMatrix4(camera.matrixWorldInverse);
        if (v.z > -0.1) return;                       // behind the camera
        const p = world.clone().project(camera);
        out.push({ id, x: (p.x*0.5+0.5)*rect.width, y: (-p.y*0.5+0.5)*rect.height });
      };
      push('pc', xray.localToWorld(anchorV.set(0, 3.2, 0)).clone());
      if (crate)     push('crate', crate.localToWorld(anchorV.set(0, 1.4, 0)).clone());
      if (turntable) push('turntable', turntable.localToWorld(anchorV.set(0, 0.85, 0)).clone());
      if (coffeeStation && coffeeStation.getAnchorWorld) push('coffee', coffeeStation.getAnchorWorld(anchorV).clone());
      return out;
    };

    // ── Shared focused-HUD sampler inputs ───────────────────────
    // All world/view/NDC work happens here once, after the frame's camera
    // pose is final. hud-sampler owns validity, stage conversion, grace,
    // publication, and React notification.
    const hudViewPoint = new THREE.Vector3();
    const hudNdcPoint = new THREE.Vector3();
    const hudEdgeX = new THREE.Vector3();
    const hudEdgeY = new THREE.Vector3();
    const hudNormal = new THREE.Vector3();
    const hudToCamera = new THREE.Vector3();
    const toHudSample = (world) => {
      hudViewPoint.copy(world).applyMatrix4(camera.matrixWorldInverse);
      hudNdcPoint.copy(world).project(camera);
      return {
        ndcX: hudNdcPoint.x,
        ndcY: hudNdcPoint.y,
        ndcZ: hudNdcPoint.z,
        viewZ: hudViewPoint.z,
      };
    };
    const toHudSamples = (worldPoints) =>
      worldPoints ? worldPoints.map(toHudSample) : null;
    const monitorSamples = () => {
      const corners = glassMac.getScreenCornersWorld?.();
      if (!corners) return null;
      hudEdgeX.copy(corners.tr).sub(corners.tl);
      hudEdgeY.copy(corners.bl).sub(corners.tl);
      hudNormal.copy(hudEdgeX).cross(hudEdgeY).normalize();
      hudToCamera.copy(camera.position).sub(corners.tl).normalize();
      if (Math.abs(hudNormal.dot(hudToCamera)) < 0.02) return null;
      return {
        tl: toHudSample(corners.tl),
        tr: toHudSample(corners.tr),
        bl: toHudSample(corners.bl),
        br: toHudSample(corners.br),
      };
    };
    const hudAnchorPoints = {
      pc: new THREE.Vector3(),
      crate: new THREE.Vector3(),
      turntable: new THREE.Vector3(),
      coffee: new THREE.Vector3(),
    };
    const collectHudAnchors = () => {
      if (viewMode !== 'cockpit') return null;
      const anchors = [];
      anchors.push({
        id: 'pc',
        sample: toHudSample(
          xray.localToWorld(hudAnchorPoints.pc.set(0, 3.2, 0)),
        ),
      });
      if (crate) {
        anchors.push({
          id: 'crate',
          sample: toHudSample(
            crate.localToWorld(hudAnchorPoints.crate.set(0, 1.4, 0)),
          ),
        });
      }
      if (turntable) {
        anchors.push({
          id: 'turntable',
          sample: toHudSample(
            turntable.localToWorld(hudAnchorPoints.turntable.set(0, 0.85, 0)),
          ),
        });
      }
      if (coffeeStation?.getAnchorWorld) {
        anchors.push({
          id: 'coffee',
          sample: toHudSample(
            coffeeStation.getAnchorWorld(hudAnchorPoints.coffee),
          ),
        });
      }
      return anchors;
    };
    const publishHudFrame = (frameId) => {
      const stage = mount.parentElement;
      if (!stage) return;
      const stageRect = stage.getBoundingClientRect();
      const canvasRect = renderer.domElement.getBoundingClientRect();
      const hoveredTag =
        viewMode === 'cockpit' ? (window.__cockpitHoveredTag || null) : null;
      const deckInfo =
        viewMode === 'deck' ? turntable?.getHudDeckInfo?.() ?? null : null;
      const deckCardWorld =
        viewMode === 'deck' ? turntable?.getCardCornersWorld?.() ?? null : null;
      const crateSelection =
        viewMode === 'crate' ? crate?.getHudSelection?.() ?? null : null;
      const crateBoundsWorld =
        hoveredTag === 'crate' ? crate?.getSubjectBoundsWorld?.() ?? null : null;
      const pcBoundsWorld =
        hoveredTag === 'pc' ? glassMac.getSubjectBoundsWorld?.() ?? null : null;

      computeHudFrame({
        frameId,
        sizeVersion: rendererSizeVersion,
        nowMs: performance.now(),
        mode: viewMode,
        stageRect: {
          x: stageRect.left,
          y: stageRect.top,
          w: stageRect.width,
          h: stageRect.height,
        },
        stageClientLeft: stage.clientLeft,
        stageClientTop: stage.clientTop,
        canvasRect: {
          x: canvasRect.left,
          y: canvasRect.top,
          w: canvasRect.width,
          h: canvasRect.height,
        },
        cameraNear: camera.near,
        monitorSamples: monitorSamples(),
        deck: {
          info: deckInfo,
          cardSamples: toHudSamples(deckCardWorld),
        },
        crate: {
          rectSamples: toHudSamples(crateBoundsWorld),
          selection: crateSelection
            ? {
                index: crateSelection.index,
                count: crateSelection.count,
                anchorSample: toHudSample(crateSelection.anchorWorld),
                title: crateSelection.title,
                category: crateSelection.category,
                date: crateSelection.date,
              }
            : null,
        },
        pcSamples: toHudSamples(pcBoundsWorld),
        anchors: collectHudAnchors(),
        hoveredTag,
      });
    };

    const finiteFocusVector = (value) => value &&
      Number.isFinite(value.x) &&
      Number.isFinite(value.y) &&
      Number.isFinite(value.z);
    const sameFitKey = (a, b) => a && b &&
      a.cssW === b.cssW &&
      a.cssH === b.cssH &&
      a.fovY === b.fovY &&
      a.near === b.near &&
      a.reservationsEpoch === b.reservationsEpoch &&
      a.transformEpoch === b.transformEpoch;
    const sameFocusPose = (a, b) => a && b &&
      Math.abs(a.distance - b.distance) <= 1e-6 &&
      a.center.distanceToSquared(b.center) <= 1e-12 &&
      a.direction.distanceToSquared(b.direction) <= 1e-12;
    const focusProvider = (kind) => {
      if (kind === 'deck') return turntable?.getFocusTarget?.() ?? null;
      if (kind === 'crate') return crate?.getFocusTarget?.() ?? null;
      return glassMac.getFocusTarget?.() ?? null;
    };
    const fitCause = (previous, key) => {
      if (!previous || previous.tombstoned) return 'entry';
      if (previous.key.cssW !== key.cssW || previous.key.cssH !== key.cssH) return 'resize';
      if (previous.key.reservationsEpoch !== key.reservationsEpoch) return 'measurement';
      if (previous.key.transformEpoch !== key.transformEpoch) return 'transform';
      return 'intrinsics';
    };
    const reportFitFailure = (kind, reason) => {
      const entry = fitCache.get(kind);
      if (entry) {
        entry.degraded = true;
        entry.reason = reason;
        entry.adapterFailure = true;
      }
      setFocusFitStatus(kind, true, reason);
      if (process.env.NODE_ENV !== 'production' && !failedFitEpisodes.has(kind)) {
        failedFitEpisodes.add(kind);
        console.warn(`[focus-fit] ${kind}: ${reason}`);
      }
    };
    const reportFitSuccess = (kind) => {
      failedFitEpisodes.delete(kind);
      setFocusFitStatus(kind, false, null);
    };
    const resolveFitFrame = (kind, cssW, cssH, canvasOffset) => {
      const stage = { x: 0, y: 0, w: cssW, h: cssH };
      const withReservations = computeSafeFrame(
        stage,
        getEffectiveFocusReservations(kind),
      );
      const candidates = [withReservations, computeSafeFrame(stage)];
      for (const safeFrame of candidates) {
        if (
          safeFrame.w < MIN_FIT_FRAME_PX.w ||
          safeFrame.h < MIN_FIT_FRAME_PX.h
        ) continue;
        const ndcBounds = safeFrameToNdcBounds(
          safeFrame,
          canvasOffset,
          { w: cssW, h: cssH },
        );
        if (ndcBounds) {
          const fitBounds = {
            minX: ndcBounds.minX + FIT_NDC_MARGIN,
            maxX: ndcBounds.maxX - FIT_NDC_MARGIN,
            minY: ndcBounds.minY + FIT_NDC_MARGIN,
            maxY: ndcBounds.maxY - FIT_NDC_MARGIN,
          };
          if (
            fitBounds.minX <= 0 && fitBounds.maxX >= 0 &&
            fitBounds.minY <= 0 && fitBounds.maxY >= 0
          ) return { safeFrame, ndcBounds: fitBounds };
        }
      }
      return null;
    };
    const resolveFocusFit = (kind, captureActive) => {
      const previous = fitCache.get(kind) ?? null;
      // A cancelled entry remains readable only by the cockpit ease-out.
      if (previous?.tombstoned && viewMode === 'cockpit') return previous;
      if (viewMode === 'cockpit' && modeT < 0.005) return previous;

      const cssW = rendererSizeTarget?.cssWidth ?? 0;
      const cssH = rendererSizeTarget?.cssHeight ?? 0;
      const key = {
        cssW,
        cssH,
        fovY: camera.fov,
        near: camera.near,
        reservationsEpoch: getFocusReservationsEpoch(),
        transformEpoch: focusTransformEpoch,
      };
      if (
        previous &&
        !previous.tombstoned &&
        !previous.adapterFailure &&
        sameFitKey(previous.key, key)
      ) {
        return previous;
      }

      // Providers own mutable scratch, so read and copy the authored world
      // points only after the cache key proves that a solve is required.
      const target = focusProvider(kind);
      if (
        !target ||
        !finiteFocusVector(target.center) ||
        !finiteFocusVector(target.outward) ||
        !Number.isFinite(target.verticalBias) ||
        !Array.isArray(target.framingPoints) ||
        target.framingPoints.length === 0 ||
        !target.framingPoints.every(finiteFocusVector)
      ) {
        reportFitFailure(kind, 'invalid-target');
        return previous;
      }

      const stage = mount.parentElement;
      const stageRect = stage?.getBoundingClientRect();
      const canvasRect = renderer.domElement.getBoundingClientRect();
      const canvasOffset = {
        x: stageRect ? canvasRect.left - (stageRect.left + stage.clientLeft) : 0,
        y: stageRect ? canvasRect.top - (stageRect.top + stage.clientTop) : 0,
      };
      const frame = resolveFitFrame(kind, cssW, cssH, canvasOffset);
      if (frame === null) {
        reportFitFailure(kind, 'invalid-stage');
        return previous;
      }

      const center = new THREE.Vector3().copy(target.center);
      const direction = new THREE.Vector3().copy(target.outward);
      direction.y += target.verticalBias;
      direction.normalize();
      const points = target.framingPoints.map((point) => new THREE.Vector3().copy(point));
      const cause = fitCause(previous, key);
      focusFitSolveCount += 1;
      const result = solveCameraFit({
        center,
        direction,
        points,
        fovYRad: camera.fov * Math.PI / 180,
        aspect: camera.aspect,
        near: camera.near,
        ndcBounds: frame.ndcBounds,
        distance: FOCUS_CAMERA_DISTANCE_BOUNDS[kind],
      });
      const degraded = result.status !== 'fit';
      const reason = degraded ? result.reason : null;
      const distance = degraded
        ? (lastValidFitDistance.get(kind) ?? FOCUS_FALLBACK_DISTANCE[kind])
        : result.distance;
      if (!Number.isFinite(distance) || !finiteFocusVector(direction)) {
        reportFitFailure(kind, 'invalid-input');
        return previous;
      }
      if (result.status === 'fit') {
        lastValidFitDistance.set(kind, distance);
        reportFitSuccess(kind);
      } else {
        reportFitFailure(kind, reason);
      }

      const next = {
        distance,
        center,
        direction,
        points,
        safeFrame: frame.safeFrame,
        degraded,
        reason,
        adapterFailure: false,
        key,
        tombstoned: false,
        lastSolveCause: cause,
      };
      fitCache.set(kind, next);

      const reducedMotion = document.documentElement.getAttribute('data-a11y-motion') === 'reduced';
      if (
        previous &&
        !previous.tombstoned &&
        !sameFocusPose(previous, next) &&
        viewMode === kind &&
        modeT > 0.3 &&
        !captureActive &&
        !reducedMotion
      ) {
        // Re-capture the last fully rendered pose even when another refit or
        // focused-mode switch is already active. §4.7 makes replacement
        // coalescing explicit: blends never queue and the newest fit wins.
        focusSwitch = {
          pos: camera.position.clone(),
          quat: camera.quaternion.clone(),
          t: 0,
          duration: REFIT_BLEND_S,
          refit: true,
        };
      }
      return next;
    };

    registerFocusFitProbe(() => {
      const entry = fitCache.get(focusKind);
      if (!entry) return null;
      if (entry.tombstoned && !(viewMode === 'cockpit' && modeT >= 0.005)) {
        return null;
      }
      const stage = mount.parentElement;
      if (!stage) return null;
      const stageRect = stage.getBoundingClientRect();
      const canvasRect = renderer.domElement.getBoundingClientRect();
      const stageOriginX = stageRect.left + stage.clientLeft;
      const stageOriginY = stageRect.top + stage.clientTop;
      const points = entry.points.map((world) => {
        const projected = world.clone().project(camera);
        return {
          x: canvasRect.left - stageOriginX + (projected.x * 0.5 + 0.5) * canvasRect.width,
          y: canvasRect.top - stageOriginY + (-projected.y * 0.5 + 0.5) * canvasRect.height,
        };
      });
      return {
        kind: focusKind,
        status: entry.degraded ? 'degraded' : 'fit',
        reason: entry.reason,
        distance: entry.distance,
        solveCount: focusFitSolveCount,
        lastSolveCause: entry.lastSolveCause,
        safeFrame: { ...entry.safeFrame },
        points,
      };
    });

    // The Phase 4 deterministic capture is immutable historical evidence.
    // Its dev-only seed preserves the camera composition under which those
    // projection fixtures were certified; every production visit and every
    // Phase 5 capture uses the shared authored-point solver below.
    const PHASE4_CAPTURE_POSE = {
      deck: {
        localCenter: [-0.28, 1.08, 0],
        verticalBias: 0.42,
        distance: 3.8154142572019047,
      },
      crate: {
        localCenter: [0, 0.55, 0],
        verticalBias: 1.8,
        distance: 2.96651183793346,
      },
      monitor: { distance: 1.6762204950247168 },
    };
    const resolvePhase4BaselinePose = (kind, yaw, pitch) => {
      const authored = PHASE4_CAPTURE_POSE[kind];
      if (!authored) return false;
      if (kind === 'deck' && turntable) {
        turntable.updateWorldMatrix(true, false);
        baselineFocusCenter
          .fromArray(authored.localCenter)
          .applyMatrix4(turntable.matrixWorld);
        turntable.getWorldQuaternion(baselineFocusQuaternion);
        baselineFocusDirection
          .set(0, 0, 1)
          .applyQuaternion(baselineFocusQuaternion);
        baselineFocusDirection.y += authored.verticalBias;
        baselineFocusDirection.normalize();
      } else if (kind === 'crate' && crate) {
        crate.updateWorldMatrix(true, false);
        baselineFocusCenter
          .fromArray(authored.localCenter)
          .applyMatrix4(crate.matrixWorld);
        crate.getWorldQuaternion(baselineFocusQuaternion);
        baselineFocusDirection
          .set(0, 0, 1)
          .applyQuaternion(baselineFocusQuaternion);
        baselineFocusDirection.y += authored.verticalBias;
        baselineFocusDirection.normalize();
      } else if (kind === 'monitor') {
        const target = glassMac.getFocusTarget?.();
        if (!target || target.framingPoints.length !== 4) return false;
        baselineFocusCenter.copy(target.center);
        baselineFocusDirection.copy(target.outward).normalize();
      } else {
        return false;
      }

      focusPosition
        .copy(baselineFocusCenter)
        .addScaledVector(baselineFocusDirection, authored.distance);
      if (kind === 'deck') {
        focusPosition.x += yaw * 0.12;
        focusPosition.y += pitch * 0.08;
      } else if (kind === 'monitor') {
        focusPosition.x += yaw * 0.15;
        focusPosition.y += pitch * 0.1;
      }
      focusLookCamera.position.copy(focusPosition);
      focusLookCamera.up.set(0, 1, 0);
      focusLookCamera.lookAt(baselineFocusCenter);
      return true;
    };

    const clock = new THREE.Clock();
    let firstFrameReported = false;
    const animate = () => {
      if (disposed || !contextAlive) return;
      sizeSync.sync();
      const dt = clock.getDelta();
      const t = clock.elapsedTime;
      setFrameTimes(dt, t, captureFrameState);
      const { captureActive, dtAmbient } = getFrameTimes();

      // Ease modeT toward target (0 = cockpit, 1 = focused pose)
      const target = FOCUSED(viewMode) ? 1 : 0;
      if (captureActive) modeT = target;
      else modeT += (target - modeT) * Math.min(1, dt * 2.2);

      // Globe stays hidden
      globeGroup.visible = false;

      // Bobblehead removed — no-op

      tBox.rotation.x += dtAmbient*.6;
      tBox.rotation.y += dtAmbient*.9;
      tRing.rotation.z += dtAmbient*.3;

      // PC sits dead still — no idle oscillation.
      xray.rotation.y = pcYaw;

      if (rubiks && rubiks.update) rubiks.update(t, dt);

      // External tick hooks (e.g. VinylCrate)
      if (window.__cockpitTick) window.__cockpitTick(dt, t);

      // Hero edge-glow: pulse in the cockpit view, fade out while the
      // camera is focused on the monitor or the crate.
      edgeGlow.tick(t, 1 - modeT);

      // ── Camera ────────────────────────────────────────────────
      // Cockpit pose: cursor drives yaw/pitch with breathing bob.
      // Monitor pose: dolly toward the PC monitor, face-on.
      // Butter-smooth the mouse-driven yaw/pitch — a slow exponential
      // ease so sweeping the cursor feels like pulling a heavy gimbal.
      const yawTarget = yawRef.current || 0;
      const pitchTarget = pitchRef.current || 0;
      const reducedMotion =
        document.documentElement.getAttribute('data-a11y-motion') === 'reduced';
      if (captureActive || reducedMotion){
        smoothYaw = yawTarget;
        smoothPitch = pitchTarget;
      } else {
        const smoothK = 1 - Math.exp(-dt * 2.2); // ~0.45s settle time
        smoothYaw   += (yawTarget   - smoothYaw)   * smoothK;
        smoothPitch += (pitchTarget - smoothPitch) * smoothK;
      }
      window.__cockpitSmoothedYaw = smoothYaw;
      window.__cockpitSmoothedPitch = smoothPitch;
      const yaw = smoothYaw;
      const pitch = smoothPitch;

      // Cockpit target — static seat, no breathing bob (desk objects must
      // read as perfectly still).
      const cockpitPos = new THREE.Vector3(0, 0, 0);
      const cockpitYaw = yaw;
      const cockpitPitch = pitch;

      // Focused pose — all three subjects use the same authored-point fit.
      let monitorPos, monitorQuat;
      const usesPhase4Baseline = preservePhase4FocusBaseline &&
        resolvePhase4BaselinePose(focusKind, yaw, pitch);
      const fit = usesPhase4Baseline
        ? null
        : resolveFocusFit(focusKind, captureActive);
      if (usesPhase4Baseline) {
        monitorPos = focusPosition;
        monitorQuat = focusLookCamera.quaternion;
      } else if (fit) {
        focusPosition
          .copy(fit.center)
          .addScaledVector(fit.direction, fit.distance);
        monitorPos = focusPosition;
        if (focusKind === 'deck') {
          monitorPos.x += yaw * 0.12;
          monitorPos.y += pitch * 0.08;
        } else if (focusKind === 'monitor') {
          monitorPos.x += yaw * 0.15;
          monitorPos.y += pitch * 0.1;
        }
        // Crate deliberately has no cursor parallax while browsing.
        focusLookCamera.position.copy(monitorPos);
        focusLookCamera.up.set(0, 1, 0);
        focusLookCamera.lookAt(fit.center);
        monitorQuat = focusLookCamera.quaternion;
      } else {
        // Provider-null cold-start terminal fallback: retain a finite pose.
        const pcWorld = new THREE.Vector3();
        xray.getWorldPosition(pcWorld);
        monitorPos = new THREE.Vector3(pcWorld.x, pcWorld.y + 1.2, pcWorld.z + 2.4);
        monitorQuat = new THREE.Quaternion();
      }

      // Focused-pose switch (crate → deck): blend from the captured pose
      // toward the new focus target so the camera glides instead of snapping.
      let activeRefitBlend = null;
      if (focusSwitch){
        const reducedRefit = focusSwitch.refit &&
          document.documentElement.getAttribute('data-a11y-motion') === 'reduced';
        if (captureActive || reducedRefit) {
          focusSwitch = null;
        } else {
          const blendStep = focusSwitch.refit
            ? Math.min(dt, REFIT_MAX_FRAME_STEP_S)
            : dt;
          focusSwitch.t += blendStep / focusSwitch.duration;
          const s = easeInOut(Math.min(1, focusSwitch.t));
          if (focusSwitch.refit) {
            // A refit may begin while modeT is still easing. Blend the final
            // camera pose after the cockpit↔focus interpolation so modeT is
            // not applied to the captured camera position a second time.
            activeRefitBlend = {
              pos: focusSwitch.pos,
              quat: focusSwitch.quat,
              s,
            };
          } else {
            // Preserve the pre-Phase-5 focused-mode switch path verbatim.
            focusBlendPosition.copy(focusSwitch.pos).lerp(monitorPos, s);
            focusBlendQuaternion.copy(focusSwitch.quat).slerp(monitorQuat, s);
            monitorPos = focusBlendPosition;
            monitorQuat = focusBlendQuaternion;
          }
          if (focusSwitch.t >= 1) focusSwitch = null;
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
      if (activeRefitBlend) {
        focusBlendPosition
          .copy(activeRefitBlend.pos)
          .lerp(camera.position, activeRefitBlend.s);
        focusBlendQuaternion
          .copy(activeRefitBlend.quat)
          .slerp(camera.quaternion, activeRefitBlend.s);
        camera.position.copy(focusBlendPosition);
        camera.quaternion.copy(focusBlendQuaternion);
      }

      scene.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);
      camera.updateProjectionMatrix();
      const frameId = nextHudFrameId();
      publishHudFrame(frameId);
      renderer.render(scene, camera);
      // §9.6.1 settle signal: camera blend finished and no focused-pose
      // switch in flight (deck busy is layered on in test-hooks).
      reportFrame(
        (FOCUSED(viewMode) ? modeT > 0.995 : modeT < 0.005) && !focusSwitch,
        frameId,
      );
      if (viewMode === 'cockpit' && modeT < 0.005) discardTombstone(focusKind);
      if (!firstFrameReported) {
        firstFrameReported = true;
        onContextEvent?.('ready');
      }
      if (!disposed && contextAlive) raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      disposed = true;
      contextAlive = false;
      unsubscribeFocusFitEvents();
      unregisterFocusFitProbe();
      if (raf !== undefined) cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      window.removeEventListener('cockpit-theme', onTheme);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      unregisterPcActivation();
      window.removeEventListener('cockpit-crate-hover', onCrateHoverGlow);
      sizeSync.dispose();
      if (crate && crate.disposeCrate) crate.disposeCrate();
      if (turntable && turntable.disposeDeck) turntable.disposeDeck();
      if (coffeeStation && coffeeStation.dispose) coffeeStation.dispose();
      if (decorations && decorations.dispose) decorations.dispose();
      if (teaSet && teaSet.dispose) teaSet.dispose();
      if (incense && incense.dispose) incense.dispose();
      edgeGlow.dispose();
      disposeObjectGraph(scene);
      if (envScene) disposeObjectGraph(envScene);
      if (environmentTexture) environmentTexture.dispose();
      scene.environment = null;
      if (pmrem) pmrem.dispose();
      window.__getCockpitAnchors = null;
      window.__cockpitHoveredTag = null;
      window.__cockpitHoverPC = null;
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
      window.__cockpitCube = null;
      window.__cockpitGLBDebug = null;
      window.__cockpitGLBLoaded = null;
      window.__cockpitSmoothedYaw = null;
      window.__cockpitSmoothedPitch = null;
      window.__cockpitViewMode = null;
      window.__getCockpitScreenRect = null;
      window.__getCockpitPCRect = null;
      window.__getCockpitCubeScreenTarget = null;
      window.__setCockpitViewMode = null;
      clearMainRendererSize();
      resetHudSampler();
      resetFocusFitStore();
      renderer.dispose();
      try { renderer.forceContextLoss(); } catch {}
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{position:'absolute',inset:0,zIndex:0}}/>;
}

function easeInOut(x){ return x<.5 ? 2*x*x : 1-Math.pow(-2*x+2,2)/2; }

function disposeObjectGraph(root){
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const disposeTexture = (value) => {
    if (!value || !value.isTexture || textures.has(value)) return;
    textures.add(value);
    value.dispose();
  };
  const disposeMaterial = (material) => {
    if (!material || materials.has(material)) return;
    materials.add(material);
    Object.values(material).forEach(disposeTexture);
    if (material.uniforms) {
      Object.values(material.uniforms).forEach((uniform) => {
        disposeTexture(uniform?.value);
      });
    }
    material.dispose();
  };
  root.traverse((object) => {
    if (object.geometry && !geometries.has(object.geometry)) {
      geometries.add(object.geometry);
      object.geometry.dispose();
    }
    const material = object.material;
    if (Array.isArray(material)) material.forEach(disposeMaterial);
    else disposeMaterial(material);
  });
  root.clear();
}

export { GlobeCanvas };
