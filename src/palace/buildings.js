// The building complex: 山门 gate, 钟/鼓楼 towers, 东西配殿 side halls,
// 主殿 main hall (重檐庑殿顶), 宝塔 pagoda (攒尖顶).
// Each is authored in local space facing +z, placed via ctx.at(cx, 0, cz, facing).
import { jitterColor } from '../palette.js';
import { P } from './palette.js';
import { platform, stairs, balustrade, wall, plaque, colonnade, brackets } from './parts.js';
import { hipRoof, xieRoof, zanRoof } from './roofs.js';
import { ringCells } from './ctx.js';

// ---------- 山门 (gatehouse, 单檐歇山顶) ----------
export function buildGate(ctx) {
  platform(ctx, -19, -6, 19, 6, [2], 0);
  stairs(ctx, 0, 7, 10, 2);
  stairs(ctx.at(0, 0, 0, 'N'), 0, 7, 10, 2); // back stair
  wall(ctx, -17, -4, 17, 4, 2, 7, {
    colSpacing: 4,
    doors: [
      { face: 'F', cx: 0, cy: 2, w: 5, h: 5, through: true },
      { face: 'B', cx: 0, cy: 2, w: 5, h: 5, through: true },
      { face: 'F', cx: -11, cy: 2, w: 3, h: 4, through: true },
      { face: 'B', cx: -11, cy: 2, w: 3, h: 4, through: true },
      { face: 'F', cx: 11, cy: 2, w: 3, h: 4, through: true },
      { face: 'B', cx: 11, cy: 2, w: 3, h: 4, through: true },
    ],
    windows: [
      { face: 'F', cx: -5, cy: 4, w: 3, h: 2 },
      { face: 'F', cx: 5, cy: 4, w: 3, h: 2 },
    ],
  });
  // portal frames: wood jambs flanking the doorways
  for (const cx of [-3, 3, -13, -9, 9, 13]) {
    ctx.box(cx, 2, 4, cx, 6, 4, P.woodDark);
    ctx.box(cx, 2, -4, cx, 6, -4, P.woodDark);
  }
  plaque(ctx, 'F', 0, 7, 7, 5);
  brackets(ctx, -17, -4, 17, 4, 8);
  hipRoof(ctx, -20, -7, 20, 7, 11, {
    tile: P.tileGold, tileHi: P.tileGoldHi, step: 2, curl: 3,
  });
}

// ---------- 配殿 (side hall, 歇山顶 green tiles) ----------
export function buildSideHall(ctx) {
  platform(ctx, -12, -8, 12, 8, [2], 0);
  stairs(ctx, 0, 9, 8, 2);
  balustrade(ctx, -12, -8, 12, 8, 2, [['F', -5, 5]]);
  wall(ctx, -10, -6, 10, 6, 2, 8, {
    colSpacing: 4,
    doors: [{ face: 'F', cx: 0, cy: 3, w: 3, h: 4 }],
    windows: [
      { face: 'F', cx: -6, cy: 4, w: 3, h: 3 },
      { face: 'F', cx: 6, cy: 4, w: 3, h: 3 },
      { face: 'B', cx: -5, cy: 4, w: 3, h: 3 },
      { face: 'B', cx: 5, cy: 4, w: 3, h: 3 },
    ],
  });
  plaque(ctx, 'F', 0, 8, 5, 7);
  brackets(ctx, -10, -6, 10, 6, 9);
  xieRoof(ctx, -13, -9, 13, 9, 12, {
    tile: P.tileGreen, tileHi: P.tileGreenHi, step: 2, curl: 3, gableSpan: 7,
    gable: P.wallRed,
  });
}

// ---------- 主殿 (main hall, 重檐庑殿顶 on triple terrace) ----------
export function buildMainHall(ctx) {
  const top = platform(ctx, -28, -19, 28, 19, [2, 2, 2], 3); // top y=6
  stairs(ctx, 0, 14, 14, top, { ramp: 5 });
  stairs(ctx.at(0, 0, 0, 'N'), 0, 14, 10, top);
  balustrade(ctx, -22, -13, 22, 13, top, [['F', -8, 8], ['B', -6, 6]]);

  // porch colonnade (廊柱) + recessed wall
  colonnade(ctx, -20, -12, 20, 12, top, 7, 3);
  wall(ctx, -18, -9, 18, 9, top, top + 6, {
    colSpacing: 4,
    doors: [
      { face: 'F', cx: 0, cy: top + 1, w: 3, h: 5, through: true },
      { face: 'B', cx: 0, cy: top + 1, w: 3, h: 4, through: true },
      { face: 'F', cx: -10, cy: top + 1, w: 3, h: 4 },
      { face: 'F', cx: 10, cy: top + 1, w: 3, h: 4 },
    ],
    windows: [
      { face: 'F', cx: -5, cy: top + 2, w: 3, h: 3 },
      { face: 'F', cx: 5, cy: top + 2, w: 3, h: 3 },
      { face: 'F', cx: -15, cy: top + 2, w: 3, h: 3 },
      { face: 'F', cx: 15, cy: top + 2, w: 3, h: 3 },
      { face: 'B', cx: -8, cy: top + 2, w: 3, h: 3 },
      { face: 'B', cx: 8, cy: top + 2, w: 3, h: 3 },
      { face: 'L', cx: 0, cy: top + 2, w: 3, h: 3 },
      { face: 'R', cx: 0, cy: top + 2, w: 3, h: 3 },
    ],
  });

  brackets(ctx, -20, -12, 20, 12, top + 7); // over colonnade
  // lower eave 下檐: shallow hip skirt over the porch
  hipRoof(ctx, -24, -16, 24, 16, top + 10, {
    tile: P.tileGold, tileHi: P.tileGoldHi, step: 2, curl: 3, maxLevels: 2,
  });

  // upper wall band rising through the lower roof
  wall(ctx, -14, -7, 14, 7, top + 13, top + 17, {
    colSpacing: 4,
    sill: false,
    windows: [
      { face: 'F', cx: -10, cy: top + 14, w: 3, h: 3 },
      { face: 'F', cx: -5, cy: top + 14, w: 3, h: 3 },
      { face: 'F', cx: 5, cy: top + 14, w: 3, h: 3 },
      { face: 'F', cx: 10, cy: top + 14, w: 3, h: 3 },
      { face: 'B', cx: -7, cy: top + 14, w: 3, h: 3 },
      { face: 'B', cx: 7, cy: top + 14, w: 3, h: 3 },
      { face: 'L', cx: 0, cy: top + 14, w: 3, h: 3 },
      { face: 'R', cx: 0, cy: top + 14, w: 3, h: 3 },
    ],
  });
  plaque(ctx, 'F', 0, top + 18, 7, 8);
  brackets(ctx, -14, -7, 14, 7, top + 18);
  // main upper roof 庑殿顶
  hipRoof(ctx, -19, -12, 19, 12, top + 21, {
    tile: P.tileGold, tileHi: P.tileGoldHi, step: 2, curl: 4,
  });
}

