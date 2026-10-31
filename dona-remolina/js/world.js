// Mueblópolis: suelo de parquet, alfombras-manzana, paredes de papel pintado y generación de objetos
import * as THREE from 'three';
import { GB, lighten, darken } from './geo.js?v=1';
import { KINDS, getGeo, PAL } from './models.js?v=1';

export const HALF = 72;          // el torbellino se mueve en [-70, 70]
export const SPAWN = { x: 0, z: 34 };
const BLOCKS = [-51, -17, 17, 51];

export function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function canvasTex(w, h, draw, repeat, aniso = 8) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

function parquetTex(rep) {
  return canvasTex(512, 512, (g, w, h) => {
    const base = ['#f6c987', '#f3bf78', '#f9d49a', '#efb56c', '#f7cc90'];
    const pw = h / 4;
    for (let r = 0; r < 4; r++) {
      let x = -((r * 97) % 200);
      while (x < w) {
        const L = 180 + ((r * 53 + x * 7) % 90);
        g.fillStyle = base[Math.abs((r * 3 + (x / 50 | 0))) % base.length]; g.fillRect(x, r * pw, L, pw);
        g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x, r * pw, L, 5);
        g.fillStyle = 'rgba(150,80,30,.35)'; g.fillRect(x, r * pw + pw - 3, L, 3); g.fillRect(x + L - 3, r * pw, 3, pw);
        g.strokeStyle = 'rgba(190,110,50,.18)'; g.lineWidth = 2;
        for (let k = 0; k < 3; k++) { g.beginPath(); const yy = r * pw + 14 + k * 22; g.moveTo(x + 8, yy); g.bezierCurveTo(x + L * .3, yy - 6, x + L * .6, yy + 6, x + L - 8, yy); g.stroke(); }
        x += L;
      }
    }
  }, rep);
}
const RUGS = [
  { bg: 0xff8fb8, fg: 0xffe27a, ac: 0x7b3fe4, pat: 'diamond' }, { bg: 0x62d6c4, fg: 0xfff0d2, ac: 0xff6b5e, pat: 'stripes' },
  { bg: 0xffd23f, fg: 0xff7a59, ac: 0x1fa8d6, pat: 'dots' }, { bg: 0x8fb4ff, fg: 0xffffff, ac: 0xff74c4, pat: 'check' },
  { bg: 0xb9e86a, fg: 0xfff0d2, ac: 0xe8348a, pat: 'diamond' }, { bg: 0xc4a8ff, fg: 0xffe27a, ac: 0x1fc4d6, pat: 'dots' },
];
function rugTex(R) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = hex(R.bg); g.fillRect(0, 0, w, h);
    const m = 40;
    g.fillStyle = hex(R.fg); g.fillRect(0, 0, w, 22); g.fillRect(0, h - 22, w, 22); g.fillRect(0, 0, 22, h); g.fillRect(w - 22, 0, 22, h);
    g.strokeStyle = hex(R.ac); g.lineWidth = 8; g.strokeRect(34, 34, w - 68, h - 68);
    g.save(); g.beginPath(); g.rect(m + 10, m + 10, w - 2 * m - 20, h - 2 * m - 20); g.clip();
    if (R.pat === 'diamond') { for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) { const cx = 50 + x * 54 + (y % 2) * 27, cy = 50 + y * 54; g.fillStyle = (x + y) % 2 ? hex(R.fg) : hex(R.ac); g.beginPath(); g.moveTo(cx, cy - 22); g.lineTo(cx + 22, cy); g.lineTo(cx, cy + 22); g.lineTo(cx - 22, cy); g.fill(); } }
    else if (R.pat === 'stripes') { for (let i = -10; i < 20; i++) { g.fillStyle = i % 2 ? hex(R.fg) : hex(R.ac); g.save(); g.translate(i * 44, 0); g.rotate(0.5); g.fillRect(0, -200, 22, 900); g.restore(); } }
    else if (R.pat === 'dots') { for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) { g.fillStyle = (x + y) % 2 ? hex(R.fg) : hex(R.ac); g.beginPath(); g.arc(60 + x * 48, 60 + y * 48, 15, 0, 7); g.fill(); } }
    else { for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) { if ((x + y) % 2) { g.fillStyle = hex(R.fg); g.fillRect(m + x * 43, m + y * 43, 43, 43); } } g.fillStyle = hex(R.ac); g.beginPath(); g.arc(w / 2, h / 2, 60, 0, 7); g.fill(); g.fillStyle = hex(R.fg); g.beginPath(); g.arc(w / 2, h / 2, 34, 0, 7); g.fill(); }
    g.restore();
    g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 3; g.strokeRect(1, 1, w - 2, h - 2);
  }, null);
}
function wallTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#fff2c9'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#ffd9ec' : '#c9f0ff'; g.fillRect(i * 64 + 8, 0, 48, h); }
    for (let y = 0; y < 4; y++) for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#ff74c4' : '#1fc4d6'; g.beginPath(); g.arc(i * 64 + 32, y * 64 + 32 + (i % 2) * 32, 7, 0, 7); g.fill(); }
  }, [14, 3]);
}
export function skyTex() {
  return canvasTex(8, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#4db8ff'); gr.addColorStop(0.55, '#a8e2ff'); gr.addColorStop(1, '#fff3d6'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, null, 1);
}

export function buildScenery(scene) {
  const grp = new THREE.Group(); scene.add(grp);
  // parquet
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2 + 10, HALF * 2 + 10), new THREE.MeshStandardMaterial({ map: parquetTex([(HALF * 2 + 10) / 14, (HALF * 2 + 10) / 14]), roughness: 0.55 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; grp.add(ground);
  // alfombras (manzanas)
  const rugTexs = RUGS.map(rugTex); const side = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  let n = 0;
  for (const bz of BLOCKS) for (const bx of BLOCKS) {
    const R = RUGS[(n * 5 + (n >> 2) * 3) % RUGS.length]; const tx = rugTexs[(n * 5 + (n >> 2) * 3) % RUGS.length];
    const top = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.95 }); const sm = new THREE.MeshStandardMaterial({ color: R.fg, roughness: 0.95 });
    const rug = new THREE.Mesh(new THREE.BoxGeometry(27, 0.22, 27), [sm, sm, top, sm, sm, sm]);
    rug.position.set(bx, 0.11, bz); rug.receiveShadow = true; grp.add(rug); n++;
    // flecos
    const fr = new GB(); for (let i = -13; i <= 13; i += 1) { fr.box(0.14, 0.08, 0.7, R.fg, bx + i, 0.02, bz + 13.9); fr.box(0.14, 0.08, 0.7, R.fg, bx + i, 0.02, bz - 13.9); }
    const fm = new THREE.Mesh(fr.build(false, 0.1), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); grp.add(fm);
  }
  // rayas centrales de las calles
  const dg = new GB();
  for (const c of [-34, 0, 34]) for (let t = -HALF + 3; t < HALF - 2; t += 5) {
    if (Math.abs(((t + 34 + 100) % 34) - 0) < 0.01) continue;
    const nearX = [-34, 0, 34].some((k) => Math.abs(t - k) < 6.5);
    if (nearX) continue;
    dg.box(0.4, 0.03, 2.6, 0xfff7e0, c, 0.01, t); dg.box(2.6, 0.03, 0.4, 0xfff7e0, t, 0.01, c);
  }
  grp.add(new THREE.Mesh(dg.build(false, 0.1), new THREE.MeshBasicMaterial({ vertexColors: true })));
  // paredes
  const wt = wallTex(); const wm = new THREE.MeshStandardMaterial({ map: wt, roughness: 1 });
  const W = HALF + 5, WH = 70;
  for (const [x, z, ry] of [[0, -W, 0], [0, W, Math.PI], [-W, 0, Math.PI / 2], [W, 0, -Math.PI / 2]]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, WH), wm); w.position.set(x, WH / 2, z); w.rotation.y = ry; w.receiveShadow = true; grp.add(w);
  }
  const bb = new GB(); // rodapié, ventanas y cuadros
  for (const [x, z, ry] of [[0, -W, 0], [0, W, Math.PI], [-W, 0, Math.PI / 2], [W, 0, -Math.PI / 2]]) {
    const sub = new GB();
    sub.box(W * 2, 3.2, 1.2, 0xffffff, 0, 0, 0.6); sub.box(W * 2, 0.5, 1.6, 0xffd9ec, 0, 3.2, 0.7);
    for (let i = -2; i <= 2; i++) if (i !== 0 || true) {
      const cx = i * 26 + 6;
      sub.box(14, 16, 0.5, 0xffffff, cx, 22, 0.1); sub.box(11.6, 13.6, 0.6, 0x9fdcff, cx, 23.2, 0.2); sub.box(0.6, 13.6, 0.7, 0xffffff, cx, 23.2, 0.25); sub.box(11.6, 0.6, 0.7, 0xffffff, cx, 29.5, 0.25);
      sub.box(3, 17, 0.9, PAL.coral, cx - 8, 21, 0.4); sub.box(3, 17, 0.9, PAL.coral, cx + 8, 21, 0.4);
      sub.box(16, 0.7, 1.2, PAL.gold, cx, 38.5, 0.5);
    }
    for (let i = -3; i <= 3; i++) { const cx = i * 20 + 12 + (i % 2) * 3; sub.box(7, 9, 0.5, i % 2 ? PAL.sun : PAL.violet, cx, 48 + (i % 2) * 4, 0.1); sub.box(5.6, 7.6, 0.6, i % 2 ? PAL.sky : PAL.mint, cx, 48.7 + (i % 2) * 4, 0.2); sub.cyl(1.6, 1.6, 0.6, PAL.pink, cx, 49.5 + (i % 2) * 4, 0.3, 12, Math.PI / 2, 0, 0); }
    const geo = sub.build(false, 0.1); const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
    m.position.set(x, 0, z); m.rotation.y = ry; grp.add(m);
  }
  return grp;
}

