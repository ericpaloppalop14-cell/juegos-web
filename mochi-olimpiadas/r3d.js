// ===== Mochi Olimpiadas · Remaster 3D =====
// Renderizador three.js que dibuja en 3D el estado de la lógica original (game.js).
// Las reglas no cambian: cada escena traduce las coordenadas del juego (px) a metros del mundo.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const V3 = THREE.Vector3, clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, k) => a + (b - a) * k;
const cv = document.getElementById('c3');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance', alpha: false }); }
catch (e) { console.info('Sin WebGL: modo 2D'); }
if (renderer) boot();

function boot() {
const QS = new URLSearchParams(location.search);
const Q = { level: QS.has('q') ? +QS.get('q') : 2, pr: 1, bloom: true };
function applyQ() {
  const dpr = window.devicePixelRatio || 1;
  Q.pr = Math.min(dpr, [1, 1.35, 1.75, 2][Q.level]); Q.bloom = Q.level >= 2;
  renderer.setPixelRatio(Q.pr); renderer.shadowMap.enabled = Q.level >= 1; resize();
  for (const k in SC) { const s = SC[k]; if (s && s.isScene) s.traverse(o => { if (o.material) o.material.needsUpdate = true; }); }
}
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1200);
const composer = new EffectComposer(renderer);
const rpass = new RenderPass(null, camera); composer.addPass(rpass);
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.55, 0.86); composer.addPass(bloom);
composer.addPass(new OutputPass());
function resize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); cv.style.width = w + 'px'; cv.style.height = h + 'px';
  composer.setPixelRatio(Q.pr); composer.setSize(w, h); bloom.setSize(Math.round(w * Q.pr / 2), Math.round(h * Q.pr / 2));
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
const pmrem = new THREE.PMREMGenerator(renderer);
const ENV_ROOM = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// ---------- texturas procedurales ----------
function rng(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function ctex(w, h, fn, o = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); fn(x, w, h);
  const t = new THREE.CanvasTexture(c); if (o.srgb !== false) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO;
  if (o.rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(o.rep[0], o.rep[1]); }
  return t;
}
function noise(x, w, h, a, seed, sz = 1) { const R = rng(seed); for (let i = 0; i < w * h * 0.25 / sz; i++) { const v = R(); x.fillStyle = v > 0.5 ? `rgba(255,255,255,${a * R()})` : `rgba(0,0,0,${a * R()})`; x.fillRect(R() * w, R() * h, sz, sz); } }
function normalTex(size, seed, scale, strength, rep) {
  const R = rng(seed), N = 64, g = new Float32Array(N * N); for (let i = 0; i < g.length; i++) g[i] = R();
  const smp = (u, v) => { u = (u % N + N) % N; v = (v % N + N) % N; const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, s = t => t * t * (3 - 2 * t);
    const a = g[j * N + i], b = g[j * N + (i + 1) % N], c = g[((j + 1) % N) * N + i], d = g[((j + 1) % N) * N + (i + 1) % N]; return lerp(lerp(a, b, s(fu)), lerp(c, d, s(fu)), s(fv)); };
  const hgt = (x, y) => { let v = 0, f = 1, a = 1; for (let o = 0; o < 4; o++) { v += smp(x * f, y * f) * a; f *= 2; a *= 0.5; } return v; };
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'), d = x.createImageData(size, size);
  const k = scale * 4 / size;
  for (let y = 0; y < size; y++) for (let xx = 0; xx < size; xx++) { const h0 = hgt(xx * k, y * k), hx = hgt((xx + 1) * k, y * k), hy = hgt(xx * k, (y + 1) * k);
    const nx = (h0 - hx) * strength * 10, ny = (h0 - hy) * strength * 10, l = Math.hypot(nx, ny, 1); const i = (y * size + xx) * 4;
    d.data[i] = (nx / l * 0.5 + 0.5) * 255; d.data[i + 1] = (ny / l * 0.5 + 0.5) * 255; d.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = THREE.NoColorSpace; return t;
}
const TEX = {};
TEX.grass = () => TEX._grass || (TEX._grass = ctex(512, 512, (x, w, h) => {
  x.fillStyle = '#4f8a3c'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(0, 0, w / 2, h);
  const R = rng(5); for (let i = 0; i < 26000; i++) { const g = 90 + R() * 70; x.fillStyle = `rgba(${g * 0.55 | 0},${g | 0},${g * 0.4 | 0},${0.25 + R() * 0.4})`; x.fillRect(R() * w, R() * h, 1.2, 2 + R() * 3); }
  noise(x, w, h, 0.05, 7, 2);
}, { rep: [1, 1] }));
TEX.tartan = () => TEX._tartan || (TEX._tartan = ctex(256, 256, (x, w, h) => { x.fillStyle = '#a4472f'; x.fillRect(0, 0, w, h); noise(x, w, h, 0.22, 11, 1); noise(x, w, h, 0.08, 12, 3); }, { rep: [1, 1] }));
TEX.concrete = () => TEX._conc || (TEX._conc = ctex(256, 256, (x, w, h) => { x.fillStyle = '#b9b4ad'; x.fillRect(0, 0, w, h); noise(x, w, h, 0.12, 21, 1); noise(x, w, h, 0.06, 22, 4); }, { rep: [1, 1] }));
TEX.soft = () => TEX._soft || (TEX._soft = ctex(128, 128, (x, w, h) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }));
TEX.cloud = () => TEX._cloud || (TEX._cloud = ctex(256, 128, (x, w, h) => { const R = rng(31); for (let i = 0; i < 26; i++) { const cx = 40 + R() * 176, cy = 50 + R() * 40 - Math.abs(cx - 128) * 0.15, r = 18 + R() * 30, g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(0.6, 'rgba(250,248,255,.25)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); } }));
function label(text, o = {}) {
  const fs = o.fs || 64, pad = 18; const m = document.createElement('canvas').getContext('2d'); m.font = `700 ${fs}px Fredoka, sans-serif`; const tw = Math.ceil(m.measureText(text).width) + pad * 2;
  const t = ctex(tw, fs + pad * 2, (x, w, h) => { if (o.bg) { x.fillStyle = o.bg; x.beginPath(); x.roundRect(2, 2, w - 4, h - 4, h / 2); x.fill(); }
    x.font = `700 ${fs}px Fredoka, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; if (o.stroke) { x.lineWidth = fs * 0.16; x.strokeStyle = o.stroke; x.strokeText(text, w / 2, h / 2 + 3); } x.fillStyle = o.col || '#fff'; x.fillText(text, w / 2, h / 2 + 3); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false })); const hh = o.h || 0.5; s.scale.set(hh * tw / (fs + pad * 2), hh, 1); return s;
}
const M = {
  std: (c, r = 0.7, m = 0, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...o }),
  phys: (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, ...o }),
};
const MAT = {
  white: M.std('#f4f1ec', 0.5), wood: M.std('#8a5a36', 0.55), darkWood: M.std('#4a2e1d', 0.5), metal: M.std('#c8ccd4', 0.28, 0.9), gold: M.std('#e0b24a', 0.25, 1, { emissive: '#3a2600' }),
  silver: M.std('#d4d8e0', 0.25, 1), bronze: M.std('#b87333', 0.3, 1), rope: M.std('#d9c7a3', 0.9), black: M.std('#1d1820', 0.4),
};
// ---------- cielo ----------
function skyDome(o) {
  const u = { top: { value: new THREE.Color(o.top) }, hor: { value: new THREE.Color(o.hor) }, bot: { value: new THREE.Color(o.bot || o.hor) }, sun: { value: new V3(...(o.sun || [0.4, 0.5, -1])).normalize() }, sunC: { value: new THREE.Color(o.sunC || '#fff2d8') }, night: { value: 0 } };
  const m = new THREE.ShaderMaterial({ uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = (modelMatrix*vec4(position,1.)).xyz - cameraPosition; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position.z = gl_Position.w; }',
    fragmentShader: `uniform vec3 top,hor,bot,sunC,sun; uniform float night; varying vec3 vD;
      float h(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453); }
      void main(){ vec3 d=normalize(vD); float y=d.y; vec3 c = y>0. ? mix(hor,top,pow(clamp(y,0.,1.),.55)) : mix(hor,bot,clamp(-y*4.,0.,1.));
        float s = max(dot(d,sun),0.); c += sunC*(pow(s,900.)*4. + pow(s,40.)*.35 + pow(s,6.)*.12);
        c = mix(c, vec3(.05,.06,.16)+top*.15, night*smoothstep(-.05,.3,y));
        if(night>0.){ vec3 q=floor(d*180.); float st=step(.9965,h(q)); c+=vec3(st*night*smoothstep(0.,.2,y)); }
        gl_FragColor=vec4(c,1.); }` });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), m); mesh.renderOrder = -10; mesh.frustumCulled = false; mesh.userData.u = u; return mesh;
}
function envFromSky(o) { const s = new THREE.Scene(); s.add(skyDome(o)); const gnd = new THREE.Mesh(new THREE.CircleGeometry(500, 24), new THREE.MeshBasicMaterial({ color: o.gnd || '#4b6b3a' })); gnd.rotation.x = -Math.PI / 2; gnd.position.y = -5; s.add(gnd); return pmrem.fromScene(s, 0.02).texture; }
function clouds(root, n, seed, rad = [180, 300], hgt = [50, 110]) { const R = rng(seed); for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.cloud(), transparent: true, depthWrite: false, opacity: 0.75 + R() * 0.25, fog: false })); const a = R() * Math.PI * 2 * 0.55 + Math.PI * 0.72, r = rad[0] + R() * (rad[1] - rad[0]);
  s.position.set(Math.cos(a) * r, hgt[0] + R() * (hgt[1] - hgt[0]), Math.sin(a) * r); const sc = 60 + R() * 70; s.scale.set(sc, sc / 2, 1); s.userData.drift = 0.5 + R(); root.add(s); } }
function sunLight(scene, dir, color, intens, box, mapSize = 1024) {
  const l = new THREE.DirectionalLight(color, intens); l.position.copy(new V3(...dir).normalize().multiplyScalar(40)); l.castShadow = true;
  l.shadow.mapSize.set(mapSize, mapSize); const c = l.shadow.camera; c.left = -box; c.right = box; c.top = box; c.bottom = -box; c.near = 1; c.far = 120; l.shadow.bias = -0.0004; l.shadow.normalBias = 0.03; l.shadow.radius = 4;
  scene.add(l); scene.add(l.target); l.userData.dir = new V3(...dir).normalize().multiplyScalar(40); return l;
}
function follow(l, p) { l.target.position.copy(p); l.position.copy(p).add(l.userData.dir); }
// ---------- público instanciado (mochis que botan con un shader) ----------
const CROWD_COLS = ['#efc9d4', '#d9cdee', '#f2e2bf', '#c9e2d4', '#c8d8ec', '#e9d6c8', '#f4f0ea', '#d8b9c9'].map(c => new THREE.Color(c));
function crowdMesh(pos, seed, size = 0.42) {
  const geo = new THREE.SphereGeometry(0.5, 10, 7); geo.scale(1.1, 0.85, 1); geo.translate(0, 0.38, 0);
  const mat = M.phys('#ffffff', { roughness: 0.6, sheen: 0.6, sheenColor: new THREE.Color('#fff') }); const U = { uT: { value: 0 }, uA: { value: 0.06 } };
  mat.onBeforeCompile = sh => { sh.uniforms.uT = U.uT; sh.uniforms.uA = U.uA; sh.vertexShader = 'uniform float uT; uniform float uA;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n float iid = float(gl_InstanceID); transformed.y += max(0., sin(uT*(5.+mod(iid,3.)) + iid*1.73))*uA/0.42;'); };
  const im = new THREE.InstancedMesh(geo, mat, pos.length), R = rng(seed), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  pos.forEach((p, i) => { const s = size * (0.85 + R() * 0.3); m4.compose(p, q, new V3(s, s, s)); im.setMatrixAt(i, m4); im.setColorAt(i, CROWD_COLS[Math.floor(R() * CROWD_COLS.length)]); });
  im.userData.U = U; im.receiveShadow = true; return im;
}
function standsLine(root, x0, x1, z, rows, seed, o = {}) {
  const dep = 0.9, rise = 0.55, conc = M.std('#cfc9c0', 0.85, 0, { map: TEX.concrete() }), seat = M.std(o.seat || '#6b3a4d', 0.6);
  const L = x1 - x0, pos = [], R = rng(seed);
  for (let r = 0; r < rows; r++) { const st = new THREE.Mesh(new THREE.BoxGeometry(L, rise * (r + 1), dep), conc); st.position.set((x0 + x1) / 2, rise * (r + 1) / 2, z - r * dep); st.receiveShadow = true; root.add(st);
    const sb = new THREE.Mesh(new THREE.BoxGeometry(L, 0.12, 0.3), seat); sb.position.set((x0 + x1) / 2, rise * (r + 1) + 0.06, z - r * dep - 0.2); root.add(sb);
    for (let x = x0 + 0.4 + (r % 2) * 0.25; x < x1 - 0.3; x += 0.62) if (R() > (o.empty || 0.12)) pos.push(new V3(x + (R() - 0.5) * 0.12, rise * (r + 1) + 0.05, z - r * dep - 0.05)); }
  const back = new THREE.Mesh(new THREE.BoxGeometry(L, rise * rows + 2.5, 0.4), conc); back.position.set((x0 + x1) / 2, (rise * rows + 2.5) / 2, z - rows * dep); root.add(back);
  const roofY = rise * rows + 3.2, roof = new THREE.Mesh(new THREE.BoxGeometry(L + 1, 0.18, rows * dep + 1.6), M.std('#e9e6e0', 0.5, 0.2)); roof.position.set((x0 + x1) / 2, roofY, z - rows * dep / 2 + 0.3); roof.rotation.x = -0.06; roof.castShadow = true; root.add(roof);
  for (let x = x0; x <= x1 + 0.01; x += Math.max(6, L / 6)) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, roofY, 8), MAT.metal); p.position.set(x, roofY / 2, z - rows * dep); root.add(p); }
  const lampM = new THREE.MeshBasicMaterial({ color: '#fff6e0' }); for (let x = x0 + 2; x < x1; x += 4) { const lp = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.3), lampM); lp.position.set(x, roofY - 0.14, z + 0.6); root.add(lp); }
  const ad = ctex(1024, 64, (x, w, h) => { const cols = ['#2b2440', '#3b1f2c', '#1f3330']; const msgs = ['MOCHI OLIMPIADAS', 'DANGO ENERGY', 'MOCHI SPORTS', 'SAKURA CUP', 'MOCHI OLIMPIADAS', 'TEAM MOCHI'];
    msgs.forEach((t, i) => { x.fillStyle = cols[i % 3]; x.fillRect(i * w / 6, 0, w / 6, h); x.font = '700 30px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = i % 2 ? '#f3c6d3' : '#f2d27a'; x.fillText(t, i * w / 6 + w / 12, h / 2 + 2); }); }, { rep: [Math.max(1, Math.round(L / 24)), 1] });
  const dk = M.std('#222', 0.5), board = new THREE.Mesh(new THREE.BoxGeometry(L, 0.9, 0.12), [dk, dk, dk, dk, M.std('#fff', 0.45, 0, { map: ad, emissive: '#ffffff', emissiveMap: ad, emissiveIntensity: 0.35 }), dk]);
  board.position.set((x0 + x1) / 2, 0.45, z + 0.9); board.castShadow = true; board.receiveShadow = true; root.add(board);
  const crowd = crowdMesh(pos, seed + 1); root.add(crowd); return crowd;
}
// ---------- el Mochi en 3D ----------
const MOCHI_HEX = '#f0b8ca';
function mochiProfile() { const pts = []; const yc = 0.3, rx = 0.56, ryT = 0.52, ryB = 0.3;
  for (let i = 0; i <= 28; i++) { const th = -Math.PI / 2 + i / 28 * Math.PI, c = Math.cos(th), s = Math.sin(th); const ex = th < 0 ? 0.45 : 0.85; const r = rx * Math.pow(Math.max(0, c), ex); pts.push(new THREE.Vector2(Math.max(0.0001, r), yc + s * (th > 0 ? ryT : ryB))); }
  return pts; }
const PROF = mochiProfile(), rAt = y => { for (let i = 1; i < PROF.length; i++) if (PROF[i].y >= y) { const a = PROF[i - 1], b = PROF[i], k = (y - a.y) / Math.max(1e-6, b.y - a.y); return lerp(a.x, b.x, k); } return 0; };
const GEO = {}; GEO.body = new THREE.LatheGeometry(PROF, 48); GEO.body.computeVertexNormals();
GEO.sph = new THREE.SphereGeometry(1, 20, 14); GEO.sphL = new THREE.SphereGeometry(1, 12, 8);
GEO.arc = new THREE.TorusGeometry(0.07, 0.016, 6, 18, Math.PI); GEO.ring = new THREE.TorusGeometry(0.055, 0.012, 6, 20);
GEO.circ = new THREE.CircleGeometry(1, 20);
const FACE = { eye: M.std('#24152c', 0.12, 0, { envMapIntensity: 1.6 }), white: new THREE.MeshBasicMaterial({ color: '#ffffff' }), line: M.std('#2e1b35', 0.5), blush: new THREE.MeshBasicMaterial({ color: '#ff7f9f', transparent: true, opacity: 0.32, depthWrite: false }), mouth: M.std('#a8435e', 0.5), sweat: M.phys('#bfe3ff', { roughness: 0.05, transparent: true, opacity: 0.75 }) };
function mochiMat(hex) { return M.phys(hex, { roughness: 0.58, sheen: 1, sheenRoughness: 0.42, sheenColor: new THREE.Color('#ffffff'), clearcoat: 0.18, clearcoatRoughness: 0.55, emissive: new THREE.Color(hex).multiplyScalar(0.05) }); }
function onSurf(x, y, push = 0) { const r = rAt(y); const z = Math.sqrt(Math.max(0.0001, r * r - x * x)); return [x * (1 + push), y, z * (1 + push) + push * 0.02]; }
function makeMochi(hex = MOCHI_HEX) {
  const root = new THREE.Group(), g = new THREE.Group(); root.add(g); const mat = mochiMat(hex), dark = mochiMat(new THREE.Color(hex).lerp(new THREE.Color('#9a5a7a'), 0.25).getStyle());
  const body = new THREE.Mesh(GEO.body, mat); body.castShadow = true; body.receiveShadow = true; g.add(body);
  const feet = [-1, 1].map(s => { const f = new THREE.Mesh(GEO.sph, dark); f.scale.set(0.15, 0.08, 0.17); f.position.set(s * 0.21, 0.045, 0.16); f.castShadow = true; g.add(f); return f; });
  const arms = [-1, 1].map(() => { const a = new THREE.Mesh(GEO.sph, mat); a.scale.set(0.075, 0.115, 0.075); a.castShadow = true; g.add(a); return a; });
  const face = new THREE.Group(); g.add(face); const eyes = [];
  for (const s of [-1, 1]) { const ex = s * 0.175, ey = 0.47, p = onSurf(ex, ey), ry = Math.asin(ex / rAt(ey));
    const eg = new THREE.Group(); eg.position.set(...p); eg.rotation.y = ry; face.add(eg);
    const open = new THREE.Group(); eg.add(open); const ball = new THREE.Mesh(GEO.sph, FACE.eye); ball.scale.set(0.082, 0.102, 0.035); open.add(ball);
    const h1 = new THREE.Mesh(GEO.sphL, FACE.white); h1.scale.set(0.03, 0.026, 0.012); h1.position.set(-0.026, 0.038, 0.03); open.add(h1);
    const h2 = new THREE.Mesh(GEO.sphL, FACE.white); h2.scale.setScalar(0.013); h2.position.set(0.028, -0.036, 0.03); open.add(h2);
    const arc = new THREE.Mesh(GEO.arc, FACE.line); arc.position.z = 0.012; eg.add(arc);
    const ring = new THREE.Mesh(GEO.ring, FACE.line); ring.position.z = 0.012; eg.add(ring);
    const brow = new THREE.Mesh(GEO.sphL, FACE.line); brow.scale.set(0.085, 0.014, 0.012); brow.position.set(0, 0.13, 0); eg.add(brow);
    eyes.push({ eg, open, arc, ring, brow, s });
    const bl = new THREE.Mesh(GEO.circ, FACE.blush); bl.position.set(...onSurf(s * 0.3, 0.37, 0.012)); bl.rotation.y = Math.asin(s * 0.3 / rAt(0.37)); bl.scale.set(0.075, 0.045, 1); face.add(bl); }
  const mp = onSurf(0, 0.37); const smile = new THREE.Mesh(GEO.arc, FACE.line); smile.scale.setScalar(0.75); smile.rotation.z = Math.PI; smile.position.set(mp[0], mp[1] + 0.035, mp[2] + 0.004); face.add(smile);
  const mouth = new THREE.Mesh(GEO.sph, FACE.mouth); mouth.scale.set(0.045, 0.055, 0.02); mouth.position.set(mp[0], mp[1], mp[2] - 0.004); face.add(mouth);
  const band = new THREE.Group(); g.add(band); { const by = 0.66, br = rAt(by); const t = new THREE.Mesh(new THREE.TorusGeometry(br + 0.004, 0.032, 8, 48), M.std('#c8455f', 0.75)); t.rotation.x = Math.PI / 2; t.position.y = by; t.scale.z = 1.6; band.add(t);
    const knot = new THREE.Mesh(GEO.sphL, M.std('#b53a53', 0.75)); knot.scale.set(0.05, 0.045, 0.04); knot.position.set(br * 0.7, by, -br * 0.7); band.add(knot);
    band.userData.tails = [0, 1].map(i => { const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.012), M.std('#c8455f', 0.75, 0, { side: THREE.DoubleSide })); tl.geometry.translate(0, -0.12, 0); tl.position.set(br * 0.74, by, -br * 0.74); tl.rotation.set(0.3, Math.PI * 0.75, (i ? 1 : -1) * 0.5 + 1.2); band.add(tl); return tl; }); }
  const sweat = new THREE.Mesh(GEO.sph, FACE.sweat); sweat.scale.set(0.035, 0.05, 0.03); g.add(sweat);
  const blinkPh = Math.random() * 3;
  function set(m = {}, T = 0, size = 1) {
    const br = m.still ? 0 : Math.sin(T * 3 + (m.seed || 0)) * 0.025;
    g.scale.set((m.sx || 1) * (1 + br), (m.sy || 1) * (1 - br), (m.sx || 1) * (1 + br)); g.rotation.z = -(m.rot || 0); g.rotation.x = m.tilt || 0; root.scale.setScalar(size);
    const f = m.face || 'idle', blink = (f === 'idle' || f === 'wow') && !m.still && ((T + blinkPh) % 3.4) < 0.12;
    for (const e of eyes) { e.open.position.set((m.lookX || 0) * 0.02, (m.lookY || 0) * 0.015, 0);
      const sc = f === 'wow' ? 1.28 : f === 'focus' ? 0.86 : 1; e.open.scale.set(sc, blink ? 0.12 : sc, 1);
      e.open.visible = !(f === 'happy' || f === 'squish' || f === 'dizzy'); e.arc.visible = f === 'happy' || f === 'squish'; e.ring.visible = f === 'dizzy'; e.brow.visible = f === 'focus' || f === 'squish';
      if (f === 'squish') { e.arc.rotation.z = e.s > 0 ? Math.PI / 2 : -Math.PI / 2; e.arc.scale.set(0.9, 0.9, 1); } else { e.arc.rotation.z = 0; e.arc.scale.set(1, 1, 1); }
      if (f === 'dizzy') e.ring.rotation.z = T * 8 * e.s; e.brow.rotation.z = -e.s * 0.25; }
    const open = f === 'wow' || f === 'squish'; mouth.visible = open || f === 'happy'; smile.visible = !open && f !== 'happy'; if (f === 'happy') mouth.scale.set(0.05, 0.035, 0.02); else mouth.scale.set(0.042, 0.052, 0.02);
    const fl = m.foot || 0; feet[0].position.y = 0.045 + Math.max(0, fl) * 0.07; feet[1].position.y = 0.045 + Math.max(0, -fl) * 0.07;
    const up = m.armsUp, wv = up ? Math.sin(T * 14) * 0.15 : 0;
    arms.forEach((a, i) => { const s = i ? 1 : -1; if (up) { a.position.set(s * 0.46, 0.66, 0.02); a.rotation.set(0, 0, -s * (0.45 + wv)); } else { a.position.set(s * 0.43, 0.24, 0.12); a.rotation.set(0.3, 0, s * 0.9); } });
    band.visible = !!m.band; if (m.band) band.userData.tails.forEach((t, i) => t.rotation.z = (i ? 1 : -1) * 0.5 + 1.2 + Math.sin(T * 9 + i) * 0.15);
    sweat.visible = !!m.sweat; if (m.sweat) { const k = (T * 1.5) % 1; sweat.position.set(0.44, 0.78 - k * 0.3, 0.18); }
    if (m.alpha != null) { mat.transparent = m.alpha < 1; mat.opacity = m.alpha; } }
  root.userData.set = set; root.userData.mat = mat; return root;
}
function blob(r = 0.5, a = 0.35) { const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: TEX.soft(), color: '#000', transparent: true, opacity: a, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.012; m.renderOrder = 1; return m; }
// ---------- escenas ----------
const SC = {}; let curScene = null, curKey = null, H = 800;
function baseScene() { return new THREE.Scene(); }
function outdoor(s, o) {
  const sky = skyDome(o); s.add(sky); s.userData.sky = sky; s.environment = envFromSky(o); s.environmentIntensity = o.envI || 0.75; s.fog = new THREE.Fog(o.fog || o.hor, o.fogN || 60, o.fogF || 260);
  s.add(new THREE.HemisphereLight(o.hemiT || '#dfe9ff', o.hemiB || '#4a5d35', o.hemiI || 0.55)); const sun = sunLight(s, o.sun || [0.4, 0.5, -1], o.sunL || '#fff1dc', o.sunI || 2.4, o.box || 16, o.map || 1024); s.userData.sun = sun;
  clouds(s, o.clouds == null ? 9 : o.clouds, 77); return sun; }
function groundPlane(s, w, d, mat, y = 0) { const g = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); g.rotation.x = -Math.PI / 2; g.position.y = y; g.receiveShadow = true; s.add(g); return g; }
function grassMat(rx, ry) { const t = TEX.grass().clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return M.std('#ffffff', 0.92, 0, { map: t }); }
function tartanMat(rx, ry) { const t = TEX.tartan().clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return M.std('#fff', 0.85, 0, { map: t }); }
// ===== Menú: estadio olímpico =====
SC.menu = () => {
  const s = baseScene(); const sun = outdoor(s, { top: '#5d8fd6', hor: '#f6dcc4', sun: [0.6, 0.35, -0.7], sunL: '#ffe2c2', sunI: 2.6, box: 22 });
  groundPlane(s, 400, 400, grassMat(60, 60), -0.01);
  const tr = TEX.tartan().clone(); tr.needsUpdate = true; tr.repeat.set(30, 1);
  const lanes = ctex(64, 512, (x, w, h) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; for (let i = 0; i <= 6; i++) x.fillRect(0, Math.min(h - 4, i * (h - 4) / 6), w, 4); }, { srgb: false });
  const rin = 9, rout = 12.6, len = 14;
  const oval = r => { const p = []; for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2; const side = Math.cos(a) > 0 ? 1 : -1; p.push(new THREE.Vector2(Math.cos(a) * r + side * len / 2, Math.sin(a) * r)); } return p; };
  const outer = oval(rout), inner = oval(rin); const geo = new THREE.BufferGeometry(), P = [], UV = [], I = [];
  for (let i = 0; i <= 64; i++) { P.push(outer[i].x, 0, outer[i].y, inner[i].x, 0, inner[i].y); UV.push(i / 64 * 30, 1, i / 64 * 30, 0); if (i < 64) { const a = i * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); geo.setIndex(I); geo.computeVertexNormals();
  const tmat = M.std('#ffffff', 0.85, 0, { map: tr, side: THREE.DoubleSide }); tmat.onBeforeCompile = sh => { sh.uniforms.lanes = { value: lanes }; sh.fragmentShader = 'uniform sampler2D lanes;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n float ln = texture2D(lanes, vec2(.5, fract(vMapUv.y))).r; diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.92), ln*.9);'); };
  const track = new THREE.Mesh(geo, tmat); track.position.y = 0.01; track.receiveShadow = true; s.add(track);
  const crowds = []; crowds.push(standsLine(s, -20, 20, -15.5, 12, 1)); const st2 = new THREE.Group(); crowds.push(standsLine(st2, -20, 20, -15.5, 12, 2)); st2.rotation.y = Math.PI; s.add(st2);
  for (const sd of [-1, 1]) { const g2 = new THREE.Group(); crowds.push(standsLine(g2, -14, 14, -24, 12, 3 + sd)); g2.rotation.y = sd * Math.PI / 2; s.add(g2); }
  const ped = new THREE.Group(); ped.position.set(0, 0, -13.2); s.add(ped); const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 6, 16), MAT.white); col.position.y = 3; col.castShadow = true; ped.add(col);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.4, 0.8, 24, 1, true), MAT.gold); bowl.position.y = 6.3; ped.add(bowl);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.2, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#ffb35c', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })); flame.position.y = 7.6; ped.add(flame);
  const flame2 = new THREE.Mesh(flame.geometry, new THREE.MeshBasicMaterial({ color: '#fff0b8', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); flame2.scale.set(0.5, 0.7, 0.5); flame2.position.y = 7.3; ped.add(flame2);
  const fl = new THREE.PointLight('#ffb067', 6, 18, 2); fl.position.y = 7.4; ped.add(fl);
  const pod = new THREE.Group(); s.add(pod); [[0, 1.0, MAT.gold], [-1.3, 0.7, MAT.silver], [1.3, 0.5, MAT.bronze]].forEach(([x, h, m]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(1.25, h, 1.1), M.std('#f2efe9', 0.45)); b.position.set(x, h / 2, 0); b.castShadow = b.receiveShadow = true; pod.add(b);
    const st = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.08, 1.11), m); st.position.set(x, h - 0.04, 0); pod.add(st); });
  const mo = makeMochi(); mo.position.set(0, 1, 0.05); s.add(mo); const sh = blob(0.7, 0.4); sh.position.set(0, 1.012, 0.05); s.add(sh);
  const ring = new THREE.Group(); ring.visible = false; s.add(ring); ['#3b6fb6', '#1f1b22', '#c2443f', '#e3b341', '#3f8f4f'].forEach((c, i) => { const t = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 10, 40), M.std(c, 0.3, 0.6)); t.position.set((i - 2) * 0.62, i % 2 ? 3.35 : 3.65, -2.6); t.castShadow = true; ring.add(t); });
  s.userData.update = (e, dt, T) => { const b = Math.abs(Math.sin(T * 2.6)); mo.position.y = 1 + b * 0.55; sh.scale.setScalar(1 - b * 0.4); mo.rotation.y = Math.sin(T * 0.7) * 0.4;
    mo.userData.set({ sx: 1 + (1 - b) * 0.12, sy: 1 - (1 - b) * 0.12 + b * 0.05, face: 'happy', armsUp: b > 0.5, band: true }, T, 1.25);
    flame.scale.set(1 + Math.sin(T * 13) * 0.08, 1 + Math.sin(T * 9) * 0.12, 1); flame.rotation.y = T; fl.intensity = 5 + Math.sin(T * 17) * 1.2; ring.rotation.y = Math.sin(T * 0.5) * 0.15;
    for (const c of crowds) { c.userData.U.uT.value = T; c.userData.U.uA.value = 0.07; }
    const a = Math.sin(T * 0.08) * 0.7; camera.fov = 50; camera.position.set(Math.sin(a) * 9.5, 1.9 + Math.sin(T * 0.3) * 0.2, Math.cos(a) * 9.5 + 0.5); camera.lookAt(0, -0.2, -1); follow(sun, new V3(0, 0, 0)); };
  return s;
};
// ===== 1) Bolos: bolera con madera barnizada, neón y focos =====
SC.bolos = () => {
  const s = baseScene(), K = 40, Y0 = H - 120, X = x => (x - 200) / K, Z = y => (y - Y0) / K;
  s.userData.map = (x, y) => new V3(X(x), 0, Z(y)); s.userData.inv = v => [v.x * K + 200, v.z * K + Y0]; s.userData.plane = new THREE.Plane(new V3(0, 1, 0), 0);
  s.background = new THREE.Color('#0c0a12'); s.environment = ENV_ROOM; s.environmentIntensity = 0.55; s.fog = new THREE.Fog('#0c0a12', 20, 48);
  const L = 92, R = 308, zWall = Z(92), zEnd = Z(H + 260), len = zEnd - zWall, w = (R - L) / K;
  const lane = ctex(512, 2048, (x, cw, ch) => { const sy = ch / (H + 260 - 92), sx = cw / (R - L), Rr = rng(7);
    for (let i = 0; i < 39; i++) { const t = Rr(); x.fillStyle = `rgb(${200 + t * 30 | 0},${150 + t * 28 | 0},${98 + t * 25 | 0})`; x.fillRect(i * cw / 39, 0, cw / 39 + 1, ch); }
    for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(${90 + Rr() * 40 | 0},${50 + Rr() * 20 | 0},20,${0.05 + Rr() * 0.08})`; x.fillRect(Rr() * cw, Rr() * ch, 1, 10 + Rr() * 60); }
    x.fillStyle = 'rgba(70,40,20,.35)'; for (let i = 0; i < 39; i++) x.fillRect(i * cw / 39, 0, 1, ch);
    const yy = y => (y - 92) * sy, xx = v => (v - L) * sx; x.fillStyle = '#7a2436';
    for (let i = -3; i <= 3; i++) { const y0 = yy(H - 290 + Math.abs(i) * 14); x.beginPath(); x.moveTo(xx(200 + i * 26), y0); x.lineTo(xx(200 + i * 26 - 6), y0 + 16 * sy); x.lineTo(xx(200 + i * 26 + 6), y0 + 16 * sy); x.fill(); }
    for (let i = -2; i <= 2; i++) { x.beginPath(); x.arc(xx(200 + i * 26), yy(H - 190), 2.5 * sx, 0, 7); x.fill(); }
    x.fillStyle = '#2a1a22'; x.fillRect(0, yy(H - 165), cw, 3 * sy);
    const pd = x.createLinearGradient(0, 0, 0, yy(250)); pd.addColorStop(0, 'rgba(255,240,215,.35)'); pd.addColorStop(1, 'rgba(255,240,215,0)'); x.fillStyle = pd; x.fillRect(0, 0, cw, yy(250)); });

  const laneMat = M.phys('#ffffff', { map: lane, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06 });
  const lg = new THREE.PlaneGeometry(w, len); lg.rotateX(-Math.PI / 2); const lm = new THREE.Mesh(lg, laneMat); lm.position.set(0, 0, zWall + len / 2); lm.receiveShadow = true; s.add(lm);
  const under = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, len), MAT.darkWood); under.position.set(0, -0.101, zWall + len / 2); s.add(under);
  const gm = M.std('#2b2734', 0.35, 0.6, { side: THREE.DoubleSide }); for (const gx of [X(L - 13), X(R + 13)]) { const g = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, len, 20, 1, true, Math.PI / 2, Math.PI), gm); g.rotation.set(Math.PI / 2, 0, 0); g.position.set(gx, 0.0, zWall + len / 2); g.receiveShadow = true; s.add(g); }
  const nb = laneMat.clone(); nb.color.set('#8d7a6a'); for (const ox of [-1, 1]) { const n = new THREE.Mesh(lg, nb); n.position.set(ox * (w + 1.5), 0, zWall + len / 2); n.receiveShadow = true; s.add(n);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.16, len), M.std('#3a2a40', 0.4, 0.3)); cap.position.set(ox * (w / 2 + 0.75), 0.02, zWall + len / 2); s.add(cap); }
  const wall = new THREE.Mesh(new THREE.BoxGeometry(30, 6, 0.4), M.std('#1a1424', 0.6)); wall.position.set(0, 3, zWall - 1.6); s.add(wall);
  const mask = ctex(1024, 256, (x, cw, ch) => { const g = x.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, '#2a1d3c'); g.addColorStop(1, '#3c2a54'); x.fillStyle = g; x.fillRect(0, 0, cw, ch); x.strokeStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i < cw; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, ch); x.stroke(); }
    x.shadowColor = '#ff7cc0'; x.shadowBlur = 30; x.font = '700 110px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#ffd6ea'; x.fillText('MOCHI BOWL', cw / 2, ch / 2 + 6); x.shadowColor = '#9fe8ff'; x.strokeStyle = '#bff2ff'; x.lineWidth = 7; x.beginPath(); x.roundRect(130, 30, cw - 260, ch - 60, 90); x.stroke(); });
  const mk = new THREE.Mesh(new THREE.PlaneGeometry(w + 3, (w + 3) / 4), new THREE.MeshStandardMaterial({ map: mask, emissive: '#ffffff', emissiveMap: mask, emissiveIntensity: 1.0, roughness: 0.6 })); mk.position.set(0, 2.1, zWall - 1.35); s.add(mk);
  for (const ox of [-1, 1]) { const m2 = new THREE.Mesh(mk.geometry, mk.material.clone()); m2.material.emissiveIntensity = 0.6; m2.position.set(ox * (w + 1.5), 2.1, zWall - 1.35); s.add(m2); }
  const pit = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.9, 1.4), M.std('#09070c', 0.9)); pit.position.set(0, 0.2, zWall - 0.75); s.add(pit);
  s.add(new THREE.AmbientLight('#6b5a88', 0.2)); s.add(new THREE.HemisphereLight('#b7a6ff', '#2a1a10', 0.25));
  const key = new THREE.SpotLight('#fff1dd', 55, 40, 0.55, 0.6, 1.4); key.position.set(0, 9, Z(170) + 2); key.target.position.set(0, 0, Z(170)); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0005; key.shadow.radius = 5; s.add(key, key.target);
  const fill = new THREE.SpotLight('#ffe2f0', 30, 30, 0.7, 0.8, 1.5); fill.position.set(0, 7, 3); fill.target.position.set(0, 0, -4); fill.castShadow = true; fill.shadow.mapSize.set(512, 512); fill.shadow.radius = 6; s.add(fill, fill.target);
  const lamp = new THREE.MeshBasicMaterial({ color: '#fff4e6' }); for (let z = zWall + 2; z < 6; z += 4) for (const x of [-w / 2 - 0.75, w / 2 + 0.75]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 1.6), lamp); l.position.set(x, 6, z); s.add(l); }
  const pp = [[0.001, 0], [0.09, 0], [0.16, 0.06], [0.22, 0.2], [0.24, 0.32], [0.2, 0.47], [0.1, 0.62], [0.085, 0.7], [0.11, 0.8], [0.12, 0.88], [0.09, 0.95], [0.04, 0.98], [0.001, 0.985]].map(([r, y]) => new THREE.Vector2(r, y));
  const pinTex = ctex(256, 256, (x, cw, ch) => { x.fillStyle = '#f7f4ef'; x.fillRect(0, 0, cw, ch); x.fillStyle = '#b8303f'; const v = y => ch - y * ch; x.fillRect(0, v(0.74), cw, 9); x.fillRect(0, v(0.69), cw, 9);
    x.fillStyle = '#2b1d30'; for (const u of [0.22, 0.28]) { x.beginPath(); x.ellipse(u * cw, v(0.87), 4, 6, 0, 0, 7); x.fill(); } });
  const pinGeo = new THREE.LatheGeometry(new THREE.SplineCurve(pp).getPoints(40), 28); pinGeo.scale(1.15, 1.0, 1.15); const pinMat = M.phys('#ffffff', { map: pinTex, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 });
  const pins = []; for (let i = 0; i < 10; i++) { const g = new THREE.Group(), m = new THREE.Mesh(pinGeo, pinMat); m.castShadow = true; g.add(m); s.add(g); pins.push({ g, m, tilt: 0 }); }
  for (const ox of [-1, 1]) for (let r = 0; r < 4; r++) for (let c = 0; c <= r; c++) { const m = new THREE.Mesh(pinGeo, pinMat); m.position.set(ox * (w + 1.5) + (c - r / 2) * 38 / K, 0, Z(128 + (3 - r) * 33)); m.castShadow = true; s.add(m); }
  const mo = makeMochi(); s.add(mo); const msh = blob(0.7, 0.45); s.add(msh);
  const dots = []; for (let i = 0; i < 7; i++) { const d = new THREE.Mesh(GEO.sphL, new THREE.MeshBasicMaterial({ color: '#fff3d0', transparent: true, depthTest: false })); d.renderOrder = 5; d.scale.setScalar(0.1); s.add(d); dots.push(d); }
  const refl = makeMochi(); s.add(refl); refl.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.16; o.material.depthWrite = false; } o.castShadow = false; });
  let camZ = 6.6, camY = 2.9;
  s.userData.update = (e, dt, T) => {
    e.pins.forEach((p, i) => { const P = pins[i]; P.tilt = lerp(P.tilt, p.down ? 1 : 0, 1 - Math.pow(0.0005, dt)); const t = P.tilt;
      P.g.position.set(X(p.x), t * 0.12, Z(p.y)); P.g.rotation.set(0, -p.rot, 0); P.m.rotation.x = t * (Math.PI / 2); });
    const m = e.m, sp = Math.hypot(m.vx, m.vy), sq = e.sq.s, wob = e.state === 'roll' ? Math.sin(m.spin) * 0.08 : 0;
    const gx = m.gutter ? (m.x < 200 ? X(L - 13) : X(R + 13)) : X(m.x), gy = m.gutter ? -0.2 : 0;
    let yaw = 0; if (e.aim) { const dx = m.x - e.aim.x, dy = m.y - e.aim.y; yaw = clamp(Math.atan2(dx, -dy), -0.6, 0.6) * -1; }
    mo.position.set(gx, gy, Z(m.y)); mo.rotation.y = Math.PI + yaw; msh.position.set(gx, 0.012 + gy, Z(m.y)); msh.visible = !m.gutter;
    const opts = { sx: (2 - sq) + wob, sy: sq - wob, face: e.firstHit && e.state === 'roll' ? 'squish' : sp > 300 ? 'wow' : e.aim ? 'focus' : 'idle', rot: e.state === 'roll' ? Math.sin(m.spin * 0.5) * 0.2 : 0, tilt: e.state === 'roll' ? -0.12 : 0, seed: 1 };
    mo.userData.set(opts, T, 1.12); refl.position.set(gx, gy, Z(m.y)); refl.rotation.y = Math.PI + yaw; refl.userData.set(opts, T, 1.12); refl.scale.y = -1.12; refl.visible = !m.gutter;
    if (e.aim) { const dx = m.x - e.aim.x, dy = m.y - e.aim.y, l = Math.min(160, Math.hypot(dx, dy)), a = Math.atan2(dy, dx), gl = 70 + l * 0.6;
      dots.forEach((d, i) => { const k = (i + 1) / 7; d.visible = true; d.position.set(X(m.x + Math.cos(a) * gl * k), 0.1, Z(m.y + Math.sin(a) * gl * k)); d.material.opacity = 1 - k * 0.8; }); }
    else dots.forEach(d => d.visible = false);
    const tz = e.state === 'aim' ? 6.6 : Math.max(Z(m.y) + 5.2, Z(128) + 7.5), ty = e.state === 'aim' ? 2.9 : 2.6;
    camZ = lerp(camZ, tz, 1 - Math.pow(e.state === 'wait' ? 0.3 : 0.06, dt)); camY = lerp(camY, ty, 1 - Math.pow(0.1, dt));
    camera.fov = 54; camera.position.set(0, camY, camZ); camera.lookAt(0, 0.2, camZ - 12.5);
  };
  return s;
};
// ===== 2) Salto con muelle =====
SC.muelle = () => {
  const s = baseScene(), K = 55, G = H - 120; s.userData.map = (x, y) => new V3((x - 200) / K, (G - y) / K, 0); s.userData.plane = new THREE.Plane(new V3(0, 0, 1), 0); s.userData.inv = v => [v.x * K + 200, G - v.y * K];
  const sun = outdoor(s, { top: '#4f86d4', hor: '#eadfd2', sun: [0.5, 0.55, 0.7], sunI: 2.5, box: 9, fogN: 70, fogF: 300 });
  groundPlane(s, 300, 300, grassMat(40, 40));
  const track = new THREE.Mesh(new THREE.PlaneGeometry(80, 5), tartanMat(40, 2)); track.rotation.x = -Math.PI / 2; track.position.set(0, 0.005, -4.5); track.receiveShadow = true; s.add(track);
  for (let i = 0; i <= 4; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(80, 0.05), M.std('#f2f2f2', 0.8)); l.rotation.x = -Math.PI / 2; l.position.set(0, 0.008, -2.1 - i * 1.2); s.add(l); }
  const crowd = standsLine(s, -32, 32, -8, 13, 21);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.16, 32), M.std('#3a3442', 0.45, 0.5)); base.position.y = 0.08; base.castShadow = base.receiveShadow = true; s.add(base);
  const helix = []; for (let i = 0; i <= 200; i++) { const a = i / 200 * Math.PI * 2 * 6; helix.push(new V3(Math.cos(a) * 0.42, i / 200, Math.sin(a) * 0.42)); }
  const coil = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), 400, 0.05, 8), M.std('#d7dbe3', 0.2, 1)); coil.castShadow = true; coil.position.y = 0.16; s.add(coil);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.14, 32), M.phys('#c4566f', { roughness: 0.35, clearcoat: 0.6 })); top.castShadow = top.receiveShadow = true; s.add(top);
  const PXP = (326 - 200) / K + 0.1; const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 12.6, 12), MAT.white); pole.position.set(PXP, 6.3, -0.4); pole.castShadow = true; s.add(pole);
  for (let mm = 1; mm <= 12; mm++) { const tk = new THREE.Mesh(new THREE.BoxGeometry(mm % 5 ? 0.25 : 0.6, 0.05, 0.05), mm % 5 ? M.std('#5a5a66', 0.5) : MAT.gold); tk.position.set(PXP - 0.1, mm, -0.35); s.add(tk); const lb = label(mm + ' m', { h: 0.36, col: '#fff', stroke: 'rgba(20,20,40,.55)', fs: 56 }); lb.position.set(PXP + 0.6, mm, -0.35); s.add(lb); }
  const flags = []; [[10, '#e0b24a'], [8, '#c9ced8'], [5, '#b87333']].forEach(([mm, c]) => { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.32), M.std(c, 0.5, 0.4, { side: THREE.DoubleSide })); f.geometry.translate(0.27, 0, 0); f.position.set(PXP + 0.05, mm + 0.25, -0.4); s.add(f); flags.push(f); });
  const rec = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.04, 0.04), new THREE.MeshBasicMaterial({ color: '#ffd76a' })); rec.position.set(-0.3, 0, 0); s.add(rec); const recL = label('récord', { h: 0.32, col: '#ffe08a', stroke: 'rgba(60,40,0,.6)', fs: 48 }); s.add(recL);
  const mo = makeMochi(); s.add(mo); const sh = blob(0.9, 0.4); s.add(sh);
  let camY = 1.5;
  s.userData.update = (e, dt, T) => {
    const comp = e.state === 'charge' ? e.c : 0, ph = 44 * (1 - comp * 0.7) / K; coil.scale.y = ph; top.position.y = 0.16 + ph + 0.07;
    const air = e.state === 'fly' || e.state === 'land'; const yy = air ? Math.max(0, -e.y / K) + 0.3 : 0.16 + ph + 0.14;
    let sx, sy; if (e.state === 'charge') { sy = 1 - comp * 0.5; sx = 1 + comp * 0.45 + Math.sin(T * 50) * comp * 0.03; } else { sy = e.sq.s; sx = 2 - e.sq.s; if (e.state === 'fly') { const st = clamp(-e.vy / 1400, -0.3, 0.4); sy += st; sx -= st * 0.6; } }
    mo.position.set(0, yy, 0); mo.rotation.y = 0.35; mo.userData.set({ sx, sy, face: e.state === 'charge' ? (comp > 0.85 ? 'squish' : 'focus') : e.state === 'fly' ? (e.vy < 0 ? 'wow' : 'happy') : 'happy', armsUp: e.state === 'fly', band: true, sweat: e.state === 'charge' && comp > 0.6 }, T, 70 / K);
    sh.position.set(0, 0.31, 0); sh.scale.setScalar(clamp(1 - yy / 10, 0.3, 1)); sh.material.opacity = 0.4 * clamp(1 - yy / 12, 0.2, 1);
    rec.visible = recL.visible = e.best > 0; rec.position.y = e.best + 0.3; recL.position.set(-1.6, e.best + 0.6, 0);
    flags.forEach((f, i) => f.rotation.y = Math.sin(T * 3 + i) * 0.3);
    crowd.userData.U.uT.value = T; crowd.userData.U.uA.value = e.state === 'fly' ? 0.16 : 0.05;
    const hgt = clamp(yy / 13, 0, 1); s.userData.sky.userData.u.night.value = hgt * 0.75;
    camY = lerp(camY, Math.max(1.5, yy * 0.92 + 0.6), 1 - Math.pow(0.02, dt));
    camera.fov = 50; camera.position.set(2.8 + hgt * 1.2, camY + 0.9 + hgt * 1.5, 8.2 + hgt * 3); camera.lookAt(0.6, camY, 0); follow(sun, new V3(0, camY * 0.6, 0));
  };
  return s;
};
// ===== 3) Lanzamiento de mochi =====
SC.martillo = () => {
  const s = baseScene(), K = 40, G = H - 140, PX = 110, PXM = 10; s.userData.map = (x, y) => new V3((x - PX) / K, (G - y) / K, 0); s.userData.plane = new THREE.Plane(new V3(0, 0, 1), 0); s.userData.inv = v => [v.x * K + PX, G - v.y * K];
  const sun = outdoor(s, { top: '#5a8ed8', hor: '#f3dcc8', sun: [-0.3, 0.6, 0.8], sunI: 2.6, box: 10, fogN: 80, fogF: 320 });
  groundPlane(s, 400, 200, grassMat(50, 25)).position.x = 60;
  const lm = M.std('#f4f4f0', 0.7); for (let mm = 10; mm <= 120; mm += 10) { const x = mm * PXM / K; const l = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 9), lm); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.006, -1.5); s.add(l); const lb = label(mm + ' m', { h: 0.45, col: '#fff', stroke: 'rgba(20,40,20,.6)', fs: 56 }); lb.position.set(x, 0.32, 1.8); s.add(lb); }
  const flags = []; [[80, MAT.gold], [62, MAT.silver], [45, MAT.bronze]].forEach(([mm, m]) => { const x = mm * PXM / K, p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 8), MAT.white); p.position.set(x, 0.6, 0.6); p.castShadow = true; s.add(p); const fm = m.clone(); fm.side = THREE.DoubleSide; const f = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), fm); f.geometry.translate(0.25, 0, 0); f.position.set(x, 1.05, 0.6); s.add(f); flags.push(f); });
  const best = new THREE.Group(); s.add(best); { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 8), MAT.gold); p.position.y = 0.65; best.add(p); const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), new THREE.MeshBasicMaterial({ color: '#ffd76a' })); st.position.y = 1.45; best.add(st); best.userData.st = st; }
  const circ = new THREE.Mesh(new THREE.CircleGeometry(1.25, 48), M.std('#9d988f', 0.85, 0, { map: TEX.concrete() })); circ.rotation.x = -Math.PI / 2; circ.position.y = 0.01; circ.receiveShadow = true; s.add(circ);
  const cr = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.3, 48), M.std('#f5f5f5', 0.6)); cr.rotation.x = -Math.PI / 2; cr.position.y = 0.015; s.add(cr);
  const net = ctex(128, 128, (x, w, h) => { x.clearRect(0, 0, w, h); x.strokeStyle = 'rgba(240,240,240,.85)'; x.lineWidth = 2; for (let i = 0; i <= w; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); } }, { rep: [14, 5] });
  // jaula en "C" abierta hacia el campo (+X)
  const cage = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 4.5, 40, 1, true, Math.PI * 0.9, Math.PI * 1.1), M.std('#fff', 0.8, 0, { map: net, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide })); cage.position.set(-0.6, 2.25, 0); s.add(cage);
  for (let i = 0; i <= 6; i++) { const a = Math.PI * 0.9 + i / 6 * Math.PI * 1.1; const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.6, 8), MAT.metal); p.position.set(-0.6 + Math.sin(a) * 3.2, 2.3, Math.cos(a) * 3.2); p.castShadow = true; s.add(p); }
  const crowd = standsLine(s, -15, 70, -13, 12, 41);
  const track = new THREE.Mesh(new THREE.PlaneGeometry(120, 4), tartanMat(50, 2)); track.rotation.x = -Math.PI / 2; track.position.set(25, 0.004, -10); track.receiveShadow = true; s.add(track);
  const ash = new THREE.Shape(); [[26, 0], [6, 13], [6, 5], [-14, 5], [-14, -5], [6, -5], [6, -13]].forEach(([a, b], i) => i ? ash.lineTo(a / K, b / K) : ash.moveTo(a / K, b / K));
  const arrow = new THREE.Mesh(new THREE.ExtrudeGeometry(ash, { depth: 0.06, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 }), M.std('#f0c14b', 0.3, 0.7, { emissive: '#7a5200', emissiveIntensity: 0.8 })); s.add(arrow);
  const th = makeMochi('#d9cdf0'); s.add(th); const tsh = blob(1.0, 0.4); s.add(tsh);
  const ball = makeMochi(); s.add(ball); const bsh = blob(0.5, 0.35); s.add(bsh);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 6), MAT.rope); rope.geometry.translate(0, 0.5, 0); s.add(rope);
  const trail = new THREE.Mesh(new THREE.TorusGeometry(70 / K, 0.12, 6, 40, 1.2), new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0, depthWrite: false })); s.add(trail);
  let camX = 2.2, camLY = 1.6;
  s.userData.update = (e, dt, T) => {
    const R = 70 / K, py = 70 / K, sp = e.state === 'spin' ? e.w : 0;
    th.position.set(0, 0, -0.25); th.rotation.y = 0.25; th.userData.set({ sx: 1 + sp * 0.008, sy: 1 - sp * 0.008, rot: Math.sin(e.a) * sp * 0.012, face: sp > 10 ? 'squish' : sp > 0 ? 'focus' : 'idle', lookX: Math.cos(e.a), armsUp: e.state === 'spin', band: true, sweat: sp > 9 }, T, 70 / K); tsh.position.set(0, 0.02, -0.25);
    let bx, by; if (e.b) { bx = (e.b.x - PX) / K; by = (G - e.b.y) / K; } else { bx = Math.cos(e.a) * R; by = py - Math.sin(e.a) * R; }
    const sq = e.b && e.b.sq != null ? e.b.sq : 1, st = sp * 0.025; ball.position.set(bx, Math.max(0, by - 0.35), 0.5); ball.userData.set({ sx: (1 + st) * (2 - sq), sy: (1 - st * 0.5) * sq, rot: e.b ? e.b.rot : e.a + Math.PI / 2, face: e.state === 'land' ? 'dizzy' : sp > 8 || e.state === 'fly' ? 'wow' : 'idle' }, T, 34 / K);
    bsh.position.set(bx, 0.02, 0.5); bsh.scale.setScalar(clamp(1 - by / 12, 0.3, 1));
    rope.visible = !e.b; if (!e.b) { const a = new V3(0, py, 0.25), b = new V3(bx, by, 0.5), d = b.clone().sub(a); rope.position.copy(a); rope.scale.set(1, d.length(), 1); rope.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); }
    trail.visible = sp > 4; trail.position.set(0, py, 0.5); trail.rotation.z = -e.a; trail.material.opacity = Math.min(0.5, sp / 26);
    const ga = -Math.PI * 0.75; arrow.visible = e.state === 'spin' || e.state === 'ready'; arrow.position.set(Math.cos(ga) * (R + 18 / K), py - Math.sin(ga) * (R + 18 / K), 0.55); arrow.rotation.z = Math.PI / 4; arrow.scale.setScalar(1 + 0.08 * Math.sin(T * 8));
    best.visible = e.best > 0; best.position.set(e.best * PXM / K, 0, 0.5); best.userData.st.rotation.y = T * 2;
    flags.forEach((f, i) => f.rotation.y = Math.sin(T * 3 + i) * 0.3); crowd.userData.U.uT.value = T; crowd.userData.U.uA.value = e.state === 'fly' ? 0.15 : 0.05;
    const tx = (e.cam + 200 - PX) / K; camX = lerp(camX, e.b ? Math.max(2.2, tx) : 0.5, 1 - Math.pow(0.02, dt));
    const fly = e.state === 'fly' || e.state === 'land'; camera.fov = 52; camLY = lerp(camLY, fly ? Math.max(1.6, by * 0.75) : 1.6, 1 - Math.pow(0.05, dt)); camera.position.set(camX - (fly ? 1.0 : 0.4), camLY + (fly ? 1.8 : 1.0), fly ? 13 + (camLY - 1.6) * 0.6 : 11.5); camera.lookAt(camX + 0.6, camLY, 0); follow(sun, new V3(camX, 0, 0));
  };
  return s;
};
// ===== 4) Halterofilia de dango: dojo =====
SC.dango = () => {
  const s = baseScene(), K = 50, G = H - 110; s.userData.map = (x, y) => new V3((x - 200) / K, (G - y) / K, 0); s.userData.plane = new THREE.Plane(new V3(0, 0, 1), 0); s.userData.inv = v => [v.x * K + 200, G - v.y * K];
  s.background = new THREE.Color('#1b120d'); s.environment = ENV_ROOM; s.environmentIntensity = 0.4; s.fog = new THREE.Fog('#1b120d', 16, 44);
  const tat = ctex(512, 256, (x, w, h) => { x.fillStyle = '#c9b77a'; x.fillRect(0, 0, w, h); for (let i = 0; i < h; i += 3) { x.fillStyle = i % 6 ? 'rgba(120,100,40,.16)' : 'rgba(255,250,210,.12)'; x.fillRect(0, i, w, 1.5); } noise(x, w, h, 0.06, 41, 1);
    x.fillStyle = '#2a3a2a'; x.fillRect(0, 0, w, 14); x.fillRect(0, h - 14, w, 14); x.fillStyle = 'rgba(230,220,180,.5)'; for (let i = 0; i < w; i += 18) { x.fillRect(i, 5, 9, 3); x.fillRect(i, h - 9, 9, 3); } }, { rep: [3, 8] });
  const floor = groundPlane(s, 24, 32, M.std('#fff', 0.85, 0, { map: tat })); floor.position.z = -4;
  const plat = new THREE.Mesh(new THREE.BoxGeometry((400 - 60) / K, 0.3, 3.2), M.phys('#5a1e23', { roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15 })); plat.position.set(0, 0.15, 0); plat.castShadow = plat.receiveShadow = true; s.add(plat);
  const trim = new THREE.Mesh(new THREE.BoxGeometry((400 - 60) / K + 0.06, 0.05, 3.26), MAT.gold); trim.position.set(0, 0.3, 0); s.add(trim);
  const shoji = ctex(512, 512, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f6e7c8'); g.addColorStop(1, '#efd9b0'); x.fillStyle = g; x.fillRect(0, 0, w, h); noise(x, w, h, 0.05, 51, 2);
    x.fillStyle = '#4b2e1c'; for (let i = 0; i <= w; i += w / 4) x.fillRect(i - 5, 0, 10, h); for (let j = 0; j <= h; j += h / 6) x.fillRect(0, j - 4, w, 8); }, { rep: [4, 1] });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(24, 7), M.std('#fff', 0.9, 0, { map: shoji, emissive: '#ffcf8a', emissiveMap: shoji, emissiveIntensity: 0.22 })); wall.position.set(0, 3.5, -5); s.add(wall);
  for (let x = -12; x <= 12; x += 4) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.35, 7.2, 0.35), M.std('#3a2214', 0.55)); p.position.set(x, 3.6, -4.8); p.castShadow = true; s.add(p); }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(24, 0.5, 0.5), M.std('#3a2214', 0.55)); beam.position.set(0, 6.9, -4.7); s.add(beam);
  const ban = ctex(256, 640, (x, w, h) => { x.fillStyle = '#7d1d2a'; x.fillRect(0, 0, w, h); noise(x, w, h, 0.08, 61, 2); x.strokeStyle = '#d9b25a'; x.lineWidth = 8; x.strokeRect(14, 14, w - 28, h - 28); x.fillStyle = '#f2e6d0'; x.font = '700 170px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('力', w / 2, h * 0.33); x.font = '700 120px serif'; x.fillText('餅', w / 2, h * 0.7); });
  const bn = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3.5), M.std('#fff', 0.85, 0, { map: ban, side: THREE.DoubleSide })); bn.position.set(0, 4.6, -4.55); s.add(bn);
  const lanterns = []; const lp = M.std('#fff', 0.9, 0, { emissive: '#ffb36b', emissiveIntensity: 1.6 }), lp2 = M.std('#fff', 0.9, 0, { emissive: '#ff8a8a', emissiveIntensity: 1.4 });
  for (let i = 0; i < 5; i++) { const g = new THREE.Group(); g.position.set(-4 + i * 2, 6.6, -2.6); s.add(g); const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.6, 4), MAT.black); cord.position.y = -0.3; g.add(cord);
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 12), i % 2 ? lp2 : lp); l.scale.y = 1.3; l.position.y = -0.95; g.add(l); for (const yy of [-0.55, -1.35]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 14), MAT.black); c.position.y = yy; g.add(c); } lanterns.push(g); }
  s.add(new THREE.AmbientLight('#ffdcb0', 0.12)); s.add(new THREE.HemisphereLight('#ffd7a8', '#3a2010', 0.3));
  const warm = new THREE.PointLight('#ffb56b', 8, 16, 1.6); warm.position.set(0, 5.3, -2.4); s.add(warm);
  const key = new THREE.SpotLight('#fff0d8', 75, 40, 0.42, 0.7, 1.3); key.position.set(1.5, 11, 6); key.target.position.set(0, 2, 0); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 5; key.shadow.bias = -0.0005; s.add(key, key.target);
  const mo = makeMochi(); s.add(mo); const sh = blob(0.95, 0.45); s.add(sh);
  const tower = new THREE.Group(); s.add(tower); const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 8), M.std('#d9b07a', 0.6)); stick.geometry.translate(0, 0.5, 0); stick.castShadow = true; tower.add(stick);
  const DC = ['#f3b9c8', '#f6f1e8', '#b9d79a', '#f0d48e', '#cdbde8'].map(c => M.phys(c, { roughness: 0.5, sheen: 1, sheenRoughness: 0.4, sheenColor: new THREE.Color('#fff'), clearcoat: 0.25, clearcoatRoughness: 0.4 }));
  const dgeo = new THREE.SphereGeometry(0.17, 20, 14); const dangos = []; const dangoAt = i => { while (dangos.length <= i) { const d = new THREE.Mesh(dgeo, DC[dangos.length % 5]); d.castShadow = true; tower.add(d); dangos.push(d); } return dangos[i]; };
  const falls = []; let lastState = 'play', camD = 6, camY = 2;
  s.userData.update = (e, dt, T) => {
    const X = (e.x - 200) / K, danger = Math.abs(e.th), lean = clamp(-e.vx / 1500, -0.25, 0.25);
    mo.position.set(X, 0.3, 0); mo.userData.set({ sx: 2 - e.sq.s, sy: e.sq.s, rot: lean, armsUp: true, face: e.state === 'fall' ? 'dizzy' : danger > 0.5 ? 'wow' : danger > 0.25 ? 'squish' : 'focus', lookX: Math.sin(e.th) * 2, lookY: -1, sweat: danger > 0.3, band: true }, T, 74 / K); sh.position.set(X, 0.312, 0);
    const SP = 0.3, n = e.n; tower.visible = e.state === 'play'; tower.position.set(X, 0.3 + 70 / K, 0.05); tower.rotation.z = -e.th; stick.scale.y = n * SP + 0.75; stick.position.y = -0.2;
    for (let i = 0; i < Math.max(n, dangos.length); i++) { const d = dangoAt(i); d.visible = i < n; if (i < n) { const wob = Math.sin(T * 6 + i) * Math.abs(e.om) * 2 * (1 + i * 0.05) / K; d.position.set(wob, 0.35 + i * SP, 0); d.scale.set(1, 0.92, 1); } }
    if (e.state === 'fall' && lastState === 'play') { tower.updateMatrixWorld(true); for (let i = 0; i < n; i++) { const wp = new V3(); dangoAt(i).getWorldPosition(wp); const f = new THREE.Mesh(dgeo, DC[i % 5]); f.castShadow = true; f.position.copy(wp); s.add(f); falls.push({ m: f, v: new V3(Math.sign(e.th || 1) * (0.8 + i * 0.12) + (Math.random() - 0.5) * 1.5, Math.random() * 2, (Math.random() - 0.3) * 2.5) }); } }
    lastState = e.state;
    for (const f of falls) { f.v.y -= 14 * dt; f.m.position.addScaledVector(f.v, dt); const fy = Math.abs(f.m.position.z) < 1.6 && Math.abs(f.m.position.x) < 3.4 ? 0.47 : 0.17; if (f.m.position.y < fy) { f.m.position.y = fy; f.v.y *= -0.35; f.v.x *= 0.8; f.v.z *= 0.8; } f.m.rotation.z -= f.v.x * dt * 4; }
    lanterns.forEach((l, i) => l.rotation.z = Math.sin(T * 2 + i) * 0.08); warm.intensity = 8 + Math.sin(T * 7) * 0.6;
    const top = 0.3 + 70 / K + n * SP + 0.5; const ty = Math.max(1.7, top * 0.55); camY = lerp(camY, ty, 1 - Math.pow(0.05, dt)); camD = lerp(camD, Math.max(6.2, top * 1.55 + 1.8), 1 - Math.pow(0.05, dt));
    camera.fov = 50; camera.position.set(X * 0.25 + 0.6, camY + 0.7, camD); camera.lookAt(X * 0.3, camY, 0);
  };
  s.userData.reset = () => { for (const f of falls) s.remove(f.m); falls.length = 0; lastState = 'play'; };
  return s;
};
// ===== 5) Tiro con arco: jardín japonés =====
SC.arco = () => {
  const s = baseScene(), K = 40, SY = H - 100, X = x => (x - 200) / K, Z = y => (y - SY) / K, BY = 1.15; s.userData.map = (x, y) => new V3(X(x), 0, Z(y)); s.userData.inv = v => [v.x * K + 200, v.z * K + SY]; s.userData.plane = new THREE.Plane(new V3(0, 1, 0), 0);
  const sun = outdoor(s, { top: '#5c90d2', hor: '#e9e6d6', sun: [-0.5, 0.6, 0.4], sunI: 2.4, box: 14, fogN: 30, fogF: 140, gnd: '#4f7a3a' });
  groundPlane(s, 200, 200, grassMat(30, 30));
  const line = new THREE.Mesh(new THREE.PlaneGeometry(14, 0.08), M.std('#f5f5f0', 0.7)); line.rotation.x = -Math.PI / 2; line.position.set(0, 0.006, Z(H - 150)); s.add(line);
  const R = rng(53), bam = []; const bgeo = new THREE.CylinderGeometry(0.07, 0.08, 7, 7), bmat = M.std('#7d9a4a', 0.55);
  for (let i = 0; i < 140; i++) bam.push(new V3((R() - 0.5) * 40, 3.5 + R() * 0.6, Z(60) - 2 - R() * 10));
  const bi = new THREE.InstancedMesh(bgeo, bmat, bam.length), m4 = new THREE.Matrix4(); bam.forEach((p, i) => { m4.makeRotationZ((R() - 0.5) * 0.08); m4.setPosition(p); bi.setMatrixAt(i, m4); }); bi.castShadow = true; s.add(bi);
  const lgeo = new THREE.IcosahedronGeometry(1, 1), lmat = M.std('#5f8a3b', 0.8), lmat2 = M.std('#e9b9c6', 0.75), leaves = [];
  for (let i = 0; i < 60; i++) leaves.push([(R() - 0.5) * 40, 5.5 + R() * 2, Z(60) - 2 - R() * 10, 0.8 + R() * 0.8, R() < 0.25]);
  for (const sak of [false, true]) { const L = leaves.filter(l => l[4] === sak), im = new THREE.InstancedMesh(lgeo, sak ? lmat2 : lmat, L.length); L.forEach((l, i) => { m4.makeScale(l[3] * 1.4, l[3], l[3] * 1.2); m4.setPosition(l[0], l[1], l[2]); im.setMatrixAt(i, m4); }); im.castShadow = true; s.add(im); }
  for (const sd of [-1, 1]) { const tg = new THREE.Group(); tg.position.set(sd * 5.5, 0, Z(130)); s.add(tg); const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 2.6, 8), M.std('#5a3d2b', 0.8)); trunk.position.y = 1.3; trunk.castShadow = true; tg.add(trunk);
    for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(lgeo, lmat2); b.scale.setScalar(0.9 + R() * 0.5); b.position.set((R() - 0.5) * 1.8, 2.8 + R() * 0.9, (R() - 0.5) * 1.6); b.castShadow = true; tg.add(b); } }
  for (const sd of [-1, 1]) { const g = new THREE.Group(); g.position.set(sd * 3.6, 0, -0.5); s.add(g); const st = M.std('#9a958c', 0.9, 0, { map: TEX.concrete() }); [[0.35, 0.3, 0.15], [0.12, 0.8, 0.7], [0.3, 0.3, 1.2], [0.42, 0.18, 1.45]].forEach(([r, h, y]) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, h, 6), st); c.position.y = y; c.castShadow = true; g.add(c); }); }
  const tgt = ctex(512, 512, (x, w, h) => { const c = w / 2; [[1, '#efe8da'], [0.8, '#b8475a'], [0.55, '#efe8da'], [0.35, '#6b5aa6'], [0.2, '#e0b24a']].forEach(([k, col]) => { x.fillStyle = col; x.beginPath(); x.arc(c, c, c * k, 0, 7); x.fill(); x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 3; x.stroke(); }); noise(x, w, h, 0.06, 71, 2); });
  const straw = ctex(256, 64, (x, w, h) => { x.fillStyle = '#c9a25c'; x.fillRect(0, 0, w, h); const Rs = rng(72); for (let i = 0; i < 900; i++) { x.strokeStyle = `rgba(${120 + Rs() * 80 | 0},${90 + Rs() * 60 | 0},30,.5)`; x.beginPath(); const px = Rs() * w, py = Rs() * h; x.moveTo(px, py); x.lineTo(px + 8, py + (Rs() - 0.5) * 6); x.stroke(); } }, { rep: [6, 1] });
  const arrowGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.8, 6); arrowGeo.rotateX(Math.PI / 2); const arrowMat = M.std('#c9a06a', 0.6), fletch = M.std('#b8475a', 0.7, 0, { side: THREE.DoubleSide });
  function makeArrow() { const g = new THREE.Group(), a = new THREE.Mesh(arrowGeo, arrowMat); a.position.z = 0.4; a.castShadow = true; g.add(a); for (const r of [0, Math.PI / 2]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.08), fletch); f.position.z = 0.74; f.rotation.set(0, Math.PI / 2, r); g.add(f); } const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 6), MAT.metal); tip.rotation.x = -Math.PI / 2; tip.position.z = -0.02; g.add(tip); return g; }
  const T3 = [], badgeCol = ['#b87333', '#8e96aa', '#c9962e'];
  for (let i = 0; i < 3; i++) { const y = 170 + i * 110, A = 120 - i * 10, r = 26 + i * 6, z = Z(y), g = new THREE.Group(); s.add(g);
    const rail = new THREE.Mesh(new THREE.BoxGeometry((A + r + 6) * 2 / K, 0.12, 0.2), M.std('#8a6038', 0.6)); rail.position.set(0, 0.35, z); rail.castShadow = rail.receiveShadow = true; s.add(rail);
    for (const sd of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.1), M.std('#6a4628', 0.6)); leg.position.set(sd * (A + r) / K, 0.17, z); s.add(leg); }
    const fm = M.std('#fff', 0.8, 0, { map: tgt }); const face = new THREE.Mesh(new THREE.CylinderGeometry(r / K, r / K, 0.12, 40), [M.std('#fff', 0.85, 0, { map: straw }), fm, fm]); face.rotation.x = Math.PI / 2; face.position.y = BY; face.castShadow = true; g.add(face);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r / K + 0.04, 0.07, 10, 40), M.std('#fff', 0.9, 0, { map: straw })); rim.position.y = BY; g.add(rim);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, BY - 0.2, 0.1), M.std('#6a4628', 0.6)); post.position.y = (BY - 0.2) / 2 + 0.4; post.castShadow = true; g.add(post);
    const bd = label((3 - i) + ' pts', { h: 0.42, col: '#fff', bg: badgeCol[2 - i], fs: 54 }); bd.position.set(r / K + 0.55, BY + r / K + 0.1, 0); g.add(bd);
    T3.push({ g, z, stuck: [] }); }
  const mo = makeMochi(); s.add(mo); const sh = blob(0.8, 0.4); s.add(sh);
  const bow = new THREE.Group(); s.add(bow); const RB = 0.6, bw = new THREE.Group(); bw.rotation.y = Math.PI / 2; bw.position.z = 0.454 * RB; bow.add(bw);
  const limb = new THREE.Mesh(new THREE.TorusGeometry(RB, 0.03, 8, 30, Math.PI * 0.7), M.phys('#2a1a1e', { roughness: 0.3, clearcoat: 1 })); limb.rotation.z = -Math.PI * 0.35; limb.castShadow = true; bw.add(limb);
  const strG = new THREE.BufferGeometry().setFromPoints([new V3(), new V3(), new V3()]); bow.add(new THREE.Line(strG, new THREE.LineBasicMaterial({ color: '#f4efe6' }))); const nock = makeArrow(); bow.add(nock);
  const flying = []; for (let i = 0; i < 8; i++) { const a = makeArrow(); a.visible = false; s.add(a); flying.push(a); }
  const dots = []; for (let i = 0; i < 13; i++) { const d = new THREE.Mesh(GEO.sphL, new THREE.MeshBasicMaterial({ color: '#fff3d0', transparent: true, depthTest: false })); d.renderOrder = 5; d.scale.setScalar(0.075); s.add(d); dots.push(d); }
  const tx = (t, time) => 200 + Math.sin(time * t.w + t.ph) * t.A;
  s.userData.reset = () => { for (const P of T3) { for (const a of P.stuck) P.g.remove(a); P.stuck.length = 0; } };
  s.userData.update = (e, dt, T) => {
    e.tg.forEach((t, i) => { const P = T3[i], s2 = 1 + t.hitT * 0.6; P.g.position.set(X(tx(t, e.t)), 0, P.z); P.g.scale.set(s2, 1, 1); P.g.rotation.x = -t.hitT * 0.4;
      while (P.stuck.length < t.stuck.length) { const st = t.stuck[P.stuck.length], a = makeArrow(); a.position.set(st.dx / K, BY - st.dy / K * 0.9, 0.1); a.rotation.y = -(st.ang + Math.PI / 2) * 0.6; P.g.add(a); P.stuck.push(a); } });
    let ang = -Math.PI / 2, pw = 0; if (e.aim) { const dx = e.aim.x0 - e.aim.x, dy = e.aim.y0 - e.aim.y, l = Math.hypot(dx, dy); if (!(dy > -5 && l < 25)) { ang = Math.atan2(dy, dx); pw = Math.min(1, l / 120); } }
    const ca = Math.cos(ang), sa = Math.sin(ang); mo.position.set(0, 0, 0.35); mo.rotation.y = Math.atan2(ca, sa); mo.userData.set({ sx: (2 - e.sq.s) + pw * 0.1, sy: e.sq.s - pw * 0.1, face: e.aim ? 'focus' : 'idle', band: true }, T, 0.95); sh.position.set(0, 0.012, 0.35);
    bow.position.set(ca * 0.3 - sa * 0.55, 0.8, 0.35 + sa * 0.3 + ca * 0.55); bow.rotation.y = Math.atan2(-ca, -sa); const tipY = 0.891 * RB, pull = 0.1 + pw * 0.45; const p = strG.attributes.position; p.setXYZ(0, 0, tipY, 0); p.setXYZ(1, 0, 0, pull); p.setXYZ(2, 0, -tipY, 0); p.needsUpdate = true;
    nock.visible = e.left > 0 && !e.flying; nock.position.set(0, 0, pull - 0.8);
    flying.forEach((a, i) => { const ar = e.arrows[i]; a.visible = !!ar && ar.fly; if (a.visible) { a.position.set(X(ar.x), BY, Z(ar.y)); a.rotation.y = Math.atan2(-ar.vx, -ar.vy); } });
    dots.forEach((d, i) => { d.visible = !!e.aim && pw > 0; if (d.visible) { d.position.set(X(200 + ca * (i + 1) * 45), BY, Z(SY - 40 + sa * (i + 1) * 45)); d.material.opacity = 0.75 - i * 0.05; } });
    camera.fov = 54; camera.position.set(0.9, 3.2, 5.0); camera.lookAt(0.2, 0.7, -7.5); follow(sun, new V3(0, 0, -5));
  };
  return s;
};
// ===== 6) Charca de los Sapos =====
function sinkFn(e, p) { if (!p.sinker) return 0; const c = ((e.t + p.ph) % p.per) / p.per; return c < 0.62 ? 0 : c < 0.78 ? (c - 0.62) / 0.16 * 0.5 : c < 0.92 ? 1 : (1 - (c - 0.92) / 0.08); }
function warnFn(e, p) { if (!p || !p.sinker) return 0; const c = ((e.t + p.ph) % p.per) / p.per; return c > 0.45 && c < 0.62 ? 1 : 0; }
SC.sapos = () => {
  const s = baseScene(), K = 40, BY = H - 140, RH = 100; s.userData.map = (x, y) => new V3((x - 200) / K, 0, (y - BY) / K); s.userData.inv = v => [v.x * K + 200, v.z * K + BY]; s.userData.plane = new THREE.Plane(new V3(0, 1, 0), 0);
  const sun = outdoor(s, { top: '#6c9bd6', hor: '#e8ecdc', sun: [0.4, 0.75, -0.6], sunI: 2.3, box: 12, fogN: 25, fogF: 75, fog: '#cfdcd4', gnd: '#3c5a3a', clouds: 6 });
  const wn = normalTex(256, 3, 4, 2.2, 6); const water = new THREE.Mesh(new THREE.PlaneGeometry(60, 80), M.phys('#2f6f73', { roughness: 0.08, normalMap: wn, normalScale: new THREE.Vector2(0.35, 0.35), clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.2 }));
  water.rotation.x = -Math.PI / 2; water.position.y = -0.05; water.receiveShadow = true; s.add(water);
  const banks = []; for (const sd of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 80), grassMat(3, 40)); b.position.set(sd * 8.2, 0, 0); b.receiveShadow = true; s.add(b); banks.push(b); }
  const reedN = 120, reeds = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.02, 0.035, 1.4, 5).translate(0, 0.7, 0), M.std('#6d8f45', 0.7), reedN), cat = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.06, 0.22, 4, 8), M.std('#6b4527', 0.8), reedN);
  const RR = rng(91), reedP = []; for (let i = 0; i < reedN; i++) reedP.push([(RR() < 0.5 ? -1 : 1) * (5.25 + RR() * 0.6), RR() * 80 - 40, RR() * 0.3, 0.7 + RR() * 0.6]); reeds.castShadow = true; reeds.frustumCulled = cat.frustumCulled = false; s.add(reeds, cat);
  const shoreG = new THREE.Group(); s.add(shoreG); { const sh = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 6), grassMat(6, 3)); sh.position.set(0, 0, 3.4); sh.receiveShadow = true; shoreG.add(sh); const sand = new THREE.Mesh(new THREE.BoxGeometry(14, 0.3, 1), M.std('#cdb98d', 0.95)); sand.position.set(0, -0.05, 0.6); sand.receiveShadow = true; shoreG.add(sand); }
  const padTex = ctex(256, 256, (x, w, h) => { const c = w / 2, g = x.createRadialGradient(c * 0.8, c * 0.8, 4, c, c, c); g.addColorStop(0, '#93c46a'); g.addColorStop(0.7, '#5f9a45'); g.addColorStop(1, '#3f7a36'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(200,240,160,.35)'; x.lineWidth = 2; for (let k = 0; k < 14; k++) { const a = k / 14 * 6.283; x.beginPath(); x.moveTo(c, c); x.lineTo(c + Math.cos(a) * c, c + Math.sin(a) * c); x.stroke(); } noise(x, w, h, 0.07, 81, 2); });
  const padGeo = new THREE.CylinderGeometry(1, 1, 0.06, 40, 1, false, 0.25, Math.PI * 2 - 0.5);
  const pool = mk => { const a = []; let i = 0; return { get() { if (i >= a.length) a.push(mk()); const o = a[i++]; o.visible = true; return o; }, reset() { i = 0; }, hide() { for (let k = i; k < a.length; k++) a[k].visible = false; } }; };
  const pads = pool(() => { const m = new THREE.Mesh(padGeo, M.std('#fff', 0.45, 0, { map: padTex, transparent: true })); m.receiveShadow = true; m.castShadow = true; s.add(m); return m; });
  const flowerMat = M.phys('#f4c6d4', { roughness: 0.5, sheen: 1 }), flowerC = M.std('#f1cf5a', 0.5);
  const flowers = pool(() => { const g = new THREE.Group(); for (let k = 0; k < 7; k++) { const p = new THREE.Mesh(GEO.sphL, flowerMat); p.scale.set(0.06, 0.03, 0.15); const a = k / 7 * 6.283; p.position.set(Math.cos(a) * 0.1, 0.06, Math.sin(a) * 0.1); p.rotation.y = -a + Math.PI / 2; p.rotation.x = -0.5; g.add(p); } const c = new THREE.Mesh(GEO.sphL, flowerC); c.scale.setScalar(0.05); c.position.y = 0.07; g.add(c); s.add(g); return g; });
  const bubM = new THREE.MeshBasicMaterial({ color: '#e8fbff', transparent: true, opacity: 0.7 }); const bubs = pool(() => { const m = new THREE.Mesh(GEO.sphL, bubM); s.add(m); return m; });
  const FB = { sombrero: ['#79b65a', '#4f8a3f'], inflador: ['#a6d68a', '#6faa5d'], ojazos: ['#a796d6', '#7663b0'] };
  const spiral = ctex(128, 128, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.strokeStyle = '#5a46a0'; x.lineWidth = 6; x.beginPath(); for (let a = 0; a < 18; a += 0.1) { const r = a / 18 * 60; x.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } x.stroke(); });
  function makeFrog() { const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner); const bm = M.phys('#79b65a', { roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 }), dm = M.std('#4f8a3f', 0.6);
    const body = new THREE.Mesh(GEO.sph, bm); body.scale.set(0.62, 0.42, 0.55); body.position.y = 0.32; body.castShadow = true; inner.add(body);
    const belly = new THREE.Mesh(GEO.sph, M.std('#f2e8c4', 0.6)); belly.scale.set(0.42, 0.26, 0.3); belly.position.set(0, 0.22, 0.3); inner.add(belly);
    for (const sd of [-1, 1]) { const l = new THREE.Mesh(GEO.sph, dm); l.scale.set(0.24, 0.12, 0.3); l.position.set(sd * 0.48, 0.1, 0.05); inner.add(l); const f = new THREE.Mesh(GEO.sph, dm); f.scale.set(0.12, 0.05, 0.16); f.position.set(sd * 0.32, 0.04, 0.42); inner.add(f); }
    const eyes = [], eyeW = M.std('#ffffff', 0.15), pupil = M.std('#1c1420', 0.1), spir = new THREE.MeshBasicMaterial({ map: spiral });
    for (const sd of [-1, 1]) { const eg = new THREE.Group(); eg.position.set(sd * 0.26, 0.66, 0.16); inner.add(eg); const lid = new THREE.Mesh(GEO.sph, bm); lid.scale.setScalar(0.19); eg.add(lid); const w = new THREE.Mesh(GEO.sph, eyeW); w.scale.setScalar(0.16); w.position.z = 0.06; eg.add(w);
      const p = new THREE.Mesh(GEO.sph, pupil); p.scale.set(0.09, 0.06, 0.04); p.position.z = 0.2; eg.add(p); const sp = new THREE.Mesh(new THREE.CircleGeometry(0.15, 24), spir); sp.position.z = 0.215; eg.add(sp); eyes.push({ eg, p, sp }); }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 6, 20, Math.PI * 0.8), M.std('#2f5a2f', 0.5)); mouth.rotation.z = Math.PI * 1.1; mouth.position.set(0, 0.36, 0.53); inner.add(mouth);
    const hats = {}; { const c = new THREE.Group(); const br = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 24), M.std('#2a1f30', 0.4)); c.add(br); const tp = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.21, 0.42, 24), M.std('#2e2236', 0.35)); tp.position.y = 0.22; c.add(tp); const rb = new THREE.Mesh(new THREE.CylinderGeometry(0.212, 0.212, 0.08, 24), M.std('#b8475a', 0.6)); rb.position.y = 0.08; c.add(rb); hats.copa = c;
      const f = new THREE.Group(); const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 20), M.std('#e0b24a', 0.5)); cone.position.y = 0.27; f.add(cone); const pom = new THREE.Mesh(GEO.sphL, M.std('#cdbde8', 0.7)); pom.scale.setScalar(0.08); pom.position.y = 0.56; f.add(pom); hats.fiesta = f;
      const k = new THREE.Group(); const kb = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 16, 1, true), MAT.gold); kb.position.y = 0.08; k.add(kb); for (let i = 0; i < 6; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 6), MAT.gold); const a = i / 6 * 6.283; sp.position.set(Math.cos(a) * 0.22, 0.22, Math.sin(a) * 0.22); k.add(sp); } hats.corona = k;
      for (const h of Object.values(hats)) { h.position.set(0, 0.74, -0.02); h.rotation.z = -0.15; h.traverse(o => o.castShadow = true); inner.add(h); } }
    const mono = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.015, 6, 20), MAT.gold); mono.position.set(0.26, 0.66, 0.37); inner.add(mono);
    g.userData = { inner, bm, dm, eyes, hats, mono };
    g.userData.set = (f, T, x, mx, my, ang) => { const U = g.userData, tp = f.type; U.bm.color.set(FB[tp][0]); U.dm.color.set(FB[tp][1]);
      const inf = tp === 'inflador' && Math.sin(T * 2 + f.ph) > 0.2, sc = inf ? 1.7 + Math.sin(T * 12) * 0.05 : 1, br = 1 + Math.sin(T * 4 + x) * 0.03; U.inner.scale.set(sc * br, (tp === 'inflador' ? sc * 0.95 : 1) / br, sc * br); U.inner.rotation.z = ang;
      const big = tp === 'ojazos' ? 1.7 : 1; U.eyes.forEach(e => { e.eg.scale.setScalar(big); e.sp.visible = tp === 'ojazos'; e.p.visible = tp !== 'ojazos'; e.sp.rotation.z = T * 6; e.p.position.x = clamp(mx, -1, 1) * 0.04; e.p.position.y = clamp(my, -1, 1) * 0.03; });
      for (const [k, h] of Object.entries(U.hats)) h.visible = tp === 'sombrero' && f.hat === k; U.mono.visible = tp === 'sombrero'; };
    s.add(g); return g; }
  const frogs = pool(makeFrog);
  const tongues = pool(() => { const g = new THREE.Group(); const tm = M.phys('#e2667e', { roughness: 0.3, clearcoat: 0.6 }); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1, 10).translate(0, 0.5, 0), tm); g.add(t); const tip = new THREE.Mesh(GEO.sph, tm); tip.scale.setScalar(0.22); g.add(tip);
    const warn = new THREE.Mesh(new THREE.PlaneGeometry(9.8, 0.62), new THREE.MeshBasicMaterial({ color: '#ff5a7e', transparent: true, opacity: 0.3, depthWrite: false })); warn.rotation.x = -Math.PI / 2; g.add(warn);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8, 1), M.std('#8c8578', 0.9, 0, { map: TEX.concrete() })); rock.scale.set(1, 0.45, 0.6); rock.castShadow = true; g.add(rock); g.userData = { t, tip, warn, rock }; s.add(g); return g; });
  const rocks = pool(() => { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 1), M.std('#9a9285', 0.9, 0, { map: TEX.concrete() })); m.scale.set(1, 0.5, 0.8); m.castShadow = m.receiveShadow = true; s.add(m); return m; });
  const flies = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(30), 3)), new THREE.PointsMaterial({ color: '#fff2a0', size: 0.14, map: TEX.soft(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); flies.frustumCulled = false; s.add(flies);
  const ripple = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 40), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })); ripple.rotation.x = -Math.PI / 2; s.add(ripple);
  const mo = makeMochi(); s.add(mo); const msh = blob(0.6, 0.4); s.add(msh);
  const arrows = []; for (let k = 0; k < 3; k++) { const a = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.26, 3), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false })); a.rotation.x = -Math.PI / 2; s.add(a); arrows.push(a); }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler(), vp = new V3(), vs = new V3();
  s.userData.update = (e, dt, T) => {
    const m = e.m, camZ = (e.cam + (H - 250) - BY) / K; pads.reset(); flowers.reset(); frogs.reset(); tongues.reset(); bubs.reset(); rocks.reset();
    water.position.z = camZ - 10; wn.offset.set(T * 0.01, T * 0.017); for (const b of banks) b.position.z = camZ - 10;
    reedP.forEach((r, i) => { const z = r[1] + Math.round((camZ - 10 - r[1]) / 80) * 80; const sw = Math.sin(T * 1.5 + i) * 0.06; m4.compose(vp.set(r[0], 0.2, z), q.setFromEuler(eu.set(sw, 0, sw * 0.5)), vs.set(1, r[3], 1)); reeds.setMatrixAt(i, m4); m4.compose(vp.set(r[0] + sw * r[3] * 1.3, 0.2 + 1.35 * r[3], z), q.identity(), vs.set(1, 1, 1)); cat.setMatrixAt(i, m4); });
    reeds.instanceMatrix.needsUpdate = true; cat.instanceMatrix.needsUpdate = true; shoreG.visible = e.row < 9;
    const r0 = Math.max(0, e.row - 4), r1 = e.row + 10;
    for (let r = r0; r < r1 && r < e.rows.length; r++) { const row = e.rows[r], z = (-r * RH) / K; if (row.shore) continue;
      if (r % 5 === 2) { const rk = rocks.get(); rk.position.set((r % 2 ? 1 : -1) * 4.6, 0, z + 1.1); }
      for (const p of row.pads) { if (!p) continue; const sk = sinkFn(e, p), wk = warnFn(e, p) ? Math.sin(T * 30) * 0.04 : 0, bob = Math.sin(p.bob * 9) * p.bob * 0.08;
        const pm = pads.get(); pm.position.set((p.x - 200) / K + wk, -sk * 0.35 - bob, z); const rr = p.r / K * (1 - sk * 0.35); pm.scale.set(rr, 1, rr); pm.rotation.y = p.ph; pm.material.opacity = 1 - sk * 0.85;
        if (warnFn(e, p)) for (let k = 0; k < 3; k++) { const bt = (T * 1.7 + k * 0.33) % 1, b = bubs.get(); b.position.set((p.x - 200) / K - 0.4 + k * 0.4, bt * 0.5, z + 0.3); b.scale.setScalar(0.05 + bt * 0.05); }
        if (p.flower && !p.frog && sk < 0.5) { const f = flowers.get(); f.position.set((p.x - 200) / K + p.r / K * 0.45, 0.02 - sk * 0.3, z - 0.1); f.rotation.y = T * 0.3; }
        if (p.frog && sk < 0.5) { const fr = frogs.get(); fr.position.set((p.x - 200) / K, 0.03 - bob, z - 0.1); fr.rotation.y = 0; fr.scale.setScalar(0.85); const ang = p.frog.angry > 0 ? Math.sin(T * 40) * 0.2 : Math.sin(T * 2 + p.x) * 0.03; fr.userData.set(p.frog, T, p.x, (m.x - p.x) / 200, -(m.y - (BY - r * RH)) / 200, ang); } }
      if (row.swim) { const fr = frogs.get(); fr.position.set((row.swim.x - 200) / K, -0.12, z - 0.15); fr.rotation.y = Math.sign(row.swim.v) * Math.PI / 2; fr.scale.setScalar(0.8); fr.userData.set({ type: 'sombrero', hat: 'fiesta' }, T, row.swim.x, 0, 0, 0); }
      if (row.tongue) { const tg = row.tongue, sx = tg.side < 0 ? -6 : 406, X0 = (sx - 200) / K, tm = tongues.get(); tm.position.set(X0, 0, z); const U = tm.userData; U.rock.position.set(0, 0, 0.1); U.warn.visible = !!tg.warn; U.warn.material.opacity = 0.2 + 0.18 * Math.sin(T * 30); U.warn.position.set(-X0, 0.03, -0.2);
        const len = tg.len / K; U.t.visible = U.tip.visible = len > 0.01; U.t.scale.set(1, Math.max(0.01, len), 1); U.t.position.set(0, 0.55 + Math.sin(T * 20) * 0.05, -0.2); U.t.rotation.set(0, 0, tg.side < 0 ? -Math.PI / 2 : Math.PI / 2); U.tip.position.set(-tg.side * len, 0.55, -0.2);
        const fr = frogs.get(); fr.position.set(X0 - tg.side * 0.1, 0.3, z - 0.1); fr.rotation.y = -tg.side * Math.PI / 2; fr.scale.setScalar(0.95); fr.userData.set({ type: 'ojazos' }, T, sx, 0, 0, 0); } }
    pads.hide(); flowers.hide(); frogs.hide(); tongues.hide(); bubs.hide(); rocks.hide();
    let gy = m.y, hgt = 0; if (m.jump) { const k = Math.min(1, m.jump.t / m.jump.dur); gy = lerp(m.jump.y0, m.jump.y1, k); hgt = Math.sin(k * Math.PI) * m.jump.h; } else if (m.side) { const k = Math.min(1, m.side.t / 0.2); gy = m.side.y; hgt = Math.sin(k * Math.PI) * 10; }
    const MX = (m.x - 200) / K, MZ = (gy - BY) / K, sink = m.sink > 0 ? (0.9 - m.sink) * 0.75 : 0, air = m.jump ? Math.sin(Math.min(1, m.jump.t / m.jump.dur) * Math.PI) : 0, sl = m.side ? Math.sign(m.side.x1 - m.side.x0) : 0;
    mo.position.set(MX, hgt / K + 0.04 - sink, MZ); mo.rotation.y = Math.PI - sl * 0.5; mo.visible = !(m.inv > 0 && Math.floor(T * 12) % 2);
    mo.userData.set({ sx: (2 - m.sq.s) - air * 0.15 + Math.abs(sl) * 0.1, sy: m.sq.s + air * 0.25, rot: sl * 0.18, face: m.sink > 0 ? 'dizzy' : e.hypno > 0 ? 'dizzy' : m.jump ? 'wow' : 'happy', armsUp: !!m.jump, alpha: m.sink > 0 ? clamp(m.sink, 0, 1) : 1 }, T, 44 / K * 1.15);
    msh.position.set(MX, 0.03, MZ); msh.scale.setScalar(1 - air * 0.35); msh.visible = m.sink <= 0;
    const showA = !m.jump && !m.side && m.sink <= 0 && e.state === 'play'; arrows.forEach((a, k) => { a.visible = showA; a.position.set(MX, 0.06, MZ - 1.0 - k * 0.32); a.material.opacity = (0.45 + 0.25 * Math.sin(T * 6)) * (1 - k * 0.25); });
    if (e.rip && e.rip.t < 1) { ripple.visible = true; ripple.position.set((e.rip.x - 200) / K, 0.02, (e.rip.y - BY) / K); ripple.scale.setScalar(0.3 + e.rip.t * 1.6); ripple.material.opacity = 0.6 * (1 - e.rip.t); } else ripple.visible = false;
    const fp = flies.geometry.attributes.position; for (let i = 0; i < 10; i++) fp.setXYZ(i, Math.sin(T * 0.7 + i * 2.1) * 4.5, 0.6 + Math.sin(T + i) * 0.3, camZ - 8 + ((i * 131) % 14) - 7 + Math.cos(T * 0.5 + i) * 0.6); fp.needsUpdate = true;
    camera.fov = 60; camera.position.set(0, 8.4, camZ + 5.2); camera.lookAt(0, 0, camZ - 4.3); if (e.hypno > 0) camera.rotateZ(Math.sin(T * 3) * 0.05 * e.hypno); follow(sun, new V3(0, 0, camZ - 4));
  };
  return s;
};
// ---------- bucle y API para game.js ----------
let lastEv = null, fpsAcc = 0, fpsN = 0, fpsT = 0, stable = 0;
const tmp = new V3(), ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
const API = {
  ready: true, Q,
  frame(cur, dt, T, h, shake) {
    H = h; const key = cur ? cur.ev.id : 'menu', k2 = key + '|' + Math.round(H);
    if (k2 !== curKey) { if (!SC['_' + k2]) SC['_' + k2] = SC[key](); curScene = SC['_' + k2]; curKey = k2; rpass.scene = curScene; }
    if (cur && cur !== lastEv) { lastEv = cur; curScene.userData.reset && curScene.userData.reset(); }
    curScene.userData.update(cur, dt, T);
    for (const o of curScene.children) if (o.isSprite && o.userData.drift) o.position.x += o.userData.drift * dt * 0.6;
    if (shake > 0) { camera.position.x += (Math.random() - 0.5) * shake * 0.012; camera.position.y += (Math.random() - 0.5) * shake * 0.012; }
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    if (Q.bloom) composer.render(dt); else renderer.render(curScene, camera);
    fpsAcc += dt; fpsN++; fpsT += dt; if (fpsT > 2.5 && !QS.has('q')) { const fps = fpsN / fpsAcc; fpsAcc = fpsN = fpsT = 0;
      if (fps < 48 && Q.level > 0) { Q.level--; applyQ(); stable = 0; } else if (fps > 58.5 && Q.level < 2 && ++stable > 3) { Q.level++; applyQ(); stable = 0; } }
  },
  proj(x, y) { const s = curScene; if (!s || !s.userData.map) return null; tmp.copy(s.userData.map(x, y)).project(camera); const sx = (tmp.x * 0.5 + 0.5) * innerWidth, sy = (-tmp.y * 0.5 + 0.5) * innerHeight, front = tmp.z < 1;
    tmp.copy(s.userData.map(x + 10, y)).project(camera); const sx2 = (tmp.x * 0.5 + 0.5) * innerWidth, sy2 = (-tmp.y * 0.5 + 0.5) * innerHeight; return [sx, sy, Math.hypot(sx2 - sx, sy2 - sy) / 10, front]; },
  unproj(cx, cy) { const s = curScene; if (!s || !s.userData.plane) return null; ray.setFromCamera(v2.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1), camera); const p = new V3(); if (!ray.ray.intersectPlane(s.userData.plane, p)) return null; return s.userData.inv(p); },
  info() { return { level: Q.level, pr: Q.pr, bloom: Q.bloom, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, scene: curKey }; },
};
applyQ();
window.R3D = API;
}
