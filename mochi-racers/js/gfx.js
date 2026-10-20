import * as THREE from 'three';

// ---------- toon materials ----------
let gradTex;
function gradient() {
  if (gradTex) return gradTex;
  const d = new Uint8Array([96, 96, 104, 255, 182, 178, 190, 255, 255, 255, 255, 255]);
  gradTex = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  gradTex.minFilter = gradTex.magFilter = THREE.NearestFilter; gradTex.needsUpdate = true;
  return gradTex;
}
const matCache = new Map();
export function toon(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!o.nocache && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshToonMaterial({ color, gradientMap: gradient(), transparent: o.opacity != null && o.opacity < 1, opacity: o.opacity ?? 1,
    emissive: o.emissive || '#000000', emissiveIntensity: o.ei ?? 1, side: o.side || THREE.FrontSide, vertexColors: !!o.vc });
  if (o.opacity != null && o.opacity < 1) m.depthWrite = o.depthWrite ?? false;
  const rim = o.rim ?? 0.35;
  if (rim > 0) {
    m.onBeforeCompile = sh => {
      sh.uniforms.rimStr = { value: rim };
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float rimStr;')
        .replace('#include <opaque_fragment>', `
          { float fr = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
            outgoingLight += vec3(1.0, 0.97, 1.0) * smoothstep(0.55, 1.0, fr) * rimStr; }
          #include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => 'rim' + rim;
  }
  if (!o.nocache) matCache.set(key, m);
  return m;
}
const outlineMats = new Map();
function outlineMat(color) {
  if (!outlineMats.has(color)) outlineMats.set(color, new THREE.MeshBasicMaterial({ color, side: THREE.BackSide }));
  return outlineMats.get(color);
}
// inverted hull outline
export function outline(mesh, color = '#5a3a6e', k = 1.06) {
  const o = new THREE.Mesh(mesh.geometry, outlineMat(color));
  o.scale.setScalar(k); o.renderOrder = -1; mesh.add(o); return o;
}
export function mesh(geo, mat, parent, pos, rot, scl) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.set(...pos); if (rot) m.rotation.set(...rot);
  if (scl) (typeof scl === 'number' ? m.scale.setScalar(scl) : m.scale.set(...scl));
  if (parent) parent.add(m); return m;
}
const G = {}; // shared geometries
function geo(name, f) { return G[name] || (G[name] = f()); }
const sph = (s = 16) => geo('sph' + s, () => new THREE.SphereGeometry(1, s, Math.max(8, s * 0.75 | 0)));
const cyl = (s = 16) => geo('cyl' + s, () => new THREE.CylinderGeometry(1, 1, 1, s));
const cone = (s = 12) => geo('cone' + s, () => new THREE.ConeGeometry(1, 1, s));
const box = () => geo('box', () => new THREE.BoxGeometry(1, 1, 1));
const tor = (r = 0.12, s = 24) => geo('tor' + r + s, () => new THREE.TorusGeometry(1, r, 8, s));

const col = (c, k) => { const x = new THREE.Color(c); return k > 0 ? x.lerp(new THREE.Color('#ffffff'), k) : x.lerp(new THREE.Color('#3a2050'), -k); };
const hex = c => '#' + c.getHexString();

// jelly body profile (lathe), feet at y=0, height ~1.6, radius ~1
function bodyGeo() {
  return geo('body', () => {
    const p = [];
    for (let i = 0; i <= 20; i++) {
      const a = i / 20; // 0 bottom -> 1 top
      const y = a * 1.62;
      let r = Math.sin(Math.PI * Math.min(1, 0.18 + a * 0.82)) * 1.0;
      r = a < 0.12 ? 0.78 + a * 1.6 : r * (1 - Math.max(0, a - 0.6) * 0.25);
      if (a > 0.97) r *= (1 - (a - 0.97) * 20);
      p.push(new THREE.Vector2(Math.max(0.001, r), y));
    }
    p.unshift(new THREE.Vector2(0.001, 0.02));
    const g = new THREE.LatheGeometry(p, 28); g.computeVertexNormals(); return g;
  });
}

// ---------- characters (v9: mucho más detalle) ----------
// Todo con geometría compartida y materiales cacheados (por color): 8 pilotos en carrera sin disparar memoria.
const texCache = {};
function blushTex() { return texCache.blush || (texCache.blush = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,90,150,0.85)'); g.addColorStop(0.55, 'rgba(255,120,170,0.45)'); g.addColorStop(1, 'rgba(255,140,180,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); x.fillStyle = 'rgba(255,255,255,0.9)'; for (let i = 0; i < 3; i++) { x.save(); x.translate(20 + i * 11, 32); x.rotate(0.5); x.fillRect(-1.5, -7, 3, 14); x.restore(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })()); }
const basicCache = new Map();
function basic(color, o = {}) { const k = color + JSON.stringify(o); if (!basicCache.has(k)) { const m = new THREE.MeshBasicMaterial({ color, transparent: o.opacity != null || !!o.map, opacity: o.opacity ?? 1, map: o.map || null, depthWrite: o.depthWrite ?? !(o.opacity != null || o.map), side: o.side || THREE.FrontSide }); basicCache.set(k, m); } return basicCache.get(k); }
// cuerpo con degradado (más oscuro abajo, más claro arriba) en colores de vértice
function bodyGeoV9() {
  return geo('bodyV9', () => {
    const p = [];
    for (let i = 0; i <= 30; i++) { const a = i / 30, y = a * 1.62;
      let r = Math.sin(Math.PI * Math.min(1, 0.18 + a * 0.82));
      r = a < 0.12 ? 0.78 + a * 1.6 : r * (1 - Math.max(0, a - 0.6) * 0.25);
      if (a > 0.97) r *= (1 - (a - 0.97) * 20);
      p.push(new THREE.Vector2(Math.max(0.001, r), y)); }
    p.unshift(new THREE.Vector2(0.001, 0.02));
    const g = new THREE.LatheGeometry(p, 40); g.computeVertexNormals();
    const pos = g.attributes.position, c = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 1.62, z = pos.getZ(i); const v = 0.8 + 0.22 * Math.pow(y, 0.8) + Math.max(0, z) * 0.04; c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = Math.min(1.06, v); }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
  });
}
const spiralGeo = () => geo('spiral', () => { const pts = []; for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 5, r = 0.08 + i / 60 * 0.92; pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0)); }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.11, 5, false); });
const starGeoS = () => geo('starS', () => new THREE.ExtrudeGeometry(starShape(1, 0.45), { depth: 0.3, bevelEnabled: false }));
const dropGeo = () => geo('drop', () => { const p = []; for (let i = 0; i <= 14; i++) { const a = i / 14 * Math.PI; p.push(new THREE.Vector2(Math.max(0.001, Math.sin(a) * (1 - a / Math.PI * 0.85)), -Math.cos(a) * 1.25)); } return new THREE.LatheGeometry(p, 10); });
const halfSph = () => geo('halfSph', () => new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2));

export function makeCharacter(ch, opts = {}) {
  const root = new THREE.Group(); root.name = 'char';
  const rig = new THREE.Group(); root.add(rig);
  const OL = hex(col(ch.color, -0.55));
  const inner = new THREE.Group(); rig.add(inner);
  buildInner(ch.inner, inner, ch);
  const body = mesh(bodyGeoV9(), toon(hex(col(ch.color, 0.1)), { opacity: 0.74, rim: 0.6, depthWrite: false, vc: true }), rig);
  body.renderOrder = 2;
  const ol = outline(body, OL, 1.04); ol.renderOrder = 1;
  // brillos de gominola
  const hlM = basic('#ffffff', { opacity: 0.62 });
  const hl1 = mesh(sph(12), hlM, rig, [-0.42, 1.2, 0.64], [0.3, -0.5, 0.6], [0.2, 0.11, 0.06]); hl1.renderOrder = 4;
  const hl2 = mesh(sph(8), hlM, rig, [-0.18, 1.4, 0.62], null, [0.06, 0.05, 0.04]); hl2.renderOrder = 4;
  const hl3 = mesh(sph(8), basic('#ffffff', { opacity: 0.3 }), rig, [0.62, 0.42, 0.62], [0, 0.7, -0.5], [0.16, 0.06, 0.05]); hl3.renderOrder = 4;
  // --- cara (frente = +z) ---
  const face = new THREE.Group(); rig.add(face);
  const eyeM = toon('#2a1838', { rim: 0 }), whiteM = basic('#ffffff');
  const irisM = toon(hex(col(ch.color === '#e8f4ff' ? '#7fb0e0' : ch.color, -0.15)), { rim: 0, emissive: hex(col(ch.color, -0.3)), ei: 0.25 });
  const eyes = [], happy = new THREE.Group(), xx = new THREE.Group(), strain = new THREE.Group(); face.add(happy, xx, strain);
  happy.visible = xx.visible = strain.visible = false;
  const arcG = geo('arc', () => new THREE.TorusGeometry(1, 0.3, 6, 14, Math.PI));
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * 0.35, 0.88, 0.84); e.rotation.y = s * 0.38; face.add(e);
    mesh(sph(16), eyeM, e, [0, 0, 0], null, [0.18, 0.23, 0.1]);
    mesh(sph(12), irisM, e, [0, -0.07, 0.05], null, [0.13, 0.12, 0.06]);
    mesh(sph(8), whiteM, e, [s * -0.05, 0.08, 0.085], null, [0.075, 0.085, 0.03]);
    mesh(sph(8), whiteM, e, [s * 0.06, -0.1, 0.085], null, [0.035, 0.035, 0.02]);
    const lash = mesh(box(), eyeM, e, [s * 0.15, 0.16, 0.02], [0, 0, s * -0.7], [0.08, 0.025, 0.03]);
    e.userData = { bx: s * 0.35, by: 0.88 }; eyes.push(e);
    // mejillas con degradado
    const ck = mesh(geo('blushPl', () => new THREE.PlaneGeometry(1, 0.62)), basic('#ffffff', { map: blushTex(), depthWrite: false }), face, [s * 0.62, 0.66, 0.74], [0, s * 0.68, 0], 0.32); ck.renderOrder = 4;
    // ojos felices ^^
    mesh(arcG, eyeM, happy, [s * 0.35, 0.84, 0.9], [0.2, s * 0.38, 0], [0.13, 0.13, 0.1]);
    // ojos en espiral
    const sp = mesh(spiralGeo(), eyeM, xx, [s * 0.35, 0.88, 0.9], [0, s * 0.38, 0], 0.15); sp.userData.s = s;
    // ojos apretados > <
    for (const r of [0.45, -0.45]) mesh(box(), eyeM, strain, [s * 0.35 + s * 0.02, 0.88 + r * 0.09, 0.92], [0, s * 0.38, -s * r], [0.2, 0.045, 0.04]);
    // cejas de esfuerzo
    mesh(sph(8), eyeM, strain, [s * 0.34, 1.13, 0.84], [0, s * 0.38, s * 0.35], [0.12, 0.03, 0.03]);
  }
  // bocas
  const mouth = mesh(arcG, eyeM, face, [0, 0.66, 0.93], [0.2, 0, Math.PI], [0.08, 0.065, 0.07]);
  const open = new THREE.Group(); open.position.set(0, 0.64, 0.92); open.rotation.x = 0.15; face.add(open); open.visible = false;
  mesh(halfSph(), eyeM, open, null, null, [0.12, 0.12, 0.05]); mesh(sph(8), toon('#ff6f8f', { rim: 0 }), open, [0, -0.07, 0.02], null, [0.07, 0.035, 0.03]);
  const ohMouth = mesh(sph(10), eyeM, xx, [0, 0.62, 0.93], null, [0.08, 0.1, 0.05]);
  const teeth = mesh(box(), whiteM, strain, [0, 0.63, 0.93], [0.2, 0, 0], [0.22, 0.08, 0.03]); outline(teeth, '#2a1838', 1.25);
  mesh(box(), eyeM, strain, [0, 0.63, 0.948], [0.2, 0, 0], [0.2, 0.012, 0.01]);
  // gota de sudor y estrellitas de mareo
  const dropM = toon('#9fe0ff', { rim: 0.8, emissive: '#5fc8ff', ei: 0.3 });
  const sweat = mesh(dropGeo(), dropM, strain, [0.72, 1.18, 0.5], [0, 0, 0.3], 0.09);
  const stars = new THREE.Group(); stars.position.y = 1.75; xx.add(stars);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; mesh(starGeoS(), toon('#ffe066', { emissive: '#ffcc33', ei: 0.6, rim: 0 }), stars, [Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6], null, 0.13); }
  // bracitos y pies
  const limbM = toon(hex(col(ch.color, -0.02)), { rim: 0.5 });
  const arms = [];
  for (const s of [-1, 1]) { const p = new THREE.Group(); p.position.set(s * 0.84, 0.62, 0.05); rig.add(p);
    const a = mesh(sph(12), limbM, p, [0, -0.15, 0], null, [0.15, 0.24, 0.15]); outline(a, OL, 1.12); arms.push({ p, s }); }
  const feet = new THREE.Group(); rig.add(feet);
  for (const s of [-1, 1]) { const f = mesh(sph(12), toon(hex(col(ch.color, -0.12)), { rim: 0.4 }), feet, [s * 0.36, 0.06, 0.32], null, [0.24, 0.12, 0.3]); outline(f, OL, 1.1); }
  // --- orejas ---
  const earM = toon(hex(col(ch.color, -0.05)), { opacity: 0.88, rim: 0.55 }), earIn = toon(hex(col('#ff8fb8', 0.25)), { rim: 0 });
  const ears = new THREE.Group(); rig.add(ears); const earParts = [];
  const E = ch.ears;
  for (const s of [-1, 1]) {
    if (E === 'bunny') { const g = new THREE.Group(); g.position.set(s * 0.4, 1.38, 0); g.rotation.z = -s * 0.32; ears.add(g); earParts.push([g, s, -s * 0.32]);
      const e = mesh(sph(14), earM, g, [0, 0.55, 0], null, [0.2, 0.62, 0.17]); outline(e, OL, 1.08); mesh(sph(12), earIn, g, [0, 0.55, 0.11], null, [0.1, 0.46, 0.07]); }
    if (E === 'bear') { const g = new THREE.Group(); g.position.set(s * 0.62, 1.42, 0); ears.add(g); earParts.push([g, s, 0]);
      const e = mesh(sph(14), earM, g, null, null, [0.27, 0.25, 0.16]); outline(e, OL, 1.08); mesh(sph(10), earIn, g, [0, -0.01, 0.1], null, [0.15, 0.14, 0.07]); }
    if (E === 'cat') { const g = new THREE.Group(); g.position.set(s * 0.5, 1.6, 0); g.rotation.z = -s * 0.3; ears.add(g); earParts.push([g, s, -s * 0.3]);
      const e = mesh(cone(4), earM, g, null, [0, Math.PI / 4, 0], [0.26, 0.42, 0.2]); outline(e, OL, 1.1); mesh(cone(4), earIn, g, [0, -0.03, 0.07], [0, Math.PI / 4, 0], [0.15, 0.28, 0.1]); }
    if (E === 'horns') { const g = new THREE.Group(); g.position.set(s * 0.45, 1.55, 0); g.rotation.z = -s * 0.45; ears.add(g); earParts.push([g, s, -s * 0.45]);
      const h = mesh(cone(10), toon('#fff3b0', { rim: 0.5 }), g, null, null, [0.13, 0.38, 0.13]); outline(h, '#8a6a3a', 1.1);
      for (let k = 0; k < 2; k++) mesh(tor(0.25, 12), toon('#e8c860', { rim: 0 }), g, [0, -0.1 + k * 0.1, 0], [Math.PI / 2, 0, 0], 0.1 - k * 0.025); }
    if (E === 'fins') { const g = new THREE.Group(); g.position.set(s * 0.98, 0.85, -0.1); ears.add(g); earParts.push([g, s, 0]);
      const f = mesh(cone(4), earM, g, null, [0, 0, -s * 1.9], [0.3, 0.5, 0.06]); outline(f, OL, 1.12);
      for (let k = -1; k <= 1; k++) mesh(box(), toon(hex(col(ch.color, -0.25)), { rim: 0 }), g, [s * 0.18, k * 0.08, 0.035], [0, 0, -s * 1.9 + k * 0.3], [0.28, 0.02, 0.01]); }
    if (E === 'antenna') { const g = new THREE.Group(); g.position.set(s * 0.32, 1.48, 0); g.rotation.z = -s * 0.3; ears.add(g); earParts.push([g, s, -s * 0.3]);
      mesh(cyl(6), toon('#7a6aa8', { rim: 0 }), g, [0, 0.25, 0], null, [0.03, 0.5, 0.03]);
      const bulb = mesh(sph(12), toon('#ffe066', { emissive: '#ffcc33', ei: 0.7 }), g, [0, 0.55, 0], null, 0.12);
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#ffe066'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); gl.scale.setScalar(0.6); bulb.add(gl); gl.scale.setScalar(5); }
  }
  // --- accesorios ---
  const A = ch.acc;
  if (A === 'flag') { mesh(cyl(6), toon('#8a6a4a', { rim: 0 }), rig, [0, 1.85, 0], null, [0.03, 0.55, 0.03]); mesh(sph(8), toon('#ffe066'), rig, [0, 2.14, 0], null, 0.05);
    const fl = mesh(geo('flag', () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.42, -0.12, 0, 0, -0.26, 0], 3)); g.computeVertexNormals(); return g; }),
      toon('#ff6fa8', { side: THREE.DoubleSide, rim: 0 }), rig, [0.02, 2.1, 0]); root.userData.flag = fl; }
  if (A === 'ring') { const r = mesh(tor(0.06, 40), toon('#ffe9a0', { emissive: '#ffd060', ei: 0.45 }), rig, [0, 1.25, 0], [Math.PI / 2 - 0.25, 0, 0.2], [1.25, 1.25, 1.25]); root.userData.spin = r;
    for (let i = 0; i < 3; i++) mesh(sph(6), toon('#fff6c8', { emissive: '#ffe9a0', ei: 0.8, rim: 0 }), r, [Math.cos(i * 2.1), Math.sin(i * 2.1), 0], null, 0.05); }
  if (A === 'beanie') { const bm = toon('#ff8fb8', { rim: 0.4 }); mesh(sph(18), bm, rig, [0, 1.42, 0], null, [0.78, 0.42, 0.78]);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; mesh(box(), toon('#ffb3d1', { rim: 0 }), rig, [Math.sin(a) * 0.62, 1.52, Math.cos(a) * 0.62], [0, a, 0.35], [0.05, 0.3, 0.05]); }
    const pom = mesh(sph(12), toon('#ffffff', { rim: 0.7 }), rig, [0, 1.85, 0], null, 0.17); root.userData.pom = pom; mesh(tor(0.3, 24), toon('#ffffff'), rig, [0, 1.3, 0], [Math.PI / 2, 0, 0], [0.78, 0.78, 0.6]); }
  if (A === 'lampcap') { const lm = toon('#c9a0ff', { rim: 0.6 }); mesh(cyl(18), lm, rig, [0, 1.62, 0], null, [0.45, 0.22, 0.45]); mesh(cyl(18), lm, rig, [0, 0.08, 0], null, [0.92, 0.16, 0.92]);
    mesh(tor(0.2, 18), toon('#ffe066', { emissive: '#ffb13d', ei: 0.4 }), rig, [0, 1.73, 0], [Math.PI / 2, 0, 0], 0.4); }
  if (A === 'key') { const k = new THREE.Group(); k.position.set(0, 0.95, -1.0); rig.add(k); root.userData.spinKey = k;
    mesh(cyl(8), toon('#d4a73f'), k, [0, 0, -0.15], [Math.PI / 2, 0, 0], [0.05, 0.3, 0.05]);
    for (const s of [-1, 1]) mesh(tor(0.3, 14), toon('#e8bc52'), k, [s * 0.2, 0, -0.32], [0, Math.PI / 2, 0], 0.17); }
  if (A === 'shades') { const sm = toon('#2a1838', { rim: 0.9, emissive: '#6a3aa8', ei: 0.15 });
    for (const s of [-1, 1]) { mesh(cyl(18), sm, rig, [s * 0.36, 0.9, 0.92], [Math.PI / 2, 0, s * 0.1], [0.25, 0.05, 0.21]); mesh(sph(6), basic('#ffffff', { opacity: 0.8 }), rig, [s * 0.36 - 0.08, 0.98, 0.95], null, [0.06, 0.025, 0.01]); }
    mesh(box(), sm, rig, [0, 0.95, 0.95], null, [0.3, 0.04, 0.04]); }
  // extras propios de cada piloto
  const X = ch.id, gold = toon('#ffd36a', { rim: 0.8, emissive: '#c08a20', ei: 0.2 });
  const add = (g, m, p, r, s) => mesh(g, m, rig, p, r, s);
  if (X === 'mochi') { const bow = new THREE.Group(); bow.position.set(-0.42, 1.5, 0.22); bow.rotation.set(0.2, 0, 0.4); rig.add(bow); const bm = toon('#ff4f93', { rim: 0.5 });
    for (const s of [-1, 1]) { const w = mesh(cone(12), bm, bow, [s * 0.14, 0, 0], [0, 0, s * Math.PI / 2], [0.13, 0.24, 0.08]); outline(w, '#a02060', 1.1); }
    mesh(sph(10), toon('#ff7fb0'), bow, null, null, 0.07); root.userData.bow = bow; }
  if (X === 'tiovivo') { const bt = new THREE.Group(); bt.position.set(0, 0.42, 0.9); bt.rotation.x = -0.3; rig.add(bt);
    for (const s of [-1, 1]) { const w = mesh(cone(4), toon('#ff6f9a'), bt, [s * 0.12, 0, 0], [0, 0, s * Math.PI / 2], [0.12, 0.2, 0.06]); outline(w, '#a03060', 1.12); }
    mesh(sph(8), toon('#ffe066'), bt, null, null, 0.06); }
  if (X === 'atomo') { const gm = toon('#5a4a8a', { rim: 0.4 }), lens = basic('#c9f6ff', { opacity: 0.35 });
    for (const s of [-1, 1]) { add(tor(0.12, 20), gm, [s * 0.35, 0.89, 0.95], [0, s * 0.38, 0], 0.22); const l = add(sph(12), lens, [s * 0.35, 0.89, 0.93], [0, s * 0.38, 0], [0.21, 0.21, 0.03]); l.renderOrder = 5; }
    add(box(), gm, [0, 0.92, 0.99], null, [0.22, 0.03, 0.03]); }
  if (X === 'cosmo') { const sc = add(starGeoS(), toon('#ffe066', { emissive: '#ffcc33', ei: 0.5 }), [0.42, 1.38, 0.55], [-0.3, 0.5, 0.3], 0.14); outline(sc, '#a07a20', 1.15);
    for (const s of [-1, 1]) add(starGeoS(), toon('#fff6c8', { emissive: '#ffe9a0', ei: 0.7, rim: 0 }), [s * 0.62, 0.58, 0.76], [0, s * 0.68, 0], 0.035); }
  if (X === 'copito') { const sf = toon('#7fd0ff', { rim: 0.5 }); add(tor(0.32, 24), sf, [0, 0.4, 0.02], [Math.PI / 2, 0, 0], [0.86, 0.86, 0.5]);
    const tail = new THREE.Group(); tail.position.set(0.42, 0.38, 0.72); tail.rotation.set(0.3, 0, 0.25); rig.add(tail); root.userData.scarf = tail;
    mesh(box(), sf, tail, [0, -0.2, 0], null, [0.2, 0.42, 0.06]); for (let k = 0; k < 3; k++) mesh(box(), toon('#ffffff', { rim: 0 }), tail, [0, -0.08 - k * 0.13, 0.035], null, [0.2, 0.04, 0.01]); }
  if (X === 'burbuja') { const sf = add(starGeoS(), toon('#ff9f6a', { rim: 0.5 }), [0.45, 1.36, 0.58], [-0.4, 0.5, 0.2], 0.16); outline(sf, '#a0502a', 1.12);
    for (let i = 0; i < 3; i++) { const b = add(sph(10), toon('#e8fbff', { opacity: 0.6, rim: 0.9 }), [-0.75 - i * 0.05, 1.5 + i * 0.25, 0.2], null, 0.06 + i * 0.025); b.userData.bub = i; (root.userData.bubs ||= []).push(b); } }
  if (X === 'lava') { const band = toon('#7a4a3a', { rim: 0.3 }), lens = toon('#ffb13d', { emissive: '#ff7f2a', ei: 0.4, rim: 0.9 });
    add(tor(0.06, 28), band, [0, 1.3, 0], [Math.PI / 2 - 0.2, 0, 0], [0.84, 0.84, 0.84]);
    for (const s of [-1, 1]) { add(cyl(16), band, [s * 0.26, 1.33, 0.72], [Math.PI / 2 - 0.55, 0, 0], [0.19, 0.12, 0.19]); add(cyl(16), lens, [s * 0.26, 1.37, 0.78], [Math.PI / 2 - 0.55, 0, 0], [0.15, 0.04, 0.15]); } }
  if (X === 'tictac') { const hm = toon('#3a2a3a', { rim: 0.6 });
    add(cyl(18), hm, [0.05, 1.86, 0], [0, 0, -0.12], [0.38, 0.42, 0.38]); add(cyl(18), hm, [0.02, 1.64, 0], [0, 0, -0.12], [0.6, 0.05, 0.6]); add(cyl(18), toon('#ff6f9a', { rim: 0 }), [0.03, 1.72, 0], [0, 0, -0.12], [0.39, 0.09, 0.39]);
    add(tor(0.12, 20), gold, [0.35, 0.89, 0.96], [0, 0.38, 0], 0.24); add(cyl(6), gold, [0.52, 0.62, 0.86], [0, 0, 0.3], [0.012, 0.5, 0.012]); }
  if (X === 'trueno') { const b = add(cone(3), toon('#fff27a', { emissive: '#ffe040', ei: 0.8, rim: 0 }), [0.05, 1.72, 0.1], [0, 0, 0.35], [0.12, 0.4, 0.06]); root.userData.tuft = b;
    for (const s of [-1, 1]) add(sph(10), toon('#c3cbe6', { rim: 0.6 }), [s * 0.2, 1.55, -0.1], null, [0.22, 0.15, 0.2]); }
  if (X === 'disco') { add(tor(0.07, 32), gold, [0, 0.42, 0.04], [Math.PI / 2 + 0.15, 0, 0], [0.86, 0.86, 0.86]);
    const med = add(starGeoS(), gold, [0, 0.3, 0.92], [0.2, 0, 0], 0.1); root.userData.medal = med;
    for (const s of [-1, 1]) add(sph(8), toon('#ff8fd8', { emissive: '#ff4fb0', ei: 0.6, rim: 0 }), [s * 0.82, 0.92, 0.2], null, 0.06); }
  Object.assign(root.userData, { body, inner, rig, eyes, mouth, open, happy, xx, strain, ohMouth, sweat, stars, arms, ears, earParts, feet, face, ph: Math.random() * 6 });
  return root;
}

function buildInner(kind, g, ch) {
  const glow = (c, e = 0.5) => toon(c, { emissive: c, ei: e, rim: 0 });
  const anim = [];
  if (kind === 'bubbles') for (let i = 0; i < 6; i++) { const b = mesh(sph(8), toon('#ffffff', { opacity: 0.7, rim: 0 }), g, [Math.sin(i * 2) * 0.4, 0.3 + i * 0.18, Math.cos(i * 2) * 0.3], null, 0.07 + (i % 3) * 0.03); anim.push(['rise', b, i]); }
  if (kind === 'carousel') { const c = new THREE.Group(); c.position.y = 0.55; g.add(c); anim.push(['spin', c, 1.2]);
    mesh(cyl(12), glow('#ffe7a8', 0.4), c, [0, 0, 0], null, [0.45, 0.06, 0.45]); mesh(cone(12), glow('#ff9ec7', 0.4), c, [0, 0.55, 0], null, [0.5, 0.3, 0.5]);
    for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28; mesh(cyl(6), glow('#fff', 0.3), c, [Math.cos(a) * 0.32, 0.25, Math.sin(a) * 0.32], null, [0.015, 0.5, 0.015]);
      mesh(box(), glow(['#ffffff', '#ffd1ea', '#d8fbef', '#ece4ff'][i], 0.3), c, [Math.cos(a) * 0.32, 0.18, Math.sin(a) * 0.32], [0, -a, 0], [0.08, 0.1, 0.18]); } }
  if (kind === 'atom') { mesh(sph(12), glow('#ff8fc0', 0.6), g, [0, 0.75, 0], null, 0.16);
    for (let i = 0; i < 3; i++) { const o = new THREE.Group(); o.position.y = 0.75; o.rotation.set(i * 1.05, i * 0.6, 0); g.add(o); mesh(tor(0.03, 32), glow('#ffffff', 0.3), o, null, null, 0.45);
      const e = mesh(sph(8), glow('#7ff5ff', 0.9), o, [0.45, 0, 0], null, 0.06); anim.push(['spin', o, 2 + i]); } }
  if (kind === 'solar') { const s = new THREE.Group(); s.position.y = 0.75; g.add(s); anim.push(['spin', s, 0.7]); mesh(sph(12), glow('#ffd36b', 0.9), s, null, null, 0.18);
    [['#7fd0ff', 0.32, 0.06], ['#ff9f7f', 0.48, 0.08], ['#b6ff9f', 0.62, 0.05]].forEach(([c, r, sz], i) => mesh(sph(8), glow(c, 0.4), s, [Math.cos(i * 2.2) * r, 0, Math.sin(i * 2.2) * r], null, sz)); }
  if (kind === 'snow') for (let i = 0; i < 9; i++) { const b = mesh(sph(6), glow('#ffffff', 0.5), g, [Math.sin(i * 3.1) * 0.45, 0.3 + (i % 5) * 0.22, Math.cos(i * 1.7) * 0.35], null, 0.05); anim.push(['fall', b, i]); }
  if (kind === 'aquarium') { mesh(sph(10), toon('#5fc8ff', { opacity: 0.4, rim: 0 }), g, [0, 0.35, 0], null, [0.85, 0.3, 0.75]);
    const f = new THREE.Group(); f.position.y = 0.75; g.add(f); anim.push(['spin', f, 0.9]);
    const fish = mesh(sph(10), glow('#ff9f4a', 0.4), f, [0.4, 0, 0], null, [0.14, 0.1, 0.06]); mesh(cone(4), glow('#ff9f4a', 0.4), fish, [0, 0, -1.3], [Math.PI / 2, 0, 0], [0.8, 0.8, 0.8]); }
  if (kind === 'lava') for (let i = 0; i < 4; i++) { const b = mesh(sph(10), glow(['#ff6f3d', '#ff9f4a'][i % 2], 0.7), g, [Math.sin(i * 2) * 0.25, 0.4 + i * 0.25, Math.cos(i * 2) * 0.2], null, 0.12 + (i % 2) * 0.05); anim.push(['lava', b, i]); }
  if (kind === 'gears') { for (let i = 0; i < 2; i++) { const gr = new THREE.Group(); gr.position.set(i ? 0.22 : -0.15, i ? 0.95 : 0.65, 0); g.add(gr); anim.push(['spinz', gr, i ? -1.6 : 1.2]);
      mesh(cyl(8), glow('#e8bc52', 0.3), gr, null, [Math.PI / 2, 0, 0], [i ? 0.2 : 0.28, 0.06, i ? 0.2 : 0.28]);
      for (let k = 0; k < 8; k++) mesh(box(), glow('#e8bc52', 0.3), gr, [Math.cos(k * 0.785) * (i ? 0.22 : 0.3), Math.sin(k * 0.785) * (i ? 0.22 : 0.3), 0], [0, 0, k * 0.785], [0.07, 0.07, 0.06]); } }
  if (kind === 'storm') { for (let i = 0; i < 4; i++) mesh(sph(8), toon('#7a84a8', { rim: 0 }), g, [Math.cos(i * 1.6) * 0.25, 1.0, Math.sin(i * 1.6) * 0.2], null, 0.2);
    const bolt = mesh(cone(3), glow('#fff27a', 1), g, [0, 0.6, 0], [Math.PI, 0, 0.2], [0.09, 0.45, 0.04]); anim.push(['flash', bolt, 0]); }
  if (kind === 'disco') { const d = mesh(geo('ico1', () => new THREE.IcosahedronGeometry(1, 1)), toon('#e0e8ff', { flat: true, emissive: '#8060ff', ei: 0.3 }), g, [0, 0.8, 0], null, 0.3); anim.push(['disco', d, 0]); }
  g.userData.anim = anim;
}
// expr: '' | 'happy' | 'squash' | 'strain' | 'look'  ·  sp = 0..1 velocidad (viento en orejas)
export function animCharacter(c, t, k = 1, expr = '', sp = 0) {
  const u = c.userData; if (!u.rig) return;
  const ph = u.ph + (u.seed || 0) * 1.3, sq = expr === 'squash', hp = expr === 'happy', st = expr === 'strain';
  u.happy.visible = hp; u.xx.visible = sq; u.strain.visible = st;
  for (const e of u.eyes) e.visible = !hp && !sq && !st;
  u.mouth.visible = !hp && !sq && !st; u.open.visible = hp;
  for (const [type, m, p] of u.inner.userData.anim) {
    if (type === 'spin') m.rotation.y = t * p;
    else if (type === 'spinz') m.rotation.z = t * p;
    else if (type === 'rise') m.position.y = 0.25 + ((t * 0.35 + p * 0.17) % 1) * 1.1;
    else if (type === 'fall') m.position.y = 1.3 - ((t * 0.25 + p * 0.13) % 1) * 1.05;
    else if (type === 'lava') m.position.y = 0.75 + Math.sin(t * 0.8 + p * 1.7) * 0.42;
    else if (type === 'flash') m.visible = (t * 1.3 + 0.2) % 2 < 0.25;
    else if (type === 'disco') { m.rotation.y = t * 1.5; m.material.emissive.setHSL((t * 0.2) % 1, 0.8, 0.4); }
  }
  if (u.spin) u.spin.rotation.z = t * 0.6;
  if (u.spinKey) u.spinKey.rotation.z = t * 3;
  // respiración / botecito de gelatina
  const br = Math.sin(t * 2.6 + ph);
  let sy = 1 + br * 0.035 * k, sxz = 1 - br * 0.02 * k, y = 0, rz = 0;
  if (hp) { const j = Math.abs(Math.sin(t * 9 + ph)); y = j * 0.16; sy += (j - 0.5) * 0.12; sxz -= (j - 0.5) * 0.06; }
  if (st) { rz = Math.sin(t * 31) * 0.03; sy *= 0.94; sxz *= 1.04; }
  if (sq) rz = Math.sin(t * 5) * 0.08;
  u.rig.scale.set(sxz, sy, sxz); u.rig.position.y = y; u.rig.rotation.z = rz;
  // ojos: parpadeo suave (a veces doble) y mirada que se mueve
  const cyc = (t * 0.9 + ((u.seed || 0) % 7) * 0.37 + ph) % 3.6, bl = cyc < 0.16 ? Math.sin(cyc / 0.16 * Math.PI) : (cyc > 0.32 && cyc < 0.46 && ((ph * 10) | 0) % 2 ? Math.sin((cyc - 0.32) / 0.14 * Math.PI) : 0);
  const lx = expr === 'look' ? 0 : Math.round(Math.sin(t * 0.45 + ph) * 1.4) * 0.025, ly = expr === 'look' ? 0.03 : 0;
  for (const e of u.eyes) { e.scale.y = 1 - bl * 0.92; e.position.x = e.userData.bx + lx; e.position.y = e.userData.by + ly; }
  // brazos
  for (const a of u.arms) { let r = a.s * (0.45 + Math.sin(t * 3 + ph + a.s) * 0.12);
    if (hp) r = a.s * (2.3 + Math.sin(t * 14 + a.s) * 0.5); if (st) r = a.s * (2.85 + Math.sin(t * 29 + a.s) * 0.06); if (sq) r = a.s * 1.45;
    a.p.rotation.z += (r - a.p.rotation.z) * 0.35; }
  // orejas con inercia + viento según velocidad
  u.ears.rotation.x = Math.sin(t * 6) * 0.08 * k - sp * 0.35;
  for (const [g, s, r0] of u.earParts) g.rotation.z = r0 + Math.sin(t * 4.5 + ph + s) * 0.07 * k + (sq ? -s * 0.5 : 0) + (hp ? Math.sin(t * 18) * 0.1 : 0);
  if (sq) { u.stars.rotation.y = t * 4; for (const m of u.xx.children) if (m.userData.s) m.rotation.z = t * 8 * m.userData.s; }
  if (st) { u.sweat.position.y = 1.18 - ((t * 0.9) % 1) * 0.35; u.sweat.scale.setScalar(0.09 * (1 - ((t * 0.9) % 1) * 0.3)); }
  if (u.flag) u.flag.rotation.y = Math.sin(t * 7) * 0.4 - sp * 0.6;
  if (u.bow) u.bow.rotation.z = 0.4 + Math.sin(t * 5 + ph) * 0.08;
  if (u.pom) u.pom.position.x = Math.sin(t * 4 + ph) * 0.04;
  if (u.scarf) u.scarf.rotation.x = 0.3 + Math.sin(t * 6) * 0.15 + sp * 0.8;
  if (u.tuft) u.tuft.visible = (t * 1.7 + ph) % 3 > 0.12;
  if (u.medal) u.medal.rotation.y = Math.sin(t * 2) * 0.6;
  if (u.bubs) u.bubs.forEach((b, i) => { b.position.y = 1.45 + ((t * 0.4 + i * 0.33) % 1) * 0.7; });
}

const glowCache = {};
export function glowTex(color = '#ffffff') {
  if (glowCache[color]) return glowCache[color];
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(cv); return glowCache[color] = t;
}
// ---------- vehicles ----------
// Each returns group with forward +z, ground at y=0; userData.seat (y), wheels (to spin), anim(t,speed)
export function makeVehicle(ch) {
  const g = new THREE.Group(); const C = ch.color; const OL = hex(col(C, -0.6));
  const wheels = []; let seat = 0.9; const anims = [];
  const wheel = (x, z, r = 0.38, c = '#ffffff') => { const w = mesh(cyl(14), toon(c), g, [x, r, z], [0, 0, Math.PI / 2], [r, 0.3, r]); outline(w, OL, 1.08); wheels.push(w);
    mesh(cyl(10), toon(hex(col(C, -0.2))), w, [0, 0.0, 0], null, [0.5, 1.05, 0.5]); return w; };
  const V = ch.vehicle;
  if (V === 'teacup') {
    const cup = mesh(geo('cup', () => new THREE.LatheGeometry([0.01, 0.9, 1.15, 1.3, 1.38, 1.35].map((r, i) => new THREE.Vector2(r, i * 0.22)), 24)), toon('#fff6fb', { side: THREE.DoubleSide }), g, [0, 0.35, 0]);
    outline(cup, OL, 1.04); mesh(tor(0.12, 24), toon(C), g, [0, 1.42, 0], [Math.PI / 2, 0, 0], [1.36, 1.36, 1]);
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; mesh(sph(8), toon(C), g, [Math.cos(a) * 1.26, 0.85, Math.sin(a) * 1.26], null, 0.13); }
    mesh(tor(0.18, 16), toon('#fff6fb'), g, [-1.38, 0.9, 0], [0, 0, 0], [0.35, 0.35, 0.35]);
    mesh(cyl(24), toon(hex(col(C, 0.5))), g, [0, 0.32, 0], null, [1.45, 0.12, 1.45]);
    wheel(-1.05, 0.9, 0.3); wheel(1.05, 0.9, 0.3); wheel(-1.05, -0.9, 0.3); wheel(1.05, -0.9, 0.3); seat = 1.0;
    anims.push((t, sp, gr) => { gr.rotation.y = Math.sin(t * 2) * 0.05; });
  } else if (V === 'carousel') {
    const base = new THREE.Group(); g.add(base);
    mesh(cyl(20), toon('#fff1c8'), base, [0, 0.45, 0], null, [1.5, 0.22, 1.5]); outline(base.children[0], OL, 1.04);
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; mesh(sph(6), toon(i % 2 ? '#ff9ec7' : '#7ee3c4', { emissive: '#ffffff', ei: 0.25 }), base, [Math.cos(a) * 1.5, 0.45, Math.sin(a) * 1.5], null, 0.09); }
    const top = new THREE.Group(); top.position.y = 0; g.add(top);
    mesh(cyl(8), toon('#ffe066'), top, [0, 1.6, -0.9], null, [0.06, 2.3, 0.06]);
    const cap = mesh(cone(12), toon('#ff9ec7'), top, [0, 2.95, -0.2], null, [1.55, 0.55, 1.55]); outline(cap, OL, 1.04);
    for (let i = 0; i < 6; i++) mesh(cone(3), toon('#ffffff'), cap, [Math.cos(i) * 0.98, -0.5, Math.sin(i) * 0.98], [Math.PI, i, 0], [0.12, 0.2, 0.12]);
    mesh(sph(8), toon('#ffe066'), top, [0, 3.35, -0.2], null, 0.13);
    const horse = new THREE.Group(); horse.position.set(0.95, 0.9, 0.2); top.add(horse);
    mesh(sph(10), toon('#ffffff'), horse, [0, 0, 0], null, [0.22, 0.2, 0.42]); mesh(sph(10), toon('#ffffff'), horse, [0, 0.28, 0.36], [0.6, 0, 0], [0.13, 0.2, 0.13]);
    mesh(cyl(6), toon('#ffe066'), horse, [0, 0.8, 0], null, [0.03, 1.4, 0.03]); mesh(sph(6), toon('#ff9ec7'), horse, [0, 0.45, 0.3], null, [0.05, 0.12, 0.1]);
    wheel(-1.2, 1.0, 0.32); wheel(1.2, 1.0, 0.32); wheel(-1.2, -1.0, 0.32); wheel(1.2, -1.0, 0.32); seat = 0.68;
    anims.push((t, sp) => { top.rotation.y = 0; horse.position.y = 0.9 + Math.sin(t * 5) * 0.15; base.rotation.y = t * 1.5; });
  } else if (V === 'atom') {
    mesh(sph(16), toon('#ff8fc0', { emissive: '#ff4f9a', ei: 0.25 }), g, [0, 0.95, -0.15], null, [0.9, 0.55, 1.0]); outline(g.children[0], OL, 1.05);
    for (const [x, z] of [[-1.1, 0.9], [1.1, 0.9], [-1.1, -0.9], [1.1, -0.9]]) {
      const r = mesh(tor(0.14, 20), toon('#7ff5ff', { emissive: '#3fd8ff', ei: 0.5 }), g, [x, 0.42, z], [0, Math.PI / 2, 0], 0.4); wheels.push(r);
      mesh(sph(8), toon('#ffffff', { emissive: '#ffffff', ei: 0.6 }), r, [1, 0, 0], null, 0.25); }
    const orb = new THREE.Group(); orb.position.set(0, 1.0, -0.15); g.add(orb);
    for (let i = 0; i < 2; i++) { const o = new THREE.Group(); o.rotation.set(1.2, i * 1.6, 0); orb.add(o); mesh(tor(0.02, 40), toon('#ffffff', { emissive: '#bff', ei: 0.4 }), o, null, null, 1.5);
      mesh(sph(8), toon('#ffe066', { emissive: '#ffdd44', ei: 0.8 }), o, [1.5, 0, 0], null, 0.12); }
    seat = 1.15; anims.push(t => { orb.rotation.y = t * 3; orb.children.forEach((o, i) => o.rotation.z = t * (2 + i)); });
  } else if (V === 'planet') {
    // swirling galaxy Cosmo floats on: spiral arms of stars + bright core + halo
    const gal = new THREE.Group(); gal.position.y = 0.55; g.add(gal);
    const n = 700, pos = new Float32Array(n * 3), colA = new Float32Array(n * 3); const cc = new THREE.Color();
    for (let i = 0; i < n; i++) { const arm = i % 3, f = Math.random(), r = 0.25 + f * 1.9, a = arm * 2.094 + f * 4.2 + (Math.random() - 0.5) * 0.5;
      pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = (Math.random() - 0.5) * 0.18 * (1.6 - f); pos[i * 3 + 2] = Math.sin(a) * r;
      cc.setHSL(0.75 - f * 0.25 + (arm === 1 ? 0.1 : 0), 0.9, 0.62 + (1 - f) * 0.3); colA[i * 3] = cc.r; colA[i * 3 + 1] = cc.g; colA[i * 3 + 2] = cc.b; }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(colA, 3));
    const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.24, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, map: glowTex() }));
    gal.add(pts);
    const disk = mesh(geo('galDisk', () => new THREE.CircleGeometry(2.2, 40)), new THREE.MeshBasicMaterial({ map: glowTex('#b48cff'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }), gal, [0, -0.02, 0], [-Math.PI / 2, 0, 0]);
    const core = mesh(sph(16), toon('#fff6d0', { emissive: '#ffe9a0', ei: 1, rim: 0 }), gal, [0, 0.05, 0], null, 0.32);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#ffe9a0'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); halo.scale.setScalar(1.8); gal.add(halo);
    seat = 0.9; wheels.length = 0;
    anims.push((t, sp) => { gal.rotation.y = -t * (1.2 + sp * 2.5); pts.material.size = 0.23 + Math.sin(t * 6) * 0.03; core.scale.setScalar(0.3 + Math.sin(t * 5) * 0.04); halo.scale.setScalar(1.7 + Math.sin(t * 5) * 0.2); gal.position.y = 0.55 + Math.sin(t * 2.4) * 0.12; });
  } else if (V === 'sled') {
    for (const s of [-1, 1]) { const r = mesh(box(), toon('#ff8fb8'), g, [s * 0.85, 0.15, 0], null, [0.14, 0.12, 2.6]); mesh(tor(0.3, 12), toon('#ff8fb8'), g, [s * 0.85, 0.42, 1.3], [0, Math.PI / 2, 0], [0.28, 0.28, 0.3]); }
    const deck = mesh(box(), toon('#ffffff'), g, [0, 0.4, 0], null, [1.9, 0.18, 2.4]); outline(deck, OL, 1.05);
    const dome = mesh(sph(20), toon('#dff4ff', { opacity: 0.3, rim: 0.9 }), g, [0, 0.55, 0.1], null, [1.25, 1.35, 1.25]); dome.renderOrder = 3;
    for (let i = 0; i < 10; i++) { const f = mesh(sph(5), toon('#ffffff', { emissive: '#fff', ei: 0.6 }), g, [Math.sin(i * 2.3) * 0.9, 0.8 + (i % 4) * 0.3, Math.cos(i * 1.9) * 0.9], null, 0.05);
      anims.push(t => { f.position.y = 1.85 - ((t * 0.3 + i * 0.1) % 1) * 1.3; }); }
    seat = 0.5;
  } else if (V === 'fishbowl') {
    const bowl = mesh(sph(20), toon('#bff4ff', { opacity: 0.32, rim: 0.9 }), g, [0, 1.15, 0], null, [1.25, 1.15, 1.35]); bowl.renderOrder = 3;
    mesh(sph(16), toon('#4fc3ff', { opacity: 0.55 }), g, [0, 0.85, 0], null, [1.18, 0.8, 1.28]);
    mesh(cyl(20), toon('#ffffff'), g, [0, 0.25, 0], null, [1.0, 0.25, 1.0]); outline(g.children[g.children.length - 1], OL, 1.05);
    const fins = [];
    for (const s of [-1, 1]) { const f = mesh(cone(4), toon('#ff9f4a'), g, [s * 1.35, 0.7, -0.2], [0, 0, -s * 1.2], [0.35, 0.8, 0.1]); fins.push([f, s]); }
    const tail = mesh(cone(4), toon('#ff9f4a'), g, [0, 0.9, -1.55], [-Math.PI / 2, 0, 0], [0.45, 0.7, 0.12]);
    for (let i = 0; i < 4; i++) { const b = mesh(sph(6), toon('#ffffff', { opacity: 0.7 }), g, [Math.sin(i) * 0.6, 0.8, Math.cos(i * 2) * 0.6], null, 0.07); anims.push(t => { b.position.y = 0.5 + ((t * 0.5 + i * 0.25) % 1) * 1.1; }); }
    anims.push(t => { fins.forEach(([f, s]) => f.rotation.x = Math.sin(t * 8) * 0.4); tail.rotation.y = Math.sin(t * 7) * 0.4; });
    seat = 0.55;
  } else if (V === 'rocket') {
    const b = mesh(geo('lamp', () => new THREE.LatheGeometry([[0.5, 0], [0.75, 0.3], [0.95, 1.0], [0.75, 1.7], [0.45, 2.2], [0.01, 2.4]].map(([r, y]) => new THREE.Vector2(r, y)), 20)), toon('#ff8f6a', { opacity: 0.8 }), g, [0, 0.3, -0.4], [Math.PI / 2 - 0.15, 0, 0]);
    outline(b, OL, 1.04); b.rotation.x = -Math.PI / 2 + 0.05; b.position.set(0, 0.95, 1.2); b.scale.set(0.9, 1.15, 0.9);
    for (let i = 0; i < 4; i++) { const blob = mesh(sph(10), toon('#ffe066', { emissive: '#ffb13d', ei: 0.7 }), g, [0, 0.95, 0], null, 0.25 - (i % 2) * 0.06);
      anims.push(t => { blob.position.z = 0.9 - ((t * 0.4 + i * 0.25) % 1) * 2.2; blob.position.y = 0.95 + Math.sin(t * 2 + i) * 0.15; }); }
    mesh(cyl(16), toon('#c9a0ff'), g, [0, 0.95, -1.35], [Math.PI / 2, 0, 0], [0.62, 0.5, 0.62]);
    const fl = mesh(cone(10), toon('#ffcf5a', { emissive: '#ff8f2a', ei: 0.9, opacity: 0.85 }), g, [0, 0.95, -2.0], [-Math.PI / 2, 0, 0], [0.4, 0.9, 0.4]);
    for (const s of [-1, 1]) mesh(box(), toon('#c9a0ff'), g, [s * 0.8, 0.6, -0.9], [0, 0, s * 0.4], [0.5, 0.1, 0.7]);
    wheel(-0.85, 0.7, 0.28); wheel(0.85, 0.7, 0.28); wheel(-0.85, -0.9, 0.3); wheel(0.85, -0.9, 0.3);
    seat = 1.15; anims.push((t, sp) => { fl.scale.y = 0.6 + Math.random() * 0.4 + sp * 0.6; });
  } else if (V === 'clock') {
    const face = mesh(cyl(28), toon('#fff8e6'), g, [0, 1.25, -0.7], [Math.PI / 2, 0, 0], [1.2, 0.3, 1.2]); outline(face, OL, 1.04);
    mesh(tor(0.1, 28), toon('#e8bc52'), g, [0, 1.25, -0.52], null, [1.2, 1.2, 1.2]);
    for (let i = 0; i < 12; i++) mesh(box(), toon('#7a5a3a'), g, [Math.cos(i * 0.5236) * 0.98, 1.25 + Math.sin(i * 0.5236) * 0.98, -0.52], [0, 0, i * 0.5236], [0.14, 0.05, 0.03]);
    const hm = new THREE.Group(); hm.position.set(0, 1.25, -0.5); g.add(hm); const hh = new THREE.Group(); hh.position.set(0, 1.25, -0.48); g.add(hh);
    mesh(box(), toon('#5a3a2a'), hm, [0, 0.4, 0], null, [0.06, 0.8, 0.03]); mesh(box(), toon('#5a3a2a'), hh, [0, 0.27, 0], null, [0.09, 0.55, 0.03]);
    const base = mesh(box(), toon('#e8bc52'), g, [0, 0.5, 0.2], null, [1.7, 0.35, 2.4]); outline(base, OL, 1.04);
    for (const s of [-1, 1]) mesh(sph(10), toon('#ffd36b'), g, [s * 0.55, 2.55, -0.7], null, [0.3, 0.22, 0.2]);
    wheel(-1.0, 1.0, 0.38, '#5a3a2a'); wheel(1.0, 1.0, 0.38, '#5a3a2a'); wheel(-1.0, -0.7, 0.45, '#5a3a2a'); wheel(1.0, -0.7, 0.45, '#5a3a2a');
    seat = 0.68; anims.push(t => { hm.rotation.z = -t * 2; hh.rotation.z = -t * 0.18; });
  } else if (V === 'cloud') {
    const cm = toon('#c3cbe6', { rim: 0.6 });
    [[0, 0.7, 0, 1.0], [0.9, 0.6, 0.3, 0.7], [-0.9, 0.6, 0.3, 0.7], [0.6, 0.65, -0.8, 0.75], [-0.6, 0.65, -0.8, 0.75], [0, 0.6, 1.0, 0.65]].forEach(([x, y, z, r]) => { const m = mesh(sph(14), cm, g, [x, y, z], null, [r, r * 0.75, r]); outline(m, '#5a5a8a', 1.05); });
    const bolts = [];
    for (const s of [-1, 1, 0]) { const b = mesh(cone(3), toon('#fff27a', { emissive: '#ffe040', ei: 1 }), g, [s * 0.7, 0.05, s ? 0 : -0.8], [Math.PI, 0, 0.3], [0.12, 0.6, 0.05]); bolts.push(b); }
    seat = 1.05; anims.push(t => bolts.forEach((b, i) => b.visible = ((t * 3 + i * 0.37) % 1) < 0.5));
  } else if (V === 'discoball') {
    const ball = mesh(geo('ico2', () => new THREE.IcosahedronGeometry(1, 2)), toon('#e6ecff', { flat: true, emissive: '#6040ff', ei: 0.2, rim: 0.7 }), g, [0, 0.95, 0], null, 0.95); outline(ball, OL, 1.03);
    mesh(cyl(20), toon('#ff8fd8'), g, [0, 1.45, 0], null, [0.95, 0.12, 0.95]);
    const lights = [];
    for (let i = 0; i < 6; i++) lights.push(mesh(sph(6), toon('#ffffff', { emissive: '#ffffff', ei: 1 }), g, [Math.cos(i * 1.05) * 1.25, 0.3, Math.sin(i * 1.05) * 1.25], null, 0.1));
    wheels.push(ball); seat = 1.4;
    anims.push(t => { ball.material.emissive.setHSL((t * 0.25) % 1, 0.9, 0.35); lights.forEach((l, i) => l.material.color.setHSL((t * 0.5 + i / 6) % 1, 1, 0.6)); });
  }
  g.userData = { wheels, seat, anims };
  return g;
}

export function makeKart(ch, idx = 0) {
  const kart = new THREE.Group();
  const tilt = new THREE.Group(); kart.add(tilt); // for drift/squash/spin
  const v = makeVehicle(ch); tilt.add(v);
  const c = makeCharacter(ch); c.userData.seed = idx; c.scale.setScalar(0.8); c.position.set(0, v.userData.seat, -0.15); tilt.add(c);
  // blob shadow
  const sh = new THREE.Mesh(geo('shadow', () => new THREE.CircleGeometry(1, 20)), shadowMat()); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.05; sh.scale.setScalar(1.6); kart.add(sh);
  const flame = new THREE.Group(); flame.position.set(0, 0.7, -1.7); tilt.add(flame);
  const fm = [['#ffd36b', 0.3, 1.0], ['#ff8a3a', 0.45, 1.5], ['#ff4fa0', 0.6, 2.0]];
  fm.forEach(([col, r, l], i) => { const f = mesh(geo('flame' + i, () => { const g = new THREE.ConeGeometry(r, l, 12, 1, true); g.rotateX(-Math.PI / 2); g.translate(0, 0, -l / 2); return g; }), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.7 - i * 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), flame); f.renderOrder = 5; });
  const fglow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#ffb84a'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); fglow.scale.setScalar(1.6); fglow.material.opacity = 0.7; flame.add(fglow);
  flame.visible = false;
  kart.userData = { tilt, vehicle: v, char: c, shadow: sh, flame };
  return kart;
}
let _shadowMat;
export function shadowMat() {
  if (_shadowMat) return _shadowMat;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(40,20,60,0.62)'); gr.addColorStop(1, 'rgba(60,30,80,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  _shadowMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false });
  return _shadowMat;
}
export function animKart(k, t, speed, expr = '') {
  const v = k.userData.vehicle.userData;
  for (const w of v.wheels) w.rotation.x += speed * 0.02;
  for (const a of v.anims) a(t, Math.min(1, speed / 40), k.userData.vehicle);
  animCharacter(k.userData.char, t, 1, expr, Math.min(1, speed / 40));
}

// ---------- items ----------
export function starShape(r1 = 1, r2 = 0.45, n = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i <= n * 2; i++) { const a = i / (n * 2) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? r2 : r1; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  return s;
}
// v10: cajita premium sólida — cubo redondeado, caras con degradado arcoíris brillante, «?» en relieve y estrella dorada flotando encima
function roundedBox(size, r, seg) {
  const g = new THREE.BoxGeometry(size, size, size, seg, seg, seg), p = g.attributes.position, h = size / 2 - r, v = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); c.set(Math.max(-h, Math.min(h, v.x)), Math.max(-h, Math.min(h, v.y)), Math.max(-h, Math.min(h, v.z))); v.sub(c).normalize().multiplyScalar(r).add(c); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
}
let boxTex;
function itemBoxTex() {
  if (boxTex) return boxTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 256, 256); gr.addColorStop(0, '#ff6fc0'); gr.addColorStop(0.35, '#ffb36b'); gr.addColorStop(0.65, '#7ff5ff'); gr.addColorStop(1, '#b98cff');
  x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
  const sh = x.createLinearGradient(0, 0, 0, 256); sh.addColorStop(0, 'rgba(255,255,255,.55)'); sh.addColorStop(0.45, 'rgba(255,255,255,.08)'); sh.addColorStop(1, 'rgba(80,20,120,.25)'); x.fillStyle = sh; x.fillRect(0, 0, 256, 256);
  x.lineWidth = 18; x.strokeStyle = '#ffffff'; x.beginPath(); x.roundRect(14, 14, 228, 228, 36); x.stroke();
  x.lineWidth = 4; x.strokeStyle = 'rgba(255,220,120,.95)'; x.beginPath(); x.roundRect(30, 30, 196, 196, 26); x.stroke();
  x.font = '700 150px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = 'rgba(90,30,120,.55)'; x.fillText('?', 134, 142); x.fillStyle = '#ffffff'; x.fillText('?', 128, 134);
  x.fillStyle = 'rgba(255,255,255,.85)'; x.beginPath(); x.ellipse(70, 60, 34, 14, -0.6, 0, 7); x.fill();
  boxTex = new THREE.CanvasTexture(cv); boxTex.colorSpace = THREE.SRGBColorSpace; boxTex.anisotropy = 4; return boxTex;
}
export function makeItemBox() {
  const g = new THREE.Group();
  const cube = mesh(geo('rboxR', () => roundedBox(1.7, 0.28, 4)), toon('#ffffff', { rim: 0.7, emissive: '#ffb0e0', ei: 0.12, nocache: true }), g);
  cube.material.map = itemBoxTex(); cube.material.needsUpdate = true; outline(cube, '#ffffff', 1.06);
  g.userData.cube = cube;
  const star = mesh(geo('star', () => new THREE.ExtrudeGeometry(starShape(0.55, 0.24), { depth: 0.18, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 1 })), toon('#ffe066', { emissive: '#ffcc33', ei: 0.5, rim: 0.9 }), g, [0, 1.55, -0.09], null, 0.62);
  g.userData.star = star;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#fff0a0'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 })); glow.scale.setScalar(4.2); g.add(glow);
  return g;
}
export function makeProjectile(type) {
  const g = new THREE.Group();
  if (type === 'osito') {
    const m = toon('#ff6fa0', { opacity: 0.85, rim: 0.6 });
    mesh(sph(12), m, g, [0, 0.7, 0], null, [0.55, 0.6, 0.5]); mesh(sph(12), m, g, [0, 1.35, 0], null, 0.45);
    for (const s of [-1, 1]) { mesh(sph(8), m, g, [s * 0.32, 1.72, 0], null, 0.16); mesh(sph(8), m, g, [s * 0.5, 0.75, 0.1], null, [0.15, 0.25, 0.15]); mesh(sph(8), m, g, [s * 0.28, 0.2, 0.1], null, [0.18, 0.2, 0.2]);
      mesh(sph(6), toon('#2a1838', { rim: 0 }), g, [s * 0.15, 1.42, 0.4], null, 0.06); }
    g.children.forEach(c => c.material === m && outline(c, '#a03060', 1.06));
  } else if (type === 'misil') {
    const stick = mesh(cyl(6), toon('#ffffff'), g, [0, 0.9, -0.9], [Math.PI / 2, 0, 0], [0.08, 1.4, 0.08]);
    const pop = mesh(sph(14), toon('#ff6f9a', { emissive: '#ff3f7a', ei: 0.3 }), g, [0, 0.9, 0.2], null, 0.6); outline(pop, '#a03060', 1.06);
    mesh(tor(0.18, 20), toon('#ffffff'), pop, [0, 0, 0], [0, 0, 0], 0.6); mesh(tor(0.18, 20), toon('#ffe066'), pop, [0, 0, 0], [Math.PI / 2, 0, 0], 0.75);
    g.userData.spin = pop;
  } else if (type === 'charco') {
    const p = mesh(geo('puddle', () => { const s = new THREE.Shape(); for (let i = 0; i <= 24; i++) { const a = i / 24 * 6.283, r = 1 + Math.sin(a * 3) * 0.15 + Math.cos(a * 5) * 0.08; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } return new THREE.ShapeGeometry(s); }),
      toon('#7ee3c4', { opacity: 0.8, rim: 0, emissive: '#3fc49f', ei: 0.3 }), g, [0, 0.08, 0], [-Math.PI / 2, 0, 0], 1.6);
    mesh(sph(8), toon('#d8fbef', { opacity: 0.9 }), g, [0.4, 0.15, 0.3], null, [0.3, 0.08, 0.2]);
  }
  return g;
}
export function makeSeta() {
  const g = new THREE.Group();
  const cap = mesh(geo('setaCap', () => new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2)), toon('#ff8fc0', { rim: 0.6 }), g, [0, 0.9, 0], null, [1, 0.8, 1]);
  outline(cap, '#a03060', 1.05);
  for (let i = 0; i < 6; i++) { const a = i * 1.1, h = 0.35 + (i % 2) * 0.3; mesh(sph(8), toon('#fffbe0'), cap, [Math.cos(a) * Math.cos(h) * 0.98, Math.sin(h) * 0.98, Math.sin(a) * Math.cos(h) * 0.98], null, 0.18); }
  mesh(cyl(14), toon('#fff4e0'), g, [0, 0.5, 0], null, [0.5, 0.8, 0.5]);
  for (const s of [-1, 1]) mesh(sph(6), toon('#2a1838', { rim: 0 }), g, [s * 0.18, 0.55, 0.46], null, [0.06, 0.1, 0.05]);
  return g;
}
export function makeTrophy(color, tier = 0) {
  const g = new THREE.Group();
  const m = toon(color, { rim: 0.8, emissive: color, ei: 0.15 });
  const cup = mesh(geo('trophyCup', () => new THREE.LatheGeometry([[0.05, 0], [0.4, 0.05], [0.12, 0.25], [0.12, 0.65], [0.35, 0.8], [0.85, 1.2], [1.0, 1.95], [0.95, 2.0]].map(([r, y]) => new THREE.Vector2(r, y)), 28)), m, g, [0, 0.55, 0]);
  outline(cup, '#4a2a5a', 1.03);
  for (const s of [-1, 1]) mesh(tor(0.16, 16), m, g, [s * 1.05, 2.0, 0], [0, 0, 0], [0.4, 0.5, 0.4]);
  const base = mesh(cyl(20), toon('#fff4fa'), g, [0, 0.3, 0], null, [0.8, 0.6, 0.8]); outline(base, '#4a2a5a', 1.04);
  const st = mesh(geo('starT', () => new THREE.ExtrudeGeometry(starShape(0.35, 0.15), { depth: 0.08, bevelEnabled: false })), toon(['#ffd84a', '#dfe6f0', '#e8a46a'][tier] || '#ffd84a', { emissive: '#ffffff', ei: 0.15 }), g, [0, 1.75, 0.9]);
  return g;
}
