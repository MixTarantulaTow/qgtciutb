// Chinese roof generators for voxel buildings.
// All roofs are stacked layers receding inward; corners rise (飞檐翘角).
import { jitterColor } from '../palette.js';
import { P } from './palette.js';
import { ringCells } from './ctx.js';

// One roof layer: outer 1-deep edge emitted per-voxel so tile courses get
// alternating 瓦垄 striping; the rest of the ring is drawn as boxes.
function roofLayer(ctx, x0, z0, x1, z1, y, step, tile, tileHi, rng) {
  const w = x1 - x0 + 1;
  const d = z1 - z0 + 1;
  const shade = jitterColor(tile, rng, 0.04);
  if (w <= 2 * step || d <= 2 * step) {
    // small layer: emit whole slab per voxel
    for (let x = x0; x <= x1; x++)
      for (let z = z0; z <= z1; z++) ctx.v(x, y, z, (x + z) % 2 ? jitterColor(tile, rng, 0.05) : jitterColor(tileHi, rng, 0.05));
    return;
  }
  // outer edge row with stripe texture
  for (const [x, z, face] of ringCells(x0, z0, x1, z1)) {
    const onZ = face === 'F' || face === 'B';
    const stripe = (onZ ? x : z) % 2 === 0;
    ctx.v(x, y, z, jitterColor(stripe ? tileHi : tile, rng, 0.05));
  }
  // inner band of the ring (thickness step-1)
  const bx0 = x0 + 1, bz0 = z0 + 1, bx1 = x1 - 1, bz1 = z1 - 1;
  const inner = step - 1;
  if (inner > 0) {
    ctx.box(bx0, y, bz0, bx1, y, bz0 + inner - 1, shade);
    ctx.box(bx0, y, bz1 - inner + 1, bx1, y, bz1, shade);
    if (bz0 + inner <= bz1 - inner) {
      ctx.box(bx0, y, bz0 + inner, bx0 + inner - 1, y, bz1 - inner, shade);
      ctx.box(bx1 - inner + 1, y, bz0 + inner, bx1, y, bz1 - inner, shade);
    }
  }
}

// Dark under-eave band just below the first roof layer (檐口 shadow board).
function eaveBoard(ctx, x0, z0, x1, z1, y, color) {
  for (const [x, z] of ringCells(x0, z0, x1, z1)) ctx.v(x, y, z, color);
}

// Rising corners: the eave layer gets the outward flicking stack (翘角);
// higher layers emit a single ridge voxel per corner so the hips read as a
// diagonal 角脊 line instead of a solid tower.
function corners(ctx, x0, z0, x1, z1, y, curl, color, isEave) {
  // 1-voxel-thick sliver layers (the apex spine) take the ridge cap instead —
  // corner bumps there would collide with it.
  if (!isEave && (x0 === x1 || z0 === z1)) return;
  const cs = [
    [x0, z0, 1, 1],
    [x1, z0, -1, 1],
    [x0, z1, 1, -1],
    [x1, z1, -1, -1],
  ];
  const seen = new Set();
  const put = (x, yy, z) => {
    const key = x + ',' + yy + ',' + z;
    if (seen.has(key)) return;
    seen.add(key);
    ctx.v(x, yy, z, color);
  };
  for (const [cx, cz, dx, dz] of cs) {
    if (!isEave) {
      put(cx, y + 1, cz);
      continue;
    }
    for (let k = 0; k < curl; k++) {
      const h = curl - k;
      put(cx + dx * k, y + h, cz);
      if (k > 0) put(cx, y + h, cz + dz * k);
    }
    put(cx + dx, y + curl, cz + dz);
    put(cx + 2 * dx, y + curl + 1, cz + 2 * dz);
  }
}

// Ridge cap 正脊 along x at the roof crown, plus 吻兽 ornaments at the ends.
function ridgeCap(ctx, x0, x1, z, y, color) {
  ctx.box(x0, y, z, x1, y, z, color);
  for (const [ex, dir] of [
    [x0, -1],
    [x1, 1],
  ]) {
    ctx.v(ex, y + 1, z, color);
    ctx.v(ex, y + 2, z, P.gold);
    ctx.v(ex + dir, y + 1, z, color);
  }
}

