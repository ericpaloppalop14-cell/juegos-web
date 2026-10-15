// ======================================================================
//  MUNDO 3D compartido: render de calidad (ACES + bloom suave), cielo,
//  mar de gelatina, montañas de caramelo, islas flotantes, nubes y brillos.
// ======================================================================
import * as THREE from 'three';
import { EffectComposer } from '../lib/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../lib/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../lib/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../lib/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from '../lib/addons/environments/RoomEnvironment.js';
const PhysLite = class extends THREE.MeshStandardMaterial { constructor(o = {}) { const { clearcoat, clearcoatRoughness, transmission, thickness, ior, sheen, sheenColor, sheenRoughness, iridescence, specularIntensity, ...r } = o; super(r); } }; // más barato que MeshPhysical en móvil

export const THEMES = {
  atardecer: { top: '#8f7ce8', mid: '#f3a6d0', bot: '#ffd9c0', sea: '#8fd8f0', seaDeep: '#6a8fe0', fog: '#f6c4da', sun: '#fff1d6', hemiS: '#ffe6f2', hemiG: '#b8a0e8', mount: ['#c9a6f2', '#f5a8cc', '#9fd0f5', '#ffc8a8'] },
  dia: { top: '#7cc4ff', mid: '#b8e2ff', bot: '#fff0f6', sea: '#9ff0e0', seaDeep: '#62c2e8', fog: '#d6ecff', sun: '#fffbe8', hemiS: '#f0f8ff', hemiG: '#c0e8c8', mount: ['#a8e6cf', '#c6b4ff', '#ffc4dc', '#9fd8ff'] },
};

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.86;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = /shadows/.test(location.search); // sin mapa de sombras por defecto (sombras de mancha bajo los mochis) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 900);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.25;
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // brillo suave: umbral alto y poca fuerza para que no deslumbre
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.22, 0.45, 0.93);
  composer.addPass(bloom); composer.addPass(new OutputPass());
  if (!/bloom/.test(location.search)) composer.render = () => renderer.render(scene, camera);
  const resize = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); composer.setSize(w, h); bloom.resolution.set(w / 2, h / 2);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize); resize();
  return { renderer, scene, camera, composer, bloom, resize };
}

export function addLights(scene, th, span = 30) {
  const hemi = new THREE.HemisphereLight(th.hemiS, th.hemiG, 0.75); scene.add(hemi);
  const sun = new THREE.DirectionalLight(th.sun, 1.9); sun.position.set(-span * 0.6, span * 1.1, span * 0.7);
  sun.castShadow = true; sun.shadow.mapSize.set(512, 512); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  const c = sun.shadow.camera; c.left = c.bottom = -span; c.right = c.top = span; c.near = 1; c.far = span * 4;
  scene.add(sun); scene.add(sun.target);
  const fill = new THREE.DirectionalLight('#ffd6f0', 0.55); fill.position.set(span, span * 0.4, -span); scene.add(fill);
  return { hemi, sun, fill };
}

function skyDome(scene, th) {
  const g = new THREE.SphereGeometry(600, 32, 16);
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { cTop: { value: new THREE.Color(th.top) }, cMid: { value: new THREE.Color(th.mid) }, cBot: { value: new THREE.Color(th.bot) }, sunDir: { value: new THREE.Vector3(-0.5, 0.35, -0.8).normalize() } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 cTop,cMid,cBot,sunDir; varying vec3 vP;
      void main(){ float h = vP.y; vec3 c = h > 0.12 ? mix(cMid, cTop, smoothstep(0.12, 0.75, h)) : mix(cBot, cMid, smoothstep(-0.05, 0.12, h));
        float s = max(dot(vP, sunDir), 0.0); c += vec3(1.0,0.93,0.82) * (pow(s, 64.0) * 0.9 + pow(s, 6.0) * 0.18);
        gl_FragColor = vec4(c, 1.0); }` });
  const s = new THREE.Mesh(g, m); s.renderOrder = -10; scene.add(s); return s;
}

function sea(scene, th, R) {
  const g = new THREE.PlaneGeometry(R * 2, R * 2, 48, 48); g.rotateX(-Math.PI / 2);
  const m = new PhysLite({ color: th.sea, roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true, opacity: 0.92, envMapIntensity: 1.2 });
  const u = { uT: { value: 0 }, deep: { value: new THREE.Color(th.seaDeep) } };
  m.onBeforeCompile = sh => {
    sh.uniforms.uT = u.uT; sh.uniforms.deep = u.deep;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT; varying float vWave; varying float vDist;')
      .replace('#include <begin_vertex>', `vec3 transformed = position;
        float w = sin(position.x*0.18+uT*1.1)*0.35 + sin(position.z*0.23-uT*0.8)*0.28 + sin((position.x+position.z)*0.5+uT*2.0)*0.08;
        transformed.y += w; vWave = w; vDist = length(position.xz);`)
      .replace('#include <beginnormal_vertex>', `vec3 objectNormal = normalize(vec3(-cos(position.x*0.18+uT*1.1)*0.063, 1.0, -cos(position.z*0.23-uT*0.8)*0.064));`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 deep; varying float vWave; varying float vDist;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb = mix(deep, diffuseColor.rgb, smoothstep(-0.5, 0.6, vWave));
        diffuseColor.rgb += vec3(1.0) * smoothstep(0.5, 0.7, vWave) * 0.35;`);
  };
  const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; scene.add(mesh);
  return u;
}

