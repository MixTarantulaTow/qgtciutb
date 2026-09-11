// Terrain instancing: surface voxel per column + fill down the cliff faces,
// then voxel trees on flat grassy ground.
import * as THREE from 'three';
import { SIZE, HALF, SNOW_LINE, WATER_Y } from './world.js';
import { PALETTE, jitterColor } from './palette.js';
import { fbm2 } from './noise.js';

const at = (x, z) => x + ',' + z;

export function buildTerrainVoxels(world) {
  const { heights, carved, pool, noise, rng, H } = world;
  const voxels = [];
  const surfaceType = new Array(SIZE * SIZE); // 'grass' | 'rock' | 'snow' | 'sand' | 'water'
  const id = (x, z) => (z + HALF) * SIZE + (x + HALF);

  for (let z = -HALF; z < HALF; z++) {
    for (let x = -HALF; x < HALF; x++) {
      const h = heights[id(x, z)];
      if (h <= 0) continue;
      const key = at(x, z);

      // lowest neighbor top -> how far down the side face must reach
      let minN = h;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = H(x + dx, z + dz);
        if (n < minN) minN = n;
      }
      const steep = h - minN >= 4;
      // render the top voxel plus just enough below it to cover exposed side
      // faces (down to the lowest neighbor's top), capped to bound worst case
      const fillTo = Math.max(Math.min(h, minN + 1), h - 12, 0);

      // choose surface color
      let type;
      if (carved.has(key)) type = 'water';
      else if (h <= WATER_Y + 2) type = 'sand';
      else if (h >= SNOW_LINE) type = 'snow';
      else if (steep) type = 'rock';
      else type = 'grass';
      surfaceType[id(x, z)] = type;

      const dryNoise = fbm2(noise, x * 0.11 + 50, z * 0.11 - 30, 2);
      for (let y = h; y >= fillTo; y--) {
        let base;
        if (y === h) {
          if (type === 'water') base = PALETTE.rockDark;
          else if (type === 'snow') base = PALETTE.snow;
          else if (type === 'rock') base = PALETTE.rock;
          else if (type === 'sand') base = PALETTE.sand;
          else base = dryNoise > 0.62 ? PALETTE.grassDry : PALETTE.grass;
        } else if (y >= h - 2) {
          base = type === 'grass' ? PALETTE.dirt : type === 'sand' ? PALETTE.sand : PALETTE.rockDark;
        } else {
          base = PALETTE.rockDark;
        }
        voxels.push({ x, y, z, color: jitterColor(base, rng, 0.05) });
      }
    }
  }

  // ----- voxel trees on flat grass away from the water channel
  const treeSpots = [];
  const taken = new Set();
  let attempts = 0;
  while (treeSpots.length < 48 && attempts < 4000) {
    attempts++;
    const x = Math.floor(rng() * SIZE) - HALF;
    const z = Math.floor(rng() * SIZE) - HALF;
    const i = id(x, z);
    if (surfaceType[i] !== 'grass') continue;
    if (carved.has(at(x, z)) || carved.has(at(x + 1, z)) || carved.has(at(x - 1, z)) ||
        carved.has(at(x, z + 1)) || carved.has(at(x, z - 1))) continue;
    const h = heights[i];
    if (h < 3 || h > 22) continue;
    // spacing check
    let ok = true;
    for (const t of treeSpots) {
      if (Math.abs(t.x - x) <= 4 && Math.abs(t.z - z) <= 4) { ok = false; break; }
    }
    if (!ok || taken.has(at(x, z))) continue;
    taken.add(at(x, z));
    treeSpots.push({ x, z, h });
  }

  for (const t of treeSpots) {
    const trunkH = 3 + Math.floor(rng() * 2);
    for (let y = 1; y <= trunkH; y++) {
      voxels.push({ x: t.x, y: t.h + y, z: t.z, color: jitterColor(PALETTE.trunk, rng, 0.08) });
    }
    const cy = t.h + trunkH; // leaf center height
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const leaf = rng() > 0.5 ? PALETTE.leaf : PALETTE.leafDark;
        voxels.push({ x: t.x + dx, y: cy, z: t.z + dz, color: jitterColor(leaf, rng, 0.09) });
        if (!(dx === 0 && dz === 0) && rng() > 0.25) {
          voxels.push({ x: t.x + dx, y: cy + 1, z: t.z + dz, color: jitterColor(leaf, rng, 0.09) });
        }
      }
    }
    voxels.push({ x: t.x, y: cy + 1, z: t.z, color: jitterColor(PALETTE.leaf, rng, 0.09) });
    if (rng() > 0.4) voxels.push({ x: t.x, y: cy + 2, z: t.z, color: jitterColor(PALETTE.leafDark, rng, 0.09) });
  }

  // low bushes
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(rng() * SIZE) - HALF;
    const z = Math.floor(rng() * SIZE) - HALF;
    const ci = id(x, z);
    if (surfaceType[ci] !== 'grass' || carved.has(at(x, z))) continue;
    const h = heights[ci];
    if (h < 3 || h > 24) continue;
    voxels.push({ x, y: h + 1, z, color: jitterColor(rng() > 0.5 ? PALETTE.leaf : PALETTE.leafDark, rng, 0.1) });
  }

  return voxels;
}
