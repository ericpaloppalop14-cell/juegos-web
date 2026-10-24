// ======================================================================
//  MOCHI RACERS v25 · «circuitos HD»: bordillos con relieve, hierba, flores, piedras,
//  banderas que ondean, partículas ambientales por temática. Todo instanciado (1 draw call
//  por tipo) y con geometrías/materiales compartidos. Nivel de detalle según calidad.
// ======================================================================
import * as THREE from 'three';
import { toon } from './gfx.js';
const V3 = THREE.Vector3, C = c => new THREE.Color(c);
const G = {}; const geo = (k, f) => G[k] || (G[k] = f());

// matojo de hierba: 7 hojas finas (triángulos dobles) con la punta más clara (vertex colors)
function tuftGeo() { return geo('tuft', () => { const p = [], c = [], n = 7; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + i * 0.7, r = 0.18 + (i % 3) * 0.08, h = 0.7 + ((i * 37) % 10) / 10 * 0.6, lean = 0.25 + (i % 2) * 0.2;
      const bx = Math.cos(a) * r, bz = Math.sin(a) * r, px = -Math.sin(a) * 0.09, pz = Math.cos(a) * 0.09, tx = bx + Math.cos(a) * lean, tz = bz + Math.sin(a) * lean;
      p.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, tx, h, tz); c.push(0.62, 0.62, 0.62, 0.62, 0.62, 0.62, 1.12, 1.12, 1.12); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.computeVertexNormals(); return g; }); }
