// ======================================================================
//  MOCHI RACERS v12 · 13 potenciadores surrealistas (v12: Topo Excavador,
//  Bola de Circo y Delfín de Gelatina; tetera sin deslumbrar; reloj → burbuja del tiempo)
//  Todos los efectos son temporales y se montan ENCIMA de la física normal
//  (multiplicador de velocidad, piloto automático, inmunidad...). La
//  conducción normal no cambia.
// ======================================================================
import * as THREE from 'three';
import { toon, mesh, outline, glowTex, starShape } from './gfx.js';
import { Audio } from './audio.js';

const V3 = THREE.Vector3, R = Math.random;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

export const POWER = {
  tiburon:  { name: 'Tiburón Ciudad',        icon: '🦈', hint: 'Un tiburón de cristal con una ciudad dentro te lleva hasta el 1º puesto' },
  estrella: { name: 'Superestrella',         icon: '🌟', hint: 'Invencible: ¡lanzas por los aires a todo el que tocas!' },
  aladelta: { name: 'Ala Delta',             icon: '🪁', hint: '5 s volando por arriba con turbo y piloto automático' },
  reloj:    { name: 'Reloj Derretido',       icon: '🕰️', hint: 'El tiempo se derrite para los que van delante: quedan atrapados en una burbuja de arena dorada' },
  piano:    { name: 'Piano del Cielo',       icon: '🎹', hint: 'Cae un piano encima del líder: ¡CHAF!' },
  peces:    { name: 'Banco de Peces Voladores', icon: '🐟', hint: 'Tres peces voladores persiguen a los de delante' },
  tetera:   { name: 'Tetera Tornado',        icon: '🫖', hint: 'Un remolino de té con tacitas voladoras recorre la pista y hace girar a todos' },
  cohete:   { name: 'Cohete Purpurina',      icon: '🚀', hint: 'Turbo brutal: un cohete de juguete sale disparado y te arrastra dejando una estela de purpurina' },
  alfombra: { name: 'Alfombra Arcoíris',     icon: '🌈', hint: 'Una alfombra arcoíris se desenrolla delante y la surfeas a toda velocidad' },
  chicle:   { name: 'Globo de Chicle',       icon: '🎈', hint: 'Botas como una pelota por encima de todo' },
  antigrav: { name: 'Burbuja Antigravedad',  icon: '🪐', hint: 'Los que tienes cerca salen flotando en burbujas' },
  // v12: potenciadores de VELOCIDAD con transformación (los manejas tú) y final explosivo
  topo:     { name: 'Topo Excavador',        icon: '🐹', hint: '10 s bajo tierra a toda pastilla, lo manejas tú… ¡y sales con un PUM!' },
  bola:     { name: 'Bola de Circo',         icon: '🎪', hint: 'Haces equilibrios sobre una bola gigante de algodón que crece y acelera: ¡PLOF!' },
  delfin:   { name: 'Delfín de Gelatina',    icon: '🐬', hint: 'Nadas bajo la pista y saltas en arcos: cada chapuzón hace girar a los de al lado' },
};
// pesos por posición: [delante, mitad, detrás]
export const POWER_W = {
  tiburon: [0, 0.3, 2.2], estrella: [0, 0.8, 2.0], aladelta: [0.2, 1.2, 1.8], reloj: [0, 1.0, 1.6], piano: [0, 0.8, 1.6],
  peces: [0.4, 1.6, 1.4], tetera: [2.0, 1.6, 0.6], cohete: [0.6, 1.4, 1.5], alfombra: [0.6, 1.3, 1.4], chicle: [1.6, 1.4, 0.8], antigrav: [1.4, 1.2, 0.6],
  topo: [0.2, 1.2, 1.7], bola: [0.3, 1.2, 1.6], delfin: [0.2, 1.2, 1.7],
};
// solo afectan a quien los usa (justos en el online P2P)
export const SELF_POWERS = ['tiburon', 'estrella', 'aladelta', 'cohete', 'alfombra', 'chicle', 'topo', 'bola', 'delfin'];
export const MORPH = { topo: { t: 10, v: 1.38 }, bola: { t: 8, v: 1.18 }, delfin: { t: 8, v: 1.42 } };

// ---------------- geometría y materiales compartidos ----------------
const G = {}; const geo = (n, f) => { if (!G[n]) { G[n] = f(); G[n]._shared = true; } return G[n]; };
const M = {}; const mat = (n, f) => M[n] || (M[n] = f());
const sph = s => geo('ps' + s, () => new THREE.SphereGeometry(1, s, Math.max(6, s * 0.7 | 0)));
const box = () => geo('pbox', () => new THREE.BoxGeometry(1, 1, 1));
const cone = s => geo('pcone' + s, () => new THREE.ConeGeometry(1, 1, s));
const cyl = s => geo('pcyl' + s, () => new THREE.CylinderGeometry(1, 1, 1, s));
const add = (o, b = 1) => new THREE.MeshBasicMaterial({ color: o, transparent: true, opacity: b, blending: THREE.AdditiveBlending, depthWrite: false });
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const sprite = (color, s, op = 0.8) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(color), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: op })); sp.scale.setScalar(s); return sp; };

const windowTex = () => mat('winTex', () => canvasTex(64, 128, (x, w, h) => { x.fillStyle = '#4a3a8a'; x.fillRect(0, 0, w, h); for (let j = 0; j < 8; j++) for (let i = 0; i < 3; i++) { x.fillStyle = R() < 0.75 ? ['#ffe9a0', '#ffd0f0', '#a0f0ff'][(i + j) % 3] : '#2a1a5a'; x.fillRect(6 + i * 20, 6 + j * 15, 12, 9); } }));

// --- Tiburón con ciudad dentro ---
const boomMats = {}; function boomMat(kind) { return boomMats[kind] || (boomMats[kind] = new THREE.MeshBasicMaterial({ color: kind === 'topo' ? '#ffcf8a' : kind === 'bola' ? '#ffb3e0' : '#bfefff', transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })); }
function makeShark() {
  const g = new THREE.Group();
  const glass = mat('sharkGlass', () => toon('#7fd8ff', { opacity: 0.34, rim: 1.2, emissive: '#3fa8ff', ei: 0.25, nocache: true }));
  const fin = mat('sharkFin', () => toon('#5fb0f0', { opacity: 0.55, rim: 1, emissive: '#3f8fff', ei: 0.2, nocache: true }));
  const body = mesh(sph(24), glass, g, [0, 2.2, 0.2], null, [2.4, 2.1, 5.2]); body.renderOrder = 6;
  mesh(cone(10), fin, g, [0, 4.9, -0.4], [-0.35, 0, 0], [0.5, 2.0, 1.3]).renderOrder = 6;
  const tail = new THREE.Group(); tail.position.set(0, 2.4, -5.2); g.add(tail);
  mesh(cone(10), fin, tail, [0, 1.0, -0.9], [-0.9, 0, 0], [0.35, 2.2, 0.9]).renderOrder = 6;
  mesh(cone(10), fin, tail, [0, -0.7, -0.8], [-2.3, 0, 0], [0.3, 1.6, 0.8]).renderOrder = 6;
  for (const s of [-1, 1]) { mesh(cone(8), fin, g, [s * 2.3, 1.3, 0.8], [0.4, 0, s * 1.9], [0.35, 1.8, 1.0]).renderOrder = 6;
    const e = mesh(sph(12), toon('#ffffff'), g, [s * 1.35, 3.0, 4.0], null, 0.42); mesh(sph(10), toon('#1a1030', { rim: 0 }), e, [s * 0.15, 0.1, 0.7], null, 0.55); mesh(sph(6), toon('#ffffff', { rim: 0 }), e, [s * 0.05, 0.4, 0.95], null, 0.18); }
  for (let i = 0; i < 9; i++) { const a = (i / 8 - 0.5) * 2.2; mesh(cone(4), toon('#ffffff', { emissive: '#ffffff', ei: 0.2 }), g, [Math.sin(a) * 1.6, 1.25, 4.3 + Math.cos(a) * 0.4], [Math.PI, 0, 0], [0.16, 0.45, 0.16]); }
  // la ciudad: edificios con ventanas encendidas y una cúpula
  const city = new THREE.Group(); city.position.set(0, 0.6, -1.8); g.add(city);
  const bm = [mat('bA', () => toon('#c9b8ff', { emissive: '#ffffff', ei: 0.1 })), mat('bB', () => toon('#ffb3d6', { emissive: '#ffffff', ei: 0.1 })), mat('bC', () => toon('#9fe8ff', { emissive: '#ffffff', ei: 0.1 }))];
  const wm = mat('winM', () => new THREE.MeshBasicMaterial({ map: windowTex() }));
  const B = [[-1.0, 0.8, 1.6], [0.1, 0.7, 2.4], [1.0, 0.9, 1.3], [-0.5, -0.7, 1.9], [0.7, -0.9, 2.8], [-1.1, -1.8, 1.2], [0.3, -2.2, 1.7], [1.2, -2.6, 1.0]];
  B.forEach(([x, z, h], i) => { const b = mesh(box(), i % 2 ? wm : bm[i % 3], city, [x, h / 2, z], null, [0.6, h, 0.6]); if (i === 1) mesh(sph(10), bm[2], city, [x, h + 0.1, z], null, 0.42); if (i === 4) mesh(cone(6), bm[1], city, [x, h + 0.4, z], null, [0.3, 0.8, 0.3]); });
  for (let i = 0; i < 5; i++) mesh(sph(6), add('#ffe9a0', 0.9), city, [(R() - 0.5) * 2, 0.4 + R() * 2, (R() - 0.5) * 4], null, 0.09);
  const glow = sprite('#7fd8ff', 13, 0.35); glow.position.set(0, 2.2, 0); g.add(glow);
  g.userData = { tail, city, body };
  g.scale.setScalar(0.72); g.position.z = 0.8; // cabe la cámara por detrás: se ve el tiburón entero
  return g;
}
// --- Superestrella ---
function makeStarAura() {
  const g = new THREE.Group();
  const sg = geo('pstar', () => new THREE.ExtrudeGeometry(starShape(0.6, 0.27), { depth: 0.2, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 1 }));
  const stars = []; for (let i = 0; i < 5; i++) { const s = mesh(sg, toon(['#ffe066', '#ff8fd8', '#7ff5ff', '#9dff7a', '#ffb36b'][i], { emissive: '#ffffff', ei: 0.35 }), g); stars.push(s); }
  stars.forEach(s => s.scale.setScalar(1.5));
  const shell = mesh(sph(20), add('#ffe066', 0.16), g, [0, 1.3, 0], null, 2.4);
  const glow = sprite('#fff2a0', 5, 0.45); glow.position.y = 1.3; g.add(glow);
  g.userData = { stars, shell, glow };
  return g;
}
// --- Ala delta ---
function makeGlider() {
  const g = new THREE.Group();
  const tex = mat('gliderTex', () => canvasTex(256, 128, (x, w, h) => { const c = ['#ff6fb0', '#ffd84a', '#7ff5ff', '#b98cff', '#9dff7a', '#ff9f5a']; for (let i = 0; i < 6; i++) { x.fillStyle = c[i]; x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(i * w / 6, h); x.lineTo((i + 1) * w / 6, h); x.closePath(); x.fill(); } }));
  const wg = geo('wing', () => { const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 2.6, -4.2, -0.4, -1.4, 4.2, -0.4, -1.4], 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute([0.5, 0, 0, 1, 1, 1], 2)); gg.computeVertexNormals(); return gg; });
  mesh(wg, mat('wingM', () => new THREE.MeshToonMaterial({ map: tex, side: THREE.DoubleSide })), g, [0, 3.6, 0]);
  const rod = mat('rod', () => toon('#5a3a6e'));
  for (const s of [-1, 1]) mesh(cyl(6), rod, g, [s * 0.7, 2.6, 0.2], [0, 0, s * 0.5], [0.06, 2.1, 0.06]);
  mesh(cyl(6), rod, g, [0, 3.65, 0.6], [Math.PI / 2, 0, 0], [0.07, 4, 0.07]);
  for (const s of [-1, 1]) { const t = sprite('#ffffff', 1.4, 0.6); t.position.set(s * 4.1, 3.2, -1.4); g.add(t); }
  return g;
}
// --- Reloj derretido v12: burbuja del tiempo (sin reloj): cúpula de cristal ámbar con ondas lentas,
//     anillo de marcas doradas que gira despacio, espiral de arena que cae y relojes de arena diminutos
const timeMat = () => mat('timeBub', () => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
  uniforms: { uT: { value: 0 } },
  vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position,1.0); vV = -mv.xyz; vN = normalMatrix * normal; gl_Position = projectionMatrix * mv; }',
  fragmentShader: 'uniform float uT; varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ float fr = 1.0 - abs(dot(normalize(vN), normalize(vV))); fr = pow(fr, 2.2);' +
    ' float band = smoothstep(0.82, 1.0, sin(vP.y * 9.0 - uT * 2.2) * 0.5 + 0.5) * 0.18; float sw = smoothstep(0.9, 1.0, sin(atan(vP.z, vP.x) * 6.0 + vP.y * 3.0 + uT * 0.8)) * 0.12;' +
    ' vec3 c = mix(vec3(1.0, 0.78, 0.45), vec3(1.0, 0.95, 0.82), fr); gl_FragColor = vec4(c, clamp(fr * 0.55 + band + sw, 0.0, 0.62)); }' }));
