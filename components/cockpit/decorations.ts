// @ts-nocheck
// Desk decorations — menial hobby objects that dress the desk WITHOUT
// competing with the four interactive heroes (crate / turntable / PC /
// coffee). Everything here is small (≤ ~0.9 desk units tall) and HUD-free —
// EXCEPT the sax figurine (s 2.0, so its keywork reads from the cockpit),
// the protein shaker (near-crate height beside the PC) and the drawing
// tablet (desk-mat footprint in front of the keyboard). The shaker and the
// tablet's stylus are the two pieces with a pulse (click-to-move; no HUD,
// no view mode — just motion, and the PC's hitbox wins wherever they
// overlap). The pieces map to Alex's actual life:
//   • frosted alto sax figurine   — jazz (the reason the vinyl deck exists)
//   • handheld console            — Switch-style, jade grips
//   • drawing tablet + stylus     — sketching (click → the stylus scribbles)
//   • potted succulent            — greenery (frosted planter, echeveria rosette)
//   • protein shaker              — gym (click → shake wiggle + slosh)
// Palette stays inside the design system: cream/ink/mauve + jade accents on
// LIT materials only (unlit basics glow like light-bars over the dim scene).
import * as THREE from "three"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js"
import { PALETTE, makeFrost, makeHeroGlass } from "./materials"
import { makeTextDecal } from "./decals"
import { CURSOR_POINTER } from "./cursors"

const MONO = '"JetBrains Mono", Consolas, monospace';