const pastel = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);

function mountains(scene, th, R0) {
  const grp = new THREE.Group(); scene.add(grp);
  const snow = new THREE.MeshStandardMaterial({ color: '#fff8fc', roughness: 0.55 });
  for (let i = 0; i < 26; i++) {
    const a = i / 26 * Math.PI * 2 + Math.sin(i * 7.3) * 0.08, r = R0 + 40 + (i % 3) * 38 + Math.abs(Math.sin(i * 3.1)) * 30;
    const h = 45 + Math.abs(Math.sin(i * 1.7)) * 70 + (i % 3) * 20, w = h * (0.7 + (i % 4) * 0.12);
    const col = pastel(th.mount[i % 4], th.fog, 0.15 + (i % 3) * 0.18);
    const m = new THREE.Mesh(new THREE.ConeGeometry(w, h, 7, 4), new THREE.MeshStandardMaterial({ color: col, roughness: 0.9, flatShading: true }));
    m.position.set(Math.cos(a) * r, h / 2 - 6, Math.sin(a) * r); m.rotation.y = i; grp.add(m);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(w * 0.28, h * 0.28, 7, 1), snow); cap.position.y = h * 0.36 + 0.3; cap.rotation.y = 0; m.add(cap);
  }
  return grp;
}

function candyTree(parent, x, y, z, s, hue) {
  const t = new THREE.Group(); t.position.set(x, y, z); t.scale.setScalar(s); parent.add(t);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 2.2, 8), new THREE.MeshStandardMaterial({ color: '#f7e2c8', roughness: 0.6 }));
  trunk.position.y = 1.1; trunk.castShadow = true; t.add(trunk);
  const cols = ['#ff9ec7', '#b9a2f7', '#7ee3c4', '#ffd36b', '#9fd0ff'];
  const crown = new THREE.MeshStandardMaterial({ color: cols[hue % cols.length], roughness: 0.35, emissive: cols[hue % cols.length], emissiveIntensity: 0.05 });
  for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.9 - k * 0.18, 18, 14), crown); b.position.set(Math.sin(k * 2.1) * 0.35, 2.4 + k * 0.6, Math.cos(k * 2.1) * 0.3); b.castShadow = true; t.add(b); }
  return t;
}

function island(scene, x, y, z, r, th, seed) {
  const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, 1.2, 14), new THREE.MeshStandardMaterial({ color: '#b6efc4', roughness: 0.8 }));
  top.receiveShadow = true; top.castShadow = true; g.add(top);
  const rock = new THREE.Mesh(new THREE.ConeGeometry(r * 0.9, r * 1.6, 9, 3), new THREE.MeshStandardMaterial({ color: pastel(th.mount[seed % 4], '#ffffff', 0.25), roughness: 0.9, flatShading: true }));
  rock.position.y = -r * 0.8 - 0.6; rock.rotation.x = Math.PI; g.add(rock);
  for (let i = 0; i < Math.max(2, r * 0.9); i++) { const a = i * 2.4 + seed, d = r * (0.25 + 0.55 * ((i * 0.37 + seed * 0.13) % 1)); candyTree(g, Math.cos(a) * d, 0.6, Math.sin(a) * d, 0.6 + ((i + seed) % 3) * 0.25, i + seed); }
  g.userData.phase = seed; return g;
}

function clouds(scene, R) {
  const grp = new THREE.Group(); scene.add(grp);
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: '#fff0f8', emissiveIntensity: 0.25, transparent: true, opacity: 0.93 });
  const sg = new THREE.SphereGeometry(1, 9, 6);
  for (let i = 0; i < 22; i++) {
    const c = new THREE.Group(); const a = i * 2.39, r = R * (0.55 + (i % 5) * 0.12);
    c.position.set(Math.cos(a) * r, 34 + (i % 4) * 10, Math.sin(a) * r); if (c.position.z > 0 && Math.abs(c.position.x) < R * 4) c.position.z = -c.position.z; const s = 3 + (i % 3) * 1.6; c.scale.setScalar(s);
    for (let k = 0; k < 5; k++) { const b = new THREE.Mesh(sg, m); b.position.set((k - 2) * 0.9, Math.sin(k * 1.3) * 0.3, Math.cos(k * 2.1) * 0.4); b.scale.setScalar(0.8 + Math.sin(k * 2.3 + i) * 0.35); c.add(b); }
    c.userData.sp = 0.6 + (i % 4) * 0.25; grp.add(c);
  }
  return grp;
}

