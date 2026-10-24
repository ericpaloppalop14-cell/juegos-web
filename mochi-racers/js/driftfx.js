// v21: derrape espectacular: chispas que saltan de las ruedas traseras hacia fuera de la curva, brillo en cada rueda,
// estela de color y humito. El color y el tamaño crecen con el nivel del derrape (blanco → azul → naranja → rosa).
import * as THREE from 'three';
import { glowTex } from './gfx.js';
const LV = ['#fff6a8', '#3fb8ff', '#ff8a1f', '#ff3fc8'].map(c => new THREE.Color(c));
const N = 520, SM = 36;
export class DriftFX {
  constructor(scene) {
    const g = new THREE.BufferGeometry(); this.p = new Float32Array(N * 3); this.c = new Float32Array(N * 3); this.v = new Float32Array(N * 3); this.l = new Float32Array(N); this.k = new Uint8Array(N); this.i = 0;
    for (let j = 0; j < N; j++) this.p[j * 3 + 1] = -9999;
    g.setAttribute('position', new THREE.BufferAttribute(this.p, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.c, 3));
    this.pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.42, map: glowTex('#ffffff'), vertexColors: true, transparent: true, depthWrite: false }));
    this.pts.frustumCulled = false; scene.add(this.pts);
    this.smoke = []; const sm = new THREE.SpriteMaterial({ map: glowTex('#ffffff'), color: '#f4eefa', transparent: true, depthWrite: false, opacity: 0.3 });
    for (let j = 0; j < SM; j++) { const s = new THREE.Sprite(sm.clone()); s.visible = false; scene.add(s); this.smoke.push({ s, l: 0, v: new THREE.Vector3() }); } this.si = 0;
    this.tmp = new THREE.Vector3(); this.scene = scene;
  }
  glow(k) { // brillo en las dos ruedas traseras (hijo del kart)
    if (k._dg) return k._dg; const mat = new THREE.SpriteMaterial({ map: glowTex('#ffffff'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    k._dg = [-1, 1].map(s => { const sp = new THREE.Sprite(mat); sp.position.set(s * 1.05, 0.3, -0.95); sp.visible = false; k.mesh.add(sp); return sp; }); return k._dg; }
  spark(x, y, z, vx, vy, vz, col, life, kind) { const j = this.i = (this.i + 1) % N; this.p.set([x, y, z], j * 3); this.v.set([vx, vy, vz], j * 3); this.c.set([col.r, col.g, col.b], j * 3); this.l[j] = life; this.k[j] = kind; }
  update(k, dt, lvl, near) {
    const on = k.driftDir !== 0 && !k.air && near, G = this.glow(k), col = LV[lvl];
    for (const s of G) { s.visible = on && lvl > 0; if (s.visible) { s.material.color.copy(col); s.scale.setScalar((0.8 + lvl * 0.45) * (0.85 + Math.random() * 0.3)); } }
    if (!on) return;
    const sy = Math.sin(k.yaw), cy = Math.cos(k.yaw), rx = cy, rz = -sy; // derecha del kart
    const out = -k.driftDir; // lado exterior de la curva
    const rate = (k.isPlayer ? 1 : 0.4) * (lvl ? 1 : 0.5);
    for (const s of [-1, 1]) { // ruedas traseras
      const wx = k.pos.x + rx * s * 1.05 - sy * 0.95, wz = k.pos.z + rz * s * 1.05 - cy * 0.95, wy = k.y + 0.25;
      const n = Math.random() < rate ? 2 + lvl * 2 : 0;
      for (let i = 0; i < n; i++) { const sp = 3 + lvl * 2.5 + Math.random() * 3; const side = (out * rx) * (2 + Math.random() * 3), sideZ = (out * rz) * (2 + Math.random() * 3);
        this.spark(wx, wy, wz, side - sy * sp + (Math.random() - 0.5) * 2, 2 + Math.random() * (3 + lvl), sideZ - cy * sp + (Math.random() - 0.5) * 2, col, 0.35 + Math.random() * 0.25, 0); }
      if (lvl > 0 && Math.random() < rate * 0.3) this.spark(wx, wy + 0.05, wz, 0, 0, 0, col, 0.28 + lvl * 0.07, 1); // estela
    }
    if (Math.random() < rate * 0.35) { const S = this.smoke[this.si = (this.si + 1) % SM]; S.s.visible = true; S.l = 0.9; S.s.position.set(k.pos.x - sy * 1.2 + rx * out * 0.8, k.y + 0.4, k.pos.z - cy * 1.2 + rz * out * 0.8); S.v.set(rx * out * 1.2, 0.9, rz * out * 1.2); S.s.material.color.copy(col).lerp(new THREE.Color('#f4eefa'), 0.5); }
  }
  step(dt) {
    const p = this.p, v = this.v, l = this.l, c = this.c;
    for (let j = 0; j < N; j++) { if (l[j] <= 0) { if (p[j * 3 + 1] > -9000) p[j * 3 + 1] = -9999; continue; } l[j] -= dt;
      if (this.k[j] === 0) { v[j * 3 + 1] -= 14 * dt; p[j * 3] += v[j * 3] * dt; p[j * 3 + 1] += v[j * 3 + 1] * dt; p[j * 3 + 2] += v[j * 3 + 2] * dt; }
      const f = Math.min(1, l[j] * 3); c[j * 3] *= 0.98 + 0.02 * f; c[j * 3 + 1] *= 0.98 + 0.02 * f; c[j * 3 + 2] *= 0.98 + 0.02 * f; }
    this.pts.geometry.attributes.position.needsUpdate = true; this.pts.geometry.attributes.color.needsUpdate = true;
    for (const S of this.smoke) { if (!S.s.visible) continue; S.l -= dt; if (S.l <= 0) { S.s.visible = false; continue; } S.s.position.addScaledVector(S.v, dt); const a = 1 - S.l / 0.9; S.s.scale.setScalar(0.6 + a * 1.6); S.s.material.opacity = 0.3 * (1 - a); }
  }
}
