// Waterfalls: animated water voxels flowing down each carved channel,
// plus static plunge pools, foam and the streams to the coast.
import * as THREE from 'three';
import { PALETTE, jitterColor } from './palette.js';

export function buildWaterfall(world) {
  const { paths, pools, streams, rng, H } = world;
  const group = new THREE.Group();

  // ---------- static water: pools + foam + streams ----------
  const still = [];
  for (const key of pools) {
    const [x, z] = key.split(',').map(Number);
    still.push({ x, y: H(x, z) + 1, z, color: jitterColor(PALETTE.water, rng, 0.05) });
  }
  // foam around each fall's impact point
  for (const path of paths) {
    const impact = path[path.length - 1];
    if (!impact) continue;
    for (const key of pools) {
      const [x, z] = key.split(',').map(Number);
      const d = Math.hypot(x - impact.x, z - impact.z);
      if (d <= 2.4) {
        still.push({
          x, y: H(x, z) + 1.4 + rng() * 0.3, z,
          color: jitterColor(PALETTE.foam, rng, 0.04),
          sx: 0.85, sy: 0.55, sz: 0.85,
        });
      }
    }
  }
  for (const key of streams) {
    const [x, z] = key.split(',').map(Number);
    still.push({ x, y: H(x, z) + 1, z, color: jitterColor(PALETTE.water, rng, 0.05) });
  }

  const waterMatOpts = {
    transparent: true,
    opacity: 0.9,
    emissive: new THREE.Color('#1a4a78'),
    emissiveIntensity: 0.55,
  };
  const stillGeo = new THREE.BoxGeometry(1, 1, 1);
  const stillMat = new THREE.MeshLambertMaterial(waterMatOpts);
  const stillMesh = new THREE.InstancedMesh(stillGeo, stillMat, Math.max(1, still.length));
  {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    still.forEach((it, i) => {
      p.set(it.x, it.y, it.z);
      s.set(it.sx ?? 1, it.sy ?? 1, it.sz ?? 1);
      m.compose(p, q, s);
      stillMesh.setMatrixAt(i, m);
      stillMesh.setColorAt(i, it.color);
    });
  }
  stillMesh.instanceMatrix.needsUpdate = true;
  group.add(stillMesh);

  // ---------- animated flow down each path ----------
  const flows = [];
  let count = 0;
  const DENSITY = 3;
  for (const path of paths) {
    const pts = path.map((c) => new THREE.Vector3(c.x, H(c.x, c.z) + 1, c.z));
    if (pts.length < 2) continue;
    const segLen = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const l = pts[i].distanceTo(pts[i + 1]);
      segLen.push(l);
      total += l;
    }
    const n = Math.floor(pts.length * DENSITY);
    flows.push({ pts, segLen, total, offset: count, n });
    count += n;
  }

  const flowMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ ...waterMatOpts, opacity: 1 }),
    Math.max(1, count),
  );
  flowMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(flowMesh);

  const drops = new Array(count);
  for (const f of flows) {
    for (let i = 0; i < f.n; i++) {
      const drop = {
        u: rng() * f.total,
        lat: (rng() * 2 - 1) * 0.3,
        w: 0.7 + rng() * 0.28,
        foam: rng() < 0.2,
      };
      drops[f.offset + i] = drop;
      const c = drop.foam
        ? jitterColor(PALETTE.foam, rng, 0.05)
        : jitterColor(PALETTE.water, rng, 0.1);
      flowMesh.setColorAt(f.offset + i, c);
    }
  }
  if (flowMesh.instanceColor) flowMesh.instanceColor.needsUpdate = true;

  const SPEED = 9;
  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _p = new THREE.Vector3();
  const _s = new THREE.Vector3();
  const _tan = new THREE.Vector3();
  const _side = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

  function update(dt) {
    for (const f of flows) {
      for (let i = 0; i < f.n; i++) {
        const drop = drops[f.offset + i];
        drop.u = (drop.u + SPEED * dt) % f.total;

        // locate the segment containing distance u
        let d = drop.u;
        let si = 0;
        while (si < f.segLen.length - 1 && d > f.segLen[si]) { d -= f.segLen[si]; si++; }
        const t = Math.min(1, d / (f.segLen[si] || 1));
        _p.lerpVectors(f.pts[si], f.pts[si + 1], t);
        _tan.subVectors(f.pts[si + 1], f.pts[si]).normalize();

        _side.crossVectors(_tan, UP).normalize().multiplyScalar(drop.lat);
        if (_side.lengthSq() === 0) _side.set(drop.lat, 0, 0);
        const pos = _p.clone().add(_side);
        // stretch droplets vertically on steep parts -> streaks
        const stretch = 1 + Math.min(2.2, -_tan.y * 2.0);
        _s.set(drop.w, Math.max(0.8, stretch), drop.w);
        _m.compose(pos, _q, _s);
        flowMesh.setMatrixAt(f.offset + i, _m);
      }
    }
    flowMesh.instanceMatrix.needsUpdate = true;
  }

  return { group, update };
}