function makeTimeAura() {
  const g = new THREE.Group();
  const dome = mesh(sph(24), timeMat(), g, [0, 1.3, 0], null, [2.5, 2.1, 2.5]); dome.renderOrder = 7;
  const ring = new THREE.Group(); ring.position.y = 0.25; g.add(ring);
  const gold = mat('tickGold', () => toon('#ffd27a', { emissive: '#c88a2a', ei: 0.25, rim: 0.9 })), cream = mat('tickCream', () => toon('#fff4dc', { rim: 0.6 }));
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, big = i % 3 === 0; mesh(box(), big ? gold : cream, ring, [Math.cos(a) * 2.75, 0, Math.sin(a) * 2.75], [0, -a, 0], big ? [0.55, 0.16, 0.2] : [0.32, 0.1, 0.12]); }
  mesh(geo('tRing', () => new THREE.TorusGeometry(2.75, 0.05, 6, 64)), gold, ring, [0, 0, 0], [Math.PI / 2, 0, 0]);
  // relojes de arena diminutos que orbitan
  const glasses = []; const glassM = mat('hgGlass', () => toon('#e9fbff', { opacity: 0.55, rim: 1.1 })), sandM = mat('hgSand', () => toon('#ffc96b', { emissive: '#ff9f3a', ei: 0.2 })), woodM = mat('hgWood', () => toon('#8a5a3a', { rim: 0.4 }));
  for (let i = 0; i < 3; i++) { const h = new THREE.Group(); g.add(h);
    for (const s of [-1, 1]) { mesh(cone(10), glassM, h, [0, s * 0.22, 0], s > 0 ? null : [Math.PI, 0, 0], [0.22, 0.42, 0.22]); mesh(cyl(10), woodM, h, [0, s * 0.46, 0], null, [0.3, 0.06, 0.3]); }
    mesh(cone(10), sandM, h, [0, -0.3, 0], null, [0.15, 0.22, 0.15]); mesh(cone(10), sandM, h, [0, 0.12, 0], [Math.PI, 0, 0], [0.09, 0.14, 0.09]);
    for (const x of [-0.24, 0.24]) mesh(cyl(5), woodM, h, [x, 0, 0], null, [0.035, 0.9, 0.035]); glasses.push(h); }
  // espiral de arena
  const sandG = geo('sandHelix', () => { const n = 90, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const u = i / n; a[i * 3] = Math.cos(u * 18) * 2.1; a[i * 3 + 1] = 3.2 - u * 3.2; a[i * 3 + 2] = Math.sin(u * 18) * 2.1; } const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(a, 3)); return gg; });
  const sand = new THREE.Points(sandG, mat('sandPts', () => new THREE.PointsMaterial({ color: '#ffd28a', size: 0.22, transparent: true, opacity: 0.9, depthWrite: false }))); g.add(sand);
  g.userData = { dome, ring, glasses, sand };
  return g;
}
// --- Piano ---
function makePiano() {
  const g = new THREE.Group();
  const blk = mat('pianoB', () => toon('#2a1838', { rim: 0.9 })), wht = mat('pianoW', () => toon('#ffffff')), gold = mat('pianoG', () => toon('#ffd84a', { emissive: '#ffb000', ei: 0.3 }));
  const b = mesh(box(), blk, g, [0, 1.6, 0], null, [4, 1.3, 3]); outline(b, '#ff8fd8', 1.05);
  mesh(box(), wht, g, [0, 1.95, 1.65], null, [3.7, 0.25, 0.6]);
  for (let i = 0; i < 9; i++) mesh(box(), blk, g, [-1.6 + i * 0.4, 2.12, 1.6], null, [0.18, 0.16, 0.38]);
  mesh(box(), blk, g, [0, 2.8, -0.4], [-0.5, 0, 0], [3.9, 0.12, 2.6]);
  for (const [x, z] of [[-1.7, 1.2], [1.7, 1.2], [0, -1.2]]) mesh(cyl(8), gold, g, [x, 0.5, z], null, [0.18, 1.0, 0.18]);
  for (let i = 0; i < 3; i++) { const n = mesh(sph(8), gold, g, [-1 + i, 4 + i * 0.6, 0], null, 0.25); mesh(box(), gold, n, [0.9, 2.2, 0], null, [0.3, 4, 0.3]); }
  return g;
}
const ringGeo = () => geo('pring', () => new THREE.RingGeometry(0.8, 1, 32));
// --- Pez volador ---
function makeFish(i) {
  const g = new THREE.Group();
  const c = ['#ff9f5a', '#7ff5ff', '#ff8fd8'][i % 3];
  const b = mesh(sph(14), toon(c, { rim: 0.8, emissive: c, ei: 0.15 }), g, [0, 0, 0], null, [0.55, 0.65, 1.2]); outline(b, '#5a3a6e', 1.06);
  const tl = mesh(cone(8), toon(c), g, [0, 0, -1.3], [-Math.PI / 2, 0, 0], [0.5, 0.8, 0.2]);
  const wings = []; for (const s of [-1, 1]) { const w = mesh(sph(10), toon('#ffffff', { opacity: 0.75 }), g, [s * 0.7, 0.2, 0.1], null, [0.9, 0.06, 0.45]); wings.push([w, s]); }
  for (const s of [-1, 1]) { const e = mesh(sph(8), toon('#ffffff'), g, [s * 0.38, 0.22, 0.8], null, 0.2); mesh(sph(6), toon('#1a1030', { rim: 0 }), e, [0, 0, 0.6], null, 0.6); }
  g.userData = { wings, tl }; g.scale.setScalar(1.4);
  return g;
}
// --- Tetera tornado v12: sin deslumbrar. Remolino de té sólido (cintas en espiral con sombreado toon),
//     tetera de porcelana con flores que vierte el chorro, tacitas y terrones de azúcar girando alrededor
function makeTeapot() {
  const g = new THREE.Group();
  const pot = new THREE.Group(); pot.position.y = 4.6; g.add(pot);
  const pm = mat('potPorc', () => toon('#f4fbff', { rim: 0.5 })), dm = mat('potRose', () => toon('#ff8fb8', { rim: 0.3 })), gm = mat('potGold', () => toon('#ffd27a', { emissive: '#b07a20', ei: 0.15, rim: 0.7 })), lm = mat('potLeaf', () => toon('#7fd6a0'));
  const b = mesh(geo('potBody', () => new THREE.LatheGeometry([[0.01, -1], [0.9, -0.95], [1.3, -0.4], [1.3, 0.3], [0.8, 0.9], [0.01, 0.95]].map(([r, y]) => new THREE.Vector2(r, y)), 24)), pm, pot); outline(b, '#6a4a7e', 1.04);
  mesh(geo('potBand', () => new THREE.TorusGeometry(1.3, 0.07, 6, 32)), gm, pot, [0, -0.05, 0], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 6; i++) { const a = i * 1.047; mesh(sph(8), dm, pot, [Math.cos(a) * 1.27, 0.25, Math.sin(a) * 1.27], null, 0.2); mesh(sph(6), lm, pot, [Math.cos(a + 0.25) * 1.29, 0.12, Math.sin(a + 0.25) * 1.29], null, [0.12, 0.07, 0.12]); }
  mesh(cyl(8), pm, pot, [1.5, 0.2, 0], [0, 0, -0.9], [0.18, 1.3, 0.18]);
  mesh(geo('potHandle', () => new THREE.TorusGeometry(0.55, 0.12, 6, 16, Math.PI * 1.3)), gm, pot, [-1.3, 0.1, 0], [0, 0, 1.0]);
  mesh(sph(10), gm, pot, [0, 1.05, 0], null, 0.25);
  pot.rotation.z = -0.35;
  // remolino: 3 cintas helicoidales opacas (sin mezcla aditiva) que se ensanchan hacia arriba
  const ribbonG = (ph) => geo('teaRib' + ph, () => { const n = 70, pos = [], idx = []; for (let i = 0; i <= n; i++) { const u = i / n, a = u * 9 + ph, r = 0.35 + u * 2.1, y = u * 4.4, w = 0.22 + u * 0.35; pos.push(Math.cos(a) * r, y - w, Math.sin(a) * r, Math.cos(a) * r, y + w, Math.sin(a) * r); if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setIndex(idx); gg.computeVertexNormals(); return gg; });
  const tw = new THREE.Group(); g.add(tw);
  const tm = [mat('teaA', () => toon('#c9864a', { side: THREE.DoubleSide, rim: 0.25 })), mat('teaB', () => toon('#e3a768', { side: THREE.DoubleSide, rim: 0.25 })), mat('teaC', () => toon('#f6dcb4', { side: THREE.DoubleSide, rim: 0.2, opacity: 0.85 }))];
  for (let i = 0; i < 3; i++) mesh(ribbonG(i * 2.09), tm[i], tw);
  // chorro de té desde el pico hasta el remolino
  mesh(cyl(8), tm[0], g, [1.4, 3.3, 0], [0, 0, 0.25], [0.16, 1.9, 0.16]);
  // tacitas y terrones orbitando
  const orbit = new THREE.Group(); g.add(orbit); const cups = [];
  for (let i = 0; i < 4; i++) { const c = new THREE.Group(); const a = i * 1.571; c.position.set(Math.cos(a) * 2.6, 1.2 + i * 0.7, Math.sin(a) * 2.6); orbit.add(c);
    if (i % 2 === 0) { mesh(geo('cupB', () => new THREE.CylinderGeometry(0.42, 0.28, 0.45, 14, 1, true)), mat('cupM', () => toon('#ffffff', { side: THREE.DoubleSide, rim: 0.4 })), c); mesh(cyl(14), tm[0], c, [0, 0.15, 0], null, [0.38, 0.02, 0.38]); mesh(geo('cupH', () => new THREE.TorusGeometry(0.15, 0.05, 5, 10)), dm, c, [0.45, 0, 0]); mesh(cyl(16), dm, c, [0, -0.25, 0], null, [0.6, 0.05, 0.6]); }
    else mesh(box(), mat('sugar', () => toon('#ffffff', { rim: 0.6 })), c, [0, 0, 0], [0.4, 0.5, 0.2], 0.42);
    cups.push(c); }
  g.userData = { pot, tw, orbit, cups }; g.scale.setScalar(1.35);
  return g;
}
// --- v15: Cohete Purpurina (sustituye a la Puerta Espejo: nada de teletransporte) ---
const CONF = ['#ff6fb0', '#ffd84a', '#7ff5ff', '#9dff7a', '#b98cff', '#ffffff', '#ff9f5a'];
function makeRocket() {
  const g = new THREE.Group(), r = new THREE.Group(); g.add(r);
  const bodyM = mat('rkBody', () => toon('#4fc8ff', { rim: 0.9, emissive: '#2f8fff', ei: 0.2 })), wM = mat('rkWhite', () => toon('#fff4fb', { rim: 0.6 })), yM = mat('rkYel', () => toon('#ffd84a', { emissive: '#ffb000', ei: 0.3, rim: 0.7 })), glassM = mat('rkGlass', () => toon('#7ff5ff', { emissive: '#3fd8ff', ei: 0.35, rim: 1 }));
  const b = mesh(cyl(16), bodyM, r, [0, 0, 0], [Math.PI / 2, 0, 0], [0.55, 3.0, 0.55]); outline(b, '#5a3a6e', 1.05);
  mesh(cone(16), wM, r, [0, 0, 2.05], [Math.PI / 2, 0, 0], [0.55, 1.1, 0.55]);
  mesh(sph(12), glassM, r, [0, 0.42, 0.7], null, [0.3, 0.22, 0.34]);
  for (let i = 0; i < 3; i++) mesh(cyl(16), i % 2 ? wM : yM, r, [0, 0, -0.9 + i * 0.75], [Math.PI / 2, 0, 0], [0.57, 0.14, 0.57]);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; mesh(box(), yM, r, [Math.cos(a) * 0.75, Math.sin(a) * 0.75, -1.2], [0, 0, a], [0.5, 0.08, 0.9]); }
  const fl = new THREE.Group(); fl.position.z = -1.6; r.add(fl);
  mesh(cone(10), mat('rkFlame', () => add('#ffd84a', 0.9)), fl, [0, 0, -0.7], [-Math.PI / 2, 0, 0], [0.45, 1.4, 0.45]);
  mesh(cone(10), mat('rkFlame2', () => add('#ff6fb0', 0.8)), fl, [0, 0, -1.2], [-Math.PI / 2, 0, 0], [0.3, 2.0, 0.3]);
  const glow = sprite('#ffd84a', 2.4, 0.55); glow.position.z = -2.4; r.add(glow);
  // carita sonriente
  for (const s of [-1, 1]) mesh(sph(6), mat('rkEye', () => toon('#1a1030', { rim: 0 })), r, [s * 0.2, 0.25, 1.4], null, [0.07, 0.09, 0.05]);
  g.userData = { r, fl }; return g;
}
// --- v15: Alfombra Arcoíris: alfombra voladora con flecos que se desenrolla delante y la surfeas
function makeCarpet() {
  const g = new THREE.Group();
  const tex = mat('carpetTex', () => canvasTex(64, 256, (x, w, h) => { const c = ['#ff6f8a', '#ffb36b', '#ffe066', '#9dff7a', '#7ff5ff', '#b98cff']; for (let i = 0; i < 6; i++) { x.fillStyle = c[i]; x.fillRect(i * w / 6, 0, w / 6 + 1, h); } x.fillStyle = 'rgba(255,255,255,.55)'; for (let j = 0; j < 16; j++) { x.beginPath(); x.arc(w / 2, j * 16 + 8, 4, 0, 7); x.fill(); } }));
  const cm = mat('carpetM', () => new THREE.MeshToonMaterial({ map: tex, side: THREE.DoubleSide }));
  const sheet = new THREE.Group(); g.add(sheet);
  const pg = geo('carpetG', () => { const gg = new THREE.PlaneGeometry(4.4, 1, 6, 20); gg.rotateX(-Math.PI / 2); gg.translate(0, 0, 0.5); return gg; });
  const pl = mesh(pg, cm, sheet, [0, 0.15, 0]);
  const roll = mesh(cyl(14), cm, g, [0, 0.5, 0], [0, 0, Math.PI / 2], [0.45, 4.5, 0.45]);
  const fr = mat('fringe', () => toon('#ffd84a', { emissive: '#ffb000', ei: 0.3 }));
  for (const s of [-1, 1]) for (let i = 0; i < 5; i++) mesh(sph(6), fr, sheet, [s * 2.25, 0.15, -1.5 + i * 0.75], null, 0.13);
  const sp = [];
  for (let i = 0; i < 6; i++) { const t = sprite(CONF[i], 1.1, 0.7); g.add(t); sp.push(t); }
  g.userData = { sheet, pl, roll, sp }; return g;
}

