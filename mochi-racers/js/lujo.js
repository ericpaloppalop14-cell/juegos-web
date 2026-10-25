// v41 «todo lujo de detalles»: cajas más ricas (núcleo, estrellitas en órbita, pulso, aparición elástica),
// rotura de caja con trozos y chispas, efectos al usar objetos y al recibir golpes (anillos, chispas, destello,
// sacudida, estirar y encoger), estelas en proyectiles, humo de escape, chispas de turbo, suspensión y caras que reaccionan.
// Todo en pocas llamadas de dibujo: 1 Points para todas las chispas, 1 InstancedMesh para los trozos y 6 anillos.
import * as THREE from 'three';
import { Race } from './race.js';

const V3 = THREE.Vector3, R = Math.random, TAU = Math.PI * 2;
const RAINBOW = ['#ff6fc0', '#ffb36b', '#ffe066', '#7ff5a0', '#7fd8ff', '#b98cff'];
const ITEMCOL = { turbo: '#ff8fd8', seta: '#ff6f8f', escudo: '#7ff5ff', iman: '#ff6f8f', misil: '#ff6f9a', osito: '#ff6fa0', charco: '#7ee3c4', rayo: '#ffe066', estrella: '#ffe066' };
const _c = new THREE.Color();

class Sparks {
  constructor(scene, n) {
    this.n = n; this.i = 0; this.alive = 0;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.sz = new Float32Array(n); this.al = new Float32Array(n);
    this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n); this.s0 = new Float32Array(n); this.grav = new Float32Array(n); this.drag = new Float32Array(n);
    for (let i = 0; i < n; i++) this.pos[i * 3 + 1] = -9999;
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('size', new THREE.BufferAttribute(this.sz, 1)); g.setAttribute('alpha', new THREE.BufferAttribute(this.al, 1));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { scale: { value: 400 } },
      vertexShader: 'attribute float size;attribute float alpha;varying vec3 vC;varying float vA;uniform float scale;void main(){vC=color;vA=alpha;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=size*scale/max(1.,-mv.z);gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'varying vec3 vC;varying float vA;void main(){vec2 d=gl_PointCoord-.5;float r=length(d);if(r>.5)discard;float s=smoothstep(.5,0.,r);float star=max(0.,1.-abs(d.x*d.y)*90.)*smoothstep(.5,.1,r);gl_FragColor=vec4(vC*(s*1.15+star*.6),(s+star*.4)*vA);}',
      vertexColors: true });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = 6; scene.add(this.pts);
  }
  emit(x, y, z, color, size, life, vx, vy, vz, grav = -6, drag = 1.5) {
    const i = this.i = (this.i + 1) % this.n, j = i * 3;
    this.pos[j] = x; this.pos[j + 1] = y; this.pos[j + 2] = z; this.vel[j] = vx; this.vel[j + 1] = vy; this.vel[j + 2] = vz;
    _c.set(color); this.col[j] = _c.r; this.col[j + 1] = _c.g; this.col[j + 2] = _c.b;
    this.s0[i] = size; this.sz[i] = size; this.life[i] = this.max[i] = life; this.al[i] = 1; this.grav[i] = grav; this.drag[i] = drag;
  }
  burst(p, cols, n, speed, size = 0.7, life = 0.6, up = 0.5, grav = -6) {
    for (let k = 0; k < n; k++) { const a = R() * TAU, u = R() * 2 - 1, s = speed * (0.4 + R() * 0.6), h = Math.sqrt(1 - u * u);
      this.emit(p.x, p.y, p.z, cols[k % cols.length], size * (0.6 + R() * 0.8), life * (0.6 + R() * 0.7), Math.cos(a) * h * s, (Math.abs(u) + up) * s, Math.sin(a) * h * s, grav); }
  }
  update(dt) {
    const P = this.pos, V = this.vel;
    for (let i = 0; i < this.n; i++) { if (this.life[i] <= 0) continue; const j = i * 3;
      this.life[i] -= dt; if (this.life[i] <= 0) { P[j + 1] = -9999; this.al[i] = 0; continue; }
      const f = Math.exp(-this.drag[i] * dt); V[j] *= f; V[j + 2] *= f; V[j + 1] = V[j + 1] * f + this.grav[i] * dt;
      P[j] += V[j] * dt; P[j + 1] += V[j + 1] * dt; P[j + 2] += V[j + 2] * dt;
      const k = this.life[i] / this.max[i]; this.al[i] = Math.min(1, k * 2.2); this.sz[i] = this.s0[i] * (0.35 + 0.65 * Math.sqrt(k)); }
    const a = this.geo.attributes; a.position.needsUpdate = a.size.needsUpdate = a.alpha.needsUpdate = a.color.needsUpdate = true;
  }
}

