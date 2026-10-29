import * as THREE from 'three';
import { crazyAccessories } from './accesorios.js?v=o41';
import { buildDisco, fuzzTexture } from './disco.js?v=o41';

// ---------- toon materials ----------
let gradTex;
function gradient() {
  if (gradTex) return gradTex;
  // rampa suave (sombreado progresivo, más realista que 3 escalones) con un suelo de luz para que no queden negros
  const N = 128, d = new Uint8Array(N * 4);
  for (let i = 0; i < N; i++) { const u = i / (N - 1), k = Math.min(1, Math.max(0, (u - 0.24) / 0.56)), sm = k * k * (3 - 2 * k), v = 0.36 + 0.64 * sm;
    d[i * 4] = Math.round(255 * (v * 0.97 + 0.03 * (1 - sm) * 0.9)); d[i * 4 + 1] = Math.round(255 * (v * 0.95)); d[i * 4 + 2] = Math.round(255 * Math.min(1, v * 1.0 + 0.06 * (1 - sm))); d[i * 4 + 3] = 255; }
  gradTex = new THREE.DataTexture(d, N, 1, THREE.RGBAFormat);
  gradTex.minFilter = gradTex.magFilter = THREE.LinearFilter; gradTex.needsUpdate = true;
  return gradTex;
}
const matCache = new Map();
export function toon(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!o.nocache && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshToonMaterial({ color, gradientMap: gradient(), transparent: o.opacity != null && o.opacity < 1, opacity: o.opacity ?? 1,
    emissive: o.emissive || '#000000', emissiveIntensity: o.ei ?? 1, side: o.side || THREE.FrontSide, vertexColors: !!o.vc });
  if (o.opacity != null && o.opacity < 1) m.depthWrite = o.depthWrite ?? false;
  if (o.po) { m.polygonOffset = true; m.polygonOffsetFactor = -o.po; m.polygonOffsetUnits = -o.po * 2; }
  const rim = o.rim ?? 0.35;
  if (rim > 0) {
    m.onBeforeCompile = sh => {
      sh.uniforms.rimStr = { value: rim }; sh.uniforms.glossStr = { value: rim >= 0.5 ? 0.9 : 0.14 }; sh.uniforms.sssStr = { value: rim >= 0.5 ? 1.0 : 0.35 };
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float rimStr; uniform float glossStr; uniform float sssStr;')
        .replace('#include <opaque_fragment>', `
          { vec3 nn = normalize(normal), vv = normalize(vViewPosition);
            float ndv = clamp(dot(nn, vv), 0.0, 1.0);
            float fr = 1.0 - ndv;
            float up = 0.55 + 0.45 * clamp(nn.y * 0.8 + 0.35, 0.0, 1.0);
            // contraluz: borde brillante algo cálido arriba y lila abajo
            vec3 rc = mix(vec3(0.85, 0.8, 1.0), vec3(1.0, 0.97, 0.9), clamp(nn.y * 0.5 + 0.5, 0.0, 1.0));
            outgoingLight += rc * smoothstep(0.5, 1.0, fr) * rimStr * up * 1.35;
            // luz principal (brillo duro de gelatina + lóbulo suave) y luz de relleno de abajo-derecha
            vec3 h1 = normalize(normalize(vec3(-0.45, 0.65, 0.6)) + vv);
            float d1 = max(dot(nn, h1), 0.0);
            outgoingLight += vec3(1.0) * (pow(d1, 70.0) * 1.1 + pow(d1, 12.0) * 0.16) * glossStr;
            vec3 h2 = normalize(normalize(vec3(0.75, -0.25, 0.55)) + vv);
            outgoingLight += vec3(1.0, 0.92, 0.98) * pow(max(dot(nn, h2), 0.0), 26.0) * 0.2 * glossStr;
            // luz rebotada del suelo (rosada) y transmisión de luz por dentro (subsurface)
            float below = clamp(-nn.y * 0.55 + 0.1, 0.0, 1.0);
            outgoingLight += diffuseColor.rgb * vec3(1.0, 0.82, 0.95) * below * 0.2 * rimStr;
            outgoingLight += mix(diffuseColor.rgb, vec3(1.0), 0.3) * pow(fr, 1.6) * 0.34 * sssStr;
            // oclusión ambiental falsa: la parte baja de la figura, un pelín más oscura
            outgoingLight *= 1.0 - 0.1 * clamp(-nn.y, 0.0, 1.0) * rimStr; }
          #include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => 'rim4' + rim;
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

// perfil del cuerpo de gelatina (pies en y=0, altura ~1.62, radio ~1), suave y sin escalones
function bodyR(y) {
  const a = Math.min(1, Math.max(0, y / 1.62));
  const sm = (e0, e1, x) => { const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return k * k * (3 - 2 * k); };
  const tt = Math.min(1, 0.18 + a * 0.82), sn = Math.sin(Math.PI * tt), rMain = (tt > 0.5 ? Math.pow(sn, 0.62) : sn) * (1 - Math.max(0, a - 0.6) * 0.18), rSk = 0.78 + a * 1.6;
  let r = rSk + (rMain - rSk) * sm(0.07, 0.19, a);
  if (a > 0.97) r *= (1 - (a - 0.97) * 20);
  return Math.max(0.001, r);
}
function bodyGeo(low = false) {
  return geo(low ? 'body2low' : 'body2', () => {
    const p = [], N = low ? 14 : 44;
    for (let i = 0; i <= N; i++) { const a = i / N, y = a * 1.62; p.push(new THREE.Vector2(bodyR(y), y)); }
    p.unshift(new THREE.Vector2(0.001, 0.02));
    const g = new THREE.LatheGeometry(p, low ? 22 : 56); g.computeVertexNormals();
    // sombreado pintado en los vértices: arriba clarito, abajo algo más denso (la gelatina se espesa)
    const pos = g.attributes.position, c = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 1.62, k = 0.84 + 0.16 * Math.min(1, y * 1.25); c[i * 3] = k; c[i * 3 + 1] = k * 0.985; c[i * 3 + 2] = Math.min(1, k * 1.03); }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
  });
}
export const bodyGeometry = bodyGeo, bodyRadius = bodyR;
// punto sobre la superficie del cuerpo a altura y y ángulo phi (0 = de frente)
const onBody = (y, phi, off = 1.0) => { const r = bodyR(y) * off; return [Math.sin(phi) * r, y, Math.cos(phi) * r]; };
const IRIS = { mochi: '#ff5f9e', tiovivo: '#1fae85', atomo: '#3a74ff', cosmo: '#7a4cff', copito: '#3aa0ff', burbuja: '#0aa0c0', lava: '#ff5a1f', tictac: '#b8742a', trueno: '#6070b0', disco: '#ff2fb0' };
let _blush, _gloss, _star4;
const blushMat = () => _blush || (_blush = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,92,140,.85)'); g.addColorStop(.55, 'rgba(255,110,160,.45)'); g.addColorStop(1, 'rgba(255,120,170,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }); })());
const glossMat = () => _gloss || (_gloss = (() => { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 128; const x = cv.getContext('2d'), g = x.createRadialGradient(32, 64, 2, 32, 64, 60);
  g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.5, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.save(); x.translate(32, 64); x.scale(.5, 1); x.translate(-32, -64); x.fillRect(0, 0, 64, 128); x.restore();
  return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, opacity: .8 }); })());
const decal = (parent, mat, y, phi, w, h, roll = 0, off = 1.012) => { const p = onBody(y, phi, off), m = new THREE.Mesh(geo('pl1', () => new THREE.PlaneGeometry(1, 1)), mat); m.scale.set(w, h, 1); m.position.set(...p); m.lookAt(p[0] * 2, y + (roll ? 0 : 0), p[2] * 2); m.rotateZ(roll); m.renderOrder = 4; parent.add(m); return m; };

// ---------- characters ----------
export function makeCharacter(ch, opts = {}) {
  const lite = opts.lite ?? !ch.id;
  const root = new THREE.Group(); root.name = 'char';
  const ud = root.userData; ud.fx = []; ud.arms = []; ud.casters = []; ud.lite = lite;
  const inner = new THREE.Group(); root.add(inner);
  buildInner(ch.inner, inner, ch); if (ch.id === 'disco') inner.scale.setScalar(0.7);
  const OLC = hex(col(ch.color, -0.55));
  const bodyMat = toon(hex(col(ch.color, 0.05)), { opacity: ch.id === 'disco' ? 0.8 : 0.74, rim: 0.55, vc: true, depthWrite: false, nocache: ch.id === 'disco' }); if (ch.id === 'disco') bodyMat.map = fuzzTexture();
  const body = mesh(bodyGeo(), bodyMat, root);
  body.renderOrder = 2; ud.casters.push(body);
  const ol = outline(body, OLC, 1.04); ol.renderOrder = 1;
  const eyeM = toon('#2a1838', { rim: 0 }), whiteM = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const eyes = [];
  // ----- ojos -----
  for (const s of [-1, 1]) {
    const eg = new THREE.Group(); eg.position.set(s * 0.36, 0.86, 0.86); eg.rotation.y = s * 0.1; root.add(eg); eyes.push(eg);
    if (lite) {
      const e = mesh(sph(14), eyeM, eg, null, null, [0.17, 0.21, 0.1]);
      mesh(sph(8), whiteM, eg, [0.06, 0.08, 0.07], null, 0.065); mesh(sph(8), whiteM, eg, [-0.05, -0.07, 0.08], null, 0.03);
    } else {
      mesh(sph(20), eyeM, eg, null, null, [0.2, 0.25, 0.11]);
      const iris = mesh(sph(16), toon(IRIS[ch.id] || '#7a4cff', { rim: 0, emissive: IRIS[ch.id] || '#7a4cff', ei: 0.35 }), eg, [0, -0.045, 0.028], null, [0.15, 0.19, 0.095]);
      mesh(sph(14), eyeM, eg, [0, 0.0, 0.06], null, [0.095, 0.125, 0.07]);
      mesh(sph(10), whiteM, eg, [0.07, 0.1, 0.1], null, 0.07); mesh(sph(8), whiteM, eg, [-0.06, -0.085, 0.11], null, 0.034); mesh(sph(6), whiteM, eg, [0.09, -0.04, 0.105], null, 0.018);
      for (let k = 0; k < 3; k++) mesh(box(), eyeM, eg, [s * (0.17 + k * 0.012), 0.11 + k * 0.045, 0.05], [0, 0, -s * (0.55 + k * 0.28)], [0.12, 0.022, 0.03]); // pestañas
    }
  }
  // mejillas con degradado y pecas
  for (const s of [-1, 1]) {
    decal(root, blushMat(), 0.66, s * 0.66, lite ? 0.3 : 0.34, lite ? 0.19 : 0.21, 0, 1.01);
    if (!lite) for (let k = 0; k < 3; k++) { const p = onBody(0.7 + (k % 2) * 0.04 - 0.02, s * (0.5 + k * 0.1), 1.0); mesh(sph(6), toon('#ff6a9a', { rim: 0 }), root, p, null, [0.022, 0.022, 0.012]); }
  }
  const mouth = mesh(tor(0.25, 12), eyeM, root, [0, 0.66, 0.93], [0.2, 0, Math.PI], [0.09, 0.07, 0.07]);
  mouth.geometry = geo('mouth', () => new THREE.TorusGeometry(1, 0.28, 6, 12, Math.PI));
  let tongue = null; if (!lite) { tongue = mesh(sph(8), toon('#ff7fa8', { rim: 0 }), root, [0, 0.6, 0.93], null, [0.06, 0.04, 0.03]); tongue.visible = false; }
  ud.eyes = eyes; ud.mouth = mouth; ud.tongue = tongue;
  const happy = new THREE.Group(), xx = new THREE.Group(); root.add(happy); root.add(xx); happy.visible = xx.visible = false;
  const arcG = geo('arc', () => new THREE.TorusGeometry(1, 0.3, 6, 12, Math.PI));
  for (const s of [-1, 1]) {
    mesh(arcG, eyeM, happy, [s * 0.36, 0.84, 0.9], [0.2, 0, 0], [0.13, 0.13, 0.1]);
    for (const r of [0.6, -0.6]) mesh(box(), eyeM, xx, [s * 0.36, 0.86, 0.92], [0.2, 0, r * (s > 0 ? 1 : -1)], [0.28, 0.06, 0.05]);
  }
  mesh(sph(10), eyeM, xx, [0, 0.62, 0.93], null, [0.1, 0.13, 0.05]);
  ud.happy = happy; ud.xx = xx;
  // brillos de gelatina pintados en el cuerpo
  decal(root, glossMat(), 1.18, -0.6, 0.26, 0.5, -0.5); decal(root, glossMat(), 0.52, -0.95, 0.12, 0.28, -0.3); decal(root, glossMat(), 1.38, -0.25, 0.1, 0.1, 0);
  // ----- orejas -----
  const earM = toon(hex(col(ch.color, -0.05)), { opacity: 0.88, rim: 0.5 }), innerM = toon(hex(col(ch.color, 0.55).lerp(new THREE.Color('#ff9ec4'), 0.35)), { rim: 0.2 });
  const ears = new THREE.Group(); root.add(ears); ud.ears = ears;
  const E = ch.ears;
  for (const s of [-1, 1]) {
    if (E === 'bunny') { const g = new THREE.Group(); g.position.set(s * 0.42, 1.38, 0); g.rotation.z = -s * 0.35; ears.add(g);
      const e = mesh(sph(16), earM, g, [0, 0.55, 0], null, [0.2, 0.62, 0.17]); outline(e, OLC, 1.08); mesh(sph(14), innerM, g, [0, 0.52, 0.07], null, [0.12, 0.46, 0.1]); ud.casters.push(e); }
    if (E === 'bear') { const e = mesh(sph(16), earM, ears, [s * 0.62, 1.42, 0], null, [0.26, 0.24, 0.16]); outline(e, OLC, 1.08); mesh(sph(12), innerM, ears, [s * 0.62, 1.42, 0.07], null, [0.16, 0.15, 0.1]); }
    if (E === 'cat') { const dc = ch.id === 'disco', ex = dc ? 0.64 : 0.5, ey = dc ? 1.52 : 1.6, er = dc ? 0.55 : 0.3, es = dc ? 1.3 : 1; const e = mesh(cone(4), earM, ears, [s * ex, ey, 0], [0, 0, -s * er], [0.26 * es, 0.42 * es, 0.2 * es]); outline(e, OLC, 1.1); mesh(cone(4), innerM, ears, [s * ex, ey - 0.04, 0.08], [0, 0, -s * er], [0.15 * es, 0.3 * es, 0.1 * es]); }
    if (E === 'horns') { const h = mesh(cone(10), toon('#fff3b0', { rim: 0.4 }), ears, [s * 0.45, 1.55, 0], [0, 0, -s * 0.45], [0.13, 0.38, 0.13]); outline(h, '#b89a40', 1.08);
      mesh(tor(0.08, 12), toon('#e8d27a', { rim: 0.3 }), h, [0, -0.1, 0], [Math.PI / 2, 0, 0], [1.05, 1.05, 1.5]); mesh(tor(0.08, 12), toon('#e8d27a', { rim: 0.3 }), h, [0, 0.12, 0], [Math.PI / 2, 0, 0], [0.8, 0.8, 1.5]); }
    if (E === 'fins') { const f = mesh(cone(4), earM, ears, [s * 0.98, 0.85, -0.1], [0, 0, -s * 1.9], [0.3, 0.5, 0.06]); outline(f, OLC, 1.1); for (let k = -1; k <= 1; k++) mesh(box(), innerM, f, [k * 0.18, 0.02, 0.6], [0, 0, k * 0.2], [0.04, 0.8, 0.5]); }
    if (E === 'antenna') { const g = new THREE.Group(); g.position.set(s * 0.32, 1.48, 0); g.rotation.z = -s * 0.3; ears.add(g);
      mesh(cyl(8), toon('#7a6aa8', { rim: 0 }), g, [0, 0.25, 0], null, [0.03, 0.5, 0.03]);
      const bulb = mesh(sph(12), toon('#ffe066', { emissive: '#ffcc33', ei: 0.7 }), g, [0, 0.55, 0], null, 0.12); if (!lite) { const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('#ffe066'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); gl.scale.setScalar(6); bulb.add(gl); } }
  }
  // ----- accesorios de siempre -----
  const A = ch.acc;
  if (A === 'flag') { mesh(cyl(6), toon('#8a6a4a', { rim: 0 }), root, [0, 1.85, 0], null, [0.03, 0.55, 0.03]);
    const fl = mesh(geo('flag', () => { const g = new THREE.PlaneGeometry(0.46, 0.3, 8, 4); g.translate(0.23, 0, 0); return g; }), toon('#ff6fa8', { side: THREE.DoubleSide, rim: 0 }), root, [0.02, 2.0, 0]);
    const base = fl.geometry.attributes.position.array.slice(); ud.fx.push(t => { const a = fl.geometry.attributes.position; for (let i = 0; i < a.count; i++) { const x = base[i * 3]; a.array[i * 3 + 2] = Math.sin(x * 14 - t * 8) * 0.05 * x * 2.2; } a.needsUpdate = true; }); }
  if (A === 'ring') { const r = mesh(tor(0.06, 48), toon('#ffe9a0', { emissive: '#ffd060', ei: 0.5, rim: 0.7 }), root, [0, 1.25, 0], [Math.PI / 2 - 0.25, 0, 0.2], [1.25, 1.25, 1.25]); ud.spin = r; }
  if (A === 'beanie') { mesh(sph(20), toon('#ff8fb8'), root, [0, 1.42, 0], null, [0.78, 0.42, 0.78]);
    mesh(sph(14), toon('#ffffff'), root, [0, 1.85, 0], null, 0.17); mesh(tor(0.3, 24), toon('#ffffff'), root, [0, 1.3, 0], [Math.PI / 2, 0, 0], [0.78, 0.78, 0.6]); }
  if (A === 'lampcap') { mesh(cyl(24), toon('#c9a0ff', { rim: 0.6 }), root, [0, 1.62, 0], null, [0.45, 0.22, 0.45]); mesh(cyl(24), toon('#c9a0ff', { rim: 0.6 }), root, [0, 0.08, 0], null, [0.92, 0.16, 0.92]); mesh(tor(0.1, 20), toon('#ffd36b', { rim: 0.6 }), root, [0, 1.52, 0], [Math.PI / 2, 0, 0], [0.45, 0.45, 0.6]); }
  if (A === 'key') { const k = new THREE.Group(); k.position.set(0, 0.95, -1.0); root.add(k); ud.spinKey = k;
    mesh(cyl(10), toon('#d4a73f', { rim: 0.6 }), k, [0, 0, -0.15], [Math.PI / 2, 0, 0], [0.05, 0.3, 0.05]);
    for (const s of [-1, 1]) mesh(tor(0.3, 18), toon('#e8bc52', { rim: 0.6 }), k, [s * 0.2, 0, -0.32], [0, Math.PI / 2, 0], 0.17); }
  if (A === 'shades') { const sm = toon('#2a1838', { rim: 0.9 });
    for (const s of [-1, 1]) { mesh(cyl(20), sm, root, [s * 0.36, 0.9, 1.0], [Math.PI / 2, 0, 0], [0.26, 0.06, 0.22]); mesh(tor(0.1, 20), toon('#ffd36b', { rim: 0.6 }), root, [s * 0.36, 0.9, 1.03], null, [0.26, 0.22, 0.2]); mesh(sph(8), whiteM, root, [s * 0.36 + 0.07, 0.97, 1.07], null, [0.05, 0.03, 0.01]); }
    mesh(box(), toon('#ffd36b'), root, [0, 0.93, 1.02], null, [0.3, 0.05, 0.05]); }
  ud.body = body; ud.inner = inner;
  if (ch.id === 'disco') { try { buildDisco(root, ud, { toon, mesh, outline, sph, cyl, cone, box, tor, geo, bodyR, gradient, glowTex }, ch, lite); } catch (e) { console.warn('disco', e); } }
  if (!lite) {
    const det = new THREE.Group(); det.name = 'detalle'; root.add(det); ud.det = det; // todo lo decorativo vive aquí: se puede apagar si el móvil va justo
    // brazos y pies de gelatina
    const limb = toon(hex(col(ch.color, -0.02)), { rim: 0.5 });
    for (const s of [-1, 1]) {
      const pv = new THREE.Group(); pv.position.set(s * 0.93, 0.78, 0.1); root.add(pv); ud.arms.push(pv); pv.userData.s = s;
      const a = mesh(sph(14), limb, pv, [s * 0.1, -0.08, 0], [0, 0, s * 0.45], [0.17, 0.28, 0.17]); outline(a, OLC, 1.08); ud.casters.push(a);
      const hnd = mesh(sph(10), limb, pv, [s * 0.2, -0.3, 0.02], null, 0.15); outline(hnd, OLC, 1.1);
      const ft = mesh(sph(14), limb, root, [s * 0.4, 0.09, 0.5], null, [0.3, 0.16, 0.36]); outline(ft, OLC, 1.08); ud.casters.push(ft);
    }
    // purpurina de mochi: confeti pastel pegado al cuerpo
    for (let i = 0; i < 9; i++) { const y = 0.25 + ((i * 0.6180339) % 1) * 1.1, ph = (i * 2.399) % 6.283, p = onBody(y, ph, 1.005); if (Math.cos(ph) < -0.1) continue;
      mesh(sph(6), toon(['#ffffff', '#ffe27a', '#bff0ff', '#ffc2e0'][i % 4], { emissive: '#ffffff', ei: 0.35, rim: 0 }), det, p, null, [0.04, 0.04, 0.02]); }
    if (ch.id) { try { crazyAccessories(ch, det, ud, { toon, mesh, outline, sph, cyl, cone, box, tor, geo, col, hex, glowTex, THREE, onBody, bodyR }); } catch (e) { console.warn('accesorios', e); } }
  }
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
export function animCharacter(c, t, k = 1, expr = '') {
  const u = c.userData;
  if (u.happy) { const sad = expr === 'sad'; u.happy.visible = expr === 'happy'; u.xx.visible = expr === 'squash'; for (const e of u.eyes) e.visible = !expr || sad; const mk = u.mouthK || 1; u.mouth.scale.set((expr === 'happy' ? 0.13 : 0.09) * mk, (expr === 'happy' ? 0.11 : 0.07) * mk, 0.07); u.mouth.visible = expr !== 'squash';
    if (u.tongue) u.tongue.visible = expr === 'happy';
    // cara triste: boca del revés y un poco más abajo
    if (u.mouthRZ == null) { u.mouthRZ = u.mouth.rotation.z; u.mouthY = u.mouth.position.y; }
    u.mouth.rotation.z = sad ? 0 : u.mouthRZ; u.mouth.position.y = sad ? u.mouthY - 0.07 : u.mouthY; }
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
  const blink = (t * 0.9 + ((u.seed || 0) % 7) * 0.3) % 3.4 < 0.12;
  for (const e of u.eyes) e.scale.y = blink ? 0.12 : expr === 'sad' ? 0.62 : 1;
  u.ears.rotation.x = Math.sin(t * 6) * 0.08 * k;
  if (u.arms) for (const a of u.arms) a.rotation.z = a.userData.s * (-0.12 - 0.12 * Math.sin(t * 5 + a.userData.s + (u.seed || 0)) - (expr === 'happy' ? 0.7 + 0.25 * Math.sin(t * 14 + a.userData.s) : 0));
  if (u.fx) for (const f of u.fx) f(t, expr);
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
  // v5: nube de humo de dibujos (el «pedete» del turbo) en lugar de llama
  const puffM = toon('#ffffff', { opacity: 0.9, rim: 0.8, emissive: '#f4e8ff', ei: 0.35 }), puffs = [];
  [[0, 0, -0.3, 0.55], [0.45, 0.15, -0.9, 0.5], [-0.45, 0.1, -1.0, 0.48], [0, 0.35, -1.5, 0.62], [0.3, 0.05, -2.1, 0.42], [-0.3, 0.3, -2.3, 0.4]].forEach(([x, y, z, r], j) => { const p = mesh(sph(12), puffM, flame, [x, y, z], null, r); outline(p, '#d8b8e8', 1.08); p.userData.base = r; p.userData.ph = j * 1.3; puffs.push(p); });
  flame.userData.puffs = puffs;
  flame.visible = false;
  kart.userData = { tilt, vehicle: v, char: c, shadow: sh, flame };
  return kart;
}
let _shadowMat;
export function shadowMat() {
  if (_shadowMat) return _shadowMat;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(35,15,55,0.78)'); gr.addColorStop(0.35, 'rgba(45,20,70,0.5)'); gr.addColorStop(0.7, 'rgba(60,30,90,0.16)'); gr.addColorStop(1, 'rgba(60,30,80,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  _shadowMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false });
  return _shadowMat;
}
export function animKart(k, t, speed, expr = '') {
  const v = k.userData.vehicle.userData;
  for (const w of v.wheels) w.rotation.x += speed * 0.02;
  for (const a of v.anims) a(t, Math.min(1, speed / 40), k.userData.vehicle);
  animCharacter(k.userData.char, t, 1, expr);
}

// ---------- items ----------
export function starShape(r1 = 1, r2 = 0.45, n = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i <= n * 2; i++) { const a = i / (n * 2) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? r2 : r1; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  return s;
}
export function makeItemBox() {
  const g = new THREE.Group();
  const cube = mesh(geo('rbox', () => new THREE.BoxGeometry(1.6, 1.6, 1.6, 2, 2, 2)), toon('#ffffff', { opacity: 0.55, rim: 0.9, emissive: '#ffb0e0', ei: 0.35, nocache: true }), g);
  cube.renderOrder = 3; g.userData.cube = cube;
  const star = mesh(geo('star', () => new THREE.ExtrudeGeometry(starShape(0.55, 0.24), { depth: 0.18, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 1 })), toon('#ffe066', { emissive: '#ffcc33', ei: 0.5 }), g, [0, 0, -0.09]);
  g.userData.star = star;
  return g;
}
export function makeBomba() {
  const g = new THREE.Group(); const b = mesh(sph(14), toon('#7fe08a', { opacity: 0.88, rim: 0.7, emissive: '#3fbf5a', ei: 0.25 }), g, [0, 0, 0], null, 0.95); outline(b, '#2f8040', 1.07);
  mesh(cyl(6), toon('#5a3a2a'), g, [0, 1.0, 0], null, [0.12, 0.35, 0.12]); mesh(sph(8), toon('#ffd84a', { emissive: '#ff9f00', ei: 1 }), g, [0, 1.25, 0], null, 0.2);
  for (const sx of [-1, 1]) mesh(sph(6), toon('#2a1838', { rim: 0 }), g, [sx * 0.3, 0.2, 0.85], null, 0.12); return g;
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