function flowerHeadGeo() { return geo('fhead', () => { const g = new THREE.CircleGeometry(1, 5); const pos = g.attributes.position; for (let i = 1; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); pos.setXY(i, x * 1, y * 1); } g.rotateX(-Math.PI / 2); return g; }); }
function petalGeo() { return geo('petals', () => { const parts = []; for (let i = 0; i < 5; i++) { const s = new THREE.SphereGeometry(0.5, 7, 5); s.scale(0.55, 0.16, 0.32); s.translate(0.42, 0, 0); s.rotateY(i / 5 * Math.PI * 2); parts.push(s); } return merge(parts); }); }
function merge(list) { let n = 0, ni = 0; for (const g of list) { n += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const P = new Float32Array(n * 3), Nn = new Float32Array(n * 3), I = []; let o = 0; for (const g of list) { P.set(g.attributes.position.array, o * 3); Nn.set(g.attributes.normal.array, o * 3); const ix = g.index ? g.index.array : [...Array(g.attributes.position.count).keys()]; for (const v of ix) I.push(v + o); o += g.attributes.position.count; }
  const r = new THREE.BufferGeometry(); r.setAttribute('position', new THREE.BufferAttribute(P, 3)); r.setAttribute('normal', new THREE.BufferAttribute(Nn, 3)); r.setIndex(I); return r; }

const THEME = {
  candy:     { grass: ['#8fe8bc', '#a8f0cf', '#7fd8b0'], fl: ['#ff8fc0', '#ffffff', '#ffd36b', '#b9a2f7'], fc: '#fff3a0', rock: ['#f4d9ec', '#e8d0f4'], flags: ['#ff7fb6', '#ffffff', '#7ee3c4'], pt: { col: ['#ffffff', '#ffd0ea', '#fff3b0'], n: 420, size: 0.35, fall: -0.6, drift: 0.8, tw: 1 } },
  sunflower: { grass: ['#6fbf4a', '#8fd46a', '#5aa83e'], fl: ['#ffcf2a', '#ff8f3a', '#ffffff', '#ff6f8f'], fc: '#7a4a1a', rock: ['#d8c8a8', '#c8b898'], flags: ['#ffbf2a', '#ffffff', '#ff8f3a'], pt: { col: ['#fff3a0', '#ffe066', '#ffffff'], n: 380, size: 0.28, fall: -0.25, drift: 1.4, tw: 0.6 } },
  ice:       { grass: ['#dff1ff', '#c8e4ff', '#ffffff'], fl: ['#9fd4ff', '#ffffff', '#ffc4e1'], fc: '#ffffff', rock: ['#d8e8ff', '#b8d0f0'], flags: ['#ff8fc0', '#ffffff', '#9fd4ff'], pt: { col: ['#ffffff', '#eaf6ff'], n: 700, size: 0.42, fall: -3.2, drift: 1.1, tw: 0.2 } },
  storm:     { grass: ['#4a3a8a', '#5a4aa8', '#3a2a70'], fl: ['#ff5fd2', '#5ff5ff', '#ffe066'], fc: '#ffffff', rock: ['#3a2f60', '#2f2650'], flags: ['#ff5fd2', '#5ff5ff', '#b98aff'], glow: true, pt: { col: ['#ff5fd2', '#5ff5ff', '#ffe066', '#b98aff'], n: 420, size: 0.32, fall: 0.4, drift: 1.6, tw: 1.5, add: true } },
  space:     { pt: { col: ['#ffffff', '#ffe9a8', '#bfe8ff', '#ffb8ea'], n: 520, size: 0.4, fall: 0.15, drift: 0.5, tw: 2, add: true } },
};
const LOOKPT = { // partículas para los mundos de ensueño (tema space con look propio)
  cielo: { col: ['#ffffff', '#ffe0f4', '#d8f0ff'], n: 420, size: 0.5, fall: -0.5, drift: 1.6, tw: 0.4 },
  sueno: { col: ['#ffe9a8', '#ffffff', '#ffb8ea', '#c8b8ff'], n: 480, size: 0.36, fall: 0.25, drift: 0.7, tw: 2.2, add: true },
  ballena: { col: ['#e8fbff', '#bff0ff', '#ffffff'], n: 520, size: 0.42, fall: 1.6, drift: 0.6, tw: 0.5, bub: true },
  biblioteca: { col: ['#fff6dc', '#ffe2a8', '#ffffff'], n: 380, size: 0.4, fall: -0.7, drift: 1.3, tw: 0.6 },
};

export function addHD(T, Q, rnd) {
  const { S, N, cup } = T; const space = cup.theme === 'space';
  const lod = Q.lod ?? (Q.hi ? 1 : 0.6); T.hd = { lod };
  const th = THEME[cup.theme] || THEME.candy; const anims = [];
  curbRelief(T, lod);
  if (!space && !T.open) { scatterGround(T, th, lod, rnd); flags(T, th, lod, anims); }
  ambient(T, (space && LOOKPT[cup.id]) || (space && cup.look && LOOKPT[Object.keys(LOOKPT).find(k => (cup.look + '').includes(k))]) || th.pt || THEME.candy.pt, lod, anims, rnd);
  T.anims.push((t, dt, race) => { for (const a of anims) a(t, dt, race); });
}

// --- bordillos con relieve: bloques redondeados alternos encima del bordillo pintado (solo visual, fuera del asfalto)
function curbRelief(T, lod) {
  const { S, N, cup } = T; const step = lod >= 0.9 ? 2 : 4; const cnt = Math.ceil(N / step) * 2;
  const g = geo('curbBlk', () => { const b = new THREE.CapsuleGeometry(0.22, 1.0, 2, 6); b.rotateZ(Math.PI / 2); b.scale(1, 0.55, 1.5); return b; });
  const im = new THREE.InstancedMesh(g, toon('#ffffff', { rim: 0.45 }), cnt); const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); let n = 0; const cA = C(cup.curbA), cB = C(cup.curbB);
  for (let i = 0; i < N; i += step) { const s = S[i]; if (T.inShortcut && T.inShortcut(s.p.x, s.p.z) != null) continue; const yaw = Math.atan2(s.fl.x, s.fl.z);
    for (const sd of [-1, 1]) { const d = sd * (s.w + 0.75), y = s.p.y + 0.06 + 0.125 + 0.1; e.set(0, yaw, -sd * Math.atan2(0.25, 1.4)); q.setFromEuler(e);
      m.compose(new V3(s.p.x + s.right.x * d, y, s.p.z + s.right.z * d), q, new V3(1, 1, 0.9)); im.setMatrixAt(n, m); im.setColorAt(n, ((i / 2) | 0) % 2 ? cA : cB); n++; } }
  im.count = n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.receiveShadow = true; T.group.add(im);
}

// distancia libre: fuera de pista + muro + talud (el talud crece con la altura de la pista)
function freeAt(T, x, z, margin) { const S = T.S; for (let j = 0; j < T.N; j += 3) { const q = S[j], r = q.wall + margin + Math.max(0, q.p.y) * 2.5 + 6; if ((q.p.x - x) ** 2 + (q.p.z - z) ** 2 < r * r) return false; }
  if (T.inShortcut && T.inShortcut(x, z) != null) return false; for (const sc of T.shortcuts || []) for (const q of sc.pts) if ((q.x - x) ** 2 + (q.z - z) ** 2 < 100) return false; return true; }