function boxBits() { // geometría compartida para las estrellitas que orbitan la caja
  if (boxBits.g) return boxBits.g;
  const s = new THREE.Shape(); for (let i = 0; i <= 10; i++) { const a = i / 10 * TAU + Math.PI / 2, r = i % 2 ? 0.11 : 0.26; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  boxBits.g = { star: new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 }), core: new THREE.IcosahedronGeometry(0.42, 1), ring: new THREE.TorusGeometry(1.35, 0.045, 6, 48) };
  boxBits.g.star.center(); Object.values(boxBits.g).forEach(g => g._shared = true); return boxBits.g;
}

class Lujo {
  constructor(race) {
    this.r = race; const hi = race.quality.hi, sc = race.scene; this.hi = hi;
    this.sp = new Sparks(sc, hi ? 700 : 420);
    // trozos de caja (uno por instancia)
    const sg = new THREE.BoxGeometry(0.42, 0.42, 0.42); sg._shared = false;
    this.NS = hi ? 48 : 32; this.shards = new THREE.InstancedMesh(sg, new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.1, emissive: '#552255', emissiveIntensity: 0.4 }), this.NS);
    this.shards.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.shards.frustumCulled = false; this.sh = []; this.si = 0;
    const m4 = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.NS; i++) { this.shards.setMatrixAt(i, m4); this.shards.setColorAt(i, _c.set(RAINBOW[i % 6])); this.sh.push({ life: 0, p: new V3(), v: new V3(), r: new THREE.Euler(), w: new V3() }); }
    sc.add(this.shards);
    // anillos expansivos
    this.rings = []; const rg = new THREE.RingGeometry(0.82, 1, 40);
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })); m.visible = false; m.renderOrder = 7; sc.add(m); this.rings.push({ m, t: 0, max: 0.5, s: 4, ground: false }); }
    this.ri = 0;
    // cajas más ricas
    const B = boxBits();
    this.boxes = (race.track.boxes || []).map((b, i) => {
      const g = b.mesh, orb = new THREE.Group(); g.add(orb);
      const core = new THREE.Mesh(B.core, new THREE.MeshBasicMaterial({ color: '#fff6c8', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })); g.add(core);
      for (let k = 0; k < 3; k++) { const s = new THREE.Mesh(B.star, new THREE.MeshStandardMaterial({ color: RAINBOW[(k * 2 + i) % 6], emissive: RAINBOW[(k * 2 + i) % 6], emissiveIntensity: 0.6, roughness: 0.3 })); const a = k / 3 * TAU; s.position.set(Math.cos(a) * 1.45, Math.sin(a * 2) * 0.35, Math.sin(a) * 1.45); orb.add(s); }
      const ring = new THREE.Mesh(B.ring, new THREE.MeshBasicMaterial({ color: '#fff0a0', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })); ring.rotation.x = Math.PI / 2; orb.add(ring);
      return { b, orb, core, ring, prevT: 0, pop: 1, ph: i * 1.7 };
    });
    this.flash = document.getElementById('ljFlash');
    this.exT = 0; this.prevRoll = 0;
    for (const k of race.karts) { const v = k.mesh.userData.vehicle; k._lj = { vy0: v ? v.position.y : 0, air: false, land: 0, pop: 0, puff: R() * 0.1, spark: 0, blinkT: 2 + R() * 3 }; }
  }
  ring(p, color, size = 5, life = 0.45, ground = false) {
    const r = this.rings[this.ri = (this.ri + 1) % this.rings.length]; r.m.position.copy(p); r.m.material.color.set(color); r.t = 0; r.max = life; r.s = size; r.ground = ground; r.m.visible = true;
  }
  shardBurst(p) {
    for (let k = 0; k < (this.hi ? 10 : 7); k++) { const s = this.sh[this.si = (this.si + 1) % this.NS], a = R() * TAU, sp = 6 + R() * 7;
      s.life = 0.9 + R() * 0.4; s.p.copy(p); s.v.set(Math.cos(a) * sp, 4 + R() * 7, Math.sin(a) * sp); s.w.set(R() * 14, R() * 14, R() * 14); s.r.set(R() * 6, R() * 6, R() * 6); s.k = this.si; }
  }
  flashScreen(cls) { const f = this.flash; if (!f) return; f.className = ''; void f.offsetWidth; f.className = cls; }
  near(k, d = 70) { const P = this.r.player; return !P || k === P || k.pos.distanceToSquared(P.pos) < d * d; }

  onBox(b, k) { const p = b.pos.clone(); this.shardBurst(p); this.sp.burst(p, RAINBOW, this.hi ? 26 : 16, 9, 0.9, 0.7); this.ring(p, '#fff6b0', 6, 0.4);
    if (k && k.isPlayer) { this.flashScreen('box'); k._lj.pop = 1; } }
  onUse(k, it) { if (!this.near(k)) return; const c = ITEMCOL[it] || RAINBOW[(it || '').length % 6], p = k.pos.clone(); p.y += 1.2;
    this.sp.burst(p, [c, '#ffffff', '#ffe066'], this.hi ? 22 : 14, 8, 0.8, 0.6, 0.4); this.ring(p, c, 5.5, 0.4); k._lj.pop = 1;
    k.expr = 'happy'; k.exprT = Math.max(k.exprT || 0, 0.7);
    if (k.isPlayer) { this.flashScreen('use'); this.r.kick = Math.max(this.r.kick, 0.35); } }
  onHit(k, by) { const p = k.pos.clone(); p.y += 1;
    if (this.near(k)) { this.sp.burst(p, ['#ffe066', '#ffffff', '#ff8fc0'], this.hi ? 26 : 16, 10, 0.9, 0.7, 0.6); this.ring(p, '#ffd84a', 4.5, 0.4); this.ring(p.clone().setY(k.y + 0.2), '#ffffff', 4, 0.5, true); }
    k.expr = 'strain'; k.exprT = Math.max(k.exprT || 0, 1.3); k._lj.pop = -1;
    if (k.isPlayer) { this.flashScreen('hit'); this.r.shakeT = Math.max(this.r.shakeT || 0, 0.3); }
    if (by && by !== k && by.exprT !== undefined) { by.expr = 'happy'; by.exprT = Math.max(by.exprT || 0, 1.2); } }

  update(dt) {
    const r = this.r, t = r.time, P = r.player, sp = this.sp;
    // cajas
    for (const x of this.boxes) { const b = x.b;
      if (b.t > 0 && x.prevT <= 0) this.onBox(b, r.karts.find(k => k.pos.distanceToSquared(b.pos) < 30)); // rota en este fotograma
      if (b.t <= 0 && x.prevT > 0) x.pop = 0; x.prevT = b.t;
      if (b.t > 0 || !b.mesh.visible) continue;
      if (P && b.pos.distanceToSquared(P.pos) > 140 * 140) continue;
      x.pop = Math.min(1, x.pop + dt * 2.6); const e = x.pop < 1 ? 1 + Math.sin(x.pop * Math.PI * 1.5) * (1 - x.pop) * 0.9 - (1 - x.pop) : 1;
      const pul = 1 + Math.sin(t * 4 + x.ph) * 0.05; b.mesh.scale.setScalar(Math.max(0.05, e * pul));
      x.orb.rotation.y = -t * 2.2 - b.mesh.rotation.y; x.orb.rotation.x = -b.mesh.rotation.x; x.core.material.opacity = 0.4 + Math.sin(t * 6 + x.ph) * 0.2; x.core.rotation.set(t * 1.3, t * 0.9, 0);
      x.ring.material.opacity = 0.35 + Math.sin(t * 3 + x.ph) * 0.2; x.ring.scale.setScalar(1 + Math.sin(t * 2 + x.ph) * 0.08);
      if (R() < dt * (this.hi ? 5 : 3)) { const a = R() * TAU; sp.emit(b.pos.x + Math.cos(a) * 1.6, b.pos.y + (R() - 0.3) * 1.6, b.pos.z + Math.sin(a) * 1.6, RAINBOW[(R() * 6) | 0], 0.45, 0.7, 0, 1.2, 0, 0, 0.5); }
    }
    // karts
    this.exT += dt;
    for (const k of r.karts) { const L = k._lj; if (!L) continue; const near = this.near(k, this.hi ? 70 : 45), m = k.mesh, u = m.userData;
      if (!m.visible) continue;
      const fX = Math.sin(k.yaw), fZ = Math.cos(k.yaw), spd = Math.abs(k.fs || 0);
      // aterrizaje: estirar y encoger
      if (L.air && !k.air) { L.land = 1; if (near) { sp.burst(new V3(k.pos.x, k.y + 0.2, k.pos.z), ['#ffffff', '#f4e6ff'], 8, 5, 0.7, 0.45, -0.3, -2); } }
      L.air = k.air; L.land = Math.max(0, L.land - dt * 3.5);
      L.pop = L.pop > 0 ? Math.max(0, L.pop - dt * 3) : Math.min(0, L.pop + dt * 3);
      const v = u.vehicle; if (v) {
        const bob = k.air ? 0 : Math.sin(t * (14 + spd * 0.25) + k.pos.x) * 0.025 * Math.min(1, spd / 25);
        v.position.y = L.vy0 + bob - L.land * 0.12;
        const sq = L.land * 0.22 + (L.pop > 0 ? Math.sin(L.pop * Math.PI) * 0.18 : 0), hs = L.pop < 0 ? Math.sin(-L.pop * Math.PI) * 0.2 : 0;
        v.scale.set(1 + sq * 0.6 + hs * 0.4, 1 - sq + hs * 0.5 - (L.pop > 0 ? -Math.sin(L.pop * Math.PI) * 0.25 : 0), 1 + sq * 0.6);
      }
      if (!near) continue;
      const bx = k.pos.x - fX * 1.9 * k.megaS, bz = k.pos.z - fZ * 1.9 * k.megaS, by = k.y + 0.55 * k.megaS;
      // humo de escape suave
      L.puff -= dt; if (L.puff <= 0 && !k.air && spd > 4) { L.puff = k.isPlayer ? 0.06 : 0.12;
        sp.emit(bx + (R() - 0.5) * 0.4, by, bz + (R() - 0.5) * 0.4, k.boostT > 0 ? '#ffb36b' : '#d9cfe6', 0.55 + R() * 0.3, 0.55, -fX * 2 + (R() - 0.5), 1 + R(), -fZ * 2 + (R() - 0.5), 1.2, 2); }
      // turbo: chispas y lenguas de fuego
      if (k.boostT > 0 || k.megaT > 0 || k.rocketT > 0) for (let n = 0; n < (k.isPlayer ? 3 : 1); n++)
        sp.emit(bx + (R() - 0.5) * 0.6, by + (R() - 0.3) * 0.4, bz + (R() - 0.5) * 0.6, ['#ffe066', '#ff8fd8', '#ffffff', '#ffb36b'][(R() * 4) | 0], 0.5 + R() * 0.5, 0.35, -fX * (6 + R() * 6) + (R() - 0.5) * 3, R() * 3, -fZ * (6 + R() * 6) + (R() - 0.5) * 3, -3, 1);
      // derrape: chispas de colores en las ruedas traseras
      if (k.driftDir && !k.air && R() < (k.isPlayer ? 0.9 : 0.4)) { const lvl = k.dLvl || 0, col = ['#ffffff', '#7fd8ff', '#ffb36b', '#ff8fd8'][Math.min(3, lvl)], rx = Math.cos(k.yaw), rz = -Math.sin(k.yaw);
        for (const s of [-1, 1]) sp.emit(bx + rx * s * 0.9, k.y + 0.15, bz + rz * s * 0.9, col, 0.35 + lvl * 0.12, 0.3, (R() - 0.5) * 5 - fX * 2, 2 + R() * 3, (R() - 0.5) * 5 - fZ * 2, -14, 0.8); }
      // estrellitas al girar tras un golpe
      if (k.spinT > 0 && R() < 0.5) { const a = t * 9 + R(); sp.emit(k.pos.x + Math.cos(a) * 1.2, k.y + 2.4 * k.megaS, k.pos.z + Math.sin(a) * 1.2, '#ffe066', 0.5, 0.3, 0, 0.5, 0, 0, 1); }
    }
    // estelas de proyectiles (de todos los sistemas)
    const lists = [r.projs, r.fx && r.fx.projs, r.fx && r.fx.L && r.fx.L.projs];
    for (const L of lists) if (L) for (const p of L) { const m = p.mesh; if (!m || !m.visible || p.dead || (p.life != null && p.life <= 0)) continue; if (R() > (this.hi ? 0.9 : 0.6)) continue;
      const q = m.position; if (P && q.distanceToSquared(P.pos) > 90 * 90) continue;
      sp.emit(q.x + (R() - 0.5) * 0.5, q.y + 0.7 + (R() - 0.5) * 0.5, q.z + (R() - 0.5) * 0.5, RAINBOW[(R() * 6) | 0], 0.55, 0.45, (R() - 0.5), 0.6, (R() - 0.5), 0, 1.5); }
    // ruleta: al decidir el objeto, chispas y salto en el marcador
    if (P) { if (this.prevRoll > 0 && P.rollT <= 0 && P.item) { const h = document.getElementById('hItem'); if (h) { h.classList.remove('land'); void h.offsetWidth; h.classList.add('land'); } } this.prevRoll = P.rollT; }
    // trozos y anillos
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new V3(); let any = false;
    for (const s of this.sh) { if (s.life <= 0) continue; any = true; s.life -= dt; s.v.y -= 22 * dt; s.p.addScaledVector(s.v, dt); s.r.x += s.w.x * dt; s.r.y += s.w.y * dt; s.r.z += s.w.z * dt;
      const sc = s.life <= 0 ? 0 : Math.min(1, s.life * 2.5) * 1.0; q.setFromEuler(s.r); s3.setScalar(sc); m4.compose(s.p, q, s3); this.shards.setMatrixAt(s.k, m4); }
    if (any || this._shAny) this.shards.instanceMatrix.needsUpdate = true; this._shAny = any;
    const cam = r.camera;
    for (const g of this.rings) { if (!g.m.visible) continue; g.t += dt; const k = g.t / g.max; if (k >= 1) { g.m.visible = false; continue; }
      const e = 1 - (1 - k) * (1 - k); g.m.scale.setScalar(0.3 + e * g.s); g.m.material.opacity = (1 - k) * 0.85;
      if (g.ground) g.m.rotation.set(-Math.PI / 2, 0, 0); else if (cam) g.m.quaternion.copy(cam.quaternion); }
    sp.mat.uniforms.scale.value = (r.app && r.app.renderer ? r.app.renderer.domElement.height : innerHeight) * 0.5;
    sp.update(dt);
  }
}