export function buildDecorations(scene, tableGroup, camera, renderer){
  const root = new THREE.Group();
  tableGroup.add(root);
  let shakerWiggle = null, shakerLiquid = null, shakerPick = null;
  let tabletG = null, tabletPick = null, stylusG = null;
  let stylusRestPos = null, stylusRestQuat = null, stylusDrawPos = null, stylusDrawQuat = null;

  // ── Shared materials ──────────────────────────────────────────
  const creamLt   = new THREE.MeshStandardMaterial({ color: 0xE7E2D5, roughness: 0.6 });
  const graphite  = new THREE.MeshStandardMaterial({ color: 0x3A3733, roughness: 0.6, metalness: 0.08 });
  const ink       = new THREE.MeshLambertMaterial({ color: 0x26231F });
  const jade      = new THREE.MeshStandardMaterial({ color: PALETTE.jade, roughness: 0.6 });
  const screenDark= new THREE.MeshStandardMaterial({ color: 0x16140F, roughness: 0.3, metalness: 0.1 });
  const frost     = makeFrost({ color: 0xE7E2D9, transmission: 0.75, roughness: 0.32, thickness: 0.06 });
  const frostCap  = makeFrost({ transmission: 0.7, roughness: 0.3, thickness: 0.08 });
  // shake lands darker than the target tan — the frosted wall lightens
  // whatever it encloses (same calibration as the coffee mug's near-black)
  const shake     = new THREE.MeshLambertMaterial({ color: 0x8F7454 });
  const pickMat   = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });

  const items = new Map();   // name → group (for the live dial-in bridge)
  const item = (name, x, z, ry = 0) => {
    const g = new THREE.Group();
    g.position.set(x, 0.18, z);
    g.rotation.y = ry;
    root.add(g);
    items.set(name, g);
    return g;
  };
  const mesh = (parent, geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  // ══ ALTO SAX FIGURINE — frosted collectible on an integrated pedestal,
  // in the rear gap between crate and turntable. Design-object reinterpretation
  // (6-view product reference): etched-lace frost body/bell/neck, cold-porcelain
  // keywork, muted jade pad tops + ligature + collar + base inlay — no brass.
  {
    // Placement is sight-line constrained, not just physical: the fixed cockpit
    // camera sits at (0, 2.8, 6.4) in table space, and anything whose screen
    // silhouette falls behind the turntable's transmissive dust cover (or the
    // crate's frosted walls) gets refraction-magnified. Dialed in live via
    // __cockpitDecor.set to sit in the clear corridor between the two shells.
    const g = item('sax', -2.8, -0.8, -0.35);
    g.scale.setScalar(2.0);   // size exception #2: hero-adjacent scale so the keywork reads from the cockpit
    // ── sax-only materials ── at s 2.0 the figure reads close-up, so its frost
    // carries the reference's etched-filigree micro pattern (roughness variation
    // + a whisper of bump) and the keywork gets a clearcoat porcelain sheen.
    const lace = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#B4B4B4'; ctx.fillRect(0, 0, 256, 256);
      let seed = 7;   // seeded → the filigree is identical every mount
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 900; i++){
        ctx.strokeStyle = rnd() > 0.5 ? 'rgba(228,228,228,0.5)' : 'rgba(144,144,144,0.4)';
        ctx.lineWidth = 0.8 + rnd() * 1.2;
        ctx.beginPath();
        ctx.arc(rnd() * 256, rnd() * 256, 1.5 + rnd() * 5, rnd() * Math.PI * 2, rnd() * Math.PI * 1.5 + 0.8);
        ctx.stroke();
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(2, 2);
      return t;
    })();
    const etch = (m) => { m.roughnessMap = lace; m.bumpMap = lace; m.bumpScale = 0.0012; return m; };
    const saxFrost   = etch(makeFrost({ transmission: 0.7, roughness: 0.42, thickness: 0.06 }));
    const frostShell = etch(makeFrost({ transmission: 0.7, roughness: 0.42, thickness: 0.06 }));
    frostShell.side = THREE.DoubleSide;   // the bell is an open flare — its hollow must read
    const pearl = new THREE.MeshPhysicalMaterial({ color: 0xEDE8DC, roughness: 0.32, clearcoat: 0.6,  clearcoatRoughness: 0.3 });
    const sage  = new THREE.MeshPhysicalMaterial({ color: PALETTE.jadeLt, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.45 });

    // pedestal — low rounded puck under the bow, jade inlay flat on the front lip
    const basePts = [
      [0.000, 0.000], [0.190, 0.000], [0.200, 0.014], [0.193, 0.038],
      [0.150, 0.052], [0.095, 0.058], [0.000, 0.058],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    mesh(g, new THREE.LatheGeometry(basePts, 56), saxFrost, 0.12, 0, 0);
    mesh(g, new THREE.BoxGeometry(0.075, 0.008, 0.030), jade, 0.12, 0.058, 0.14);

    const sax = new THREE.Group();
    sax.position.set(0, 0.058, 0);   // instrument stands on the pedestal top
    g.add(sax);

    // body — straight-ish upper tube down the front of the stack
    const bodyPts = [
      [0.02, 0.80], [0.05, 0.66], [0.075, 0.48], [0.09, 0.30], [0.095, 0.21],
    ].map(([x, y]) => new THREE.Vector3(x, y, 0));
    sax.add(new THREE.Mesh(new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(bodyPts, false, 'catmullrom', 0.4), 48, 0.033, 16, false), saxFrost));
    // bow — a FATTER compact U hugging the body: its rising branch climbs
    // right beside the descending tube (surfaces ~touching, per reference)
    const bowPts = [
      [0.095, 0.22], [0.10, 0.12], [0.122, 0.065], [0.152, 0.062], [0.170, 0.10], [0.172, 0.14],
    ].map(([x, y]) => new THREE.Vector3(x, y, 0));
    sax.add(new THREE.Mesh(new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(bowPts, false, 'catmullrom', 0.4), 48, 0.043, 16, false), saxFrost));
    // ferrule collar where the fatter bow swallows the body tube, pearl lip on top
    mesh(sax, new THREE.CylinderGeometry(0.047, 0.047, 0.022, 24), saxFrost, 0.094, 0.215, 0);
    const fer = mesh(sax, new THREE.TorusGeometry(0.047, 0.0035, 8, 24), pearl, 0.094, 0.227, 0);
    fer.rotation.x = Math.PI / 2;
    // heel band ringing the bottom of the U (reference detail)
    const heel = mesh(sax, new THREE.TorusGeometry(0.0455, 0.004, 8, 24), saxFrost, 0.137, 0.0635, 0);
    heel.rotation.y = Math.PI / 2;

    // bell — grows straight out of the bow: a lathe flare whose throat
    // sheathes the bow's end at matching radius, rising tight to the stack
    const bellG = new THREE.Group();
    bellG.position.set(0.172, 0.13, 0);
    bellG.rotation.z = -0.28;   // matches the bow-end tangent
    sax.add(bellG);
    const bellPts = [
      [0.044, 0.000], [0.046, 0.070], [0.052, 0.140],
      [0.066, 0.200], [0.086, 0.250], [0.106, 0.283],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    bellG.add(new THREE.Mesh(new THREE.LatheGeometry(bellPts, 48), frostShell));
    // rolled lip: fat outer rim + a thinner inner roll just below it
    const rim = mesh(bellG, new THREE.TorusGeometry(0.106, 0.010, 12, 48), saxFrost, 0, 0.283, 0);
    rim.rotation.x = Math.PI / 2;
    const rimIn = mesh(bellG, new THREE.TorusGeometry(0.094, 0.0045, 8, 40), saxFrost, 0, 0.276, 0);
    rimIn.rotation.x = Math.PI / 2;
    // throat ring at the bow joint + collar band partway up, pearl micro-band above
    mesh(bellG, new THREE.CylinderGeometry(0.0465, 0.0465, 0.014, 24), saxFrost, 0, 0.018, 0);
    mesh(bellG, new THREE.CylinderGeometry(0.057, 0.057, 0.016, 24), saxFrost, 0, 0.145, 0);
    const bandLip = mesh(bellG, new THREE.TorusGeometry(0.0565, 0.002, 6, 24), pearl, 0, 0.155, 0);
    bandLip.rotation.x = Math.PI / 2;
    // bell-to-body brace — bar with sculpted oval feet at both ends
    const brace = mesh(sax, new THREE.CylinderGeometry(0.007, 0.007, 0.052, 10), pearl, 0.15, 0.30, 0);
    brace.rotation.z = Math.PI / 2;
    [0.124, 0.176].forEach(x => {
      const foot = mesh(sax, new THREE.SphereGeometry(0.011, 12, 10), pearl, x, 0.30, 0);
      foot.scale.set(0.6, 1, 1.4);
    });

    // curved neck → two-part mouthpiece (shank + beak) with jade cork band
    // at the joint and a jade ligature ring partway up the shank
    const neckPts = [
      [0.02, 0.79], [0.012, 0.87], [-0.02, 0.93], [-0.07, 0.955],
    ].map(([x, y]) => new THREE.Vector3(x, y, 0));
    sax.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(neckPts), 32, 0.019, 12, false), saxFrost));
    const ring = mesh(sax, new THREE.CylinderGeometry(0.023, 0.023, 0.018, 18), jade, -0.075, 0.957, 0);
    ring.rotation.z = 1.107;
    const mpShank = mesh(sax, new THREE.CylinderGeometry(0.013, 0.019, 0.06, 16), saxFrost, -0.112, 0.975, 0);
    mpShank.rotation.z = 1.107;
    const lig = mesh(sax, new THREE.CylinderGeometry(0.0195, 0.0195, 0.012, 16), jade, -0.098, 0.969, 0);
    lig.rotation.z = 1.107;
    const beak = mesh(sax, new THREE.CylinderGeometry(0.0015, 0.013, 0.05, 14), saxFrost, -0.158, 0.999, 0);
    beak.rotation.z = 1.107;
    // octave mechanism hugging the neck's back: rod, thumb pearl, ball-top post
    const oct = mesh(sax, new THREE.CylinderGeometry(0.0035, 0.0035, 0.10, 8), pearl, 0.008, 0.865, 0.014);
    oct.rotation.z = 0.45;
    const thumb = mesh(sax, new THREE.SphereGeometry(0.008, 10, 8), pearl, -0.014, 0.91, 0.014);
    thumb.scale.set(1, 0.7, 1.3);
    const post = mesh(sax, new THREE.CylinderGeometry(0.0035, 0.0035, 0.05, 8), pearl, 0.033, 0.815, 0.012);
    post.rotation.z = -0.15;
    mesh(sax, new THREE.SphereGeometry(0.0065, 10, 8), pearl, 0.037, 0.842, 0.012);

    // main stacks — porcelain cups with rolled rims, muted-jade tops and a
    // center rivet dome, floated off the tube (reference: pad-by-pad detail)
    [
      [0.68, 0.046, 0.024], [0.61, 0.057, 0.024], [0.54, 0.067, 0.024], [0.47, 0.076, 0.025],
      [0.36, 0.085, 0.027], [0.29, 0.090, 0.027], [0.22, 0.095, 0.028],
    ].forEach(([y, x, r]) => {
      const cup = mesh(sax, new THREE.CylinderGeometry(r, r * 0.78, 0.014, 20), pearl, x, y, 0.042);
      cup.rotation.x = Math.PI / 2;
      mesh(sax, new THREE.TorusGeometry(r * 0.94, 0.0035, 8, 20), pearl, x, y, 0.049);
      const top = mesh(sax, new THREE.CylinderGeometry(r * 0.68, r * 0.68, 0.007, 18), sage, x, y, 0.0512);
      top.rotation.x = Math.PI / 2;
      mesh(sax, new THREE.SphereGeometry(0.004, 8, 6), pearl, x, y, 0.0555);
    });
    // long action rods flanking the stacks — ball finials at both ends —
    // plus pivot-post knuckles and connecting arms
    const rodL = mesh(sax, new THREE.CylinderGeometry(0.005, 0.005, 0.52, 10), pearl, 0.019, 0.45, 0.020);
    rodL.rotation.z = 0.11;
    const rodR = mesh(sax, new THREE.CylinderGeometry(0.005, 0.005, 0.46, 10), pearl, 0.119, 0.45, 0.012);
    rodR.rotation.z = 0.11;
    [[-0.0095, 0.708, 0.020], [0.0475, 0.192, 0.020], [0.0937, 0.679, 0.012], [0.144, 0.221, 0.012]].forEach(([x, y, z]) => {
      mesh(sax, new THREE.SphereGeometry(0.0075, 10, 8), pearl, x, y, z);
    });
    [[0.66, -0.004], [0.54, 0.009], [0.42, 0.022], [0.30, 0.036]].forEach(([y, x]) => {
      mesh(sax, new THREE.SphereGeometry(0.009, 10, 8), pearl, x, y, 0.020);
    });
    [[0.68, 0.046], [0.54, 0.067], [0.36, 0.085], [0.22, 0.095]].forEach(([y, px]) => {
      const arm = mesh(sax, new THREE.CylinderGeometry(0.004, 0.004, 0.055, 8), pearl, px - 0.03, y, 0.030);
      arm.rotation.z = Math.PI / 2;
    });
    // palm keys on the right flank — stem + flattened teardrop
    [[0.585, 0.060], [0.515, 0.070]].forEach(([y, bx]) => {
      const stem = mesh(sax, new THREE.CylinderGeometry(0.004, 0.004, 0.045, 8), pearl, bx + 0.028, y, 0.012);
      stem.rotation.z = Math.PI / 2;
      const key = mesh(sax, new THREE.SphereGeometry(0.013, 12, 10), pearl, bx + 0.052, y, 0.012);
      key.scale.set(1, 0.55, 1.5);
    });
    // side keys on the left flank — two pill levers hugging the tube
    [[0.44, 0.028], [0.385, 0.033]].forEach(([y, x]) => {
      mesh(sax, new RoundedBoxGeometry(0.013, 0.030, 0.008, 1, 0.004), pearl, x, y, 0.030);
    });
    // low bow pads — the two big cups (rims + rivets like the stacks) with
    // sculpted double-loop guard cages arcing over them
    const bp1 = mesh(sax, new THREE.CylinderGeometry(0.036, 0.030, 0.014, 20), pearl, 0.10, 0.155, 0.053);
    bp1.rotation.x = Math.PI / 2;
    mesh(sax, new THREE.TorusGeometry(0.034, 0.0035, 8, 24), pearl, 0.10, 0.155, 0.0605);
    const bt1 = mesh(sax, new THREE.CylinderGeometry(0.026, 0.026, 0.007, 18), sage, 0.10, 0.155, 0.062);
    bt1.rotation.x = Math.PI / 2;
    mesh(sax, new THREE.SphereGeometry(0.0045, 8, 6), pearl, 0.10, 0.155, 0.0665);
    mesh(sax, new THREE.TorusGeometry(0.048, 0.0045, 8, 28, Math.PI), pearl, 0.10, 0.155, 0.068);
    mesh(sax, new THREE.TorusGeometry(0.030, 0.004, 8, 22, Math.PI), pearl, 0.10, 0.148, 0.068);
    [-1, 1].forEach(s => {
      const foot = mesh(sax, new THREE.CylinderGeometry(0.0035, 0.0035, 0.02, 8), pearl, 0.10 + s * 0.048, 0.155, 0.058);
      foot.rotation.x = Math.PI / 2;
    });
    const bp2 = mesh(sax, new THREE.CylinderGeometry(0.036, 0.030, 0.014, 20), pearl, 0.138, 0.075, 0.053);
    bp2.rotation.x = Math.PI / 2 - 0.5;
    const rim2 = mesh(sax, new THREE.TorusGeometry(0.034, 0.0035, 8, 24), pearl, 0.138, 0.0786, 0.0596);
    rim2.rotation.x = -0.5;
    const bt2 = mesh(sax, new THREE.CylinderGeometry(0.026, 0.026, 0.007, 18), sage, 0.138, 0.080, 0.062);
    bt2.rotation.x = Math.PI / 2 - 0.5;
    const g2 = mesh(sax, new THREE.TorusGeometry(0.047, 0.0045, 8, 28, Math.PI), pearl, 0.138, 0.083, 0.067);
    g2.rotation.x = -0.5;
    const g2b = mesh(sax, new THREE.TorusGeometry(0.029, 0.004, 8, 22, Math.PI), pearl, 0.138, 0.077, 0.061);
    g2b.rotation.x = -0.5;
    // left-pinky table — two stacked touch plates + a jade roller chip
    [[0.030, 0.265], [0.048, 0.242]].forEach(([x, y]) => {
      mesh(sax, new RoundedBoxGeometry(0.026, 0.017, 0.008, 1, 0.003), pearl, x, y, 0.036);
    });
    mesh(sax, new THREE.BoxGeometry(0.010, 0.006, 0.008), sage, 0.040, 0.254, 0.038);
    // jade collar where the neck socket meets the body top
    const nc = mesh(sax, new THREE.CylinderGeometry(0.037, 0.037, 0.016, 20), jade, 0.02, 0.79, 0);
    nc.rotation.z = -0.08;
    // integrated stand supports — frosted block under the bow, plate behind the body
    mesh(sax, new THREE.BoxGeometry(0.05, 0.04, 0.036), saxFrost, 0.137, 0.012, 0);
    mesh(sax, new THREE.BoxGeometry(0.024, 0.22, 0.04), saxFrost, 0.10, 0.10, -0.048);
  }

  // (The Chinese tea set graduated to its own coffee-tier module — tea-set.ts.)

  // ══ DRAWING TABLET + STYLUS — flat on the desk in front of the keyboard ══
  // Rebuilt from a 6-view product reference in the PC's exact material
  // language: a clear HERO-GLASS shell (same makeHeroGlass recipe as the
  // monitor casing) wrapped around an opaque cream liner — the liner is
  // load-bearing, not decorative: the desk fill + wires are transparent, so
  // without an opaque body inside, the transmissive rim samples the starfield
  // THROUGH the tabletop and reads as a hole in the desk (the PC never shows
  // this because its glass always encloses opaque cream). The matte charcoal
  // drawing plate rises a hair PROUD of the shell — transparent decals don't
  // render into the transmission buffer, so the micro-dot grid must never sit
  // under the transmissive top. Cream edge lines borrow the PC/keyboard's
  // `edge()` treatment. Yaw matches the PC exactly — same surface, same
  // alignment. Five flush buttons in a faked-recess strip, jade status
  // tick + dot, four dark feet. The stylus lies diagonally — grip on the
  // plate, rear cantilevered off the front-right rim — and is animated piece
  // #2: cockpit click → it lifts to a writing angle and scribbles a quick
  // figure before lying back (tickDraw).
  {
    const g = item('tablet', 3.7, 2.70, -0.55);
    tabletG = g;
    // tablet-only materials — charcoal family + the PC's hero glass.
    // env intensity is pulled DOWN on the charcoals: the cream PMREM env
    // otherwise lifts a matte 0x2* into khaki at grazing angles.
    const slate   = new THREE.MeshStandardMaterial({ color: 0x1B1916, roughness: 0.88, envMapIntensity: 0.4 });
    const well    = new THREE.MeshStandardMaterial({ color: 0x0C0A07, roughness: 0.55, envMapIntensity: 0.3 });
    const btnMat  = new THREE.MeshStandardMaterial({ color: 0x191713, roughness: 0.38, metalness: 0.05, envMapIntensity: 0.5 });
    const penMat  = new THREE.MeshStandardMaterial({ color: 0x242120, roughness: 0.55, envMapIntensity: 0.5 });
    const penTrim = new THREE.MeshStandardMaterial({ color: 0x171513, roughness: 0.3, metalness: 0.08, envMapIntensity: 0.5 });
    const shellGlass = makeHeroGlass({ thickness: 0.16, roughness: 0.16 });
    const liner   = new THREE.MeshStandardMaterial({ color: 0xE7E2D5, roughness: 0.55, metalness: 0.05 });
    const rimLine   = new THREE.LineBasicMaterial({ color: PALETTE.line, transparent: true, opacity: 0.35, depthWrite: false });
    const plateLine = new THREE.LineBasicMaterial({ color: 0x8A857A, transparent: true, opacity: 0.25, depthWrite: false });
    const edgeOf = (m, mat, thresh = 30) => {
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, thresh), mat);
      e.position.copy(m.position);
      g.add(e);
    };

    // hero-glass shell on four dark feet, cream body floated inside it —
    // the same glass-over-cream construction as the PC's monitor casing
    const W = 2.3, D = 1.65, GT = 0.09, FOOT = 0.025;
    const tray = mesh(g, new RoundedBoxGeometry(W, GT, D, 2, 0.045), shellGlass, 0, FOOT + GT / 2, 0);
    edgeOf(tray, rimLine);
    mesh(g, new RoundedBoxGeometry(W - 0.07, GT - 0.038, D - 0.07, 2, 0.024), liner, 0, FOOT + GT / 2 - 0.005, 0);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) =>
      mesh(g, new THREE.CylinderGeometry(0.05, 0.05, FOOT, 10), well, sx * (W / 2 - 0.22), FOOT / 2, sz * (D / 2 - 0.18)));
    // charcoal plate — 12mm proud of the shell, glass margin all around
    const plateTop = FOOT + GT + 0.012;
    const plate = mesh(g, new RoundedBoxGeometry(W - 0.24, 0.06, D - 0.24, 2, 0.02), slate, 0, plateTop - 0.03, 0);
    edgeOf(plate, plateLine);

    // control strip near the top (keyboard-side) edge — no CSG here, so the
    // "recess" is faked: a near-black well plate rides ~3mm PROUD of the
    // surface and the five buttons rise a hair above it, the dark seams
    // between them reading as gaps
    const stripZ = -D / 2 + 0.30;
    mesh(g, new RoundedBoxGeometry(1.66, 0.03, 0.21, 2, 0.013), well, 0, plateTop - 0.012, stripZ);
    let bx = -0.744;
    [0.40, 0.26, 0.26, 0.26, 0.26].forEach((bw, i) => {
      // the long leftmost button is solid jade — echoes the keyboard's ESC key
      mesh(g, new RoundedBoxGeometry(bw, 0.024, 0.155, 1, 0.01), i === 0 ? jade : btnMat, bx + bw / 2, plateTop - 0.005, stripZ);
      bx += bw + 0.012;
    });
    // jade status — tick above the strip + dot on the center button (LIT)
    mesh(g, new THREE.BoxGeometry(0.05, 0.006, 0.012), jade, 0, plateTop + 0.004, stripZ - 0.145);
    mesh(g, new THREE.CylinderGeometry(0.009, 0.009, 0.006, 10), jade, 0.07, plateTop + 0.01, stripZ);
    // jade edge strip down the plate's left margin — echoes the crate tabs
    mesh(g, new THREE.BoxGeometry(0.016, 0.006, 0.46), jade, -0.97, plateTop + 0.003, 0.10);

    // active-area micro-dot grid + corner brackets — floated 3mm off the plate
    const gridDecal = makeTextDecal((ctx, Wp, Hp) => {
      ctx.fillStyle = 'rgba(122,154,126,0.45)';
      for (let px = 26; px < Wp - 14; px += 26)
        for (let py = 24; py < Hp - 14; py += 26)
          ctx.fillRect(px, py, 2, 2);
      ctx.strokeStyle = '#5F7D66';
      ctx.lineWidth = 3;
      [[14, 14, 1, 1], [Wp - 14, 14, -1, 1], [14, Hp - 14, 1, -1], [Wp - 14, Hp - 14, -1, -1]].forEach(([cx, cy, dx, dy]) => {
        ctx.beginPath();
        ctx.moveTo(cx + dx * 20, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + dy * 20);
        ctx.stroke();
      });
    }, { width: 1.8, pxW: 512, pxH: 280, opacity: 0.9 });
    gridDecal.rotation.x = -Math.PI / 2;
    gridDecal.position.set(0, plateTop + 0.003, 0.14);
    g.add(gridDecal);

    // stylus — built nose-to-tail along +x (nib at −x) so one Euler poses it:
    // nib cone → taper → grip (two low buttons) → seam ring → barrel →
    // jade rear ring → rounded rear cap
    const pen = new THREE.Group();
    g.add(pen);
    stylusG = pen;
    const along = (m, x) => { m.rotation.z = Math.PI / 2; m.position.x = x; return m; };
    along(mesh(pen, new THREE.CylinderGeometry(0.004, 0.010, 0.045, 10), jade), -0.4775);   // jade nib
    along(mesh(pen, new THREE.CylinderGeometry(0.010, 0.032, 0.06, 12), penMat), -0.425);
    along(mesh(pen, new THREE.CylinderGeometry(0.047, 0.047, 0.30, 14), penMat), -0.245);
    along(mesh(pen, new THREE.CylinderGeometry(0.0445, 0.0445, 0.012, 14), penTrim), -0.089);
    along(mesh(pen, new THREE.CylinderGeometry(0.042, 0.042, 0.50, 14), penMat), 0.161);
    along(mesh(pen, new THREE.CylinderGeometry(0.043, 0.043, 0.010, 14), jade), 0.395);
    const rearCap = mesh(pen, new THREE.SphereGeometry(0.040, 14, 10), penMat, 0.415, 0, 0);
    rearCap.scale.set(0.7, 1, 1);
    [-0.30, -0.175].forEach(x =>
      mesh(pen, new RoundedBoxGeometry(0.10, 0.014, 0.026, 1, 0.006), penTrim, x, 0.046, 0));

    // rest pose: gravity-honest lean — the grip rests ON the tray's front
    // rim (contact ≈ t −0.30 along the barrel), the rear cap sits on the
    // DESK in front of the tablet, and the nib tips up over the plate. Two
    // contact points, pitch follows from them (~10°) — no hovering.
    pen.position.set(0.78, 0.11, 1.07);
    pen.rotation.set(0, -0.98, -0.17);
    stylusRestPos = pen.position.clone();
    stylusRestQuat = pen.quaternion.clone();
    // draw pose: nib planted mid-plate, barrel raised to a ~60° writing angle
    stylusDrawQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -0.9, 1.05));
    stylusDrawPos = new THREE.Vector3(-0.28, plateTop + 0.004, 0.12)
      .sub(new THREE.Vector3(-0.5, 0, 0).applyQuaternion(stylusDrawQuat));

    // invisible pick volume — cockpit-view click target for the whole set,
    // stretched forward so the desk-resting stylus stays inside it
    tabletPick = mesh(g, new THREE.BoxGeometry(W + 0.15, 0.42, D + 0.75), pickMat, 0, 0.22, 0.3);
  }

  // ══ POTTED SUCCULENT — rear gap between turntable and PC ══
  // Mirror of the sax's slot: same rear corridor (z -0.8), reflected across
  // the turntable so the two figurines bracket the deck left/right.
  // Product-object echeveria (4-view frosted-planter reference): squat
  // etched-frost cylinder pot over a translucent celadon foot ring (four
  // stubby tabs peeking out at the floor), opaque cream liner + dark
  // granular soil inside, and a five-ring rosette of thick cupped leaves —
  // a parametric BufferGeometry per ring (flat-ish cupped top, keeled
  // underside, pointed up-curling tip) with a baked vertex-color gradient:
  // pale sage heart → gray-green margins, plus a restrained desaturated
  // warm kiss on the OUTER ring tips only (reads as sun-stress, stays shy
  // of a chromatic accent). Wall accents per the reference: ONE thin
  // celadon line high on the wall + ONE small rounded marker low on the
  // opposite side — LIT materials floated ~2mm off the frost. Static: no
  // tag, no glow, no tick. Live-tune via __cockpitDecor.set('plant', …).
  {
    const g = item('plant', 2.5, -0.8, 0.35);
    g.scale.setScalar(1.4);   // presence bump — the rosette detail should read from the cockpit

    // ── seeded rand — etch, skin, scatter and leaf jitter identical every mount ──
    let seed = 41;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

    // ── plant-local materials ──
    // fine etched speckle on the pot wall (finer sibling of the sax lace)
    const etchTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ACACAC'; ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 1600; i++){
        ctx.strokeStyle = rnd() > 0.5 ? 'rgba(210,210,210,0.5)' : 'rgba(150,150,150,0.45)';
        ctx.lineWidth = 0.6 + rnd();
        ctx.beginPath();
        ctx.arc(rnd() * 256, rnd() * 256, 0.8 + rnd() * 2.6, rnd() * Math.PI * 2, rnd() * Math.PI * 1.6 + 0.6);
        ctx.stroke();
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(4, 1.6);
      return t;
    })();
    // mottled waxy leaf skin — bump + roughness only, color lives in the vertices
    const skinTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#A6A6A6'; ctx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 700; i++){
        ctx.fillStyle = rnd() > 0.5 ? 'rgba(200,200,200,0.35)' : 'rgba(140,140,140,0.3)';
        ctx.beginPath();
        ctx.arc(rnd() * 128, rnd() * 128, 0.5 + rnd() * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(2, 3);
      return t;
    })();
    const potFrost = makeFrost({ color: 0xE9E5DC, transmission: 0.7, roughness: 0.38, thickness: 0.06 });
    potFrost.roughnessMap = etchTex; potFrost.bumpMap = etchTex; potFrost.bumpScale = 0.0009;
    const baseGreen = makeFrost({ color: 0x77937B, transmission: 0.55, roughness: 0.42, thickness: 0.05 });
    const rimGloss  = new THREE.MeshPhysicalMaterial({ color: 0xEFEBE1, roughness: 0.22, clearcoat: 0.7, clearcoatRoughness: 0.25 });
    const potLiner  = new THREE.MeshStandardMaterial({ color: 0xE9E4D8, roughness: 0.55, side: THREE.DoubleSide });
    const soilDark  = new THREE.MeshStandardMaterial({ color: 0x231810, roughness: 0.95 });
    const soilLt    = new THREE.MeshStandardMaterial({ color: 0x332417, roughness: 0.9 });
    const celadon   = new THREE.MeshStandardMaterial({ color: 0x6F8D75, roughness: 0.55 });
    const leafMat   = new THREE.MeshPhysicalMaterial({
      vertexColors: true, roughness: 0.58, clearcoat: 0.18, clearcoatRoughness: 0.55,
      sheen: 0.15, sheenColor: new THREE.Color(0xDCE8D8), sheenRoughness: 0.6,
      bumpMap: skinTex, roughnessMap: skinTex, bumpScale: 0.0006, side: THREE.DoubleSide,
      envMapIntensity: 0.45,   // the PMREM env washes pale sage to white at full strength
    });

    // ── planter — lathed frost wall with a rounded rolled rim ──
    const potPts = [
      [0.000, 0.054], [0.205, 0.054], [0.247, 0.062], [0.257, 0.088],
      [0.262, 0.170], [0.264, 0.295], [0.261, 0.325], [0.250, 0.344],
      [0.234, 0.349], [0.224, 0.342], [0.220, 0.324],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    mesh(g, new THREE.LatheGeometry(potPts, 64), potFrost, 0, 0, 0);
    // brighter gloss bead riding the rim — the reference's lit top lip
    const rim = mesh(g, new THREE.TorusGeometry(0.242, 0.005, 10, 64), rimGloss, 0, 0.3465, 0);
    rim.rotation.x = Math.PI / 2;
    // opaque cream liner — REQUIRED: the see-through desk would show the
    // void through the bare frost wall (same rule as the tablet's liner);
    // its top band is the white inner ring visible above the soil
    mesh(g, new THREE.CylinderGeometry(0.216, 0.210, 0.228, 40, 1, true), potLiner, 0, 0.204, 0);

    // ── celadon foot ring + four stubby tabs ──
    const ringPts = [
      [0.150, 0.000], [0.240, 0.000], [0.246, 0.016], [0.242, 0.038], [0.228, 0.052], [0.150, 0.052],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    mesh(g, new THREE.LatheGeometry(ringPts, 56), baseGreen, 0, 0, 0);
    [0.55, 2.05, 3.7, 5.2].forEach(a => {
      const f = mesh(g, new RoundedBoxGeometry(0.055, 0.024, 0.022, 2, 0.008), baseGreen,
        Math.sin(a) * 0.238, 0.012, Math.cos(a) * 0.238);
      f.lookAt(0, 0.012, 0);
    });

    // ── soil — matte disk + a seeded scatter of granules near the rim ──
    mesh(g, new THREE.CylinderGeometry(0.212, 0.212, 0.022, 40), soilDark, 0, 0.302, 0);
    for (let i = 0; i < 44; i++){
      const a = rnd() * Math.PI * 2, r = 0.085 + rnd() * 0.112;
      const grain = mesh(g, new THREE.IcosahedronGeometry(0.005 + rnd() * 0.007, 0), rnd() > 0.5 ? soilDark : soilLt,
        Math.cos(a) * r, 0.312 + rnd() * 0.006, Math.sin(a) * r);
      grain.rotation.set(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI);
    }

    // ── wall accents — thin vertical line (upper-left) + rounded marker (lower-right) ──
    const vline = mesh(g, new THREE.BoxGeometry(0.0065, 0.06, 0.0018), celadon,
      Math.sin(-0.55) * 0.266, 0.245, Math.cos(-0.55) * 0.266);
    vline.lookAt(0, 0.245, 0);
    const marker = mesh(g, new RoundedBoxGeometry(0.030, 0.024, 0.0035, 2, 0.005), celadon,
      Math.sin(0.85) * 0.260, 0.085, Math.cos(0.85) * 0.260);
    marker.lookAt(0, 0.085, 0);

    // ── leaf — parametric swept cross-section pointing +Z, base at origin.
    // Width bulges mid-blade and pinches to a point; the section is a
    // flattened lens whose margins curl up (cup) while the underside drops
    // a center ridge (keel); the spine lifts as u→1 so tips curl inward.
    const leafGeo = ({ len, wid, thk, bend, warm }) => {
      const LSEG = 20, RSEG = 16, CUP = 0.22, KEEL = 0.38;
      const pos = [], col = [], uv = [], idx = [];
      const cHeart = new THREE.Color(0xA8BC9F), cEdge = new THREE.Color(0x7C9376), cWarm = new THREE.Color(0xBD9077);
      const tint = new THREE.Color();
      for (let i = 0; i <= LSEG; i++){
        const u = i / LSEG;
        const w = wid * Math.pow(Math.sin(Math.PI * (0.14 + 0.86 * u)), 0.7);
        const t = thk * Math.pow(Math.sin(Math.PI * (0.10 + 0.90 * u)), 0.9);
        const lift = bend * u * u * (1 + 0.6 * u * u);
        for (let j = 0; j <= RSEG; j++){
          const th = (j / RSEG) * Math.PI * 2;
          const fx = Math.cos(th);
          const x = fx * w;
          let y = Math.sin(th) * t;
          if (y > 0) y *= 0.55;                       // flat-ish upper face
          else y -= KEEL * t * (1 - fx * fx);         // keeled underside
          y += CUP * w * fx * fx;                     // margins curl upward
          pos.push(x, y + lift, u * len);
          uv.push(j / RSEG, u);
          tint.lerpColors(cHeart, cEdge, Math.min(1, 0.22 + 0.62 * u + 0.3 * Math.abs(fx)));
          tint.lerp(cWarm, warm * Math.pow(Math.max(0, (u - 0.76) / 0.24), 1.7));
          col.push(tint.r, tint.g, tint.b);
        }
      }
      for (let i = 0; i < LSEG; i++) for (let j = 0; j < RSEG; j++){
        const a = i * (RSEG + 1) + j, b = a + RSEG + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      return geo;
    };

    // ── rosette — five staggered rings opening outward, jittered per leaf ──
    const rosette = new THREE.Group();
    rosette.position.y = 0.315;   // sits on the soil
    g.add(rosette);
    const addLeaf = (geoL, ang, rad, y, tilt, s) => {
      const L = new THREE.Mesh(geoL, leafMat);
      L.rotation.order = 'YXZ';   // yaw to face out, THEN pitch open — order matters
      L.position.set(Math.cos(ang) * rad, y, Math.sin(ang) * rad);
      L.rotation.y = Math.PI / 2 - ang + (rnd() - 0.5) * 0.10;
      L.rotation.x = -(tilt + (rnd() - 0.5) * 0.10);
      L.rotation.z = (rnd() - 0.5) * 0.08;
      L.scale.setScalar(s * (0.95 + rnd() * 0.1));
      rosette.add(L);
    };
    const RINGS = [
      { n: 12, rad: 0.080, y: 0.012, tilt: 0.30, s: 1.00, geo: leafGeo({ len: 0.300, wid: 0.095, thk: 0.040, bend: 0.085, warm: 0.85 }) },
      { n: 10, rad: 0.060, y: 0.042, tilt: 0.60, s: 0.98, geo: leafGeo({ len: 0.245, wid: 0.084, thk: 0.038, bend: 0.075, warm: 0.45 }) },
      { n: 8,  rad: 0.045, y: 0.082, tilt: 0.88, s: 0.96, geo: leafGeo({ len: 0.190, wid: 0.073, thk: 0.034, bend: 0.060, warm: 0.20 }) },
      { n: 6,  rad: 0.030, y: 0.122, tilt: 1.12, s: 0.94, geo: leafGeo({ len: 0.142, wid: 0.066, thk: 0.030, bend: 0.045, warm: 0 }) },
      { n: 5,  rad: 0.016, y: 0.156, tilt: 1.34, s: 0.92, geo: leafGeo({ len: 0.100, wid: 0.050, thk: 0.026, bend: 0.030, warm: 0 }) },
    ];
    RINGS.forEach((ring, k) => {
      for (let i = 0; i < ring.n; i++)
        addLeaf(ring.geo, (i / ring.n) * Math.PI * 2 + k * 0.83, ring.rad, ring.y, ring.tilt, ring.s);
    });
    // tight sage cone hides the open leaf bases at the heart
    mesh(rosette, new THREE.ConeGeometry(0.030, 0.075, 12),
      new THREE.MeshStandardMaterial({ color: 0xAEC3AA, roughness: 0.6 }), 0, 0.185, 0);
  }

  // ══ HANDHELD CONSOLE — Switch-style, jade grips, screen-up ══
  // Sits in the front gap between crate and turntable, lying flat with its
  // long axis running left↔right across the desk (only a whisper of yaw, so
  // it reads horizontal, not angled in).
  {
    const g = item('handheld', -2.1, 2.6, 0.18);
    mesh(g, new RoundedBoxGeometry(0.66, 0.045, 0.40, 2, 0.015), graphite, 0, 0.024, 0);
    [-1, 1].forEach(s => {
      const pad = mesh(g, new RoundedBoxGeometry(0.16, 0.05, 0.40, 2, 0.02), jade, s * 0.41, 0.026, 0);
      // stick + two buttons per pad
      mesh(g, new THREE.CylinderGeometry(0.028, 0.032, 0.02, 12), ink, s * 0.41, 0.058, -0.08);
      mesh(g, new THREE.SphereGeometry(0.014, 8, 8), ink, s * 0.38, 0.055, 0.1);
      mesh(g, new THREE.SphereGeometry(0.014, 8, 8), ink, s * 0.44, 0.055, 0.14);
    });
    mesh(g, new THREE.BoxGeometry(0.56, 0.004, 0.30), screenDark, 0, 0.049, 0);
  }

  // ══ PROTEIN SHAKER — beside the monitor's right edge, BEHIND the mouse ══
  // Frosted flip-cap bottle (4-angle product reference): rounded-bottom
  // tapered body half-filled with beige shake, stepped screw lid, short
  // offset spout, lever cap parked open on a rounded pivot. Jade stays
  // whisper-quiet: cap chip, hinge pin ends, one vertical body tick.
  // The size-rule exception: scaled to sit just under the crate's height
  // (crate top ≈1.95 table units; shaker top = 0.18 + 0.69·2.2 ≈ 1.70).
  // The one decoration with a pulse: cockpit-view click → quick shake
  // wiggle, the liquid sloshing a beat behind (root.tick below). Standing
  // against the PC it defers to the PC's hitbox wherever they overlap
  // (see pickShaker).
  {
    const g = item('shaker', 7.6, 1.7, 0);
    g.scale.setScalar(2.2);
    const wig = new THREE.Group();          // wiggle pivot at the base
    g.add(wig);
    shakerWiggle = wig;
    // body — open-top lathe, softly rounded lower edge (the lid closes it)
    const bodyPts = [
      [0.000, 0.012], [0.105, 0.012], [0.148, 0.026], [0.166, 0.062],
      [0.172, 0.130], [0.182, 0.320], [0.190, 0.500],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    mesh(wig, new THREE.LatheGeometry(bodyPts, 40), frost, 0, 0, 0);
    // half fill — frost lightens enclosed content, same trick as the mug;
    // base-anchored geometry so the slosh tilts around the bottom
    const liqGeo = new THREE.CylinderGeometry(0.155, 0.130, 0.26, 24);
    liqGeo.translate(0, 0.13, 0);
    shakerLiquid = mesh(wig, liqGeo, shake, 0, 0.03, 0);
    // stepped screw lid — frosted rings tightening upward
    mesh(wig, new THREE.CylinderGeometry(0.204, 0.208, 0.05, 32), frostCap, 0, 0.523, 0);
    mesh(wig, new THREE.CylinderGeometry(0.196, 0.204, 0.03, 32), frostCap, 0, 0.561, 0);
    mesh(wig, new THREE.CylinderGeometry(0.150, 0.192, 0.045, 32), frostCap, 0, 0.596, 0);
    // short drinking spout, offset toward one side of the lid
    mesh(wig, new THREE.CylinderGeometry(0.050, 0.055, 0.075, 20), frostCap, -0.095, 0.65, 0);
    // hinged lever cap — open: the arm tips up off a rounded pivot barrel
    const cap = new THREE.Group();
    cap.position.set(0.145, 0.645, 0);
    cap.rotation.z = -0.38;
    wig.add(cap);
    const pivot = mesh(cap, new THREE.CylinderGeometry(0.038, 0.038, 0.095, 16), frostCap, 0, 0, 0);
    pivot.rotation.x = Math.PI / 2;
    const pin = mesh(cap, new THREE.CylinderGeometry(0.012, 0.012, 0.104, 10), jade, 0, 0, 0);
    pin.rotation.x = Math.PI / 2;                     // ends peek past the barrel — the hinge accents
    mesh(cap, new RoundedBoxGeometry(0.24, 0.038, 0.085, 2, 0.014), frostCap, -0.115, 0.012, 0);
    mesh(cap, new THREE.BoxGeometry(0.05, 0.008, 0.04), jade, -0.165, 0.037, 0);
    // thin vertical jade tick on the body wall (floated off the frost)
    const tick = mesh(wig, new THREE.BoxGeometry(0.012, 0.095, 0.006), jade, 0, 0.365, 0.19);
    tick.lookAt(0, 0.365, 1);
    // invisible fat pick volume — cockpit-view click target
    shakerPick = mesh(wig, new THREE.CylinderGeometry(0.30, 0.30, 0.80, 8), pickMat, 0, 0.38, 0);
  }

  // ── Shaker wiggle — the one animated decoration ────────────────
  // Cockpit-view click → ~1.3s of quick side-to-side wiggle that snaps in
  // and rings down. The liquid tilts a phase-beat behind the shell so it
  // reads as sloshing; amplitudes stay small enough that the fill never
  // pokes through the frosted wall (relative tilt ≤ ~0.07 rad against a
  // ~0.02 radial clearance at the surface).
  let shakeT = -1;   // <0 idle, else seconds into the wiggle
  let drawT  = -1;   // <0 idle, else seconds into the stylus scribble
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let overClickable = false;
  const viewMode = () => window.__cockpitViewMode || 'cockpit';
  const pickShaker = (e) => {
    if (!shakerPick || !camera || !renderer) return false;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    if (!raycaster.intersectObject(shakerPick, false).length) return false;
    // The shaker stands against the PC, so their hitboxes overlap. The PC
    // wins any contested ray: if a PC mesh sits in front of the shaker's
    // REAL geometry (not the fat pick volume), decline the event so it
    // propagates to globe-canvas and directs to the PC instead.
    const pc = window.__cockpitPC;
    if (pc){
      const pcHit = raycaster.intersectObject(pc, true).find(h => h.object.isMesh);
      if (pcHit){
        const bodyHit = raycaster.intersectObject(shakerWiggle, true)
          .find(h => h.object.isMesh && h.object !== shakerPick);
        if (!bodyHit || pcHit.distance < bodyHit.distance) return false;
      }
    }
    return true;
  };
  // The tablet lies in the open in front of the keyboard, but a grazing ray
  // can pass over it into the PC — apply the same contested-ray rule.
  const pickTablet = (e) => {
    if (!tabletPick || !camera || !renderer) return false;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    if (!raycaster.intersectObject(tabletPick, false).length) return false;
    const pc = window.__cockpitPC;
    if (pc){
      const pcHit = raycaster.intersectObject(pc, true).find(h => h.object.isMesh);
      if (pcHit){
        const bodyHit = raycaster.intersectObject(tabletG, true)
          .find(h => h.object.isMesh && h.object !== tabletPick);
        if (!bodyHit || pcHit.distance < bodyHit.distance) return false;
      }
    }
    return true;
  };
  const onPointerMove = (e) => {
    if (viewMode() !== 'cockpit') return;
    const hit = (shakeT < 0 && pickShaker(e)) || (drawT < 0 && pickTablet(e));
    if (hit && !overClickable){ overClickable = true; renderer.domElement.style.cursor = CURSOR_POINTER; }
    else if (!hit && overClickable){
      overClickable = false;
      if (!window.__cockpitHoverPC) renderer.domElement.style.cursor = '';
    }
  };
  const onPointerDown = (e) => {
    if (e.button !== 0 || viewMode() !== 'cockpit') return;
    if (pickShaker(e)){
      if (shakeT < 0) shakeT = 0;
      e.stopPropagation();
    } else if (pickTablet(e)){
      if (drawT < 0) drawT = 0;
      e.stopPropagation();
    }
  };
  if (renderer){
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown, true);
  }

  const tickShake = (dt) => {
    if (shakeT < 0) return;
    shakeT += dt;
    const p = shakeT / 1.3;
    if (p >= 1){
      shakeT = -1;
      shakerWiggle.rotation.set(0, 0, 0);
      shakerLiquid.rotation.set(0, 0, 0);
      shakerLiquid.scale.y = 1;
      return;
    }
    // envelope: fast attack, quadratic ring-down
    const env = Math.min(1, p * 6) * (1 - p) * (1 - p);
    const w = shakeT * 26;
    shakerWiggle.rotation.z = Math.sin(w) * 0.16 * env;
    shakerWiggle.rotation.x = Math.sin(w * 0.7 + 1.2) * 0.07 * env;
    // the slosh: liquid lags a quarter-beat and breathes a touch
    shakerLiquid.rotation.z = Math.sin(w - 1.4) * 0.07 * env;
    shakerLiquid.scale.y = 1 + Math.sin(w * 2 - 0.8) * 0.05 * env;
  };

  // ── Stylus scribble — animated decoration #2 ───────────────────
  // Cockpit-view click on the tablet → the stylus lifts off its resting
  // diagonal with a little arc, tips up to the writing angle, hatches left ↔
  // right across the plate (drifting forward like stacked strokes), then lies
  // back down where it started. ~1.6s, fully procedural.
  const D_LIFT = 0.4, D_DRAW = 0.8, D_BACK = 0.4;
  const ease = (u) => u * u * (3 - 2 * u);
  let backFromPos = null, backFromQuat = null;
  const tickDraw = (dt) => {
    if (drawT < 0 || !stylusG) return;
    drawT += dt;
    if (drawT >= D_LIFT + D_DRAW + D_BACK){
      drawT = -1;
      backFromPos = backFromQuat = null;
      stylusG.position.copy(stylusRestPos);
      stylusG.quaternion.copy(stylusRestQuat);
      return;
    }
    if (drawT < D_LIFT){
      const u = ease(drawT / D_LIFT);
      stylusG.position.lerpVectors(stylusRestPos, stylusDrawPos, u);
      stylusG.position.y += Math.sin(u * Math.PI) * 0.18;      // pickup arc
      stylusG.quaternion.slerpQuaternions(stylusRestQuat, stylusDrawQuat, u);
    } else if (drawT < D_LIFT + D_DRAW){
      const s = drawT - D_LIFT;
      const w = s * 17;
      // nib hatches side to side across the plate — a plain left↔right sweep
      // with a slow forward drift so the strokes stack instead of retracing.
      // Amplitude stays well inside the active area so it never wanders off
      // the charcoal plate.
      stylusG.position.copy(stylusDrawPos);
      stylusG.position.x += Math.sin(w) * 0.26;                // left ↔ right
      stylusG.position.z += s * 0.05;                          // stroke drift
      stylusG.quaternion.copy(stylusDrawQuat);
      stylusG.rotateZ(Math.sin(w * 2) * 0.035);                // wrist bob at each turn
      backFromPos = stylusG.position.clone();                  // return starts wherever the scribble ends
      backFromQuat = stylusG.quaternion.clone();
    } else if (backFromPos){
      const u = ease((drawT - D_LIFT - D_DRAW) / D_BACK);
      stylusG.position.lerpVectors(backFromPos, stylusRestPos, u);
      stylusG.position.y += Math.sin(u * Math.PI) * 0.14;      // set-down arc
      stylusG.quaternion.slerpQuaternions(backFromQuat, stylusRestQuat, u);
    }
  };

  root.tick = function(dt){
    tickShake(dt);
    tickDraw(dt);
  };

  // ── Live dial-in bridge (mirrors the other __cockpit* setters) ──
  window.__cockpitDecor = {
    list: () => [...items.keys()],
    set(name, { x, y, z, ry, s } = {}){
      const g = items.get(name);
      if (!g) return false;
      if (typeof x === 'number') g.position.x = x;
      if (typeof y === 'number') g.position.y = y;
      if (typeof z === 'number') g.position.z = z;
      if (typeof ry === 'number') g.rotation.y = ry;
      if (typeof s === 'number') g.scale.setScalar(s);
      return true;
    },
  };
  root.dispose = function(){
    if (renderer){
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown, true);
    }
    window.__cockpitDecor = null;
  };

  return root;
}
