import * as THREE from './three.js?v=688';
let NET = null; const NEV = []; NEV.gone = []; let netT = 0, netMvT = 0, CID = 0, FID = 0;
const $ = id => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const damp = (k, dt) => 1 - Math.exp(-k * dt);
const SAVE_KEY = 'pegoton_arena_v1';
const S = Object.assign({ skin: 'fresa', team: 0, snd: true, best: 0, shape: null, eyes: true }, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'));
const save = () => localStorage.setItem(SAVE_KEY, JSON.stringify(S));
window.ads = window.ads || { showRewarded(ok) { const el = $('adfake'); el.classList.remove('hide'); setTimeout(() => { el.classList.add('hide'); ok && ok(); }, 1600); } };
let AC = null, master;
function audio() { if (!AC) { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = 0.5; master.connect(AC.destination); } if (AC.state === 'suspended') AC.resume(); }
function tone(f, d = 0.12, type = 'sine', v = 0.25, f2 = null, delay = 0) {
  if (!AC || !S.snd) return; const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.02);
}
let noiseBuf = null;
function noise(d = 0.2, v = 0.3, fq = 800) {
  if (!AC || !S.snd) return; if (!noiseBuf) { noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.5, AC.sampleRate); const a = noiseBuf.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1; }
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(), t = AC.currentTime; s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = fq;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + d);
}
let lastPop = 0;
const sfx = {
  pop(combo, big) { const n = performance.now(); if (n - lastPop < 35) return; lastPop = n; const st = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24][Math.min(combo, 10)]; const f = (big ? 260 : 520) * Math.pow(2, st / 12); tone(f, 0.09, 'sine', 0.22, f * 1.6); },
  off() { tone(300, 0.08, 'triangle', 0.15, 220); },
  bump() { noise(0.18, 0.4, 400); tone(110, 0.15, 'sine', 0.3, 60); },
  paint() { noise(0.25, 0.25, 2500); tone(700, 0.2, 'sine', 0.12, 1400); },
  combo(n) { [0, 4, 7].forEach((s, i) => tone(660 * Math.pow(2, (s + n) / 12), 0.12, 'square', 0.06, null, i * 0.06)); },
  win() { [0, 4, 7, 12, 16].forEach((s, i) => tone(523 * Math.pow(2, s / 12), 0.25, 'triangle', 0.2, null, i * 0.1)); },
  lose() { [7, 4, 0, -5].forEach((s, i) => tone(392 * Math.pow(2, s / 12), 0.3, 'triangle', 0.18, null, i * 0.15)); },
  tick() { tone(1200, 0.04, 'square', 0.05); }, click() { tone(880, 0.05, 'triangle', 0.12, 1200); },
  coin() { tone(988, 0.07, 'square', 0.07); tone(1319, 0.15, 'square', 0.07, null, 0.07); }
};
const SKINS = [
  { id: 'fresa', n: 'Chicle Fresa', p: 0, a: '#ff7ab8', b: '#ff4f9a', t: 'dots' },
  { id: 'menta', n: 'Menta Fresca', p: 150, a: '#7ef0c8', b: '#2fc596', t: 'stripes' },
  { id: 'playa', n: 'Pelota Playa', p: 250, a: '#ffffff', b: '#ff5252', t: 'segments' },
  { id: 'sandia', n: 'Sandía', p: 300, a: '#3fbf4f', b: '#1f7a2b', t: 'stripes' },
  { id: 'limon', n: 'Limón Ácido', p: 350, a: '#fff27a', b: '#ffd000', t: 'dots' },
  { id: 'uva', n: 'Uva Gomosa', p: 400, a: '#b388ff', b: '#7c4dff', t: 'swirl' },
  { id: 'nube', n: 'Nube Azúcar', p: 450, a: '#ffffff', b: '#bde4ff', t: 'swirl' },
  { id: 'tigre', n: 'Tigre', p: 600, a: '#ffa726', b: '#3e2723', t: 'stripes' },
  { id: 'disco', n: 'Bola Disco', p: 800, a: '#e0e0e0', b: '#9e9e9e', t: 'check', m: 1 },
  { id: 'lava', n: 'Lava', p: 900, a: '#ff6d00', b: '#3b0a00', t: 'swirl', e: 0.35 },
  { id: 'galaxia', n: 'Galaxia', p: 1100, a: '#1a0b3d', b: '#e040fb', t: 'stars', e: 0.25 },
  { id: 'panal', n: 'Panal', p: 1300, a: '#ffca28', b: '#ff8f00', t: 'check' },
  { id: 'arcoiris', n: 'Arcoíris', p: 1600, a: '#ff5252', b: '#40c4ff', t: 'rainbow' },
  { id: 'oro', n: 'Oro Puro', p: 2500, a: '#ffe082', b: '#c79100', t: 'segments', m: 1 },
  { id: 'calavera', n: 'Calavera Pop', p: 3000, a: '#fafafa', b: '#212121', t: 'dots' },
];
function skinTex(sk, size = 256) {
  const c = document.createElement('canvas'); c.width = size; c.height = size / 2; const x = c.getContext('2d'), W = c.width, H = c.height;
  x.fillStyle = sk.a; x.fillRect(0, 0, W, H); x.fillStyle = sk.b;
  if (sk.t === 'dots') { for (let i = 0; i < 26; i++) { x.beginPath(); x.arc((i * 53) % W, ((i * 37) % H), 9 + (i % 3) * 3, 0, 7); x.fill(); } }
  if (sk.t === 'stripes') for (let i = 0; i < 8; i++) x.fillRect(i * W / 8, 0, W / 22, H);
  if (sk.t === 'segments') for (let i = 0; i < 6; i += 2) x.fillRect(i * W / 6, 0, W / 6, H);
  if (sk.t === 'check') { const s = W / 16; for (let i = 0; i < 16; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2) x.fillRect(i * s, j * s, s, s); }
  if (sk.t === 'swirl') { x.lineWidth = 7; x.strokeStyle = sk.b; for (let i = 0; i < 7; i++) { x.beginPath(); for (let k = 0; k <= W; k += 8) x.lineTo(k, H * (i + .5) / 7 + Math.sin(k / 18 + i) * 8); x.stroke(); } }
  if (sk.t === 'stars') { for (let i = 0; i < 90; i++) { x.globalAlpha = Math.random(); x.fillRect(Math.random() * W, Math.random() * H, 2, 2); } x.globalAlpha = .5; x.beginPath(); x.arc(W * .6, H * .5, 30, 0, 7); x.fill(); x.globalAlpha = 1; }
  if (sk.t === 'rainbow') { const r = ['#ff5252', '#ffab40', '#ffee58', '#69f0ae', '#40c4ff', '#b388ff']; r.forEach((cc, i) => { x.fillStyle = cc; x.fillRect(0, i * H / 6, W, H / 6 + 1); }); }
  return c;
}

// ---------- Formas ----------
const SEG_W = 32, SEG_H = 24;
const baseGeo = new THREE.SphereGeometry(1, SEG_W, SEG_H);
const NV = baseGeo.attributes.position.count;
const DIRS = baseGeo.attributes.position.array.slice();
const SHAPES = {
  redonda: () => 1,
  huevo: (x, y, z) => 1 + 0.22 * y,
  pera: (x, y, z) => 1 - 0.28 * y + 0.12 * y * y,
  mochi: (x, y, z) => 1 / Math.sqrt(x * x + 1.9 * y * y + z * z) * 0.95,
  cubo: (x, y, z) => 1 / Math.pow(x ** 6 + y ** 6 + z ** 6, 1 / 6) * 0.82,
  gato: (x, y, z) => 1 + 0.55 * Math.exp(-((x - .5) ** 2 + (y - .78) ** 2 + z * z) * 18) + 0.55 * Math.exp(-((x + .5) ** 2 + (y - .78) ** 2 + z * z) * 18),
  estrella: (x, y, z) => { const a = Math.atan2(z, x); return 1 + 0.16 * Math.cos(a * 5) * (1 - y * y); },
  gota: (x, y, z) => 1 + 0.7 * Math.exp(-((y - 1) ** 2 + x * x + z * z) * 3) - 0.08,
  conejo: (x, y, z) => 1 + 0.9 * Math.exp(-((x - .3) ** 2 * 30 + (y - .95) ** 2 * 6 + z * z * 30)) + 0.9 * Math.exp(-((x + .3) ** 2 * 30 + (y - .95) ** 2 * 6 + z * z * 30)),
  nube: (x, y, z) => 1 + 0.12 * Math.sin(x * 7) * Math.sin(y * 6 + 1) * Math.sin(z * 7 + 2),
};
function shapeRadii(fn) { const r = new Float32Array(NV); for (let i = 0; i < NV; i++) r[i] = fn(DIRS[i * 3], DIRS[i * 3 + 1], DIRS[i * 3 + 2]); return r; }
function geoFromRadii(r) {
  const g = baseGeo.clone(), p = g.attributes.position.array;
  for (let i = 0; i < NV; i++) { p[i * 3] = DIRS[i * 3] * r[i]; p[i * 3 + 1] = DIRS[i * 3 + 1] * r[i]; p[i * 3 + 2] = DIRS[i * 3 + 2] * r[i]; }
  g.attributes.position.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere(); return g;
}
const sampleR = (r, x, y, z) => { let best = 0, bd = -9; for (let i = 0; i < NV; i++) { const d = DIRS[i * 3] * x + DIRS[i * 3 + 1] * y + DIRS[i * 3 + 2] * z; if (d > bd) { bd = d; best = i; } } return r[best]; };
const CHARS = [
  { id: 'fresa', n: 'Fresi', skin: 'fresa', shape: 'redonda' },
  { id: 'menta', n: 'Mentol', skin: 'menta', shape: 'mochi' },
  { id: 'limon', n: 'Limo', skin: 'limon', shape: 'gota' },
  { id: 'uva', n: 'Uvi', skin: 'uva', shape: 'gato' },
  { id: 'nube', n: 'Nubi', skin: 'nube', shape: 'nube' },
  { id: 'sandia', n: 'Sandi', skin: 'sandia', shape: 'huevo' },
  { id: 'tigre', n: 'Tigrón', skin: 'tigre', shape: 'conejo' },
  { id: 'panal', n: 'Panalín', skin: 'panal', shape: 'cubo' },
  { id: 'arcoiris', n: 'Arco', skin: 'arcoiris', shape: 'estrella' },
  { id: 'playa', n: 'Pelotón', skin: 'playa', shape: 'pera' },
];
// ---------- PERSONAJES PREMIUM (v6.13) ----------
const PREMS = [
  { id: 'dragon', n: 'Dragón Chicle', skin: 'menta', shape: 'redonda', prem: 1, acc: 'dragon', rim: 0x7fffd0, tr: 0x6ff2c4 },
  { id: 'astro', n: 'Astronauta', skin: 'nube', shape: 'redonda', prem: 1, acc: 'astro', rim: 0x9fe8ff, tr: 0xffffff },
  { id: 'robot', n: 'Robot Neón', skin: 'disco', shape: 'cubo', prem: 1, acc: 'robot', rim: 0x2ef2ff, tr: 0x2ef2ff },
  { id: 'unicornio', n: 'Unicornio', skin: 'arcoiris', shape: 'huevo', prem: 1, acc: 'uni', rim: 0xffb0f0, tr: 0xff7ad9 },
  { id: 'rey', n: 'Rey Galáctico', skin: 'galaxia', shape: 'redonda', prem: 1, acc: 'rey', rim: 0xd09cff, tr: 0xffd84a },
];
const premOwned = id => !!(S.owned && S.owned[id]);
const premLocked = c => c && c.prem && !premOwned(c.id) && S.trial !== c.id;
const AM = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .35, ...o });
function buildAcc(kind) { const A = new THREE.Group(), add = (g, m, p, r, s) => { const x = new THREE.Mesh(g, m); if (p) x.position.set(...p); if (r) x.rotation.set(...r); if (s) x.scale.set(...s); A.add(x); return x; };
  const SP = (r, a = 24, b = 18) => new THREE.SphereGeometry(r, a, b), CN = (r, h, n = 12) => new THREE.ConeGeometry(r, h, n), CY = (a, b, h, n = 12) => new THREE.CylinderGeometry(a, b, h, n), TO = (R, r, a = 8, b = 24, arc) => new THREE.TorusGeometry(R, r, a, b, arc);
  if (kind === 'dragon') { const pk = AM(0xff6fb5), gr = AM(0x3fd38a), yl = AM(0xffe14a, { emissive: 0xff8a00, emissiveIntensity: .25 });
    A.wings = []; for (const s of [-1, 1]) { const w = new THREE.Group(); w.position.set(s * .7, .55, -.15); A.add(w); A.wings.push(w); const wi = new THREE.Group(); wi.rotation.x = -1.15; wi.scale.setScalar(1.35); w.add(wi);
      const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(s * .5, .9, s * 1.3, 1.0); sh.quadraticCurveTo(s * 1.0, .6, s * 1.25, .35); sh.quadraticCurveTo(s * .9, .15, s * 1.1, -.15); sh.quadraticCurveTo(s * .55, .05, 0, 0);
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: .05, bevelEnabled: false }), AM(0xff8fc8, { side: THREE.DoubleSide, roughness: .5 })); m.rotation.y = s * .3; wi.add(m);
      const bone = new THREE.Mesh(CY(.04, .03, 1.3, 6), pk); bone.position.set(s * .62, .55, .02); bone.rotation.z = -s * 1.1; wi.add(bone); }
    for (const s of [-1, 1]) { add(CN(.15, .6, 10), yl, [s * .34, 1.0, -.05], [-.3, 0, -s * .35]); add(SP(.08), gr, [s * .3, .82, -.02]); }
    for (let i = 0; i < 5; i++) add(CN(.09, .22, 6), gr, [0, .95 - i * .02, -.25 - i * .22], [-1.2 - i * .2, 0, 0]);
    add(SP(.09, 10, 8), pk, [-.13, -.1, .95], 0, [1, .7, .6]); add(SP(.09, 10, 8), pk, [.13, -.1, .95], 0, [1, .7, .6]);
    const tail = new THREE.Group(); tail.position.set(0, -.3, -.9); A.add(tail); A.tail = tail; for (let i = 0; i < 5; i++) { const t = new THREE.Mesh(SP(.18 - i * .025, 10, 8), gr); t.position.set(0, -i * .05, -i * .2); tail.add(t); } const tip = new THREE.Mesh(CN(.15, .3, 4), pk); tip.position.set(0, -.25, -1.05); tip.rotation.x = -1.6; tail.add(tip); }
  if (kind === 'astro') { const glass = new THREE.MeshPhysicalMaterial({ color: 0xcff6ff, roughness: .05, metalness: 0, transmission: .0, transparent: true, opacity: .28, clearcoat: 1, depthWrite: false });
    add(SP(1.2, 28, 20), glass); add(TO(.5, .06, 6, 24), AM(0xffffff), [0, 1.05, .1], [PI / 2, 0, 0]); add(SP(.6, 20, 14), AM(0xffc23a, { metalness: .8, roughness: .12, emissive: 0x7a4a00, emissiveIntensity: .35, transparent: true, opacity: .45 }), [0, .55, .95], [-.6, 0, 0], [1.25, .8, .35]);
    add(TO(1.0, .1, 10, 32), AM(0xe8eef8, { metalness: .4 }), [0, -.62, 0], [PI / 2, 0, 0]); add(new THREE.BoxGeometry(.9, .9, .45), AM(0xf2f5fa), [0, .05, -1.05]); add(CY(.13, .13, .5, 10), AM(0xff4a4a), [-.28, .05, -1.32]); add(CY(.13, .13, .5, 10), AM(0xff4a4a), [.28, .05, -1.32]);
    add(CY(.02, .02, .5, 5), AM(0xcfd6e6), [.45, 1.3, -.2]); A.blink = add(SP(.08), AM(0xff3a3a, { emissive: 0xff2020, emissiveIntensity: 1 }), [.45, 1.58, -.2]); add(new THREE.BoxGeometry(.32, .2, .04), AM(0x3f9bff), [-.62, .1, .78], [0, -.65, 0]); }
  if (kind === 'robot') { const neo = AM(0x2ef2ff, { emissive: 0x2ef2ff, emissiveIntensity: 1.3 }), mg = AM(0xff3fd0, { emissive: 0xff3fd0, emissiveIntensity: 1.2 }), steel = AM(0xb8c4dc, { metalness: .85, roughness: .25 });
    add(new THREE.BoxGeometry(1.1, .26, .12), AM(0x10141f), [0, .62, .82], [-.75, 0, 0]); A.visor = add(new THREE.BoxGeometry(1.0, .12, .06), neo, [0, .64, .88], [-.75, 0, 0]); add(new THREE.BoxGeometry(.5, .5, .5), steel, [0, 1.0, -.1], 0, [1, .4, 1]);
    for (const s of [-1, 1]) { add(CY(.18, .18, .2, 14), steel, [s * 1.0, .1, 0], [0, 0, PI / 2]); add(TO(.14, .04, 6, 16), mg, [s * 1.1, .1, 0], [0, PI / 2, 0]); }
    add(CY(.03, .03, .55, 6), steel, [0, 1.25, 0]); A.blink = add(SP(.12), mg, [0, 1.56, 0]); add(TO(.5, .035, 6, 32), neo, [0, -.35, .0], [PI / 2, 0, 0], [1.9, 1.9, 1]);
    for (const [x, y] of [[-.55, .7], [.55, .7], [-.55, -.5], [.55, -.5]]) add(SP(.06, 8, 6), steel, [x, y, .85]); }
  if (kind === 'uni') { const gold = AM(0xffd84a, { metalness: .7, roughness: .25, emissive: 0x7a4a00, emissiveIntensity: .3 });
    const h = new THREE.Group(); h.position.set(0, .95, .45); h.rotation.x = .5; A.add(h); h.add(new THREE.Mesh(CN(.22, 1.15, 14), gold)); for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(TO(.13 - i * .03, .02, 5, 14), AM(0xffffff)); r.position.y = -.25 + i * .18; r.rotation.x = PI / 2 + .3; h.add(r); }
    for (const s of [-1, 1]) add(CN(.13, .35, 8), AM(0xffffff), [s * .42, .9, .1], [0, 0, -s * .4]);
    const MC = [0xff4f8a, 0xffa23f, 0xffe14a, 0x5ee07a, 0x4cc3ff, 0xa368ff]; A.mane = []; for (let i = 0; i < 9; i++) A.mane.push(add(SP(.27 - i * .01, 10, 8), AM(MC[i % 6]), [0, .9 - i * .17, -.15 - i * .12]));
    const tail = new THREE.Group(); tail.position.set(0, -.2, -1.0); A.add(tail); A.tail = tail; for (let i = 0; i < 6; i++) { const t = new THREE.Mesh(SP(.16, 8, 6), AM(MC[i])); t.position.set(0, -i * .1, -i * .14); tail.add(t); } }
  if (kind === 'rey') { const gold = AM(0xffd84a, { metalness: .85, roughness: .2, emissive: 0x6a3a00, emissiveIntensity: .25 });
    const cr = new THREE.Group(); cr.position.set(0, .92, 0); cr.scale.setScalar(1.25); A.add(cr); cr.add(new THREE.Mesh(CY(.45, .5, .25, 20, 1, true), gold)); for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283, p = new THREE.Mesh(CN(.1, .32, 6), gold); p.position.set(Math.cos(a) * .47, .25, Math.sin(a) * .47); cr.add(p); const g = new THREE.Mesh(new THREE.OctahedronGeometry(.07, 0), AM([0xff3a5a, 0x3fb8ff, 0x5ee07a][i % 3], { emissive: [0xff3a5a, 0x3fb8ff, 0x5ee07a][i % 3], emissiveIntensity: .6 })); g.position.set(Math.cos(a) * .5, 0, Math.sin(a) * .5); cr.add(g); }
    const cape = new THREE.Mesh(new THREE.CylinderGeometry(.85, 1.35, 1.7, 20, 4, true, PI * .55, PI * .9), AM(0xd61f4a, { side: THREE.DoubleSide, roughness: .6 })); cape.position.set(0, -.15, -.05); A.add(cape); A.cape = cape;
    add(TO(.8, .1, 8, 28), AM(0xffffff, { roughness: .9 }), [0, .62, -.1], [PI / 2 + .25, 0, 0], [1, 1, .6]);
    const orb = new THREE.Group(); A.add(orb); A.orb = orb; const pl = new THREE.Mesh(SP(.2, 14, 10), AM(0x6fd0ff, { emissive: 0x2a6aff, emissiveIntensity: .5 })); pl.position.set(1.55, .3, 0); orb.add(pl); const rg = new THREE.Mesh(TO(.32, .03, 4, 24), gold); rg.position.copy(pl.position); rg.rotation.x = 1.2; orb.add(rg); }
  A.kind = kind; return A; }
function animAcc(A, t, sp) { if (!A) return; const f = 6 + sp * .6;
  if (A.wings) A.wings.forEach((w, i) => w.rotation.z = (i ? -1 : 1) * (.15 + Math.sin(t * f) * .45));
  if (A.tail) A.tail.rotation.y = Math.sin(t * 4) * .5; if (A.blink) A.blink.visible = Math.sin(t * 6) > -.3;
  if (A.mane) A.mane.forEach((m, i) => m.position.x = Math.sin(t * 6 - i * .7) * .07); if (A.orb) A.orb.rotation.y = t * 1.8; if (A.cape) A.cape.scale.z = 1 + Math.sin(t * 5) * .06 + Math.min(.3, sp * .02); if (A.visor) A.visor.material.emissiveIntensity = 1 + Math.sin(t * 8) * .5; }
const texCache = {};
function teamSkin(id, t) { const k = id + '@' + t; if (!texCache[k]) { const sk = SKINS.find(s => s.id === id) || SKINS[0], P = TEAMS[t].pal, cv = skinTex({ ...sk, a: P[2], b: P[1] }), x = cv.getContext('2d'), im = x.getImageData(0, 0, cv.width, cv.height), d = im.data, tc = new THREE.Color(P[2]), hs = {}, q = {}; tc.getHSL(hs);
    for (let i = 0; i < d.length; i += 4) { q.c = new THREE.Color(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255); q.c.getHSL(q); const L0 = t === 2 ? .44 : .2, L1 = t === 2 ? .7 : .88, L = L0 + (Math.min(.9, q.l) - .1) / .8 * (L1 - L0); q.c.setHSL(hs.h + (q.l - .5) * (t === 2 ? .05 : .03), Math.max(.85, hs.s), Math.max(L0, L)); d[i] = q.c.r * 255; d[i + 1] = q.c.g * 255; d[i + 2] = q.c.b * 255; } // tono del equipo, se conserva la luz/sombra
    x.putImageData(im, 0, 0); const g = x.createLinearGradient(0, 0, 0, cv.height); g.addColorStop(0, P[3] + '55'); g.addColorStop(.45, '#0000'); g.addColorStop(1, P[0] + (t === 2 ? '22' : '66')); x.fillStyle = g; x.fillRect(0, 0, cv.width, cv.height);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; texCache[k] = tx; } return texCache[k]; }
function teamLook(g, c, t) { const mat = g.body.material; mat.map = t == null ? skinMap(c.skin) : teamSkin(c.skin, t); if (c.prem) { mat.emissive.set(t == null ? c.rim : TEAMS[t].pal[2]); mat.emissiveIntensity = t == null ? .12 : .06; } mat.needsUpdate = true;
  if (g.acc) { const hs = {}; if (t != null) new THREE.Color(TEAMS[t].c).getHSL(hs); g.acc.traverse(o => { if (!o.material || !o.material.color) return; if (!o.userData.m0) { o.userData.m0 = o.material; o.material = o.material.clone(); } const m0 = o.userData.m0; o.material.color.copy(m0.color); if (m0.emissive) o.material.emissive.copy(m0.emissive);
    if (t != null) { const q = {}; m0.color.getHSL(q); if (q.s > .12 || (q.l > .2 && q.l < .85)) o.material.color.setHSL(hs.h + (q.l - .5) * .04, Math.max(.85, hs.s), .3 + Math.min(1, Math.max(0, q.l)) * .32); if (m0.emissive && o.material.emissive.getHex()) o.material.emissive.set(TEAMS[t].pal[3]); } }); } }
