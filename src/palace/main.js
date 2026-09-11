// Voxel Palace · 体素中式建筑群 — entry point.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Bag, Ctx } from './ctx.js';
import { buildSite } from './site.js';

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
renderer.toneMappingExposure = 1.15;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();

// dusk gradient sky dome
{
  const skyGeo = new THREE.SphereGeometry(700, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color('#41578c') },
      mid: { value: new THREE.Color('#e8926a') },
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
scene.fog = new THREE.Fog(new THREE.Color('#d69a72'), 220, 560);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1400);
camera.position.set(104, 62, 150);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 12, -6);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.55;
controls.minDistance = 40;
controls.maxDistance = 340;
controls.maxPolarAngle = Math.PI * 0.52;
controls.update();

// ---------- lights (low warm dusk sun from the south-east) ----------
const sun = new THREE.DirectionalLight('#ffd2a3', 2.5);
sun.position.set(90, 52, 105);
sun.castShadow = !LOW_SPEC;
sun.shadow.mapSize.set(2048, 2048);
const S = 115;
sun.shadow.camera.left = -S;
sun.shadow.camera.right = S;
sun.shadow.camera.top = S;
sun.shadow.camera.bottom = -S;
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 420;
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.5;
scene.add(sun);
scene.add(sun.target);

scene.add(new THREE.HemisphereLight('#93aed6', '#4a3c30', 0.9));
scene.add(new THREE.AmbientLight('#454e63', 0.4));

// ---------- build the complex ----------
const bag = new Bag();
buildSite(new Ctx(bag));

const solid = bag.solid.build(new THREE.MeshLambertMaterial());
solid.castShadow = !LOW_SPEC;
solid.receiveShadow = !LOW_SPEC;
scene.add(solid);

const glowMat = new THREE.MeshBasicMaterial();
const glow = bag.glow.build(glowMat);
scene.add(glow);

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
  const t = clock.getElapsedTime();
  // subtle lantern flicker
  const f = 0.9 + 0.1 * Math.sin(t * 5.3) * Math.sin(t * 2.1);
  glowMat.color.setRGB(f, f * 0.92, f * 0.8);
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

// debug camera hook
window.__view = (x, y, z, tx = 0, ty = 8, tz = 0) => {
  controls.autoRotate = false;
  camera.position.set(x, y, z);
  controls.target.set(tx, ty, tz);
  controls.update();
};
