import * as THREE from 'three';
export { THREE };
export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
export const smooth = t => t * t * (3 - 2 * t);
export const rand = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------- curved-world shader patch (bends only the projected position, shadows stay straight) ---------- */
export const BEND = { uBend: { value: 0.0011 }, uBendX: { value: 0 } };
export function bendMat(mat) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uBend = BEND.uBend; sh.uniforms.uBendX = BEND.uBendX;
    sh.vertexShader = 'uniform float uBend;\nuniform float uBendX;\n' + sh.vertexShader.replace('#include <project_vertex>',
      `#include <project_vertex>
 mvPosition.y -= uBend * mvPosition.z * mvPosition.z; mvPosition.x += uBendX * mvPosition.z * mvPosition.z;
 gl_Position = projectionMatrix * mvPosition;`);
  };
  return mat;
}

/* ---------- rounded box geometry (flat faces, smooth rounded edges) ---------- */
const _rbCache = new Map();
export function rboxGeo(w, h, d, r) {
  const key = [w, h, d, r].map(v => v.toFixed(3)).join('|');
  if (_rbCache.has(key)) return _rbCache.get(key);
  r = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  const g = new THREE.BoxGeometry(1, 1, 1, 3, 3, 3);
  const p = g.attributes.position, n = g.attributes.normal;
  const H = [w / 2, h / 2, d / 2], I = [w / 2 - r, h / 2 - r, d / 2 - r];
  for (let i = 0; i < p.count; i++) {
    const c = [p.getX(i), p.getY(i), p.getZ(i)];
    const pos = [0, 0, 0], dir = [0, 0, 0];
    for (let k = 0; k < 3; k++) { const s = c[k] < 0 ? -1 : 1; pos[k] = s * I[k]; dir[k] = Math.abs(c[k]) > 0.4 ? s : 0; }
    const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
    for (let k = 0; k < 3; k++) { dir[k] /= l; pos[k] += dir[k] * r; }
    p.setXYZ(i, pos[0], pos[1], pos[2]); n.setXYZ(i, dir[0], dir[1], dir[2]);
  }
  _rbCache.set(key, g); return g;
}
const _gc = new Map();
function cached(key, fn) { let g = _gc.get(key); if (!g) { g = fn(); _gc.set(key, g); } return g; }

