// @ts-nocheck
// Desk decorations — menial hobby objects that dress the desk WITHOUT
// competing with the four interactive heroes (crate / turntable / PC /
// coffee). Everything here is small (≤ ~0.9 desk units tall) and HUD-free —
// EXCEPT the sax figurine (s 1.45, so its keywork reads from the cockpit)
// and the protein shaker: near-crate height beside the PC, and the one
// interactive piece (click-to-wiggle; no HUD, no view mode — just motion,
// and the PC's hitbox wins wherever they overlap). The pieces map to
// Alex's actual life:
//   • frosted alto sax figurine   — jazz (the reason the vinyl deck exists)
//   • gachapon capsule            — collecting; mauve/jade = the Eva-01 colorway
//   • handheld console            — Switch-style, mauve/jade pads
//   • "six seasons & a movie"     — Community sticky note by the PC
//   • drawing tablet + stylus     — iPad sketching
//   • potted plant                — greenery
//   • protein shaker              — gym (click → shake wiggle + slosh)
// Palette stays inside the design system: cream/ink/mauve + jade accents on
// LIT materials only (unlit basics glow like light-bars over the dim scene).
import * as THREE from "three"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js"
import { PALETTE, makeFrost } from "./materials"
import { makeTextDecal } from "./decals"
import { CURSOR_POINTER } from "./cursors"

const MONO = '"JetBrains Mono", Consolas, monospace';