// ---------- 钟鼓楼 (bell / drum tower) ----------
export function buildTower(ctx, kind) {
  platform(ctx, -7, -7, 7, 7, [1], 0); // top y=1
  stairs(ctx, 0, 8, 6, 1);
  // tall brick base with front niche holding bell / drum
  wall(ctx, -6, -6, 6, 6, 1, 6, {
    wall: P.stoneDark, col: P.stoneDark, sill: P.stoneDark, arch: P.ridgeDark,
    colSpacing: 5,
    doors: [{ face: 'F', cx: 0, cy: 2, w: 3, h: 4, through: true }],
  });
  // interior object just behind the niche opening
  if (kind === 'bell') {
    ctx.box(-1, 3, 4, 1, 4, 4, P.bronze); // 钟
    ctx.box(0, 5, 4, 0, 5, 4, P.iron);
  } else {
    ctx.box(-1, 3, 4, 1, 4, 4, P.door); // 鼓 body
    ctx.box(-2, 3, 4, -2, 4, 4, P.gold); // drum frame
    ctx.box(2, 3, 4, 2, 4, 4, P.gold);
  }
  // upper pavilion
  wall(ctx, -5, -5, 5, 5, 7, 11, {
    colSpacing: 5,
    windows: [
      { face: 'F', cx: 0, cy: 8, w: 3, h: 2 },
      { face: 'B', cx: 0, cy: 8, w: 3, h: 2 },
      { face: 'L', cx: 0, cy: 8, w: 3, h: 2 },
      { face: 'R', cx: 0, cy: 8, w: 3, h: 2 },
    ],
  });
  brackets(ctx, -5, -5, 5, 5, 12);
  if (kind === 'bell') {
    xieRoof(ctx, -8, -8, 8, 8, 15, {
      tile: P.tileGreen, tileHi: P.tileGreenHi, step: 2, curl: 3, gableSpan: 5,
      gable: P.wallRed,
    });
  } else {
    zanRoof(ctx, -8, -8, 8, 8, 15, {
      tile: P.tileGreen, tileHi: P.tileGreenHi, step: 1, curl: 3,
    });
  }
}

// ---------- 宝塔 (5-story pagoda, 攒尖顶) ----------
export function buildPagoda(ctx) {
  platform(ctx, -9, -9, 9, 9, [2], 0); // top y=2
  stairs(ctx, 0, 10, 8, 2);
  let y = 2;
  for (let k = 0; k < 5; k++) {
    const h = 7 - k; // wall half-extent: 7,6,5,4,3
    const face = ['F', 'R', 'B', 'L', 'F'][k];
    wall(ctx, -h, -h, h, h, y, y + 3, {
      colSpacing: 3,
      doors: [{ face, cx: 0, cy: y + 1, w: 3, h: 2 }],
      windows: [
        { face: 'F', cx: 0, cy: y + 1, w: 1, h: 2 },
        { face: 'B', cx: 0, cy: y + 1, w: 1, h: 2 },
        { face: 'L', cx: 0, cy: y + 1, w: 1, h: 2 },
        { face: 'R', cx: 0, cy: y + 1, w: 1, h: 2 },
      ].filter((w) => w.face !== face),
    });
    // per-story eave skirt
    hipRoof(ctx, -h - 2, -h - 2, h + 2, h + 2, y + 4, {
      tile: P.tileGray, tileHi: P.tileGrayHi, step: 1, curl: 2, maxLevels: 2,
    });
    y += 6;
  }
  // crown: 攒尖顶 + 塔刹
  zanRoof(ctx, -5, -5, 5, 5, y, {
    tile: P.tileGray, tileHi: P.tileGrayHi, step: 1, curl: 2,
  });
  // taller spire override: extra rings on top of the finial
  ctx.box(0, y + 5, 0, 0, y + 8, 0, P.bronze);
  ctx.v(0, y + 9, 0, P.gold);
}
