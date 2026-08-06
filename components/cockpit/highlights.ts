// @ts-nocheck
// Edge-glow highlights — a light "Borderlands-lite" treatment for the four
// interactive hero objects (PC / crate / turntable / coffee): jade
// EdgesGeometry traces over each object's significant meshes. The traces
// rest INVISIBLE and fade in as a faint outline glow while that object is
// hovered — the hover affordance. No post-processing — plain LineSegments
// children that ride their parent mesh's transform (spinning platter,
// pouring stack included).
//
// Rules of engagement:
//   • one shared LineBasicMaterial per target → per-object hover fade
//   • meshes opt out via userData.noGlow (checked up the ancestor chain —
//     flag a group to silence its whole subtree, e.g. the crate's records)
//   • tiny meshes (keycaps, feet, knobs) are skipped by bounding-sphere
//     size, so the trace stays a silhouette, not noise
//   • transparent MeshBasicMaterials are decals/pick volumes — skipped
//   • depthWrite AND depthTest stay off — the traces x-ray through the
//     transmissive cover shells (which write depth and exclude transparent
//     lines from the transmission buffer, so depth-tested lines under a
//     cover are invisible). Fine for a transient hover affordance, and it
//     matches the schematic language. renderOrder floats them last.
//   • normal blending with a SATURATED light jade at high opacity —
//     additive blending clamps to white over the ~0.9-luminance cream
//     bodies (any addition saturates), while a bright saturated jade
//     line reads by chroma contrast on cream AND pops on the dark bg.
//     Theme applier in globe-canvas swaps color per theme (light theme
//     uses deep-jade ink, which reads on ivory).
import * as THREE from "three"
import { getFrameTimes } from "./frame-times"
import { PALETTE } from "./materials"

const MIN_RADIUS = 0.14;   // geometry bounding-sphere radius floor (local units)
const EDGE_THRESH = 25;    // EdgesGeometry crease angle

export function makeEdgeGlow(){
  const targets = new Map();   // key → { mat, lines, boost, cur }
  let lastT = null;            // for smoothing dt inside tick

  // opts.edgeThresh / opts.minRadius — per-target overrides for geometry
  // that the defaults under-trace (e.g. the crate's rounded-box shell,
  // whose soft crease angles yield almost no edges at 25°).
  const attach = (key, roots, { color = PALETTE.jadeLt, edgeThresh = EDGE_THRESH, minRadius = MIN_RADIUS } = {}) => {
    const mat = new THREE.LineBasicMaterial({
      color, transparent: true, opacity: 0, depthWrite: false,
      depthTest: false,
    });
    const lines = [];
    const rootsArr = Array.isArray(roots) ? roots : [roots];
    rootsArr.forEach(root => root.traverse(o => {
      if (!o.isMesh || o.userData.__edgeGlow) return;
      // ancestor opt-out (stop at the attach root)
      for (let n = o; n && n !== root.parent; n = n.parent){
        if (n.userData && n.userData.noGlow) return;
      }
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!m || (m.isMeshBasicMaterial && m.transparent)) return;   // decals / pick volumes
      if (!o.geometry) return;
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      if (!o.geometry.boundingSphere || o.geometry.boundingSphere.radius < minRadius) return;
      try {
        const line = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, edgeThresh), mat);
        line.userData.__edgeGlow = true;
        line.renderOrder = 999;       // after all other transparents
        line.raycast = () => {};      // never intercept picking
        o.add(line);                  // rides the mesh's transform for free
        lines.push(line);
      } catch (e){ /* non-indexed exotic geometry — skip */ }
    }));
    targets.set(key, { mat, lines, boost: 0, cur: 0 });
    return mat;    // caller may register it for theme color swaps
  };

  const setBoost = (key, v) => {
    const t = targets.get(key);
    if (t) t.boost = v;
  };

  // vis: 0..1 master fade (0 while the camera is focused on monitor/crate).
  // Traces rest at 0 opacity; a hovered target's boost eases its faint
  // outline glow in (~120ms) and back out, with a slow pulse while held.
  const tick = (t, vis) => {
    const { tAmbient } = getFrameTimes();
    const ambientT = typeof tAmbient === 'number' ? tAmbient : t;
    const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, ambientT - lastT));
    lastT = ambientT;
    const k = 1 - Math.exp(-dt * 9);
    const pulse = 0.5 + 0.5 * Math.sin(ambientT * 2.2);
    targets.forEach(tg => {
      tg.cur += (tg.boost - tg.cur) * k;
      tg.mat.opacity = vis * tg.cur * (0.78 + pulse * 0.18);
      const on = tg.mat.opacity > 0.01;
      if (on !== tg.lines[0]?.visible) tg.lines.forEach(l => { l.visible = on; });
    });
  };

  const dispose = () => {
    targets.forEach(tg => {
      tg.lines.forEach(l => { l.parent?.remove(l); l.geometry.dispose(); });
      tg.mat.dispose();
    });
    targets.clear();
  };

  return { attach, setBoost, tick, dispose };
}
