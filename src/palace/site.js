// Site dressing: ground, courtyard paving, perimeter wall, paths,
// 石狮 lions, 华表 columns, lanterns, 香炉 censer, trees and shrubs.
import { jitterColor } from '../palette.js';
import { makeNoise2D, fbm2 } from '../noise.js';
import { P } from './palette.js';
import { buildGate, buildSideHall, buildMainHall, buildTower, buildPagoda } from './buildings.js';

// ---- world layout (x: east+, z: south+) ----
export const LAYOUT = {
  wall: { x0: -66, x1: 66, z0: -92, z1: 74 },
  gate: { x: 0, z: 74 },
  bellTower: { x: -34, z: 48 },
  drumTower: { x: 34, z: 48 },
  sideHallE: { x: 40, z: 4, facing: 'W' },
  sideHallW: { x: -40, z: 4, facing: 'E' },
  mainHall: { x: 0, z: -44 },
  pagoda: { x: 0, z: -80 },
  court: { x0: -34, x1: 34, z0: -62, z1: 70 },
  way: { x0: -4, x1: 4, z0: -30, z1: 88 },
  arms: [
    { x0: -31, x1: 31, z0: 0, z1: 8 }, // to side halls
    { x0: -32, x1: -26, z0: 44, z1: 56 }, // to bell tower
    { x0: 26, x1: 32, z0: 44, z1: 56 }, // to drum tower
    { x0: -14, x1: 14, z0: -70, z1: -60 }, // rear court to pagoda
  ],
};

const inRect = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;

// ---------- ground + paving ----------
function ground(ctx) {
  const n = fbm2.bind(null, makeNoise2D(31));
  const { wall: W, court, way, arms } = LAYOUT;
  for (let x = -84; x <= 84; x++) {
    for (let z = -106; z <= 92; z++) {
      let c;
      if (inRect(way, x, z) || arms.some((r) => inRect(r, x, z))) {
        c = jitterColor(P.path, ctx.rng, 0.06);
      } else if (inRect(court, x, z)) {
        c = jitterColor((Math.floor(x / 3) + Math.floor(z / 3)) % 2 ? P.slab : P.slabAlt, ctx.rng, 0.05);
      } else {
        const t = n(x * 0.05, z * 0.05, 3);
        c = jitterColor(t > 0.6 ? P.grassDry : P.grass, ctx.rng, 0.07);
        if (t < 0.32) c = jitterColor(P.dirt, ctx.rng, 0.08);
      }
      ctx.v(x, -1, z, c);
    }
  }
  // 御道 curbs (skipping the gate platform and main stair footprints)
  for (let z = -24; z <= 67; z++) {
    for (const x of [LAYOUT.way.x0 - 1, LAYOUT.way.x1 + 1]) {
      ctx.v(x, 0, z, jitterColor(P.curb, ctx.rng, 0.05));
    }
  }
}