function sparkles(scene, n = 260, R = 60) {
  const g = new THREE.BufferGeometry(); const p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, r = 8 + Math.random() * R; p[i * 3] = Math.cos(a) * r; p[i * 3 + 1] = 1 + Math.random() * 22; p[i * 3 + 2] = Math.sin(a) * r; }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,220,240,.6)'); gr.addColorStop(1, 'rgba(255,200,230,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const m = new THREE.PointsMaterial({ size: 0.55, map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.7 });
  const pts = new THREE.Points(g, m); scene.add(pts); return pts;
}

// Construye todo el decorado. R = radio de la zona de juego
export function buildWorld(scene, themeName = 'atardecer', R = 14) {
  const th = THEMES[themeName];
  scene.fog = new THREE.Fog(th.fog, R * 7, R * 30);
  scene.background = new THREE.Color(th.mid);
  skyDome(scene, th);
  const lights = addLights(scene, th, R * 1.6);
  const seaU = sea(scene, th, 420);
  mountains(scene, th, R * 9);
  const isl = [];
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + 0.3, r = R * (2.2 + (i % 3) * 0.7); isl.push(island(scene, Math.cos(a) * r, 1 + (i % 3) * 3.5, Math.sin(a) * r, 2.2 + (i % 4) * 1.1, th, i)); }
  const cl = clouds(scene, R * 9);
  const sp = sparkles(scene, 240, R * 3);
  return {
    th, lights, cl, isl,
    update(t) {
      seaU.uT.value = t;
      for (const g of isl) g.position.y += Math.sin(t * 0.6 + g.userData.phase) * 0.004;
      for (const c of cl.children) { c.position.x += 0.01 * c.userData.sp; if (c.position.x > R * 8) c.position.x = -R * 8; }
      sp.rotation.y = t * 0.02; sp.material.opacity = 0.55 + Math.sin(t * 2) * 0.15;
    },
  };
}

// Texto en canvas → textura (para números de casillas y operaciones)
export function textCanvas(w, h) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; }

// Partículas sencillas (confeti / salpicaduras)
export class Particles {
  constructor(scene, n = 400) {
    this.n = n; this.i = 0; this.v = new Float32Array(n * 3); this.life = new Float32Array(n);
    const g = new THREE.BufferGeometry(); this.p = new Float32Array(n * 3).fill(-999); this.c = new Float32Array(n * 3);
    g.setAttribute('position', new THREE.BufferAttribute(this.p, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.c, 3));
    const cv = document.createElement('canvas'); cv.width = cv.height = 32; const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.beginPath(); x.arc(16, 16, 14, 0, 7); x.fill();
    this.pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.32, map: new THREE.CanvasTexture(cv), vertexColors: true, transparent: true, alphaTest: 0.3 }));
    this.pts.frustumCulled = false; scene.add(this.pts);
  }
  burst(pos, color, n = 30, spd = 6, up = 4) {
    const c = new THREE.Color(color);
    for (let k = 0; k < n; k++) {
      const i = this.i = (this.i + 1) % this.n; const a = Math.random() * 6.28, s = spd * (0.3 + Math.random() * 0.7);
      this.p.set([pos.x, pos.y, pos.z], i * 3); this.v.set([Math.cos(a) * s, up * (0.5 + Math.random()), Math.sin(a) * s], i * 3);
      const cc = c.clone().offsetHSL((Math.random() - 0.5) * 0.15, 0, (Math.random() - 0.3) * 0.2); this.c.set([cc.r, cc.g, cc.b], i * 3); this.life[i] = 1 + Math.random() * 0.6;
    }
  }
  update(dt) {
    for (let i = 0; i < this.n; i++) { if (this.life[i] <= 0) continue; this.life[i] -= dt;
      this.v[i * 3 + 1] -= 14 * dt; for (let k = 0; k < 3; k++) this.p[i * 3 + k] += this.v[i * 3 + k] * dt;
      if (this.life[i] <= 0) this.p[i * 3 + 1] = -999; }
    this.pts.geometry.attributes.position.needsUpdate = true; this.pts.geometry.attributes.color.needsUpdate = true;
  }
}