function spot(T, rnd, d0, d1, margin) { for (let k = 0; k < 30; k++) { const s = T.S[Math.floor(rnd() * T.N)], sd = rnd() < 0.5 ? -1 : 1, d = s.wall + 6 + Math.max(0, s.p.y) * 2.5 + d0 + rnd() * (d1 - d0);
    const x = s.p.x + s.right.x * sd * d, z = s.p.z + s.right.z * sd * d; if (freeAt(T, x, z, margin)) return new V3(x, -0.6, z); } return null; }

function scatterGround(T, th, lod, rnd) {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const put = (im, i, p, s, ry = rnd() * 6.28, rx = 0) => { e.set(rx, ry, 0); q.setFromEuler(e); m.compose(p, q, s); im.setMatrixAt(i, m); };
  // hierba (en grupitos para que parezcan matas naturales)
  const nT = Math.round(1100 * lod), tuft = new THREE.InstancedMesh(tuftGeo(), toon('#ffffff', { vc: true, rim: 0.2, side: THREE.DoubleSide }), nT); let n = 0;
  while (n < nT) { const c = spot(T, rnd, 0, 26, 1); if (!c) break; const k = 3 + Math.floor(rnd() * 5); for (let j = 0; j < k && n < nT; j++) { const p = c.clone().add(new V3((rnd() - 0.5) * 4, 0, (rnd() - 0.5) * 4)); if (!freeAt(T, p.x, p.z, 0)) continue; const sc = 1.5 + rnd() * 1.8; put(tuft, n, p, new V3(sc, sc * (0.8 + rnd() * 0.5), sc)); tuft.setColorAt(n, C(th.grass[n % th.grass.length])); n++; } }
  tuft.count = n; T.group.add(tuft);
  // flores: tallo + pétalos + botón
  const nF = Math.round(520 * lod), stem = new THREE.InstancedMesh(geo('stem', () => new THREE.CylinderGeometry(0.05, 0.07, 1, 5).translate(0, 0.5, 0)), toon('#5fb04a', { rim: 0 }), nF),
    pet = new THREE.InstancedMesh(petalGeo(), toon('#ffffff', { rim: 0.5, ...(th.glow ? { emissive: '#ffffff', ei: 0.35 } : {}) }), nF), bud = new THREE.InstancedMesh(geo('bud', () => new THREE.SphereGeometry(0.2, 8, 6)), toon(th.fc, { rim: 0.3 }), nF);
  n = 0; while (n < nF) { const c = spot(T, rnd, 0, 30, 1); if (!c) break; const col = C(th.fl[Math.floor(rnd() * th.fl.length)]); const k = 2 + Math.floor(rnd() * 5);
    for (let j = 0; j < k && n < nF; j++) { const p = c.clone().add(new V3((rnd() - 0.5) * 3, 0, (rnd() - 0.5) * 3)); if (!freeAt(T, p.x, p.z, 0)) continue; const h = 1.0 + rnd() * 1.0, sc = 1.1 + rnd() * 0.8;
      put(stem, n, p, new V3(1, h, 1)); const top = p.clone(); top.y += h; const tl = (rnd() - 0.5) * 0.5; put(pet, n, top, new V3(sc, sc, sc), rnd() * 6.28, tl); pet.setColorAt(n, col); put(bud, n, top.clone().add(new V3(0, 0.05, 0)), new V3(sc, sc * 0.7, sc)); n++; } }
  for (const im of [stem, pet, bud]) { im.count = n; T.group.add(im); }
  // piedras redondeadas con facetas suaves
  const nR = Math.round(240 * lod), rock = new THREE.InstancedMesh(geo('rock', () => { const g = new THREE.IcosahedronGeometry(1, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const f = 0.85 + (((i * 7919) % 13) / 13) * 0.3; p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, p.getZ(i) * f); } g.computeVertexNormals(); return g; }), toon('#ffffff', { rim: 0.35 }), nR);
  n = 0; for (let i = 0; i < nR; i++) { const p = spot(T, rnd, 0, 40, 2); if (!p) continue; const s = 0.4 + rnd() * 1.3; p.y = -0.6 + s * 0.25; put(rock, n, p, new V3(s * (1 + rnd() * 0.6), s * (0.5 + rnd() * 0.3), s * (1 + rnd() * 0.4)), rnd() * 6.28, (rnd() - 0.5) * 0.4); rock.setColorAt(n, C(th.rock[n % th.rock.length])); n++;
    // un par de piedrecitas alrededor
    for (let j = 0; j < 2 && i < nR - 1; j++) { const q2 = p.clone().add(new V3((rnd() - 0.5) * s * 4, 0, (rnd() - 0.5) * s * 4)); if (!freeAt(T, q2.x, q2.z, 1)) continue; const s2 = s * (0.25 + rnd() * 0.25); q2.y = -0.6 + s2 * 0.25; put(rock, n, q2, new V3(s2, s2 * 0.6, s2)); rock.setColorAt(n, C(th.rock[(n + 1) % th.rock.length])); n++; i++; } }
  rock.count = n; T.group.add(rock);
}

