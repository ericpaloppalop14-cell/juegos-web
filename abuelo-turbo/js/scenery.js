import { THREE, GB, rng, TAU, clamp } from './util.js?v=3';
import { DIST } from './data.js?v=3';
import { signUV } from './tex.js?v=3';

export const TL = 30; // tile length
const PAL = {
  barrio: [0xf6dcae, 0xeebb8c, 0xf4cbb4, 0xdde8c4, 0xcfe0f2, 0xf5e9d2, 0xeaab96, 0xfff0c8],
  mercado: [0xf7c98a, 0xf0a77a, 0xf9dd9a, 0xe9a0a0, 0xa8d8c0, 0xf3b46c, 0xffd6a8],
  playa: [0xffffff, 0xfdf3e0, 0xe6f4ff, 0xfff0f4, 0xf5ffe8, 0xe8f0ff],
  poligono: [0xc9ccd2, 0xe0b878, 0xa9b4c0, 0xd8d0c4, 0xb8c4b0, 0xdadada],
  fiestas: [0xf8f0e0, 0xf4e4c8, 0xfae8d8, 0xe8dcc0, 0xf2ead8],
  noche: [0x3a3470, 0x2a2c5a, 0x4a2c6a, 0x23365e, 0x38285a, 0x2c2250],
};
const SIGN_FOR = { barrio: [0, 1, 2, 3, 4, 5], mercado: [1, 5, 9, 3, 2], playa: [8, 9, 5, 14], poligono: [12, 7, 3], fiestas: [10, 5, 1, 0, 9], noche: [6, 7, 11, 13, 14, 0] };
const rp = (R, a) => a[Math.floor(R() * a.length)];
const rr = (R, a, b) => a + R() * (b - a);

function signQuad(G, x, y, z, w, h, cell, s, tint = 0xffffff) {
  const g = new THREE.PlaneGeometry(w, h); const uv = g.attributes.uv; const [u0, v0, u1, v1] = signUV(cell);
  for (let i = 0; i < 4; i++) { const u = uv.getX(i), v = uv.getY(i); uv.setXY(i, u0 + u * (u1 - u0), v0 + v * (v1 - v0)); }
  G.add(g, tint, { x, y, z, ry: s < 0 ? Math.PI / 2 : -Math.PI / 2 }); g.dispose();
}
function solidG(G, geoFn) { /* helper: G uses uv fixed to solid white cell */ }
const SOLID = [0.9, 0.05]; // inside white cell (cell 15 at bottom-right in canvas => v small)