function skinMap(id) { if (!texCache[id]) { const sk = SKINS.find(s => s.id === id) || SKINS[0]; const t = new THREE.CanvasTexture(skinTex(sk)); t.colorSpace = THREE.SRGBColorSpace; texCache[id] = t; } return texCache[id]; }
const charGeo = {};
function getCharGeo(c) { if (c.id === 'custom') return geoFromRadii(Float32Array.from(S.shape)); if (!charGeo[c.id]) charGeo[c.id] = geoFromRadii(shapeRadii(SHAPES[c.shape])); return charGeo[c.id]; }
function charRadii(c) { return c.id === 'custom' ? Float32Array.from(S.shape) : shapeRadii(SHAPES[c.shape]); }
const allChars = () => S.shape ? [...CHARS, ...PREMS, { id: 'custom', n: S.cname || 'Mi Pegote', skin: S.cskin || 'fresa', custom: 1 }] : [...CHARS, ...PREMS];
// cara
const eyeW = new THREE.SphereGeometry(1, 22, 16), mouthG = new THREE.TorusGeometry(.1, .022, 8, 20, Math.PI), mouthM = new THREE.MeshStandardMaterial({ color: 0x5a1838, roughness: .4 }), eyeMatW = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .3 }), eyeMatB = new THREE.MeshStandardMaterial({ color: 0x1a1030, roughness: .2 });
const blushMat = new THREE.MeshBasicMaterial({ color: 0xff7aa8, transparent: true, opacity: .6 });
const FTOP = new Map([mouthM, eyeMatW, eyeMatB, blushMat].map(m => { const k = m.clone(); k.depthTest = false; return [m, k]; })); // v6.23: la cara del juego siempre por delante de la basura pegada
function faceOrder(face) { face.traverse(o => { if (!o.isMesh || !FTOP.has(o.material)) return; o.renderOrder = o.material === eyeMatB ? 31 : o.material === eyeMatW ? (o.scale.x < .05 ? 32 : 30) : 29; o.material = FTOP.get(o.material); }); }
function addFace(m, radii) {
  const f = new THREE.Group();
  for (const s of [-1, 1]) {
    const dx = s * 0.34, dy = 0.18, dz = Math.sqrt(1 - dx * dx - dy * dy), rr = sampleR(radii, dx, dy, dz);
    const e = new THREE.Mesh(eyeW, eyeMatW); e.scale.setScalar(0.17); e.position.set(dx * rr, dy * rr, dz * rr - 0.04); f.add(e);
    const p = new THREE.Mesh(eyeW, eyeMatB); p.scale.setScalar(0.1); p.position.set(dx * rr * 1.02, dy * rr + 0.01, dz * rr + 0.09); f.add(p);
    const sh = new THREE.Mesh(eyeW, eyeMatW); sh.scale.setScalar(0.04); sh.position.set(dx * rr * 1.02 + 0.035, dy * rr + 0.05, dz * rr + 0.18); f.add(sh);
    const sh2 = new THREE.Mesh(eyeW, eyeMatW); sh2.scale.setScalar(0.018); sh2.position.set(dx * rr * 1.02 - 0.03, dy * rr - 0.035, dz * rr + 0.185); f.add(sh2);
    const bdx = s * 0.52, bdy = -0.08, bdz = Math.sqrt(1 - bdx * bdx - bdy * bdy), br = sampleR(radii, bdx, bdy, bdz);
    const b = new THREE.Mesh(eyeW, blushMat); b.scale.set(0.1, 0.06, 0.03); b.position.set(bdx * br, bdy * br, bdz * br); b.lookAt(bdx * 3, bdy * 3, bdz * 3); f.add(b);
  }
  { const mz = Math.sqrt(1 - .2 * .2), mr = sampleR(radii, 0, -.2, mz), mo = new THREE.Mesh(mouthG, mouthM); mo.position.set(0, -.2 * mr + .02, mz * mr - .005); mo.rotation.set(-.2, 0, Math.PI); f.add(mo); }
  m.add(f); return f;
}
function gumify(mat, prem) { mat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n float ndv = abs(dot(normalize(vNormal), vec3(0.0,0.0,1.0))); float rim = pow(1.0 - ndv, 2.5); totalEmissiveRadiance += diffuseColor.rgb * rim * 0.32 + vec3(1.0,0.9,0.95) * rim * ' + (prem ? '0.22' : '0.08') + ';'); }; mat.customProgramCacheKey = () => 'gum' + prem; }
function rimify(mat) { mat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n float rim = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0,0.0,1.0))), 3.0); totalEmissiveRadiance += vec3(1.0,0.85,0.95) * rim * 0.2;'); }; }
function visK(geo) { if (geo.userData.vk) return geo.userData.vk; const pa = geo.attributes.position.array; let hx = 0, hy = 0; for (let i = 0; i < pa.length; i += 3) { hx = Math.max(hx, Math.hypot(pa[i], pa[i + 2])); hy = Math.max(hy, Math.abs(pa[i + 1])); } return geo.userData.vk = 1 / Math.max(hx, hy / 1.25, .5); } // v6.15: la silueta visible = radio de comer
function makeCharMesh(c, team) {
  const mat = new THREE.MeshPhysicalMaterial({ map: skinMap(c.skin), roughness: .42, metalness: 0, clearcoat: .55, clearcoatRoughness: .28 }); gumify(mat, c.prem ? 1 : 0);
  const g = new THREE.Group(), body = new THREE.Mesh(getCharGeo(c), mat); g.add(body); g.body = body; const vk = visK(body.geometry); body.scale.setScalar(vk);
  const face = new THREE.Group(); g.add(face); g.face = face; face.scale.setScalar(vk); if (!c.custom || S.eyes) { addFace(face, charRadii(c)); faceOrder(face); }
  if (c.prem) { mat.emissive.set(c.rim); mat.emissiveIntensity = .12; g.acc = buildAcc(c.acc); g.add(g.acc); g.prem = c; } if (team != null) teamLook(g, c, team); return g;
}

// ---------- Render ----------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const FT = (navigator.hardwareConcurrency || 4) >= 6 ? 1024 : 768; let DPR = Math.min(window.devicePixelRatio || 1, (navigator.hardwareConcurrency || 4) >= 6 ? 2 : 1.6); renderer.setPixelRatio(DPR);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xc9b6ff); scene.fog = new THREE.Fog(0xc9b6ff, 90, 260);
const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 1500);
const sun = new THREE.DirectionalLight(0xfff0e0, 2.4); sun.position.set(30, 60, 25); scene.add(sun); const fill = new THREE.DirectionalLight(0xbfe4ff, .7); fill.position.set(-40, 25, -30); scene.add(fill);
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

const TEAMS = [{ n: 'Rojo', c: 0xff3b30, css: '#ff3b30', pal: ['#8e0b10', '#d81e1e', '#ff3b30', '#ff8f80'] }, { n: 'Azul', c: 0x2f7bff, css: '#2f7bff', pal: ['#0d2f8a', '#1a55d6', '#2f7bff', '#8cbcff'] }, { n: 'Amarillo', c: 0xffd21f, css: '#ffd21f', pal: ['#a66d00', '#f0a800', '#ffd21f', '#fff08a'] }, { n: 'Verde', c: 0x2ecc40, css: '#2ecc40', pal: ['#0b6b1f', '#1fa233', '#2ecc40', '#97f09c'] }]; // v6.16: paleta por equipo (oscuro, sombra, base, luz)
const ARENA = 162; // v6.20: +20% radio // v6.10: +29% radio // v6.4: ~2x área


