// ======================================================================
//  MOCHI RACERS v37 · gran mejora gráfica (noche 4)
//  Horizonte con 3 capas y parallax, gominolas animadas junto a la pista, sombras de contacto
//  bajo los karts, polvo y chispas nuevos, arco de meta con luces y confeti, podio con focos.
//  Solo visual: no usa Math.random (no cambia la partida) ni toca controles ni física.
//  Calidad automática: baja sola si el móvil va lento.
// ======================================================================
import * as THREE from 'three';
const V3 = THREE.Vector3, C = c => new THREE.Color(c);
let sd = 12345; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
const texCache = {};
function blobTex() { if (texCache.blob) return texCache.blob; const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return texCache.blob = new THREE.CanvasTexture(cv); }
function softTex() { if (texCache.soft) return texCache.soft; const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return texCache.soft = new THREE.CanvasTexture(cv); }

// ---------- horizonte: siluetas en 3 anillos ----------
function hillTex(cols, kind, seed) {
  const cv = document.createElement('canvas'); cv.width = 2048; cv.height = 256; const x = cv.getContext('2d'); sd = seed;
  const [c1, c2, c3] = cols; const ph = [rnd() * 6, rnd() * 6, rnd() * 6];
  const prof = u => kind === 'cloud'
    ? 0.55 + 0.18 * Math.abs(Math.sin(u * 37 + ph[0])) + 0.12 * Math.abs(Math.sin(u * 83 + ph[1])) + 0.08 * Math.abs(Math.sin(u * 151 + ph[2]))
    : kind === 'city' ? 0.35 + (Math.floor(Math.abs(Math.sin(Math.floor(u * 90) * 12.9898 + seed) * 43758) % 100) / 100) * 0.5
    : 0.42 + 0.2 * Math.sin(u * 6.283 * 5 + ph[0]) + 0.12 * Math.sin(u * 6.283 * 13 + ph[1]) + 0.05 * Math.sin(u * 6.283 * 31 + ph[2]);
  const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, c1); gr.addColorStop(0.55, c2); gr.addColorStop(1, c3); x.fillStyle = gr;
  x.beginPath(); x.moveTo(0, 256); for (let i = 0; i <= 512; i++) { const u = i / 512; const step = kind === 'city' ? Math.floor(u * 90) / 90 : u; x.lineTo(u * 2048, 256 - prof(kind === 'city' ? step : u) * 230); } x.lineTo(2048, 256); x.closePath(); x.fill();
  // brillo en las cumbres
  x.globalCompositeOperation = 'source-atop'; x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 5; x.beginPath(); for (let i = 0; i <= 512; i++) { const u = i / 512; x.lineTo(u * 2048, 256 - prof(kind === 'city' ? Math.floor(u * 90) / 90 : u) * 230 + 3); } x.stroke();
  if (kind === 'city') { x.fillStyle = 'rgba(255,240,160,0.85)'; for (let i = 0; i < 900; i++) { const u = rnd(); const hgt = prof(Math.floor(u * 90) / 90) * 230; const yy = 256 - rnd() * hgt; x.fillRect(u * 2048, yy, 3, 4); } }
  if (kind === 'hill') { for (let i = 0; i < 160; i++) { const u = rnd(); const top = 256 - prof(u) * 230; x.fillStyle = `rgba(255,255,255,${0.08 + rnd() * 0.1})`; x.beginPath(); x.arc(u * 2048, top + 20 + rnd() * 120, 6 + rnd() * 16, 0, 6.3); x.fill(); } }
  x.globalCompositeOperation = 'source-over';
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
function horizon(race, n4) {
  const c = race.cup, sky0 = C(c.sky[0]), sky1 = C(c.sky[1]), fog = C(c.fog);
  const dark = c.theme === 'storm' || (c.theme === 'space' && c.ground == null && ['#120a33', '#2c1a5a'].includes(c.sky[0]));
  const floaty = c.ground == null; const kind = c.theme === 'storm' ? 'city' : floaty ? 'cloud' : 'hill';
  const base = floaty ? C(dark ? '#4a3080' : '#ffffff') : C(c.ground || '#bff2d6');
  const S = race.track.S; let cy = 0; for (const s of S) cy += s.p.y; cy /= S.length;
  const rings = []; const L = [[1120, 0.92, 230, 0.75], [900, 0.75, 170, 0.5], [700, 0.5, 120, 0.25]];
  L.forEach(([r, par, hgt, haze], i) => {
    const col = base.clone().lerp(C(['#d6c8ff', '#ffd0ea', '#c8f5e0'][i]), dark ? 0.15 : 0.3).lerp(sky1, haze).lerp(fog, haze * 0.4);
    const top = col.clone().lerp(C('#ffffff'), dark ? 0.08 : 0.25), bot = col.clone().multiplyScalar(dark ? 0.7 : 0.92);
    const tex = hillTex([top.getStyle(), col.getStyle(), bot.getStyle()], kind, 99 + i * 31); tex.repeat.x = 2 + i;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, hgt, 96, 1, true), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.BackSide, depthWrite: false, fog: false }));
    m.renderOrder = -9 + i; m.userData.par = par; m.userData.y = cy + hgt / 2 - (floaty ? 90 + i * 10 : 18 + i * 4); m.frustumCulled = false; race.scene.add(m); rings.push(m);
  });
  // halo cálido en el horizonte
  { const g = new THREE.Mesh(new THREE.CylinderGeometry(1180, 1180, 160, 64, 1, true), new THREE.ShaderMaterial({ transparent: true, side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { c: { value: dark ? C('#ff5fd2') : sky1.clone().lerp(C('#fff2d0'), 0.5) } },
      vertexShader: 'varying float vy; void main(){ vy = uv.y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} ', fragmentShader: 'uniform vec3 c; varying float vy; void main(){ gl_FragColor = vec4(c, pow(1.0 - vy, 2.2) * 0.55); }' }));
    g.renderOrder = -9.5; g.userData.par = 0.95; g.userData.y = cy + 40 - (floaty ? 80 : 0); g.frustumCulled = false; race.scene.add(g); rings.push(g); }
  n4.rings = rings;
}

