// @ts-nocheck
// Micrographic decal helpers shared by the desk objects (crate, turntable).
// Two flavors:
//   • makeDecal      — rasterizes an SVG sheet from /public/micrographics,
//                      flat-tinted one color (silkscreen sticker look).
//   • makeTextDecal  — draws a bespoke canvas cluster (for marks that don't
//                      exist in the sticker pack: control scales, catalog
//                      text, calibration glyphs). Same material recipe.
// Both return a plane mesh floated by the caller a few mm off the surface
// (never coplanar — z-fights flash under the moving cockpit camera).
import * as THREE from "three"

const DECAL_DIR = '/micrographics/';

function decalMaterial(tex, opacity){
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({
    map: tex, transparent: true, opacity,
    depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
}

// Fetches an SVG sheet, swaps its embedded Roboto Mono for a system mono
// stack (SVG-in-<img> can't load webfonts), rasterizes it at 4× and
// flat-tints every mark one color via source-in compositing. The plane
// starts 1×1 and is scaled to the requested world width once the sheet's
// aspect ratio is known.
export function makeDecal(file, { width = 0.5, tint = '#6F8D75', opacity = 0.9 } = {}){
  const tex = new THREE.Texture();
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), decalMaterial(tex, opacity));
  mesh.visible = false;   // until the sheet arrives
  fetch(encodeURI(DECAL_DIR + file))
    .then(r => r.ok ? r.text() : Promise.reject(r.status))
    .then(svg => {
      const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
      const w = vb ? parseFloat(vb[1]) : 200, h = vb ? parseFloat(vb[2]) : 100;
      svg = svg
        .replace(/RobotoMono-\w+/g, 'Consolas')
        .replace(/'Roboto Mono'/g, "'Courier New', monospace")
        .replace('<svg ', `<svg width="${w}" height="${h}" `);
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      const img = new Image();
      img.onload = () => {
        const SCALE = 4;
        const c = document.createElement('canvas');
        c.width = Math.round(w * SCALE); c.height = Math.round(h * SCALE);
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, c.width, c.height);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = tint;
        ctx.fillRect(0, 0, c.width, c.height);
        tex.image = c;
        tex.needsUpdate = true;
        mesh.scale.set(width, width * (h / w), 1);
        mesh.visible = true;
        URL.revokeObjectURL(url);
      };
      img.onerror = () => URL.revokeObjectURL(url);
      img.src = url;
    })
    .catch(() => {});   // decals are cosmetic — a miss just leaves clean surface
  return mesh;
}

// Bespoke canvas cluster. draw(ctx, pxW, pxH) paints onto a transparent
// canvas; the plane is sized width × (width·pxH/pxW) world units.
export function makeTextDecal(draw, { width = 0.4, pxW = 512, pxH = 256, opacity = 0.95 } = {}){
  const c = document.createElement('canvas');
  c.width = pxW; c.height = pxH;
  const ctx = c.getContext('2d');
  draw(ctx, pxW, pxH);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, width * (pxH / pxW)),
    decalMaterial(new THREE.CanvasTexture(c), opacity)
  );
  return mesh;
}
