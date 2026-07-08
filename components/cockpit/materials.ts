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
export function makeHeroGlass({ thickness = 0.7, roughness = 0.18, aberration = 0.02 } = {}){
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
    chromaticAberration: aberration,
    anisotropicBlur:     0.05,
    attenuationColor:    new THREE.Color(0xEDEAE2),
    attenuationDistance: 2.8,
  });
  Object.assign(m, {
    color:              new THREE.Color(0xF4F1EA),
    metalness:          0.02,
    ior:                1.45,
    clearcoat:          0.6,
    clearcoatRoughness: 0.25,
    iridescence:        0.35,
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