// ---------- gominolas que saltan junto a la pista ----------
function gummyGeo() {
  const parts = []; const add = (g, col, m) => { g = g.index ? g.toNonIndexed() : g; g.applyMatrix4(m); const n = g.attributes.position.count, a = new Float32Array(n * 3); const cc = C(col); for (let i = 0; i < n; i++) { a[i * 3] = cc.r; a[i * 3 + 1] = cc.g; a[i * 3 + 2] = cc.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); parts.push(g); };
  const M = (x, y, z, sx, sy, sz) => new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion(), new V3(sx, sy ?? sx, sz ?? sx));
  add(new THREE.SphereGeometry(1, 18, 12), '#ffffff', M(0, 1, 0, 1, 1.15, 1));
  for (const s of [-1, 1]) { add(new THREE.SphereGeometry(1, 10, 8), '#2a1838', M(s * 0.36, 1.3, 0.86, 0.15, 0.2, 0.1)); add(new THREE.SphereGeometry(1, 6, 4), '#ffffff', M(s * 0.36 + 0.05, 1.37, 0.95, 0.05)); add(new THREE.SphereGeometry(1, 8, 6), '#ff9fc0', M(s * 0.6, 1.05, 0.75, 0.16, 0.1, 0.08)); }
  add(new THREE.SphereGeometry(1, 8, 6), '#2a1838', M(0, 1.02, 0.97, 0.12, 0.07, 0.06));
  for (const s of [-1, 1]) add(new THREE.SphereGeometry(1, 8, 6), '#ffffff', M(s * 1.0, 1.25, 0.1, 0.22, 0.32, 0.22)); // bracitos
  const g = new THREE.BufferGeometry(); for (const k of ['position', 'normal', 'color']) { const arr = []; for (const p of parts) arr.push(...p.attributes[k].array); g.setAttribute(k, new THREE.Float32BufferAttribute(arr, 3)); }
  g.computeBoundingSphere(); return g;
}
function gummies(race, n4, hi) {
  const T = race.track, S = T.S, N = T.N, floaty = race.cup.ground == null; const spots = []; sd = 777;
  const every = Math.max(3, Math.round(N / ((hi ? 150 : 80) / 1.3)));
  for (let i = 5; i < N - 2 && spots.length < (hi ? 150 : 80); i += every) { const s = S[i]; if (s.p.y > 1.5 && !floaty) continue;
    for (const side of [-1, 1]) { if (rnd() < 0.2) continue; const d = side * (s.wall + 2.6 + rnd() * 5); const x = s.p.x + s.right.x * d, z = s.p.z + s.right.z * d;
      if (T.inShortcut && T.inShortcut(x, z) != null) continue; let ok = true; for (let j = 0; j < N; j += 2) { const q = S[j]; if ((q.p.x - x) ** 2 + (q.p.z - z) ** 2 < (q.wall + 1.2) ** 2) { ok = false; break; } } if (!ok) continue;
      spots.push({ x, y: s.p.y + (floaty ? 1.5 : -0.4), z, yaw: Math.atan2(-s.right.x * side, -s.right.z * side), sc: 1.4 + rnd() * 0.9, ph: rnd() * 6.3, sp: 3 + rnd() * 2.5, fl: floaty }); } }
  if (!spots.length) return;
  const pal = ['#ff7fb6', '#7fd8ff', '#ffe066', '#9dff7a', '#c79bff', '#ff9f5f', '#5ff5d2'];
  const mat = new THREE.MeshToonMaterial({ vertexColors: true, color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.08 });
  const im = new THREE.InstancedMesh(gummyGeo(), mat, spots.length); im.frustumCulled = false; im.castShadow = false;
  spots.forEach((p, i) => im.setColorAt(i, C(pal[i % pal.length])));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new V3(), sc = new V3(), up = new V3(0, 1, 0);
  const upd = t => { for (let i = 0; i < spots.length; i++) { const p = spots[i]; const ph = t * p.sp + p.ph;
      let y = p.y, sx = 1, sy = 1; if (p.fl) { y += Math.sin(ph * 0.5) * 0.6; } else { const h = Math.abs(Math.sin(ph * 0.5)); y += h * 1.6; const land = Math.max(0, 1 - h * 5); sy = 1 - land * 0.28; sx = 1 + land * 0.18; }
      q.setFromAxisAngle(up, p.yaw + Math.sin(ph * 0.25) * 0.4); v.set(p.x, y, p.z); sc.set(sx * p.sc, sy * p.sc, sx * p.sc); m4.compose(v, q, sc); im.setMatrixAt(i, m4); }
    im.instanceMatrix.needsUpdate = true; };
  upd(0); race.scene.add(im); n4.gum = { im, upd };
}