// ---------- enganches ----------
const _sp = Race.prototype.setupParticles;
Race.prototype.setupParticles = function () { _sp.call(this); try { this.lj = new Lujo(this); } catch (e) { console.warn('lujo', e); } };
const _up = Race.prototype.update;
Race.prototype.update = function (dt) { _up.call(this, dt); if (this.lj) this.lj.update(dt); };
const _use = Race.prototype.useItem;
Race.prototype.useItem = function (k) { const it = k.item; const r = _use.call(this, k); if (this.lj) this.lj.onUse(k, it); return r; };
const _hit = Race.prototype.hitKart;
Race.prototype.hitKart = function (k, why, by) { const ok = _hit.call(this, k, why, by); if (ok && this.lj) this.lj.onHit(k, by); return ok; };
const _sq = Race.prototype.squash;
Race.prototype.squash = function (v, by) { const before = v.squashT; _sq.call(this, v, by); if (this.lj && v.squashT > 0 && !(before > 0)) this.lj.onHit(v, by); };
// v42: adornos animados de objetos + animación de espera de proyectiles
import { tickDeco, DECO } from './itemdeco.js';
const _sp2 = Race.prototype.setupParticles;
Race.prototype.setupParticles = function () { DECO.hi = !!(this.quality && this.quality.hi); _sp2.call(this); };
const _up2 = Race.prototype.update;
Race.prototype.update = function (dt) { _up2.call(this, dt); try { tickDeco(dt); const t = this.time || 0; for (const p of this.projs || []) { const f = p.mesh && p.mesh.userData.idle; if (f) f(t); } } catch (e) { console.warn('deco', e); } };
