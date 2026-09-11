// Shared building parts: terraces, stairs, walls with doors/windows,
// colonnades, balustrades and bracket bands (斗拱).
import { jitterColor } from '../palette.js';
import { P } from './palette.js';
import { ringCells } from './ctx.js';

// Stone terrace 台基: stacked slabs, bottom tier widest. `heights` lists each
// tier's voxel height bottom→top; each upper tier insets by `inset`.
// Returns the first free level above the terrace.
export function platform(ctx, x0, z0, x1, z1, heights, inset = 2) {
  let y = 0;
  let lx0 = x0, lz0 = z0, lx1 = x1, lz1 = z1;
  heights.forEach((h, ti) => {
    const last = ti === heights.length - 1;
    const ix0 = lx0 + 1, iz0 = lz0 + 1, ix1 = lx1 - 1, iz1 = lz1 - 1;
    if (ix1 >= ix0 && iz1 >= iz0) {
      if (last) {
        if (h > 1) ctx.box(ix0, y, iz0, ix1, y + h - 2, iz1, P.stoneDark);
        ctx.fill(ix0, iz0, ix1, iz1, y + h - 1, (x, z) =>
          (x + z) % 2 ? jitterColor(P.stone, ctx.rng, 0.04) : jitterColor(P.stone, ctx.rng, 0.07));
      } else {
        ctx.box(ix0, y, iz0, ix1, y + h - 1, iz1, P.stoneDark);
      }
    }
    for (const [x, z] of ringCells(lx0, lz0, lx1, lz1))
      for (let yy = y; yy < y + h; yy++)
        ctx.v(x, yy, z, jitterColor(yy === y + h - 1 ? P.stone : P.stoneDark, ctx.rng, 0.04));
    lx0 += inset; lz0 += inset; lx1 -= inset; lz1 -= inset;
    y += h;
  });
  return y;
}

// Straight stair descending toward local +z (front). Steps drop from `top`
// at z = zStart-1 down to ground over `top` rows. Optional center 丹陛 ramp
// band in pale carved stone.
export function stairs(ctx, cx, zStart, w, top, o = {}) {
  const x0 = cx - Math.floor(w / 2);
  const x1 = x0 + w - 1;
  const rampW = o.ramp ?? 0;
  for (let k = 0; k < top; k++) {
    const z = zStart + k;
    const h = top - k; // this step's top level
    for (let x = x0; x <= x1; x++) {
      const onRamp = rampW > 0 && Math.abs(x - cx) * 2 < rampW;
      ctx.box(x, 0, z, x, h - 1, z, jitterColor(onRamp ? P.stone : P.stoneDark, ctx.rng, 0.03));
    }
    ctx.box(x0 - 1, 0, z, x0 - 1, h - 1, z, P.stone); // 垂带 cheeks
    ctx.box(x1 + 1, 0, z, x1 + 1, h - 1, z, P.stone);
  }
}

// 栏杆 balustrade around a platform top edge at height y. `gaps` lists
// [face, c0, c1] spans (x or z coords) left open for stairs.
export function balustrade(ctx, x0, z0, x1, z1, y, gaps = []) {
  const inGap = (face, c) => gaps.some(([f, a, b]) => f === face && c >= a && c <= b);
  for (const [x, z, face] of ringCells(x0, z0, x1, z1)) {
    const c = face === 'F' || face === 'B' ? x : z;
    if (inGap(face, c)) continue;
    ctx.v(x, y, z, P.stone); // rail line
    const corner = (x === x0 || x === x1) && (z === z0 || z === z1);
    if (corner || c % 4 === 0) {
      ctx.v(x, y + 1, z, P.stone); // post
      ctx.v(x, y + 2, z, P.stoneDark); // post head
    }
  }
}