export function buildDecorations(scene, tableGroup, camera, renderer){
  const root = new THREE.Group();
  tableGroup.add(root);
  let shakerWiggle = null, shakerLiquid = null, shakerPick = null;

  // ── Shared materials ──────────────────────────────────────────
  const creamLt   = new THREE.MeshStandardMaterial({ color: 0xE7E2D5, roughness: 0.6 });
  const graphite  = new THREE.MeshStandardMaterial({ color: 0x3A3733, roughness: 0.6, metalness: 0.08 });
  const ink       = new THREE.MeshLambertMaterial({ color: 0x26231F });
  const mauve     = new THREE.MeshStandardMaterial({ color: 0x6E6878, roughness: 0.55 });
  const mauveDeep = new THREE.MeshStandardMaterial({ color: 0x3A3644, roughness: 0.5 });
  const jade      = new THREE.MeshStandardMaterial({ color: PALETTE.jade, roughness: 0.6 });
  const leafA     = new THREE.MeshStandardMaterial({ color: 0x4B6E4F, roughness: 0.7, side: THREE.DoubleSide });
  const leafB     = new THREE.MeshStandardMaterial({ color: 0x5C8061, roughness: 0.7, side: THREE.DoubleSide });
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
  // right of the turntable, against the back. Design-object reinterpretation
  // (6-view product reference): frost body/bell/neck, cream keywork, muted
  // jade pad tops + mouthpiece ring + base chip — no brass anywhere.
  {
    const g = item('sax', 2.5, -0.7, -0.85);   // turned so the bell mouth faces the room, clear of the PC bezel
    g.scale.setScalar(1.45);   // size exception #2: reads from the cockpit, still under the shaker/crate
    const sage = new THREE.MeshStandardMaterial({ color: PALETTE.jadeLt, roughness: 0.55 });
    const frostShell = makeFrost({ transmission: 0.7, roughness: 0.3, thickness: 0.06 });
    frostShell.side = THREE.DoubleSide;   // the bell is an open flare — its hollow must read

    // pedestal — low rounded puck under the bow, jade chip at the front lip
    const basePts = [
      [0.000, 0.000], [0.190, 0.000], [0.200, 0.014], [0.193, 0.038],
      [0.150, 0.052], [0.095, 0.058], [0.000, 0.058],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    mesh(g, new THREE.LatheGeometry(basePts, 40), frost, 0.12, 0, 0);
    mesh(g, new THREE.BoxGeometry(0.065, 0.014, 0.024), jade, 0.12, 0.056, 0.145);

    const sax = new THREE.Group();
    sax.position.set(0, 0.058, 0);   // instrument stands on the pedestal top
    g.add(sax);

    // body — straight-ish upper tube down the front of the stack
    const bodyPts = [
      [0.02, 0.80], [0.05, 0.66], [0.075, 0.48], [0.09, 0.30], [0.095, 0.21],
    ].map(([x, y]) => new THREE.Vector3(x, y, 0));
    sax.add(new THREE.Mesh(new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(bodyPts, false, 'catmullrom', 0.4), 32, 0.033, 12, false), frost));
    // bow — a FATTER compact U hugging the body: its rising branch climbs
    // right beside the descending tube (surfaces ~touching, per reference)
    const bowPts = [
      [0.095, 0.22], [0.10, 0.12], [0.122, 0.065], [0.152, 0.062], [0.170, 0.10], [0.172, 0.14],
    ].map(([x, y]) => new THREE.Vector3(x, y, 0));
    sax.add(new THREE.Mesh(new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(bowPts, false, 'catmullrom', 0.4), 32, 0.043, 12, false), frost));
    // ferrule collar where the fatter bow swallows the body tube
    mesh(sax, new THREE.CylinderGeometry(0.047, 0.047, 0.022, 16), frost, 0.094, 0.215, 0);

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
    bellG.add(new THREE.Mesh(new THREE.LatheGeometry(bellPts, 28), frostShell));
    const rim = mesh(bellG, new THREE.TorusGeometry(0.106, 0.010, 8, 28), frost, 0, 0.283, 0);
    rim.rotation.x = Math.PI / 2;
    // collar band partway up the bell tube (reference detail)
    mesh(bellG, new THREE.CylinderGeometry(0.057, 0.057, 0.016, 16), frost, 0, 0.145, 0);
    const brace = mesh(sax, new THREE.CylinderGeometry(0.006, 0.006, 0.06, 8), creamLt, 0.15, 0.30, 0);
    brace.rotation.z = Math.PI / 2;   // short bell-to-body brace bar

    // curved neck → tapered mouthpiece, jade ring band at the joint
    const neckPts = [
      [0.02, 0.79], [0.012, 0.87], [-0.02, 0.93], [-0.07, 0.955],
    ].map(([x, y]) => new THREE.Vector3(x, y, 0));
    sax.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(neckPts), 20, 0.019, 10, false), frost));
    const ring = mesh(sax, new THREE.CylinderGeometry(0.023, 0.023, 0.018, 12), jade, -0.075, 0.957, 0);
    ring.rotation.z = 1.107;
    const mp = mesh(sax, new THREE.CylinderGeometry(0.006, 0.019, 0.10, 12), frost, -0.115, 0.977, 0);
    mp.rotation.z = 1.107;
    // octave key hugging the neck's back
    const oct = mesh(sax, new THREE.CylinderGeometry(0.0035, 0.0035, 0.10, 6), creamLt, 0.008, 0.865, 0.014);
    oct.rotation.z = 0.45;
    mesh(sax, new THREE.SphereGeometry(0.008, 8, 6), creamLt, -0.014, 0.91, 0.014);

    // main stacks — cream cups with muted-jade tops, floated off the tube
    [
      [0.68, 0.046, 0.024], [0.61, 0.057, 0.024], [0.54, 0.067, 0.024], [0.47, 0.076, 0.025],
      [0.36, 0.085, 0.027], [0.29, 0.090, 0.027], [0.22, 0.095, 0.028],
    ].forEach(([y, x, r]) => {
      const cup = mesh(sax, new THREE.CylinderGeometry(r, r * 0.8, 0.012, 14), creamLt, x, y, 0.042);
      cup.rotation.x = Math.PI / 2;
      const top = mesh(sax, new THREE.CylinderGeometry(r * 0.7, r * 0.7, 0.006, 12), sage, x, y, 0.051);
      top.rotation.x = Math.PI / 2;
    });
    // long action rods flanking the stacks + pivot posts + connecting arms
    const rodL = mesh(sax, new THREE.CylinderGeometry(0.005, 0.005, 0.52, 8), creamLt, 0.019, 0.45, 0.020);
    rodL.rotation.z = 0.11;
    const rodR = mesh(sax, new THREE.CylinderGeometry(0.005, 0.005, 0.46, 8), creamLt, 0.119, 0.45, 0.012);
    rodR.rotation.z = 0.11;
    [[0.66, -0.004], [0.54, 0.009], [0.42, 0.022], [0.30, 0.036]].forEach(([y, x]) => {
      mesh(sax, new THREE.SphereGeometry(0.009, 8, 6), creamLt, x, y, 0.020);
    });
    [[0.68, 0.046], [0.54, 0.067], [0.36, 0.085], [0.22, 0.095]].forEach(([y, px]) => {
      const arm = mesh(sax, new THREE.CylinderGeometry(0.004, 0.004, 0.055, 6), creamLt, px - 0.03, y, 0.030);
      arm.rotation.z = Math.PI / 2;
    });
    // palm keys on the right flank — stem + flattened teardrop
    [[0.585, 0.060], [0.515, 0.070]].forEach(([y, bx]) => {
      const stem = mesh(sax, new THREE.CylinderGeometry(0.004, 0.004, 0.045, 6), creamLt, bx + 0.028, y, 0.012);
      stem.rotation.z = Math.PI / 2;
      const key = mesh(sax, new THREE.SphereGeometry(0.013, 10, 8), creamLt, bx + 0.052, y, 0.012);
      key.scale.set(1, 0.55, 1.5);
    });
    // low bow pads — the two big cups with wire guards arcing over them
    const bp1 = mesh(sax, new THREE.CylinderGeometry(0.036, 0.030, 0.014, 16), creamLt, 0.10, 0.155, 0.053);
    bp1.rotation.x = Math.PI / 2;
    const bt1 = mesh(sax, new THREE.CylinderGeometry(0.026, 0.026, 0.007, 14), sage, 0.10, 0.155, 0.062);
    bt1.rotation.x = Math.PI / 2;
    mesh(sax, new THREE.TorusGeometry(0.047, 0.005, 6, 14, Math.PI), creamLt, 0.10, 0.155, 0.068);
    const bp2 = mesh(sax, new THREE.CylinderGeometry(0.036, 0.030, 0.014, 16), creamLt, 0.138, 0.075, 0.053);
    bp2.rotation.x = Math.PI / 2 - 0.5;
    const bt2 = mesh(sax, new THREE.CylinderGeometry(0.026, 0.026, 0.007, 14), sage, 0.138, 0.080, 0.062);
    bt2.rotation.x = Math.PI / 2 - 0.5;
    const g2 = mesh(sax, new THREE.TorusGeometry(0.047, 0.005, 6, 14, Math.PI), creamLt, 0.138, 0.083, 0.067);
    g2.rotation.x = -0.5;
    // left-pinky table — two small stacked touch plates low on the stack
    [[0.030, 0.265], [0.048, 0.242]].forEach(([x, y]) => {
      mesh(sax, new RoundedBoxGeometry(0.026, 0.017, 0.008, 1, 0.003), creamLt, x, y, 0.036);
    });
    // jade collar where the neck socket meets the body top
    const nc = mesh(sax, new THREE.CylinderGeometry(0.037, 0.037, 0.016, 14), jade, 0.02, 0.79, 0);
    nc.rotation.z = -0.08;
    // integrated stand supports — frosted block under the bow, plate behind the body
    mesh(sax, new THREE.BoxGeometry(0.05, 0.04, 0.036), frost, 0.137, 0.012, 0);
    mesh(sax, new THREE.BoxGeometry(0.024, 0.22, 0.04), frost, 0.10, 0.10, -0.048);
  }

  // (The Chinese tea set graduated to its own coffee-tier module — tea-set.ts.)

  // ══ DRAWING TABLET + STYLUS — front-left, between crate and coffee ══
  {
    const g = item('tablet', -4.35, 3.95, 0.5);
    mesh(g, new RoundedBoxGeometry(0.88, 0.035, 0.62, 2, 0.014), graphite, 0, 0.018, 0);
    // sleeping sketch screen — sage wireframe doodle on near-black
    const sketch = makeTextDecal((ctx, W, H) => {
      ctx.fillStyle = '#141210';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#3E4A40';
      ctx.lineWidth = 3;
      ctx.strokeRect(150, 60, 130, 130);                        // rough cube sketch
      ctx.strokeRect(190, 100, 130, 130);
      ctx.beginPath(); ctx.moveTo(150, 60);  ctx.lineTo(190, 100); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(280, 60);  ctx.lineTo(320, 100); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(150, 190); ctx.lineTo(190, 230); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(280, 190); ctx.lineTo(320, 230); ctx.stroke();
      ctx.font = `500 22px ${MONO}`;
      ctx.fillStyle = '#6F8D75';
      ctx.fillText('sketch_04.raw', 356, 300);
    }, { width: 0.8, pxW: 512, pxH: 356, opacity: 1 });
    sketch.rotation.x = -Math.PI / 2;
    sketch.position.y = 0.038;
    g.add(sketch);
    const stylus = mesh(g, new THREE.CylinderGeometry(0.014, 0.014, 0.36, 10), creamLt, 0.34, 0.03, 0.42);
    stylus.rotation.z = Math.PI / 2;
    stylus.rotation.y = -0.35;
    const nib = mesh(g, new THREE.ConeGeometry(0.013, 0.035, 10), jade, 0.34 + 0.19 * Math.cos(-0.35), 0.03, 0.42 + 0.19 * Math.sin(0.35));
    nib.rotation.z = -Math.PI / 2;
    nib.rotation.y = -0.35;
  }

  // ══ GACHAPON CAPSULE — Eva-01 colorway (mauve shell, jade seam) ══
  {
    const g = item('gachapon', -2.1, 2.6, 0.8);
    const R = 0.19;
    const bottom = mesh(g, new THREE.SphereGeometry(R, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mauve, 0, R, 0);
    bottom.material = mauve;
    mesh(g, new THREE.CircleGeometry(R, 24), mauve, 0, R * 0.02 + 0.002, 0).rotation.x = -Math.PI / 2;
    const top = mesh(g, new THREE.SphereGeometry(R, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), frostCap, 0, R, 0);
    const seam = mesh(g, new THREE.TorusGeometry(R + 0.004, 0.008, 8, 32), jade, 0, R, 0);
    seam.rotation.x = Math.PI / 2;
    // tiny mech bust inside, visible through the frosted dome
    mesh(g, new THREE.BoxGeometry(0.07, 0.08, 0.05), mauveDeep, 0, R + 0.05, 0);
    mesh(g, new THREE.BoxGeometry(0.045, 0.045, 0.04), mauve, 0, R + 0.115, 0);
    const horn = mesh(g, new THREE.ConeGeometry(0.008, 0.05, 6), jade, 0, R + 0.16, 0.008);
    horn.rotation.x = -0.25;
  }

  // ══ POTTED PLANT — back-left of the turntable ══
  {
    const g = item('plant', -1.75, -1.2, 0);
    mesh(g, new THREE.CylinderGeometry(0.15, 0.12, 0.2, 20), frost, 0, 0.1, 0);
    mesh(g, new THREE.CylinderGeometry(0.135, 0.135, 0.02, 18), new THREE.MeshStandardMaterial({ color: 0x241811, roughness: 0.9 }), 0, 0.19, 0);
    // leaves — simple planes fanning up and out
    for (let i = 0; i < 7; i++){
      const a = (i / 7) * Math.PI * 2 + 0.4;
      const tall = i % 2 === 0;
      const leaf = mesh(g, new THREE.PlaneGeometry(0.11, tall ? 0.34 : 0.24), i % 2 ? leafA : leafB,
        Math.cos(a) * 0.06, 0.19 + (tall ? 0.16 : 0.11), Math.sin(a) * 0.06);
      leaf.rotation.y = -a + Math.PI / 2;
      leaf.rotation.x = (tall ? -0.18 : -0.38);
    }
  }

  // ══ STICKY NOTE — "six seasons & a movie", flat on the desk by the PC ══
  {
    const g = item('note', 4.25, 3.05, 0.35);
    const note = makeTextDecal((ctx, W, H) => {
      ctx.fillStyle = '#EDE6CF';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(30,28,26,0.06)';
      ctx.fillRect(0, 0, W, 14);                                   // adhesive strip shadow
      ctx.fillStyle = '#55514B';
      ctx.font = `500 44px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText('six seasons', W / 2, 116);
      ctx.fillText('& a movie', W / 2, 172);
      ctx.fillStyle = '#4B6E4F';
      ctx.fillRect(W / 2 - 30, 210, 60, 6);
    }, { width: 0.3, pxW: 256, pxH: 256, opacity: 1 });
    note.rotation.x = -Math.PI / 2;
    note.position.y = 0.012;
    g.add(note);
  }

  // ══ HANDHELD CONSOLE — Switch-style, mauve/jade pads, screen-up ══
  {
    const g = item('handheld', 6.4, 3.5, 0.25);
    mesh(g, new RoundedBoxGeometry(0.66, 0.045, 0.40, 2, 0.015), graphite, 0, 0.024, 0);
    [-1, 1].forEach(s => {
      const pad = mesh(g, new RoundedBoxGeometry(0.16, 0.05, 0.40, 2, 0.02), s < 0 ? mauve : jade, s * 0.41, 0.026, 0);
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
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let overShaker = false;
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
  const onPointerMove = (e) => {
    if (viewMode() !== 'cockpit') return;
    const hit = shakeT < 0 && pickShaker(e);
    if (hit && !overShaker){ overShaker = true; renderer.domElement.style.cursor = CURSOR_POINTER; }
    else if (!hit && overShaker){
      overShaker = false;
      if (!window.__cockpitHoverPC) renderer.domElement.style.cursor = '';
    }
  };
  const onPointerDown = (e) => {
    if (e.button !== 0 || viewMode() !== 'cockpit') return;
    if (pickShaker(e)){
      if (shakeT < 0) shakeT = 0;
      e.stopPropagation();
    }
  };
  if (renderer){
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown, true);
  }

  root.tick = function(dt){
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
