// @ts-nocheck
// Shared material recipes for the cockpit desk objects, so the PC, crate,
// turntable and keyboard all speak the same "artifact under glass" language:
//   • hero glass — clear refractive enclosure (PC head, turntable dust cover)
//   • frost      — translucent acrylic panels (crate walls, keycaps)
// Both ride three's built-in transmission buffer (transmissionSampler /
// MeshPhysicalMaterial.transmission), so no render-loop changes are needed.
import * as THREE from "three"
import { MeshTransmissionMaterial } from "@pmndrs/vanilla"

export const PALETTE = {
  cream:   0xF2EEE6,
  ink:     0x26231F,
  inkSoft: 0x3A3733,
  line:    0xF0EBE1,   // cream edge wireframes on glass
  lineInk: 0x55514B,   // dark edge wireframes on solids
  jade:    0x4B6E4F,
  jadeLt:  0x7A9A7E,
  trim:    0xB9B5AE,
}

// Clear refractive glass. depthWrite stays off so edge lines, wires and glow
// sprites INSIDE the enclosure remain visible (they draw after the
// transmissive pass and must not be depth-culled by the shell).
export function makeHeroGlass({ thickness = 0.7, roughness = 0.36 } = {}){
  // anisotropicBlur stays LOW: its randomized sampling reads as sparkly
  // grain that shimmers ("flashes") whenever content moves behind the
  // glass (e.g. the spinning platter). Roughness blur is mip-based and
  // smooth — prefer it for the frosted look.
  const m = new MeshTransmissionMaterial({
    transmissionSampler: true,
    samples:             6,
    transmission:        1,
    thickness,
    roughness,
    chromaticAberration: 0,
    anisotropicBlur:     0,
    attenuationColor:    new THREE.Color(0xEDEAE2),
    attenuationDistance: 2.8,
  });
  Object.assign(m, {
    color:              new THREE.Color(0xF4F1EA),
    metalness:          0.02,
    ior:                1.45,
    clearcoat:          0.6,
    clearcoatRoughness: 0.25,
    iridescence:        0,
    iridescenceIOR:     1.3,
    depthWrite:         false,
    side:               THREE.DoubleSide,
    envMapIntensity:    1.0,
  });
  return m;
}

// Frosted translucent acrylic — blurs whatever sits behind it.
export function makeFrost({ color = PALETTE.cream, transmission = 0.75, roughness = 0.4, thickness = 0.05 } = {}){
  return new THREE.MeshPhysicalMaterial({
    color, transmission, roughness, thickness,
    ior: 1.4, metalness: 0, envMapIntensity: 0.8,
  });
}

// Explicit manufactured-detail opt-in, never a scene color scan. The clone
// keeps a shared jade core/liquid/label material out of the emission treatment.
// Pixel rectangles mask only authored marks on mixed text/art decal textures.
export function makeAccentMaterial(source, { intensity = 1.4, color = PALETTE.jadeLt, rectangles = null }: {
  intensity?: number; color?: THREE.ColorRepresentation;
  rectangles?: readonly (readonly [number, number, number, number])[] | null;
} = {}){
  if (!source) return source; // optional decoration/asset placeholders have no material
  const material = source.emissive ? source.clone() : new THREE.MeshStandardMaterial({
    color: source.color, map: source.map, alphaMap: source.alphaMap,
    transparent: source.transparent, opacity: source.opacity,
    depthTest: source.depthTest, depthWrite: source.depthWrite,
    side: source.side, roughness: 0.6, metalness: 0,
  });
  material.emissive.set(color);
  material.emissiveIntensity = intensity;
  material.userData.decorativeEmission = intensity;
  if (rectangles) {
    const { width, height } = source.map.image;
    const pixels = new Uint8Array(width * height * 4);
    for (const [x, y, w, h] of rectangles) {
      for (let row = Math.max(0, Math.floor(y)); row < Math.min(height, Math.ceil(y + h)); row++) {
        for (let col = Math.max(0, Math.floor(x)); col < Math.min(width, Math.ceil(x + w)); col++) {
          pixels.fill(255, (row * width + col) * 4, (row * width + col) * 4 + 4);
        }
      }
    }
    const mask = new THREE.DataTexture(pixels, width, height);
    mask.flipY = source.map.flipY;
    mask.needsUpdate = true;
    material.emissiveMap = mask;
  }
  return material;
}

// Called at cold load and by the existing authoritative preference observer.
// Only explicitly opted-in emission, clear surfaces and atmosphere are affected.
export function applyDecorativePreferences(root, simplified){
  const visited = new Set();
  root.traverse(object => {
    if (object.userData.decorativeAtmosphere) object.visible = !simplified;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!material || visited.has(material)) continue;
      visited.add(material);
      if (typeof material.userData.decorativeEmission === 'number') {
        material.emissiveIntensity = simplified ? 0 : material.userData.decorativeEmission;
      }
      const clear = material.userData.lampClear ?? material.userData.decorativeClear;
      if (clear) {
        if (clear.opacity !== undefined) {
          const transparent = simplified ? false : clear.transparent;
          if (material.transparent !== transparent) material.needsUpdate = true;
          material.transparent = transparent;
          material.opacity = simplified ? 1 : clear.opacity;
        }
        const transmission = simplified ? 0 : clear.transmission;
        if (material.transmission !== transmission) {
          material.transmission = transmission;
          material.depthWrite = simplified ? true : clear.depthWrite;
          material.needsUpdate = true;
        }
      }
    }
  });
}
