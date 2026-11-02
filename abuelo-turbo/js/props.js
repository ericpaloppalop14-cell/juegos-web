import { THREE, GB, bendMat, TAU, rboxGeo, addOutline } from './util.js?v=4';
import { M } from './rig.js?v=4';
import { PILLS } from './data.js?v=4';

const CAR_COL = [0xe8453c, 0x3b7de0, 0xf0c030, 0x3cbf72, 0xf4f4f6, 0x8a5ad8, 0xff8a30, 0x2fb8c8, 0xc9ccd4];
const GLASS = 0x2a3a58, GLASS2 = 0x587aa8, TIRE = 0x1c1d22, CHROME = 0xdfe4ec, DARK = 0x1e2026;
const shade = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();
/* rueda con neumático, llanta de radios, tapacubos y pasarruedas oscuro */
const wheel = (b, x, y, z, r = 0.34, w = 0.26) => {
  const sx = Math.sign(x) || 1;
  b.cy(r, r, w, 14, x, y, z, TIRE, { rz: Math.PI / 2 });
  b.cy(r * 0.66, r * 0.66, w + 0.03, 12, x, y, z, 0xcfd3da, { rz: Math.PI / 2 });
  b.cy(r * 0.3, r * 0.3, w + 0.06, 8, x, y, z, 0x7c828c, { rz: Math.PI / 2 });
  for (let k = 0; k < 5; k++) b.bx(0.03, r * 1.15, 0.05, x + sx * (w / 2 + 0.03), y, z, 0x9aa0aa, { rx: k / 5 * Math.PI });
  b.cy(r * 1.22, r * 1.22, 0.07, 14, x - sx * 0.02, y + 0.02, z, 0x14161a, { rz: Math.PI / 2 }); // pasarruedas
};
const tail = (b, x, y, z, w = 0.3) => { b.rb(w, 0.14, 0.06, 0.03, x, y, z, 0xff2a2a); b.bx(w * 0.5, 0.05, 0.07, x, y, z + 0.005, 0xffb0a0); };
const head = (b, x, y, z, w = 0.34) => { b.rb(w, 0.17, 0.09, 0.04, x, y, z, 0x2a2d34); b.sp(0.095, x, y, z - 0.04, 0xfff6c8, { seg: 7 }); b.bx(w * 0.7, 0.03, 0.05, x, y - 0.11, z - 0.03, 0xffb02a); };
const plate = (b, x, y, z, front = false) => { b.bx(0.5, 0.14, 0.03, x, y, z, 0xf6f6f0); b.bx(0.4, 0.05, 0.035, x, y, z + (front ? -0.004 : 0.004), 0x2a3a8a); };
const mirror = (b, y, z, w = 0.98) => { for (const sx of [-1, 1]) { b.cy(0.015, 0.015, 0.16, 5, sx * w, y - 0.04, z, 0x222222, { rz: Math.PI / 2 }); b.rb(0.09, 0.14, 0.18, 0.04, sx * (w + 0.12), y, z, 0x222428); } };
const doorLines = (b, zs, y0, y1, w) => { for (const sx of [-1, 1]) for (const z of zs) b.bx(0.03, y1 - y0, 0.03, sx * w, (y0 + y1) / 2, z, 0x15171c); };
const handles = (b, zs, y, w) => { for (const sx of [-1, 1]) for (const z of zs) b.bx(0.04, 0.04, 0.16, sx * (w + 0.01), y, z, CHROME); };
const mesh = (g, mat = M.v, cast = true) => { const m = new THREE.Mesh(g, mat); m.castShadow = cast; return m; };
/* cuerpo de turismo: carrocería, cabina con montantes, lunas, parachoques, faros, calandra, matrícula */
function carBody(b, c, o = {}) {
  const L = o.L || 3.9, W = o.W || 1.85, zf = -L / 2, zr = L / 2;
  b.rb(W, 0.5, L, 0.26, 0, 0.64, 0, c);                       // caja
  b.rb(W - 0.06, 0.2, L - 0.8, 0.14, 0, 0.86, -0.1, c);       // capó + maletero
  b.rb(W + 0.01, 0.16, L + 0.02, 0.06, 0, 0.4, 0, shade(c, 0.62)); // faldón
  b.rb(W + 0.02, 0.2, L + 0.04, 0.08, 0, 0.3, 0, 0x2b2d34);   // bajos
  // cabina
  const cl = o.cabL || 2.0, cz = o.cabZ != null ? o.cabZ : 0.25;
  b.rb(W - 0.22, 0.62, cl, 0.28, 0, 1.2, cz, c);
  b.rb(W - 0.18, 0.4, cl - 0.16, 0.14, 0, 1.22, cz, GLASS);   // lunas laterales
  for (const dz of [-cl / 2 + 0.05, -0.05 + 0.0, cl / 2 - 0.02]) b.bx(W - 0.14, 0.44, 0.09, 0, 1.22, cz + dz, shade(c, 0.9)); // montantes A/B/C
  b.rb(W - 0.26, 0.38, 0.06, 0.04, 0, 1.2, cz - cl / 2 - 0.02, GLASS2, { rx: 0.42 }); // parabrisas
  b.rb(W - 0.3, 0.34, 0.06, 0.04, 0, 1.2, cz + cl / 2 + 0.02, GLASS2, { rx: -0.45 }); // luneta
  b.rb(W - 0.38, 0.09, cl - 0.1, 0.05, 0, 1.55, cz, shade(c, 1.08)); // techo
  // paragolpes
  b.rb(W + 0.04, 0.2, 0.28, 0.08, 0, 0.42, zf - 0.02, 0x2b2d34); b.bx(W - 0.3, 0.04, 0.05, 0, 0.5, zf - 0.17, CHROME);
  b.rb(W + 0.04, 0.2, 0.28, 0.08, 0, 0.42, zr + 0.02, 0x2b2d34); b.bx(W - 0.3, 0.04, 0.05, 0, 0.5, zr + 0.17, CHROME);
  // calandra + faros + pilotos + matrículas
  b.rb(0.72, 0.17, 0.06, 0.03, 0, 0.62, zf - 0.02, 0x1a1c20); b.bx(0.6, 0.025, 0.07, 0, 0.62, zf - 0.03, CHROME); b.bx(0.6, 0.025, 0.07, 0, 0.67, zf - 0.03, CHROME);
  plate(b, 0, 0.47, zf - 0.19, true); plate(b, 0, 0.58, zr + 0.02);
  for (const sx of [-1, 1]) { head(b, sx * 0.64, 0.74, zf - 0.01); tail(b, sx * 0.64, 0.8, zr + 0.01, 0.4); b.bx(0.1, 0.04, 0.1, sx * 0.9, 0.74, zf + 0.35, 0xffb02a); }
  mirror(b, 1.06, cz - cl / 2 + 0.12, (W - 0.12) / 2 + 0.03);
  doorLines(b, [cz - cl / 2 + 0.2, cz + 0.0, cz + cl / 2 - 0.1], 0.5, 0.82, W / 2 + 0.005); handles(b, [cz - 0.2, cz + 0.62], 0.86, W / 2 + 0.005);
  for (const sx of [-0.8, 0.8]) { wheel(b, sx, 0.34, zf + 0.75); wheel(b, sx, 0.34, zr - 0.75); }
  b.cy(0.04, 0.05, 0.3, 6, 0.55, 0.28, zr + 0.12, 0x888e98, { rx: Math.PI / 2 }); // tubo de escape
}
/* ---- model builders: return {b:GB, hw, len, y0, y1, ...} (model faces -z, centred on x=0,z=0, floor y=0) ---- */
const B = {
  car(i) {
    const c = CAR_COL[i % CAR_COL.length], b = new GB();
    carBody(b, c);
    if (i % 3 === 1) { b.rb(1.3, 0.05, 0.08, 0.02, 0, 1.64, 0.1, 0x2a2d34); b.bx(0.05, 0.08, 0.05, -0.45, 1.6, 0.1, 0x2a2d34); b.bx(0.05, 0.08, 0.05, 0.45, 1.6, 0.1, 0x2a2d34); } // baca
    if (i % 3 === 2) { b.rb(1.5, 0.05, 0.3, 0.02, 0, 1.0, 1.8, shade(c, 0.8)); for (const sx of [-0.55, 0.55]) b.bx(0.05, 0.16, 0.05, sx, 0.92, 1.8, 0x2a2d34); } // alerón
    if (i % 2 === 0) b.bx(0.04, 0.5, 0.04, 0.6, 1.8, 1.0, 0x222222, { rx: -0.2 }); // antena
    b.bx(1.86, 0.05, 0.05, 0, 0.72, -0.4, shade(c, 1.15)); // línea de carrocería
    return { b, hw: 0.95, len: 3.9, y0: 0, y1: 1.55 };
  },
  taxi() {
    const r = B.car(2), b = r.b;
    b.rb(0.62, 0.2, 0.32, 0.06, 0, 1.68, 0.25, 0xf4f4f4); b.bx(0.5, 0.08, 0.26, 0, 1.68, 0.25, 0x151515);
    for (let k = -4; k <= 4; k++) { b.bx(0.12, 0.1, 0.03, k * 0.2, 0.9, -0.2, k % 2 ? 0x151515 : 0xf4f4f4); b.bx(0.12, 0.1, 0.03, k * 0.2, 0.9, 0.8, k % 2 ? 0x151515 : 0xf4f4f4); } // cuadros del taxi
    for (const sx of [-1, 1]) { b.bx(0.03, 0.1, 1.9, sx * 0.93, 0.78, 0.4, 0x151515); }
    return r;
  },
  van(i) {
    const c = [0xf4f4f6, 0xf8d23c, 0xe8453c][i % 3], stripe = [0x2a7ad8, 0xe8453c, 0x2fa05a][i % 3], b = new GB();
    b.rb(2.0, 1.75, 3.7, 0.3, 0, 1.3, 0.55, c);                     // caja de carga
    b.rb(1.92, 1.0, 1.5, 0.28, 0, 0.98, -1.75, c);                  // morro
    b.rb(1.88, 0.62, 1.1, 0.2, 0, 1.52, -1.45, c);                  // cabina
    b.rb(1.7, 0.6, 0.1, 0.06, 0, 1.55, -2.0, GLASS2, { rx: -0.3 }); // parabrisas
    b.rb(0.08, 0.5, 1.0, 0.03, 0.96, 1.5, -1.55, GLASS); b.rb(0.08, 0.5, 1.0, 0.03, -0.96, 1.5, -1.55, GLASS); // ventanillas
    b.rb(2.03, 0.3, 4.9, 0.05, 0, 0.9, 0.1, stripe);               // franja
    b.rb(2.0, 0.2, 5.0, 0.08, 0, 0.36, 0.05, 0x2b2d34);
    b.rb(1.98, 0.22, 0.28, 0.08, 0, 0.45, -2.5, 0x2b2d34); b.bx(1.5, 0.04, 0.05, 0, 0.55, -2.65, CHROME);
    b.rb(1.98, 0.22, 0.28, 0.08, 0, 0.45, 2.46, 0x2b2d34);
    b.rb(0.75, 0.2, 0.06, 0.03, 0, 0.78, -2.5, 0x1a1c20); plate(b, 0, 0.45, -2.68, true); plate(b, 0, 0.5, 2.62);
    for (const sx of [-1, 1]) { head(b, sx * 0.7, 0.86, -2.48, 0.36); tail(b, sx * 0.82, 1.0, 2.52, 0.3); b.rb(0.3, 0.7, 0.04, 0.02, sx * 0.8, 1.4, 2.47, 0xffffff); }
    doorLines(b, [-1.1, -0.2], 0.55, 1.9, 1.005); b.bx(0.03, 1.4, 0.03, 1.006, 1.35, 1.6, 0x15171c); b.bx(0.03, 1.4, 0.03, -1.006, 1.35, 1.6, 0x15171c); // puerta lateral
    mirror(b, 1.4, -1.7, 1.0); handles(b, [-0.35, 0.85], 1.15, 1.005);
    b.rb(1.9, 0.07, 0.07, 0.02, 0, 2.2, -0.4, 0x2a2d34); b.rb(1.9, 0.07, 0.07, 0.02, 0, 2.2, 1.4, 0x2a2d34); // barras del techo
    for (const sx of [-0.85, 0.85]) { wheel(b, sx, 0.4, -1.5, 0.4); wheel(b, sx, 0.4, 1.6, 0.4); }
    return { b, hw: 1.0, len: 4.9, y0: 0, y1: 2.15 };
  },
  bus(i) {
    const c = [0xd9362c, 0x2f7be0, 0x2fa05a, 0xf0a020][i % 4], b = new GB();
    b.rb(2.5, 2.7, 9.4, 0.35, 0, 1.75, 0, 0xf2f2f4); b.rb(2.52, 0.95, 9.42, 0.2, 0, 0.9, 0, c); b.rb(2.5, 0.55, 9.4, 0.28, 0, 3.0, 0, c);
    b.rb(2.55, 0.12, 9.45, 0.04, 0, 1.45, 0, shade(c, 0.7));
    // ventanas laterales con montantes
    for (const sx of [-1, 1]) { b.rb(0.05, 0.9, 8.6, 0.06, sx * 1.27, 2.25, -0.1, GLASS); for (let k = 0; k <= 9; k++) b.bx(0.07, 0.95, 0.12, sx * 1.27, 2.25, -4.3 + k * 0.95, 0xe6e6ea); b.bx(0.06, 0.05, 8.6, sx * 1.27, 1.78, -0.1, 0xe6e6ea); }
    // puertas dobles delanteras (lado derecho)
    b.rb(0.08, 1.7, 1.5, 0.05, 1.27, 1.2, -3.0, GLASS2); b.bx(0.1, 1.8, 0.05, 1.28, 1.2, -3.78, 0x2a2d34); b.bx(0.1, 1.8, 0.05, 1.28, 1.2, -3.0, 0x2a2d34); b.bx(0.1, 1.8, 0.05, 1.28, 1.2, -2.25, 0x2a2d34);
    // parabrisas panorámico, cartel de destino, faros y luces
    b.rb(2.25, 1.1, 0.1, 0.1, 0, 2.2, -4.72, GLASS2); b.bx(2.3, 0.05, 0.12, 0, 2.2, -4.73, 0xe6e6ea);
    b.rb(1.5, 0.3, 0.08, 0.05, 0, 3.12, -4.74, 0x151515); b.bx(1.2, 0.12, 0.09, 0, 3.12, -4.75, 0xff9a1a); // letrero
    b.rb(2.2, 0.22, 0.16, 0.06, 0, 0.75, -4.75, 0x2b2d34); b.bx(1.4, 0.04, 0.05, 0, 0.9, -4.82, CHROME); b.rb(0.9, 0.3, 0.05, 0.03, 0, 1.2, -4.74, 0x1a1c20);
    plate(b, 0, 0.62, -4.84, true);
    for (const sx of [-1, 1]) { head(b, sx * 0.92, 1.05, -4.74, 0.4); b.sp(0.07, sx * 0.95, 1.0, 4.74, 0xff2a2a, { seg: 6 }); b.rb(0.4, 0.2, 0.06, 0.04, sx * 0.9, 1.2, 4.74, 0xff2a2a); }
    b.rb(2.2, 1.0, 0.12, 0.1, 0, 2.15, 4.72, GLASS); b.rb(2.4, 0.22, 0.16, 0.06, 0, 0.75, 4.75, 0x2b2d34); plate(b, 0, 0.62, 4.85);
    // aire acondicionado, espejos grandes
    b.rb(1.7, 0.3, 3.2, 0.1, 0, 3.45, 1.2, 0xd8d8de); b.rb(1.2, 0.26, 1.4, 0.08, 0, 3.4, -2.6, 0xc8c8d0); for (let k = 0; k < 4; k++) b.bx(1.5, 0.03, 0.04, 0, 3.62, 0.0 + k * 0.7, 0xaaaab4);
    for (const sx of [-1, 1]) { b.cy(0.02, 0.02, 0.5, 5, sx * 1.4, 2.4, -4.5, 0x222222, { rz: Math.PI / 2 }); b.rb(0.1, 0.4, 0.22, 0.04, sx * 1.62, 2.45, -4.5, 0x222428); }
    for (const sx of [-1.1, 1.1]) { wheel(b, sx, 0.55, -3.2, 0.55, 0.35); wheel(b, sx, 0.55, 2.8, 0.55, 0.35); wheel(b, sx, 0.55, 3.9, 0.55, 0.35); }
    b.rb(0.9, 0.28, 0.04, 0.02, 1.27, 0.45, 0.0, 0xf4f4f6); b.rb(0.12, 0.5, 2.5, 0.03, 1.27, 1.0, 1.2, shade(c, 0.85)); // número de línea + franja
    return { b, hw: 1.28, len: 9.4, y0: 0, y1: 3.4 };
  },
  truck(i) {
    const c = [0xd9362c, 0x2f7be0, 0xf0a020][i % 3], b = new GB();
    b.rb(2.4, 0.4, 8.6, 0.1, 0, 0.7, 0.4, 0x3a3d46);                                   // chasis
    b.rb(2.5, 2.6, 5.6, 0.2, 0, 2.2, 1.7, 0xf2f2f4); b.rb(2.52, 0.55, 5.62, 0.05, 0, 1.4, 1.7, c); b.rb(2.52, 0.4, 5.62, 0.05, 0, 3.0, 1.7, c); // caja
    for (let k = 0; k < 8; k++) b.bx(2.55, 2.5, 0.07, 0, 2.2, -0.8 + k * 0.75, 0xd6d6dc); // costillas
    b.rb(2.3, 1.8, 2.0, 0.25, 0, 1.75, -3.0, c); b.rb(2.0, 0.8, 0.1, 0.1, 0, 2.2, -4.0, GLASS2); b.rb(2.4, 0.6, 0.15, 0.05, 0, 1.0, -4.05, 0x2a2d34);
    for (const sx of [-1, 1]) { b.rb(0.06, 0.7, 1.0, 0.04, sx * 1.16, 2.25, -3.2, GLASS); b.bx(0.07, 0.75, 0.05, sx * 1.16, 2.25, -2.7, shade(c, 0.8)); }
    b.rb(2.3, 0.15, 1.9, 0.05, 0, 2.7, -3.0, shade(c, 1.12)); b.rb(1.8, 0.22, 0.05, 0.04, 0, 2.9, -4.02, 0x151515); // visera
    b.rb(1.3, 0.5, 0.06, 0.04, 0, 1.15, -4.1, 0x1a1c20); for (let k = -2; k <= 2; k++) b.bx(1.25, 0.03, 0.07, 0, 1.05 + k * 0.1, -4.12, CHROME);
    b.rb(2.5, 0.25, 0.3, 0.08, 0, 0.58, -4.15, 0x2b2d34); plate(b, 0, 0.55, -4.34, true);
    for (const sx of [-1, 1]) { head(b, sx * 0.85, 1.05, -4.1, 0.4); tail(b, sx * 0.85, 0.95, 4.52, 0.4); b.cy(0.07, 0.07, 1.9, 8, sx * 1.15, 3.1, -3.7, 0x9aa0aa); b.rb(0.08, 0.5, 0.2, 0.03, sx * 1.4, 2.4, -3.8, 0x222428); } // chimeneas + espejos
    b.rb(2.5, 0.12, 0.3, 0.04, 0, 0.7, 4.65, 0xe8c21a); for (let k = 0; k < 6; k++) b.bx(0.1, 0.12, 0.31, -1.0 + k * 0.4, 0.7, 4.65, 0x151515); // defensa trasera
    for (const sx of [-1, 1]) { b.rb(0.05, 0.5, 0.5, 0.03, sx * 1.2, 0.55, 3.8, 0x14161a); }
    for (const sx of [-1.1, 1.1]) { wheel(b, sx, 0.5, -3.2, 0.5, 0.36); wheel(b, sx, 0.5, 2.0, 0.5, 0.36); wheel(b, sx, 0.5, 3.1, 0.5, 0.36); }
    return { b, hw: 1.28, len: 8.6, y0: 0, y1: 3.4 };
  },
  container(i) {
    const c = [0xd24a2a, 0x2a6ad0, 0x2fa05a, 0xe8b020][i % 4], b = new GB(); const dk = shade(c, 0.8);
    b.rb(2.4, 2.6, 6.0, 0.08, 0, 1.4, 0, c); for (let k = -5; k <= 5; k++) b.bx(2.46, 2.4, 0.06, 0, 1.4, k * 0.5, dk);
    b.bx(2.5, 0.12, 6.1, 0, 0.1, 0, 0x2a2d34); for (const sx of [-1, 1]) for (const z of [-3.0, 3.0]) b.bx(0.12, 2.7, 0.14, sx * 1.22, 1.4, z, 0x3a3d46); // postes de esquina
    for (const sx of [-1, 1]) { b.bx(0.1, 0.14, 6.1, sx * 1.22, 2.72, 0, 0x3a3d46); b.bx(0.1, 0.14, 6.1, sx * 1.22, 0.1, 0, 0x3a3d46); }
    b.rb(1.0, 0.7, 0.05, 0.02, 0, 1.6, 3.03, 0xf4f4f4); for (const sx of [-0.5, 0.5]) { b.bx(0.06, 2.3, 0.06, sx, 1.4, 3.06, 0x8a8f98); b.bx(0.12, 0.08, 0.08, sx, 1.1, 3.08, 0x2a2d34); }
    return { b, hw: 1.22, len: 6.0, y0: 0, y1: 2.75 };
  },
  carroza() {
    const b = new GB();
    b.rb(2.5, 0.5, 8.0, 0.1, 0, 0.8, 0, 0xffd23c); for (const sx of [-1.1, 1.1]) for (const z of [-2.5, 0, 2.5]) wheel(b, sx, 0.45, z, 0.45, 0.3);
    b.rb(2.3, 0.2, 7.8, 0.05, 0, 1.15, 0, 0xff4f8a); for (let i = 0; i < 8; i++) { const cc = [0xff4f8a, 0x4fe8ff, 0xffffff, 0xb78cff][i % 4]; b.sp(0.4, -0.9 + (i % 2) * 1.8, 1.7 + (i % 3) * 0.2, -3 + i * 0.85, cc, { seg: 7 }); }
    b.rb(2.2, 1.6, 2.0, 0.2, 0, 2.0, 2.6, 0xff4f8a); b.cone(1.4, 1.6, 6, 0, 3.6, 2.6, 0xffd23c); for (let i = 0; i < 5; i++) b.sp(0.3, -1 + i * 0.5, 3.0 + (i % 2) * 0.3, -2, [0xff4f8a, 0xffd23c, 0x4fe8ff, 0x7bff4f, 0xffffff][i], { seg: 7 });
    for (let k = 0; k < 8; k++) { b.sp(0.07, -1.15, 1.0, -3.6 + k * 1.0, k % 2 ? 0xffffff : 0xffe23c, { seg: 5 }); b.sp(0.07, 1.15, 1.0, -3.6 + k * 1.0, k % 2 ? 0xffe23c : 0xffffff, { seg: 5 }); } // bombillas
    b.rb(1.6, 0.9, 0.06, 0.03, 0, 2.0, 1.55, 0xffffff); b.rb(1.4, 0.7, 0.07, 0.03, 0, 2.0, 1.55, 0x4fe8ff);
    for (const sx of [-1, 1]) { b.cy(0.04, 0.04, 2.2, 5, sx * 1.05, 2.4, 3.4, 0xffffff); b.sp(0.2, sx * 1.05, 3.6, 3.4, 0xffd23c, { seg: 6 }); }
    return { b, hw: 1.27, len: 8.0, y0: 0, y1: 3.2 };
  },
  limo() {
    const b = new GB();
    b.rb(1.9, 0.62, 7.0, 0.26, 0, 0.62, 0, 0x14141a); b.rb(1.66, 0.6, 5.2, 0.26, 0, 1.17, 0.4, 0x14141a); b.rb(1.7, 0.4, 4.9, 0.16, 0, 1.2, 0.4, 0x3a2a68); b.rb(1.5, 0.1, 5.0, 0.05, 0, 1.5, 0.4, 0x14141a);
    for (let k = 0; k < 5; k++) b.bx(1.74, 0.44, 0.08, 0, 1.2, -1.8 + k * 1.0, 0x1e1e26);
    b.rb(1.64, 0.36, 0.06, 0.04, 0, 1.2, -2.15, GLASS2, { rx: 0.42 }); b.rb(1.62, 0.34, 0.06, 0.04, 0, 1.2, 2.95, GLASS2, { rx: -0.45 });
    b.rb(1.95, 0.06, 7.05, 0.02, 0, 0.3, 0, 0xff4fd8); b.bx(1.92, 0.04, 6.9, 0, 0.78, 0, 0xe8c24a); // franja dorada
    b.rb(1.94, 0.2, 0.28, 0.08, 0, 0.42, -3.55, 0x2b2d34); b.bx(1.5, 0.04, 0.05, 0, 0.5, -3.7, CHROME); b.rb(0.72, 0.17, 0.06, 0.03, 0, 0.62, -3.5, 0x1a1c20); b.bx(0.6, 0.03, 0.07, 0, 0.62, -3.52, CHROME);
    plate(b, 0, 0.47, -3.72, true); plate(b, 0, 0.55, 3.55); doorLines(b, [-1.9, -0.3, 1.2, 2.6], 0.5, 0.82, 0.96);
    for (const sx of [-1, 1]) { head(b, sx * 0.66, 0.74, -3.5); tail(b, sx * 0.9, 0.78, 3.52, 0.34); }
    mirror(b, 1.08, -1.6, 0.9);
    for (const sx of [-0.8, 0.8]) { wheel(b, sx, 0.34, -2.4); wheel(b, sx, 0.34, 2.4); }
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
    const b = new GB();
    b.sp(0.23, 0, 0, 0, 0x8d94a8, { sx: 0.92, sy: 0.85, sz: 1.35, seg: 10 });                 // cuerpo gris azulado
    b.sp(0.17, 0, -0.06, -0.12, 0xc9b6d8, { sx: 0.9, sy: 0.9, sz: 0.8, seg: 8 });             // pecho lila
    b.sp(0.125, 0, 0.17, -0.24, 0x5a6a9a, { seg: 9 });                                          // cabeza
    b.tor(0.1, 0.035, 0, 0.1, -0.2, 0x2fb89a, { rx: Math.PI / 2 - 0.4, seg: 10 });             // cuello iridiscente
    b.tor(0.09, 0.025, 0, 0.09, -0.19, 0xb050d0, { rx: Math.PI / 2 - 0.4, seg: 10 });
    b.cone(0.04, 0.14, 5, 0, 0.14, -0.41, 0xffa020, { rx: -Math.PI / 2 }); b.sp(0.035, 0, 0.19, -0.34, 0xf4f4f4, { seg: 5 }); // pico + cera
    for (const sx of [-1, 1]) { b.sp(0.038, sx * 0.075, 0.2, -0.31, 0xffa020, { seg: 5 }); b.sp(0.026, sx * 0.078, 0.2, -0.335, 0x111111, { seg: 5 }); b.sp(0.01, sx * 0.082, 0.21, -0.35, 0xffffff, { seg: 4 }); }
    for (let k = -1; k <= 1; k++) b.rb(0.1, 0.035, 0.32, 0.015, k * 0.075, -0.03 - Math.abs(k) * 0.01, 0.42, k ? 0x6a7288 : 0x555e78, { ry: k * 0.18 }); // cola abanico
    b.rb(0.34, 0.03, 0.08, 0.01, 0, -0.02, 0.28, 0xf2f2f6);                                       // banda blanca
    for (const sx of [-1, 1]) { b.cy(0.012, 0.012, 0.14, 4, sx * 0.07, -0.22, -0.02, 0xe8788a); b.rb(0.06, 0.02, 0.1, 0.01, sx * 0.07, -0.29, -0.06, 0xe8788a); } // patitas
    const w = new GB();
    w.rb(0.5, 0.045, 0.34, 0.02, 0.26, 0, 0, 0xe4e7ee); w.rb(0.42, 0.05, 0.22, 0.02, 0.22, 0.012, 0.06, 0xb8bed0); w.rb(0.2, 0.045, 0.3, 0.02, 0.56, -0.005, 0.02, 0x4a526c); w.bx(0.03, 0.05, 0.3, 0.33, 0.01, 0.0, 0x7a8298);
    _pig = { body: b.build(), wing: w.build() };
  }
  const g = new THREE.Group(); const body = new THREE.Mesh(_pig.body, M.v); g.add(body); body.castShadow = true;
  const wl = new THREE.Mesh(_pig.wing, M.v), wr = new THREE.Mesh(_pig.wing, M.v); wl.position.set(0.15, 0.08, 0); wr.position.set(-0.15, 0.08, 0); wr.scale.x = -1; g.add(wl, wr); addOutline(body, 0.018); addOutline(wl, 0.014); addOutline(wr, 0.014); g.scale.setScalar(1.45);
  return { obj: g, hw: 0.55, len: 0.8, y0: 0.95, y1: 1.6, kind: 'paloma', wl, wr };
}
export function makeGranny() {
  if (!_gran) {
    const b = new GB(); const dress = 0xc84a8a, cardi = 0x7a4aa8, skin = 0xf2b79a;
    // vestido de flores + rebeca + zapatos
    b.cy(0.21, 0.37, 0.82, 12, 0, 0.85, 0, dress); for (let k = 0; k < 7; k++) { const a = k / 7 * TAU; b.sp(0.035, Math.cos(a) * 0.3, 0.55 + (k % 3) * 0.14, Math.sin(a) * 0.3, 0xffd8e8, { seg: 4 }); }
    b.rb(0.5, 0.5, 0.36, 0.14, 0, 1.2, 0, cardi); b.sp(0.26, 0, 1.38, 0, cardi, { sx: 1.2, sy: 0.55, sz: 0.85, seg: 9 });
    b.bx(0.04, 0.45, 0.04, 0, 1.2, -0.19, 0xe8d8f4); for (let k = 0; k < 3; k++) b.sp(0.03, 0, 1.05 + k * 0.14, -0.2, 0xffe8a0, { seg: 4 });  // botones
    b.tor(0.13, 0.025, 0, 1.45, -0.04, 0xf4f4f6, { rx: Math.PI / 2, seg: 10 });                                             // collar de perlas
    b.cy(0.05, 0.06, 0.12, 8, 0, 1.52, 0, skin);                                                                              // cuello
    b.sp(0.2, 0, 1.68, 0, skin, { seg: 12, sy: 1.04 });                                                                       // cabeza
    b.sp(0.2, 0, 1.78, 0.05, 0xf0f0f4, { seg: 10, sy: 0.7, sz: 1.0 }); b.sp(0.11, 0, 1.97, 0.12, 0xf0f0f4, { seg: 8 });       // pelo + moño
    b.sp(0.05, 0.17, 1.68, 0, 0xe39b86, { seg: 5 }); b.sp(0.05, -0.17, 1.68, 0, 0xe39b86, { seg: 5 });                         // orejas
    b.sp(0.04, 0, 1.64, -0.2, 0xe39b86, { seg: 5 });                                                                          // nariz
    for (const sx of [-1, 1]) { b.sp(0.045, sx * 0.08, 1.71, -0.17, 0xffffff, { seg: 5 }); b.sp(0.025, sx * 0.08, 1.71, -0.205, 0x15151a, { seg: 4 }); b.tor(0.065, 0.012, sx * 0.08, 1.71, -0.2, 0x222222, { seg: 10 }); b.sp(0.04, sx * 0.13, 1.6, -0.14, 0xf08a8a, { sz: 0.5, seg: 5 }); }
    b.bx(0.06, 0.012, 0.012, 0, 1.72, -0.205, 0x222222); b.rb(0.08, 0.025, 0.03, 0.01, 0, 1.55, -0.19, 0xb83a4a);              // gafas + sonrisa
    for (const s of [-1, 1]) {
      b.cap(0.05, 0.4, s * 0.1, 0.3, 0, skin); b.rb(0.14, 0.08, 0.26, 0.03, s * 0.1, 0.06, -0.06, 0x333333);                  // piernas + zapatos
      b.cap(0.065, 0.36, s * 0.31, 1.15, -0.2, cardi, { rx: 1.1 }); b.sp(0.065, s * 0.31, 1.0, -0.43, skin, { seg: 6 });       // brazos empujando
    }
    b.rb(0.3, 0.24, 0.12, 0.04, 0.38, 0.9, -0.1, 0x7a4a2a); // bolso
    // carrito de la compra bien reconocible: cesta de rejilla, asa, ruedas, compra asomando
    b.rb(0.78, 0.6, 0.6, 0.06, 0, 0.56, -0.78, 0x2a8a5a);
    for (let k = 0; k < 4; k++) b.bx(0.8, 0.03, 0.03, 0, 0.36 + k * 0.12, -1.09, 0x1a5a3a);
    for (let k = -3; k <= 3; k++) b.bx(0.03, 0.6, 0.03, k * 0.12, 0.56, -1.09, 0x1a5a3a);
    b.rb(0.84, 0.06, 0.66, 0.02, 0, 0.88, -0.78, 0x1a5a3a);
    b.cy(0.025, 0.025, 0.8, 5, 0, 1.0, -0.42, 0x8a8f98, { rx: -0.5 }); b.bx(0.5, 0.04, 0.04, 0, 1.36, -0.25, 0x2a2d34);
    for (const sx of [-1, 1]) for (const z of [-0.55, -1.0]) { b.cy(0.1, 0.1, 0.06, 8, sx * 0.34, 0.13, z, 0x222222, { rz: Math.PI / 2 }); b.cy(0.04, 0.04, 0.07, 6, sx * 0.34, 0.13, z, 0xcfd3da, { rz: Math.PI / 2 }); }
    b.cy(0.05, 0.05, 0.65, 6, -0.12, 1.12, -0.82, 0xe0b060, { rz: 0.4, rx: 0.2 }); b.sp(0.15, 0.12, 0.98, -0.72, 0x9ad84a, { seg: 6 }); b.sp(0.12, 0.2, 0.96, -0.9, 0xe8426a, { seg: 6 }); b.rb(0.14, 0.22, 0.14, 0.03, -0.18, 1.0, -0.9, 0xf4f4f8); // baguette, lechuga, tomate, leche
    _gran = b.build();
  }
  const g = new THREE.Group(); const m = new THREE.Mesh(_gran, M.v); m.castShadow = true; g.add(m); addOutline(m, 0.025); g.scale.setScalar(1.18);
  return { obj: g, hw: 0.68, len: 1.1, y0: 0, y1: 2.1, kind: 'abuela', body: m };
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
