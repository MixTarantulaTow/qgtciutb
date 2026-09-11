import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildWorld, SIZE, WATER_Y } from './world.js';
import { buildTerrainVoxels } from './terrain.js';
import { buildWaterfall } from './waterfall.js';
import { buildClouds } from './clouds.js';
import { VoxelBuilder } from './voxel.js';
import { PALETTE } from './palette.js';

const container = document.getElementById('app');
const fpsEl = document.getElementById('fps');

// ---------- renderer / scene / camera ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);

// Software rasterizers (SwiftShader/llvmpipe, headless VMs) have no GPU:
// drop shadows and render at reduced resolution so the scene stays fluid.
const _gl = renderer.getContext();
const _dbg = _gl.getExtension('WEBGL_debug_renderer_info');
const _rname = _dbg ? _gl.getParameter(_dbg.UNMASKED_RENDERER_WEBGL) : '';
const LOW_SPEC = /swiftshader|llvmpipe|software|basic render/i.test(String(_rname));
if (LOW_SPEC) {
  renderer.setPixelRatio(0.7);
  renderer.setSize(window.innerWidth, window.innerHeight);
}

renderer.shadowMap.enabled = !LOW_SPEC;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();

// dusk gradient sky dome
{
  const skyGeo = new THREE.SphereGeometry(600, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color('#3b5a8f') },
      mid: { value: new THREE.Color('#e08e63') },
      bot: { value: new THREE.Color('#2a2438') },
    },
    vertexShader: /* glsl */`
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 top; uniform vec3 mid; uniform vec3 bot;
      varying vec3 vPos;
      void main() {
        float h = normalize(vPos).y;
        vec3 c = h > 0.0
          ? mix(mid, top, smoothstep(0.0, 0.55, h))
          : mix(mid, bot, smoothstep(0.0, 0.4, -h));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));
}
scene.fog = new THREE.Fog(new THREE.Color('#cf9a76'), 150, 420);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.set(88, 54, 88);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 16, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.7;
controls.minDistance = 35;
controls.maxDistance = 260;
controls.maxPolarAngle = Math.PI * 0.52;
controls.update();

// ---------- lights (low dusk sun) ----------
const sun = new THREE.DirectionalLight('#ffd0a0', 2.4);
sun.position.set(-80, 55, 40);
sun.castShadow = !LOW_SPEC;
sun.shadow.mapSize.set(1024, 1024);
const S = 78;
sun.shadow.camera.left = -S;
sun.shadow.camera.right = S;
sun.shadow.camera.top = S;
sun.shadow.camera.bottom = -S;
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 320;
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.4;
scene.add(sun);
scene.add(sun.target);

scene.add(new THREE.HemisphereLight('#8fb3d9', '#3a2f28', 0.85));
scene.add(new THREE.AmbientLight('#404860', 0.35));

// ---------- world ----------
const world = buildWorld();

const terrainMat = new THREE.MeshLambertMaterial();
const builder = new VoxelBuilder();
for (const v of buildTerrainVoxels(world)) {
  builder.add(v.x, v.y, v.z, v.color, v.sx ?? 1, v.sy ?? 1, v.sz ?? 1);
}
const terrain = builder.build(terrainMat);
terrain.castShadow = !LOW_SPEC;
terrain.receiveShadow = !LOW_SPEC;
scene.add(terrain);

const waterfall = buildWaterfall(world);
scene.add(waterfall.group);

const clouds = buildClouds(world);
scene.add(clouds.group);

// surrounding water plane
{
  const g = new THREE.PlaneGeometry(900, 900);
  const m = new THREE.MeshLambertMaterial({
    color: new THREE.Color('#2f6f9f'),
    transparent: true,
    opacity: 0.85,
  });
  const plane = new THREE.Mesh(g, m);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = WATER_Y + 0.35;
  plane.receiveShadow = true;
  scene.add(plane);
}

// ---------- fps counter ----------
let frames = 0;
let lastFpsT = performance.now();
function tickFps() {
  frames++;
  const now = performance.now();
  if (now - lastFpsT >= 1000) {
    fpsEl.textContent = `FPS: ${Math.round((frames * 1000) / (now - lastFpsT))}`;
    frames = 0;
    lastFpsT = now;
  }
}

// ---------- loop ----------
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  waterfall.update(dt);
  clouds.update(t);
  controls.update();
  renderer.render(scene, camera);
  tickFps();
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
