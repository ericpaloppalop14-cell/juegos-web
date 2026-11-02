import { THREE, BEND, softTexture, rand, clamp } from './util.js?v=4';

const VS = `uniform float uBend; uniform float uBendX; uniform float uScale; attribute float size; attribute vec4 aCol; varying vec4 vC;
void main(){ vC=aCol; vec4 mv=modelViewMatrix*vec4(position,1.); mv.y-=uBend*mv.z*mv.z; mv.x+=uBendX*mv.z*mv.z; gl_Position=projectionMatrix*mv; gl_PointSize=size*uScale/max(0.3,-mv.z); }`;
const FS = `uniform sampler2D uMap; varying vec4 vC; void main(){ vec4 t=texture2D(uMap,gl_PointCoord); gl_FragColor=vec4(vC.rgb, vC.a*t.a); if(gl_FragColor.a<0.01) discard; }`;

class Pool {
  constructor(n, additive, tex) {
    this.n = n; this.i = 0;
    this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n);
    this.s0 = new Float32Array(n); this.s1 = new Float32Array(n); this.c0 = new Float32Array(n * 4); this.c1 = new Float32Array(n * 4); this.g = new Float32Array(n); this.d = new Float32Array(n);
    this.size = new Float32Array(n); this.col = new Float32Array(n * 4);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage)); geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage)); geo.setAttribute('aCol', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({ uniforms: { uBend: BEND.uBend, uBendX: BEND.uBendX, uScale: { value: 700 }, uMap: { value: tex } }, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
    this.pts = new THREE.Points(geo, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = additive ? 6 : 5; this.geo = geo; this.active = 0;
    for (let k = 0; k < n; k++) this.life[k] = 0;
  }
  emit(x, y, z, vx, vy, vz, life, s0, s1, c0, c1, grav = 0, drag = 0) {
    const k = this.i; this.i = (this.i + 1) % this.n; const a = k * 3, c = k * 4;
    this.p[a] = x; this.p[a + 1] = y; this.p[a + 2] = z; this.v[a] = vx; this.v[a + 1] = vy; this.v[a + 2] = vz; this.life[k] = life; this.max[k] = life; this.s0[k] = s0; this.s1[k] = s1; this.g[k] = grav; this.d[k] = drag;
    for (let j = 0; j < 4; j++) { this.c0[c + j] = c0[j]; this.c1[c + j] = c1[j]; }
  }
  update(dt) {
    let any = false;
    for (let k = 0; k < this.n; k++) {
      let l = this.life[k]; const a = k * 3, c = k * 4;
      if (l <= 0) { this.size[k] = 0; continue; }
      l -= dt; this.life[k] = l; if (l <= 0) { this.size[k] = 0; this.col[c + 3] = 0; continue; }
      any = true; const t = 1 - l / this.max[k];
      const dr = 1 - this.d[k] * dt; this.v[a] *= dr; this.v[a + 1] = this.v[a + 1] * dr - this.g[k] * dt; this.v[a + 2] *= dr;
      this.p[a] += this.v[a] * dt; this.p[a + 1] += this.v[a + 1] * dt; this.p[a + 2] += this.v[a + 2] * dt;
      this.size[k] = this.s0[k] + (this.s1[k] - this.s0[k]) * t;
      for (let j = 0; j < 4; j++) this.col[c + j] = this.c0[c + j] + (this.c1[c + j] - this.c0[c + j]) * t;
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.size.needsUpdate = true; this.geo.attributes.aCol.needsUpdate = true;
  }
  clear() { this.life.fill(0); this.size.fill(0); }
}
const C = (h, a = 1) => { const c = new THREE.Color(h); return [c.r, c.g, c.b, a]; };

export class FX {
  constructor(scene) {
    const soft = softTexture(64);
    const hard = softTexture(64, [[0, 'rgba(255,255,255,1)'], [0.7, 'rgba(255,255,255,1)'], [0.78, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0)']]);
    this.add = new Pool(700, true, soft); this.nrm = new Pool(500, false, soft); this.dots = new Pool(450, false, hard);
    scene.add(this.add.pts, this.nrm.pts, this.dots.pts);
    // speed lines
    const n = 36; this.lines = [];
    const g = new THREE.BoxGeometry(0.035, 0.035, 1); this.lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    this.lineMesh = new THREE.InstancedMesh(g, this.lineMat, n); this.lineMesh.frustumCulled = false; this.lineMesh.renderOrder = 7; scene.add(this.lineMesh);
    for (let i = 0; i < n; i++) this.lines.push({ x: 0, y: 0, z: 0, l: 1, v: 0 });
    this.lineSeed(0, 0);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3();
    this.shake = 0; this.shakeT = 0;
  }
  lineSeed(cx, cz) { for (const L of this.lines) { const a = Math.random() * Math.PI * 2, r = 2.2 + Math.random() * 5; L.x = Math.cos(a) * r; L.y = 1.2 + Math.abs(Math.sin(a)) * r * 0.9; L.z = cz - 4 - Math.random() * 40; L.l = 2 + Math.random() * 6; L.v = 20 + Math.random() * 20; } }
  updateLines(px, pz, speed, intensity, dt) {
    this.lineMat.opacity = clamp(intensity, 0, 1) * 0.5; this.lineMesh.visible = intensity > 0.02;
    if (!this.lineMesh.visible) return;
    this.lines.forEach((L, i) => {
      L.z += (L.v + speed * 0.5) * dt; if (L.z > pz + 6) { const a = Math.random() * Math.PI * 2, r = 2.8 + Math.random() * 5; L.x = Math.cos(a) * r; L.y = 0.8 + Math.abs(Math.sin(a)) * r * 0.9; L.z = pz - 40 - Math.random() * 20; L.l = 3 + Math.random() * 7 + speed * 0.1; }
      this._m.compose(this._p.set(px * 0.5 + L.x, L.y, L.z), this._q.identity(), this._s.set(1, 1, L.l)); this.lineMesh.setMatrixAt(i, this._m);
    });
    this.lineMesh.instanceMatrix.needsUpdate = true;
  }
  update(dt, viewH, fov) {
    const sc = viewH / (2 * Math.tan(fov * Math.PI / 360));
    for (const p of [this.add, this.nrm, this.dots]) { p.mat.uniforms.uScale.value = sc; p.update(dt); }
  }
  /* ---------- presets ---------- */
  sparkle(x, y, z, n = 6, col = 0xffe36a) { const c0 = C(col), c1 = C(0xffffff, 0); for (let i = 0; i < n; i++) this.add.emit(x, y, z, rand(-2.5, 2.5), rand(0.5, 4), rand(-2.5, 2.5), rand(0.3, 0.55), 0.35, 0.05, c0, c1, 6, 1); }
  burst(x, y, z, n, cols, speed = 6, life = 0.7, size = 0.28, grav = 12) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, b = Math.random() * 3.14 - 1.57, s = speed * (0.4 + Math.random() * 0.8); const c = C(cols[i % cols.length]); this.dots.emit(x, y, z, Math.cos(a) * Math.cos(b) * s, Math.sin(b) * s + 2, Math.sin(a) * Math.cos(b) * s, life * (0.6 + Math.random() * 0.6), size, size * 0.3, c, [c[0], c[1], c[2], 0], grav, 0.5); } }
  dust(x, y, z, n = 1, col = 0xd8d0c0, vz = 3) { const c0 = C(col, 0.55), c1 = C(col, 0); for (let i = 0; i < n; i++) this.nrm.emit(x + rand(-0.3, 0.3), y + 0.1, z + rand(-0.2, 0.4), rand(-0.8, 0.8), rand(0.3, 1.2), vz + rand(0, 2), rand(0.35, 0.6), 0.25, 0.9, c0, c1, -0.5, 1.5); }
  flame(x, y, z, vz, big = 1) { const c0 = C(0xffc040, 0.9), c1 = C(0xff3a10, 0); this.add.emit(x + rand(-0.05, 0.05), y + rand(-0.05, 0.05), z, rand(-0.4, 0.4), rand(-0.3, 0.3), vz + rand(2, 6), rand(0.18, 0.35) * big, 0.38 * big, 0.08, c0, c1, 0, 2); }
  smoke(x, y, z, vz) { const c0 = C(0xcfcfd8, 0.4), c1 = C(0x9a9aa4, 0); this.nrm.emit(x, y, z, rand(-0.5, 0.5), rand(0.2, 1), vz + rand(2, 5), rand(0.5, 0.9), 0.3, 1.4, c0, c1, -0.4, 1); }
  confetti(x, y, z, n = 30) { const cols = [0xff4f8a, 0xffd23c, 0x4fe8ff, 0x7bff4f, 0xffffff, 0xb78cff]; for (let i = 0; i < n; i++) { const c = C(cols[i % 6]); this.dots.emit(x + rand(-2, 2), y + rand(0, 2), z + rand(-3, 1), rand(-3, 3), rand(3, 8), rand(-3, 2), rand(0.9, 1.6), 0.18, 0.12, c, [c[0], c[1], c[2], 0.0], 9, 0.8); } }
  stars(x, y, z, n = 14) { for (let i = 0; i < n; i++) { const a = i / n * 6.283; this.add.emit(x, y, z, Math.cos(a) * 5, rand(2, 6), Math.sin(a) * 5, 0.8, 0.5, 0.1, C(0xffe36a), C(0xff8a1a, 0), 8, 0.5); } }
  firework(x, y, z, col) { const c = C(col); const c2 = C(0xffffff); for (let i = 0; i < 70; i++) { const a = Math.random() * 6.283, b = Math.acos(Math.random() * 2 - 1), s = 9 + Math.random() * 6; this.add.emit(x, y, z, Math.sin(b) * Math.cos(a) * s, Math.cos(b) * s, Math.sin(b) * Math.sin(a) * s, 1.4 + Math.random() * 0.8, 1.7, 0.3, i % 4 ? c : c2, [c[0], c[1], c[2], 0], 4, 1.9); } }
  ring(x, y, z, col = 0x4dff9a) { const c = C(col, 0.8); for (let i = 0; i < 28; i++) { const a = i / 28 * 6.283; this.add.emit(x, y, z, Math.cos(a) * 7, Math.sin(a) * 7, rand(-1, 1), 0.5, 0.6, 0.1, c, [c[0], c[1], c[2], 0], 0, 2.5); } }
  camShake(a) { this.shake = Math.max(this.shake, a); }
  clear() { this.add.clear(); this.nrm.clear(); this.dots.clear(); }
}
