// @ts-nocheck
// Passive ash assembly. No scene-level smoke or animated ember.
import * as THREE from "three"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js"
import type { RandomSource } from "@/lib/random/seeded-streams"
import { PALETTE, makeHeroGlass, makeAccentMaterial } from "./materials"

export function buildIncense(scene, tableGroup, options: { readonly randomSource: RandomSource }){
  const group=new THREE.Group(); group.name='incense';
  group.position.set(-4.20,0.18,2.35); tableGroup.add(group);
  const clear=makeHeroGlass({thickness:0.025,roughness:0.16});
  const ink=new THREE.MeshStandardMaterial({color:PALETTE.ink,roughness:0.7});
  const cream=new THREE.MeshStandardMaterial({color:PALETTE.cream,roughness:0.6});
  const jade=makeAccentMaterial(new THREE.MeshStandardMaterial({color:PALETTE.jade,roughness:0.5}));
  const ash=new THREE.MeshStandardMaterial({color:PALETTE.trim,roughness:0.95});
  const add=(name,geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.name=name;m.position.set(x,y,z);group.add(m);return m;};
  const box=(w,h,d)=>new RoundedBoxGeometry(w,h,d,2,0.006);
  for(const x of [-0.18,0.18])for(const z of [-0.23,0.23])add('plinth-foot',box(0.08,0.02,0.08),ink,x,0.01,z);
  add('clear-plinth',box(0.50,0.025,0.60),clear,0,0.0325,0);
  add('plinth-seam',box(0.45,0.008,0.55),ink,0,0.049,0);
  for(const z of [-0.2875,0.2875])add('clear-perimeter',box(0.50,0.05,0.025),clear,0,0.078,z);
  for(const x of [-0.2375,0.2375])add('clear-perimeter',box(0.025,0.05,0.55),clear,x,0.078,0);
  add('ink-ash-basin',box(0.42,0.025,0.51),ink,0,0.0655,0);
  for(const z of [-0.17,0,0.17])add('basin-slotted-insert',box(0.38,0.022,0.13),ink,0,0.089,z);
  add('ceramic-socket',new THREE.CylinderGeometry(0.075,0.105,0.12,32),cream,0,0.16,0);
  const collar=add('jade-retainer',new THREE.TorusGeometry(0.038,0.014,8,32),jade,0,0.225,0);collar.rotation.x=Math.PI/2;
  for(const z of [-0.23,0.23]){
    add('fastener-recess',new THREE.CylinderGeometry(0.025,0.025,0.008,16),ink,0.16,0.098,z);
    add('recessed-fastener',new THREE.CylinderGeometry(0.012,0.012,0.006,12),cream,0.16,0.099,z);
  }
  add('incense-stick',new THREE.CylinderGeometry(0.009,0.009,0.94,10),cream,0,0.70,0);
  add('stick-seat',new THREE.CylinderGeometry(0.011,0.011,0.05,10),ink,0,0.25,0);
  add('matte-ash-tip',new THREE.CylinderGeometry(0.010,0.009,0.03,10),ash,0,1.185,0);
  group.tick=(_dt,_t)=>{};
  window.__cockpitIncense={set({x,y,z,ry,s}={}){
    if(typeof x==='number')group.position.x=x;
    if(typeof y==='number')group.position.y=y;
    if(typeof z==='number')group.position.z=z;
    if(typeof ry==='number')group.rotation.y=ry;
    if(typeof s==='number')group.scale.setScalar(s);
  }};
  group.dispose=()=>{window.__cockpitIncense=null;};
  return group;
}
