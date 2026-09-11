// Transform-aware voxel emission context.
// Buildings are authored in local space facing local +z (south, 'S');
// `facing` rotates them: 'E'/'W'/'N' are 90° turns about Y so fronts point
// +x / -x / -z in world space.
import { VoxelBuilder } from '../voxel.js';
import { makeRng } from '../noise.js';

const ROT = {
  S: (x, z) => [x, z],
  E: (x, z) => [z, -x],
  N: (x, z) => [-x, -z],
  W: (x, z) => [-z, x],
};
const SWAP = { S: false, N: false, E: true, W: true };
const COMPOSE = {
  S: (c) => c,
  E: { S: 'E', E: 'N', N: 'W', W: 'S' },
  N: { S: 'N', E: 'W', N: 'S', W: 'E' },
  W: { S: 'W', E: 'S', N: 'E', W: 'N' },
};

// Shared buckets for one scene: `solid` renders lit, `glow` renders unlit.
export class Bag {
  constructor(seed = 20260911) {
    this.solid = new VoxelBuilder();
    this.glow = new VoxelBuilder();
    this.rng = makeRng(seed);
  }
}

export class Ctx {
  constructor(bag, ox = 0, oy = 0, oz = 0, facing = 'S') {
    this.bag = bag;
    this.ox = ox;
    this.oy = oy;
    this.oz = oz;
    this.facing = facing;
  }
  get rng() {
    return this.bag.rng;
  }
  // Child ctx: (x,y,z) is an offset in THIS ctx's local space.
  at(x, y, z, facing = 'S') {
    const [wx, wz] = ROT[this.facing](x, z);
    return new Ctx(
      this.bag,
      this.ox + wx,
      this.oy + y,
      this.oz + wz,
      COMPOSE[this.facing][facing],
    );
  }
  // Single (optionally stretched) voxel. y is the cube's bottom level.
  v(x, y, z, color, sx = 1, sy = 1, sz = 1) {
    const [wx, wz] = ROT[this.facing](x, z);
    const sw = SWAP[this.facing];
    this.bag.solid.add(this.ox + wx, this.oy + y + 0.5, this.oz + wz, color, sw ? sz : sx, sy, sw ? sx : sz);
  }
  // Emissive voxel (lanterns, candles).
  g(x, y, z, color, sx = 1, sy = 1, sz = 1) {
    const [wx, wz] = ROT[this.facing](x, z);
    const sw = SWAP[this.facing];
    this.bag.glow.add(this.ox + wx, this.oy + y + 0.5, this.oz + wz, color, sw ? sz : sx, sy, sw ? sx : sz);
  }
  // Filled box covering local x0..x1, y0..y1, z0..z1 inclusive.
  // `color` may be a Color or a function (x, y, z) -> Color evaluated per voxel.
  box(x0, y0, z0, x1, y1, z1, color) {
    if (typeof color === 'function') {
      for (let x = x0; x <= x1; x++)
        for (let y = y0; y <= y1; y++)
          for (let z = z0; z <= z1; z++) this.v(x, y, z, color(x, y, z));
      return;
    }
    const [ax, az] = ROT[this.facing](x0, z0);
    const [bx, bz] = ROT[this.facing](x1, z1);
    this.bag.solid.add(
      this.ox + (ax + bx) / 2,
      this.oy + (y0 + y1) / 2 + 0.5,
      this.oz + (az + bz) / 2,
      color,
      Math.abs(bx - ax) + 1,
      y1 - y0 + 1,
      Math.abs(bz - az) + 1,
    );
  }
  // Per-voxel horizontal fill at height y.
  fill(x0, z0, x1, z1, y, colorFn) {
    for (let x = x0; x <= x1; x++)
      for (let z = z0; z <= z1; z++) this.v(x, y, z, colorFn(x, z));
  }
}

// Perimeter (x,z,face) iterator for a rect outline (1 voxel thick).
// face: 'F' = local +z, 'B' = -z, 'L' = -x, 'R' = +x.
export function* ringCells(x0, z0, x1, z1) {
  for (let x = x0; x <= x1; x++) {
    yield [x, z0, 'B'];
    if (z1 !== z0) yield [x, z1, 'F'];
  }
  for (let z = z0 + 1; z <= z1 - 1; z++) {
    yield [x0, z, 'L'];
    if (x1 !== x0) yield [x1, z, 'R'];
  }
}