// ---------- Comida (InstancedMesh) ----------
const MAXF = 3600, NFOOD = 2150; // v6.20: más comida para la arena más grande
// ---------- Juguetes y chuches reconocibles (geometría combinada con colores por vértice) ----------
function toy(parts) { const P = [], N = [], C = [], cc = new THREE.Color(), MM = new THREE.Matrix4(), QQ = new THREE.Quaternion(), EE = new THREE.Euler();
  for (const [g0, col, pos = [0, 0, 0], rot = [0, 0, 0], sc = [1, 1, 1]] of parts) { const g = g0.index ? g0.toNonIndexed() : g0.clone(); MM.compose(new THREE.Vector3(...pos), QQ.setFromEuler(EE.set(...rot)), new THREE.Vector3(...sc)); g.applyMatrix4(MM);
    const pa = g.attributes.position.array, na = g.attributes.normal.array; cc.set(col); for (let k = 0; k < pa.length; k++) { P.push(pa[k]); N.push(na[k]); } for (let k = 0; k < pa.length / 3; k++) C.push(cc.r, cc.g, cc.b); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.computeBoundingSphere(); const k = 1 / g.boundingSphere.radius, c0 = g.boundingSphere.center; g.translate(-c0.x, -c0.y, -c0.z); g.scale(k, k, k);
  { g.computeBoundingBox(); const bb = g.boundingBox, y0 = bb.min.y, hy = Math.max(.001, bb.max.y - y0), pa = g.attributes.position.array, na = g.attributes.normal.array, ca = g.attributes.color.array; // v6.14: oclusión suave por vértice + dos tonos
    for (let i = 0; i < pa.length; i += 3) { const t = (pa[i + 1] - y0) / hy, up = na[i + 1], ao = .62 + .38 * Math.min(1, t * 1.6) , tw = 1 + .1 * up; for (let j = 0; j < 3; j++) ca[i + j] = Math.min(1, ca[i + j] * ao * tw); } }
  return g; }
const Sp = (r, a = 18, b = 13, ...x) => new THREE.SphereGeometry(r, a, b, ...x), Bx = (x, y, z) => new THREE.BoxGeometry(x, y, z), Cy = (a, b, h, n = 18, ...x) => new THREE.CylinderGeometry(a, b, h, n, ...x), W = 0xffffff, K = 0x2a1a30, OR = 0xff8a1f;
// ---------- 5 PISTAS (temas) ----------
const WH0 = 0xffffff, Co = (r, h, n = 12) => new THREE.ConeGeometry(r, h, n), To = (R, r, a = 8, b = 20) => new THREE.TorusGeometry(R, r, a, b), PI = Math.PI;
const GEM = toy([[new THREE.OctahedronGeometry(1, 0), W, [0, 0, 0], [0, 0, 0], [.85, 1.2, .85]]]), ORB = toy([[Sp(1, 16, 12), W], [To(1.0, .1, 6, 28), W, [0, 0, 0], [PI / 2, 0, 0]]]);
const TOYS_ALIEN = () => { const LI = 0x8dff3a, PU = 0xa64dff, CY = 0x2ef2ff, MG = 0xff3fd0, OR2 = 0xffa21f, WH = 0xffffff, BK = 0x15101c, GL = 0xbff6ff, YE = 0xfff04a, GR = 0xc9d2e6;
  const eye = (x, y, z, r = .2) => [[Sp(r, 12, 9), WH, [x, y, z]], [Sp(r * .55, 10, 8), BK, [x, y, z + r * .62]], [Sp(r * .18, 6, 5), WH, [x + r * .15, y + r * .2, z + r * 1.0]]];
  return [
  // 0 blob de un ojo con antenas (corre)
  toy([[Sp(.8, 16, 12), LI, [0, 0, 0], [0, 0, 0], [1, .9, 1]], ...eye(0, .2, .55, .38), [Bx(.36, .06, .05), BK, [0, -.25, .78]], [Cy(.04, .04, .7, 5), LI, [-.3, .9, 0], [0, 0, .35]], [Cy(.04, .04, .7, 5), LI, [.3, .9, 0], [0, 0, -.35]], [Sp(.13), MG, [-.43, 1.22, 0]], [Sp(.13), MG, [.43, 1.22, 0]], [Sp(.2, 8, 6), LI, [-.4, -.7, .2], [0, 0, 0], [1, .5, 1.3]], [Sp(.2, 8, 6), LI, [.4, -.7, .2], [0, 0, 0], [1, .5, 1.3]]]),
  // 1 alien alto de tres ojos, cabezón y brazos (quieto)
  toy([[Cy(.22, .3, 1.0, 10), PU, [0, -.5, 0]], [Sp(.62, 16, 12), PU, [0, .45, 0], [0, 0, 0], [1.1, .9, 1]], ...eye(-.3, .5, .45, .16), ...eye(0, .66, .5, .18), ...eye(.3, .5, .45, .16), [Cy(.07, .06, .8, 6), PU, [-.42, -.35, .1], [.3, 0, .7]], [Cy(.07, .06, .8, 6), PU, [.42, -.35, .1], [.3, 0, -.7]], [Sp(.12), CY, [-.72, -.6, .25]], [Sp(.12), CY, [.72, -.6, .25]], [Cy(.12, .16, .3, 8), PU, [-.15, -1.1, 0]], [Cy(.12, .16, .3, 8), PU, [.15, -1.1, 0]], [Bx(.5, .2, .05), CY, [0, -.35, .27]]]),
  // 2 bichito de tentáculos (corre)
  toy([[Sp(.6, 16, 12), MG, [0, .35, 0], [0, 0, 0], [1, 1.05, 1]], ...eye(-.22, .45, .45, .17), ...eye(.22, .45, .45, .17), [Sp(.07), YE, [0, .9, .2]], ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i * PI / 4; return [Cy(.12, .04, .9, 6), MG, [Math.cos(a) * .45, -.35, Math.sin(a) * .45], [Math.sin(a) * .8, 0, -Math.cos(a) * .8]]; }), ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i * PI / 4; return [Sp(.07, 6, 5), 0xffa8ec, [Math.cos(a) * .85, -.68, Math.sin(a) * .85]]; })]),
  // 3 monstruo peludo con cuernos (corre a saltitos)
  toy([[new THREE.IcosahedronGeometry(.75, 1), CY, [0, 0, 0]], ...[[0, .7, 0], [.55, .35, .3], [-.55, .35, .3], [.5, -.2, -.4], [-.5, -.2, -.4], [0, .1, -.7], [.3, .6, -.4], [-.3, .6, -.4]].map(p => [new THREE.IcosahedronGeometry(.32, 0), CY, p]), ...eye(-.22, .2, .58, .18), ...eye(.22, .2, .58, .18), [Co(.14, .5, 8), WH, [-.38, .85, .1], [0, 0, .4]], [Co(.14, .5, 8), WH, [.38, .85, .1], [0, 0, -.4]], [Bx(.42, .14, .06), BK, [0, -.2, .72]], [Co(.06, .14, 4), WH, [-.1, -.3, .74], [PI, 0, 0]], [Co(.06, .14, 4), WH, [.1, -.3, .74], [PI, 0, 0]], [Sp(.18, 8, 6), OR2, [-.35, -.8, .15]], [Sp(.18, 8, 6), OR2, [.35, -.8, .15]]]),
  // 4 alien verde clásico, ojos negros grandes (corre)
  toy([[Sp(.55, 16, 12), LI, [0, .55, 0], [0, 0, 0], [1, 1.1, .95]], [Sp(.2, 10, 8), BK, [-.22, .5, .4], [0, .3, -.4], [1.1, .7, .5]], [Sp(.2, 10, 8), BK, [.22, .5, .4], [0, -.3, .4], [1.1, .7, .5]], [Sp(.05), WH, [-.17, .58, .5]], [Sp(.05), WH, [.27, .58, .5]], [Cy(.25, .32, .7, 10), LI, [0, -.3, 0]], [Bx(.5, .3, .08), MG, [0, -.25, .3]], [Cy(.07, .06, .55, 6), LI, [-.38, -.25, 0], [0, 0, .5]], [Cy(.07, .06, .55, 6), LI, [.38, -.25, 0], [0, 0, -.5]], [Cy(.09, .09, .35, 6), LI, [-.14, -.8, 0]], [Cy(.09, .09, .35, 6), LI, [.14, -.8, 0]], [Cy(.02, .02, .4, 4), LI, [0, 1.15, 0]], [Sp(.08), YE, [0, 1.36, 0]]]),
  // 5 platillo volante: cúpula de cristal, piloto, luces y patas (quieto)
  toy([[Cy(1.3, 1.0, .22, 28), GR, [0, 0, 0]], [Cy(1.0, .55, .25, 28), 0x8a96b8, [0, -.22, 0]], [To(1.3, .08, 6, 36), PU, [0, 0, 0], [PI / 2, 0, 0]], ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => [Sp(.1, 8, 6), [LI, MG, CY, YE, OR2][i % 5], [Math.cos(i * .628) * 1.32, .02, Math.sin(i * .628) * 1.32]]), [new THREE.SphereGeometry(.62, 18, 12, 0, 6.3, 0, 1.6), 0x9ff7ff, [0, .1, 0], [0, 0, 0], [1, .9, 1]], [Sp(.24, 12, 9), LI, [0, .38, 0]], [Sp(.07), BK, [-.09, .42, .2]], [Sp(.07), BK, [.09, .42, .2]], [Cy(.05, .04, .25, 5), LI, [0, .66, 0]], ...[0, 1, 2].map(i => [Cy(.05, .05, .6, 5), 0x6a7290, [Math.cos(i * 2.09) * .6, -.55, Math.sin(i * 2.09) * .6], [Math.sin(i * 2.09) * .4, 0, -Math.cos(i * 2.09) * .4]]), ...[0, 1, 2].map(i => [Cy(.14, .16, .05, 8), 0x6a7290, [Math.cos(i * 2.09) * .72, -.84, Math.sin(i * 2.09) * .72]]), [Sp(.14, 8, 6), CY, [0, -.42, 0]]]),
  // 6 cohete monísimo (quieto)
  toy([[Sp(.45, 14, 10), WH, [0, .1, 0], [0, 0, 0], [1, 2.1, 1]], [Co(.3, .5, 14), MG, [0, 1.0, 0]], [Sp(.17, 10, 8), CY, [0, .35, .38]], [To(.17, .04, 6, 14), PU, [0, .35, .4]], [To(.42, .05, 6, 20), MG, [0, -.25, 0], [PI / 2, 0, 0]], ...[0, 1, 2].map(i => [Bx(.06, .5, .4), MG, [Math.cos(i * 2.09) * .45, -.65, Math.sin(i * 2.09) * .45], [0, -i * 2.09, 0]]), [Co(.25, .35, 12), OR2, [0, -1.05, 0], [PI, 0, 0]], [Co(.14, .3, 10), YE, [0, -1.15, 0], [PI, 0, 0]]]),
  // 7 navecita retro (quieta)
  toy([[Sp(.45, 14, 10), CY, [0, 0, 0], [0, 0, 0], [.8, .55, 2.0]], [new THREE.SphereGeometry(.28, 12, 8, 0, 6.3, 0, 1.6), 0x9ff7ff, [0, .18, .25], [0, 0, 0], [1, 1, 1.3]], [Bx(1.9, .07, .45), PU, [0, -.05, -.3]], [Bx(.07, .5, .4), PU, [0, .3, -.7]], [Sp(.12), YE, [-.95, -.05, -.3]], [Sp(.12), MG, [.95, -.05, -.3]], [Cy(.16, .2, .25, 10), 0x6a7290, [0, 0, -.95], [PI / 2, 0, 0]], [Co(.14, .3, 10), OR2, [0, 0, -1.15], [-PI / 2, 0, 0]], [Sp(.07), LI, [0, .05, .9]]]),
]; };
const EYE = (x, y, z, r = .12) => [[Sp(r, 10, 8), 0xffffff, [x, y, z]], [Sp(r * .55, 8, 6), 0x15101c, [x, y, z + r * .6]]];
const TOYS_PAST = () => { const PK = 0xff6fb5, MI = 0x6ff2c4, WH = 0xffffff, RD = 0xff2d4f, YE = 0xffe14a, BL = 0x6fc8ff, TAN = 0xe8a95c, CH = 0x7a3f22, PU = 0xb07bff;
  const spr = (n, r, y, cols) => Array.from({ length: n }, (_, i) => { const a = i * 2.4, rr = r * Math.sqrt((i + .5) / n); return [Bx(.12, .04, .04), cols[i % cols.length], [Math.cos(a) * rr, y, Math.sin(a) * rr], [0, a, 0]]; });
  return [
  toy([[Cy(.75, .75, .18, 28), PK, [0, .45, 0], [PI / 2, 0, 0]], [To(.58, .08, 6, 28), WH, [0, .45, .1]], [To(.38, .08, 6, 24), MI, [0, .45, .1]], [To(.18, .07, 6, 20), YE, [0, .45, .1]], [To(.58, .08, 6, 28), WH, [0, .45, -.1]], [To(.38, .08, 6, 24), MI, [0, .45, -.1]], [Cy(.06, .06, 1.3, 6), WH, [0, -.6, 0]], [new THREE.CylinderGeometry(.79, .79, .2, 28, 1, true), 0xffd0ea, [0, .45, 0], [PI / 2, 0, 0]]]),
  toy([[Co(.42, 1.1, 14), TAN, [0, -.5, 0], [PI, 0, 0]], ...[0, 1, 2].map(i => [To(.3 - i * .08, .02, 4, 14), CH, [0, -.2 - i * .25, 0], [PI / 2, 0, 0]]), [Sp(.45, 14, 10), PK, [0, .2, 0]], [Sp(.4, 14, 10), MI, [0, .62, 0]], [To(.4, .08, 6, 18), 0xffffff, [0, .4, 0], [PI / 2, 0, 0]], [Sp(.11), RD, [0, 1.06, 0]], [Cy(.015, .015, .2, 3), 0x3a8a2a, [.04, 1.2, 0], [0, 0, -.4]], ...spr(14, .38, .9, [YE, BL, WH, RD])]),
  toy([[Cy(.05, .05, 1.0, 6), WH, [0, -.6, 0]], ...[[0, .35, 0, .45], [.32, .25, .15, .32], [-.32, .25, .1, .33], [.1, .62, -.1, .32], [-.15, .55, .25, .3], [.25, .5, -.25, .28], [0, .2, .3, .3]].map(([x, y, z, r], i) => [Sp(r, 10, 8), i % 3 ? PK : BL, [x, y, z]])]),
  toy([[To(.5, .27, 10, 24), TAN, [0, 0, 0], [PI / 2, 0, 0]], [To(.5, .22, 10, 24), PK, [0, .1, 0], [PI / 2, 0, 0], [1, 1, .75]], ...Array.from({ length: 16 }, (_, i) => { const a = i * .39; return [Bx(.13, .04, .04), [YE, BL, WH, MI][i % 4], [Math.cos(a) * .5, .3, Math.sin(a) * .5], [0, a * 2, 0]]; })]),
  toy([[Cy(.48, .36, .55, 16), BL, [0, -.4, 0]], ...Array.from({ length: 8 }, (_, i) => [Bx(.04, .55, .06), 0xd8f0ff, [Math.cos(i * .785) * .43, -.4, Math.sin(i * .785) * .43], [0, -i * .785, 0]]), [Sp(.55, 16, 10), PK, [0, .05, 0], [0, 0, 0], [1, .55, 1]], [Sp(.4, 14, 10), PK, [0, .3, 0], [0, 0, 0], [1, .6, 1]], [Sp(.24, 12, 9), PK, [0, .52, 0]], [Sp(.14), RD, [0, .78, 0]], [Cy(.015, .015, .22, 3), 0x3a8a2a, [.05, .95, 0], [0, 0, -.4]], ...spr(10, .45, .25, [YE, WH, MI])]),
  toy([[Cy(.09, .09, 1.3, 10), WH, [.0, -.25, 0]], ...[0, 1, 2, 3, 4].map(i => [To(.095, .03, 4, 10), RD, [0, -.8 + i * .25, 0], [PI / 2, 0, 0]]), [new THREE.TorusGeometry(.28, .09, 8, 16, PI), WH, [-.28, .4, 0]], [new THREE.TorusGeometry(.28, .095, 8, 16, PI * .5), RD, [-.28, .4, 0]]]),
  toy([[Sp(.4, 12, 9), 0xff5a3c, [0, -.15, 0], [0, 0, 0], [1, 1.15, .85]], [Sp(.32, 12, 9), 0xff5a3c, [0, .5, 0]], [Sp(.12), 0xff5a3c, [-.23, .78, 0]], [Sp(.12), 0xff5a3c, [.23, .78, 0]], [Sp(.13), 0xff5a3c, [-.4, .0, .05]], [Sp(.13), 0xff5a3c, [.4, .0, .05]], [Sp(.15), 0xff5a3c, [-.22, -.58, .1]], [Sp(.15), 0xff5a3c, [.22, -.58, .1]], [Sp(.12), 0xffb0a0, [0, .42, .27]], ...EYE(-.12, .58, .27, .07), ...EYE(.12, .58, .27, .07), [Sp(.04), 0x15101c, [0, .47, .37]]]),
  toy([[Sp(.4, 14, 10), 0x9b5cff, [0, 0, 0], [0, 0, 0], [1.35, 1, 1]], [Co(.32, .4, 10), 0x9b5cff, [-.72, 0, 0], [0, 0, -PI / 2]], [Co(.32, .4, 10), 0x9b5cff, [.72, 0, 0], [0, 0, PI / 2]], [Cy(.42, .42, .06, 16), YE, [0, 0, 0], [0, 0, PI / 2]], [Sp(.07), WH, [-.15, .3, .25]], [Sp(.07), WH, [.15, .2, .3]]]),
  toy([[Cy(.5, .5, .24, 20), MI, [0, .22, 0]], [Sp(.5, 18, 6), MI, [0, .34, 0], [0, 0, 0], [1, .25, 1]], [Cy(.44, .44, .14, 20), WH, [0, 0, 0]], [Cy(.5, .5, .24, 20), MI, [0, -.22, 0]], [Sp(.5, 18, 6), MI, [0, -.34, 0], [0, 0, 0], [1, .25, 1]], [To(.48, .05, 4, 24), 0x4fd6a6, [0, .1, 0], [PI / 2, 0, 0]], [To(.48, .05, 4, 24), 0x4fd6a6, [0, -.1, 0], [PI / 2, 0, 0]]]),
  toy([[Bx(1.3, .22, .8), CH, [0, 0, 0]], ...Array.from({ length: 8 }, (_, i) => [Bx(.28, .1, .33), 0x8f4a28, [-.47 + (i % 4) * .31, .15, -.18 + ((i / 4) | 0) * .36]]), [Bx(.62, .3, .86), RD, [.38, 0, 0]], [Bx(.08, .31, .87), YE, [.1, 0, 0]], [Bx(.3, .02, .3), YE, [.4, .16, 0], [0, .78, 0]]]),
]; };
const TOYS_JUG = () => { const RD = 0xff4a4a, YE = 0xffd23f, BL = 0x3f9bff, GR = 0x4fd36a, OR2 = 0xff8a1f, WH = 0xffffff, BK = 0x2a1a30, BR = 0xc98a52, PU = 0xa368ff, GY = 0xc8d0de;
  return [
  toy([[Sp(.5, 14, 10), YE, [0, -.1, -.1], [0, 0, 0], [1, .8, 1.25]], [Sp(.34, 14, 10), YE, [0, .45, .3]], [Sp(.13, 10, 6), OR2, [0, .4, .66], [0, 0, 0], [1.3, .5, 1.2]], ...EYE(-.15, .55, .55, .07), ...EYE(.15, .55, .55, .07), [Sp(.2, 8, 6), 0xffc21a, [-.45, 0, -.1], [0, 0, 0], [.5, .8, 1.2]], [Sp(.2, 8, 6), 0xffc21a, [.45, 0, -.1], [0, 0, 0], [.5, .8, 1.2]], [Co(.12, .25, 6), YE, [0, .05, -.75], [-1.2, 0, 0]]]),
  toy([[Bx(.8, .32, 1.5), RD, [0, -.05, 0]], [Bx(.7, .32, .7), RD, [0, .27, -.1]], [Bx(.72, .24, .6), 0x9ff7ff, [0, .29, -.1]], [Bx(.3, .1, .05), YE, [-.25, -.02, .76]], [Bx(.3, .1, .05), YE, [.25, -.02, .76]], ...[[-.42, .45], [.42, .45], [-.42, -.5], [.42, -.5]].flatMap(([x, z]) => [[Cy(.2, .2, .14, 14), BK, [x, -.25, z], [0, 0, PI / 2]], [Cy(.09, .09, .16, 8), GY, [x, -.25, z], [0, 0, PI / 2]]])]),
  toy([[Sp(.45, 14, 10), BR, [0, -.2, 0], [0, 0, 0], [1, 1.1, .9]], [Sp(.36, 14, 10), BR, [0, .45, 0]], [Sp(.13), BR, [-.28, .72, 0]], [Sp(.13), BR, [.28, .72, 0]], [Sp(.07), 0xffc8a0, [-.28, .72, .08]], [Sp(.07), 0xffc8a0, [.28, .72, .08]], [Sp(.15), 0xffd8b0, [0, .38, .3], [0, 0, 0], [1.2, .9, .8]], [Sp(.05), BK, [0, .43, .42]], ...EYE(-.13, .55, .3, .06), ...EYE(.13, .55, .3, .06), [Sp(.16), BR, [-.42, -.05, .1]], [Sp(.16), BR, [.42, -.05, .1]], [Sp(.17), BR, [-.22, -.6, .15]], [Sp(.17), BR, [.22, -.6, .15]], [Sp(.22, 10, 8), 0xffd8b0, [0, -.2, .3], [0, 0, 0], [1, 1, .4]], [Co(.12, .2, 4), RD, [-.1, .12, .33], [0, 0, PI / 2]], [Co(.12, .2, 4), RD, [.1, .12, .33], [0, 0, -PI / 2]]]),
  toy([[Bx(.7, .7, .55), GY, [0, -.15, 0]], [Bx(.55, .45, .5), GY, [0, .5, 0]], [Bx(.4, .16, .05), 0x9ff7ff, [0, .52, .26]], [Sp(.06), RD, [-.1, .52, .29]], [Sp(.06), RD, [.1, .52, .29]], [Cy(.02, .02, .25, 4), GY, [0, .85, 0]], [Sp(.07), RD, [0, 1.0, 0]], [Bx(.3, .2, .05), BL, [0, -.05, .28]], [Sp(.05), YE, [-.18, -.3, .28]], [Sp(.05), GR, [.18, -.3, .28]], [Cy(.08, .08, .5, 6), GY, [-.48, -.15, 0], [0, 0, .25]], [Cy(.08, .08, .5, 6), GY, [.48, -.15, 0], [0, 0, -.25]], [Bx(.2, .3, .25), BL, [-.18, -.65, 0]], [Bx(.2, .3, .25), BL, [.18, -.65, 0]]]),
  toy([[Cy(.32, .32, 1.1, 14), WH, [0, 0, 0]], [Co(.32, .5, 14), RD, [0, .8, 0]], [Sp(.14, 10, 8), 0x9ff7ff, [0, .2, .3]], [To(.14, .03, 4, 12), BL, [0, .2, .31]], ...[0, 1, 2, 3].map(i => [Bx(.05, .4, .35), RD, [Math.cos(i * 1.57) * .35, -.5, Math.sin(i * 1.57) * .35], [0, -i * 1.57, 0]]), [Co(.2, .3, 10), OR2, [0, -.7, 0], [PI, 0, 0]]]),
  toy([[Bx(.6, .6, .6), RD, [-.33, -.3, 0]], [Bx(.6, .6, .6), BL, [.33, -.3, 0]], [Bx(.6, .6, .6), YE, [0, .32, 0], [0, .4, 0]], ...[[-.33, -.3], [.33, -.3]].flatMap(([x, y]) => [[Cy(.1, .1, .08, 10), x < 0 ? RD : BL, [x - .14, y + .34, -.14]], [Cy(.1, .1, .08, 10), x < 0 ? RD : BL, [x + .14, y + .34, .14]]]), [Bx(.3, .3, .03), WH, [0, .32, .31], [0, .4, 0]]]),
  toy([[Sp(.8, 20, 14), WH], ...[0, 1, 2].map(i => [new THREE.SphereGeometry(.805, 20, 14, i * 2.09, 1.05), [RD, BL, YE][i]]), [Sp(.12), WH, [0, .8, 0]]]),
  toy([[Bx(.7, .55, 1.0), RD, [0, 0, -.1]], [Bx(.75, .2, .5), BK, [0, .38, -.35]], [Bx(.72, .5, .5), YE, [0, .1, -.35]], [Bx(.35, .22, .05), 0x9ff7ff, [0, .15, -.09]], [Cy(.3, .3, .5, 14), GR, [0, .05, .55], [PI / 2, 0, 0]], [Cy(.08, .1, .35, 8), BK, [0, .45, .55]], [Co(.25, .2, 12), YE, [0, -.15, .88], [PI / 2, 0, 0]], ...[[-.38, .5], [.38, .5], [-.38, -.1], [.38, -.1], [-.38, -.55], [.38, -.55]].map(([x, z]) => [Cy(.17, .17, .1, 12), BL, [x, -.35, z], [0, 0, PI / 2]])]),
  toy([[Sp(.45, 14, 10), GR, [0, 0, 0], [0, 0, 0], [1, .85, 1.4]], [Sp(.3, 12, 9), GR, [0, .45, .55], [0, 0, 0], [1, .9, 1.25]], [Cy(.16, .22, .45, 8), GR, [0, .25, .4], [.6, 0, 0]], ...EYE(-.15, .55, .75, .07), ...EYE(.15, .55, .75, .07), [Co(.18, .7, 8), GR, [0, -.05, -.85], [-1.3, 0, 0]], ...[[-.25, .3], [.25, .3], [-.25, -.3], [.25, -.3]].map(([x, z]) => [Cy(.12, .12, .4, 8), GR, [x, -.45, z]]), ...[0, 1, 2, 3].map(i => [Co(.09, .2, 4), YE, [0, .45 - i * .12, .2 - i * .28]])]),
  toy([[Cy(.6, .6, .25, 24), PU, [0, 0, .17], [PI / 2, 0, 0]], [Cy(.6, .6, .25, 24), PU, [0, 0, -.17], [PI / 2, 0, 0]], [Cy(.15, .15, .12, 12), WH, [0, 0, 0], [PI / 2, 0, 0]], [To(.35, .05, 4, 20), YE, [0, 0, .3]], [To(.35, .05, 4, 20), YE, [0, 0, -.3]], [Cy(.015, .015, 1.0, 3), WH, [0, .55, 0]], [To(.08, .02, 4, 10), RD, [0, 1.07, 0]]]),
]; };
const TOYS_BASURA = () => { const RD = 0xff4a4a, YE = 0xffd23f, BL = 0x3fb8ff, GR = 0x3fd36a, OR2 = 0xff8a1f, WH = 0xffffff, BK = 0x2e2a36, BR = 0xc9905a, GY = 0xc8d0de, PK = 0xff7ab8;
  return [
  toy([[Cy(.38, .38, 1.0, 16), RD, [0, 0, 0], [0, 0, 0], [1, 1, 1]], [Cy(.39, .39, .3, 16), WH, [0, 0, 0]], [Cy(.33, .38, .1, 16), GY, [0, .55, 0]], [Cy(.33, .38, .1, 16), GY, [0, -.55, 0]], [Bx(.14, .03, .08), GY, [.1, .61, 0]]]),
  toy([[Cy(.3, .3, .8, 14), GR, [0, -.2, 0]], [Cy(.12, .3, .3, 14), GR, [0, .35, 0]], [Cy(.12, .12, .2, 10), GR, [0, .58, 0]], [Cy(.14, .14, .1, 10), BL, [0, .72, 0]], [Cy(.31, .31, .3, 14), WH, [0, -.2, 0]], [Bx(.2, .1, .02), RD, [0, -.2, .31]]]),
  toy([[Bx(.9, .65, .9), BR, [0, -.1, 0]], [Bx(.9, .04, .2), 0xe8c48a, [0, .24, 0]], [Bx(.45, .03, .9), BR, [-.62, .3, 0], [0, 0, .5]], [Bx(.45, .03, .9), BR, [.62, .3, 0], [0, 0, -.5]], [Bx(.3, .2, .02), WH, [0, -.05, .46]], [Co(.08, .12, 3), RD, [0, -.05, .48], [PI / 2, 0, 0]]]),
  toy([[To(.55, .26, 10, 24), BK, [0, 0, 0], [PI / 2, 0, 0]], [Cy(.35, .35, .3, 16), GY, [0, 0, 0]], [Cy(.12, .12, .32, 10), 0x8a90a0, [0, 0, 0]], ...Array.from({ length: 12 }, (_, i) => [Bx(.08, .5, .1), 0x4a4652, [Math.cos(i * .52) * .78, 0, Math.sin(i * .52) * .78], [0, -i * .52, 0]])]),
  toy([[Bx(.5, .32, 1.1), RD, [0, -.1, 0]], [Sp(.3, 12, 8), RD, [0, -.05, .5], [0, 0, 0], [.85, .55, .7]], [Bx(.52, .1, 1.2), WH, [0, -.3, .03]], [Cy(.25, .25, .45, 12), RD, [0, .25, -.3]], [Cy(.21, .21, .05, 12), BK, [0, .48, -.3]], ...[0, 1, 2].map(i => [Bx(.4, .03, .05), WH, [0, .1, .1 + i * .14]]), [Sp(.1), WH, [0, .1, -.6]]]),
  toy([[new THREE.IcosahedronGeometry(.65, 1), 0xfaf6e8], ...[[0, .5, .3], [.45, .1, .35], [-.4, .3, -.3], [.2, -.4, .45], [-.3, -.35, .4]].map(p => [new THREE.IcosahedronGeometry(.25, 0), 0xf0ead0, p]), [Bx(.3, .02, .02), BL, [0, .1, .64]], [Bx(.3, .02, .02), BL, [0, .0, .65]], [Bx(.2, .02, .02), BL, [-.05, -.1, .64]]]),
  toy([[new THREE.TorusGeometry(.6, .18, 10, 20, 2.2), YE, [0, -.1, 0], [0, 0, .5]], [Cy(.06, .04, .2, 6), 0x7a5a2a, [.42, .55, 0], [0, 0, -.6]], [Sp(.07), 0x7a5a2a, [-.6, -.25, 0]], [new THREE.TorusGeometry(.55, .18, 6, 10, .9), 0xffe98a, [.15, .05, .05], [0, .6, 1.3]]]),
  toy([[Bx(1.3, .18, 1.3), 0xf0e0c8, [0, 0, 0]], [Bx(1.32, .05, 1.32), 0xe8d2b0, [0, .12, 0]], [Cy(.35, .35, .02, 16), RD, [0, .15, 0]], [Bx(.6, .02, .14), 0x3fb8ff, [0, .16, -.45]], [Bx(.5, .1, 1.3), 0xf0e0c8, [-.4, .3, 0], [0, 0, .6]], [Co(.2, .35, 3), YE, [.35, .2, .35], [0, 0, 0], [1, .1, 1]]]),
  toy([[Co(.9, .5, 8), PK, [0, .45, 0]], [Co(.9, .51, 8, 1), WH, [0, .45, 0], [0, PI / 8, 0], [1, 1, 1]], [Cy(.03, .03, 1.3, 5), GY, [0, -.2, 0]], [new THREE.TorusGeometry(.14, .04, 5, 10, PI), BK, [.14, -.85, 0], [0, 0, PI]], [Sp(.05), GY, [0, .72, 0]]]),
  toy([[Cy(.4, .3, .9, 16), WH, [0, -.1, 0]], [Cy(.41, .31, .3, 16), 0xff5fa2, [0, -.05, 0]], [Cy(.44, .44, .08, 16), WH, [0, .38, 0]], [Cy(.04, .04, .7, 6), YE, [.15, .6, 0], [0, 0, -.35]]]),
]; };
const TOYS_MAR = () => { const OR2 = 0xff8a1f, WH = 0xffffff, BK = 0x15101c, BL = 0x2f7dff, YE = 0xffd23f, GR = 0x3fd36a, RD = 0xff4a4a, PK = 0xff8fc4, PU = 0xb48cff, CY = 0x5ee0ff, TQ2 = 0x2fc9b0, BR = 0xa8682e;
  const fish = (c1, c2) => toy([[Sp(.5, 14, 10), c1, [0, 0, 0], [0, 0, 0], [.6, .85, 1.25]], [Cy(.52, .52, .1, 14), c2, [0, 0, .2], [PI / 2, 0, 0], [.62, 1, .85]], [Cy(.48, .48, .1, 14), c2, [0, 0, -.25], [PI / 2, 0, 0], [.6, 1, .75]], [Co(.35, .45, 4), c1, [0, 0, -.8], [-PI / 2, 0, 0], [.2, 1, 1]], [Co(.2, .35, 4), c1, [0, .45, -.05], [0, 0, 0], [.2, 1, 1]], ...EYE(-.25, .12, .38, .1), ...EYE(.25, .12, .38, .1).map(p => p), [Sp(.06), RD, [0, -.12, .6]]]);
  return [
  fish(OR2, WH), fish(BL, YE),
  toy([[Sp(.6, 16, 10), 0x3f9a4a, [0, .05, 0], [0, 0, 0], [1, .5, 1.2]], ...[[0, -.25], [.3, .2], [-.3, .2], [0, .45], [.3, -.3], [-.3, -.3]].map(([x, z]) => [Cy(.18, .2, .05, 6), 0x7ad36a, [x, .32, z]]), [Sp(.22, 12, 9), 0x9ae07a, [0, .1, .8]], ...EYE(-.1, .18, .95, .06), ...EYE(.1, .18, .95, .06), ...[[-.6, .5], [.6, .5], [-.55, -.5], [.55, -.5]].map(([x, z]) => [Sp(.2, 8, 6), 0x9ae07a, [x, -.1, z], [0, 0, 0], [1.3, .35, .8]])]),
  toy([[Sp(.45, 14, 10), RD, [0, 0, 0], [0, 0, 0], [1.4, .6, 1]], ...EYE(-.15, .45, .3, .09), ...EYE(.15, .45, .3, .09), [Cy(.03, .03, .25, 4), RD, [-.15, .3, .3]], [Cy(.03, .03, .25, 4), RD, [.15, .3, .3]], [Sp(.22, 10, 8), RD, [-.75, .15, .45], [0, 0, 0], [1, .6, 1.3]], [Sp(.22, 10, 8), RD, [.75, .15, .45], [0, 0, 0], [1, .6, 1.3]], [Co(.1, .25, 5), RD, [-.85, .15, .7], [PI / 2, 0, 0]], [Co(.1, .25, 5), RD, [.85, .15, .7], [PI / 2, 0, 0]], ...[-.25, 0, .25].flatMap(z => [[Cy(.04, .03, .55, 4), RD, [-.6, -.25, z], [0, 0, -.9]], [Cy(.04, .03, .55, 4), RD, [.6, -.25, z], [0, 0, .9]]])]),
  toy([[new THREE.SphereGeometry(.65, 16, 10, 0, 6.3, 0, 1.7), PK, [0, .2, 0]], [Cy(.6, .6, .05, 16), 0xffc0e0, [0, .12, 0]], ...EYE(-.2, .4, .55, .08), ...EYE(.2, .4, .55, .08), ...[0, 1, 2, 3, 4, 5].map(i => [Cy(.05, .02, 1.0, 5), i % 2 ? PK : PU, [Math.cos(i * 1.05) * .35, -.4, Math.sin(i * 1.05) * .35], [Math.sin(i) * .2, 0, Math.cos(i) * .2]])]),
  toy([[new THREE.SphereGeometry(.7, 16, 8, 0, PI, 0, PI / 2), 0xffc9a8, [0, -.1, 0], [-PI / 2, 0, 0], [1, 1, .55]], ...[-.5, -.25, 0, .25, .5].map(a => [Cy(.04, .04, .7, 4), 0xff9a7a, [Math.sin(a) * .35, .05, Math.cos(a) * .35 - .1], [PI / 2 - .3, a, 0]]), [Bx(.4, .15, .2), 0xffc9a8, [0, -.1, -.55]]]),
  toy([...[0, 1, 2, 3, 4].map(i => [Co(.22, .75, 6), YE, [Math.cos(i * 1.257) * .4, 0, Math.sin(i * 1.257) * .4], [0, -i * 1.257, PI / 2], [1, 1, .45]]), [Cy(.3, .3, .2, 10), YE, [0, 0, 0]], ...[0, 1, 2, 3, 4].map(i => [Sp(.05), OR2, [Math.cos(i * 1.257) * .45, .1, Math.sin(i * 1.257) * .45]]), ...EYE(-.09, .14, .12, .06).map(([g, c, p]) => [g, c, [p[0], .14, p[2]]]), ...EYE(.09, .14, .12, .06).map(([g, c, p]) => [g, c, [p[0], .14, p[2]]])]),
  toy([[Bx(1.1, .55, .7), BR, [0, -.2, 0]], [new THREE.CylinderGeometry(.35, .35, 1.1, 14, 1, false, 0, PI), BR, [0, .08, 0], [0, 0, PI / 2], [1, 1, 1]], ...[-.4, 0, .4].map(x => [Bx(.08, .62, .72), YE, [x, -.2, 0]]), [Bx(.18, .2, .06), YE, [0, -.05, .37]], ...[0, 1, 2, 3].map(i => [new THREE.OctahedronGeometry(.1, 0), [CY, PK, YE, GR][i], [-.3 + i * .2, .4, .1]])]),
  toy([[Cy(.1, .14, .8, 6), PK, [0, -.2, 0]], [Cy(.07, .1, .6, 6), PK, [-.25, .2, 0], [0, 0, .6]], [Cy(.07, .1, .6, 6), PK, [.28, .15, 0], [0, 0, -.7]], [Cy(.06, .08, .5, 6), PK, [0, .4, .2], [.6, 0, 0]], ...[[-.45, .45, 0], [.5, .38, 0], [0, .65, .35], [0, .25, 0]].map(p => [Sp(.11), 0xff6fa8, p])]),
  toy([[Sp(.28, 12, 9), YE, [0, .55, .05], [0, 0, 0], [1, 1, 1.1]], [Cy(.08, .05, .3, 6), YE, [0, .5, .35], [PI / 2 - .2, 0, 0]], [Sp(.3, 12, 9), YE, [0, .0, -.05], [0, 0, 0], [.85, 1.2, .9]], [new THREE.TorusGeometry(.2, .1, 6, 10, PI * 1.2), YE, [0, -.45, .05], [0, PI / 2, -1]], [Co(.12, .3, 4), OR2, [0, .1, -.32], [-1.4, 0, 0], [.3, 1, 1]], ...EYE(-.17, .62, .15, .07), ...EYE(.17, .62, .15, .07)]),
]; };
function paintPast(x, g) { for (let k = 0; k < 18; k++) { x.strokeStyle = ['#ffffffaa', '#ff9ccfaa', '#8ff0d0aa'][k % 3]; x.lineWidth = rnd(6, 12); x.lineCap = 'round'; x.beginPath(); const cx = Math.random() * 512, cy = Math.random() * 512, r = rnd(20, 60); x.arc(cx, cy, r, rnd(0, 3), rnd(3, 6.5)); x.stroke(); }
  for (let k = 0; k < 220; k++) { x.save(); x.translate(Math.random() * 512, Math.random() * 512); x.rotate(Math.random() * 3); x.fillStyle = ['#ff4f8a', '#ffe14a', '#6fc8ff', '#6ff2c4', '#ffffff', '#b07bff'][k % 6]; x.beginPath(); x.roundRect(-7, -2.5, 14, 5, 2.5); x.fill(); x.restore(); } }
function paintMar(x, g) { for (let k = 0; k < 300; k++) { x.fillStyle = ['#e9c47a', '#f9e0a8', '#e0b866'][k % 3] + '99'; x.beginPath(); x.arc(Math.random() * 512, Math.random() * 512, rnd(2, 10), 0, 7); x.fill(); }
  for (const c of [x, g]) { c.lineWidth = c === x ? 5 : 3; c.strokeStyle = c === x ? '#ffffff70' : '#3a8ab0'; for (let k = 0; k < 26; k++) { const y0 = Math.random() * 512, x0 = Math.random() * 512; c.beginPath(); c.moveTo(x0, y0); c.bezierCurveTo(x0 + rnd(-60, 60), y0 + rnd(20, 60), x0 + rnd(-60, 60), y0 + rnd(40, 90), x0 + rnd(-40, 40), y0 + rnd(70, 130)); c.stroke(); } }
  for (let k = 0; k < 14; k++) { x.fillStyle = ['#ffffffcc', '#ffb0c8cc', '#ffd6a8cc'][k % 3]; x.beginPath(); x.ellipse(Math.random() * 512, Math.random() * 512, 5, 3.5, Math.random() * 3, 0, 7); x.fill(); } }
function paintJug(x, g) { for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) { x.fillStyle = ['#8fd0ff', '#ffd76b', '#9ff0b0', '#ffb0d0'][(a + b * 2) % 4]; x.beginPath(); x.roundRect(a * 128 + 3, b * 128 + 3, 122, 122, 18); x.fill(); x.fillStyle = '#ffffff55'; x.font = 'bold 70px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ABC123★♥'[(a + b * 4) % 8], a * 128 + 64, b * 128 + 68); }
  x.strokeStyle = '#ffffffaa'; x.lineWidth = 6; x.setLineDash([18, 14]); x.beginPath(); x.moveTo(0, 256); x.lineTo(512, 256); x.stroke(); x.setLineDash([]); }
function paintBas(x, g) { for (let k = 0; k < 120; k++) { x.fillStyle = ['#9fd46c', '#b8e48a', '#8cc85a'][k % 3] + 'aa'; x.beginPath(); x.arc(Math.random() * 512, Math.random() * 512, rnd(8, 30), 0, 7); x.fill(); }
  for (let k = 0; k < 6; k++) { x.fillStyle = '#d8b88add'; x.beginPath(); x.ellipse(Math.random() * 512, Math.random() * 512, rnd(30, 60), rnd(18, 35), Math.random() * 3, 0, 7); x.fill(); }
  for (let k = 0; k < 80; k++) { x.save(); x.translate(Math.random() * 512, Math.random() * 512); x.rotate(Math.random() * 3); x.fillStyle = ['#ff4a4a', '#3fb8ff', '#ffd23f', '#ffffff'][k % 4]; x.fillRect(-4, -3, 8, 6); x.restore(); } }
