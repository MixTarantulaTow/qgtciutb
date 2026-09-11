// World generation: voxel heightmap (mountain range), waterfall path carving,
// plunge pools and streams. All heights are integer voxel levels.
import { makeNoise2D, fbm2, makeRng } from './noise.js';

export const SIZE = 112;           // grid is SIZE x SIZE columns
export const HALF = SIZE / 2;
export const WATER_Y = 0;          // surrounding water level
export const SNOW_LINE = 34;
export const CLOUD_Y = 26;         // band center for the cloud ring

const PEAKS = [
  { x: 0, z: -8, h: 46, sx: 15, sz: 16 },   // main summit
  { x: -24, z: 15, h: 34, sx: 11, sz: 12 },
  { x: 26, z: 11, h: 30, sx: 10, sz: 11 },
  { x: -14, z: -31, h: 26, sx: 10, sz: 11 },
  { x: 30, z: -23, h: 20, sx: 8, sz: 9 },
];

// waterfall sources: [peak index, downhill heading {x,z}]
const FALL_SOURCES = [
  { peak: 0, dir: { x: Math.SQRT1_2, z: Math.SQRT1_2 } },  // main fall, faces camera
  { peak: 1, dir: { x: -0.6, z: 0.8 } },                   // side fall on peak 2
];

const idx = (x, z) => (z + HALF) * SIZE + (x + HALF);
const inGrid = (x, z) => x >= -HALF && x < HALF && z >= -HALF && z < HALF;

function smoothstep(a, b, t) {
  const k = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return k * k * (3 - 2 * k);
}

export function buildWorld(seed = 20260701) {
  const rng = makeRng(seed);
  const noise = makeNoise2D(seed);
  const noise2 = makeNoise2D(seed ^ 0x9e3779b9);

  const heights = new Int16Array(SIZE * SIZE);

  for (let gz = -HALF; gz < HALF; gz++) {
    for (let gx = -HALF; gx < HALF; gx++) {
      // irregular coastline: perturb the island radius with low-freq noise
      const r = Math.sqrt(gx * gx + gz * gz)
        + (fbm2(noise2, gx * 0.035 + 90, gz * 0.035 - 40, 2) - 0.5) * 22;
      const mask = smoothstep(HALF, HALF * 0.55, r);
      if (mask <= 0) { heights[idx(gx, gz)] = 0; continue; }

      let h = 0;
      for (const p of PEAKS) {
        const dx = gx - p.x;
        const dz = gz - p.z;
        h += p.h * Math.exp(-((dx * dx) / (2 * p.sx * p.sx) + (dz * dz) / (2 * p.sz * p.sz)));
      }
      h += fbm2(noise, gx * 0.05, gz * 0.05, 4) * 7.5;            // rolling hills
      h += fbm2(noise2, gx * 0.16, gz * 0.16, 3) * 3.2 * mask;    // rocky detail
      heights[idx(gx, gz)] = Math.max(0, Math.round(h * mask));
    }
  }

  const H = (x, z) => (inGrid(x, z) ? heights[idx(x, z)] : 0);
  const carved = new Set();   // all water-channel cells (channel + pool + stream)
  const paths = [];           // each waterfall path as a list of cells
  const pools = new Set();
  const streams = new Set();

  // steepest-descent walk downhill, biased to keep its initial heading
  function tracePath(lip, dirx, dirz) {
    const path = [];
    let cur = { ...lip };
    let px = dirx, pz = dirz;
    const visited = new Set();
    for (let i = 0; i < 500; i++) {
      path.push({ x: cur.x, z: cur.z, y: H(cur.x, cur.z) });
      if (H(cur.x, cur.z) <= 3) break;
      visited.add(cur.x + ',' + cur.z);
      let best = null;
      let bestScore = Infinity;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (!dx && !dz) continue;
          const nx = cur.x + dx;
          const nz = cur.z + dz;
          const key = nx + ',' + nz;
          if (!inGrid(nx, nz) || visited.has(key)) continue;
          const turn = -(dx * px + dz * pz);
          const score = H(nx, nz) + turn * 0.6 + ((Math.abs(dx) + Math.abs(dz) === 2) ? 0.15 : 0);
          if (score < bestScore) { bestScore = score; best = { x: nx, z: nz, dx, dz }; }
        }
      }
      if (!best) break;
      cur = { x: best.x, z: best.z };
      px = best.dx; pz = best.dz;
    }
    return path;
  }

  for (const src of FALL_SOURCES) {
    const pk = PEAKS[src.peak];
    const pkH = H(pk.x, pk.z);
    // walk from the summit outward along the heading until we drop ~28%
    let lip = { x: pk.x, z: pk.z };
    for (let d = 1; d < 30; d++) {
      const cx = Math.round(pk.x + src.dir.x * d);
      const cz = Math.round(pk.z + src.dir.z * d);
      lip = { x: cx, z: cz };
      if (H(cx, cz) <= pkH * 0.72) break;
    }

    const path = tracePath(lip, src.dir.x, src.dir.z);
    paths.push(path);

    // carve the channel one voxel deep
    for (const c of path) {
      carved.add(c.x + ',' + c.z);
      heights[idx(c.x, c.z)] = Math.max(0, H(c.x, c.z) - 1);
    }

    // plunge pool at the base of the fall
    const base = path[path.length - 1];
    if (!base) continue;
    const poolR = 3;
    for (let dx = -poolR; dx <= poolR; dx++) {
      for (let dz = -poolR; dz <= poolR; dz++) {
        if (dx * dx + dz * dz > poolR * poolR + 1) continue;
        const x = base.x + dx;
        const z = base.z + dz;
        if (!inGrid(x, z)) continue;
        const key = x + ',' + z;
        pools.add(key);
        carved.add(key);
        heights[idx(x, z)] = Math.max(0, H(x, z) - 2);
      }
    }

    // stream wandering from the pool down to the coast
    let cx = base.x;
    let cz = base.z;
    let dxs = src.dir.x, dzs = src.dir.z;
    const seen = new Set();
    for (let i = 0; i < 220; i++) {
      let best = null;
      let bestScore = Infinity;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (!dx && !dz) continue;
          const nx = cx + dx;
          const nz = cz + dz;
          const key = nx + ',' + nz;
          if (!inGrid(nx, nz) || seen.has(key) || pools.has(key) || streams.has(key)) continue;
          const turn = -(dx * dxs + dz * dzs);
          const jitter = rng() * 0.4;
          const score = H(nx, nz) + turn * 0.5 + jitter;
          if (score < bestScore) { bestScore = score; best = { x: nx, z: nz, dx, dz }; }
        }
      }
      if (!best) break;
      cx = best.x; cz = best.z; dxs = best.dx; dzs = best.dz;
      const key = cx + ',' + cz;
      seen.add(key);
      streams.add(key);
      carved.add(key);
      heights[idx(cx, cz)] = Math.max(0, H(cx, cz) - 1);
      if (H(cx, cz) <= 1) break;
    }
  }

  return {
    heights, paths, path: paths[0] || [], pool: pools, pools, stream: streams, streams, carved,
    rng, noise,
    summitH: PEAKS[0].h,
    H,
  };
}