// 庑殿顶 (hip roof): all sides shrink `step` per level until the short axis
// closes, leaving a ridge along x. Square footprints converge to a point and
// get a finial instead.
export function hipRoof(ctx, x0, z0, x1, z1, y0, o = {}) {
  const step = o.step ?? 2;
  const tile = o.tile ?? P.tileGold;
  const tileHi = o.tileHi ?? P.tileGoldHi;
  const ridge = o.ridge ?? P.ridgeDark;
  const curl = o.curl ?? 3;
  const maxLevels = o.maxLevels ?? 1e9;
  const rng = ctx.rng;

  eaveBoard(ctx, x0, z0, x1, z1, y0 - 1, P.woodDark);

  let lx0 = x0, lz0 = z0, lx1 = x1, lz1 = z1, ly = y0;
  let top = null;
  for (let lv = 0; lv < maxLevels; lv++) {
    const w = lx1 - lx0 + 1, d = lz1 - lz0 + 1;
    if (w < 1 || d < 1) break;
    roofLayer(ctx, lx0, lz0, lx1, lz1, ly, step, tile, tileHi, rng);
    corners(ctx, lx0, lz0, lx1, lz1, ly, curl, ridge, lv === 0);
    top = [lx0, lz0, lx1, lz1, ly];
    lx0 += step; lz0 += step; lx1 -= step; lz1 -= step; ly += 1;
  }
  if (!top) return ly;
  const [tx0, tz0, tx1, tz1, ty] = top;
  const w = tx1 - tx0 + 1, d = tz1 - tz0 + 1;
  if (Math.min(w, d) <= step + 1) {
    // apex: flat crown + raised ridge along the longer axis
    const my = ty + 1;
    if (w >= d) {
      const cz = (tz0 + tz1) >> 1;
      ridgeCap(ctx, tx0, tx1, cz, my, ridge);
      if (d > 1) for (let z = tz0; z <= tz1; z++) if (z !== cz) ctx.box(tx0, my, z, tx1, my, z, tile);
    } else {
      const cx = (tx0 + tx1) >> 1;
      ctx.box(cx, my, tz0, cx, my, tz1, ridge);
      for (const [ez, dir] of [[tz0, -1], [tz1, 1]]) {
        ctx.v(cx, my + 1, ez, ridge);
        ctx.v(cx, my + 2, ez, P.gold);
        ctx.v(cx, my + 1, ez + dir, ridge);
      }
      if (w > 1) for (let x = tx0; x <= tx1; x++) if (x !== cx) ctx.box(x, my, tz0, x, my, tz1, tile);
    }
  } else {
    // layers ran out via maxLevels: flat crown
    ctx.box(tx0 + 1, ty + 1, tz0 + 1, tx1 - 1, ty + 1, tz1 - 1, tile);
  }
  return ly;
}

// 歇山顶 (hip-and-gable): hip slopes up to `gableSpan`, then a two-slope gable
// roof with 山花 gable walls at both x ends, crowned by a ridge.
export function xieRoof(ctx, x0, z0, x1, z1, y0, o = {}) {
  const step = o.step ?? 2;
  const tile = o.tile ?? P.tileGreen;
  const tileHi = o.tileHi ?? P.tileGreenHi;
  const ridge = o.ridge ?? P.ridgeDark;
  const gableC = o.gable ?? P.woodDark;
  const curl = o.curl ?? 3;
  const rng = ctx.rng;

  eaveBoard(ctx, x0, z0, x1, z1, y0 - 1, P.woodDark);

  const gableSpan = o.gableSpan ?? Math.max(5, Math.round((z1 - z0 + 1) * 0.38) | 1);
  let lx0 = x0, lz0 = z0, lx1 = x1, lz1 = z1, ly = y0;
  let lv = 0;
  while (lz1 - lz0 + 1 > gableSpan) {
    roofLayer(ctx, lx0, lz0, lx1, lz1, ly, step, tile, tileHi, rng);
    corners(ctx, lx0, lz0, lx1, lz1, ly, curl, ridge, lv === 0);
    lx0 += step; lz0 += step; lx1 -= step; lz1 -= step; ly += 1; lv++;
  }
  // gable phase: shrink only z; x-end slab edges form the stepped 山花 gable
  while (lz1 - lz0 + 1 > 0) {
    for (let x = lx0; x <= lx1; x++)
      for (let z = lz0; z <= lz1; z++) {
        const end = x === lx0 || x === lx1;
        ctx.v(
          x, ly, z,
          end ? jitterColor(gableC, rng, 0.04)
              : x % 2 ? jitterColor(tile, rng, 0.05) : jitterColor(tileHi, rng, 0.05),
        );
      }
    // 垂脊 bumps along the gable roof edges
    ctx.v(lx0, ly + 1, lz0, ridge); ctx.v(lx1, ly + 1, lz0, ridge);
    ctx.v(lx0, ly + 1, lz1, ridge); ctx.v(lx1, ly + 1, lz1, ridge);
    lz0 += step; lz1 -= step; ly += 1;
  }
  ridgeCap(ctx, lx0, lx1, lz0 - step + Math.floor((lz1 - lz0 + step * 2) / 2), ly, ridge);
  return ly;
}

// 攒尖顶 (pyramidal roof): both axes shrink equally to an apex, then a
// finial spire (宝顶/塔刹).
export function zanRoof(ctx, x0, z0, x1, z1, y0, o = {}) {
  const step = o.step ?? 1;
  const tile = o.tile ?? P.tileGray;
  const tileHi = o.tileHi ?? P.tileGrayHi;
  const ridge = o.ridge ?? P.ridgeDark;
  const curl = o.curl ?? 3;
  const rng = ctx.rng;

  eaveBoard(ctx, x0, z0, x1, z1, y0 - 1, P.woodDark);

  let lx0 = x0, lz0 = z0, lx1 = x1, lz1 = z1, ly = y0;
  let top = null;
  while (true) {
    const w = lx1 - lx0 + 1, d = lz1 - lz0 + 1;
    if (w < 1 || d < 1) break;
    roofLayer(ctx, lx0, lz0, lx1, lz1, ly, step, tile, tileHi, rng);
    corners(ctx, lx0, lz0, lx1, lz1, ly, curl, ridge, ly === y0);
    top = [lx0, lz0, lx1, lz1, ly];
    if (w <= 3 && d <= 3) break;
    lx0 += step; lz0 += step; lx1 -= step; lz1 -= step; ly += 1;
  }
  const [tx0, tz0, tx1, tz1, ty] = top;
  const cx = (tx0 + tx1) >> 1, cz = (tz0 + tz1) >> 1;
  // finial spire: bronze pole + gold orb
  ctx.box(cx, ty + 1, cz, cx, ty + 3, cz, P.bronze);
  ctx.v(cx, ty + 4, cz, P.gold);
  return ty + 4;
}