function lamp(P, G, x, z, s, col = 0xfff2c0, night = false, h = 5.4) {
  P.cy(0.06, 0.09, h, 6, x, h / 2, z, 0x3a3f4a); P.rb(1.0, 0.07, 0.07, 0.03, x - s * 0.5, h, z, 0x3a3f4a);
  G.sp(0.17, x - s * 1.0, h - 0.1, z, col, { uv: SOLID, seg: 8 });
  if (night) G.halo(x - s * 1.0, h - 0.1, z, col, 3.2);
}
function tree(P, R, x, z, kind = 'round') {
  const g1 = rp(R, [0x4aa84a, 0x5cba4e, 0x3f9a50, 0x6cc058]);
  P.cy(0.16, 0.22, 2.3, 7, x, 1.15, z, 0x7a5232);
  if (kind === 'palm') {
    P.cy(0.14, 0.2, 5.2, 7, x, 2.6, z, 0x9a7048, { rz: 0.1 });
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; P.rb(0.35, 0.05, 2.2, 0.02, x + 0.4 + Math.cos(a) * 1.0, 5.4 - 0.2, z + Math.sin(a) * 1.0, 0x3fae4a, { ry: -a + Math.PI / 2, rx: 0.5 }); }
    P.sp(0.16, x + 0.5, 5.2, z, 0x6a4a2a); P.sp(0.16, x + 0.35, 5.15, z + 0.2, 0x6a4a2a);
  } else {
    P.sp(1.4, x, 3.6, z, g1, { seg: 9, sy: 0.9 }); P.sp(1.0, x + 0.7, 4.3, z + 0.5, g1, { seg: 8 }); P.sp(1.0, x - 0.6, 4.4, z - 0.5, 0x58b84e, { seg: 8 });
  }
}
function bench(P, x, z, s) { P.rb(0.5, 0.08, 1.7, 0.03, x, 0.5, z, 0x9a6a3a); P.rb(0.08, 0.5, 1.7, 0.03, x + s * 0.24, 0.8, z, 0x9a6a3a); P.bx(0.08, 0.45, 0.08, x, 0.25, z - 0.7, 0x333840); P.bx(0.08, 0.45, 0.08, x, 0.25, z + 0.7, 0x333840); }
function bin(P, x, z, col = 0x2f9a58) { P.cy(0.3, 0.26, 0.85, 8, x, 0.5, z, col); P.cy(0.32, 0.32, 0.08, 8, x, 0.95, z, 0x2a2e36); }
function hydrant(P, x, z) { P.cy(0.12, 0.14, 0.6, 7, x, 0.45, z, 0xe03a2a); P.sp(0.13, x, 0.78, z, 0xe03a2a); P.cy(0.05, 0.05, 0.4, 5, x, 0.5, z, 0xe03a2a, { rz: Math.PI / 2 }); }
function awning(P, R, x0, s, z, w, y, col, deep = 1.5) {
  const n = Math.max(2, Math.round(w / 1.0)), sw = w / n;
  for (let i = 0; i < n; i++) P.rb(deep, 0.09, sw - 0.02, 0.03, s * (x0 - deep / 2), y, z - w / 2 + sw * (i + 0.5), i % 2 ? 0xffffff : col, { rz: s * 0.22 });
}
function balcony(P, G, x0, s, z, y, w = 1.9, plant = true, col = 0x30353d) {
  P.rb(0.9, 0.12, w, 0.04, s * (x0 - 0.45), y, z, 0xe8e2d4); P.rb(0.05, 0.55, w, 0.02, s * (x0 - 0.9), y + 0.34, z, col);
  for (let i = 0; i < 4; i++) P.bx(0.04, 0.5, 0.04, s * (x0 - 0.88), y + 0.34, z - w / 2 + 0.2 + i * (w - 0.4) / 3, col);
  P.rb(0.06, 0.04, w, 0.02, s * (x0 - 0.9), y + 0.62, z, col);
  if (plant) for (let i = 0; i < 3; i++) { P.rb(0.22, 0.17, 0.3, 0.05, s * (x0 - 0.95), y + 0.72, z - w / 3 + i * w / 3, 0xb85a3a); P.sp(0.17, s * (x0 - 0.95), y + 0.9, z - w / 3 + i * w / 3, [0x3fae4a, 0xe8426a, 0xffc83c][i % 3], { seg: 6 }); }
}

function sidewalk(P, d, s) {
  P.bx(3.5, 0.2, TL, s * 6.25, 0.1, 0, d.walk); P.bx(0.3, 0.25, TL, s * 4.65, 0.125, 0, new THREE.Color(d.walk).multiplyScalar(1.15).getHex());
  for (let z = -15; z < 15; z += 3) P.bx(3.5, 0.215, 0.05, s * 6.25, 0.1, z, new THREE.Color(d.walk).multiplyScalar(0.85).getHex());
  P.bx(70, 0.1, TL, s * (8 + 35), 0.05, 0, d.ground);
}