const SCEN = { 4: () => [
  toy([[Cy(.12, .16, 2.2, 8), 0xffffff, [0, -.4, 0]], ...[0, 1, 2, 3].map(i => [To(.15, .05, 4, 8), 0xff4f8a, [0, -1.2 + i * .5, 0], [PI / 2, 0, 0]]), ...[[0, 1.1, 0, .8], [.6, .8, .2, .55], [-.6, .85, .1, .55], [.2, 1.5, -.2, .55], [-.3, 1.3, .4, .5]].map(([x, y, z, r], i) => [Sp(r, 12, 9), i % 2 ? 0x7ff2d0 : 0xff9ccf, [x, y, z]])]),
  toy([[Sp(1, 18, 10, 0, 6.3, 0, 1.6), 0x8ff0d0, [0, -.5, 0]], [Sp(.7, 16, 10, 0, 6.3, 0, 1.6), 0xffc0e0, [0, .25, 0]], ...Array.from({ length: 8 }, (_, i) => [Sp(.18, 8, 6), 0xffffff, [Math.cos(i * .785) * .9, -.4, Math.sin(i * .785) * .9], [0, 0, 0], [1, 1.6, 1]]), [Sp(.2), 0xff2d4f, [0, 1.0, 0]]]),
], 3: () => [
  toy([...[0, 1, 2, 3, 4].flatMap(i => [[Cy(.08, .12, 1.4, 6), [0xff7a8a, 0xffa25a, 0xb48cff][i % 3], [Math.cos(i * 1.3) * .4, 0, Math.sin(i * 1.3) * .4], [Math.sin(i) * .4, 0, Math.cos(i) * .4]], [Sp(.13), 0xffd0e0, [Math.cos(i * 1.3) * .6, .7, Math.sin(i * 1.3) * .6]]])]),
  toy([...[0, 1, 2, 3, 4, 5, 6].map(i => [Sp(.22, 8, 6), 0x3fbf6a, [Math.sin(i * .9) * .12, -1 + i * .33, 0], [0, 0, 0], [1, 1.2, .5]])]),
  toy([[new THREE.IcosahedronGeometry(1, 0), 0x6a8fb0, [0, 0, 0], [0, 0, 0], [1, .6, 1]], ...[0, 1, 2, 3, 4, 5].map(i => [Cy(.05, .08, .5, 5), 0xff8fc4, [Math.cos(i) * .3, .7, Math.sin(i) * .3], [Math.sin(i) * .4, 0, Math.cos(i) * .4]])]),
], 0: () => [
  toy([...[0, 1, 2, 3].map(i => [Bx(.9, .9, .9), [0xff4a4a, 0x3f9bff, 0xffd23f, 0x4fd36a][i], [Math.sin(i) * .15, -1.35 + i * .9, 0], [0, i * .4, 0]])]),
  toy([[Cy(.7, .8, 1.2, 12), 0xffd8a8, [0, -.4, 0]], [Co(.85, .9, 12), 0xff4f9a, [0, .65, 0]], [Bx(.35, .5, .05), 0x8a5a3a, [0, -.75, .76]]]),
], 2: () => [
  toy([[Sp(1, 14, 8, 0, 6.3, 0, 1.6), 0xb08a6a, [0, -.5, 0]], ...[[.3, .3, .5, 0xff4a4a], [-.4, .2, .4, 0x3fb8ff], [.1, .5, -.3, 0xffd23f], [-.2, .1, -.7, 0x3fd36a]].map(([x, y, z, c]) => [Bx(.35, .35, .35), c, [x, y, z], [x, y, z]])]),
  toy([[To(.6, .25, 8, 18), 0x2e2a36, [0, -.6, 0], [PI / 2, 0, 0]], [To(.6, .25, 8, 18), 0x2e2a36, [0, -.1, 0], [PI / 2, 0, 0]], [To(.6, .25, 8, 18), 0x2e2a36, [0, .4, 0], [PI / 2, 0, 0]]]),
  toy([[Cy(.6, .5, 1.4, 14), 0x3fd36a, [0, -.2, 0]], [Cy(.66, .66, .15, 14), 0x2fa858, [0, .55, 0]], [Bx(.3, .08, .1), 0x2fa858, [0, .7, 0]], [Bx(.4, .4, .03), 0xffffff, [0, -.1, .55]]]),
] };
const THEMES = [
  { name: '🧸 Juguetería', toys: TOYS_JUG, bg: 0xb9d8ff, out: 0x9cc3ff, hemi: [0xffffff, 0x9fb6e6, 1.55], sun: 0xfff3e0, tiles: ['#8fd0ff', '#ffd76b'], tline: '#ffffffcc', deco: '#ffd06b', sect: ['#ff5fa2', '#4cc3ff', '#ffc93f', '#5ee07a'], rim: ['#ffffff', '#4c9dff'], beads: [0xff5fa2, 0x4cc3ff, 0xffc93f, 0x5ee07a], cols: [0xff4f9a, 0x3fb8ff, 0xffc21a, 0x3fd36a, 0xa368ff, 0xff7a3a], baked: 1, fixed: {}, movers: { 1: 3.2, 7: 2.4 }, big: { 1: [.8, 1.15], 5: [.9, 1.3], 7: [1.0, 1.4], 8: [.9, 1.3], 2: [.75, 1.05] }, scen: 0, paint: paintJug },
  { name: '👽 Planeta alien', toys: TOYS_ALIEN, bg: 0x2b1b52, out: 0x22184a, hemi: [0xd7c8ff, 0x3a2a7a, 1.5], sun: 0xc8fff4, tiles: ['#5b3f9e', '#523891'], tline: '#7fe3d455', deco: '#2fd3c9', sect: ['#2fd3c9', '#a368ff', '#7fe37a', '#ff7ad9'], rim: ['#2fd3c9', '#1a1240'], beads: [0x2fd3c9, 0xa368ff, 0x7fe37a, 0xff7ad9], cols: [0x7fe37a, 0x2fd3c9, 0xff7ad9, 0xb48cff, 0xfff27a, 0x5ee0ff], fixed: { 0: 0xffffff, 1: 0xffffff, 2: 0xffffff, 3: 0xffffff, 4: 0xffffff, 5: 0xffffff, 6: 0xffffff, 7: 0xffffff }, movers: { 0: 3.0, 2: 2.4, 3: 2.8, 4: 3.4 }, hop: 1, big: { 0: [.75, 1.0], 1: [1.0, 1.35], 2: [.75, 1.0], 3: [.75, 1.0], 4: [.7, .95], 5: [1.5, 2.3], 6: [1.0, 1.5], 7: [.9, 1.3] }, craters: 1, alienDeco: 1, baked: 1, planets: 1 },
  { name: '♻️ Vertedero chulo', toys: TOYS_BASURA, bg: 0xbfe9ff, out: 0x8fd18a, hemi: [0xffffff, 0x9cbf8a, 1.6], sun: 0xfff6e0, tiles: ['#b9e48f', '#a7d97c'], tline: '#ffffffcc', deco: '#ffd23f', sect: ['#ffd23f', '#3fb8ff', '#3fd36a', '#ff7a3a'], rim: ['#ffd23f', '#2b2b33'], beads: [0xffd23f, 0x3fb8ff, 0x3fd36a, 0xff7a3a], cols: [0xff4f6a, 0x3fb8ff, 0x3fd36a, 0xffc21a, 0xa368ff, 0xff7a3a], baked: 1, fixed: {}, big: { 2: [.9, 1.3], 3: [.9, 1.3], 7: [1.1, 1.6], 8: [.9, 1.3] }, scen: 2, paint: paintBas },
  { name: '🐠 Fondo del mar', toys: TOYS_MAR, bg: 0x2fa8d8, out: 0x1f8fc4, hemi: [0xd8fbff, 0x2a7fb0, 1.5], sun: 0xb8f0ff, tiles: ['#d9cf98', '#d9cf98'], tline: '#ffffff66', deco: '#f2c98a', sect: ['#ff7a8a', '#2fd3c9', '#ffc93f', '#a368ff'], rim: ['#ff7a8a', '#ffd3b0'], beads: [0xff7a8a, 0x2fd3c9, 0xffc93f, 0xffffff], cols: [0xff7a3a, 0xffc21a, 0x2fd3c9, 0xff5fa2, 0x7fe37a, 0xa368ff], baked: 1, fixed: {}, movers: { 0: 3.4, 1: 2.8, 2: 1.3, 3: 1.8, 4: .9 }, big: { 2: [.9, 1.3], 4: [.75, 1.05], 7: [1.0, 1.5] }, scen: 3, paint: paintMar },
  { name: '🧁 Pastelería', toys: TOYS_PAST, bg: 0xc9b6ff, out: 0xb9a3ff, hemi: [0xfff6fb, 0x9f86d6, 1.55], sun: 0xfff0e0, tiles: ['#ffc4df', '#ffe0ee'], tline: '#ffffffcc', deco: '#ff8fc4', sect: ['#ff5fa2', '#4cc3ff', '#ffc93f', '#5ee07a', '#a368ff', '#ff7a3a'], rim: ['#ffffff', '#ff5fa2'], beads: [0xff5fa2, 0x4cc3ff, 0xffc93f, 0x5ee07a], cols: [0xff4f9a, 0x3fb8ff, 0xffc21a, 0x3fd36a, 0xa368ff, 0xff7a3a], baked: 1, fixed: {}, big: { 1: [.8, 1.15], 4: [.8, 1.15], 2: [.8, 1.15], 9: [.8, 1.15] }, scen: 4, paint: paintPast },
];
let NTOY = 8, TH = THEMES[4], OBJG = [], NT = 10, foodIMs = [], stkIMs = [], arenaG = null, FCOLS = TH.cols;
const MAXS = 1400, objMat = new THREE.MeshStandardMaterial({ roughness: .38, vertexColors: true, emissive: 0xffffff, emissiveIntensity: .05 });
const hemi = new THREE.HemisphereLight(0xfff6fb, 0x9f86d6, 1.55); scene.add(hemi);
function stripes(c1, c2) { const c = document.createElement('canvas'); c.width = 128; c.height = 32; const y = c.getContext('2d'); y.fillStyle = c1; y.fillRect(0, 0, 128, 32); y.fillStyle = c2; for (let i = -2; i < 6; i++) { y.beginPath(); y.moveTo(i * 32, 32); y.lineTo(i * 32 + 16, 32); y.lineTo(i * 32 + 48, 0); y.lineTo(i * 32 + 32, 0); y.fill(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(90, 1); t.colorSpace = THREE.SRGBColorSpace; return t; }
const THC = {}; let THcur = -1;
function setTheme(i) {
  if (THcur === i && arenaG) { applyLook(); return; }
  if (arenaG) { arenaG.visible = false; foodIMs.concat(stkIMs).forEach(m => { m.visible = false; m.count = 0; }); }
  THcur = i; TH = THEMES[i]; FCOLS = TH.cols;
  const C = THC[i]; if (C) { ({ arenaG, OBJG, foodIMs, stkIMs } = C); NTOY = OBJG.length - 2; NT = OBJG.length; arenaG.visible = true; foodIMs.concat(stkIMs).forEach(m => m.visible = true); applyLook(); return; }
  buildTheme(i); THC[i] = { arenaG, OBJG, foodIMs, stkIMs }; G.needWarm = 1;
}
function applyLook() { scene.background.set(TH.bg); scene.fog.color.set(TH.bg); hemi.color.set(TH.hemi[0]); hemi.groundColor.set(TH.hemi[1]); hemi.intensity = TH.hemi[2] * .7; sun.color.set(TH.sun); }
function buildTheme(i) {
  TH = THEMES[i]; FCOLS = TH.cols;
  OBJG = [...TH.toys(), GEM.clone(), ORB.clone()]; NTOY = OBJG.length - 2; NT = OBJG.length;
  foodIMs = OBJG.map(g => { const m = new THREE.InstancedMesh(g, objMat, 1300); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.count = 0; m.frustumCulled = false; scene.add(m); return m; });
  stkIMs = OBJG.map(g => { const m = new THREE.InstancedMesh(g, objMat, MAXS); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.count = 0; m.frustumCulled = false; scene.add(m); return m; });
  scene.background.set(TH.bg); scene.fog.color.set(TH.bg); hemi.color.set(TH.hemi[0]); hemi.groundColor.set(TH.hemi[1]); hemi.intensity = TH.hemi[2] * .7; sun.color.set(TH.sun);
  const G2 = arenaG = new THREE.Group(); scene.add(G2);
  // suelo
  { const c = document.createElement('canvas'); c.width = c.height = FT; const x = c.getContext('2d'); x.scale(FT / 512, FT / 512); x.fillStyle = TH.tiles[0]; x.fillRect(0, 0, 512, 512); const gc = document.createElement('canvas'); gc.width = gc.height = 512; const gx = gc.getContext('2d'); gx.fillStyle = '#000'; gx.fillRect(0, 0, 512, 512);
    if (TH.paint) TH.paint(x, gx); else if (TH.alienDeco) { for (let k = 0; k < 260; k++) { const cx = Math.random() * 512, cy = Math.random() * 512, r = rnd(6, 34); x.fillStyle = ['#4a2f8a', '#6a44b8', '#3d2775', '#5a3aa0'][k % 4] + '88'; x.beginPath(); x.ellipse(cx, cy, r, r * rnd(.6, 1), Math.random() * 3, 0, 7); x.fill(); }
      for (let k = 0; k < 5; k++) { const cx = rnd(60, 452), cy = rnd(60, 452), r = rnd(22, 44), col = ['#8dff3a', '#2ef2ff', '#ff3fd0'][k % 3]; x.fillStyle = '#2a1858'; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); const g = x.createRadialGradient(cx, cy, r * .2, cx, cy, r); g.addColorStop(0, col + 'aa'); g.addColorStop(.7, col + '22'); g.addColorStop(1, '#0000'); x.fillStyle = g; x.fill(); x.strokeStyle = '#7a5cc8'; x.lineWidth = 6; x.stroke(); gx.fillStyle = g; gx.beginPath(); gx.arc(cx, cy, r, 0, 7); gx.fill(); gx.strokeStyle = col; gx.lineWidth = 3; gx.beginPath(); gx.arc(cx, cy, r - 3, 0, 7); gx.stroke(); } }
    else for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) { x.fillStyle = TH.tiles[(a + b) % 2]; x.beginPath(); x.roundRect(a * 128 + 4, b * 128 + 4, 120, 120, 26); x.fill(); }
    if (!TH.alienDeco && !TH.paint) { x.strokeStyle = TH.tline; x.lineWidth = 4; } else x.strokeStyle = '#0000'; for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) { x.beginPath(); x.roundRect(a * 128 + 12, b * 128 + 12, 104, 104, 20); x.stroke(); }
    if (TH.craters && !TH.alienDeco) for (let k = 0; k < 7; k++) { const cx = Math.random() * 512, cy = Math.random() * 512, r = rnd(14, 40); x.fillStyle = '#3f2a78'; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); x.strokeStyle = '#7fe3d488'; x.lineWidth = 3; x.stroke(); }
    else if (!TH.paint) for (let k = 0; k < 40; k++) { x.save(); x.translate(Math.random() * 512, Math.random() * 512); x.rotate(Math.random() * 3); x.fillStyle = TH.deco + '99'; x.beginPath(); x.roundRect(-6, -2.5, 12, 5, 2.5); x.fill(); x.restore(); }
    x.setTransform(1, 0, 0, 1, 0, 0); const bc = document.createElement('canvas'); bc.width = bc.height = FT / 2; const bx = bc.getContext('2d'); bx.fillStyle = '#808080'; bx.fillRect(0, 0, FT / 2, FT / 2); // v6.14: grano fino + relieve
    for (let k = 0; k < FT * 9; k++) { const px = Math.random() * FT, py = Math.random() * FT, v = Math.random(); x.fillStyle = v < .5 ? 'rgba(0,0,0,.045)' : 'rgba(255,255,255,.06)'; x.fillRect(px, py, 1 + v * 2, 1 + v * 2); }
    for (let k = 0; k < FT * 2; k++) { const px = Math.random() * FT / 2, py = Math.random() * FT / 2, r = 1 + Math.random() * 4, v = Math.random() * 90 + 80 | 0; bx.fillStyle = `rgba(${v},${v},${v},.35)`; bx.beginPath(); bx.arc(px, py, r, 0, 7); bx.fill(); }
    { const id = x.getImageData(0, 0, FT, FT).data, bd = bx.getImageData(0, 0, FT / 2, FT / 2); for (let yy = 0; yy < FT / 2; yy++) for (let xx = 0; xx < FT / 2; xx++) { const o = (yy * 2 * FT + xx * 2) * 4, l = (id[o] + id[o + 1] + id[o + 2]) / 3, q = (yy * FT / 2 + xx) * 4; bd.data[q] = bd.data[q + 1] = bd.data[q + 2] = (bd.data[q] * .5 + l * .5) | 0; } bx.putImageData(bd, 0, 0); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(16, 16); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
    const bt = new THREE.CanvasTexture(bc); bt.wrapS = bt.wrapT = THREE.RepeatWrapping; bt.repeat.set(16, 16); bt.anisotropy = t.anisotropy;
    const g = new THREE.Mesh(new THREE.CircleGeometry(ARENA + 2, 96), (() => { const mt = new THREE.MeshStandardMaterial({ map: t, color: 0xd2d2d2, roughness: .7, bumpMap: bt, bumpScale: 1.2 }); if (TH.alienDeco || TH.paint) { const et = new THREE.CanvasTexture(gc); et.wrapS = et.wrapT = THREE.RepeatWrapping; et.repeat.set(16, 16); et.colorSpace = THREE.SRGBColorSpace; mt.emissiveMap = et; mt.emissive.set(0xffffff); mt.emissiveIntensity = .9; } return mt; })()); g.rotation.x = -PI / 2; G2.add(g); }
  { const D = 1024, cv = document.createElement('canvas'); cv.width = cv.height = D; const y = cv.getContext('2d'), h = D / 2, n = TH.sect.length * 2;
    for (let k = 0; k < n; k++) { y.fillStyle = TH.sect[k % TH.sect.length] + '24'; y.beginPath(); y.moveTo(h, h); y.arc(h, h, h * .98, k * 2 * PI / n + .01, (k + 1) * 2 * PI / n - .01); y.closePath(); y.fill(); }
    for (const [r, w, a] of [[.98, 8, '#ffffffcc'], [.66, 3, '#ffffff66'], [.33, 3, '#ffffff66']]) { y.strokeStyle = a; y.lineWidth = w; y.beginPath(); y.arc(h, h, h * r, 0, 7); y.stroke(); }
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; const ov = new THREE.Mesh(new THREE.CircleGeometry(ARENA + 2, 96), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); ov.rotation.x = -PI / 2; ov.position.y = .015; G2.add(ov); }
  const out = new THREE.Mesh(new THREE.RingGeometry(ARENA + 2, 520, 64), new THREE.MeshStandardMaterial({ color: TH.out, roughness: .7 })); out.rotation.x = -PI / 2; out.position.y = -.6; G2.add(out);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(ARENA + 2.5, 2.2, 14, 220), new THREE.MeshStandardMaterial({ map: stripes(TH.rim[0], TH.rim[1]), roughness: .3 })); rim.rotation.x = -PI / 2; rim.position.y = .4; G2.add(rim);
  const M = new THREE.Matrix4(), col = new THREE.Color(), Qd = new THREE.Quaternion(), Pd = new THREE.Vector3(), Sd = new THREE.Vector3(), E = new THREE.Euler();
  const NB = 220, beads = new THREE.InstancedMesh(new THREE.SphereGeometry(.75, 10, 8), new THREE.MeshStandardMaterial({ roughness: .3 }), NB);
  for (let k = 0; k < NB; k++) { const a = k / NB * 6.283; M.makeTranslation(Math.cos(a) * (ARENA + 2.5), 2.6, Math.sin(a) * (ARENA + 2.5)); beads.setMatrixAt(k, M); beads.setColorAt(k, col.set(TH.beads[k % TH.beads.length])); } G2.add(beads);
  // decorado: versiones gigantes de los objetos de la pista
  for (let t = 0; t < NTOY; t++) { const n = TH.scen ? 7 : 12, im = new THREE.InstancedMesh(OBJG[t], objMat, n); im.keepGeo = true;
    for (let k = 0; k < n; k++) { const a = (k * 8 + t) / (n * 8) * 6.283 + rnd(-.02, .02), r = ARENA + rnd(8, 34), s = rnd(2.5, 5.5); M.compose(Pd.set(Math.cos(a) * r, s * .7, Math.sin(a) * r), Qd.setFromEuler(E.set(rnd(-.3, .3), Math.random() * 6, rnd(-.3, .3))), Sd.setScalar(s)); im.setMatrixAt(k, M); im.setColorAt(k, col.set((TH.baked ? 0xffffff : TH.fixed[t]) ?? TH.cols[(k + t) % TH.cols.length])); }
    G2.add(im); }
  if (TH.scen) { const SG = SCEN[TH.scen](); SG.forEach((g, j) => { const n = 16, im = new THREE.InstancedMesh(g, objMat, n); for (let k = 0; k < n; k++) { const a = (k + j / SG.length) / n * 6.283 + rnd(-.08, .08), r = ARENA + rnd(6, 40), sc = rnd(3, 7); M.compose(Pd.set(Math.cos(a) * r, sc * .75, Math.sin(a) * r), Qd.setFromEuler(E.set(0, Math.random() * 6, 0)), Sd.setScalar(sc)); im.setMatrixAt(k, M); im.setColorAt(k, col.set(0xffffff)); } G2.add(im); }); }
  if (TH.alienDeco) { const cg = toy([[new THREE.OctahedronGeometry(.5, 0), WH0, [0, .7, 0], [0, 0, 0], [.55, 1.9, .55]], [new THREE.OctahedronGeometry(.35, 0), WH0, [.38, .35, .1], [0, 0, -.5], [.55, 1.6, .55]], [new THREE.OctahedronGeometry(.3, 0), WH0, [-.35, .3, -.1], [0, 0, .55], [.55, 1.5, .55]]]), cm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .2, emissive: 0xffffff, emissiveIntensity: .35, transparent: true, opacity: .9 });
    const n = 90, ci = new THREE.InstancedMesh(cg, cm, n); for (let k = 0; k < n; k++) { const a = Math.random() * 6.283, r = ARENA + rnd(3, 40), sc = rnd(1.5, 4.5); M.compose(Pd.set(Math.cos(a) * r, sc * .5, Math.sin(a) * r), Qd.setFromEuler(E.set(rnd(-.2, .2), Math.random() * 6, rnd(-.2, .2))), Sd.setScalar(sc)); ci.setMatrixAt(k, M); ci.setColorAt(k, col.set([0x2ef2ff, 0xff3fd0, 0x8dff3a, 0xa64dff][k % 4])); } G2.add(ci);
    const rg = new THREE.IcosahedronGeometry(1, 0), ri = new THREE.InstancedMesh(rg, new THREE.MeshStandardMaterial({ roughness: .9, flatShading: true }), 70); for (let k = 0; k < 70; k++) { const a = Math.random() * 6.283, r = ARENA + rnd(4, 45), sc = rnd(1.2, 4); M.compose(Pd.set(Math.cos(a) * r, sc * .3, Math.sin(a) * r), Qd.setFromEuler(E.set(Math.random() * 3, Math.random() * 3, 0)), Sd.set(sc, sc * .6, sc)); ri.setMatrixAt(k, M); ri.setColorAt(k, col.set([0x6a44b8, 0x8a5cd8, 0x4a2f8a][k % 3])); } G2.add(ri); }
  if (TH.planets) for (let k = 0; k < 6; k++) { const a = k * 1.05 + .3, r = ARENA + rnd(60, 120), s = rnd(10, 22); const pl = new THREE.Mesh(new THREE.SphereGeometry(s, 24, 16), new THREE.MeshStandardMaterial({ color: TH.cols[k % 6], roughness: .6 })); pl.position.set(Math.cos(a) * r, rnd(10, 40), Math.sin(a) * r); G2.add(pl);
    if (k % 2 === 0) { const ring = new THREE.Mesh(new THREE.TorusGeometry(s * 1.6, s * .12, 6, 40), new THREE.MeshStandardMaterial({ color: 0xfff27a, roughness: .5 })); ring.position.copy(pl.position); ring.rotation.x = PI / 2 - .4; G2.add(ring); } }
}

const foodGeo = new THREE.IcosahedronGeometry(1, 1), foodMat = new THREE.MeshStandardMaterial({ roughness: .35, emissive: 0xffffff, emissiveIntensity: .08 });

let food = [];
function spawnFood(f) { const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * (ARENA - 2); f = f || {}; if (!f.id) f.id = ++FID; f.x = Math.cos(a) * r; f.z = Math.sin(a) * r; f.m = 1.6; f.vx = f.vz = 0; f.ej = 0; f.k = 0; f.t = (Math.random() * NTOY) | 0; f.s = Math.random() < .8 ? rnd(.5, .75) : rnd(1.1, 2.0); if (TH.big && TH.big[f.t]) f.s = rnd(...TH.big[f.t]); f.m = 1.6 * (f.s / .6) ** 2; f.mv = TH.movers && TH.movers[f.t] || 0; f.ang = Math.random() * 6.28; f.rx = rnd(-.25, .25); f.rz = rnd(-.25, .25); f.c = (TH.baked ? 0xffffff : TH.fixed[f.t]) ?? FCOLS[(Math.random() * FCOLS.length) | 0]; f.ph = Math.random() * 6; f.dirty = 1; return f; }
function special(f, k) { f = spawnFood(f); f.k = k; f.mv = 0; f.t = k === 1 ? NTOY : NTOY + 1; f.s = k === 1 ? 1.1 : .75; f.m = k === 1 ? 16 : 2; f.c = k === 1 ? 0xffc21a : 0x3ff0ff; f.ej = 0; f.sp = 1; return f; }
function initFood() { food = []; for (let i = 0; i < NFOOD; i++) food.push(spawnFood()); for (let i = 0; i < 5; i++) food.push(special(null, 1)); for (let i = 0; i < 6; i++) food.push(special(null, 2)); }

// ---------- Charcos de pintura ----------
const puddleGeo = new THREE.CircleGeometry(1, 40);
const puddles = [];
for (let i = 0; i < 0; i++) { const m = new THREE.Mesh(puddleGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .15, metalness: .1, emissive: 0xffffff, emissiveIntensity: .25, transparent: true, opacity: .92 }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.03; scene.add(m); puddles.push({ m, x: 0, z: 0, r: 3.2, team: 0, t: 0 }); }
function placePuddle(p) { const a = Math.random() * 6.283, r = rnd(15, ARENA - 10); p.x = Math.cos(a) * r; p.z = Math.sin(a) * r; p.team = (Math.random() * 4) | 0; p.t = rnd(20, 30); p.m.material.color.set(colOf(p)); p.m.material.emissive.set(colOf(p)); p.m.position.set(p.x, .03, p.z); }