// ---------- partículas propias (polvo suave + chispas) ----------
class Parts {
  constructor(scene, n, additive) { this.n = n; this.i = 0; const g = new THREE.BufferGeometry(); this.p = new Float32Array(n * 3).fill(-9999); this.c = new Float32Array(n * 4); this.s = new Float32Array(n); this.v = new Float32Array(n * 3); this.l = new Float32Array(n); this.ml = new Float32Array(n); this.gr = new Float32Array(n); this.s0 = new Float32Array(n);
    g.setAttribute('position', new THREE.BufferAttribute(this.p, 3)); g.setAttribute('aC', new THREE.BufferAttribute(this.c, 4)); g.setAttribute('aS', new THREE.BufferAttribute(this.s, 1));
    this.pts = new THREE.Points(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: { map: { value: softTex() }, k: { value: 300 } },
      vertexShader: 'attribute vec4 aC; attribute float aS; uniform float k; varying vec4 vC; void main(){ vC = aC; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = aS * k / max(1.0, -mv.z); gl_Position = projectionMatrix*mv; }',
      fragmentShader: 'uniform sampler2D map; varying vec4 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC.rgb, vC.a * t.a); if (gl_FragColor.a < 0.01) discard; }' }));
    this.pts.frustumCulled = false; this.pts.renderOrder = 5; scene.add(this.pts); }
  emit(x, y, z, vx, vy, vz, col, a, size, life, grow = 1, grav = 0) { const i = this.i = (this.i + 1) % this.n; this.p[i * 3] = x; this.p[i * 3 + 1] = y; this.p[i * 3 + 2] = z; this.v[i * 3] = vx; this.v[i * 3 + 1] = vy; this.v[i * 3 + 2] = vz;
    this.c[i * 4] = col.r; this.c[i * 4 + 1] = col.g; this.c[i * 4 + 2] = col.b; this.c[i * 4 + 3] = a; this.s[i] = this.s0[i] = size; this.l[i] = this.ml[i] = life; this.gr[i] = grow; this.c[i * 4 + 3] = a; this.v.a0 = this.v.a0 || new Float32Array(this.n); this.v.a0[i] = a; this.grav = this.grav || new Float32Array(this.n); this.grav[i] = grav; }
  step(dt) { const a0 = this.v.a0; if (!a0) return; for (let i = 0; i < this.n; i++) { if (this.l[i] <= 0) continue; this.l[i] -= dt; const f = Math.max(0, this.l[i] / this.ml[i]);
      this.v[i * 3 + 1] -= this.grav[i] * dt; this.v[i * 3] *= 1 - dt * 1.5; this.v[i * 3 + 2] *= 1 - dt * 1.5;
      this.p[i * 3] += this.v[i * 3] * dt; this.p[i * 3 + 1] += this.v[i * 3 + 1] * dt; this.p[i * 3 + 2] += this.v[i * 3 + 2] * dt;
      this.s[i] = this.s0[i] * (1 + (1 - f) * this.gr[i]); this.c[i * 4 + 3] = a0[i] * f; if (this.l[i] <= 0) this.p[i * 3 + 1] = -9999; }
    const g = this.pts.geometry; g.attributes.position.needsUpdate = true; g.attributes.aC.needsUpdate = true; g.attributes.aS.needsUpdate = true; }
}

