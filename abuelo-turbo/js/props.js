import { THREE, GB, bendMat, TAU, rboxGeo, addOutline } from './util.js?v=2';
import { M } from './rig.js?v=2';
import { PILLS } from './data.js?v=2';

const CAR_COL = [0xe8453c, 0x3b7de0, 0xf0c030, 0x3cbf72, 0xf4f4f6, 0x8a5ad8, 0xff8a30, 0x2fb8c8, 0xc9ccd4];
const GLASS = 0x2a3a58, TIRE = 0x1c1d22;
const wheel = (b, x, y, z, r = 0.34, w = 0.26) => { b.cy(r, r, w, 12, x, y, z, TIRE, { rz: Math.PI / 2 }); b.cy(r * 0.55, r * 0.55, w + 0.02, 8, x, y, z, 0xcfd3da, { rz: Math.PI / 2 }); };
const tail = (b, x, y, z, w = 0.3) => { b.rb(w, 0.14, 0.06, 0.03, x, y, z, 0xff2a2a); };
const mesh = (g, mat = M.v, cast = true) => { const m = new THREE.Mesh(g, mat); m.castShadow = cast; return m; };

/* ---- model builders: return {b:GB, hw, len, y0, y1, ...} (model faces -z, centred on x=0,z=0, floor y=0) ---- */
const B = {
  car(i) {
    const c = CAR_COL[i % CAR_COL.length], b = new GB();
    b.rb(1.85, 0.62, 3.9, 0.26, 0, 0.64, 0, c); b.rb(1.62, 0.66, 2.1, 0.28, 0, 1.2, 0.22, c);
    b.rb(1.66, 0.42, 1.78, 0.16, 0, 1.22, 0.22, GLASS); b.rb(1.5, 0.1, 1.9, 0.05, 0, 1.53, 0.22, c);
    b.rb(1.86, 0.2, 3.92, 0.08, 0, 0.36, 0, 0x2b2d34);
    for (const sx of [-0.78, 0.78]) { wheel(b, sx, 0.34, -1.2); wheel(b, sx, 0.34, 1.2); tail(b, sx * 0.9, 0.78, 1.96, 0.34); b.sp(0.12, sx * 0.95, 0.7, -1.95, 0xfff2b0, { seg: 6 }); }
    b.rb(0.5, 0.14, 0.04, 0.02, 0, 0.5, 1.96, 0xf4f4f4); b.cy(0.05, 0.05, 0.2, 6, 0.5, 0.25, 1.98, 0x888888, { rx: Math.PI / 2 });
    return { b, hw: 0.95, len: 3.9, y0: 0, y1: 1.55 };
  },
  taxi() {
    const r = B.car(2); r.b.rb(0.55, 0.2, 0.3, 0.06, 0, 1.68, 0.2, 0xf4f4f4); r.b.bx(1.86, 0.08, 3.92, 0, 0.82, 0, 0x151515); return r;
  },
  van(i) {
    const c = [0xf4f4f6, 0xf8d23c, 0xe8453c][i % 3], b = new GB();
    b.rb(2.0, 1.9, 4.7, 0.3, 0, 1.2, 0.2, c); b.rb(1.9, 0.8, 1.5, 0.25, 0, 1.0, -1.9, c); b.rb(1.7, 0.6, 0.12, 0.08, 0, 1.55, -2.38, GLASS, { rx: -0.3 });
    b.rb(2.02, 0.35, 4.72, 0.05, 0, 1.0, 0.2, [0x2a7ad8, 0xe8453c, 0x2fa05a][i % 3]);
    for (const sx of [-0.85, 0.85]) { wheel(b, sx, 0.4, -1.5, 0.4); wheel(b, sx, 0.4, 1.6, 0.4); tail(b, sx, 0.9, 2.56, 0.3); b.sp(0.13, sx * 0.9, 0.7, -2.4, 0xfff2b0, { seg: 6 }); }
    b.rb(1.2, 0.5, 0.05, 0.02, 0, 1.6, 2.56, 0xffffff);
    return { b, hw: 1.0, len: 4.9, y0: 0, y1: 2.15 };
  },
  bus(i) {
    const c = [0xd9362c, 0x2f7be0, 0x2fa05a, 0xf0a020][i % 4], b = new GB();
    b.rb(2.5, 2.7, 9.4, 0.35, 0, 1.75, 0, 0xf2f2f4); b.rb(2.52, 1.0, 9.42, 0.2, 0, 0.95, 0, c); b.rb(2.5, 0.7, 9.4, 0.3, 0, 2.95, 0, c);
    b.rb(2.55, 0.85, 8.8, 0.12, 0, 2.25, -0.1, GLASS); b.rb(2.2, 1.05, 0.12, 0.1, 0, 2.15, 4.72, GLASS);
    b.rb(1.6, 0.3, 3.0, 0.1, 0, 3.4, 1, 0xd8d8de); b.rb(0.6, 0.3, 0.06, 0.03, 0, 3.0, 4.72, 0xff9a1a);
    for (const sx of [-1.1, 1.1]) { wheel(b, sx, 0.55, -3.2, 0.55, 0.35); wheel(b, sx, 0.55, 2.8, 0.55, 0.35); wheel(b, sx, 0.55, 3.9, 0.55, 0.35); tail(b, sx * 0.9, 1.2, 4.72, 0.4); b.sp(0.15, sx * 0.9, 1.1, -4.7, 0xfff2b0, { seg: 6 }); }
    return { b, hw: 1.28, len: 9.4, y0: 0, y1: 3.4 };
  },
  truck(i) {
    const c = [0xd9362c, 0x2f7be0, 0xf0a020][i % 3], b = new GB();
    b.rb(2.4, 0.4, 8.6, 0.1, 0, 0.7, 0.4, 0x3a3d46); b.rb(2.5, 2.6, 5.6, 0.2, 0, 2.2, 1.7, 0xf2f2f4); b.rb(2.52, 0.55, 5.62, 0.05, 0, 1.4, 1.7, c); b.rb(2.52, 0.4, 5.62, 0.05, 0, 3.0, 1.7, c);
    b.rb(2.3, 1.8, 2.0, 0.25, 0, 1.75, -3.0, c); b.rb(2.0, 0.8, 0.1, 0.1, 0, 2.2, -4.0, GLASS); b.rb(2.4, 0.6, 0.15, 0.05, 0, 1.0, -4.05, 0x2a2d34);
    for (const sx of [-1.1, 1.1]) { wheel(b, sx, 0.5, -3.2, 0.5, 0.36); wheel(b, sx, 0.5, 2.0, 0.5, 0.36); wheel(b, sx, 0.5, 3.1, 0.5, 0.36); tail(b, sx * 0.85, 0.95, 4.52, 0.4); b.sp(0.13, sx * 0.8, 1.0, -4.06, 0xfff2b0, { seg: 6 }); }
    return { b, hw: 1.28, len: 8.6, y0: 0, y1: 3.4 };
  },
  container(i) {
    const c = [0xd24a2a, 0x2a6ad0, 0x2fa05a, 0xe8b020][i % 4], b = new GB();
    b.rb(2.4, 2.6, 6.0, 0.08, 0, 1.4, 0, c); for (let k = -5; k <= 5; k++) b.bx(2.46, 2.4, 0.06, 0, 1.4, k * 0.5, new THREE.Color(c).multiplyScalar(0.8).getHex());
    b.bx(2.5, 0.12, 6.1, 0, 0.1, 0, 0x2a2d34); b.rb(1.0, 0.7, 0.05, 0.02, 0, 1.6, 3.03, 0xf4f4f4);
    return { b, hw: 1.22, len: 6.0, y0: 0, y1: 2.75 };
  },
  carroza() {
    const b = new GB();
    b.rb(2.5, 0.5, 8.0, 0.1, 0, 0.8, 0, 0xffd23c); for (const sx of [-1.1, 1.1]) for (const z of [-2.5, 0, 2.5]) wheel(b, sx, 0.45, z, 0.45, 0.3);
    b.rb(2.3, 0.2, 7.8, 0.05, 0, 1.15, 0, 0xff4f8a); for (let i = 0; i < 8; i++) { const cc = [0xff4f8a, 0x4fe8ff, 0xffffff, 0xb78cff][i % 4]; b.sp(0.4, -0.9 + (i % 2) * 1.8, 1.7 + (i % 3) * 0.2, -3 + i * 0.85, cc, { seg: 7 }); }
    b.rb(2.2, 1.6, 2.0, 0.2, 0, 2.0, 2.6, 0xff4f8a); b.cone(1.4, 1.6, 6, 0, 3.6, 2.6, 0xffd23c); for (let i = 0; i < 5; i++) b.sp(0.3, -1 + i * 0.5, 3.0 + (i % 2) * 0.3, -2, [0xff4f8a, 0xffd23c, 0x4fe8ff, 0x7bff4f, 0xffffff][i], { seg: 7 });
    return { b, hw: 1.27, len: 8.0, y0: 0, y1: 3.2 };
  },
  limo() {
    const b = new GB();
    b.rb(1.9, 0.62, 7.0, 0.26, 0, 0.62, 0, 0x14141a); b.rb(1.66, 0.6, 5.2, 0.26, 0, 1.17, 0.4, 0x14141a); b.rb(1.7, 0.4, 4.9, 0.16, 0, 1.2, 0.4, 0x3a2a68); b.rb(1.5, 0.1, 5.0, 0.05, 0, 1.5, 0.4, 0x14141a);
    b.rb(1.95, 0.06, 7.05, 0.02, 0, 0.3, 0, 0xff4fd8); for (const sx of [-0.8, 0.8]) { wheel(b, sx, 0.34, -2.4); wheel(b, sx, 0.34, 2.4); tail(b, sx * 0.9, 0.78, 3.52, 0.34); }
    return { b, hw: 0.97, len: 7.0, y0: 0, y1: 1.55 };
  },
  /* ---- low (jump) ---- */
  valla() { const b = new GB(); for (const sx of [-0.85, 0.85]) b.rb(0.1, 1.0, 0.3, 0.03, sx, 0.5, 0, 0x555a64); for (let i = 0; i < 4; i++) b.rb(2.1, 0.17, 0.12, 0.04, 0, 0.35 + i * 0.22, 0, i % 2 ? 0xf4f4f4 : 0xe8321a); b.sp(0.12, 0.85, 1.08, 0, 0xffb02a, { seg: 6 }); return { b, hw: 1.05, len: 0.5, y0: 0, y1: 1.02 }; },
  cajas() { const b = new GB(); for (let i = 0; i < 3; i++) for (let j = 0; j < 2 - (i === 2 ? 1 : 0); j++) b.rb(0.85, 0.5, 0.85, 0.06, -0.55 + j * 1.0 + (i % 2) * 0.1, 0.27 + i * 0.5, (i * 0.05), [0xc99a5a, 0xd6a866, 0xb88a4a][(i + j) % 3]); b.sp(0.2, -0.4, 0.62, -0.46, 0xff7a1a); b.sp(0.2, 0.2, 1.1, -0.4, 0xe8321a); b.sp(0.2, 0.0, 0.62, -0.46, 0x7ad83a); return { b, hw: 1.05, len: 1.0, y0: 0, y1: 1.02 }; },
  basura() { const b = new GB(); b.rb(1.6, 1.0, 1.0, 0.1, 0, 0.62, 0, 0x2f9a58); b.rb(1.7, 0.14, 1.1, 0.05, 0, 1.15, 0, 0x28804a, { rx: -0.1 }); for (const sx of [-0.65, 0.65]) b.cy(0.16, 0.16, 0.1, 8, sx, 0.16, 0.4, TIRE, { rz: Math.PI / 2 }); return { b, hw: 0.9, len: 1.1, y0: 0, y1: 1.2 }; },
  banco() { const b = new GB(); b.rb(1.9, 0.12, 0.6, 0.04, 0, 0.55, 0, 0x9a6a3a); b.rb(1.9, 0.5, 0.1, 0.04, 0, 0.9, 0.3, 0x9a6a3a); for (const sx of [-0.8, 0.8]) b.rb(0.1, 0.55, 0.6, 0.03, sx, 0.28, 0, 0x2a2d34); return { b, hw: 1.0, len: 0.7, y0: 0, y1: 1.15 }; },
  pato() { const b = new GB(); b.sp(0.6, 0, 0.55, 0, 0xffe23c, { sx: 1.2, sz: 1.4, seg: 12 }); b.sp(0.38, 0, 1.1, -0.45, 0xffe23c, { seg: 10 }); b.rb(0.3, 0.1, 0.35, 0.05, 0, 1.08, -0.85, 0xff8a1a); for (const sx of [-0.18, 0.18]) { b.sp(0.06, sx, 1.2, -0.75, 0x151515, { seg: 5 }); } b.sp(0.3, 0, 0.7, 0.5, 0xffe23c, { sy: 0.8, seg: 8 }); b.tor(0.9, 0.16, 0, 0.3, 0, 0xff4f6a, { rx: Math.PI / 2, seg: 14 }); return { b, hw: 0.95, len: 1.7, y0: 0, y1: 1.3 }; },
  tumbona() { const b = new GB(); b.rb(1.0, 0.1, 2.0, 0.04, 0, 0.45, 0, 0xffffff); for (let i = 0; i < 6; i++) b.bx(1.0, 0.11, 0.1, 0, 0.46, -0.9 + i * 0.36, i % 2 ? 0x2a9aff : 0xffffff); b.rb(1.0, 0.1, 0.9, 0.04, 0, 0.75, 0.75, 0x2a9aff, { rx: -0.6 }); b.sp(0.2, 0.2, 0.7, -0.5, 0xff4f6a, { seg: 6 }); return { b, hw: 0.7, len: 2.0, y0: 0, y1: 1.0 }; },
  castillo() { const b = new GB(); b.cy(0.7, 0.9, 0.6, 10, 0, 0.3, 0, 0xe8cc88); b.cy(0.45, 0.6, 0.55, 10, 0, 0.85, 0, 0xeed49a); b.cy(0.25, 0.3, 0.3, 8, 0, 1.2, 0, 0xf2dca8); b.cone(0.24, 0.4, 8, 0, 1.5, 0, 0xe8426a); b.cy(0.02, 0.02, 0.4, 4, 0, 1.55, 0, 0x555555); for (const sx of [-0.8, 0.8]) { b.cy(0.28, 0.35, 0.6, 8, sx, 0.3, 0.4, 0xe8cc88); b.cy(0.2, 0.28, 0.3, 8, sx, 0.7, 0.4, 0xeed49a); } return { b, hw: 1.0, len: 1.3, y0: 0, y1: 1.5 }; },
  bidones() { const b = new GB(); for (let i = 0; i < 3; i++) { const x = -0.7 + i * 0.7; b.cy(0.32, 0.32, 0.95, 10, x, 0.5, 0, [0x2a6ad0, 0xd24a2a, 0x2fa05a][i]); for (const y of [0.25, 0.75]) b.cy(0.335, 0.335, 0.05, 10, x, y, 0, 0x30343c); } return { b, hw: 1.05, len: 0.8, y0: 0, y1: 1.0 }; },
  pale() { const b = new GB(); b.rb(1.8, 0.16, 1.2, 0.03, 0, 0.12, 0, 0xb8864a); for (let i = 0; i < 4; i++) b.rb(0.78, 0.55, 0.55, 0.05, -0.45 + (i % 2) * 0.9, 0.5 + Math.floor(i / 2) * 0.6, i < 2 ? -0.28 : 0.28, [0xd9c28a, 0xc9b27a][i % 2]); b.rb(1.85, 0.05, 0.05, 0.02, 0, 0.9, 0, 0x3a6ae0); return { b, hw: 1.0, len: 1.2, y0: 0, y1: 1.15 }; },
  altavoz() { const b = new GB(); b.rb(1.5, 1.05, 0.9, 0.08, 0, 0.55, 0, 0x1a1a1f); for (const y of [0.35, 0.8]) { b.cy(0.3, 0.3, 0.06, 14, -0.0, y, -0.45, 0x44444c, { rx: Math.PI / 2 }); b.cy(0.1, 0.1, 0.08, 10, 0, y, -0.46, 0x151515, { rx: Math.PI / 2 }); } b.sp(0.07, 0.6, 1.0, -0.46, 0xff4fd8, { seg: 5 }); return { b, hw: 0.85, len: 0.9, y0: 0, y1: 1.1 }; },
  carrito() { const b = new GB(); b.rb(1.1, 0.55, 0.8, 0.05, 0, 0.75, 0, 0xcfd4dc); for (let i = 0; i < 6; i++) b.bx(1.12, 0.03, 0.04, 0, 0.55 + i * 0.09, -0.4, 0x8a909a); b.cy(0.03, 0.03, 0.8, 5, 0, 1.2, 0.5, 0x2a6ad0, { rx: 0.4 }); b.bx(1.1, 0.04, 0.04, 0, 1.45, 0.7, 0x2a6ad0); for (const sx of [-0.45, 0.45]) for (const z of [-0.3, 0.3]) b.sp(0.1, sx, 0.15, z, TIRE, { seg: 6 }); b.rb(0.5, 0.3, 0.4, 0.05, 0.1, 1.15, 0, 0xe8426a); return { b, hw: 0.65, len: 0.9, y0: 0, y1: 1.2 }; },
  neonbaja() { const b = new GB(); for (const sx of [-0.9, 0.9]) b.rb(0.14, 1.0, 0.3, 0.04, sx, 0.5, 0, 0x2a2e48); for (let i = 0; i < 3; i++) b.rb(1.9, 0.09, 0.12, 0.03, 0, 0.3 + i * 0.28, 0, [0xff4fd8, 0x4ff4ff, 0xff4fd8][i]); return { b, hw: 1.05, len: 0.5, y0: 0, y1: 1.02 }; },
  /* ---- high (slide) ---- */
  tendedero() {
    const b = new GB(); for (const sx of [-1.15, 1.15]) b.cy(0.05, 0.05, 2.9, 6, sx, 1.45, 0, 0x777c86);
    b.bx(2.3, 0.04, 0.04, 0, 2.8, 0, 0x555555);
    const cl = [0xff6a8a, 0xffffff, 0x6ab8ff, 0xffe23c, 0xffffff, 0x8aff9a]; for (let i = 0; i < 6; i++) { const x = -0.95 + i * 0.38; b.rb(0.33, 0.9 + (i % 2) * 0.15, 0.05, 0.03, x, 2.28 - (i % 2) * 0.07, 0, cl[i]); b.sp(0.025, x, 2.76, 0, 0xf4f4f4, { seg: 4 }); }
    return { b, hw: 1.15, len: 0.5, y0: 1.1, y1: 3.0 };
  },
  toldo() { const b = new GB(); for (const sx of [-1.15, 1.15]) b.cy(0.05, 0.05, 2.9, 6, sx, 1.45, 0, 0x777c86); for (let i = 0; i < 6; i++) b.rb(0.4, 0.09, 1.8, 0.03, -0.95 + i * 0.38, 2.5, 0, i % 2 ? 0xffffff : 0xd83a3a, { rx: 0.05 }); b.rb(2.35, 0.2, 0.06, 0.03, 0, 2.2, 0.9, 0xd83a3a); return { b, hw: 1.15, len: 1.8, y0: 1.15, y1: 3.0 }; },
  sombrilla() { const b = new GB(); b.cy(0.05, 0.05, 3.0, 6, 0, 1.5, 0, 0xf2f2f2); b.cone(1.6, 0.7, 10, 0, 2.55, 0, 0xff4f6a); b.cone(1.45, 0.62, 10, 0, 2.56, 0, 0xffffff, { sy: 1 }); for (let i = 0; i < 5; i++) b.add(new THREE.ConeGeometry(1.52, 0.66, 10, 1, true, i * TAU / 5 - 0.31, TAU / 10), 0xffffff, { x: 0, y: 2.56 }); b.sp(0.08, 0, 2.95, 0, 0xffd23c, { seg: 5 }); b.cy(0.7, 1.2, 0.5, 8, 0, 0.25, 0, 0xffd870); return { b, hw: 1.15, len: 3.0, y0: 1.15, y1: 3.0 }; },
  viga() { const b = new GB(); for (const sx of [-1.15, 1.15]) b.cy(0.05, 0.05, 3.0, 6, sx, 1.5, 0, 0xe8b020); b.rb(2.4, 0.4, 0.4, 0.04, 0, 2.5, 0, 0xe8b020); for (let i = 0; i < 6; i++) b.bx(0.1, 0.42, 0.42, -1.0 + i * 0.4, 2.5, 0, 0x222222, { rz: 0 }); b.cy(0.02, 0.02, 0.7, 4, 0, 1.75, 0, 0x222222); b.rb(0.5, 0.3, 0.5, 0.05, 0, 1.45, 0, 0xd24a2a); return { b, hw: 1.15, len: 0.5, y0: 1.2, y1: 2.8 }; },
  pancarta() { const b = new GB(); for (const sx of [-1.15, 1.15]) b.cy(0.05, 0.05, 3.0, 6, sx, 1.5, 0, 0x6a4a2a); b.rb(2.3, 1.0, 0.08, 0.04, 0, 2.1, 0, 0xff4f8a); b.rb(2.1, 0.8, 0.09, 0.03, 0, 2.1, 0, 0xffd23c); for (let i = 0; i < 6; i++) b.sp(0.12, -1.0 + i * 0.4, 2.7, 0.05, [0xff4f8a, 0x4fe8ff, 0x7bff4f][i % 3], { seg: 6 }); b.rb(1.2, 0.18, 0.1, 0.03, 0, 2.1, 0.05, 0xff4f8a); return { b, hw: 1.15, len: 0.4, y0: 1.2, y1: 2.8 }; },
  neon() { const b = new GB(); for (const sx of [-1.15, 1.15]) b.rb(0.1, 3.0, 0.1, 0.03, sx, 1.5, 0, 0x2a2e48); b.rb(2.3, 1.0, 0.1, 0.05, 0, 2.15, 0, 0x14102a); b.rb(2.15, 0.15, 0.12, 0.05, 0, 2.55, 0.02, 0xff4fd8); b.rb(2.15, 0.15, 0.12, 0.05, 0, 1.75, 0.02, 0x4ff4ff); b.rb(1.3, 0.35, 0.12, 0.05, 0, 2.15, 0.03, 0xffe23c); return { b, hw: 1.15, len: 0.4, y0: 1.2, y1: 2.8 }; },
  /* ---- ramp ---- */
  rampa() {
    const b = new GB(), H = 1.6, L = 6.0; const g = new THREE.BufferGeometry();
    const v = [-1.1, 0, L / 2, 1.1, 0, L / 2, 1.1, H, -L / 2, -1.1, H, -L / 2, -1.1, 0, -L / 2, 1.1, 0, -L / 2];
    // wedge: slope from rear (+z, ground) to front (-z, height H)
    const P = [[-1.1, 0, L / 2], [1.1, 0, L / 2], [1.1, H, -L / 2], [-1.1, H, -L / 2], [-1.1, 0, -L / 2], [1.1, 0, -L / 2]];
    const tri = (a, c, d, col) => { for (const i of [a, c, d]) { } };
    const pos = [], col = [], nor = [];
    const quad = (a, c, d, e, colr) => { const A = P[a], C = P[c], D = P[d], E = P[e]; const n = new THREE.Vector3().subVectors(C, A).cross(new THREE.Vector3().subVectors(E, A)).normalize(); for (const p of [A, C, D, A, D, E]) { pos.push(...p); nor.push(n.x, n.y, n.z); col.push(...colr); } };
    const cc = new THREE.Color(0x2e3139), yy = new THREE.Color(0xff8a1c);
    // slope top split into stripes
    const n = 8; for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n; const z0 = L / 2 - L * t0, z1 = L / 2 - L * t1, y0 = H * t0, y1 = H * t1; const cl = i % 2 ? cc : yy; const nn = new THREE.Vector3(0, L, H).normalize(); const pts = [[-1.1, y0, z0], [1.1, y0, z0], [1.1, y1, z1], [-1.1, y1, z1]]; for (const k of [0, 1, 2, 0, 2, 3]) { pos.push(...pts[k]); nor.push(nn.x, nn.y, nn.z); col.push(cl.r, cl.g, cl.b); } }
    quad(4, 3, 2, 5, [0.3, 0.3, 0.34].map(x => x)); // front face (-z)
    const side = (sx) => { const nrm = [sx, 0, 0]; const pts = sx > 0 ? [[1.1, 0, L / 2], [1.1, 0, -L / 2], [1.1, H, -L / 2]] : [[-1.1, 0, -L / 2], [-1.1, 0, L / 2], [-1.1, H, -L / 2]]; for (const p of pts) { pos.push(...p); nor.push(...nrm); col.push(0.25, 0.26, 0.3); } };
    side(1); side(-1);
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(pos.length / 3 * 2).fill(0), 2));
    const bb = new GB(); bb.add(g, 0xffffff, { vc: true }); 
    // arrows
    for (let i = 0; i < 2; i++) bb.cone(0.28, 0.5, 3, 0, H * (0.3 + i * 0.3) + 0.04, L / 2 - L * (0.3 + i * 0.3), 0xffffff, { rx: -Math.PI / 2 + Math.atan2(H, L) * 1.0 - 0.0, sy: 0.15 });
    return { b: bb, hw: 1.1, len: L, y0: 0, y1: H, ramp: true, H };
  },
};
export function lowForDistrict(di) { return [['valla', 'banco', 'basura', 'valla'], ['cajas', 'carrito', 'valla', 'cajas'], ['pato', 'tumbona', 'castillo', 'valla'], ['bidones', 'pale', 'valla', 'bidones'], ['altavoz', 'cajas', 'valla', 'bidones'], ['neonbaja', 'altavoz', 'neonbaja', 'valla']][di]; }
export function highForDistrict(di) { return ['tendedero', 'toldo', 'sombrilla', 'viga', 'pancarta', 'neon'][di]; }
export function bigForDistrict(di) { return [['bus', 'truck'], ['truck', 'bus'], ['bus', 'truck'], ['container', 'truck'], ['carroza', 'bus'], ['limo', 'bus']][di]; }
export function carForDistrict(di) { return [['car', 'car', 'taxi', 'van'], ['van', 'car', 'van', 'car'], ['car', 'car', 'van', 'car'], ['van', 'truck', 'car', 'van'], ['car', 'van', 'car', 'car'], ['taxi', 'car', 'limo', 'car']][di]; }