// ---------- Jugadores y células ----------
const ringGeo = new THREE.RingGeometry(1.05, 1.2, 48), ringGeoT = new THREE.RingGeometry(1.0, 1.32, 56), indGeo = new THREE.RingGeometry(1.28, 1.42, 40, 1, 0, Math.PI * 2);
const shTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 10, 64, 64, 64); g.addColorStop(0, '#5a2d7a88'); g.addColorStop(1, '#5a2d7a00'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const shMat = new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false }), shGeo = new THREE.PlaneGeometry(2.8, 2.8);
const fshIM = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, opacity: .85 }), 1500), FSQ = new THREE.Quaternion(); fshIM.count = 0; fshIM.frustumCulled = false; fshIM.renderOrder = -1; scene.add(fshIM); // v6.14: sombras de contacto
const waves = []; for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(.8, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); waves.push({ m, l: 0 }); } let wi = 0;
function wave(x, z, r, col) { const w = waves[wi = (wi + 1) % waves.length]; w.m.position.set(x, .08, z); w.r = r; w.l = 1; w.m.visible = true; w.m.material.color.set(col); }
function popNum() { return; } function popNum0(x, z, txt, col) { V.set(x, 1, z).project(camera); if (V.z > 1) return; const e = document.createElement('div'); e.className = 'pop'; e.textContent = txt; e.style.color = col; e.style.left = (V.x * .5 + .5) * innerWidth + 'px'; e.style.top = (-V.y * .5 + .5) * innerHeight + 'px'; $('pops').appendChild(e); setTimeout(() => e.remove(), 900); }
const BOTN = ['Fideo', 'Pipa', 'Rosquilla', 'Muffin', 'Chupi', 'Lacasito', 'Merengue', 'Galleta', 'Chicloso', 'Gominola', 'Bombón', 'Pegajosa', 'Regaliz', 'Turrón', 'Nube', 'Piruleta', 'Caramelo', 'Mazapán', 'Churro', 'Fresón', 'Kiwi', 'Melón', 'Coco', 'Gofre', 'Natilla', 'Flan', 'Toffee', 'Mochi', 'Bizcocho', 'Polvorón'];
let players = [], cells = [], me = null;
const MAXM = 1e9; // v6.17: sin tope de tamaño (antes radio ≤ 1/4 de arena ≈ 6700 de masa)
const BURST_R = ARENA * .9; // v6.17: al ocupar ~90% del mapa la bola explota en trozos
const START_M = 12, EAT_K = 1.05, PROT = 2; // 12 % más masa ≈ se ve claramente más grande con los juguetes; basta con que tu borde cubra su centro
const massR = m => 0.32 * Math.sqrt(m);
const speedOf = m => 22.8 * /* v6.20: +15% */ (0.363 + 0.637 / (1 + Math.pow(Math.max(1, m) / 55, 0.7))); // v6.11: los grandes conservan chispa // v6.9: curva más marcada, siempre baja con la masa // siempre baja con la masa: 12→12,1 · 200→8,9 · 1000→7,1 · máx→6
const shieldIM = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: 0x7ff6ff, transparent: true, opacity: .28, depthWrite: false }), 48); shieldIM.count = 0; shieldIM.frustumCulled = false; shieldIM.renderOrder = 5; scene.add(shieldIM);
function newCell(p, x, z, m) { const cid = ++CID;
  const mesh = makeCharMesh(p.char, G.teams && TEAMS[p.team] ? p.team : null); const ring = new THREE.Mesh(G.teams ? ringGeoT : ringGeo, new THREE.MeshBasicMaterial({ color: colOf(p), transparent: true, opacity: .85 })); ring.material.opacity = G.teams ? 1 : 0; ring.rotation.x = -Math.PI / 2; const ind = new THREE.Mesh(indGeo, new THREE.MeshBasicMaterial({ color: 0x3fd36a, transparent: true, opacity: 0, depthWrite: false })); ind.rotation.x = -Math.PI / 2; scene.add(ind); const sh = new THREE.Mesh(shGeo, shMat); sh.rotation.x = -Math.PI / 2;
  scene.add(mesh, ring, sh);
  const c = { p, x, z, px: x, pz: z, vx: 0, vz: 0, bx: 0, bz: 0, m, rr: massR(m), mesh, ring, ind, sh, q: new THREE.Quaternion(), st: [], merge: 0, yaw: 0, sq: 0, dead: 0 };
  c.id = cid; cells.push(c); p.cells.push(c); return c;
}
const EUL = new THREE.Euler(), TQ = new THREE.Quaternion(), TV2 = new THREE.Vector3(), MAXST = 90;
const strandIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6), new THREE.MeshStandardMaterial({ roughness: .3 }), 40); strandIM.count = 0; strandIM.frustumCulled = false; scene.add(strandIM); const V2 = new THREE.Vector3(), WHITE = new THREE.Color(0xffffff);
const flights = [], YUP = new THREE.Vector3(0, 1, 0);
function stick(c, t, s, col, wx, wz, fly, wy = .5) { if (c.fix) return; TV2.set(wx - c.x, rnd(-.2, 1.0) * c.rr, wz - c.z).normalize().applyQuaternion(TQ.copy(c.q).invert());
  // el juguete sale de la superficie: su eje "arriba" apunta hacia fuera, con giro e inclinación al azar
  const q = new THREE.Quaternion().setFromUnitVectors(YUP, TV2).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd(-.7, .7), Math.random() * 6.28, rnd(-.7, .7))));
  const o = { t, s, col, d: TV2.clone(), q, emb: rnd(.3, .55) }; if (fly && flights.length < 60) flights.push({ o, c, x: wx, y: wy, z: wz, t0: 0, dur: rnd(.14, .22) }); else addStuck(c, o); }
// v6.21: por encima de FIX_M la bola lleva un set FIJO de figuras (todas las de la pista, reparto Fibonacci), sin reciclar
const FIX_M = 3000, FIX_N = 170; // v6.22: set denso estilo Katamari
function buildFixed(c) { const old = c.st, out = [];
  for (let i = 0; i < FIX_N; i++) { const y = 1 - 2 * (i + .5) / FIX_N, r = Math.sqrt(1 - y * y), a = i * 2.39996; const d = new THREE.Vector3(Math.cos(a) * r + rnd(-.06, .06), y + rnd(-.06, .06), Math.sin(a) * r + rnd(-.06, .06)).normalize(), t = (i * 7 + (i >> 3)) % NTOY, u = Math.random(), fr = u < .07 ? rnd(.18, .25) : u < .3 ? rnd(.10, .14) : rnd(.04, .07);
    const q = new THREE.Quaternion().setFromUnitVectors(YUP, d).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd(-1.2, 1.2), Math.random() * 6.28, rnd(-1.2, 1.2))));
    out.push({ t, s: 0, fr, col: (TH.baked ? 0xffffff : TH.fixed[t]) ?? FCOLS[(Math.random() * FCOLS.length) | 0], d, q, emb: Math.random() < .25 ? rnd(.05, .25) : rnd(.3, .55), g: 0 }); }
  for (const o of old) o.out = 1; c.st = out; c.fixOld = old.filter(o => o.t < NT); c.fix = 1; c.fixN = FIX_N; }
function addStuck(c, o) { if (c.fix) return; c.st.push(o); if (c.st.length > MAXST) c.st.shift(); }
function transfer(from, to) { if (G.net === 'h') NEV.push(['tr', from.id, to.id]); let n = 0; for (const o of from.st) { o.d.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize(); o.q.setFromUnitVectors(YUP, o.d).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd(-.7, .7), Math.random() * 6.28, rnd(-.7, .7))));
    if (n++ < 25 && flights.length < 60) flights.push({ o, c: to, x: from.x + rnd(-1, 1) * from.rr, y: from.rr, z: from.z + rnd(-1, 1) * from.rr, t0: -n * .02, dur: rnd(.25, .4) }); else addStuck(to, o); } from.st = []; }
function removeCell(c) { c.dead = 1; scene.remove(c.mesh, c.ring, c.sh, c.ind); c.ring.material.dispose(); c.ind.material.dispose(); c.mesh.body.material.dispose(); if (c.mesh.body.geometry !== charGeo[c.p.char.id]) c.mesh.body.geometry.dispose(); }
const pMass = p => p.cells.reduce((s, c) => s + c.m, 0);
function spawnPlayer(p, m = 10) { let x, z, ok = 0; for (let k = 0; k < 20 && !ok; k++) { const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * (ARENA - 8); x = Math.cos(a) * r; z = Math.sin(a) * r; ok = cells.every(c => Math.hypot(c.x - x, c.z - z) > c.rr + 6); } newCell(p, x, z, m); p.alive = 1; p.prot = PROT; }
function setTeam(p, t) { p.team = t; for (const c of p.cells) { c.ring.material.color.set(TEAMS[t].c); if (G.teams) teamLook(c.mesh, p.char, t); } }

// ---------- Partículas ----------
const PN = 300, partIM = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ transparent: true, opacity: .95 }), PN); partIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(partIM);
const parts = []; for (let i = 0; i < PN; i++) parts.push({ l: 0 }); let pi = 0;
function burst(x, z, col, n, s = 1) { for (let i = 0; i < n; i++) { const q = parts[pi = (pi + 1) % PN]; const a = Math.random() * 6.283, v = rnd(4, 12) * s; Object.assign(q, { x, y: 1, z, vx: Math.cos(a) * v, vy: rnd(4, 10) * s, vz: Math.sin(a) * v, l: rnd(.4, .8), s: rnd(.15, .35) * s }); partIM.setColorAt(pi, new THREE.Color(col)); } partIM.instanceColor.needsUpdate = true; }

// ---------- Input: joystick flotante invisible ----------
// joystick flotante (igual que Tierra que se hunde v6): toca en cualquier sitio, arrastra hacia donde quieras ir (referencia fija al empezar)
let drag = null, joyA = null, joyM = 1; const joyEl = $('joy'), knob = $('joyK'); const joy = { on: 0 };
// v6.17: joystick FIJO (mismo aspecto, semitransparente) encima de los botones; Diestro = derecha, Zurdo = izquierda
const JR = 52; let joyC = { x: 0, y: 0 };
function placeJoy() { document.body.classList.toggle('zurdo', S.hand === 'z'); const r1 = $('bEject').getBoundingClientRect(), r2 = $('bSplit').getBoundingClientRect(), bb = { left: Math.min(r1.left, r2.left), width: Math.max(r1.right, r2.right) - Math.min(r1.left, r2.left), top: Math.min(r1.top, r2.top) }; /* v6.24: sin contar el botón Pegado */ const w = bb.width > 10 ? bb : { left: S.hand === 'z' ? 14 : innerWidth - 186, width: 172, top: innerHeight - 112 };
  joyC.x = w.left + w.width / 2 + (S.hand === 'z' ? 1 : -1) * Math.min(44, innerWidth * .1); /* v6.18: un poco hacia el centro */ joyC.y = w.top - 84; joyEl.style.left = joyC.x + 'px'; joyEl.style.top = joyC.y + 'px'; }
addEventListener('resize', () => setTimeout(placeJoy, 50));
function joyShow(v) { joyEl.classList.toggle('on', !!v); joyEl.classList.add('fixed'); if (v) { placeJoy(); setTimeout(placeJoy, 120); } }
canvas.addEventListener('pointerdown', e => { if (!G.on || sculpt.on) return; if (drag && drag.id === e.pointerId) return; placeJoy();
  if (Math.hypot(e.clientX - joyC.x, e.clientY - joyC.y) > 110 && e.pointerType !== 'mouse') return; /* solo se toca en la zona del joystick */
  audio(); drag = { id: e.pointerId, x0: joyC.x, y0: joyC.y }; try { canvas.setPointerCapture(e.pointerId); } catch (x) { } joyMove(e); });
function joyMove(e) { if (!drag || e.pointerId !== drag.id) return; let dx = e.clientX - drag.x0, dy = e.clientY - drag.y0; const R = JR; let d = Math.hypot(dx, dy); const fa = Math.atan2(dx, -dy), fd = d;
  if (d > R) { dx *= R / d; dy *= R / d; d = R; } knob.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
  const act = joyA == null ? fd > 6 : fd > 3.5; joyA = act ? fa : null; { const u = Math.max(0, Math.min(1, (Math.min(fd, R) - 3.5) / (R - 16))); joyM = u * (2 - u); } joyEl.style.setProperty('--a', fa + 'rad'); joyEl.classList.toggle('dir', fd > 5); }
canvas.addEventListener('onpointerrawupdate' in window ? 'pointerrawupdate' : 'pointermove', joyMove);
const joyRel = () => { drag = null; joyA = null; knob.style.transform = 'translate(-50%,-50%)'; joyEl.classList.remove('dir'); };
const endDrag = e => { if (!drag || e.pointerId !== drag.id) return; joyRel(); };
addEventListener('pointerup', endDrag); addEventListener('pointercancel', endDrag); canvas.addEventListener('lostpointercapture', endDrag); addEventListener('blur', joyRel); document.addEventListener('visibilitychange', joyRel);
function resetJoy() { joyRel(); joyM = 0; joy.on = 0; joyShow(1); }
const keys = {}; addEventListener('keydown', e => { keys[e.code] = 1; if (e.code === 'Space') doSplit(me); if (e.code === 'KeyW') doEject(me); }); addEventListener('keyup', e => keys[e.code] = 0);
$('bSplit').addEventListener('pointerdown', e => { e.stopPropagation(); if (G.net === 'c') NET.send({ t: 'sp', a: joyA }); else doSplit(me); });
$('bPeg').addEventListener('pointerdown', e => { e.stopPropagation(); doPeg(); });
$('bEject').addEventListener('pointerdown', e => { e.stopPropagation(); if (G.net === 'c') NET.send({ t: 'ej' }); else doEject(me); });

// ---------- Acciones ----------
function doSplit(p) {
  if (!G.on || !p || !p.alive) return; const list = p.cells.filter(c => c.m >= 20); if (!list.length) return;
  for (const c of list) { if (p.cells.length >= 8) break; const h = c.m / 2; c.m = h; c.rr = massR(h);
    let dx = p.dirx, dz = p.dirz; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    const n = newCell(p, c.x + dx * c.rr, c.z + dz * c.rr, h); n.vx = c.vx; n.vz = c.vz; n.bx = dx * 24; n.bz = dz * 24; /* impulso fijo: antes crecía con el tamaño */
    n.merge = c.merge = 1.8; n.st = c.st.splice(0, c.st.length >> 1); n.q.copy(c.q); n.sq = 1; c.sq = 1; wave(c.x, c.z, c.rr * 2, 0xffffff); burst(c.x, c.z, colOf(p), 6, .6); }
  if (p === me) sfx.combo(2);
}
// v6.19: explosión en MINI PERSONAJES: la misma figura (geometría y material del personaje) en un InstancedMesh por explosión; son comida libre para todos
const BURSTS = []; const MINI_MAX = 120, MINI_S = .75, MINI_LIVE = 160, MINIG = {};
function miniGeo(ch) { const key = ch.id === 'custom' ? 'custom:' + (S.shape || []).length + ':' + (S.shape ? S.shape[0] : 0) : ch.id; if (MINIG[key]) return MINIG[key]; const radii = charRadii(ch), g = new THREE.IcosahedronGeometry(1, 2), pa = g.attributes.position;
  for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), r = sampleR(radii, x, y, z); pa.setXYZ(i, x * r, y * r, z * r); } g.computeVertexNormals(); g.userData.mini = 1; return MINIG[key] = g; } // figura del personaje en baja resolución (320 triángulos)
function bigBurst(c) { const p = c.p, ox = c.x, oz = c.z, col = colOf(p), M = p.cells.reduce((a, o) => a + o.m, 0);
  wave(ox, oz, ARENA * 1.4, 0xffffff); wave(ox, oz, ARENA, col); burst(ox, oz, col, 40, 3); burst(ox, oz, 0xffd84a, 20, 2.4);
  if (p === me) { msg('💥 ¡BOOM! Tu bola ha explotado', 2.2); G.shake = 1; sfx.win(); if (!G.pegOn && G.net !== 'c') { G.pegOn = 1; G.pegUsed = new Set(); setTimeout(() => { if (G.pegOn) { msg('🧲 ¡Nueva habilidad: PEGADO!', 2.5); pegUI(); } }, 2300); pegUI(); } }
  const body = c.mesh.body, geo = miniGeo(p.char), mat = body.material.clone(), vk = visK(geo);
  const N = Math.max(20, Math.min(MINI_MAX, Math.round(M / 1500))); { let live = 0; for (let j = BURSTS.length - 1; j >= 0; j--) for (const q of BURSTS[j].q) if (q.l > 0) { live++; if (live + N > MINI_LIVE) q.l = Math.min(q.l, 1.2); } } const im = new THREE.InstancedMesh(geo, mat, N); im.frustumCulled = false; scene.add(im);
  const B = { im, geo, own: 0, mat, vk, q: [] }; const off = Math.random() * 6.283;
  for (let i = 0; i < N; i++) { const rr = Math.sqrt((i + .5) / N) * (ARENA - 4) * rnd(.93, 1), a = i * 2.39996 + off + rnd(-.12, .12); // espiral de girasol: reparto uniforme
    B.q.push({ x: ox * .85, z: oz * .85, tx: Math.cos(a) * rr, tz: Math.sin(a) * rr, m: 6, s: MINI_S * rnd(.85, 1.15), yaw: Math.random() * 6.283, l: rnd(16, 24), d: rnd(0, .3), e: 1.4 }); }
  BURSTS.push(B);
  for (const o of p.cells) if (o !== c) removeCell(o); p.cells = [c]; c.m = START_M; c.rr = massR(START_M); c.sq = 1; c.merge = 0; c.loose = 0; c.st.length = 0; c.bx = c.bz = 0; c.vx = c.vz = 0; c.tvx = c.tvz = undefined; p.prot = PROT; }
function clearBursts() { for (const B of BURSTS) { scene.remove(B.im); B.im.dispose(); B.mat.dispose(); if (B.own) B.geo.dispose(); } BURSTS.length = 0; }
function stepCrumbs(DT) { for (let j = BURSTS.length - 1; j >= 0; j--) { const B = BURSTS[j]; let live = 0;
  for (const q of B.q) { if (q.l <= 0) continue; q.l -= DT; live++; if (q.d > 0) { q.d -= DT; continue; } const k = damp(3.5, DT); q.x += (q.tx - q.x) * k; q.z += (q.tz - q.z) * k; if (q.e > 0) { q.e -= DT; continue; } /* volando: aún no se pueden comer */
    for (const c of cells) { if (c.dead || (G.pegT > 0 && c.p === me)) continue; const dx = q.x - c.x, dz = q.z - c.z; if (dx * dx + dz * dz <= c.rr * c.rr) { c.m += q.m; c.sq = Math.max(c.sq, .55); q.l = 0; if (c.p === me) sfx.pop(4, 0); break; } } }
  if (!live) { scene.remove(B.im); B.im.dispose(); B.mat.dispose(); if (B.own) B.geo.dispose(); BURSTS.splice(j, 1); } } }
function drawCrumbs(t) { for (const B of BURSTS) { let n = 0; for (const q of B.q) { if (q.l <= 0) continue; const s = q.s * B.vk * Math.min(1, q.l / 1.5) * (1 + Math.sin(t * 5 + q.yaw) * .06); TQ.setFromEuler(EUL.set(0, q.yaw + t * .5, 0)); M4.compose(SC.set(q.x, s * .9 + .05, q.z), TQ, TV2.setScalar(s)); B.im.setMatrixAt(n++, M4); } B.im.count = n; B.im.instanceMatrix.needsUpdate = true; } }
// v6.24: habilidad PEGADO (tras explotar): te enganchas 4 s a un rival cercano, invulnerable; una vez por rival
const PEG_T = 4, PEG_RANGE = 45;
function pegMain() { return me && me.cells.length ? me.cells.reduce((a, b) => a.m >= b.m ? a : b) : null; }
function pegCand() { const c = pegMain(); if (!c || !me.alive) return null; let best = null, bd = 1e9;
  for (const o of cells) { if (o.dead || o.p === me || !o.p.alive || G.pegUsed.has(o.p) || (G.teams && o.p.team === me.team)) continue; const d = Math.hypot(o.x - c.x, o.z - c.z) - o.rr - c.rr; if (d < PEG_RANGE && d < bd) { bd = d; best = o; } } return best; }
function pegUI() { const b = $('bPeg'); if (!b) return; b.classList.toggle('hide', !G.pegOn); if (G.pegOn) { const ok = G.pegT > 0 || !!pegCand(); b.classList.toggle('off', !ok); b.querySelector('small').textContent = G.pegT > 0 ? 'PEGADO ' + Math.ceil(G.pegT) : 'PEGADO'; } placeJoy(); }
function doPeg() { if (!G.on || !G.pegOn || G.pegT > 0) return; const t = pegCand(), c = pegMain(); if (!t || !c) { if (c) msg('Ningún rival cerca', 1); return; }
  G.pegT = PEG_T; G.pegTg = t; G.pegUsed.add(t.p); G.pegA = Math.atan2(c.z - t.z, c.x - t.x); me.prot = PEG_T + .2; sfx.combo(4); burst(c.x, c.z, 0x7ff6ff, 18, 1); msg('🧲 ¡Pegado a ' + t.p.name + '!', 1.5); pegUI(); }
function pegStep(DT) { if (!(G.pegT > 0)) return; let t = G.pegTg; if (!t || t.dead) t = G.pegTg = (G.pegTg && G.pegTg.p.cells.length ? G.pegTg.p.cells.reduce((a, b) => a.m >= b.m ? a : b) : null);
  G.pegT -= DT; me.prot = Math.max(me.prot, .3); const ux = Math.cos(G.pegA), uz = Math.sin(G.pegA);
  if (t && G.pegT > 0) { for (const c of me.cells) { const R = t.rr + c.rr * .55; c.x = t.x + ux * R; c.z = t.z + uz * R; c.vx = t.vx; c.vz = t.vz; c.bx = c.bz = 0; c.tvx = c.tvz = undefined; } return; }
  // soltar: reaparece alejado del rival, dentro del mapa
  G.pegT = 0; const c = pegMain(); if (c && t) { let a = G.pegA, ok = 0; for (let k = 0; k < 16 && !ok; k++) { const D = t.rr + c.rr + 18, x = t.x + Math.cos(a) * D, z = t.z + Math.sin(a) * D; if (Math.hypot(x, z) < ARENA - c.rr - 2) { ok = 1; for (const o of me.cells) { o.x = x + rnd(-1, 1); o.z = z + rnd(-1, 1); o.vx = o.vz = 0; } } else a += .4 * (k % 2 ? k : -k); }
    if (!ok) for (const o of me.cells) { o.x *= .2; o.z *= .2; } wave(c.x, c.z, c.rr * 3, 0x7ff6ff); }
  me.prot = 1; G.pegTg = null; pegUI(); }
function doEject(p) {
  if (!G.on || !p || !p.alive) return; let any = 0;
  for (const c of p.cells) { if (c.m < 18 || food.length >= MAXF) continue; c.m -= 3; c.rr = massR(c.m); any = 1;
    let dx = p.dirx, dz = p.dirz; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    const f = spawnFood(); f.x = c.x + dx * (c.rr + .8); f.z = c.z + dz * (c.rr + .8); f.vx = dx * 26; f.vz = dz * 26; f.m = 2.4; f.ej = 1; f.own = c; f.ot = .25; f.c = colOf(p); food.push(f); }
  if (any && p === me) sfx.off();
}

// ---------- IA ----------
const DIFF = { facil: { th: [.5, 1], vis: .55, give: 2.5, sCD: 30, sR: 3.2, miss: .5, jit: .55, food: .5, eat: .5, snack: .4, flee: .75 },
  normal: { th: [.3, .55], vis: .8, give: 4, sCD: 12, sR: 2.6, miss: .25, jit: .25, food: .25, eat: .85, snack: .12, flee: .9 },
  dificil: { th: [.16, .28], vis: 1, give: 99, sCD: 8, sR: 2.4, miss: 0, jit: 0, food: 0, eat: 1, snack: 0, flee: 1 } };