// ---------- sombras de contacto ----------
function shadows(race, n4) {
  const mat = new THREE.MeshBasicMaterial({ map: blobTex(), color: race.cup.theme === 'storm' || race.cup.theme === 'space' ? '#100820' : '#3a1040', transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, fog: true });
  const geo = new THREE.PlaneGeometry(3.8, 4.9); geo.rotateX(-Math.PI / 2);
  n4.sh = race.karts.map(k => { const m = new THREE.Mesh(geo, mat.clone()); m.renderOrder = 1; m.frustumCulled = false; race.scene.add(m); return { m, k, gy: k.y }; });
}
const qy = new THREE.Quaternion(), upV = new V3(0, 1, 0);
function updShadows(n4) { for (const o of n4.sh) { const k = o.k, m = o.m; if (!k.air) o.gy = k.y; const h = Math.max(0, k.y - o.gy);
    m.position.set(k.pos.x, o.gy + 0.14, k.pos.z); if (!k.air && k.mesh) { m.quaternion.copy(k.mesh.quaternion); } else { qy.setFromAxisAngle(upV, k.yaw); m.quaternion.copy(qy); }
    const f = Math.max(0.25, 1 - h / 10); m.scale.setScalar((k.megaT > 0 ? (k.megaS || 1.8) : 1) * (1.1 - f * 0.1)); m.material.opacity = 0.85 * f; m.visible = !!(k.mesh && k.mesh.visible); } }

