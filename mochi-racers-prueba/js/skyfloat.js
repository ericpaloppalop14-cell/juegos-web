// v21: globos aerostáticos y nubes-isla en lo alto del cielo (solo decorado, muy por encima y por fuera de la pista: no tapan la vista ni chocan)
import * as THREE from 'three';
import { toon } from './gfx.js';
let GEO = null;
function balloonGeo() { if (GEO) return GEO; const parts = [];
  const env = new THREE.SphereGeometry(4, 16, 12); env.scale(1, 1.2, 1); env.translate(0, 6, 0); parts.push([env, 0]);
  const band = new THREE.TorusGeometry(3.7, 0.35, 6, 20); band.rotateX(Math.PI / 2); band.translate(0, 6, 0); parts.push([band, 1]);
  const bas = new THREE.CylinderGeometry(0.9, 0.7, 1.1, 10); bas.translate(0, -0.6, 0); parts.push([bas, 2]);
  for (const [x, z] of [[0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]) { const r = new THREE.CylinderGeometry(0.04, 0.04, 2.6, 4); r.translate(x, 1.0, z); parts.push([r, 2]); }
  const cols = [new THREE.Color(1, 1, 1), new THREE.Color('#ffe066'), new THREE.Color('#a8744a')];
  const pos = [], nor = [], col = [];
  for (const [g0, ci] of parts) { const g = g0.toNonIndexed(); const p = g.attributes.position.array, n = g.attributes.normal.array; for (let i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(n[i]); } for (let i = 0; i < p.length / 3; i++) col.push(cols[ci].r, cols[ci].g, cols[ci].b); }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return GEO = out; }
export function addSkyFloat(T, Q) {
  const S = T.S; let cx = 0, cz = 0, maxY = 0; for (const s of S) { cx += s.p.x; cz += s.p.z; maxY = Math.max(maxY, s.p.y); } cx /= S.length; cz /= S.length;
  let R = 0; for (const s of S) R = Math.max(R, Math.hypot(s.p.x - cx, s.p.z - cz) + s.wall);
  const n = Q.hi ? 12 : 7, im = new THREE.InstancedMesh(balloonGeo(), toon('#ffffff', { vc: true, rim: 0.5 }), n);
  const pal = ['#ff8fc0', '#7ee3c4', '#b9a2f7', '#ffd36b', '#8fd8ff', '#ff9f6a'], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), base = [];
  for (let i = 0; i < n; i++) { const a = i / n * 6.28 + 0.3, r = R + 40 + (i % 3) * 25; base.push([cx + Math.cos(a) * r, maxY + 38 + (i % 4) * 9, cz + Math.sin(a) * r, 1.2 + (i % 3) * 0.4]); im.setColorAt(i, new THREE.Color(pal[i % pal.length])); }
  im.frustumCulled = false; T.group.add(im);
  const upd = t => { for (let i = 0; i < n; i++) { const [x, y, z, s] = base[i]; v.set(x + Math.sin(t * 0.05 + i) * 6, y + Math.sin(t * 0.4 + i * 1.7) * 2.5, z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t * 0.1 + i); sc.setScalar(s); m4.compose(v, q, sc); im.setMatrixAt(i, m4); } im.instanceMatrix.needsUpdate = true; };
  upd(0); T.anims.push(upd); if (im.instanceColor) im.instanceColor.needsUpdate = true; return im;
}
