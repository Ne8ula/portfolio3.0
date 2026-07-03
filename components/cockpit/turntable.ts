// @ts-nocheck
// Turntable — a procedural Audio-Technica-LP120-style deck that sits in the
// middle of the cockpit desk, between the vinyl crate (left) and the PC
// (right). Built in the same visual language as the rest of the scene:
// Lambert fills + dark edge wireframes + jade as the only chromatic accent.
// Decorative (platter spins); no interactions yet.
import * as THREE from "three"

export function buildTurntable(scene, tableGroup){
  const group = new THREE.Group();
  group.position.set(0, 0.18, 0.8);
  group.rotation.y = -0.12;
  group.scale.setScalar(1.4);
  tableGroup.add(group);
  window.__cockpitTurntable = group;
  group.setTransform = function({ x, y, z, ry, s } = {}){
    if (typeof x === 'number') group.position.x = x;
    if (typeof y === 'number') group.position.y = y;
    if (typeof z === 'number') group.position.z = z;
    if (typeof ry === 'number') group.rotation.y = ry;
    if (typeof s === 'number') group.scale.setScalar(s);
  };

  const silver = new THREE.MeshLambertMaterial({ color: 0xC9C4BA });
  const dark   = new THREE.MeshLambertMaterial({ color: 0x2A2722 });
  const darker = new THREE.MeshLambertMaterial({ color: 0x17150F });
  const jade   = new THREE.MeshLambertMaterial({ color: 0x4B6E4F });
  const jadeLt = new THREE.MeshLambertMaterial({ color: 0x7A9A7E });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x55514B, transparent: true, opacity: 0.6 });

  const addEdges = (mesh) => {
    const seg = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), edgeMat);
    seg.position.copy(mesh.position);
    seg.rotation.copy(mesh.rotation);
    (mesh.parent || group).add(seg);
  };

  // ── Plinth ────────────────────────────────────────────────────
  const PLINTH_W = 1.9, PLINTH_H = 0.16, PLINTH_D = 1.5;
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(PLINTH_W, PLINTH_H, PLINTH_D), silver);
  plinth.position.y = PLINTH_H / 2;
  group.add(plinth); addEdges(plinth);
  const topY = PLINTH_H;

  // ── Platter + record (spin) ───────────────────────────────────
  const platter = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.07, 44), dark);
  platter.position.set(-0.28, topY + 0.035, 0);
  group.add(platter);
  // strobe-dot rim — jade ring around the platter edge
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.008, 6, 44), jade);
  rim.rotation.x = Math.PI / 2;
  rim.position.copy(platter.position);
  rim.position.y += 0.03;
  group.add(rim);
  const record = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.014, 44), darker);
  record.position.set(platter.position.x, topY + 0.078, 0);
  group.add(record);
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.016, 32), jadeLt);
  label.position.copy(record.position);
  group.add(label);
  const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.05, 10), silver);
  spindle.position.set(platter.position.x, topY + 0.1, 0);
  group.add(spindle);

  // ── Tonearm (pivot base, arm over the record, counterweight) ──
  const armPivot = new THREE.Group();
  armPivot.position.set(0.62, topY, -0.42);
  group.add(armPivot);
  const armBase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.12, 20), dark);
  armBase.position.y = 0.06;
  armPivot.add(armBase);
  const armAssembly = new THREE.Group();
  armAssembly.position.y = 0.14;
  armAssembly.rotation.y = -0.62;           // swung in over the record
  armPivot.add(armAssembly);
  const armTube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.95, 10), silver);
  armTube.rotation.z = Math.PI / 2;
  armTube.position.x = -0.475;              // extends from the pivot toward the platter
  armAssembly.add(armTube);
  const headshell = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.05), jade);
  headshell.position.set(-0.95, -0.015, 0);
  armAssembly.add(headshell);
  const counterweight = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.09, 16), darker);
  counterweight.rotation.z = Math.PI / 2;
  counterweight.position.x = 0.14;          // behind the pivot
  armAssembly.add(counterweight);

  // ── Controls: start/stop + 33/45 buttons, pitch slider ────────
  const startBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.035, 20), dark);
  startBtn.position.set(-0.78, topY, 0.58);
  group.add(startBtn);
  [0, 1].forEach(i => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.07), i === 0 ? jade : dark);
    b.position.set(-0.52 + i * 0.14, topY, 0.6);
    group.add(b);
  });
  const pitchTrack = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.015, 0.5), darker);
  pitchTrack.position.set(0.78, topY, 0.18);
  group.add(pitchTrack);
  const pitchKnob = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.035, 0.06), silver);
  pitchKnob.position.set(0.78, topY + 0.01, 0.1);
  group.add(pitchKnob); addEdges(pitchKnob);

  // ── Spin ──────────────────────────────────────────────────────
  group.tick = function(dt){
    platter.rotation.y += dt * 1.6;
    record.rotation.y  += dt * 1.6;
    label.rotation.y   += dt * 1.6;
  };

  return group;
}