// --- Portal espejo ---
function makePortal() {
  const g = new THREE.Group();
  const swirl = mat('swirlTex', () => canvasTex(128, 128, (x) => { const gr = x.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, '#c8a8ff'); gr.addColorStop(1, '#5f3fbf'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 5; for (let k = 0; k < 4; k++) { x.beginPath(); for (let a = 0; a < 9; a += 0.1) { const r = a * 6; x.lineTo(64 + Math.cos(a + k * 1.57) * r, 64 + Math.sin(a + k * 1.57) * r); } x.stroke(); } }));
  const disc = mesh(geo('pdisc', () => new THREE.CircleGeometry(3, 32)), new THREE.MeshBasicMaterial({ map: swirl, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }), g, [0, 3.2, 0]);
  const frame = mesh(geo('pframe', () => new THREE.TorusGeometry(3.1, 0.35, 10, 36)), toon('#ffd84a', { emissive: '#ffb000', ei: 0.4, rim: 1 }), g, [0, 3.2, 0]);
  const glow = sprite('#c8a8ff', 11, 0.6); glow.position.y = 3.2; g.add(glow);
  g.userData = { disc, frame }; g.visible = false;
  return g;
}
// --- Globo de chicle / burbuja antigravedad ---
function makeBubble(color, hi) {
  const g = new THREE.Group();
  const b = mesh(sph(20), toon(color, { opacity: 0.42, rim: 1.3, emissive: color, ei: 0.2, nocache: true }), g, [0, 1.4, 0], null, 2.5); b.renderOrder = 7;
  const s = mesh(sph(8), add('#ffffff', 0.7), g, [-0.8, 2.6, 1.2], null, [0.45, 0.3, 0.2]);
  if (hi) for (let i = 0; i < 2; i++) mesh(geo('aring', () => new THREE.TorusGeometry(2.9, 0.06, 6, 40)), mat('aringM', () => add('#c8a8ff', 0.8)), g, [0, 1.4, 0], [1.2 + i * 0.7, i, 0]);
  g.userData = { b };
  return g;
}

