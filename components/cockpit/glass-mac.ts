// @ts-nocheck
// GlassMac — "superglass" terminal, organized rebuild.
// Structure (bottom → top), each zone a SINGLE coherent volume so nothing
// interpenetrates:
//   • WEDGE BASE — one extruded side-profile, opaque grain-textured cream.
//   • KEY TRAY  — dark recessed tray sunk into the wedge slope; frosted
//     glass keycaps with cream wireframe edges (one jade accent).
//   • NECK      — short frosted pedestal connecting base to head.
//   • HEAD      — iridescent clearcoat glass shell with a dark CRT block
//     fully enclosed inside (screen fills its face, vent grille recessed
//     into its right edge), wire looms + jade glow in the air gap.
//
// Contract preserved:
//   • builds INTO `xray` (transform/raycast machinery intact)
//   • sets xray.userData.screenGroup + screenCorners (monitor view + the
//     ScreenDialog / future chatbot overlay)
//   • returns { keyboard (setOffset), applyTheme(theme) }
import * as THREE from "three"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js"

export function buildGlassMac(xray){
  // ── Textures ──────────────────────────────────────────────────
  // Subtle horizontal-brushed grain for the wedge base.
  const makeGrainTexture = () => {
    const S = 256;
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#E3DED2';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 240; i++){
      ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '120,115,100'},${0.02 + Math.random()*0.05})`;
      ctx.fillRect(0, Math.random()*S, S, 1);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  };
  const makeGlowTexture = () => {
    const S = 256;
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(S/2, S/2, 0, S/2, S/2, S/2);
    g.addColorStop(0,   'rgba(122,154,126,0.85)');
    g.addColorStop(0.4, 'rgba(122,154,126,0.35)');
    g.addColorStop(1,   'rgba(122,154,126,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    return new THREE.CanvasTexture(c);
  };

  // ── Materials ─────────────────────────────────────────────────
  // Head shell: clear acrylic with a clearcoat + faint iridescence so the
  // glass picks up oil-slick highlights as the camera moves.
  const glass = new THREE.MeshPhysicalMaterial({
    color:               new THREE.Color(0xF4F1EA),
    roughness:           0.22,
    metalness:           0.02,
    transmission:        0.92,
    ior:                 1.45,
    thickness:           0.7,
    attenuationColor:    new THREE.Color(0xEDEAE2),
    attenuationDistance: 2.8,
    clearcoat:           0.6,
    clearcoatRoughness:  0.25,
    iridescence:         0.35,
    iridescenceIOR:      1.3,
    transparent:         true,
    opacity:             0.32,
    depthWrite:          false,
    side:                THREE.DoubleSide,
    envMapIntensity:     1.0,
  });
  const edgeMat  = new THREE.LineBasicMaterial({ color: 0xF0EBE1, transparent: true, opacity: 0.5, depthWrite: false });
  const edgeInk  = new THREE.LineBasicMaterial({ color: 0x55514B, transparent: true, opacity: 0.5 });
  // Wedge: opaque brushed cream (solid — keys and desk edges read against it).
  const wedgeMat = new THREE.MeshStandardMaterial({ color: 0xE3DED2, map: makeGrainTexture(), roughness: 0.6, metalness: 0.06 });
  // Neck: frosted solid.
  const neckMat  = new THREE.MeshStandardMaterial({ color: 0xD8D3C7, roughness: 0.45, metalness: 0.04 });
  // Frosted glass keycaps.
  const frost    = new THREE.MeshPhongMaterial({ color: 0xF2EEE6, transparent: true, opacity: 0.55, shininess: 90, depthWrite: false });
  // Theme-aware dark hardware.
  const ink      = new THREE.MeshLambertMaterial({ color: 0x26231F });   // CRT block
  const inkSoft  = new THREE.MeshLambertMaterial({ color: 0x3A3733 });   // key tray + vent
  const grooveMat= new THREE.MeshLambertMaterial({ color: 0x55514B });
  const screenMat= new THREE.MeshBasicMaterial({ color: 0x14120F });
  const trimMat  = new THREE.MeshStandardMaterial({ color: 0xB9B5AE, roughness: 0.3, metalness: 0.5 });
  const jade     = new THREE.MeshLambertMaterial({ color: 0x4B6E4F });
  const jadeLt   = new THREE.MeshLambertMaterial({ color: 0x7A9A7E });

  const edge = (mesh, mat = edgeInk, thresh = 30) => {
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, thresh), mat);
    e.position.copy(mesh.position);
    e.rotation.copy(mesh.rotation);
    (mesh.parent || xray).add(e);
    return e;
  };

  // ══ WEDGE BASE — one extruded profile, no overlapping boxes ═══
  const WEDGE_W = 2.75;
  const profile = new THREE.Shape();
  profile.moveTo(-0.95, 0);
  profile.lineTo(-0.95, 0.44);
  profile.lineTo(-0.25, 0.40);
  profile.lineTo( 1.45, 0.14);
  profile.lineTo( 1.45, 0);
  profile.closePath();
  const wedgeGeo = new THREE.ExtrudeGeometry(profile, { depth: WEDGE_W, bevelEnabled: false });
  wedgeGeo.translate(0, 0, -WEDGE_W/2);
  wedgeGeo.rotateY(-Math.PI/2);   // profile x → world z, extrusion → world x
  const wedge = new THREE.Mesh(wedgeGeo, wedgeMat);
  xray.add(wedge);
  edge(wedge, edgeMat, 20);
  // Jade mark on the front face
  const mark = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.02), jade);
  mark.position.set(-1.05, 0.07, 1.452);
  xray.add(mark);

  // ══ KEY TRAY — dark recess sunk into the wedge slope ══════════
  const TILT = 0.152;   // slope angle of the wedge deck
  const keyboard = new THREE.Group();
  const kbBaseX = 0, kbBaseY = 0.275, kbBaseZ = 0.6;
  keyboard.position.set(kbBaseX, kbBaseY, kbBaseZ);
  keyboard.rotation.x = TILT;
  xray.add(keyboard);
  keyboard.setOffset = function({ x = 0, y = 0, z = 0 } = {}){
    keyboard.position.set(kbBaseX + x, kbBaseY + y, kbBaseZ + z);
  };
  const tray = new THREE.Mesh(new RoundedBoxGeometry(2.45, 0.04, 1.15, 1, 0.015), inkSoft);
  tray.position.y = 0.005;
  keyboard.add(tray);
  edge(tray);

  // Frosted keycaps with cream wireframe edges
  const keyGeo = new RoundedBoxGeometry(0.148, 0.055, 0.125, 1, 0.014);
  const keyEdgeGeo = new THREE.EdgesGeometry(keyGeo, 30);
  const addKey = (x, z, mat = frost, geo = keyGeo, eGeo = keyEdgeGeo) => {
    const k = new THREE.Mesh(geo, mat);
    k.position.set(x, 0.05, z);
    keyboard.add(k);
    const e = new THREE.LineSegments(eGeo, edgeMat);
    e.position.copy(k.position);
    keyboard.add(e);
  };
  const COLS = 14, ROWS = 4;
  const stepX = 0.172, stepZ = 0.158;
  for (let r = 0; r < ROWS; r++){
    for (let c = 0; c < COLS; c++){
      const isJade = (r === 0 && c === COLS - 1);
      addKey((c - (COLS-1)/2) * stepX, (r - (ROWS-1)/2) * stepZ - 0.12, isJade ? jade : frost);
    }
  }
  const bottomZ = ((ROWS - 1)/2) * stepZ - 0.12 + stepZ;
  [-6, -5, -4, 4, 5, 6].forEach(c => addKey(c * stepX, bottomZ));
  const spaceGeo = new RoundedBoxGeometry(1.0, 0.055, 0.125, 1, 0.014);
  addKey(0.05, bottomZ, frost, spaceGeo, new THREE.EdgesGeometry(spaceGeo, 30));
  // Designation plate on the tray, right of the keys
  const labelC = document.createElement('canvas');
  labelC.width = 256; labelC.height = 48;
  const lctx = labelC.getContext('2d');
  lctx.fillStyle = '#D8D3C7';
  lctx.fillRect(0, 0, 256, 48);
  lctx.fillStyle = '#55514B';
  lctx.font = '600 20px "JetBrains Mono", monospace';
  lctx.textAlign = 'right';
  lctx.textBaseline = 'middle';
  lctx.fillText('AX/OS · TERM-04', 248, 24);
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.44, 0.085),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(labelC) })
  );
  label.rotation.x = -Math.PI/2;
  label.position.set(0.95, 0.028, 0.46);
  keyboard.add(label);

  // ══ NECK — frosted pedestal between base and head ═════════════
  const neck = new THREE.Mesh(new RoundedBoxGeometry(1.15, 0.24, 0.95, 2, 0.05), neckMat);
  neck.position.set(0, 0.55, -0.55);
  xray.add(neck);
  edge(neck, edgeMat);

  // ══ HEAD — one glass shell, CRT block fully enclosed ══════════
  const HEAD_W = 2.3, HEAD_H = 1.9, HEAD_D = 1.5;
  const headY = 0.67 + HEAD_H/2;                 // bottom rests on the neck
  const headZ = -0.5;
  const head = new THREE.Mesh(new RoundedBoxGeometry(HEAD_W, HEAD_H, HEAD_D, 3, 0.13), glass);
  head.position.set(0, headY, headZ);
  xray.add(head);
  edge(head, edgeMat, 24);
  // Corner screws on the glass front
  const screwGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.03, 10);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
    const s = new THREE.Mesh(screwGeo, trimMat);
    s.rotation.x = Math.PI/2;
    s.position.set(sx * (HEAD_W/2 - 0.13), headY + sy * (HEAD_H/2 - 0.13), headZ + HEAD_D/2 + 0.005);
    xray.add(s);
  });
  // Handle recess on top
  const handle = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.09, 0.3, 2, 0.04), neckMat);
  handle.position.set(0, headY + HEAD_H/2 + 0.015, headZ - 0.25);
  xray.add(handle);

  // CRT block — dark mass INSIDE the shell (clear air gap all around)
  const CRT_W = 2.02, CRT_H = 1.62, CRT_D = 1.08;
  const crt = new THREE.Mesh(new RoundedBoxGeometry(CRT_W, CRT_H, CRT_D, 2, 0.07), ink);
  crt.position.set(0, headY, headZ + 0.02);
  xray.add(crt);
  edge(crt);
  const crtFrontZ = headZ + 0.02 + CRT_D/2;      // ≈ 0.06

  // Screen — fills the CRT face (slim margins); overlay maps here
  const SCREEN_W = 1.68, SCREEN_H = 1.3;
  const screenX = -0.07;
  const screenGroup = new THREE.Group();
  screenGroup.position.set(screenX, headY, crtFrontZ + 0.012);
  xray.add(screenGroup);
  screenGroup.add(new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_W, SCREEN_H), screenMat));
  xray.userData.screenGroup = screenGroup;
  xray.userData.screenCorners = {
    tl: new THREE.Vector3(-SCREEN_W/2,  SCREEN_H/2, 0),
    tr: new THREE.Vector3( SCREEN_W/2,  SCREEN_H/2, 0),
    bl: new THREE.Vector3(-SCREEN_W/2, -SCREEN_H/2, 0),
    br: new THREE.Vector3( SCREEN_W/2, -SCREEN_H/2, 0),
  };

  // Vent grille — recessed into the CRT's right edge (not floating)
  for (let i = 0; i < 7; i++){
    const groove = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.016, 0.02), grooveMat);
    groove.position.set(0.9, headY + 0.48 - i * 0.16, crtFrontZ + 0.005);
    xray.add(groove);
  }
  // Power LED + micro label under the screen
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 10), jadeLt);
  led.position.set(0.72, headY - CRT_H/2 + 0.1, crtFrontZ + 0.01);
  xray.add(led);

  // Wire looms — routed through the AIR GAP between CRT and shell
  const wire = (pts, color = 0x7A9A7E, opacity = 0.65) => {
    xray.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(new THREE.CatmullRomCurve3(pts).getPoints(24)),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity })
    ));
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const backZ = headZ - HEAD_D/2 + 0.08;          // behind the CRT, inside glass
  wire([V(-0.6, headY - 0.6, backZ), V(-0.8, headY, backZ + 0.04), V(-0.5, headY + 0.55, backZ)], 0x8E8A83, 0.55);
  wire([V(0.5, headY - 0.5, backZ), V(0.75, headY + 0.1, backZ + 0.05), V(0.55, headY + 0.6, backZ)], 0x8E8A83, 0.55);
  wire([V(-0.2, headY + 0.68, backZ), V(0.1, headY + 0.74, backZ + 0.1), V(0.4, headY + 0.66, backZ)], 0x7A9A7E);
  wire([V(-1.02, headY - 0.3, headZ), V(-1.06, headY + 0.1, headZ - 0.15), V(-1.0, headY + 0.4, headZ - 0.3)], 0x7A9A7E, 0.5);
  // down the neck into the base
  wire([V(0.2, headY - HEAD_H/2 + 0.05, headZ - 0.1), V(0.25, 0.55, -0.5), V(0.15, 0.42, -0.55)], 0x8E8A83, 0.5);
  wire([V(-0.25, headY - HEAD_H/2 + 0.05, headZ), V(-0.3, 0.52, -0.5), V(-0.2, 0.42, -0.6)], 0x7A9A7E, 0.5);

  // Jade glow pooling in the glass gaps
  const glowTex = makeGlowTexture();
  const addGlow = (x, y, z, scale, opacity) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x7A9A7E, transparent: true, opacity, depthWrite: false }));
    s.position.set(x, y, z);
    s.scale.setScalar(scale);
    xray.add(s);
  };
  addGlow(0, headY - 0.1, backZ - 0.02, 1.3, 0.4);
  addGlow(0.75, headY + 0.55, headZ, 0.6, 0.25);
  addGlow(-0.7, headY - 0.6, headZ + 0.2, 0.7, 0.22);

  // ── Theme — dark hardware in dark mode, cream in light ────────
  const applyTheme = (theme) => {
    const light = theme === 'light';
    ink.color.setHex(      light ? 0xE8E4DC : 0x26231F);   // CRT block
    inkSoft.color.setHex(  light ? 0xD8D3C7 : 0x3A3733);   // key tray
    grooveMat.color.setHex(light ? 0xB9B5AE : 0x55514B);   // vent grooves
    screenMat.color.setHex(light ? 0xE8E4DC : 0x14120F);   // screen glass
    edgeInk.color.setHex(  light ? 0x8E8A83 : 0x55514B);   // silhouette lines
  };

  return { keyboard, applyTheme };
}