DIFF.humano = { th: [.3, .5], vis: .7, give: 3, sCD: 15, sR: 3, miss: .3, jit: 0, food: .3, eat: 1, snack: 0, flee: .85 };
const DF = () => DIFF[S.diff] || DIFF.facil;
function botThink(p) { const D = p === me ? DIFF.humano : DF(); p.panic = Math.random() < .3 ? .6 : (p.panic || 0) - .2;
  const c0 = p.cells.reduce((a, b) => a.m > b.m ? a : b); const myM = c0.m;
  let tx = 0, tz = 0, best = -1e9, threat = null, td = 1e9, prey = null;
  for (const o of cells) { if (o.p === p || o.p.team === p.team) continue; const d = Math.hypot(o.x - c0.x, o.z - c0.z);
    if (o.m > myM * EAT_K && d < (16 + o.rr * 2) * D.flee && d < td && !(o.m > myM * 2.5 && p.panic > 0)) { td = d; threat = o; }
    if (p.snack || (p.ignP === o.p && p.ignT > 0)) continue; if (myM > o.m * EAT_K && d < (26 + c0.rr * 2) * D.vis) { const sc = o.m / (d + 3) * p.aggr; if (sc > best) { best = sc; prey = o; } } }
  if (prey && Math.random() < D.food) prey = null; // a veces prefiere comida
  if (prey) { if (p.chP === prey.p) p.chT = (p.chT || 0) + p.thinkDt; else { p.chP = prey.p; p.chT = 0; } if (p.chT > D.give) { p.ignP = prey.p; p.ignT = 4; p.chT = 0; prey = null; } } else p.chT = 0;
  if (threat && (!prey || td < 9)) { tx = c0.x - threat.x; tz = c0.z - threat.z; const dc = Math.hypot(c0.x, c0.z); if (dc > ARENA - 12) { tx -= c0.x * 0.08; tz -= c0.z * 0.08; } }
  else if (prey) { tx = prey.x - c0.x; tz = prey.z - c0.z; const d = Math.hypot(tx, tz); if (myM > prey.m * D.sR && d < c0.rr + 9 && p.cells.length < 2 && (p.splitCD || 0) <= 0 && Math.random() < .25 * p.aggr && (G.inf || G.t < 110)) { p.splitCD = D.sCD; const mi = Math.random() < D.miss ? rnd(-.9, .9) : 0, ca = Math.cos(mi), sa = Math.sin(mi); p.dirx = tx * ca - tz * sa; p.dirz = tx * sa + tz * ca; doSplit(p); } }
  else { // comida: busca la zona con más chuches cerca
    let bd = 1e9, bf = null; for (let i = 0; i < food.length; i += 2) { const f = food[i]; if (f.s >= c0.rr) continue; const d = (f.x - c0.x) ** 2 + (f.z - c0.z) ** 2 - (f.k ? 400 : f.ej ? 60 : 0); if (d < bd) { bd = d; bf = f; } }
    if (bf) { tx = bf.x - c0.x; tz = bf.z - c0.z; }
    // charco: a veces cambia al equipo que va ganando (traición)
    if (Math.random() < .05) { const lead = teamScores().indexOf(Math.max(...teamScores())); if (lead !== p.team) for (const q of puddles) if (q.team === lead && Math.hypot(q.x - c0.x, q.z - c0.z) < 25) { tx = q.x - c0.x; tz = q.z - c0.z; p.goPud = 2; } }
  }
  if (p.snack && !threat && Math.random() < .5) { const a = Math.atan2(p.tz || 0, p.tx || 1) + rnd(-1, 1); tx = Math.cos(a); tz = Math.sin(a); }
  if (D.jit && p !== me) { const a = rnd(-D.jit, D.jit), ca = Math.cos(a), sa = Math.sin(a); [tx, tz] = [tx * ca - tz * sa, tx * sa + tz * ca]; }
  const L = Math.hypot(tx, tz) || 1; p.tx = tx / L; p.tz = tz / L;
}

// ---------- Juego ----------
const G = { th: -1, on: 0, t: 0, eats: 0, maxM: 0, auto: 0, frames: 0 };
const FFAC = [0xff5fa2, 0x4cc3ff, 0xffc93f, 0x5ee07a, 0xa368ff, 0xff7a3a, 0x2fd3c9, 0xff4f6a];
const colOf = p => G.teams ? TEAMS[p.team].c : (p === me ? 0xffffff : p.col || 0xff5fa2), cssOf = p => '#' + new THREE.Color(colOf(p)).getHexString();
function teamScores() { if (!G.teams) return [0, 0, 0, 0]; const s = [0, 0, 0, 0]; for (const c of cells) s[c.p.team] += c.m; return s; }
let selChar = null;
function startGame(opts = {}) { if (!opts.roster && G.net === 'h') { mpLeave(); } if (G.net === 'c') return; resetJoy(); G.dead = 0; acc = 0; last = performance.now(); for (const s of ['over', 'dead', 'help']) $(s).classList.add('hide'); G.cd = navigator.webdriver ? 0 : 2.1; $('cd').classList.toggle('hide', !G.cd);
  for (const c of cells) removeCell(c); cells = []; players = []; flights.length = 0; clearBursts(); G.pegOn = 0; G.pegT = 0; G.pegTg = null; G.pegUsed = new Set(); { const b = document.getElementById('bPeg'); if (b) b.classList.add('hide'); } { const pk = +S.arena; if (pk >= 0 && pk < THEMES.length) G.th = pk; else { let n; do n = (Math.random() * THEMES.length) | 0; while (n === G.th && THEMES.length > 1); G.th = n; } } setTheme(G.th); initFood(); puddles.forEach(placePuddle);
  const ch = allChars(); selChar = ch.find(c => c.id === S.char && !premLocked(c)) || ch[0]; G.trialUsed = selChar.prem && S.trial === selChar.id && !premOwned(selChar.id);
  G.teams = S.mode === 'equipos'; G.inf = S.dur === 'inf'; G.el = 0; $('bExit').classList.remove('hide'); $('bEndInf').classList.remove('hide'); me = { name: 'Tú', team: G.teams ? S.team : 100, char: selChar, cells: [], bot: 0, dirx: 0, dirz: 1, tx: 0, tz: 1, alive: 0, pud: 0, aggr: 1, boost: 0 };
  players.push(me); spawnPlayer(me, START_M);
  const RO = opts.roster || []; RO.forEach((r, i) => { const p = { name: r.name, remote: r.id, team: G.teams ? (r.team | 0) : 300 + i, col: FFAC[(i + 5) % FFAC.length], char: charById(r.ch), cells: [], bot: 0, dirx: 0, dirz: 1, tx: 0, tz: 1, alive: 0, pud: 0, aggr: 1, boost: 0, netA: null }; players.push(p); spawnPlayer(p, START_M); });
  const nb = 37 - RO.length, names = [...BOTN, ...BOTN.map(n => n + ' Jr')].slice(0, 37).sort(() => Math.random() - .5);
  for (let i = 0; i < Math.max(0, nb); i++) { const p = { snack: Math.random() < DF().snack, name: names[i], team: G.teams ? i % 4 : 101 + i, col: FFAC[i % FFAC.length], char: CHARS[(i * 3 + 1) % 10], cells: [], bot: 1, dirx: 1, dirz: 0, tx: 1, tz: 0, think: Math.random() * .3, aggr: rnd(.7, 1.25), alive: 0, pud: 0, resp: 0 };
    players.push(p); spawnPlayer(p, START_M); }
  Object.assign(G, { on: 1, dead: 0, el: 0, t: 120, eats: 0, maxM: START_M, betray: 0, bestCombo: 0, combo: 0, comboT: 0, best: 0, frenzy: 25, shake: 0 }); camZ = 0;
  for (const s of ['menu', 'over', 'dead', 'help']) $(s).classList.add('hide'); $('hud').classList.remove('hide'); setTeamHud();
  eatMsg(THEMES[G.th].name, 2.2); setTimeout(() => G.on && msg('🟢 Aro verde: ¡te la puedes comer!', 2.4), 1800); setTimeout(() => G.on && msg('🔴 Aro rojo: ¡huye, te come!', 2.4), 4400); if (G.teams) setTimeout(() => G.on && msg('⚪ Aro blanco: tu equipo', 2.2), 7000);
}
let msgT = 0; function msg() { } function eatMsg(t, d = 1.4) { $('msg').textContent = t; $('msg').style.opacity = 1; msgT = d; }
function toast(t) { const e = $('toast'); e.textContent = t; e.style.opacity = 1; clearTimeout(toast.h); toast.h = setTimeout(() => e.style.opacity = 0, 1800); }

const DT = 1 / 60;
const FGRID = new Map(), GS = 6;
function step() { step0(); if (G.net === 'h') netHostTick(); }
function step0() {
  if (G.inf) G.el = (G.el || 0) + DT; else { G.t -= DT; if (G.t <= 0) return endGame(); }
  // dirección del jugador
  if (me.alive) { let ja = joyA, m = joyM; const kx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0), ky = (keys.ArrowUp ? 1 : 0) - (keys.ArrowDown || keys.KeyS ? 1 : 0); if (kx || ky) { ja = Math.atan2(kx, ky); m = 1; }
    if (G.auto) { me.thinkDt = DT; botThink(me); ja = Math.atan2(me.tx, -me.tz); m = 1; }
    // cámara cenital fija: arriba en pantalla = -z
    if (ja == null) me.inp = 0; else { me.inp = m; const tx = Math.sin(ja), tz = -Math.cos(ja), k = 1 - Math.exp(-DT / 0.03); let nx = me.dirx + (tx - me.dirx) * k, nz = me.dirz + (tz - me.dirz) * k; const L = Math.hypot(nx, nz); if (L < .2) { nx = tx; nz = tz; } else { nx /= L; nz /= L; } me.dirx = nx; me.dirz = nz; } }
  if (G.net === 'h') netRemoteInput();
  for (const p of players) { if (!p.bot) continue; if (!p.alive) { p.resp -= DT; if (p.resp <= 0) { spawnPlayer(p, START_M); } continue; }
    p.think -= DT; if (p.ignT > 0) p.ignT -= DT; if (p.think <= 0) { const th = DF().th; p.think = p.thinkDt = rnd(th[0], th[1]); botThink(p); } p.dirx += (p.tx - p.dirx) * damp(10, DT); p.dirz += (p.tz - p.dirz) * damp(10, DT); p.inp = 1; }
  // movimiento
  const toBurst = [];
  for (const c of cells) { const p = c.p; c.px = c.x; c.pz = c.z; let dx = p.dirx, dz = p.dirz; const L = Math.hypot(dx, dz) || 1;
    // cada célula va hacia el centro de masa + dirección (como agar)
    // Tierra que se hunde v6: 2º orden, la entrada se suaviza (70 ms) y la velocidad la sigue (~90 ms): rápido pero sin tirones
    const m = c.loose > 0 ? 0 : (p.inp || 0), sp = (m > 0 ? speedOf(c.m) * Math.min(1, 0.55 + m * 1.6) : 0) * (p.boost > 0 && !p.bot ? 1.4 : 1), ki = 1 - Math.exp(-DT / 0.035), kv = 1 - Math.exp(-DT / 0.055);
    c.tvx = (c.tvx ?? c.vx) + (dx / L * sp - (c.tvx ?? c.vx)) * ki; c.tvz = (c.tvz ?? c.vz) + (dz / L * sp - (c.tvz ?? c.vz)) * ki;
    c.vx += (c.tvx - c.vx) * kv; c.vz += (c.tvz - c.vz) * kv;
    if (p.boost > 0 && Math.random() < .3) trail(c);
    c.x += (c.vx + c.bx) * DT; c.z += (c.vz + c.bz) * DT; const bd = damp(4.5, DT); c.bx -= c.bx * bd; c.bz -= c.bz * bd;
    if (c.merge > 0) c.merge -= DT; if (!isFinite(c.m) || c.m < 1) c.m = START_M; if (c.m > MAXM) c.m = MAXM; if (c.m > 150) c.m -= c.m * 0.0015 * DT; c.rr = massR(c.m); if (c.loose > 0) c.loose -= DT; else if (c.rr >= BURST_R && G.net !== 'c') toBurst.push(c); // Agar: los grandes adelgazan poco a poco
    if (!isFinite(c.x) || !isFinite(c.z)) { c.x = c.z = 0; c.vx = c.vz = c.bx = c.bz = 0; c.tvx = c.tvz = undefined; } const d = Math.hypot(c.x, c.z), lim = Math.max(2, ARENA - c.rr * .6); if (d > lim) { c.x *= lim / d; c.z *= lim / d; }
    if (c.sq > 0) c.sq = Math.max(0, c.sq - DT * 2.5); }
  for (const c of toBurst) if (!c.dead) bigBurst(c); stepCrumbs(DT);
  // células propias: cohesión, separación o fusión
  for (const p of players) { const cs = p.cells; if (cs.length < 2) continue; const main = cs.reduce((a, b) => a.m >= b.m ? a : b);
    // imán suave hacia el trozo principal (más grande), limitado para no dar velocidad extra
    for (const c of cs) { if (c === main || c.loose > 0) continue; const dx = main.x - c.x, dz = main.z - c.z, d = Math.hypot(dx, dz) || 1, mv = Math.min(Math.max(0, d - (main.merge <= 0 && c.merge <= 0 && main.m >= c.m * EAT_K ? 0 : (main.rr + c.rr) * .5)), Math.max(speedOf(c.m) * .15, speedOf(c.m) - Math.hypot(c.vx, c.vz)) * .6 * DT); c.x += dx / d * mv; c.z += dz / d * mv; }
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) { const a = cs[i], b = cs[j]; if (a.dead || b.dead) continue; const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz) || .01, rs = a.rr + b.rr;
      const big = a.m >= b.m ? a : b, sm = big === a ? b : a;
      // fusión = misma regla que comer: el grande (≥ EAT_K) cubre el centro del pequeño; iguales no se fusionan, solo se tocan
      if (!(big.loose > 0) && !(sm.loose > 0) && big.merge <= 0 && sm.merge <= 0 && big.m >= sm.m * EAT_K) { if (d < big.rr - sm.rr * .05) { big.m += sm.m; transfer(sm, big); big.sq = 1; removeCell(sm); } }
      else if (d < rs * .92) { const o = (rs * .92 - d) / d * .5 * damp(6, DT); a.x -= dx * o; a.z -= dz * o; b.x += dx * o; b.z += dz * o; } }
    p.cells = cs.filter(c => !c.dead); }
  cells = cells.filter(c => !c.dead);
  // comida
  for (const f of food) if (f.mv && f.x < 999) { f.ang += rnd(-2.5, 2.5) * DT; let sp = f.mv;
    if (me && me.alive) for (const c of me.cells) { const dx = f.x - c.x, dz = f.z - c.z; if (dx * dx + dz * dz < (c.rr + 5) ** 2) { f.ang = Math.atan2(dz, dx) + rnd(-.4, .4); sp = f.mv * 1.4; break; } }
    f.x += Math.cos(f.ang) * sp * DT; f.z += Math.sin(f.ang) * sp * DT; const d = Math.hypot(f.x, f.z); if (d > ARENA - 2) { f.ang += PI; f.x *= (ARENA - 2) / d; f.z *= (ARENA - 2) / d; } f.ry = -f.ang + PI / 2; }
  for (const f of food) if (f.ej) { f.x += f.vx * DT; f.z += f.vz * DT; const k = damp(3.5, DT); f.vx -= f.vx * k; f.vz -= f.vz * k; if (f.ot > 0) f.ot -= DT; const d = Math.hypot(f.x, f.z); if (d > ARENA - 1) { f.x *= (ARENA - 1) / d; f.z *= (ARENA - 1) / d; } f.dirty = 1; }
  pegStep(DT); if (G.pegOn && (G.pegUiT = (G.pegUiT || 0) - DT) <= 0) { G.pegUiT = .25; pegUI(); }
  FGRID.clear(); for (const f of food) { if (f.x > 999) continue; const k = ((f.x / GS + 64) | 0) * 256 + ((f.z / GS + 64) | 0); let b = FGRID.get(k); if (!b) FGRID.set(k, b = []); b.push(f); }
  let anyGone = 0;
  for (const c of cells) { if (G.pegT > 0 && c.p === me) continue; const r2 = (c.rr + 2.4) ** 2, R0 = c.rr + 2.4, x0 = ((c.x - R0) / GS + 64) | 0, x1 = ((c.x + R0) / GS + 64) | 0, z0 = ((c.z - R0) / GS + 64) | 0, z1 = ((c.z + R0) / GS + 64) | 0;
    for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) { const B = FGRID.get(gx * 256 + gz); if (B) for (let i = 0; i < B.length; i++) { const f = B[i]; if (f.gone || c.dead) continue; const dx = f.x - c.x; if (dx * dx > r2) continue; const dz = f.z - c.z; const fr = f.ej ? .3 : f.s * .85; if (dx * dx + dz * dz > c.rr * c.rr) continue; /* v6.18: solo si el centro del objeto queda dentro de la bola */ if (f.ej && f.own === c && f.ot > 0) continue; if (!f.ej && f.s >= c.rr) continue;
      c.m += f.m * (c.p.bot ? DF().eat : 1); c.sq = Math.max(c.sq, f.k ? 1 : .55); c.jig = 1; if (!f.ej) { stick(c, f.t, f.s, f.c, f.x, f.z, 1); if (G.net === 'h') NEV.push(['e', c.id, f.t, f.s, f.c, Math.round(f.x * 10), Math.round(f.z * 10)]); }
      if (f.k === 2 && !c.p.bot) { c.p.boost = 4; if (c.p === me) { msg('⚡ ¡TURBO!', 1); sfx.combo(5); G.shake = .25; } burst(f.x, f.z, 0x3ff0ff, 14, 1); }
      if (f.k === 1) { burst(f.x, f.z, 0xffd84a, 20, 1.2); wave(f.x, f.z, c.rr * 2, 0xffd84a); if (c.p === me) { popNum(f.x, f.z, '+16 🍭', '#ffd84a'); sfx.coin(); G.shake = .2; } }
      if (c.p === me) { addCombo(f.k ? 3 : 1); sfx.pop(Math.min(10, G.combo / 3 | 0), 0); }
      if (f.ej || f.fr) { f.gone = 1; anyGone = 1; if (G.net === 'h') NEV.gone.push(f.id); } else if (f.k) { const k = f.k; f.k = 0; f.dead = 1; setTimeout(() => special(f, k), 4000); f.x = 9999; } else spawnFood(f); } } }
  if (anyGone) food = food.filter(f => !f.gone);
  // comer células
  for (const a of cells) { if (a.dead) continue; for (const b of cells) { if (b === a || b.dead || a.dead || b.p === a.p) continue; if (b.p.team === a.p.team || b.p.prot > 0 || a.p.prot > 0 || !a.p.alive || !b.p.alive) continue;
      if (a.m < b.m * (b.loose > 0 ? .5 : EAT_K)) continue; /* v6.17: trozos sueltos de explosión: se comen con la mitad de masa */ const d = Math.hypot(b.x - a.x, b.z - a.z); if (d > a.rr) continue; /* v6.18: el borde debe cubrir al menos la mitad del otro (su centro dentro) */ // v6.15: regla clara y generosa
      a.m += b.m; a.sq = 1; transfer(b, a); burst(b.x, b.z, colOf(b.p), 26, Math.min(2.2, .7 + b.rr * .3)); burst(b.x, b.z, 0xffffff, 8, .8); wave(a.x, a.z, a.rr * 2.4, colOf(a.p)); if (a.p === me) popNum(a.x, a.z, '+' + Math.round(b.m), '#ffd84a'); if (b.p === me) popNum(b.x, b.z, '¡ÑAM!', '#ff5470');
      if (a.p.remote && G.net === 'h') NEV.push(['k', a.p.remote, b.p.name]); if (a.p === me) { G.eats++; sfx.bump(); G.shake = .45; addCombo(5); eatMsg('Te has comido a ' + b.p.name, 1.3); 0 && (b.p.cells.length <= 1 ? '😋 ¡Te has comido a ' + b.p.name + '!' : '😋 ¡Ñam!'); }
      removeCell(b); b.p.cells = b.p.cells.filter(c => !c.dead);
      if (!b.p.cells.length) { b.p.alive = 0; b.p.resp = 1.2; if (b.p === me) { G.shake = .6; onDeath(a.p); } else if (b.p.remote && G.net === 'h') NET.sendTo(b.p.remote, { t: 'dead', k: a.p.name }); } } }
  cells = cells.filter(c => !c.dead);
  // charcos
  for (const q of puddles) { q.t -= DT; if (q.t <= 0) placePuddle(q);
    for (const p of players) { if (!p.alive || p.pud > 0 || p.team === q.team) continue; if (p.bot && !p.goPud && Math.random() < .995) continue;
      if (p.cells.some(c => Math.hypot(c.x - q.x, c.z - q.z) < q.r + c.rr * .3)) { const old = p.team; setTeam(p, q.team); p.pud = 8; p.goPud = 0; burst(q.x, q.z, TEAMS[q.team].c, 24, 1.2);
        if (p === me) { G.betray++; sfx.paint(); msg('🎨 ¡Traición! Ahora eres ' + TEAMS[q.team].n); setTeamHud(); } } } }
  for (const p of players) { if (p.pud > 0) p.pud -= DT; if (p.boost > 0) p.boost -= DT; if (p.splitCD > 0) p.splitCD -= DT; if (p.prot > 0) p.prot -= DT; }
  if (G.comboT > 0 && (G.comboT -= DT) <= 0) { G.combo = 0; $('combo').style.opacity = 0; }
  if ((G.frenzy -= DT) <= 0) { G.frenzy = 30; const a = Math.random() * 6.283, r = rnd(0, ARENA * .5), cx = Math.cos(a) * r, cz = Math.sin(a) * r; for (let i = 0; i < 160 && food.length < MAXF; i++) { const f = spawnFood(); const b = Math.random() * 6.283, d = Math.sqrt(Math.random()) * 16; f.x = cx + Math.cos(b) * d; f.z = cz + Math.sin(b) * d; f.fr = 1; f.m = 2; food.push(f); } G.fz = { x: cx, z: cz, t: 8 }; msg('🍬 ¡LLUVIA DE CHUCHES!', 2); sfx.win(); wave(cx, cz, 18, 0xffd84a); }
  if (me.alive) G.maxM = Math.max(G.maxM, pMass(me));
}
function addCombo(n) { G.combo = G.comboT > 0 ? G.combo + n : n; G.comboT = 1.1; G.bestCombo = Math.max(G.bestCombo || 0, G.combo); const e = $('combo'); if (G.combo >= 5) { e.textContent = 'x' + G.combo + (G.combo >= 40 ? ' 🔥🔥' : G.combo >= 20 ? ' 🔥' : ''); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); e.style.opacity = 1; } }
function feed(a, b) { const e = document.createElement('div'); e.innerHTML = `<b style="color:${TEAMS[a.team].css}">${a === me ? 'Tú' : a.name}</b> 😋 <b style="color:${TEAMS[b.team].css}">${b === me ? 'Tú' : b.name}</b>`; if (a === me || b === me) e.className = 'mine'; const f = $('feed'); f.prepend(e); while (f.children.length > 4) f.lastChild.remove(); setTimeout(() => e.remove(), 4000); }
function premTrail(c) { const q = parts[pi = (pi + 1) % PN]; Object.assign(q, { x: c.x + rnd(-.4, .4) * c.rr, y: .4, z: c.z + rnd(-.4, .4) * c.rr, vx: -c.vx * .15, vy: 1.2, vz: -c.vz * .15, l: .55, s: .16 + c.rr * .06 }); partIM.setColorAt(pi, COL.set(c.mesh.prem.tr)); partIM.instanceColor.needsUpdate = true; }
function trail(c) { const q = parts[pi = (pi + 1) % PN]; Object.assign(q, { x: c.x + rnd(-.5, .5) * c.rr, y: .3, z: c.z + rnd(-.5, .5) * c.rr, vx: -c.vx * .2, vy: 2, vz: -c.vz * .2, l: .35, s: .2 + c.rr * .12 }); partIM.setColorAt(pi, COL.set(0x7ff6ff)); partIM.instanceColor.needsUpdate = true; }
function onDeath(killer) { G.dead = 1; joy.on = 0; sfx.lose(); $('deadInfo').innerHTML = 'Te ha comido <b>' + killer.name + '</b>' + (G.teams ? ' (' + TEAMS[killer.team].n + ')' : '') + '<br>Masa máxima: <b>' + Math.round(G.maxM) + '</b>'; $('dead').classList.remove('hide'); }
$('bExit').onclick = () => { sfx.click(); if (G.net === 'c') { endGame(); mpLeave(); return; } if (G.on) endGame(); }; $('bEndInf').onclick = () => { sfx.click(); endGame(); };
function revive(m) { resetJoy(); $('dead').classList.add('hide'); G.dead = 0; spawnPlayer(me, m); }
$('bRev').onclick = () => { sfx.click(); if (G.net === 'c') { NET.send({ t: 'rev' }); $('dead').classList.add('hide'); G.dead = 0; return; } revive(START_M); };
$('bRevAd').onclick = () => { sfx.click(); ads.showRewarded(() => { if (G.net === 'c') { NET.send({ t: 'rev', half: 1 }); $('dead').classList.add('hide'); G.dead = 0; return; } revive(Math.max(START_M, G.maxM / 2)); }); };
function setTeamHud() { $('teamDot').style.background = G.teams ? TEAMS[me.team].css : '#7c4dff'; $('teamName').textContent = G.teams ? TEAMS[me.team].n : '⚔️ Todos'; $('teams').style.display = G.teams ? '' : 'none'; }
function endGame() {
  if (G.trialUsed) { G.trialUsed = 0; S.trial = null; if (!premOwned(S.char)) S.char = 'fresa'; save(); setTimeout(() => toast('Fin de la prueba del personaje premium'), 600); }
  if (G.net === 'h' && NET) NET.send({ t: 'end' });
  G.on = 0; G.dead = 0; G.cd = 0; $('cd').classList.add('hide'); resetJoy(); $('dead').classList.add('hide'); $('hud').classList.add('hide');
  const ts = teamScores(), wt = ts.indexOf(Math.max(...ts)), rank = players.slice().sort((a, b) => pMass(b) - pMass(a)), pos = rank.indexOf(me) + 1;
  S.best = Math.max(S.best, Math.round(G.maxM)); save(); const won = G.teams ? wt === me.team : pos === 1; (won ? sfx.win : sfx.lose)();
  $('ovTitle').textContent = G.teams ? (won ? '🏆 ¡Gana tu equipo!' : '¡Fin de la partida!') : (pos === 1 ? '🏆 ¡Eres el más grande!' : pos <= 3 ? '🥳 ¡Al podio!' : '¡Fin de la partida!');
  const top3 = rank.slice(0, 3), ord = [1, 0, 2];
  $('podium').innerHTML = ord.map(k => top3[k] ? `<div class="pod p${k + 1} ${top3[k] === me ? 'me' : ''}"><img src="${thumb(top3[k].char)}"><div class="blk" style="color:#5a2d7a">${k + 1}º<div style="font-size:11px">${top3[k].name}</div></div><div>${Math.round(pMass(top3[k]))}</div></div>` : '').join('');
  const tmax = Math.max(...ts) || 1; $('tbars').innerHTML = !G.teams ? rank.slice(3, 8).map((p, i) => `<div class="res ${p === me ? 'me' : ''}"><span>${i + 4}. ${p.name}</span><b>${Math.round(pMass(p))}</b></div>`).join('') + (pos > 8 ? `<div class="res me"><span>${pos}. Tú</span><b>${Math.round(pMass(me))}</b></div>` : '') : ts.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).map(([v, i]) => `<div class="tb"><span style="width:70px;text-align:left;color:${TEAMS[i].css};font-weight:700">${i === wt ? '👑 ' : ''}${TEAMS[i].n}</span><div class="bar"><div style="width:${v / tmax * 100}%;background:${TEAMS[i].css}"></div></div><b>${Math.round(v)}</b></div>`).join('');
  $('ovInfo').innerHTML = `<div class="stats"><div>Mejor combo<b>x${G.bestCombo || 0}</b></div><div>Modo<b style="font-size:15px">${G.teams ? 'Equipo ' + TEAMS[me.team].n : 'Todos contra todos'}</b></div><div>Tu puesto<b>${pos}º</b></div><div>Masa máxima<b>${Math.round(G.maxM)}</b></div><div>Bolas comidas<b>${G.eats}</b></div><div>Récord<b>${S.best}</b></div></div><div style="margin-top:6px;font-size:13px;opacity:.8">Récord: ${S.best}</div>`;
  $('over').classList.remove('hide');
}
$('bAgain').onclick = () => { sfx.click(); if (G.net === 'h') return netHostStart(); if (G.net === 'c') return; startGame(); };
$('bMenu').onclick = () => { sfx.click(); mpLeave(); $('bAgain').textContent = '↻ Otra'; showMenu(); };