// --- v12: Topo Excavador: montículo de tierra con terrones, hierba, una piedra, el hocico rosa y las garras del topo con casco de minero
function makeMound() {
  const g = new THREE.Group();
  const dirt = mat('dirt', () => toon('#8a5a3a', { rim: 0.25 })), dirt2 = mat('dirt2', () => toon('#a8714a', { rim: 0.25 })), grass = mat('grassT', () => toon('#7fd67a', { rim: 0.3 })), rock = mat('rockT', () => toon('#b8b0c8', { rim: 0.4 }));
  const hill = new THREE.Group(); g.add(hill);
  mesh(geo('moundG', () => { const gg = new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2); const p = gg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const n = 1 + Math.sin(x * 7 + z * 3) * 0.06 + Math.cos(z * 9 - x * 2) * 0.05; p.setXYZ(i, x * n, y * n, z * n); } gg.computeVertexNormals(); return gg; }), dirt, hill, [0, -0.1, 0], null, [2.1, 1.35, 2.6]);
  for (let i = 0; i < 9; i++) { const a = i * 0.7, r = 1.2 + (i % 3) * 0.35; mesh(sph(7), i % 2 ? dirt2 : dirt, hill, [Math.cos(a) * r, 0.2 + (i % 4) * 0.18, Math.sin(a) * r * 1.2], null, 0.28 + (i % 3) * 0.1); }
  for (let i = 0; i < 6; i++) { const a = i * 1.1 + 0.3; mesh(cone(4), grass, hill, [Math.cos(a) * 1.6, 0.55, Math.sin(a) * 1.9], [0.3 * Math.cos(a), 0, 0.3 * Math.sin(a)], [0.09, 0.5, 0.09]); }
  mesh(sph(6), rock, hill, [0.8, 1.0, -0.6], [0.4, 0.2, 0], [0.35, 0.25, 0.3]);
  // topo asomando por delante
  const head = new THREE.Group(); head.position.set(0, 0.6, 2.2); g.add(head);
  const fur = mat('moleFur', () => toon('#6a4a6e', { rim: 0.6 })), pink = mat('molePink', () => toon('#ff9fc0', { rim: 0.4 })), yel = mat('moleHat', () => toon('#ffd84a', { emissive: '#b08000', ei: 0.15, rim: 0.6 }));
  mesh(sph(14), fur, head, [0, 0, 0], null, [0.85, 0.75, 0.8]);
  mesh(sph(10), pink, head, [0, -0.05, 0.75], null, [0.3, 0.24, 0.3]);
  for (const s of [-1, 1]) { mesh(sph(6), mat('moleEye', () => toon('#1a1030', { rim: 0 })), head, [s * 0.3, 0.25, 0.65], null, 0.08); mesh(sph(8), pink, head, [s * 0.75, -0.45, 0.45], null, [0.32, 0.16, 0.28]);
    for (let c = -1; c <= 1; c++) mesh(cone(4), mat('claw', () => toon('#fff4e6')), head, [s * 0.75 + c * 0.12, -0.5, 0.75], [Math.PI / 2, 0, 0], [0.05, 0.18, 0.05]); }
  mesh(sph(12), yel, head, [0, 0.45, -0.05], null, [0.75, 0.45, 0.75]); mesh(cyl(10), mat('lamp', () => new THREE.MeshBasicMaterial({ color: '#fff6c0' })), head, [0, 0.62, 0.62], [Math.PI / 2, 0, 0], [0.16, 0.1, 0.16]);
  const lampGlow = sprite('#fff2b0', 2.2, 0.45); lampGlow.position.set(0, 0.62, 0.8); head.add(lampGlow);
  g.userData = { hill, head };
  return g;
}
// --- v12: Bola de Circo: bola gigante de algodón de azúcar con espiral, estrellas y lunares; el piloto hace equilibrios encima
const ballTex = () => mat('ballTex', () => canvasTex(256, 128, (x, w, h) => { const c = ['#ff9fd0', '#ffffff', '#9fe0ff', '#ffffff', '#ffd27a', '#ffffff']; for (let i = 0; i < 12; i++) { x.fillStyle = c[i % 6]; x.beginPath(); x.moveTo(i * w / 12, 0); x.lineTo((i + 1) * w / 12, 0); x.lineTo((i + 1) * w / 12 + 40, h); x.lineTo(i * w / 12 + 40, h); x.fill(); }
  x.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 30; i++) { x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 3 + Math.random() * 4, 0, 7); x.fill(); } }));
function makeCircusBall() {
  const g = new THREE.Group();
  const ball = mesh(sph(28), mat('ballM', () => { const m = new THREE.MeshToonMaterial({ map: ballTex() }); return m; }), g, [0, 0, 0], null, 1); ball.castShadow = true;
  const fluff = mat('fluff', () => toon('#ffd6ec', { opacity: 0.55, rim: 1.1, nocache: true }));
  const halo = mesh(sph(16), fluff, g, [0, 0, 0], null, 1.12); halo.renderOrder = 5;
  const stars = []; const sg = geo('pstar', () => new THREE.ExtrudeGeometry(starShape(0.6, 0.27), { depth: 0.2, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 1 }));
  for (let i = 0; i < 4; i++) { const s = mesh(sg, toon(['#ffe066', '#ff8fd8', '#7ff5ff', '#9dff7a'][i], { emissive: '#ffffff', ei: 0.2 }), g); s.scale.setScalar(0.6); stars.push(s); }
  g.userData = { ball, halo, stars };
  return g;
}
// --- v12: Delfín de Gelatina: delfín translúcido de gelatina de fresa con burbujas dentro y el piloto montado
function makeDolphin() {
  const g = new THREE.Group(); const body = new THREE.Group(); g.add(body);
  const jel = mat('jelly', () => toon('#7fd8ff', { opacity: 0.78, rim: 1.0, emissive: '#3fa8ff', ei: 0.18, nocache: true })), belly = mat('jellyB', () => toon('#e6fbff', { opacity: 0.85, rim: 0.6, nocache: true }));
  const b = mesh(sph(22), jel, body, [0, 0, 0], null, [1.1, 1.05, 2.9]); b.renderOrder = 6;
  mesh(sph(14), belly, body, [0, -0.45, 0.4], null, [0.8, 0.6, 2.2]).renderOrder = 6;
  mesh(sph(14), jel, body, [0, -0.15, 2.95], null, [0.38, 0.32, 0.8]).renderOrder = 6; // hocico
  mesh(cone(10), jel, body, [0, 1.15, -0.2], [-0.5, 0, 0], [0.32, 1.1, 0.7]).renderOrder = 6;
  for (const s of [-1, 1]) { mesh(cone(8), jel, body, [s * 1.0, -0.4, 0.6], [0.6, 0, s * 1.9], [0.25, 1.0, 0.55]).renderOrder = 6;
    const e = mesh(sph(10), mat('dEye', () => toon('#ffffff')), body, [s * 0.62, 0.3, 2.1], null, 0.24); mesh(sph(8), mat('dPup', () => toon('#1a1030', { rim: 0 })), e, [s * 0.2, 0.05, 0.8], null, 0.55); }
  const tail = new THREE.Group(); tail.position.set(0, 0, -2.7); body.add(tail);
  for (const s of [-1, 1]) mesh(cone(8), jel, tail, [s * 0.6, 0, -0.4], [Math.PI / 2, 0, s * 1.1], [0.3, 1.2, 0.18]).renderOrder = 6;
  for (let i = 0; i < 7; i++) mesh(sph(6), mat('dBub', () => toon('#ffffff', { opacity: 0.7, rim: 0.8, nocache: true })), body, [(R() - 0.5) * 1.1, (R() - 0.3) * 0.9, (R() - 0.5) * 3.6], null, 0.08 + R() * 0.1);
  // salpicadura (anillo de agua de gelatina)
  const splash = mesh(geo('splR', () => new THREE.TorusGeometry(1, 0.18, 6, 28)), mat('splM', () => toon('#bfefff', { opacity: 0.75, rim: 0.8, nocache: true })), g, [0, 0, 0], [Math.PI / 2, 0, 0], 1); splash.visible = false;
  g.userData = { body, tail, splash };
  return g;
}

