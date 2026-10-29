// @ts-nocheck
// Passive assembled tea set: thin protective perimeter and opaque working cores.
import * as THREE from "three"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js"
import type { RandomSource } from "@/lib/random/seeded-streams"
import { PALETTE, makeHeroGlass, makeFrost, makeAccentMaterial } from "./materials"

export function buildTeaSet(scene, tableGroup, options: { readonly randomSource: RandomSource }){
  const group = new THREE.Group(); group.name = 'tea-set';
  group.position.set(-5.85, 0.18, 0.15); group.rotation.y = 0.10;
  tableGroup.add(group);
  const clear = makeHeroGlass({ thickness: 0.03, roughness: 0.16 });
  const frost = makeFrost({ thickness: 0.03, roughness: 0.34, transmission: 0.75 });
  const cream = new THREE.MeshStandardMaterial({ color: PALETTE.cream, roughness: 0.52 });
  const ink = new THREE.MeshStandardMaterial({ color: PALETTE.ink, roughness: 0.62 });
  const jade = makeAccentMaterial(new THREE.MeshStandardMaterial({ color: PALETTE.jade, roughness: 0.48 }));
  const add = (name, geo, mat, x, y, z, parent = group) => {
    const m = new THREE.Mesh(geo, mat); m.name = name; m.position.set(x,y,z); parent.add(m); return m;
  };
  const box = (w,h,d) => new RoundedBoxGeometry(w,h,d,2,0.008);
  const lathe = (pts, start=0, length=Math.PI*2) => new THREE.LatheGeometry(pts.map(([r,y]) => new THREE.Vector2(r,y)),40,start,length);
  const ring = (name,r,t,mat,x,y,z,parent=group) => {
    const m=add(name,new THREE.TorusGeometry(r,t,8,40),mat,x,y,z,parent); m.rotation.x=Math.PI/2; return m;
  };
  for(const x of [-0.78,0.78]) for(const z of [-0.50,0.50]) add('tray-foot',box(0.12,0.025,0.12),ink,x,0.0125,z);
  add('tray-clear-base',box(1.90,0.03,1.35),clear,0,0.04,0);
  for(const z of [-0.66,0.66]) add('tray-clear-rim',box(1.90,0.10,0.03),clear,0,0.10,z);
  for(const x of [-0.935,0.935]) add('tray-clear-rim',box(0.03,0.10,1.29),clear,x,0.10,0);
  add('drain-recess',box(1.78,0.025,1.23),ink,0,0.0675,0);
  // Broad slats leave real slots above the recessed insert.
  for(let i=0;i<6;i++) add('drain-slat',box(0.25,0.04,1.19),ink,-0.7375+i*0.295,0.10,0);
  const pot=new THREE.Group(); pot.name='tea-pot'; pot.position.set(-0.12,0.12,-0.25); group.add(pot);
  const wall=[[0.24,0],[0.31,0.04],[0.34,0.12],[0.34,0.43],[0.30,0.51],[0.27,0.51],[0.31,0.43],[0.31,0.12],[0.28,0.06],[0.24,0.03]];
  add('pot-clear-front',lathe(wall,-Math.PI/2,Math.PI),clear,0,0,0,pot);
  add('pot-frost-rear',lathe(wall,Math.PI/2,Math.PI),frost,0,0,0,pot);
  add('pot-ink-core',new THREE.CylinderGeometry(0.245,0.24,0.08,40),ink,0,0.07,0,pot);
  add('pot-filter-basket',lathe([[0.18,0.10],[0.24,0.14],[0.25,0.43],[0.225,0.43],[0.215,0.16],[0.18,0.13]]),cream,0,0,0,pot);
  ring('pot-clear-rim',0.285,0.016,clear,0,0.51,0,pot);
  add('lid-gasket',new THREE.CylinderGeometry(0.284,0.284,0.018,40),ink,0,0.524,0,pot);
  add('stepped-lid',new THREE.CylinderGeometry(0.27,0.305,0.035,40),cream,0,0.55,0,pot);
  add('lid-lift-tab',box(0.14,0.055,0.07),jade,0,0.5925,0,pot);
  const handle=new THREE.CatmullRomCurve3([[-0.31,0.42],[-0.52,0.43],[-0.60,0.32],[-0.57,0.15],[-0.31,0.12]].map(([x,y])=>new THREE.Vector3(x,y,0)));
  add('pot-open-handle',new THREE.TubeGeometry(handle,32,0.032,10,false),clear,0,0,0,pot);
  for(const y of [0.12,0.42]) add('handle-collar',box(0.09,0.07,0.09),cream,-0.32,y,0,pot);
  const spout=new THREE.Group(); spout.position.set(0.28,0.28,0); spout.rotation.z=-0.95; pot.add(spout);
  add('pot-open-spout',lathe([[0.075,0],[0.055,0.24],[0.03,0.24],[0.05,0]]),clear,0,0,0,spout);
  ring('spout-lip',0.043,0.012,clear,0,0.24,0,spout);
  for(const x of [-0.43,0.43]){
    add('cup-foot',new THREE.CylinderGeometry(0.12,0.13,0.03,32),ink,x,0.135,0.40);
    add('cup-clear-wall',lathe([[0.13,0],[0.21,0.10],[0.235,0.22],[0.21,0.22],[0.185,0.11],[0.12,0.025]]),clear,x,0.15,0.40);
    add('cup-cream-bowl',lathe([[0,0.035],[0.11,0.035],[0.17,0.10],[0.195,0.19],[0.175,0.19],[0.15,0.115],[0.10,0.06],[0,0.06]]),cream,x,0.15,0.40);
    ring('cup-thick-rim',0.222,0.014,clear,x,0.37,0.40);
  }
  window.__cockpitTeaSet={set({x,y,z,ry,s}={}){
    if(typeof x==='number')group.position.x=x;
    if(typeof y==='number')group.position.y=y;
    if(typeof z==='number')group.position.z=z;
    if(typeof ry==='number')group.rotation.y=ry;
    if(typeof s==='number')group.scale.setScalar(s);
  }};
  group.dispose=()=>{window.__cockpitTeaSet=null;};
  return group;
}