// Perimeter wall with columns, doors, windows.
// doors/windows: {face:'F'|'B'|'L'|'R', cx, cy, w, h, through?}
//   cx is the center along the face (x for F/B, z for L/R), cy the bottom y.
export function wall(ctx, x0, z0, x1, z1, y0, y1, o = {}) {
  const wallC = o.wall ?? P.wallRed;
  const colC = o.col ?? P.columnRed;
  const sillC = o.sill ?? P.stone;
  const archC = o.arch ?? P.woodDark;
  const spacing = o.colSpacing ?? 4;
  const rng = ctx.rng;

  const colPos = (a0, a1) => {
    const s = new Set();
    for (let a = a0; a <= a1; a += spacing) s.add(a);
    s.add(a1);
    return s;
  };
  const xs = colPos(x0, x1);
  const zs = colPos(z0, z1);

  const inRect = (r, face, c, y) =>
    r.face === face && y >= r.cy && y < r.cy + r.h && Math.abs(c - r.cx) * 2 < r.w;

  for (const [x, z, face] of ringCells(x0, z0, x1, z1)) {
    const c = face === 'F' || face === 'B' ? x : z;
    const isCol = face === 'F' || face === 'B' ? xs.has(x) : zs.has(z);
    for (let y = y0; y <= y1; y++) {
      const door = (o.doors ?? []).find((r) => inRect(r, face, c, y));
      if (door) {
        if (door.through) continue;
        const stud = Math.abs(c - door.cx) % 2 === 0 && (y - door.cy) % 2 === 1;
        ctx.v(x, y, z, stud ? P.gold : P.door);
        continue;
      }
      const win = (o.windows ?? []).find((r) => inRect(r, face, c, y));
      if (win) {
        const dx = c - win.cx + Math.floor(win.w / 2);
        const dy = y - win.cy;
        const frame = dx === 0 || dx === win.w - 1 || dy === 0 || dy === win.h - 1;
        const bar = dx % 2 === 0 || dy % 2 === 0;
        ctx.v(x, y, z, frame || bar ? P.woodDark : P.paper);
        continue;
      }
      if (y === y0 && o.sill !== false) {
        ctx.v(x, y, z, jitterColor(sillC, rng, 0.03));
        continue;
      }
      if (y === y1) {
        ctx.v(x, y, z, archC);
        continue;
      }
      ctx.v(x, y, z, jitterColor(isCol ? colC : wallC, rng, 0.03));
    }
  }
}

// 匾额 plaque: dark board with gold rim mounted on a face.
// For F/B faces it spans x around cx at depth z; for L/R it spans z at x.
export function plaque(ctx, face, cx, y, w, at) {
  if (face === 'F' || face === 'B') {
    const x0 = cx - Math.floor(w / 2);
    ctx.box(x0, y, at, x0 + w - 1, y + 1, at, (xx, yy) =>
      xx === x0 || xx === x0 + w - 1 || yy === y || yy === y + 1 ? P.gold : P.plaque,
    );
  } else {
    const z0 = cx - Math.floor(w / 2);
    ctx.box(at, y, z0, at, y + 1, z0 + w - 1, (xx, yy, zz) =>
      zz === z0 || zz === z0 + w - 1 || yy === y || yy === y + 1 ? P.gold : P.plaque,
    );
  }
}

// Colonnade ring (廊柱): free-standing columns carrying a porch eave.
export function colonnade(ctx, x0, z0, x1, z1, y0, h, spacing = 3, color = P.columnRed) {
  for (const [x, z, face] of ringCells(x0, z0, x1, z1)) {
    const c = face === 'F' || face === 'B' ? x : z;
    const corner = (x === x0 || x === x1) && (z === z0 || z === z1);
    if (!corner && c % spacing !== 0) continue;
    ctx.v(x, y0, z, P.stone); // 柱础 plinth
    ctx.box(x, y0 + 1, z, x, y0 + h - 1, z, color);
  }
}

// 斗拱 bracket band under an eave: dark 额枋 row plus protruding stepped
// brackets every other voxel, deeper diagonal sets at corners.
export function brackets(ctx, x0, z0, x1, z1, y, color = P.woodDark) {
  for (const [x, z, face] of ringCells(x0, z0, x1, z1)) {
    ctx.v(x, y, z, color); // architrave row
    const c = face === 'F' || face === 'B' ? x : z;
    const [ox, oz] = face === 'F' ? [0, 1] : face === 'B' ? [0, -1] : face === 'L' ? [-1, 0] : [1, 0];
    if (c % 2 === 0) ctx.v(x + ox, y + 1, z + oz, color);
  }
  for (const [cx, cz, ox, oz] of [
    [x0, z0, -1, -1],
    [x1, z0, 1, -1],
    [x0, z1, -1, 1],
    [x1, z1, 1, 1],
  ]) {
    ctx.v(cx + ox, y + 1, cz, color);
    ctx.v(cx, y + 1, cz + oz, color);
    ctx.v(cx + 2 * ox, y + 2, cz + 2 * oz, color);
  }
}