// ======================================================================
export class PowerFX {
  constructor(race) {
    this.race = race; this.projs = []; this.portals = [makePortal(), makePortal()]; this.portals.forEach(p => race.scene.add(p)); this.pI = 0; this.booms = [];
    // v15: confeti de verdad (papelitos opacos de colores que giran y caen), reciclado para no crear nada en carrera
    const cg = geo('confG', () => new THREE.PlaneGeometry(0.32, 0.2)); this.conf = []; this.cI = 0;
    for (let i = 0; i < 90; i++) { const m = new THREE.Mesh(cg, mat('conf' + (i % 7), () => new THREE.MeshBasicMaterial({ color: CONF[i % 7], side: THREE.DoubleSide }))); m.visible = false; m.userData = { v: new V3(), w: new V3(), life: 0 }; race.scene.add(m); this.conf.push(m); }
    // pools para proyectiles
    this.pool = { piano: [], fish: [], tea: [] };
  }
  // v13: precalentado. Antes cada potenciador compilaba sus shaders y subía sus texturas la PRIMERA vez que salía
  // (tirones de 300-600 ms). Ahora se monta una copia de cada efecto delante de la cámara y se compila al cargar la carrera.
  prewarm(renderer, camera) {
    const RC = this.race, g = new THREE.Group(); let made = [];
    for (const f of [makeShark, makeStarAura, makeGlider, makeTimeAura, makePiano, () => makeFish(0), makeTeapot, () => makeBubble('#ff8fd8'), () => makeBubble('#c8a8ff', true), makeMound, makeCircusBall, makeDolphin, makeRocket, makeCarpet, () => this.ringFor()]) { try { const o = f(); if (o) { if (o.parent) o.parent.remove(o); made.push(o); g.add(o); } } catch (e) { /* un efecto que falle no debe romper la carrera */ } }
    for (const kind of ['topo', 'bola', 'delfin']) g.add(new THREE.Mesh(geo('boomR', () => new THREE.RingGeometry(0.75, 1, 40)), boomMat(kind)));
    camera.updateMatrixWorld(); const fw = new V3(0, 0, -12).applyQuaternion(camera.quaternion); g.position.copy(camera.position).add(fw); g.scale.setScalar(0.3);
    g.traverse(o => { o.frustumCulled = false; o.visible = true; }); RC.scene.add(g); g.updateMatrixWorld(true);
    // también lo que está escondido en la escena (escudos de los karts, chispas, avisos...) se dibuja una vez
    const hidden = []; RC.scene.traverse(o => { if (!o.visible) { hidden.push([o, o.frustumCulled]); o.visible = true; o.frustumCulled = false; } });
    try { renderer.compile(RC.scene, camera); renderer.render(RC.scene, camera); /* en el lienzo real, tapado por la pantalla de carga */ g.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { for (const k of ['map', 'gradientMap', 'alphaMap']) if (m[k] && m[k].isTexture) renderer.initTexture(m[k]); }); }); } catch (e) {}
    for (const [o, fc] of hidden) { o.visible = false; o.frustumCulled = fc; }
    RC.scene.remove(g);
  }
  confetti(pos, vel) { const m = this.conf[this.cI = (this.cI + 1) % this.conf.length], u = m.userData; m.position.copy(pos); u.v.copy(vel); u.w.set(R() * 12, R() * 12, R() * 12); u.life = 1.1 + R() * 0.6; m.visible = true; m.scale.setScalar(0.8 + R() * 0.8); }
  get T() { return this.race.track; }
  // ---------- estado por kart ----------
  immune(k) { return k.sharkT > 0 || k.starT > 0 || k.flyT > 0 || k.gumT > 0 || k.morphT > 0 || k.rocketT > 0; }
  attach(k, key, make) { const u = k.mesh.userData; if (!u['fx_' + key]) { const m = make(); m.visible = false; k.mesh.add(m); u['fx_' + key] = m; } return u['fx_' + key]; }
  // multiplicador de velocidad, piloto automático, flotar...
  input(k, inp, dt) {
    if (k.remote) return inp;
    let v = 1;
    if (k.sharkT > 0) { k.sharkT -= dt; k.sharkAge = (k.sharkAge || 0) + dt; v = 2.0; k.boostT = Math.max(k.boostT, 0.25); if ((k.place === 1 && k.sharkAge > 1.5) || k.sharkT <= 0) { k.sharkT = 0; k.invT = Math.max(k.invT, 1); if (k.isPlayer) this.race.msg('¡Tiburón: eres el 1º!', k, '#7fd8ff'); } }
    if (k.starT > 0) { k.starT -= dt; v = Math.max(v, 1.22); }
    if (k.flyT > 0) { k.flyT -= dt; v = Math.max(v, 1.6); k.boostT = Math.max(k.boostT, 0.2); }
    if (k.gumT > 0) { k.gumT -= dt; v = Math.max(v, 1.22); if (!k.air && k.gumT > 0.3) { k.vy = 11; k.air = true; k.hop = true; if (k.isPlayer) Audio.sfxPlay('drift'); } }
    // v15: Cohete Purpurina: 3,2 s de turbo muy fuerte (solo multiplica la velocidad máxima; el volante es el de siempre)
    if (k.rocketT > 0) { k.rocketT -= dt; k.rocketAge = (k.rocketAge || 0) + dt; v = Math.max(v, k.rocketAge < 0.35 ? 1.4 : 1.85); k.boostT = Math.max(k.boostT, 0.25); if (k.rocketT <= 0 && k.isPlayer) this.race.msg('¡Fiuuu!', k, '#ff8fd8'); }
    // v15: Alfombra Arcoíris: 4,5 s surfeando más rápido
    if (k.carpetT > 0) { k.carpetT -= dt; k.carpetAge = (k.carpetAge || 0) + dt; v = Math.max(v, 1.55); k.boostT = Math.max(k.boostT, 0.15); }
    if (k.slowT > 0) { k.slowT -= dt; if (!this.immune(k)) v *= 0.58; }
    if (k.floatT > 0) { k.floatT -= dt; if (this.immune(k)) k.floatT = 0; else { k.vy = Math.max(k.vy, 2.2 + Math.sin(this.race.time * 3) * 0.6); k.air = true; k.hop = true; const f = Math.exp(-dt * 1.1); k.vx *= f; k.vz *= f; inp = { ...inp, steer: inp.steer * 0.3 }; } }
    if (k.morphT > 0) { k.morphT -= dt; k.morphAge = (k.morphAge || 0) + dt; const M = MORPH[k.morph];
      v = Math.max(v, k.morph === 'bola' ? M.v + Math.min(1, k.morphAge / M.t) * 0.34 : M.v);
      if (k.morph === 'delfin') { const ph = Math.floor(k.morphAge / 1.25); if (ph !== k.dPh) { k.dPh = ph; if (ph > 0) this.splash(k, 5.5, false); } }
      if (k.morphT <= 0) this.morphEnd(k); }
    k.fxV = v;
    if (k.sharkT > 0 || k.flyT > 0) inp = this.auto(k, inp, dt);
    k.flyH = lerp(k.flyH || 0, k.flyT > 0.4 ? 7 : 0, 1 - Math.exp(-dt * (k.flyT > 0 ? 3 : 5)));
    return inp;
  }
  // piloto automático por el centro de la pista (solo mientras dura el efecto)
  auto(k, inp, dt) {
    const T = this.T, look = Math.round((8 + Math.max(0, k.fs) * 0.45) / T.STEP);
    const ti = T.open ? Math.min(T.N - 1, k.idx + look) : (k.idx + look) % T.N, s = T.S[ti];
    const want = Math.atan2(s.p.x - k.pos.x, s.p.z - k.pos.z);
    k.yaw += angDiff(k.yaw, want) * (1 - Math.exp(-dt * 6)); k.driftDir = 0; k.spinT = 0; k.squashT = 0;
    return { steer: 0, throttle: 1, brake: false, drift: false, driftEdge: false, itemEdge: inp.itemEdge };
  }
  // choques kart-kart: estrella y tiburón lanzan por los aires
  collide(a, b) {
    const A = a.starT > 0 || a.sharkT > 0, B = b.starT > 0 || b.sharkT > 0;
    if (!A && !B) { const BA = a.morphT > 0 && a.morph === 'bola', BB = b.morphT > 0 && b.morph === 'bola'; // v12: la bola de circo lanza; topo y delfín pasan por debajo
      if (BA || BB) { if (BA && !BB) this.launch(b, a); else if (BB && !BA) this.launch(a, b); return true; }
      return a.flyT > 0 || b.flyT > 0 || a.morphT > 0 || b.morphT > 0; }
    const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, r = 1.6 * (a.megaS + b.megaS);
    if (dx * dx + dz * dz > r * r) return true;
    if (A && !B) this.launch(b, a); else if (B && !A) this.launch(a, b);
    return true;
  }
  launch(v, by) {
    if (v.remote || v.invT > 0 || this.immune(v) || v.launchCD > this.race.time) return;
    v.launchCD = this.race.time + 1.2;
    const dx = v.pos.x - by.pos.x, dz = v.pos.z - by.pos.z, d = Math.hypot(dx, dz) || 1;
    v.vx = dx / d * 14 + by.vx * 0.3; v.vz = dz / d * 14 + by.vz * 0.3; v.vy = 15; v.air = true; v.hop = true; v.spinT = 1.4; v.driftDir = 0; v.boostT = 0; v.shieldT = 0;
    Audio.sfxPlay('bump');
    for (let i = 0; i < 14; i++) this.race.emit(v.pos.clone().add(new V3(0, 1, 0)), ['#ffe066', '#ff8fd8', '#7ff5ff'][i % 3], 0.9, 0.6, new V3((R() - 0.5) * 12, R() * 10, (R() - 0.5) * 12));
    if (v.isPlayer) this.race.msg('¡Por los aires!', v, '#ff8fb0');
    if (by.isPlayer) { this.race.msg('¡A volar, ' + v.ch.name + '!', by, '#ffd84a'); this.race.stats.hits = (this.race.stats.hits || 0) + 1; }
  }
  // ---------- usar ----------
  use(k, it) {
    const RC = this.race, T = this.T, P = k.isPlayer, near = P || k.pos.distanceTo(RC.player.pos) < 70;
    const ahead = RC.karts.filter(o => o !== k && !o.finished && !o.out && o.place < k.place).sort((a, b) => b.place - a.place);
    switch (it) {
      case 'tiburon': k.sharkT = 10; k.sharkAge = 0; k.flyT = 0; if (P) RC.msg('¡TIBURÓN CIUDAD!', k, '#7fd8ff'); if (near) Audio.sfxPlay('grow'); break;
      case 'estrella': k.starT = 7; if (P) RC.msg('¡SUPERESTRELLA!', k, '#ffe066'); if (near) Audio.sfxPlay('stars'); break;
      case 'aladelta': k.flyT = 5; if (P) RC.msg('¡Ala delta! ¡A volar!', k, '#7ff5ff'); if (near) Audio.sfxPlay('boost'); break;
      case 'reloj': { let n = 0; for (const o of ahead) { if (o.remote) continue; if (o.dist - k.dist > 180) continue; if (o.shieldT > 0) { o.shieldT = 0; continue; } o.slowT = 3.6; n++; if (o.isPlayer) RC.msg('¡Se te derrite el tiempo!', o, '#ffb36b'); }
        if (P) RC.msg(n ? `¡Tiempo derretido para ${n}!` : '¡Reloj derretido!', k, '#ffb36b'); if (P || RC.player.slowT > 0) Audio.sfxPlay('magnet'); break; }
      case 'piano': { const tg = RC.karts.find(o => o.place === 1 && o !== k && !o.remote) || ahead[ahead.length - 1]; if (!tg) break;
        const m = this.take('piano', makePiano); m.position.copy(tg.pos); m.position.y += 40; this.projs.push({ type: 'piano', mesh: m, owner: k, target: tg, t: 0, ring: this.ringFor() });
        if (P) RC.msg('¡Piano para ' + tg.ch.name + '!', k, '#ffd84a'); if (tg.isPlayer) RC.msg('¡CUIDADO ARRIBA!', tg, '#ff6f9a'); Audio.sfxPlay('missile'); break; }
      case 'peces': { const tgs = ahead.slice(-3).reverse(); for (let i = 0; i < 3; i++) { const tg = tgs[i] || null; const m = this.take('fish', () => makeFish(i)); m.position.copy(k.pos).add(new V3((i - 1) * 1.5, 2, 0)); this.projs.push({ type: 'fish', mesh: m, owner: k, target: tg, t: 0, life: 4.5, dir: new V3(Math.sin(k.yaw), 0, Math.cos(k.yaw)), idx: k.idx, ph: i }); }
        if (P) RC.msg('¡Peces voladores!', k, '#ff9f5a'); if (near) Audio.sfxPlay('throw'); break; }
      case 'tetera': { const m = this.take('tea', makeTeapot); m.position.copy(k.pos); this.projs.push({ type: 'tea', mesh: m, owner: k, t: 0, life: 7, idx: k.idx, lat: 0, speed: Math.max(20, k.fs) + 18 }); if (P) RC.msg('¡Tetera tornado!', k, '#9fe8ff'); if (near) Audio.sfxPlay('throw'); break; }
      case 'cohete': k.rocketT = 3.2; k.rocketAge = 0; k.carpetT = 0; if (P) { RC.msg('¡COHETE PURPURINA!', k, '#ff8fd8'); RC.shakeT = 0.25; } for (let i = 0; i < 22; i++) RC.emit(k.pos.clone().add(new V3(0, 1, 0)), CONF[i % 7], 0.8, 0.7, new V3((R() - 0.5) * 10, 3 + R() * 8, (R() - 0.5) * 10)); if (near) Audio.sfxPlay('boost'); break;
      case 'alfombra': k.carpetT = 4.5; k.carpetAge = 0; k.rocketT = 0; if (P) RC.msg('¡ALFOMBRA ARCOÍRIS!', k, '#9dff7a'); if (near) Audio.sfxPlay('grow'); break;
      case 'topo': case 'bola': case 'delfin': this.morph(k, it, P, near); break;
      case 'chicle': k.gumT = 4.5; if (P) RC.msg('¡Globo de chicle!', k, '#ff8fd8'); if (near) Audio.sfxPlay('grow'); break;
      case 'antigrav': { let n = 0; for (const o of RC.karts) { if (o === k || o.remote || o.finished || this.immune(o)) continue; if (o.pos.distanceTo(k.pos) > 55) continue; if (o.shieldT > 0) { o.shieldT = 0; continue; } o.floatT = 2.2; n++; if (o.isPlayer) RC.msg('¡Sin gravedad!', o, '#c8a8ff'); }
        if (P) RC.msg(n ? `¡${n} flotando!` : '¡Burbuja antigravedad!', k, '#c8a8ff'); if (near) Audio.sfxPlay('shield'); break; }
      default: return false;
    }
    return true;
  }
  portal(k) {
    const T = this.T, RC = this.race, n = Math.round(70 / T.STEP);
    const showAt = (p, yaw) => { const g = this.portals[this.pI = (this.pI + 1) % 2]; g.position.copy(p); g.rotation.y = yaw; g.visible = true; g.userData.t = 1.2; };
    showAt(k.pos.clone().add(new V3(Math.sin(k.yaw) * 3, 0, Math.cos(k.yaw) * 3)), k.yaw);
    let ni = k.idx + n; if (T.open) ni = Math.min(T.N - 12, ni); else ni %= T.N;
    const di = T.open ? ni - k.idx : n; const s = T.S[ni];
    k.pos.set(s.p.x, s.p.y, s.p.z); k.y = s.p.y; k.idx = k.prevIdx = ni; k.dist += di * T.STEP; if (k.best != null) k.best = Math.max(k.best, k.dist);
    k.yaw = Math.atan2(s.fl.x, s.fl.z); const sp = Math.max(25, k.fs); k.vx = Math.sin(k.yaw) * sp; k.vz = Math.cos(k.yaw) * sp; k.invT = Math.max(k.invT, 0.8); k.driftDir = 0;
    showAt(k.pos.clone(), k.yaw);
    for (let i = 0; i < 18; i++) RC.emit(k.pos.clone().add(new V3(0, 2, 0)), ['#c8a8ff', '#ffffff', '#ffd84a'][i % 3], 0.9, 0.6, new V3((R() - 0.5) * 10, R() * 8, (R() - 0.5) * 10));
    if (k.isPlayer) { RC.msg('¡Puerta espejo! +70 m', k, '#c8a8ff'); Audio.sfxPlay('pop'); }
  }
  // ---------- v12: transformaciones de velocidad ----------
  morph(k, it, P, near) {
    k.morph = it; k.morphT = MORPH[it].t; k.morphAge = 0; k.dPh = 0; k.flyT = 0; k.sharkT = 0; k.gumT = 0; k.spinT = 0; k.squashT = 0;
    const col = { topo: ['#8a5a3a', '#a8714a', '#7fd67a'], bola: ['#ff9fd0', '#9fe0ff', '#ffe066'], delfin: ['#7fd8ff', '#ffffff', '#bfefff'] }[it];
    for (let i = 0; i < 16; i++) this.race.emit(k.pos.clone().add(new V3(0, 0.8, 0)), col[i % 3], 0.9, 0.6, new V3((R() - 0.5) * 9, 4 + R() * 7, (R() - 0.5) * 9));
    if (P) this.race.msg({ topo: '¡TOPO EXCAVADOR! ¡Bajo tierra!', bola: '¡BOLA DE CIRCO!', delfin: '¡DELFÍN DE GELATINA!' }[it], k, col[0] === '#8a5a3a' ? '#ffcf8a' : col[0]);
    if (near) Audio.sfxPlay(it === 'topo' ? 'dig' : it === 'bola' ? 'grow' : 'splash');
  }
  // chapuzón del delfín: hace girar a los de al lado; final = salpicón grande que lanza
  splash(k, r, big) {
    const RC = this.race; let n = 0;
    for (const o of RC.karts) { if (o === k || o.remote || o.finished) continue; const dx = o.pos.x - k.pos.x, dz = o.pos.z - k.pos.z; if (dx * dx + dz * dz > r * r || Math.abs(o.y - k.y) > 4) continue; if (big) this.launch(o, k); else if (!this.immune(o)) { RC.hitKart(o, 'delfin', k); } n++; }
    for (let i = 0; i < (big ? 26 : 12); i++) { const a = R() * 6.28; RC.emit(k.pos.clone().add(new V3(Math.cos(a) * 1.5, 0.4, Math.sin(a) * 1.5)), ['#7fd8ff', '#ffffff', '#bfefff'][i % 3], big ? 1.0 : 0.7, 0.6, new V3(Math.cos(a) * (big ? 9 : 5), 6 + R() * 6, Math.sin(a) * (big ? 9 : 5))); }
    if (k.isPlayer || k.pos.distanceTo(RC.player.pos) < 50) Audio.sfxPlay('splash');
    return n;
  }
  morphEnd(k) {
    const RC = this.race, it = k.morph, P = k.isPlayer; k.morphT = 0;
    const r = { topo: 11, bola: 10, delfin: 10 }[it] || 10; let n = 0;
    if (it === 'delfin') n = this.splash(k, r, true);
    else for (const o of RC.karts) { if (o === k || o.remote || o.finished) continue; const dx = o.pos.x - k.pos.x, dz = o.pos.z - k.pos.z; if (dx * dx + dz * dz > r * r || Math.abs(o.y - k.y) > 5) continue; this.launch(o, k); n++; }
    const col = it === 'topo' ? ['#8a5a3a', '#a8714a', '#ffe066', '#7fd67a'] : ['#ff9fd0', '#9fe0ff', '#ffe066', '#ffffff'];
    for (let i = 0; i < 34; i++) { const a = R() * 6.28, sp = 6 + R() * 10; RC.emit(k.pos.clone().add(new V3(0, 1, 0)), col[i % 4], 1.1, 0.8, new V3(Math.cos(a) * sp, 5 + R() * 10, Math.sin(a) * sp)); }
    this.booms.push({ pos: k.pos.clone(), t: 0, kind: it });
    k.vy = 12; k.air = true; k.hop = true; k.invT = Math.max(k.invT, 1.0);
    if (P) { RC.msg((it === 'topo' ? '¡PUM!' : it === 'bola' ? '¡PLOF!' : '¡SPLASH!') + (n ? ` ¡${n} por los aires!` : ''), k, '#ffd84a'); RC.shakeT = 0.45; }
    if (P || k.pos.distanceTo(RC.player.pos) < 60) Audio.sfxPlay('boom');
  }
  take(kind, make) { const p = this.pool[kind].pop() || make(); p.visible = true; if (!p.parent) this.race.scene.add(p); return p; }
  give(kind, m) { m.visible = false; this.pool[kind].push(m); }
  ringFor() { const m = new THREE.Mesh(ringGeo(), mat('warnRing', () => new THREE.MeshBasicMaterial({ color: '#ff3f7a', transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }))); m.rotation.x = -Math.PI / 2; this.race.scene.add(m); return m; }
  // ¿lo usaría un bot ahora?
  aiWants(k, it, dA, dB) {
    switch (it) {
      case 'tiburon': return k.place > 2 || R() < 0.01;
      case 'estrella': return dA < 35 || dB < 15 || R() < 0.01;
      case 'aladelta': case 'cohete': case 'alfombra': case 'chicle': return R() < 0.03 || k.place > 3;
      case 'reloj': case 'piano': return k.place > 1;
      case 'peces': case 'tetera': return dA < 70 && k.place > 1;
      case 'antigrav': return (dA < 30 || dB < 25);
      case 'topo': case 'bola': case 'delfin': return k.place > 1 || R() < 0.02;
    }
    return false;
  }
  morphFX(k, t, dt) {
    const RC = this.race, on = k.morphT > 0, age = k.morphAge || 0;
    const mo = this.attach(k, 'mound', makeMound), bo = this.attach(k, 'ball', makeCircusBall), dl = this.attach(k, 'dolph', makeDolphin);
    mo.visible = on && k.morph === 'topo'; bo.visible = on && k.morph === 'bola'; dl.visible = on && k.morph === 'delfin';
    if (mo.visible) { const q = mo.userData, e = Math.min(1, age / 0.35) * Math.min(1, k.morphT / 0.25 + 0.2), w = 1 + Math.sin(t * 14) * 0.05;
      mo.scale.set(e * w, e * (1 + Math.sin(t * 11) * 0.08), e * w); q.head.position.y = 0.55 + Math.abs(Math.sin(t * 6)) * 0.25; q.head.rotation.z = Math.sin(t * 7) * 0.2;
      if (R() < 0.7) RC.emit(k.pos.clone().add(new V3((R() - 0.5) * 3, 0.6, (R() - 0.5) * 3)), ['#8a5a3a', '#a8714a', '#6a4430'][Math.floor(R() * 3)], 0.6 + R() * 0.3, 0.6, new V3(-k.vx * 0.15 + (R() - 0.5) * 5, 3 + R() * 4, -k.vz * 0.15 + (R() - 0.5) * 5)); }
    if (bo.visible) { const q = bo.userData, r = this.ballR(k); q.ball.scale.setScalar(r); q.halo.scale.setScalar(r * 1.1); bo.position.y = -r;
      q.ball.rotation.x += (k.fs || 0) * dt / r; q.halo.rotation.y = t * 0.6; q.stars.forEach((s, i) => { const a = t * 2.4 + i * 1.571; s.position.set(Math.cos(a) * (r + 0.9), -r + Math.sin(t * 3 + i) * 0.5 + 0.4, Math.sin(a) * (r + 0.9)); s.rotation.set(0, -a, t * 3); });
      if (R() < 0.35) RC.emit(k.pos.clone().add(new V3((R() - 0.5) * 2 * r, 0.5, (R() - 0.5) * 2 * r)), ['#ffd6ec', '#d6f0ff'][Math.floor(R() * 2)], 0.7, 0.5, new V3(0, 2, 0)); }
    if (dl.visible) { const q = dl.userData, ph = (age % 1.25) / 1.25, h = this.dolphH(k);
      q.body.rotation.x = -Math.cos(ph * Math.PI) * 0.55; q.tail.rotation.x = Math.sin(t * 12) * 0.35; q.body.position.y = 0.4;
      q.splash.visible = ph < 0.22 || ph > 0.9; q.splash.position.y = -h + 0.15; const sp = ph < 0.5 ? ph / 0.22 : (1 - ph) / 0.1; q.splash.scale.setScalar(1.2 + (1 - Math.min(1, sp)) * 2.2);
      if (h < 0.6 && R() < 0.8) RC.emit(k.pos.clone().add(new V3((R() - 0.5) * 2.4, 0.4, (R() - 0.5) * 2.4)), ['#7fd8ff', '#ffffff'][Math.floor(R() * 2)], 0.6, 0.45, new V3((R() - 0.5) * 6, 5 + R() * 3, (R() - 0.5) * 6)); }
  }
  ballR(k) { return 1.5 + Math.min(1, (k.morphAge || 0) / MORPH.bola.t) * 0.9; }
  dolphH(k) { const ph = ((k.morphAge || 0) % 1.25) / 1.25; return Math.sin(ph * Math.PI) * 3.4 - 0.5; }
  // ---------- por fotograma ----------
  update(dt) {
    const RC = this.race, t = RC.time, T = this.T;
    if (M.timeBub) M.timeBub.uniforms.uT.value = t;
    // ondas del final explosivo de las transformaciones
    for (const b of this.booms) { if (!b.mesh) { b.mesh = new THREE.Mesh(geo('boomR', () => new THREE.RingGeometry(0.75, 1, 40)), boomMat(b.kind).clone()); b.mesh.rotation.x = -Math.PI / 2; b.mesh.position.copy(b.pos).add(new V3(0, 0.4, 0)); RC.scene.add(b.mesh); }
      b.t += dt; const u = b.t / 0.7; b.mesh.scale.setScalar(1 + u * 11); b.mesh.material.opacity = 0.8 * (1 - u); if (u >= 1) { RC.scene.remove(b.mesh); b.mesh.material.dispose(); b.dead = true; } }
    this.booms = this.booms.filter(b => !b.dead);
    // efectos pegados a cada kart
    for (const k of RC.karts) {
      const u = k.mesh.userData;
      if (k.sharkT > 0 || u.fx_shark) { const m = this.attach(k, 'shark', makeShark); m.visible = k.sharkT > 0; if (m.visible) { m.userData.tail.rotation.y = Math.sin(t * 9) * 0.45; m.rotation.z = Math.sin(t * 4) * 0.06; m.userData.city.rotation.y = Math.sin(t * 0.8) * 0.05; if (R() < 0.5) RC.emit(k.pos.clone().add(new V3((R() - 0.5) * 4, 1 + R() * 3, (R() - 0.5) * 4)), '#bff4ff', 0.6, 0.6, new V3(0, 3, 0)); } }
      if (k.starT > 0 || u.fx_star) { const m = this.attach(k, 'star', makeStarAura); m.visible = k.starT > 0; if (m.visible) { m.userData.stars.forEach((s, i) => { const a = t * 3 + i * 1.2566; s.position.set(Math.cos(a) * 2.6, 1.4 + Math.sin(t * 5 + i) * 0.6, Math.sin(a) * 2.6); s.rotation.set(0, -a, t * 4); }); m.userData.shell.material.color.setHSL((t * 0.8) % 1, 1, 0.6); m.userData.shell.material.opacity = 0.18 + Math.sin(t * 12) * 0.06; if (R() < 0.8) RC.emit(k.pos.clone().add(new V3((R() - 0.5) * 2, 0.8 + R() * 2, (R() - 0.5) * 2)), ['#ffe066', '#ff8fd8', '#7ff5ff', '#9dff7a'][Math.floor(R() * 4)], 0.7, 0.5); } }
      if (k.flyT > 0 || u.fx_glider) { const m = this.attach(k, 'glider', makeGlider); m.visible = (k.flyH || 0) > 0.6; if (m.visible) { m.rotation.z = Math.sin(t * 2) * 0.12; if (R() < 0.6) RC.emit(k.pos.clone().add(new V3(0, (k.flyH || 0) + 0.5, 0)), '#ffffff', 0.5, 0.5, new V3(-k.vx * 0.3, -1, -k.vz * 0.3)); } }
      if (k.slowT > 0 || u.fx_time) { const m = this.attach(k, 'time', makeTimeAura); m.visible = k.slowT > 0; if (m.visible) { const q = m.userData, fade = Math.min(1, k.slowT / 0.4); m.scale.setScalar(fade * (1 + Math.sin(t * 1.4) * 0.03));
          q.ring.rotation.y = -t * 0.5; q.sand.rotation.y = t * 0.7; q.glasses.forEach((h, i) => { const a = t * 0.6 + i * 2.094; h.position.set(Math.cos(a) * 3.1, 2.3 + Math.sin(t * 0.9 + i) * 0.35, Math.sin(a) * 3.1); h.rotation.set(0, -a, Math.sin(t * 0.5 + i) * 0.4); });
          if (R() < 0.12) RC.emit(k.pos.clone().add(new V3((R() - 0.5) * 3, 3 + R(), (R() - 0.5) * 3)), '#ffd28a', 0.35, 0.9, new V3(0, -2, 0)); } }
      if (k.morphT > 0 || u.fx_mound || u.fx_ball || u.fx_dolph) this.morphFX(k, t, dt);
      if (k.rocketT > 0 || u.fx_rocket) { const m = this.attach(k, 'rocket', makeRocket); m.visible = k.rocketT > 0; if (m.visible) { const q = m.userData, a = k.rocketAge, e = Math.min(1, k.rocketT / 0.3);
          // animación: el cohete sale disparado por delante y vuelve a engancharse bajo el kart; luego vibra de pura velocidad
          const out = a < 0.7 ? Math.sin(a / 0.7 * Math.PI) * 14 : 0; q.r.position.set(0, 1.6 + Math.sin(t * 40) * 0.06 + out * 0.12, -0.6 + out); q.r.rotation.z = a * 8; m.scale.setScalar(1.7 * e * Math.min(1, a / 0.15 + 0.3));
          q.fl.scale.set(1, 1, 1 + Math.sin(t * 50) * 0.3);
          for (let i = 0; i < 3; i++) this.confetti(k.pos.clone().add(new V3(-Math.sin(k.yaw) * 3.5 + (R() - 0.5) * 1.4, 2.2 + R() * 1.2, -Math.cos(k.yaw) * 3.5 + (R() - 0.5) * 1.4)), new V3(k.vx * 0.55 + (R() - 0.5) * 5, 2 + R() * 4, k.vz * 0.55 + (R() - 0.5) * 5)); } }
      if (k.carpetT > 0 || u.fx_carpet) { const m = this.attach(k, 'carpet', makeCarpet); m.visible = k.carpetT > 0; if (m.visible) { const q = m.userData, a = k.carpetAge, un = Math.min(1, a / 0.5), e = Math.min(1, k.carpetT / 0.3);
          // se desenrolla hacia delante (el rollo rueda y la alfombra se alarga) y ondea
          q.sheet.scale.set(1, 1, 0.05 + un * 16); q.sheet.position.z = -5; q.roll.position.z = -5 + un * 16; q.roll.visible = un < 1; q.roll.rotation.x = a * 20; m.scale.set(e, 1, 1);
          q.sheet.rotation.x = Math.sin(t * 9) * 0.04; m.position.y = -0.1;
          q.sp.forEach((s, i) => { const z = ((t * 18 + i * 1.6) % 9) - 6; s.position.set(Math.sin(t * 6 + i) * 1.3, 0.5 + Math.abs(Math.sin(t * 8 + i)) * 0.6, z); });
          if (R() < 0.6) this.confetti(k.pos.clone().add(new V3(-Math.sin(k.yaw) * 3 + (R() - 0.5) * 3, 0.6, -Math.cos(k.yaw) * 3 + (R() - 0.5) * 3)), new V3(k.vx * 0.6, 3 + R() * 2, k.vz * 0.6)); } }
      if (k.gumT > 0 || u.fx_gum) { const m = this.attach(k, 'gum', () => makeBubble('#ff8fd8')); m.visible = k.gumT > 0; if (m.visible) { const s = 1 + Math.sin(t * 8) * 0.06 + (k.air ? 0 : -0.15); m.scale.set(s * 1.05, s * 0.95, s); } }
      if (k.floatT > 0 || u.fx_float) { const m = this.attach(k, 'float', () => makeBubble('#c8a8ff', true)); m.visible = k.floatT > 0; if (m.visible) { m.rotation.y = t * 1.5; m.children[2] && (m.children[2].rotation.z = t * 2); } }
    }
    for (const m of this.conf) if (m.visible) { const u = m.userData; u.life -= dt; u.v.y -= 9 * dt; u.v.multiplyScalar(Math.exp(-dt * 1.5)); m.position.addScaledVector(u.v, dt); m.rotation.x += u.w.x * dt; m.rotation.y += u.w.y * dt; m.rotation.z += u.w.z * dt; if (u.life <= 0) m.visible = false; }
    for (const p of this.portals) if (p.visible) { p.userData.t -= dt; p.userData.disc.rotation.z = -t * 6; const s = p.userData.t > 0.9 ? (1.2 - p.userData.t) / 0.3 : Math.min(1, p.userData.t / 0.4); p.scale.setScalar(Math.max(0.01, s)); if (p.userData.t <= 0) p.visible = false; }
    // proyectiles
    for (const p of this.projs) {
      p.t += dt;
      if (p.type === 'piano') {
        const tg = p.target, fall = 1.4, u = Math.min(1, p.t / fall);
        p.mesh.position.set(lerp(p.mesh.position.x, tg.pos.x, 1 - Math.exp(-dt * 9)), tg.y + 40 * (1 - u * u), lerp(p.mesh.position.z, tg.pos.z, 1 - Math.exp(-dt * 9)));
        p.mesh.rotation.set(Math.sin(p.t * 3) * 0.3, p.t * 2, Math.cos(p.t * 2) * 0.2);
        p.ring.position.set(tg.pos.x, tg.y + 0.2, tg.pos.z); const rs = 3.5 - u * 1.5; p.ring.scale.setScalar(rs); p.ring.material.opacity = 0.4 + Math.abs(Math.sin(p.t * 14)) * 0.5;
        if (u >= 1 && !p.hit) { p.hit = true; p.mesh.position.y = tg.y; if (!this.immune(tg)) RC.squash(tg, p.owner); RC.shakeT = 0.4; for (let i = 0; i < 20; i++) RC.emit(tg.pos.clone().add(new V3(0, 1, 0)), ['#2a1838', '#ffffff', '#ffd84a'][i % 3], 1.0, 0.7, new V3((R() - 0.5) * 16, R() * 8, (R() - 0.5) * 16)); if (tg.isPlayer || p.owner.isPlayer || tg.pos.distanceTo(RC.player.pos) < 60) Audio.sfxPlay('squash'); }
        if (p.t > fall + 0.7) { p.dead = true; this.give('piano', p.mesh); RC.scene.remove(p.ring); }
      } else if (p.type === 'fish') {
        p.life -= dt; const tg = p.target && !p.target.finished ? p.target : null;
        let want;
        if (tg) want = new V3().subVectors(tg.pos, p.mesh.position).setY(0).normalize();
        else { p.idx = T.nearest(p.mesh.position.x, p.mesh.position.z, p.idx, 20, 30); const s = T.S[T.open ? Math.min(T.N - 1, p.idx + 6) : (p.idx + 6) % T.N]; want = new V3(s.p.x - p.mesh.position.x, 0, s.p.z - p.mesh.position.z).normalize(); }
        p.dir.lerp(want, 1 - Math.exp(-dt * (p.t < 0.4 ? 2 : 7))).normalize();
        p.mesh.position.addScaledVector(p.dir, 72 * dt); const gy = tg ? tg.y : p.mesh.position.y - 2; p.mesh.position.y = lerp(p.mesh.position.y, gy + 1.6 + Math.sin(p.t * 8 + p.ph) * 0.5, 1 - Math.exp(-dt * 4));
        p.mesh.rotation.y = Math.atan2(p.dir.x, p.dir.z); p.mesh.userData.wings.forEach(([w, s]) => w.rotation.z = s * Math.sin(t * 30) * 0.6); p.mesh.userData.tl.rotation.y = Math.sin(t * 20) * 0.5;
        if (R() < 0.5) RC.emit(p.mesh.position.clone(), '#bff4ff', 0.4, 0.4);
        if (tg && tg.pos.distanceTo(p.mesh.position) < 2.4 + tg.megaS) { if (!this.immune(tg)) RC.hitKart(tg, 'peces', p.owner); p.life = 0; for (let i = 0; i < 10; i++) RC.emit(p.mesh.position.clone(), ['#7ff5ff', '#ffffff'][i % 2], 0.7, 0.5); }
        if (p.life <= 0) { p.dead = true; this.give('fish', p.mesh); }
      } else if (p.type === 'tea') {
        p.life -= dt; const steps = p.speed * dt / T.STEP; p.f = (p.f || 0) + steps; const adv = Math.floor(p.f); p.f -= adv;
        p.idx = T.open ? Math.min(T.N - 1, p.idx + adv) : (p.idx + adv) % T.N; const s = T.S[p.idx];
        p.lat = Math.sin(p.t * 1.3) * s.w * 0.6; p.mesh.position.set(s.p.x + s.right.x * p.lat, s.p.y, s.p.z + s.right.z * p.lat);
        const u = p.mesh.userData, gr = Math.min(1, p.t / 0.35, p.life / 0.4); p.mesh.scale.setScalar(1.35 * Math.max(0.05, gr)); u.tw.rotation.y = -t * 6; u.orbit.rotation.y = t * 2.4; u.cups.forEach((c, i) => { c.rotation.set(Math.sin(t * 3 + i) * 0.5, t * 4 + i, 0); c.position.y = 1.2 + i * 0.7 + Math.sin(t * 4 + i * 2) * 0.3; }); u.pot.position.y = 4.6 + Math.sin(t * 5) * 0.2; u.pot.rotation.y = Math.sin(t * 1.5) * 0.4;
        if (R() < 0.25) RC.emit(p.mesh.position.clone().add(new V3((R() - 0.5) * 3, R() * 3, (R() - 0.5) * 3)), ['#c9864a', '#e3a768', '#ffffff'][Math.floor(R() * 3)], 0.45, 0.45, new V3((R() - 0.5) * 5, 2.5, (R() - 0.5) * 5));
        for (const k of RC.karts) { if (k === p.owner && p.t < 1) continue; if (k.remote || k.finished) continue; const dx = k.pos.x - p.mesh.position.x, dz = k.pos.z - p.mesh.position.z; if (dx * dx + dz * dz < 16 && Math.abs(k.y - s.p.y) < 4 && !this.immune(k)) RC.hitKart(k, 'tetera', p.owner); }
        if (p.life <= 0) { p.dead = true; this.give('tea', p.mesh); }
      }
    }
    this.projs = this.projs.filter(p => !p.dead);
  }
  // offset de vuelo (solo visual: la física sigue en el suelo)
  place(k) {
    const u0 = k.mesh.userData, mo = k.morphT > 0 ? k.morph : null;
    if (u0.tilt) u0.tilt.visible = !(mo === 'topo' || mo === 'delfin'); if (u0.shadow) u0.shadow.visible = mo !== 'topo';
    if (mo === 'bola') { const r = this.ballR(k) * 2 - 0.1; k.mesh.position.y += r; u0.tilt.rotation.z += Math.sin(this.race.time * 5) * 0.12; u0.shadow.position.y -= r / k.megaS; }
    if (mo === 'delfin') { const h = this.dolphH(k); k.mesh.position.y += h; u0.shadow.position.y -= h / k.megaS; }
    if (k.carpetT > 0) { const h = 0.35 + Math.sin(this.race.time * 6) * 0.12; k.mesh.position.y += h; }
    if (k.flyH > 0.01) { k.mesh.position.y += k.flyH; k.mesh.rotation.z = Math.sin(this.race.time * 2) * 0.1; const u = k.mesh.userData; u.shadow.position.y -= k.flyH / k.megaS; } }
}