/* ---------- generic building row ---------- */
function buildings(F, P, G, R, d, s, kind, o) {
  const pal = PAL[kind]; let z = -TL / 2;
  while (z < TL / 2 - 4) {
    let w = rr(R, o.wmin, o.wmax); if (z + w > TL / 2 - 3) w = TL / 2 - z; if (w < 5) break;
    const x0 = o.x0 + (R() < 0.35 ? rr(R, 0, o.stag) : 0), depth = rr(R, o.dmin, o.dmax), h = rr(R, o.hmin, o.hmax);
    const col = rp(R, pal), cz = z + w / 2, cx = s * (x0 + depth / 2);
    F.facade(depth, h, w, cx, h / 2, cz, col, 12, { uofs: R(), vofs: Math.floor(R() * 3) / 3 });
    o.deco && o.deco({ F, P, G, R, s, x0, depth, h, w, cz, col, kind });
    z += w;
  }
}

/* ---------- districts ---------- */
const GEN = {
  barrio(F, P, G, R, s) {
    const d = DIST[0]; sidewalk(P, d, s);
    buildings(F, P, G, R, d, s, 'barrio', { x0: 8.4, stag: 1.2, wmin: 8, wmax: 13, dmin: 9, dmax: 13, hmin: 11, hmax: 21, deco: b => {
      const nf = Math.floor(b.h / 3.4);
      for (let f = 1; f < Math.min(nf, 5); f++) for (let k = 0; k < 2; k++) if (R() < 0.8) balcony(P, G, b.x0, s, b.cz - b.w / 4 + k * b.w / 2, f * 3.4 + 0.5, 1.9, true);
      P.rb(0.5, 0.3, b.w + 0.2, 0.08, s * (b.x0 - 0.25), b.h + 0.15, b.cz, 0xe0d4be); // cornisa
      if (R() < 0.7) awning(P, R, b.x0, s, b.cz - b.w * 0.15, b.w * 0.6, 3.1, rp(R, [0xd83a3a, 0x2a7ad8, 0x2fa05a, 0xf0a020]), 1.4);
      if (R() < 0.8) signQuad(G, s * (b.x0 - 0.05), 3.9, b.cz - b.w * 0.15, 3.6, 1.8, rp(R, SIGN_FOR.barrio), s, 0xd8d8d8);
      P.rb(0.9, 0.9, 0.9, 0.1, s * (b.x0 + 1.5), b.h + 0.5, b.cz + R() * 2, 0xd0d0d0); // aire acondicionado
      if (R() < 0.5) { P.cy(0.9, 0.9, 1.2, 8, s * (b.x0 + 2.5), b.h + 0.6, b.cz - 1, 0x8a5a3a); P.cone(1.0, 0.6, 8, s * (b.x0 + 2.5), b.h + 1.5, b.cz - 1, 0x6a4a2a); }
    } });
    lamp(P, G, s * 7.7, -7.5, s); lamp(P, G, s * 7.7, 7.5, s); tree(P, R, s * 5.5, -3 + R() * 2); tree(P, R, s * 5.5, 10 + R() * 3);
    if (R() < 0.6) bench(P, s * 7.0, 2 + R() * 3, s); if (R() < 0.7) bin(P, s * 5.2, 4 + R() * 5); if (R() < 0.4) hydrant(P, s * 5.1, -12 + R() * 2);
    if (R() < 0.35) { // parada de bus
      P.bx(0.08, 2.6, 2.8, s * 7.6, 1.5, -1, 0x5a6270); P.bx(1.6, 0.1, 3.2, s * 6.9, 2.8, -1, 0x2a7ad8); P.bx(1.2, 0.08, 2.6, s * 7.1, 0.5, -1, 0xcfd4dc);
      signQuad(G, s * 7.55, 2.1, -1, 2.0, 1.0, 14, s, 0xe0e0e0);
    }
  },
  mercado(F, P, G, R, s) {
    const d = DIST[1]; sidewalk(P, d, s);
    buildings(F, P, G, R, d, s, 'mercado', { x0: 9.2, stag: 0.8, wmin: 7, wmax: 11, dmin: 8, dmax: 11, hmin: 8, hmax: 14, deco: b => {
      awning(P, R, b.x0, s, b.cz, b.w * 0.8, 3.4, rp(R, [0xd83a3a, 0xf0a020, 0x2fa05a, 0x2a7ad8]), 1.6);
      if (R() < 0.7) signQuad(G, s * (b.x0 - 0.05), 4.3, b.cz, 3.2, 1.6, rp(R, SIGN_FOR.mercado), s, 0xd8d8d8);
      if (R() < 0.6) balcony(P, G, b.x0, s, b.cz, 6.0, 2.2, true);
      P.rb(0.5, 0.3, b.w + 0.2, 0.08, s * (b.x0 - 0.25), b.h + 0.15, b.cz, 0xd9b890);
    } });
    // puestos de mercado en la acera
    let z = -13; for (let i = 0; i < 3; i++) {
      const zc = z + i * 9.5 + R() * 2, cx = s * 6.3, col = rp(R, [0xd83a3a, 0x2a7ad8, 0x2fa05a, 0xf0a020, 0xe05aa0]);
      P.rb(1.8, 0.9, 3.4, 0.05, cx + s * 0.5, 0.65, zc, 0xa87a4a); P.bx(0.07, 2.5, 0.07, cx - s * 0.5, 1.3, zc - 1.6, 0x8a6a4a); P.bx(0.07, 2.5, 0.07, cx - s * 0.5, 1.3, zc + 1.6, 0x8a6a4a);
      P.bx(0.07, 2.9, 0.07, cx + s * 1.3, 1.45, zc - 1.6, 0x8a6a4a); P.bx(0.07, 2.9, 0.07, cx + s * 1.3, 1.45, zc + 1.6, 0x8a6a4a);
      for (let k = 0; k < 6; k++) P.rb(2.2, 0.08, 0.55, 0.03, cx + s * 0.4, 2.7 - k * 0.0 + (k * 0.01), zc - 1.4 + k * 0.56, k % 2 ? 0xffffff : col, { rz: s * 0.2 });
      for (let k = 0; k < 8; k++) P.sp(0.17, cx + s * 0.5 + rr(R, -0.5, 0.5), 1.25 + R() * 0.12, zc + rr(R, -1.4, 1.4), rp(R, [0xff7a1a, 0xe8321a, 0x7ad83a, 0xffd23c, 0x9a2a8a]), { seg: 6 });
      P.rb(0.5, 0.35, 0.5, 0.05, cx + s * 1.4, 0.3, zc + 2.2, 0xc99a5a); P.rb(0.5, 0.35, 0.5, 0.05, cx + s * 1.4, 0.65, zc + 2.3, 0xc99a5a);
    }
    lamp(P, G, s * 7.8, 0, s, 0xffe0b0); tree(P, R, s * 5.2, 12 + R() * 2);
    if (s > 0) bunting(P, R, 6.8, [0xd83a3a, 0xffd23c, 0x2a7ad8, 0x2fa05a, 0xffffff]);
  },
  playa(F, P, G, R, s) {
    const d = DIST[2];
    if (s > 0) { sidewalk(P, d, s); buildings(F, P, G, R, d, s, 'playa', { x0: 9.5, stag: 1.5, wmin: 9, wmax: 14, dmin: 10, dmax: 14, hmin: 16, hmax: 32, deco: b => {
      for (let f = 1; f < Math.min(8, Math.floor(b.h / 3.4)); f++) P.rb(0.9, 0.1, b.w * 0.8, 0.03, s * (b.x0 - 0.45), f * 3.4 + 0.9, b.cz, 0xf0f4f8);
      signQuad(G, s * (b.x0 - 0.05), 3.8, b.cz, 3.6, 1.8, rp(R, SIGN_FOR.playa), s, 0xdcdcdc); P.rb(0.5, 0.3, b.w, 0.08, s * (b.x0 - 0.25), b.h + 0.15, b.cz, 0xdde4ec); } });
      lamp(P, G, s * 7.7, -7.5, s, 0xfff6d0); lamp(P, G, s * 7.7, 7.5, s, 0xfff6d0); tree(P, R, s * 5.6, -4 + R() * 3, 'palm'); tree(P, R, s * 5.6, 8 + R() * 4, 'palm');
      if (R() < 0.5) { P.rb(2.2, 2.0, 2.2, 0.15, s * 7.0, 1.0, 2, 0xffffff); P.rb(2.5, 0.3, 2.5, 0.1, s * 7.0, 2.1, 2, 0xff6aa0); signQuad(G, s * 5.88, 1.5, 2, 1.8, 0.9, 9, s, 0xdcdcdc); }
    } else {
      // paseo marítimo + barandilla + playa + mar
      P.bx(3.5, 0.2, TL, s * 6.25, 0.1, 0, d.walk); P.bx(0.3, 0.25, TL, s * 4.65, 0.125, 0, 0xffffff);
      for (let z = -15; z < 15; z += 3) P.bx(3.5, 0.215, 0.05, s * 6.25, 0.1, z, 0xe0cfa8);
      P.bx(0.12, 0.12, TL, s * 8.0, 1.05, 0, 0xffffff); for (let z = -14; z < 15; z += 2) P.bx(0.1, 1.0, 0.1, s * 8.0, 0.6, z, 0xdde4ec);
      P.bx(14, 0.1, TL, s * 15.2, 0.05, 0, 0xf2dca0); P.bx(70, 0.1, TL, s * 59.2, -0.02, 0, 0x2fb8d8);
      for (let i = 0; i < 5; i++) P.bx(0.25, 0.04, TL * rr(R, 0.4, 0.9), s * (23 + i * 6 + R() * 2), 0.06, rr(R, -8, 8), 0xdff8ff);
      for (let k = 0; k < 3; k++) { const z = -12 + k * 10 + R() * 3, x = s * (11 + R() * 4), c = rp(R, [0xff4f6a, 0xffd23c, 0x2a9aff, 0x4fe8a0]); P.cy(0.05, 0.05, 2.6, 5, x, 1.3, z, 0xe8e8e8, { rz: 0.1 }); P.cone(1.7, 0.7, 10, x, 2.7, z, c); P.sp(0.12, x, 3.1, z, 0xffffff); P.rb(1.4, 0.06, 0.7, 0.03, x + 1.5, 0.12, z + 0.5, rp(R, [0xff9ad0, 0x9aeaff, 0xfff29a])); }
      tree(P, R, s * 6.3, -9, 'palm'); tree(P, R, s * 6.3, 5 + R() * 5, 'palm'); lamp(P, G, s * 7.6, 0, s, 0xfff6d0);
      if (R() < 0.35) { P.rb(2.4, 1.8, 2.4, 0.1, s * 12, 1.1, 0, 0xffffff); P.rb(2.8, 0.25, 2.8, 0.1, s * 12, 3.1, 0, 0xff4f4f); P.bx(0.15, 2.0, 0.15, s * 12 + 1, 2.0, 1, 0xffffff); P.rb(2.8, 0.15, 0.2, 0.05, s * 12, 2.3, -1.25, 0xff4f4f); P.cone(0.5, 1.2, 4, s * 12, 3.7, 0, 0xffffff); }
      if (R() < 0.5) { const bx = s * (rr(R, 26, 34)), bz = rr(R, -10, 10); P.rb(2.8, 0.5, 1.2, 0.2, bx, 0.3, bz, 0xffffff, { ry: 0.5 }); P.cy(0.05, 0.05, 3.2, 5, bx, 2.0, bz, 0x9a7048); P.add(new THREE.ConeGeometry(1.4, 3.0, 3), 0xffffff, { x: bx + 0.3, y: 2.2, z: bz, sx: 0.12, ry: 0.5 }); }
    }
  },
  poligono(F, P, G, R, s) {
    const d = DIST[3]; sidewalk(P, d, s);
    buildings(F, P, G, R, d, s, 'poligono', { x0: 10.5, stag: 3, wmin: 12, wmax: 20, dmin: 14, dmax: 22, hmin: 7, hmax: 12, deco: b => {
      P.bx(b.depth + 0.3, 0.4, b.w + 0.3, s * (b.x0 + b.depth / 2), b.h + 0.2, b.cz, 0x8a8f98);
      if (R() < 0.7) signQuad(G, s * (b.x0 - 0.05), b.h - 1.6, b.cz, 5.0, 2.5, rp(R, SIGN_FOR.poligono), s, 0xcfcfcf);
      if (R() < 0.6) for (let i = 0; i < 2; i++) P.cy(0.5, 0.5, 2.2, 8, s * (b.x0 + 4 + i * 1.5), b.h + 1.3, b.cz - 2 + i * 3, 0xb8bcc4);
      if (R() < 0.5) P.rb(2.6, 2.6, 2.6, 0.1, s * (b.x0 - 1.5), 1.3, b.cz + R() * 3, rp(R, [0xd24a2a, 0x2a6ad0, 0x2fa05a, 0xe8b020]));
    } });
    if (R() < 0.7) { const cx = s * rr(R, 14, 20), cz = rr(R, -10, 10); P.cy(2.2, 2.2, 14, 14, cx, 7, cz, 0xd0d4dc); P.cone(2.4, 2.2, 14, cx, 15, cz, 0xb8bcc4); P.bx(0.3, 14, 0.3, cx + 2.4, 7, cz, 0x8a8f98); }
    if (R() < 0.6) { const cx = s * rr(R, 12, 18), cz = rr(R, -8, 8); P.cy(0.9, 1.2, 22, 10, cx, 11, cz, 0xb04a3a); P.cy(1.0, 1.0, 0.6, 10, cx, 22.1, cz, 0x333840); }
    lamp(P, G, s * 7.7, -7.5, s, 0xffe0a0, false, 7); lamp(P, G, s * 7.7, 7.5, s, 0xffe0a0, false, 7);
    for (let k = 0; k < 3; k++) { P.rb(0.6, 0.9, 0.6, 0.08, s * (5.5 + R() * 0.8), 0.55, -12 + k * 10 + R() * 4, 0xe8b020); P.cy(0.28, 0.28, 0.85, 8, s * 6.8, 0.52, -10 + k * 9 + R() * 3, rp(R, [0x2a6ad0, 0xd24a2a, 0x333840])); }
    for (let z = -14; z < 14; z += 4) P.rb(0.08, 0.8, 2.6, 0.02, s * 4.9, 0.6, z, 0xe8c21a);
    if (s > 0) P.bx(16.5, 0.45, 0.45, 0, 9.5, -2, 0x9aa0aa); // tubería elevada
  },
  fiestas(F, P, G, R, s) {
    const d = DIST[4]; sidewalk(P, d, s);
    buildings(F, P, G, R, d, s, 'fiestas', { x0: 9.4, stag: 1, wmin: 7, wmax: 11, dmin: 8, dmax: 11, hmin: 7, hmax: 11, deco: b => {
      P.cone(Math.max(b.w, b.depth) * 0.78, 3.2, 4, s * (b.x0 + b.depth / 2), b.h + 1.6, b.cz, 0xb8452a, { ry: Math.PI / 4, sx: b.depth / Math.max(b.w, b.depth), sz: b.w / Math.max(b.w, b.depth) });
      if (R() < 0.6) balcony(P, G, b.x0, s, b.cz, 3.8, 2.0, true, 0x4a3320);
      for (let i = 0; i < 4; i++) { G.sp(0.09, s * (b.x0 - 0.1), 3.0 + R() * 0.2, b.cz - b.w / 2 + 1 + i * (b.w - 2) / 3, [0xff4f8a, 0xffd23c, 0x4fe8ff, 0x7bff4f][i], { uv: SOLID, seg: 5 }); }
    } });
    // casetas con guirnaldas
    for (let i = 0; i < 2; i++) { const zc = -9 + i * 17 + R() * 3, cx = s * 6.4, col = rp(R, [0xff4f8a, 0xffd23c, 0x4fa8ff, 0x7bd84f]);
      P.rb(2.0, 1.0, 3.0, 0.05, cx + s * 0.5, 0.7, zc, 0x9a6a3a); P.rb(2.8, 0.15, 3.6, 0.05, cx, 2.8, zc, col); P.rb(2.8, 0.7, 3.6, 0.05, cx, 2.45, zc, 0xffffff, { rz: 0 }); P.bx(0.08, 2.8, 0.08, cx - s * 1.2, 1.4, zc - 1.7, 0x6a4a2a); P.bx(0.08, 2.8, 0.08, cx - s * 1.2, 1.4, zc + 1.7, 0x6a4a2a);
      for (let k = 0; k < 9; k++) { const c2 = [0xff4f8a, 0xffd23c, 0x4fe8ff, 0x7bff4f, 0xffffff][k % 5]; G.sp(0.1, cx - s * 1.38, 2.6 + Math.sin(k * 1.4) * 0.05, zc - 1.7 + k * 0.42, c2, { uv: SOLID, seg: 5 }); if (k % 2 === 0) G.halo(cx - s * 1.38, 2.6, zc - 1.7 + k * 0.42, c2, 1.4); }
      signQuad(G, cx - s * 1.45, 1.6, zc, 2.2, 1.1, rp(R, SIGN_FOR.fiestas), s, 0xe0e0e0);
    }
    // farolillos de feria
    lamp(P, G, s * 7.7, -7, s, 0xffd89a, true, 5.2); lamp(P, G, s * 7.7, 8, s, 0xffd89a, true, 5.2);
    if (R() < 0.5) { for (let i = 0; i < 4; i++) { const bx = s * (7.4 + R() * 2), bz = -12 + i * 7 + R() * 3, c = rp(R, [0xff4f8a, 0xffd23c, 0x4fa8ff, 0xb78cff, 0x4fe8a0]); P.cy(0.008, 0.008, 3.2 + R() * 2, 3, bx, 3 + R(), bz, 0xdddddd); P.sp(0.6, bx, 5.6 + R() * 2.5, bz, c, { sy: 1.2, seg: 8 }); } }
    if (R() < 0.35) { P.rb(0.9, 0.5, 0.9, 0.1, s * 7, 0.5, 3 + R() * 4, 0xd8c040); P.rb(0.9, 0.5, 0.9, 0.1, s * 7.3, 1.0, 3.1, 0xe8d050); }
    if (s > 0) { bunting(P, R, 6.8, [0xff4f8a, 0xffd23c, 0x4fe8ff, 0x7bff4f, 0xffffff], G); lightStrings(G, R); }
  },
  noche(F, P, G, R, s) {
    const d = DIST[5]; sidewalk(P, d, s);
    buildings(F, P, G, R, d, s, 'noche', { x0: 9.0, stag: 2, wmin: 8, wmax: 14, dmin: 10, dmax: 14, hmin: 22, hmax: 55, deco: b => {
      const nc = [0xff4fd8, 0x4ff4ff, 0xffe23c, 0x8f6aff][Math.floor(R() * 4)];
      signQuad(G, s * (b.x0 - 0.05), 4.0, b.cz, 4.0, 2.0, rp(R, SIGN_FOR.noche), s, 0xffffff); G.halo(s * (b.x0 - 0.8), 4.0, b.cz, 0xffffff, 6);
      // letrero vertical de neón
      const vz = b.cz + b.w * 0.3; G.bx(0.12, 6.0, 0.35, s * (b.x0 - 0.3), 9.5, vz, nc, { uv: SOLID }); G.halo(s * (b.x0 - 0.9), 7.0, vz, nc, 5); G.halo(s * (b.x0 - 0.9), 10.0, vz, nc, 5);
      if (R() < 0.5) { G.bx(0.12, 0.3, b.w * 0.8, s * (b.x0 - 0.1), b.h * 0.6, b.cz, nc, { uv: SOLID }); G.halo(s * (b.x0 - 0.7), b.h * 0.6, b.cz, nc, 6); }
      P.cy(0.15, 0.15, 3, 5, s * (b.x0 + 3), b.h + 1.5, b.cz, 0x555a66); G.sp(0.2, s * (b.x0 + 3), b.h + 3.1, b.cz, 0xff3a3a, { uv: SOLID, seg: 5 });
    } });
    lamp(P, G, s * 7.7, -7.5, s, 0xff8fe8, true, 5.8); lamp(P, G, s * 7.7, 7.5, s, 0x8ff4ff, true, 5.8);
    if (R() < 0.6) { P.rb(0.9, 1.9, 0.9, 0.1, s * 7.0, 1.0, -2 + R() * 8, 0x2a2e48); G.bx(0.6, 1.2, 0.04, s * 6.54, 1.15, 0, 0x6af4ff, { uv: SOLID }); }
    bin(P, s * 5.2, 11, 0x40466a);
    if (s > 0) { // pórtico de neón sobre la calle
      P.bx(0.3, 8, 0.3, -7.6, 4, 12, 0x2a2e48); P.bx(0.3, 8, 0.3, 7.6, 4, 12, 0x2a2e48); P.bx(15.5, 0.35, 0.35, 0, 8.1, 12, 0x2a2e48);
      G.bx(15.2, 0.12, 0.12, 0, 7.8, 12, 0xff4fd8, { uv: SOLID }); G.bx(15.2, 0.1, 0.1, 0, 8.4, 12, 0x4ff4ff, { uv: SOLID });
      for (let i = -3; i <= 3; i++) G.halo(i * 2.4, 7.9, 12, i % 2 ? 0xff4fd8 : 0x4ff4ff, 3.6);
    }
  },
};
function bunting(P, R, y, cols, G) {
  const n = 22; for (let i = 0; i <= n; i++) { const x = -7.8 + 15.6 * i / n; const sag = (1 - Math.pow(x / 7.8, 2)) * 0.9; P.cone(0.26, 0.55, 3, x, y - sag - 0.3, 14, cols[i % cols.length], { rx: Math.PI, sz: 0.4 }); }
  P.bx(15.6, 0.04, 0.04, 0, y + 0.1, 14, 0x555555);
}
function lightStrings(G, R) {
  for (const z of [-6, 3]) { const n = 26; for (let i = 0; i <= n; i++) { const x = -7.8 + 15.6 * i / n; const sag = (1 - Math.pow(x / 7.8, 2)) * 1.1; const c = [0xff4f8a, 0xffd23c, 0x4fe8ff, 0x7bff4f, 0xffb02a][i % 5]; G.sp(0.09, x, 7.6 - sag, z, c, { uv: SOLID, seg: 5 }); if (i % 2 === 0) G.halo(x, 7.6 - sag, z, c, 1.6); } }
}

const NIGHTLIT = new Set(['fiestas', 'noche']);
export function buildTile(di, s, seed) {
  const d = DIST[di], R = rng(seed * 131 + di * 17 + (s > 0 ? 7 : 3));
  const F = new GB(), P = new GB(), G = new GB();
  GEN[d.id](F, P, G, R, s);
  const out = { F: F.empty ? null : F.build(), P: P.build(), G: G.empty ? null : G.build(), H: null };
  const hg = G.buildHalos(); if (hg) out.H = hg;
  return out;
}