// ---------- arco de meta ----------
function finishArch(race, n4, hi) {
  const T = race.track, s = T.S[0], yaw = Math.atan2(s.fl.x, s.fl.z), g = new THREE.Group(); g.position.copy(s.p); g.rotation.y = yaw; race.scene.add(g);
  const R = s.w + 3.2, nb = hi ? 46 : 30; const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.34, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), nb);
  const m4 = new THREE.Matrix4(); for (let i = 0; i < nb; i++) { const a = Math.PI * (i / (nb - 1)); m4.makeTranslation(Math.cos(a) * R, 10.6 + Math.sin(a) * 5.2, 0.9); bulbs.setMatrixAt(i, m4); bulbs.setColorAt(i, C('#ffffff')); }
  bulbs.frustumCulled = false; g.add(bulbs);
  // arcoíris de cinta
  const cols = ['#ff5f8f', '#ffb84a', '#ffe066', '#7fe08a', '#5fc8ff', '#b48cff'];
  cols.forEach((c, i) => { const r = R - 0.35 - i * 0.32; const t = new THREE.Mesh(new THREE.TorusGeometry(1, 0.17, 6, 48, Math.PI), new THREE.MeshToonMaterial({ color: c, emissive: c, emissiveIntensity: 0.35 })); t.scale.set(r, 5.2 * r / R, 1); t.position.set(0, 10.6, 0.9); g.add(t); });
  // globos gigantes con carita a los lados
  const balloons = []; for (const sx of [-1, 1]) { const b = new THREE.Group(); b.position.set(sx * (R + 2.2), 0, 0); g.add(b);
    const body = new THREE.Mesh(new THREE.SphereGeometry(2.2, 24, 16), new THREE.MeshToonMaterial({ color: sx < 0 ? '#ff8fc0' : '#7fd8ff', emissive: '#ffffff', emissiveIntensity: 0.1 })); body.scale.set(1, 1.12, 1); body.position.y = 15.5; b.add(body);
    for (const e of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshBasicMaterial({ color: '#2a1838' })); eye.position.set(e * 0.7, 16, 2.05); b.add(eye); }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.1, 6, 16, Math.PI), new THREE.MeshBasicMaterial({ color: '#2a1838' })); mouth.rotation.z = Math.PI; mouth.position.set(0, 15.3, 2.08); b.add(mouth);
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffffff' })); str.position.y = 10.5; b.add(str); balloons.push(b); }
  // focos de luz que barren
  const beams = []; if (hi || true) for (const sx of [-1, 1]) { const cone = new THREE.Mesh(new THREE.ConeGeometry(3.2, 26, 20, 1, true), new THREE.MeshBasicMaterial({ map: blobTex(), color: '#fff2c0', transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
    cone.geometry.translate(0, -13, 0); const piv = new THREE.Group(); piv.position.set(sx * (R + 0.5), 1, 0); piv.add(cone); g.add(piv); beams.push([piv, sx]); }
  n4.arch = { g, bulbs, balloons, beams, nb };
}
function updArch(n4, t) { const A = n4.arch; if (!A) return; const c = new THREE.Color();
  for (let i = 0; i < A.nb; i++) { const on = ((i + Math.floor(t * 8)) % 4) === 0; c.setHSL((i / A.nb + t * 0.15) % 1, 0.9, on ? 0.75 : 0.55); if (!on) c.lerp(C('#ffffff'), 0.25); A.bulbs.setColorAt(i, c); } A.bulbs.instanceColor.needsUpdate = true;
  A.balloons.forEach((b, i) => { b.rotation.z = Math.sin(t * 1.3 + i * 2) * 0.06; b.children[0].scale.y = 1.12 + Math.sin(t * 2.5 + i) * 0.03; });
  A.beams.forEach(([p, sx]) => { p.rotation.z = Math.PI + sx * (0.35 + Math.sin(t * 0.9 + sx) * 0.3); p.rotation.x = Math.sin(t * 0.7) * 0.25; }); }

// ---------- instalación en la carrera ----------
export function noche4(race) {
  if (!race || race.n4 || /nofx|n4=0/.test(location.search)) return; const hi = !!(race.quality && race.quality.hi); const lock = (location.search.match(/n4q=(\d)/) || [])[1]; const n4 = race.n4 = { lv: lock ? +lock : 2, lock: !!lock, t: 0, fpsT: 0, fr: 0 };
  const safe = (f, n) => { try { f(); } catch (e) { console.warn('n4 ' + n, e); } };
  safe(() => horizon(race, n4), 'hor'); safe(() => gummies(race, n4, hi), 'gum'); safe(() => shadows(race, n4), 'sh'); safe(() => finishArch(race, n4, hi), 'arch');
  safe(() => { n4.dust = new Parts(race.scene, hi ? 420 : 240, false); n4.spark = new Parts(race.scene, hi ? 360 : 200, true); n4.conf = new Parts(race.scene, hi ? 500 : 300, false); }, 'parts');
  const dustC = C(race.cup.road).lerp(C('#ffffff'), 0.35), dustOff = C(race.cup.ground || race.cup.road).lerp(C('#c8a080'), 0.25);
  const SPK = ['#fff6a8', '#ffb84a', '#ff7fd8', '#7ff5ff'].map(C), CONF = ['#ff5f8f', '#ffe066', '#7fd8ff', '#9dff7a', '#c79bff', '#ffffff'].map(C);
  let lastLap = race.player ? race.player.lap : 0, finished = false, acc = 0; const fw = new V3(), rt = new V3();
  const burst = (p, n, up) => { for (let i = 0; i < n; i++) { const a = rnd() * 6.283, sp = 6 + rnd() * 10; n4.conf.emit(p.x + (rnd() - 0.5) * 6, p.y + 6 + rnd() * 4, p.z + (rnd() - 0.5) * 6, Math.cos(a) * sp, up * (6 + rnd() * 10), Math.sin(a) * sp, CONF[i % CONF.length], 1, 0.7 + rnd() * 0.5, 2.2 + rnd(), 0.2, 9); } };
  const orig = race.update.bind(race);
  race.update = function (dt) { orig(dt); if (race.n4 !== n4) return; try {
    n4.t += dt; const t = n4.t, cam = race.camera;
    // calidad automática
    n4.fr++; n4.fpsT += dt; // dt de simulación: medimos con el reloj real
    const now = performance.now(); if (!n4.w0) n4.w0 = now; if (!n4.lock && now - n4.w0 > 3000) { const fps = n4.fr / ((now - n4.w0) / 1000) * (race.app && race.app.speed > 1 ? 1 / race.app.speed : 1); n4.fr = 0; n4.w0 = now; if (fps < 36 && n4.lv > 0) n4.lv--; else if (fps > 52 && n4.lv < 2) n4.lv++; if (n4.gum) n4.gum.im.visible = n4.lv > 0 || hi; }
    if (n4.rings && cam) for (const r of n4.rings) r.position.set(cam.position.x * r.userData.par, r.userData.y, cam.position.z * r.userData.par);
    if (n4.gum && n4.gum.im.visible) n4.gum.upd(t);
    if (n4.sh) updShadows(n4);
    updArch(n4, t);
    if (n4.dust && cam) { acc += dt; const rate = n4.lv >= 2 ? 1 : n4.lv === 1 ? 0.55 : 0.3;
      for (const k of race.karts) { const dx = k.pos.x - cam.position.x, dz = k.pos.z - cam.position.z; if (dx * dx + dz * dz > 70 * 70 || k.air || !k.mesh.visible) continue;
        fw.set(Math.sin(k.yaw), 0, Math.cos(k.yaw)); rt.set(fw.z, 0, -fw.x); const sp = Math.abs(k.fs || 0);
        const s = race.track.S[k.idx] || race.track.S[0]; const lat = Math.abs((k.pos.x - s.p.x) * s.right.x + (k.pos.z - s.p.z) * s.right.z); const off = lat > s.w + 0.3;
        const want = (sp > 14 ? (off ? 26 : 6) : 0) + (k.driftDir ? 22 : 0) + (k.boostT > 0 ? 10 : 0);
        if (rnd() < want * dt * rate) for (const side of [-1, 1]) { const bx = k.pos.x - fw.x * 1.2 + rt.x * side * 1.0, bz = k.pos.z - fw.z * 1.2 + rt.z * side * 1.0;
          n4.dust.emit(bx, k.y + 0.35, bz, -fw.x * sp * 0.08 + (rnd() - 0.5) * 2 + rt.x * side * 1.5, 0.8 + rnd() * 1.2, -fw.z * sp * 0.08 + (rnd() - 0.5) * 2 + rt.z * side * 1.5, off ? dustOff : dustC, off ? 0.55 : 0.4, 0.9 + rnd() * 0.5, 0.7 + rnd() * 0.4, 2.2, -0.4); }
        if ((k.driftDir && k.driftT > 0.5) || k.boostT > 0) { const n = rnd() < dt * rate * (k.boostT > 0 ? 40 : 30) ? 2 : 0; const lvl = k.boostT > 0 ? 1 : k.driftT > 1.6 ? 2 : k.driftT > 1.0 ? 1 : 0;
          for (let j = 0; j < n; j++) { const side = k.driftDir ? -k.driftDir : (j ? 1 : -1); const bx = k.pos.x - fw.x * 1.1 + rt.x * side * 1.05, bz = k.pos.z - fw.z * 1.1 + rt.z * side * 1.05;
            n4.spark.emit(bx, k.y + 0.3, bz, -fw.x * (4 + rnd() * 6) + rt.x * side * (2 + rnd() * 4), 2 + rnd() * 4, -fw.z * (4 + rnd() * 6) + rt.z * side * (2 + rnd() * 4), SPK[k.boostT > 0 ? 1 : lvl + 1] || SPK[0], 1, 0.28 + rnd() * 0.2, 0.35 + rnd() * 0.25, -0.5, 14); } } } }
    // vuelta completada / meta: confeti
    const P = race.player; if (P && n4.conf) { if (P.lap > lastLap && P.lap > 0 && !P.finished) burst(P.pos.clone().setY(P.y), 60, 1); lastLap = P.lap; if (P.finished && !finished) { finished = true; burst(P.pos.clone().setY(P.y), 160, 1.3); } }
    n4.dust && n4.dust.step(dt); n4.spark && n4.spark.step(dt); n4.conf && n4.conf.step(dt);
  } catch (e) { if (!n4.err) { n4.err = 1; console.warn('n4', e); } } };
}

// ---------- podio: focos, rayos de luz y lluvia de confeti ----------
export function noche4Podium(P) {
  if (!P || !P.scene || P.n4) return; P.n4 = 1; const sc = P.scene; const beams = [];
  const cols = ['#ff8fc0', '#7fd8ff', '#ffe066', '#c79bff'];
  for (let i = 0; i < 4; i++) { const cone = new THREE.Mesh(new THREE.ConeGeometry(4.5, 40, 24, 1, true), new THREE.MeshBasicMaterial({ map: blobTex(), color: cols[i], transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
    cone.geometry.translate(0, -20, 0); const piv = new THREE.Group(); piv.position.set((i - 1.5) * 9, 26, -14); piv.add(cone); sc.add(piv); beams.push(piv); }
  const conf = new Parts(sc, 420, false); conf.pts.material.uniforms.k.value = 500; const CONF = ['#ff5f8f', '#ffe066', '#7fd8ff', '#9dff7a', '#c79bff', '#ffffff'].map(C);
  const ring = new THREE.Mesh(new THREE.RingGeometry(8.2, 9.4, 96), new THREE.MeshBasicMaterial({ color: '#fff3b0', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.4, 0.6); sc.add(ring);
  let t = 0, acc = 0; const orig = P.update.bind(P);
  P.update = function (dt, o) { const r = orig(dt, o); try { t += dt; acc += dt;
    beams.forEach((b, i) => { b.rotation.z = Math.sin(t * 0.8 + i * 1.7) * 0.5; b.rotation.x = 0.25 + Math.sin(t * 0.6 + i) * 0.2; });
    ring.material.opacity = 0.35 + Math.sin(t * 3) * 0.15; ring.scale.setScalar(1 + Math.sin(t * 1.5) * 0.02);
    while (acc > 0.03) { acc -= 0.03; sd = (sd + 7) % 2147483646 + 1; conf.emit((rnd() - 0.5) * 30, 18 + rnd() * 4, -8 + rnd() * 16, (rnd() - 0.5) * 2, -2 - rnd() * 2, (rnd() - 0.5) * 2, CONF[Math.floor(rnd() * 6)], 1, 0.35 + rnd() * 0.25, 5 + rnd() * 2, 0, 0.4); }
    conf.step(dt); } catch (e) {} return r; };
}