const cache = new Map();
/** returns {obj(Group), hw,len,y0,y1,ramp,H, kind} - obj is a fresh clone sharing geometry */
export function makeModel(kind, variant = 0) {
  const key = kind + ':' + variant; let t = cache.get(key);
  if (!t) { const r = B[kind](variant); const mt = mesh(r.b.build(), kind === 'neon' || kind === 'neonbaja' ? M.shiny : M.v); mt.castShadow = true; t = { mesh: mt, hw: r.hw, len: r.len, y0: r.y0, y1: r.y1, ramp: !!r.ramp, H: r.H || 0 }; cache.set(key, t); }
  const g = new THREE.Group(); const m = new THREE.Mesh(t.mesh.geometry, t.mesh.material); m.castShadow = true; m.receiveShadow = false; g.add(m); addOutline(m, kind === 'neon' || kind === 'neonbaja' ? 0.02 : 0.034);
  return { obj: g, hw: t.hw, len: t.len, y0: t.y0, y1: t.y1, ramp: t.ramp, H: t.H, kind };
}

/* ---- pigeon & grandma crossers (animated) ---- */
let _pig, _gran;
export function makePigeon() {
  if (!_pig) {
    const b = new GB(); b.sp(0.22, 0, 0, 0, 0x9aa0b0, { sx: 0.9, sy: 0.85, sz: 1.3, seg: 8 }); b.sp(0.13, 0, 0.14, -0.22, 0x5a6a9a, { seg: 7 }); b.cone(0.04, 0.12, 5, 0, 0.12, -0.38, 0xffb02a, { rx: -Math.PI / 2 }); b.sp(0.025, 0.07, 0.17, -0.3, 0x111111, { seg: 4 }); b.sp(0.025, -0.07, 0.17, -0.3, 0x111111, { seg: 4 }); b.rb(0.1, 0.05, 0.25, 0.02, 0, -0.02, 0.32, 0x7a8090);
    const w = new GB(); w.rb(0.5, 0.04, 0.3, 0.02, 0.25, 0, 0, 0xe4e7ee); _pig = { body: b.build(), wing: w.build() };
  }
  const g = new THREE.Group(); const body = new THREE.Mesh(_pig.body, M.v); g.add(body); body.castShadow = true;
  const wl = new THREE.Mesh(_pig.wing, M.v), wr = new THREE.Mesh(_pig.wing, M.v); wl.position.set(0.15, 0.08, 0); wr.position.set(-0.15, 0.08, 0); wr.scale.x = -1; g.add(wl, wr); addOutline(body, 0.018); addOutline(wl, 0.014); addOutline(wr, 0.014); g.scale.setScalar(1.15);
  return { obj: g, hw: 0.5, len: 0.7, y0: 0.95, y1: 1.5, kind: 'paloma', wl, wr };
}
export function makeGranny() {
  if (!_gran) {
    const b = new GB(); const dress = 0xc84a8a;
    b.cy(0.2, 0.34, 0.8, 10, 0, 0.85, 0, dress); b.sp(0.3, 0, 1.2, 0, 0xf4e4c8, { sy: 0.6, seg: 8 }); b.sp(0.2, 0, 1.55, 0, 0xf2b79a, { seg: 10 }); b.sp(0.17, 0, 1.78, 0.04, 0xf4f4f6, { seg: 8 }); b.sp(0.09, 0, 1.95, 0.1, 0xf4f4f6, { seg: 6 });
    for (const s of [-1, 1]) { b.cap(0.05, 0.4, s * 0.1, 0.3, 0, 0xf2b79a); b.rb(0.14, 0.08, 0.26, 0.03, s * 0.1, 0.06, -0.06, 0x333333); b.cap(0.06, 0.4, s * 0.3, 1.05, -0.2, 0xc84a8a, { rx: 1.0 }); b.tor(0.1, 0.02, s * 0.14, 1.55, -0.14, 0x222222, { seg: 8 }); }
    b.rb(0.28, 0.24, 0.12, 0.04, 0.34, 0.95, -0.15, 0x7a4a2a);
    // carrito de la compra
    b.rb(0.7, 0.6, 0.55, 0.06, 0, 0.55, -0.7, 0x2a8a5a); for (let i = 0; i < 4; i++) b.bx(0.72, 0.03, 0.03, 0, 0.35 + i * 0.12, -0.99, 0x1a5a3a); b.cy(0.03, 0.03, 0.7, 5, 0, 1.0, -0.4, 0x888888, { rx: -0.5 }); for (const s of [-1, 1]) for (const z of [-0.5, -0.9]) b.sp(0.09, s * 0.3, 0.13, z, 0x222222, { seg: 6 });
    b.sp(0.15, 0, 0.95, -0.7, 0x9ad84a, { seg: 6 }); b.sp(0.13, 0.15, 0.95, -0.6, 0xe8426a, { seg: 6 });
    _gran = b.build();
  }
  const g = new THREE.Group(); const m = new THREE.Mesh(_gran, M.v); m.castShadow = true; g.add(m); addOutline(m, 0.025); g.scale.setScalar(1.05);
  return { obj: g, hw: 0.62, len: 1.0, y0: 0, y1: 1.9, kind: 'abuela', body: m };
}