/* ---------- geometry builder: merges many parts into ONE vertex-coloured BufferGeometry ---------- */
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _n3 = new THREE.Matrix3(), _col = new THREE.Color(), _v = new THREE.Vector3();
export class GB {
  constructor() { this.p = []; this.n = []; this.c = []; this.u = []; this.i = []; this.o = 0; this.halos = []; }
  /** generic add. o = {x,y,z,rx,ry,rz,sx,sy,sz,uv:[u,v] fixed uv, uvs:[su,sv] scale, shade:0..1 darken bottom} */
  add(geo, color, o = {}) {
    const x = o.x || 0, y = o.y || 0, z = o.z || 0;
    const sc = o.s || 1;
    _e.set(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ'); _q.setFromEuler(_e);
    _m.compose(_p.set(x, y, z), _q, _s.set((o.sx || 1) * sc, (o.sy || 1) * sc, (o.sz || 1) * sc));
    _n3.getNormalMatrix(_m);
    const pa = geo.attributes.position, na = geo.attributes.normal, ua = geo.attributes.uv;
    _col.set(color);
    const hasCol = false;
    for (let i = 0; i < pa.count; i++) {
      _v.fromBufferAttribute(pa, i).applyMatrix4(_m);
      this.p.push(_v.x, _v.y, _v.z);
      _v.fromBufferAttribute(na, i).applyMatrix3(_n3).normalize();
      this.n.push(_v.x, _v.y, _v.z);
      let k = 1;
      if (o.ao) { k = 0.78 + 0.22 * clamp((this.p[this.p.length - 2] - (o.aoY0 || 0)) / (o.aoH || 1), 0, 1); }
      if (o.vc) { const ca = geo.attributes.color; this.c.push(ca.getX(i), ca.getY(i), ca.getZ(i)); } else this.c.push(_col.r * k, _col.g * k, _col.b * k);
      if (o.uv) this.u.push(o.uv[0], o.uv[1]);
      else if (ua) this.u.push(ua.getX(i) * (o.uvs ? o.uvs[0] : 1), ua.getY(i) * (o.uvs ? o.uvs[1] : 1));
      else this.u.push(0, 0);
    }
    if (geo.index) { const ix = geo.index.array; for (let i = 0; i < ix.length; i++) this.i.push(ix[i] + this.o); }
    else for (let i = 0; i < pa.count; i++) this.i.push(i + this.o);
    this.o += pa.count;
    return this;
  }
  rb(w, h, d, r, x, y, z, color, o = {}) { if (r < 0.06 || Math.max(w, h, d) < 0.7) return this.bx(w, h, d, x, y, z, color, o); return this.add(rboxGeo(w, h, d, r), color, Object.assign({ x, y, z }, o)); }
  bx(w, h, d, x, y, z, color, o = {}) { return this.add(cached('b' + w + h + d, () => new THREE.BoxGeometry(w, h, d)), color, Object.assign({ x, y, z }, o)); }
  cy(rt, rb, h, seg, x, y, z, color, o = {}) { return this.add(cached(`c${rt}|${rb}|${h}|${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), color, Object.assign({ x, y, z }, o)); }
  sp(r, x, y, z, color, o = {}) { return this.add(cached('s' + r + (o.seg || 10), () => new THREE.SphereGeometry(r, o.seg || 10, Math.max(6, (o.seg || 10) * 0.7 | 0))), color, Object.assign({ x, y, z }, o)); }
  cone(r, h, seg, x, y, z, color, o = {}) { return this.add(cached(`n${r}|${h}|${seg}`, () => new THREE.ConeGeometry(r, h, seg)), color, Object.assign({ x, y, z }, o)); }
  tor(R, t, x, y, z, color, o = {}) { return this.add(cached(`t${R}|${t}|${o.arc || TAU}|${o.seg || 12}`, () => new THREE.TorusGeometry(R, t, 6, o.seg || 12, o.arc || TAU)), color, Object.assign({ x, y, z }, o)); }
  cap(r, len, x, y, z, color, o = {}) { return this.add(cached(`p${r}|${len}`, () => new THREE.CapsuleGeometry(r, len, 3, 8)), color, Object.assign({ x, y, z }, o)); }
  pl(w, h, x, y, z, color, o = {}) { return this.add(cached('l' + w + h, () => new THREE.PlaneGeometry(w, h)), color, Object.assign({ x, y, z }, o)); }
  /** tiled facade box (sharp). wall faces get world-scaled uv, roof gets plain uv (0.02,0.02) */
  facade(w, h, d, x, y, z, color, tile = 12, o = {}) {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    // faces order: +x,-x,+y,-y,+z,-z  (4 verts each)
    const vo = o.vofs || 0;
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
      const i = f * 4 + k; const u = uv.getX(i), v = uv.getY(i);
      if (f < 2) uv.setXY(i, 0.04 + u * d / tile + (o.uofs || 0), 0.04 + v * h / tile + vo);
      else if (f < 4) uv.setXY(i, 0.02, 0.02);
      else uv.setXY(i, 0.04 + u * w / tile + (o.uofs || 0), 0.04 + v * h / tile + vo);
    }
    this.add(g, color, Object.assign({ x, y, z }, o)); g.dispose(); return this;
  }
  halo(x, y, z, color, size) { _col.set(color); this.halos.push(x, y, z, _col.r, _col.g, _col.b, size); return this; }
  get empty() { return this.p.length === 0; }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.setIndex(this.o > 65000 ? new THREE.Uint32BufferAttribute(this.i, 1) : new THREE.Uint16BufferAttribute(this.i, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
  buildHalos() {
    const n = this.halos.length / 7; if (!n) return null;
    const g = new THREE.BufferGeometry(); const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), sz = new Float32Array(n);
    for (let i = 0; i < n; i++) { const h = this.halos; pos[i * 3] = h[i * 7]; pos[i * 3 + 1] = h[i * 7 + 1]; pos[i * 3 + 2] = h[i * 7 + 2]; col[i * 3] = h[i * 7 + 3]; col[i * 3 + 1] = h[i * 7 + 4]; col[i * 3 + 2] = h[i * 7 + 5]; sz[i] = h[i * 7 + 6]; }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('size', new THREE.BufferAttribute(sz, 1));
    g.computeBoundingSphere(); return g;
  }
}
export function softTexture(size = 64, stops = [[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,.5)'], [1, 'rgba(255,255,255,0)']]) {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); stops.forEach(s => g.addColorStop(s[0], s[1]));
  x.fillStyle = g; x.fillRect(0, 0, size, size); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function disposeObj(o) { o.traverse(c => { if (c.geometry) c.geometry.dispose(); }); }
