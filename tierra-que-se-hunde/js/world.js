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
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.8;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !/noshadows/.test(location.search); renderer.shadowMap.type = THREE.PCFSoftShadowMap; // v9: sombras reales finas (se apagan solas si va lento)
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 900);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.32;
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
  if (window.__fxNoche) window.__fxNoche.mejora3D(THREE, renderer, scene, { hemi: 0, env: .3 }); // noche 25-10: reflejos suaves
  return { renderer, scene, camera, composer, bloom, resize };
}

export function addLights(scene, th, span = 30) {
  const hemi = new THREE.HemisphereLight(th.hemiS, th.hemiG, 0.75); scene.add(hemi);
  const sun = new THREE.DirectionalLight(th.sun, 1.9); sun.position.set(-span * 0.6, span * 1.1, span * 0.7);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 3; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
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
  const m = new THREE.PointsMaterial({ size: 0.45, map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.45 });
  const pts = new THREE.Points(g, m); scene.add(pts); return pts;
}


// ---------- v18: decorado de fondo en capas (cielo, mar, islas lejanas, globos, pájaros, barcos, cascadas) ----------
function cvTex(w, h, f) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; f(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; }
function cloudBand(seed, tint, dens) {
  return cvTex(1024, 128, (x, w, h) => { let s = seed; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 60 * dens; i++) { const cx = r() * w, cy = h * (0.45 + r() * 0.35), R = 14 + r() * 34;
      for (const dx of [0, -w, w]) { const g = x.createRadialGradient(cx + dx, cy, 0, cx + dx, cy, R); g.addColorStop(0, tint); g.addColorStop(0.55, tint.replace(/[\d.]+\)$/, '0.5)')); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(cx + dx - R, cy - R, R * 2, R * 2); } } });
}
function decorLayers(scene, th, R) {
  const G = new THREE.Group(); scene.add(G); const upd = [];
  // 1) tres bandas de nubes a distinta distancia y velocidad (parallax al girar la cámara)
  const bands = [[560, 150, 70, 'rgba(255,240,250,0.9)', 1.2, 0.004], [500, 95, 46, 'rgba(255,225,240,0.85)', 1, -0.007], [440, 55, 30, 'rgba(255,255,255,0.95)', 0.8, 0.011]];
  bands.forEach(([rad, y, hh, tint, dens, sp], i) => { const tx = cloudBand(7 + i * 13, tint, dens); tx.wrapS = THREE.RepeatWrapping; tx.repeat.x = 2;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, hh, 64, 1, true), new THREE.MeshBasicMaterial({ map: tx, transparent: true, side: THREE.BackSide, depthWrite: false, fog: false, opacity: 0.9 - i * 0.05 }));
    m.position.y = y; m.renderOrder = -9 + i; G.add(m); upd.push(t => { m.rotation.y = t * sp; }); });
  // 2) brillos del sol sobre el mar (centelleo)
  { const n = 420, p = new Float32Array(n * 3), ph = new Float32Array(n); for (let i = 0; i < n; i++) { const a = -2.2 + (Math.random() - 0.5) * 1.3, r = 60 + Math.random() * 300; p[i * 3] = Math.cos(a) * r; p[i * 3 + 1] = 0.6; p[i * 3 + 2] = Math.sin(a) * r; ph[i] = Math.random() * 6.28; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 } },
      vertexShader: 'attribute float ph; uniform float uT; varying float vA; void main(){ vA = pow(max(0.0, sin(uT*2.5+ph*3.0)), 6.0); vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = (2.0+vA*9.0) * 300.0 / -mv.z; gl_Position = projectionMatrix*mv; }',
      fragmentShader: 'varying float vA; void main(){ vec2 d = gl_PointCoord-0.5; float r = length(d); float s = max(0.0, 1.0-r*2.0) + max(0.0, 1.0-abs(d.x)*14.0)*max(0.0,1.0-abs(d.y)*2.0)*0.6 + max(0.0, 1.0-abs(d.y)*14.0)*max(0.0,1.0-abs(d.x)*2.0)*0.6; gl_FragColor = vec4(vec3(1.0,0.97,0.88), s*vA); }' });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; G.add(pts); upd.push(t => { m.uniforms.uT.value = t; }); G.userData.glint = pts; }
  // 3) islas lejanas en silueta con niebla (otra capa de profundidad)
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 + 0.2, r = R * 5.2 + (i % 3) * 22; const s = 6 + (i % 4) * 3;
    const isl = new THREE.Group(); isl.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); G.add(isl);
    const hill = new THREE.Mesh(new THREE.SphereGeometry(s, 14, 8, 0, 6.283, 0, 1.5), new THREE.MeshStandardMaterial({ color: pastel('#9fe0b8', th.fog, 0.35), roughness: 0.9 })); hill.scale.y = 0.55; isl.add(hill);
    for (let k = 0; k < 3; k++) { const pt = new THREE.Group(); pt.position.set((k - 1) * s * 0.4, s * 0.45, Math.sin(k * 3 + i) * s * 0.25); isl.add(pt);
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, s * 0.6, 6), new THREE.MeshStandardMaterial({ color: '#e9cfae' })); tr.position.y = s * 0.3; tr.rotation.z = (k - 1) * 0.25; pt.add(tr);
      for (let f = 0; f < 5; f++) { const lf = new THREE.Mesh(new THREE.ConeGeometry(0.5, s * 0.55, 4), new THREE.MeshStandardMaterial({ color: '#7fd6a2', flatShading: true })); lf.position.y = s * 0.6; lf.rotation.set(1.25, f * 1.256, 0); lf.translateY(s * 0.25); pt.add(lf); }
      upd.push(t => { pt.rotation.z = Math.sin(t * 1.2 + i + k) * 0.05; }); }
    const foam = new THREE.Mesh(new THREE.RingGeometry(s * 0.95, s * 1.25, 32), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false })); foam.rotation.x = -Math.PI / 2; foam.position.y = 0.5; isl.add(foam);
    upd.push(t => { const k = 1 + Math.sin(t * 1.4 + i) * 0.06; foam.scale.set(k, k, 1); foam.material.opacity = 0.35 + Math.sin(t * 1.4 + i) * 0.15; }); }
  // 4) globos aerostáticos a la deriva
  const bc = ['#ff8fb8', '#ffd36b', '#8fd8ff', '#b9a2f7', '#7ee3c4', '#ffb08a'];
  for (let i = 0; i < 6; i++) { const b = new THREE.Group(); const env = new THREE.Mesh(new THREE.SphereGeometry(3, 20, 14), new THREE.MeshStandardMaterial({ color: bc[i], roughness: 0.4, emissive: bc[i], emissiveIntensity: 0.12 })); env.scale.y = 1.2; b.add(env);
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(3.02, 0.35, 8, 32), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 })); stripe.rotation.x = Math.PI / 2; b.add(stripe);
    const bas = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.6, 0.9, 10), new THREE.MeshStandardMaterial({ color: '#c9915f' })); bas.position.y = -4.6; b.add(bas);
    for (let k = 0; k < 4; k++) { const ro = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 4), new THREE.MeshBasicMaterial({ color: '#8a6a50' })); ro.position.set(Math.cos(k * 1.57) * 0.7, -3.5, Math.sin(k * 1.57) * 0.7); b.add(ro); }
    const a0 = i / 6 * 6.283, r = R * (3.2 + (i % 3) * 0.9), y0 = 22 + (i % 3) * 9; b.scale.setScalar(1 + (i % 2) * 0.5); G.add(b);
    upd.push(t => { const a = a0 + t * 0.012; b.position.set(Math.cos(a) * r, y0 + Math.sin(t * 0.5 + i) * 2, Math.sin(a) * r); b.rotation.z = Math.sin(t * 0.7 + i) * 0.05; }); }
  // 5) bandadas de pájaros (aleteo)
  const wingM = new THREE.MeshBasicMaterial({ color: '#6b4f86', side: THREE.DoubleSide, fog: true });
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, -0.3, 0, 0, 0.3, 1.4, 0, 0]), 3));
  for (let f = 0; f < 3; f++) { const fl = new THREE.Group(); G.add(fl); const birds = [];
    for (let i = 0; i < 7; i++) { const bd = new THREE.Group(); const l = new THREE.Mesh(wg, wingM), rr = new THREE.Mesh(wg, wingM); rr.scale.x = -1; bd.add(l, rr); bd.position.set(-Math.abs(i - 3) * 2.2, Math.sin(i) * 0.6, (i - 3) * 2); fl.add(bd); birds.push([l, rr, i]); }
    const r = R * (2.6 + f), y = 30 + f * 8, sp = 0.05 + f * 0.015, a0 = f * 2.1;
    upd.push(t => { const a = a0 + t * sp; fl.position.set(Math.cos(a) * r, y + Math.sin(t * 0.8 + f) * 1.5, Math.sin(a) * r); fl.rotation.y = -a; for (const [l, rr, i] of birds) { const w = Math.sin(t * 9 + i * 0.7) * 0.6; l.rotation.z = w; rr.rotation.z = -w; } }); }
  // 6) barquitos de vela meciéndose
  for (let i = 0; i < 5; i++) { const bt = new THREE.Group(); const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 0.9, 0.9, 12, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: ['#ff9ec7', '#9fd0ff', '#ffd36b', '#b9a2f7', '#7ee3c4'][i] })); hull.rotation.set(Math.PI / 2, 0, Math.PI / 2); hull.scale.set(1, 2.4, 1); bt.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.5, 6), new THREE.MeshStandardMaterial({ color: '#f7e2c8' })); mast.position.y = 2.3; bt.add(mast);
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 4.4, 0, 0, 0.6, 0, 0, 0.6, 2.6]), 3)); sg.computeVertexNormals();
    const sail = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ color: '#fffaf4', side: THREE.DoubleSide, emissive: '#ffffff', emissiveIntensity: 0.15 })); sail.position.x = 0.1; bt.add(sail);
    const a0 = i * 1.3 + 0.5, r = R * (3.6 + (i % 2)); bt.scale.setScalar(1.6); G.add(bt);
    upd.push(t => { const a = a0 + t * 0.008 * (i % 2 ? 1 : -1); bt.position.set(Math.cos(a) * r, 0.4 + Math.sin(t * 1.3 + i) * 0.3, Math.sin(a) * r); bt.rotation.set(Math.sin(t * 1.1 + i) * 0.08, -a, Math.cos(t * 0.9 + i) * 0.06); }); }
  // 7) arcoíris tenue al fondo
  { const tx = cvTex(8, 256, (x, w, h) => { const cs = ['#ff7aa8', '#ffb36b', '#ffe36b', '#8ff0a8', '#8fd0ff', '#b9a2f7']; cs.forEach((c, k) => { x.fillStyle = c; x.fillRect(0, h * (0.2 + k * 0.1), w, h * 0.1); }); });
    const rb = new THREE.Mesh(new THREE.RingGeometry(150, 185, 64, 1, 0, Math.PI), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, uniforms: { map: { value: tx }, uT: { value: 0 } },
      vertexShader: 'varying vec2 vU; varying vec3 vP; void main(){ vU = uv; vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform sampler2D map; uniform float uT; varying vec3 vP; void main(){ float r = (length(vP.xy)-150.0)/35.0; vec4 c = texture2D(map, vec2(0.5, 1.0-(0.2+r*0.6))); float a = smoothstep(0.0,0.15,r)*smoothstep(1.0,0.85,r)*smoothstep(0.0,40.0,vP.y)*(0.28+0.06*sin(uT*0.5)); gl_FragColor = vec4(c.rgb, a); }' }));
    rb.position.set(-120, -10, -380); rb.renderOrder = -5; G.add(rb); upd.push(t => { rb.material.uniforms.uT.value = t; }); }
  return { G, update(t) { const lv = (window.__Q && window.__Q.lv) || 0; if (G.userData.glint) G.userData.glint.visible = lv < 5; if (lv >= 6 && (t * 60 | 0) % 2) return; for (const f of upd) f(t); } };
}
// cascadas que caen de las islas flotantes
function waterfall(g, r, seed) {
  const tx = cvTex(32, 128, (x, w, h) => { for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.6})`; x.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 10 + Math.random() * 30); } });
  tx.wrapT = THREE.RepeatWrapping; tx.wrapS = THREE.RepeatWrapping;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 14, 10, 1, true), new THREE.MeshBasicMaterial({ map: tx, color: '#dff6ff', transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide }));
  const a = seed * 1.7; m.position.set(Math.cos(a) * r * 0.85, -7, Math.sin(a) * r * 0.85); g.add(m); return t => { tx.offset.y = t * 1.6 + seed; };
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
  const deco = decorLayers(scene, th, R); const wf = isl.filter((g, i) => i % 3 !== 1).map((g, i) => waterfall(g, 2.2 + (isl.indexOf(g) % 4) * 1.1, i));
  return {
    th, lights, cl, isl, deco,
    update(t) {
      seaU.uT.value = t; deco.update(t); for (const f of wf) f(t);
      for (const g of isl) g.position.y += Math.sin(t * 0.6 + g.userData.phase) * 0.004;
      for (const c of cl.children) { c.position.x += 0.01 * c.userData.sp; if (c.position.x > R * 8) c.position.x = -R * 8; }
      sp.rotation.y = t * 0.02; sp.material.opacity = 0.38 + Math.sin(t * 2) * 0.08;
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
    const cv = document.createElement('canvas'); cv.width = cv.height = 32; const x = cv.getContext('2d'); const gr = x.createRadialGradient(16, 16, 0, 16, 16, 15); gr.addColorStop(0, '#fff'); gr.addColorStop(.6, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
    this.pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.32, map: new THREE.CanvasTexture(cv), vertexColors: true, transparent: true, depthWrite: false }));
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