/* ---- collectibles ---- */
export function dentureGeo(gold) {
  const b = new GB(); const gum = gold ? 0xffc928 : 0xff8aa0, tooth = gold ? 0xfff0a0 : 0xffffff;
  b.tor(0.31, 0.08, 0, 0.12, 0, gum, { arc: Math.PI, rz: Math.PI, seg: 14 });
  for (let i = 0; i < 7; i++) { const a = Math.PI + (i + 0.5) / 7 * Math.PI; const r = 0.22; b.rb(0.11, 0.17, 0.1, 0.035, Math.cos(a) * r, Math.sin(a) * r + 0.12, 0.0, tooth, { rz: a - Math.PI / 2 }); }
  return b.build();
}
export function pillMesh(type) {
  const p = PILLS[type]; const b = new GB();
  b.cap(0.22, 0.34, 0, 0, 0, p.col, { rz: Math.PI / 2 }); b.cap(0.225, 0.0, -0.02, 0, 0, p.col2, { rz: Math.PI / 2 });
  // two-tone: half capsule white
  b.add(new THREE.CapsuleGeometry(0.222, 0.0, 4, 10), p.col2, { x: 0.2, rz: Math.PI / 2, sx: 1 });
  b.cy(0.225, 0.225, 0.5, 10, 0.27, 0, 0, p.col2, { rz: Math.PI / 2 });
  b.sp(0.225, 0.52, 0, 0, p.col2, { seg: 10 });
  if (type === 'turbo') { b.cone(0.1, 0.32, 6, 0, 0.36, 0, 0xffffff, {}); b.rb(0.3, 0.04, 0.04, 0.01, 0, 0.3, 0, 0xffd23c); }
  if (type === 'iman') { b.tor(0.14, 0.05, 0, 0.36, 0, 0xff3b30, { arc: Math.PI, seg: 10 }); b.rb(0.1, 0.12, 0.1, 0.02, -0.14, 0.31, 0, 0xcfd6e6); b.rb(0.1, 0.12, 0.1, 0.02, 0.14, 0.31, 0, 0xcfd6e6); }
  if (type === 'faja') { b.rb(0.5, 0.08, 0.5, 0.03, 0.2, 0, 0, 0xffffff, { rz: Math.PI / 2 }); b.tor(0.22, 0.05, 0.28, 0, 0, 0xffffff, { ry: Math.PI / 2 }); }
  if (type === 'baston') { b.cy(0.03, 0.03, 0.55, 6, 0, 0.5, 0, 0xffe0a8); b.tor(0.1, 0.03, 0.1, 0.78, 0, 0xffe0a8, { arc: Math.PI, seg: 8 }); }
  if (type === 'cafe') { b.cy(0.13, 0.1, 0.2, 10, 0, 0.42, 0, 0xffffff); b.tor(0.07, 0.02, 0.16, 0.42, 0, 0xffffff, { seg: 8 }); b.cy(0.11, 0.11, 0.02, 10, 0, 0.52, 0, 0x4a2a14); }
  return b.build();
}
