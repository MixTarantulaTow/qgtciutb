// Voxel cloud band: drifting translucent blocky clouds around the mountain
// waist, so the taller peaks pierce through the layer.
import * as THREE from 'three';
import { CLOUD_Y, HALF } from './world.js';
import { PALETTE, jitterColor } from './palette.js';

export function buildClouds(world) {
  const { rng } = world;
  const group = new THREE.Group();

  const items = [];
  const CLUSTER = 16;
  for (let c = 0; c < CLUSTER; c++) {
    const ang = (c / CLUSTER) * Math.PI * 2 + rng() * 0.5;
    const rad = 10 + rng() * (HALF - 18);
    const cx = Math.cos(ang) * rad;
    const cz = Math.sin(ang) * rad;
    const cy = CLOUD_Y + (rng() * 2 - 1) * 3.5;
    const n = 12 + Math.floor(rng() * 12);
    for (let i = 0; i < n; i++) {
      items.push({
        x: cx + (rng() * 2 - 1) * 8,
        y: cy + (rng() * 2 - 1) * 1.4,
        z: cz + (rng() * 2 - 1) * 6,
        sx: 2.5 + rng() * 4,
        sy: 1 + rng() * 1.2,
        sz: 2 + rng() * 3,
      });
    }
  }

  // a few high wisps above the band
  for (let c = 0; c < 4; c++) {
    const ang = rng() * Math.PI * 2;
    const rad = 20 + rng() * 30;
    const cx = Math.cos(ang) * rad;
    const cz = Math.sin(ang) * rad;
    for (let i = 0; i < 5; i++) {
      items.push({
        x: cx + (rng() * 2 - 1) * 5,
        y: CLOUD_Y + 12 + rng() * 6,
        z: cz + (rng() * 2 - 1) * 4,
        sx: 2 + rng() * 3,
        sy: 0.7 + rng() * 0.6,
        sz: 1.6 + rng() * 2,
      });
    }
  }

  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshLambertMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, items.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  items.forEach((it, i) => {
    p.set(it.x, it.y, it.z);
    s.set(it.sx, it.sy, it.sz);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, jitterColor(new THREE.Color('#fdfdfd'), rng, 0.04));
  });
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);

  function update(t) {
    group.rotation.y = t * 0.018;              // slow orbit around the range
    group.position.y = Math.sin(t * 0.12) * 0.8; // gentle bob
  }

  return { group, update };
}
