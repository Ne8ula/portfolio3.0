// @ts-nocheck
// Shared project catalog + record-disc texture. Split out of vinyl-crate.ts
// so the turntable ("deck") can play the same records the crate archives:
// the crate imports PROJECTS to build sleeves, the deck imports both to
// build the platter disc + the holographic PROJECT INFO card.
import * as THREE from "three"

// Placeholder project records — restructure-ready: title / category / date
// drive the hover card and the cover art. Palette: [bg, accent, text].
export const PROJECTS = [
  { title: 'MIDNIGHT\nSIGNALS',  category: 'design',     date: '2025.11', bg:'#E8E4DC', accent:'#4B6E4F', text:'#1E1C1A' },
  { title: 'LONG\nSHADOW',       category: 'web',        date: '2025.08', bg:'#3A3644', accent:'#E8E4DC', text:'#E8E4DC' },
  { title: 'JADE\nHOUR',         category: 'design',     date: '2025.06', bg:'#4B6E4F', accent:'#F0EBE1', text:'#F0EBE1' },
  { title: 'ANALOGUE\nDREAMS',   category: 'prototype',  date: '2025.04', bg:'#D8D3C7', accent:'#3A3644', text:'#1E1C1A' },
  { title: 'COLD\nLINE FM',      category: 'web',        date: '2025.02', bg:'#1E1C1A', accent:'#7FA683', text:'#E8E4DC' },
  { title: 'RED\nHEM',           category: 'design',     date: '2024.12', bg:'#F0EBE1', accent:'#B24240', text:'#1E1C1A' },
  { title: 'ROOM 21',            category: 'game',       date: '2024.10', bg:'#6E6878', accent:'#E8E4DC', text:'#E8E4DC' },
  { title: 'FIELD\nNOTES v.II',  category: 'prototype',  date: '2024.08', bg:'#3A5A3E', accent:'#D8D3C7', text:'#F0EBE1' },
  { title: 'STATIC\nGARDEN',     category: 'game',       date: '2024.06', bg:'#A8A2B0', accent:'#1E1C1A', text:'#1E1C1A' },
  { title: 'NORTH\n&  SOUTH',    category: 'design',     date: '2024.04', bg:'#E8E4DC', accent:'#6E6878', text:'#1E1C1A' },
  { title: 'LOW\nTIDE',          category: 'web',        date: '2024.02', bg:'#2B4A30', accent:'#CFC9C0', text:'#E8E4DC' },
  { title: 'FOLIO',              category: 'design',     date: '2023.11', bg:'#CFC9C0', accent:'#3A5A3E', text:'#1E1C1A' },
  { title: 'AMBER\nPROTOCOL',    category: 'game',       date: '2023.09', bg:'#1E1C1A', accent:'#D8A24B', text:'#D8A24B' },
  { title: 'GREEN\nROOM',        category: 'prototype',  date: '2023.06', bg:'#7FA683', accent:'#1E1C1A', text:'#1E1C1A' },
  { title: 'UNTITLED\nSIDES',    category: 'experiment', date: '2023.03', bg:'#E8E4DC', accent:'#1E1C1A', text:'#1E1C1A' },
];

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