// banderas que ondean (shader de vértices: 1 draw call para todas las telas)
function flags(T, th, lod, anims) {
  const { S, N } = T; const every = Math.max(20, Math.round((lod >= 0.9 ? 46 : 70) / T.STEP)); const spots = [];
  for (let i = 7; i < N - 3; i += every) { const s = S[i]; const sd = (i / every | 0) % 2 ? 1 : -1, d = sd * (s.wall + 3.2); const x = s.p.x + s.right.x * d, z = s.p.z + s.right.z * d; if (T.inShortcut && T.inShortcut(x, z) != null) continue;
    let ok = true; for (let j = 0; j < N; j += 3) { const q = S[j]; if ((q.p.x - x) ** 2 + (q.p.z - z) ** 2 < (q.wall + 2.2) ** 2) { ok = false; break; } } if (!ok) continue; if (s.p.y > 1.5) continue; spots.push([x, s.p.y, z, Math.atan2(s.fl.x, s.fl.z)]); }
  if (!spots.length) return;
  const n = spots.length, pole = new THREE.InstancedMesh(geo('fpole', () => new THREE.CylinderGeometry(0.09, 0.13, 7.5, 7).translate(0, 3.75, 0)), toon('#ffffff', { rim: 0.4 }), n);
  const knob = new THREE.InstancedMesh(geo('fknob', () => new THREE.SphereGeometry(0.22, 8, 6)), toon('#ffd24a', { rim: 0.5 }), n);
  const cloth = new THREE.InstancedMesh(geo('fcloth', () => new THREE.PlaneGeometry(2.6, 1.6, 10, 3).translate(1.3, 0, 0)), toon('#ffffff', { side: THREE.DoubleSide, rim: 0.2, nocache: true }), n);
  const U = { uT: { value: 0 } }; cloth.material.onBeforeCompile = sh => { sh.uniforms.uT = U.uT; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT;').replace('#include <begin_vertex>', `#include <begin_vertex>
    float ph = instanceMatrix[3].x * 0.13 + instanceMatrix[3].z * 0.07; float a = position.x / 2.6; transformed.z += sin(uT * 6.0 - position.x * 2.2 + ph) * 0.32 * a + sin(uT * 9.0 + position.y * 2.0 + ph) * 0.06 * a; transformed.y -= a * a * 0.25;`); };
  cloth.material.customProgramCacheKey = () => 'flag25';
  const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  spots.forEach(([x, y, z, yaw], i) => { q.setFromAxisAngle(new V3(0, 1, 0), yaw + Math.PI / 2); m.compose(new V3(x, y - 0.1, z), q, new V3(1, 1, 1)); pole.setMatrixAt(i, m); m.compose(new V3(x, y + 7.5, z), q, new V3(1, 1, 1)); knob.setMatrixAt(i, m);
    m.compose(new V3(x, y + 6.4, z), q, new V3(1, 1, 1)); cloth.setMatrixAt(i, m); cloth.setColorAt(i, C(th.flags[i % th.flags.length])); });
  for (const im of [pole, knob, cloth]) T.group.add(im);
  anims.push(t => { U.uT.value = t; });
}

// partículas ambientales alrededor de la cámara (envuelven en una caja: coste fijo)
function ambient(T, P, lod, anims, rnd) {
  const n = Math.round(P.n * lod), B = 120, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), sd = new Float32Array(n);
  const cols = P.col.map(C); for (let i = 0; i < n; i++) { pos[i * 3] = rnd() * B; pos[i * 3 + 1] = rnd() * 40; pos[i * 3 + 2] = rnd() * B; const c = cols[i % cols.length]; col.set([c.r, c.g, c.b], i * 3); sd[i] = rnd(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('seed', new THREE.BufferAttribute(sd, 1));
  const U = { uT: { value: 0 }, uCam: { value: new V3() }, uPR: { value: Math.min(2, window.devicePixelRatio || 1) } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: P.add ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexShader: `uniform float uT; uniform vec3 uCam; uniform float uPR; attribute vec3 color; attribute float seed; varying vec3 vC; varying float vA;
      void main(){ vec3 p = position; p.y += uT * ${(-P.fall).toFixed(2)} * (0.6 + seed * 0.8); p.x += sin(uT * 0.7 + seed * 40.0) * ${P.drift.toFixed(2)} * 2.0 + uT * ${(P.drift * 0.6).toFixed(2)}; p.z += cos(uT * 0.5 + seed * 30.0) * ${P.drift.toFixed(2)} * 2.0;
        vec3 w = mod(p - uCam + vec3(${B / 2}.0, 15.0, ${B / 2}.0), vec3(${B}.0, 40.0, ${B}.0)) - vec3(${B / 2}.0, 15.0, ${B / 2}.0) + uCam;
        vec4 mv = modelViewMatrix * vec4(w, 1.0); gl_Position = projectionMatrix * mv; float d = -mv.z;
        vA = smoothstep(4.0, 10.0, d) * (1.0 - smoothstep(40.0, 60.0, d)) * (0.65 + 0.35 * sin(uT * ${P.tw.toFixed(2)} * 3.0 + seed * 60.0)); vC = color;
        gl_PointSize = ${P.size.toFixed(2)} * 300.0 * uPR / max(d, 1.0); }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float r = length(c); ${P.bub ? 'float a = smoothstep(0.5, 0.42, r) * (0.25 + smoothstep(0.3, 0.45, r) * 0.75); a += smoothstep(0.12, 0.0, length(c - vec2(-0.15, -0.15))) * 0.8;' : 'float a = smoothstep(0.5, 0.0, r); a = a * a * 1.6;'}
      if (a * vA < 0.01) discard; gl_FragColor = vec4(vC, min(1.0, a * vA)); }` });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 5; pts.userData.noMerge = true; T.group.add(pts); T.hd.pts = pts;
  anims.push((t, dt, race) => { U.uT.value = t; const cam = race && race.camera; if (cam) U.uCam.value.copy(cam.position); });
}

// remate de monumentos: pedestal con anillo de luz que respira y chispas que orbitan
export function monumentHalo(T, g, R) {
  const r = Math.max(6, R * 0.55), G2 = new THREE.Group(); G2.position.copy(g.position); T.group.add(G2);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.35, 8, 64), toon('#ffffff', { emissive: '#fff2c0', ei: 0.6, rim: 0 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.4; G2.add(ring);
  const disc = new THREE.Mesh(new THREE.RingGeometry(r * 0.2, r, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, depthWrite: false })); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.2; G2.add(disc);
  const sp = new THREE.InstancedMesh(geo('spk', () => new THREE.OctahedronGeometry(0.6, 0)), toon('#fff6c0', { emissive: '#ffe680', ei: 0.8, rim: 0 }), 14); G2.add(sp); const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  T.anims.push(t => { ring.material.emissiveIntensity = 0.45 + Math.sin(t * 2) * 0.25; for (let i = 0; i < 14; i++) { const a = t * 0.4 + i / 14 * Math.PI * 2; q.setFromAxisAngle(new V3(0, 1, 0), t * 2 + i); m.compose(new V3(Math.cos(a) * r * 0.92, 2 + Math.sin(t * 1.5 + i) * 1.5 + (i % 3) * 3, Math.sin(a) * r * 0.92), q, new V3(1, 1.6, 1).multiplyScalar(0.8 + (i % 3) * 0.3)); sp.setMatrixAt(i, m); } sp.instanceMatrix.needsUpdate = true; });
}
