// Voxel color palette (dusk-lit Minecraft-ish tones).
import * as THREE from 'three';

export const PALETTE = {
  grass: new THREE.Color('#5da244'),
  grassDry: new THREE.Color('#7a9c4e'),
  dirt: new THREE.Color('#7a5230'),
  rock: new THREE.Color('#7d7f88'),
  rockDark: new THREE.Color('#5d5f68'),
  snow: new THREE.Color('#f4f7fb'),
  sand: new THREE.Color('#cfc08a'),
  water: new THREE.Color('#3e8fd4'),
  foam: new THREE.Color('#dff2ff'),
  trunk: new THREE.Color('#6b4a2b'),
  leaf: new THREE.Color('#3e7d33'),
  leafDark: new THREE.Color('#2f6428'),
};

// Small deterministic jitter so voxel fields do not look flat.
export function jitterColor(base, rng, amount = 0.06) {
  const c = base.clone();
  const j = 1 + (rng() * 2 - 1) * amount;
  c.r = Math.min(1, c.r * j);
  c.g = Math.min(1, c.g * j);
  c.b = Math.min(1, c.b * j);
  return c;
}
