// @ts-nocheck
// Browser-only project artwork (§A.4.1 catalog/texture split). The
// serializable catalog lives in lib/projects/catalog.ts and is server-safe;
// this module owns everything that needs three.js or a canvas. The
// `client-only` import is the build-time boundary: a server component that
// imports this file fails the build instead of dragging three.js into the
// server graph.
import "client-only"
import * as THREE from "three"
import { SLEEVES as PROJECTS } from "@/lib/projects/catalog"

// Pressed-vinyl disc face: near-black grooves + accent-colored center label.
// Used by the crate's sleeved discs AND the deck's platter record.
export function makeDiscTexture(i){
  const { accent, category } = PROJECTS[i];
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#12100F';
  ctx.beginPath(); ctx.arc(S/2, S/2, S/2-2, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let r = 44; r < S/2 - 6; r += 3){
    ctx.beginPath(); ctx.arc(S/2, S/2, r, 0, Math.PI*2); ctx.stroke();
  }
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.arc(S/2, S/2, 44, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#1E1C1A';
  ctx.beginPath(); ctx.arc(S/2, S/2, 5, 0, Math.PI*2); ctx.fill();
  ctx.font = '600 10px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(category.toUpperCase(), S/2, S/2 - 24);
  ctx.fillText(`№ ${String(i+1).padStart(2,'0')}`, S/2, S/2 + 30);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  return tex;
}