// ---------- generación de objetos ----------
export function generate(seed) {
  const rnd = mulberry(seed >>> 0);
  const R = (a, b) => a + (b - a) * rnd();
  const placed = []; const cell = 6, grid = new Map();
  const ck = (cx, cz) => cx * 1000 + cz;
  const free = (x, z, r) => {
    const x0 = Math.floor((x - r - 8) / cell), x1 = Math.floor((x + r + 8) / cell), z0 = Math.floor((z - r - 8) / cell), z1 = Math.floor((z + r + 8) / cell);
    for (let a = x0; a <= x1; a++) for (let b = z0; b <= z1; b++) { const l = grid.get(ck(a, b)); if (!l) continue; for (const o of l) { const dx = o.x - x, dz = o.z - z, rr = o.ov + r; if (dx * dx + dz * dz < rr * rr) return false; } }
    return true;
  };
  const add = (o) => { placed.push(o); const k = ck(Math.floor(o.x / cell), Math.floor(o.z / cell)); (grid.get(k) || grid.set(k, []).get(k)).push(o); };
  const inBlock = (b, m) => R(-13 + m, 13 - m);
  const spawnD = (x, z) => Math.hypot(x - SPAWN.x, z - SPAWN.z);
  const out = [];
  const kinds = Object.keys(KINDS);
  const byTier = [0, 1, 2, 3, 4, 5].map((t) => kinds.filter((k) => KINDS[k].tier === t && k !== 'sofa' || (t === 2 && k === 'sofa')));
  // [tier, cantidad, d_centro, d_ancho]
  const plan = [[5, 9, 100, 38], [4, 20, 78, 36], [3, 34, 58, 32], [2, 78, 38, 30], [1, 105, 24, 34], [0, 250, 14, 44]];
  for (const [tier, count, dc, dw] of plan) {
    let tries = count * 40, made = 0;
    while (made < count && tries-- > 0) {
      let x, z;
      if (tier >= 2) { const bx = BLOCKS[(rnd() * 4) | 0], bz = BLOCKS[(rnd() * 4) | 0]; x = bx + inBlock(bx, 3); z = bz + inBlock(bz, 3); }
      else { x = R(-HALF + 4, HALF - 4); z = R(-HALF + 4, HALF - 4); }
      const d = spawnD(x, z);
      if (rnd() > Math.exp(-Math.pow((d - dc) / dw, 2))) continue;
      const kind = byTier[tier][(rnd() * byTier[tier].length) | 0], K = KINDS[kind], v = (rnd() * K.nv) | 0;
      const geo = getGeo(kind, v); const sc = tier >= 4 ? R(0.94, 1.08) : R(0.88, 1.18);
      const bw = geo.geo.userData.w * sc, bd = geo.geo.userData.d * sc, ov = 0.5 * Math.hypot(bw, bd) * (tier >= 4 ? 0.62 : 0.8);
      if (tier >= 1 && spawnD(x, z) < 4.5) continue;
      if (!free(x, z, ov)) continue;
      const rot = tier >= 4 ? 0 : (rnd() < 0.7 ? R(-0.35, 0.35) : R(0, Math.PI * 2));
      const o = { kind, v, x, z, rot, sc, ov }; add(o); out.push(o); made++;
    }
  }
  // lámparas de pie como farolas en las calles
  const lampGeo = (v) => getGeo('lamp', v);
  for (const c of [-34, 0, 34]) for (let t = -HALF + 8; t < HALF - 4; t += 17) {
    for (const [x, z, s] of [[c + 3.2, t, 1], [t, c + 3.2, 1], [c - 3.2, t + 8.5, 1], [t + 8.5, c - 3.2, 1]]) {
      if (Math.abs(x) > HALF - 3 || Math.abs(z) > HALF - 3) continue;
      if (spawnD(x, z) < 3.5) continue;
      const v = (rnd() * 5) | 0, sc = R(1.0, 1.2); const o = { kind: 'lamp', v, x, z, rot: R(0, 6.28), sc, ov: 0.6 };
      if (!free(x, z, 0.7)) continue; add(o); out.push(o);
    }
  }
  // anillo de cositas junto al punto de salida (empiezas comiendo enseguida)
  const starters = ['sock', 'button', 'cookie', 'cup', 'duck', 'yarn', 'book', 'slipper'];
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2, d = R(2.2, 11);
    const x = SPAWN.x + Math.cos(a) * d, z = SPAWN.z + Math.sin(a) * d * 0.9; if (z > HALF - 3) continue;
    const kind = starters[(rnd() * starters.length) | 0], v = (rnd() * KINDS[kind].nv) | 0, sc = R(0.9, 1.15);
    const geo = getGeo(kind, v); if (!free(x, z, 0.5)) continue;
    const o = { kind, v, x, z, rot: R(0, 6.28), sc, ov: 0.4 }; add(o); out.push(o);
  }
  // sofás rebeldes, relojes y monedas
  const rebels = []; let tr = 400;
  while (rebels.length < 7 && tr-- > 0) {
    const bx = BLOCKS[(rnd() * 4) | 0], bz = BLOCKS[(rnd() * 4) | 0], x = bx + inBlock(bx, 4), z = bz + inBlock(bz, 4), d = spawnD(x, z);
    if (d < 14 || d > 95 || !free(x, z, 2.6)) continue; add({ x, z, ov: 2.6 }); rebels.push({ x, z, v: rebels.length });
  }
  const pickups = [];
  for (let i = 0; i < 46; i++) { const x = R(-HALF + 5, HALF - 5), z = R(-HALF + 5, HALF - 5); if (!free(x, z, 0.8)) continue; pickups.push({ type: 'coin', x, z }); add({ x, z, ov: 0.8 }); }
  for (let i = 0; i < 4; i++) { const x = R(-55, 55), z = R(-50, 50); if (!free(x, z, 1.2)) { i--; continue; } pickups.push({ type: 'clock', x, z }); add({ x, z, ov: 1.2 }); }
  return { objs: out, rebels, pickups };
}