// ---------- Render bucle ----------
let camZ = 0, camX = 0, camZp = 0, camH = 30, acc = 0, last = performance.now(), hudT = 0;
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), SC = new THREE.Vector3(), COL = new THREE.Color(), UP = new THREE.Vector3(0, 1, 0);
let fpsAcc = 0, fpsN = 0, fpsLow = 0;
function frame(now) { requestAnimationFrame(frame); try { frame1(now); } catch (e) { G.errN = (G.errN || 0) + 1; if (G.errN < 20) console.warn('frame', e); acc = 0; } }
function frame1(now) {
 let dt = Math.min(.1, (now - last) / 1000); last = now; G.frames++;
  fpsAcc += dt; fpsN++; if (fpsAcc > 1) { const fps = fpsN / fpsAcc; fpsAcc = fpsN = 0; if (fps < 45 && G.on) { if (++fpsLow >= 2 && DPR > .75) { DPR = Math.max(.75, DPR - .25); renderer.setPixelRatio(DPR); if (DPR <= 1) fshIM.visible = false; resize(); fpsLow = 0; } } else fpsLow = 0; }
  if (sculpt.on) { sculptFrame(dt); return; }
  if (G.on && G.net === 'c') netClientFrame(dt);
  else if (G.on && G.cd > 0) { if (G.needWarm) { G.needWarm = 0; try { renderer.compile(scene, camera); } catch (e) { } } G.cd -= Math.min(dt, .05); const n = Math.ceil(G.cd / .7); $('cd').textContent = G.cd > 0 ? n : '¡YA!'; if (G.cd <= 0) { setTimeout(() => $('cd').classList.add('hide'), 350); acc = 0; } }
  else if (G.on && (!G.dead || G.net === 'h')) { acc += dt; let n = 0; while (acc >= DT && n < 6 && G.on) { try { step(); } catch (e) { G.errN = (G.errN || 0) + 1; if (G.errN < 20) console.warn('step', e); } acc -= DT; n++; } if (n >= 6) acc = 0; }
  const al = acc / DT, t = now / 1000;
  { let n = 0; if (G.on) for (const c of cells) { if (!(c.p.prot > 0) || c.dead) continue; if (n >= 48) break; const r = c.rr * (1.18 + Math.sin(t * 8) * .03); M4.compose(V.set(c.ix ?? c.x, c.rr, c.iz ?? c.z), TQ.identity(), SC.setScalar(r)); shieldIM.setMatrixAt(n++, M4); } shieldIM.count = n; shieldIM.instanceMatrix.needsUpdate = true; shieldIM.material.opacity = me && me.prot > 0 && me.prot < .6 ? .28 * (Math.sin(t * 20) > 0 ? 1 : .3) : .28; }
  for (const c of cells) { const x = c.px + (c.x - c.px) * al, z = c.pz + (c.z - c.pz) * al, r = c.rr; c.ix = x; c.iz = z;
    const sp = Math.hypot(c.vx + c.bx, c.vz + c.bz); if (sp > .5) { const ty = Math.atan2((c.vx + c.bx) / sp * .9, 1); let d = ty - c.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); c.yaw += d * damp(10, dt); }
    if (c.jig > 0) c.jig = Math.max(0, c.jig - dt * 2.2); const w = Math.sin(t * 9 + c.x) * .03 + c.sq * Math.sin(c.sq * 18) * .12 + (c.jig || 0) * Math.sin(t * 34) * .06, bob = Math.abs(Math.sin(t * 7 + c.z)) * Math.min(.3, sp * .02) * r;
    c.mesh.position.set(x, r * (1 - w) + bob * .4, z); const st = Math.min(.35, Math.hypot(c.bx, c.bz) * .012); c.mesh.scale.set(r * (1 + w - st * .5), r * (1 - w - st * .4), r * (1 + w + st)); c.mesh.face.rotation.set(-.75 + Math.min(.2, sp * .012), Math.sin(c.yaw) * .4, 0, 'YXZ'); /* v6.23: cara siempre hacia la cámara (solo mira un poco hacia los lados) */ if (c.mesh.acc) { c.mesh.acc.rotation.set(-.35, c.yaw, 0, 'YXZ'); animAcc(c.mesh.acc, t, sp); if (sp > 3 && Math.random() < .35) premTrail(c); }
    if (sp > .2) { TV2.set(c.vz + c.bz, 0, -(c.vx + c.bx)).normalize(); TQ.setFromAxisAngle(TV2, sp * dt / Math.max(.3, r)); c.q.premultiply(TQ); } c.mesh.body.quaternion.copy(c.q);
    c.ring.position.set(x, .05, z); c.ring.scale.setScalar(r);
    { let mine = 0; if (me && G.on && me.alive && c.p !== me) for (const q of me.cells) mine = Math.max(mine, q.m); const I = c.ind.material;
      if (!mine) I.opacity = 0; else if (c.p.prot > 0) { I.color.set(0x7ff6ff); I.opacity = .8; } else if (c.p.team === me.team) { I.color.set(0xffffff); I.opacity = .55; } else if (mine >= c.m * EAT_K) { I.color.set(0x2fd36a); I.opacity = .65 + Math.sin(t * 8) * .3; } else if (c.m >= mine * EAT_K) { I.color.set(0xff3b4f); I.opacity = .7; } else I.opacity = 0;
      c.ind.position.set(x, .06, z); c.ind.scale.setScalar(r); } c.sh.position.set(x + r * .15, .03, z + r * .1); c.sh.scale.setScalar(r * (1 - bob * .1)); }
  // objetos pegados (Katamari): se hunden en la bola según crece
  const sc = new Array(NT).fill(0);
  for (const c of cells) { if (c.m >= FIX_M && (!c.fix || c.st.length !== c.fixN)) buildFixed(c); else if (c.fix && c.m < FIX_M * .8) { c.fix = 0; c.fixN = 0; for (const o of c.st) { o.s = o.fr * c.rr; delete o.fr; } }
    if (c.fixOld && c.fixOld.length) { const fo = c.fixOld; for (let j = fo.length - 1; j >= 0; j--) { const o = fo[j]; o.k = (o.k ?? 1) - dt * 1.6; if (o.k <= 0) { fo.splice(j, 1); continue; } c.st.push(o); } }
    if (!c.st.length) continue; c.mesh.updateMatrixWorld(); const BW = c.mesh.body.matrixWorld;
    for (let j = c.st.length - 1; j >= 0; j--) { const o = c.st[j]; if (o.g != null && o.g < 1) o.g = Math.min(1, o.g + dt * 1.4); const rel = (o.fr ?? Math.max(o.s / c.rr, .085)) * (o.g ?? 1) * (o.k ?? 1); const im = stkIMs[o.t]; if (sc[o.t] >= MAXS) continue;
      M4.compose(V.copy(o.d).multiplyScalar(1 + rel * (1 - 2 * o.emb) * .9), o.q, SC.setScalar(rel)); M4.premultiply(BW); im.setMatrixAt(sc[o.t], M4); im.setColorAt(sc[o.t], COL.set(o.col)); sc[o.t]++; } if (c.fixOld && c.fixOld.length) c.st.length = c.fixN; }
  let ns = 0;
  for (let j = flights.length - 1; j >= 0; j--) { const F = flights[j], c = F.c; F.t0 += dt; if (c.dead) { flights.splice(j, 1); continue; } const k = Math.max(0, F.t0 / F.dur);
    if (k >= 1) { flights.splice(j, 1); addStuck(c, F.o); c.sq = Math.max(c.sq, .6); c.jig = 1; if (c.p === me) sfx.pop(3 + (Math.random() * 5 | 0), 0); continue; }
    c.mesh.updateMatrixWorld(); V.copy(F.o.d).multiplyScalar(1).applyMatrix4(c.mesh.body.matrixWorld); const e = k * k * (3 - 2 * k);
    const px = F.x + (V.x - F.x) * e, pz = F.z + (V.z - F.z) * e, py = F.y + (V.y - F.y) * e + Math.sin(k * Math.PI) * (1 + c.rr * .5);
    const im = stkIMs[F.o.t]; if (sc[F.o.t] < MAXS) { TQ.setFromEuler(new THREE.Euler(k * 6, k * 4, 0)); M4.compose(SC.set(px, py, pz), TQ, V2.setScalar(F.o.s * (1 - .2 * Math.sin(k * Math.PI)))); im.setMatrixAt(sc[F.o.t], M4); im.setColorAt(sc[F.o.t], COL.set(F.o.col)); sc[F.o.t]++; }
    // hebra de chicle estirándose hacia el juguete
    if (k > .45 && ns < 40) { const cx = c.mesh.position.x, cy = c.mesh.position.y, cz = c.mesh.position.z; V.set(px - cx, py - cy, pz - cz); const L2 = V.length(); V.normalize();
      const a0 = SC.set(cx, cy, cz).addScaledVector(V, c.rr * .9), len = Math.max(.01, L2 - c.rr * .9); TQ.setFromUnitVectors(YUP, V); M4.compose(a0.addScaledVector(V, len / 2), TQ, V2.set(.12 * (1 - k) + .04, len, .12 * (1 - k) + .04)); strandIM.setMatrixAt(ns, M4); strandIM.setColorAt(ns, COL.set(colOf(c.p)).lerp(WHITE, .4)); ns++; } }
  strandIM.count = ns; strandIM.instanceMatrix.needsUpdate = true; if (strandIM.instanceColor) strandIM.instanceColor.needsUpdate = true;
  stkIMs.forEach((im, i) => { im.count = sc[i]; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; });
  // comida (objetos 3D)
  const fc = new Array(NT).fill(0); let nfs = 0;
  const vx0 = camX, vz0 = camZp, vw = camH * camera.aspect * .62 + 3, vh = camH * .62 + 3; for (const f of food) { if (f.x > 999 || Math.abs(f.x - vx0) > vw || Math.abs(f.z - vz0) > vh) continue; const im = foodIMs[f.t]; if (fc[f.t] >= 1300) continue; const s = (f.ej ? .55 : f.s) * (1 + Math.sin(t * (f.k ? 6 : 3) + f.ph) * (f.k ? .15 : .05));
    TQ.setFromEuler(EUL.set(f.rx, f.mv ? f.ry : t * (f.k ? 2 : .6) + f.ph, f.rz)); const hq = f.mv ? Math.abs(Math.sin(t * (6 + f.mv * 1.5) + f.ph)) : 0; M4.compose(V.set(f.x, s + .05 + (f.k ? Math.sin(t * 3 + f.ph) * .25 + .4 : 0) + hq * s * .35, f.z), TQ, f.mv ? SC.set(s * (1.08 - hq * .1), s * (.88 + hq * .2), s * (1.08 - hq * .1)) : SC.setScalar(s)); im.setMatrixAt(fc[f.t], M4); im.setColorAt(fc[f.t], COL.set(f.c)); fc[f.t]++; if (nfs < 1500) { M4.compose(V.set(f.x + s * .12, .025, f.z + s * .08), FSQ, SC.set(s * 2.1, 1, s * 2.1)); fshIM.setMatrixAt(nfs++, M4); } }
  fshIM.count = nfs; fshIM.instanceMatrix.needsUpdate = true; drawCrumbs(t);
  foodIMs.forEach((im, i) => { im.count = fc[i]; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; });
  for (const q of puddles) { const s = q.r * (1 + Math.sin(t * 3) * .05) * Math.min(1, (q.t > 2 ? 1 : q.t / 2)); q.m.scale.setScalar(Math.max(.01, s)); }
  for (const w of waves) if (w.l > 0) { w.l -= dt * 2.2; const k = 1 - Math.max(0, w.l); w.m.scale.setScalar(.3 + k * w.r); w.m.material.opacity = Math.max(0, w.l) * .8; if (w.l <= 0) w.m.visible = false; }
  if (G.on && (mmT -= dt) <= 0) { mmT = .1; drawMini(); }
  // partículas
  for (let i = 0; i < PN; i++) { const q = parts[i]; if (q.l > 0) { q.l -= dt; q.vy -= 25 * dt; q.x += q.vx * dt; q.y = Math.max(.1, q.y + q.vy * dt); q.z += q.vz * dt; } const s = q.l > 0 ? q.s : 0; M4.makeScale(s, s, s).setPosition(q.x || 0, q.y || 0, q.z || 0); partIM.setMatrixAt(i, M4); } partIM.instanceMatrix.needsUpdate = true;
  // cámara
  if (players.length && me) { let mx = 0, mz = 0, tm = 0, maxr = 1; if (me.cells.length) { for (const c of me.cells) { mx += (c.ix ?? c.x) * c.m; mz += (c.iz ?? c.z) * c.m; tm += c.m; maxr = Math.max(maxr, c.rr); } mx /= tm; mz /= tm; } else { mx = camX; mz = camZp; }
    const spread = me.cells.reduce((a, c) => Math.max(a, Math.hypot((c.ix ?? c.x) - mx, (c.iz ?? c.z) - mz) + c.rr), 0); const tH = 26 + Math.sqrt(Math.min(tm || 10, 400)) * 1.2 + Math.max(maxr * 4.2, spread * 2.4), ar = camera.aspect < 1 ? 1.15 : .9; camH += (Math.min(900, isFinite(tH) ? tH * ar : 60) - camH) * damp(2.5, dt); scene.fog.near = camH * 1.6 + 40; scene.fog.far = camH * 4 + 220;
    { let vx = 0, vz = 0; for (const c of me.cells) { vx += c.vx; vz += c.vz; } const n = me.cells.length || 1; mx += vx / n * .25; mz += vz / n * .25; } camX += (mx - camX) * damp(12, dt); camZp += (mz - camZp) * damp(12, dt); if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 2.2); const sk = (G.shake || 0) ** 2 * 2.2; camera.position.set(camX + rnd(-sk, sk), camH, camZp + camH * .42 + rnd(-sk, sk)); camera.lookAt(camX, 0, camZp); camera.fov = 50 + (me.boost > 0 ? 6 : 0) + (G.shake || 0) * 6; camera.near = Math.max(.5, camH * .12); camera.far = camH * 6 + 600; camera.updateProjectionMatrix(); /* v6.18: near dinámico = sin parpadeo de baldosas al alejar */ }
  else { camera.position.set(Math.sin(t * .1) * 40, 45, Math.cos(t * .1) * 40); camera.lookAt(0, 0, 0); }
  renderer.render(scene, camera);
  if (G.on && (hudT -= dt) <= 0) { hudT = .25; updHud(); }
  if (msgT > 0 && (msgT -= dt) <= 0) $('msg').style.opacity = 0;
}
let mmT = 0; const mm = $('mini'), mx2 = mm.getContext('2d');
function drawMini() { const W = mm.width, R = W / 2 - 3, k = R / ARENA; mx2.clearRect(0, 0, W, W); mx2.fillStyle = '#2a164099'; mx2.beginPath(); mx2.arc(W / 2, W / 2, R + 2, 0, 7); mx2.fill(); mx2.strokeStyle = '#ffa8d6'; mx2.lineWidth = 3; mx2.stroke();
  for (const q of puddles) { mx2.fillStyle = '#fff8'; mx2.beginPath(); mx2.arc(W / 2 + q.x * k, W / 2 + q.z * k, Math.max(3, q.r * k), 0, 7); mx2.fill(); }
  for (const c of cells) { mx2.fillStyle = cssOf(c.p); mx2.beginPath(); mx2.arc(W / 2 + c.x * k, W / 2 + c.z * k, Math.max(2, c.rr * k * 1.4), 0, 7); mx2.fill(); if (c.p === me) { mx2.strokeStyle = '#fff'; mx2.lineWidth = 2; mx2.stroke(); } }
  // vista de cámara
  const vw = camH * camera.aspect * .9 * k, vh = camH * .9 * k; mx2.strokeStyle = '#ffffff88'; mx2.lineWidth = 1.5; mx2.strokeRect(W / 2 + camX * k - vw / 2, W / 2 + camZp * k - vh / 2, vw, vh); }
function updHud() {
  const s = G.inf ? (G.el | 0) : Math.ceil(G.t); $('timer').querySelector('.ic').textContent = G.inf ? '♾️' : '⏱'; $('timer').querySelector('b').textContent = ((s / 60) | 0) + ':' + String(s % 60).padStart(2, '0'); $('timer').classList.toggle('low', !G.inf && G.t < 20);
  $('mass').textContent = Math.round(pMass(me)); const ts = teamScores(), tot = ts.reduce((a, b) => a + b, 0) || 1;
  $('teams').innerHTML = ts.map((v, i) => `<div style="width:${v / tot * 100}%;background:${TEAMS[i].css}"></div>`).join('');
  const r = players.filter(p => p.alive).sort((a, b) => pMass(b) - pMass(a)), pos = r.indexOf(me);
  $('lb').innerHTML = r.slice(0, 5).map((p, i) => `<div class="${p === me ? 'me' : ''}">${i + 1}. <i style="background:${cssOf(p)}"></i>${p.name} ${Math.round(pMass(p))}</div>`).join('') + (pos >= 5 ? `<div class="me">${pos + 1}. Tú ${Math.round(pMass(me))}</div>` : '');
}

// ---------- Escultor (Crear el mío) ----------
const sculpt = { on: 0, tool: 'pull', R: .42, radii: null, undo: [], rotX: .2, rotY: 0, skin: 'fresa', eyes: true };
const sScene = new THREE.Scene(); sScene.background = new THREE.Color(0xffd6ec);
sScene.add(new THREE.HemisphereLight(0xffffff, 0xb08ad0, 1.8)); { const l = new THREE.DirectionalLight(0xffffff, 1.6); l.position.set(3, 5, 6); sScene.add(l); }
const sCam = new THREE.PerspectiveCamera(40, 1, .1, 50); sCam.position.set(0, .2, 5.6);
const sGeo = baseGeo.clone(), sMat = new THREE.MeshStandardMaterial({ roughness: .4 }), sMesh = new THREE.Mesh(sGeo, sMat); sScene.add(sMesh);
const sRing = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .7, depthTest: false })); sScene.add(sRing); sRing.visible = false;
let sFace = null;
function sApply() { const p = sGeo.attributes.position.array, r = sculpt.radii; for (let i = 0; i < NV; i++) { p[i * 3] = DIRS[i * 3] * r[i]; p[i * 3 + 1] = DIRS[i * 3 + 1] * r[i]; p[i * 3 + 2] = DIRS[i * 3 + 2] * r[i]; } sGeo.attributes.position.needsUpdate = true; sGeo.computeVertexNormals(); sGeo.computeBoundingSphere(); }
function sFaceUpd() { if (sFace) { sMesh.remove(sFace); sFace = null; } if (sculpt.eyes) sFace = addFace(sMesh, sculpt.radii); }
function sSkin(id) { sculpt.skin = id; sMat.map = skinMap(id); sMat.needsUpdate = true; document.querySelectorAll('#sCols canvas').forEach(c => c.classList.toggle('on', c.dataset.id === id)); }
function openSculpt() {
  sculpt.on = 1; sculpt.radii = S.shape ? Float32Array.from(S.shape) : new Float32Array(NV).fill(1); sculpt.undo = []; sculpt.eyes = S.eyes !== false; sculpt.rotX = .15; sculpt.rotY = 0;
  sApply(); sFaceUpd(); sSkin(S.cskin || 'fresa'); $('menu').classList.add('hide'); $('sculpt').classList.remove('hide');
}
function closeSculpt() { sculpt.on = 0; $('sculpt').classList.add('hide'); showMenu(); }
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let sp = null;
function sHit(e) { ndc.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(ndc, sCam); const h = ray.intersectObject(sMesh, false)[0]; return h; }
canvas.addEventListener('pointerdown', e => { if (!sculpt.on) return; audio(); const h = sculpt.tool === 'rot' ? null : sHit(e);
  sp = { id: e.pointerId, x: e.clientX, y: e.clientY, carve: !!h }; if (h) { sculpt.undo.push(sculpt.radii.slice()); if (sculpt.undo.length > 25) sculpt.undo.shift(); brush(h, 1); } });
addEventListener('pointermove', e => { if (!sculpt.on || !sp || e.pointerId !== sp.id) { if (sculpt.on && !sp) { const h = sculpt.tool !== 'rot' && sHit(e); sRingAt(h); } return; }
  const dx = e.clientX - sp.x, dy = e.clientY - sp.y, L = Math.hypot(dx, dy); sp.x = e.clientX; sp.y = e.clientY;
  if (sp.carve) { const h = sHit(e); sRingAt(h); if (h) brush(h, Math.min(3, L / 6)); } else { sculpt.rotY += dx * .01; sculpt.rotX = clamp(sculpt.rotX + dy * .01, -1.2, 1.2); } });
addEventListener('pointerup', e => { if (sp && e.pointerId === sp.id) { if (sp.carve) sFaceUpd(); sp = null; sRing.visible = false; } });
function sRingAt(h) { if (!h) { sRing.visible = false; return; } sRing.visible = true; sRing.position.copy(h.point); sRing.lookAt(h.point.clone().add(h.face.normal.clone().transformDirection(sMesh.matrixWorld))); sRing.scale.setScalar(sculpt.R * 1.1); }
function brush(h, k) {
  const lp = sMesh.worldToLocal(h.point.clone()), r = sculpt.radii, R = sculpt.R, ws = [], ids = []; let avg = 0, tw = 0;
  for (let i = 0; i < NV; i++) { const x = DIRS[i * 3] * r[i] - lp.x, y = DIRS[i * 3 + 1] * r[i] - lp.y, z = DIRS[i * 3 + 2] * r[i] - lp.z, d = Math.sqrt(x * x + y * y + z * z); if (d < R) { const w = (1 - d / R) ** 2 * (3 - 2 * (1 - d / R)) ; ids.push(i); ws.push(w); avg += r[i] * w; tw += w; } }
  avg /= tw || 1; const st = .07 * k;
  for (let j = 0; j < ids.length; j++) { const i = ids[j], w = ws[j];
    if (sculpt.tool === 'pull') r[i] += st * w; else if (sculpt.tool === 'push') r[i] -= st * w; else r[i] += (avg - r[i]) * Math.min(1, .25 * k) * w;
    r[i] = clamp(r[i], .55, 1.75); }
  sApply();
}
function sculptFrame(dt) { sCam.aspect = camera.aspect; sCam.position.z = camera.aspect < .7 ? 8 : 5.6; sCam.updateProjectionMatrix();
  sMesh.rotation.x += (sculpt.rotX - sMesh.rotation.x) * damp(12, dt); sMesh.rotation.y += (sculpt.rotY - sMesh.rotation.y) * damp(12, dt); renderer.render(sScene, sCam); }
document.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => { sfx.click(); sculpt.tool = b.dataset.tool; document.querySelectorAll('[data-tool]').forEach(x => x.classList.toggle('on', x === b)); });
$('sSize').oninput = e => sculpt.R = e.target.value / 100;
$('sUndo').onclick = () => { sfx.click(); const u = sculpt.undo.pop(); if (u) { sculpt.radii = u; sApply(); sFaceUpd(); } };
$('sReset').onclick = () => { sfx.click(); sculpt.undo.push(sculpt.radii.slice()); sculpt.radii = new Float32Array(NV).fill(1); sApply(); sFaceUpd(); };
$('sEyes').onclick = () => { sfx.click(); sculpt.eyes = !sculpt.eyes; sFaceUpd(); };
$('sBack').onclick = () => { sfx.click(); closeSculpt(); };
$('sSave').onclick = () => { sfx.coin(); S.shape = Array.from(sculpt.radii, v => Math.round(v * 1000) / 1000); S.cskin = sculpt.skin; S.eyes = sculpt.eyes; S.char = 'custom'; save(); toast('¡Personaje guardado! 🎉'); closeSculpt(); };
SKINS.forEach(sk => { const c = skinTex(sk, 64); c.dataset.id = sk.id; c.onclick = () => { sfx.click(); sSkin(sk.id); }; $('sCols').appendChild(c); });

