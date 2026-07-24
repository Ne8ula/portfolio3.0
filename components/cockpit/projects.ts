// @ts-nocheck
// Shared project catalog + record-disc texture. Split out of vinyl-crate.ts
// so the turntable ("deck") can play the same records the crate archives:
// the crate imports PROJECTS to build sleeves, the deck imports both to
// build the platter disc + the holographic PROJECT INFO card.
import * as THREE from "three"

// Real project records (from alexxiong.me). Fields:
//   title      — sleeve art line-break form; card shows it single-line
//   category   — genre voice for disc label + card meta row
//   date       — year (or WIP) for meta/YEAR rows
//   tagline    — one-sentence description on the card (wrapped to 2 lines)
//   role/tools — card rows
//   url        — project page (future click-through; VIEW MORE is a stub)
//   cover      — /vinyl-covers/ thumbnail for sleeve + card artwork (null
//                = generated motif cover)
//   bg/accent/text — palette for disc label, top-edge strip and fallback art
export const PROJECTS = [
  { title: 'THE SONG\nOF MAKA', category: 'puzzle adventure', date: '2024',
    tagline: 'A fallen king retakes his bird kingdom from a deadly disease.',
    role: 'Creative Producer · Design Lead', tools: 'Unity · Figma · Adobe',
    url: 'https://www.alexxiong.me/games/thesongofmaka',
    cover: '/vinyl-covers/song-of-maka.png',
    bg:'#E8E4DC', accent:'#4B6E4F', text:'#1E1C1A' },
  { title: 'CHU YU\nHONG', category: 'horror point & click', date: '2022',
    tagline: 'A narrative horror adventure steeped in traditional Chinese folklore.',
    role: 'Creative Director · Producer', tools: 'Photoshop · Figma · Procreate',
    url: 'https://www.alexxiong.me/games/chuyuhong',
    cover: '/vinyl-covers/chu-yu-hong.png',
    bg:'#1E1C1A', accent:'#7FA683', text:'#E8E4DC' },
  { title: 'TENCENT\nGAMES', category: 'event · ux design', date: '2022',
    tagline: 'Live-ops event design across Wild Rift, Lost Ark and Contra Returns.',
    role: 'Game Operations Intern', tools: 'UE5 Blueprint · WeChat H5',
    url: 'https://www.alexxiong.me/design/tencentgames',
    cover: null,
    bg:'#3A3644', accent:'#E8E4DC', text:'#E8E4DC' },
  { title: 'NYU\nWELCOME', category: 'branding', date: '2022',
    tagline: 'Campus-wide graphics campaign for NYU’s 2022 welcome season.',
    role: 'Digital Strategy Assistant', tools: 'Animate · Photoshop',
    url: 'https://www.alexxiong.me/design/nyuwelcome',
    cover: '/vinyl-covers/nyu-welcome.png',
    bg:'#6E6878', accent:'#E8E4DC', text:'#E8E4DC' },
  { title: 'SHANGHAI\nNOIR', category: 'voice game', date: 'WIP',
    tagline: 'A Clue-inspired murder mystery played entirely on Amazon Echo.',
    role: 'Narrative · Design · Code', tools: 'Alexa ADS · Twine · JS',
    url: 'https://www.alexxiong.me/wip/shanghainoir',
    cover: '/vinyl-covers/shanghai-noir.png',
    bg:'#2B4A30', accent:'#CFC9C0', text:'#E8E4DC' },
  { title: 'PROCGEN\nDUNGEON', category: 'tech demo', date: '2024',
    tagline: 'Instant in-engine procedural dungeon generation in Unreal 5.3.',
    role: 'Systems · Shaders', tools: 'UE 5.3 · Blueprints · Quixel',
    url: 'https://www.alexxiong.me/wip/procgendungeon',
    cover: '/vinyl-covers/procgen-dungeon.png',
    bg:'#D8D3C7', accent:'#3A5A3E', text:'#1E1C1A' },
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