// ---------- perimeter wall (围墙) with tile cap ----------
function siteWall(ctx) {
  const { x0, x1, z0, z1 } = LAYOUT.wall;
  const gateHalf = 20; // gate platform occupies |x|<20 at the south line
  const segments = [
    { x0, x1: -gateHalf, z: z1 },
    { x0: gateHalf, x1, z: z1 },
    { x0, x1, z: z0 },
  ];
  for (const s of segments) {
    for (let x = s.x0; x <= s.x1; x++) {
      for (let y = 0; y <= 3; y++) ctx.v(x, y, s.z, jitterColor(P.wallRed, ctx.rng, 0.04));
      ctx.v(x, 4, s.z, jitterColor(P.tileGray, ctx.rng, 0.05));
    }
    ctx.box(s.x0, 5, s.z, s.x1, 5, s.z, P.ridgeDark);
  }
  for (const x of [x0, x1]) {
    for (let z = z0 + 1; z <= z1 - 1; z++) {
      for (let y = 0; y <= 3; y++) ctx.v(x, y, z, jitterColor(P.wallRed, ctx.rng, 0.04));
      ctx.v(x, 4, z, jitterColor(P.tileGray, ctx.rng, 0.05));
    }
    ctx.box(x, 5, z0, x, 5, z1, P.ridgeDark);
  }
  // corner caps
  for (const [cx, cz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
    ctx.box(cx - 1, 5, cz - 1, cx + 1, 5, cz + 1, P.tileGray);
    ctx.v(cx, 6, cz, P.ridgeDark);
  }
}

// ---------- trees ----------
function pine(ctx, x, z, h = 4) {
  ctx.box(x, 0, z, x, h - 2, z, P.trunk);
  for (let k = 0; k < 4; k++) {
    const r = 3 - k;
    const y = h - 1 + k;
    ctx.box(x - r, y, z - r, x + r, y, z + r, jitterColor(k % 2 ? P.pineDark : P.pine, ctx.rng, 0.06));
  }
  ctx.v(x, h + 3, z, P.pineDark);
}

function leafy(ctx, x, z) {
  ctx.box(x, 0, z, x, 2, z, P.trunk);
  ctx.box(x - 2, 3, z - 2, x + 2, 4, z + 2, jitterColor(P.leaf, ctx.rng, 0.08));
  ctx.box(x - 1, 5, z - 1, x + 1, 5, z + 1, jitterColor(P.leafDark, ctx.rng, 0.08));
}

function trees(ctx) {
  const n = makeNoise2D(77);
  // cypress rows inside the walls flanking the courtyard
  for (const sx of [-1, 1]) {
    for (const z of [-56, -42, -20, 14, 28, 56, 64]) {
      const x = sx * 56 + (Math.floor(n(sx * 7, z * 3) * 4) - 2);
      pine(ctx, x, z, 4);
    }
  }
  // pair framing the main hall approach
  pine(ctx, -36, -28, 5);
  pine(ctx, 36, -28, 5);
  // scattered trees outside the walls
  for (let i = 0; i < 46; i++) {
    const x = Math.round((n(i * 3.1, 1.7) - 0.5) * 2 * 80);
    const z = Math.round((n(9.3, i * 2.9) - 0.5) * 2 * 98 - 6);
    if (inRect({ x0: -70, x1: 70, z0: -96, z1: 80 }, x, z)) continue;
    if (Math.abs(x) < 8 && z > 60) continue; // keep entry clear
    (n(i, i) > 0.5 ? pine : leafy)(ctx, x, z);
  }
  // shrubs along the 御道
  for (const z of [-18, 6, 30, 42]) {
    ctx.box(-7, 0, z, -6, 1, z + 1, jitterColor(P.leafDark, ctx.rng, 0.08));
    ctx.box(6, 0, z, 7, 1, z + 1, jitterColor(P.leafDark, ctx.rng, 0.08));
  }
}

// ---------- lanterns along the way ----------
function lanterns(ctx) {
  for (const z of [-22, -10, 16, 30, 58]) {
    for (const sx of [-1, 1]) {
      const x = sx * 7;
      ctx.box(x, 0, z, x, 3, z, P.woodDark); // pole
      ctx.g(x, 4, z, P.lantern, 2, 2, 2); // glowing lantern body
      ctx.v(x, 6, z, P.lanternCap); // cap
    }
  }
}

// ---------- 石狮 guardian lions ----------
function lion(ctx, mirror) {
  ctx.box(-1, 0, -1, 1, 0, 1, P.stoneDark); // pedestal
  ctx.box(-1, 1, -1, 1, 1, 0, P.stone); // haunches (sitting)
  ctx.box(-1, 2, -1, 1, 2, 0, P.stone);
  ctx.box(-1, 3, -1, 1, 4, 0, P.stone); // mane/head mass
  const s = mirror ? -1 : 1;
  ctx.box(0, 3, 1, s * 1, 3, 1, P.stone); // snout
  ctx.v(0, 4, 1, P.stoneDark); // brow
  ctx.v(s * -1, 1, 1, P.stone); // front paw
  ctx.v(s * 1, 1, 1, P.stone);
}

// ---------- 华表 ornamental columns ----------
function huabiao(ctx, x, z) {
  ctx.box(x - 1, 0, z - 1, x + 1, 0, z + 1, P.stoneDark);
  ctx.box(x, 1, z, x, 9, z, P.stone);
  ctx.box(x - 1, 7, z, x + 1, 7, z, P.stone); // cloud bar
  ctx.v(x, 10, z, P.stoneDark);
  ctx.v(x, 11, z, P.gold);
}

// ---------- 香炉 bronze censer ----------
function censer(ctx, x, z) {
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) ctx.v(x + dx, 0, z + dz, P.bronze);
  ctx.box(x - 1, 1, z - 1, x + 1, 2, z + 1, P.bronze);
  ctx.box(x - 1, 3, z - 1, x + 1, 3, z + 1, P.bronze);
  ctx.v(x - 1, 4, z, P.bronze); // ears
  ctx.v(x + 1, 4, z, P.bronze);
}

// ---------- build everything ----------
export function buildSite(ctx) {
  ground(ctx);
  siteWall(ctx);
  trees(ctx);
  lanterns(ctx);

  // gate guards
  lion(ctx.at(-8, 0, 84), false);
  lion(ctx.at(8, 0, 84), true);
  huabiao(ctx, -15, 84);
  huabiao(ctx, 15, 84);
  censer(ctx, 0, -34);

  // buildings
  buildGate(ctx.at(LAYOUT.gate.x, 0, LAYOUT.gate.z));
  buildTower(ctx.at(LAYOUT.bellTower.x, 0, LAYOUT.bellTower.z), 'bell');
  buildTower(ctx.at(LAYOUT.drumTower.x, 0, LAYOUT.drumTower.z), 'drum');
  buildSideHall(ctx.at(LAYOUT.sideHallE.x, 0, LAYOUT.sideHallE.z, LAYOUT.sideHallE.facing));
  buildSideHall(ctx.at(LAYOUT.sideHallW.x, 0, LAYOUT.sideHallW.z, LAYOUT.sideHallW.facing));
  buildMainHall(ctx.at(LAYOUT.mainHall.x, 0, LAYOUT.mainHall.z));
  buildPagoda(ctx.at(LAYOUT.pagoda.x, 0, LAYOUT.pagoda.z));
}
