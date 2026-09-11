// Helper: collect colored unit-voxel instances into one InstancedMesh.
import * as THREE from 'three';

export class VoxelBuilder {
  constructor() {
    this.items = []; // {x, y, z, sx, sy, sz, color}
  }
  add(x, y, z, color, sx = 1, sy = 1, sz = 1) {
    this.items.push({ x, y, z, sx, sy, sz, color });
  }
  build(material) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.InstancedMesh(geo, material, this.items.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    this.items.forEach((it, i) => {
      p.set(it.x, it.y, it.z);
      s.set(it.sx, it.sy, it.sz);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, it.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return mesh;
  }
}
