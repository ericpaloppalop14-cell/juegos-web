// Constructor de geometrías con color por vértice (todo un objeto = 1 malla = 1 draw call)
import * as THREE from 'three';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(),
  _p = new THREE.Vector3(), _s = new THREE.Vector3(), _n = new THREE.Matrix3(), _v = new THREE.Vector3(), _c = new THREE.Color();

export const C = (hex) => new THREE.Color(hex);
export function mix(a, b, t) { return new THREE.Color(a).lerp(new THREE.Color(b), t); }
export function lighten(hex, t) { return mix(hex, 0xffffff, t); }
export function darken(hex, t) { return mix(hex, 0x2a1840, t); }

export class GB {
  constructor() { this.p = []; this.n = []; this.c = []; this.i = []; this.base = 0; }
  add(geo, col, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    _e.set(rx, ry, rz); _q.setFromEuler(_e); _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
    _n.getNormalMatrix(_m);
    const pa = geo.attributes.position, na = geo.attributes.normal, idx = geo.index;
    const own = col == null ? geo.attributes.color : null; const constant = own || !(typeof col === 'function'); const cc = (constant && !own) ? new THREE.Color(col) : null;
    for (let i = 0; i < pa.count; i++) {
      _v.fromBufferAttribute(pa, i).applyMatrix4(_m);
      this.p.push(_v.x, _v.y, _v.z);
      _v.fromBufferAttribute(na, i).applyMatrix3(_n).normalize();
      this.n.push(_v.x, _v.y, _v.z);
      const k = own ? _c.setRGB(own.getX(i), own.getY(i), own.getZ(i)) : constant ? cc : new THREE.Color(col(this.p[this.p.length - 3], this.p[this.p.length - 2], this.p[this.p.length - 1], _v.x, _v.y, _v.z));
      this.c.push(k.r, k.g, k.b);
    }
    if (idx) for (let i = 0; i < idx.count; i++) this.i.push(idx.getX(i) + this.base);
    else for (let i = 0; i < pa.count; i++) this.i.push(i + this.base);
    this.base += pa.count;
    geo.dispose();
    return this;
  }
  box(w, h, d, col, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { return this.add(new THREE.BoxGeometry(w, h, d), col, x, y + h / 2, z, rx, ry, rz); }
  rbox(w, h, d, r, col, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, seg = 3) { return this.add(roundedBox(w, h, d, r, seg), col, x, y + h / 2, z, rx, ry, rz); }
  cyl(rt, rb, h, col, x = 0, y = 0, z = 0, seg = 12, rx = 0, ry = 0, rz = 0) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg, 1), col, x, y + h / 2, z, rx, ry, rz); }
  sph(r, col, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, seg = 12, rx = 0, ry = 0, rz = 0) { return this.add(new THREE.SphereGeometry(r, seg, Math.max(6, seg * 0.7 | 0)), col, x, y, z, rx, ry, rz, sx, sy, sz); }
  cone(r, h, col, x = 0, y = 0, z = 0, seg = 10, rx = 0, ry = 0, rz = 0) { return this.add(new THREE.ConeGeometry(r, h, seg, 1), col, x, y + h / 2, z, rx, ry, rz); }
  torus(R, t, col, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, arc = Math.PI * 2, seg = 12) { return this.add(new THREE.TorusGeometry(R, t, 6, seg, arc), col, x, y, z, rx, ry, rz); }
  build(centerY = true, ao = 2.2) {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(this.p), col = new Float32Array(this.c);
    // límites
    let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < pos.length; i += 3) {
      minX = Math.min(minX, pos[i]); maxX = Math.max(maxX, pos[i]);
      minY = Math.min(minY, pos[i + 1]); maxY = Math.max(maxY, pos[i + 1]);
      minZ = Math.min(minZ, pos[i + 2]); maxZ = Math.max(maxZ, pos[i + 2]);
    }
    const h = maxY - minY, off = centerY ? (minY + maxY) / 2 : 0;
    const aoH = Math.min(ao, h * 0.35 + 0.05);
    for (let i = 0; i < pos.length; i += 3) {
      const t = Math.min(1, Math.max(0, (pos[i + 1] - minY) / aoH));
      const k = 0.78 + 0.22 * (t * t * (3 - 2 * t));
      col[i] *= k; col[i + 1] *= k; col[i + 2] *= k;
      pos[i + 1] -= off;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(this.n), 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(this.p.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(this.i, 1) : new THREE.Uint16BufferAttribute(this.i, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    g.userData = { h, w: maxX - minX, d: maxZ - minZ, halfH: h / 2 };
    return g;
  }
}

export function roundedBox(w, h, d, r, seg = 3) {
  r = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3);
  const s = seg * 2;
  const g = new THREE.BoxGeometry(w, h, d, s, s, s);
  const pa = g.attributes.position, na = g.attributes.normal;
  const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r, v = new THREE.Vector3(), inner = new THREE.Vector3();
  for (let i = 0; i < pa.count; i++) {
    v.fromBufferAttribute(pa, i);
    inner.set(Math.max(-hx, Math.min(hx, v.x)), Math.max(-hy, Math.min(hy, v.y)), Math.max(-hz, Math.min(hz, v.z)));
    const dir = v.sub(inner);
    if (dir.lengthSq() < 1e-10) continue;
    dir.normalize();
    pa.setXYZ(i, inner.x + dir.x * r, inner.y + dir.y * r, inner.z + dir.z * r);
    na.setXYZ(i, dir.x, dir.y, dir.z);
  }
  return g;
}

// color por triángulo según sector angular (para el paraguas)
export function sectorColors(geo, n, c1, c2) {
  const g = geo.toNonIndexed(); const pa = g.attributes.position; const cols = new Float32Array(pa.count * 3);
  const a = new THREE.Color(c1), b = new THREE.Color(c2);
  for (let i = 0; i < pa.count; i += 3) {
    const cx = (pa.getX(i) + pa.getX(i + 1) + pa.getX(i + 2)), cz = (pa.getZ(i) + pa.getZ(i + 1) + pa.getZ(i + 2));
    let ang = Math.atan2(cz, cx); if (ang < 0) ang += Math.PI * 2;
    const k = (Math.floor(ang / (Math.PI * 2) * n) % 2) ? a : b;
    for (let j = 0; j < 3; j++) { cols[(i + j) * 3] = k.r; cols[(i + j) * 3 + 1] = k.g; cols[(i + j) * 3 + 2] = k.b; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return g;
}