// ---------- Menú ----------
let thumbR = null; const thumbs = {};
function thumb(c) {
  const key = c.id + (c.custom ? JSON.stringify(S.shape).length + S.cskin + S.eyes : ''); if (thumbs[key]) return thumbs[key];
  if (!thumbR) { thumbR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); thumbR.setSize(104, 104); thumbR.outputColorSpace = THREE.SRGBColorSpace; }
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0xb08ad0, 1.9)); const l = new THREE.DirectionalLight(0xffffff, 1.5); l.position.set(2, 4, 5); sc.add(l);
  const m = makeCharMesh(c); m.rotation.set(.15, -.35, 0); if (m.acc) { m.scale.setScalar(.72); m.position.y = -.05; } sc.add(m); const cm = new THREE.PerspectiveCamera(36, 1, .1, 20); cm.position.set(0, .3, 4.6); cm.lookAt(0, .1, 0);
  thumbR.render(sc, cm); m.body.material.dispose(); return thumbs[key] = thumbR.domElement.toDataURL();
}
function premOpen(c) { $('premName').textContent = '👑 ' + c.n; $('premImg').src = thumb(c); $('premDlg').classList.remove('hide');
  $('premTry').onclick = () => { sfx.click(); ads.showRewarded(() => { S.trial = c.id; S.char = c.id; save(); $('premDlg').classList.add('hide'); showMenu(); toast('¡Pruébalo en tu próxima partida!'); }); };
  $('premBuy').onclick = () => { sfx.click(); S.owned = S.owned || {}; S.owned[c.id] = 1; S.char = c.id; save(); $('premDlg').classList.add('hide'); showMenu(); toast('Compra SIMULADA (sin cobro). Aquí irá la tienda real.'); };
  $('premClose').onclick = () => { sfx.click(); $('premDlg').classList.add('hide'); }; }
function showMenu() {
  G.on = 0; $('hud').classList.add('hide'); for (const s of ['over', 'dead']) $(s).classList.add('hide'); $('menu').classList.remove('hide'); setTimeout(() => $('menu').classList.add('seen'), 700);
  $('modePick').innerHTML = [['todos', '⚔️ Todos contra todos'], ['equipos', '🤝 Por equipos']].map(([k, n]) => `<div class="t m ${(S.mode || 'todos') === k ? 'on' : ''}" data-k="${k}">${n}</div>`).join('');
  $('modePick').querySelectorAll('.t').forEach(d => d.onclick = () => { sfx.click(); S.mode = d.dataset.k; save(); showMenu(); });
  $('durPick').innerHTML = [['2', '⏱️ 2 minutos'], ['inf', '♾️ Infinito']].map(([k, n]) => `<div class="t m ${(S.dur || '2') === k ? 'on' : ''}" data-k="${k}">${n}</div>`).join('');
  $('bPlay').querySelector('small').textContent = (S.dur === 'inf' ? 'Sin tiempo · sales cuando quieras' : 'Partida de 2 min') + ' · 38 bolas';
  $('diffPick').innerHTML = [['facil', '🙂 Fácil'], ['normal', '😐 Normal'], ['dificil', '😈 Difícil']].map(([k, n]) => `<div class="t m ${(S.diff || 'facil') === k ? 'on' : ''}" data-k="${k}">${n}</div>`).join('');
  $('diffPick').querySelectorAll('.t').forEach(d => d.onclick = () => { sfx.click(); S.diff = d.dataset.k; save(); showMenu(); });
  $('durPick').querySelectorAll('.t').forEach(d => d.onclick = () => { sfx.click(); S.dur = d.dataset.k; save(); showMenu(); });
  $('arenaPick').innerHTML = [['-1', '🎲 Aleatoria'], ...THEMES.map((t, i) => [String(i), t.name])].map(([k, n]) => `<div class="t m ${String(S.arena ?? -1) === k ? 'on' : ''}" data-k="${k}">${n}</div>`).join('');
  $('arenaPick').querySelectorAll('.t').forEach(d => d.onclick = () => { sfx.click(); S.arena = +d.dataset.k; save(); if (S.arena >= 0) setTheme(S.arena); showMenu(); });
  $('teamCard').style.display = S.mode === 'equipos' ? '' : 'none';
  $('teamPick').innerHTML = TEAMS.map((t, i) => `<div class="t ${i === S.team ? 'on' : ''}" data-i="${i}" style="background:${t.css}">${t.n}</div>`).join('');
  $('teamPick').querySelectorAll('.t').forEach(d => d.onclick = () => { sfx.click(); S.team = +d.dataset.i; save(); showMenu(); });
  const ch = allChars(); if (!ch.find(c => c.id === S.char)) S.char = ch[0].id;
  $('charPick').innerHTML = ch.map(c => `<div class="ch ${c.id === S.char ? 'on' : ''}" data-id="${c.id}"><img src="${thumb(c)}">${c.custom ? '⭐ ' : ''}${c.prem ? '👑 ' : ''}${c.n}${premLocked(c) ? '<span class="lock">🔒 0,99 €</span>' : (c.prem && S.trial === c.id ? '<span class="lock tr">Prueba</span>' : '')}</div>`).join('');
  $('charPick').querySelectorAll('.ch').forEach(d => { d.onclick = () => { sfx.click(); const c = allChars().find(x => x.id === d.dataset.id); if (premLocked(c)) return premOpen(c); S.char = d.dataset.id; save(); showMenu(); }; d.ondblclick = () => { if (premLocked(allChars().find(x => x.id === d.dataset.id))) return; S.char = d.dataset.id; save(); audio(); startGame(); }; });
  $('bCreate').textContent = S.shape ? '🎨 Editar el mío' : '🎨 Crear el mío';
  $('bSnd').textContent = S.snd ? '🔊' : '🔇'; $('bHand').textContent = S.hand === 'z' ? '✋ Mano: Zurdo' : '✋ Mano: Diestro'; document.body.classList.toggle('zurdo', S.hand === 'z'); const sc = ch.find(c => c.id === S.char); $('heroImg').src = thumb(sc); $('heroName').textContent = sc.n; $('bestTxt').textContent = S.best ? '🏆 Récord: ' + S.best + ' de masa' : '¡Sé la bola más grande!';
}
$('bPlay').onclick = () => { audio(); sfx.click(); startGame(); };
$('bCreate').onclick = () => { audio(); sfx.click(); openSculpt(); };
$('bHand').onclick = () => { S.hand = S.hand === 'z' ? 'd' : 'z'; save(); showMenu(); };
$('bSnd').onclick = () => { S.snd = !S.snd; save(); showMenu(); };
$('bHelp').onclick = () => { sfx.click(); $('help').classList.remove('hide'); };
$('bHelpClose').onclick = () => { sfx.click(); $('help').classList.add('hide'); };
setTheme(4); initFood(); puddles.forEach(placePuddle);
// v6.11: prepara las 5 pistas en segundo plano mientras estás en el menú (geometrías + shaders), así empezar partida no congela
{ let k = 0; const pre = () => { if (G.on) return; if (k < THEMES.length) { const keep = THcur; setTheme(k); try { renderer.compile(scene, camera); renderer.render(scene, camera); } catch (e) { } setTheme(keep); k++; setTimeout(pre, 120); } }; setTimeout(pre, 600); }
canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); G.lost = 1; }); canvas.addEventListener('webglcontextrestored', () => location.reload());
// bolas de adorno en el menú
for (let i = 0; i < 10; i++) { const p = { name: '', team: i % 4, char: CHARS[i], cells: [], dirx: 0, dirz: 0, inp: 0 }; players.push(p); spawnPlayer(p, rnd(15, 80)); }
me = null; showMenu(); requestAnimationFrame(frame);
// ======================================================================
//  MULTIJUGADOR (v6.13): salas P2P con PeerJS (broker público), código de 4 letras.
//  El anfitrión manda: simula todo (bots incluidos) y envía el estado ~20 Hz.
//  Los invitados mandan su joystick / dividir / soltar y solo dibujan.
// ======================================================================
const NABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', NPRE = 'pegoton-arena-v1-', NMAX = 8;
const nCode = () => Array.from({ length: 4 }, () => NABC[Math.floor(Math.random() * NABC.length)]).join('');
class Net {
  constructor() { this.peer = null; this.conns = new Map(); this.players = []; this.isHost = false; this.myId = null; this.code = null; this.h = {}; this.started = false; this.alive = true; this.nextId = 1; }
  on(ev, f) { this.h[ev] = f; return this; }
  emit(ev, ...a) { const f = this.h[ev]; if (f) try { f(...a); } catch (e) { console.error(e); } }
  _peer(id) { return new Promise((res, rej) => { if (typeof window.Peer !== 'function') return rej(new Error('broker')); let done = false;
    const opts = { debug: 0, config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] } };
    const p = id ? new window.Peer(id, opts) : new window.Peer(opts);
    const to = setTimeout(() => { if (!done) { done = true; try { p.destroy(); } catch (e) { } rej(new Error('broker')); } }, 10000);
    p.on('open', () => { if (done) return; done = true; clearTimeout(to); res(p); });
    p.on('error', e => { if (!done) { done = true; clearTimeout(to); try { p.destroy(); } catch (x) { } rej(new Error(e.type === 'unavailable-id' ? 'taken' : 'broker')); } else if (e.type === 'peer-unavailable' && this._joinRej) { this._joinRej(new Error('nosala')); this._joinRej = null; } }); }); }
  async create(info) { for (let k = 0; k < 4 && !this.peer; k++) { const code = nCode(); try { this.peer = await this._peer(NPRE + code); this.code = code; } catch (e) { if (e.message !== 'taken') throw e; } }
    if (!this.peer) throw new Error('broker'); this.isHost = true; this.myId = 'h'; this.players = [{ id: 'h', host: true, ...info }];
    this.peer.on('connection', c => this._hostConn(c)); this.peer.on('disconnected', () => { try { this.peer.reconnect(); } catch (e) { } }); return this.code; }
  _hostConn(c) {
    c.on('data', d => { if (d.t === 'hello') { if (this.players.length >= NMAX) { c.send({ t: 'full' }); setTimeout(() => c.close(), 300); return; }
        const id = 'p' + (this.nextId++); c.pid = id; this.conns.set(id, c); this.players.push({ id, name: String(d.name || 'Invitado').slice(0, 12), ch: d.ch, team: d.team | 0 });
        c.send({ t: 'welcome', id, code: this.code }); this.lobby(); if (this.started) this.emit('latejoin', id); return; }
      if (!c.pid) return; if (d.t === 'pick') { const p = this.players.find(p => p.id === c.pid); if (p) { Object.assign(p, { ch: d.ch, team: d.team | 0 }); this.lobby(); } return; }
      d.from = c.pid; this.emit('msg', d); });
    c.on('close', () => this._lost(c.pid)); c.on('error', () => this._lost(c.pid)); }
  _lost(id) { if (!id || !this.conns.has(id)) return; this.conns.delete(id); const p = this.players.find(p => p.id === id); this.players = this.players.filter(p => p.id !== id); this.lobby(); this.emit('left', id, p && p.name); }
  lobby() { this.send({ t: 'lobby', players: this.players }); this.emit('lobby', this.players); }
  async join(code, info) { code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); if (code.length !== 4) throw new Error('codigo');
    this.peer = await this._peer(null); this.code = code;
    return new Promise((res, rej) => { this._joinRej = rej; const c = this.peer.connect(NPRE + code, { reliable: true, serialization: 'json' }); this.host = c;
      const to = setTimeout(() => { if (this._joinRej) { this._joinRej = null; rej(new Error('nosala')); } }, 12000);
      c.on('open', () => c.send({ t: 'hello', ...info }));
      c.on('data', d => { if (d.t === 'welcome') { clearTimeout(to); this._joinRej = null; this.myId = d.id; res(d.id); return; }
        if (d.t === 'full') { clearTimeout(to); this._joinRej = null; rej(new Error('llena')); return; }
        if (d.t === 'lobby') { this.players = d.players; this.emit('lobby', d.players); return; } this.emit('msg', d); });
      c.on('close', () => { if (this.alive) this.emit('hostgone'); }); c.on('error', () => { }); }); }
  pick(info) { if (this.isHost) { Object.assign(this.players[0], info); this.lobby(); } else this.send({ t: 'pick', ...info }); }
  send(d) { if (this.isHost) { for (const c of this.conns.values()) if (c.open) try { c.send(d); } catch (e) { } } else if (this.host && this.host.open) try { this.host.send(d); } catch (e) { } }
  sendTo(id, d) { const c = this.conns.get(id); if (c && c.open) try { c.send(d); } catch (e) { } }
  close() { this.alive = false; try { this.send({ t: 'bye' }); } catch (e) { } setTimeout(() => { try { this.peer && this.peer.destroy(); } catch (e) { } }, 150); }
}

const mpInfo = () => ({ name: (S.nick || 'Jugador').slice(0, 12), ch: S.char, team: S.team | 0 });
const charById = id => allChars().find(c => c.id === id) || CHARS[0];
const fPack = f => [f.id, Math.round(f.x * 10), Math.round(f.z * 10), f.t, Math.round(f.s * 100), f.c, f.k | 0, f.ej | 0, Math.round((f.mv || 0) * 10), Math.round((f.ang || 0) * 100)];
function fUnpack(a, f) { f = f || {}; [f.id, f.x, f.z, f.t, f.s, f.c, f.k, f.ej, f.mv, f.ang] = a; f.x /= 10; f.z /= 10; f.s /= 100; f.mv /= 10; f.ang /= 100; if (f.x > 999) f.x = 9999; f.rx = f.rx ?? rnd(-.25, .25); f.rz = f.rz ?? rnd(-.25, .25); f.ph = f.ph ?? Math.random() * 6; f.m = 1.6; return f; }
// --- anfitrión: empezar partida con los jugadores de la sala ---
function netHostStart() { if (!NET || !NET.isHost) return; NET.started = true; const roster = NET.players.filter(p => p.id !== 'h');
  startGame({ roster }); const P = players.map(p => [p === me ? (S.nick || 'Anfitrión') : p.name, p.char.id, p.team, p.col ?? -1, p.remote || '']);
  NET.send({ t: 'start', th: G.th, teams: G.teams ? 1 : 0, inf: G.inf ? 1 : 0, P, food: food.map(fPack) }); for (const f of food) f.dirty = 0; }
function netHostTick() { if (!NET || !NET.isHost || !G.on) return; netT += DT; if (netT < .05) return; netT = 0; netMvT += .05;
  const c = []; for (const x of cells) c.push(x.id, players.indexOf(x.p), Math.round(x.x * 10), Math.round(x.z * 10), Math.round(x.m * 10));
  const fd = [], mv = []; for (const f of food) { if (f.dirty) { fd.push(fPack(f)); f.dirty = 0; } else if (f.mv && netMvT > .25) mv.push(f.id, Math.round(f.x * 10), Math.round(f.z * 10), Math.round(f.ang * 100)); }
  if (netMvT > .25) netMvT = 0;
  NET.send({ t: 's', T: Math.round(G.t * 10), c, fd, mv, gone: NEV.gone || [], ev: NEV.splice(0) }); NEV.gone = []; }
function netHostMsg(d) { const p = players.find(q => q.remote === d.from); if (!p) return;
  if (d.t === 'i') { p.netA = d.a; p.netM = d.m; } else if (d.t === 'sp') { if (d.a != null) { p.dirx = Math.sin(d.a); p.dirz = -Math.cos(d.a); } doSplit(p); } else if (d.t === 'ej') doEject(p);
  else if (d.t === 'rev') { if (!p.alive) spawnPlayer(p, d.half ? Math.max(START_M, (p.lastM || 20) / 2) : START_M); } }
function netRemoteInput() { for (const p of players) { if (!p.remote || !p.alive) continue; if (p.netA == null) p.inp = 0; else { p.inp = p.netM ?? 1; p.dirx += (Math.sin(p.netA) - p.dirx) * .5; p.dirz += (-Math.cos(p.netA) - p.dirz) * .5; const L = Math.hypot(p.dirx, p.dirz) || 1; p.dirx /= L; p.dirz /= L; } } }
// --- invitado ---
const CMAP = new Map(), FMAP = new Map();
function netClientStart(d) { resetJoy(); for (const c of cells) removeCell(c); cells = []; players = []; flights.length = 0; CMAP.clear(); FMAP.clear();
  G.th = d.th; setTheme(d.th); G.teams = !!d.teams; G.inf = !!d.inf; food = d.food.map(a => { const f = fUnpack(a); FMAP.set(f.id, f); return f; });
  players = d.P.map(([name, ch, team, col, rid]) => ({ name, char: charById(ch), team, col: col < 0 ? undefined : col, cells: [], bot: rid ? 0 : 1, remote: rid, alive: 1, dirx: 0, dirz: 1, pud: 0, boost: 0 }));
  me = players.find(p => p.remote === NET.myId) || players[0]; me.name = 'Tú'; for (const p of players) if (p.remote === 'h') p.bot = 0;
  G.net = 'c'; Object.assign(G, { on: 1, dead: 0, el: 0, t: 120, eats: 0, maxM: START_M, combo: 0, frenzy: 999, shake: 0, cd: 0 }); camZ = 0; $('cd').classList.add('hide');
  for (const s of ['menu', 'over', 'dead', 'help', 'mp']) $(s).classList.add('hide'); $('hud').classList.remove('hide'); $('bExit').classList.remove('hide'); setTeamHud(); eatMsg(THEMES[G.th].name, 2.2); }
function netClientSnap(d) { G.t = d.T / 10; const seen = new Set();
  for (let i = 0; i < d.c.length; i += 5) { const id = d.c[i], p = players[d.c[i + 1]]; if (!p) continue; const x = d.c[i + 2] / 10, z = d.c[i + 3] / 10, m = d.c[i + 4] / 10; seen.add(id);
    let c = CMAP.get(id); if (!c) { c = newCell(p, x, z, m); c.id = id; CMAP.set(id, c); } c.nx = x; c.nz = z; c.m = m; }
  for (const a of d.fd) { let f = FMAP.get(a[0]); if (!f) { f = fUnpack(a); FMAP.set(f.id, f); food.push(f); } else fUnpack(a, f); }
  for (let i = 0; i < d.mv.length; i += 4) { const f = FMAP.get(d.mv[i]); if (f) { f.x = d.mv[i + 1] / 10; f.z = d.mv[i + 2] / 10; f.ang = d.mv[i + 3] / 100; } }
  for (const e of d.ev) { if (e[0] === 'e') { const c = CMAP.get(e[1]); if (c) stick(c, e[2], e[3], e[4], e[5] / 10, e[6] / 10, 1); if (c && c.p === me) sfx.pop(0, 0); } else if (e[0] === 'tr') { const a = CMAP.get(e[1]), b = CMAP.get(e[2]); if (a && b) transfer(a, b); } else if (e[0] === 'k' && e[1] === NET.myId) eatMsg('Te has comido a ' + e[2], 1.3); }
  if (d.gone.length) { const g = new Set(d.gone); food = food.filter(f => !g.has(f.id)); for (const id of g) FMAP.delete(id); }
  for (const [id, c] of CMAP) if (!seen.has(id)) { removeCell(c); CMAP.delete(id); }
  cells = cells.filter(c => !c.dead); for (const p of players) { p.cells = p.cells.filter(c => !c.dead); p.alive = p.cells.length > 0; } }
function netClientFrame(dt) { const k = damp(14, dt); for (const c of cells) { if (c.nx == null) continue; c.px = c.x = c.x + (c.nx - c.x) * k; c.pz = c.z = c.z + (c.nz - c.z) * k; c.rr += (massR(c.m) - c.rr) * k; }
  for (const f of food) if (f.mv && f.x < 999) { f.x += Math.cos(f.ang) * f.mv * dt; f.z += Math.sin(f.ang) * f.mv * dt; f.ry = -f.ang + PI / 2; }
  G.maxM = Math.max(G.maxM, me.cells.reduce((s, c) => s + c.m, 0));
  netT += dt; if (netT > .05) { netT = 0; NET.send({ t: 'i', a: joyA, m: joyM }); } }
function netClientMsg(d) { if (d.t === 'start') netClientStart(d); else if (d.t === 's') { if (G.net === 'c' && G.on) netClientSnap(d); }
  else if (d.t === 'dead') { G.dead = 1; joy.on = 0; sfx.lose(); $('deadInfo').innerHTML = 'Te ha comido <b>' + d.k + '</b>'; $('dead').classList.remove('hide'); }
  else if (d.t === 'end') { if (G.on) endGame(); $('bAgain').textContent = '⏳ Esperando al anfitrión…'; } }
// --- interfaz de sala ---
function mpShow(v) { $('mp').classList.remove('hide'); $('menu').classList.add('hide'); for (const k of ['mpHome', 'mpLobby']) $(k).classList.toggle('hide', k !== v); }
function mpLobbyUI(ps) { $('mpCode').textContent = NET.code; $('mpList').innerHTML = ps.map(p => `<div class="mpP">${p.host ? '👑' : '🙂'} ${String(p.name).replace(/</g, '')}${G.teamsLobby ? ' · ' + TEAMS[p.team | 0].n : ''}</div>`).join('') + `<div class="mpInfo">+ ${Math.max(0, 38 - ps.length)} bots rellenan la partida</div>`;
  $('mpStart').classList.toggle('hide', !NET.isHost); $('mpWait').classList.toggle('hide', NET.isHost); }
function mpErr(e) { const m = { broker: 'No se pudo conectar al servidor de salas (¿sin internet?).', nosala: 'No existe esa sala.', llena: 'La sala está llena.', codigo: 'El código tiene 4 letras.' }[e.message] || 'Error de conexión.'; $('mpMsg').textContent = m; }
function mpLeave() { if (NET) NET.close(); NET = null; G.net = null; }
function mpSetup() {
  $('bMP').onclick = () => { sfx.click(); mpShow('mpHome'); $('mpNick').value = S.nick || ''; $('mpMsg').textContent = ''; };
  $('mpBack').onclick = () => { sfx.click(); mpLeave(); $('mp').classList.add('hide'); showMenu(); };
  $('mpLeave').onclick = () => { sfx.click(); mpLeave(); $('mp').classList.add('hide'); showMenu(); };
  $('mpNick').onchange = () => { S.nick = $('mpNick').value.trim().slice(0, 12); save(); };
  const wire = () => { NET.on('lobby', ps => mpLobbyUI(ps)); };
  $('mpCreate').onclick = async () => { sfx.click(); S.nick = $('mpNick').value.trim().slice(0, 12) || 'Anfitrión'; save(); $('mpMsg').textContent = 'Creando sala…'; mpLeave(); NET = new Net();
    try { await NET.create(mpInfo()); } catch (e) { mpErr(e); NET = null; return; } wire(); NET.on('msg', netHostMsg); NET.on('left', (id, n) => { const p = players.find(q => q.remote === id); if (p) { p.remote = ''; p.bot = 1; p.think = 0; p.aggr = 1; } if (G.on) toast((n || 'Alguien') + ' se ha ido'); });
    G.net = 'h'; mpShow('mpLobby'); mpLobbyUI(NET.players); };
  $('mpJoin').onclick = async () => { sfx.click(); S.nick = $('mpNick').value.trim().slice(0, 12) || 'Invitado'; save(); $('mpMsg').textContent = 'Conectando…'; mpLeave(); NET = new Net();
    try { await NET.join($('mpCodeIn').value, mpInfo()); } catch (e) { mpErr(e); NET = null; return; } wire(); NET.on('msg', netClientMsg);
    NET.on('hostgone', () => { toast('Se perdió la conexión con el anfitrión'); G.on = 0; G.net = null; NET = null; $('hud').classList.add('hide'); $('mp').classList.add('hide'); showMenu(); });
    G.net = 'c'; mpShow('mpLobby'); mpLobbyUI(NET.players); };
  $('mpStart').onclick = () => { sfx.click(); netHostStart(); };
  $('mpShare').onclick = async () => { const url = location.origin + location.pathname + '?sala=' + NET.code; try { if (navigator.share) await navigator.share({ title: 'Pegotón Arena', text: '¡Únete a mi sala ' + NET.code + '!', url }); else { await navigator.clipboard.writeText(url); toast('Enlace copiado'); } } catch (e) { } };
  const q = new URLSearchParams(location.search).get('sala'); if (q) { mpShow('mpHome'); $('mpCodeIn').value = q.toUpperCase().slice(0, 4); $('mpNick').value = S.nick || ''; }
}

mpSetup();
window.__ar = { BURSTS, doPeg, pegCand, step, CHARS, PREMS, get players() { return players; }, netStart: netHostStart, get NET() { return NET; }, vis: () => Object.entries(THC).map(([k, c]) => k + ":" + c.arenaG.visible + "," + c.foodIMs[0].visible).join(" "), ri: () => [renderer.info.memory.geometries, renderer.info.memory.textures, renderer.info.programs.length, scene.children.length], food: () => food, endGame, dbg: () => [foodIMs.length, NT, OBJG.length, [...new Set(food.map(f => f.t))]], doSplit, setTheme, THEMES, initFood, cam: () => ({ h: +camH.toFixed(1), fog: scene.fog.far | 0 }), MAXM,  G, S, startGame, openSculpt, get me() { return me; }, get cells() { return cells; }, sculpt, brush, frames: () => G.frames };
