// MOCHI PARTY · lod3d (o47): constructores de geometría con menos segmentos (factor k) para figuras pequeñas en pantalla.
import * as THREE from 'three';
const r = (n, k, min) => Math.max(min, Math.round(n * k));
export const mkLod = k => ({
  Sphere: (rad, w = 32, h = 16, ...a) => new THREE.SphereGeometry(rad, r(w, k, 7), r(h, k, 5), ...a),
  Cylinder: (rt, rb, h, rs = 32, hs = 1, ...a) => new THREE.CylinderGeometry(rt, rb, h, r(rs, k, 6), hs, ...a),
  Cone: (rad, h, rs = 32, hs = 1, ...a) => new THREE.ConeGeometry(rad, h, r(rs, k, 5), hs, ...a),
  Torus: (R, t, rs = 12, ts = 48, ...a) => new THREE.TorusGeometry(R, t, r(rs, k, 5), r(ts, k, 10), ...a),
  Lathe: (pts, seg = 12, ...a) => new THREE.LatheGeometry(pts, r(seg, k, 10), ...a),
  Capsule: (rad, len, cs = 4, rs = 8, ...a) => new THREE.CapsuleGeometry(rad, len, r(cs, k, 2), r(rs, k, 6), ...a),
});
